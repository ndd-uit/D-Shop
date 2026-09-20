# P03 - Booking & Payment

P03 mô tả cách Customer chọn một hoặc nhiều item trong RentalCart để checkout, D-SHOP giữ tạm toàn bộ RentalUnit tương ứng và xác nhận đơn sau khi thanh toán tiền thuê thành công.

## Actors

- Customer
- D-SHOP
- Payment Service

## Main Flow

```mermaid
sequenceDiagram
    actor Customer
    participant UI as Customer UI
    participant Controller as Rental Controller
    participant Service as Rental Service
    participant Repository as Rental Repository
    participant DB as Database
    participant Payment as Payment Service

    Customer->>UI: Chọn RentalCartItem và xác nhận checkout
    UI->>Controller: POST checkout(selectedCartItemIds)
    Controller->>Service: checkout(customerId, selectedCartItemIds)
    Service->>Repository: Đọc giỏ và các item được chọn
    Repository->>DB: Query RentalCart/RentalCartItem

    Service->>Service: Kiểm tra cùng rental period
    Service->>Repository: Phân bổ RentalUnit cho toàn bộ item được chọn
    Repository->>DB: Transaction: kiểm tra overlap và tạo dữ liệu

    alt Tất cả item được chọn còn khả dụng
        DB-->>Repository: RentalOrder + Temporary Hold
        Note over Service,DB: holdExpiresAt = now + policy.holdDuration<br/>Item không chọn vẫn ở giỏ
        Repository-->>Service: Checkout thành công
        Service-->>Controller: RentalOrder
        Controller-->>UI: Thông tin thanh toán
        UI-->>Customer: Hiển thị tiền thuê theo toàn bộ ngày thuê

        Customer->>UI: Yêu cầu thanh toán tiền thuê
        UI->>Controller: POST create payment
        Controller->>Service: Tạo payment request
        Service->>Payment: Tạo yêu cầu thanh toán
        Payment-->>Customer: Hiển thị thông tin thanh toán
        Customer->>Payment: Thực hiện thanh toán
        Payment-->>Controller: Callback/IPN
        Controller->>Service: Xác minh và ghi nhận kết quả

        alt Thanh toán thành công và hold còn hiệu lực
            Service->>Repository: Xác nhận Payment/Reservation/Order
            Repository->>DB: Transaction cập nhật trạng thái
            Service-->>UI: Đặt thuê thành công
        else Thanh toán thất bại
            Service->>Repository: Ghi nhận giao dịch thất bại
            Service-->>UI: Thanh toán thất bại
        else Temporary Hold đã hết hạn
            Service->>Repository: Expire/giải phóng Reservation
            Repository->>DB: Transaction cập nhật
            Service-->>UI: Giữ chỗ đã hết hạn
        end

    else Có ít nhất một item được chọn không còn khả dụng
        DB-->>Repository: Conflict
        Repository-->>Service: Không thể phân bổ đủ
        Service-->>Controller: Từ chối toàn bộ nhóm item được chọn
        Controller-->>UI: Conflict; không tạo đơn một phần
    end
```
