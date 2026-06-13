import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesSession } from "@/lib/pricing-auth";
import type { TaxCalcType, TaxAppliesTo, SalesChannel } from "@/generated/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { name, country, type, appliesTo, rate, currency, channel, active, notes } = body as {
    name?: string;
    country?: string;
    type?: TaxCalcType;
    appliesTo?: TaxAppliesTo;
    rate?: number;
    currency?: string | null;
    channel?: SalesChannel;
    active?: boolean;
    notes?: string | null;
  };

  const taxRule = await prisma.taxRule.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(country !== undefined ? { country: country === "*" ? "*" : country.toUpperCase() } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(appliesTo !== undefined ? { appliesTo } : {}),
      ...(rate !== undefined ? { rate } : {}),
      ...(currency !== undefined ? { currency: currency ? currency.toUpperCase() : null } : {}),
      ...(channel !== undefined ? { channel } : {}),
      ...(active !== undefined ? { active } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
  });

  return NextResponse.json(taxRule);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const { id } = await params;
  await prisma.taxRule.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
