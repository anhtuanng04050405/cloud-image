# Lưu trữ Folder Ảnh (Supabase Storage)

Web app tĩnh (HTML/CSS/JS thuần) cho phép tải lên một folder ảnh, lưu trên **Supabase Storage**
để xem được từ nhiều máy/thiết bị khác nhau.

## Bước 1: Tạo project Supabase (miễn phí)

1. Vào https://supabase.com → **Start your project** → đăng nhập (GitHub) → **New project**.
2. Đặt tên, chọn database password bất kỳ, chọn region gần bạn (Singapore là gần VN nhất).
3. Đợi ~1-2 phút để project khởi tạo xong.

## Bước 2: Tạo Storage bucket

1. Vào project vừa tạo → menu bên trái chọn **Storage**.
2. Bấm **New bucket**, đặt tên là `photos` (đúng tên này, hoặc nếu đổi tên khác thì nhớ sửa lại trong `config.js`).
3. Bật **Public bucket** = ON (để ảnh xem được qua URL công khai).
4. Bấm **Create bucket**.

## Bước 3: Cho phép upload/xóa từ trình duyệt (Storage Policies)

Vì trang không có server riêng, cần cho phép "anon key" (khoá công khai) upload/xóa trực tiếp.

1. Vào **Storage** → bấm vào bucket `photos` → tab **Policies**.
2. Bấm **New policy** → chọn **For full customization** (hoặc "Create a policy from scratch").
3. Tạo lần lượt 3 policy sau (mỗi cái áp dụng cho bucket `photos`):

**Policy đọc (SELECT):**
```sql
create policy "Public read photos"
on storage.objects for select
using ( bucket_id = 'photos' );
```

**Policy tải lên (INSERT):**
```sql
create policy "Public upload photos"
on storage.objects for insert
with check ( bucket_id = 'photos' );
```

**Policy xóa (DELETE):**
```sql
create policy "Public delete photos"
on storage.objects for delete
using ( bucket_id = 'photos' );
```

> Cách nhanh hơn: vào **SQL Editor** (menu trái) → **New query** → dán cả 3 đoạn SQL trên cùng lúc → **Run**.

⚠️ **Lưu ý bảo mật**: cấu hình này cho phép **bất kỳ ai có link trang web** đều upload/xóa được ảnh
(không cần đăng nhập). Phù hợp cho nhu cầu cá nhân/nội bộ đơn giản. Nếu cần bảo mật hơn (chỉ mình bạn
upload/xóa được), cho mình biết để thêm phần đăng nhập (Supabase Auth).

## Bước 4: Lấy API key và điền vào code

1. Vào **Project Settings** (icon bánh răng) → **API**.
2. Copy **Project URL** và **anon public key**.
3. Mở file `config.js`, dán vào:

```js
const SUPABASE_URL = "https://xxxxxxxx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOi...";
const BUCKET_NAME = "photos";
```

## Bước 5: Đẩy code lên GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<ten-user>/<ten-repo>.git
git push -u origin main
```

## Bước 6: Deploy (chọn 1 trong 2 cách)

### Cách A — GitHub Pages (đơn giản nhất, miễn phí)

1. Vào repo trên GitHub → **Settings** → **Pages**.
2. Ở mục **Build and deployment** → **Source** chọn **Deploy from a branch**.
3. **Branch** chọn `main`, thư mục chọn `/ (root)` → **Save**.
4. Đợi 1-2 phút, trang sẽ có địa chỉ dạng: `https://<ten-user>.github.io/<ten-repo>/`.

### Cách B — Vercel hoặc Netlify (deploy nhanh, tự động khi push code mới)

1. Vào https://vercel.com hoặc https://netlify.com → đăng nhập bằng GitHub.
2. Chọn **New Project / New site from Git** → chọn repo vừa push.
3. Vì là static site, không cần build command gì cả → bấm **Deploy**.
4. Xong, có ngay 1 URL dùng được, và mỗi lần bạn push code mới lên GitHub sẽ tự deploy lại.

## Kiểm tra hoạt động

Mở trang đã deploy, nếu thấy dòng cảnh báo đỏ "Bạn chưa điền thông tin Supabase" nghĩa là
`config.js` chưa đúng — kiểm tra lại URL/key. Nếu không thấy cảnh báo, thử tải 1 folder ảnh lên,
sau đó mở trang bằng máy/điện thoại khác để kiểm tra ảnh đã hiện ra chưa.

## Giới hạn cần biết

- Gói Supabase miễn phí: 1GB storage, 2GB băng thông/tháng — đủ dùng cho ảnh nhẹ với lượng truy cập vừa phải.
- Bucket đang để public + cho phép anon insert/delete, nên ai có link web đều thao tác được — đừng chia sẻ link công khai nếu không muốn người lạ upload/xóa ảnh.
