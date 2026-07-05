// ==== Xác thực mật khẩu (chỉ chặn ở giao diện, không phải bảo mật thật) ====
const AUTH_STORAGE_KEY = "folderApp_authOk";

const authOverlay = document.getElementById("authOverlay");
const authForm = document.getElementById("authForm");
const authPasswordInput = document.getElementById("authPassword");
const authError = document.getElementById("authError");
const appContent = document.getElementById("appContent");
const logoutBtn = document.getElementById("logoutBtn");

function isAuthenticated() {
  return localStorage.getItem(AUTH_STORAGE_KEY) === "true";
}

function unlockApp() {
  authOverlay.style.display = "none";
  appContent.style.display = "block";
  initApp();
}

function showAuthScreen() {
  authOverlay.style.display = "flex";
  appContent.style.display = "none";
  authPasswordInput.value = "";
  authError.textContent = "";
  setTimeout(() => authPasswordInput.focus(), 50);
}

authForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const entered = authPasswordInput.value;
  if (typeof APP_PASSWORD !== "undefined" && entered === APP_PASSWORD) {
    localStorage.setItem(AUTH_STORAGE_KEY, "true");
    unlockApp();
  } else {
    authError.textContent = "Sai mật khẩu, vui lòng thử lại.";
    authPasswordInput.value = "";
    authPasswordInput.focus();
  }
});

logoutBtn.addEventListener("click", () => {
  localStorage.removeItem(AUTH_STORAGE_KEY);
  showAuthScreen();
});

document.addEventListener("DOMContentLoaded", () => {
  if (isAuthenticated()) {
    unlockApp();
  } else {
    showAuthScreen();
  }
});

// ==== Khởi tạo Supabase client ====
let supabaseClient = null;
const configOk = typeof SUPABASE_URL !== "undefined"
  && SUPABASE_URL
  && !SUPABASE_URL.includes("YOUR-PROJECT-REF")
  && typeof SUPABASE_ANON_KEY !== "undefined"
  && SUPABASE_ANON_KEY
  && !SUPABASE_ANON_KEY.includes("YOUR-ANON");

const RETENTION_MS = (typeof RETENTION_DAYS !== "undefined" ? RETENTION_DAYS : 2) * 24 * 60 * 60 * 1000;

// ==== DOM (nội dung chính) ====
const folderInput = document.getElementById("folderInput");
const dropZone = document.getElementById("dropZone");
const folderNameDisplay = document.getElementById("folderNameDisplay");
const saveBtn = document.getElementById("saveBtn");
const progressWrap = document.getElementById("progressWrap");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const folderListEl = document.getElementById("folderList");
const refreshBtn = document.getElementById("refreshBtn");
const retentionDaysLabel = document.getElementById("retentionDaysLabel");

const galleryModal = document.getElementById("galleryModal");
const galleryTitle = document.getElementById("galleryTitle");
const galleryGrid = document.getElementById("galleryGrid");
const closeModalBtn = document.getElementById("closeModal");
const deleteFolderBtn = document.getElementById("deleteFolderBtn");

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightboxImg");
const lightboxClose = document.getElementById("lightboxClose");

let pendingFiles = [];
let currentFolderPathInModal = null;
let currentFolderDisplayNameInModal = null;
let currentGalleryImages = [];
let appInitialized = false;

function initApp() {
  if (appInitialized) {
    renderFolderList();
    return;
  }
  appInitialized = true;

  if (retentionDaysLabel && typeof RETENTION_DAYS !== "undefined") {
    retentionDaysLabel.textContent = RETENTION_DAYS;
  }

  if (configOk) {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    renderFolderList();
  } else {
    document.getElementById("configWarning").style.display = "block";
  }
}

// ==== Chọn folder ====
folderInput.addEventListener("change", (e) => {
  handleFileList(e.target.files);
});

dropZone.addEventListener("dragover", (e) => { e.preventDefault(); dropZone.classList.add("drag"); });
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag"));
dropZone.addEventListener("drop", async (e) => {
  e.preventDefault();
  dropZone.classList.remove("drag");
  const items = e.dataTransfer.items;
  if (items && items.length && items[0].webkitGetAsEntry) {
    const files = await readDroppedItems(items);
    handleFileList(files);
  } else if (e.dataTransfer.files.length) {
    handleFileList(e.dataTransfer.files);
  }
});

