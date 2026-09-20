# TO-BE Process

TO-BE mô tả quy trình thuê trang phục sau khi triển khai hệ thống D-SHOP.

## Main Flow

1. Customer tìm kiếm trang phục và chọn thời gian thuê.
2. Hệ thống kiểm tra khả dụng theo từng `RentalUnit`.
3. Hệ thống tạo temporary hold theo nguyên tắc atomic cho toàn bộ item được chọn.
4. Customer thanh toán tiền thuê.
5. Hệ thống xác nhận RentalOrder và Reservation.
6. Rental Staff chuẩn bị trang phục.
7. Customer đến cửa hàng nhận trang phục.
8. Staff kiểm tra thông tin, thu tiền cọc và xác nhận bàn giao.
9. Hệ thống theo dõi thời gian thuê và trạng thái quá hạn.
10. Customer hoàn trả trang phục.
11. Staff kiểm tra tình trạng và ghi nhận phí phát sinh nếu có.
12. Hệ thống thực hiện quyết toán tiền cọc.
13. RentalOrder được hoàn tất.

## Exception Flows

- Sau 18:00 ngày nhận mà chưa bàn giao: xử lý `NO_SHOW`, giải phóng Reservation và không tiếp tục chuẩn bị/bàn giao.
- Cửa hàng không thể cung cấp RentalUnit đã cam kết và không thay thế được: xử lý `FULFILLMENT_FAILED`, giải phóng Reservation và ghi nhận hoàn toàn bộ tiền thuê.
- Customer trả sau `returnDueAt`: đơn chuyển `OVERDUE`; phí trễ được tính theo policy snapshot của đơn.

## Key Controls

- Mỗi RentalOrder sử dụng một khoảng thời gian thuê chung.
- Availability được kiểm tra theo từng RentalUnit.
- Temporary hold có thời hạn mặc định 15 phút.
- Hai Reservation hiệu lực trên cùng RentalUnit không được có khoảng khóa giao nhau.
- Thanh toán ban đầu chỉ thu tiền thuê.
- Tiền cọc được thu trước khi bàn giao.
- Phí vượt ngưỡng phải được Store Manager phê duyệt.
- Các thao tác ảnh hưởng đến Order, Reservation và lịch phải đảm bảo tính atomic.
- RentalOrder có thể hoàn tất về tài chính trước khi buffer kết thúc; Reservation vẫn giữ lịch đến `blockedEndAt` và chỉ được job vòng đời chuyển `COMPLETED` sau thời điểm đó.
