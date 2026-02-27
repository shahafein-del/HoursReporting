import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getVisibleUserIds } from "@/lib/hierarchy";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const userId = searchParams.get("userId") ?? undefined;
  const from = searchParams.get("from") ? new Date(searchParams.get("from")!) : undefined;
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(200, parseInt(searchParams.get("limit") ?? "50", 10));
  const skip = (page - 1) * limit;
  const csv = searchParams.get("format") === "csv";

  const visibleIds = await getVisibleUserIds(session.user.id, role);
  const userFilter = userId && visibleIds.includes(userId) ? [userId] : visibleIds;

  const where = {
    userId: { in: userFilter },
    ...(from || to
      ? {
          OR: [
            { clockIn: { gte: from, lte: to } },
            { dateFrom: { gte: from, lte: to } },
          ],
        }
      : {}),
  };

  if (csv) {
    const entries = await prisma.timeEntry.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
    const rows = [
      "id,email,name,type,status,clockIn,clockOut,dateFrom,dateTo,clockInLat,clockInLng,clockOutLat,clockOutLng,notes,createdAt",
      ...entries.map((e) =>
        [
          e.id,
          e.user.email,
          e.user.name ?? "",
          e.type,
          e.status,
          e.clockIn?.toISOString() ?? "",
          e.clockOut?.toISOString() ?? "",
          e.dateFrom?.toISOString() ?? "",
          e.dateTo?.toISOString() ?? "",
          e.clockInLat ?? "",
          e.clockInLng ?? "",
          e.clockOutLat ?? "",
          e.clockOutLng ?? "",
          (e.notes ?? "").replace(/,/g, ";"),
          e.createdAt.toISOString(),
        ].join(",")
      ),
    ].join("\n");
    return new NextResponse(rows, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=entries.csv",
      },
    });
  }

  const [entries, total] = await Promise.all([
    prisma.timeEntry.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.timeEntry.count({ where }),
  ]);

  return NextResponse.json({ entries, total, page, limit });
}
