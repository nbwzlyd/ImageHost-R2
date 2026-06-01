
const closeAuthModalBtn = document.getElementById("close-auth-modal");
const userProfile = document.getElementById("user-profile");
const profileBtn = document.getElementById("profile-btn");
const profileAvatar = document.getElementById("profile-avatar");
const profileUsername = document.getElementById("profile-username");
const dropdownMenu = document.getElementById("dropdown-menu");
const logoutBtn = document.getElementById("logout-btn");

const mainContent = document.getElementById("main-content");

const uploadBtn = document.getElementById("upload-btn");
const galleryBtn = document.getElementById("gallery-btn");
const myProfileBtn = document.getElementById("my-profile-btn");

let currentSession = null;

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

loginRegisterBtn.addEventListener("click", () => {
  authModal.classList.remove("hidden");
});

closeAuthModalBtn.addEventListener("click", () => {
  authModal.classList.add("hidden");
});

profileBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  dropdownMenu.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
  if (!userProfile.contains(e.target)) {
    dropdownMenu.classList.add("hidden");
  }
});

logoutBtn.addEventListener("click", async () => {
  try {
    await supabase.auth.signOut();
    window.location.reload();
  } catch (error) {
    console.error('登出失败', error);
    alert('登出失败，请稍后再试。');
  }
});

