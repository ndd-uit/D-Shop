# Business Rules

Business Rules mô tả các quy tắc nghiệp vụ bắt buộc D-SHOP phải tuân theo.

## Rental Period & Availability

| ID | Business Rule |
| --- | --- |
| BRL-001 | Thời gian nhận trang phục được chuẩn hóa về 08:00 của ngày nhận và thời hạn trả về 18:00 của ngày trả. |
| BRL-002 | Mỗi Reservation phải có buffer 1 ngày trước ngày nhận và 1 ngày sau ngày trả. |
| BRL-003 | `blockedStartAt = rentalStartAt - 1 ngày` và `blockedEndAt = returnDueAt + 1 ngày`. |
| BRL-004 | Hai Reservation hiệu lực trên cùng RentalUnit không được có blocked interval giao nhau. |
| BRL-005 | RentalUnit có AvailabilityBlock giao với khoảng khóa được yêu cầu không được xem là khả dụng. |
| BRL-006 | Các khoảng thời gian được xử lý theo dạng nửa mở `[startAt, endAt)`. |

### Example

Rental A:

- ngày thuê: 05/09;
- blocked interval: 04/09 08:00 - 06/09 18:00.

Rental B thuê ngày 07/09 sẽ có blocked interval bắt đầu từ 06/09 08:00.

Hai blocked interval giao nhau nên không được sử dụng cùng RentalUnit.

Ngày 08/09 có thể được thuê nếu không có xung đột khác.

## Cart, Hold & Booking

| ID | Business Rule |
| --- | --- |
| BRL-007 | Tất cả item trong cùng RentalOrder phải sử dụng chung khoảng thời gian thuê. |
| BRL-008 | Mỗi RentalOrderItem phải được phân bổ đúng một RentalUnit. |
| BRL-009 | Temporary hold có thời hạn mặc định 15 phút. |
| BRL-010 | Temporary hold hết hạn không còn quyền giữ RentalUnit. |
| BRL-011 | Customer có thể checkout một hoặc nhiều RentalCartItem được chọn trong giỏ. |
| BRL-012 | Tất cả item được chọn trong cùng một lần checkout phải được giữ RentalUnit thành công theo nguyên tắc atomic; nếu một item được chọn không thể giữ, toàn bộ checkout đó thất bại. |
| BRL-013 | Các item không được chọn checkout tiếp tục được giữ trong RentalCart. |

## Payment & Deposit

| ID | Business Rule |
| --- | --- |
| BRL-014 | Khoản thanh toán ban đầu để xác nhận đơn chỉ bao gồm tiền thuê. |
| BRL-015 | Tiền cọc không được thu trong bước thanh toán đặt thuê ban đầu. |
| BRL-016 | Tiền cọc phải được thu và ghi nhận trước khi bàn giao trang phục. |
| BRL-017 | Chỉ giao trang phục khi đơn và khoản tiền cọc đáp ứng đầy đủ điều kiện bàn giao. |

## Handover & Rental

| ID | Business Rule |
| --- | --- |
| BRL-018 | RentalUnit chỉ được chuyển sang trạng thái RENTED sau khi bàn giao được xác nhận. |
| BRL-019 | Đơn được xác định quá hạn khi thời điểm hiện tại vượt quá `returnDueAt` và chưa ghi nhận hoàn trả hợp lệ. |

## Return & Inspection

| ID | Business Rule |
| --- | --- |
| BRL-020 | Mỗi RentalUnit hoàn trả phải được kiểm tra và ghi nhận kết quả kiểm tra. |
| BRL-021 | Rental Staff có thể ghi nhận trả trễ, hư hỏng, mất phụ kiện và bằng chứng liên quan. |
| BRL-022 | RentalUnit sau hoàn trả có thể chuyển sang AVAILABLE, CLEANING, MAINTENANCE, DAMAGED hoặc RETIRED tùy kết quả kiểm tra. |

## Fee & Settlement

