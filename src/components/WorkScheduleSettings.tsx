"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface WorkScheduleSettingsProps {
  workDays: number[];
  workStartTime: string;
  workEndTime: string;
  weekStartDay: number;
}

const DAY_KEYS = [0, 1, 2, 3, 4, 5, 6] as const;

export default function WorkScheduleSettings({
  workDays: initDays,
  workStartTime: initStart,
  workEndTime: initEnd,
  weekStartDay: initWeekStart,
}: WorkScheduleSettingsProps) {
  const t = useTranslations("settings");
  const [workDays, setWorkDays] = useState<number[]>(initDays);
  const [workStartTime, setWorkStartTime] = useState(initStart);
  const [workEndTime, setWorkEndTime] = useState(initEnd);
  const [weekStartDay, setWeekStartDay] = useState(initWeekStart);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function toggleDay(day: number) {
    setWorkDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workDays, workStartTime, workEndTime, weekStartDay }),
    });
    setLoading(false);
    setSuccess(true);
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-6 space-y-4">
      <div>
        <label className="label">{t("workDays")}</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {DAY_KEYS.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => toggleDay(day)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                workDays.includes(day)
                  ? "border-transparent text-white"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
              style={workDays.includes(day) ? { backgroundColor: "var(--primary)" } : {}}
            >
              {t(`days.${day}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">{t("workStart")}</label>
          <input type="time" value={workStartTime} onChange={(e) => setWorkStartTime(e.target.value)} className="input w-full" />
        </div>
        <div>
          <label className="label">{t("workEnd")}</label>
          <input type="time" value={workEndTime} onChange={(e) => setWorkEndTime(e.target.value)} className="input w-full" />
        </div>
      </div>

      <div>
        <label className="label">{t("weekStart")}</label>
        <select value={weekStartDay} onChange={(e) => setWeekStartDay(Number(e.target.value))} className="input w-full">
          <option value={0}>{t("days.0")}</option>
          <option value={1}>{t("days.1")}</option>
        </select>
      </div>

      {success && <p className="text-green-600 text-sm">{t("success")}</p>}
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "..." : t("save")}
      </button>
    </form>
  );
}
