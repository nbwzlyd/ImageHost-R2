async function fetchConfig() {
  const res = await fetch("https://api.img.montain.top/config");
  if (!res.ok) throw new Error("获取配置失败");
  return await res.json();
}

async function initializeSupabase() {
  const config = await fetchConfig();
  if (!config) return;

  window.IMG_BED_CONFIG = config;

  const supabaseClient = window.supabase.createClient(
    config.supabaseUrl,
    config.supabaseAnonKey
  );

  window.supabaseClient = supabaseClient;
  window.supabase = supabaseClient;
  window._supabaseReady = true;
}

function getSupabase() {
  if (!window._supabaseReady || !window.supabaseClient) {
    throw new Error("Supabase 尚未初始化，请稍后再试");
  }
  return window.supabaseClient;
}
