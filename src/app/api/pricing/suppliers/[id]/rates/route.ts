import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesSession } from "@/lib/pricing-auth";
import type { RateUnit, SalesChannel } from "@/generated/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const { id } = await params;
  const rates = await prisma.supplierRate.findMany({
    where: { supplierId: id },
    orderBy: { validFrom: "desc" },
  });

  return NextResponse.json(rates);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({ where: { id } });
  if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

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
    notes?: string | null;
  };

  if (!name || !unit || netCost === undefined || !validFrom || !validTo) {
    return NextResponse.json(
      { error: "name, unit, netCost, validFrom and validTo are required" },
      { status: 400 }
    );
  }

  const rate = await prisma.supplierRate.create({
    data: {
      supplierId: id,
      name,
      unit,
      netCost,
      currency: (currency ?? supplier.currency).toUpperCase(),
      channel: channel ?? "BOTH",
      validFrom: new Date(validFrom),
      validTo: new Date(validTo),
      minPax: minPax ?? null,
      maxPax: maxPax ?? null,
      taxIncluded: taxIncluded ?? false,
      notes: notes ?? null,
    },
  });

  return NextResponse.json(rate, { status: 201 });
}
