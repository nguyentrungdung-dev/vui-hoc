# Vui học — Đặc tả MVP

> **Trạng thái:** Đã được chủ dự án thống nhất, là tài liệu chuẩn để thiết kế, triển khai và nghiệm thu MVP.
> **Ngày chốt:** 21/10/2026.
> **Giai đoạn:** Đã dựng giao diện; triển khai bước 2 — tải và nhận diện tài liệu thật. Xem `docs/IMPLEMENTATION_STATUS.md` để phân biệt tính năng đã kiểm thử và phần chờ tích hợp.

## 1. Mục tiêu và nguyên tắc dự án

Vui học là công cụ tự học dành cho học sinh lớp 2, giúp giảm thời gian phụ huynh phải ngồi giảng bài và hỗ trợ trẻ ôn tập, luyện đề bằng lời giải phù hợp lứa tuổi, bài luyện và video tương tác.

**Mục tiêu quan trọng nhất của MVP:** Tải một tài liệu mới và tạo được buổi học đúng nội dung, với giao diện sát bản demo và học sinh lớp 2 có thể tự sử dụng.

Hai tình huống cốt lõi:

1. **Ôn bài theo tuần:** Biến bài học/bài tập được tải lên thành menu kiến thức, bài giảng và bộ luyện mới.
2. **Luyện đề TIMO:** Hướng dẫn giải đề gốc, luyện theo dạng, tạo bài tương tự và nâng cao.

Nguyên tắc:

- Học sinh lớp 2 là người sử dụng chính; bé hoặc phụ huynh đều có thể tải bài.
- Bé tự chọn chủ đề, không bắt buộc học hết tài liệu.
- Thời lượng một buổi ôn luyện dự kiến khoảng 30–45 phút, không phải thời gian xem video bắt buộc.
- Nội dung phù hợp độ tuổi, lớp và chương trình học; kết hợp phương pháp của giáo viên trong tài liệu nếu nhận diện được.
- Hệ thống tự tạo và giao nội dung; không yêu cầu phụ huynh duyệt trước.
- Không tự đoán nội dung khi đề, ký hiệu hoặc hình minh họa chưa được đọc chắc chắn.
- Điểm kết quả /10 tách biệt với mức sử dụng gợi ý.
- Bài luyện có thể sẵn sàng trước video; không buộc trẻ chờ video mới được học.

## 2. Phạm vi MVP

| Hạng mục                | Phạm vi đã chốt                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| Người học               | Học sinh lớp 2                                                                           |
| Nội dung hoạt động thật | Toán/TIMO lớp 2, Tiếng Anh, Tiếng Việt và Tự học; bước 2 mở tải/nhận diện cho cả bốn khu |
| Trang chủ               | Giữ đủ Toán, tiếng Anh, tiếng Việt, Thiết kế tự học                                      |
| Ba khu vực ngoài Toán   | Đã được chủ dự án yêu cầu mở khóa; dùng chung luồng tài liệu và phân loại theo nội dung  |
| Đầu vào                 | PDF và ảnh chụp                                                                          |
| Dung lượng              | Tối đa 100 MB mỗi lượt tải                                                               |
| Phạm vi trang           | Chọn toàn bộ tài liệu hoặc một số trang                                                  |
| Bài luyện mới           | Mặc định 25 câu, có thể chỉnh tổng số và chủ đề trước khi tạo                            |
| Đề gốc                  | Giữ số câu và thứ tự trong tài liệu; không ép thành 25 câu                               |
| Video                   | Tạo slide/kịch bản, gửi API công ty, nhận video; website quản lý tương tác               |
| Theo dõi                | Kết quả, số lần thử, lượt dùng gợi ý, mức tự làm và lịch sử                              |
| Hồ sơ demo              | Hồ sơ bé theo thiết bị; bài học và tiến độ lưu ở hệ thống                                |

Các nhóm dạng bài thuộc phạm vi kiểm chứng gồm phép tính, tìm số, toán lời văn, hình học, đo lường, thời gian, tiền và suy luận TIMO. Không chủ động loại bỏ cả nhóm dạng chỉ để thu hẹp demo. Từng câu không đọc hoặc xử lý chắc chắn phải được đánh dấu riêng.

