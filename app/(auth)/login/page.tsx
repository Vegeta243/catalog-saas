"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Mail, Lock, ArrowRight, BarChart3, Zap, Sparkles, ShieldCheck,
  ArrowLeft, Eye, EyeOff, AlertTriangle, Clock, Ban, XCircle
} from "lucide-react";
import { useLoginLockout, formatCountdown } from "@/lib/hooks/useLoginLockout";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const lockout = useLoginLockout();

  // Refresh lockout state whenever the email changes
  useEffect(() => {
    if (email.includes("@")) lockout.refresh(email);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    // Pre-check client-side lockout
    if (lockout.isLocked) return;

    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        lockout.recordFailure(email);
        const next = lockout.attempts + 1; // read before state update lag
        if (next >= 7) {
          setError("Compte temporairement bloquÃ© pendant 24h suite Ã  trop de tentatives. Contactez le support si nÃ©cessaire.");
        } else if (next >= 5) {
          setError("Email ou mot de passe incorrect. Trop de tentatives â€” un dÃ©lai a Ã©tÃ© ajoutÃ©.");
        } else {
          setError("Email ou mot de passe incorrect.");
        }
        setLoading(false);
      } else {
        lockout.recordSuccess(email);
        router.push("/dashboard");
      }
    } catch {
      setError("Une erreur est survenue. RÃ©essayez.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
    } catch {
      setError("Erreur Google OAuth. RÃ©essayez.");
      setGoogleLoading(false);
    }
  };

  const isDisabled = loading || lockout.isLocked;

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12" style={{ backgroundColor: "#0f172a" }}>
        <div>
          <Link href="/">
            <h2 className="text-2xl font-bold" style={{ color: "#fff" }}>
              Ecom<span style={{ color: "#60a5fa" }}>Pilot</span>
            </h2>
          </Link>
          <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>Le copilote de votre catalogue Shopify</p>
        </div>
        <div className="space-y-8">
          <h3 className="text-3xl font-extrabold leading-tight" style={{ color: "#fff" }}>
            GÃ©rez votre catalogue<br />
            <span style={{ color: "#60a5fa" }}>10Ã— plus vite</span>
          </h3>
          <div className="space-y-5">
            {[
              { icon: BarChart3, title: "Modification en masse", desc: "Prix, titres, tags â€” modifiez des centaines de produits en un clic" },
              { icon: Sparkles, title: "IA intégrée", desc: "Génération automatique de titres accrocheurs et descriptions de vente" },
              { icon: Zap, title: "Automatisations", desc: "CrÃ©ez des rÃ¨gles pour piloter votre catalogue automatiquement" },
              { icon: ShieldCheck, title: "SÃ©curisÃ©", desc: "Connexion OAuth Shopify, donnÃ©es chiffrÃ©es, RGPD compliant" },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(96,165,250,0.15)" }}>
                    <Icon className="w-5 h-5" style={{ color: "#60a5fa" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#fff" }}>{f.title}</p>
                    <p className="text-xs" style={{ color: "#94a3b8" }}>{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <p className="text-xs" style={{ color: "#475569" }}>Â© 2026 EcomPilot â€” Tous droits rÃ©servÃ©s</p>
      </div>

      {/* Right panel â€” Form */}
      <div className="flex-1 flex items-center justify-center p-8" style={{ backgroundColor: "#f8fafc" }}>
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link href="/"><h2 className="text-xl font-bold" style={{ color: "#0f172a" }}>Ecom<span style={{ color: "#2563eb" }}>Pilot</span></h2></Link>
          </div>

          <h1 className="text-2xl font-extrabold mb-2" style={{ color: "#0f172a" }}>Bon retour ðŸ‘‹</h1>
          <p className="text-sm mb-8" style={{ color: "#64748b" }}>Connectez-vous pour accÃ©der Ã  votre tableau de bord</p>

          {/* â•â• LOCKOUT BANNERS â•â• */}
          {lockout.isPermanent && (
            <div className="mb-5 p-4 rounded-xl border flex items-start gap-3" style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}>
              <Ban className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#dc2626" }} />
              <div>
                <p className="text-sm font-bold" style={{ color: "#991b1b" }}>Compte temporairement bloquÃ©</p>
                <p className="text-xs mt-1" style={{ color: "#b91c1c" }}>
                  Trop de tentatives Ã©chouÃ©es. RÃ©essayez dans <strong>{formatCountdown(lockout.countdown)}</strong> ou contactez{" "}
                  <a href="mailto:support@ecompilot.fr" className="underline">support@ecompilot.fr</a>.
                </p>
              </div>
            </div>
          )}
          {!lockout.isPermanent && lockout.isLocked && (
            <div className="mb-5 p-4 rounded-xl border flex items-start gap-3" style={{ backgroundColor: "#fff7ed", borderColor: "#fed7aa" }}>
              <Clock className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#ea580c" }} />
              <div>
                <p className="text-sm font-bold" style={{ color: "#9a3412" }}>DÃ©lai de sÃ©curitÃ© actif</p>
                <p className="text-xs mt-1" style={{ color: "#c2410c" }}>
                  Tentatives Ã©chouÃ©es ({lockout.attempts}). RÃ©essayez dans <strong>{formatCountdown(lockout.countdown)}</strong>.
                </p>
                {/* Progress bar */}
                <div className="mt-2 h-1.5 rounded-full w-full overflow-hidden" style={{ backgroundColor: "#fed7aa" }}>
                  <div
                    className="h-1.5 rounded-full transition-all"
                    style={{ width: `${(lockout.countdown / (lockout.attempts === 4 ? 30 : lockout.attempts === 5 ? 120 : 600)) * 100}%`, backgroundColor: "#ea580c" }}
                  />
                </div>
              </div>
            </div>
          )}
          {!lockout.isLocked && lockout.attempts > 0 && lockout.attempts < 7 && (
            <div className="mb-4 p-3 rounded-xl border flex items-center gap-3" style={{ backgroundColor: "#fef9c3", borderColor: "#fde047" }}>
              <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "#a16207" }} />
              <div>
                <p className="text-xs font-semibold" style={{ color: "#854d0e" }}>
                  {lockout.attempts} tentative{lockout.attempts > 1 ? "s" : ""} Ã©chouÃ©e{lockout.attempts > 1 ? "s" : ""}.{" "}
                  {lockout.attempts <= 3
                    ? `Encore ${4 - lockout.attempts} avant le premier dÃ©lai.`
                    : `Prochain blocage plus long.`}
                </p>
              </div>
            </div>
          )}

          {/* Auth error (non-lockout) */}
          {error && !lockout.isLocked && (
            <div className="mb-4 p-3 rounded-lg flex items-center gap-2 text-sm" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
              <XCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Google OAuth */}
          <button onClick={handleGoogleLogin} disabled={isDisabled || googleLoading}
            className="w-full py-3 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 rounded-xl text-sm font-medium flex items-center justify-center gap-3 transition-colors mb-6"
            style={{ color: "#374151" }}>
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {googleLoading ? "Connexionâ€¦" : "Continuer avec Google"}
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs" style={{ color: "#94a3b8" }}>ou par email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Adresse e-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="vous@exemple.com"
                  disabled={lockout.isPermanent}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  style={{ color: "#0f172a" }}
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium" style={{ color: "#374151" }}>Mot de passe</label>
                <Link href="/forgot-password" className="text-xs font-medium hover:underline" style={{ color: "#2563eb" }}>Mot de passe oubliÃ© ?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                <input
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                  disabled={isDisabled}
                  className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  style={{ color: "#0f172a" }}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:opacity-70 transition-opacity"
                  tabIndex={-1}
                >
                  {showPwd
                    ? <EyeOff className="w-4 h-4" style={{ color: "#94a3b8" }} />
                    : <Eye className="w-4 h-4" style={{ color: "#94a3b8" }} />}
                </button>
              </div>
            </div>

            {/* Attempt indicator dots */}
            {lockout.attempts > 0 && lockout.attempts < 7 && (
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-xs" style={{ color: "#94a3b8" }}>Tentatives :</span>
                {Array.from({ length: 7 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full transition-all"
                    style={{ backgroundColor: i < lockout.attempts ? (lockout.attempts >= 6 ? "#dc2626" : lockout.attempts >= 4 ? "#ea580c" : "#f59e0b") : "#e2e8f0" }}
                  />
                ))}
              </div>
            )}

            <button
              type="submit"
              disabled={isDisabled}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
              style={{ color: "#fff" }}
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Connexionâ€¦</>
              ) : lockout.isLocked ? (
                <><Clock className="w-4 h-4" /> BloquÃ© â€” {formatCountdown(lockout.countdown)}</>
              ) : (
                <>Connexion <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: "#64748b" }}>
            Pas encore de compte ?{" "}
            <Link href="/signup" className="font-medium hover:underline" style={{ color: "#2563eb" }}>CrÃ©er un compte</Link>
          </p>

          <div className="mt-4 text-center">
            <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium hover:underline" style={{ color: "#64748b" }}>
              <ArrowLeft className="w-3.5 h-3.5" /> Retour Ã  l&apos;accueil
            </Link>
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
              <span className="text-xs" style={{ color: "#94a3b8" }}>Connexion sÃ©curisÃ©e SSL</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
              <span className="text-xs" style={{ color: "#94a3b8" }}>Verrouillage auto aprÃ¨s {7} Ã©checs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
