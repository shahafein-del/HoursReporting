"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface UploadResult {
  created: number;
  errors: { row: number; error: string }[];
}

export default function MassUpload() {
  const t = useTranslations("upload");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.set("file", file);

    const res = await fetch("/api/manager/upload", { method: "POST", body: formData });
    const data = await res.json();
    setLoading(false);
    setResult(data);
  }

  const templateCsv =
    "email,type,dateFrom,dateTo,clockIn,clockOut,notes\njohn@example.com,VACATION,2024-01-15,2024-01-19,,,Annual leave";

  function downloadTemplate() {
    const blob = new Blob([templateCsv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "upload-template.csv";
    a.click();
  }

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-4">
      <button type="button" onClick={downloadTemplate} className="btn-secondary text-sm">
        {t("template")}
      </button>

      <form onSubmit={handleUpload} className="space-y-3">
        <div>
          <label className="label">{t("choose")}</label>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <button type="submit" disabled={loading || !file} className="btn-primary">
          {loading ? "..." : t("submit")}
        </button>
      </form>

      {result && (
        <div className="space-y-2 text-sm">
          <p className="text-green-600 font-medium">{t("created", { count: result.created })}</p>
          {result.errors.length > 0 && (
            <div>
              <p className="text-red-600 font-medium">{t("errors", { count: result.errors.length })}</p>
              <ul className="list-disc list-inside text-red-500 space-y-1 mt-1">
                {result.errors.map((err) => (
                  <li key={err.row}>Row {err.row}: {err.error}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
