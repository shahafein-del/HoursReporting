"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const ABSENCE_TYPES = ["VACATION", "SICK", "CHILD_SICK", "MILITARY"] as const;

export default function AbsenceForm() {
  const t = useTranslations("absence");
  const tType = useTranslations("entryType");
  const [type, setType] = useState<(typeof ABSENCE_TYPES)[number]>("VACATION");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
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
      body: JSON.stringify({ type, dateFrom: from, dateTo: to, notes }),
    });

    setLoading(false);
    if (res.ok) {
      setSuccess(true);
      setFrom("");
      setTo("");
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
          <label className="label">{t("type")}</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="input w-full"
          >
            {ABSENCE_TYPES.map((t_) => (
              <option key={t_} value={t_}>{tType(t_)}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t("from")}</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input w-full" required />
          </div>
          <div>
            <label className="label">{t("to")}</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input w-full" required />
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
