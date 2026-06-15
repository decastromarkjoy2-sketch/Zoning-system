import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      setShowRestored(true);
      setTimeout(() => setShowRestored(false), 3000);
    }
    function handleOffline() {
      setIsOnline(false);
      setShowRestored(false);
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && !showRestored) return null;

  return (
    <div
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg transition-all duration-300 ${
        isOnline
          ? "bg-green-600 text-white"
          : "bg-gray-900 text-white border border-gray-700"
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="h-4 w-4" />
          Connection restored
        </>
      ) : (
        <>
          <WifiOff className="h-4 w-4 text-amber-400" />
          You are offline — cached data is being shown
        </>
      )}
    </div>
  );
}
