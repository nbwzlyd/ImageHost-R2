export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const origin = url.origin;

  // 加载并排序全部图片（R2 单次上限 1000 条）
  const fullList = await env.R2_BUCKET.list({ limit: 1000 });
  const sorted = [...fullList.objects].sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));

  const acceptHeader = request.headers.get("Accept") || "";
  const preferJson =
    acceptHeader.includes("application/json") ||
    url.searchParams.get("format") === "json";

  if (preferJson) {
    const limit = Math.min(parseInt(url.searchParams.get("limit")) || 50, 50);
    const offset = parseInt(url.searchParams.get("offset")) || 0;

    const page = sorted.slice(offset, offset + limit);
    const jsonData = page.map((obj) => ({
      key: obj.key,
      url: `${origin}/images/${obj.key}`,
      size: obj.size,
      uploaded: obj.uploaded,
    }));
    const totalSize = sorted.reduce((sum, obj) => sum + (obj.size || 0), 0);

    return new Response(JSON.stringify({
      files: jsonData,
      offset,
      limit,
      total: sorted.length,
      totalSize,
      hasMore: offset + limit < sorted.length,
    }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
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
<h2>图片列表 (${sorted.length})</h2>
<div class="grid">`;

  for (const obj of sorted) {
    const fileUrl = `${origin}/images/${obj.key}`;
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
    const res = await fetch('/images/' + key, { method: 'DELETE' });
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
      "Access-Control-Allow-Origin": "*",
    },
  });
}
