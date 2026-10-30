# Tài khoản, huy chương và xếp hạng

Cập nhật 29/10/2026 theo phê duyệt của chủ dự án.

## Tài khoản

Vị trí avatar/nickname ở góc điều hướng mở hồ sơ. Khách chưa đăng nhập được vào trang chủ, chọn môn, xem trước luyện tập, thư viện, bộ huy chương và các không gian phần thưởng. Chỉ khi bắt đầu làm bài, tạo tài liệu, lưu tiến độ hoặc xem xếp hạng mới hiện pop-up yêu cầu đăng nhập. Nút đăng nhập mở cửa sổ cho chọn đăng nhập/đăng ký; đăng nhập thành công trở về khu vực vừa yêu cầu. API dữ liệu học cá nhân và thành tích vẫn trả 401 cho khách. Đăng ký thành công vào thẳng hệ thống, chưa có xác thực tài khoản hoặc khôi phục mật khẩu.

Bắt buộc: tên đăng nhập, mật khẩu ít nhất 8 ký tự, nhập lại mật khẩu trên form, họ tên, nickname, khối 1–5. Tên trường và thành phố ghi rõ không bắt buộc, có thể bổ sung trong hồ sơ. Họ tên, nickname, trường, thành phố, avatar và mục tiêu học có thể cập nhật. Khối giữ theo đăng ký để tránh chuyển bảng thi đua tùy ý.

Lỗi biểu mẫu, thông tin thiếu, thông tin sai, tên đăng nhập trùng và lỗi kết nối hiện pop-up hồng pastel. Thành công hiện pop-up xanh lá pastel. Mật khẩu lưu bằng scrypt với salt riêng; phiên ngẫu nhiên lưu hash phía máy chủ, cookie HttpOnly/SameSite, hết hạn sau 30 ngày và bị thu hồi khi đăng xuất. Sau 10 lần đăng nhập sai, tên đăng nhập bị giới hạn 15 phút.

Tài khoản và thành tích lưu cùng kho PostgreSQL hiện có; bảng `vuihoc_account_records` được tạo khi khởi tạo schema. Chế độ phát triển không có DATABASE_URL dùng file riêng dưới VUIHOC_DATA_DIR. Không thêm dịch vụ xác thực bên ngoài.

## Quyền dữ liệu

Tài liệu học đã tải đủ vẫn dùng chung giữa các tài khoản. Bài làm, lịch sử, điểm, sao, đồ trang trí và huy chương thuộc tài khoản. Nháp demo trong localStorage dùng khóa theo account ID. Lượt làm cũ không có chủ tài khoản hoặc mang owner cookie cũ không được tự động cấp cho học sinh mới; giữ nguyên trong kho và không cộng điểm hồi tố.

## Điều hướng và huy chương

Thay mục Khám phá bằng Thành tích với Xếp hạng (`/thanh-tich/xep-hang`) và Huy chương (`/thanh-tich/huy-chuong`). `/thanh-tich` cũng mở bộ huy chương.

Bộ 20 huy chương có hình vẽ vector riêng, tên, lý do, tiến trình, trạng thái và ngày đạt. Phân nhóm, hiển thị mốc gần nhất, xem chi tiết và xem lại ăn mừng. Huy chương trao tự động. Thông báo khi đạt trên các trang học, nút xem đưa về bảng vàng; ăn mừng gom các huy chương chưa xem trong một hộp thoại, lưu trạng thái phía máy chủ. Tôn trọng reduced motion.

| STT | Tên huy chương         | Điều kiện                                                          |
| --- | ---------------------- | ------------------------------------------------------------------ |
| 1   | Ngôi sao đầu tiên      | Giải đúng câu hỏi đầu tiên.                                        |
| 2   | Bước chân khám phá     | Hoàn thành buổi học đầu tiên.                                      |
| 3   | Em tự làm được         | Tự giải đúng 5 câu khác nhau, không mở hint hay lời giải.          |
| 4   | Túi sao nhỏ            | Giải đúng 20 câu hỏi khác nhau.                                    |
| 5   | Không bỏ cuộc          | Tự sửa đúng câu đầu tiên từng làm sai, không mở hint hay lời giải. |
| 6   | Thợ sửa lỗi tí hon     | Tự sửa đúng 5 câu từng làm sai, không mở hint hay lời giải.        |
| 7   | Biến sai thành hay     | Tự sửa đúng 20 câu từng làm sai, không mở hint hay lời giải.       |
| 8   | Đôi cánh tự tin        | Tự giải đúng 50 câu khác nhau, không mở hint hay lời giải.         |
| 9   | Hẹn nhau học nhé       | Có kết quả học mới trong 3 ngày khác nhau.                         |
| 10  | Ngọn lửa nhỏ           | Có kết quả học mới 3 ngày liên tiếp.                               |
| 11  | Một tuần rực rỡ        | Có kết quả học mới 7 ngày liên tiếp.                               |
| 12  | Ngọn hải đăng          | Có kết quả học mới 30 ngày liên tiếp.                              |
| 13  | Nhà thám hiểm nhỏ      | Tự giải đúng câu hỏi thuộc 3 chủ đề khác nhau.                     |
| 14  | Đôi mắt tò mò          | Tự giải đúng câu hỏi ở 2 môn học khác nhau.                        |
| 15  | Chuyến tàu tri thức    | Hoàn thành 5 buổi học có bộ câu hỏi khác nhau.                     |
| 16  | Thuyền trưởng tri thức | Hoàn thành 25 buổi học có bộ câu hỏi khác nhau.                    |
| 17  | Dũng sĩ quả cảm        | Tự giải đúng 5 bài khó khác nhau, không mở hint hay lời giải.      |
| 18  | Nhà leo núi            | Tự giải đúng 15 bài khó khác nhau, không mở hint hay lời giải.     |
| 19  | Hiệp sĩ rồng vàng      | Tự giải đúng 50 bài khó khác nhau, không mở hint hay lời giải.     |
| 20  | Huyền thoại ngân hà    | Giải đúng 500 câu hỏi khác nhau.                                   |

