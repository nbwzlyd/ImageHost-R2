initializeSupabase().then(() => {
  checkLoginStatus();
}).catch(err => {
  console.error("Supabase 初始化失败:", err);
  const statusEl = document.getElementById("user-status");
  if (statusEl) {
    const warn = document.createElement("span");
    warn.className = "text-yellow-400 text-sm";
    warn.textContent = "⚠️ 服务连接失败，请刷新重试";
    statusEl.prepend(warn);
  }
});

const authModal = document.getElementById("auth-modal");
const loginRegisterBtn = document.getElementById("login-register-btn");
const closeAuthModal = document.getElementById("close-auth-modal");

loginRegisterBtn.addEventListener("click", () => {
  authModal.classList.remove("hidden");
  showLoginForm();
});

closeAuthModal.addEventListener("click", () => {
  authModal.classList.add("hidden");
});

authModal.addEventListener("click", (e) => {
  if (e.target === authModal) {
    authModal.classList.add("hidden");
  }
});

document.getElementById("to-register").addEventListener("click", function (e) {
  e.preventDefault();
  showRegisterForm();
});

document.getElementById("to-login").addEventListener("click", function (e) {
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

document.getElementById("login-button").addEventListener("click", async function () {
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value.trim();
  const loginButton = this;

  if (!email || !password) {
    alert('请输入邮箱和密码。');
    return;
  }

  if (!window._supabaseReady) {
    alert('系统正在初始化，请稍后再试。');
    return;
  }

  loginButton.disabled = true;
  loginButton.innerText = "登录中...";

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    alert(`欢迎回来，${data.user.email}`);
    authModal.classList.add("hidden");
    window.location.href = "index.html";
  } catch (err) {
    alert(`登录失败：${err.message}`);
  } finally {
    loginButton.disabled = false;
    loginButton.innerText = "登录";
  }
});

document.getElementById("register-button").addEventListener("click", async function () {
  const email = document.getElementById("register-email").value.trim();
  const password = document.getElementById("register-password").value.trim();
  let nickname = document.getElementById("register-nickname").value.trim();
  const registerButton = this;

  if (!email || !password) {
    alert('请输入邮箱和密码。');
    return;
  }

  if (!window._supabaseReady) {
    alert('系统正在初始化，请稍后再试。');
    return;
  }

  if (!nickname) {
    nickname = generateRandomNickname();
  }

  registerButton.disabled = true;
  registerButton.innerText = "注册中...";

  try {
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', nickname)
      .maybeSingle();

    if (checkError) throw checkError;
    if (existingUser) {
      alert('昵称已被使用，请换一个。');
      return;
    }

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      throw new Error(signUpError.message);
    }

    if (signUpData.user?.identities.length === 0) {
      alert('该邮箱已经注册过了，请直接登录或检查邮箱验证。');
      return;
    }
    const userId = signUpData.user?.id;
    if (!userId) {
      alert('注册失败，未获取到用户ID。');
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: nickname })
      .eq('id', userId);

    if (updateError) {
      console.error('更新昵称失败：', updateError.message);
    }

    alert('注册成功！请检查邮箱完成验证。');
    authModal.classList.add("hidden");
    window.location.href = `${window.location.origin}/index.html`;
  } catch (err) {
    alert(`注册失败：${err.message}`);
  } finally {
    registerButton.disabled = false;
    registerButton.innerText = "注册";
  }
});

function generateRandomNickname() {
  const adjectives = ["快乐", "闪耀", "机智", "勇敢", "神秘"];
  const animals = ["猫咪", "小狗", "老虎", "兔子", "鲸鱼"];
  const randomAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
  const randomNum = Math.floor(Math.random() * 10000);
  return `${randomAdj}${randomAnimal}${randomNum}`;
}

function generateRandomAvatar() {
  const seed = Math.random().toString(36).substring(2, 10);
  return `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
}
