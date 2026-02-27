import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import MyHoursChart from "@/components/reports/MyHoursChart";

export default async function ReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session) redirect(`/${locale}/login`);

  const t = await getTranslations("reports");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <a
          href="/api/reports/my-hours?format=csv"
          className="btn-secondary text-sm"
        >
          {t("exportCsv")}
        </a>
      </div>
      <MyHoursChart />
    </div>
  );
}