Đăng ký email, đồng bộ nhiều thiết bị, chấm ảnh bài làm viết tay và mở rộng sang lớp khác không thuộc MVP này. Ảnh đầu vào trong MVP là ảnh đề/tài liệu, không đồng nghĩa có chức năng chấm bài viết tay.

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
| Trang chủ             | Slogan, bốn khu vực, nhân vật đồng hành, thống kê và tiếp tục học                 |
| Vui học Toán          | “Ôn bài của em”, “Luyện đề TIMO”, tài liệu gần đây và buổi đang học               |
| Tải tài liệu          | Chọn PDF/ảnh, chụp ảnh nếu thiết bị hỗ trợ, xem trước, sắp xếp ảnh, chọn trang    |
| Đang tạo buổi học     | Tiến độ từng phần, chủ đề nhận diện, phần đọc không rõ, mở nội dung đã sẵn sàng   |
| Menu buổi học         | Chủ đề, số câu, trạng thái video, tiến độ, chọn xem bài giảng hoặc luyện tập      |
| Xem bài giảng         | Video, phụ đề, mục lục, phát lại từng phần, điểm dừng chọn đáp án                 |
| Làm bài               | Một câu mỗi màn hình, trả lời, gợi ý, hướng dẫn từng bước, lời giải và luyện tiếp |
| Kết quả và hành trình | Điểm /10, kết quả theo dạng, mức dùng gợi ý, đề xuất luyện thêm và lịch sử        |

Tên gọi, ảnh đại diện và nhân vật đồng hành được chỉnh trong bảng hồ sơ mở từ trang chủ, không cần màn hình riêng.

## 5. Luồng ôn bài theo tuần

1. Chọn **Ôn bài của em**.
2. Tải PDF hoặc ảnh; xem trước và chọn trang cần học.
3. Hệ thống đọc tài liệu, tách câu hỏi và nhận diện dạng bài.
4. Hiện menu chủ đề; đánh dấu phần chưa đọc chắc chắn.
5. Người dùng chọn chủ đề và số câu; mặc định 25 câu cho toàn bộ bộ luyện mới, phân bổ theo các dạng được chọn.
6. Hệ thống tạo bài luyện, lời giải, gợi ý, slide và kịch bản; xử lý video qua API.
7. Bé chọn xem bài giảng hoặc làm bài khi nội dung tương ứng sẵn sàng.
8. Xem kết quả và luyện thêm theo dạng.

Mỗi câu mới phải gắn với dạng bài hoặc ví dụ nguồn trong tài liệu. Câu nâng cao có nhãn riêng, tăng độ khó có chủ đích và vẫn phù hợp kiến thức lớp 2.

Nếu tài liệu thiếu nội dung hoặc phần nhận diện chưa đủ để tạo bộ câu đạt chất lượng, phải báo rõ; không âm thầm thêm kiến thức không liên quan để đủ số lượng.

## 6. Luồng luyện đề TIMO

1. Chọn **Luyện đề TIMO** và tải đề.
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

Sau 1–2 câu tương tự làm đúng độc lập, đề xuất câu khó hơn; bé có thể giữ mức hiện tại.

## 8. Chấm điểm và theo dõi

### 8.1. Điểm kết quả /10

**Điểm = (số câu đúng ở lần nộp đầu tiên / tổng số câu của bài) × 10.**

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

Khả năng làm đúng câu mới tương tự mà không dùng gợi ý là bằng chứng chính để đề xuất tăng độ khó hoặc luyện thêm. Không gắn nhãn cố định như “bé yếu toán”.

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

## 12. Định hướng công nghệ

| Thành phần                     | Định hướng                                                                          |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| Web và API điều phối           | Next.js + TypeScript                                                                |
| Phân tích và biên soạn bằng AI | OpenRouter; chọn model theo khả năng đọc tài liệu/hình và chất lượng đầu ra thực tế |
| Dữ liệu                        | PostgreSQL                                                                          |
| File và video                  | Kho lưu trữ tương thích S3                                                          |
| Xử lý dài                      | Tác vụ chạy nền, lưu trạng thái và hỗ trợ thử lại                                   |
| Dựng video                     | API công ty đã có                                                                   |

File lớn tải trực tiếp lên kho lưu trữ; Next.js điều phối thay vì buộc toàn bộ file và tác vụ dài đi qua một request đồng bộ.

Nhà cung cấp hosting, kho file, hàng đợi và model cụ thể là quyết định triển khai tiếp theo; tài liệu này chưa chốt tên nhà cung cấp hoặc ngân sách.

Dữ liệu cần lưu gồm hồ sơ bé, tài liệu/trang nguồn, câu hỏi gốc, chủ đề, buổi học, câu luyện, lời giải/gợi ý, lượt trả lời, tiến độ và tác vụ/tài sản video. Giữ liên kết từ nội dung được tạo về nguồn để kiểm tra chất lượng.

## 13. Thứ tự triển khai

