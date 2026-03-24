"use client";

import { useState, useEffect } from "react";

const TTL = 60_000; // 60 seconds

interface FlagsCache {
  flags: Record<string, boolean>;
  plan: string;
  ts: number;
}

let flagsCache: FlagsCache | null = null;
let fetchInFlight: Promise<FlagsCache> | null = null;

async function fetchAllFlags(): Promise<FlagsCache> {
  if (fetchInFlight) return fetchInFlight;
  fetchInFlight = fetch("/api/feature-flags")
    .then((r) => r.json())
    .then((data) => {
      const result: FlagsCache = {
        flags: data.flags || {},
        plan: data.plan || "free",
        ts: Date.now(),
      };
      flagsCache = result;
      fetchInFlight = null;
      return result;
    })
    .catch(() => {
      fetchInFlight = null;
      return { flags: {}, plan: "free", ts: Date.now() };
    });
  return fetchInFlight;
}

export function useFeatureFlag(flagKey: string): { enabled: boolean; loading: boolean } {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Use cache if fresh
    if (flagsCache && Date.now() - flagsCache.ts < TTL) {
      setEnabled(flagsCache.flags[flagKey] ?? false);
      setLoading(false);
      return;
    }

    fetchAllFlags().then((cache) => {
      setEnabled(cache.flags[flagKey] ?? false);
      setLoading(false);
    });
  }, [flagKey]);

  return { enabled, loading };
}

/** Invalidate the cache (call after admin toggling a flag) */
export function invalidateFlagsCache() {
  flagsCache = null;
  fetchInFlight = null;
}

