# P02 - Availability Check

P02 mô tả cách Customer kiểm tra khả dụng của Garment theo khoảng thời gian thuê và cách D-SHOP xác định RentalUnit có thể được phân bổ.

## Actors

- Customer
- D-SHOP

## Main Flow

```mermaid
sequenceDiagram
    actor Customer
    participant System as D-SHOP

    Customer->>System: Chọn Garment và ngày nhận/ngày trả
    System->>System: Kiểm tra khoảng thuê hợp lệ
    System->>System: Chuẩn hóa thời gian nhận 08:00 và trả 18:00
    System->>System: Tính requested blocked interval có buffer
    System->>System: Kiểm tra trạng thái RentalUnit
    System->>System: Kiểm tra Reservation hiệu lực bị overlap
    Note over System: existing.start < requested.end<br/>AND existing.end > requested.start
    System->>System: Kiểm tra AvailabilityBlock bị overlap

    alt Có ít nhất một RentalUnit khả dụng
        System-->>Customer: Hiển thị Garment/RentalUnit khả dụng
    else Không có RentalUnit khả dụng
        System-->>Customer: Thông báo không khả dụng
    end
```
