"use client";

import { useTranslations } from "next-intl";
import { formatHours } from "@/lib/time-utils";

interface HoursSummaryProps {
  today: number;
  week: number;
  month: number;
}

export default function HoursSummary({ today, week, month }: HoursSummaryProps) {
  const t = useTranslations("dashboard");

  const cards = [
    { label: t("todayHours"), value: formatHours(today) },
    { label: t("weekHours"), value: formatHours(week) },
    { label: t("monthHours"), value: formatHours(month) },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold" style={{ color: "var(--primary)" }}>
            {card.value}
          </p>
          <p className="text-xs text-gray-500 mt-1">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
