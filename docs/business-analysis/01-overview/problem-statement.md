# Problem Statement

Cửa hàng hiện quản lý yêu cầu thuê, lịch trang phục, thanh toán, tiền cọc và hoàn trả qua nhiều kênh khác nhau như Facebook, Zalo, điện thoại và bảng tính.

Dữ liệu phân tán và cập nhật thủ công dẫn đến:

- khó kiểm tra chính xác trang phục còn khả dụng;
- có nguy cơ đặt trùng cùng một `RentalUnit`;
- khó theo dõi trạng thái đơn thuê và trạng thái trang phục;
- dễ bỏ sót đơn sắp nhận hoặc quá hạn;
- khó đối chiếu tiền thuê, tiền cọc, phí phát sinh và hoàn tiền;
- khó truy vết lịch sử xử lý khi xảy ra sai sót hoặc tranh chấp.

D-SHOP cần giải quyết việc quản lý lịch thuê và vòng đời từng `RentalUnit` trên một hệ thống tập trung, đồng thời chuẩn hóa toàn bộ quy trình từ đặt thuê đến hoàn trả và quyết toán.
