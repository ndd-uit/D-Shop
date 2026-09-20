# BA_DSHOP_aligned.docx - Alignment Review

## Review Scope

- Source reviewed: `BA_DSHOP_aligned.docx`.
- Compared with: current Markdown baseline, Prisma schema, rental/availability/payment services, routes and automated tests.
- Review date: 2026-09-21.
- This review changes documentation only. It does not change schema, database or production code.

The DOCX also contains general BA-learning and SmartCommerce example material appended after the D-SHOP content. Those sections are not treated as D-SHOP requirements.

## Aligned and Accepted

- Availability uses one-day pre/post buffers and half-open intervals.
- Availability compares the requested expanded blocked interval with existing expanded blocked intervals.
- Checkout may contain one or more selected cart items; the selected set is atomic and unselected items remain in the cart.
- Rental price uses inclusive Vietnam calendar days; buffers are not billed.
- Initial online payment contains rental amount only; deposit is collected before handover.
- `NO_SHOW` and `FULFILLMENT_FAILED` are operational exceptions, not Customer Cancellation.
- RentalOrder may be financially `COMPLETED` while Reservation remains active until `blockedEndAt`.
- Refund is a tracked business record; a generic automatic gateway-refund API is not assumed.

## Open Mismatches

### ALN-001 - Exact 12:00 late-fee boundary — Resolved

**Original rule in DOCX**

- `08:00 <= returnTime < 12:00`: half-day factor.
- `12:00 <= returnTime <= 18:00`: full-day factor.

**Verified implementation**

`server/src/modules/rental/rental.service.js` classifies exactly 12:00:00.000 as the morning/half-day branch. `server/test/dailyLateFee.test.js` verifies the before/exactly/after-12:00 boundaries.

**Resolution**

Business owner selected the current implementation as the source of truth on 2026-09-21. Markdown is updated to `08:00 <= returnTime <= 12:00` for the half-day factor and `12:00 < returnTime <= 18:00` for the full-day factor. No production-code change is required.

### ALN-002 - Actor allowed to record FULFILLMENT_FAILED — Resolved

**Original rule in DOCX**

Store Manager records that the order cannot be fulfilled after no valid replacement RentalUnit is available.

**Verified implementation**

`server/src/modules/rental/rental.routes.js` authorizes Rental Staff for the fulfillment-failed endpoint. `server/test/hardening.test.js` explicitly expects Manager to be rejected and Rental Staff to be allowed.

**Resolution**

Business owner selected Rental Staff as the responsible actor on 2026-09-21. Markdown now matches the existing route and authorization test. Store Manager approval is not required for this transition. Backend must still require a reason, validate that no suitable replacement is available, release Reservation and initiate the full rental refund atomically.

## Documentation Corrections Applied

- Removed invalid citation placeholders.
- Made Functional Requirement IDs unique.
- Added no-show, fulfillment-failure, pricing, refund and Reservation-buffer rules.
- Corrected Domain Model/ERD cardinalities and removed the nonexistent direct RentalOrderItem-to-RentalUnit relation.
- Completed RentalOrder, Reservation and RentalUnit state models.
- Closed all broken Markdown/Mermaid code fences.
- Expanded sequence diagrams and critical-rule traceability.
- Consolidated duplicate Maintainability NFRs.

## Version Control

The Markdown baseline is tracked under `server/docs/business-analysis/` in the backend repository. Business-document changes should be committed independently from production-code changes whenever practical.
