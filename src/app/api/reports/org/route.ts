import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { durationHours } from "@/lib/time-utils";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined;

  const [totalUsers, pendingCount, entries] = await Promise.all([
    prisma.user.count(),
    prisma.timeEntry.count({ where: { status: "PENDING" } }),
    prisma.timeEntry.findMany({
      where: {
        status: "APPROVED",
        ...(from || to
          ? {
              OR: [
                { clockIn: { gte: from, lte: to } },
                { dateFrom: { gte: from, lte: to } },
              ],
            }
          : {}),
      },
    }),
  ]);

  const totalHours = entries
    .filter((e) => e.type === "WORK")
    .reduce((sum, e) => sum + (durationHours(e.clockIn, e.clockOut) ?? 0), 0);

  const absenceCount = entries.filter(
    (e) => ["VACATION", "SICK", "CHILD_SICK", "MILITARY"].includes(e.type)
  ).length;

  return NextResponse.json({
    totalUsers,
    pendingApprovals: pendingCount,
    totalWorkHours: Math.round(totalHours * 100) / 100,
    totalAbsenceEntries: absenceCount,
  });
}
