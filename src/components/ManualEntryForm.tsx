"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export default function ManualEntryForm() {
  const t = useTranslations("manual");
  const [date, setDate] = useState("");
  const [clockIn, setClockIn] = useState("");
  const [clockOut, setClockOut] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const res = await fetch("/api/manual", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "MANUAL",
        clockIn: date && clockIn ? `${date}T${clockIn}:00` : undefined,
        clockOut: date && clockOut ? `${date}T${clockOut}:00` : undefined,
        notes,
      }),
    });

    setLoading(false);
    if (res.ok) {
      setSuccess(true);
      setDate("");
      setClockIn("");
      setClockOut("");
      setNotes("");
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Error");
    }
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-4">
      <h2 className="font-semibold text-lg">{t("title")}</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="label">{t("date")}</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input w-full" required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t("clockIn")}</label>
            <input type="time" value={clockIn} onChange={(e) => setClockIn(e.target.value)} className="input w-full" required />
          </div>
          <div>
            <label className="label">{t("clockOut")}</label>
            <input type="time" value={clockOut} onChange={(e) => setClockOut(e.target.value)} className="input w-full" required />
          </div>
        </div>
        <div>
          <label className="label">{t("notes")}</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input w-full" rows={2} />
        </div>
        {success && <p className="text-green-600 text-sm">{t("success")}</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? "..." : t("submit")}
        </button>
      </form>
    </div>
  );
}
