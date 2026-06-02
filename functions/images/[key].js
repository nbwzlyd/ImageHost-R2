export async function onRequestGet(context) {
  const { env, params } = context;
  const key = params.key;

  if (!key) {
    return new Response("Missing file key", { status: 400 });
  }

  const object = await env.R2_BUCKET.get(key);
  if (!object) {
    return new Response("File not found", { status: 404 });
  }

  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
  headers.set("Cache-Control", "public, max-age=604800, immutable");
  headers.set("ETag", object.httpEtag);

  return new Response(object.body, { headers });
}

export async function onRequestDelete(context) {
  const { env, params } = context;
  const key = params.key;

  if (!key) {
    return new Response(JSON.stringify({ error: "Missing file key" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  const object = await env.R2_BUCKET.get(key);
  if (!object) {
    return new Response(JSON.stringify({ error: "File not found" }), {
      status: 404,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }

  await env.R2_BUCKET.delete(key);

  return new Response(JSON.stringify({ success: true, deleted: key }), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
