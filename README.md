# Vui học — MVP

Next.js + TypeScript, giao diện học tập lớp 2 và luồng **tải PDF/ảnh thật → nhận diện qua OpenRouter → xem câu hỏi, dạng bài, trang nguồn**. Toán/TIMO, Tiếng Anh, Tiếng Việt và Tự học đều đã mở.

Phạm vi chuẩn: [MVP_SPEC.md](MVP_SPEC.md). Tiến độ và giới hạn: [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md).

## Chạy local

Dùng Node.js 22.12+ (đã kiểm thử với Node 24) và npm. Chạy trong thư mục dự án `/Volumes/TrungDung_James/SciEco/MVP Vui Học`.

```sh
npm install
# Chỉ sao chép nếu chưa có .env.local; giữ nguyên khóa đã cấu hình.
cp -n .env.example .env.local
npm run dev
```

Mở [Vui học](http://127.0.0.1:3000). `npm run dev` chạy cả Next.js và worker. Chỉ chạy một lần; nếu đã có server ở cổng 3000, dừng phiên cũ bằng Ctrl+C trước khi khởi động lại. Không chạy thêm `npm run worker` khi đã dùng `npm run dev`.

Điền khóa vào `OPENROUTER_API_KEY` trong `.env.local`, rồi khởi động lại `npm run dev`. Không đưa khóa vào mã giao diện hoặc biến `NEXT_PUBLIC_*`. Sau đó mở tài liệu đang chờ và bấm **Thử lại sau khi cấu hình**. Không cần tải lại tệp.

Biến môi trường:

| Biến                 | Ý nghĩa                                                                                                   |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| `OPENROUTER_API_KEY` | Khóa OpenRouter, chỉ dùng phía máy chủ                                                                    |
| `OPENROUTER_MODEL`   | Mặc định `google/gemini-3-flash-preview`; model thay thế cần hỗ trợ ảnh, PDF native và strict JSON schema |
| `VUIHOC_DATA_DIR`    | Thư mục dữ liệu bền vững, mặc định `.data`; web và worker phải dùng cùng đường dẫn                        |

Chưa có khóa vẫn tải và kiểm tra tệp được. Hệ thống dừng ở **Chờ cấu hình AI**, không trả câu hỏi mẫu thay thế.

```sh
npm run typecheck
npm test
npm run build
# Sau build, dùng thay cho dev:
npm start
```

Production local/VPS: `npm start` chạy web và worker cùng nhau. Chạy mỗi dịch vụ riêng bằng `next start` và `npm run worker` nếu có process manager; mỗi thư mục dữ liệu chỉ có một worker. Các tiến trình cần cùng thư mục làm việc và cấu hình.

## Thử tài liệu thật

1. Chọn một trong bốn khu học → **Gửi tài liệu**, hoặc Toán → **Thử sức TIMO**.
2. Chọn một PDF hoặc nhiều ảnh JPG/PNG/WebP, sắp xếp ảnh nếu cần. Tổng tối đa 100 MB, tối đa 100 trang. HEIC cần xuất JPG trước.
3. Chọn toàn bộ hoặc nhập trang như `1-3, 5`. Với nhiều ảnh, số trang là thứ tự ảnh. Đặt tên buổi học và gửi.
4. Chờ tải tệp xong; sau khi chuyển đến trang tài liệu có thể rời trang. Worker tiếp tục nhận diện khi máy chủ còn chạy.
5. Chọn chủ đề, xem câu hỏi và nguyên bản từng trang. Bấm **Trang …** để đối chiếu hình, bảng hoặc chữ mờ. Có thể ghi câu trả lời; chưa chấm điểm.
6. Khi có lỗi từng phần, bấm **Thử lại phần chưa xong**. Các trang thành công được giữ nguyên.

Số câu mong muốn (mặc định 25) được lưu cho bước sinh bài sau; số câu nhận diện là số câu trong nguồn. Tài liệu chỉ có kiến thức có thể không có câu hỏi — hệ thống không tự bịa đề.

## Màn hình

| Đường dẫn                                                                               | Nội dung                                                                  |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `/`                                                                                     | Trang chủ, bốn khu học, hồ sơ                                             |
| `/toan`, `/tieng-anh`, `/tieng-viet`, `/tu-hoc`                                         | Trang môn và tài liệu đã gửi                                              |
| `/tai-len`, `/tai-len/math`, `/tai-len/english`, `/tai-len/vietnamese`, `/tai-len/self` | Gửi tài liệu thật                                                         |
| `/timo`                                                                                 | Gửi đề TIMO thật                                                          |
| `/thu-vien`                                                                             | Toàn bộ tài liệu của trình duyệt hiện tại                                 |
| `/tai-lieu/[id]`                                                                        | Trạng thái nền, menu chủ đề, câu hỏi, trang nguồn, ghi câu trả lời        |
| `/ban-mau`                                                                              | Khu trải nghiệm được ghi rõ dữ liệu mẫu                                   |
| `/buoi-hoc`, `/bai-giang`, `/luyen-tap`, `/ket-qua`                                     | Luồng gợi ý/chấm điểm/slide của bài mẫu, chưa dùng kết quả phân tích thật |
| `/hanh-trinh`                                                                           | Lịch sử làm bài mẫu hiện có                                               |

## Cách xử lý tài liệu

- API tạo bản ghi, tải từng tệp theo luồng nhị phân, kiểm tra kích thước thực và chữ ký định dạng rồi mới đưa vào hàng chờ.
- PDF được đọc số trang và tách đúng phần đã chọn bằng `pdf-lib`; gửi từng nhóm hai trang với ánh xạ trang gốc. PDF có mật khẩu/hỏng báo lỗi.
- Ảnh được xoay theo EXIF, chuẩn hóa bằng `sharp`, giới hạn 60 megapixel/ảnh và kích thước gửi AI 2400×3200. Không nhận SVG/HEIC.
- OpenRouter nhận PDF native hoặc ảnh; JSON được kiểm tra schema, số trang, cấu trúc câu hỏi. Tài liệu được coi là dữ liệu, không phải chỉ dẫn điều khiển hệ thống.
- Trạng thái và kết quả từng nhóm được ghi nguyên tử xuống ổ đĩa. Worker khôi phục công việc bị ngắt khi khởi động lại. Lỗi mạng/429/5xx có xử lý giới hạn, lỗi khóa/số dư yêu cầu sửa cấu hình; không chạy thử vô hạn.
- Tài liệu lỗi một phần vẫn mở được phần đã thành công. Retry không gọi lại AI cho phần đã có kết quả.

Tài liệu tham khảo: [OpenRouter PDF](https://openrouter.ai/docs/guides/overview/multimodal/pdfs), [structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs).

## Lưu trữ và giới hạn triển khai

- Tệp gốc và kết quả AI lưu tại `.data/documents`, ngoài `public`, được `.gitignore` loại trừ. Sao lưu thư mục này nếu cần giữ dữ liệu lâu dài.
- Cookie ngẫu nhiên HttpOnly giới hạn thư viện theo trình duyệt. API kiểm tra quyền đọc/tải/xử lý và nguồn request. Đây chưa phải tài khoản đăng nhập; xóa cookie sẽ mất liên kết thư viện, dù tệp vẫn còn trên máy chủ.
- Hồ sơ và lịch sử bài mẫu lưu trong `localStorage` (`vuihoc-demo-v1`); câu trả lời tự học thật lưu theo `vuihoc-responses-[id]`. Chưa đồng bộ thiết bị.
- Giải pháp này dành cho demo local/VPS với ổ đĩa bền vững. Chưa triển khai PostgreSQL, S3, hàng đợi phân tán, xác thực người dùng hoặc hạn mức cho dịch vụ công cộng. Không triển khai nguyên trạng trên môi trường serverless có ổ đĩa tạm/request limit nhỏ. Khi mở công khai cần bổ sung các thành phần đó và quản lý vòng đời dữ liệu.
- Chưa có sinh câu tương tự/nâng cao, đáp án/gợi ý thật, chấm bài thật, thích ứng độ khó hay API video. Slide/bài mẫu vẫn được ghi rõ; không được xem là video AI.
- Chất lượng nhận diện cần kiểm chứng bằng bộ tài liệu Toán/TIMO/Tiếng Anh/Tiếng Việt thật sau khi cấu hình khóa. Bộ test dùng dữ liệu giả lập phản hồi API để kiểm tra giao thức và phục hồi lỗi, không thay thế nghiệm thu AI.

## Cấu trúc

- `src/app/api/documents/[[...parts]]/route.ts`: tạo tài liệu, stream upload, đọc nguồn, trạng thái và retry.
- `src/server/analysis.ts`: chuẩn hóa nguồn, OpenRouter, kiểm tra kết quả và xử lý từng phần.
- `src/server/worker.ts`, `store.ts`: hàng chờ bền vững trên đĩa, worker, khóa và khôi phục.
- `src/server/validation.ts`: kiểm tra file, chọn trang, schema dữ liệu AI.
- `src/lib/documents.ts`: môn học và hợp đồng dữ liệu.
- `src/components/documents.tsx`: thư viện, tải tệp và tài liệu đã nhận diện.
- `src/components/app.tsx`, `practice.tsx`, `lecture.tsx`, `src/lib/demo.ts`: khung UI và khu trải nghiệm mẫu.

## Nguồn hình ảnh

`public/characters.webp` được lấy từ [bản demo do chủ dự án cung cấp](https://toan-vui-lop-hai-2026.science-for-economic.chatgpt.site/assets/characters.webp). Font Be Vietnam Pro qua Google Fonts, có font hệ thống dự phòng.
