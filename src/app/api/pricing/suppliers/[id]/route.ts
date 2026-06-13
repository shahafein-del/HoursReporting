import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesSession } from "@/lib/pricing-auth";
import type { SupplierType } from "@/generated/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const { id } = await params;
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: { rates: { orderBy: { validFrom: "desc" } } },
  });

  if (!supplier) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(supplier);
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

  const {
    name,
    type,
    country,
    city,
    currency,
    contactName,
    contactEmail,
    contactPhone,
    notes,
    active,
  } = body as {
    name?: string;
    type?: SupplierType;
    country?: string;
    city?: string | null;
    currency?: string;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    notes?: string | null;
    active?: boolean;
  };

  const supplier = await prisma.supplier.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(country !== undefined ? { country: country.toUpperCase() } : {}),
      ...(city !== undefined ? { city } : {}),
      ...(currency !== undefined ? { currency: currency.toUpperCase() } : {}),
      ...(contactName !== undefined ? { contactName } : {}),
      ...(contactEmail !== undefined ? { contactEmail } : {}),
      ...(contactPhone !== undefined ? { contactPhone } : {}),
      ...(notes !== undefined ? { notes } : {}),
      ...(active !== undefined ? { active } : {}),
    },
  });

  return NextResponse.json(supplier);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const { id } = await params;
  await prisma.supplier.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
