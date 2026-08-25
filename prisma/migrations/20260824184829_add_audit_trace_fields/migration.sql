-- AlterTable
ALTER TABLE "rental_policies" ADD COLUMN     "created_at" TIMESTAMP(6),
ADD COLUMN     "created_by" UUID;

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN     "replaced_at" TIMESTAMP(6),
ADD COLUMN     "replaced_by" UUID;

-- AddForeignKey
ALTER TABLE "rental_policies" ADD CONSTRAINT "rental_policies_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservations" ADD CONSTRAINT "reservations_replaced_by_fkey" FOREIGN KEY ("replaced_by") REFERENCES "users"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
