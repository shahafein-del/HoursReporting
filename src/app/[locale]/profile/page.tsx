import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import NotificationSettings from "@/components/NotificationSettings";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session) redirect(`/${locale}/login`);

  const t = await getTranslations("profile");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      locale: true,
      notifyEmail: true,
      notifyBrowser: true,
      notifySms: true,
      phone: true,
    },
  });

  return (
    <div className="space-y-8 max-w-lg">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <p className="text-sm text-gray-500">{user?.email}</p>
        <p className="font-semibold">{user?.name}</p>
      </div>

      <section className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="font-semibold">{t("language")}</h2>
        <LanguageSwitcher currentLocale={locale} />
      </section>

      <section className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="font-semibold">{t("notifications")}</h2>
        <NotificationSettings
          notifyEmail={user?.notifyEmail ?? true}
          notifyBrowser={user?.notifyBrowser ?? true}
          notifySms={user?.notifySms ?? false}
          phone={user?.phone ?? ""}
        />
      </section>
    </div>
  );
}
