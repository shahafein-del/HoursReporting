"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { formatHours } from "@/lib/time-utils";

interface TeamRow {
  user: { id: string; name: string | null; email: string };
  totalHours: number;
  absenceDays: number;
  pendingApprovals: number;
}

export default function TeamSummaryTable() {
  const t = useTranslations("team");
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/manager/team")
      .then((r) => r.json())
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-gray-400">Loading…</p>;
  if (rows.length === 0) return <p className="text-gray-400">No team data.</p>;

  return (
    <div className="overflow-x-auto rounded-xl shadow">
      <table className="w-full text-sm bg-white">
        <thead className="bg-gray-50 border-b">
          <tr>
            {[t("employee"), t("totalHours"), t("absenceDays"), t("pending")].map((h) => (
              <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row) => (
            <tr key={row.user.id} className="hover:bg-gray-50">
              <td className="px-4 py-3">
                <p className="font-medium">{row.user.name ?? row.user.email}</p>
                <p className="text-xs text-gray-400">{row.user.email}</p>
              </td>
              <td className="px-4 py-3 font-medium" style={{ color: "var(--primary)" }}>
                {formatHours(row.totalHours)}
              </td>
              <td className="px-4 py-3 text-gray-600">{row.absenceDays}</td>
              <td className="px-4 py-3">
                {row.pendingApprovals > 0 ? (
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-yellow-50 text-yellow-700 font-medium">
                    {row.pendingApprovals}
                  </span>
                ) : (
                  <span className="text-gray-400">0</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
