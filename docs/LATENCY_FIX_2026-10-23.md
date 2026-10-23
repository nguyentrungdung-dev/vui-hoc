# Tối ưu độ trễ — 23/10/2026

Đã sửa code và chạy Next dev tại `http://127.0.0.1:3001`. Không build production, commit, push, deploy hoặc đổi cấu hình Vercel. Báo cáo trước sửa: [LATENCY_AUDIT_2026-10-22.md](LATENCY_AUDIT_2026-10-22.md).

## Thay đổi

- Pool PostgreSQL giữ kết nối rảnh 30 giây thay vì 1 giây, tối đa vẫn 3 kết nối.
- Đọc bài làm dùng JOIN để lấy bài và metadata quyền xem trong cùng một query. Dùng lại cùng hàm kiểm tra quyền như thư viện; tài liệu chưa tải đủ vẫn chỉ người tải được xem.
- Lưu thao tác bỏ lần đọc trước khóa; kiểm tra quyền và đọc trạng thái mới nhất vẫn nằm bên trong khóa. Gộp BEGIN và SET LOCAL vào một lượt gửi. Đường lưu bình thường giảm từ 9 xuống 5 lượt trao đổi database, chưa tính khởi tạo schema/kết nối.
- Mở bài học và tiếp tục bài làm tận dụng tài liệu đã kiểm tra quyền trong cùng request, không tải lại toàn bộ tài liệu.
- Lịch sử dùng một JOIN thay vì một query thư viện rồi hai query cho từng tài liệu. Chỉ lấy metadata quyền xem của tài liệu, không truyền bộ bài và văn bản tài liệu. JSON bài làm vẫn được đọc đầy đủ để tính kết quả bằng hàm hiện có; chưa thêm phân trang.

Không đổi `applyRunAction`, `learningResult`, quy tắc điểm lần đầu, thời gian gợi ý hoặc khóa chống ghi đè. Vẫn COMMIT xong mới trả thành công. Giao diện giữ việc chờ xác nhận lưu; không thêm optimistic update hoặc cache có nguy cơ hiển thị điểm cũ. Polling và bước AI giữ nguyên vì chưa có phép đo xác định chúng là nút thắt chính.

## Đo lại trên dev với Neon thật

GET chỉ đọc, cùng 4 tài liệu và 65 câu đã nhận diện. Payload so với lần đo trước giữ cùng kích thước. Mỗi dòng API là 3 mẫu sau khi server sẵn sàng; không phải cam kết tốc độ production.

| Thao tác                                             | Trước               | Sau                     |
| ---------------------------------------------------- | ------------------- | ----------------------- |
| Thông tin bài học                                    | 257–312 ms          | 143–149 ms              |
| Lịch sử                                              | 986–1.070 ms        | 79–87 ms                |
| Đọc bài làm                                          | 137–165 ms          | 75–81 ms                |
| Đọc tài liệu                                         | 78–82 ms            | 76–85 ms                |
| SELECT 1 sau 1,5 giây rảnh, pool riêng cùng cấu hình | 722 ms; kết nối mới | 63 ms; dùng lại kết nối |

Request thư viện đầu tiên sau khởi động dev mất 15.278 ms, bao gồm khởi động/biên dịch route và kết nối ban đầu; chưa tách thời gian từng phần. Tối ưu này không loại bỏ biên dịch lần đầu của dev hoặc cold start. Không đo POST đáp án trên dữ liệu thật để tránh thay đổi bài của người dùng. Không đo lại deployment vì chưa đưa code lên đó.

## Kiểm tra tính đúng

- `npm run typecheck`: đạt.
- `npm test` với PostgreSQL tạm riêng trên máy: 32/32 đạt, không bỏ qua test nào.
- Bốn lần tạo/tiếp tục bài đồng thời trả cùng một bài.
- Bốn request lặp cùng event và bốn đáp án có event riêng chạy đồng thời: event trùng chỉ tính một lần, không mất các lần trả lời riêng.
- Sai trước, đúng sau, kết thúc rồi đóng/mở lại kết nối: điểm lần đầu vẫn 0; số lần thử và trạng thái hoàn thành được lưu đúng.
- Thao tác nhắm câu cũ bị từ chối và rollback, dữ liệu bài giữ nguyên.
- JOIN đọc bài và lịch sử vẫn chặn người xem khác với tài liệu tải dở hoặc không có tệp; chủ tài liệu vẫn xem được. Lịch sử trả cùng kết quả với hàm chấm hiện có.

## Người dùng tự đổi vùng Vercel

1. Mở project `vui-hoc` trên Vercel.
2. Vào **Settings → Functions → Function Regions**.
3. Chọn **Singapore (`sin1`)**, bỏ **Washington, D.C. (`iad1`)** nếu đang chọn, rồi Save.
4. Khi sẵn sàng, tự commit/push code và tạo deployment mới để áp dụng cả code lẫn vùng mới. Redeploy commit cũ chỉ đổi cấu hình, không chứa code local chưa push.

Không cần đổi API key hoặc DATABASE_URL để đổi vùng function. `vercel.json` hiện không ghi đè vùng. API trước đó báo thực thi ở `iad1`; DATABASE_URL local cấu hình Neon Singapore. Chưa đọc trực tiếp URL bí mật của deployment: kiểm tra Neon đang liên kết project cũng ở Singapore. Sau deploy, xác nhận vùng thực thi API trong Vercel Runtime Logs.

Tham khảo: [cấu hình vùng Functions](https://vercel.com/docs/functions/configuring-functions/region), [danh sách vùng Vercel](https://vercel.com/docs/regions).
