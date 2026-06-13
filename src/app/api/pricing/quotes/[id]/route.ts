import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesSession } from "@/lib/pricing-auth";
import { calculateQuoteTotals } from "@/lib/pricing";
import type { QuoteStatus } from "@/generated/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const { id } = await params;
  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      customer: true,
      createdBy: { select: { id: true, name: true, email: true } },
      lineItems: { orderBy: { sortOrder: "asc" }, include: { supplierRate: { include: { supplier: true } } } },
    },
  });

  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const totals = calculateQuoteTotals(
    quote.lineItems.map((li) => ({
      sellPrice: Number(li.sellPrice),
      quantity: Number(li.quantity),
      taxTotal: Number(li.taxTotal),
      lineTotal: Number(li.lineTotal),
    }))
  );

  return NextResponse.json({ ...quote, totals });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { title, status, validUntil, notes } = body as {
    title?: string;
    status?: QuoteStatus;
    validUntil?: string | null;
    notes?: string | null;
  };

  const quote = await prisma.quote.update({
    where: { id },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(status !== undefined ? { status } : {}),
      ...(validUntil !== undefined ? { validUntil: validUntil ? new Date(validUntil) : null } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
    include: { customer: true },
  });

  return NextResponse.json(quote);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const { id } = await params;
  await prisma.quote.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
