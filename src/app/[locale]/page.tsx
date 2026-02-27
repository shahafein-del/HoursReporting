import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function RootPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (session) {
    redirect(`/${locale}/dashboard`);
  }
  redirect(`/${locale}/login`);
}
