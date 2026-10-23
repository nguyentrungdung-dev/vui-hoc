# Tiến độ triển khai MVP

Cập nhật hiện trạng: **23/10/2026**. Căn cứ: mã nguồn hiện tại, kiểm thử đã ghi nhận và quyết định của chủ dự án trong phiên làm việc. Phạm vi chuẩn: [MVP_SPEC.md](../MVP_SPEC.md). Cách chạy và các route: [README.md](../README.md).

**Cách đọc:** “Đã triển khai” xác nhận có mã/chức năng; “đã kiểm tra kỹ thuật” không đồng nghĩa mọi đầu ra AI đều đúng; “chờ quyết định” chưa được phép tự chọn phương án. Ghi chép 21–22/10 ở cuối file là lịch sử, các nhận định “chưa có” tại thời điểm đó không ghi đè trạng thái hiện tại.

## Hướng dẫn có chuyển động — đã chốt hướng, chưa triển khai

Ngày 23/10/2026: thống nhất dùng lời giải chi tiết có sẵn làm script, Claude tạo cảnh, Fish Audio tạo giọng đọc, bấm nút thì tạo/phát trong webapp và lưu dùng lại. Chưa xuất MP4. Chủ dự án yêu cầu chỉ lưu tài liệu và tiếp tục sau. Xem [kế hoạch và điểm tiếp tục](VIDEO_GUIDANCE_PLAN.md); các ghi chú cũ về chờ API video công ty không phải phụ thuộc của luồng này. UI nút video đã sửa local nhưng backend tạo/phát vẫn chưa có.

## 1. Đã triển khai

| Khu vực            | Trạng thái hiện tại                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Tài liệu thật      | Upload PDF hoặc nhiều ảnh, sắp xếp ảnh, chọn trang; tối đa 100 MB/100 trang, kiểm tra chữ ký file và chuẩn hóa nguồn       |
| Nhận diện          | OpenRouter PDF native/ảnh, schema chặt, tách câu/chủ đề/trang, giữ liên kết nguồn và cảnh báo chưa rõ                      |
| Xử lý nền          | Workflow SDK, lưu từng phần, trạng thái lỗi và thử lại phần chưa xong; không còn worker riêng                              |
| Nội dung học       | Giải câu nguồn đủ điều kiện; bộ luyện mới 5–50 câu, mặc định 25; gợi ý, lời giải và kiểm tra lại bằng lượt AI riêng        |
| Làm bài            | Chọn/nhập đáp án, thử lại, ba mức gợi ý, hướng dẫn, giải thích, lưu và tiếp tục; đáp án không gửi sớm                      |
| Chấm và Hành trình | Điểm lần trả lời đầu /10 trên câu chấm tự động; tách gợi ý, độc lập và hoàn thành có hỗ trợ; câu mở tự đối chiếu           |
| Ôn bài             | Chọn nhiều tài liệu đã nhận diện của cùng môn, tạo bộ luyện dựa trên nội dung nguồn                                        |
| Ôn tổng hợp        | Tìm/chọn đề tài đã detect cùng môn, tạo câu hỏi bám tài liệu nguồn                                                         |
| Bộ ôn              | Trang tiến độ, thử lại, đủ bộ mới vào làm; liên kết tài liệu/trang gốc; lưu vào Hành trình, tách khỏi danh sách file nguồn |
| Lưu trữ            | Neon PostgreSQL + Vercel Blob Private + Workflow; `.data` chỉ cho development khi không có database                        |
| Demo chung         | Tài liệu đã tải đủ, bộ học, bài làm và lịch sử dùng chung giữa các phiên; cookie chỉ giữ quyền quản lý nguồn của người tải |
| Hồ sơ bé           | Tên gọi, nhân vật và mục tiêu lưu localStorage; chưa có tài khoản hoặc nhiều hồ sơ bé trên máy chủ                         |

Giới hạn Ôn bài/Ôn tổng hợp: mặc định 25, tùy chỉnh 5–50 câu; tối đa 20 tài liệu hoặc 50 đề tài; số câu ít nhất bằng số mục chọn. UI và máy chủ đều chặn trộn môn. Dùng văn bản nguồn đủ rõ; bộ mới là bài độc lập không đòi hình/âm thanh còn thiếu. Không coi các giới hạn này là hỗ trợ đầy đủ mọi định dạng bài nguồn.

