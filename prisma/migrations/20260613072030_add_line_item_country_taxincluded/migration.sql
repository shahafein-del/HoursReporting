/*
  Warnings:

  - Added the required column `country` to the `QuoteLineItem` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "QuoteLineItem" ADD COLUMN     "country" TEXT NOT NULL,
ADD COLUMN     "taxIncluded" BOOLEAN NOT NULL DEFAULT false;
