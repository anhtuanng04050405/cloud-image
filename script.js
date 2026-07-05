// ==== Khởi tạo Supabase client ====
let supabaseClient = null;
const configOk = typeof SUPABASE_URL !== "undefined"
  && SUPABASE_URL
  && !SUPABASE_URL.includes("YOUR-PROJECT-REF")
  && typeof SUPABASE_ANON_KEY !== "undefined"
  && SUPABASE_ANON_KEY
  && !SUPABASE_ANON_KEY.includes("YOUR-ANON");

if (configOk) {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("configWarning").style.display = "block";
  });
}

// ==== DOM ====
const folderInput = document.getElementById("folderInput");
const dropZone = document.getElementById("dropZone");
const folderNameDisplay = document.getElementById("folderNameDisplay");
const saveBtn = document.getElementById("saveBtn");
const progressWrap = document.getElementById("progressWrap");
const progressBar = document.getElementById("progressBar");
const progressText = document.getElementById("progressText");
const folderListEl = document.getElementById("folderList");
const refreshBtn = document.getElementById("refreshBtn");

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
  // Mỗi lần lưu tạo 1 folder riêng biệt trên storage (tránh đè lẫn nhau)
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

  const folders = (rootEntries || []).filter(e => e.id === null);

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

    const card = document.createElement("div");
    card.className = "folder-card";
    card.innerHTML = `
      ${thumbUrl ? `<img class="thumb" src="${thumbUrl}" loading="lazy">` : `<div class="thumb"></div>`}
      <div class="fname">${escapeHtml(displayName)}</div>
      <div class="fmeta">${imageFiles.length} ảnh</div>
    `;
    card.addEventListener("click", () => openGallery(folder.name, displayName));
    folderListEl.appendChild(card);
  }
}

// ==== Modal gallery ====
async function openGallery(folderPath, displayName) {
  currentFolderPathInModal = folderPath;
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

// ==== Khởi động ====
document.addEventListener("DOMContentLoaded", () => {
  if (supabaseClient) renderFolderList();
});
