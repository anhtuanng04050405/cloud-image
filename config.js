// ==== ĐIỀN THÔNG TIN SUPABASE CỦA BẠN VÀO ĐÂY ====
// Lấy tại: Supabase Dashboard > Project Settings > General (Project URL)
//          Supabase Dashboard > Project Settings > API Keys > Legacy anon key
const SUPABASE_URL = "https://yzgdnrvexfkuaxyjnjgt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl6Z2RucnZleGZrdWF4eWpuamd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODMxOTg2MzMsImV4cCI6MjA5ODc3NDYzM30.kczZAelK_2odpIPCBW6vTpH0kBjQtUdCsRpfAb2Xbik";

// Tên bucket lưu trữ ảnh (tạo trong Supabase > Storage)
const BUCKET_NAME = "photos";

// Mật khẩu để vào trang (chỉ là lớp chặn giao diện, không phải bảo mật thật sự -
// vì đây là code chạy trên trình duyệt, ai xem mã nguồn cũng thấy được mật khẩu này)
const APP_PASSWORD = "Aa123456__";

// Số ngày giữ ảnh trước khi tự động xoá (mặc định 2 ngày)
const RETENTION_DAYS = 2;
