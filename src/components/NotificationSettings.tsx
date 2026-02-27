"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

interface NotificationSettingsProps {
  notifyEmail: boolean;
  notifyBrowser: boolean;
  notifySms: boolean;
  phone: string;
}

export default function NotificationSettings({
  notifyEmail: initEmail,
  notifyBrowser: initBrowser,
  notifySms: initSms,
  phone: initPhone,
}: NotificationSettingsProps) {
  const t = useTranslations("profile");
  const [notifyEmail, setNotifyEmail] = useState(initEmail);
  const [notifyBrowser, setNotifyBrowser] = useState(initBrowser);
  const [notifySms, setNotifySms] = useState(initSms);
  const [phone, setPhone] = useState(initPhone);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notifyEmail, notifyBrowser, notifySms, phone }),
    });
    setLoading(false);
    setSuccess(true);

    // Register/unregister push subscription
    if (notifyBrowser && "serviceWorker" in navigator) {
      await registerPush();
    }
  }

  async function registerPush() {
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      await fetch("/api/notifications/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
    } catch {
      // Push subscription failed; ignored
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-3">
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={notifyEmail} onChange={(e) => setNotifyEmail(e.target.checked)} className="h-4 w-4 rounded" />
        <span className="text-sm">{t("email")}</span>
      </label>
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={notifyBrowser} onChange={(e) => setNotifyBrowser(e.target.checked)} className="h-4 w-4 rounded" />
        <span className="text-sm">{t("browser")}</span>
      </label>
      <label className="flex items-center gap-3 cursor-pointer">
        <input type="checkbox" checked={notifySms} onChange={(e) => setNotifySms(e.target.checked)} className="h-4 w-4 rounded" />
        <span className="text-sm">{t("sms")}</span>
      </label>
      {notifySms && (
        <div>
          <label className="label">{t("phone")}</label>
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input w-full" placeholder="+1234567890" />
        </div>
      )}
      {success && <p className="text-green-600 text-sm">{t("success")}</p>}
      <button type="submit" disabled={loading} className="btn-primary">
        {loading ? "..." : t("save")}
      </button>
    </form>
  );
}
