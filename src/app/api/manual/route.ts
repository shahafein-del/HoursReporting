import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getApprover } from "@/lib/hierarchy";
import { notify } from "@/lib/notifications";
import type { EntryType } from "@/generated/prisma";

const MANUAL_TYPES: EntryType[] = [
  "VACATION",
  "SICK",
  "CHILD_SICK",
  "MILITARY",
  "MANUAL",
];

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const { type, dateFrom, dateTo, clockIn, clockOut, notes } = body as {
    type: EntryType;
    dateFrom?: string;
    dateTo?: string;
    clockIn?: string;
    clockOut?: string;
    notes?: string;
  };

  if (!MANUAL_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid entry type" }, { status: 400 });
  }

  const entry = await prisma.timeEntry.create({
    data: {
      userId: session.user.id,
      type,
      status: "PENDING",
      dateFrom: dateFrom ? new Date(dateFrom) : null,
      dateTo: dateTo ? new Date(dateTo) : null,
      clockIn: clockIn ? new Date(clockIn) : null,
      clockOut: clockOut ? new Date(clockOut) : null,
      notes: notes ?? null,
    },
  });

  // Notify manager/delegate
  const managerId = await getApprover(session.user.id);
  if (managerId) {
    const manager = await prisma.user.findUnique({ where: { id: managerId } });
    if (manager) {
      const subject = `New ${type} request from ${session.user.name ?? session.user.email}`;
      const html = `<p>${session.user.name ?? session.user.email} submitted a <b>${type}</b> request requiring your approval.</p>`;
      await notify(
        {
          email: manager.email,
          notifyEmail: manager.notifyEmail,
          notifyBrowser: manager.notifyBrowser,
          notifySms: manager.notifySms,
          phone: manager.phone,
          pushSubscription: manager.pushSubscription,
        },
        subject,
        html,
        subject
      );
    }
  }

  return NextResponse.json(entry, { status: 201 });
}