## 2. Điều hướng và giao diện đã cập nhật ngày 23/10

- Header: **Trang chủ, Luyện tập, Khám phá, Thư viện, Hành trình, Phần thưởng**.
- Luyện tập có **Ôn bài, Ôn tổng hợp, Luyện đề TIMO**; hover trên desktop, chạm ở màn hình nhỏ, hỗ trợ bàn phím. Header thu gọn ở tối đa 900 px.
- Đã bỏ hàng menu phụ và dòng trạng thái ở các trang chính; khu trải nghiệm vẫn ghi rõ dữ liệu mẫu.
- Trang chủ dùng **Horizontal Scroll** cho bốn khu tài liệu và thẻ **Luyện thi Toán song ngữ**, có nút trước/sau và scroll snap, không tự chuyển.
- **Vui học Toán** và phần giới thiệu Toán mẫu đã bỏ nút/thẻ/mô tả TIMO. Không xóa/lọc tài liệu TIMO cũ: file, nhận diện, bài học, bài làm và kết quả vẫn giữ; đã mở lại một tài liệu cũ trên trình duyệt để kiểm tra.
- **Thư viện** có lối vào trực tiếp trên header, đã kiểm tra điều hướng từ menu điện thoại.
- **TIMO mới:** `/luyen-tap/timo` có sáu thẻ Mầm non–lớp 5; mỗi khối mở **Coming soon**. Không có đề mẫu giả hoặc số lượng đề giả.
- **Phần thưởng:** `/phan-thuong` chỉ hiển thị **Coming soon**.
- Route upload cũ `/timo` còn trong mã để tương thích; không còn nút vào từ Toán và không phải lối vào ngân hàng TIMO mới.

## 3. AI, hạ tầng và tối ưu hiệu năng

- Model được chọn qua `OPENROUTER_MODEL`; fallback trong mã vẫn là Haiku 4.5. Không suy ra model production từ fallback.
- Đã bỏ `temperature` khi dùng Haiku 5.5 ở cả nhận diện và biên soạn. Giữ PDF native, schema và `provider.require_parameters: true`. Đây là sửa tương thích yêu cầu, không thay đổi nội dung các tài liệu/bài đã có.
- Thông báo nhận diện HTTP 400/404 vẫn gộp lỗi PDF/ảnh/JSON; chưa có cơ chế lưu nguyên phản hồi lỗi upstream trong ứng dụng. Không coi thông báo này là bằng chứng model không hỗ trợ PDF.
- Đã có PostgreSQL, Blob Private và Workflow cho cloud; production local cũng bắt buộc cấu hình cloud. Không cần xây lại các adapter này.
- Đã tăng thời gian giữ kết nối pool lên 30 giây, gom truy vấn đọc bài/lịch sử và giảm lượt trao đổi database khi lưu thao tác. Xem [báo cáo sửa độ trễ 23/10](LATENCY_FIX_2026-10-23.md).
- Kết quả đo trong báo cáo là dev với Neon thật. Việc đổi vùng Vercel và đo lại deployment mới nhất chưa được xác minh trong đợt tài liệu này; không đánh dấu tối ưu production đã nghiệm thu.
- Đã có hướng dẫn deploy, kiểm tra môi trường/dịch vụ, smoke test và GitHub Actions. Chưa kiểm tra lại trạng thái CI hoặc deployment từ bên ngoài trong lần cập nhật tài liệu này.

## 4. Mức kiểm thử và nghiệm thu đã ghi nhận

### Kiểm thử kỹ thuật

