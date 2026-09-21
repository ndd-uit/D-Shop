# Business Processes

D-SHOP gồm 7 quy trình nghiệp vụ chính.

## P01 - Quản lý vòng đời trang phục

Quản lý Category, Garment và từng RentalUnit vật lý.

RentalUnit được theo dõi xuyên suốt các trạng thái như:

- AVAILABLE;
- PREPARING;
- RENTED;
- RETURN_INSPECTION;
- CLEANING;
- MAINTENANCE;
- DAMAGED;
- RETIRED.

Store Manager chỉ retire RentalUnit đang ở `AVAILABLE`, `DAMAGED` hoặc `MAINTENANCE` khi unit không có Reservation hiệu lực.

## P02 - Tìm kiếm và kiểm tra khả dụng

Customer chọn trang phục, size và thời gian thuê.

Hệ thống kiểm tra:

- trạng thái RentalUnit;
- Reservation đang hiệu lực;
- khoảng buffer;
- AvailabilityBlock.

Chỉ các RentalUnit đủ điều kiện mới được xem là khả dụng.

## P03 - Đặt thuê, giữ chỗ và thanh toán

Customer chọn một hoặc nhiều item trong giỏ để tạo đơn thuê.

Hệ thống:

1. kiểm tra lại availability;
2. phân bổ RentalUnit;
3. tạo temporary hold;
4. tạo RentalOrder;
5. xử lý thanh toán tiền thuê;
6. xác nhận Reservation khi thanh toán hợp lệ.

Nhóm item được chọn được checkout theo nguyên tắc atomic: nếu không giữ được toàn bộ item được chọn thì không tạo đơn; item không được chọn vẫn ở trong giỏ.

## P04 - Chuẩn bị đơn thuê

Rental Staff theo dõi các đơn sắp đến ngày nhận.

Staff:

- kiểm tra RentalUnit;
- chuẩn bị trang phục và phụ kiện;
- ghi nhận tình trạng trước khi bàn giao;
- cập nhật trạng thái chuẩn bị.

Nếu RentalUnit đã phân bổ không đủ điều kiện, Rental Staff thử thay thế bằng RentalUnit khả dụng khác. Nếu cửa hàng vẫn không thể cung cấp đơn, Rental Staff ghi nhận `FULFILLMENT_FAILED`; hệ thống giải phóng Reservation và ghi nhận hoàn toàn bộ tiền thuê đã thanh toán.

## P05 - Thu cọc và bàn giao trang phục

Khi Customer đến nhận:

1. Staff kiểm tra thông tin đơn.
2. Staff thu và ghi nhận tiền cọc.
3. Staff xác nhận bàn giao.
4. RentalUnit chuyển sang trạng thái RENTED.

Nếu chưa bàn giao trước 18:00 ngày nhận, hệ thống không cho tiếp tục chuẩn bị/bàn giao. Staff có thể ghi nhận `NO_SHOW`; đây không phải Customer Cancellation.

## P06 - Hoàn trả và kiểm tra trang phục

Khi Customer trả trang phục:

- Staff ghi nhận thời gian trả thực tế;
- kiểm tra tình trạng RentalUnit;
- ghi nhận trả trễ hoặc hư hỏng;
- lưu mô tả và bằng chứng;
- phân loại RentalUnit từ `RETURN_INSPECTION` sang `CLEANING`, `MAINTENANCE` hoặc `DAMAGED`.

Baseline hiện tại không chuyển trực tiếp RentalUnit từ `RETURN_INSPECTION` sang `AVAILABLE` hoặc `RETIRED`.

## P07 - Quyết toán, phê duyệt phí và hoàn tất đơn

Hệ thống tính các khoản phát sinh như:

- phí trả trễ;
- phí hư hỏng;
- phí mất phụ kiện.

Rental Staff xử lý các khoản trong phạm vi được phép.

Khoản phí vượt ngưỡng phải được Store Manager phê duyệt.

Sau khi các khoản phí được xử lý, hệ thống tính số tiền cọc cần hoàn hoặc số tiền Customer phải thanh toán thêm và hoàn tất RentalOrder. Việc hoàn/thu thêm được ghi nhận trong hệ thống theo phương thức vận hành được hỗ trợ; baseline hiện tại không cam kết Payment Service tự động xử lý refund.
