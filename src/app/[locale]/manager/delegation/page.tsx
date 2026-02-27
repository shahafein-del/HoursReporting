import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import DelegationForm from "@/components/DelegationForm";

export default async function DelegationPage({
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

  const t = await getTranslations("delegation");

  const allUsers = await prisma.user.findMany({
    where: { id: { not: session.user.id } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });

  const currentManager = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { delegateId: true, delegateFrom: true, delegateTo: true },
  });

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <DelegationForm
        users={allUsers}
        currentDelegateId={currentManager?.delegateId ?? null}
        currentFrom={currentManager?.delegateFrom?.toISOString() ?? null}
        currentTo={currentManager?.delegateTo?.toISOString() ?? null}
      />
    </div>
  );
}
