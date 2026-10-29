# Vui Học

Vui Học là ứng dụng học tập giúp trẻ luyện tập từ chính tài liệu đang học. Từ một file PDF hoặc ảnh bài tập, ứng dụng nhận diện nội dung, tạo bài luyện và hướng dẫn từng bước bằng hình ảnh chuyển động cùng giọng đọc.

## Chức năng nổi bật

- **Học từ tài liệu của mình:** tải PDF hoặc ảnh bài học thuộc các môn Toán, Tiếng Anh, Tiếng Việt và khu Tự học; chọn trang cần sử dụng.
- **Luyện tập theo nội dung bài học:** tạo bộ câu hỏi theo chủ đề, tùy chọn từ 5 đến 50 câu, có liên kết về tài liệu nguồn.
- **Đề gốc được giữ đầy đủ:** hai lượt nhận diện/đối chiếu với trang nguồn; cảnh báo chữ mờ hoặc đề thiếu dữ kiện không tự loại câu.
- **Hình minh họa ngay trong bài:** xác định vùng hình trên ảnh trang, cắt từ bản gốc và đối chiếu lại trước khi hiển thị. Nếu chưa lấy được hình đầy đủ thì báo riêng, không thay bằng cả trang đề.
- **Chấm tự luận từng ý:** chuẩn bị rubric trước khi làm bài; hai lượt chấm độc lập ghi nhận phương pháp và điểm từng phần. Khi chưa thống nhất thì lưu bài mà không tính đúng/sai.
- **Đáp án và hướng dẫn thống nhất:** giữ nguyên nhãn/nội dung lựa chọn, giải độc lập và kiểm tra đáp án–hint–lời giải–rubric; nội dung chưa đạt được giữ ở trạng thái chưa chấm.
- **Gợi ý từng bước:** nhận gợi ý đã lưu, thử lại và xem lời giải để hiểu cách làm.
- **Animation có giọng đọc:** theo dõi phần hướng dẫn với minh họa chuyển động, âm thanh và điều khiển phát lại, chuyển bước.
- **Ôn bài và ôn tổng hợp:** kết hợp nhiều tài liệu hoặc đề tài cùng môn để tạo bộ ôn.
- **Thư viện và Hành trình:** tìm lại tài liệu, tiếp tục bài đang làm và xem kết quả luyện tập.
- **Giao diện dành cho trẻ:** màu sắc thân thiện, bộ nhân vật đồng hành và bố cục phù hợp máy tính lẫn điện thoại.

## Cách hoạt động

1. **Đưa tài liệu vào thư viện.** Chọn môn học, tải PDF hoặc ảnh và chọn các trang cần học.
2. **Chuẩn bị bài gốc.** AI đọc tài liệu, phân loại chủ đề và câu hỏi, chuẩn bị và kiểm tra đáp án, ba mức gợi ý và lời giải trong cùng lượt xử lý upload. Chỉ báo sẵn sàng khi hoàn tất; câu thiếu dữ kiện được báo riêng.
3. **Vào làm bài ngay.** Màn hình tài liệu giữ danh sách chủ đề, ẩn bản xem trước các câu hỏi. Chọn chủ đề hoặc làm toàn bộ bài gốc; gợi ý đọc từ nội dung đã lưu, không chờ AI tạo mới.
4. **Luyện thêm khi muốn.** Mở mục luyện thêm để tạo 5–50 câu mới theo chủ đề; giữ lại lời giải gốc. Video chỉ được tạo khi người học yêu cầu. Theo dõi kết quả trong Hành trình.

Các bước xử lý tài liệu và tạo bài chạy nền, lưu kết quả từng phần và hỗ trợ thử lại khi bị gián đoạn.

## Công nghệ

| Thành phần                   | Công nghệ                             |
| ---------------------------- | ------------------------------------- |
| Ứng dụng web                 | Next.js App Router, React, TypeScript |
| Giao diện                    | CSS, Lucide React                     |
| AI và giọng đọc              | OpenRouter, Claude, Gemini TTS        |
| Cơ sở dữ liệu                | PostgreSQL, Neon                      |
| Lưu trữ tài liệu và âm thanh | Vercel Blob Private                   |
| Tác vụ nền                   | Workflow SDK                          |
| Xử lý PDF và ảnh             | PDF.js, pdf-lib, Sharp                |
| Kiểm tra cấu trúc dữ liệu    | Zod                                   |
| Triển khai                   | Vercel, Node.js 24                    |

## Chạy trên máy

Yêu cầu **Node.js 24.x** và npm.

```sh
npm ci
cp -n .env.example .env.local
npm run dev
```

