import { useState, useEffect } from "react";

const STORAGE_KEY = "zoning-app-branding";

const DEFAULTS = {
  appName: "Municipal Zoning Information System",
  divisionName: "LGU Planning Division",
  municipalityName: "Municipality of Tago",
};

interface Branding {
  appName: string;
  divisionName: string;
  municipalityName: string;
}

function readCache(): Branding {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULTS;
}

function writeCache(b: Branding) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(b));
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: JSON.stringify(b) }));
  } catch {
    // ignore
  }
}

export function useAppBranding() {
  const [branding, setBranding] = useState<Branding>(readCache);

  useEffect(() => {
    fetch("/api/app-config", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.app_name !== undefined) {
          const b: Branding = { appName: data.app_name, divisionName: data.division_name, municipalityName: data.municipality_name ?? DEFAULTS.municipalityName };
          setBranding(b);
          writeCache(b);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setBranding({ ...DEFAULTS, ...JSON.parse(e.newValue) });
        } catch {
          // ignore
        }
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  async function saveBranding(appName: string, divisionName: string, municipalityName: string): Promise<void> {
    const res = await fetch("/api/app-config", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_name: appName, division_name: divisionName, municipality_name: municipalityName }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? "Failed to save branding.");
    }
    const data = await res.json();
    const b: Branding = { appName: data.app_name, divisionName: data.division_name, municipalityName: data.municipality_name ?? DEFAULTS.municipalityName };
    setBranding(b);
    writeCache(b);
  }

  return { ...branding, saveBranding };
}
