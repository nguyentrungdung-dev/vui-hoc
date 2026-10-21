# Tiến độ triển khai MVP

Ngày cập nhật: 21/10/2026.

## Bước 1 — Giao diện và điều hướng bằng dữ liệu mẫu

Đã dựng Next.js + TypeScript trong thư mục `MVP vui học`, chuyển `MVP_SPEC.md` vào cùng dự án và tái sử dụng bộ hình nhân vật từ bản demo được cung cấp.

### Đã có

- Trang chủ với bốn khu vực, hồ sơ, 16 nhân vật và mục tiêu mỗi ngày.
- Màn hình Toán, tải PDF/ảnh, cấu hình bài học, tiến trình mô phỏng và menu chủ đề.
- Tách luồng ôn bài với TIMO, đề mẫu 12 câu với bộ luyện mới 25 câu mặc định.
- Chọn đáp án/điền số, bản dịch TIMO, gợi ý tăng dần, thử lại, lời giải và hướng dẫn từng bước.
- Điểm lần đầu /10 tách khỏi lượt dùng gợi ý; kết quả và lịch sử.
- Slide minh họa phép cộng có điều khiển trình chiếu và điểm dừng trả lời.
- Lưu hồ sơ, metadata và tiến độ trên trình duyệt; có tùy chọn khôi phục demo trong Góc của em.
- Bố cục responsive, HTML dialog quản lý focus, nhãn nút và hỗ trợ giảm chuyển động.

### Kiểm tra đã thực hiện

- TypeScript, build production và ba kiểm thử logic điểm/bài luyện.
- Trên trình duyệt: trang chủ → Toán → chọn file mẫu → cấu hình 5 câu → tiến trình → menu → luyện tập.
- Trả lời sai → gợi ý → trả lời đúng → lời giải → kết thúc, xác nhận điểm lần đầu không bị ghi đè.
- Hướng dẫn từng bước khi chưa trả lời được.
- Lịch sử vẫn giữ sau khi tải lại trang.
- Điểm dừng slide: sai có gợi ý, đúng cho tiếp tục rồi chuyển sang luyện tập.
- Luồng TIMO: cấu hình mặc định mới, đề mẫu 12 câu và nút bản dịch.
- Xem trực tiếp trang chủ ở desktop và màn hình nhỏ; trang chủ tại 447 px không bị tràn ngang.

### Chưa thuộc phần hoàn thành này

Chưa đọc/giải tài liệu thật, OCR, sinh bài bằng AI, kiểm chứng nội dung bằng backend, tải file lên kho lưu trữ, tác vụ chạy nền thật, cơ sở dữ liệu, video AI, giọng đọc hay thích ứng độ khó theo năng lực thực tế. Slide trình chiếu không được coi là video AI.

File được chọn chỉ dùng để xem trước và thử thao tác. Đầu ra luôn là dữ liệu mẫu. Việc chọn trang chưa tách trang PDF thật. Tiến trình chỉ chạy khi màn hình mô phỏng đang mở, và tiếp tục khi mở lại; chưa có worker nền.

Mỗi lần tạo buổi học hoặc bắt đầu bộ mới thay thế bộ đang làm. Bài đã kết thúc giữ trong lịch sử. Hồ sơ và lưu trữ hiện chỉ nằm ở localStorage, chưa phải lưu hệ thống theo mục tiêu cuối MVP.

## Kế hoạch sau bước 1 (đã bắt đầu ở bước 2 bên dưới)

Triển khai tải và đọc tài liệu thật: kho file, giới hạn/kiểm tra phía máy chủ, PDF/ảnh, chọn trang, OCR/đọc hình, tách câu và nhận diện dạng bài, tác vụ nền và trạng thái lỗi. Tích hợp API video sau khi có tài liệu kết nối.

## Bước 2 — Tài liệu thật và mở bốn khu học

### Đã triển khai

- Toán/TIMO, Tiếng Anh, Tiếng Việt, Tự học có trang riêng, gửi tài liệu và thư viện.
- Upload thật theo luồng, tiến độ byte, thứ tự ảnh, chọn trang, tổng tối đa 100 MB/100 trang; kiểm tra phía máy chủ và chữ ký tệp.
- PDF được mở/tách trang thật; ảnh xoay/chuẩn hóa thật. PDF hỏng/mật khẩu, ảnh hỏng, trang ngoài phạm vi báo lỗi.
- Lưu nguồn/kết quả vào `.data` ngoài thư mục công khai; cookie HttpOnly, kiểm tra quyền trên mọi thao tác tài liệu, chống request khác origin.
- Worker riêng, hàng chờ bền vững, khôi phục sau restart, lưu từng phần, retry phần chưa xong.
- Tích hợp OpenRouter PDF native/ảnh + strict JSON schema, kiểm tra cấu trúc và trang tham chiếu.
- Menu chủ đề lấy từ kết quả nhận diện; câu gốc, lựa chọn, đoạn đọc, hình nguồn, nội dung từng trang và cảnh báo đọc không rõ.
- Ghi câu trả lời tự học ở trình duyệt; chưa chấm điểm.
- Thiếu khóa dừng ở “Chờ cấu hình AI”; dữ liệu mẫu giữ riêng tại `/ban-mau`.
- Tệp `.env.example`, hướng dẫn cấu hình và khởi động cả web/worker.

### Kiểm thử và nghiệm thu

- TypeScript và 13 kiểm thử tự động: điểm bài mẫu; giới hạn/chọn trang; PDF/PNG thật; schema/trang nguồn; hợp đồng gọi OpenRouter; upload/đọc tệp, session isolation, origin, tệp giả định dạng; thiếu khóa không trả câu mẫu; partial/retry chỉ xử lý phần lỗi.
- Build production và TypeScript đã qua; không còn cảnh báo trace thư mục dữ liệu.
- Trên trình duyệt: tải PNG thật; tải PDF 3 trang và chọn đúng trang 2–3; worker chạy nền chuyển sang chờ khóa; mở Toán/TIMO, Tiếng Anh, Tiếng Việt và Tự học; thư viện và nguồn.
- Màn hình kết quả được kiểm tra với phản hồi giả lập trong thư mục test tách biệt: lọc chủ đề, hiển thị hình nguồn, ghi câu trả lời và giữ sau reload.
- Các phản hồi AI trong test là stub có kiểm soát; không phải kết quả đo chất lượng model.
- Chưa gọi OpenRouter thật: chủ dự án chọn bổ sung khóa sau. Cần kiểm tra tài liệu thực đủ các dạng bài khi có khóa trước khi nghiệm thu bước 2 về chất lượng nội dung.

### Còn lại

Sinh bài/lời giải/gợi ý theo nguồn, chấm điểm bài thật, lưu kết quả vào hệ thống, song ngữ TIMO được biên soạn, độ khó thích ứng và video API theo bước 3–5. PostgreSQL/S3 và tài khoản chưa triển khai trong bản local này. Các giới hạn bước 1 ở phần trên là lịch sử, đã được thay thế ở luồng tải/nhận diện mới; khu trải nghiệm mẫu vẫn giữ nhãn rõ.
