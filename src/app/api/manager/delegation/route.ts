import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      delegateId: true,
      delegateFrom: true,
      delegateTo: true,
    },
  });

  if (!user?.delegateId) return NextResponse.json({ delegate: null });

  const delegate = await prisma.user.findUnique({
    where: { id: user.delegateId },
    select: { id: true, name: true, email: true },
  });

  return NextResponse.json({ delegate, from: user.delegateFrom, to: user.delegateTo });
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { delegateId, from, to } = body as {
    delegateId: string;
    from?: string;
    to?: string;
  };

  const delegateUser = await prisma.user.findUnique({ where: { id: delegateId } });
  if (!delegateUser) return NextResponse.json({ error: "Delegate user not found" }, { status: 404 });

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      delegateId,
      delegateFrom: from ? new Date(from) : null,
      delegateTo: to ? new Date(to) : null,
    },
  });

  return NextResponse.json({ success: true, updated });
}

export async function DELETE() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { delegateId: null, delegateFrom: null, delegateTo: null },
  });

  return NextResponse.json({ success: true });
}
