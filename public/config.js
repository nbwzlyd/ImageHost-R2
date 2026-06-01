async function initializeSupabase() {
  window.IMG_BED_CONFIG = {
    apiBaseUrl: "https://weathered-silence-41fmyimageapi.420907013.workers.dev",
    supabaseUrl: "https://smbreqhzvkmnkzmmrudn.supabase.co",
    supabaseAnonKey: "sb_publishable_TNIPEUHBunrIwrLb18LgQQ_UdhdzhwR",
    maxFiles: "5",
    imageListPath: "/list"
  };

  window.supabase = window.supabase.createClient(
    window.IMG_BED_CONFIG.supabaseUrl,
    window.IMG_BED_CONFIG.supabaseAnonKey
  );
}

initializeSupabase();
