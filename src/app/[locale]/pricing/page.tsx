import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function PricingOverviewPage({
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
  const base = `/${locale}/pricing`;

  const cards = [
    { href: `${base}/suppliers`, title: t("nav.suppliers"), desc: t("overview.suppliersDesc") },
    { href: `${base}/tax-rules`, title: t("nav.taxRules"), desc: t("overview.taxRulesDesc") },
    { href: `${base}/exchange-rates`, title: t("nav.exchangeRates"), desc: t("overview.exchangeRatesDesc") },
    { href: `${base}/customers`, title: t("nav.customers"), desc: t("overview.customersDesc") },
    { href: `${base}/quotes`, title: t("nav.quotes"), desc: t("overview.quotesDesc") },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("overview.title")}</h1>
        <p className="text-gray-500 mt-1">{t("overview.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="block rounded-xl border border-gray-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-blue-200 transition"
          >
            <h2 className="font-semibold text-lg" style={{ color: "var(--primary)" }}>
              {card.title}
            </h2>
            <p className="text-sm text-gray-500 mt-1">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
