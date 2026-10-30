# Tài liệu Vui học

Điểm vào tài liệu dự án. Thư mục gốc giữ README để chạy ứng dụng, AGENTS để hướng dẫn tác nhân và các file mã nguồn/cấu hình. Đặc tả, quy chuẩn và báo cáo nằm trong `docs/`.

## Quy chuẩn và đặc tả

| Tài liệu | Mục đích |
| --- | --- |
| [MVP_SPEC.md](MVP_SPEC.md) | Phạm vi và yêu cầu sản phẩm; không đồng nghĩa mọi mục đã được triển khai |
| [BRAND.md](BRAND.md) | Logo, màu sắc và quy ước biểu tượng đã duyệt; đọc trước khi sửa giao diện |
| [ACHIEVEMENTS.md](ACHIEVEMENTS.md) | Tài khoản, quyền dữ liệu, huy chương và xếp hạng |
| [QUESTION_CONTENT_POLICY.md](QUESTION_CONTENT_POLICY.md) | Nhận diện, ngữ cảnh câu hỏi, sửa nhãn và xử lý hình nguồn |
| [QUESTION_BANK.md](QUESTION_BANK.md) | Kho câu đã kiểm định, tra cứu có chỉ mục và chỉ sinh phần thiếu |
| [QUICK_PRACTICE.md](QUICK_PRACTICE.md) | Nút Tạo đề luyện tại tài liệu, hàng chờ riêng và phục hồi |
| [SIMILAR_PRACTICE_POLICY.md](SIMILAR_PRACTICE_POLICY.md) | Ràng buộc riêng cho chức năng Tạo thêm 5 câu |

## Hiện trạng và kiểm định

| Tài liệu | Mục đích |
| --- | --- |
| [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) | Tiến độ, giới hạn và các ghi nhận triển khai theo thời điểm |
| [SIMILAR_PRACTICE_VALIDATION.md](SIMILAR_PRACTICE_VALIDATION.md) | Kết quả xác minh Tạo thêm 5 câu trên các mẫu đã thử |

## Vận hành và kế hoạch

| Tài liệu | Mục đích |
| --- | --- |
| [README ứng dụng](../README.md) | Cách chạy và hướng dẫn hiện hành ở gốc dự án |
| [LOCAL_OPERATIONS_REFERENCE.md](LOCAL_OPERATIONS_REFERENCE.md) | Ghi chép vận hành local; chú ý ngày cập nhật của từng phần |
| [VERCEL_DEPLOYMENT.md](VERCEL_DEPLOYMENT.md) | Cấu hình và triển khai Vercel |
| [OPENROUTER_TTS.md](OPENROUTER_TTS.md) | Cấu hình giọng đọc |
| [VIDEO_GUIDANCE_PLAN.md](VIDEO_GUIDANCE_PLAN.md) | Kiến trúc, kế hoạch và xác minh hướng dẫn có giọng đọc |
| [REWARDS_BACKLOG.md](REWARDS_BACKLOG.md) | Góp ý và việc chờ quyết định cho Phần thưởng |
| [REWARD_ART_DIRECTION.md](REWARD_ART_DIRECTION.md) | Mỹ thuật và nội dung dẫn truyện Phần thưởng |

## Quy ước cập nhật

- Giữ một bản nội dung chuẩn cho mỗi chủ đề; file `ACCOUNTS_ACHIEVEMENTS.md` chỉ dẫn tới `ACHIEVEMENTS.md` để giữ liên kết cũ.
- Liên kết Markdown tính từ vị trí file đang đọc. Đường dẫn mã nguồn, tài nguyên và lệnh trong dấu backtick tính từ gốc dự án, trừ khi ghi rõ khác.
- Cập nhật mục lục và các tham chiếu khi đổi tên/chuyển file; cập nhật AGENTS nếu chuyển quy chuẩn bắt buộc.
- Ghi rõ ngày, trạng thái và phạm vi kiểm chứng; ghi nhận lịch sử không phải khẳng định hiện trạng.
- Git giữ các quy chuẩn được tham chiếu bắt buộc và tài liệu trước đây đã quản lý. Các đặc tả/ghi chép nội bộ khác, gồm MVP_SPEC, vẫn được giữ local theo cấu hình Git sẵn có; bản checkout khác có thể không có đủ các tài liệu đó.
