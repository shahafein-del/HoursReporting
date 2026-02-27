"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface BrandingSettingsProps {
  orgName: string;
  logoUrl: string;
  primaryColor: string;
}

export default function BrandingSettings({
  orgName: initOrgName,
  logoUrl: initLogoUrl,
  primaryColor: initColor,
}: BrandingSettingsProps) {
  const t = useTranslations("settings");
  const [orgName, setOrgName] = useState(initOrgName);
  const [logoUrl, setLogoUrl] = useState(initLogoUrl);
  const [primaryColor, setPrimaryColor] = useState(initColor);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgName, logoUrl: logoUrl || null, primaryColor }),
    });
    setLoading(false);
    setSuccess(true);
    // Apply new color immediately
    document.documentElement.style.setProperty("--primary", primaryColor);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">
      <div>
        <label className="label">{t("orgName")}</label>
        <input type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} className="input w-full" />
      </div>
      <div>
        <label className="label">{t("logoUrl")}</label>
        <input type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} className="input w-full" placeholder="https://..." />
      </div>
      <div>
        <label className="label">{t("primaryColor")}</label>
        <div className="flex items-center gap-3">
          <input type="color" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="h-10 w-16 rounded cursor-pointer border" />
          <input type="text" value={primaryColor} onChange={(e) => setPrimaryColor(e.target.value)} className="input flex-1" pattern="^#[0-9a-fA-F]{6}$" />
        </div>
      </div>
      {success && <p className="text-green-600 text-sm">{t("success")}</p>}
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "..." : t("save")}
      </button>
    </form>
  );
}
