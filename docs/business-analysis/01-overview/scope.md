# Vision & Scope

## Vision

D-SHOP là hệ thống thương mại điện tử hỗ trợ cửa hàng cho thuê trang phục theo lịch, giúp quản lý chính xác từng `RentalUnit`, ngăn đặt trùng và theo dõi toàn bộ vòng đời của đơn thuê.

## In Scope

Hệ thống hiện hỗ trợ:

- đăng ký, đăng nhập và phân quyền;
- quản lý Category, Garment và RentalUnit;
- tìm kiếm và kiểm tra khả dụng theo lịch;
- quản lý giỏ thuê;
- tạo giữ chỗ tạm thời;
- tạo RentalOrder;
- thanh toán tiền thuê;
- chuẩn bị và bàn giao trang phục;
- ghi nhận tiền cọc;
- theo dõi thời gian thuê và đơn quá hạn;
- tiếp nhận hoàn trả;
- kiểm tra tình trạng trang phục;
- ghi nhận bằng chứng;
- tính phí trả trễ và phí hư hỏng;
- phê duyệt phí vượt ngưỡng;
- quyết toán và hoàn tiền cọc;
- quản lý AvailabilityBlock;
- báo cáo vận hành cơ bản.

## Out of Scope

Phiên bản hiện tại không bao gồm:

- nhiều chi nhánh;
- giao hàng và tích hợp đơn vị vận chuyển;
- loyalty program;
- voucher và khuyến mãi phức tạp;
- chat realtime;
- AI gợi ý trang phục;
- AR thử đồ;
- kế toán và thuế chuyên sâu;
- Customer Cancellation Request.

## Key Constraints

- Mỗi RentalUnit có mã tài sản duy nhất.
- Mỗi RentalOrder sử dụng một khoảng thời gian thuê chung.
- Temporary hold có thời hạn mặc định 15 phút.
- Không cho phép hai Reservation hiệu lực có khoảng khóa giao nhau trên cùng RentalUnit.
- Dữ liệu thời gian sử dụng timezone `Asia/Ho_Chi_Minh`.
- Các thao tác ảnh hưởng đến Order, Reservation và lịch phải đảm bảo tính atomic.
