// 生成10位短随机ID，64^10 ≈ 1.1×10^18 组合空间
function shortId() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
  const arr = new Uint8Array(10);
  crypto.getRandomValues(arr);
  let id = '';
  for (let i = 0; i < 10; i++) id += chars[arr[i] & 63];
  return id;
}

export default {
  async fetch(request, env) {
    // 配置对象
    const config = {
      apiBaseUrl: env.API_BASE_URL,
      supabaseUrl: env.SUPABASE_URL,
      supabaseAnonKey: env.SUPABASE_ANON_KEY,
      maxFiles: env.MAX_FILES,
      imageListPath: env.LIST_PATH || '/list',  // 添加图片列表路径
    };

    // 定义允许的来源（可以根据实际需求修改）
    const allowedOrigins = [
      'https://myimgbed.pages.dev',
      'https://username.github.io',
      'https://img.montain.top',
      'https://api.img.montain.top',
      'http://localhost:8787'
    ];

    // 获取请求的 Origin
    const origin = request.headers.get('Origin') || '';
    const referer = request.headers.get('Referer') || '';

    // 检查是否来自允许的来源
    const isAllowedOrigin = allowedOrigins.some(site =>
      origin.startsWith(site) || referer.startsWith(site)
    );

    // 如果不符合允许的来源，则返回 403 错误
    if (!isAllowedOrigin) {
      return new Response('Forbidden', { status: 403 });
    }

    // 假设是 GET 请求时返回配置
    if (request.method === 'GET' && new URL(request.url).pathname === '/config') {
      return new Response(JSON.stringify(config), {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders(), // 必须加这个
        },
      });
    }

    // 处理其他 API 路径...
    const url = new URL(request.url);
    const UPLOAD_PATH = env.UPLOAD_PATH || '/upload';
    const LIST_PATH = env.LIST_PATH || '/list';

    // CORS 预检
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    // 上传操作
    if (request.method === 'POST' && url.pathname === UPLOAD_PATH) {
      const formData = await request.formData();
      const files = formData.getAll("file");

      if (!files.length) {
        return new Response(JSON.stringify({ error: "No files received" }), {
          status: 400,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders()
          }
        });
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      const urls = [];

      for (const file of files) {
        if (typeof file === "string") continue;

        if (!allowedTypes.includes(file.type)) {
          return new Response(JSON.stringify({ error: "Invalid file type. Only images are allowed." }), {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders()
            }
          });
        }

        const ext = file.name.split('.').pop();
        const fileName = `${shortId()}.${ext}`;

        await env.R2_BUCKET.put(fileName, file.stream(), {
          httpMetadata: {
            contentType: file.type
          }
        });

        urls.push(`${url.origin}/${fileName}`);
      }

      return new Response(JSON.stringify({ urls }), {
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders()
        }
      });
    }

    // 删除操作
    if (request.method === 'DELETE') {
      const key = url.pathname.slice(1);
      if (!key) {
        return new Response(JSON.stringify({ error: "Missing file key" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders() }
        });
      }

      // 检查文件是否存在
      const object = await env.R2_BUCKET.get(key);
      if (!object) {
        return new Response(JSON.stringify({ error: "File not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json", ...corsHeaders() }
        });
      }

      await env.R2_BUCKET.delete(key);

      return new Response(JSON.stringify({ success: true, deleted: key }), {
        headers: { "Content-Type": "application/json", ...corsHeaders() }
      });
    }

    // 图片列表页面
    if (request.method === 'GET' && url.pathname === LIST_PATH) {
      const list = await env.R2_BUCKET.list({ limit: 1000 });
      const files = list.objects;

      files.sort((a, b) => b.created - a.created);

      const acceptHeader = request.headers.get('Accept') || '';
      const preferJson = acceptHeader.includes('application/json') ||
                         url.searchParams.get('format') === 'json';

      if (preferJson) {
        const jsonData = files.map(obj => ({
          key: obj.key,
          url: `${url.origin}/${obj.key}`,
          size: obj.size,
          created: obj.created
        }));

        return new Response(JSON.stringify({ files: jsonData }), {
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders()
          }
        });
      }

      let html = `<html><head><meta charset="UTF-8"><title>图片列表</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; max-width: 960px; margin: 0 auto; padding: 20px; }
  h2 { color: #333; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
  .card { border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background: #fff; }
  .card img { width: 100%; height: 200px; object-fit: cover; display: block; }
  .card-info { padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; }
  .card-name { font-size: 12px; color: #666; word-break: break-all; flex: 1; margin-right: 8px; }
  .card-name a { color: #1a73e8; text-decoration: none; }
  .btn-del { padding: 4px 12px; font-size: 12px; border: 1px solid #e53935; color: #e53935; background: #fff; border-radius: 4px; cursor: pointer; white-space: nowrap; }
  .btn-del:hover { background: #e53935; color: #fff; }
  .toast { position: fixed; bottom: 20px; right: 20px; background: #333; color: #fff; padding: 10px 20px; border-radius: 6px; font-size: 14px; opacity: 0; transition: opacity 0.3s; z-index: 99; }
  .toast.show { opacity: 1; }
</style></head><body>
<h2>图片列表 (${files.length})</h2>
<div class="grid">`;

      for (const obj of files) {
        const fileUrl = `${url.origin}/${obj.key}`;
        html += `
  <div class="card" id="card-${obj.key.replace(/[^a-zA-Z0-9]/g, '_')}">
    <a href="${fileUrl}" target="_blank"><img src="${fileUrl}" loading="lazy" /></a>
    <div class="card-info">
      <span class="card-name"><a href="${fileUrl}" target="_blank">${obj.key}</a></span>
      <button class="btn-del" onclick="delImage('${obj.key}', this)">删除</button>
    </div>
  </div>`;
      }

      html += `</div>
<div class="toast" id="toast"></div>
<script>
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2000);
}

async function delImage(key, btn) {
  if (!confirm('确定删除 ' + key + ' ？')) return;
  btn.disabled = true;
  btn.textContent = '...';
  try {
    const res = await fetch('/' + key, { method: 'DELETE' });
    if (res.ok) {
      const card = btn.closest('.card');
      card.style.opacity = '0.5';
      setTimeout(() => card.remove(), 300);
      showToast('已删除');
    } else {
      showToast('删除失败');
      btn.disabled = false;
      btn.textContent = '删除';
    }
  } catch(e) {
    showToast('网络错误');
    btn.disabled = false;
    btn.textContent = '删除';
  }
}
</script></body></html>`;

      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          ...corsHeaders()
        }
      });
    }

    // 访问图片
    if (request.method === 'GET') {
      const key = url.pathname.slice(1);
      if (!key) return new Response("Missing file key", { status: 400 });

      const object = await env.R2_BUCKET.get(key);
      if (!object) return new Response("File not found", { status: 404 });

      return new Response(object.body, {
        headers: {
          "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
          "Cache-Control": "public, max-age=31536000",
          ...corsHeaders()
        }
      });
    }

    return new Response("Method Not Allowed", { status: 405 });
  }
};

// CORS 跨域头
function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,HEAD,POST,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization" // 允许 Authorization 头部
  };
}
