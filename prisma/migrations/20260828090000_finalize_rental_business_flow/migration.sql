-- Remove one proven cancellation-policy integration fixture only. Every marker
-- and dependency count is asserted first so changed or real data is never
-- deleted accidentally.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM "rental_orders"
        WHERE "order_id" = '5b70ae6c-d62d-407e-a687-319f30338a41'
    ) THEN
        IF NOT EXISTS (
            SELECT 1
            FROM "rental_orders"
            WHERE "order_id" = '5b70ae6c-d62d-407e-a687-319f30338a41'
              AND "status"::text = 'CANCELLED'
              AND "actual_pickup_at" IS NULL
              AND "actual_return_at" IS NULL
              AND "pickup_info" = 'Cancellation policy integration test'
              AND "return_info" = 'Cancellation policy integration test'
              AND "cancellation_reason" = 'Cancellation policy clean integration test'
        ) OR (
            SELECT COUNT(*) FROM "rental_order_items"
            WHERE "order_id" = '5b70ae6c-d62d-407e-a687-319f30338a41'
        ) <> 1 OR (
            SELECT COUNT(*)
            FROM "reservations" AS reservation
            JOIN "rental_order_items" AS item
              ON item."order_item_id" = reservation."rental_order_item_id"
            WHERE item."order_id" = '5b70ae6c-d62d-407e-a687-319f30338a41'
        ) <> 1 OR (
            SELECT COUNT(*)
            FROM "reservations" AS reservation
            JOIN "rental_order_items" AS item
              ON item."order_item_id" = reservation."rental_order_item_id"
            WHERE item."order_id" = '5b70ae6c-d62d-407e-a687-319f30338a41'
              AND reservation."status"::text = 'CANCELLED'
              AND reservation."prepared_at" IS NULL
        ) <> 1 OR (
            SELECT COUNT(*) FROM "payments"
            WHERE "rental_order_id" = '5b70ae6c-d62d-407e-a687-319f30338a41'
        ) <> 1 OR (
            SELECT COUNT(*) FROM "payments"
            WHERE "rental_order_id" = '5b70ae6c-d62d-407e-a687-319f30338a41'
              AND "payment_id" = 'e4c7571f-f59e-4f1c-aa72-4f7709b9f06f'
              AND "purpose"::text = 'UPFRONT'
              AND "status"::text = 'SUCCESS'
              AND "transaction_ref" = 'POLICY-UPFRONT-1787504327840'
        ) <> 1 OR (
            SELECT COUNT(*)
            FROM "refunds" AS refund
            JOIN "payments" AS payment
              ON payment."payment_id" = refund."payment_id"
            WHERE payment."rental_order_id" = '5b70ae6c-d62d-407e-a687-319f30338a41'
        ) <> 1 OR (
            SELECT COUNT(*)
            FROM "refunds" AS refund
            JOIN "payments" AS payment
              ON payment."payment_id" = refund."payment_id"
            WHERE payment."rental_order_id" = '5b70ae6c-d62d-407e-a687-319f30338a41'
              AND refund."refund_id" = 'c1648742-791c-4858-a430-945383d504fc'
              AND refund."type"::text = 'CANCELLATION_REFUND'
              AND refund."status"::text = 'SUCCESS'
              AND refund."transaction_ref" = 'CANCEL-POLICY-5B70-SUCCESS'
        ) <> 1 OR (
            SELECT COUNT(*) FROM "cancellation_requests"
            WHERE "rental_order_id" = '5b70ae6c-d62d-407e-a687-319f30338a41'
        ) <> 1 OR (
            SELECT COUNT(*) FROM "cancellation_requests"
            WHERE "rental_order_id" = '5b70ae6c-d62d-407e-a687-319f30338a41'
              AND "cancellation_request_id" = '516fc6af-8ab1-4e61-8e9a-de48c6d90a00'
              AND "reason" = 'Cancellation policy clean integration test'
              AND "decision_reason" = 'Test cancellation policy outside grace period'
        ) <> 1 OR (
            SELECT COUNT(*) FROM "rental_order_status_history"
            WHERE "rental_order_id" = '5b70ae6c-d62d-407e-a687-319f30338a41'
        ) <> 3 OR NOT EXISTS (
            SELECT 1 FROM "rental_order_status_history"
            WHERE "rental_order_id" = '5b70ae6c-d62d-407e-a687-319f30338a41'
              AND "old_status"::text = 'CONFIRMED'
              AND "new_status"::text = 'CANCELLED'
              AND "reason" = 'Test cancellation policy outside grace period'
        ) OR EXISTS (
            SELECT 1 FROM "inspection_results" AS inspection
            JOIN "rental_order_items" AS item
              ON item."order_item_id" = inspection."rental_order_item_id"
            WHERE item."order_id" = '5b70ae6c-d62d-407e-a687-319f30338a41'
        ) OR EXISTS (
            SELECT 1 FROM "fee_approval_requests"
            WHERE "rental_order_id" = '5b70ae6c-d62d-407e-a687-319f30338a41'
        ) THEN
            RAISE EXCEPTION USING
                MESSAGE = 'Legacy cancellation fixture no longer matches its verified test signature',
                HINT = 'Inspect order 5b70ae6c-d62d-407e-a687-319f30338a41 again; no cleanup was performed.';
        END IF;

        DELETE FROM "refunds"
        WHERE "payment_id" IN (
            SELECT "payment_id" FROM "payments"
            WHERE "rental_order_id" = '5b70ae6c-d62d-407e-a687-319f30338a41'
        );
        DELETE FROM "inspection_results"
        WHERE "rental_order_item_id" IN (
            SELECT "order_item_id" FROM "rental_order_items"
            WHERE "order_id" = '5b70ae6c-d62d-407e-a687-319f30338a41'
        );
        DELETE FROM "reservations"
        WHERE "rental_order_item_id" IN (
            SELECT "order_item_id" FROM "rental_order_items"
            WHERE "order_id" = '5b70ae6c-d62d-407e-a687-319f30338a41'
        );
        DELETE FROM "cancellation_requests"
        WHERE "rental_order_id" = '5b70ae6c-d62d-407e-a687-319f30338a41';
        DELETE FROM "fee_approval_requests"
        WHERE "rental_order_id" = '5b70ae6c-d62d-407e-a687-319f30338a41';
        DELETE FROM "rental_order_status_history"
        WHERE "rental_order_id" = '5b70ae6c-d62d-407e-a687-319f30338a41';
        DELETE FROM "payments"
        WHERE "rental_order_id" = '5b70ae6c-d62d-407e-a687-319f30338a41';
        DELETE FROM "rental_order_items"
        WHERE "order_id" = '5b70ae6c-d62d-407e-a687-319f30338a41';
        DELETE FROM "rental_orders"
        WHERE "order_id" = '5b70ae6c-d62d-407e-a687-319f30338a41';
    END IF;

    IF EXISTS (
        SELECT 1 FROM "rental_orders"
        WHERE "status"::text = 'CANCELLED'
          AND "order_id" NOT IN (
              '9b3c1a5b-aa99-4b9b-9cd3-659f3cd719d9',
              '4a7d504f-8e60-4d2e-955e-9b45aa1285d0'
          )
    ) OR EXISTS (
        SELECT 1 FROM "rental_order_status_history"
        WHERE (
            "old_status"::text = 'CANCELLED'
            OR "new_status"::text = 'CANCELLED'
        ) AND "rental_order_id" NOT IN (
            '9b3c1a5b-aa99-4b9b-9cd3-659f3cd719d9',
            '4a7d504f-8e60-4d2e-955e-9b45aa1285d0'
        )
    ) THEN
        RAISE EXCEPTION USING
            MESSAGE = 'Unclassified legacy CANCELLED data remains',
            HINT = 'Only the two explicitly reviewed legacy orders may be mapped by this migration.';
    END IF;

    IF EXISTS (
        SELECT 1 FROM "payments"
        WHERE "purpose"::text = 'ADDITIONAL'
    ) THEN
        RAISE EXCEPTION USING
            MESSAGE = 'Legacy ADDITIONAL payments require manual reconciliation before migration',
            HINT = 'Do not remap them to RENTAL or DEPOSIT. Reconcile the historical totals and archive them explicitly.';
    END IF;
