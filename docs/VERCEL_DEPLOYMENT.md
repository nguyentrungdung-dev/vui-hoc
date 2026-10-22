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
- Framework: Next.js; Install Command: `npm ci`; Build Command: `npm run build`; Output Directory: mặc định.
- Dùng Node.js 22.12+ (đã kiểm thử Node 24).
- Deploy sau khi thêm biến môi trường. Redeploy commit cũ chưa có adapter mới sẽ vẫn lỗi.
- Không đặt `npm run dev`, `npm start` hoặc `npm run worker` làm build command.
- Không cần nhập SQL thủ công: API tạo `vuihoc_documents`, `vuihoc_runs` và index nếu chưa có, trong giao dịch có khóa để tránh xung đột nhiều instance.
- Không để middleware/proxy chặn `/.well-known/workflow/`. SDK tự sinh route và thời lượng function phù hợp gói Vercel.

## 3. Nghiệm thu trên website

1. Mở `/api/documents/config`: mong đợi `storage: "blob"`, `storageConfigured: true`, `configured: true`.
2. Tải PDF nhỏ; kiểm tra trạng thái đi qua chờ/nhận diện tới hoàn tất. Đóng trang rồi mở lại; tiến độ còn.
3. Tải PDF lớn hơn 4,5 MB và một ảnh; kiểm tra tiến độ, mở nguồn và chọn trang. File tải thẳng từ browser sang Blob, API chỉ nhận metadata/token request.
4. Tạo 25 câu; chờ nhóm đầu, mở làm bài, xem gợi ý, kết thúc; tải lại trang và kiểm tra kết quả.
5. Với lỗi AI hoặc hết số dư, sửa cấu hình rồi bấm **Thử lại phần chưa xong**; phần đã thành công không sinh lại.
6. Kiểm tra Runtime Logs/Workflow của Vercel nếu tác vụ lỗi. Nhóm AI giới hạn 240 giây; xử lý quá lâu được ghi lỗi để thử lại, không giữ function vô hạn.

Một bài 25 câu có thể gồm nhiều bước AI nên tổng thời gian có thể dài hơn một function. Hạn mức miễn phí Vercel/Neon/Blob và số dư OpenRouter vẫn áp dụng.

## 4. Local và dữ liệu cũ

- Không có `DATABASE_URL` và không chạy trên Vercel: tiếp tục dùng `.data`, `npm run dev` là đủ.
- Muốn local dùng Neon/Blob: đưa hai biến cloud vào `.env.local`, giữ nguyên khóa AI, khởi động lại server. Không cần PostgreSQL trên Mac.
- Dữ liệu `.data` cũ không bị xóa hoặc tự upload. Để dùng tài liệu cũ trên cloud, tải lại file. Chưa có công cụ migration tự động.
- Thư viện vẫn gắn với cookie trình duyệt/tên miền; localhost không chia sẻ cookie với Vercel. Đây chưa phải đăng nhập đồng bộ nhiều thiết bị.
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
