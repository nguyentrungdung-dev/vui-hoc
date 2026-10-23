# Kế hoạch hướng dẫn có chuyển động và giọng đọc

Ngày thống nhất: **23/10/2026**.

**Trạng thái: đã thống nhất hướng thiết kế, chưa triển khai.** Chủ dự án yêu cầu chỉ lưu tài liệu và sẽ tiếp tục sau; không triển khai, gọi API tạo nội dung hay deploy trong lần lưu này. Các bước bên dưới là kế hoạch cho phiên làm việc tiếp theo.

## 1. Quyết định đã thống nhất

- Học sinh bấm **“Xem video hướng dẫn chi tiết”** trong hộp gợi ý để bắt đầu tạo và xem hướng dẫn cho câu hiện tại.
- Script lấy trực tiếp từ **toàn bộ lời giải chi tiết** (các bước giải và phần giải thích, như ảnh 3 trong trao đổi), không chỉ lấy một gợi ý ngắn đang hiển thị.
- Không dùng AI viết lại script. Claude nhận lời giải để tạo các cảnh minh họa chuyển động, giữ nguyên nội dung học.
- Dùng model Claude hiện có qua OpenRouter để tạo cảnh. Cấu hình local tại thời điểm trao đổi: `OPENROUTER_MODEL=anthropic/claude-haiku-5.5`.
- Dùng Fish Audio qua OpenRouter để tạo giọng đọc: `OPENROUTER_TTS_MODEL=fish-audio/s2.1-pro-free:free`.
- Phát animation cùng âm thanh ngay trong webapp sau khi nội dung sẵn sàng. “Phát ngay” không có nghĩa API tạo nội dung tức thời; cần hiển thị trạng thái trong lúc chờ.
- Lưu cảnh và âm thanh để lần sau dùng lại, không tạo lại mỗi lần bấm.
- **Chưa cần xuất MP4**, chưa cần model sinh video hoặc API video của công ty cho luồng này.

## 2. Cách hiểu “Claude Motion” trong dự án

Mục tiêu là animation bằng code theo tinh thần Claude Motion. Tính năng Motion trong ứng dụng Claude không tự đi kèm khi gọi model qua OpenRouter; webapp cần có bộ dựng cảnh và trình phát riêng.

Phương án đã trao đổi: Claude sinh **dữ liệu cảnh theo cấu trúc cố định**, bộ animation của app thực thi các thao tác đã hỗ trợ như hiện chữ, tô sáng, di chuyển số hoặc nhóm vật thể. Không chạy tùy ý mã JavaScript/HTML do model trả về trong trang học sinh.

Lời giải gốc là nguồn chuẩn. Cần kiểm tra số, phép tính, thứ tự bước và nội dung cảnh với lời giải; animation bằng code không tự bảo đảm đúng kiến thức.

## 3. Luồng dự kiến

1. Học sinh bấm nút, server xác định câu hỏi và phiên bản lời giải.
2. Nếu đã có tài sản hoàn chỉnh tương ứng, mở trình phát và dùng lại.
3. Nếu đang có tác vụ tạo cho cùng nội dung, dùng chung tác vụ; tránh bấm nhiều lần hoặc nhiều người cùng bấm tạo trùng.
4. Nếu chưa có, tạo tác vụ nền và hiện tiến độ chuẩn bị.
5. Claude tạo mô tả cảnh từ lời giải chi tiết. TTS dùng cùng nội dung, chỉ chuẩn hóa cách đọc ký hiệu bằng quy tắc, không diễn giải lại bằng AI.
6. Tạo giọng đọc theo từng bước/cảnh; lấy thời lượng audio thực tế để căn thời gian chuyển động, không mặc định TTS có timestamp từng từ.
7. Kiểm tra cấu trúc và nội dung, lưu cảnh/âm thanh, đánh dấu sẵn sàng.
8. Webapp phát đồng bộ; hỗ trợ tạm dừng, phát lại và chuyển bước. Xử lý trường hợp trình duyệt yêu cầu học sinh nhấn Phát sau thời gian chờ tạo.
9. Nếu lỗi, hiển thị thông báo và cho thử lại phần lỗi; học sinh vẫn có thể xem lời giải chữ.

