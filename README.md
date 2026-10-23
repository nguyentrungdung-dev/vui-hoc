# Vui học — MVP

Cập nhật **23/10/2026** theo mã nguồn và các quyết định đã duyệt. Next.js + TypeScript, luồng **tải PDF/ảnh → nhận diện → tạo lời giải/bộ luyện → làm bài, nhận gợi ý và lưu Hành trình** cho bốn khu tài liệu: Toán, Tiếng Anh, Tiếng Việt và Tự học.

## Trạng thái hiện tại

| Hạng mục                           | Trạng thái                                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| Tài liệu thật                      | Đã có upload PDF/ảnh, chọn trang, nhận diện OpenRouter, truy vết nguồn và thử lại phần lỗi          |
| Nội dung và bài làm                | Đã có bộ luyện 5–50 câu (mặc định 25), đáp án, gợi ý, lời giải, chấm/lưu trên máy chủ               |
| Ôn bài                             | Đã có chọn nhiều tài liệu cùng môn trong thư viện, tùy chỉnh số câu và tạo bộ luyện mới             |
| Ôn tổng hợp                        | Đã có tìm/chọn đề tài đã nhận diện cùng môn; câu hỏi bám tài liệu nguồn                             |
| Hành trình                         | Đã lưu bài đang làm và kết quả, gồm Ôn bài/Ôn tổng hợp; demo dùng chung giữa các phiên              |
| Điều hướng                         | Header có Trang chủ, Luyện tập, Khám phá, Thư viện, Hành trình, Phần thưởng; đã bỏ hàng menu phụ    |
| Trang chủ                          | Bốn khu tài liệu và thẻ Luyện thi Toán song ngữ nằm trong Horizontal Scroll có nút trước/sau        |
| Luyện thi Toán song ngữ / TIMO mới | Chỉ có giao diện chọn Mầm non–lớp 5; cả sáu khối mở **Coming soon**                                 |
| Phần thưởng                        | Chỉ có **Coming soon**, chưa chốt cơ chế thưởng                                                     |
| Hạ tầng                            | Đã có Neon PostgreSQL, Vercel Blob Private và Workflow; `.data` chỉ là adapter development          |
| Hiệu năng                          | Đã tối ưu giữ kết nối và truy vấn bài làm/lịch sử; chưa có phép đo xác nhận bản production mới nhất |
| Bài giảng/video thật               | Chưa tạo slide/kịch bản theo tài liệu thật, chưa tích hợp API video hoặc tương tác theo video thật  |
| Thích ứng và kiểu bài              | Chưa tăng độ khó theo năng lực; bài mới chủ yếu trắc nghiệm, câu phức hợp dùng tự đối chiếu         |

**Phần đang chờ quyết định:** quản trị/upload đề, đáp án, hiển thị song ngữ/phụ đề và Hành trình của ngân hàng TIMO mới; cơ chế Phần thưởng. Chưa triển khai thêm các phần này. Đăng nhập, nhiều hồ sơ bé và chấm ảnh bài viết tay chưa thuộc phạm vi demo hiện tại.

Đã có kiểm thử kỹ thuật và kiểm tra giao diện; chủ dự án đã báo test xong phần Ôn bài/Ôn tổng hợp trước khi chuyển yêu cầu. Chưa có biên bản nghiệm thu chất lượng AI trên đủ các môn/dạng bài hoặc xác nhận toàn bộ thay đổi đã có trên deployment mới nhất. Xem tài liệu tiến độ để phân biệt các mức xác minh.

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

1. Từ **Khám phá**, chọn một trong bốn khu tài liệu → **Gửi tài liệu**. Trang Toán đã bỏ nút/giới thiệu TIMO; tài liệu TIMO cũ vẫn giữ nguyên trong Thư viện và mở được.
2. Chọn một PDF hoặc nhiều ảnh JPG/PNG/WebP, sắp xếp ảnh nếu cần. Tổng tối đa 100 MB, tối đa 100 trang. HEIC cần xuất JPG trước.
3. Chọn toàn bộ hoặc nhập trang như `1-3, 5`. Với nhiều ảnh, số trang là thứ tự ảnh. Đặt tên buổi học và gửi.
4. Chờ tải tệp xong; sau khi chuyển đến trang tài liệu có thể rời trang. Workflow tiếp tục nhận diện trong nền.
5. Mở **Lời giải và bài luyện của em**, chọn chủ đề/số câu (mặc định 25, từ 5–50), bấm **Tạo lời giải và bộ luyện**. Tài liệu đã nhận diện từ bước 2 dùng được ngay, không cần tải lại.
6. Tác vụ giải đề gốc và tạo bài mới chạy nền. Có thể học phần đã xong. Nếu lỗi, bấm **Thử lại phần chưa xong**; không gọi AI lại cho phần đã thành công.
7. Chọn **Làm câu gốc** hoặc **Luyện 25 câu** → thử trả lời → gợi ý → thử lại → xem lời giải khi đúng. Nếu vẫn chưa hiểu, mở **Cùng làm từng bước**. Câu mở/multiple blanks dùng tự đối chiếu, không tính vào điểm.
8. **Lưu và về menu** rồi mở lại để tiếp tục. **Kết thúc** mở điểm lần đầu /10, mức dùng gợi ý, kết quả theo dạng và lời giải. Hành trình lưu cả bài đang làm và bài đã xong.

