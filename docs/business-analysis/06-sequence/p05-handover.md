# P05 - Handover

P05 mô tả cách Rental Staff xác nhận tiền cọc và bàn giao RentalUnit cho Customer.

## Actors

- Rental Staff
- Customer
- D-SHOP

## Main Flow

```mermaid
sequenceDiagram
    actor Staff as Rental Staff
    actor Customer
    participant System as D-SHOP

    Customer->>Staff: Đến nhận trang phục
    Staff->>System: Tra cứu RentalOrder
    System-->>Staff: Hiển thị thông tin đơn và RentalUnit

    Staff->>System: Kiểm tra trạng thái đơn và cutoff 18:00
    Staff->>Customer: Xác nhận thông tin nhận thuê

    alt Đã quá cutoff và chưa bàn giao
        System-->>Staff: Từ chối thu cọc/bàn giao
        Staff->>System: Ghi nhận NO_SHOW
        System->>System: Kiểm tra chưa pickup/chưa thu cọc
        System->>System: Giải phóng Reservation
    else Còn trong thời gian bàn giao
        Staff->>System: Ghi nhận tiền cọc
        System->>System: Kiểm tra số tiền cọc

        alt Tiền cọc đã được ghi nhận đầy đủ
            Staff->>System: Xác nhận bàn giao RentalUnit
            System->>System: Ghi nhận actualPickupAt
            System->>System: RentalUnit = RENTED; RentalOrder = RENTING
            System-->>Staff: Xác nhận bàn giao thành công
            Staff-->>Customer: Bàn giao trang phục
        else Tiền cọc chưa đầy đủ
            System-->>Staff: Không cho phép xác nhận bàn giao
            Staff-->>Customer: Yêu cầu hoàn tất tiền cọc
        end
    end
```
