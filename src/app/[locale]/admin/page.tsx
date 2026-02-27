import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import AdminTable from "@/components/AdminTable";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session) redirect(`/${locale}/login`);
  if (session.user.role !== "ADMIN") redirect(`/${locale}/dashboard`);

  const t = await getTranslations("admin");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <a
          href="/api/admin/entries?format=csv"
          className="btn-secondary text-sm"
        >
          {t("exportCsv")}
        </a>
      </div>
      <AdminTable />
    </div>
  );
}
