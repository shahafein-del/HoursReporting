import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      locale: true,
      notifyEmail: true,
      notifyBrowser: true,
      notifySms: true,
      phone: true,
    },
  });

  return NextResponse.json(user);
}

export async function PUT(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { locale, notifyEmail, notifyBrowser, notifySms, phone } = body as {
    locale?: string;
    notifyEmail?: boolean;
    notifyBrowser?: boolean;
    notifySms?: boolean;
    phone?: string;
  };

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(locale ? { locale } : {}),
      ...(notifyEmail !== undefined ? { notifyEmail } : {}),
      ...(notifyBrowser !== undefined ? { notifyBrowser } : {}),
      ...(notifySms !== undefined ? { notifySms } : {}),
      ...(phone !== undefined ? { phone } : {}),
    },
  });

  return NextResponse.json(updated);
}
