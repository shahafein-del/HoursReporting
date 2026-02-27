"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface User {
  id: string;
  name: string | null;
  email: string;
}

interface DelegationFormProps {
  users: User[];
  currentDelegateId: string | null;
  currentFrom: string | null;
  currentTo: string | null;
}

export default function DelegationForm({
  users,
  currentDelegateId,
  currentFrom,
  currentTo,
}: DelegationFormProps) {
  const t = useTranslations("delegation");
  const [delegateId, setDelegateId] = useState(currentDelegateId ?? "");
  const [from, setFrom] = useState(currentFrom ? currentFrom.slice(0, 10) : "");
  const [to, setTo] = useState(currentTo ? currentTo.slice(0, 10) : "");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/manager/delegation", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delegateId, from: from || null, to: to || null }),
    });
    setLoading(false);
    if (res.ok) setSuccess(true);
    else setError("Error saving");
  }

  async function handleClear() {
    setLoading(true);
    await fetch("/api/manager/delegation", { method: "DELETE" });
    setLoading(false);
    setDelegateId("");
    setFrom("");
    setTo("");
    setSuccess(false);
  }

  const currentDelegate = users.find((u) => u.id === currentDelegateId);

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-4">
      {currentDelegateId ? (
        <p className="text-sm text-gray-600">
          {t("current", { name: currentDelegate?.name ?? currentDelegate?.email ?? currentDelegateId })}
        </p>
      ) : (
        <p className="text-sm text-gray-400">{t("none")}</p>
      )}

      <form onSubmit={handleSave} className="space-y-3">
        <div>
          <label className="label">{t("delegate")}</label>
          <select value={delegateId} onChange={(e) => setDelegateId(e.target.value)} className="input w-full" required>
            <option value="">— select —</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name ?? u.email}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t("from")}</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input w-full" />
          </div>
          <div>
            <label className="label">{t("to")}</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input w-full" />
          </div>
        </div>

        {success && <p className="text-green-600 text-sm">{t("success")}</p>}
        {error && <p className="text-red-600 text-sm">{error}</p>}

        <div className="flex gap-2">
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {t("save")}
          </button>
          {currentDelegateId && (
            <button type="button" onClick={handleClear} disabled={loading} className="btn-secondary flex-1">
              {t("clear")}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
