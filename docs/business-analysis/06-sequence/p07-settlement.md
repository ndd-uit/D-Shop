# P07 - Settlement

P07 mô tả cách D-SHOP tổng hợp các khoản phí sau hoàn trả, xử lý phê duyệt nếu cần, tính số tiền hoàn cọc hoặc cần thu thêm và hoàn tất RentalOrder.

## Actors

- Rental Staff
- Store Manager
- Customer
- D-SHOP

## Main Flow

```mermaid
sequenceDiagram
    actor Staff as Rental Staff
    actor Manager as Store Manager
    actor Customer
    participant System as D-SHOP

    Staff->>System: Mở RentalOrder cần quyết toán
    System->>System: Tổng hợp tiền cọc đã thu
    System->>System: Tổng hợp phí trả trễ
    System->>System: Tổng hợp phí hư hỏng hoặc mất phụ kiện
    System->>System: Tính tổng phí phát sinh

    alt Tổng phí vượt ngưỡng phê duyệt
        System-->>Manager: Gửi yêu cầu phê duyệt
        Manager->>System: Xem InspectionResult và bằng chứng
        Manager->>System: Phê duyệt hoặc từ chối khoản phí

        alt Khoản phí được phê duyệt
            System->>System: Xác nhận phí hợp lệ
        else Khoản phí bị từ chối
            System->>System: Loại bỏ hoặc điều chỉnh khoản phí
        end
    end

    System->>System: Tính số tiền quyết toán

    alt Tiền cọc lớn hơn tổng phí
        System->>System: Tính số tiền cần hoàn
        System->>System: Tạo/cập nhật Refund
        Staff->>System: Ghi nhận kết quả hoàn tiền thực tế
        System-->>Customer: Cập nhật trạng thái khoản hoàn
    else Tiền cọc bằng tổng phí
        System->>System: Không phát sinh hoàn hoặc thu thêm
    else Tổng phí lớn hơn tiền cọc
        System->>System: Tính số tiền cần thu thêm
        System-->>Customer: Thông báo khoản cần thanh toán
        Customer->>Staff: Thanh toán khoản bổ sung
        Staff->>System: Ghi nhận khoản đã thu
    end

    Staff->>System: Xác nhận hoàn tất quyết toán
    System->>System: Cập nhật RentalOrder hoàn tất
    Note over System: Reservation ACTIVE vẫn giữ lịch đến blockedEndAt
    System-->>Staff: Xác nhận settlement thành công
```

## Integration Boundary

- Payment Service xử lý/xác nhận khoản thanh toán điện tử được tích hợp.
- Refund là bản ghi nghiệp vụ theo dõi số tiền và trạng thái. Baseline hiện tại không giả định có API refund tự động từ Payment Service.
- Job vòng đời Reservation chỉ chuyển Reservation đủ điều kiện sang `COMPLETED` sau khi RentalUnit đã trả và `now >= blockedEndAt`.