function readDroppedItems(items) {
  return new Promise((resolve) => {
    let files = [];
    let pending = 0;
    let done = false;

    function traverse(entry, path) {
      if (entry.isFile) {
        pending++;
        entry.file((file) => {
          if (file.type.startsWith("image/")) {
            Object.defineProperty(file, "webkitRelativePath", { value: path + file.name });
            files.push(file);
          }
          pending--;
          checkDone();
        });
      } else if (entry.isDirectory) {
        const reader = entry.createReader();
        pending++;
        reader.readEntries((entries) => {
          entries.forEach(ent => traverse(ent, path + entry.name + "/"));
          pending--;
          checkDone();
        });
      }
    }

    function checkDone() {
      if (pending === 0 && done) resolve(files);
    }

    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry();
      if (entry) traverse(entry, "");
    }
    done = true;
    setTimeout(checkDone, 50);
  });
}

function handleFileList(fileList) {
  const files = Array.from(fileList).filter(f => f.type.startsWith("image/"));
  if (files.length === 0) {
    alert("Không tìm thấy tệp ảnh nào trong folder đã chọn.");
    return;
  }
  pendingFiles = files;
  const relPath = files[0].webkitRelativePath || files[0].name;
  const topFolder = relPath.includes("/") ? relPath.split("/")[0] : "Folder tải lên";
  folderNameDisplay.textContent = `📂 ${topFolder} — ${files.length} ảnh sẵn sàng để lưu`;
  folderNameDisplay.dataset.folderName = topFolder;
  saveBtn.disabled = false;
}

// ==== Tiện ích ====
function sanitizeName(name) {
  return name.replace(/[^a-zA-Z0-9-_ ]/g, "").trim().replace(/\s+/g, "_") || "folder";
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function getPublicUrl(path) {
  const { data } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
}

// ==== Lưu lên Supabase Storage ====
saveBtn.addEventListener("click", async () => {
  if (!pendingFiles.length) return;
  if (!supabaseClient) {
    alert("Chưa cấu hình Supabase. Kiểm tra file config.js.");
    return;
  }

  saveBtn.disabled = true;
  progressWrap.style.display = "block";

  const rawName = folderNameDisplay.dataset.folderName || "folder";
  // Mỗi lần lưu tạo 1 folder riêng biệt trên storage, có gắn timestamp
  // để tính hạn tự động xoá sau này (tránh đè lẫn nhau giữa các lần tải lên)
  const folderPath = `${sanitizeName(rawName)}__${Date.now()}`;

  let done = 0;
  let failed = 0;
  for (const file of pendingFiles) {
    const safeFileName = sanitizeName(file.name.replace(/\.[^.]+$/, "")) + (file.name.match(/\.[^.]+$/)?.[0] || "");
    const path = `${folderPath}/${safeFileName}`;
    const { error } = await supabaseClient.storage.from(BUCKET_NAME).upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type
    });
    if (error) {
      console.error("Lỗi upload:", file.name, error.message);
      failed++;
    }
    done++;
    const pct = Math.round((done / pendingFiles.length) * 100);
    progressBar.style.width = pct + "%";
    progressText.textContent = `${done}/${pendingFiles.length} ảnh đã xử lý`;
  }

  setTimeout(() => {
    progressWrap.style.display = "none";
    progressBar.style.width = "0%";
  }, 800);

  pendingFiles = [];
  folderNameDisplay.textContent = failed
    ? `⚠️ Đã lưu xong nhưng có ${failed} ảnh lỗi (xem console).`
    : "✅ Đã lưu folder thành công! Ảnh này giờ xem được từ máy khác.";
  folderInput.value = "";
  saveBtn.disabled = true;
  renderFolderList();
});

// ==== Tự động xoá folder cũ hơn RETENTION_DAYS ====
async function cleanupExpiredFolders(folders) {
  const now = Date.now();
  const kept = [];

  for (const folder of folders) {
    const match = folder.name.match(/__(\d+)$/);
    const ts = match ? parseInt(match[1], 10) : null;

    if (ts && (now - ts) > RETENTION_MS) {
      try {
        const { data: files } = await supabaseClient.storage.from(BUCKET_NAME).list(folder.name, { limit: 1000 });
        const paths = (files || []).map(f => `${folder.name}/${f.name}`);
        if (paths.length) {
          await supabaseClient.storage.from(BUCKET_NAME).remove(paths);
        }
        console.log("Đã tự động xoá folder hết hạn:", folder.name);
      } catch (err) {
        console.error("Lỗi khi tự xoá folder", folder.name, err);
        kept.push(folder); // giữ lại nếu xoá lỗi, thử lại lần sau
      }
    } else {
      kept.push(folder);
    }
  }

  return { kept, ts: now };
}

