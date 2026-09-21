# State Models

State Models mô tả vòng đời trạng thái của các đối tượng nghiệp vụ chính trong D-SHOP.

## RentalOrder State

```mermaid
stateDiagram-v2
    [*] --> PENDING_PAYMENT

    PENDING_PAYMENT --> CONFIRMED : Thanh toán thành công
    PENDING_PAYMENT --> EXPIRED : Hold hết hạn

    CONFIRMED --> PREPARING
    PREPARING --> READY_FOR_PICKUP
    READY_FOR_PICKUP --> RENTING : Bàn giao thành công

    RENTING --> RETURNED : Trả đúng hạn
    RENTING --> OVERDUE : Quá returnDueAt
    OVERDUE --> RETURNED : Customer hoàn trả

    RETURNED --> INSPECTING
    INSPECTING --> SETTLEMENT_PENDING
    SETTLEMENT_PENDING --> COMPLETED

    PREPARING --> FULFILLMENT_FAILED : Không thể cung cấp
    READY_FOR_PICKUP --> FULFILLMENT_FAILED : Không thể bàn giao

    CONFIRMED --> NO_SHOW : Quá cutoff, chưa pickup/chưa thu cọc
    PREPARING --> NO_SHOW : Quá cutoff, chưa pickup/chưa thu cọc
    READY_FOR_PICKUP --> NO_SHOW : Quá cutoff, chưa pickup/chưa thu cọc

    EXPIRED --> [*]
    NO_SHOW --> [*]
    FULFILLMENT_FAILED --> [*]
    COMPLETED --> [*]
```

`NO_SHOW` chỉ áp dụng sau cutoff 18:00 ngày nhận khi chưa bàn giao/chưa thu cọc. `FULFILLMENT_FAILED` là lỗi thực hiện đơn của cửa hàng, không phải Customer Cancellation.

## Reservation State

```mermaid
stateDiagram-v2
    [*] --> TEMPORARY_HOLD
    TEMPORARY_HOLD --> CONFIRMED : Thanh toán tiền thuê hợp lệ
    TEMPORARY_HOLD --> EXPIRED : holdExpiresAt đã qua
    CONFIRMED --> ACTIVE : Bàn giao thành công
    CONFIRMED --> RELEASED : NO_SHOW / FULFILLMENT_FAILED / thay RentalUnit
    ACTIVE --> COMPLETED : Đã trả và now >= blockedEndAt

    EXPIRED --> [*]
    RELEASED --> [*]
    COMPLETED --> [*]
```

RentalOrder `COMPLETED` không tự động làm Reservation `COMPLETED`. Reservation `ACTIVE` tiếp tục chặn availability đến hết `blockedEndAt`.

## RentalUnit State

```mermaid
stateDiagram-v2
    [*] --> AVAILABLE
    AVAILABLE --> PREPARING : Bắt đầu chuẩn bị
    PREPARING --> AVAILABLE : Giải phóng/thay thế
    PREPARING --> RENTED : Bàn giao thành công
    RENTED --> RETURN_INSPECTION : Ghi nhận hoàn trả
    RETURN_INSPECTION --> AVAILABLE : Đủ điều kiện cho thuê
    RETURN_INSPECTION --> CLEANING : Cần vệ sinh
    RETURN_INSPECTION --> MAINTENANCE : Cần bảo trì
    RETURN_INSPECTION --> DAMAGED : Hư hỏng
    AVAILABLE --> RETIRED : Ngừng khai thác
    CLEANING --> AVAILABLE : Hoàn tất vệ sinh
    MAINTENANCE --> AVAILABLE : Hoàn tất bảo trì
    DAMAGED --> MAINTENANCE : Có thể sửa chữa
    DAMAGED --> RETIRED : Không thể tiếp tục khai thác
```
