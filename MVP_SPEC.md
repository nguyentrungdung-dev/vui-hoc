# Vui học — Đặc tả MVP

> **Trạng thái:** Đã được chủ dự án thống nhất, là tài liệu chuẩn để thiết kế, triển khai và nghiệm thu MVP.
> **Ngày chốt ban đầu:** 21/10/2026. **Cập nhật hiện trạng và quyết định:** 23/10/2026.
> **Giai đoạn:** Đã có tải/nhận diện tài liệu thật, biên soạn và làm bài, Ôn bài/Ôn tổng hợp, lưu Hành trình và hạ tầng cloud. Bài giảng/video thật và thích ứng độ khó còn chờ xây dựng. TIMO mới và Phần thưởng chỉ có giao diện Coming soon. Xem [tiến độ](docs/IMPLEMENTATION_STATUS.md) để phân biệt triển khai, kiểm thử và nghiệm thu; không coi mọi yêu cầu dưới đây là đã hoạt động.

## 1. Mục tiêu và nguyên tắc dự án

Vui học là công cụ tự học dành cho học sinh lớp 2, giúp giảm thời gian phụ huynh phải ngồi giảng bài và hỗ trợ trẻ ôn tập, luyện đề bằng lời giải phù hợp lứa tuổi, bài luyện và video tương tác.

**Mục tiêu quan trọng nhất của MVP:** Tải một tài liệu mới và tạo được buổi học đúng nội dung, với giao diện sát bản demo và học sinh lớp 2 có thể tự sử dụng.

Các luồng đã thống nhất:

1. **Học từ tài liệu:** Tải bài học/bài tập, nhận diện và tạo lời giải/bộ luyện. Phần tạo bài giảng/video từ tài liệu thật còn chờ.
2. **Ôn bài và Ôn tổng hợp:** Chọn tài liệu hoặc đề tài đã nhận diện cùng môn, tạo bộ luyện bám nguồn, làm bài và lưu Hành trình. Đã triển khai; chi tiết ở mục 20.
3. **Luyện thi Toán song ngữ / Luyện đề TIMO mới:** Ngân hàng đề do nhà phát hành cung cấp, phạm vi Mầm non–lớp 5. Hiện chỉ cho chọn khối và mở Coming soon; phần còn chờ ở mục 19.

Tài liệu TIMO đã upload và luồng bài làm cũ được giữ nguyên. Trang Vui học Toán đã bỏ nội dung giới thiệu/nút TIMO; không xóa hoặc ẩn tài liệu TIMO cũ khỏi thư viện.

Nguyên tắc:

- Học sinh lớp 2 là người sử dụng chính; bé hoặc phụ huynh đều có thể tải bài.
- Bé tự chọn chủ đề, không bắt buộc học hết tài liệu.
- Thời lượng một buổi ôn luyện dự kiến khoảng 30–45 phút, không phải thời gian xem video bắt buộc.
- Nội dung phù hợp độ tuổi, lớp và chương trình học; kết hợp phương pháp của giáo viên trong tài liệu nếu nhận diện được.
- Hệ thống tự tạo và giao nội dung; không yêu cầu phụ huynh duyệt trước.
- Không tự đoán nội dung khi đề, ký hiệu hoặc hình minh họa chưa được đọc chắc chắn.
- Điểm /10 của luồng tài liệu và Ôn bài/Ôn tổng hợp tách biệt với mức dùng gợi ý. Ngân hàng TIMO mới có định hướng đếm câu đúng, chưa triển khai chấm bài.
- Bài luyện có thể sẵn sàng trước video; không buộc trẻ chờ video mới được học.

## 2. Phạm vi MVP

| Hạng mục                | Phạm vi đã chốt                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------- |
| Người học               | Luồng tài liệu/ôn tập cho lớp 2; khu TIMO mới chỉ có giao diện chọn Mầm non–lớp 5            |
| Nội dung hoạt động thật | Toán, Tiếng Anh, Tiếng Việt và Tự học đã có luồng tài liệu thật; giữ dữ liệu TIMO cũ         |
| Trang chủ               | Bốn khu tài liệu và thẻ Luyện thi Toán song ngữ trong Horizontal Scroll                      |
| Ba khu vực ngoài Toán   | Đã được chủ dự án yêu cầu mở khóa; dùng chung luồng tài liệu và phân loại theo nội dung      |
| Đầu vào                 | PDF và ảnh chụp                                                                              |
| Dung lượng              | Tối đa 100 MB mỗi lượt tải                                                                   |
| Phạm vi trang           | Chọn toàn bộ tài liệu hoặc một số trang                                                      |
| Bài luyện mới           | Mặc định 25 câu, có thể chỉnh tổng số và chủ đề trước khi tạo                                |
| Đề gốc                  | Giữ số câu và thứ tự trong tài liệu; không ép thành 25 câu                                   |
| Video                   | Chưa triển khai từ tài liệu thật; mục tiêu là slide/kịch bản → API công ty → video tương tác |
| Theo dõi                | Kết quả, số lần thử, lượt dùng gợi ý, mức tự làm và lịch sử                                  |
| Hồ sơ demo              | Hồ sơ bé theo thiết bị; bài học và tiến độ lưu ở hệ thống                                    |

