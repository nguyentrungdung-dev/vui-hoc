# Triển khai Vui học trên Vercel

Cập nhật 22/10/2026. Kiến trúc: Next.js + Neon PostgreSQL + Vercel Blob Private + Vercel Workflow SDK. Đã bỏ `npm run worker`. Video vẫn tạm dừng.

## 1. Biến môi trường

Trong project Vui học → Settings → Environment Variables, kiểm tra:

| Biến                    | Giá trị / cách tạo                                                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`          | Neon → Connect → URL pooled có `sslmode=require`; tích hợp Neon có thể tự thêm biến này.                 |
| `BLOB_READ_WRITE_TOKEN` | Storage → Create Database → Blob → **Private** → Connect Project.                                        |
| `OPENROUTER_API_KEY`    | Khóa OpenRouter đang dùng.                                                                               |
| `OPENROUTER_MODEL`      | Model hiện chọn, ví dụ `anthropic/claude-haiku-4.5`. Giữ model đã hoạt động nếu đang dùng lựa chọn khác. |

Áp dụng cho Production; bật thêm Preview/Development nếu cần dùng ở các môi trường đó. Không thêm tiền tố `NEXT_PUBLIC_` cho khóa hoặc database URL. Không đưa giá trị vào Git/chat. Nếu dashboard tạo biến có tên khác, cần gán lại đúng các tên trên.

Neon lưu tài liệu đã nhận diện, bộ câu hỏi và bài làm. Blob lưu PDF/ảnh. Workflow tự dùng hạ tầng Vercel; không cần API key cho Workflow khi deploy trực tiếp trên Vercel.

## 2. Đưa bản code mới lên Vercel

- Commit/push bản code mới vào repo đã liên kết project, hoặc deploy bằng Vercel CLI đã đăng nhập.
- Framework: Next.js; Install Command: `npm ci`; Build Command: `npm run build:deploy`; Output Directory: mặc định.
- Dùng Node.js **24.x**, được khai báo trong `package.json` và `.nvmrc`. `vercel.json` cố định install/build command; giữ Output Directory mặc định.
- Deploy sau khi thêm biến môi trường. Redeploy commit cũ chưa có adapter mới sẽ vẫn lỗi.
- Không đặt `npm run dev`, `npm start` hoặc `npm run worker` làm build command.
- Không cần nhập SQL thủ công: API tạo `vuihoc_documents`, `vuihoc_runs` và index nếu chưa có, trong giao dịch có khóa để tránh xung đột nhiều instance.
- Không để middleware/proxy chặn `/.well-known/workflow/`. SDK tự sinh route và thời lượng function phù hợp gói Vercel.

## 3. Nghiệm thu trên website

1. Chạy `npm run smoke -- https://your-project.vercel.app`; sau đó mở `/api/documents/config`: mong đợi `storage: "blob"`, `storageConfigured: true`, `configured: true`, `sharedLibrary: true`.
2. Tải PDF nhỏ; kiểm tra trạng thái đi qua chờ/nhận diện tới hoàn tất. Đóng trang rồi mở lại; tiến độ còn.
3. Tải PDF lớn hơn 4,5 MB và một ảnh; kiểm tra tiến độ, mở nguồn và chọn trang. File tải thẳng từ browser sang Blob, API chỉ nhận metadata/token request.
4. Tạo 25 câu; chờ nhóm đầu, mở làm bài, xem gợi ý, kết thúc; tải lại trang và kiểm tra kết quả.
5. Với lỗi AI hoặc hết số dư, sửa cấu hình rồi bấm **Thử lại phần chưa xong**; phần đã thành công không sinh lại.
6. Kiểm tra Runtime Logs/Workflow của Vercel nếu tác vụ lỗi. Nhóm AI giới hạn 240 giây; xử lý quá lâu được ghi lỗi để thử lại, không giữ function vô hạn.

Một bài 25 câu có thể gồm nhiều bước AI nên tổng thời gian có thể dài hơn một function. Hạn mức miễn phí Vercel/Neon/Blob và số dư OpenRouter vẫn áp dụng.

## 4. Local và dữ liệu cũ

