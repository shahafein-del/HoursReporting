import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing, RTL_LOCALES, type Locale } from "@/i18n/routing";
import { prisma } from "@/lib/prisma";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";
import Navbar from "@/components/Navbar";
import "@/app/globals.css";

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as Locale)) notFound();

  const messages = await getMessages();
  const dir = RTL_LOCALES.includes(locale as Locale) ? "rtl" : "ltr";

  const settings = await prisma.organizationSettings.findUnique({
    where: { id: "singleton" },
  });
  const primaryColor = settings?.primaryColor ?? "#2563eb";
  const logoUrl = settings?.logoUrl ?? null;
  const orgName = settings?.orgName ?? "Hours Reporting";

  const session = await auth();

  return (
    <html lang={locale} dir={dir}>
      <head>
        <style>{`:root { --primary: ${primaryColor}; }`}</style>
      </head>
      <body className="bg-gray-50 text-gray-900 min-h-screen">
        <SessionProvider session={session}>
          <NextIntlClientProvider messages={messages}>
            {session && (
              <Navbar
                locale={locale}
                role={session.user.role}
                orgName={orgName}
                logoUrl={logoUrl}
              />
            )}
            <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>
          </NextIntlClientProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
