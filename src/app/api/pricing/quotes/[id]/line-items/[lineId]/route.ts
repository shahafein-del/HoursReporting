import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesSession } from "@/lib/pricing-auth";
import { calculateLineItem } from "@/lib/pricing";
import { channelForCustomer, loadPricingContext } from "@/lib/pricing-quote";
import type { Prisma } from "@/generated/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const { id: quoteId, lineId } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { description, quantity, markupPct } = body as {
    description?: string;
    quantity?: number;
    markupPct?: number;
  };

  const lineItem = await prisma.quoteLineItem.findUnique({ where: { id: lineId } });
  if (!lineItem || lineItem.quoteId !== quoteId) {
    return NextResponse.json({ error: "Line item not found" }, { status: 404 });
  }

  const quote = await prisma.quote.findUnique({ where: { id: quoteId }, include: { customer: true } });
  if (!quote) return NextResponse.json({ error: "Quote not found" }, { status: 404 });

  if (quantity !== undefined && quantity <= 0) {
    return NextResponse.json({ error: "quantity must be > 0" }, { status: 400 });
  }

  const effectiveQuantity = quantity ?? Number(lineItem.quantity);
  const effectiveMarkupPct = markupPct ?? Number(lineItem.markupPct);

  const { exchangeRates, taxRules } = await loadPricingContext();

  const result = calculateLineItem({
    netCost: Number(lineItem.netCost),
    netCostCurrency: lineItem.netCostCurrency,
    quoteCurrency: quote.currency,
    quantity: effectiveQuantity,
    markupPct: effectiveMarkupPct,
    unit: lineItem.unit,
    taxIncluded: lineItem.taxIncluded,
    country: lineItem.country,
    channel: channelForCustomer(quote.customer),
    exchangeRates,
    taxRules,
  });

  const updated = await prisma.quoteLineItem.update({
    where: { id: lineId },
    data: {
      ...(description !== undefined ? { description } : {}),
      quantity: effectiveQuantity,
      markupPct: effectiveMarkupPct,
      exchangeRate: result.exchangeRate,
      sellPrice: result.sellPrice,
      taxBreakdown: result.taxBreakdown as unknown as Prisma.InputJsonValue,
      taxTotal: result.taxTotal,
      lineTotal: result.lineTotal,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const { id: quoteId, lineId } = await params;
  const lineItem = await prisma.quoteLineItem.findUnique({ where: { id: lineId } });
  if (!lineItem || lineItem.quoteId !== quoteId) {
    return NextResponse.json({ error: "Line item not found" }, { status: 404 });
  }

  await prisma.quoteLineItem.delete({ where: { id: lineId } });
  return NextResponse.json({ success: true });
}
