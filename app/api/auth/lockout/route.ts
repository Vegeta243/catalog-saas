import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// In-memory store (resets on server restart — use Redis/Supabase for production)
const attempts = new Map<string, { count: number; lockedUntil: number; lastAt: number }>();

function lockDurationMs(count: number): number {
  if (count <= 3) return 0;
  if (count === 4) return 30_000;
  if (count === 5) return 2 * 60_000;
  if (count === 6) return 10 * 60_000;
  return 24 * 60 * 60_000;
}

function getKey(req: NextRequest, email: string): string {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  return `${ip}__${email.toLowerCase().trim()}`;
}

export async function POST(req: NextRequest) {
  try {
    const { email, action } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "email required" }, { status: 400 });
    }
    const key = getKey(req, email);

    if (action === "success") {
      attempts.delete(key);
      return NextResponse.json({ ok: true });
    }

    // action === "failure"
    const now = Date.now();
    const prev = attempts.get(key) ?? { count: 0, lockedUntil: 0, lastAt: 0 };
    // If still locked and trying to report — ignore
    if (prev.lockedUntil > now) {
      return NextResponse.json({
        locked: true,
        lockedUntil: prev.lockedUntil,
        count: prev.count,
      });
    }
    const nextCount = prev.count + 1;
    const duration = lockDurationMs(nextCount);
    const lockedUntil = duration > 0 ? now + duration : 0;
    attempts.set(key, { count: nextCount, lockedUntil, lastAt: now });

    // Clean up stale entries periodically
    if (Math.random() < 0.05) {
      const cutoff = now - 24 * 60 * 60_000;
      for (const [k, v] of attempts.entries()) {
        if (v.lastAt < cutoff) attempts.delete(k);
      }
    }

    return NextResponse.json({
      locked: lockedUntil > now,
      lockedUntil,
      count: nextCount,
      durationMs: duration,
    });
  } catch {
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const email = new URL(req.url).searchParams.get("email");
  if (!email) return NextResponse.json({ locked: false, count: 0 });
  const key = getKey(req, email);
  const state = attempts.get(key);
  if (!state) return NextResponse.json({ locked: false, count: 0 });
  const now = Date.now();
  return NextResponse.json({
    locked: state.lockedUntil > now,
    lockedUntil: state.lockedUntil,
    count: state.count,
    remainingMs: Math.max(0, state.lockedUntil - now),
  });
}
