/*
  Warnings:

  - A unique constraint covering the columns `[cart_id,garment_id,requested_size]` on the table `rental_cart_items` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "rental_cart_items_cart_id_garment_id_requested_size_key" ON "rental_cart_items"("cart_id", "garment_id", "requested_size");
