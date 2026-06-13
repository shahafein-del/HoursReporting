import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import QuoteBuilder from "@/components/pricing/QuoteBuilder";

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await auth();
  if (!session) redirect(`/${locale}/login`);
  if (session.user.role !== "MANAGER" && session.user.role !== "ADMIN") {
    redirect(`/${locale}/dashboard`);
  }

  return <QuoteBuilder locale={locale} quoteId={id} />;
}
