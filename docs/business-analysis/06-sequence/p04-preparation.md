# P04 - Rental Preparation

P04 mô tả cách Rental Staff chuẩn bị các RentalUnit đã được phân bổ trước thời điểm Customer đến nhận.

## Actors

- Rental Staff
- D-SHOP

## Main Flow

```mermaid
sequenceDiagram
    actor Staff as Rental Staff
    participant System as D-SHOP

    Staff->>System: Xem danh sách đơn cần chuẩn bị
    System-->>Staff: Hiển thị RentalOrder và RentalUnit được phân bổ

    Staff->>System: Chọn RentalOrder cần xử lý
    System-->>Staff: Hiển thị chi tiết RentalUnit

    Staff->>System: Xác nhận bắt đầu chuẩn bị
    System->>System: Cập nhật trạng thái RentalUnit

    Staff->>System: Kiểm tra trang phục và phụ kiện
    Staff->>System: Ghi nhận tình trạng trước bàn giao

    alt RentalUnit đủ điều kiện bàn giao
        Staff->>System: Xác nhận đã chuẩn bị xong
        System->>System: Cập nhật RentalOrder sẵn sàng bàn giao
        System-->>Staff: Thông báo chuẩn bị thành công
    else RentalUnit không đủ điều kiện
        Staff->>System: Yêu cầu thay RentalUnit
        System->>System: Kiểm tra unit thay thế trong cùng blocked interval
        alt Có RentalUnit thay thế
            System->>System: Thay Reservation và cập nhật unit
            System-->>Staff: Tiếp tục chuẩn bị unit mới
        else Không thể cung cấp đơn
            Staff->>System: Ghi nhận FULFILLMENT_FAILED và lý do
            System->>System: Giải phóng Reservation và ghi nhận refund toàn bộ tiền thuê
            System-->>Staff: Đóng luồng chuẩn bị
        end
    end
```

Sau 18:00 ngày nhận, hệ thống từ chối bắt đầu/hoàn tất chuẩn bị cho đơn chưa bàn giao.
