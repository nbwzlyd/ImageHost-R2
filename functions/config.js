export async function onRequest(context) {
  const url = new URL(context.request.url);
  const apiBaseUrl = `${url.protocol}//${url.host}`;

  const config = {
    apiBaseUrl,
    supabaseUrl: "https://smbreqhzvkmnkzmmrudn.supabase.co",
    supabaseAnonKey: "sb_publishable_TNIPEUHBunrIwrLb18LgQQ_UdhdzhwR",
    maxFiles: "5",
    imageListPath: "/list",
  };

  return new Response(JSON.stringify(config), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
