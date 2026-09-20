# Requirement Traceability Matrix

Requirement Traceability Matrix thể hiện mối liên hệ từ Business Requirement đến User Requirement, Functional Requirement, Use Case và Non-Functional Requirement.

## Traceability Matrix

| Business Requirement | User Requirement | Functional Requirement | Use Case | Related NFR |
| --- | --- | --- | --- | --- |
| BR-001 | UR-004, UR-005, UR-006 | FR-001 - FR-004, FR-020, FR-026 | UC-001, UC-008, UC-015, UC-017 | NFR-004 - NFR-008, NFR-011, NFR-012 |
| BR-002 | UR-001, UR-002 | FR-005 - FR-010 | UC-002 - UC-005, UC-009 | NFR-001, NFR-002, NFR-009, NFR-010 |
| BR-003 | UR-004, UR-005 | FR-003, FR-004, FR-012, FR-014 - FR-016, FR-025 | UC-008 - UC-013, UC-018, UC-019 | NFR-009, NFR-011 |
| BR-004 | UR-002, UR-004 | FR-008 - FR-025 | UC-004 - UC-006, UC-010 - UC-016, UC-018, UC-019 | NFR-009 - NFR-012 |
| BR-005 | UR-002, UR-003, UR-004, UR-005 | FR-011, FR-013, FR-017 - FR-024, FR-026 | UC-006, UC-007, UC-011, UC-014 - UC-019 | NFR-005 - NFR-008, NFR-011 |

## Critical Rule Traceability

| Business Rules | Functional Requirements | Use Cases / Sequence | Verified Implementation / Test |
| --- | --- | --- | --- |
| BRL-001 - BRL-006 | FR-005 - FR-007 | UC-003 / P02 | `availability.service.js`, `availability.repository.js`, `domainRules.test.js` |
| BRL-007 - BRL-013 | FR-008 - FR-012 | UC-004, UC-005 / P03 | `rental.service.js`, `partialCheckout.test.js` |
| BRL-014 - BRL-017 | FR-013 - FR-015 | UC-006, UC-011 / P03, P05 | `payment.service.js`, rental/payment tests |
| BRL-018 - BRL-022 | FR-014 - FR-018 | UC-010 - UC-013 / P04 - P06 | `rental.service.js`, lifecycle/inspection tests |
| BRL-023 - BRL-028, BRL-036 - BRL-042 | FR-019, FR-020, FR-024 | UC-014 - UC-016 / P07 | `calculateLateFee`, `dailyLateFee.test.js`, `domainRules.test.js` |
| BRL-029, BRL-030 | FR-025 | UC-016 / P07 | Reservation lifecycle job, `domainRules.test.js` |
| BRL-031 - BRL-033 | FR-021, FR-022 | UC-018 / P04, P05 | rental period/service guards, `domainRules.test.js`, `hardening.test.js` |
| BRL-034, BRL-035 | FR-023 | UC-019 / P04 | fulfillment-failed service/route, `hardening.test.js` |

## Planned Feature Traceability

| User Requirement | Functional Requirement | Use Case | NFR | Status |
|---|---|---|---|---|
| UR-AI-001 | FR-AI-001 | UC-AI-001 | NFR-AI-001, NFR-AI-002 | Planned |

## Traceability Rules

- Mỗi Functional Requirement phải liên kết được với ít nhất một User Requirement hoặc Business Requirement.
- Mỗi Use Case phải bắt nguồn từ một hoặc nhiều Functional Requirement.
- NFR được liên kết với các requirement mà thuộc tính chất lượng đó ảnh hưởng.
- Planned Feature được tách khỏi baseline chức năng hiện tại.
- ID requirement phải duy nhất; khi thêm requirement mới không được tái sử dụng ID đã phát hành.
