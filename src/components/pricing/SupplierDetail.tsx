"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

const RATE_UNITS = [
  "PER_PERSON",
  "PER_NIGHT",
  "PER_PERSON_PER_NIGHT",
  "PER_GROUP",
  "PER_DAY",
  "FLAT",
] as const;

const SALES_CHANNELS = ["BOTH", "B2B", "B2C"] as const;

interface SupplierRate {
  id: string;
  name: string;
  unit: string;
  netCost: string;
  currency: string;
  channel: string;
  validFrom: string;
  validTo: string;
  minPax: number | null;
  maxPax: number | null;
  taxIncluded: boolean;
  active: boolean;
}

interface Supplier {
  id: string;
  name: string;
  type: string;
  country: string;
  city: string | null;
  currency: string;
  active: boolean;
  rates: SupplierRate[];
}

const emptyForm = {
  name: "",
  unit: "PER_PERSON" as string,
  netCost: "",
  currency: "",
  channel: "BOTH" as string,
  validFrom: "",
  validTo: "",
  minPax: "",
  maxPax: "",
  taxIncluded: false,
};

export default function SupplierDetail({ locale, supplierId }: { locale: string; supplierId: string }) {
  const t = useTranslations("pricing");
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = () => {
    setLoading(true);
    fetch(`/api/pricing/suppliers/${supplierId}`)
      .then((r) => r.json())
      .then(setSupplier)
      .finally(() => setLoading(false));
  };

  useEffect(load, [supplierId]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/pricing/suppliers/${supplierId}/rates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        unit: form.unit,
        netCost: parseFloat(form.netCost),
        currency: form.currency || undefined,
        channel: form.channel,
        validFrom: form.validFrom,
        validTo: form.validTo,
        minPax: form.minPax ? parseInt(form.minPax, 10) : null,
        maxPax: form.maxPax ? parseInt(form.maxPax, 10) : null,
        taxIncluded: form.taxIncluded,
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

  const removeRate = async (id: string) => {
    if (!confirm(t("common.confirmDelete"))) return;
    await fetch(`/api/pricing/rates/${id}`, { method: "DELETE" });
    load();
  };

  if (loading || !supplier) {
    return <p className="text-gray-400">{t("common.loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/${locale}/pricing/suppliers`} className="text-sm text-blue-600 hover:underline">
          {t("supplierDetail.back")}
        </Link>
        <h1 className="text-2xl font-bold mt-2">{supplier.name}</h1>
        <p className="text-gray-500 mt-1">
          {t(`supplierType.${supplier.type}`)} · {supplier.country}
          {supplier.city ? `, ${supplier.city}` : ""} · {supplier.currency}
        </p>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("supplierDetail.ratesTitle")}</h2>
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {t("supplierDetail.newRate")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="label">{t("supplierDetail.rateName")}</label>
              <input
                className="input w-full"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t("supplierDetail.unit")}</label>
              <select
                className="input w-full"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
              >
                {RATE_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {t(`rateUnit.${u}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("supplierDetail.netCost")}</label>
              <input
                className="input w-full"
                required
                type="number"
                step="0.01"
                min="0"
                value={form.netCost}
                onChange={(e) => setForm({ ...form, netCost: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t("common.currency")}</label>
              <input
                className="input w-full"
                placeholder={supplier.currency}
                maxLength={3}
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t("supplierDetail.channel")}</label>
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
            <div>
              <label className="label">{t("supplierDetail.validFrom")}</label>
              <input
                className="input w-full"
                required
                type="date"
                value={form.validFrom}
                onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t("supplierDetail.validTo")}</label>
              <input
                className="input w-full"
                required
                type="date"
                value={form.validTo}
                onChange={(e) => setForm({ ...form, validTo: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t("supplierDetail.minPax")}</label>
              <input
                className="input w-full"
                type="number"
                min="0"
                value={form.minPax}
                onChange={(e) => setForm({ ...form, minPax: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t("supplierDetail.maxPax")}</label>
              <input
                className="input w-full"
                type="number"
                min="0"
                value={form.maxPax}
                onChange={(e) => setForm({ ...form, maxPax: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input
                id="taxIncluded"
                type="checkbox"
                checked={form.taxIncluded}
                onChange={(e) => setForm({ ...form, taxIncluded: e.target.checked })}
              />
              <label htmlFor="taxIncluded" className="text-sm text-gray-700">
                {t("supplierDetail.taxIncluded")}
              </label>
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

      {supplier.rates.length === 0 ? (
        <p className="text-gray-400">{t("supplierDetail.noRates")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow">
          <table className="w-full text-sm bg-white">
            <thead className="bg-gray-50 border-b">
              <tr>
                {[
                  t("supplierDetail.rateName"),
                  t("supplierDetail.unit"),
                  t("supplierDetail.netCost"),
                  t("supplierDetail.channel"),
                  t("supplierDetail.validFrom"),
                  t("supplierDetail.validTo"),
                  "Pax",
                  t("supplierDetail.taxIncluded"),
                  t("common.actions"),
                ].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {supplier.rates.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3">{t(`rateUnit.${r.unit}`)}</td>
                  <td className="px-4 py-3">
                    {Number(r.netCost).toFixed(2)} {r.currency}
                  </td>
                  <td className="px-4 py-3">{t(`salesChannel.${r.channel}`)}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(r.validFrom).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(r.validTo).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {r.minPax ?? "—"} – {r.maxPax ?? "—"}
                  </td>
                  <td className="px-4 py-3">{r.taxIncluded ? "✓" : "—"}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => removeRate(r.id)}
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
