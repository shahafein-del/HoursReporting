import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import OrgOverviewChart from "@/components/reports/OrgOverviewChart";

export default async function AdminReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session) redirect(`/${locale}/login`);
  if (session.user.role !== "ADMIN") redirect(`/${locale}/dashboard`);

  const t = await getTranslations("reports");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Organisation {t("title")}</h1>
      <OrgOverviewChart />
    </div>
  );
}
