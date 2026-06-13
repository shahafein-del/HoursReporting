"use client";

import { useState, useEffect, FormEvent } from "react";
import { useTranslations } from "next-intl";

interface ExchangeRateEntry {
  id: string;
  base: string;
  quote: string;
  rate: string;
  asOf: string;
}

const emptyForm = { base: "", quote: "", rate: "" };

export default function ExchangeRatesManager() {
  const t = useTranslations("pricing");
  const [rates, setRates] = useState<ExchangeRateEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    setLoading(true);
    fetch("/api/pricing/exchange-rates")
      .then((r) => r.json())
      .then(setRates)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/pricing/exchange-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        base: form.base.toUpperCase(),
        quote: form.quote.toUpperCase(),
        rate: parseFloat(form.rate),
      }),
    });

    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save");
      return;
    }
    setForm(emptyForm);
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm(t("common.confirmDelete"))) return;
    await fetch(`/api/pricing/exchange-rates/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {t("exchangeRates.addOrUpdate")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">{t("exchangeRates.base")}</label>
              <input
                className="input w-full"
                required
                placeholder="EUR"
                maxLength={3}
                value={form.base}
                onChange={(e) => setForm({ ...form, base: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t("exchangeRates.quote")}</label>
              <input
                className="input w-full"
                required
                placeholder="USD"
                maxLength={3}
                value={form.quote}
                onChange={(e) => setForm({ ...form, quote: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t("exchangeRates.rate")}</label>
              <input
                className="input w-full"
                required
                type="number"
                step="0.000001"
                min="0"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">{t("exchangeRates.rateHint")}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={saving}>
              {t("common.save")}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              {t("common.cancel")}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <p className="text-gray-400">{t("common.loading")}</p>
      ) : rates.length === 0 ? (
        <p className="text-gray-400">{t("exchangeRates.noRates")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow">
          <table className="w-full text-sm bg-white">
            <thead className="bg-gray-50 border-b">
              <tr>
                {[
                  t("exchangeRates.base"),
                  t("exchangeRates.quote"),
                  t("exchangeRates.rate"),
                  t("exchangeRates.asOf"),
                  t("common.actions"),
                ].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rates.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.base}</td>
                  <td className="px-4 py-3 font-medium">{r.quote}</td>
                  <td className="px-4 py-3">{Number(r.rate)}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(r.asOf).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => remove(r.id)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      {t("common.delete")}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
