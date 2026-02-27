"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface NavbarProps {
  locale: string;
  role: string;
  orgName: string;
  logoUrl: string | null;
}

export default function Navbar({ locale, role, orgName, logoUrl }: NavbarProps) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const base = `/${locale}`;

  const navLinks = [
    { href: `${base}/dashboard`, label: t("dashboard"), roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    { href: `${base}/history`, label: t("history"), roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    { href: `${base}/reports`, label: t("reports"), roles: ["EMPLOYEE", "MANAGER", "ADMIN"] },
    { href: `${base}/manager/approvals`, label: t("approvals"), roles: ["MANAGER", "ADMIN"] },
    { href: `${base}/manager/delegation`, label: t("delegation"), roles: ["MANAGER", "ADMIN"] },
    { href: `${base}/manager/team`, label: t("team"), roles: ["MANAGER", "ADMIN"] },
    { href: `${base}/admin`, label: t("admin"), roles: ["ADMIN"] },
    { href: `${base}/admin/settings`, label: t("settings"), roles: ["ADMIN"] },
  ].filter((l) => l.roles.includes(role));

  return (
    <nav className="bg-white border-b shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        <Link href={`${base}/dashboard`} className="flex items-center gap-2 font-bold text-lg" style={{ color: "var(--primary)" }}>
          {logoUrl ? (
            <img src={logoUrl} alt={orgName} className="h-8 object-contain" />
          ) : (
            <span>{orgName}</span>
          )}
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                pathname.startsWith(link.href)
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link href={`${base}/profile`} className="px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-100">
            {t("profile")}
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
            className="px-3 py-1.5 rounded-lg text-sm text-red-600 hover:bg-red-50 ml-2"
          >
            {t("signOut")}
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <span className="block w-5 h-0.5 bg-gray-600 mb-1" />
          <span className="block w-5 h-0.5 bg-gray-600 mb-1" />
          <span className="block w-5 h-0.5 bg-gray-600" />
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t bg-white px-4 py-3 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setMobileOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link href={`${base}/profile`} className="block px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100" onClick={() => setMobileOpen(false)}>
            {t("profile")}
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
            className="block w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50"
          >
            {t("signOut")}
          </button>
        </div>
      )}
    </nav>
  );
}
