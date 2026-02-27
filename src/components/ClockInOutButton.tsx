"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import LocationBadge from "./LocationBadge";

interface ClockInOutButtonProps {
  openEntry: { id: string; clockIn: string } | null;
}

type LocationState = "captured" | "denied" | "unknown" | null;

export default function ClockInOutButton({ openEntry }: ClockInOutButtonProps) {
  const t = useTranslations("dashboard");
  const tLoc = useTranslations("location");
  const [isLoading, setIsLoading] = useState(false);
  const [locationState, setLocationState] = useState<LocationState>(null);
  const [error, setError] = useState<string | null>(null);

  async function getLocation(): Promise<{ lat?: number; lng?: number; accuracy?: number }> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setLocationState("unknown");
        resolve({});
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocationState("captured");
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        () => {
          setLocationState("denied");
          resolve({});
        },
        { timeout: 8000 }
      );
    });
  }

  async function handleClick() {
    setIsLoading(true);
    setError(null);
    const coords = await getLocation();

    const url = openEntry ? "/api/time/clock-out" : "/api/time/clock-in";
    const method = openEntry ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(coords),
    });

    setIsLoading(false);
    if (res.ok) {
      window.location.reload();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "An error occurred.");
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow p-6 space-y-4 text-center">
      {openEntry ? (
        <p className="text-gray-600 text-sm">
          {t("clockedInSince", {
            time: new Date(openEntry.clockIn).toLocaleTimeString(),
          })}
        </p>
      ) : (
        <p className="text-gray-400 text-sm">{t("notClockedIn")}</p>
      )}

      <button
        onClick={handleClick}
        disabled={isLoading}
        className="w-full max-w-xs mx-auto py-4 px-8 rounded-2xl text-white text-xl font-bold shadow transition disabled:opacity-60"
        style={{ backgroundColor: "var(--primary)" }}
      >
        {isLoading ? "..." : openEntry ? t("clockOut") : t("clockIn")}
      </button>

      {locationState && <LocationBadge state={locationState} />}

      {error && (
        <p className="text-red-600 text-sm">{error}</p>
      )}
    </div>
  );
}
