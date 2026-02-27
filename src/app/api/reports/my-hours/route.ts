import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { durationHours, toDateString } from "@/lib/time-utils";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const from = new Date(searchParams.get("from") ?? new Date().toISOString().slice(0, 8) + "01");
  const to = searchParams.get("to") ? new Date(searchParams.get("to")!) : new Date();
  const csv = searchParams.get("format") === "csv";

  const entries = await prisma.timeEntry.findMany({
    where: {
      userId: session.user.id,
      status: "APPROVED",
      OR: [
        { clockIn: { gte: from, lte: to } },
        { dateFrom: { gte: from, lte: to } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  // Aggregate by date
  const byDate: Record<string, { hours: number; types: Record<string, number> }> = {};

  for (const entry of entries) {
    const dateKey =
      entry.clockIn
        ? toDateString(entry.clockIn)
        : entry.dateFrom
        ? toDateString(entry.dateFrom)
        : null;
    if (!dateKey) continue;

    if (!byDate[dateKey]) byDate[dateKey] = { hours: 0, types: {} };

    if (entry.type === "WORK" && entry.clockIn && entry.clockOut) {
      const h = durationHours(entry.clockIn, entry.clockOut) ?? 0;
      byDate[dateKey].hours += h;
    }
    byDate[dateKey].types[entry.type] = (byDate[dateKey].types[entry.type] ?? 0) + 1;
  }

  if (csv) {
    const rows = ["date,type,clockIn,clockOut,dateFrom,dateTo,notes,durationHours"];
    for (const e of entries) {
      rows.push(
        [
          e.clockIn ? toDateString(e.clockIn) : e.dateFrom ? toDateString(e.dateFrom) : "",
          e.type,
          e.clockIn?.toISOString() ?? "",
          e.clockOut?.toISOString() ?? "",
          e.dateFrom?.toISOString() ?? "",
          e.dateTo?.toISOString() ?? "",
          (e.notes ?? "").replace(/,/g, ";"),
          e.clockIn && e.clockOut ? (durationHours(e.clockIn, e.clockOut) ?? "").toString() : "",
        ].join(",")
      );
    }
    return new NextResponse(rows.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": "attachment; filename=my-hours.csv",
      },
    });
  }

  return NextResponse.json({ byDate, entries });
}
