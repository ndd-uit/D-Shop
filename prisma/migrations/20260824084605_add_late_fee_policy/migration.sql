/*
  Warnings:

  - The `late_fee_policy` column on the `rental_policies` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "rental_policies" DROP COLUMN "late_fee_policy",
ADD COLUMN     "late_fee_policy" JSONB;
