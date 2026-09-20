# Rental Staff Use Cases

## UC-010 - Chuẩn bị đơn thuê

**Actor:** Rental Staff

**Goal:** Chuẩn bị đầy đủ trang phục trước thời điểm bàn giao.

**Pre-condition:**

- RentalOrder đã được xác nhận.
- RentalUnit đã được phân bổ.

**Post-condition:**

- Trang phục sẵn sàng để bàn giao.

**Main Flow:**

1. Staff xem danh sách đơn cần chuẩn bị.
2. Staff kiểm tra RentalUnit được phân bổ.
3. Staff kiểm tra tình trạng trang phục và phụ kiện.
4. Staff ghi nhận thông tin cần thiết trước bàn giao.
5. Hệ thống cập nhật trạng thái chuẩn bị.

**Exceptions:**

- RentalUnit không đủ điều kiện: Staff yêu cầu thay thế bằng RentalUnit khác còn khả dụng trong cùng khoảng khóa.
- Không có RentalUnit thay thế: Staff ghi nhận `FULFILLMENT_FAILED`; hệ thống giải phóng Reservation và tạo nghĩa vụ hoàn toàn bộ tiền thuê đã thanh toán.
- Đã quá 18:00 ngày nhận và chưa bàn giao: hệ thống từ chối thao tác chuẩn bị.

---

## UC-011 - Ghi nhận tiền cọc và bàn giao

**Actor:** Rental Staff

**Goal:** Xác nhận Customer đã đáp ứng điều kiện nhận trang phục.

**Pre-condition:**

- RentalOrder đã sẵn sàng bàn giao.
- Customer đến nhận trang phục.

**Post-condition:**

- Tiền cọc được ghi nhận.
- Trang phục được bàn giao.
- RentalUnit chuyển sang trạng thái RENTED.

**Main Flow:**

1. Staff kiểm tra thông tin RentalOrder.
2. Staff xác nhận Customer và trang phục cần bàn giao.
3. Staff thu và ghi nhận tiền cọc.
4. Staff xác nhận bàn giao.
5. Hệ thống ghi nhận thời điểm nhận thực tế.
6. Hệ thống cập nhật trạng thái RentalOrder và RentalUnit.

**Exceptions:**

- Tiền cọc chưa được ghi nhận đầy đủ.
- Trang phục không đủ điều kiện bàn giao.
- Đã quá 18:00 ngày nhận: hệ thống từ chối bàn giao; Staff xử lý `NO_SHOW` nếu thỏa điều kiện.

---

## UC-012 - Theo dõi đơn đang thuê và quá hạn

**Actor:** Rental Staff

**Goal:** Theo dõi các RentalOrder đang trong thời gian thuê.

**Main Flow:**

1. Staff xem danh sách đơn đang thuê.
2. Hệ thống hiển thị thời hạn trả.
3. Hệ thống xác định các đơn đã vượt `returnDueAt`.
4. Staff theo dõi và xử lý các đơn quá hạn theo quy trình.

---

## UC-013 - Tiếp nhận hoàn trả và kiểm tra

**Actor:** Rental Staff

**Goal:** Ghi nhận việc Customer hoàn trả và kiểm tra tình trạng RentalUnit.

**Pre-condition:**

- RentalUnit đang trong trạng thái RENTED.

**Post-condition:**

- Thời gian trả thực tế được ghi nhận.
- Kết quả kiểm tra được lưu.

**Main Flow:**

1. Customer hoàn trả trang phục.
2. Staff ghi nhận thời gian trả thực tế.
3. Staff kiểm tra RentalUnit và phụ kiện.
4. Staff ghi nhận tình trạng sau thuê.
5. Staff ghi nhận mô tả và bằng chứng nếu cần.
6. Hệ thống lưu kết quả inspection.

**Alternative Flow:**

- Trang phục cần vệ sinh.
- Trang phục cần bảo trì.
- Trang phục bị hư hỏng.
- Trang phục không còn khả năng tiếp tục cho thuê.

---

## UC-014 - Ghi nhận phí phát sinh

**Actor:** Rental Staff

**Goal:** Ghi nhận các khoản phí phát sinh sau khi hoàn trả.

