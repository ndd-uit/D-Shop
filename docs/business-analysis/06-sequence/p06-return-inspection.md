# P06 - Return & Inspection

P06 mô tả cách Rental Staff tiếp nhận RentalUnit được hoàn trả, kiểm tra tình trạng thực tế và ghi nhận các vấn đề phát sinh sau thời gian thuê.

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

    Customer->>Staff: Hoàn trả trang phục
    Staff->>System: Tra cứu RentalOrder
    System-->>Staff: Hiển thị RentalUnit cần hoàn trả

    Staff->>System: Ghi nhận thời điểm trả thực tế
    System->>System: Kiểm tra tình trạng quá hạn

    Staff->>System: Bắt đầu kiểm tra RentalUnit
    Staff->>System: Ghi nhận tình trạng trang phục
    Staff->>System: Ghi nhận tình trạng phụ kiện
    Staff->>System: Đính kèm mô tả hoặc bằng chứng nếu cần

    alt RentalUnit không có vấn đề
        Staff->>System: Xác nhận kết quả kiểm tra
        System->>System: Lưu InspectionResult
        System->>System: Xác định trạng thái tiếp theo của RentalUnit
        System-->>Staff: Hoàn tất kiểm tra
    else Có trả trễ, hư hỏng hoặc mất phụ kiện
        Staff->>System: Ghi nhận vấn đề phát sinh
        System->>System: Lưu InspectionResult
        System->>System: Xác định phí liên quan
        System->>System: Xác định trạng thái tiếp theo của RentalUnit
        System-->>Staff: Chuyển sang bước xử lý phí và quyết toán
    end
```
