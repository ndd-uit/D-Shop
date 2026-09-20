# Entity Relationship Diagram

ERD mô tả các thực thể dữ liệu chính và quan hệ giữa chúng trong D-SHOP.

> Đây là ERD ở mức nghiệp vụ.
> Tên bảng, field, datatype, index và constraint kỹ thuật sẽ được đối chiếu với database schema khi thiết kế chi tiết.

## ERD

```mermaid
erDiagram

    USER ||--o| RENTAL_CART : owns
    USER ||--o{ RENTAL_ORDER : places

    CATEGORY ||--o{ GARMENT : contains
    GARMENT ||--o{ RENTAL_UNIT : has

    RENTAL_CART ||--o{ RENTAL_CART_ITEM : contains
    GARMENT ||--o{ RENTAL_CART_ITEM : selected_as

    RENTAL_ORDER ||--|{ RENTAL_ORDER_ITEM : contains
    GARMENT ||--o{ RENTAL_ORDER_ITEM : references
    RENTAL_ORDER_ITEM ||--o{ RESERVATION : reserves
    RENTAL_UNIT ||--o{ RESERVATION : blocked_by

    RENTAL_UNIT ||--o{ AVAILABILITY_BLOCK : unavailable_during

    RENTAL_ORDER ||--o{ PAYMENT : has
    RENTAL_ORDER ||--o{ REFUND : has

    RENTAL_ORDER_ITEM ||--o| INSPECTION_RESULT : inspected_by
    RENTAL_UNIT ||--o{ INSPECTION_RESULT : inspection_of

    RENTAL_ORDER ||--o{ FEE_APPROVAL_REQUEST : may_require

    RENTAL_ORDER ||--o{ RENTAL_ORDER_STATUS_HISTORY : tracks
    RENTAL_UNIT ||--o{ RENTAL_UNIT_STATUS_HISTORY : tracks
```

Phân bổ vật lý đi qua `RESERVATION` (`RENTAL_ORDER_ITEM -> RESERVATION -> RENTAL_UNIT`), không có quan hệ trực tiếp từ `RENTAL_ORDER_ITEM` sang `RENTAL_UNIT` trong schema hiện tại.
