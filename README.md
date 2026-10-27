# Cổng thông tin giáo dục — mã nguồn và kho file GitHub

## Đã tích hợp

- Tách đề, đáp án và tài liệu bài giảng khỏi localStorage; file dùng IndexedDB khi chưa có máy chủ.
- Tự chuyển file cũ trong dữ liệu cổng và bản nháp sang IndexedDB trước khi mở phần mềm. Chỉ thay dữ liệu sau khi lưu file thành công; dữ liệu cũ không bị xóa trước.
- Kho GitHub PRIVATE qua API Node.js. GitHub token chỉ có ở máy chủ, không đưa vào HTML.
- Giữ đáp án ngoài snapshot/gói giao bài. API đáp án yêu cầu phiên đăng nhập kho dành cho giáo viên.
- Gói giao bài và bản sao lưu xuất ra sẽ chứa file trên thiết bị để có thể mang sang máy khác. File GitHub dùng mã tham chiếu.

## Chạy bằng máy chủ

1. Cài Node.js 22.9 trở lên, hoặc dùng Docker.
2. Tạo repository **private** dành riêng cho dữ liệu file, khởi tạo nhánh `main` (ví dụ thêm README). Mã nguồn ứng dụng có thể ở repository khác. Không đưa dữ liệu học sinh vào kho public.
3. Tạo fine-grained GitHub token chỉ cấp cho kho dữ liệu, quyền Contents: Read and write. Không gửi token trong hội thoại; đặt trên máy chủ.
4. Sao chép `.env.example` thành `.env`. Điền chủ kho, tên kho, nhánh, token, PUBLIC_ORIGIN. Đặt mật khẩu kho ít nhất 12 ký tự, SESSION_SECRET ngẫu nhiên ít nhất 32 ký tự (ví dụ `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
5. Chạy `npm start`. Khi thử trên máy, dùng `PUBLIC_ORIGIN=http://localhost:3000`.
6. Phát hành bằng một máy chủ hỗ trợ Node/Docker và HTTPS, cấu hình các biến môi trường tương ứng. GitHub Pages không chạy được API Node trong gói này.
7. Mở phần mềm → Quản lí giáo viên hoặc Tải đề → **Kho file GitHub / thiết bị**. Nhập URL máy chủ và mật khẩu kho. File tải mới sẽ được đưa vào repo private. Mỗi phiên giáo viên cần đăng nhập kho; không chia sẻ mật khẩu kho cho học sinh.

Không có repo/token được cài sẵn. Gói này chưa được triển khai vào tài khoản GitHub hoặc máy chủ của bạn.

## Dữ liệu và giới hạn thực tế

- Kho file này giải quyết file đề, đáp án, tài liệu bài giảng; danh sách, điểm, giao bài vẫn dùng cơ chế dữ liệu chung/Firebase đã có trong ứng dụng. Chưa kết nối dữ liệu chung thì các máy không tự có cùng danh sách.
- Bài tự luận đính kèm vẫn dùng kho bài nộp cũ/gói JSON, chưa đẩy qua API kho GitHub này.
- File IndexedDB chỉ tồn tại trong trình duyệt/thiết bị đã lưu. File cũ không tự tải lên GitHub: sau khi kết nối kho, mở đề rồi chọn lại file để đưa lên kho.
- API dùng mật khẩu kho riêng cho nhân sự; nó không thay thế hệ thống xác thực/phân quyền người dùng của cổng. Đăng nhập và phân quyền cổng hiện vẫn là logic ở trình duyệt; cần triển khai xác thực máy chủ và kiểm soát truy cập dữ liệu trước khi mở dịch vụ công khai cho dữ liệu thật.
- Link đọc đề/bài giảng là mã truy cập chia sẻ: ai giữ link có thể đọc file. Đáp án không cấp link chia sẻ, chỉ mở bằng phiên kho hợp lệ. Muốn thu hồi toàn bộ link, đổi SESSION_SECRET (đồng thời các phiên kho hết hiệu lực).
- Tối đa 10 MB/file do ứng dụng quy định. GitHub có giới hạn API/dung lượng/băng thông; kho này không phải dịch vụ lưu file không giới hạn. Mỗi lần tải file tạo một commit. Không tự xóa lịch sử Git.
- Không công khai kho dữ liệu. Giữ .env ngoài Git. Sao lưu dữ liệu trước khi chuyển máy/đổi tên miền; không xóa dữ liệu trình duyệt khi chưa sao lưu.
- Nên tách repository mã nguồn và repository kho dữ liệu. Không dùng GitHub Pages làm máy chủ chứa mật khẩu/dữ liệu học sinh.

## Kiểm tra

`npm test` dùng GitHub giả lập: kiểm tra repo private, xác thực kho, tải/đọc đề, chặn đáp án với học sinh, không lộ token. Không cần GitHub token thật để chạy kiểm tra.

Tài liệu API: https://docs.github.com/en/rest/repos/contents
Giới hạn GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

## Tự cập nhật từ mã nguồn

Repository phát hành: `vanduocyh2-commits/phanmemgiaoduc`, nhánh `main`.

- Sửa giao diện ở `public/index.html`, máy chủ ở `server.mjs`; commit và push lên GitHub.
- GitHub Actions chạy `Check application`. Render liên kết tài khoản GitHub và repository này với `autoDeployTrigger: checksPass`; chỉ triển khai khi kiểm tra đạt.
- `render.yaml` chuẩn bị cấu hình dịch vụ Node miễn phí; chưa tự tạo dịch vụ hoặc kết nối tài khoản Render.
- Link public Git URL đơn thuần không bật được auto-deploy: phải cấp quyền GitHub trong Render và chọn repository từ tài khoản đã kết nối.
- Dữ liệu file nằm ở repository PRIVATE khác, cấu hình bằng GITHUB_REPO. Không dùng repository public phanmemgiaoduc làm kho dữ liệu.
- Mật khẩu, token và cấu hình dữ liệu đặt ở môi trường Render; không sửa trong mã nguồn.
- Có thể sửa file trực tiếp trên GitHub hoặc push từ máy. File chưa push sẽ không thay đổi website.
- Học sinh đang làm bài không bị ép tải lại trang khi có phiên bản mới; mở trang/tải lại sau khi triển khai xong để dùng bản mới.

Chưa mở cho học sinh/phụ huynh chỉ bằng việc push mã này: cần hoàn thiện xác thực máy chủ của cổng và cơ sở dữ liệu chung trước khi dùng dữ liệu thật. CI hiện kiểm tra API kho file; chưa xác nhận đăng nhập và đồng bộ cổng trên dịch vụ thật.
