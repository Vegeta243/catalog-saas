"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const cache = new Map<string, { enabled: boolean; ts: number }>();
const TTL = 60_000; // 1 minute

export function useFeatureFlag(flagKey: string): { enabled: boolean; loading: boolean } {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = cache.get(flagKey);
    if (cached && Date.now() - cached.ts < TTL) {
      setEnabled(cached.enabled);
      setLoading(false);
      return;
    }

    const supabase = createClient();
    supabase
      .from("feature_flags")
      .select("enabled")
      .eq("key", flagKey)
      .single()
      .then(({ data }: { data: { enabled: boolean } | null }) => {
        const val = data?.enabled ?? false;
        cache.set(flagKey, { enabled: val, ts: Date.now() });
        setEnabled(val);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [flagKey]);

  return { enabled, loading };
}
