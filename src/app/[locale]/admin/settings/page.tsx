import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import BrandingSettings from "@/components/BrandingSettings";
import WorkScheduleSettings from "@/components/WorkScheduleSettings";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session) redirect(`/${locale}/login`);
  if (session.user.role !== "ADMIN") redirect(`/${locale}/dashboard`);

  const t = await getTranslations("settings");

  const settings = await prisma.organizationSettings.findUnique({
    where: { id: "singleton" },
  });

  return (
    <div className="space-y-8 max-w-2xl">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <section>
        <h2 className="text-lg font-semibold mb-4">{t("branding")}</h2>
        <BrandingSettings
          orgName={settings?.orgName ?? ""}
          logoUrl={settings?.logoUrl ?? ""}
          primaryColor={settings?.primaryColor ?? "#2563eb"}
        />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">{t("schedule")}</h2>
        <WorkScheduleSettings
          workDays={settings?.workDays ?? [1, 2, 3, 4, 5]}
          workStartTime={settings?.workStartTime ?? "09:00"}
          workEndTime={settings?.workEndTime ?? "18:00"}
          weekStartDay={settings?.weekStartDay ?? 1}
        />
      </section>
    </div>
  );
}
