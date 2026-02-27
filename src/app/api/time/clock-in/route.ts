import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const body = await request.json().catch(() => ({}));
  const { lat, lng, accuracy } = body as {
    lat?: number;
    lng?: number;
    accuracy?: number;
  };

  // Check for an open entry
  const openEntry = await prisma.timeEntry.findFirst({
    where: { userId, clockOut: null, clockIn: { not: null }, type: "WORK" },
  });
  if (openEntry) {
    return NextResponse.json(
      { error: "Already clocked in" },
      { status: 409 }
    );
  }

  const entry = await prisma.timeEntry.create({
    data: {
      userId,
      type: "WORK",
      status: "APPROVED",
      clockIn: new Date(),
      clockInLat: lat ?? null,
      clockInLng: lng ?? null,
      clockInAccuracy: accuracy ?? null,
    },
  });

  return NextResponse.json(entry, { status: 201 });
}
