import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesSession } from "@/lib/pricing-auth";
import type { CustomerType } from "@/generated/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { quotes: { orderBy: { createdAt: "desc" } } },
  });

  if (!customer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(customer);
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
    currency,
    defaultMarkupPct,
    contactName,
    contactEmail,
    contactPhone,
    notes,
  } = body as {
    name?: string;
    type?: CustomerType;
    country?: string | null;
    currency?: string;
    defaultMarkupPct?: number;
    contactName?: string | null;
    contactEmail?: string | null;
    contactPhone?: string | null;
    notes?: string | null;
  };

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(type !== undefined ? { type } : {}),
      ...(country !== undefined ? { country: country ? country.toUpperCase() : null } : {}),
      ...(currency !== undefined ? { currency: currency.toUpperCase() } : {}),
      ...(defaultMarkupPct !== undefined ? { defaultMarkupPct } : {}),
      ...(contactName !== undefined ? { contactName } : {}),
      ...(contactEmail !== undefined ? { contactEmail } : {}),
      ...(contactPhone !== undefined ? { contactPhone } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
  });

  return NextResponse.json(customer);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const { id } = await params;
  await prisma.customer.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
