import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/notifications";
import {
  durationHours,
  startOfPreviousWeek,
  endOfPreviousWeek,
  isWorkDay,
  toDateString,
} from "@/lib/time-utils";

export async function POST() {
  const settings = await prisma.organizationSettings.findUnique({
    where: { id: "singleton" },
  });
  if (!settings) return NextResponse.json({ skipped: true });

  const now = new Date();
  const weekStart = startOfPreviousWeek(now, settings.weekStartDay);
  const weekEnd = endOfPreviousWeek(now, settings.weekStartDay);

  const managers = await prisma.user.findMany({
    where: { role: { in: ["MANAGER", "ADMIN"] } },
    select: {
      id: true,
      email: true,
      name: true,
      notifyEmail: true,
      reports: { select: { id: true, name: true, email: true } },
    },
  });

  for (const manager of managers) {
    if (!manager.notifyEmail) continue;

    const subordinateIds = manager.reports.map((r) => r.id);
    if (subordinateIds.length === 0) continue;

    const entries = await prisma.timeEntry.findMany({
      where: {
        userId: { in: subordinateIds },
        OR: [
          { clockIn: { gte: weekStart, lte: weekEnd } },
          { dateFrom: { gte: weekStart, lte: weekEnd } },
        ],
      },
    });

    const pendingCount = await prisma.timeEntry.count({
      where: { userId: { in: subordinateIds }, status: "PENDING" },
    });

    // Build per-employee summary
    const rows = manager.reports.map((emp) => {
      const empEntries = entries.filter((e) => e.userId === emp.id);
      const totalHours = empEntries
        .filter((e) => e.type === "WORK" && e.status === "APPROVED")
        .reduce((sum, e) => sum + (durationHours(e.clockIn, e.clockOut) ?? 0), 0);

      // Count expected work days in the period
      const expectedDays = settings.workDays.length;
      const loggedDays = new Set(
        empEntries
          .filter((e) => e.clockIn)
          .map((e) => toDateString(e.clockIn!))
      ).size;
      const missingDays = Math.max(0, expectedDays - loggedDays);

      return `<tr>
        <td>${emp.name ?? emp.email}</td>
        <td>${totalHours.toFixed(1)}h</td>
        <td>${missingDays} missing day(s)</td>
        <td>${empEntries.filter((e) => e.status === "PENDING").length} pending</td>
      </tr>`;
    });

    const subject = `Weekly Hours Report — ${toDateString(weekStart)} to ${toDateString(weekEnd)}`;
    const html = `
      <h2>${subject}</h2>
      <p>Hi ${manager.name ?? manager.email},</p>
      <p>Here's last week's summary for your team:</p>
      <table border="1" cellpadding="6" cellspacing="0">
        <thead>
          <tr><th>Employee</th><th>Hours Logged</th><th>Missing Days</th><th>Pending Approvals</th></tr>
        </thead>
        <tbody>${rows.join("")}</tbody>
      </table>
      ${pendingCount > 0 ? `<p><b>Action required:</b> You have ${pendingCount} pending approval(s).</p>` : ""}
      <p>Log in to review: ${process.env.NEXT_PUBLIC_APP_URL}/manager/approvals</p>
    `;

    await sendEmail({ to: manager.email, subject, html });
  }

  return NextResponse.json({ sent: managers.length });
}
