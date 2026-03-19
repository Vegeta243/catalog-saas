"use client";

import { useEffect, useState } from "react";
import { Lock, Sparkles, Loader2 } from "lucide-react";

interface BetaLockedPageProps {
  featureName: string;
  featureDescription?: string;
}

export function BetaLockedPage({ featureName, featureDescription }: BetaLockedPageProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await fetch("/api/beta/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, feature: featureName }),
      });
      setSubmitted(true);
    } catch {
      // Silent fail — still show success so UX isn't broken
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
        style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)" }}>
        <Lock className="w-8 h-8 text-white" />
      </div>

      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4"
        style={{ backgroundColor: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
        <Sparkles className="w-3 h-3" />
        Bêta privée
      </span>

      <h1 className="text-2xl font-bold mb-2" style={{ color: "#0f172a" }}>
        {featureName} est en bêta fermée
      </h1>
      <p className="text-sm mb-6 leading-relaxed" style={{ color: "#64748b" }}>
        {featureDescription ||
          "Cette fonctionnalité est en cours de déploiement progressif. Inscrivez-vous pour être parmi les premiers à y accéder."}
      </p>

      {submitted ? (
        <div className="px-6 py-4 rounded-xl border" style={{ backgroundColor: "#f0fdf4", borderColor: "#86efac" }}>
          <p className="text-sm font-semibold text-green-700">✅ Vous êtes sur la liste !</p>
          <p className="text-xs text-green-600 mt-1">Nous vous contacterons dès l&apos;ouverture de l&apos;accès.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-3">
          <div className="flex gap-2">
            <input
              type="email"
              required
              placeholder="votre@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              style={{ color: "#0f172a" }}
            />
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
              style={{ backgroundColor: "#6366f1" }}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Rejoindre la liste"}
            </button>
          </div>
          <p className="text-[11px]" style={{ color: "#94a3b8" }}>
            Aucun spam — juste une notification quand votre accès est prêt.
          </p>
        </form>
      )}
    </div>
  );
}

/**
 * Hook to check if the current user should bypass beta locks.
 * Returns true if an admin preview session is active (any plan).
 */
export function useBetaAccess(): { allowed: boolean; loading: boolean } {
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/preview/active")
      .then(r => r.json())
      .then(d => setAllowed(d.active === true))
      .catch(() => setAllowed(false))
      .finally(() => setLoading(false));
  }, []);

  return { allowed, loading };
}
