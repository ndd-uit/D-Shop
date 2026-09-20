# Business Decision 002: Payment & Deposit Policy

## Status

Accepted

## Context

D-SHOP cần tách rõ tiền thuê và tiền cọc để tránh nhầm lẫn trong quá trình đặt thuê và bàn giao.

## Decision

- Customer chỉ thanh toán tiền thuê khi xác nhận đơn.
- Tiền cọc không được thu trong bước checkout.
- Tiền cọc được thu và ghi nhận trước khi bàn giao trang phục.
- Chỉ được bàn giao khi điều kiện thanh toán và tiền cọc đã được đáp ứng.

## Consequences

- Checkout chỉ xử lý tiền thuê.
- Quy trình bàn giao phải kiểm tra trạng thái tiền cọc.
- Payment và settlement phải phân biệt rõ tiền thuê, tiền cọc và phí phát sinh.
- Payment Service chỉ chịu trách nhiệm cho luồng điện tử thực sự được tích hợp; Refund vẫn là bản ghi nghĩa vụ/trạng thái và không mặc định được gateway hoàn tự động.
