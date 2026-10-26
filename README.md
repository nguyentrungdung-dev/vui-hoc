# Vui Học

Vui Học là ứng dụng học tập giúp trẻ luyện tập từ chính tài liệu đang học. Từ một file PDF hoặc ảnh bài tập, ứng dụng nhận diện nội dung, tạo bài luyện và hướng dẫn từng bước bằng hình ảnh chuyển động cùng giọng đọc.

## Chức năng nổi bật

- **Học từ tài liệu của mình:** tải PDF hoặc ảnh bài học thuộc các môn Toán, Tiếng Anh, Tiếng Việt và khu Tự học; chọn trang cần sử dụng.
- **Luyện tập theo nội dung bài học:** tạo bộ câu hỏi theo chủ đề, tùy chọn từ 5 đến 50 câu, có liên kết về tài liệu nguồn.
- **Gợi ý từng bước:** nhận gợi ý, thử lại và xem lời giải để hiểu cách làm.
- **Animation có giọng đọc:** theo dõi phần hướng dẫn với minh họa chuyển động, âm thanh và điều khiển phát lại, chuyển bước.
- **Ôn bài và ôn tổng hợp:** kết hợp nhiều tài liệu hoặc đề tài cùng môn để tạo bộ ôn.
- **Thư viện và Hành trình:** tìm lại tài liệu, tiếp tục bài đang làm và xem kết quả luyện tập.
- **Giao diện dành cho trẻ:** màu sắc thân thiện, bộ nhân vật đồng hành và bố cục phù hợp máy tính lẫn điện thoại.

## Cách hoạt động

1. **Đưa tài liệu vào thư viện.** Chọn môn học, tải PDF hoặc ảnh và chọn các trang cần học.
2. **Nhận diện nội dung.** AI đọc tài liệu, phân loại chủ đề và câu hỏi, giữ liên kết với trang nguồn.
3. **Tạo nội dung luyện tập.** Ứng dụng biên soạn câu hỏi, gợi ý và lời giải dựa trên nội dung đã nhận diện.
4. **Học và ôn lại.** Trẻ làm bài, mở hướng dẫn khi cần và theo dõi kết quả trong Hành trình.

Các bước xử lý tài liệu và tạo bài chạy nền, lưu kết quả từng phần và hỗ trợ thử lại khi bị gián đoạn.

## Công nghệ

| Thành phần                   | Công nghệ                             |
| ---------------------------- | ------------------------------------- |
| Ứng dụng web                 | Next.js App Router, React, TypeScript |
| Giao diện                    | CSS, Lucide React                     |
| AI và giọng đọc              | OpenRouter, Claude, Gemini TTS        |
| Cơ sở dữ liệu                | PostgreSQL, Neon                      |
| Lưu trữ tài liệu và âm thanh | Vercel Blob Private                   |
| Tác vụ nền                   | Workflow SDK                          |
| Xử lý PDF và ảnh             | pdf-lib, Sharp                        |
| Kiểm tra cấu trúc dữ liệu    | Zod                                   |
| Triển khai                   | Vercel, Node.js 24                    |

## Chạy trên máy

Yêu cầu **Node.js 24.x** và npm.

```sh
npm ci
cp -n .env.example .env.local
npm run dev
```

Điền cấu hình dịch vụ vào `.env.local` theo mẫu `.env.example`, sau đó mở [http://127.0.0.1:3000](http://127.0.0.1:3000).

OpenRouter cung cấp AI và giọng đọc. PostgreSQL và Vercel Blob dùng để lưu dữ liệu trên cloud; khi phát triển không có database, ứng dụng có thể lưu dữ liệu trên máy. Chế độ production yêu cầu cấu hình PostgreSQL, Blob và OpenRouter.

## Lệnh phát triển

```sh
npm run dev          # Chạy môi trường phát triển
npm test             # Chạy kiểm thử
npm run typecheck    # Kiểm tra TypeScript
npm run build        # Build production
npm run prod         # Kiểm tra cấu hình, build và chạy production local
```
