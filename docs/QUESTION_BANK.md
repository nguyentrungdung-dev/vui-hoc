# Kho câu hỏi đã kiểm định

Được chủ dự án duyệt ngày 30/10/2026. Kho phục vụ bài luyện, Ôn bài/Ôn tổng hợp, Tạo đề luyện tại tài liệu và Tạo thêm 5 câu theo độ khó. Không dùng kho để thay đổi đề gốc hay điểm đã lưu.

## Luồng sử dụng

1. Tính hồ sơ yêu cầu bằng mã, không gọi AI để tìm kiếm hay phân loại lại mỗi lần.
2. Tìm đúng hồ sơ/phiên bản và loại các câu học sinh đã được giao, các câu nguồn/câu trong bộ đang tạo, cùng câu bị cách ly.
3. Nếu kho có đủ, cấp câu trực tiếp và chạy lại các kiểm tra xác định bằng mã; không gọi AI soạn hoặc kiểm định lại.
4. Nếu thiếu, giữ chỗ bổ sung theo hồ sơ, kiểm tra kho lần nữa sau khi nhận chỗ rồi chỉ yêu cầu AI tạo phần còn thiếu.
5. Chỉ lưu câu mới sau khi toàn bộ bước giải độc lập, kiểm định cấu trúc, đáp án, gợi ý và tính nhất quán đã đạt. Giữ nguyên những cổng kiểm định riêng của Tạo thêm 5 câu.

Ví dụ: cần 5 câu, kho có 3 câu chưa giao → AI chỉ nhận danh sách 2 câu cần tạo. Học sinh khác cùng yêu cầu có thể lấy đủ 5 câu mà không gọi AI. Một học sinh đã được giao hết các câu phù hợp sẽ cần câu mới; không lặp bài để giả tiết kiệm token.

## Hồ sơ và giới hạn đối chiếu

Hồ sơ gồm phiên bản chính sách, môn, phạm vi lớp 2 đang được pipeline hỗ trợ, chế độ/ngôn ngữ, luồng tạo, dạng/cấu trúc trả lời, số ô/phương án, ngữ cảnh nguồn và yêu cầu độ khó.

- Chỉ tổng quát hóa tự động các phép cộng/trừ hai toán hạng đọc rõ bằng chữ số, với cùng loại bài, toán tử, số chữ số, số lần nhớ/mượn, phạm vi kết quả và cấu trúc. Tìm x, đặt tính, tính biểu thức và toán lời văn không tự gộp làm một.
- Các dạng chưa có bộ nhận diện chắc chắn dùng fingerprint ngữ cảnh nguồn, không đoán tương đương chỉ từ tên môn/chủ đề. Đây là lựa chọn thận trọng: có thể bỏ lỡ cơ hội dùng lại, nhưng không đánh đổi bằng sai dạng.
- Độ khó của bộ 5 câu dựa trên contract so với nguồn. Bộ tăng dần còn gắn với chuỗi câu đã cấp trước đó; không dùng nhãn “khó hơn” đơn lẻ làm khóa.
- Nguồn có hình được ràng buộc thêm theo tài liệu nguồn. Câu tái sử dụng phải tự đủ dữ kiện; không sao chép ảnh phụ thuộc tài liệu khác.
- Đối với đề ôn tập, giữ danh sách phân bổ chủ đề/nguồn và vị trí nâng cao hiện có. Kho chỉ thay cách cung cấp câu cho từng vị trí, không lấy ngẫu nhiên toàn bộ câu cùng môn.

Phiên bản tổng hợp tại `BANK_POLICY` trong `src/server/question-bank-profile.ts`. Khi thay đổi tiêu chí kiểm định, phân loại, lớp hoặc hợp đồng độ khó, phải tăng phiên bản tương ứng. Câu đã duyệt theo phiên bản cũ không được tự trở thành câu hợp lệ ở phiên bản mới.

## Lưu trữ và truy vấn

PostgreSQL dùng năm bảng, khởi tạo qua `ensureDatabase`:

| Bảng | Khóa/chỉ mục chính | Vai trò |
| --- | --- | --- |
| `vuihoc_question_bank` | `content_key` | Một bản nội dung kèm đáp án, hướng dẫn và audit; trạng thái active/quarantined |
| `vuihoc_question_bank_profiles` | `(profile_key, content_key)` | Tra đúng nhóm hồ sơ mà không quét toàn kho |
| `vuihoc_question_bank_seen` | `(owner, content_key)` | Loại câu đã giao bằng anti-join có chỉ mục |
| `vuihoc_question_bank_allocations` | `(owner, slot_key)` | Giữ câu đã cấp cho một vị trí khi tác vụ bị thử lại |
| `vuihoc_question_bank_fills` | `profile_key` | Giữ chỗ bổ sung câu trong thời gian ngắn |

`BANK_TAKE_SQL` gộp tìm, ghi lịch sử giao và gắn vị trí trong một câu SQL. Chọn theo chỉ mục; không dùng `ORDER BY random()`, đọc cả kho hoặc tìm bằng AI. Truy vấn giới hạn một câu cho một vị trí; không vận chuyển toàn bộ câu hỏi về ứng dụng để lọc.

