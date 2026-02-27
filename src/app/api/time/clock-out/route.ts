import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;
  const body = await request.json().catch(() => ({}));
  const { lat, lng, accuracy } = body as {
    lat?: number;
    lng?: number;
    accuracy?: number;
  };

  const openEntry = await prisma.timeEntry.findFirst({
    where: { userId, clockOut: null, clockIn: { not: null }, type: "WORK" },
  });
  if (!openEntry) {
    return NextResponse.json({ error: "No open entry" }, { status: 404 });
  }

  const entry = await prisma.timeEntry.update({
    where: { id: openEntry.id },
    data: {
      clockOut: new Date(),
      clockOutLat: lat ?? null,
      clockOutLng: lng ?? null,
      clockOutAccuracy: accuracy ?? null,
    },
  });

  return NextResponse.json(entry);
}