| Thứ tự                      | Công việc                                                 | Điều kiện hoàn thành                             |
| --------------------------- | --------------------------------------------------------- | ------------------------------------------------ |
| 1. Giao diện và cấu trúc    | Tái tạo demo, hồ sơ, màn hình và điều hướng               | Đi hết luồng bằng dữ liệu mẫu                    |
| 2. Tải và đọc tài liệu thật | Kho file, PDF/ảnh, chọn trang, tác vụ nền, nhận diện đề   | Hiển thị đúng câu và dạng từ tài liệu thử        |
| 3. Tạo nội dung học         | Lời giải, gợi ý, 25 câu, kiểm tra đáp án và dữ kiện       | Nội dung bám nguồn, đáp án và lời giải nhất quán |
| 4. Luyện tập                | Trả lời, gợi ý, hướng dẫn, điểm, lưu tiến độ, tăng độ khó | Hoàn thành một buổi học thật                     |
| 5. Video                    | Slide/kịch bản, ghép API, đồng bộ điểm dừng               | Tài liệu mới tạo được bài giảng tương tác        |
| 6. Kiểm thử trọn luồng      | PDF, ảnh, TIMO, các nhóm dạng bài và tình huống lỗi       | Đạt tiêu chí nghiệm thu                          |

Thiết kế kết nối video chuẩn bị từ đầu; tích hợp thực tế phụ thuộc thời điểm cung cấp API. Mục tiêu tiến độ là demo trong vài ngày, không phải cam kết mọi phần hoàn tất khi còn thiếu phụ thuộc.

## 14. Tiêu chí nghiệm thu

- [ ] Giao diện bám sát bản mẫu trên điện thoại và máy tính bảng.
- [ ] Trang chủ mở cả bốn khu học theo yêu cầu cập nhật; phân biệt tính năng thật và dữ liệu mẫu.
- [ ] Tải PDF/ảnh mới và chọn trang được; giới hạn 100 MB được thực thi.
- [ ] Menu phản ánh đúng nội dung tài liệu, có liên kết nguồn để kiểm tra.
- [ ] Tạo bộ luyện mặc định 25 câu; chỉnh được số lượng/chủ đề.
- [ ] Giữ nguyên số câu và thứ tự đề TIMO gốc; bộ luyện mới được tách riêng.
- [ ] Gợi ý, hướng dẫn, lời giải phù hợp lớp 2; TIMO có hỗ trợ song ngữ.
- [ ] Luồng thử làm, gợi ý, thử lại, hướng dẫn từng bước và giải thích hoạt động đúng.
- [ ] Điểm lần làm đầu /10 tách khỏi mức dùng gợi ý; lưu được tiến độ và kết quả sau sửa.
- [ ] Tăng độ khó dựa trên câu tương tự làm đúng độc lập.
- [ ] Rời trang và quay lại vẫn tiếp tục được bài học/tác vụ.
- [ ] Câu không đọc chắc chắn được báo rõ, không tự đoán; các câu khác tiếp tục xử lý.
- [ ] Slide, kịch bản và video khớp nội dung nguồn; điểm dừng hoạt động đúng.
- [ ] Video từ tài liệu mới được tạo qua API thật trước khi nghiệm thu phần này.
- [ ] Kiểm tra bằng bộ PDF và ảnh đại diện cho các nhóm dạng đã thống nhất, gồm hình học, lời văn nhiều bước và suy luận TIMO.
- [ ] Ghi nhận thời gian xử lý và lỗi thực tế; không công bố tốc độ chưa được kiểm chứng.

## 15. Phụ thuộc và quản lý thay đổi

Các đầu vào còn cần bổ sung trong quá trình triển khai:

- Tài liệu API video và quyền kết nối khi tới bước tích hợp.
- Khả năng giọng miền Bắc và mốc thời gian theo slide của API.
- Bộ PDF/ảnh thực tế đại diện cho nội dung muốn nghiệm thu.
- Nhà cung cấp hạ tầng, model và ngân sách vận hành.

Các mục này là phụ thuộc triển khai, không thay đổi mục tiêu đã chốt.

Mọi thay đổi về đối tượng, môn học, chức năng, cách tính điểm hoặc tiêu chí nghiệm thu cần được thống nhất và cập nhật vào file này trước khi trở thành yêu cầu dự án. Không âm thầm mở rộng hoặc cắt phạm vi; ghi rõ phần nào là dữ liệu mẫu, phần nào đã hoạt động thật.

### Nhật ký quyết định

