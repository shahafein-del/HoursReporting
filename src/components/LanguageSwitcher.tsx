"use client";

import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { routing } from "@/i18n/routing";

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  he: "עברית",
  ar: "العربية",
  fr: "Français",
};

interface LanguageSwitcherProps {
  currentLocale: string;
}

export default function LanguageSwitcher({ currentLocale }: LanguageSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(locale: string) {
    // Replace current locale prefix with new one
    const segments = pathname.split("/");
    segments[1] = locale;
    router.push(segments.join("/"));
  }

  return (
    <div className="flex flex-wrap gap-2">
      {routing.locales.map((locale) => (
        <button
          key={locale}
          onClick={() => switchLocale(locale)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
            locale === currentLocale
              ? "border-transparent text-white"
              : "border-gray-300 text-gray-600 hover:bg-gray-50"
          }`}
          style={locale === currentLocale ? { backgroundColor: "var(--primary)" } : {}}
        >
          {LOCALE_LABELS[locale]}
        </button>
      ))}
    </div>
  );
}
