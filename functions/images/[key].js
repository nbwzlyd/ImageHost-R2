export async function onRequestDelete(context) {
  const { request, env, params } = context;
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
