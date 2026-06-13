import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesSession } from "@/lib/pricing-auth";
import type { TaxCalcType, TaxAppliesTo, SalesChannel } from "@/generated/prisma";

export async function GET() {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const taxRules = await prisma.taxRule.findMany({
    orderBy: [{ country: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(taxRules);
}

export async function POST(request: NextRequest) {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { name, country, type, appliesTo, rate, currency, channel, notes } = body as {
    name?: string;
    country?: string;
    type?: TaxCalcType;
    appliesTo?: TaxAppliesTo;
    rate?: number;
    currency?: string | null;
    channel?: SalesChannel;
    notes?: string | null;
  };

  if (!name || !country || !type || !appliesTo || rate === undefined) {
    return NextResponse.json(
      { error: "name, country, type, appliesTo and rate are required" },
      { status: 400 }
    );
  }

  if (type === "FIXED_AMOUNT" && !currency) {
    return NextResponse.json(
      { error: "currency is required for FIXED_AMOUNT tax rules" },
      { status: 400 }
    );
  }

  const taxRule = await prisma.taxRule.create({
    data: {
      name,
      country: country === "*" ? "*" : country.toUpperCase(),
      type,
      appliesTo,
      rate,
      currency: currency ? currency.toUpperCase() : null,
      channel: channel ?? "BOTH",
      notes: notes ?? null,
    },
  });

  return NextResponse.json(taxRule, { status: 201 });
}