- Lần chạy bộ kiểm thử ngày 23/10 khi thêm Ôn bài/Ôn tổng hợp: **36 test, 32 đạt, 4 test tích hợp bỏ qua**, không có test lỗi. Kiểm tra cùng môn/nguồn, nguồn trang trùng số giữa tài liệu, tạo bộ câu hỏi với phản hồi AI mô phỏng, gợi ý/chấm điểm và Hành trình dùng chung.
- Bốn test database/Blob contract cần `TEST_DATABASE_URL` của database thử riêng. Lần chạy lịch sử ngày 22/10 và lần sửa độ trễ có ghi 32/32 với PostgreSQL thử; không dùng kết quả cũ đó để nói bộ 36 test mới đã chạy đủ tích hợp.
- Build production, TypeScript và kiểm tra diff đã đạt trong các lần chỉnh code gần nhất, bao gồm header Thư viện và bỏ nội dung TIMO ở trang Toán. Không chạy lại build/test trong đợt chỉ sửa tài liệu này.
- Đã kiểm tra trình duyệt: chọn nhiều tài liệu, đổi môn bỏ lựa chọn cũ, tìm đề tài không dấu, dropdown bằng click/bàn phím, giao diện desktop/mobile, cuộn ngang, sáu khối TIMO đều Coming soon, Thư viện từ header và tài liệu TIMO cũ mở được. Sau khi thêm Thư viện, kiểm tra menu thu gọn ở 790 px và header không tràn ở 920 px.
- Chủ dự án đã báo “tạm thời test xong” sau đợt Ôn bài/Ôn tổng hợp. Đây là xác nhận thử sử dụng của chủ dự án, không tự suy ra đã nghiệm thu mọi đầu vào/mọi môi trường.

### Kiểm chứng AI thật và deployment

- Đã có thử nghiệm tài liệu thật trước đây và người dùng tiếp tục tự upload/test. Trong các lần triển khai giao diện gần đây, trợ lý không phát sinh lời gọi AI tính phí; test sinh câu mới dùng phản hồi mô phỏng.
- Ghi chép cũ có thử PDF Tuần 5: 28 lời giải nguồn và 20/25 câu luyện, sau đó HTTP 402; có lỗi nội dung cần chỉnh thủ công. Tên model trong bản ghi cũ chưa được đối chiếu lại với Activity; không dùng bản ghi này làm bằng chứng Haiku 5.5 đã chạy thành công sau sửa ngày 23/10.
- Đã bổ sung giải độc lập không thấy đáp án nháp, so sánh hai lượt và một số kiểm tra số học xác định. Hai lượt cùng model vẫn có thể cùng sai hoặc bác bỏ câu hợp lệ.
- Chưa có biên bản nghiệm thu có hệ thống cho mọi môn/dạng, hình học, lời văn, các câu mở và mọi tình huống ảnh mờ; chưa có kết luận tốc độ/chi phí ổn định.
- Đã có smoke test deployment ở các mốc lịch sử, nhưng chưa xác minh code mới nhất đã được triển khai và nghiệm thu trọn luồng trên deployment đích. Không đồng nhất build đạt với upload Blob/Workflow/AI thật đạt.

## 5. Còn chờ xây dựng hoặc nghiệm thu

| Phần                     | Hiện trạng / điều kiện tiếp theo                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Bài giảng thật           | Chưa sinh slide, kịch bản, ví dụ và nội dung giảng theo tài liệu đã upload                                               |
| Video API                | Chưa tích hợp; cần tài liệu API, xác thực, đầu vào/đầu ra, trạng thái và cách nhận kết quả từ công ty                    |
| Tương tác video          | Chưa đồng bộ câu hỏi/điểm dừng với thời gian video thật; cần biết khả năng mốc slide của API                             |
| Độ khó thích ứng         | Câu nâng cao hiện soạn sẵn theo nhóm; chưa đánh giá năng lực để tự điều chỉnh độ khó                                     |
| Luyện tiếp theo năng lực | Nút câu tương tự chỉ lấy tối đa 3 câu từ bộ đã có; chưa có cơ chế luyện tiếp thích ứng khi hết câu                       |
| Kiểu bài tương tác       | Chưa chấm từng ô/nối cặp/đúng–sai nhiều ý; thường dùng tự đối chiếu, bộ mới chủ yếu trắc nghiệm                          |
| Chất lượng AI            | Cần nghiệm thu bằng tài liệu đại diện, đối chiếu đáp án/gợi ý và ghi thời gian/chi phí thực tế                           |
| Deployment và độ trễ     | Cần xác minh bản code đích, vùng function/database và upload → Workflow → AI → làm bài → mở lại trên deployment mới nhất |

