# Business Decision 001: Reservation Buffer Policy

## Status

Accepted

## Context

Mỗi RentalUnit cần thời gian chuẩn bị trước khi bàn giao và thời gian xử lý sau khi hoàn trả.

Nếu chỉ kiểm tra khoảng thuê thực tế, hai đơn có thể được đặt quá sát nhau và không đủ thời gian vận hành.

## Decision

Mỗi Reservation chiếm toàn bộ khoảng khóa:

```text
blockedStartAt = rentalStartAt - 1 day
blockedEndAt   = returnDueAt + 1 day
```

Khoảng thời gian dùng quy ước nửa mở `[startAt, endAt)`. Khi kiểm tra availability, hệ thống so **blocked interval đã mở rộng của yêu cầu mới** với **blocked interval đã mở rộng của Reservation hiệu lực hiện có**:

```text
existing.blockedStartAt < requested.blockedEndAt
AND existing.blockedEndAt > requested.blockedStartAt
```

Vì vậy đơn ngày 05/09 (khóa đến 06/09 18:00) và đơn ngày 07/09 (khóa từ 06/09 08:00) giao nhau và không thể dùng cùng RentalUnit. Đơn ngày 08/09 chỉ được phép nếu không có xung đột khác.

## Consequences

- Buffer là một phần của availability, không chỉ là thông tin hiển thị.
- Temporary hold còn hiệu lực, Reservation `CONFIRMED` và `ACTIVE` đều tham gia kiểm tra overlap.
- Hai interval chỉ chạm đúng end/start thì không overlap theo `[startAt, endAt)`.
