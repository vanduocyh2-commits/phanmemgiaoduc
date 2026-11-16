# Kế hoạch triển khai module Bài giảng Toán AI — KNTT

## Phạm vi đã xác nhận
- Môn Toán, bộ Kết nối tri thức với cuộc sống (KNTT), chương trình GDPT 2018.
- Phạm vi nghiệp vụ: tất cả các khối 1–12; chọn theo Khối → Tập → Chương/Chủ đề → Bài học.
- Mỗi bài học là một bản ghi độc lập; không tạo dữ liệu giáo án vào ngân hàng câu hỏi.
- Bài giảng có nội dung giải thích, công thức, hình vẽ/sơ đồ minh họa, ví dụ mẫu, hoạt động và câu hỏi kiểm tra nhanh.
- Giáo viên xem trước/chỉnh sửa trước khi lưu hoặc giao; học sinh chỉ xem bản đã được giáo viên phát hành.

## Kiểm kê mã nguồn
- Repository: `vanduocyh2-commits/phanmemgiaoduc`, nhánh phát hành `main`.
- Entry giao diện theo README: `public/index.html`.
- Server: `portal-server.mjs`.
- Danh mục Toán KNTT hiện có: `public/question-bank-catalog.json`.
- Hệ thống đã có cấu trúc `lessonPlans`, `centerLessons`, `lessonProgress` và API/thư viện học liệu; cần mở rộng có kiểm soát, không tạo kho dữ liệu song song.
- Module PowerPoint/lesson resource hiện tại: `lesson-resources.mjs`; kiểm tra giao diện và phân quyền hiện có trong `test/lesson-resources.test.mjs`.

## Phát hiện quan trọng
- Danh mục đang có 14 quyển Toán KNTT lớp 6–12, 63 chương, 230 bài học.
- Danh mục hiện chưa có lớp 1–5. Vì yêu cầu là tất cả các khối, không được coi danh mục hiện tại là đầy đủ; cần bổ sung và đối chiếu mục lục sách hiện hành lớp 1–5 trước khi bật phạm vi toàn trường.
- `public/index.html` trên GitHub có blob khoảng 1.55 MB; công cụ đọc tệp hiện không trả nội dung của blob lớn này. SHA đã kiểm tra: `639d02422192b5ed4edadb943f80faa13905b5aa`.
- Chưa có bằng chứng từ máy chủ đang chạy để xác nhận commit/file đang được phục vụ trên VPS tại thời điểm kiểm tra. README mô tả Render, trong khi workflow `.github/workflows/deploy.yml` có cơ chế deploy VPS. Cần đối chiếu health/deploy hiện tại trước khi triển khai production.

## Nguyên tắc dữ liệu và an toàn
- Không sửa/xóa các mảng dữ liệu hiện có: `classes`, `accounts`, `questionBank`, `learningExams`, `assignments`, `learningSubmissions`, `gradeBook`, `lessonPlans`, `centerLessons`, `lessonProgress`.
- Tái sử dụng kho dữ liệu và xác thực hiện có; chỉ thêm trường tùy chọn hoặc API có kiểm tra quyền.
- AI chỉ tạo bản nháp. Không tự động phát hành, giao bài, chấm điểm hoặc thay đổi ngân hàng câu hỏi.
- Không lưu API key ở frontend; gọi AI từ server qua biến môi trường.
- Hình minh họa phải là hình/sơ đồ do AI tạo hoặc đồ họa SVG có thể kiểm tra; công thức lưu dạng nguồn có thể render, không biến toàn bộ bài giảng thành ảnh.
- Có mã bài học ổn định theo catalog, phiên bản nội dung, người tạo, trạng thái draft/review/published và nhật ký cập nhật.

## Các giai đoạn
1. **Kiểm kê & bảo toàn**: xác nhận nguồn triển khai thực tế, sao lưu mã và dữ liệu, đối chiếu catalog 1–12.
2. **Nền dữ liệu & dịch vụ AI**: schema bản nháp theo lessonId; API server-side; xác thực/phân quyền; giới hạn đầu vào, timeout, quota và xử lý lỗi.
3. **Giao diện giáo viên**: bộ chọn sách/bài học; cấu hình độ dài, mục tiêu, mức độ; tạo bản nháp có hình vẽ; xem trước và chỉnh sửa.
4. **Thư viện & phát hành**: lưu vào thư viện hiện có; gắn lớp; giáo viên duyệt rồi mới công bố; học sinh xem theo phân quyền.
5. **Kiểm thử & triển khai**: unit/API/UI tests, kiểm tra dữ liệu cũ, deploy canary/nhánh phát hành, health check và rollback.

## Tiêu chí nghiệm thu
- Chọn đúng bài học theo sách/tập/chương; không sinh nhầm khối hoặc tập.
- Nội dung bám tên bài và mục tiêu bài học; giáo viên có quyền sửa trước phát hành.
- Công thức, hình học, đồ thị và nhãn hình hiển thị đúng trên desktop/mobile.
- Bản nháp không hiển thị cho học sinh; học sinh không truy cập chéo lớp.
- Không làm thay đổi dữ liệu hiện có khi tạo/sửa/xóa bản nháp.
- Kiểm thử hiện có vẫn đạt trước khi triển khai production.
