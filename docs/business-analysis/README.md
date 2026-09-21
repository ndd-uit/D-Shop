# D-SHOP - Business Analysis Documentation

## Overview

D-SHOP là hệ thống thương mại điện tử cho thuê trang phục theo lịch.

Mục tiêu chính:

- quản lý tập trung trang phục và đơn thuê;
- kiểm tra khả dụng theo từng `RentalUnit`;
- ngăn đặt trùng lịch;
- quản lý thanh toán, tiền cọc và phí phát sinh;
- theo dõi toàn bộ vòng đời thuê từ đặt thuê đến hoàn trả và quyết toán.

## Baseline

- Project: D-SHOP
- Document Type: Business Analysis Documentation
- Current Baseline: v1.1 (aligned with the verified implementation on 2026-09-21)
- Scope: Single Store
- Timezone: Asia/Ho_Chi_Minh

## Main Actors

- Customer
- Rental Staff
- Store Manager
- Payment Service

## Business Processes

- P01 - Quản lý vòng đời trang phục
- P02 - Tìm kiếm và kiểm tra khả dụng
- P03 - Đặt thuê, giữ chỗ và thanh toán
- P04 - Chuẩn bị đơn thuê
- P05 - Thu cọc và bàn giao trang phục
- P06 - Hoàn trả và kiểm tra trang phục
- P07 - Quyết toán, phê duyệt phí và hoàn tất đơn

Customer Cancellation hiện không thuộc scope.

## Documentation

### Overview

- [Business Context](01-overview/business-context.md)
- [Problem Statement](01-overview/problem-statement.md)
- [Business Objectives](01-overview/business-objectives.md)
- [Stakeholders](01-overview/stakeholders.md)
- [Scope](01-overview/scope.md)

### Process

- [AS-IS](02-process/as-is.md)
- [TO-BE](02-process/to-be.md)
- [Business Processes](02-process/business-processes.md)

### Requirements

- [Business Requirements](03-requirements/business-requirements.md)
- [User Requirements](03-requirements/user-requirements.md)
- [Functional Requirements](03-requirements/functional-requirements.md)
- [Non-Functional Requirements](03-requirements/non-functional-requirements.md)
- [Business Rules](03-requirements/business-rules.md)

### Models

- [Use Cases](04-use-cases/use-case-overview.md)
- [Domain Model](05-domain-model/domain-model.md)
- [State Models](05-domain-model/state-models.md)
- [ERD](05-domain-model/erd.md)
- [Sequence Diagrams](06-sequence/)

### Diagram Sources

Các trang Markdown nhúng SVG được sinh từ đúng source PlantUML dưới đây. Khi thay đổi nghiệp vụ, cập nhật file `.puml` trước rồi sinh lại SVG để tránh hai phiên bản sơ đồ bị lệch nhau.

- [Use Case Overview](assets/diagrams/use-case-overview.puml)
- [TO-BE Activity](assets/diagrams/to-be-activity.puml)
- [RentalOrder State](assets/diagrams/rental-order-state.puml)
- [Reservation State](assets/diagrams/reservation-state.puml)
- [RentalUnit State](assets/diagrams/rental-unit-state.puml)
- [Domain Model](assets/diagrams/domain-model.puml)
- [ERD](assets/diagrams/erd.puml)
- [P01 - Garment Lifecycle](assets/diagrams/p01-garment-lifecycle.puml)
- [P02 - Availability](assets/diagrams/p02-availability.puml)
- [P03 - Booking & Payment](assets/diagrams/p03-booking-payment.puml)
- [P04 - Preparation](assets/diagrams/p04-preparation.puml)
- [P05 - Handover](assets/diagrams/p05-handover.puml)
- [P06 - Return & Inspection](assets/diagrams/p06-return-inspection.puml)
- [P07 - Settlement](assets/diagrams/p07-settlement.puml)

### Traceability & Decisions

- [Traceability Matrix](07-traceability/requirement-traceability-matrix.md)
- [Business Decisions](08-decisions/)
- [DOCX Alignment Review](09-alignment/BA_DSHOP_aligned-review.md)

## Source of Truth

Ưu tiên theo thứ tự:

1. Business Decision đã chấp nhận
2. Business Rules hiện hành
3. Requirements / Use Cases đã đồng bộ
4. Implementation đã được xác nhận bằng test

`BA_DSHOP_aligned.docx` là tài liệu đầu vào dùng để đối chiếu. Bộ Markdown trong thư mục này là baseline có thể truy vết của dự án; khi DOCX, Markdown và implementation khác nhau, sai lệch phải được ghi nhận và chốt bằng Business Decision thay vì mặc định chọn tài liệu được viết trước.