Development không có database dùng file dưới `VUIHOC_DATA_DIR/question-bank/`, phân thư mục trực tiếp theo hash hồ sơ và học sinh. Không dùng một file Markdown/JSON lớn cho cả kho.

## Đồng thời, bảo mật và bài làm

- Cấp câu được tuần tự hóa theo học sinh; slot và content hash giúp retry không sinh câu khác hoặc giao trùng ở vị trí khác.
- Lease bổ sung hết hạn sau 5 phút, nhận theo thứ tự khóa để tránh deadlock. Không giữ transaction hoặc kết nối database mở trong lúc gọi AI. Người chờ kiểm tra lại kho sau khi nhận lease; nếu mất tác vụ, lease sẽ hết hạn. Bộ 5 câu giữ chung ngân sách 240 giây cho chờ lease và soạn/kiểm định, không cộng thêm một ngân sách AI riêng sau khi chờ.
- Kho lưu nội dung giáo dục và audit kiểm định; bỏ ID/tên tài liệu nguồn, ID lượt làm và bài làm học sinh khỏi payload dùng chung. Ngữ cảnh nguồn không tổng quát hóa được chỉ đối chiếu bằng fingerprint; không tìm kiếm mở bằng văn bản gần giống.
- Mỗi lần giao vẫn dùng ID câu, sourceIds/sourcePages và lượt làm hiện tại. Không mang theo trạng thái hint, lời giải đã mở hay điểm của người khác.
- Dấu `bank` và hồ sơ duyệt là nội bộ, bị loại khỏi `runView`. Đáp án/rubric tiếp tục được bảo vệ như trước. Kho không có API đọc công khai.
- Lịch sử đã giao tách riêng theo tài khoản. Khi một học sinh mở bộ đã được người khác tạo, ghi nhận những câu đó cho đúng học sinh. Đã nhận bài nhưng chưa làm cũng được tính là đã gặp; đây là cách tránh lặp thận trọng.
- Cơ chế điểm/huy chương vẫn nhận diện nội dung thay vì ID mới, không cộng thưởng lặp chỉ vì lấy từ kho.

## Báo lỗi và cách ly

Nút **Báo lỗi câu hỏi** ở các lượt làm bài được sinh ra gửi `POST /api/documents/:documentId/runs/:runId/report` với `questionId` và lý do. Máy chủ xác thực quyền sở hữu lượt làm, lấy mã kho từ bản lưu nội bộ, rồi cách ly câu. Người gửi không được tùy ý truyền mã kho.

Câu bị cách ly không được cấp tiếp, kể cả slot retry đã trỏ tới câu đó. Ghi lại phản hồi để kiểm tra; không tự khôi phục bằng một lần insert trùng nội dung. Các lượt làm và điểm đã lưu không bị sửa hồi tố. Khi mở một lượt làm mới từ bộ đề cũ, hệ thống cũng chặn câu đã bị cách ly hoặc hết hiệu lực; không âm thầm giảm số câu trong đề. Với câu cũ chưa có mã kho, lưu phản hồi để đối chiếu; không giả vờ đã kiểm định lại.

Kho tích lũy từ các câu được kiểm định bởi pipeline sau thay đổi này. Không tự nhập hàng loạt bài cũ thiếu audit hoặc suy ra mọi câu cũ đều đúng chỉ từ trạng thái ready.

## Kiểm chứng

- `src/server/question-bank.test.ts`: phân biệt dạng/mức/ngôn ngữ, không nhập câu chưa duyệt, chống trùng, lịch sử học sinh, retry, cách ly, policy cũ, cạnh tranh lease, 3 câu có sẵn + 2 câu mới, 5 cache hit không cần khóa AI, gắn lại nguồn, bộ 5 câu và bảo vệ đáp án, báo lỗi có phân quyền.
- Các kiểm thử generation/similar hiện có vẫn chạy, gồm chấm tự luận đồng thời với tác vụ nền và không ghi đè bài làm.
- `.test-data/question-bank-check/` giữ log kiểm thử và phép đo PostgreSQL; dữ liệu tổng hợp dùng để kiểm tra SQL được rollback. Không dùng kết quả đó làm cam kết độ trễ cho mọi môi trường hoặc mọi kích thước kho.

Xác minh PostgreSQL ngày 30/10/2026: với 2.000 bản ghi tổng hợp không liên quan, kế hoạch truy vấn chọn đúng một hồ sơ qua chỉ mục và tra nội dung bằng khóa chính; không quét toàn bảng nội dung. SQL ghi nhận 0,268 ms, một lần lấy câu qua ứng dụng gồm mạng ghi nhận 124 ms. Đây là kết quả của phép thử cụ thể, không phải SLA. Tất cả dữ liệu tổng hợp đã rollback; các bảng/chỉ mục phục vụ chức năng được giữ lại. Không gọi AI trong phép thử database.
