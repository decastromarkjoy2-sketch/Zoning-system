import { useState, useEffect } from "react";

const STORAGE_KEY = "zoning-app-logo";

export function useAppLogo() {
  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        setLogoUrl(e.newValue);
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function saveLogo(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        localStorage.setItem(STORAGE_KEY, dataUrl);
        setLogoUrl(dataUrl);
        window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: dataUrl }));
        resolve();
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function removeLogo() {
    localStorage.removeItem(STORAGE_KEY);
    setLogoUrl(null);
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY, newValue: null }));
  }

  return { logoUrl, saveLogo, removeLogo };
}
