"use client";

import { useState, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

const SUPPLIER_TYPES = [
  "ACCOMMODATION",
  "TRANSPORT",
  "ACTIVITY",
  "GUIDE",
  "MEAL",
  "ENTRANCE_FEE",
  "INSURANCE",
  "FLIGHT",
  "OTHER",
] as const;

interface Supplier {
  id: string;
  name: string;
  type: string;
  country: string;
  city: string | null;
  currency: string;
  active: boolean;
  _count: { rates: number };
}

export default function SuppliersManager({ locale }: { locale: string }) {
  const t = useTranslations("pricing");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    type: "ACCOMMODATION",
    country: "",
    city: "",
    currency: "",
  });

  const load = () => {
    setLoading(true);
    fetch("/api/pricing/suppliers")
      .then((r) => r.json())
      .then(setSuppliers)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await fetch("/api/pricing/suppliers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save");
      return;
    }
    setForm({ name: "", type: "ACCOMMODATION", country: "", city: "", currency: "" });
    setShowForm(false);
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
          {t("suppliers.newSupplier")}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} className="rounded-xl border bg-white p-4 shadow-sm space-y-4">
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{t("common.name")}</label>
              <input
                className="input w-full"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t("common.type")}</label>
              <select
                className="input w-full"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                {SUPPLIER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`supplierType.${type}`)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t("common.country")}</label>
              <input
                className="input w-full"
                required
                placeholder="ES"
                maxLength={2}
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t("common.city")}</label>
              <input
                className="input w-full"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t("common.currency")}</label>
              <input
                className="input w-full"
                required
                placeholder="EUR"
                maxLength={3}
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
              />
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
      ) : suppliers.length === 0 ? (
        <p className="text-gray-400">{t("suppliers.noSuppliers")}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow">
          <table className="w-full text-sm bg-white">
            <thead className="bg-gray-50 border-b">
              <tr>
                {[
                  t("common.name"),
                  t("common.type"),
                  t("common.country"),
                  t("common.city"),
                  t("common.currency"),
                  t("suppliers.rates"),
                  t("common.active"),
                  "",
                ].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-semibold text-gray-600">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3">{t(`supplierType.${s.type}`)}</td>
                  <td className="px-4 py-3">{s.country}</td>
                  <td className="px-4 py-3 text-gray-500">{s.city ?? "—"}</td>
                  <td className="px-4 py-3">{s.currency}</td>
                  <td className="px-4 py-3">{s._count.rates}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                        s.active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {s.active ? t("common.active") : t("common.inactive")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/${locale}/pricing/suppliers/${s.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {t("suppliers.viewRates")}
                    </Link>
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
