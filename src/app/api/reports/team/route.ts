import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getVisibleUserIds } from "@/lib/hierarchy";
import { prisma } from "@/lib/prisma";
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

  const visibleIds = await getVisibleUserIds(session.user.id, role);
  const users = await prisma.user.findMany({
    where: { id: { in: visibleIds } },
    select: { id: true, name: true, email: true },
  });

  const entries = await prisma.timeEntry.findMany({
    where: {
      userId: { in: visibleIds },
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

  const result = users.map((user) => {
    const userEntries = entries.filter((e) => e.userId === user.id);
    const totalHours = userEntries
      .filter((e) => e.type === "WORK" && e.status === "APPROVED")
      .reduce((sum, e) => sum + (durationHours(e.clockIn, e.clockOut) ?? 0), 0);

    return {
      user,
      totalHours: Math.round(totalHours * 100) / 100,
      entriesByType: Object.fromEntries(
        ["WORK", "VACATION", "SICK", "CHILD_SICK", "MILITARY", "MANUAL"].map((t) => [
          t,
          userEntries.filter((e) => e.type === t && e.status === "APPROVED").length,
        ])
      ),
      pendingCount: userEntries.filter((e) => e.status === "PENDING").length,
    };
  });

  return NextResponse.json(result);
}
