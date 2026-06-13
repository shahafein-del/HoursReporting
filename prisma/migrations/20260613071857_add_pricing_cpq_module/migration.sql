-- CreateEnum
CREATE TYPE "SupplierType" AS ENUM ('ACCOMMODATION', 'TRANSPORT', 'ACTIVITY', 'GUIDE', 'MEAL', 'ENTRANCE_FEE', 'INSURANCE', 'FLIGHT', 'OTHER');

-- CreateEnum
CREATE TYPE "RateUnit" AS ENUM ('PER_PERSON', 'PER_NIGHT', 'PER_PERSON_PER_NIGHT', 'PER_GROUP', 'PER_DAY', 'FLAT');

-- CreateEnum
CREATE TYPE "SalesChannel" AS ENUM ('B2B', 'B2C', 'BOTH');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('B2B_AGENCY', 'B2C_INDIVIDUAL');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "TaxCalcType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "TaxAppliesTo" AS ENUM ('SUBTOTAL', 'PER_PERSON_PER_NIGHT', 'PER_PERSON', 'PER_BOOKING');

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SupplierType" NOT NULL,
    "country" TEXT NOT NULL,
    "city" TEXT,
    "currency" TEXT NOT NULL,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierRate" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unit" "RateUnit" NOT NULL,
    "netCost" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "channel" "SalesChannel" NOT NULL DEFAULT 'BOTH',
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL,
    "minPax" INTEGER,
    "maxPax" INTEGER,
    "taxIncluded" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "type" "TaxCalcType" NOT NULL,
    "appliesTo" "TaxAppliesTo" NOT NULL,
    "rate" DECIMAL(8,3) NOT NULL,
    "currency" TEXT,
    "channel" "SalesChannel" NOT NULL DEFAULT 'BOTH',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExchangeRate" (
    "id" TEXT NOT NULL,
    "base" TEXT NOT NULL,
    "quote" TEXT NOT NULL,
    "rate" DECIMAL(14,6) NOT NULL,
    "asOf" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CustomerType" NOT NULL,
    "country" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "defaultMarkupPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quote" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "validUntil" TIMESTAMP(3),
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuoteLineItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "supplierRateId" TEXT,
    "description" TEXT NOT NULL,
    "unit" "RateUnit" NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "netCost" DECIMAL(10,2) NOT NULL,
    "netCostCurrency" TEXT NOT NULL,
    "exchangeRate" DECIMAL(14,6) NOT NULL DEFAULT 1,
    "markupPct" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "sellPrice" DECIMAL(10,2) NOT NULL,
    "taxBreakdown" JSONB,
    "taxTotal" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL(10,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuoteLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SupplierRate_supplierId_idx" ON "SupplierRate"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierRate_validFrom_validTo_idx" ON "SupplierRate"("validFrom", "validTo");

-- CreateIndex
CREATE INDEX "TaxRule_country_idx" ON "TaxRule"("country");

-- CreateIndex
CREATE UNIQUE INDEX "ExchangeRate_base_quote_key" ON "ExchangeRate"("base", "quote");

-- CreateIndex
CREATE INDEX "Quote_customerId_idx" ON "Quote"("customerId");

-- CreateIndex
CREATE INDEX "QuoteLineItem_quoteId_idx" ON "QuoteLineItem"("quoteId");

-- AddForeignKey
ALTER TABLE "SupplierRate" ADD CONSTRAINT "SupplierRate_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quote" ADD CONSTRAINT "Quote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuoteLineItem" ADD CONSTRAINT "QuoteLineItem_supplierRateId_fkey" FOREIGN KEY ("supplierRateId") REFERENCES "SupplierRate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
