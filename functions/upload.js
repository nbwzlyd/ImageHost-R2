// 生成10位短随机ID，64^10 ≈ 1.1×10^18 组合空间
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

    const ext = file.name.split(".").pop();
    const fileName = `${shortId()}.${ext}`;

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
