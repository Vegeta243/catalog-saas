"use client";

import { useState, useEffect, useCallback, useRef } from "react";

const KEY_PREFIX = "ecompilot_lockout_";
const MAX_ATTEMPTS = 7; // Hard lock after this

interface LockoutState {
  attempts: number;       // total failed attempts for this email
  lockedUntil: number;    // timestamp ms, 0 = not locked
  lastAttempt: number;    // timestamp ms of last failure
}

function storageKey(email: string) {
  return `${KEY_PREFIX}${email.toLowerCase().trim()}`;
}

function getState(email: string): LockoutState {
  if (typeof window === "undefined") return { attempts: 0, lockedUntil: 0, lastAttempt: 0 };
  try {
    const raw = localStorage.getItem(storageKey(email));
    if (!raw) return { attempts: 0, lockedUntil: 0, lastAttempt: 0 };
    return JSON.parse(raw) as LockoutState;
  } catch {
    return { attempts: 0, lockedUntil: 0, lastAttempt: 0 };
  }
}

function saveState(email: string, state: LockoutState) {
  try {
    localStorage.setItem(storageKey(email), JSON.stringify(state));
  } catch { /* ignore */ }
}

function clearState(email: string) {
  try {
    localStorage.removeItem(storageKey(email));
  } catch { /* ignore */ }
}

/**
 * Returns the lockout duration in ms for a given attempt count.
 * 1-3: no delay (returns 0)
 * 4:   30 seconds
 * 5:   2 minutes
 * 6:   10 minutes
 * 7+:  24 hours (hard block)
 */
function lockDurationMs(attempts: number): number {
  if (attempts <= 3) return 0;
  if (attempts === 4) return 30_000;
  if (attempts === 5) return 2 * 60_000;
  if (attempts === 6) return 10 * 60_000;
  return 24 * 60 * 60_000; // 7+: 24 hours
}

export interface LockoutInfo {
  isLocked: boolean;           // currently blocked from submitting
  isPermanent: boolean;        // locked for 24h
  countdown: number;           // seconds remaining
  attempts: number;            // total failed attempts
  maxAttempts: number;         // = 7
  warningLevel: "none" | "warn" | "danger"; // feedback level
  /** Call on each Supabase auth failure */
  recordFailure: (email: string) => void;
  /** Call on success to clear state */
  recordSuccess: (email: string) => void;
  /** Refresh lockout info for a given email */
  refresh: (email: string) => void;
}

export function useLoginLockout(): LockoutInfo {
  const [isLocked, setIsLocked] = useState(false);
  const [isPermanent, setIsPermanent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const applyState = useCallback((state: LockoutState) => {
    const now = Date.now();
    const remaining = Math.max(0, state.lockedUntil - now);
    const locked = remaining > 0;
    const permanent = state.attempts >= MAX_ATTEMPTS && state.lockedUntil - now > 60 * 60_000;
    setAttempts(state.attempts);
    setIsLocked(locked);
    setIsPermanent(permanent);
    setCountdown(Math.ceil(remaining / 1000));

    clearTimer();
    if (locked) {
      timerRef.current = setInterval(() => {
        const secs = Math.ceil(Math.max(0, state.lockedUntil - Date.now()) / 1000);
        setCountdown(secs);
        if (secs <= 0) {
          clearTimer();
          setIsLocked(false);
          setIsPermanent(false);
          setCountdown(0);
        }
      }, 1000);
    }
  }, []);

  useEffect(() => { return () => clearTimer(); }, []);

  const refresh = useCallback((email: string) => {
    if (!email) return;
    applyState(getState(email));
  }, [applyState]);

  const recordFailure = useCallback((email: string) => {
    if (!email) return;
    const prev = getState(email);
    const nextAttempts = prev.attempts + 1;
    const duration = lockDurationMs(nextAttempts);
    const lockedUntil = duration > 0 ? Date.now() + duration : 0;
    const next: LockoutState = { attempts: nextAttempts, lockedUntil, lastAttempt: Date.now() };
    saveState(email, next);
    applyState(next);
  }, [applyState]);

  const recordSuccess = useCallback((email: string) => {
    clearState(email);
    clearTimer();
    setAttempts(0);
    setIsLocked(false);
    setIsPermanent(false);
    setCountdown(0);
  }, []);

  const warningLevel: "none" | "warn" | "danger" =
    attempts === 0 ? "none" : attempts <= 3 ? "warn" : "danger";

  return {
    isLocked, isPermanent, countdown, attempts,
    maxAttempts: MAX_ATTEMPTS,
    warningLevel,
    recordFailure, recordSuccess, refresh,
  };
}

/** Human-readable countdown string */
export function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}min ${s}s` : `${m}min`;
}
