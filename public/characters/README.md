# Thư viện nhân vật Vui Học

Theo thống nhất của chủ dự án ngày 26/10/2026, bộ 16 nhân vật đang xuất hiện trong “Góc của bé” tại thời điểm này là bộ nhân vật độc quyền của dự án, tiếp tục được giữ lại để tái sử dụng khi mục này được mở rộng hoặc thiết kế lại.

## Tài sản

- `source/characters-original.webp`: bản sao nguyên vẹn của `public/characters.webp`, ảnh nguồn 4 hàng × 4 cột.
- `01-*.png` đến `16-*.png`: từng nhân vật trên nền trong suốt, thứ tự từ trái sang phải, từ trên xuống dưới.
- `manifest.json`: ID ổn định, đường dẫn dùng trên web, vị trí trong ảnh nguồn, tên đang có trong mã và mô tả ngoại hình.

Tên file mô tả ngoại hình để tránh nhầm: một số tên hiện tại trong `src/lib/demo.ts` chưa khớp hình nhân vật. Các tên mô tả ở đây chưa phải quyết định đặt tên chính thức. Dùng `sourceIndex` để đối chiếu với giao diện hiện tại.

## Nguyên tắc sử dụng

- Giữ ảnh nguồn làm mốc đối chiếu tạo hình; không ghi đè ảnh gốc.
- Bản PNG được xử lý bằng công cụ AI tách nền `imagegen`, nên có thể có sai khác chi tiết so với pixel ảnh nguồn. Chúng là bản tách phục vụ tái sử dụng, không phải bản gốc có độ phân giải cao hơn được cung cấp sẵn.
- Giữ nhận diện, màu sắc, trang phục và phụ kiện của từng nhân vật khi sử dụng tiếp. Chưa tự đặt lại tên, thêm tiểu sử hoặc tạo hình mới.
- Nguồn hiện tại là hình chân dung cắt ngang thân; không coi đây là tạo hình toàn thân.
- Thư viện này được lưu độc lập để dùng về sau. Giao diện hiện tại tiếp tục dùng ảnh nguồn `/characters.webp`.

## Cách xử lý đã dùng

Built-in `imagegen`, chế độ `background-extraction`, nền trong suốt. Mỗi lần xử lý chỉ lấy một ô được xác định theo hàng/cột và mô tả nhân vật; yêu cầu giữ nguyên tư thế, khuôn mặt, tỷ lệ, màu sắc, chất liệu, quần áo và phụ kiện; xoá nền màu và các nhân vật khác; không tự bổ sung phần thân ngoài ảnh, không thiết kế lại, không thêm chữ hoặc nền. Thông tin từng ô được lưu trong `manifest.json`.