Đăng nhập, nhiều hồ sơ bé, chấm bài viết tay, hạn mức AI theo tài khoản và tự dọn file bỏ dở chưa thuộc phạm vi demo đã chốt. Ghi nhận giới hạn không có nghĩa đã duyệt xây các phần này.

## 6. Chờ chủ dự án quyết định — chưa triển khai backend

### Ngân hàng Luyện thi Toán song ngữ / Luyện đề TIMO

Đã duyệt và hoàn tất phần giao diện chọn khối, Coming soon. Chờ chốt:

1. Trang quản trị và cách nhà phát hành upload/thêm, phân khối và quản lý đề.
2. Đáp án chính thức từ nhà phát hành hay AI tự giải, cách kiểm tra đáp án chưa chắc chắn.
3. Chuẩn bị/hiển thị song ngữ, bản dịch hoặc phụ đề.
4. Có lưu từng lượt thi, lỗi sai, kết quả/làm lại vào Hành trình hay không và cách hiển thị.

Định hướng tương lai đã thống nhất: chọn khối → chọn đề cố định → làm bài → số câu đúng/tổng số câu → học lỗi sai → làm lại/chọn đề khác. Không thêm sinh đề, đổi số câu hay câu tương tự. Chưa xây chức năng làm/chấm đề trong khu mới; không kế thừa quy tắc /10 của luồng tài liệu cũ.

### Phần thưởng

Chưa chốt cơ chế nhận/sử dụng phần thưởng, loại phần thưởng hay kho quà. Hiện chỉ Coming soon.

**Tạm thời chỉ cập nhật tài liệu, không triển khai thêm tính năng khi chủ dự án đang cân nhắc.**

## 7. Lịch sử triển khai và kiểm thử 21–22/10/2026

Phần dưới lưu chứng cứ và bối cảnh cũ. Các câu “chưa có PostgreSQL”, “worker riêng”, “lịch sử riêng theo cookie”, “chưa tối ưu pool/query” chỉ mô tả thời điểm của mục tương ứng; đã được thay thế bởi trạng thái hiện tại ở mục 1–6. Các số test/số đo và thông tin deploy cũ không phải kết quả chạy lại hôm nay.

<details>
<summary>Mở ghi chép lịch sử trước cập nhật 23/10/2026</summary>

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

## Hạ tầng Vercel + Neon (22/10/2026)

- Bỏ tiến trình và lệnh worker riêng; `dev`/`start` chỉ chạy Next.js. Workflow SDK xử lý nhận diện theo nhóm trang và tạo/kiểm tra lời giải theo nhóm câu, lưu tiến độ giữa các bước.
- PostgreSQL lưu metadata, nhận diện, bộ câu hỏi và bài làm; dùng khóa giao dịch để tránh mất cập nhật khi nhiều function cùng chạy. Tự tạo schema lần đầu truy cập.
- Upload multipart trực tiếp vào Vercel Blob **Private**, giữ tổng 100 MB; cấp token theo cookie chủ tài liệu, đường dẫn, MIME và kích thước, không cho ghi đè. Server xác minh header/dung lượng trước khi nhận diện. Đọc nguồn vẫn qua API có kiểm tra quyền.
- Local chưa cấu hình database giữ adapter `.data`; dữ liệu cũ không bị xóa. Trên Vercel thiếu database sẽ báo lỗi cấu hình, không ghi vào đĩa tạm.
- Giữ UI, tính điểm /10 riêng với mức dùng gợi ý, thử lại từng phần, 4 khu học. Video vẫn tạm dừng.
- Đã qua 30 tests, build production và smoke test upload PDF → Workflow trên production local. PostgreSQL được kiểm thử bằng database tạm riêng; Blob contract dùng mock. Chưa xác nhận upload/AI thực trên deployment mới nếu chưa deploy.
- Hướng dẫn biến môi trường, deploy và nghiệm thu: [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md).

## Thư viện demo dùng chung (22/10/2026)

