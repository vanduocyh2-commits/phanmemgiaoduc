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

## Kho học sinh bỏ học

Trong **Lớp học & Học sinh** (Giám đốc) hoặc **Danh sách học sinh** (Giáo viên), nút **Bỏ học** chuyển hồ sơ của học sinh trong lớp đã chọn vào kho. Giám đốc thao tác mọi lớp; giáo viên chỉ thao tác/xem kho của lớp được phân công. Kho có nút mở riêng ngoài danh sách, tìm theo tên, SBD, phụ huynh, số điện thoại hoặc lớp cũ, xem đầy đủ hồ sơ và tải bản JSON.

Hồ sơ lưu bản gốc thông tin học sinh, phụ huynh, trường/lớp/giáo viên, học phí và ghi chú, lịch sử điểm danh, điểm/bài nộp/lượt làm, phản hồi, tiến trình và hồ sơ đăng ký liên quan. Tệp đính kèm được giữ và giáo viên lớp có quyền đọc lại từ kho. Dữ liệu được chuyển khỏi danh sách đang học trong một lần lưu trạng thái chung; không phát sinh nhắc học phí hay lượt giao bài mới cho em đã bỏ học. Các bản lưu cũ trên màn hình không được tự đưa em trở lại lớp. SBD đang lưu trữ được giữ chỗ khi cấp mã mới.

Giám đốc có thể khôi phục vào lớp cũ cùng lịch sử và tài khoản. Không khôi phục khi lớp mất, SBD/tài khoản/hồ sơ bị trùng. Thông tin xác thực được cất riêng trên máy chủ, không gửi xuống kho hiển thị hay bản JSON tải về. Mọi hồ sơ tiếp tục nằm trong dữ liệu Supabase hiện có, không ghi thông tin học sinh lên GitHub. Không cần thay đổi schema.


## Cập nhật danh sách học sinh và hoàn tác

Trong danh sách học sinh của giám đốc và giáo viên, bảng dùng hàng ngang gọn, cuộn ngang để xem đầy đủ cột. Nút **Cập nhật mới** cập nhật các thông tin có nội dung và thêm học sinh chưa có; không xóa học sinh vắng mặt trong file. Nút **Cập nhật thêm** chỉ thêm học sinh mới, bỏ qua toàn bộ hồ sơ đã có hoặc đề nghị của giáo viên đang chờ duyệt. Khớp bằng SBD nếu có; nếu không, dùng tên/ngày sinh trong lớp đã chọn. Ô trống không xóa thông tin hiện tại, không đổi mật khẩu học sinh cũ.

Bản nhập gần nhất của mỗi lớp được lưu trên máy chủ. **Trở lại** hoàn tác đúng bản nhập này, kể cả sau khi tải lại trang. Chỉ hoàn tác những trường hồ sơ đã đổi; không phục hồi đè lên điểm, học phí, điểm danh. Học sinh mới chỉ được rút khỏi danh sách nếu chưa phát sinh dữ liệu học tập/tài chính hoặc thay đổi tài khoản. Dữ liệu đã đổi tiếp hoặc hồ sơ giáo viên đã được duyệt sẽ chặn hoàn tác để tránh mất dữ liệu mới. Giáo viên vẫn gửi giám đốc duyệt; có thể hoàn tác đề nghị còn chờ xử lý. Giám đốc có thể hoàn tác lần nhập gần nhất trong lớp, giáo viên chỉ thao tác lớp được phân công và bản nhập của mình.

API POST `/api/students/import` và `/api/students/import/undo` xử lý tại máy chủ qua cơ chế lưu trạng thái hiện có, không cần đổi schema. Bản lưu hoàn tác và thông tin xác thực không gửi về trình duyệt; chỉ gửi thời điểm/tệp/chỉ số của lần nhập. Kiểm thử bổ sung: `node --test test/roster-import.test.mjs`.


## Miễn học phí và cộng dồn theo ô được chọn

Tài chính & Học phí: chọn **Miễn toàn bộ tháng này (0 đ)** trong Chỉnh sửa mức thu sẽ đưa tổng phải thu tháng đó về 0, bao gồm phô tô và khoản khác; không phát sinh lại tiền khi cập nhật điểm danh. Nợ các tháng trước vẫn giữ ở tháng cũ, không chuyển vào tháng miễn. Số tiền đã thực nộp, ngày thu và ghi chú được giữ; tiền đã nộp thừa trở thành số dư. Giảm % và giảm số tiền vẫn chỉ giảm tiền học.

Ba tổng Phải thu / Đã nộp / Còn thiếu cộng đúng các học sinh đã tích chọn, theo khóa lớp + SBD; tích thêm lớp cộng thêm, bỏ tích trừ lớp đó. Không chọn ô nào thì các tổng bằng 0. Giữ lựa chọn khi đổi lớp, tìm kiếm hoặc trạng thái; đổi tháng hoặc Bỏ chọn tất cả xóa lựa chọn. Dòng phạm vi nêu số lớp / học sinh đã chọn kể cả ngoài bộ lọc. Mỗi lớp có thể có đơn giá và khoản thu riêng, không cần đặt một giá chung mới tính được tổng.

**Tính lại các ô đã chọn** tính và lưu lại từ điểm danh hiện tại trên máy chủ cùng cài đặt đã lưu của từng lớp. **Lưu cách tính cho các em đã chọn** áp dụng các giá trị đang xem trước. Khoản đã đóng có thu tiền hoặc đã chuyển nợ được giữ nguyên; khoản miễn được tính lại về 0. Bản ghi miễn cũ cần chọn và bấm Tính lại để áp dụng cách miễn toàn bộ tháng. Trong hộp chỉnh sửa từng học sinh có thêm **Tính lại** để xem lại trước khi lưu; chỉnh sửa riêng vẫn giữ khoản đã thu. API chỉ cho giám đốc, lưu cả nhóm trong một giao dịch, chặn bản dữ liệu cũ / trùng dòng / học sinh không tồn tại.

Kiểm tra: `npm test`, gồm tính miễn bằng 0, giữ nợ cũ và số tiền đã nộp, cộng nhiều lớp khác đơn giá, bỏ chọn, đổi bộ lọc và phân quyền API.
