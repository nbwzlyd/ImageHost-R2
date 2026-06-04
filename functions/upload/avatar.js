// 生成10位短随机ID
function shortId() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
  const arr = new Uint8Array(10);
  crypto.getRandomValues(arr);
  let id = '';
  for (let i = 0; i < 10; i++) id += chars[arr[i] & 63];
  return id;
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // ===== 1. JWT 鉴权 =====
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized: missing token' }), {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const token = authHeader.slice(7);

  // 调用 WordPress 验证 JWT 令牌有效性
  try {
    const wpRes = await fetch('https://im.montain.top/wp-json/wp/v2/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!wpRes.ok) {
      return new Response(JSON.stringify({ error: 'Unauthorized: invalid token' }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Auth server unavailable' }), {
      status: 503,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  // ===== 2. 处理文件上传 =====
  const formData = await request.formData();
  const files = formData.getAll("file");

  if (!files.length) {
    return new Response(JSON.stringify({ error: "No files received" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const urls = [];
  const origin = new URL(request.url).origin;

  for (const file of files) {
    if (typeof file === "string") continue;

    if (!allowedTypes.includes(file.type)) {
      return new Response(
        JSON.stringify({ error: "Invalid file type. Only images are allowed." }),
        {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          },
        }
      );
    }

    const name =
      typeof file.name === "string" && file.name !== "undefined"
        ? file.name
        : "image.png";
    const ext = name.split(".").pop() || "png";
    // 头像文件统一放在 avatar- 前缀下，与普通上传隔离
    const fileName = `avatar-${shortId()}.${ext}`;

    await env.R2_BUCKET.put(fileName, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    urls.push(`${origin}/images/${fileName}`);
  }

  return new Response(JSON.stringify({ urls }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
