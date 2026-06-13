import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import QuotesManager from "@/components/pricing/QuotesManager";

export default async function QuotesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session) redirect(`/${locale}/login`);
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations("pricing");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("quotes.title")}</h1>
        <p className="text-gray-500 mt-1">{t("quotes.subtitle")}</p>
      </div>
      <QuotesManager locale={locale} />
    </div>
  );
}
