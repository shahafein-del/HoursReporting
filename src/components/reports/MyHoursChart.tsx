"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DayData {
  date: string;
  hours: number;
}

export default function MyHoursChart() {
  const t = useTranslations("reports");
  const [data, setData] = useState<DayData[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"week" | "month">("month");

  useEffect(() => {
    const now = new Date();
    let from: string;
    if (period === "week") {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      from = d.toISOString().slice(0, 10);
    } else {
      from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    }
    const to = now.toISOString().slice(0, 10);

    setLoading(true);
    fetch(`/api/reports/my-hours?from=${from}&to=${to}`)
      .then((r) => r.json())
      .then((d) => {
        const byDate = d.byDate as Record<string, { hours: number }>;
        setData(
          Object.entries(byDate).map(([date, val]) => ({
            date,
            hours: Math.round(val.hours * 100) / 100,
          }))
        );
      })
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-4">
      <div className="flex items-center gap-3">
        {(["week", "month"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              period === p ? "text-white" : "border border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
            style={period === p ? { backgroundColor: "var(--primary)" } : {}}
          >
            {t(p)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-gray-400">Loading…</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis unit="h" />
            <Tooltip formatter={(v) => [`${v}h`, "Hours"]} />
            <Legend />
            <Bar dataKey="hours" name="Hours" fill="var(--primary)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
