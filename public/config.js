async function initializeSupabase() {
  window.IMG_BED_CONFIG = {
    apiBaseUrl: "https://weathered-silence-41fmyimageapi.420907013.workers.dev",
    supabaseUrl: "https://smbreqhzvkmnkzmmrudn.supabase.co",
    supabaseAnonKey: "sb_publishable_TNIPEUHBunrIwrLyqUKCniTXZYTm0HTOEVQZPGQOazKKRBTJgjXg7kSrxrGobIlHrHYisxbPs5FAGXxCg2R0J7E",
    maxFiles: "5",
    imageListPath: "/list"
  };
  
  window.supabase = window.supabase.createClient(
    window.IMG_BED_CONFIG.supabaseUrl,
    window.IMG_BED_CONFIG.supabaseAnonKey
  );
}
