# Phần mềm giáo dục — Thầy Bùi Văn Được

Repository phát hành: `vanduocyh2-commits/phanmemgiaoduc`, nhánh `main`.

## Website dùng chung dữ liệu

- Giao diện: `public/index.html`. Máy chủ: `portal-server.mjs`.
- Supabase PostgreSQL lưu lớp, học sinh, giáo viên, điểm, bài giao, bài nộp, báo lỗi, tiến trình ; file nằm trong bucket Storage riêng tư. Dữ liệu này nằm ngoài GitHub và ngoài filesystem tạm của dịch vụ.
- Xác thực tại máy chủ, cookie HttpOnly, mật khẩu băm PBKDF2; kiểm tra quyền từng lớp/tài khoản. Phụ huynh chỉ được xem dữ liệu của con; giáo viên chỉ quản lí lớp được giao.
- Chấm trắc nghiệm tại máy chủ. Đáp án/hướng dẫn và file đáp án không gửi vào snapshot cho học sinh.
- Bài tự luận chụp ảnh/file được đưa lên máy chủ, giáo viên mở từ máy khác.
- Bản HTML độc lập vẫn có chế độ offline. Chỉ website do `portal-server.mjs` phục vụ mới kích hoạt dữ liệu chung và xác thực máy chủ.

## Triển khai

Dùng Blueprint `render.yaml` với tài khoản GitHub đã liên kết Render. Không chọn kho public đơn thuần nếu muốn tự triển khai. Cần Node.js 22 và một dự án Supabase Free. Áp dụng migration `supabase/migrations/202610270001_portal.sql` trước khi chạy. Các biến:

- `SUPABASE_URL`: địa chỉ dự án Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: secret key dành cho máy chủ (legacy service_role hoặc sb_secret). Không dùng publishable/anon key và không đưa vào HTML.
- `DATABASE_URL`: tùy chọn để dùng PostgreSQL trực tiếp thay cho Supabase adapter.
- `SESSION_SECRET`: giá trị ngẫu nhiên tối thiểu 32 ký tự. Không sửa thường xuyên vì sẽ đăng xuất các phiên cũ.
- `ADMIN_PASSWORD`: mật khẩu khởi tạo tài khoản `admin`, tối thiểu 12 ký tự. Chỉ dùng khi cơ sở dữ liệu được tạo lần đầu. Sau đó đổi mật khẩu trong phần Quản lí tài khoản.
- `NODE_ENV=production`: cookie Secure qua HTTPS.
- `PUBLIC_ORIGIN`: tùy chọn khi dùng tên miền riêng; mặc định dùng `RENDER_EXTERNAL_URL`.

Website khởi tạo trống, không công khai dữ liệu hoặc tài khoản mẫu. Giám đốc đăng nhập, tạo giáo viên, lớp và nhập học sinh; giáo viên/học sinh/phụ huynh dùng cùng dữ liệu máy chủ. Có thể nhập bản sao lưu JSON cũ qua mục Sao lưu dữ liệu sau khi đã kiểm tra nội dung.

## Tự cập nhật mã nguồn

1. Sửa `public/index.html` (giao diện) hoặc `portal-server.mjs` (máy chủ).
2. Commit và push/merge lên `main`.
3. GitHub Actions chạy `Check application`; Render cấu hình `checksPass` sẽ tự triển khai khi các kiểm tra đạt. Khi tạo bằng API giới hạn chỉ có `autoDeploy=yes`, buildCommand vẫn chạy kiểm tra và chặn bản lỗi; có thể chọn After CI Checks Pass trong Dashboard.
4. Xác nhận deploy mới `live`. Mở lại/tải lại trang để nhận bản mới. Không ép học sinh đang làm bài tải lại.

Danh sách và bài làm ở PostgreSQL không bị ghi đè bởi mã nguồn mới. Không xóa cơ sở dữ liệu hoặc chạy SQL xóa dữ liệu khi cập nhật.

## Giới hạn gói miễn phí

Render Web Service Free chạy website, Supabase Free lưu dữ liệu và file. Cấu hình này không sử dụng Render Postgres dùng thử 30 ngày. Supabase Free hiện có 500 MB database và 1 GB Storage; dự án có thể tạm dừng sau một tuần ít hoạt động. Render Free có thể ngủ khi không có truy cập. Không bật gói trả phí.