Ví dụ `45 + 38`: tô sáng hàng đơn vị → minh họa 5 + 8 = 13 → viết 3, chuyển số nhớ 1 lên hàng chục → minh họa 4 + 3 + 1 = 8 → hoàn thành 83. Giọng đọc bám từng bước tương ứng.

## 4. Cấu hình và lưu trữ

- Giữ `OPENROUTER_MODEL` cho Claude. Mỗi request chỉ định đúng model theo tác vụ.
- `OPENROUTER_TTS_MODEL` dùng riêng cho Fish Audio; có thể dùng chung `OPENROUTER_API_KEY` ở server. Không đưa API key ra trình duyệt.
- Người dùng từng đặt Fish Audio trong `OPENROUTER_VIDEO_MODEL`; đây là model TTS. Khi bắt đầu triển khai, kiểm tra env đang chạy và env deployment, chuyển sang biến TTS nếu còn đặt nhầm. Không giả định cấu hình mới đã được code sử dụng.
- Tận dụng PostgreSQL để lưu metadata, dữ liệu cảnh và trạng thái; Blob Private để lưu âm thanh; Workflow để điều phối tác vụ dài. Chi tiết schema và route sẽ thiết kế khi triển khai.
- Khóa tái sử dụng cần phân biệt câu hỏi/phiên bản lời giải, phiên bản bộ dựng cảnh, model và giọng đọc. Lời giải thay đổi không được phát tài sản cũ sai nội dung.
- Áp dụng cơ chế truy cập nội dung hiện có. Xem hướng dẫn đầy đủ cần được ghi nhận tương đương xem lời giải có hỗ trợ; không biến thành lần làm đúng độc lập hoặc tự đánh dấu đã hiểu chỉ vì bấm tạo.

## 5. Điểm tiếp tục ở phiên sau

1. Đọc lại kế hoạch này và kiểm tra mã/env hiện tại; xác nhận bắt đầu triển khai theo yêu cầu mới của chủ dự án.
2. Làm một câu mẫu từ đầu đến cuối: lấy lời giải → Claude tạo cảnh → Fish Audio đọc tiếng Việt → trình phát đồng bộ.
3. Đánh giá cách đọc phép tính, chất lượng minh họa, độ trễ và khả năng tua/phát lại. Chưa cam kết thời gian tạo trước khi đo thực tế.
4. Hoàn thiện lưu trữ, tác vụ dùng chung, cache theo phiên bản và thử lại phần lỗi.
5. Nối nút vào luồng thật; kiểm tra desktop/mobile, lỗi API, tải lại trang và mở lại nội dung đã tạo.

Tiêu chí nghiệm thu: bấm nút tạo được hướng dẫn từ lời giải thật; số và các bước khớp nguồn; giọng đọc đồng bộ; mở lại dùng tài sản đã lưu; nhiều lần bấm không tạo trùng; không lẫn model; điểm/lần trả lời đầu không bị thay đổi sai.

## 6. Hiện trạng lúc bàn giao

- Đã có thay đổi UI local: nút video bên cạnh lựa chọn “Cùng làm từng bước”; nút câu tương tự thành button giữa giải thích và câu tiếp theo.
- Nút video hiện chỉ báo tính năng đang được chuẩn bị. Chưa có pipeline tạo cảnh, TTS, trình phát bài thật hoặc lưu tài sản hướng dẫn.
- Thay đổi UI đã qua build, TypeScript và 32 test; 4 test tích hợp bị bỏ qua. Đã kiểm tra giao diện desktop; chưa xác nhận deploy các thay đổi này.
- Lần lưu kế hoạch này chỉ sửa tài liệu, giữ nguyên các thay đổi UI đang có.

## 7. Tài liệu tham khảo

- [Claude Motion](https://support.claude.com/en/articles/17454997-get-started-with-claude-motion): animation bằng code trong ứng dụng Claude.
- [OpenRouter TTS](https://openrouter.ai/docs/guides/overview/multimodal/tts): tích hợp giọng đọc qua API.
- [Fish Audio S2.1 Pro](https://fish.audio/blog/s2-1-pro-free-api/): thông tin model TTS; cần kiểm tra lại khả năng và hạn mức tại thời điểm triển khai.
