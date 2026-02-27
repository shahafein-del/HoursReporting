import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import ClockInOutButton from "@/components/ClockInOutButton";
import HoursSummary from "@/components/HoursSummary";
import AbsenceForm from "@/components/AbsenceForm";
import ManualEntryForm from "@/components/ManualEntryForm";
import { durationHours, startOfWeek, startOfDay } from "@/lib/time-utils";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session) redirect(`/${locale}/login`);

  const t = await getTranslations("dashboard");

  const settings = await prisma.organizationSettings.findUnique({
    where: { id: "singleton" },
  });
  const weekStartDay = settings?.weekStartDay ?? 1;

  const now = new Date();
  const todayStart = startOfDay(now);
  const weekStart = startOfWeek(now, weekStartDay);
  const monthStart = new Date(now.getUTCFullYear(), now.getUTCMonth(), 1);

  const [openEntry, todayEntries, weekEntries, monthEntries, pendingCount] =
    await Promise.all([
      prisma.timeEntry.findFirst({
        where: {
          userId: session.user.id,
          type: "WORK",
          clockIn: { not: null },
          clockOut: null,
        },
      }),
      prisma.timeEntry.findMany({
        where: { userId: session.user.id, type: "WORK", clockIn: { gte: todayStart }, status: "APPROVED" },
      }),
      prisma.timeEntry.findMany({
        where: { userId: session.user.id, type: "WORK", clockIn: { gte: weekStart }, status: "APPROVED" },
      }),
      prisma.timeEntry.findMany({
        where: { userId: session.user.id, type: "WORK", clockIn: { gte: monthStart }, status: "APPROVED" },
      }),
      prisma.timeEntry.count({ where: { userId: session.user.id, status: "PENDING" } }),
    ]);

  const sumHours = (entries: typeof todayEntries) =>
    entries.reduce((sum, e) => sum + (durationHours(e.clockIn, e.clockOut) ?? 0), 0);

  const todayH = sumHours(todayEntries);
  const weekH = sumHours(weekEntries);
  const monthH = sumHours(monthEntries);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <ClockInOutButton openEntry={openEntry ? { id: openEntry.id, clockIn: openEntry.clockIn!.toISOString() } : null} />

      <HoursSummary today={todayH} week={weekH} month={monthH} />

      {pendingCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          You have {pendingCount} pending request(s) awaiting approval.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <AbsenceForm />
        <ManualEntryForm />
      </div>
    </div>
  );
}
