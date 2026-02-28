import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const settings = await prisma.organizationSettings.findUnique({
    where: { id: "singleton" },
  });
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const {
    orgName,
    logoUrl,
    primaryColor,
    workDays,
    workStartTime,
    workEndTime,
    weekStartDay,
  } = body as {
    orgName?: string;
    logoUrl?: string | null;
    primaryColor?: string;
    workDays?: number[];
    workStartTime?: string;
    workEndTime?: string;
    weekStartDay?: number;
  };

  const updated = await prisma.organizationSettings.upsert({
    where: { id: "singleton" },
    update: {
      ...(orgName !== undefined ? { orgName } : {}),
      ...(logoUrl !== undefined ? { logoUrl } : {}),
      ...(primaryColor ? { primaryColor } : {}),
      ...(workDays ? { workDays } : {}),
      ...(workStartTime ? { workStartTime } : {}),
      ...(workEndTime ? { workEndTime } : {}),
      ...(weekStartDay !== undefined ? { weekStartDay } : {}),
    },
    create: {
      id: "singleton",
      orgName: orgName ?? "My Organization",
      logoUrl: logoUrl ?? null,
      primaryColor: primaryColor ?? "#2563eb",
      workDays: workDays ?? [1, 2, 3, 4, 5],
      workStartTime: workStartTime ?? "09:00",
      workEndTime: workEndTime ?? "18:00",
      weekStartDay: weekStartDay ?? 1,
    },
  });

  return NextResponse.json(updated);
}
