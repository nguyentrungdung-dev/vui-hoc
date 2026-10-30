# Nhận diện chính thức — Vui học

Chủ dự án duyệt ngày **29/10/2026** qua ảnh `Screenshot 2026-10-29 at 15.46.09.png`.

## Logo đã chốt

**Ngôi sao vàng năm cánh có mắt và miệng cười, trên khối tím bo tròn không đều, nghiêng nhẹ.** Đây là logo sản phẩm chính thức, thay thế tham chiếu sao trắng bốn cánh trước ngày 29/10. Không thay bằng emoji, icon thư viện, mầm cây hoặc tự thiết kế lại khi sửa giao diện nếu chủ dự án chưa yêu cầu.

- Tệp vector chuẩn duy nhất: `public/brand/vui-hoc-logo.svg`.
- Thành phần dùng trong giao diện: `BrandLogo` tại `src/components/icons.tsx` (đầu trang và chân trang).
- Tím `#8272c3`, sao `#efd39a`, nét mặt `#686487`; giữ bảng màu pastel hiện tại của hệ thống.
- Favicon: `src/app/icon.svg`, `src/app/favicon.ico` (16, 32, 48 px). Biểu tượng màn hình chính: `src/app/apple-icon.png` (180 px).
- Các bản favicon được sinh từ tệp chuẩn bằng `node scripts/generate-brand-icons.mjs`. Chỉ sửa tệp chuẩn rồi sinh lại để tránh các bản lệch nhau.
- Ảnh chủ dự án duyệt được lưu tại thư mục brainstorm `assets/brand/approved-logo-reference-2026-10-29.png`.

## Quy ước biểu tượng nội dung

Giữ phong cách vector pastel tự thiết kế hiện tại. Icon phải khớp ý nghĩa mục, thống nhất giữa thẻ trang chủ, trang môn học và bản tham quan. Logo sản phẩm chỉ dùng nhận diện thương hiệu.

| Mục          | Icon                                                     |
| ------------ | -------------------------------------------------------- |
| Toán         | Các khối phép tính cộng, trừ và hình tròn                |
| Tiếng Anh    | Chữ thường **abc** trên thẻ đào                          |
| Tiếng Việt   | **a ă â**, đủ dấu, trên thẻ tím                          |
| Tự học       | Cây bút nghiêng, đúng kiểu chủ dự án chọn ở ảnh 15.45.36 |
| Thư viện     | Kệ sách nhiều gáy sách                                   |
| Luyện tập    | Tờ bài tập                                               |
| Ôn bài       | Vòng mũi tên ôn lại                                      |
| Ôn tổng hợp  | Sách mở, thống nhất giữa menu, tab và tiêu đề |
| Tạo tài liệu | Tải tài liệu lên                                         |
| Hành trình   | Đồng hồ và dấu lịch sử                                   |
| Huy chương   | Huy chương có ruy băng                                   |
| Xếp hạng     | Bục xếp hạng ba bậc                                      |
| TIMO         | Cúp thi đấu                                              |
| Phần thưởng  | Hộp quà                                                  |

Không đổi business model hoặc bộ 16 nhân vật độc quyền (`public/characters/`) khi chỉnh nhận diện.
