"use client";

import { useCallback, useEffect, useState } from "react";

import { api } from "@/lib/api/client";

export function useApiQuery<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(Boolean(path));

  const reload = useCallback(async () => {
    if (!path) return;
    setLoading(true);
    setError(null);
    try {
      setData(await api.get<T>(path));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
      setData((current) => current);
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    data,
    error,
    loading,
    initialLoading: loading && data === null,
    refreshing: loading && data !== null,
    reload,
  };
}
