import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubordinateIds } from "@/lib/hierarchy";
import { durationHours } from "@/lib/time-utils";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined;

  const subordinateIds =
    role === "ADMIN"
      ? (await prisma.user.findMany({ select: { id: true } })).map((u) => u.id)
      : await getSubordinateIds(session.user.id);

  const users = await prisma.user.findMany({
    where: { id: { in: subordinateIds } },
    select: { id: true, name: true, email: true },
  });

  const entries = await prisma.timeEntry.findMany({
    where: {
      userId: { in: subordinateIds },
      ...(from || to
        ? {
            OR: [
              { clockIn: { gte: from, lte: to } },
              { dateFrom: { gte: from, lte: to } },
            ],
          }
        : {}),
    },
  });

  const summary = users.map((user) => {
    const userEntries = entries.filter((e) => e.userId === user.id);
    const workEntries = userEntries.filter((e) => e.type === "WORK" && e.clockIn && e.clockOut);
    const totalHours = workEntries.reduce(
      (sum, e) => sum + (durationHours(e.clockIn, e.clockOut) ?? 0),
      0
    );
    const absenceEntries = userEntries.filter((e) => e.type !== "WORK" && e.type !== "MANUAL");
    const pendingCount = userEntries.filter((e) => e.status === "PENDING").length;

    return {
      user,
      totalHours: Math.round(totalHours * 100) / 100,
      absenceDays: absenceEntries.length,
      pendingApprovals: pendingCount,
    };
  });

  return NextResponse.json(summary);
}