- Người dùng xác nhận mở thư viện chung, chưa cần đăng nhập. Tài liệu đã tải đủ, file gốc, nội dung nhận diện và bộ bài đã tạo hiện với mọi trình duyệt/thiết bị trên cùng website; áp dụng ngay với tài liệu cũ.
- Upload dở và quyền sửa/tạo lại nội dung AI vẫn thuộc người tải lên. Mở thư viện/xem nguồn không phát sinh yêu cầu AI.
- Mỗi người xem tạo bài làm riêng; chỉ thấy lịch sử/điểm của trình duyệt mình. Các bài làm cũ được giữ cho chủ tài liệu ban đầu, không cần migration dữ liệu.
- UI ghi rõ thư viện dùng chung và phạm vi chia sẻ ngay trước khi tải file.
- Kiểm thử thêm hai phiên khác cookie: danh sách, chi tiết, tải PDF, đọc bộ học dùng chung; không sửa tài liệu hoặc bài làm của người khác; resume bài riêng; bảo toàn bài làm cũ trên cả file local và PostgreSQL.

## Đồng bộ cách chạy production local và Vercel — 22/10/2026

- Thêm `npm run prod`: cùng `build:deploy` với Vercel, kiểm tra biến môi trường và kết nối PostgreSQL/Blob rồi build và chạy `next start`. Node 24.x được khai báo trong `package.json`/`.nvmrc`; cài dependency bằng `npm ci`.
- Production local không còn fallback sang `.data`; file storage chỉ dành cho development. `next.config.ts` kiểm tra biến khi production server khởi động hoặc build trên Vercel, kể cả khi bỏ qua npm script.
- Thêm `check:env`, `check:services`, `smoke`, `verify`, cấu hình Vercel và GitHub Actions kiểm tra Linux/Node 24/PostgreSQL. CI đã được viết nhưng chưa chạy trên GitHub trong lần chỉnh này.
- Kết quả xác minh: 32/32 test qua với PostgreSQL tạm riêng; production build, TypeScript, format của các file thay đổi và kiểm tra diff qua. Kết nối PostgreSQL và quyền đọc Blob bằng cấu hình local thật đã qua sau khi cập nhật thông tin xác thực.
- Smoke test trang chủ, 8 assets, cấu hình cloud, cookie và API/database qua trên cả `http://127.0.0.1:3000` và `https://vui-hoc-theta.vercel.app`.
- Chưa push/deploy các thay đổi cấu hình này. Smoke trên Vercel kiểm tra bản đang triển khai trước thay đổi. Chưa chạy lại upload/Workflow/AI toàn luồng; chưa xác minh quyền ghi Blob bằng tải lên thật. Chế độ local không mô phỏng toàn bộ HTTPS, Linux và giới hạn serverless.

## Quyền truy cập demo mở và điều tra độ trễ — 22/10/2026

- Bỏ lọc người sở hữu bài làm trong cả adapter file và PostgreSQL. Mọi phiên truy cập tài liệu công khai đều xem, tiếp tục, trả lời và mở lịch sử chung. Bài cũ có/không có owner đều tiếp tục dùng được, không di chuyển dữ liệu.
- Giữ nguyên quyền người tải lên đối với bản tải dở, upload token, tải tiếp, bắt đầu/thử lại nhận diện và tạo lại bộ học. Khung quản lý/tiến độ tài liệu chỉ hiện cho người tải lên; người khác xem nguồn và nội dung AI đã có bình thường.
- Nháp ghi chú tự học và tùy chọn giao diện mẫu vẫn cục bộ; chúng không tham gia kiểm tra quyền truy cập tài liệu/bài học.
- Đã qua 32/32 tests, gồm PostgreSQL tạm riêng; TypeScript và định dạng các file sửa qua. Kiểm thử API với ba cookie khác nhau, bài cũ, tiếp tục bài, chấm điểm và lịch sử; vẫn chặn sửa nguồn không có quyền và truy cập bản tải dở.
- Đã xác minh UI bằng phiên trình duyệt khác: thư viện, nội dung nhận diện và kết quả bài cũ mở được trên dev cổng 3001. Dùng lại server dev đang có; đã dừng server production local cũ. Không chạy build/prod, commit, push hoặc deploy trong lần sửa này.
- Chỉ đo và phân tích hiệu năng; chưa sửa pool, query, vùng máy chủ hay cơ chế cập nhật UI. Xem [báo cáo độ trễ](LATENCY_AUDIT_2026-10-22.md).

</details>
