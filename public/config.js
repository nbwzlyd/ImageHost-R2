async function fetchConfig() {
  const res = await fetch("https://weathered-silence-41fmyimageapi.420907013.workers.dev/config");
  if (!res.ok) throw new Error("获取配置失败");
  return await res.json();
}

async function initializeSupabase() {
  const config = await fetchConfig();
  if (!config) return;

  window.IMG_BED_CONFIG = config;

  window.supabase = window.supabase.createClient(
    config.supabaseUrl,
    config.supabaseAnonKey
  );
}
