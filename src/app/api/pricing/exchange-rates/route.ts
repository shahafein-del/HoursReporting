import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesSession } from "@/lib/pricing-auth";

export async function GET() {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const rates = await prisma.exchangeRate.findMany({
    orderBy: [{ base: "asc" }, { quote: "asc" }],
  });

  return NextResponse.json(rates);
}

/**
 * Create or update (upsert by base/quote pair) an exchange rate.
 */
export async function POST(request: NextRequest) {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { base, quote, rate } = body as { base?: string; quote?: string; rate?: number };

  if (!base || !quote || rate === undefined) {
    return NextResponse.json({ error: "base, quote and rate are required" }, { status: 400 });
  }

  if (base.toUpperCase() === quote.toUpperCase()) {
    return NextResponse.json({ error: "base and quote currencies must differ" }, { status: 400 });
  }

  const exchangeRate = await prisma.exchangeRate.upsert({
    where: { base_quote: { base: base.toUpperCase(), quote: quote.toUpperCase() } },
    update: { rate, asOf: new Date() },
    create: { base: base.toUpperCase(), quote: quote.toUpperCase(), rate },
  });

  return NextResponse.json(exchangeRate, { status: 201 });
}
