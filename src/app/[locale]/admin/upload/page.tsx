import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import MassUpload from "@/components/MassUpload";

export default async function UploadPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (!session) redirect(`/${locale}/login`);
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    redirect(`/${locale}/dashboard`);
  }

  const t = await getTranslations("upload");

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">{t("title")}</h1>
      <p className="text-gray-600">{t("description")}</p>
      <MassUpload />
    </div>
  );
}
