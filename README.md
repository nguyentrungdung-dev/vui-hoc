# Vui học — MVP

Next.js + TypeScript, giao diện học tập lớp 2 và luồng **tải PDF/ảnh thật → nhận diện → tạo lời giải và bộ luyện → làm bài, nhận gợi ý và lưu kết quả**. Toán/TIMO, Tiếng Anh, Tiếng Việt và Tự học đều đã mở.

Phạm vi chuẩn: [MVP_SPEC.md](MVP_SPEC.md). Tiến độ và giới hạn: [docs/IMPLEMENTATION_STATUS.md](docs/IMPLEMENTATION_STATUS.md).

## Chạy bản production trên local

Code nằm trong thư mục dự án `/Volumes/TrungDung_James/SciEco/MVP Vui Học`. Local và Vercel cùng dùng **Node.js 24.x**, dependency từ `package-lock.json` và build Next.js production. Nếu dùng nvm, chạy `nvm use`.

```sh
npm ci
# Chỉ sao chép nếu chưa có file; giữ nguyên khóa đang dùng.
cp -n .env.example .env.production.local
# Điền đủ bốn biến bên dưới rồi chạy:
npm run prod
```

Mở [Vui học](http://127.0.0.1:3000). `npm run prod` kiểm tra cấu hình và kết nối PostgreSQL/Blob → build production → chạy `next start`. Khi code thay đổi, dừng server bằng Ctrl+C rồi chạy lại lệnh này. `npm start` chỉ chạy bản đã build trước đó. Không chạy dev và production đồng thời trên cùng cổng.

| Biến                    | Yêu cầu production                                                                     |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL/Neon; nên dùng URL pooled có SSL.                                           |
| `BLOB_READ_WRITE_TOKEN` | Token kho Vercel Blob **Private**.                                                     |
| `OPENROUTER_API_KEY`    | Khóa OpenRouter phía server.                                                           |
| `OPENROUTER_MODEL`      | Đặt rõ model đang dùng trên deploy; phải hỗ trợ ảnh, PDF native và strict JSON schema. |

Cấu hình production local nằm ở `.env.production.local` (đã bị Git bỏ qua), ưu tiên hơn `.env.local`; biến có sẵn trong shell ưu tiên cao nhất. Nếu copy file mẫu, cần điền lại đủ giá trị vì giá trị rỗng trong file production sẽ che cấu hình `.env.local`. Không gửi khóa vào chat/Git hoặc dùng tiền tố `NEXT_PUBLIC_`.

Production bắt buộc dùng PostgreSQL + Blob; thiếu cấu hình sẽ báo lỗi, không chuyển sang `.data`. Dùng database/Blob dành cho Preview để thử dữ liệu; chọn cùng loại dịch vụ và cùng model với Production. Nếu dùng trực tiếp database Production thì thao tác local sẽ thay đổi dữ liệu thật.

Kiểm tra trước và sau triển khai:

```sh
npm run verify            # tests + build production + TypeScript
npm run check:env         # kiểm tra biến cấu hình
npm run check:services    # thử kết nối PostgreSQL và đọc danh sách Blob
# Chạy trong terminal khác khi npm run prod đang bật:
npm run smoke
# Chạy cùng phép kiểm tra với URL deploy thực:
npm run smoke -- https://your-project.vercel.app
```

Smoke test kiểm tra trang chủ, assets JS/CSS, cấu hình cloud, cookie và API đọc database. Nó không gọi AI hoặc tải tệp; truy cập API có thể khởi tạo schema nếu database còn trống. Vẫn phải nghiệm thu upload Blob, Workflow và AI theo [hướng dẫn triển khai](docs/VERCEL_DEPLOYMENT.md). `npm run build` thành công chỉ xác nhận biên dịch; không chứng minh dịch vụ cloud hoạt động.

Workflow local vẫn do server trên Mac xử lý; Vercel dùng hạ tầng Workflow riêng. Hệ điều hành, HTTPS, giới hạn Function và mạng cũng khác. Không có cam kết giống 100% chỉ từ kiểm tra local.

## Chế độ phát triển nhanh

`npm run dev` dùng `.env.local`, có hot reload và vẫn cho phép kho `.data` khi không có `DATABASE_URL`. Chế độ này dùng để sửa giao diện/code; nghiệm thu deploy phải dùng `npm run prod`. Dữ liệu `.data` cũ được giữ nguyên và không tự chuyển lên cloud.

## Deploy Vercel + Neon

Xem hướng dẫn đầy đủ: [docs/VERCEL_DEPLOYMENT.md](docs/VERCEL_DEPLOYMENT.md).

1. Kết nối Neon với project để có `DATABASE_URL`.
2. Tạo Blob **Private**, kết nối cùng project để có `BLOB_READ_WRITE_TOKEN`.
3. Cấu hình `OPENROUTER_API_KEY` và `OPENROUTER_MODEL` ở Production, và Preview nếu dùng bản preview.
4. Deploy **commit chứa thay đổi mới**. Build Command: `npm run build:deploy`, Install Command: `npm ci`, framework Next.js, không tùy chỉnh Output Directory.
5. Workflow SDK tự cấu hình các route/tác vụ. Không tạo cron hoặc chạy lệnh worker. Bảng dữ liệu được tạo khi API truy cập database lần đầu.

Dữ liệu `.data` cũ trên Mac được giữ nguyên, không tự chuyển lên cloud. Với database mới, tải lại tài liệu cần dùng. Thư viện demo trên Vercel dùng chung giữa các trình duyệt; dữ liệu local vẫn là kho riêng.

## Thử tài liệu thật

1. Chọn một trong bốn khu học → **Gửi tài liệu**, hoặc Toán → **Thử sức TIMO**.
2. Chọn một PDF hoặc nhiều ảnh JPG/PNG/WebP, sắp xếp ảnh nếu cần. Tổng tối đa 100 MB, tối đa 100 trang. HEIC cần xuất JPG trước.
3. Chọn toàn bộ hoặc nhập trang như `1-3, 5`. Với nhiều ảnh, số trang là thứ tự ảnh. Đặt tên buổi học và gửi.
4. Chờ tải tệp xong; sau khi chuyển đến trang tài liệu có thể rời trang. Workflow tiếp tục nhận diện trong nền.
5. Mở **Lời giải và bài luyện của em**, chọn chủ đề/số câu (mặc định 25, từ 5–50), bấm **Tạo lời giải và bộ luyện**. Tài liệu đã nhận diện từ bước 2 dùng được ngay, không cần tải lại.
6. Tác vụ giải đề gốc và tạo bài mới chạy nền. Có thể học phần đã xong. Nếu lỗi, bấm **Thử lại phần chưa xong**; không gọi AI lại cho phần đã thành công.
7. Chọn **Làm câu gốc** hoặc **Luyện 25 câu** → thử trả lời → gợi ý → thử lại → xem lời giải khi đúng. Nếu vẫn chưa hiểu, mở **Cùng làm từng bước**. Câu mở/multiple blanks dùng tự đối chiếu, không tính vào điểm.
8. **Lưu và về menu** rồi mở lại để tiếp tục. **Kết thúc** mở điểm lần đầu /10, mức dùng gợi ý, kết quả theo dạng và lời giải. Hành trình lưu cả bài đang làm và bài đã xong.

Đề gốc giữ nội dung/thứ tự đã nhận diện. Câu thiếu dữ kiện, cần âm thanh chưa có hoặc hình chưa rõ được báo riêng. Bộ luyện mới tách khỏi đề gốc, hiện là trắc nghiệm 3–4 lựa chọn, khoảng 20% câu nâng cao khi số lượng chia hết cho 5. Câu mới có liên kết đến câu/trang nguồn. Tài liệu chỉ có bài học vẫn có thể tạo bài từ các trang đủ rõ.

## Màn hình

| Đường dẫn                                                                               | Nội dung                                                                  |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `/`                                                                                     | Trang chủ, bốn khu học, hồ sơ                                             |
| `/toan`, `/tieng-anh`, `/tieng-viet`, `/tu-hoc`                                         | Trang môn và tài liệu đã gửi                                              |
| `/tai-len`, `/tai-len/math`, `/tai-len/english`, `/tai-len/vietnamese`, `/tai-len/self` | Gửi tài liệu thật                                                         |
| `/timo`                                                                                 | Gửi đề TIMO thật                                                          |
| `/thu-vien`                                                                             | Thư viện demo: tài liệu đã tải lên dùng chung cho mọi người               |
| `/tai-lieu/[id]`                                                                        | Nhận diện, chủ đề, tạo nội dung, bài đang làm và nguồn                    |
| `/ban-mau`                                                                              | Khu trải nghiệm được ghi rõ dữ liệu mẫu                                   |
| `/buoi-hoc`, `/bai-giang`, `/luyen-tap`, `/ket-qua`                                     | Luồng gợi ý/chấm điểm/slide của bài mẫu, chưa dùng kết quả phân tích thật |
| `/luyen-tap/[documentId]/[runId]`                                                       | Làm bài thật, lưu tiến độ, kết quả và lời giải                            |
| `/hanh-trinh`                                                                           | Lịch sử bài thật; bài mẫu nằm trong mục riêng                             |

## Cách xử lý tài liệu

- API tạo bản ghi; ở chế độ cloud, trình duyệt tải trực tiếp từng tệp vào Blob Private bằng multipart. API xác minh kích thước và chữ ký định dạng trước khi đưa vào hàng chờ, không nhận file 100 MB qua Vercel Function. Chế độ local giữ upload nhị phân như trước.
- PDF được đọc số trang và tách đúng phần đã chọn bằng `pdf-lib`; gửi từng nhóm hai trang với ánh xạ trang gốc. PDF có mật khẩu/hỏng báo lỗi.
- Ảnh được xoay theo EXIF, chuẩn hóa bằng `sharp`, giới hạn 60 megapixel/ảnh và kích thước gửi AI 2400×3200. Không nhận SVG/HEIC.
- OpenRouter nhận PDF native hoặc ảnh; JSON được kiểm tra schema, số trang, cấu trúc câu hỏi. Tài liệu được coi là dữ liệu, không phải chỉ dẫn điều khiển hệ thống.
- Trạng thái và kết quả từng nhóm lưu trong PostgreSQL (hoặc `.data` khi chạy local). Workflow chia nhận diện theo nhóm trang và tạo bài theo nhóm câu thành các bước riêng. Nhóm AI có hạn thời gian 240 giây; khi lỗi vẫn giữ kết quả đã lưu và cho thử lại. Khóa giao dịch PostgreSQL bảo vệ các cập nhật đồng thời. Lỗi mạng/429/5xx có xử lý giới hạn, lỗi khóa/số dư yêu cầu sửa cấu hình; không chạy thử vô hạn.
- Tài liệu lỗi một phần vẫn mở được phần đã thành công. Retry không gọi lại AI cho phần đã có kết quả.

Tài liệu tham khảo: [OpenRouter PDF](https://openrouter.ai/docs/guides/overview/multimodal/pdfs), [structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs).

## Biên soạn và chấm bài thật

- Mỗi nhóm tối đa 5 câu được biên soạn bằng model cấu hình rồi giải lại trong một yêu cầu AI riêng. Với câu đóng, lượt giải lại không được xem đáp án/lời giải nháp; đáp án hai lượt phải khớp. Câu mở được kiểm tra lời giải tham khảo. Kiểm tra schema, ID/trang nguồn, lựa chọn/đáp án, câu trùng; các biểu thức số học AI khai báo được tính lại bằng bộ phân tích không dùng `eval`. Mẫu bài liệt kê/đếm số chẵn lẻ có hai chữ số có thêm kiểm tra xác định bằng cách liệt kê các khả năng.
- Khi kiểm tra không đạt, sửa tối đa một lần; giữ phần lỗi để thử lại có chủ đích. Sau hai lượt chưa đạt, câu gốc lỗi được báo riêng và các câu cùng nhóm đã đạt vẫn dùng được. Hai lượt AI dùng cùng model: đây là lớp kiểm tra bổ sung, không đảm bảo mọi lời giải đúng. Cần nghiệm thu nội dung giáo dục bằng tài liệu đại diện.
- TIMO có bản dịch Việt và lời giải Anh/Việt. Tiếng Anh giữ đề/đoạn đọc tiếng Anh, gợi ý và giải thích tiếng Việt.
- Máy chủ kiểm tra câu trả lời và lưu lần trả lời đầu, lần sửa, số lượt/thời gian mở gợi ý. Đáp án/lời giải không gửi về trình duyệt trước khi giải đúng, mở hướng dẫn hoặc kết thúc bài.
- Điểm = số câu đúng lần đầu / số câu chấm tự động × 10. Câu bỏ qua hoặc được hướng dẫn trước khi trả lời không tính đúng độc lập; mở gợi ý không trừ điểm. Câu tự đối chiếu không vào mẫu số.
- Thời gian gợi ý là tín hiệu gần đúng, dừng khi đóng/ẩn/rời trang; chặn tối đa 5 phút mỗi lần nếu trình duyệt ngắt đột ngột. Không dùng thời gian đọc để tự kết luận năng lực.
- **Làm câu tương tự** chọn tối đa 3 câu cùng dạng từ bộ đã tạo. Chưa sinh vô hạn câu mới hoặc tự tăng độ khó dựa trên năng lực.
- Mỗi lượt làm lưu bản chụp bộ câu hỏi. Tạo bộ học mới không làm thay đổi câu hỏi/đáp án của lượt đang làm hoặc kết quả cũ.

## Lưu trữ và giới hạn triển khai

- Cloud: tệp gốc ở Blob Private; tài liệu, kết quả AI và bài làm ở Neon. Local không có `DATABASE_URL`: dữ liệu ở `.data/documents`, ngoài `public`, được `.gitignore` loại trừ. Vercel không bao giờ tự chuyển về lưu trên đĩa tạm khi thiếu database.
- Thư viện demo dùng chung: ai mở website cũng thấy tài liệu đã tải đủ, nội dung nhận diện, nguồn PDF/ảnh và bộ bài đã tạo, kể cả tài liệu cũ. Tệp chưa tải đủ chỉ hiện với người gửi.
- Cookie HttpOnly chỉ giữ quyền tải tiếp và nhận diện/tạo lại nội dung tài liệu của người tải lên. Bài làm thật, điểm và lịch sử dùng chung; người xem khác có thể mở và tiếp tục bài cũ. Chưa có tài khoản đăng nhập; xóa cookie làm mất quyền quản lý tài liệu của trình duyệt đó, nhưng vẫn xem tài liệu và học bình thường.
- Hồ sơ và bài mẫu lưu trong `localStorage` (`vuihoc-demo-v1`). Ghi chú trên bản nhận diện lưu theo `vuihoc-responses-[id]`. Bài làm thật lưu ở PostgreSQL hoặc `.data/documents/[id]/runs` trong chế độ local, dùng chung giữa mọi trình duyệt/thiết bị; cookie chỉ giữ quyền quản lý tài liệu.
- Đã có adapter PostgreSQL, Blob Private và Workflow cho Vercel. MVP vẫn chưa có tài khoản đăng nhập, hạn mức AI theo người dùng hoặc tự dọn tệp bỏ dở; các phần này cần bổ sung khi mở rộng ngoài demo.
- Chưa có thích ứng độ khó theo kết quả, tạo slide/video từ tài liệu thật hoặc API video. Slide/bài mẫu vẫn được ghi rõ; không được xem là video AI.
- Kiểm thử tự động dùng phản hồi API có kiểm soát để kiểm tra giao thức, điểm và phục hồi lỗi. Kiểm thử AI thật và giới hạn nghiệm thu được ghi trong `docs/IMPLEMENTATION_STATUS.md`; không suy rộng kết quả một tài liệu sang mọi dạng bài/môn học.

## Cấu trúc

- `src/app/api/documents/[[...parts]]/route.ts`: tạo tài liệu, stream upload, đọc nguồn, trạng thái và retry.
- `src/server/analysis.ts`: chuẩn hóa nguồn, OpenRouter, kiểm tra kết quả và xử lý từng phần.
- `src/server/generation.ts`, `teaching-ai.ts`, `learning-validation.ts`: tạo/kiểm tra nội dung và thử lại từng phần.
- `src/server/learning-runs.ts`, `src/lib/learning.ts`: bài làm bền vững, chấm điểm, gợi ý và phản hồi không lộ đáp án sớm.
- `src/components/learning.tsx`: cấu hình sinh bài, luyện tập thật, kết quả và hành trình.
- `src/server/store.ts`, `database.ts`, `source-files.ts`: lưu dữ liệu PostgreSQL, tệp Blob Private, khóa giao dịch và adapter local.
- `src/server/dispatch.ts`, `src/workflows/*`: khởi tạo và chạy tác vụ nhận diện/tạo bài theo từng bước bền vững.
- `src/server/validation.ts`: kiểm tra file, chọn trang, schema dữ liệu AI.
- `src/lib/documents.ts`: môn học và hợp đồng dữ liệu.
- `src/components/documents.tsx`: thư viện, tải tệp và tài liệu đã nhận diện.
- `src/components/app.tsx`, `practice.tsx`, `lecture.tsx`, `src/lib/demo.ts`: khung UI và khu trải nghiệm mẫu.

## Nguồn hình ảnh

`public/characters.webp` được lấy từ [bản demo do chủ dự án cung cấp](https://toan-vui-lop-hai-2026.science-for-economic.chatgpt.site/assets/characters.webp). Font Be Vietnam Pro qua Google Fonts, có font hệ thống dự phòng.
