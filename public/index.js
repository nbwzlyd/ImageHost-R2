
// 1. 页面元素
const closeAuthModalBtn = document.getElementById("close-auth-modal");
const userProfile = document.getElementById("user-profile");
const profileBtn = document.getElementById("profile-btn");
const profileAvatar = document.getElementById("profile-avatar");
const profileUsername = document.getElementById("profile-username");
const dropdownMenu = document.getElementById("dropdown-menu");
const logoutBtn = document.getElementById("logout-btn");

// 中间主体容器
const mainContent = document.getElementById("main-content");

// 导航按钮
const uploadBtn = document.getElementById("upload-btn");
const galleryBtn = document.getElementById("gallery-btn");
const myProfileBtn = document.getElementById("my-profile-btn");

let currentSession = null;

// 2. 检查登录状态并更新页面
async function checkLoginStatus() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    currentSession = session;

    if (session?.user) {
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', session.user.id)
        .single();

      if (error) {
        console.error("获取个人资料失败", error);
      }

      loginRegisterBtn.classList.add("hidden");
      userProfile.classList.remove("hidden");

      profileUsername.textContent = profileData?.username || session.user.email;
      profileAvatar.src = profileData?.avatar_url || 'default-avatar.png';
    } else {
      loginRegisterBtn.classList.remove("hidden");
      userProfile.classList.add("hidden");
      dropdownMenu.classList.add("hidden");
    }
  } catch (error) {
    console.error('检查登录状态失败', error);
  }
}

// 3. 登录/弹窗控制
loginRegisterBtn.addEventListener("click", () => {
  authModal.classList.remove("hidden");
});

closeAuthModalBtn.addEventListener("click", () => {
  authModal.classList.add("hidden");
});

// 4. 头像下拉菜单
profileBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  dropdownMenu.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
  if (!userProfile.contains(e.target)) {
    dropdownMenu.classList.add("hidden");
  }
});

// 5. 登出
logoutBtn.addEventListener("click", async () => {
  try {
    await supabase.auth.signOut();
    window.location.reload();
  } catch (error) {
    console.error('登出失败', error);
    alert('登出失败，请稍后再试。');
  }
});

// 6. 页面切换函数
function clearMainContent() {
  mainContent.innerHTML = "";
}

// 加载上传图片页面
async function loadUploadPage() {
  clearMainContent();

  mainContent.innerHTML = `
    <div class="bg-white bg-opacity-80 rounded-lg shadow-lg p-10 max-w-2xl w-full text-center">
      <h2 class="text-3xl font-bold mb-6 text-gray-800">上传你的图片</h2>
      <form id="upload-form" class="space-y-6">
        <input type="file" id="file" name="file" multiple accept="image/*"
          class="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg focus:outline-none focus:border-blue-500" />
        <button type="submit"
          class="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-lg text-lg transition">
          开始上传
        </button>
      </form>
      <div id="result" class="mt-6 text-gray-700"></div>
    </div>
  `;

  import('./upload.js').then(module => {
    module.initUpload(currentSession);
  }).catch(err => {
    console.error('加载上传模块失败', err);
  });
}


// 加载图片列表页面（改为跳转到 API 提供的清单页面）
let hasOpenedGallery = false;

function loadGalleryPage() {
  if (hasOpenedGallery) return; // 避免多次触发
  hasOpenedGallery = true;

  const config = window.IMG_BED_CONFIG || {};
  const apiBaseUrl = config.apiBaseUrl || "http://localhost:8787";
  const imageListPath = config.imageListPath || "/list";

  const fullUrl = `${apiBaseUrl.replace(/\/$/, '')}${imageListPath.startsWith('/') ? '' : '/'}${imageListPath}`;
  window.open(fullUrl, '_blank');
}



// 加载个人资料编辑页面
async function loadProfilePage() {
  clearMainContent();

  mainContent.innerHTML = `
 
    <div id="profile-form-container"></div>
  `;

  import('./profile.js').then(module => {
    module.loadProfilePage(currentSession);  // ✅ 正确地调用
  }).catch(err => {
    console.error('加载资料模块失败', err);
  });
}


// 7. 登录检查辅助函数
function requireLoginThen(action) {
  if (!currentSession) {
    authModal.classList.remove("hidden");
  } else {
    action();
  }
}

// 8. 监听导航按钮
if (uploadBtn) {
  uploadBtn.addEventListener("click", () => requireLoginThen(loadUploadPage));
}
if (galleryBtn) {
  galleryBtn.addEventListener("click", () => requireLoginThen(loadGalleryPage));
}
if (myProfileBtn) {
  myProfileBtn.addEventListener("click", () => requireLoginThen(loadProfilePage));
}

// 9. 首页“开始上传图片”按钮
const startUploadBtn = document.getElementById("start-upload-btn");
if (startUploadBtn) {
  startUploadBtn.addEventListener("click", () => requireLoginThen(loadUploadPage));
}

// 页面切换函数
uploadBtn.addEventListener("click", loadUploadPage);
galleryBtn.addEventListener("click", loadGalleryPage);
myProfileBtn.addEventListener("click", loadProfilePage);

// 退出登录功能
logoutBtn.addEventListener("click", async () => {
  try {
    await supabase.auth.signOut();
    window.location.reload(); // 重载页面，清除登录状态
  } catch (error) {
    console.error('登出失败', error);
    alert('登出失败，请稍后再试。');
  }
});
