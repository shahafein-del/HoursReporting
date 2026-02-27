"use client";

import { useState, useEffect } from "react";
import { formatHours } from "@/lib/time-utils";

interface OrgStats {
  totalUsers: number;
  pendingApprovals: number;
  totalWorkHours: number;
  totalAbsenceEntries: number;
}

export default function OrgOverviewChart() {
  const [stats, setStats] = useState<OrgStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports/org")
      .then((r) => r.json())
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (!stats) return null;

  const cards = [
    { label: "Total Users", value: stats.totalUsers },
    { label: "Pending Approvals", value: stats.pendingApprovals, highlight: stats.pendingApprovals > 0 },
    { label: "Total Work Hours", value: formatHours(stats.totalWorkHours) },
    { label: "Absence Entries", value: stats.totalAbsenceEntries },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`bg-white rounded-xl shadow p-5 text-center ${card.highlight ? "border-2 border-yellow-400" : ""}`}
        >
          <p className="text-3xl font-bold" style={{ color: "var(--primary)" }}>
            {card.value}
          </p>
          <p className="text-xs text-gray-500 mt-1">{card.label}</p>
        </div>
      ))}
    </div>
  );
}
