# Ràng buộc nhận diện, biên soạn và hiển thị câu hỏi

Chủ dự án yêu cầu ngày 30/10/2026. Phiên bản: `worksheet-context-2026-10-30.2`.

Đọc tài liệu này trước khi sửa pipeline nhận diện, sinh bài gốc, Ôn bài, Ôn tổng hợp, Tạo thêm 5 câu hoặc giao diện làm bài. Quy chuẩn chuyên biệt của Tạo thêm 5 câu vẫn nằm ở `docs/SIMILAR_PRACTICE_POLICY.md` và `src/server/similar-policy.ts`.

## Yêu cầu đề phải đi cùng câu

- Mỗi câu tách ra phải có nguyên văn yêu cầu chung: ví dụ **Chọn dạng đúng của động từ** rồi mới đến **They (is / are) my classmates.** Tên chủ đề không thay thế yêu cầu đề.
- Sao chép đúng ngôn ngữ, dữ kiện và nội dung nguồn. Không suy luận yêu cầu từ tên chủ đề, đáp án đã giải hoặc kiến thức ngữ pháp.
- Chỉ khôi phục yêu cầu nếu tìm thấy nó trong những trang người dùng thực sự chọn. Trang trước không nằm trong phạm vi đã chọn thì vẫn phải báo thiếu.

## Tiếp trang và tiếp cụm xử lý

- Trang mới hoặc cụm xử lý mới không đồng nghĩa bài mới hay tài liệu kết thúc. Phải đối chiếu toàn bộ trang được chọn trước khi kết luận thiếu đầu đề.
- Chỉ tự nối khi đủ bằng chứng: cùng số bài rõ ràng hoặc đối chiếu chính xác trong vùng đầu bài nguồn, các trang có đủ và liền kề, dãy số câu liên tục, không trùng mã ô trả lời và có yêu cầu gốc được xác nhận. Không nối chỉ vì cùng môn hoặc cùng dạng ngữ pháp.
- Phần tiếp trang có thể bị tách thành nhiều bản ghi một câu, chỉ có nhãn “Câu 4”, “Câu 5”… Khi đó phải đối chiếu chính xác từng câu trong vùng nguồn sau đầu Bài trước và trước đầu Bài kế tiếp, đủ mọi trang đã chọn, rồi nối cả các mảnh cùng trang. Không phụ thuộc việc AI có lặp nhãn số bài hay không.
- Giữ đúng thứ tự, nguyên văn các ý, trang nguồn và ID của từng ô. Không nối mù khi có hình/bảng cần đối chiếu riêng. Nếu còn mơ hồ, giữ nguyên dữ liệu và cảnh báo để kiểm tra.
- Khi đủ bằng chứng nối, loại riêng cảnh báo giả về chính phần ngắt trang đã khôi phục; không xóa cảnh báo chữ mờ, hình thiếu, mâu thuẫn hay dữ kiện thực sự còn thiếu.
- Bài ghép phải được giải và kiểm định lại từ đầy đủ các trang nguồn. Có 10 ô thì phải có tiêu chí kết quả cho đủ 10 ô; không dùng lời giải của 3 ô để chấm cả bài. Không tự đổi câu cũ từ ungraded thành chấm điểm bằng cách ẩn cảnh báo.

## Hiển thị

- Danh sách câu độc lập: mỗi ý là một khối riêng **số thứ tự + nguyên văn câu nguồn → Bài làm của em → ô nhập**, thẳng hàng, đủ khoảng cách. Câu dài được xuống dòng tự nhiên trên điện thoại.
- Không dồn 10 câu vào một đoạn rồi để 10 ô chỉ có nhãn 1, 2, 3 bên dưới. `answerFields.label` của dữ liệu mới cần có đầy đủ câu nguồn, không chứa đáp án.
- Giữ nguyên đoạn văn đọc hiểu/điền từ và thứ tự chỗ trống. Không biến đoạn văn liên tục thành danh sách câu rời.
- Nếu dữ liệu cũ thiếu liên kết câu–ô và không thể ánh xạ chắc chắn, giữ đoạn nguồn để tránh làm mất nội dung. Không đoán ghép ô.

## Thực thi và kiểm hồi quy

