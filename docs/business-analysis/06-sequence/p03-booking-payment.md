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
    participant System as D-SHOP
    participant Payment as Payment Service

    Customer->>System: Chọn RentalCartItem và xác nhận checkout
    System->>System: Kiểm tra cùng khoảng thuê
    System->>System: Kiểm tra availability toàn bộ item được chọn

    alt Tất cả item được chọn còn khả dụng
        System->>System: Phân bổ RentalUnit
        System->>System: Tạo RentalOrder và Temporary Hold
        Note over System: holdExpiresAt = now + policy.holdDuration<br/>Item không chọn vẫn ở giỏ
        System-->>Customer: Hiển thị tiền thuê và thời hạn giữ chỗ

        Customer->>System: Yêu cầu thanh toán tiền thuê
        System->>Payment: Tạo yêu cầu thanh toán
        Payment-->>Customer: Hiển thị thông tin thanh toán
        Customer->>Payment: Thực hiện thanh toán
        Payment-->>System: Trả callback/IPN
        System->>System: Xác minh và ghi nhận kết quả

        alt Thanh toán thành công và hold còn hiệu lực
            System->>System: Xác nhận Payment, Reservation và RentalOrder
            System-->>Customer: Đặt thuê thành công
        else Thanh toán thất bại
            System->>System: Ghi nhận giao dịch thất bại
            System-->>Customer: Thanh toán thất bại
        else Temporary Hold đã hết hạn
            System->>System: Expire/giải phóng Reservation
            System-->>Customer: Giữ chỗ đã hết hạn
        end

    else Có ít nhất một item được chọn không còn khả dụng
        System-->>Customer: Từ chối toàn bộ nhóm item được chọn
        Note over System: Không tạo RentalOrder một phần
    end
```
