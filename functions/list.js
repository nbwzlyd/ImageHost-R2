export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const origin = url.origin;

  const list = await env.R2_BUCKET.list({ limit: 1000 });
  const files = list.objects;
  files.sort((a, b) => new Date(b.uploaded) - new Date(a.uploaded));

  const acceptHeader = request.headers.get("Accept") || "";
  const preferJson =
    acceptHeader.includes("application/json") ||
    url.searchParams.get("format") === "json";

  if (preferJson) {
    const jsonData = files.map((obj) => ({
      key: obj.key,
      url: `${origin}/${obj.key}`,
      size: obj.size,
      uploaded: obj.uploaded,
    }));

    return new Response(JSON.stringify({ files: jsonData }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  let html = `<html><head><meta charset="UTF-8"><title>图片列表</title></head><body>`;
  html += `<h2>图片列表 (${files.length})</h2><ul style="list-style: none; padding: 0;">`;

  for (const obj of files) {
    const fileUrl = `${origin}/${obj.key}`;
    html += `
      <li style="margin-bottom: 20px;">
        <p><a href="${fileUrl}" target="_blank">${obj.key}</a></p>
        <img src="${fileUrl}" style="max-width: 300px; border: 1px solid #ddd;" />
      </li>`;
  }

  html += `</ul></body></html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