Đề gốc giữ nội dung/thứ tự đã nhận diện. Câu thiếu dữ kiện, cần âm thanh chưa có hoặc hình chưa rõ được báo riêng. Bộ luyện mới tách khỏi đề gốc, hiện là trắc nghiệm 3–4 lựa chọn, khoảng 20% câu nâng cao khi số lượng chia hết cho 5. Câu mới có liên kết đến câu/trang nguồn. Tài liệu chỉ có bài học vẫn có thể tạo bài từ các trang đủ rõ.

## Ôn bài và Ôn tổng hợp

- Header **Luyện tập → Ôn bài**: chọn một môn, tìm/chọn tài liệu đã nhận diện, đặt số câu và tạo bộ luyện.
- Header **Luyện tập → Ôn tổng hợp**: chọn một môn, tìm/chọn đề tài từ nội dung đã nhận diện và tạo bộ luyện bám các trang nguồn.
- Mặc định 25 câu, tùy chỉnh 5–50. Hiện chọn tối đa 20 tài liệu hoặc 50 đề tài; số câu phải ít nhất bằng số mục được chọn. Máy chủ cũng kiểm tra cùng môn và nguồn hợp lệ.
- Bộ ôn dùng phần văn bản nguồn đủ rõ, được tạo/kiểm tra theo nhóm. Chờ đủ bộ trước khi làm; có trạng thái tiến độ, mở lại và thử lại phần lỗi. Bài dựa trên hình hoặc nội dung chưa rõ không được tự suy đoán để đủ câu.
- Bộ ôn đã tạo có danh sách riêng; không trộn vào danh sách PDF/ảnh nguồn. Khi làm bài vẫn có liên kết về tài liệu/trang gốc, chấm /10, gợi ý, giải thích và lưu Hành trình.
- Dropdown mở bằng hover trên desktop, chạm trên màn hình nhỏ và hỗ trợ bàn phím. Header thu gọn ở màn hình tối đa 900 px.

## Luyện thi Toán song ngữ / TIMO mới

Thẻ trang chủ và **Luyện tập → Luyện đề TIMO** dẫn cùng trang chọn Mầm non, lớp 1–5. Chọn khối chỉ hiện **Coming soon**. Chưa có ngân hàng đề thật, trang quản trị, upload đề, nhận diện/chấm bài hoặc ghi Hành trình cho khu mới.

Khi được duyệt phát triển tiếp: ngân hàng đề do nhà phát hành cung cấp, làm đúng đề cố định, kết quả là số câu đúng/tổng số câu và học lại lỗi sai. Không có chức năng tạo thêm đề, đổi số câu hoặc sinh bài tương tự trong khu này. Phương án đáp án, song ngữ và Hành trình vẫn chờ quyết định; không kế thừa mặc định từ TIMO cũ.

## Màn hình

| Đường dẫn                                                                               | Nội dung hiện tại                                                                                                |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `/`                                                                                     | Trang chủ, bốn khu tài liệu + thẻ TIMO, Horizontal Scroll, hồ sơ và thống kê                                     |
| `/toan`, `/tieng-anh`, `/tieng-viet`, `/tu-hoc`                                         | Trang môn và tài liệu đã gửi; Toán không còn quảng bá/nút TIMO                                                   |
| `/tai-len`, `/tai-len/math`, `/tai-len/english`, `/tai-len/vietnamese`, `/tai-len/self` | Gửi tài liệu thật                                                                                                |
| `/thu-vien`                                                                             | Thư viện tài liệu đã upload dùng chung, có lối vào trên header                                                   |
| `/tai-lieu/[id]`                                                                        | Nhận diện, chủ đề, tạo nội dung, bài đang làm và nguồn                                                           |
| `/luyen-tap/on-bai`, `/luyen-tap/on-tong-hop`                                           | Chọn nguồn cùng môn và cấu hình bộ ôn mới                                                                        |
| `/luyen-tap/bo/[id]`                                                                    | Tiến độ bộ ôn, thử lại phần lỗi, bắt đầu/tiếp tục và các lượt làm                                                |
| `/luyen-tap/[documentId]/[runId]`                                                       | Làm bài thật, lưu tiến độ, kết quả và lời giải                                                                   |
| `/hanh-trinh`                                                                           | Lịch sử bài thật dùng chung; bài mẫu nằm trong mục riêng                                                         |
| `/luyen-tap/timo`                                                                       | Chọn sáu khối Mầm non–lớp 5                                                                                      |
| `/luyen-tap/timo/mam-non`, `/luyen-tap/timo/lop-1` … `/luyen-tap/timo/lop-5`            | Coming soon của từng khối                                                                                        |
| `/phan-thuong`                                                                          | Coming soon                                                                                                      |
| `/ban-mau`                                                                              | Khu trải nghiệm được ghi rõ dữ liệu mẫu                                                                          |
| `/buoi-hoc`, `/bai-giang`, `/luyen-tap`, `/ket-qua`                                     | Luồng bài/slide mẫu, chưa dùng tài liệu thật để sinh bài giảng                                                   |
| `/timo`                                                                                 | Route upload TIMO cũ còn trong mã để tương thích; không còn nút dẫn từ trang Toán, không phải ngân hàng TIMO mới |