- `.data` chỉ dùng trong `npm run dev`. Production local và Vercel đều bắt buộc có `DATABASE_URL`; không còn fallback sang file.
- Để nghiệm thu local: điền đủ `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` trong `.env.production.local`, chạy `npm ci` rồi `npm run prod`. Dùng Neon/Blob riêng cho Preview nếu cần tránh ghi dữ liệu thử vào Production.
- Dữ liệu `.data` cũ không bị xóa hoặc tự upload. Để dùng tài liệu cũ trên cloud, tải lại file. Chưa có công cụ migration tự động.
- Thư viện demo dùng chung cho mọi người trên cùng deployment/database, gồm cả tài liệu đã tải trước thay đổi này. Bản tải dở chỉ hiện cho người gửi. Nguồn Blob vẫn Private; API kiểm tra tài liệu đã tải đủ trước khi phục vụ người xem chung.
- Bài làm thật, điểm và lịch sử dùng chung giữa mọi trình duyệt/thiết bị, kể cả bài cũ có hoặc không có trường owner. Cookie chỉ giữ quyền quản lý tài liệu của người tải lên. Không cần migration dữ liệu.
- Người gửi giữ quyền tải tiếp và gọi AI nhận diện/tạo lại nội dung. Người xem dùng các bộ bài sẵn có; mở thư viện không gọi AI.
- `.workflow-data` là trạng thái Workflow local, không đưa vào Git. Trên Vercel, trạng thái Workflow do nền tảng quản lý.

## 5. Kiểm thử kỹ thuật

```sh
npm run typecheck
npm test
npm run build
```

Các kiểm thử PostgreSQL/Blob contract trong `src/server/cloud.test.ts` mặc định bỏ qua nếu không có `TEST_DATABASE_URL`. Dùng **database riêng tên bắt đầu bằng `vuihoc_test_`**, tuyệt đối không trỏ vào database ứng dụng. Kiểm thử tạo/xóa bản ghi riêng của nó; không gọi dịch vụ AI hoặc Blob thật.

Ví dụ với PostgreSQL thử nghiệm riêng:

```sh
TEST_DATABASE_URL=postgresql://localhost:5432/vuihoc_test_local npm test
```

Đã kiểm thử: build production; 30 tests gồm PostgreSQL thật trên database tạm, Blob contract bằng SDK mock, phân quyền/cập nhật đồng thời, scoring, phục hồi từng phần; gửi PDF qua server production local và Workflow chuyển sang chờ khóa AI không có worker riêng. Nghiệm thu Neon/Blob/AI thật trên Vercel cần bản code mới được deploy và đủ biến môi trường.

## Tài liệu nền tảng

- [Blob client uploads](https://vercel.com/docs/vercel-blob/client-upload)
- [Workflow với Next.js](https://workflow-sdk.dev/docs/getting-started/next)
- [Giới hạn payload Vercel và upload/streaming](https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions)

## Kiểm tra đồng nhất local / deploy (22/10/2026)

- `npm run prod` dùng cùng `build:deploy` như `vercel.json`; kiểm tra đủ biến cloud trước khi build và trước khi start; `build:deploy` còn kiểm tra kết nối PostgreSQL và quyền đọc Blob, dừng build nếu thất bại.
- `npm run check:services` chỉ đọc PostgreSQL (`SELECT 1`) và danh sách Blob (tối đa 1 metadata); không in bí mật, không gọi AI, không thay đổi dữ liệu. Đây chưa phải kiểm tra quyền ghi hoặc model AI.
- `npm run verify` biên dịch không cần bí mật cloud để dùng trong CI. Đây không phải nghiệm thu kết nối cloud.
- GitHub Actions chạy trên Linux, Node 24, `npm ci`, test PostgreSQL thật trong service database riêng và production build. Cần cấu hình branch protection nếu muốn bắt buộc workflow thành công trước khi merge; file workflow không tự bật quy tắc này.
- Unit tests bỏ các khóa ứng dụng khỏi môi trường test. Chỉ `TEST_DATABASE_URL` trỏ tới database `vuihoc_test_*` được dùng trong integration tests; khi không có biến này các test database được đánh dấu skipped.
- Chạy `npm run smoke` khi production local đang bật; chạy lại cùng lệnh với URL deploy. Smoke chỉ kiểm tra assets/config/cookie/API database; upload Blob, Workflow và AI vẫn nghiệm thu theo mục 3.
- Không đặt giả `VERCEL=1` trên Mac: Workflow phải dùng backend đúng với nền tảng. Production local không mô phỏng Linux/serverless/HTTPS/hạn mức Vercel.
- Khai báo Node 24.x thống nhất major; Vercel tự cập nhật minor/patch. Dependency dùng đúng lockfile, nhưng native binaries được cài riêng theo macOS/Linux.

Tham chiếu runtime: [Vercel hỗ trợ và chọn phiên bản Node.js](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
