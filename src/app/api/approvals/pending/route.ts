import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSubordinateIds } from "@/lib/hierarchy";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role !== "MANAGER" && role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const userId = session.user.id;

  let subordinateIds: string[];
  if (role === "ADMIN") {
    const all = await prisma.user.findMany({ select: { id: true } });
    subordinateIds = all.map((u) => u.id);
  } else {
    subordinateIds = await getSubordinateIds(userId);
    // Also check if this user is a delegate for another manager
    const delegatingManagers = await prisma.user.findMany({
      where: {
        delegateId: userId,
        OR: [
          { delegateFrom: null },
          { delegateFrom: { lte: new Date() } },
        ],
        AND: [
          {
            OR: [
              { delegateTo: null },
              { delegateTo: { gte: new Date() } },
            ],
          },
        ],
      },
      select: { id: true },
    });
    for (const mgr of delegatingManagers) {
      const subs = await getSubordinateIds(mgr.id);
      subordinateIds.push(...subs);
    }
    // Deduplicate
    subordinateIds = [...new Set(subordinateIds)];
  }

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(searchParams.get("limit") ?? "50", 10));
  const skip = (page - 1) * limit;

  const where = { userId: { in: subordinateIds }, status: "PENDING" as const };

  const [pending, total] = await Promise.all([
    prisma.timeEntry.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "asc" },
      skip,
      take: limit,
    }),
    prisma.timeEntry.count({ where }),
  ]);

  return NextResponse.json({ entries: pending, total, page, limit });
}
