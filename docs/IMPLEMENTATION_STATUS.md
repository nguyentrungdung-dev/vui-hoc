# Tiến độ triển khai MVP

Ngày cập nhật: 22/10/2026.

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

## Bước 3 — Nội dung và bài làm từ tài liệu thật (22/10/2026)

### Đã triển khai

- Tạo đáp án, ba mức gợi ý, lời giải từng bước và giải thích từ tài liệu đã nhận diện, không cần tải lại nguồn.
- Chọn chủ đề/số câu 5–50, mặc định 25. Bộ luyện mới là trắc nghiệm, có câu củng cố/nâng cao, phân bổ theo dạng và lưu tham chiếu nguồn. Đề gốc giữ riêng.
- Câu có hình gửi kèm trang nguồn vào bước giải/kiểm tra. Câu chưa rõ/thiếu bản nghe được ghi lý do; câu mở hoặc nhiều chỗ điền tự đối chiếu, không chấm máy.
- Kiểm tra schema, tham chiếu, đáp án/lựa chọn, câu trùng, phép tính; một lượt AI riêng kiểm tra nội dung trước khi giao. Sửa có giới hạn, lưu từng phần và thử lại phần lỗi.
- Worker xử lý cả nhận diện và biên soạn; khôi phục công việc sau restart. Thiếu khóa/số dư báo rõ, không thay bằng mẫu.
- Luồng làm bài thật, gợi ý, thử lại, hướng dẫn khi chưa hiểu, bản dịch/lời giải song ngữ TIMO; chọn câu tương tự từ bộ đã biên soạn.
- Máy chủ chấm/lưu lần đầu và lần sửa; điểm /10 tách mức dùng gợi ý. Chỉ gửi lời giải sau khi giải đúng, mở hướng dẫn hoặc kết thúc.
- Lưu bài đang làm và kết quả trong `.data`, mở lại tiếp tục, giữ bộ câu hỏi của lượt cũ khi tạo bộ mới. Trang Hành trình và thống kê trang chủ dùng dữ liệu bài thật.

### Giới hạn còn lại

- Câu luyện mới hiện là trắc nghiệm; các câu gốc nối/điền nhiều ô/tự luận dùng tự đối chiếu. Chưa có giao diện chấm từng ô hoặc nhận bài viết tay.
- Khoảng 20% câu nâng cao được biên soạn sẵn; chưa tự nâng độ khó theo kết quả cá nhân. Nút câu tương tự lấy tối đa 3 câu cùng dạng trong bộ hiện có, chưa tạo thêm không giới hạn.
- Kiểm tra AI dùng cùng model trong yêu cầu riêng; có thể vẫn sai hoặc từ chối câu hợp lệ. Không thay thế nghiệm thu sư phạm.
- Lưu trữ JSON và quyền thư viện theo cookie vẫn là kiến trúc local; tài khoản, PostgreSQL/S3, slide/video thật và thích ứng năng lực chưa triển khai.

### Kiểm thử bước 3 và giới hạn nghiệm thu AI

- TypeScript, định dạng mã, build production và 24 kiểm thử tự động đã qua. Bộ tự động kiểm tra API bài học/bài làm, quyền thư viện, không lộ đáp án sớm, điểm lần đầu, hướng dẫn, gợi ý, lưu/resume, bộ cũ giữ nguyên khi thay bộ mới, retry và giữ câu đã kiểm tra trong nhóm lỗi.
- Trình duyệt với bản sao PDF Tuần 5 trong môi trường riêng: tải PDF 29,94 MB, nối kết quả nhận diện/biên soạn thật; làm sai → mở/đóng gợi ý → đúng → xem lời giải; reload giữ kết quả; mở hướng dẫn; chuyển câu tương tự và chấm 10/10 cho một câu làm đúng độc lập; kết thúc đề gốc ghi đúng 1/16 câu đúng lần đầu (0,6/10), giữ 2 lượt gợi ý riêng; lịch sử tồn tại sau reload.
- Đã gọi thật `anthropic/claude-haiku-5.5` với tài liệu Tuần 5 (8 trang, 40 câu gốc, gồm Toán và Tiếng Việt). Giữ được 28 lời giải nguồn và 20/25 câu luyện sau đối chiếu bổ sung. Hai câu nguồn cần xem lại đã được tách rõ; các nhóm chưa xong được giữ để retry.
- OpenRouter trả HTTP 402 về số dư/hạn mức khi tiếp tục. Đã dừng các lời gọi thật. Chưa nghiệm thu được bộ đủ 25 câu từ đầu đến cuối bằng model thật; không dùng câu mẫu để lấp phần thiếu. Chức năng tạo 25 câu và lưu/khôi phục từng phần được kiểm tra bằng phản hồi API có kiểm soát.
- Đối chiếu bổ sung phát hiện lỗi vẫn lọt qua hai lượt cùng model. Đã sửa trong kết quả lưu: cách hỏi practice-7; liệt kê thiếu số 85 ở practice-13; đếm 8 số nhưng kết luận 12 ở practice-21; lựa chọn mơ hồ ở practice-24; bỏ bản thân Vinh khi đếm bạn cùng tổ; lời giải tham khảo cho câu hỏi mở của Sẻ. Tạm loại câu có OCR “ngoại ngoài” và một mệnh đề đúng/sai mơ hồ. Đây là các chỉnh sửa bởi trợ lý sau khi đọc kết quả, không phải chứng cứ pipeline tự động đã bắt được tất cả lỗi.
- Đã bổ sung giải độc lập không thấy đáp án nháp, so sánh đáp án hai lượt; kiểm tra xác định cho mẫu đếm/liệt kê số hai chữ số; chặn lựa chọn “tất cả đều đúng” ở câu luyện mới. Những cải tiến cuối có kiểm thử tự động, chưa gọi model thật lần nữa do HTTP 402.
- Chưa nghiệm thu chất lượng đầy đủ của TIMO song ngữ, tài liệu tiếng Anh, hình học, tất cả kiểu tự luận; chưa xác nhận thời gian xử lý ổn định. Video và thích ứng độ khó chưa thuộc bước này.