| Ngày       | Quyết định                                                                                                       |
| ---------- | ---------------------------------------------------------------------------------------------------------------- |
| 21/10/2026 | Thống nhất đặc tả MVP: Toán lớp 2/TIMO, giao diện sát demo, PDF/ảnh tối đa 100 MB, tự tạo và giao nội dung       |
| 21/10/2026 | Thống nhất tách điểm /10 và mức sử dụng gợi ý                                                                    |
| 21/10/2026 | Thống nhất hồ sơ theo thiết bị cho demo, điểm theo lần trả lời đầu, 25 câu cho bộ luyện mới và giữ nguyên đề gốc |
| 21/10/2026 | Đóng gói đặc tả thành tài liệu Markdown chuẩn của dự án; chưa bắt đầu code                                       |

## 17. Cập nhật triển khai bước 2 — 21/10/2026

Chủ dự án yêu cầu tải/nhận diện PDF và ảnh thật thay cho dữ liệu mẫu, đồng thời mở Tiếng Anh, Tiếng Việt và Tự học. Chủ dự án sẽ cấu hình OpenRouter sau; việc tích hợp tiếp tục, không dùng dữ liệu mẫu để che trạng thái thiếu khóa.

Phạm vi bước này: lưu tệp, chọn trang, nhận diện câu hỏi/dạng bài qua OpenRouter, truy vết nguồn, tác vụ nền, trạng thái lỗi và thử lại từng phần. Câu trả lời tự học được ghi lại nhưng chưa chấm điểm. Sinh 25 câu, lời giải/gợi ý, đánh giá và video vẫn thuộc các bước 3–5.

Lựa chọn triển khai demo local: lưu tệp/JSON trong `.data`, worker Node chạy cùng Next.js. PostgreSQL/S3 vẫn là định hướng khi chuyển sang hạ tầng triển khai lâu dài. Giới hạn vận hành hiện tại: một PDF hoặc nhiều ảnh JPG/PNG/WebP, tổng 100 MB và tối đa 100 trang/tài liệu; ảnh tối đa 60 megapixel. Ảnh HEIC cần chuyển JPG. Không loại nhóm dạng bài; câu chưa đọc rõ được gắn cờ và liên kết trang gốc.

Trạng thái hoàn thành kỹ thuật và kiểm thử thực tế được ghi riêng; chưa nghiệm thu chất lượng AI khi chưa chạy bằng khóa thật.

## 18. Cập nhật triển khai bước 3 — 22/10/2026

Chủ dự án đã nhận diện PDF thật thành công và yêu cầu triển khai đáp án, lời giải từng bước, gợi ý, bộ 25 câu và nối vào luồng làm bài. Model cấu hình hiện tại là Claude Haiku 4.5 qua OpenRouter.

Bản triển khai cho phép mở lại tài liệu đã nhận diện, chọn chủ đề/số câu và tạo nội dung nền. Đề gốc tách khỏi bộ luyện mới. Câu rõ, đủ dữ kiện được giải; câu cần kiểm tra/thiếu âm thanh được ghi lý do; câu trả lời mở dùng tự đối chiếu và không tính điểm tự động. Bộ luyện mới hiện dùng trắc nghiệm 3–4 lựa chọn, có câu củng cố và nâng cao. Chưa coi đây là hoàn tất hỗ trợ tương tác mọi định dạng câu trả lời trong đặc tả cuối.

Luồng bài thật bao gồm lưu lần trả lời đầu và lần sửa, ba mức gợi ý, hướng dẫn khi chưa hiểu, lời giải, điểm /10 và lịch sử trên máy chủ. Câu tương tự được chọn từ bộ đã tạo; tăng độ khó thích ứng và video vẫn là phần tiếp theo. Bài đang làm giữ bộ câu hỏi riêng khi tạo nội dung mới.

Nội dung được kiểm tra cấu trúc/nguồn/số học và kiểm tra lại bằng một lượt AI riêng cùng model. Cần kiểm chứng sư phạm thực tế; việc vượt qua kiểm tra tự động không phải chứng nhận đáp án luôn chính xác. Trạng thái nghiệm thu cụ thể xem `docs/IMPLEMENTATION_STATUS.md`.


## Cập nhật triển khai demo — 22/10/2026

Theo xác nhận của chủ dự án: trước mắt dùng **thư viện demo chung, chưa cần đăng nhập**. Ai mở link triển khai cũng xem được tài liệu đã tải đủ, nội dung nhận diện, file gốc và bộ luyện đã chuẩn bị; tài liệu đã tải trước đó cũng được chia sẻ. Bản tải dở và thao tác tạo lại nội dung AI vẫn thuộc trình duyệt người tải. Bài làm, điểm và mức dùng gợi ý được lưu riêng theo trình duyệt để nhiều người thử demo không ghi đè tiến độ của nhau. Đăng nhập và đồng bộ tiến độ nhiều thiết bị là bước sau.
