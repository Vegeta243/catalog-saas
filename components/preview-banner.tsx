"use client";

import { useEffect, useState } from "react";
import { Eye, X } from "lucide-react";

export function PreviewBanner() {
  const [plan, setPlan] = useState<string | null>(null);
  const [stopping, setStopping] = useState(false);

  useEffect(() => {
    fetch("/api/preview/active")
      .then(r => r.json())
      .then(d => {
        if (d.active) setPlan(d.plan);
      })
      .catch(() => {/* ignore */});
  }, []);

  if (!plan) return null;

  const handleStop = async () => {
    setStopping(true);
    try {
      await fetch("/api/preview/stop", { method: "POST" });
      setPlan(null);
      window.location.reload();
    } catch {
      setStopping(false);
    }
  };

  const LABELS: Record<string, string> = {
    free: "Free",
    starter: "Starter",
    pro: "Pro",
    scale: "Scale",
  };

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 px-4 py-2 text-sm font-medium text-white"
      style={{ backgroundColor: "#3b82f6" }}
    >
      <Eye className="w-4 h-4 shrink-0" />
      <span>
        Mode prévisualisation admin — Plan simulé&nbsp;:{" "}
        <strong>{LABELS[plan] ?? plan}</strong>
      </span>
      <button
        onClick={handleStop}
        disabled={stopping}
        className="ml-2 flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/20 hover:bg-white/30 transition-colors text-xs disabled:opacity-60"
      >
        <X className="w-3 h-3" />
        {stopping ? "Arrêt…" : "Quitter le preview"}
      </button>
    </div>
  );
}