| ID | Business Rule |
| --- | --- |
| BRL-023 | Phí trả trễ được tính dựa trên tiền thuê theo ngày và số ngày trả trễ. |
| BRL-024 | Phí hư hỏng hoặc mất phụ kiện được xác định dựa trên kết quả kiểm tra hoàn trả. |
| BRL-025 | Khoản phí vượt ngưỡng phê duyệt phải được Store Manager xem xét trước khi quyết toán. |
| BRL-026 | Tiền cọc hoàn lại bằng tiền cọc đã thu trừ các khoản phí hợp lệ. |
| BRL-027 | Nếu tổng phí vượt tiền cọc, Customer phải thanh toán phần chênh lệch. |
| BRL-028 | RentalOrder chỉ được hoàn tất khi các khoản phí, tiền thu thêm và tiền hoàn liên quan đã được xử lý. |

## Reservation Lifecycle

| ID | Business Rule |
| --- | --- |
| BRL-029 | Reservation phải tiếp tục giữ blocked interval sau khi trang phục được hoàn trả cho đến khi `blockedEndAt` kết thúc. |
| BRL-030 | Reservation chỉ chuyển sang COMPLETED sau khi thời gian khóa của Reservation kết thúc. |

## Pickup Exception Rules

| ID | Business Rule |
| --- | --- |
| BRL-031 | RentalOrder không được tiếp tục chuẩn bị hoặc bàn giao sau 18:00 của ngày nhận nếu chưa hoàn tất bàn giao. |
| BRL-032 | Nếu Customer không đến nhận trước cutoff 18:00 của ngày nhận, RentalOrder được xử lý theo trạng thái `NO_SHOW`. |
| BRL-033 | Khi RentalOrder chuyển sang `NO_SHOW`, hệ thống không thu tiền cọc, không hoàn tiền thuê; các Reservation liên quan phải được giải phóng và RentalUnit được trả về trạng thái vận hành phù hợp. |
| BRL-034 | Nếu cửa hàng không thể cung cấp RentalUnit đã cam kết trước khi bàn giao và không có RentalUnit thay thế phù hợp, Rental Staff ghi nhận RentalOrder ở trạng thái `FULFILLMENT_FAILED`. |
| BRL-035 | Khi `FULFILLMENT_FAILED`, các Reservation liên quan phải được giải phóng và tiền thuê Customer đã thanh toán phải được hoàn lại theo quy trình refund. |

## Late Fee Policy v3

| ID | Business Rule |
| --- | --- |
| BRL-036 | Phí trả trễ của mỗi item dùng `dailyRentalAmount = rentalAmount / rentalDays` từ policy snapshot gắn với RentalOrder. |
| BRL-037 | Với ngày trễ thứ `d` (`d >= 1`), trả từ 08:00 đến đúng 12:00 tính `(d - 0.5) × dailyRentalAmount`; trả sau 12:00 đến 18:00 tính `d × dailyRentalAmount`. Mốc chính xác 12:00:00.000 thuộc nhánh nửa ngày. |
| BRL-038 | Phí trả trễ không có mức trần nếu policy áp dụng cho đơn không quy định mức trần khác. |
| BRL-039 | Policy của RentalOrder là snapshot bất biến; thay đổi policy mới không được làm thay đổi cách tính của đơn đã tạo. |

## Payment & Refund Operations

| ID | Business Rule |
| --- | --- |
| BRL-040 | Payment Service được dùng để xác nhận/đối soát khoản thanh toán điện tử được hỗ trợ; kết quả phải được xác minh ở backend trước khi cập nhật trạng thái đơn. |
| BRL-041 | Refund trong D-SHOP là bản ghi nghĩa vụ và trạng thái hoàn tiền. Baseline hiện tại không mặc định Payment Service có API hoàn tiền tự động. |
| BRL-042 | Khoản cần thu thêm khi quyết toán có thể được Staff ghi nhận bằng phương thức vận hành được hệ thống hỗ trợ; chỉ hoàn tất đơn sau khi nghĩa vụ tài chính đã được xử lý. |

## Rental Pricing

| ID | Business Rule |
| --- | --- |
| BRL-043 | `rentalDays` là số ngày lịch Việt Nam tính bao gồm cả ngày nhận và ngày trả: `returnDate - pickupDate + 1`. Buffer không được tính vào số ngày thu tiền. |
| BRL-044 | Tiền thuê của item bằng đơn giá thuê theo ngày đã snapshot nhân `rentalDays`; tiền thuê đơn là tổng tiền thuê của các item được chọn. |
