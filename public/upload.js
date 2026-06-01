
export function initUpload(session) {
  const config = window.IMG_BED_CONFIG || {};
  const apiBaseUrl = config.apiBaseUrl || "http://localhost:8787";
  const MAX_FILES = config.maxFiles || 5;

  const supabase = window.supabase;

  const fileInput = document.getElementById("file");
  const uploadForm = document.getElementById("upload-form");
  const resultDiv = document.getElementById("result");
  const progressBar = document.getElementById("upload-progress-bar");
  const progressText = document.getElementById("upload-progress-text");
  const progressContainer = document.getElementById("upload-progress-container");

  fileInput.disabled = true;
  uploadForm.querySelector("button").disabled = true;

  let currentSession = session;

  if (!currentSession || !currentSession.user) {
    resultDiv.innerHTML = "⚠️ 当前未登录，请先点击右上角登录 / 注册";
  } else {
    fileInput.disabled = false;
    uploadForm.querySelector("button").disabled = false;
  }

  uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const files = fileInput.files;

    if (!currentSession || !currentSession.access_token) {
      return alert("⚠️ 请先登录再上传");
    }
    if (!files.length) return alert("请选择图片");
    if (files.length > MAX_FILES) return alert(`最多只能上传 ${MAX_FILES} 张图片`);

    const formData = new FormData();
    for (const file of files) {
      formData.append("file", file);
    }

    resultDiv.innerHTML = "";
    if (progressContainer) progressContainer.style.display = "block";
    if (progressBar) {
      progressBar.style.width = "0%";
      progressBar.style.backgroundColor = "#3b82f6";
    }
    if (progressText) progressText.textContent = "0%";

    const submitBtn = uploadForm.querySelector("button");
    submitBtn.disabled = true;
    submitBtn.textContent = "上传中...";

    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 100);
        if (progressBar) progressBar.style.width = percent + "%";
        if (progressText) progressText.textContent = percent + "%";

        if (percent >= 100) {
          if (progressBar) progressBar.style.backgroundColor = "#22c55e";
          if (progressText) progressText.textContent = "处理中...";
        }
      }
    });

    xhr.addEventListener("load", () => {
      submitBtn.disabled = false;
      submitBtn.textContent = "开始上传";

      try {
        const data = JSON.parse(xhr.responseText);

        if (xhr.status >= 200 && xhr.status < 300 && data.urls && Array.isArray(data.urls)) {
          if (progressText) progressText.textContent = "上传完成 ✓";
          resultDiv.innerHTML = `<p class="text-green-600 font-semibold mb-4">✅ 上传成功，共 ${data.urls.length} 张</p>`;
          data.urls.forEach(url => {
            resultDiv.innerHTML += `
              <div class="mt-3 p-3 bg-gray-50 rounded-lg">
                <p class="text-sm text-gray-600 break-all"><a href="${url}" target="_blank" class="text-blue-500 hover:underline">${url}</a></p>
                <img src="${url}" class="mt-2 rounded shadow-sm" style="max-width: 300px; max-height: 200px; object-fit: contain;" />
              </div>
            `;
          });
        } else {
          if (progressBar) progressBar.style.backgroundColor = "#ef4444";
          if (progressText) progressText.textContent = "上传失败 ✗";
          resultDiv.innerHTML = `<p class="text-red-600">❌ 上传失败：${data.error || '未知错误'}</p>`;
        }
      } catch (err) {
        if (progressBar) progressBar.style.backgroundColor = "#ef4444";
        if (progressText) progressText.textContent = "上传失败 ✗";
        resultDiv.innerHTML = `<p class="text-red-600">❌ 上传失败：解析响应出错</p>`;
      }
    });

    xhr.addEventListener("error", () => {
      submitBtn.disabled = false;
      submitBtn.textContent = "开始上传";
      if (progressBar) progressBar.style.backgroundColor = "#ef4444";
      if (progressText) progressText.textContent = "上传失败 ✗";
      resultDiv.innerHTML = `<p class="text-red-600">❌ 上传失败：网络错误</p>`;
    });

    xhr.addEventListener("abort", () => {
      submitBtn.disabled = false;
      submitBtn.textContent = "开始上传";
      if (progressBar) progressBar.style.backgroundColor = "#f59e0b";
      if (progressText) progressText.textContent = "上传已取消";
      resultDiv.innerHTML = `<p class="text-yellow-600">⚠️ 上传已取消</p>`;
    });

    xhr.open("POST", `${apiBaseUrl}/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${currentSession.access_token}`);
    xhr.send(formData);
  });
}
