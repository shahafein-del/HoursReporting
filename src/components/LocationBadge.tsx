"use client";

import { useTranslations } from "next-intl";

type LocationState = "captured" | "denied" | "unknown";

export default function LocationBadge({ state }: { state: LocationState }) {
  const t = useTranslations("location");

  const config = {
    captured: { color: "text-green-600 bg-green-50", icon: "📍", label: t("captured") },
    denied: { color: "text-yellow-600 bg-yellow-50", icon: "⚠️", label: t("denied") },
    unknown: { color: "text-gray-500 bg-gray-100", icon: "❓", label: t("unknown") },
  }[state];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.icon} {config.label}
    </span>
  );
}
