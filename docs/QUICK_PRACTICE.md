# Tạo đề luyện ngay tại tài liệu

Được chủ dự án duyệt ngày 30/10/2026.

## Hành vi

- Nút **Tạo đề luyện** nằm cùng hàng với **Thư viện** và **Gửi tài liệu khác**, mở hộp chọn 5–50 câu, mặc định 25.
- Được gửi yêu cầu ngay khi tài liệu đang nhận diện. Máy chủ lưu một bộ đề riêng thuộc tài khoản yêu cầu; đóng trang không hủy yêu cầu.
- Tác vụ chờ mọi trang đã chọn nhận diện xong rồi tự chuẩn bị nguồn, không chờ lời giải/kiểm định của đề gốc. Dùng dữ liệu nhận diện, không dùng trạng thái hiển thị đã gộp với tiến trình đề gốc để quyết định.
- Tiến trình riêng nằm dưới trạng thái đề gốc. Khi đủ câu đã kiểm định thì có **Vào làm đề luyện**. Lỗi có **Thử lại phần chưa xong**.
- Mỗi yêu cầu có mã chống gửi trùng. Thử lại dùng execution mới, giữ các phần đã thành công và chặn tác vụ cũ ghi đè.

## Tạo và kiểm định

Đây là lối tắt có tác vụ riêng; dùng lại phần biên soạn/kiểm định bộ ôn tập hiện có để không cần giải trước đề nguồn. Hiện phần dùng chung tạo câu trắc nghiệm độc lập theo nội dung đọc rõ; không phải sao chép nguyên bố cục hoặc bảo đảm tỷ lệ tự luận/trắc nghiệm của đề gốc. Không dùng hình nguồn chưa đủ dữ kiện để bịa hình cho đề mới.

Nếu nguồn có câu hỏi đọc rõ nhưng trang có ghi chú về đáp án đã điền/đánh dấu, dùng các câu hỏi đủ dữ kiện làm nguồn. Dấu chọn và lời giải có sẵn không được coi là đáp án chuẩn. Chỉ bỏ qua các ghi chú chú thích nguồn đã định nghĩa cụ thể; cảnh báo thiếu dữ kiện, chữ mờ hoặc cờ cần kiểm tra không rõ nguyên nhân vẫn được giữ nguyên trong tài liệu gốc và không được dùng để suy đoán câu mới.

Các câu mới giữ mức độ nguồn, không tự buộc câu cuối nâng cao khi người dùng chỉ chọn số lượng. Đề mới vẫn qua kiểm tra cấu trúc, giải độc lập và kiểm định nhất quán trước khi sẵn sàng. Luồng gốc, bài làm và điểm đã lưu không bị thay đổi.

## Mã và phục hồi

- `src/components/quick-practice.tsx`: hộp chọn số câu, theo dõi và thử lại.
- `src/components/documents.tsx`: vị trí nút và tiến trình.
- `src/server/quick-practice.ts`: yêu cầu riêng, quyền truy cập, chống trùng, trạng thái nguồn và phục hồi.
- `src/workflows/quick-practice.ts`: tác vụ bền vững, kiểm tra nguồn sau mỗi 15 giây, tối đa khoảng hai giờ chờ; khi quá hạn hiển thị lỗi có thể thử lại.
- `src/server/revision.ts`: tạo nguồn cho bộ đề riêng; đường ôn tập cũ giữ nguyên tiêu chí.
- `src/server/generation.ts`: dùng pipeline biên soạn và kiểm định hiện có.
- API: `GET/POST /api/documents/:sourceId/quick-practice`; `POST /api/documents/:sourceId/quick-practice/:id/retry`.

API danh sách chỉ trả trạng thái của các bộ thuộc tài khoản hiện tại, không trả đáp án hoặc execution nội bộ. Nguồn không đọc đủ hoặc chưa đủ rõ phải xử lý lại nhận diện rồi thử lại đề luyện. Tác vụ nền cần máy chủ và Workflow hoạt động.

## Kiểm chứng

`src/server/quick-practice.test.ts` kiểm chờ đủ trang, khởi tạo trong khi đề gốc đang giải, lưu riêng bộ luyện, gửi trùng, phân quyền, lỗi hàng chờ, retry/execution cũ, lựa chọn số câu, không lộ đáp án, tạo đủ bộ và giữ phần thành công khi thử lại. Có hồi quy cho nguồn có đáp án đánh dấu nhưng câu đọc rõ, đồng thời không dùng phần thực sự thiếu dữ kiện.

Khi không nhận được cập nhật trong 10 phút, giao diện cho phép thử lại bằng execution mới. Trong lúc chờ nguồn, tác vụ ghi heartbeat thưa để phân biệt chờ bình thường với tiến trình bị mất.

Xác minh local ngày 30/10/2026: tạo thật một đề 5 câu từ tài liệu đang mở, đã qua biên soạn/giải độc lập/kiểm định nhất quán và đạt trạng thái ready. Kiểm tra production build bằng Webpack đạt; Turbopack bị giới hạn mở cổng nội bộ trong môi trường kiểm tra. Log tại `.test-data/quick-practice-check/`. Chưa triển khai Vercel.
