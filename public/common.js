// 公共逻辑：所有页面共享

let currentSession = null;

async function initializeSupabase() {
  window.IMG_BED_CONFIG = {
    apiBaseUrl: window.location.origin,
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

async function checkLoginStatus() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    currentSession = session;

    const loginRegisterBtn = document.getElementById("login-register-btn");
    const userProfile = document.getElementById("user-profile");
    const profileUsername = document.getElementById("profile-username");
    const profileAvatar = document.getElementById("profile-avatar");

    if (session?.user) {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', session.user.id)
        .single();

      if (error) console.error("获取个人资料失败", error);

      if (loginRegisterBtn) loginRegisterBtn.classList.add("hidden");
      if (userProfile) userProfile.classList.remove("hidden");
      if (profileUsername) profileUsername.textContent = profileData?.username || session.user.email;
      if (profileAvatar) profileAvatar.src = profileData?.avatar_url || 'default-avatar.png';
    } else {
      if (loginRegisterBtn) loginRegisterBtn.classList.remove("hidden");
      if (userProfile) userProfile.classList.add("hidden");
    }
  } catch (error) {
    console.error('检查登录状态失败', error);
  }
}

// 登录弹窗
const authModal = document.getElementById("auth-modal");
const loginRegisterBtn = document.getElementById("login-register-btn");
const closeAuthModal = document.getElementById("close-auth-modal");

if (loginRegisterBtn) {
  loginRegisterBtn.addEventListener("click", () => {
    authModal.classList.remove("hidden");
    showLoginForm();
  });
}

if (closeAuthModal) {
  closeAuthModal.addEventListener("click", () => {
    authModal.classList.add("hidden");
  });
}

if (authModal) {
  authModal.addEventListener("click", (e) => {
    if (e.target === authModal) authModal.classList.add("hidden");
  });
}

document.getElementById("to-register")?.addEventListener("click", function (e) {
  e.preventDefault();
  showRegisterForm();
});

document.getElementById("to-login")?.addEventListener("click", function (e) {
  e.preventDefault();
  showLoginForm();
});

function showLoginForm() {
  document.getElementById("auth-title").innerText = "登录";
  document.getElementById("login-form").style.display = "block";
  document.getElementById("register-form").style.display = "none";
}

function showRegisterForm() {
  document.getElementById("auth-title").innerText = "注册";
  document.getElementById("login-form").style.display = "none";
  document.getElementById("register-form").style.display = "block";
}

// 登录
const loginButton = document.getElementById("login-button");
if (loginButton) {
  loginButton.addEventListener("click", async function () {
    const email = document.getElementById("login-email").value.trim();
    const password = document.getElementById("login-password").value.trim();
    if (!email || !password) { alert('请输入邮箱和密码。'); return; }

    this.disabled = true;
    this.innerText = "登录中...";
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      authModal.classList.add("hidden");
      window.location.reload();
    } catch (err) {
      alert(`登录失败：${err.message}`);
    } finally {
      this.disabled = false;
      this.innerText = "登录";
    }
  });
}

// 注册
const registerButton = document.getElementById("register-button");
if (registerButton) {
  registerButton.addEventListener("click", async function () {
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value.trim();
    let nickname = document.getElementById("register-nickname").value.trim();
    if (!email || !password) { alert('请输入邮箱和密码。'); return; }
    if (!nickname) nickname = generateRandomNickname();

    this.disabled = true;
    this.innerText = "注册中...";
    try {
      const { data: existingUser } = await supabase.from('profiles').select('id').eq('username', nickname).maybeSingle();
      if (existingUser) { alert('昵称已被使用，请换一个。'); return; }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) throw new Error(signUpError.message);
      if (signUpData.user?.identities.length === 0) { alert('该邮箱已经注册过了，请直接登录。'); return; }

      const userId = signUpData.user?.id;
      if (!userId) { alert('注册失败，未获取到用户ID。'); return; }

      await supabase.from('profiles').update({ username: nickname }).eq('id', userId);
      alert('注册成功！');
      authModal.classList.add("hidden");
      window.location.reload();
    } catch (err) {
      alert(`注册失败：${err.message}`);
    } finally {
      this.disabled = false;
      this.innerText = "注册";
    }
  });
}

// 下拉菜单
const profileBtn = document.getElementById("profile-btn");
const dropdownMenu = document.getElementById("dropdown-menu");
const userProfile = document.getElementById("user-profile");

if (profileBtn && dropdownMenu) {
  profileBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle("hidden");
  });
  document.addEventListener("click", (e) => {
    if (userProfile && !userProfile.contains(e.target)) {
      dropdownMenu.classList.add("hidden");
    }
  });
}

// 退出登录
const logoutBtn = document.getElementById("logout-btn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await supabase.auth.signOut();
      window.location.reload();
    } catch (error) {
      console.error('登出失败', error);
    }
  });
}

function generateRandomNickname() {
  const adjectives = ["快乐", "闪耀", "机智", "勇敢", "神秘"];
  const animals = ["猫咪", "小狗", "老虎", "兔子", "鲸鱼"];
  return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${animals[Math.floor(Math.random() * animals.length)]}${Math.floor(Math.random() * 10000)}`;
}

function requireLoginThen(href) {
  if (!currentSession) {
    authModal.classList.remove("hidden");
    showLoginForm();
  } else {
    window.location.href = href;
  }
}

// 导航按钮
const uploadBtn = document.getElementById("upload-btn");
const galleryBtn = document.getElementById("gallery-btn");
const myProfileBtn = document.getElementById("my-profile-btn");
const startUploadBtn = document.getElementById("start-upload-btn");

function bindNavLink(el, href) {
  if (!el) return;
  el.addEventListener("click", (e) => {
    e.preventDefault();
    requireLoginThen(href);
  });
}
bindNavLink(uploadBtn, "upload.html");
bindNavLink(galleryBtn, "gallery.html");
bindNavLink(myProfileBtn, "profile.html");
bindNavLink(startUploadBtn, "upload.html");

// 页面加载后检测登录状态
checkLoginStatus();