function getExpiryInfo(folderName) {
  const match = folderName.match(/__(\d+)$/);
  if (!match) return null;
  const ts = parseInt(match[1], 10);
  const expiresAt = ts + RETENTION_MS;
  const msLeft = expiresAt - Date.now();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  return { daysLeft, msLeft };
}

// ==== Hiển thị danh sách folder đã lưu ====
async function renderFolderList() {
  if (!supabaseClient) return;

  folderListEl.innerHTML = `<div class="empty-state">Đang tải danh sách...</div>`;

  const { data: rootEntries, error } = await supabaseClient.storage.from(BUCKET_NAME).list("", {
    limit: 1000,
    sortBy: { column: "name", order: "desc" }
  });

  if (error) {
    folderListEl.innerHTML = `<div class="empty-state">Lỗi tải danh sách: ${escapeHtml(error.message)}</div>`;
    return;
  }

  let folders = (rootEntries || []).filter(e => e.id === null);

  // Dọn dẹp folder hết hạn trước khi hiển thị
  const cleanupResult = await cleanupExpiredFolders(folders);
  folders = cleanupResult.kept;

  if (folders.length === 0) {
    folderListEl.innerHTML = `<div class="empty-state">Chưa có folder nào được lưu. Hãy tải lên một folder ảnh ở trên.</div>`;
    return;
  }

  folderListEl.innerHTML = "";

  for (const folder of folders) {
    const { data: files } = await supabaseClient.storage.from(BUCKET_NAME).list(folder.name, { limit: 1000 });
    const imageFiles = (files || []).filter(f => f.id !== null);

    const displayName = folder.name.replace(/__\d+$/, "");
    const thumbUrl = imageFiles.length ? getPublicUrl(`${folder.name}/${imageFiles[0].name}`) : "";
    const expiry = getExpiryInfo(folder.name);

    const card = document.createElement("div");
    card.className = "folder-card";
    card.innerHTML = `
      ${thumbUrl ? `<img class="thumb" src="${thumbUrl}" loading="lazy">` : `<div class="thumb"></div>`}
      <div class="fname">${escapeHtml(displayName)}</div>
      <div class="fmeta">
        <span>${imageFiles.length} ảnh</span>
        ${expiry ? `<span class="expiry-badge ${expiry.daysLeft <= 1 ? 'soon' : ''}">Còn ${expiry.daysLeft} ngày</span>` : ""}
      </div>
      <div class="card-actions">
        <button class="download-mini-btn" type="button">⬇️ Tải xuống</button>
      </div>
    `;
    card.addEventListener("click", () => openGallery(folder.name, displayName));
    const miniDownloadBtn = card.querySelector(".download-mini-btn");
    miniDownloadBtn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const imgs = imageFiles.map(f => ({ name: f.name, url: getPublicUrl(`${folder.name}/${f.name}`) }));
      await downloadFolderPlain(imgs, displayName, miniDownloadBtn);
    });
    folderListEl.appendChild(card);
  }
}

// ==== Modal gallery ====
async function openGallery(folderPath, displayName) {
  currentFolderPathInModal = folderPath;
  currentFolderDisplayNameInModal = displayName;
  currentGalleryImages = [];
  galleryTitle.textContent = `📂 ${displayName}`;
  galleryGrid.innerHTML = "Đang tải...";
  galleryModal.classList.add("open");

  const { data: files, error } = await supabaseClient.storage.from(BUCKET_NAME).list(folderPath, { limit: 1000 });
  if (error) {
    galleryGrid.innerHTML = `Lỗi: ${escapeHtml(error.message)}`;
    return;
  }

  const imageFiles = (files || []).filter(f => f.id !== null);
  galleryGrid.innerHTML = "";
  imageFiles.forEach(f => {
    const url = getPublicUrl(`${folderPath}/${f.name}`);
    currentGalleryImages.push({ name: f.name, url });
    const el = document.createElement("img");
    el.src = url;
    el.alt = f.name;
    el.loading = "lazy";
    el.addEventListener("click", () => {
      lightboxImg.src = url;
      lightbox.classList.add("open");
    });
    galleryGrid.appendChild(el);
  });
}