Mỗi câu khác nhau được nhận diện theo môn, nội dung, đoạn đọc và lựa chọn đáp án, không theo ID lượt làm. Câu đã mở hint hoặc lời giải không thể trở lại thành tự giải bằng cách tạo lượt mới. Không tính câu chưa được chấm/xác nhận. “Học mỗi ngày” yêu cầu có câu đúng mới, kết quả cải thiện hoặc hoàn thành bộ câu hỏi mới; đăng nhập đơn thuần không kéo dài chuỗi.

## Bảng thi đua

Tự chọn khối từ tài khoản; lọc tất cả môn hoặc từng môn, tuần hiện tại hoặc toàn thời gian. Tuần bắt đầu thứ Hai theo Asia/Ho_Chi_Minh. Hai bé bằng điểm cùng hạng. Hiển thị tối đa 50 bạn, đánh dấu bé và hiển thị riêng vị trí nếu ngoài top 50. Có bục top 3 và trạng thái chưa có điểm. Chỉ công khai nickname, avatar, điểm, số huy chương; không công khai họ tên, trường, thành phố hoặc tên đăng nhập.

| Kết quả câu hỏi                 | Thường | Khó |
| ------------------------------- | ------ | --- |
| Tự giải đúng lần đầu            | 10     | 20  |
| Tự sửa đúng sau khi sai         | 5      | 10  |
| Đã dùng hint                    | 3      | 6   |
| Đã mở lời giải / chưa chấm được | 0      | 0   |

Làm lại chỉ cộng phần cải thiện so với điểm cao nhất đã ghi nhận của câu đó; không cộng lặp, không điểm tốc độ, không thưởng điểm xếp hạng riêng cho huy chương. Huy chương không cấp thêm sao tiêu dùng. TIMO chưa tham gia bảng này và không phát sinh 20 huy chương mới; vẫn dùng các tính năng học/phần thưởng hiện có.

## Kiểm tra

`npm test`, `npm run typecheck`, `npm run build`. Kiểm thử tài khoản/phiên, điều kiện huy chương, chống cộng lặp, khóa độc lập sau hint, khối/môn/tuần và dữ liệu công khai nằm ở `src/server/accounts-achievements.test.ts`; các kiểm thử bài làm hiện có cập nhật theo quyền tài khoản. Kiểm thử cloud chỉ chạy khi được cấp cấu hình thử nghiệm, không dùng dữ liệu production để kiểm tra.

## Ngôn ngữ hình ảnh và tham quan

Bộ biểu tượng Hạt Sao do Vui học tự vẽ trong `src/components/icons.tsx`: 40 biểu tượng chức năng, 20 minh họa huy chương và cảnh chào mừng. Màu xanh tím, kem, đào và nét bo mềm. Toàn bộ thành phần giao diện dùng bộ vector nội bộ; không render emoji hệ thống hoặc import icon từ thư viện lucide. Các mã icon trong dữ liệu cũ chỉ là khóa tương thích, được chuyển thành hình vẽ riêng khi hiển thị.

`GuestExplore` cho xem trước các khu chức năng, ghi rõ nội dung minh họa, không tạo bài làm/tài liệu và không lấy lịch sử hay xếp hạng cá nhân. Xếp hạng yêu cầu tài khoản ngay khi bấm trong menu hoặc mở đường dẫn trực tiếp. Cửa sổ yêu cầu đăng nhập có lựa chọn tiếp tục tham quan. Nhân vật trên trang chủ có thể chọn thử mà không lưu vào tài khoản.
