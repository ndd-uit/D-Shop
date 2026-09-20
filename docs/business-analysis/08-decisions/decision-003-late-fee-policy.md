# Business Decision 003: Late Fee Policy

## Status

Accepted

## Context

D-SHOP cần một cách tính phí trả trễ rõ ràng, nhất quán và dễ kiểm tra.

Phí trả trễ phải phản ánh thời gian Customer giữ trang phục quá hạn so với `returnDueAt`.

## Decision

Policy v3 dùng tiền thuê theo ngày của đơn:

```text
dailyRentalAmount = rentalAmount / rentalDays

08:00 <= giờ trả <= 12:00:
lateFee = (d - 0.5) * dailyRentalAmount

12:00 < giờ trả <= 18:00:
lateFee = d * dailyRentalAmount
```

Trong đó `d >= 1` là ngày trễ tính theo lịch vận hành. Mốc chính xác 12:00:00.000 vẫn tính nửa ngày; sau mốc này tính đủ ngày. Policy không có mức trần nếu không được cấu hình bằng một Business Decision khác.

## Policy Versioning

RentalOrder dùng policy snapshot tại thời điểm tạo đơn. Policy mới không hồi tố và không thay đổi kết quả của đơn cũ.

## Consequences

- UI, API và quyết toán phải hiển thị cùng một kết quả tính phí.
- Boundary trước/đúng/sau 12:00 và đơn nhiều ngày phải có automated test.
