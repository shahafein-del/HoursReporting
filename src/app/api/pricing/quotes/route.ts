import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesSession } from "@/lib/pricing-auth";
import { calculateQuoteTotals } from "@/lib/pricing";

export async function GET() {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const quotes = await prisma.quote.findMany({
    include: {
      customer: { select: { id: true, name: true, type: true, currency: true } },
      lineItems: { select: { sellPrice: true, quantity: true, taxTotal: true, lineTotal: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const result = quotes.map(({ lineItems, ...quote }) => ({
    ...quote,
    totals: calculateQuoteTotals(
      lineItems.map((li) => ({
        sellPrice: Number(li.sellPrice),
        quantity: Number(li.quantity),
        taxTotal: Number(li.taxTotal),
        lineTotal: Number(li.lineTotal),
      }))
    ),
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { customerId, title, currency, validUntil, notes } = body as {
    customerId?: string;
    title?: string;
    currency?: string;
    validUntil?: string | null;
    notes?: string | null;
  };

  if (!customerId || !title) {
    return NextResponse.json({ error: "customerId and title are required" }, { status: 400 });
  }

  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });

  const quote = await prisma.quote.create({
    data: {
      customerId,
      title,
      currency: (currency ?? customer.currency).toUpperCase(),
      validUntil: validUntil ? new Date(validUntil) : null,
      notes: notes ?? null,
      createdById: access.session.user.id,
    },
    include: { customer: true },
  });

  return NextResponse.json(quote, { status: 201 });
}