Các nhóm dạng bài thuộc phạm vi kiểm chứng gồm phép tính, tìm số, toán lời văn, hình học, đo lường, thời gian, tiền và suy luận TIMO. Không chủ động loại bỏ cả nhóm dạng chỉ để thu hẹp demo. Từng câu không đọc hoặc xử lý chắc chắn phải được đánh dấu riêng.

Đăng ký/đăng nhập, nhiều hồ sơ bé, chấm ảnh bài viết tay và mở rộng luồng tài liệu thật ngoài lớp 2 chưa thuộc phạm vi demo đã chốt. Bài làm thật và Hành trình đã dùng chung qua máy chủ giữa các thiết bị; hồ sơ bé và nháp mẫu vẫn cục bộ. Giao diện chọn Mầm non–lớp 5 của TIMO mới không đồng nghĩa đã có nội dung AI cho các khối đó. Ảnh đầu vào là đề/tài liệu, không phải chấm bài viết tay.

## 3. Tài liệu tham chiếu và định hướng giao diện

- [Demo Vui học](https://toan-vui-lop-hai-2026.science-for-economic.chatgpt.site/)
- [Cuộc trò chuyện tham chiếu](https://chatgpt.com/g/g-p-6ad83441253c8191ba38263a51fb7079-ha/c/6ad83447-6570-83ec-adea-a06db0506569)

Yêu cầu là tái tạo sát bản demo về bố cục, màu sắc, phong cách hoạt hình, nhân vật đồng hành, slogan và cách tổ chức chức năng; ưu tiên giữ nguyên trải nghiệm hình ảnh khi phù hợp.

Slogan: **“Học tập chưa bao giờ đơn giản và thú vị như vậy”.**

Giao diện ưu tiên điện thoại và máy tính bảng:

- Chữ dễ đọc, nút lớn, hướng dẫn ngắn và rõ.
- Chuyển động vừa đủ; có thể tắt âm thanh.
- Hạn chế điều hướng gây phân tâm khi làm bài.
- Hiển thị rõ tiến độ, nội dung sẵn sàng và lỗi cần xử lý.

## 4. Các màn hình

| Màn hình              | Nội dung và thao tác chính                                                        |
| --------------------- | --------------------------------------------------------------------------------- |
| Trang chủ             | Horizontal Scroll gồm bốn khu tài liệu và TIMO, nhân vật, thống kê                |
| Vui học Toán          | Gửi tài liệu Toán, tài liệu đã gửi; bỏ nút/giới thiệu TIMO, giữ dữ liệu cũ        |
| Tải tài liệu          | Chọn PDF/ảnh, chụp ảnh nếu thiết bị hỗ trợ, xem trước, sắp xếp ảnh, chọn trang    |
| Đang tạo buổi học     | Tiến độ từng phần, chủ đề nhận diện, phần đọc không rõ, mở nội dung đã sẵn sàng   |
| Menu buổi học         | Đã có chủ đề, số câu, tiến độ và làm bài; bài giảng/video thật còn chờ            |
| Xem bài giảng         | Hiện chỉ là slide mẫu; video/phụ đề/điểm dừng từ tài liệu thật còn chờ            |
| Làm bài               | Một câu mỗi màn hình, trả lời, gợi ý, hướng dẫn từng bước, lời giải và luyện tiếp |
| Kết quả và hành trình | Điểm /10, kết quả theo dạng, mức dùng gợi ý, đề xuất luyện thêm và lịch sử        |

Header hiện có **Trang chủ → Luyện tập → Khám phá → Thư viện → Hành trình → Phần thưởng**. Dropdown Luyện tập gồm **Ôn bài, Ôn tổng hợp, Luyện đề TIMO**. Đã bỏ hàng menu phụ và dòng trạng thái ở các trang chính; giữ nhãn dữ liệu mẫu ở khu trải nghiệm. Khám phá dẫn về các thẻ trang chủ. Thư viện trên header mở các tài liệu đã upload. Phần thưởng chỉ hiện Coming soon.

Tên gọi, ảnh đại diện và nhân vật đồng hành được chỉnh trong bảng hồ sơ mở từ trang chủ, không cần màn hình riêng.

## 5. Luồng ôn bài theo tuần

1. Chọn **Ôn bài của em**.
2. Tải PDF hoặc ảnh; xem trước và chọn trang cần học.
3. Hệ thống đọc tài liệu, tách câu hỏi và nhận diện dạng bài.
4. Hiện menu chủ đề; đánh dấu phần chưa đọc chắc chắn.
5. Người dùng chọn chủ đề và số câu; mặc định 25 câu cho toàn bộ bộ luyện mới, phân bổ theo các dạng được chọn.
6. Đã tạo bài luyện, lời giải và gợi ý; slide/kịch bản thật và xử lý video qua API còn chờ.
7. Bé làm bài khi nội dung đã sẵn sàng. Xem bài giảng thật là mục tiêu sau khi triển khai video; hiện chỉ có bài giảng mẫu.
8. Xem kết quả và luyện thêm theo dạng.

Mỗi câu mới phải gắn với dạng bài hoặc ví dụ nguồn trong tài liệu. Câu nâng cao có nhãn riêng, tăng độ khó có chủ đích và vẫn phù hợp kiến thức lớp 2.

Nếu tài liệu thiếu nội dung hoặc phần nhận diện chưa đủ để tạo bộ câu đạt chất lượng, phải báo rõ; không âm thầm thêm kiến thức không liên quan để đủ số lượng.

## 6. Luồng tự tải đề TIMO hiện có

Luồng dưới đây thuộc tính năng tài liệu do người dùng tự tải. Khu **Luyện thi Toán song ngữ / Luyện đề TIMO** mới trên trang chủ và dropdown Luyện tập có phạm vi riêng theo cập nhật ngày 23/10/2026 ở mục 19; không tự áp dụng chức năng tải đề, sinh câu tương tự hoặc chấm /10 của luồng cũ cho khu mới.

1. Mở tài liệu TIMO cũ trong **Thư viện**. Route upload cũ `/timo` vẫn còn trong mã để tương thích, nhưng không còn nút dẫn từ trang Toán; mục Luyện đề TIMO trên header dẫn sang khu Coming soon, không vào luồng upload cũ.
2. Hệ thống hiển thị danh sách câu đã nhận diện.
3. Bé chọn **Làm đề gốc** hoặc **Luyện theo dạng**.
4. Làm bài với gợi ý và hướng dẫn theo luồng chung.
5. Luyện câu tương tự và nâng cao.

Phân biệt hai nội dung:

- **Đề gốc:** Giữ số câu và thứ tự trong file.
- **Bộ luyện mới:** Mặc định 25 câu, được tạo từ các dạng trong đề.

Với đề tiếng Anh, giữ nguyên văn đề và có nút xem bản dịch tiếng Việt. Lời giải song ngữ, ưu tiên tiếng Việt để trẻ theo dõi; không dùng phương pháp vượt tuổi chỉ vì ngắn hơn.

## 7. Luồng một câu hỏi và hỗ trợ học tập

1. Bé đọc đề, chọn đáp án hoặc nhập câu trả lời.
2. Nếu sai, nhận phản hồi nhẹ nhàng và thử lại.
3. Nút **Gợi ý** mở hướng dẫn ngắn. Đóng gợi ý không làm mất đáp án đang nhập.
4. Gợi ý tăng dần: nhắc kiến thức → chỉ hướng làm → hướng dẫn từng bước.
5. Khi đúng, mở **Vì sao?** để xem lời giải đầy đủ.
6. Cho làm câu tương tự để kiểm tra khả năng tự làm.

Nếu bé mắc kẹt, **Cùng làm từng bước** giúp hoàn thành câu hiện tại. Câu đó được ghi nhận là hoàn thành có hỗ trợ, không tính là làm độc lập.

Bé có thể bỏ qua, thoát và tiếp tục sau. Không tạo vòng lặp bắt đoán đến đúng mới được đi tiếp.

**Còn chờ xây dựng:** sau 1–2 câu tương tự làm đúng độc lập, đề xuất câu khó hơn; bé có thể giữ mức hiện tại. Hiện câu tương tự được chọn tối đa 3 câu từ bộ có sẵn, chưa có cơ chế tự tăng độ khó.

## 8. Chấm điểm và theo dõi

### 8.1. Điểm kết quả /10

**Điểm hiện tại = (số câu chấm tự động đúng ở lần trả lời đầu / tổng số câu chấm tự động của bài) × 10.** Câu tự đối chiếu không nằm trong mẫu số; bài không có câu chấm tự động hiển thị tự đối chiếu. Quy tắc này áp dụng luồng tài liệu và Ôn bài/Ôn tổng hợp, không áp dụng ngân hàng TIMO mới còn Coming soon.

- Hiển thị rõ đây là **điểm lần làm đầu**.
- Không trừ điểm vì mở gợi ý.
- Câu bỏ qua hoặc chưa trả lời tính chưa đúng khi kết thúc bài.
- Hiển thị riêng số câu hoàn thành sau khi sửa hoặc thử lại.
- Một bài đang làm dở chưa được coi là bài đã kết thúc; cho phép tiếp tục.

### 8.2. Mức độ tự làm

Theo dõi riêng từng câu và tổng hợp theo dạng:

- Làm độc lập.
- Có dùng gợi ý.
- Có hướng dẫn từng bước.

Lưu số lần trả lời, lượt mở gợi ý và thời gian xem. Thời gian xem chỉ là tín hiệu bổ sung, không tự suy ra trẻ yếu vì đọc lâu.

Trong phần thích ứng độ khó còn chờ xây dựng, khả năng làm đúng câu mới tương tự mà không dùng gợi ý là bằng chứng chính để đề xuất tăng độ khó hoặc luyện thêm. Không gắn nhãn cố định như “bé yếu toán”.

## 9. Tiêu chuẩn nội dung

Một buổi học được coi là đúng nội dung khi:

1. Nhận diện đúng các dạng thực sự có trong tài liệu.
2. Menu, bài giảng và bài luyện bám cùng các dạng đó.
3. Câu tương tự giữ đúng kỹ năng cần luyện; câu nâng cao có lý do tăng độ khó rõ ràng.
4. Đề, đáp án và lời giải nhất quán, đủ dữ kiện; phương pháp phù hợp lớp 2.
5. Hình minh họa và các số/ký hiệu liên quan được hiểu đúng.
6. Phần không rõ hoặc thiếu dữ kiện được đánh dấu, không tự điền rồi giảng như dữ kiện gốc.

Hệ thống giao trực tiếp cho người học, không thêm bước người lớn duyệt. Việc kiểm tra tính nhất quán và xử lý câu chưa chắc chắn phải nằm trong quy trình tự động.

## 10. Video và tích hợp API

**Hiện trạng 23/10/2026:** chỉ có slide tương tác dùng dữ liệu mẫu. Chưa có pipeline tạo slide/kịch bản từ tài liệu thật, API video, giọng đọc hay đồng bộ điểm dừng với video thật. Các mục dưới đây là yêu cầu còn chờ; tài liệu API và quyền kết nối cần chủ dự án cung cấp.

### 10.1. Nội dung mỗi chủ đề

- Mục tiêu kiến thức.
- Slide minh họa.
- Kịch bản lời giảng phù hợp lớp 2, có động viên và hướng dẫn.
- Ví dụ giải từng bước.
- Câu hỏi tại điểm dừng và phản hồi tương ứng.

Ưu tiên giọng giáo viên miền Bắc theo định hướng demo; khả năng giọng cụ thể cần đối chiếu API khi tích hợp.

### 10.2. Hệ thống video hiện có

Chủ dự án xác nhận công ty đã có API nhận slide bài giảng **PDF/PPTX** và tài liệu **text**, trả video. Tài liệu kết nối sẽ bổ sung sau.

Website tạo đầu vào, gửi tác vụ, theo dõi trạng thái và lưu video đầu ra. Cách xác thực, cấu trúc request/response và cơ chế nhận kết quả sẽ xác định khi có tài liệu API.

Website quản lý điểm dừng và câu hỏi tương tác. Khi sai, hiện giải thích, cho thử lại hoặc xem lại đoạn liên quan. File video tải xuống không mang theo tương tác của website.

**Mốc dừng phải khớp video thực tế.** Nếu API chưa có thời gian theo slide, cần bước căn chỉnh hoặc dựng theo từng đoạn; chưa chốt cơ chế trước khi xem API.

### 10.3. Trước khi có API

- Xây phần kết nối video tách riêng để có thể tích hợp sau.
- Cho tạo và kiểm tra slide/kịch bản thật.
- Có thể dùng video mẫu ghi nhãn rõ để kiểm tra trình phát.
- Hiển thị **Chưa kết nối dịch vụ video** khi chưa cấu hình.
- Chưa nghiệm thu chức năng tạo video từ tài liệu mới nếu chưa tích hợp thành công.

Mong muốn là thời gian chờ ngắn. Chưa cam kết thời gian tạo video; đo bằng tài liệu thực tế sau khi tích hợp. Không đánh đồng thời gian xử lý với độ dài bài giảng.

## 11. Trạng thái và xử lý lỗi

Trạng thái chính: **Đã nhận file → Đang đọc → Đang phân tích → Đang tạo nội dung → Sẵn sàng một phần → Hoàn tất.**

Theo dõi riêng các phần bài luyện và video để phần đã xong có thể sử dụng ngay.

| Tình huống                                  | Hành vi                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| File quá 100 MB hoặc định dạng không hỗ trợ | Báo rõ trước khi xử lý                                                         |
| Ảnh mờ, thiếu trang                         | Chỉ rõ trang/câu cần tải lại                                                   |
| Chưa chắc số, dấu hoặc hình                 | Hiện phần cần kiểm tra; không tự đoán                                          |
| Một câu chưa xử lý được                     | Tạm bỏ riêng câu đó, tiếp tục các phần còn lại                                 |
| Tạo bài hoặc video lỗi                      | Cho thử lại đúng phần lỗi                                                      |
| Rời trang khi đang tạo                      | Tác vụ tiếp tục chạy nền; mở lại xem tiến độ                                   |
| Video chưa xong                             | Cho dùng bài luyện và hướng dẫn đã sẵn sàng                                    |
| File dài                                    | Cho chọn toàn bộ hoặc một số trang; dự kiến thời gian khi đủ dữ liệu phân tích |

## 12. Công nghệ đã triển khai và phần còn chờ

| Thành phần                     | Định hướng                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------ |
| Web và API điều phối           | Next.js + TypeScript                                                                 |
| Phân tích và biên soạn bằng AI | OpenRouter; chọn model theo khả năng đọc tài liệu/hình và chất lượng đầu ra thực tế  |
| Dữ liệu                        | Đã dùng Neon PostgreSQL; file JSON chỉ là adapter development                        |
| File và video                  | Đã dùng Vercel Blob Private cho PDF/ảnh; lưu video còn chờ                           |
| Xử lý dài                      | Đã dùng Vercel Workflow SDK, lưu từng phần và hỗ trợ thử lại; không cần worker riêng |
| Dựng video                     | API công ty theo định hướng ban đầu; chưa nhận tài liệu và chưa tích hợp             |

File lớn tải trực tiếp lên kho lưu trữ; Next.js điều phối thay vì buộc toàn bộ file và tác vụ dài đi qua một request đồng bộ.

Đã chọn Vercel cho hosting/Workflow, Neon cho database và Blob Private cho file. Model cấu hình bằng `OPENROUTER_MODEL`; đã xử lý bỏ `temperature` ở hai hàm gọi AI khi dùng Haiku 5.5. Ngân sách vận hành và lựa chọn model lâu dài chưa chốt. Không coi cấu hình/mã local là bằng chứng deployment mới nhất đã được cập nhật.

Dữ liệu cần lưu gồm hồ sơ bé, tài liệu/trang nguồn, câu hỏi gốc, chủ đề, buổi học, câu luyện, lời giải/gợi ý, lượt trả lời, tiến độ và tác vụ/tài sản video. Giữ liên kết từ nội dung được tạo về nguồn để kiểm tra chất lượng.

## 13. Thứ tự triển khai

Trạng thái hiện tại: bước 1–3 đã có triển khai kỹ thuật; bước 4 đã có làm bài/lưu kết quả nhưng chưa thích ứng độ khó; bước 5 còn chờ; bước 6 có kiểm thử kỹ thuật và một số thử nghiệm thật, chưa nghiệm thu toàn diện nội dung AI. Bảng dưới là lộ trình, không phải danh sách mọi phần chưa làm.

| Thứ tự                      | Công việc                                                 | Điều kiện hoàn thành                             |
| --------------------------- | --------------------------------------------------------- | ------------------------------------------------ |
| 1. Giao diện và cấu trúc    | Tái tạo demo, hồ sơ, màn hình và điều hướng               | Đi hết luồng bằng dữ liệu mẫu                    |
| 2. Tải và đọc tài liệu thật | Kho file, PDF/ảnh, chọn trang, tác vụ nền, nhận diện đề   | Hiển thị đúng câu và dạng từ tài liệu thử        |
| 3. Tạo nội dung học         | Lời giải, gợi ý, 25 câu, kiểm tra đáp án và dữ kiện       | Nội dung bám nguồn, đáp án và lời giải nhất quán |
| 4. Luyện tập                | Trả lời, gợi ý, hướng dẫn, điểm, lưu tiến độ, tăng độ khó | Hoàn thành một buổi học thật                     |
| 5. Video                    | Slide/kịch bản, ghép API, đồng bộ điểm dừng               | Tài liệu mới tạo được bài giảng tương tác        |
| 6. Kiểm thử trọn luồng      | PDF, ảnh, TIMO, các nhóm dạng bài và tình huống lỗi       | Đạt tiêu chí nghiệm thu                          |

Thiết kế kết nối video chuẩn bị từ đầu; tích hợp thực tế phụ thuộc thời điểm cung cấp API. Mục tiêu tiến độ là demo trong vài ngày, không phải cam kết mọi phần hoàn tất khi còn thiếu phụ thuộc.

## 14. Tiêu chí nghiệm thu và mức xác minh

Các mục đã triển khai kỹ thuật, có kiểm thử tự động hoặc kiểm tra trình duyệt:

- [x] Upload PDF/ảnh, chọn trang, giới hạn 100 MB/100 trang, kiểm tra định dạng.
- [x] Nhận diện, hiển thị chủ đề/câu gốc, cảnh báo nội dung chưa rõ và liên kết nguồn.
- [x] Tạo lời giải/bộ luyện 5–50 câu, mặc định 25; tách đề gốc khỏi bộ luyện mới.
- [x] Ôn bài/Ôn tổng hợp từ nguồn cùng môn; không lấy kiến thức ngoài nguồn làm chủ đích.
- [x] Làm bài, ba mức gợi ý, hướng dẫn, giải thích, điểm /10 và lưu/tiếp tục qua máy chủ.
- [x] Tác vụ nền, lưu từng phần, thử lại phần chưa xong.
- [x] Header có Thư viện và dropdown Luyện tập; Horizontal Scroll trang chủ; sáu khối TIMO và Phần thưởng hiển thị Coming soon.

Các dấu đã có ở trên xác nhận triển khai và kiểm tra kỹ thuật, **không chứng nhận mọi đầu ra AI đúng**. Chủ dự án đã báo test xong phần Ôn bài/Ôn tổng hợp, chưa có biên bản đánh giá toàn diện mọi môn/dạng bài.

Các mục còn chờ xây dựng hoặc nghiệm thu:

- [ ] Chất lượng nhận diện/đáp án/gợi ý trên bộ PDF và ảnh đại diện: các môn, hình học, lời văn nhiều bước, nội dung mờ và tài liệu TIMO cũ.
- [ ] Hỗ trợ đầy đủ tương tác nối cặp, nhiều ô điền và đúng–sai nhiều ý; hiện thường dùng tự đối chiếu.
- [ ] Tự đề xuất tăng độ khó theo kết quả làm độc lập và gợi ý.
- [ ] Tạo slide/kịch bản thật bám tài liệu; tích hợp API video và giọng đọc.
- [ ] Đồng bộ điểm dừng, câu hỏi và lời giải với video thực tế.
- [ ] Ghi nhận thời gian/chi phí AI trên bộ tài liệu đại diện, đo lại độ trễ production.
- [ ] Xác nhận triển khai mới nhất bằng upload Blob → Workflow → AI → làm bài → mở lại trên deployment đích.

Ngân hàng TIMO mới và Phần thưởng không được coi là thiếu nghiệm thu backend của đợt giao diện: backend chưa được duyệt triển khai, chờ các quyết định ở mục 19–20.

## 15. Phụ thuộc và quản lý thay đổi

Các đầu vào còn cần bổ sung trong quá trình triển khai:

- Tài liệu API video và quyền kết nối khi tới bước tích hợp.
- Khả năng giọng miền Bắc và mốc thời gian theo slide của API.
- Bộ PDF/ảnh thực tế đại diện cho nội dung muốn nghiệm thu.
- Model/ngân sách vận hành lâu dài; hạ tầng Vercel + Neon + Blob + Workflow đã có triển khai.

Các mục này là phụ thuộc triển khai, không thay đổi mục tiêu đã chốt.

Mọi thay đổi về đối tượng, môn học, chức năng, cách tính điểm hoặc tiêu chí nghiệm thu cần được thống nhất và cập nhật vào file này trước khi trở thành yêu cầu dự án. Không âm thầm mở rộng hoặc cắt phạm vi; ghi rõ phần nào là dữ liệu mẫu, phần nào đã hoạt động thật.

### Nhật ký quyết định

| Ngày       | Quyết định                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| 21/10/2026 | Thống nhất đặc tả MVP: Toán lớp 2/TIMO, giao diện sát demo, PDF/ảnh tối đa 100 MB, tự tạo và giao nội dung       |
| 21/10/2026 | Thống nhất tách điểm /10 và mức sử dụng gợi ý                                                                    |
| 21/10/2026 | Thống nhất hồ sơ theo thiết bị cho demo, điểm theo lần trả lời đầu, 25 câu cho bộ luyện mới và giữ nguyên đề gốc |
| 21/10/2026 | Đóng gói đặc tả thành tài liệu Markdown chuẩn của dự án; chưa bắt đầu code                                       |

## 17. Ghi nhận lịch sử bước 2 — 21/10/2026

Đây là ảnh chụp giai đoạn cũ, không phải trạng thái hiện tại: sinh bài/chấm bài và hạ tầng cloud đã được bổ sung sau đó. Production hiện dùng PostgreSQL/Blob/Workflow, không dùng worker riêng.

Chủ dự án yêu cầu tải/nhận diện PDF và ảnh thật thay cho dữ liệu mẫu, đồng thời mở Tiếng Anh, Tiếng Việt và Tự học. Chủ dự án sẽ cấu hình OpenRouter sau; việc tích hợp tiếp tục, không dùng dữ liệu mẫu để che trạng thái thiếu khóa.

Phạm vi bước này: lưu tệp, chọn trang, nhận diện câu hỏi/dạng bài qua OpenRouter, truy vết nguồn, tác vụ nền, trạng thái lỗi và thử lại từng phần. Câu trả lời tự học được ghi lại nhưng chưa chấm điểm. Sinh 25 câu, lời giải/gợi ý, đánh giá và video vẫn thuộc các bước 3–5.

Lựa chọn triển khai demo local tại thời điểm đó: lưu tệp/JSON trong `.data`, worker Node chạy cùng Next.js. PostgreSQL/S3 vẫn là định hướng khi chuyển sang hạ tầng triển khai lâu dài. Giới hạn tệp vẫn áp dụng: một PDF hoặc nhiều ảnh JPG/PNG/WebP, tổng 100 MB và tối đa 100 trang/tài liệu; ảnh tối đa 60 megapixel. Ảnh HEIC cần chuyển JPG. Không loại nhóm dạng bài; câu chưa đọc rõ được gắn cờ và liên kết trang gốc.

Trạng thái hoàn thành kỹ thuật và kiểm thử thực tế được ghi riêng; chưa nghiệm thu chất lượng AI khi chưa chạy bằng khóa thật.

## 18. Ghi nhận lịch sử bước 3 — 22/10/2026

Chủ dự án đã nhận diện PDF thật thành công và yêu cầu triển khai đáp án, lời giải từng bước, gợi ý, bộ 25 câu và nối vào luồng làm bài. Ở lần cập nhật này model được ghi là Claude Haiku 4.5 qua OpenRouter; không dùng ghi nhận lịch sử này để suy ra model hiện chạy trên mọi môi trường.

Bản triển khai cho phép mở lại tài liệu đã nhận diện, chọn chủ đề/số câu và tạo nội dung nền. Đề gốc tách khỏi bộ luyện mới. Câu rõ, đủ dữ kiện được giải; câu cần kiểm tra/thiếu âm thanh được ghi lý do; câu trả lời mở dùng tự đối chiếu và không tính điểm tự động. Bộ luyện mới hiện dùng trắc nghiệm 3–4 lựa chọn, có câu củng cố và nâng cao. Chưa coi đây là hoàn tất hỗ trợ tương tác mọi định dạng câu trả lời trong đặc tả cuối.

Luồng bài thật bao gồm lưu lần trả lời đầu và lần sửa, ba mức gợi ý, hướng dẫn khi chưa hiểu, lời giải, điểm /10 và lịch sử trên máy chủ. Câu tương tự được chọn từ bộ đã tạo; tăng độ khó thích ứng và video vẫn là phần tiếp theo. Bài đang làm giữ bộ câu hỏi riêng khi tạo nội dung mới.

Nội dung được kiểm tra cấu trúc/nguồn/số học và kiểm tra lại bằng một lượt AI riêng cùng model. Cần kiểm chứng sư phạm thực tế; việc vượt qua kiểm tra tự động không phải chứng nhận đáp án luôn chính xác. Trạng thái nghiệm thu cụ thể xem `docs/IMPLEMENTATION_STATUS.md`.

## Cập nhật triển khai demo — 22/10/2026

Theo xác nhận của chủ dự án: trước mắt dùng **thư viện demo chung, chưa cần đăng nhập**. Ai mở link triển khai cũng xem được tài liệu đã tải đủ, nội dung nhận diện, file gốc và bộ luyện đã chuẩn bị; tài liệu đã tải trước đó cũng được chia sẻ. Bản tải dở và thao tác tạo lại nội dung AI vẫn thuộc trình duyệt người tải. Theo cập nhật ngày 22/10/2026, bài làm thật, điểm, mức dùng gợi ý và lịch sử trên máy chủ được dùng chung, không lọc theo cookie người làm. Mở cùng bài từ trình duyệt/máy khác có thể xem và tiếp tục bài đó, kể cả bài cũ. Cookie chỉ giữ quyền quản lý tài liệu của người tải lên; không phải tài khoản. Khung tiến độ và nút tải tiếp/nhận diện lại chỉ hiển thị cho người tải lên. Nháp tự học ở phần nhận diện và tùy chọn giao diện mẫu vẫn là dữ liệu cục bộ, không tạo rào cản truy cập tài liệu.

## 19. Luyện thi Toán song ngữ / Luyện đề TIMO — 23/10/2026

### Phạm vi giao diện đã duyệt cho giai đoạn hiện tại

- Thêm thẻ **Luyện thi Toán song ngữ** cạnh các thẻ không gian học ở trang chủ.
- Khu vực các thẻ dùng **Horizontal Scroll**: cuộn/vuốt ngang, có nút trước/sau, không tự chuyển. Các thẻ dừng ngay ngắn theo vị trí khi cuộn.
- Thêm **Luyện đề TIMO** vào dropdown **Luyện tập**. Thẻ trang chủ và mục dropdown dẫn tới cùng một khu.
- Hiển thị sáu thẻ chọn khối: **Mầm non, lớp 1, lớp 2, lớp 3, lớp 4, lớp 5**.
- Bấm vào một khối sẽ mở trang của khối đó với nội dung **Coming soon**. Chưa có đề thi thật, số lượng đề mẫu hay thao tác làm bài trong khu mới.
- Giai đoạn này chỉ dựng giao diện; chưa triển khai trang quản trị, upload đề, AI nhận diện đề, chấm bài hoặc ghi kết quả TIMO vào Hành trình.
- Phạm vi khối Mầm non–lớp 5 chỉ áp dụng khu ngân hàng đề mới; không tự thay đổi các tính năng tài liệu lớp 2 hiện có.

### Định hướng ngân hàng đề cho giai đoạn sau

Ngân hàng đề do **nhà phát hành** cung cấp và phân theo khối học. Khi phương án nhập đề được thống nhất, AI nhận diện đề và chuẩn bị bộ câu hỏi từ đề nguồn. Người học đi theo luồng: **chọn khối → chọn đề → làm bài → xem kết quả → học lỗi sai → làm lại hoặc chọn đề khác**.

- Giữ bộ câu hỏi gốc và số câu của đề; không có tùy chỉnh số câu, tạo thêm đề hoặc sinh câu tương tự trong khu này.
- Kết quả dùng **số câu đúng/tổng số câu**, không quy đổi sang thang 10.
- Sau khi nộp bài, hiển thị các câu sai cùng gợi ý/hướng dẫn để học lại cách làm đúng.
- Các nội dung trên là định hướng đã thống nhất, chưa phải chức năng hoạt động ở giao diện Coming soon.

### Các quyết định đang mở — phải thống nhất trước khi phát triển

1. **Quản trị và upload đề:** chưa chốt cách nhà phát hành thêm đề, phân khối, quản lý và đưa đề vào ngân hàng; chưa xây trang quản trị.
2. **Đáp án:** chưa chốt việc nhà phát hành cung cấp đáp án chính thức hay AI tự giải, cũng như cách kiểm tra và xử lý đáp án chưa chắc chắn. Không tự chọn phương án.
3. **Song ngữ, bản dịch/phụ đề:** chưa chốt cách chuẩn bị và hiển thị Anh–Việt (đồng thời hay nút xem bản dịch). Không kế thừa mặc định cách hiển thị của luồng tự tải TIMO cũ.
4. **Hành trình:** chưa chốt có lưu các lượt thi, kết quả, lỗi sai và lần làm lại vào Hành trình hay không, cũng như cách hiển thị số câu đúng thay cho /10. Quyết định lưu Ôn bài/Ôn tổng hợp trước đó không tự áp dụng cho khu luyện thi này.

Chỉ triển khai các phần đang mở sau khi được chủ dự án duyệt bổ sung.

## 20. Ôn tập, điều hướng và các phần còn chờ — 23/10/2026

### Đã triển khai theo duyệt của chủ dự án

- **Ôn bài:** người dùng chọn một môn, một hoặc nhiều tài liệu đã nhận diện trong thư viện, đặt số câu và tạo bộ ôn bám nội dung nguồn.
- **Ôn tổng hợp:** chọn một môn, tìm/chọn các đề tài đã nhận diện, dùng nội dung tài liệu nguồn thay vì tạo từ kiến thức chung ngoài tài liệu.
- Cả hai mặc định 25 câu, tùy chỉnh 5–50; không trộn môn. Giới hạn kỹ thuật hiện tại: tối đa 20 tài liệu hoặc 50 đề tài, số câu ít nhất bằng số mục đã chọn. Máy chủ kiểm tra lại nguồn/môn/số lượng.
- Dùng văn bản nguồn đủ rõ; bộ ôn mới được biên soạn và kiểm tra theo nhóm. Chưa có bài tập mới cần hình/âm thanh ngoài nội dung được cung cấp. Câu có gợi ý, đáp án, lời giải, chấm /10 và lưu kết quả vào Hành trình.
- Có trang tiến độ bộ ôn, thử lại phần lỗi, mở lại và liên kết về từng tài liệu/trang gốc; bộ ôn đã tạo không xuất hiện như một PDF/ảnh nguồn trong Thư viện.
- Dropdown mở bằng hover trên desktop và chạm trên màn hình nhỏ; hỗ trợ bàn phím. Header thu gọn ở tối đa 900 px để không tràn khi thêm Thư viện.
- Đã bỏ menu phụ ở các trang chính, đưa **Thư viện** lên header. Trang Toán và khu mẫu Toán bỏ nút/thẻ giới thiệu TIMO; giữ toàn bộ tài liệu TIMO đã upload, nội dung nhận diện, bài làm và kết quả cũ.
- Chủ dự án đã báo test xong phần ôn tập trước khi chuyển sang yêu cầu giao diện TIMO. Kiểm thử tự động và UI được ghi riêng trong tài liệu tiến độ.

### Phần thưởng và phạm vi tạm dừng

- Header **Phần thưởng** mở trang **Coming soon**. Chưa thống nhất cơ chế nhận/sử dụng phần thưởng; chưa xây điểm thưởng, đổi thưởng hay kho quà.
- Các quyết định quản trị/upload đề, đáp án, song ngữ và Hành trình TIMO mới tiếp tục chờ theo mục 19; không tự suy ra từ chức năng cũ.
- Bài giảng/video thật, thích ứng độ khó và mở rộng kiểu bài còn chờ xây dựng/duyệt công việc tiếp theo. Chỉ sửa tài liệu trong đợt cập nhật hiện tại; không tự triển khai các phần còn chờ.
