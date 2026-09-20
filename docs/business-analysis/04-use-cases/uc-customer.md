# Customer Use Cases

## UC-001 - Đăng ký và đăng nhập

**Actor:** Customer

**Goal:** Customer có thể truy cập các chức năng yêu cầu tài khoản.

**Pre-condition:**

- Customer chưa đăng nhập.

**Post-condition:**

- Customer đăng nhập thành công và có phiên làm việc hợp lệ.

**Main Flow:**

1. Customer nhập thông tin đăng nhập.
2. Hệ thống kiểm tra thông tin.
3. Hệ thống xác thực thành công.
4. Customer được truy cập các chức năng phù hợp.

**Exceptions:**

- Thông tin đăng nhập không hợp lệ.
- Tài khoản không hoạt động.

---

## UC-002 - Tìm kiếm và lọc trang phục

**Actor:** Customer

**Goal:** Tìm được trang phục phù hợp với nhu cầu thuê.

**Main Flow:**

1. Customer nhập tiêu chí tìm kiếm.
2. Customer chọn danh mục, size, giá hoặc thời gian thuê.
3. Hệ thống trả về danh sách Garment phù hợp.

---

## UC-003 - Kiểm tra availability

**Actor:** Customer

**Goal:** Xác định trang phục có thể thuê trong khoảng thời gian yêu cầu.

**Pre-condition:**

- Customer đã chọn thời gian thuê hợp lệ.

**Post-condition:**

- Hệ thống trả về các Garment có RentalUnit khả dụng.

**Main Flow:**

1. Customer chọn ngày nhận và ngày trả.
2. Hệ thống chuẩn hóa khoảng thời gian thuê.
3. Hệ thống kiểm tra RentalUnit.
4. Hệ thống loại các RentalUnit có Reservation hoặc AvailabilityBlock xung đột.
5. Hệ thống hiển thị kết quả khả dụng.

---

## UC-004 - Quản lý giỏ thuê

**Actor:** Customer

**Goal:** Chuẩn bị các trang phục cần thuê trước khi checkout.

**Main Flow:**

1. Customer thêm trang phục vào giỏ.
2. Customer cập nhật hoặc xóa item nếu cần.
3. Hệ thống kiểm tra lại availability.
4. Hệ thống cập nhật giỏ thuê.

---

## UC-005 - Tạo đơn thuê

**Actor:** Customer

**Goal:** Tạo RentalOrder cho một hoặc nhiều item được Customer chọn từ RentalCart.

**Pre-condition:**

- Customer đã đăng nhập.
- RentalCart có ít nhất một item.
- Customer đã chọn ít nhất một item để checkout.
- Các item được chọn sử dụng cùng khoảng thời gian thuê.

**Post-condition:**

- RentalOrder được tạo cho các item được chọn.
- Temporary Hold được tạo cho các RentalUnit tương ứng.
- Các item không được chọn tiếp tục nằm trong RentalCart.

**Main Flow:**

1. Customer chọn một hoặc nhiều item trong RentalCart.
2. Customer xác nhận checkout.
3. Hệ thống kiểm tra lại availability của toàn bộ item được chọn.
4. Hệ thống phân bổ RentalUnit cho từng item được chọn.
5. Hệ thống tạo Temporary Hold cho toàn bộ RentalUnit.
6. Hệ thống tạo RentalOrder.
7. Hệ thống loại các item đã checkout khỏi RentalCart.
8. Các item không được chọn tiếp tục được giữ trong RentalCart.
9. Customer được chuyển sang bước thanh toán.

**Alternative Flow:**

- Nếu bất kỳ item được chọn nào không còn khả dụng, hệ thống không tạo RentalOrder và không checkout một phần các item được chọn.

---

## UC-006 - Thanh toán tiền thuê

**Actors:** Customer, Payment Service

**Goal:** Thanh toán tiền thuê để xác nhận đơn.

**Pre-condition:**

- RentalOrder đã được tạo.
- Temporary hold còn hiệu lực.

**Post-condition:**

- Giao dịch được ghi nhận.
- Reservation được xác nhận khi thanh toán hợp lệ.

**Main Flow:**

1. Customer chọn thanh toán.
2. Hệ thống tạo yêu cầu thanh toán.
3. Payment Service xử lý giao dịch.
4. Hệ thống nhận kết quả.
5. Hệ thống cập nhật Payment và RentalOrder.

**Exceptions:**

- Thanh toán thất bại.
- Temporary hold hết hạn trước khi hoàn tất thanh toán.

---

## UC-007 - Theo dõi đơn thuê

**Actor:** Customer

**Goal:** Theo dõi tình trạng RentalOrder và các khoản tài chính liên quan.

**Main Flow:**

1. Customer mở danh sách đơn thuê.
2. Hệ thống hiển thị trạng thái đơn.
3. Customer xem chi tiết đơn.
4. Hệ thống hiển thị tiền thuê, tiền cọc, phí phát sinh và kết quả quyết toán nếu có.

---

## UC-AI-001 - Hỗ trợ bằng AI Chatbot

**Actor:** Customer

**Status:** Planned

**Goal:** Hỗ trợ Customer tra cứu thông tin và hướng dẫn sử dụng D-SHOP.

**Planned Scope:**

- thông tin trang phục;
- chính sách thuê;
- hướng dẫn đặt thuê;
- hướng dẫn thanh toán;
- hướng dẫn sử dụng hệ thống.
