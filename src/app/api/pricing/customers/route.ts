import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesSession } from "@/lib/pricing-auth";
import type { CustomerType } from "@/generated/prisma";

export async function GET() {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const customers = await prisma.customer.findMany({
    include: { _count: { select: { quotes: true } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(customers);
}

export async function POST(request: NextRequest) {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

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

  if (!name || !type) {
    return NextResponse.json({ error: "name and type are required" }, { status: 400 });
  }

  const customer = await prisma.customer.create({
    data: {
      name,
      type,
      country: country ? country.toUpperCase() : null,
      currency: (currency ?? "USD").toUpperCase(),
      defaultMarkupPct: defaultMarkupPct ?? 0,
      contactName: contactName ?? null,
      contactEmail: contactEmail ?? null,
      contactPhone: contactPhone ?? null,
      notes: notes ?? null,
    },
  });

  return NextResponse.json(customer, { status: 201 });
}
