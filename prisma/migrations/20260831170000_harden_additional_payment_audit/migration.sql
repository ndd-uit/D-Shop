-- Persist the Staff audit trail for direct additional-payment confirmation.
ALTER TABLE "rental_orders"
ADD COLUMN "additional_payment_confirmed_at" TIMESTAMP(6),
ADD COLUMN "additional_payment_confirmed_by" UUID;

ALTER TABLE "rental_orders"
ADD CONSTRAINT "rental_orders_additional_payment_confirmed_by_fkey"
FOREIGN KEY ("additional_payment_confirmed_by")
REFERENCES "users"("user_id")
ON DELETE SET NULL
ON UPDATE CASCADE;
