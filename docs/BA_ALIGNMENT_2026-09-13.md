# Đồng bộ BA và code — đợt sửa kỹ thuật 13/09/2026

## Phạm vi đã sửa

### 1. Tự động cập nhật vòng đời đơn thuê

- `app.js` thực sự gọi job khi HTTP server bắt đầu lắng nghe; trước đây chỉ import.
- Chạy ngay lúc khởi động và lặp lại mỗi 60 giây khi tiến trình backend hoạt động.
- Ba tác vụ: hết hạn đơn chờ thanh toán/giữ chỗ; đánh dấu đơn đang thuê quá hạn; hoàn tất reservation của đồ đã trả sau khi hết buffer.
- Một tác vụ lỗi không ngăn hai tác vụ còn lại. Tick chồng nhau trong cùng tiến trình bị bỏ qua; gọi start nhiều lần không tạo nhiều timer.
- Đánh dấu quá hạn kiểm tra lại `RENTING`, chưa trả, và `returnDueAt < now` ngay tại UPDATE. Nếu có nhân viên nhận trả hoặc worker khác đã xử lý thì không ghi đè và không ghi trùng lịch sử OVERDUE.
- Log lỗi job chỉ ghi tên tác vụ, không in lỗi DB gốc/chuỗi kết nối.
- Không thay đổi cách tính phí trễ, không tự thu tiền, không tự chuyển RentalUnit sang AVAILABLE khi kết thúc buffer.

Giới hạn: timer trong backend không chạy khi tiến trình dừng hoặc bị nền tảng tạm ngưng. Chạy lại sẽ xử lý bù. Nếu cần cam kết thực thi theo phút liên tục thì cần worker/scheduler độc lập; thay đổi này chưa cấu hình hạ tầng đó. Test sử dụng DB giả lập, chưa xác minh concurrency với DB deploy.

### 2. Ảnh bằng chứng mới tách khỏi ảnh sản phẩm

- Ảnh sản phẩm vẫn ở bucket `garments`, không đổi.
- File bằng chứng mới dùng bucket riêng `SUPABASE_EVIDENCE_BUCKET` (mặc định `rental-evidence`). Backend từ chối upload/cấp link nếu bucket không tồn tại hoặc không phải private.
- DB lưu tham chiếu bền vững `evidence://<orderId>/<uuid>.<ext>`, không lưu link ký đã hết hạn.
- Chỉ cấp link xem có hạn 5 phút sau khi kiểm tra quyền đọc đơn; customer phải là chủ đơn, staff/manager theo quyền hiện tại. Danh sách duyệt phí của manager cũng được cấp link theo từng đơn.
- API đọc chứa link ký trả `Cache-Control: private, no-store`. Link hết hạn thì tải lại dữ liệu màn hình để nhận link mới.
- Chỉ nhận file qua multipart; không nhận URL hoặc storage path do client tự nhập vào các trường bằng chứng. Chặn tham chiếu chéo đơn, đường dẫn không hợp lệ, nội dung file giả MIME.
- Upload lỗi giữa chừng dọn các file vừa upload thành công của chính request đó. Gửi lại thao tác chuẩn bị đã hoàn tất cũng dọn file mới không được sử dụng.

Lưu ý bảo mật: signed URL là bearer link, người có link có thể xem trong thời hạn của nó. Kiểm tra quyền xảy ra khi cấp link, không phải mỗi lần trình duyệt tải ảnh. Đây là cơ chế [private bucket và signed URL của Supabase](https://supabase.com/docs/guides/storage/buckets/fundamentals).

**Ảnh bằng chứng cũ đã public chưa được bảo vệ hồi tố.** API vẫn đọc URL HTTPS cũ để không làm mất bằng chứng phục vụ kiểm tra/quyết toán. Muốn xử lý triệt để phải kiểm kê, copy đúng ảnh bằng chứng sang private, cập nhật tham chiếu DB, xác minh rồi mới xử lý bản public cũ. Không đổi toàn bộ bucket sản phẩm thành private. Đợt này không chạy di chuyển/xóa Storage objects.

### 3. Báo cáo trạng thái đơn

Bổ sung `RETURNED`, `INSPECTING`, `SETTLEMENT_PENDING`, `EXPIRED`. Báo cáo bao phủ cả 13 trạng thái hiện hành; tổng các nhóm bằng tổng số đơn trong kỳ. FE đã có nhãn tiếng Việt cho các trạng thái này nên không cần sửa UI.

## Chuẩn bị deploy

1. Tạo bucket Storage riêng `rental-evidence` với Public **tắt**. Kiểm tra không có policy SELECT rộng cho anon/authenticated vô tình cho phép đọc bucket này; ứng dụng cấp link bằng service-role ở backend.
2. Thêm `SUPABASE_EVIDENCE_BUCKET=rental-evidence` vào env backend (local khi cần thử upload và Render khi deploy). Giữ service-role key chỉ ở backend; không đưa vào `VITE_*`.
3. Không cần migration Prisma: tham chiếu ảnh dùng các cột Text hiện có; không đổi schema. Không dùng `db push`, không reset/seed DB.
4. Sau review, commit/push `backend-core` và deploy backend. Đợt sửa này không có thay đổi FE; các chỉnh sửa FE có sẵn trong worktree được giữ nguyên.
5. Kiểm tra sau deploy: job cập nhật trạng thái đơn đúng hạn; upload ảnh chuẩn bị/kiểm tra; manager xem ảnh khi duyệt phí; chủ đơn xem được dữ liệu còn khách khác bị từ chối; URL public không đọc được ảnh mới; link ký hết hạn rồi tải lại màn hình.

Chưa commit, push, deploy hay thực hiện smoke test trên dữ liệu thật trong đợt sửa local này.

## Những quyết định nghiệp vụ chưa tự thay đổi

| Mục | Cần chốt |
| --- | --- |
| Phí trễ | BA và code hiện cùng lấy toàn bộ rentalAmount làm cơ sở. Nếu đổi sang đơn giá/ngày, cần xác định policy mới và cách áp dụng cho đơn cũ; không âm thầm sửa số tiền lịch sử. |
| Quyền thay đồ/xử lý không thể cung ứng | Code đang cho staff thao tác; BA có đoạn giao manager. Chốt vai trò thực hiện/phê duyệt trước khi mở rộng quyền. |
| Utilization theo từng RentalUnit (FR-REP-04) | Hiện chưa có. Cần xác định đo thời gian thuê thực tế hay thời gian reservation chiếm lịch, có tính buffer/bảo trì hay không và mẫu số là gì. Biểu đồ trạng thái kho không thay thế chỉ số này. |
| Buffer khả dụng | Cần thống nhất ví dụ BR-13 với công thức ở FR/UC: so khoảng thuê mới với block cũ hay so hai khoảng đã cộng buffer. Không tự đổi thuật toán cấp đồ. |
| Đồng bộ tài liệu | ERD/bảng dữ liệu cũ còn cancellation và Payment ADDITIONAL, khác code hiện hành. BA.docx chưa được sửa trực tiếp trong đợt code này. |

RAG/chatbot là tính năng riêng, chưa triển khai trong đợt sửa lỗi này.

## Kiểm chứng local

- `npm test`: bao gồm các test cũ và test mới cho startup wiring, timer, chống tick trùng, phục hồi sau lỗi, điều kiện UPDATE quá hạn, báo cáo đủ trạng thái, private upload, cleanup, signed URL và quyền sở hữu đơn.
- `npx prisma validate`: kiểm tra schema, không sửa DB.
- Chưa kiểm thử luồng Storage bằng tài khoản Supabase thật; cần hoàn tất checklist deploy phía trên.
