"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_LIMIT = 50;

export interface ActionLimitState {
  used: number;
  limit: number;
  remaining: number;
  exceeded: boolean;
  pct: number; // 0-100
  loading: boolean;
}

function calcState(used: number, limit: number, loading = false): ActionLimitState {
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    exceeded: used >= limit,
    pct: Math.min(100, Math.round((used / limit) * 100)),
    loading,
  };
}

export function useActionLimit() {
  const [state, setState] = useState<ActionLimitState>(calcState(0, DEFAULT_LIMIT, true));
  const userIdRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userIdRef.current = user.id;

      const { data } = await supabase
        .from("users")
        .select("actions_used, actions_limit")
        .eq("id", user.id)
        .single();

      if (data) {
        setState(calcState(data.actions_used ?? 0, data.actions_limit ?? DEFAULT_LIMIT));
      } else {
        setState(calcState(0, DEFAULT_LIMIT));
      }
    } catch {
      setState(calcState(0, DEFAULT_LIMIT));
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  /**
   * Consume `count` actions (default 1). Returns false if limit exceeded.
   * Calls the DB function `increment_actions` to persist atomically.
   */
  const consumeAction = useCallback(async (count = 1): Promise<boolean> => {
    const supabase = createClient();
    const userId = userIdRef.current;
    if (!userId) return false;

    // Optimistic check
    if (state.used + count > state.limit) {
      setState((prev) => ({ ...prev, exceeded: true, remaining: 0 }));
      return false;
    }

    const { error } = await supabase.rpc("increment_actions", {
      p_user_id: userId,
      p_count: count,
    });

    if (error) return false;

    // Refresh from DB for accuracy
    await refresh();
    return true;
  }, [state.used, state.limit, refresh]);

  /** Reset counter (admin / after upgrade) — re-fetches from DB */
  const resetLimit = useCallback(async () => {
    await refresh();
  }, [refresh]);

  return { ...state, consumeAction, resetLimit, refresh };
}
