import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSalesSession } from "@/lib/pricing-auth";
import type { SalesChannel } from "@/generated/prisma";

/**
 * Search across all supplier rates — used by the quote builder to find
 * candidate rates for a line item. Supports filtering by destination
 * country, sales channel and a "valid on" date (for seasonal rates).
 */
export async function GET(request: NextRequest) {
  const access = await requireSalesSession();
  if ("error" in access) return access.error;

  const { searchParams } = request.nextUrl;
  const country = searchParams.get("country")?.toUpperCase();
  const channel = searchParams.get("channel") as SalesChannel | null;
  const validOn = searchParams.get("validOn");
  const q = searchParams.get("q");

  const rates = await prisma.supplierRate.findMany({
    where: {
      active: true,
      ...(country ? { supplier: { country } } : {}),
      ...(channel ? { channel: { in: [channel, "BOTH"] } } : {}),
      ...(validOn
        ? { validFrom: { lte: new Date(validOn) }, validTo: { gte: new Date(validOn) } }
        : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { supplier: { name: { contains: q, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    include: { supplier: true },
    orderBy: [{ supplier: { name: "asc" } }, { validFrom: "desc" }],
    take: 100,
  });

  return NextResponse.json(rates);
}
