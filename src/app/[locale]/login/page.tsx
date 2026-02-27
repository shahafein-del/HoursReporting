import { signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  if (session) redirect(`/${locale}/dashboard`);

  const t = await getTranslations("login");
  const settings = await prisma.organizationSettings.findUnique({
    where: { id: "singleton" },
  });
  const orgName = settings?.orgName ?? "Hours Reporting";
  const logoUrl = settings?.logoUrl;
  const primaryColor = settings?.primaryColor ?? "#2563eb";

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md text-center space-y-6">
        {logoUrl ? (
          <img src={logoUrl} alt={orgName} className="h-16 mx-auto object-contain" />
        ) : (
          <div
            className="h-16 w-16 rounded-full mx-auto flex items-center justify-center text-white text-2xl font-bold"
            style={{ backgroundColor: primaryColor }}
          >
            {orgName.charAt(0)}
          </div>
        )}
        <h1 className="text-2xl font-bold">{t("title", { orgName })}</h1>
        <p className="text-gray-500 text-sm">{t("subtitle")}</p>

        <div className="space-y-3">
          <form
            action={async () => {
              "use server";
              await signIn("microsoft-entra-id", { redirectTo: `/${locale}/dashboard` });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-3 px-4 hover:bg-gray-50 transition font-medium"
            >
              <MicrosoftIcon />
              {t("signInWith", { provider: t("microsoft") })}
            </button>
          </form>

          <form
            action={async () => {
              "use server";
              await signIn("okta", { redirectTo: `/${locale}/dashboard` });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-lg py-3 px-4 hover:bg-gray-50 transition font-medium"
            >
              <OktaIcon />
              {t("signInWith", { provider: t("okta") })}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function MicrosoftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}

function OktaIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="100" fill="#007dc1" />
      <circle cx="100" cy="100" r="44" fill="white" />
    </svg>
  );
}
