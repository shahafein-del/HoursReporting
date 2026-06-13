"use client";

import { useState, useEffect, FormEvent } from "react";
import { useTranslations } from "next-intl";

const TAX_CALC_TYPES = ["PERCENTAGE", "FIXED_AMOUNT"] as const;
const TAX_APPLIES_TO = ["SUBTOTAL", "PER_PERSON_PER_NIGHT", "PER_PERSON", "PER_BOOKING"] as const;
const SALES_CHANNELS = ["BOTH", "B2B", "B2C"] as const;

interface TaxRule {
  id: string;
  name: string;
  country: string;
  type: string;
  appliesTo: string;
  rate: string;
  currency: string | null;
  channel: string;
  active: boolean;
  notes: string | null;
}

const emptyForm = {
  name: "",
  country: "",
  type: "PERCENTAGE" as string,
  appliesTo: "SUBTOTAL" as string,
  rate: "",
  currency: "",
  channel: "BOTH" as string,
};

export default function TaxRulesManager() {
  const t = useTranslations("pricing");
  const [rules, setRules] = useState<TaxRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    setLoading(true);
    fetch("/api/pricing/tax-rules")
      .then((r) => r.json())
      .then(setRules)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (form.type === "FIXED_AMOUNT" && !form.currency) {
      setSaving(false);
      setError(t("taxRules.rateHint"));
      return;
    }

    const res = await fetch("/api/pricing/tax-rules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        country: form.country.toUpperCase(),
        type: form.type,
        appliesTo: form.appliesTo,
        rate: parseFloat(form.rate),
        currency: form.currency || undefined,
        channel: form.channel,
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

  const toggleActive = async (rule: TaxRule) => {
    await fetch(`/api/pricing/tax-rules/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !rule.active }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm(t("common.confirmDelete"))) return;
    await fetch(`/api/pricing/tax-rules/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {t("taxRules.newRule")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="label">{t("common.name")}</label>
              <input
                className="input w-full"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t("common.country")}</label>
              <input
                className="input w-full"
                required
                placeholder='ES or "*"'
                maxLength={2}
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t("taxRules.appliesTo")}</label>
              <select
                className="input w-full"
                value={form.appliesTo}
                onChange={(e) => setForm({ ...form, appliesTo: e.target.value })}
              >
                {TAX_APPLIES_TO.map((a) => (
                  <option key={a} value={a}>
                    {t(`taxAppliesTo.${a}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("common.type")}</label>
              <select
                className="input w-full"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {TAX_CALC_TYPES.map((ty) => (
                  <option key={ty} value={ty}>
                    {t(`taxCalcType.${ty}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("taxRules.rate")}</label>
              <input
                className="input w-full"
                required
                type="number"
                step="0.001"
                min="0"
                value={form.rate}
                onChange={(e) => setForm({ ...form, rate: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">{t("taxRules.rateHint")}</p>
            </div>
            {form.type === "FIXED_AMOUNT" && (
              <div>
                <label className="label">{t("common.currency")}</label>
                <input
                  className="input w-full"
                  required
                  maxLength={3}
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                />
              </div>
            )}
            <div>
              <label className="label">{t("taxRules.channel")}</label>
              <select
                className="input w-full"
                value={form.channel}
                onChange={(e) => setForm({ ...form, channel: e.target.value })}
              >
                {SALES_CHANNELS.map((c) => (
                  <option key={c} value={c}>
                    {t(`salesChannel.${c}`)}
                  </option>
                ))}
              </select>
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
      ) : rules.length === 0 ? (
        <p className="text-gray-400">{t("taxRules.noRules")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow">
          <table className="w-full text-sm bg-white">
            <thead className="bg-gray-50 border-b">
              <tr>
                {[
                  t("common.name"),
                  t("common.country"),
                  t("common.type"),
                  t("taxRules.appliesTo"),
                  t("taxRules.rate"),
                  t("taxRules.channel"),
                  t("common.active"),
                  t("common.actions"),
                ].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rules.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3">{r.country}</td>
                  <td className="px-4 py-3">{t(`taxCalcType.${r.type}`)}</td>
                  <td className="px-4 py-3">{t(`taxAppliesTo.${r.appliesTo}`)}</td>
                  <td className="px-4 py-3">
                    {r.type === "PERCENTAGE"
                      ? `${Number(r.rate)}%`
                      : `${Number(r.rate).toFixed(2)} ${r.currency}`}
                  </td>
                  <td className="px-4 py-3">{t(`salesChannel.${r.channel}`)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(r)}
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        r.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {r.active ? t("common.active") : t("common.inactive")}
                    </button>
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
