import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesSession } from "@/lib/pricing-auth";
import type { RateUnit, SalesChannel } from "@/generated/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const {
    name,
    unit,
    netCost,
    currency,
    channel,
    validFrom,
    validTo,
    minPax,
    maxPax,
    taxIncluded,
    active,
    notes,
  } = body as {
    name?: string;
    unit?: RateUnit;
    netCost?: number;
    currency?: string;
    channel?: SalesChannel;
    validFrom?: string;
    validTo?: string;
    minPax?: number | null;
    maxPax?: number | null;
    taxIncluded?: boolean;
    active?: boolean;
    notes?: string | null;
  };

  const rate = await prisma.supplierRate.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(unit !== undefined ? { unit } : {}),
      ...(netCost !== undefined ? { netCost } : {}),
      ...(currency !== undefined ? { currency: currency.toUpperCase() } : {}),
      ...(channel !== undefined ? { channel } : {}),
      ...(validFrom !== undefined ? { validFrom: new Date(validFrom) } : {}),
      ...(validTo !== undefined ? { validTo: new Date(validTo) } : {}),
      ...(minPax !== undefined ? { minPax } : {}),
      ...(maxPax !== undefined ? { maxPax } : {}),
      ...(taxIncluded !== undefined ? { taxIncluded } : {}),
      ...(active !== undefined ? { active } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
  });

  return NextResponse.json(rate);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const { id } = await params;
  await prisma.supplierRate.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