- Quy tắc dùng chung trong prompt: `QUESTION_CONTEXT_RULES` tại `src/lib/question-context.ts`, áp dụng cho nhận diện, sinh bài và Tạo thêm 5 câu.
- Chuẩn hóa nguồn qua `reconcileQuestionContext` trong `publicDocument`; ID nguồn chính và ID ô giữ nguyên. Bản dữ liệu gốc không bị sửa tại bước đọc.
- Bố cục và khôi phục yêu cầu có bằng chứng: `questionPresentation`; giữ nguyên giá trị, ID ô và các bài làm đã lưu.
- Kiểm rubric đủ từng ý: `validateTeaching`.
- Bộ học mới ghi `contextPolicy`. Bản cũ có nút **Cập nhật bài tập** cho người có quyền quản lý để nhận diện/kiểm định lại; các lượt làm cũ vẫn được giữ riêng.
- Test tại `src/lib/question-context.test.ts`: Bài 4 bị ngắt giữa trang 2–3; không nối khác bài/trang thiếu/dãy số sai/ID trùng/hình; giữ cảnh báo thật; lặp đúng yêu cầu Bài 7; mỗi câu tương ứng một ô; không phá đoạn văn hoặc số thập phân.
- `scripts/check-question-context.mts --live` kiểm riêng hai dạng nguồn được báo lỗi, chỉ xuất chẩn đoán vào `.test-data`, không ghi vào database production. Kiểm AI có thể thất bại và không thay thế nghiệm thu của giáo viên.

- Hồi quy bổ sung: đúng dữ liệu 42 câu ngày 30/10 (7 mảnh câu 4–10) phải còn 35 câu, Bài 4 đủ 10 ô, giữ ID; thiếu trang/sai câu/đầu bài khác phải từ chối ghép. Lượt làm lưu trước khi sửa phải có đường mở bản đề mới, không âm thầm thay câu hoặc điểm cũ.

## Bổ sung được chủ dự án duyệt ngày 30/10/2026: sửa nhãn và câu có hình

Hai quy tắc này thay thế yêu cầu giữ nguyên tuyệt đối đối với lỗi hình thức có cách sửa xác định. Nguồn nhận diện thô vẫn giữ nguyên; chuẩn hóa trên bản dùng để giải, rồi giải và kiểm định lại, không đổi nhãn sau khi đã gắn đáp án.

1. **Nhãn trắc nghiệm trùng:** được đổi A/B/B/C thành A/B/C/D theo thứ tự; giữ nguyên nội dung và số lựa chọn. Không tự đổi khi nội dung tham chiếu các nhãn. Không đoán/sửa dữ kiện, không tự chọn giữa nhiều đáp án đúng. Khóa React phải duy nhất theo câu và vị trí, không dùng nhãn nguồn làm khóa. Không đưa đáp án hay lý do kiểm định chứa đáp án ra màn hình trước khi làm.
2. **Hình học:** cắt đúng hình nguồn, đủ mọi nét/đỉnh/nhãn/số đo, chừa lề nhỏ; không vẽ lại. Đối chiếu bản cắt với trang nguồn; thử cắt lại trong nền nếu chưa đạt. Khi xác nhận đủ hình, loại riêng cảnh báo ước lượng vị trí đã được giải quyết. Không bác câu chỉ vì hộp cắt từng được ước lượng, hình có đường ghép/chồng hoặc bài cần đếm hình ghép. Bộ giải và kiểm định phải nhận chính ảnh cắt. Vẫn kiểm tra đáp án; chỉ báo lỗi cụ thể thực sự thiếu/mờ/mâu thuẫn, không tự bỏ kiểm định để được chấm.

Ví dụ hồi quy: đổi đơn vị 1 dm sang cm có nhãn A/B/B/C; đếm tứ giác với cạnh trên, cạnh trái, đáy thẳng và ba đoạn từ đỉnh phải phía trên xuống đáy: có 3 tứ giác. Đây là ví dụ kiểm tra, không phải quy tắc mọi hình tương tự đều có 3 tứ giác.

Thực thi: `src/lib/source-repairs.ts`, `src/server/generation.ts`, `src/server/figure-localization.ts`, `src/components/learning.tsx`. Bài cũ cần giải/kiểm định lại trước khi được chấm; không đổi điểm hoặc đáp án đã lưu của học sinh.

## Kho câu đã kiểm định

Các bài được sinh ra phải dùng cơ chế lấy câu phù hợp chưa giao trong kho trước, chỉ sinh phần thiếu. Câu được dùng lại phải đúng hồ sơ, nguồn, cấu trúc, độ khó và phiên bản kiểm định; không dùng nhãn môn/chủ đề để suy đoán. Đọc [QUESTION_BANK.md](QUESTION_BANK.md) khi sửa generation, similar, cơ chế kiểm định hoặc lịch sử giao câu. Khi đổi tiêu chí kiểm định phải tăng phiên bản cache tương ứng. Không đổi đề gốc hoặc chấm lại bài cũ khi cập nhật/cách ly kho.