function clearMainContent() {
  mainContent.innerHTML = "";
}

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
      <div id="upload-progress-container" style="display: none;" class="mt-6">
        <div class="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
          <div id="upload-progress-bar" class="h-4 rounded-full transition-all duration-300 ease-out" style="width: 0%; background-color: #3b82f6;"></div>
        </div>
        <p id="upload-progress-text" class="text-sm text-gray-600 mt-2">0%</p>
      </div>
      <div id="result" class="mt-6 text-gray-700"></div>
    </div>
  `;

  import('./upload.js').then(module => {
    module.initUpload(currentSession);
  }).catch(err => {
    console.error('加载上传模块失败', err);
  });
}

async function loadGalleryPage() {
  clearMainContent();

  const config = window.IMG_BED_CONFIG || {};
  const apiBaseUrl = config.apiBaseUrl || "http://localhost:8787";
  const imageListPath = config.imageListPath || "/list";

  mainContent.innerHTML = `
    <div class="w-full max-w-6xl">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-3xl font-bold text-gray-800">🖼 图片画廊</h2>
        <button id="gallery-refresh-btn" class="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm transition">
          刷新
        </button>
      </div>
      <div id="gallery-loading" class="text-center py-10">
        <div class="inline-block animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
        <p class="text-gray-600 mt-3">加载图片中...</p>
      </div>
      <div id="gallery-grid" class="gallery-grid hidden"></div>
      <div id="gallery-empty" class="text-center py-10 hidden">
        <p class="text-gray-500 text-lg">暂无图片</p>
      </div>
    </div>

    <div id="lightbox-overlay" class="lightbox-overlay hidden">
      <button id="lightbox-close" class="lightbox-close">&times;</button>
      <button id="lightbox-prev" class="lightbox-nav lightbox-prev">&#8249;</button>
      <button id="lightbox-next" class="lightbox-nav lightbox-next">&#8250;</button>
      <div class="lightbox-content">
        <img id="lightbox-img" src="" alt="" />
      </div>
      <div id="lightbox-info" class="lightbox-info"></div>
    </div>
  `;

  let galleryImages = [];
  let currentIndex = 0;

  async function fetchImages() {
    const loadingEl = document.getElementById("gallery-loading");
    const gridEl = document.getElementById("gallery-grid");
    const emptyEl = document.getElementById("gallery-empty");

    loadingEl.classList.remove("hidden");
    gridEl.classList.add("hidden");
    emptyEl.classList.add("hidden");

    try {
      const fullUrl = `${apiBaseUrl.replace(/\/$/, '')}${imageListPath.startsWith('/') ? '' : '/'}${imageListPath}?format=json`;
      const res = await fetch(fullUrl);
      const data = await res.json();

      galleryImages = data.files || [];

      loadingEl.classList.add("hidden");

      if (galleryImages.length === 0) {
        emptyEl.classList.remove("hidden");
        return;
      }

      gridEl.classList.remove("hidden");
      renderGallery(galleryImages);
    } catch (error) {
      loadingEl.classList.add("hidden");
      gridEl.innerHTML = `<p class="text-red-500 text-center py-10">加载失败：${error.message}</p>`;
      gridEl.classList.remove("hidden");
    }
  }

  function renderGallery(images) {
    const gridEl = document.getElementById("gallery-grid");
    gridEl.innerHTML = "";

    images.forEach((img, index) => {
      const card = document.createElement("div");
      card.className = "gallery-card";
      card.innerHTML = `
        <div class="gallery-thumb-wrapper">
          <img src="${img.url}" alt="${img.key}" class="gallery-thumb" loading="lazy" />
          <div class="gallery-overlay">
            <span class="gallery-zoom-icon">🔍</span>
          </div>
        </div>
        <div class="gallery-card-info">
          <p class="gallery-card-name" title="${img.key}">${img.key}</p>
          <p class="gallery-card-size">${formatSize(img.size)}</p>
        </div>
      `;
      card.addEventListener("click", () => openLightbox(index));
      gridEl.appendChild(card);
    });
  }

  function formatSize(bytes) {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  function openLightbox(index) {
    currentIndex = index;
    const overlay = document.getElementById("lightbox-overlay");
    const img = document.getElementById("lightbox-img");
    const info = document.getElementById("lightbox-info");

    img.src = galleryImages[index].url;
    info.textContent = `${galleryImages[index].key}  ·  ${formatSize(galleryImages[index].size)}  ·  ${index + 1} / ${galleryImages.length}`;

    overlay.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    const overlay = document.getElementById("lightbox-overlay");
    overlay.classList.add("hidden");
    document.body.style.overflow = "";
  }

  function navigateLightbox(direction) {
    currentIndex = (currentIndex + direction + galleryImages.length) % galleryImages.length;
    const img = document.getElementById("lightbox-img");
    const info = document.getElementById("lightbox-info");

    img.src = galleryImages[currentIndex].url;
    info.textContent = `${galleryImages[currentIndex].key}  ·  ${formatSize(galleryImages[currentIndex].size)}  ·  ${currentIndex + 1} / ${galleryImages.length}`;
  }

  document.getElementById("lightbox-close").addEventListener("click", closeLightbox);
  document.getElementById("lightbox-overlay").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) closeLightbox();
  });
  document.getElementById("lightbox-prev").addEventListener("click", (e) => {
    e.stopPropagation();
    navigateLightbox(-1);
  });
  document.getElementById("lightbox-next").addEventListener("click", (e) => {
    e.stopPropagation();
    navigateLightbox(1);
  });

  document.addEventListener("keydown", function lightboxKeyHandler(e) {
    const overlay = document.getElementById("lightbox-overlay");
    if (!overlay || overlay.classList.contains("hidden")) return;

    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") navigateLightbox(-1);
    if (e.key === "ArrowRight") navigateLightbox(1);
  });

  document.getElementById("gallery-refresh-btn").addEventListener("click", fetchImages);

  await fetchImages();
}

async function loadProfilePage() {
  clearMainContent();

  mainContent.innerHTML = `
    <div id="profile-form-container"></div>
  `;

  import('./profile.js').then(module => {
    module.loadProfilePage(currentSession);
  }).catch(err => {
    console.error('加载资料模块失败', err);
  });
}

function requireLoginThen(action) {
  if (!currentSession) {
    authModal.classList.remove("hidden");
  } else {
    action();
  }
}

if (uploadBtn) {
  uploadBtn.addEventListener("click", () => requireLoginThen(loadUploadPage));
}
if (galleryBtn) {
  galleryBtn.addEventListener("click", () => requireLoginThen(loadGalleryPage));
}
if (myProfileBtn) {
  myProfileBtn.addEventListener("click", () => requireLoginThen(loadProfilePage));
}

const startUploadBtn = document.getElementById("start-upload-btn");
if (startUploadBtn) {
  startUploadBtn.addEventListener("click", () => requireLoginThen(loadUploadPage));
}

uploadBtn.addEventListener("click", loadUploadPage);
galleryBtn.addEventListener("click", loadGalleryPage);
myProfileBtn.addEventListener("click", loadProfilePage);

logoutBtn.addEventListener("click", async () => {
  try {
    await supabase.auth.signOut();
    window.location.reload();
  } catch (error) {
    console.error('登出失败', error);
    alert('登出失败，请稍后再试。');
  }
});