Điền cấu hình dịch vụ vào `.env.local` theo mẫu `.env.example`, sau đó mở [http://127.0.0.1:3000](http://127.0.0.1:3000).

OpenRouter cung cấp AI và giọng đọc. PostgreSQL và Vercel Blob dùng để lưu dữ liệu trên cloud; khi phát triển không có database, ứng dụng có thể lưu dữ liệu trên máy. Chế độ production yêu cầu cấu hình PostgreSQL, Blob và OpenRouter.

## Lệnh phát triển

```sh
npm run dev          # Chạy môi trường phát triển
npm test             # Chạy kiểm thử
npm run typecheck    # Kiểm tra TypeScript
npm run build        # Build production
npm run prod         # Kiểm tra cấu hình, build và chạy production local
```

### Kiểm tra luồng đề gốc

`npm test` kiểm tra giữ câu cảnh báo, ánh xạ lựa chọn, mâu thuẫn hint/đáp án, chấm từng phần, chống chấm lại sự kiện, và render/cắt hình PDF thực. `node --import tsx scripts/check-worksheet.mts <document-id> [page]` kiểm tra một trang qua AI thật (phát sinh lượt gọi OpenRouter), chỉ đọc tài liệu, không sửa dữ liệu và không tạo video; kết quả ghi trong thư mục tạm hệ thống.

`node --import tsx scripts/verify-repaired-worksheet.mts <document-id>` kiểm tra các lựa chọn, hint và lời giải của bộ đề đã lưu qua luồng làm bài và PostgreSQL JSONB thật. Các lượt kiểm thử nằm trong một transaction được rollback để không thêm lịch sử học.

Bộ học cũ cần được chủ tài liệu cập nhật bằng nút **Cập nhật bài gốc, hình và tiêu chí chấm**. Các lượt đang làm dùng nội dung cũ vẫn giữ bài đã nhập nhưng tạm không chấm đúng/sai; kết quả lịch sử đã kết thúc được giữ lại.

## Phần thưởng và góc học tập

Mở `/phan-thuong` để xem thử, đổi sao, đặt/cất 40 vật phẩm thuộc 5 bản đồ và xem lịch sử nhận sao. Desktop dùng hai cột, điện thoại xếp góc học tập trước danh sách vật phẩm. Bàn, ghế và kệ cơ bản được cung cấp sẵn. Ngoài Góc học tập còn có Trạm vũ trụ, Sở thú hoang dã, Lâu đài cổ tích và Thành phố robot, mỗi nơi có 8 vật phẩm riêng với giá 3–15 sao. Chuyển bản đồ miễn phí, dùng chung ví sao; đồ đã đặt ở từng bản đồ được giữ lại. Bản đồ đang chọn cũng được tự lưu. Dữ liệu cũ tự mở ở Góc học tập, giữ nguyên sao và đồ đã đổi.

Bài học thật hoàn thành nhận 2 sao; bộ ôn nhận 2 sao thay cho thưởng bài học; mỗi chặng 3 bài khác nhau nhận thêm 2 sao. Ba câu từng sai được tự sửa đúng nhận 1 sao, tích lũy qua các bài; câu đã mở lời giải không tính. Các mục tiêu được kiểm tra và cộng sao khi kết thúc bài, sau khi mọi câu đã hoàn thành (câu chưa chấm được cần có câu trả lời). Kết thúc sớm và bài mẫu trong khu trải nghiệm không nhận sao.

Thưởng hoàn thành được chống trùng theo tài liệu và tập câu hỏi, kể cả khi tạo lượt làm mới. Câu sửa sai chỉ được tính một lần. Đổi vật phẩm được khóa đồng thời ở máy chủ, không thể tiêu quá số sao; cất và đặt lại miễn phí. Không có chuỗi ngày học hoặc sao hết hạn.

Sao và đồ trang trí gắn với phiên trình duyệt qua cookie hiện có; lưu PostgreSQL ở production, file JSON trong thư mục dữ liệu khi phát triển local. Chưa có tài khoản để đồng bộ giữa các thiết bị. Các bài và lịch sử học chung của thư viện không tự động cộng sao cho mọi phiên; sao được ghi cho phiên thao tác kết thúc bài. Lịch sử cũ trước tính năng này không được cộng sao hồi tố.

### Tự sắp xếp vật phẩm

Sau khi đổi và đặt đồ, chọn **Sắp xếp vật phẩm** rồi kéo bằng chuột, bút hoặc ngón tay. Chọn **Xong** để kết thúc. Chế độ sắp xếp giữ cử chỉ cảm ứng trong bản đồ; vùng ngoài bản đồ vẫn cuộn trang bình thường. Có thể dùng Tab để chọn đồ và các phím mũi tên để di chuyển (Shift để đi xa hơn).

Vị trí lưu khi thả, dùng tọa độ tỷ lệ nên giữ cách sắp xếp khi xoay iPad hoặc đổi kích thước cửa sổ. Mỗi vật phẩm được giới hạn trong bản đồ, giữ vị trí khi cất rồi đặt lại. **Về vị trí ban đầu** chỉ khôi phục bố cục của bản đồ đang mở. Dữ liệu trước tính năng này tiếp tục dùng bố cục mặc định. Mất kết nối khi lưu sẽ hiện lỗi và trả vật phẩm về vị trí đã lưu.

## Video lời giải cho mọi bài

Mọi yêu cầu **Xem video hướng dẫn chi tiết** trong các lượt học dùng cùng luồng mới, không giới hạn phép tính hoặc môn học. Đề, đoạn văn, đáp án, lời giải và mô tả hình là nguồn chuẩn; không lấy hint hoặc đọc nguyên steps làm lời dẫn. Cache version mới thay các video cũ khi người học yêu cầu tạo video; trình phát vẫn tương thích dữ liệu lịch sử.

Claude viết sáu câu lời dẫn ngắn riêng cho bài, sau đó chọn cảnh và cue theo lời đã chốt. Một lượt kiểm tra nội dung đối chiếu kịch bản, hình, các bước và subpart với nguồn trước khi tạo audio. Hình dùng phép tính, đồ vật đếm được, so sánh, hình học, bằng chứng trong văn bản hoặc chuỗi suy luận. Chỉ vẽ đồ vật cho phép tính nhỏ đã kiểm tra; hình học chỉ minh họa hình được nêu rõ trong nguồn. Mẫu chưa chuyên biệt vẫn dùng kịch bản và cảnh mới, không quay về thẻ số cũ.

Nhân vật được chọn ngẫu nhiên từ `public/characters/manifest.json` khi nhận tác vụ và lưu cùng video. Mở lại, tua hoặc thử lại giữ nhân vật đã chọn. Giọng **Aoede**, hướng dẫn đọc và playbackRate giữ như trước; không tăng tốc âm thanh để ép thời lượng.

Workflow tạo tối đa ba đoạn TTS cùng lúc. Node xử lý PCM WAV, cắt vùng yên lặng dài, thêm thời gian quan sát không quá hai giây mỗi đoạn. Mục tiêu 50 giây, khoảng chấp nhận 45–55 giây; nếu lệch, có một lần biên soạn lại và tạo audio theo lời mới. Các lỗi nội dung hoặc âm thanh chưa đạt được chặn trước ready, vẫn có lời giải chữ và thử lại. Audio và plan đã đạt được lưu để tránh gọi AI lại khi mở video.

Chuyển động lấy audio làm đồng hồ duy nhất. Căn từ trên audio đã xử lý; nếu nhận dạng toàn bài bị lỗi, nhận dạng từng đoạn bằng bộ dự phòng, không tự ước lượng timestamp. API STT và provider-native vocabulary hint theo [tài liệu OpenRouter](https://openrouter.ai/docs/guides/overview/multimodal/stt). Dữ liệu mới vẫn dùng phân quyền, audio riêng tư và execution fencing hiện có. Thay đổi chỉ thêm trường JSON/JSONB, không cần migration bảng. Không cần FFmpeg hoặc đợi xuất MP4 trên đường xem video.

### Nghiệm thu có gọi dịch vụ thật

`node --import tsx scripts/check-guidance-suite.ts` tạo tám video trên dữ liệu mẫu riêng trong `.test-data/video-review-20261029`, không đọc/ghi database sản phẩm. Bao gồm cộng có nhớ, trừ có nhớ, toán lời văn, hình học, đọc hiểu tiếng Việt, ngữ pháp tiếng Anh, quy luật và tự luận nhiều ý. Có thể truyền một id (hoặc nhiều id cách nhau bằng dấu phẩy) để chạy phần còn thiếu. `--recover` chỉ phục hồi các tác vụ mẫu đã ngắt trong thư mục kiểm tra này. `--billing-only` đọc lại billing các request đã ghi, không tạo nội dung mới.

Chạy app development với `VUIHOC_DATA_DIR=.test-data/video-review-20261029 DATABASE_URL='' BLOB_READ_WRITE_TOKEN=''` rồi mở `/video-nghiem-thu` để xem các audio và trình phát thật. Trang này chỉ hoạt động trong development, trả 404 ở production. `review.json` lưu thời lượng, trạng thái, các lượt gọi/chi phí đã biết và lần chạy gần nhất; chi phí tích lũy gồm cả các thử nghiệm thất bại, không phải đơn giá mỗi video. Thời gian chạy tiếp từ cache không phải thời gian tạo toàn bộ từ đầu. Không coi các phép đo local là cam kết khi tải đồng thời.

### Bộ minh họa và câu chuyện Phần thưởng

Trang Phần thưởng dùng 5 nền và 40 sticker minh họa riêng theo phong cách truyện thiếu nhi, thay cho emoji và nền SVG cũ. Mỗi bản đồ là một chương có người dẫn chuyện, thư mời, truyện tùy chọn đọc, lời dẫn theo bộ sưu tập và lời ghi nhận khi đặt đồ. Câu chuyện không khóa bản đồ, không thêm loại tiền hay thay đổi mức thưởng. Ảnh tối ưu WebP nằm trong `public/assets/rewards/storybook-v1/`; nội dung truyện trong `src/lib/reward-stories.ts`.
