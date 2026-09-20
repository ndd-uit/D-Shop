# Business Decision 004: Customer Cancellation Scope

## Status

Accepted

## Context

D-SHOP tập trung vào quy trình thuê trang phục từ đặt thuê đến hoàn trả và quyết toán.

Quy trình Customer chủ động gửi yêu cầu hủy đơn làm phát sinh thêm nhiều nhánh nghiệp vụ liên quan đến:

- thời điểm được phép hủy;
- phí hủy;
- số tiền hoàn;
- giải phóng Reservation;
- xử lý Payment và Refund;
- phê duyệt của Store Manager.

## Decision

Customer Cancellation Request không thuộc phạm vi chức năng của D-SHOP trong baseline hiện tại.

Customer không được chủ động tạo yêu cầu hủy RentalOrder thông qua hệ thống.

## Scope Impact

Hệ thống không yêu cầu:

- CancellationRequest;
- quy trình duyệt yêu cầu hủy;
- tính cancellation fee;
- cancellation refund;
- trạng thái xử lý dành riêng cho Customer Cancellation.

Các trường hợp vận hành đặc biệt nếu có sẽ được xử lý ngoài phạm vi của chức năng Customer Cancellation.

## Consequences

- Giảm độ phức tạp của workflow RentalOrder.
- Không cần triển khai các Use Case liên quan đến Customer Cancellation.
- Không đưa CancellationRequest vào Domain Model, ERD và Traceability Matrix.
