# Đồng bộ BA và code — đợt sửa kỹ thuật 13/09/2026

## Sửa bổ sung 14/09: kiểm tra đồ sau khi hết buffer

Job kết thúc reservation sau khi đồ đã nhận trả và hết buffer có thể chạy trước lúc staff lưu kiểm tra. Trước đây bước kiểm tra chỉ nhận ACTIVE nên báo lỗi dù đơn đang INSPECTING.

Đã sửa bước kiểm tra: chấp nhận duy nhất một reservation ACTIVE hoặc COMPLETED của đúng item trong đơn đã ghi actualReturnAt. Vẫn yêu cầu đơn INSPECTING, RentalUnit RETURN_INSPECTION và chưa có InspectionResult. Không chọn reservation RELEASED/EXPIRED/CONFIRMED/TEMPORARY_HOLD; nếu có nhiều ứng viên thì từ chối thay vì chọn tùy tiện. Giữ nguyên yêu cầu bằng chứng khi đề xuất phí.

Đơn đang mắc lỗi có thể thử lưu lại sau khi backend mới deploy, miễn còn đủ điều kiện trên. Không đổi COMPLETED về ACTIVE, không reset dữ liệu, không chạy lại policy. Lần sửa này chỉ cần deploy backend; chưa deploy hay sửa DB thật. Bộ test giả lập kiểm tra chuỗi nhận trả quá hạn → job hết buffer → kiểm tra, cùng các trường hợp từ chối.

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
| Phí trễ | Đã chốt và sửa local sang tiền thuê/ngày theo policy v3; xem phần bổ sung bên dưới. Cần deploy code rồi kích hoạt v3 trong DB, không sửa policy của đơn cũ. |
| Quyền thay đồ/xử lý không thể cung ứng | Code đang cho staff thao tác; BA có đoạn giao manager. Chốt vai trò thực hiện/phê duyệt trước khi mở rộng quyền. |
| Utilization theo từng RentalUnit (FR-REP-04) | Hiện chưa có. Cần xác định đo thời gian thuê thực tế hay thời gian reservation chiếm lịch, có tính buffer/bảo trì hay không và mẫu số là gì. Biểu đồ trạng thái kho không thay thế chỉ số này. |
| Buffer khả dụng | Cần thống nhất ví dụ BR-13 với công thức ở FR/UC: so khoảng thuê mới với block cũ hay so hai khoảng đã cộng buffer. Không tự đổi thuật toán cấp đồ. |
| Đồng bộ tài liệu | ERD/bảng dữ liệu cũ còn cancellation và Payment ADDITIONAL, khác code hiện hành. BA.docx chưa được sửa trực tiếp trong đợt code này. |

RAG/chatbot là tính năng riêng, chưa triển khai trong đợt sửa lỗi này.

## Kiểm chứng local

- `npm test`: bao gồm các test cũ và test mới cho startup wiring, timer, chống tick trùng, phục hồi sau lỗi, điều kiện UPDATE quá hạn, báo cáo đủ trạng thái, private upload, cleanup, signed URL và quyền sở hữu đơn.
- `npx prisma validate`: kiểm tra schema, không sửa DB.
- Chưa kiểm thử luồng Storage bằng tài khoản Supabase thật; cần hoàn tất checklist deploy phía trên.

## Bổ sung: phí trễ theo ngày — policy v3.0

Đã chốt: cơ sở phí trễ là **tổng tiền thuê một ngày của toàn bộ đồ trong đơn**, không phải tổng tiền thuê cả kỳ.

Nội dung thay thế cho P07, BR63.B/C, FR-SET14/15 và UC-RENT05 trong BA:

- `rentalDays`: số ngày lịch Việt Nam, tính cả ngày nhận và ngày trả dự kiến; không gồm buffer.
- `dailyRentalAmount = rentalAmount / rentalDays`, dùng số tiền và thời gian đã lưu trên đơn, không lấy giá Garment hiện tại.
- Trả đúng hạn: phí trễ bằng 0.
- Gọi `d` là số ngày lịch giữa ngày trả dự kiến và ngày trả thực tế. Trong ngày trễ thứ `d`, trả từ 08:00 đến đúng 12:00: hệ số `d − 0,5`; sau 12:00 đến 18:00: hệ số `d`.
- `lateFee = roundHalfUp(dailyRentalAmount × hệ số)`, chỉ làm tròn một lần đến đồng cuối cùng.
- Phí kiểm tra/hư hỏng vẫn tính riêng rồi cộng vào phí trễ; không dùng tiền cọc làm cơ sở.
- Không thay đổi ràng buộc giờ nhận trả của cửa hàng 08:00–18:00.

Ví dụ: 4 ngày × 80.000đ = 320.000đ. Sáng hôm sau/đúng 12:00: 40.000đ; sau 12:00: 80.000đ. Sáng ngày trễ thứ hai: 120.000đ; chiều: 160.000đ.

### Bảo toàn đơn lịch sử

- Policy mới dùng `basis: DAILY_RENTAL_AMOUNT`; policy cũ `RENTAL_AMOUNT` vẫn tính theo toàn kỳ và giữ ranh giới 12:00 cũ.
- Không sửa `policyId`, tổng tiền, khoản thu/hoàn hay kết quả quyết toán của đơn cũ.
- Script tạo v3 tại thời điểm chạy, đóng hiệu lực policy trước đó bằng `effectiveTo`; không sửa công thức cũ. Kế thừa holdDuration, approvalThreshold và damageFeePolicy hiện hành.
- Script chạy trong transaction Serializable, chạy lại không tạo trùng v3. Nếu đã có policy lên lịch tương lai hoặc timeline xung đột thì từ chối để review thủ công.
- UI quản lý hiển thị rõ cơ sở cả kỳ/ngày và mốc 12:00 theo policy, không hiển thị chung chung “giá thuê”.

### Triển khai bổ sung phí trễ

1. Deploy backend có hỗ trợ cả hai basis trước. Deploy frontend để cập nhật mô tả policy.
2. Sau khi backend mới hoạt động, chạy **một lần**, trong thư mục server với env trỏ đúng DB deploy:

   ```bash
   npm run policy:v3
   ```

3. Kiểm tra output version `v3.0`, basis `DAILY_RENTAL_AMOUNT`, thời điểm hiệu lực; màn hình policy phải thể hiện đúng phiên bản đang hoạt động. Nếu output `alreadyExists: true`, kiểm tra timeline hiện tại, không hiểu mặc định là v3 vẫn active.
4. Đơn tạo sau khi kích hoạt phải gắn policy mới; đơn cũ giữ policy đã gắn. Test ví dụ 4 ngày nêu trên với đơn mới.

Không có schema migration mới. Không chạy lại seed/reset hay script policy:v2. **Chỉ deploy code mà chưa kích hoạt policy trong DB thì đơn mới vẫn có thể lấy policy cũ.** Script kích hoạt chưa được chạy trên DB thật trong lần sửa local này. BA.docx chưa chỉnh trực tiếp; nội dung thay thế ở trên để đưa vào tài liệu gốc.
