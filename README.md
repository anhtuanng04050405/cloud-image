# Lưu trữ Folder Ảnh (Supabase Storage)

Web app tĩnh (HTML/CSS/JS thuần) cho phép tải lên một folder ảnh, lưu trên **Supabase Storage**
để xem được từ nhiều máy/thiết bị khác nhau. Có màn hình mật khẩu và tự động xoá folder cũ.

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

Vào menu trái → **SQL Editor** → **New query** → dán cả 3 câu sau vào cùng lúc → bấm **Run**:

```sql
create policy "Public read photos"
on storage.objects for select
using ( bucket_id = 'photos' );

create policy "Public upload photos"
on storage.objects for insert
with check ( bucket_id = 'photos' );

create policy "Public delete photos"
on storage.objects for delete
using ( bucket_id = 'photos' );
```

Sau đó vào **Storage** → bucket `photos` → tab **Policies** để xác nhận có 3 policy.

⚠️ Cấu hình này cho phép **bất kỳ ai có link trang** upload/xóa được ảnh trực tiếp qua API Supabase
(không qua giao diện web). Màn hình mật khẩu ở Bước 5 chỉ chặn được người vào bằng giao diện web,
không chặn được người gọi trực tiếp API. Nếu cần chặn triệt để, cần chuyển sang Supabase Auth.

## Bước 4: Lấy API key và điền vào code

1. Vào **Project Settings** (icon bánh răng) → **API Keys** → tab **Legacy anon, service_role API keys**.
2. Copy khoá dòng **anon / public** (chuỗi dài bắt đầu `eyJhbGciOi...`).
3. Vào **Project Settings** → **General** → copy **Project ID**, ví dụ `abcxyz123`.
4. Project URL sẽ là: `https://<Project ID>.supabase.co`
5. Mở file `config.js`, điền:

```js
const SUPABASE_URL = "https://abcxyz123.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOi...";
const BUCKET_NAME = "photos";
const APP_PASSWORD = "Anhtuanng04050405__";
const RETENTION_DAYS = 2;
```

- `APP_PASSWORD`: mật khẩu để vào trang (đổi thành mật khẩu khác nếu muốn).
- `RETENTION_DAYS`: số ngày giữ ảnh trước khi tự xoá (mặc định 2).

## Bước 5: Cách hoạt động của mật khẩu

- Khi mở trang, người dùng phải nhập đúng `APP_PASSWORD` mới vào được.
- Sau khi nhập đúng 1 lần, trình duyệt đó sẽ nhớ (dùng `localStorage`) và không hỏi lại,
  cho đến khi bấm nút **Đăng xuất** hoặc xoá dữ liệu trình duyệt.
- **Lưu ý quan trọng**: đây chỉ là lớp chặn giao diện, không phải bảo mật thật sự — vì đây là code
  JavaScript chạy hoàn toàn trên trình duyệt, ai mở "View Page Source" hoặc DevTools đều xem được
  mật khẩu này trong `config.js`. Phù hợp để ngăn người lạ tình cờ vào nhầm link, không phù hợp nếu
  cần bảo vệ dữ liệu nhạy cảm thật sự. Nếu cần bảo mật chắc chắn hơn, nên chuyển sang Supabase Auth
  (đăng nhập thật, có kiểm tra ở phía server) — báo lại nếu bạn muốn nâng cấp phần này.

## Bước 6: Cách hoạt động của tự động xoá folder cũ

- Mỗi folder khi lưu sẽ được gắn kèm thời điểm tạo (timestamp) trong tên.
- Mỗi khi có ai mở trang (load danh sách folder), hệ thống sẽ kiểm tra và **tự xoá** những folder
  đã quá `RETENTION_DAYS` ngày kể từ lúc tải lên.
- Cơ chế này chạy ở phía trình duyệt (client-side), nghĩa là chỉ xoá khi có người mở trang —
  không có ai truy cập thì folder cũ vẫn còn nằm đó cho tới khi có người mở trang lần kế tiếp.
- Nếu cần xoá đúng giờ dù không có ai truy cập (ví dụ chạy nền mỗi ngày), cần thiết lập thêm
  **Supabase Edge Function + Cron job** ở phía server — đây là phần nâng cao, báo lại nếu bạn cần
  mình hướng dẫn thêm.
- Mỗi thẻ folder trong danh sách sẽ hiện nhãn "Còn X ngày" để biết thời gian trước khi bị xoá.

## Bước 7: Đẩy code lên GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<ten-user>/<ten-repo>.git
git push -u origin main
```

## Bước 8: Deploy (chọn 1 trong 2 cách)

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

## Giới hạn cần biết

- Gói Supabase miễn phí: 1GB storage, 2GB băng thông/tháng — đủ dùng cho ảnh nhẹ với lượng truy cập vừa phải.
- Mật khẩu chỉ chặn ở giao diện, không chặn được người gọi trực tiếp API Supabase.
- Tự động xoá folder cũ chỉ chạy khi có người mở trang (client-side), không chạy nền 24/7.
