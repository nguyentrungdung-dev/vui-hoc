# Vui Học

Vui Học là ứng dụng học tập giúp trẻ luyện tập từ chính tài liệu đang học. Từ một file PDF hoặc ảnh bài tập, ứng dụng nhận diện nội dung, tạo bài luyện và hướng dẫn từng bước bằng hình ảnh chuyển động cùng giọng đọc.

## Chức năng nổi bật

- **Học từ tài liệu của mình:** tải PDF hoặc ảnh bài học thuộc các môn Toán, Tiếng Anh, Tiếng Việt và khu Tự học; chọn trang cần sử dụng.
- **Luyện tập theo nội dung bài học:** tạo bộ câu hỏi theo chủ đề, tùy chọn từ 5 đến 50 câu, có liên kết về tài liệu nguồn.
- **Đề gốc được giữ đầy đủ:** hai lượt nhận diện/đối chiếu với trang nguồn; cảnh báo chữ mờ hoặc đề thiếu dữ kiện không tự loại câu.
- **Hình minh họa ngay trong bài:** xác định vùng hình trên ảnh trang, cắt từ bản gốc và đối chiếu lại trước khi hiển thị. Nếu chưa lấy được hình đầy đủ thì báo riêng, không thay bằng cả trang đề.
- **Chấm tự luận từng ý:** chuẩn bị rubric trước khi làm bài; hai lượt chấm độc lập ghi nhận phương pháp và điểm từng phần. Khi chưa thống nhất thì lưu bài mà không tính đúng/sai.
- **Đáp án và hướng dẫn thống nhất:** giữ nguyên nhãn/nội dung lựa chọn, giải độc lập và kiểm tra đáp án–hint–lời giải–rubric; nội dung chưa đạt được giữ ở trạng thái chưa chấm.
- **Gợi ý từng bước:** nhận gợi ý đã lưu, thử lại và xem lời giải để hiểu cách làm.
- **Animation có giọng đọc:** theo dõi phần hướng dẫn với minh họa chuyển động, âm thanh và điều khiển phát lại, chuyển bước.
- **Ôn bài và ôn tổng hợp:** kết hợp nhiều tài liệu hoặc đề tài cùng môn để tạo bộ ôn.
- **Thư viện và Hành trình:** tìm lại tài liệu, tiếp tục bài đang làm và xem kết quả luyện tập.
- **Giao diện dành cho trẻ:** màu sắc thân thiện, bộ nhân vật đồng hành và bố cục phù hợp máy tính lẫn điện thoại.

## Cách hoạt động

1. **Đưa tài liệu vào thư viện.** Chọn môn học, tải PDF hoặc ảnh và chọn các trang cần học.
2. **Chuẩn bị bài gốc.** AI đọc tài liệu, phân loại chủ đề và câu hỏi, chuẩn bị và kiểm tra đáp án, ba mức gợi ý và lời giải trong cùng lượt xử lý upload. Chỉ báo sẵn sàng khi hoàn tất; câu thiếu dữ kiện được báo riêng.
3. **Vào làm bài ngay.** Màn hình tài liệu giữ danh sách chủ đề, ẩn bản xem trước các câu hỏi. Chọn chủ đề hoặc làm toàn bộ bài gốc; gợi ý đọc từ nội dung đã lưu, không chờ AI tạo mới.
4. **Luyện thêm khi muốn.** Mở mục luyện thêm để tạo 5–50 câu mới theo chủ đề; giữ lại lời giải gốc. Video chỉ được tạo khi người học yêu cầu. Theo dõi kết quả trong Hành trình.

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
| Xử lý PDF và ảnh             | PDF.js, pdf-lib, Sharp                |
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

### Kiểm tra luồng đề gốc

`npm test` kiểm tra giữ câu cảnh báo, ánh xạ lựa chọn, mâu thuẫn hint/đáp án, chấm từng phần, chống chấm lại sự kiện, và render/cắt hình PDF thực. `node --import tsx scripts/check-worksheet.mts <document-id> [page]` kiểm tra một trang qua AI thật (phát sinh lượt gọi OpenRouter), chỉ đọc tài liệu, không sửa dữ liệu và không tạo video; kết quả ghi trong thư mục tạm hệ thống.

`node --import tsx scripts/verify-repaired-worksheet.mts <document-id>` kiểm tra các lựa chọn, hint và lời giải của bộ đề đã lưu qua luồng làm bài và PostgreSQL JSONB thật. Các lượt kiểm thử nằm trong một transaction được rollback để không thêm lịch sử học.

Bộ học cũ cần được chủ tài liệu cập nhật bằng nút **Cập nhật bài gốc, hình và tiêu chí chấm**. Các lượt đang làm dùng nội dung cũ vẫn giữ bài đã nhập nhưng tạm không chấm đúng/sai; kết quả lịch sử đã kết thúc được giữ lại.
