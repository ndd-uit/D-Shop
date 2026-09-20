# P02 - Availability Check

P02 mô tả cách Customer kiểm tra khả dụng của Garment theo khoảng thời gian thuê và cách D-SHOP xác định RentalUnit có thể được phân bổ.

## Actors

- Customer
- D-SHOP

## Main Flow

```mermaid
sequenceDiagram
    actor Customer
    participant UI as Customer UI
    participant Controller as Availability Controller
    participant Service as Availability Service
    participant Repository as Availability Repository
    participant DB as Database

    Customer->>UI: Chọn Garment và ngày nhận/ngày trả
    UI->>Controller: GET availability
    Controller->>Service: checkAvailability(criteria)
    Service->>Service: Chuẩn hóa 08:00 / 18:00
    Service->>Service: Mở rộng request thành blocked interval
    Service->>Repository: findAvailableRentalUnits(blockedStartAt, blockedEndAt)
    Repository->>DB: Lọc trạng thái RentalUnit
    Repository->>DB: NOT Reservation overlap
    Note over Repository,DB: existing.start < requested.end<br/>AND existing.end > requested.start
    Repository->>DB: NOT AvailabilityBlock overlap
    DB-->>Repository: RentalUnit khả dụng
    Repository-->>Service: Kết quả

    alt Có ít nhất một RentalUnit khả dụng
        Service-->>Controller: available = true
        Controller-->>UI: Danh sách/khả dụng
        UI-->>Customer: Hiển thị Garment khả dụng
    else Không có RentalUnit khả dụng
        Service-->>Controller: available = false
        Controller-->>UI: Không khả dụng
        UI-->>Customer: Thông báo không khả dụng
    end
```
