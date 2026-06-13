import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import SupplierDetail from "@/components/pricing/SupplierDetail";

export default async function SupplierDetailPage({
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

  return <SupplierDetail locale={locale} supplierId={id} />;
}
