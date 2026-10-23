# Điều tra độ trễ Vui học — 22/10/2026

Chỉ điều tra, chưa áp dụng tối ưu hiệu năng. Đo bằng GET API, `SELECT 1` và giao dịch chỉ đọc; không gửi đáp án vào bài thật, không gọi AI hoặc deploy. Các thay đổi code trong lượt này chỉ liên quan quyền chia sẻ bài làm và hiển thị quản lý tài liệu.

## Kết quả đo

Mẫu nhỏ trên cùng máy, mạng tại thời điểm kiểm tra; không phải benchmark tải hoặc cam kết độ trễ. Local là **Next dev cổng 3001** với Neon thật; bản Vercel là deployment đang có trước thay đổi quyền. Phiên mới trên deployment cũ chưa xem được lịch sử cá nhân, nên không so sánh payload hai môi trường như cùng dữ liệu.

| Phép đo                                                | Thời gian                        |
| ------------------------------------------------------ | -------------------------------- |
| Local: đọc một tài liệu, 4 lần                         | 78–82 ms                         |
| Local: mở thông tin bài học, 4 lần                     | 257–312 ms                       |
| Local: lịch sử, 4 lần                                  | 986–1.070 ms                     |
| Local: đọc bài làm có sẵn, 3 lần                       | 137–165 ms                       |
| Vercel: đọc tài liệu, lần đầu trong lượt đo / lần tiếp | 4.830 / 715 ms                   |
| Vercel: thông tin bài học, 2 lần                       | 1.163–1.181 ms                   |
| Vercel: lịch sử, 2 lần                                 | 2.931–3.028 ms                   |
| Neon: kết nối mới + SELECT 1                           | 759 ms                           |
| Neon: SELECT 1 khi kết nối còn mở, 3 lần               | 63–67 ms                         |
| Neon: sau 1,5 giây không dùng                          | 722 ms, xác nhận tạo kết nối mới |
| Neon: 9 lượt trao đổi nối tiếp trong giao dịch chỉ đọc | 573 ms                           |

Lịch sử Vercel trả 11 byte (`runs` rỗng) nhưng vẫn mất gần 3 giây. Payload tài liệu khoảng 40,5 KB. Vì vậy kích thước phản hồi không giải thích được phần lớn độ trễ quan sát được.

## Các nguyên nhân có bằng chứng

1. **Khoảng cách vùng máy chủ và database.** Header API trả `hkg1::iad1::…`: request đi qua Hong Kong và function thực thi tại Washington, D.C. DATABASE_URL local do người dùng lấy từ cấu hình project có hậu tố `ap-southeast-1.aws.neon.tech` (Singapore). Nếu deployment dùng đúng database này, mỗi query phải đi Mỹ ↔ Singapore. Chưa đọc trực tiếp biến bí mật của deployment để xác minh URL giống tuyệt đối; không thay đổi region. [Ý nghĩa x-vercel-id](https://vercel.com/docs/headers/request-headers#x-vercel-id), [bảng vùng và khuyến nghị đặt function gần database](https://vercel.com/docs/regions).

2. **Đóng kết nối database quá sớm.** `src/server/database.ts` đặt `idleTimeoutMillis: 1000`. Đo với đúng cấu hình pool xác nhận sau 1,5 giây phải tạo lại kết nối, tăng từ khoảng 63 ms lên 722 ms. Khoảng nghỉ khi người học đọc câu hỏi thường dài hơn 1 giây.

3. **Nhiều lượt database cho một thao tác đơn giản.** `changeRun` trong `src/server/learning-runs.ts` đọc tài liệu + bài làm trước khóa, rồi trong transaction đọc lại, cập nhật toàn bộ JSON bài làm, commit. Đường bình thường có 9 lượt SQL/điều khiển transaction: 2 SELECT, BEGIN, SET LOCAL, advisory lock, 2 SELECT, INSERT/UPDATE, COMMIT. Con số 573 ms ở bảng là phép mô phỏng số lượt bằng lệnh chỉ đọc trên kết nối sẵn, **không phải đo POST trả lời bài thật**. Chưa tính thời gian kết nối, chờ khóa hoặc truyền JSON thật.

4. **Giao diện chờ phản hồi server trước khi cập nhật.** `src/components/learning.tsx`: chuyển câu (`navigate`) và trả lời/gợi ý đều gọi `act`, bật `busy`, đợi POST hoàn tất mới cập nhật UI. Mở bài chờ cả GET bài làm và GET tài liệu; khi có gợi ý chưa đóng còn cần thêm POST. Những thao tác này không gọi AI; đáp án được chấm bằng logic đã có.

5. **Lịch sử đọc dư dữ liệu và truy vấn theo từng tài liệu.** Route `/api/documents/history` đọc tất cả tài liệu rồi gọi `listRuns` cho từng tài liệu; mỗi `listRuns` lại đọc tài liệu và lấy toàn bộ JSON các bài làm. Với 4 tài liệu là 1 + 2×4 = 9 query; pool chỉ tối đa 3 kết nối. Việc trả lịch sử rỗng vẫn phải làm vòng truy vấn này trên bản deploy cũ.

Yếu tố phụ chưa tách riêng thời gian: thư viện polling mỗi 5 giây; trang nhận diện và tạo bài polling 2,5/3 giây; khởi tạo schema khi instance mới và biên dịch lần đầu của dev. Chưa có dữ liệu để quy toàn bộ 4,83 giây lần đầu cho cold start hoặc kết luận CPU/render là nút thắt chính.

## Hướng sửa đề xuất, chưa thực hiện

- Ưu tiên xác nhận database của deployment rồi đặt function cùng vùng Singapore.
- Điều chỉnh thời gian giữ kết nối theo vòng đời local/serverless thay vì đóng sau 1 giây.
- Rút gọn query trong thao tác bài làm nhưng vẫn giữ giao dịch, khóa và tính đúng điểm lần đầu.
- Gom truy vấn lịch sử, chỉ lấy dữ liệu cần hiển thị; giới hạn/pagination khi dữ liệu tăng.
- Tách việc chuyển câu trên giao diện khỏi việc phải chờ ghi database; thiết kế cơ chế lưu và xử lý lỗi trước khi áp dụng.

Chỉ thực hiện khi người dùng yêu cầu tiếp. Không có thay đổi hiệu năng nào được áp dụng trong lượt điều tra này.