## Cách xử lý tài liệu

- API tạo bản ghi; ở chế độ cloud, trình duyệt tải trực tiếp từng tệp vào Blob Private bằng multipart. API xác minh kích thước và chữ ký định dạng trước khi đưa vào hàng chờ, không nhận file 100 MB qua Vercel Function. Chế độ local giữ upload nhị phân như trước.
- PDF được đọc số trang và tách đúng phần đã chọn bằng `pdf-lib`; gửi từng nhóm hai trang với ánh xạ trang gốc. PDF có mật khẩu/hỏng báo lỗi.
- Ảnh được xoay theo EXIF, chuẩn hóa bằng `sharp`, giới hạn 60 megapixel/ảnh và kích thước gửi AI 2400×3200. Không nhận SVG/HEIC.
- OpenRouter nhận PDF native hoặc ảnh; JSON được kiểm tra schema, số trang, cấu trúc câu hỏi. Tài liệu được coi là dữ liệu, không phải chỉ dẫn điều khiển hệ thống.
- Trạng thái và kết quả từng nhóm lưu trong PostgreSQL (hoặc `.data` khi chạy local). Workflow chia nhận diện theo nhóm trang và tạo bài theo nhóm câu thành các bước riêng. Nhóm AI có hạn thời gian 240 giây; khi lỗi vẫn giữ kết quả đã lưu và cho thử lại. Khóa giao dịch PostgreSQL bảo vệ các cập nhật đồng thời. Lỗi mạng/429/5xx có xử lý giới hạn, lỗi khóa/số dư yêu cầu sửa cấu hình; không chạy thử vô hạn.
- Tài liệu lỗi một phần vẫn mở được phần đã thành công. Retry không gọi lại AI cho phần đã có kết quả.

Model do `OPENROUTER_MODEL` quyết định; mã fallback vẫn là Haiku 4.5. Đã bỏ `temperature` ở cả nhận diện và biên soạn khi dùng `anthropic/claude-haiku-5.5`, giữ `require_parameters: true` và xử lý PDF native. Không suy ra model đang chạy trên production chỉ từ giá trị fallback hoặc một báo cáo thử cũ. Thông báo lỗi nhận diện HTTP 400/404 hiện vẫn gộp PDF/ảnh/JSON, chưa lưu nguyên phản hồi lỗi upstream.

Tài liệu tham khảo: [OpenRouter PDF](https://openrouter.ai/docs/guides/overview/multimodal/pdfs), [structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs).

## Biên soạn và chấm bài thật

- Mỗi nhóm tối đa 5 câu được biên soạn bằng model cấu hình rồi giải lại trong một yêu cầu AI riêng. Với câu đóng, lượt giải lại không được xem đáp án/lời giải nháp; đáp án hai lượt phải khớp. Câu mở được kiểm tra lời giải tham khảo. Kiểm tra schema, ID/trang nguồn, lựa chọn/đáp án, câu trùng; các biểu thức số học AI khai báo được tính lại bằng bộ phân tích không dùng `eval`. Mẫu bài liệt kê/đếm số chẵn lẻ có hai chữ số có thêm kiểm tra xác định bằng cách liệt kê các khả năng.
- Khi kiểm tra không đạt, sửa tối đa một lần; giữ phần lỗi để thử lại có chủ đích. Sau hai lượt chưa đạt, câu gốc lỗi được báo riêng và các câu cùng nhóm đã đạt vẫn dùng được. Hai lượt AI dùng cùng model: đây là lớp kiểm tra bổ sung, không đảm bảo mọi lời giải đúng. Cần nghiệm thu nội dung giáo dục bằng tài liệu đại diện.
- Nội dung tài liệu có chế độ TIMO cũ hỗ trợ bản dịch Việt và lời giải Anh/Việt; đây không phải chức năng đã hoạt động của ngân hàng TIMO mới. Tiếng Anh giữ đề/đoạn đọc tiếng Anh, gợi ý và giải thích tiếng Việt.
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
- `src/server/revision.ts`, `src/lib/revision.ts`, `src/components/revision.tsx`: chọn nguồn, tạo bộ Ôn bài/Ôn tổng hợp, tiến độ và truy vết nguồn.
- `src/components/practice-menu.tsx`, `worlds.tsx`, `timo.tsx`: dropdown Luyện tập, Horizontal Scroll và giao diện TIMO Coming soon.
- `src/components/app.tsx`, `practice.tsx`, `lecture.tsx`, `src/lib/demo.ts`: khung UI và khu trải nghiệm mẫu.

## Nguồn hình ảnh

`public/characters.webp` được lấy từ [bản demo do chủ dự án cung cấp](https://toan-vui-lop-hai-2026.science-for-economic.chatgpt.site/assets/characters.webp). Font Be Vietnam Pro qua Google Fonts, có font hệ thống dự phòng.
