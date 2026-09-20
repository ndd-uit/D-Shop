# Functional Requirements

Functional Requirements mô tả các chức năng D-SHOP phải cung cấp để đáp ứng nhu cầu nghiệp vụ.

## Account & Authorization

| ID | Functional Requirement |
| --- | --- |
| FR-001 | Hệ thống phải cho phép Customer đăng ký và đăng nhập tài khoản. |
| FR-002 | Hệ thống phải kiểm soát quyền truy cập theo vai trò Customer, Rental Staff và Store Manager. |

## Garment Management

| ID | Functional Requirement |
| --- | --- |
| FR-003 | Hệ thống phải cho phép Store Manager quản lý Category, Garment và RentalUnit. |
| FR-004 | Hệ thống phải theo dõi trạng thái hiện tại của từng RentalUnit. |

## Search & Availability

| ID | Functional Requirement |
| --- | --- |
| FR-005 | Hệ thống phải cho phép Customer tìm kiếm và lọc trang phục theo danh mục, size, giá và thời gian thuê. |
| FR-006 | Hệ thống phải kiểm tra khả dụng theo từng RentalUnit trong khoảng thời gian thuê được yêu cầu. |
| FR-007 | Hệ thống phải loại các RentalUnit có Reservation hoặc AvailabilityBlock xung đột. |

## Cart, Booking & Payment

| ID | Functional Requirement |
| --- | --- |
| FR-008 | Hệ thống cho phép Customer thêm, cập nhật và xóa item trong RentalCart. |
| FR-009 | Hệ thống cho phép Customer chọn một hoặc nhiều RentalCartItem để checkout. |
| FR-010 | Hệ thống phải kiểm tra availability và giữ thành công toàn bộ RentalUnit cho các item được chọn trước khi tạo RentalOrder. |
| FR-011 | Nếu bất kỳ item được chọn nào không thể giữ RentalUnit, hệ thống phải hủy toàn bộ checkout đang thực hiện và không tạo RentalOrder một phần. |
| FR-012 | Các RentalCartItem không được chọn phải tiếp tục được giữ trong RentalCart sau khi checkout thành công. |
| FR-013 | Hệ thống cho phép Customer thanh toán tiền thuê và ghi nhận kết quả giao dịch. |

## Handover & Rental Tracking

| ID | Functional Requirement |
| --- | --- |
| FR-014 | Hệ thống phải hỗ trợ Rental Staff chuẩn bị, kiểm tra và bàn giao trang phục. |
| FR-015 | Hệ thống phải ghi nhận tiền cọc trước khi xác nhận bàn giao. |
| FR-016 | Hệ thống phải theo dõi thời gian thuê và xác định các đơn quá hạn. |

## Return & Settlement

| ID | Functional Requirement |
| --- | --- |
| FR-017 | Hệ thống phải cho phép Rental Staff ghi nhận hoàn trả và kết quả kiểm tra từng RentalUnit. |
| FR-018 | Hệ thống phải cho phép Rental Staff ghi nhận mô tả và bằng chứng về tình trạng RentalUnit khi hoàn trả. |
| FR-019 | Hệ thống phải tính và ghi nhận phí trả trễ, phí hư hỏng và phí mất phụ kiện theo chính sách hiện hành. |
| FR-020 | Hệ thống phải yêu cầu Store Manager phê duyệt khoản phí vượt ngưỡng quy định. |

## Pickup Exceptions, Settlement & Reservation Lifecycle

| ID | Functional Requirement |
| --- | --- |
| FR-021 | Hệ thống phải ngăn thao tác chuẩn bị hoặc bàn giao RentalOrder sau 18:00 của ngày nhận khi đơn chưa được bàn giao. |
| FR-022 | Hệ thống phải xử lý RentalOrder thành `NO_SHOW` khi Customer không đến nhận trước cutoff và giải phóng các Reservation liên quan. |
| FR-023 | Hệ thống phải cho phép Rental Staff xử lý `FULFILLMENT_FAILED` khi cửa hàng không thể cung cấp RentalUnit, giải phóng Reservation và ghi nhận hoàn tiền thuê đã thanh toán. |
| FR-024 | Hệ thống phải tính số tiền cọc cần hoàn hoặc số tiền Customer phải thanh toán thêm trước khi hoàn tất đơn. |
| FR-025 | Hệ thống phải giữ Reservation hiệu lực đến `blockedEndAt` kể cả khi RentalOrder đã hoàn tất về tài chính, và chỉ hoàn tất Reservation đủ điều kiện sau thời điểm đó. |

## Reporting

| ID | Functional Requirement |
|---|---|
| FR-026 | Hệ thống phải cung cấp báo cáo về đơn thuê, doanh thu, phí phát sinh và trạng thái RentalUnit. |

## Planned Functional Requirements

| ID | Functional Requirement | Status |
|---|---|---|
| FR-AI-001 | Hệ thống sẽ cung cấp AI Chatbot cho phép Customer tra cứu thông tin trang phục, chính sách thuê và hướng dẫn sử dụng D-SHOP. | Planned |