END $$;

-- Preserve removed business data outside the active Prisma model.
CREATE TABLE "_legacy_cancellation_requests_20260828" AS
SELECT
    "cancellation_request_id",
    "rental_order_id",
    "policy_id",
    "reason",
    "status"::text AS "status",
    "requested_by",
    "requested_at",
    "decided_by",
    "decision_reason",
    "decided_at",
    "cancellation_fee",
    "refund_amount"
FROM "cancellation_requests";

CREATE TABLE "_legacy_rental_order_cancellation_20260828" AS
SELECT
    "order_id",
    "cancellation_refund_amount",
    "cancellation_fee",
    "cancellation_reason",
    "cancelled_by",
    "cancelled_at"
FROM "rental_orders"
WHERE "cancellation_refund_amount" <> 0
   OR "cancellation_fee" <> 0
   OR "cancellation_reason" IS NOT NULL
   OR "cancelled_by" IS NOT NULL
   OR "cancelled_at" IS NOT NULL;

CREATE TABLE "_legacy_rental_policy_fields_20260828" AS
SELECT
    "policy_id",
    "preparation_buffer",
    "cleaning_buffer",
    "cancellation_policy"
FROM "rental_policies";

-- New deposit collection snapshot.
CREATE TYPE "deposit_collection_method" AS ENUM (
    'PAYMENT_GATEWAY',
    'DIRECT'
);

