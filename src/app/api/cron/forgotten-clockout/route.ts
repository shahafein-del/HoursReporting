import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notifications";
import { isWorkDay } from "@/lib/time-utils";

export async function POST() {
  const settings = await prisma.organizationSettings.findUnique({
    where: { id: "singleton" },
  });
  if (!settings) return NextResponse.json({ skipped: true });

  const now = new Date();
  if (!isWorkDay(settings.workDays, now)) {
    return NextResponse.json({ skipped: "not a work day" });
  }

  // Find users with an open clock-in today
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);

  const openEntries = await prisma.timeEntry.findMany({
    where: {
      type: "WORK",
      clockIn: { gte: todayStart },
      clockOut: null,
    },
    include: {
      user: {
        select: {
          email: true,
          notifyEmail: true,
          notifyBrowser: true,
          notifySms: true,
          phone: true,
          pushSubscription: true,
        },
      },
    },
  });

  const forgottenPromises = openEntries.map((entry) => {
    const subject = "Reminder: You forgot to clock out";
    const html = `<p>You clocked in at ${entry.clockIn?.toLocaleTimeString()} but have not clocked out. Please log your departure.</p>`;
    return notify(entry.user, subject, html, subject);
  });

  // IDs of users who already have a WORK entry today (clocked in at some point)
  const clockedInToday = await prisma.timeEntry.findMany({
    where: {
      type: "WORK",
      clockIn: { gte: todayStart },
    },
    select: { userId: true },
  });
  const allClockedIds = [...new Set(clockedInToday.map((e) => e.userId))];

  // IDs of users with an approved non-WORK entry covering today (leave, etc.)
  const onLeaveToday = await prisma.timeEntry.findMany({
    where: {
      type: { not: "WORK" },
      status: "APPROVED",
      dateFrom: { lte: now },
      dateTo: { gte: todayStart },
    },
    select: { userId: true },
  });
  const onLeaveIds = [...new Set(onLeaveToday.map((e) => e.userId))];

  const exemptIds = [...new Set([...allClockedIds, ...onLeaveIds])];

  const notClockedIn = await prisma.user.findMany({
    where: { id: { notIn: exemptIds } },
    select: {
      email: true,
      notifyEmail: true,
      notifyBrowser: true,
      notifySms: true,
      phone: true,
      pushSubscription: true,
    },
  });

  const missingPromises = notClockedIn.map((user) => {
    const subject = "Reminder: No clock-in recorded today";
    const html = `<p>We have no clock-in record for you today. If you worked, please log your hours.</p>`;
    return notify(user, subject, html, subject);
  });

  await Promise.allSettled([...forgottenPromises, ...missingPromises]);

  return NextResponse.json({
    forgottenClockOut: forgottenPromises.length,
    missingClockIn: missingPromises.length,
  });
}