Tối đa 10 MB/file do ứng dụng quy định. Khi đạt hạn mức miễn phí cần dọn/lưu trữ bớt dữ liệu hoặc tự quyết định nâng cấp. Khóa Supabase chỉ ở Render, bucket không công khai. Tải sao lưu định kỳ.

## Kiểm tra

`npm test` kiểm tra API kho GitHub cũ và API cổng trực tuyến với dữ liệu giả lập: xác thực, phân lớp, chấm trắc nghiệm, ngăn sửa điểm từ phía học sinh, phụ huynh chỉ đọc, file đáp án riêng tư. Luồng trình duyệt được kiểm tra riêng trong quá trình phát triển.

`server.mjs` giữ adapter kho GitHub riêng tư ở chế độ độc lập. Website hiện dùng Supabase PostgreSQL cho dữ liệu và Storage riêng tư cho file, không cần đặt GitHub token vào frontend. Không dùng repository public `phanmemgiaoduc` làm nơi lưu hồ sơ hoặc đáp án riêng tư.


## Dịch vụ đã tạo cho tài khoản này

- Website: https://phanmemgiaoduc.onrender.com
- Render: https://dashboard.render.com/web/srv-dbg366qjnfac73f4kjg0/env
- Supabase: https://supabase.com/dashboard/project/cfbtycpmgrvfualaktts/settings/api-keys

Migration đã áp dụng vào dự án phanmemgiaoduc. Bảng được khóa với anon/authenticated; bucket portal-files là private.

Để mở đăng nhập lần đầu, chủ dự án điền hai biến trong Render Environment:

1. SUPABASE_SERVICE_ROLE_KEY: secret key của dự án Supabase (sb_secret_... hoặc legacy service_role), không dùng publishable/anon key.
2. ADMIN_PASSWORD: mật khẩu tự đặt, ít nhất 12 ký tự. Đây là mật khẩu khởi tạo tài khoản admin khi dữ liệu trung tâm còn trống.

Lưu thay đổi và chọn tùy chọn triển khai lại trong Render. Không gửi secret key qua chat, không commit khóa vào GitHub. Trước khi cấu hình xong, website chỉ hiển thị trang đang thiết lập; học sinh/phụ huynh chưa đăng nhập được.


## Nhắc nộp học phí

Trong Tài chính & Học phí, giám đốc có nút **Nhắc nộp học phí** cho từng em hoặc **Nhắc nộp học phí các em đã chọn**. Chọn gửi tới cả học sinh/phụ huynh, chỉ phụ huynh hoặc chỉ học sinh; thêm lời nhắn nếu cần. Thông báo chứa đúng học sinh, lớp, tháng và số tiền còn thiếu sau khi trừ tiền đã nộp/dư. Thông báo vào chuông trong website; không tự gửi SMS, email hoặc Zalo.

Nút **Hạn nộp & tự động nhắc** đặt hạn chung cho các học sinh đã chọn hoặc riêng từng em. Chọn bật/tắt và khoảng nhắc lại 1–30 ngày (mặc định 3 ngày). Chỉ tự nhắc sau ngày hết hạn theo Asia/Ho_Chi_Minh; nếu chưa đặt hạn, chỉ các khoản đã đánh dấu Quá hạn mới đủ điều kiện. Khoản chưa lưu, đã nộp đủ, còn dư hoặc đã chuyển nợ không bị thu/nhắc trùng. Khi lưu thanh toán đủ, nhắc hiện tại tự biến mất; nộp một phần cập nhật số còn thiếu. Gửi lại thay thông báo cũ, đồng thời báo lại chưa đọc bằng updatedAt.

Máy chủ tự kiểm tra khi khởi động, mỗi 5 phút trong lúc hoạt động và kiểm tra bù khi mở/đăng nhập/làm mới dữ liệu. Không cần giữ tab giám đốc mở. Render Free có thể ngủ khi không có truy cập: lúc ngủ không thể bảo đảm gửi đúng giờ; lần truy cập tiếp theo sẽ kiểm tra bù. Không tạo cron hay tài nguyên trả phí.

`tuition-reminders.mjs` chứa logic dùng chung và runner. API POST `/api/tuition-reminders` và `/api/tuition-reminders/settings` chỉ dành cho giám đốc. Thông báo TUITION được lọc đồng thời theo lớp, SBD và vai trò người nhận ở máy chủ và giao diện. Cấu hình/lịch sử nhắc do máy chủ giữ, không bị bản dữ liệu lớp cũ trên trình duyệt ghi đè. Mọi cập nhật đi qua giao dịch/CAS của kho dữ liệu hiện có.
