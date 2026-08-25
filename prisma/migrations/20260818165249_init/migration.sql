-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('CUSTOMER', 'RENTAL_STAFF', 'STORE_MANAGER');

-- CreateEnum
CREATE TYPE "rental_order_status" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'PREPARING', 'READY_FOR_PICKUP', 'RENTING', 'OVERDUE', 'RETURNED', 'INSPECTING', 'SETTLEMENT_PENDING', 'COMPLETED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "reservation_status" AS ENUM ('TEMPORARY_HOLD', 'CONFIRMED', 'ACTIVE', 'EXPIRED', 'RELEASED', 'CANCELLED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "rental_unit_status" AS ENUM ('AVAILABLE', 'PREPARING', 'RENTED', 'RETURN_INSPECTION', 'CLEANING', 'MAINTENANCE', 'DAMAGED', 'RETIRED');

-- CreateEnum
CREATE TYPE "block_type" AS ENUM ('CLEANING', 'MAINTENANCE', 'REPAIR', 'MANUAL_BLOCK');

-- CreateEnum
CREATE TYPE "fee_approval_status" AS ENUM ('PENDING', 'APPROVED', 'ADJUSTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "payment_purpose" AS ENUM ('UPFRONT', 'ADDITIONAL');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "refund_type" AS ENUM ('DEPOSIT_RETURN', 'CANCELLATION_REFUND');

-- CreateEnum
CREATE TYPE "refund_status" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');

-- CreateEnum
CREATE TYPE "cancellation_request_status" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "user_id" UUID NOT NULL,
    "full_name" VARCHAR(150) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(30),
    "password_hash" VARCHAR(255) NOT NULL,
    "national_id" VARCHAR(20),
    "role" "user_role" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "categories" (
    "category_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "garments" (
    "garment_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "color" VARCHAR(100),
    "image_urls" TEXT,
    "rental_price" DECIMAL(12,2) NOT NULL,
    "deposit_amount" DECIMAL(12,2) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "garments_pkey" PRIMARY KEY ("garment_id")
);

-- CreateTable
CREATE TABLE "rental_units" (
    "rental_unit_id" UUID NOT NULL,
    "garment_id" UUID NOT NULL,
    "asset_code" VARCHAR(100) NOT NULL,
    "size" VARCHAR(50) NOT NULL,
    "condition" VARCHAR(100),
    "status" "rental_unit_status" NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rental_units_pkey" PRIMARY KEY ("rental_unit_id")
);

-- CreateTable
CREATE TABLE "availability_blocks" (
    "block_id" UUID NOT NULL,
    "rental_unit_id" UUID NOT NULL,
    "type" "block_type" NOT NULL,
    "start_at" TIMESTAMP(6) NOT NULL,
    "end_at" TIMESTAMP(6) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" VARCHAR(50),

    CONSTRAINT "availability_blocks_pkey" PRIMARY KEY ("block_id")
);

-- CreateTable
CREATE TABLE "rental_policies" (
    "policy_id" UUID NOT NULL,
    "version" VARCHAR(50) NOT NULL,
    "effective_from" TIMESTAMP(6) NOT NULL,
    "effective_to" TIMESTAMP(6),
    "preparation_buffer" INTEGER NOT NULL,
    "cleaning_buffer" INTEGER NOT NULL,
    "hold_duration" INTEGER NOT NULL,
    "approval_threshold" DECIMAL(12,2) NOT NULL,
    "late_fee_policy" TEXT,
    "damage_fee_policy" TEXT,
    "cancellation_policy" TEXT,

    CONSTRAINT "rental_policies_pkey" PRIMARY KEY ("policy_id")
);

-- CreateTable
CREATE TABLE "rental_carts" (
    "cart_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "rental_start_at" TIMESTAMP(6),
    "return_due_at" TIMESTAMP(6),
    "updated_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "rental_carts_pkey" PRIMARY KEY ("cart_id")
);

-- CreateTable
CREATE TABLE "rental_cart_items" (
    "cart_item_id" UUID NOT NULL,
    "cart_id" UUID NOT NULL,
    "garment_id" UUID NOT NULL,
    "requested_size" VARCHAR(50) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "rental_cart_items_pkey" PRIMARY KEY ("cart_item_id")
);

-- CreateTable
CREATE TABLE "rental_orders" (
    "order_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "rental_start_at" TIMESTAMP(6) NOT NULL,
    "return_due_at" TIMESTAMP(6) NOT NULL,
    "actual_pickup_at" TIMESTAMP(6),
    "actual_return_at" TIMESTAMP(6),
    "pickup_info" TEXT,
    "return_info" TEXT,
    "status" "rental_order_status" NOT NULL,
    "rental_amount" DECIMAL(12,2) NOT NULL,
    "deposit_amount" DECIMAL(12,2) NOT NULL,
    "upfront_amount" DECIMAL(12,2) NOT NULL,
    "additional_charge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deposit_refund_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cancellation_refund_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "additional_payment" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "final_charge" DECIMAL(12,2),
    "total_paid" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_refunded" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "net_collected" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cancellation_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "cancellation_reason" TEXT,
    "cancelled_by" UUID,
    "cancelled_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rental_orders_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "rental_order_items" (
    "order_item_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "garment_id" UUID NOT NULL,
    "requested_size" VARCHAR(50) NOT NULL,

    CONSTRAINT "rental_order_items_pkey" PRIMARY KEY ("order_item_id")
);

-- CreateTable
CREATE TABLE "reservations" (
    "reservation_id" UUID NOT NULL,
    "rental_order_item_id" UUID NOT NULL,
    "rental_unit_id" UUID NOT NULL,
    "status" "reservation_status" NOT NULL,
    "blocked_start_at" TIMESTAMP(6) NOT NULL,
    "blocked_end_at" TIMESTAMP(6) NOT NULL,
    "hold_expires_at" TIMESTAMP(6),
    "preparation_condition" VARCHAR(100),
    "preparation_notes" TEXT,
    "preparation_images" TEXT,
    "prepared_at" TIMESTAMP(6),
    "replacement_reason" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservations_pkey" PRIMARY KEY ("reservation_id")
);

-- CreateTable
CREATE TABLE "inspection_results" (
    "inspection_result_id" UUID NOT NULL,
    "rental_order_item_id" UUID NOT NULL,
    "rental_unit_id" UUID NOT NULL,
    "inspected_by" UUID NOT NULL,
    "condition" VARCHAR(100) NOT NULL,
    "accessories_status" VARCHAR(100),
    "issue_type" VARCHAR(100),
    "description" TEXT,
    "evidence_urls" TEXT,
    "proposed_charge" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "inspected_at" TIMESTAMP(6) NOT NULL,

    CONSTRAINT "inspection_results_pkey" PRIMARY KEY ("inspection_result_id")
);

-- CreateTable
CREATE TABLE "fee_approval_requests" (
    "fee_approval_request_id" UUID NOT NULL,
    "rental_order_id" UUID NOT NULL,
    "proposed_amount" DECIMAL(12,2) NOT NULL,
    "final_amount" DECIMAL(12,2),
    "status" "fee_approval_status" NOT NULL,
    "decision_reason" TEXT,
    "decided_by" UUID,
    "decided_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fee_approval_requests_pkey" PRIMARY KEY ("fee_approval_request_id")
);

-- CreateTable
CREATE TABLE "payments" (
    "payment_id" UUID NOT NULL,
    "rental_order_id" UUID NOT NULL,
    "purpose" "payment_purpose" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "payment_status" NOT NULL,
    "transaction_ref" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid_at" TIMESTAMP(6),

    CONSTRAINT "payments_pkey" PRIMARY KEY ("payment_id")
);

-- CreateTable
CREATE TABLE "refunds" (
    "refund_id" UUID NOT NULL,
    "payment_id" UUID NOT NULL,
    "type" "refund_type" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "status" "refund_status" NOT NULL,
    "transaction_ref" VARCHAR(255),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(6),

    CONSTRAINT "refunds_pkey" PRIMARY KEY ("refund_id")
);

-- CreateTable
CREATE TABLE "cancellation_requests" (
    "cancellation_request_id" UUID NOT NULL,
    "rental_order_id" UUID NOT NULL,
    "policy_id" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "cancellation_request_status" NOT NULL,
    "requested_by" UUID NOT NULL,
    "requested_at" TIMESTAMP(6) NOT NULL,
    "decided_by" UUID,
    "decision_reason" TEXT,
    "decided_at" TIMESTAMP(6),
    "cancellation_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "refund_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "cancellation_requests_pkey" PRIMARY KEY ("cancellation_request_id")
);

-- CreateTable
CREATE TABLE "rental_order_status_history" (
    "history_id" UUID NOT NULL,
    "rental_order_id" UUID NOT NULL,
    "old_status" "rental_order_status",
    "new_status" "rental_order_status" NOT NULL,
    "changed_by" UUID,
    "changed_at" TIMESTAMP(6) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "rental_order_status_history_pkey" PRIMARY KEY ("history_id")
);

-- CreateTable
CREATE TABLE "rental_unit_status_history" (
    "history_id" UUID NOT NULL,
    "rental_unit_id" UUID NOT NULL,
    "old_status" "rental_unit_status",
    "new_status" "rental_unit_status" NOT NULL,
    "changed_by" UUID,
    "changed_at" TIMESTAMP(6) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "rental_unit_status_history_pkey" PRIMARY KEY ("history_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_national_id_key" ON "users"("national_id");

-- CreateIndex
CREATE UNIQUE INDEX "rental_units_asset_code_key" ON "rental_units"("asset_code");

-- CreateIndex
CREATE UNIQUE INDEX "rental_policies_version_key" ON "rental_policies"("version");

-- CreateIndex
CREATE UNIQUE INDEX "rental_carts_customer_id_key" ON "rental_carts"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "inspection_results_rental_order_item_id_key" ON "inspection_results"("rental_order_item_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_transaction_ref_key" ON "payments"("transaction_ref");

-- CreateIndex
CREATE UNIQUE INDEX "refunds_transaction_ref_key" ON "refunds"("transaction_ref");

-- AddForeignKey
ALTER TABLE "garments" ADD CONSTRAINT "garments_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_units" ADD CONSTRAINT "rental_units_garment_id_fkey" FOREIGN KEY ("garment_id") REFERENCES "garments"("garment_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability_blocks" ADD CONSTRAINT "availability_blocks_rental_unit_id_fkey" FOREIGN KEY ("rental_unit_id") REFERENCES "rental_units"("rental_unit_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_carts" ADD CONSTRAINT "rental_carts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_cart_items" ADD CONSTRAINT "rental_cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "rental_carts"("cart_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_cart_items" ADD CONSTRAINT "rental_cart_items_garment_id_fkey" FOREIGN KEY ("garment_id") REFERENCES "garments"("garment_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_orders" ADD CONSTRAINT "rental_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_orders" ADD CONSTRAINT "rental_orders_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "rental_policies"("policy_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_orders" ADD CONSTRAINT "rental_orders_cancelled_by_fkey" FOREIGN KEY ("cancelled_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_order_items" ADD CONSTRAINT "rental_order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "rental_orders"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_order_items" ADD CONSTRAINT "rental_order_items_garment_id_fkey" FOREIGN KEY ("garment_id") REFERENCES "garments"("garment_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_rental_order_item_id_fkey" FOREIGN KEY ("rental_order_item_id") REFERENCES "rental_order_items"("order_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_rental_unit_id_fkey" FOREIGN KEY ("rental_unit_id") REFERENCES "rental_units"("rental_unit_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_results" ADD CONSTRAINT "inspection_results_rental_order_item_id_fkey" FOREIGN KEY ("rental_order_item_id") REFERENCES "rental_order_items"("order_item_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_results" ADD CONSTRAINT "inspection_results_rental_unit_id_fkey" FOREIGN KEY ("rental_unit_id") REFERENCES "rental_units"("rental_unit_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_results" ADD CONSTRAINT "inspection_results_inspected_by_fkey" FOREIGN KEY ("inspected_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_approval_requests" ADD CONSTRAINT "fee_approval_requests_rental_order_id_fkey" FOREIGN KEY ("rental_order_id") REFERENCES "rental_orders"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fee_approval_requests" ADD CONSTRAINT "fee_approval_requests_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_rental_order_id_fkey" FOREIGN KEY ("rental_order_id") REFERENCES "rental_orders"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("payment_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellation_requests" ADD CONSTRAINT "cancellation_requests_rental_order_id_fkey" FOREIGN KEY ("rental_order_id") REFERENCES "rental_orders"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellation_requests" ADD CONSTRAINT "cancellation_requests_policy_id_fkey" FOREIGN KEY ("policy_id") REFERENCES "rental_policies"("policy_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellation_requests" ADD CONSTRAINT "cancellation_requests_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "users"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cancellation_requests" ADD CONSTRAINT "cancellation_requests_decided_by_fkey" FOREIGN KEY ("decided_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_order_status_history" ADD CONSTRAINT "rental_order_status_history_rental_order_id_fkey" FOREIGN KEY ("rental_order_id") REFERENCES "rental_orders"("order_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_order_status_history" ADD CONSTRAINT "rental_order_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_unit_status_history" ADD CONSTRAINT "rental_unit_status_history_rental_unit_id_fkey" FOREIGN KEY ("rental_unit_id") REFERENCES "rental_units"("rental_unit_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_unit_status_history" ADD CONSTRAINT "rental_unit_status_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