**Pre-condition:**

- Đã có kết quả kiểm tra hoàn trả.

**Main Flow:**

1. Hệ thống xác định phí trả trễ nếu có.
2. Staff ghi nhận phí hư hỏng hoặc mất phụ kiện nếu có.
3. Hệ thống tính tổng phí phát sinh.
4. Hệ thống kiểm tra ngưỡng phê duyệt.

**Alternative Flow:**

- Nếu phí vượt ngưỡng, khoản phí được chuyển cho Store Manager phê duyệt.

---

## UC-016 - Quyết toán và hoàn tiền cọc

**Actor:** Rental Staff

**Goal:** Hoàn tất các nghĩa vụ tài chính của RentalOrder.

**Pre-condition:**

- Việc kiểm tra hoàn trả đã hoàn tất.
- Các khoản phí cần phê duyệt đã được xử lý.

**Post-condition:**

- Số tiền hoàn cọc hoặc khoản cần thu thêm được xác định.
- RentalOrder được hoàn tất khi các nghĩa vụ tài chính đã được xử lý.

**Main Flow:**

1. Hệ thống tổng hợp tiền cọc và phí phát sinh.
2. Hệ thống tính số tiền cần hoàn hoặc thu thêm.
3. Staff xử lý quyết toán.
4. Hệ thống ghi nhận kết quả.
5. Hệ thống hoàn tất RentalOrder khi đủ điều kiện.

**Operational Notes:**

- Refund được theo dõi bằng bản ghi Refund; việc chuyển tiền thực tế có thể do Staff xử lý theo phương thức vận hành được hỗ trợ.
- Nếu tổng phí vượt tiền cọc, Staff ghi nhận khoản thu thêm trước khi hoàn tất đơn.
- RentalOrder hoàn tất không làm Reservation kết thúc sớm; Reservation tiếp tục giữ lịch đến `blockedEndAt`.

---

## UC-018 - Xử lý Customer không đến nhận

**Actor:** Rental Staff

**Goal:** Đóng đúng một đơn chưa bàn giao sau cutoff ngày nhận.

**Pre-condition:**

- RentalOrder thuộc trạng thái trước bàn giao hợp lệ.
- Chưa có `actualPickupAt` và chưa ghi nhận tiền cọc.
- Thời điểm xử lý đã sau 18:00 ngày nhận theo `Asia/Ho_Chi_Minh`.

**Post-condition:**

- RentalOrder ở trạng thái `NO_SHOW`.
- Reservation được giải phóng và RentalUnit được tính lại trạng thái vận hành.

**Main Flow:**

1. Staff mở đơn quá cutoff.
2. Hệ thống kiểm tra trạng thái, thời gian, bàn giao và tiền cọc.
3. Staff xác nhận Customer không đến nhận.
4. Hệ thống cập nhật `NO_SHOW` và giải phóng Reservation trong cùng transaction.

**Exception:** Hệ thống từ chối nếu còn trước cutoff, đơn đã bàn giao hoặc đã có dấu hiệu thu cọc.

---

## UC-019 - Xử lý cửa hàng không thể cung cấp đơn

**Actor:** Rental Staff

**Goal:** Kết thúc đúng một đơn mà cửa hàng không thể bàn giao sau khi không thể thay thế RentalUnit.

**Pre-condition:**

- RentalOrder chưa được bàn giao.
- RentalUnit đã phân bổ không thể cung cấp.
- Không có RentalUnit cùng Garment, đúng size và khả dụng trong toàn bộ blocked interval để thay thế.

**Main Flow:**

1. Rental Staff kiểm tra RentalUnit cũ, lý do và kết quả tìm unit thay thế.
2. Rental Staff ghi nhận `FULFILLMENT_FAILED` và lý do.
3. Hệ thống giải phóng Reservation và cập nhật khả dụng trong cùng transaction nghiệp vụ.
4. Hệ thống khởi tạo/ghi nhận hoàn toàn bộ tiền thuê Customer đã thanh toán.

**Post-condition:** RentalOrder ở `FULFILLMENT_FAILED`; không còn Reservation hiệu lực của đơn; nghĩa vụ hoàn tiền thuê được theo dõi.
