"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "ecompilot_free_actions";
const FREE_LIMIT = 10;

export interface ActionLimitState {
  used: number;
  limit: number;
  remaining: number;
  exceeded: boolean;
  pct: number; // 0-100
}

export function useActionLimit() {
  const [state, setState] = useState<ActionLimitState>({
    used: 0,
    limit: FREE_LIMIT,
    remaining: FREE_LIMIT,
    exceeded: false,
    pct: 0,
  });

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const used = raw ? parseInt(raw, 10) : 0;
    setState({
      used,
      limit: FREE_LIMIT,
      remaining: Math.max(0, FREE_LIMIT - used),
      exceeded: used >= FREE_LIMIT,
      pct: Math.min(100, Math.round((used / FREE_LIMIT) * 100)),
    });
  }, []);

  /** Call before any paid action. Returns false if limit exceeded (caller should redirect). */
  const consumeAction = useCallback((): boolean => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const used = raw ? parseInt(raw, 10) : 0;
    if (used >= FREE_LIMIT) {
      setState((prev) => ({ ...prev, exceeded: true, remaining: 0 }));
      return false;
    }
    const next = used + 1;
    localStorage.setItem(STORAGE_KEY, String(next));
    setState({
      used: next,
      limit: FREE_LIMIT,
      remaining: Math.max(0, FREE_LIMIT - next),
      exceeded: next >= FREE_LIMIT,
      pct: Math.min(100, Math.round((next / FREE_LIMIT) * 100)),
    });
    return true;
  }, []);

  /** Reset counter (admin / after upgrade) */
  const resetLimit = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({ used: 0, limit: FREE_LIMIT, remaining: FREE_LIMIT, exceeded: false, pct: 0 });
  }, []);

  return { ...state, consumeAction, resetLimit };
}
