import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesSession } from "@/lib/pricing-auth";
import type { SupplierType } from "@/generated/prisma";

export async function GET() {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const suppliers = await prisma.supplier.findMany({
    include: { _count: { select: { rates: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(suppliers);
}

export async function POST(request: NextRequest) {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { name, type, country, city, currency, contactName, contactEmail, contactPhone, notes } =
    body as {
      name?: string;
      type?: SupplierType;
      country?: string;
      city?: string | null;
      currency?: string;
      contactName?: string | null;
      contactEmail?: string | null;
      contactPhone?: string | null;
      notes?: string | null;
    };

  if (!name || !type || !country || !currency) {
    return NextResponse.json(
      { error: "name, type, country and currency are required" },
      { status: 400 }
    );
  }

  const supplier = await prisma.supplier.create({
    data: {
      name,
      type,
      country: country.toUpperCase(),
      city: city ?? null,
      currency: currency.toUpperCase(),
      contactName: contactName ?? null,
      contactEmail: contactEmail ?? null,
      contactPhone: contactPhone ?? null,
      notes: notes ?? null,
    },
  });

  return NextResponse.json(supplier, { status: 201 });
}
