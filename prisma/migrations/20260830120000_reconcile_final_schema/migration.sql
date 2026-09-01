-- Align the nullable Refund -> Payment relation with the final Prisma schema.
ALTER TABLE "refunds"
    DROP CONSTRAINT IF EXISTS "refunds_payment_id_fkey";

ALTER TABLE "refunds"
    ADD CONSTRAINT "refunds_payment_id_fkey"
    FOREIGN KEY ("payment_id")
    REFERENCES "payments"("payment_id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;

-- Legacy audit snapshots are intentionally outside the final D Shop schema.
DROP TABLE IF EXISTS "_legacy_cancellation_requests_20260828";
DROP TABLE IF EXISTS "_legacy_rental_order_cancellation_20260828";
DROP TABLE IF EXISTS "_legacy_rental_policy_fields_20260828";
