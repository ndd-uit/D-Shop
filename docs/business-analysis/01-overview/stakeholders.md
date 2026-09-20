# Stakeholders

D-SHOP có 4 stakeholder chính.

| Stakeholder | Vai trò | Nhu cầu chính |
| --- | --- | --- |
| Customer | Người thuê trang phục | Tìm kiếm, kiểm tra khả dụng, đặt thuê, thanh toán và theo dõi đơn |
| Rental Staff | Nhân viên vận hành | Chuẩn bị, bàn giao, nhận trả, kiểm tra và xử lý phí |
| Store Manager | Người quản lý cửa hàng | Quản lý trang phục, nhân viên, chính sách và báo cáo |
| Payment Service | Dịch vụ thanh toán bên ngoài | Xử lý giao dịch thanh toán điện tử |

## Customer

Customer cần:

- tìm trang phục theo nhu cầu;
- biết chính xác trang phục có khả dụng hay không;
- tạo đơn thuê và thanh toán;
- theo dõi trạng thái đơn;
- xem phí phát sinh và kết quả quyết toán.

Customer không trực tiếp quản lý `RentalUnit`, chính sách thuê hoặc phí phát sinh.

## Rental Staff

Rental Staff chịu trách nhiệm:

- theo dõi đơn cần xử lý;
- chuẩn bị và bàn giao trang phục;
- ghi nhận tiền cọc;
- tiếp nhận hoàn trả;
- kiểm tra tình trạng trang phục;
- ghi nhận bằng chứng và đề xuất phí.

## Store Manager

Store Manager chịu trách nhiệm:

- quản lý danh mục, Garment và RentalUnit;
- quản lý Rental Staff;
- quản lý chính sách thuê;
- phê duyệt phí vượt ngưỡng;
- theo dõi vận hành và báo cáo.

## Payment Service

Payment Service hỗ trợ:

- tiếp nhận yêu cầu thanh toán;
- trả kết quả giao dịch;
- cung cấp thông tin phục vụ đối soát.
