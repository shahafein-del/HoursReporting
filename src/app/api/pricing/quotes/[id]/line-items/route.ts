import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesSession } from "@/lib/pricing-auth";
import { calculateLineItem } from "@/lib/pricing";
import { channelForCustomer, loadPricingContext } from "@/lib/pricing-quote";
import type { Prisma, RateUnit } from "@/generated/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const { id: quoteId } = await params;
  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { customer: true } });
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const {
    supplierRateId,
    description,
    unit,
    netCost,
    netCostCurrency,
    taxIncluded,
    country,
    quantity,
    markupPct,
  } = body as {
    supplierRateId?: string;
    description?: string;
    unit?: RateUnit;
    netCost?: number;
    netCostCurrency?: string;
    taxIncluded?: boolean;
    country?: string;
    quantity?: number;
    markupPct?: number;
  };

  if (quantity === undefined || quantity <= 0) {
    return NextResponse.json({ error: "quantity is required and must be > 0" }, { status: 400 });
  }

  let lineDescription = description;
  let lineUnit = unit;
  let lineNetCost = netCost;
  let lineNetCostCurrency = netCostCurrency;
  let lineTaxIncluded = taxIncluded ?? false;
  let lineCountry = country?.toUpperCase();
  let resolvedSupplierRateId: string | null = null;

  if (supplierRateId) {
    const supplierRate = await prisma.supplierRate.findUnique({
      where: { id: supplierRateId },
      include: { supplier: true },
    });
    if (!supplierRate) return NextResponse.json({ error: "Supplier rate not found" }, { status: 404 });

    resolvedSupplierRateId = supplierRate.id;
    lineDescription = lineDescription ?? `${supplierRate.supplier.name} – ${supplierRate.name}`;
    lineUnit = supplierRate.unit;
    lineNetCost = Number(supplierRate.netCost);
    lineNetCostCurrency = supplierRate.currency;
    lineTaxIncluded = supplierRate.taxIncluded;
    lineCountry = supplierRate.supplier.country;
  }

  if (!lineDescription || !lineUnit || lineNetCost === undefined || !lineNetCostCurrency || !lineCountry) {
    return NextResponse.json(
      {
        error:
          "Either supplierRateId, or description, unit, netCost, netCostCurrency and country, are required",
      },
      { status: 400 }
    );
  }

  const effectiveMarkupPct = markupPct ?? Number(quote.customer.defaultMarkupPct);
  const { exchangeRates, taxRules } = await loadPricingContext();

  const result = calculateLineItem({
    netCost: lineNetCost,
    netCostCurrency: lineNetCostCurrency.toUpperCase(),
    quoteCurrency: quote.currency,
    quantity,
    markupPct: effectiveMarkupPct,
    unit: lineUnit,
    taxIncluded: lineTaxIncluded,
    country: lineCountry,
    channel: channelForCustomer(quote.customer),
    exchangeRates,
    taxRules,
  });

  const last = await prisma.quoteLineItem.findFirst({
    where: { quoteId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const lineItem = await prisma.quoteLineItem.create({
    data: {
      quoteId,
      supplierRateId: resolvedSupplierRateId,
      description: lineDescription,
      unit: lineUnit,
      quantity,
      netCost: lineNetCost,
      netCostCurrency: lineNetCostCurrency.toUpperCase(),
      exchangeRate: result.exchangeRate,
      markupPct: effectiveMarkupPct,
      country: lineCountry,
      taxIncluded: lineTaxIncluded,
      sellPrice: result.sellPrice,
      taxBreakdown: result.taxBreakdown as unknown as Prisma.InputJsonValue,
      taxTotal: result.taxTotal,
      lineTotal: result.lineTotal,
      sortOrder: (last?.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json(lineItem, { status: 201 });
}
