# Store Manager Use Cases

## UC-008 - Quản lý Category, Garment và RentalUnit

**Actor:** Store Manager

**Goal:** Quản lý danh mục, mẫu trang phục và từng RentalUnit vật lý.

**Main Flow:**

1. Store Manager xem danh sách Category, Garment và RentalUnit.
2. Store Manager tạo mới hoặc cập nhật thông tin.
3. Store Manager quản lý giá thuê, tiền cọc, size và trạng thái RentalUnit.
4. Hệ thống lưu thay đổi.

**Exceptions:**

- Dữ liệu không hợp lệ.
- Mã tài sản RentalUnit bị trùng.
- Chỉ được retire RentalUnit đang ở `AVAILABLE`, `DAMAGED` hoặc `MAINTENANCE` và không có Reservation hiệu lực.

---

## UC-009 - Quản lý AvailabilityBlock

**Actor:** Store Manager

**Goal:** Khóa RentalUnit trong các khoảng thời gian không thể cho thuê.

**Main Flow:**

1. Store Manager chọn RentalUnit.
2. Store Manager nhập khoảng thời gian cần khóa.
3. Store Manager chọn lý do như vệ sinh, bảo trì, sửa chữa hoặc khóa thủ công.
4. Hệ thống kiểm tra xung đột.
5. Hệ thống tạo AvailabilityBlock.

**Exceptions:**

- Khoảng thời gian không hợp lệ.
- Block xung đột với điều kiện nghiệp vụ không cho phép.

---

## UC-015 - Phê duyệt phí vượt ngưỡng

**Actor:** Store Manager

**Goal:** Xem xét các khoản phí vượt ngưỡng phê duyệt của Rental Staff.

**Pre-condition:**

- Đã có khoản phí phát sinh cần phê duyệt.

**Post-condition:**

- Khoản phí được phê duyệt hoặc từ chối.

**Main Flow:**

1. Store Manager xem yêu cầu phê duyệt.
2. Store Manager xem kết quả kiểm tra và bằng chứng liên quan.
3. Store Manager xem số tiền được đề xuất.
4. Store Manager phê duyệt hoặc từ chối.
5. Hệ thống lưu quyết định và người thực hiện.

---

## UC-017 - Xem báo cáo vận hành

**Actor:** Store Manager

**Goal:** Theo dõi tình hình vận hành và kinh doanh của cửa hàng.

**Main Flow:**

1. Store Manager truy cập trang báo cáo.
2. Hệ thống tổng hợp dữ liệu.
3. Hệ thống hiển thị các thông tin như:
   - số lượng đơn thuê;
   - trạng thái đơn;
   - doanh thu;
   - phí phát sinh;
   - tình trạng RentalUnit.