ALTER TABLE "rental_orders"
    ADD COLUMN "collected_deposit_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    ADD COLUMN "deposit_collection_method" "deposit_collection_method",
    ADD COLUMN "deposit_collected_at" TIMESTAMP(6);

-- Refund is owned by RentalOrder; Payment is optional (direct deposits have none).
ALTER TABLE "refunds"
    ADD COLUMN "rental_order_id" UUID;

UPDATE "refunds" AS refund
SET "rental_order_id" = payment."rental_order_id"
FROM "payments" AS payment
WHERE refund."payment_id" = payment."payment_id";

ALTER TABLE "refunds"
    ALTER COLUMN "rental_order_id" SET NOT NULL,
    ALTER COLUMN "payment_id" DROP NOT NULL;

ALTER TABLE "refunds"
    ADD CONSTRAINT "refunds_rental_order_id_fkey"
    FOREIGN KEY ("rental_order_id")
    REFERENCES "rental_orders"("order_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Reservation CANCELLED now has the precise release semantics.
UPDATE "reservations"
SET "status" = 'RELEASED'
WHERE "status"::text = 'CANCELLED';

ALTER TYPE "reservation_status" RENAME TO "reservation_status_old";
CREATE TYPE "reservation_status" AS ENUM (
    'TEMPORARY_HOLD',
    'CONFIRMED',
    'ACTIVE',
    'EXPIRED',
    'RELEASED',
    'COMPLETED'
);
ALTER TABLE "reservations"
    ALTER COLUMN "status" TYPE "reservation_status"
    USING ("status"::text::"reservation_status");
DROP TYPE "reservation_status_old";

-- Final RentalOrder lifecycle.
ALTER TYPE "rental_order_status" RENAME TO "rental_order_status_old";
CREATE TYPE "rental_order_status" AS ENUM (
    'PENDING_PAYMENT',
    'CONFIRMED',
    'PREPARING',
    'READY_FOR_PICKUP',
    'RENTING',
    'OVERDUE',
    'RETURNED',
    'INSPECTING',
    'SETTLEMENT_PENDING',
    'COMPLETED',
    'EXPIRED',
    'NO_SHOW',
    'FULFILLMENT_FAILED'
);
ALTER TABLE "rental_orders"
    ALTER COLUMN "status" TYPE "rental_order_status"
    USING ((
        CASE
            WHEN "order_id" = '9b3c1a5b-aa99-4b9b-9cd3-659f3cd719d9'
              AND "status"::text = 'CANCELLED'
                THEN 'EXPIRED'
            WHEN "order_id" = '4a7d504f-8e60-4d2e-955e-9b45aa1285d0'
              AND "status"::text = 'CANCELLED'
                THEN 'FULFILLMENT_FAILED'
            ELSE "status"::text
        END
    )::"rental_order_status");
ALTER TABLE "rental_order_status_history"
    ALTER COLUMN "old_status" TYPE "rental_order_status"
    USING ((
        CASE
            WHEN "rental_order_id" = '9b3c1a5b-aa99-4b9b-9cd3-659f3cd719d9'
              AND "old_status"::text = 'CANCELLED'
                THEN 'EXPIRED'
            WHEN "rental_order_id" = '4a7d504f-8e60-4d2e-955e-9b45aa1285d0'
              AND "old_status"::text = 'CANCELLED'
                THEN 'FULFILLMENT_FAILED'
            ELSE "old_status"::text
        END
    )::"rental_order_status"),
    ALTER COLUMN "new_status" TYPE "rental_order_status"
    USING ((
        CASE
            WHEN "rental_order_id" = '9b3c1a5b-aa99-4b9b-9cd3-659f3cd719d9'
              AND "new_status"::text = 'CANCELLED'
                THEN 'EXPIRED'
            WHEN "rental_order_id" = '4a7d504f-8e60-4d2e-955e-9b45aa1285d0'
              AND "new_status"::text = 'CANCELLED'
                THEN 'FULFILLMENT_FAILED'
            ELSE "new_status"::text
        END
    )::"rental_order_status");
DROP TYPE "rental_order_status_old";

-- Payment purpose/status vocabulary.
ALTER TYPE "payment_purpose" RENAME TO "payment_purpose_old";
CREATE TYPE "payment_purpose" AS ENUM ('RENTAL', 'DEPOSIT');
ALTER TABLE "payments"
    ALTER COLUMN "purpose" TYPE "payment_purpose"
    USING (
        CASE "purpose"::text
            WHEN 'UPFRONT' THEN 'RENTAL'
            ELSE "purpose"::text
        END
    )::"payment_purpose";
DROP TYPE "payment_purpose_old";

ALTER TYPE "payment_status" RENAME TO "payment_status_old";
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');
ALTER TABLE "payments"
    ALTER COLUMN "status" TYPE "payment_status"
    USING (
        CASE "status"::text
            WHEN 'SUCCESS' THEN 'SUCCEEDED'
            ELSE "status"::text
        END
    )::"payment_status";
DROP TYPE "payment_status_old";

-- Both legacy cancellation/expired-hold refunds are rental refunds.
ALTER TYPE "refund_type" RENAME TO "refund_type_old";
CREATE TYPE "refund_type" AS ENUM ('DEPOSIT_RETURN', 'RENTAL_REFUND');
ALTER TABLE "refunds"
    ALTER COLUMN "type" TYPE "refund_type"
    USING (
        CASE "type"::text
            WHEN 'DEPOSIT_RETURN' THEN 'DEPOSIT_RETURN'
            ELSE 'RENTAL_REFUND'
        END
    )::"refund_type";
DROP TYPE "refund_type_old";

ALTER TYPE "refund_status" RENAME TO "refund_status_old";
CREATE TYPE "refund_status" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');
ALTER TABLE "refunds"
    ALTER COLUMN "status" TYPE "refund_status"
    USING (
        CASE "status"::text
            WHEN 'SUCCESS' THEN 'SUCCEEDED'
            ELSE "status"::text
        END
    )::"refund_status";
DROP TYPE "refund_status_old";

-- Remove cancellation workflow and obsolete policy buffers from the active schema.
DROP TABLE "cancellation_requests";
DROP TYPE "cancellation_request_status";

ALTER TABLE "rental_orders"
    DROP CONSTRAINT "rental_orders_cancelled_by_fkey",
    DROP COLUMN "cancellation_refund_amount",
    DROP COLUMN "cancellation_fee",
    DROP COLUMN "cancellation_reason",
    DROP COLUMN "cancelled_by",
    DROP COLUMN "cancelled_at";

UPDATE "rental_policies"
SET "created_at" = CURRENT_TIMESTAMP
WHERE "created_at" IS NULL;

ALTER TABLE "rental_policies"
    ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN "created_at" SET NOT NULL,
    DROP COLUMN "preparation_buffer",
    DROP COLUMN "cleaning_buffer",
    DROP COLUMN "cancellation_policy";
