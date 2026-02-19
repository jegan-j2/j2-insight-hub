import { useEffect, useState, useCallback } from "react";

export const useAutoRefresh = (intervalMs: number = 300000) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setRefreshKey(prev => prev + 1);
        setLastRefresh(new Date());
      }
    };

    const interval = setInterval(() => {
      if (!document.hidden) {
        setRefreshKey(prev => prev + 1);
        setLastRefresh(new Date());
      }
    }, intervalMs);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [intervalMs]);

  const manualRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
    setLastRefresh(new Date());
  }, []);

  return { refreshKey, lastRefresh, manualRefresh };
};