const downloadFolderBtn = document.getElementById("downloadFolderBtn");

// Tải folder về dạng file gốc (không nén zip).
// - Chrome/Edge: dùng File System Access API để tạo 1 folder thật trên máy và ghi file gốc vào đó.
// - Trình duyệt khác: tải từng ảnh riêng lẻ về thư mục Downloads mặc định.
async function downloadFolderPlain(images, folderDisplayName, triggerBtn) {
  if (!images || !images.length) {
    alert("Folder này không có ảnh để tải.");
    return;
  }

  const originalText = triggerBtn ? triggerBtn.textContent : null;
  if (triggerBtn) {
    triggerBtn.disabled = true;
    triggerBtn.textContent = "Đang tải...";
  }

  try {
    if (window.showDirectoryPicker) {
      // Cách 1: chọn thư mục đích, tạo folder con và ghi từng file gốc vào đó
      const rootHandle = await window.showDirectoryPicker();
      const folderHandle = await rootHandle.getDirectoryHandle(sanitizeName(folderDisplayName), { create: true });

      let done = 0;
      for (const img of images) {
        const resp = await fetch(img.url);
        if (!resp.ok) throw new Error(`Không tải được ảnh: ${img.name}`);
        const blob = await resp.blob();
        const fileHandle = await folderHandle.getFileHandle(img.name, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();
        done++;
        if (triggerBtn) triggerBtn.textContent = `Đang lưu ${done}/${images.length}...`;
      }

      if (triggerBtn) triggerBtn.textContent = "✅ Đã lưu xong!";
      setTimeout(() => {
        if (triggerBtn) { triggerBtn.disabled = false; triggerBtn.textContent = originalText; }
      }, 1500);
      return;
    }

    // Cách 2 (fallback): tải từng ảnh riêng lẻ về Downloads
    let done = 0;
    for (const img of images) {
      const resp = await fetch(img.url);
      if (!resp.ok) throw new Error(`Không tải được ảnh: ${img.name}`);
      const blob = await resp.blob();
      const objUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = img.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objUrl);
      done++;
      if (triggerBtn) triggerBtn.textContent = `Đang tải ${done}/${images.length}...`;
      await new Promise(r => setTimeout(r, 250)); // tránh trình duyệt chặn tải liên tiếp
    }

    if (triggerBtn) triggerBtn.textContent = "✅ Đã tải xong!";
    setTimeout(() => {
      if (triggerBtn) { triggerBtn.disabled = false; triggerBtn.textContent = originalText; }
    }, 1500);
  } catch (err) {
    if (err.name === "AbortError") {
      // Người dùng bấm huỷ hộp thoại chọn thư mục — không cần báo lỗi
      if (triggerBtn) { triggerBtn.disabled = false; triggerBtn.textContent = originalText; }
      return;
    }
    console.error("Lỗi khi tải folder xuống:", err);
    alert("Có lỗi khi tải folder xuống: " + err.message);
    if (triggerBtn) { triggerBtn.disabled = false; triggerBtn.textContent = originalText; }
  }
}

downloadFolderBtn.addEventListener("click", () => {
  downloadFolderPlain(currentGalleryImages, currentFolderDisplayNameInModal || "folder", downloadFolderBtn);
});

closeModalBtn.addEventListener("click", () => {
  galleryModal.classList.remove("open");
  currentFolderPathInModal = null;
});

deleteFolderBtn.addEventListener("click", async () => {
  if (!currentFolderPathInModal) return;
  if (!confirm("Bạn có chắc muốn xóa toàn bộ folder này (xóa vĩnh viễn trên Supabase)?")) return;

  const { data: files } = await supabaseClient.storage.from(BUCKET_NAME).list(currentFolderPathInModal, { limit: 1000 });
  const paths = (files || []).map(f => `${currentFolderPathInModal}/${f.name}`);
  if (paths.length) {
    await supabaseClient.storage.from(BUCKET_NAME).remove(paths);
  }

  galleryModal.classList.remove("open");
  renderFolderList();
});

lightboxClose.addEventListener("click", () => lightbox.classList.remove("open"));
lightbox.addEventListener("click", (e) => {
  if (e.target === lightbox) lightbox.classList.remove("open");
});

refreshBtn.addEventListener("click", renderFolderList);
