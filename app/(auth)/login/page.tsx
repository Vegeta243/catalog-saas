"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Mail, Lock, ArrowRight, BarChart3, Zap, Sparkles, ShieldCheck,
  ArrowLeft, Eye, EyeOff, AlertTriangle, Clock, Ban, XCircle, User,
} from "lucide-react";
import { useLoginLockout, formatCountdown } from "@/lib/hooks/useLoginLockout";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#f8fafc" }}>
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    }>
      <AuthContent />
    </Suspense>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function AuthContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "login";
  const [tab, setTab] = useState<"login" | "signup">(initialTab);

  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Signup state
  const [signupFirstName, setSignupFirstName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [showSignupPwd, setShowSignupPwd] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);

  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const lockout = useLoginLockout();

  useEffect(() => {
    if (loginEmail.includes("@")) lockout.refresh(loginEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginEmail]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockout.isLocked) return;
    setLoginError(null);
    setLoginLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
      if (error) {
        lockout.recordFailure(loginEmail);
        const n = lockout.attempts + 1;
        if (n >= 7) setLoginError("Compte bloque 24h — trop de tentatives. Contactez support@ecompilot.fr");
        else if (n >= 5) setLoginError("Email ou mot de passe incorrect. Un delai a ete ajoute.");
        else setLoginError("Email ou mot de passe incorrect.");
        setLoginLoading(false);
      } else {
        lockout.recordSuccess(loginEmail);
        router.push("/dashboard");
      }
    } catch {
      setLoginError("Une erreur est survenue. Reessayez.");
      setLoginLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    if (signupPassword !== signupConfirm) { setSignupError("Les mots de passe ne correspondent pas."); return; }
    if (signupPassword.length < 6) { setSignupError("Mot de passe trop court (6 caracteres minimum)."); return; }
    setSignupLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          data: { first_name: signupFirstName },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) { setSignupError(error.message); setSignupLoading(false); return; }
      router.push("/verify-email");
    } catch (err: unknown) {
      setSignupError((err as Error).message);
      setSignupLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
    } catch {
      setGoogleLoading(false);
    }
  };

  const isLoginDisabled = loginLoading || lockout.isLocked;

  const features = [
    { icon: BarChart3, title: "Modification en masse", desc: "Prix, titres, tags — modifiez des centaines de produits en un clic" },
    { icon: Sparkles, title: "IA integree", desc: "Generation automatique de titres accrocheurs et descriptions de vente" },
    { icon: Zap, title: "Automatisations", desc: "Creez des regles pour piloter votre catalogue automatiquement" },
    { icon: ShieldCheck, title: "Securise", desc: "Connexion OAuth Shopify, donnees chiffrees, RGPD compliant" },
  ];

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
            {tab === "login"
              ? <><span>Bon retour</span><br /><span style={{ color: "#60a5fa" }}>Content de vous revoir</span></>
              : <><span>Demarrez</span><br /><span style={{ color: "#60a5fa" }}>votre optimisation Shopify</span></>
            }
          </h3>
          <div className="space-y-5">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "rgba(96,165,250,0.15)" }}>
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
          {tab === "signup" && (
            <div className="p-4 rounded-xl border" style={{ borderColor: "rgba(96,165,250,0.3)", backgroundColor: "rgba(96,165,250,0.05)" }}>
              <p className="text-xs font-semibold mb-1" style={{ color: "#94a3b8" }}>Offre de demarrage</p>
              <p className="text-lg font-extrabold" style={{ color: "#fff" }}>
                10 actions <span style={{ color: "#60a5fa" }}>gratuites</span>
              </p>
              <p className="text-xs mt-1" style={{ color: "#64748b" }}>Sans carte bancaire — acces immediat</p>
            </div>
          )}
        </div>
        <p className="text-xs" style={{ color: "#475569" }}>© 2026 EcomPilot — Tous droits reserves</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8" style={{ backgroundColor: "#f8fafc" }}>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-6">
            <Link href="/"><h2 className="text-xl font-bold" style={{ color: "#0f172a" }}>Ecom<span style={{ color: "#2563eb" }}>Pilot</span></h2></Link>
          </div>

          {/* Tabs */}
          <div className="flex rounded-xl p-1 mb-8 border border-gray-200" style={{ backgroundColor: "#fff" }}>
            {(["login", "signup"] as const).map((t) => (
              <button key={t}
                onClick={() => { setTab(t); setLoginError(null); setSignupError(null); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${tab === t ? "shadow-sm" : "hover:text-gray-700"}`}
                style={{
                  backgroundColor: tab === t ? "#2563eb" : "transparent",
                  color: tab === t ? "#fff" : "#64748b",
                }}>
                {t === "login" ? "Se connecter" : "Creer un compte"}
              </button>
            ))}
          </div>

          {/* ── LOGIN ── */}
          {tab === "login" && (
            <>
              {lockout.isPermanent && (
                <div className="mb-5 p-4 rounded-xl border flex items-start gap-3" style={{ backgroundColor: "#fef2f2", borderColor: "#fecaca" }}>
                  <Ban className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#dc2626" }} />
                  <div>
                    <p className="text-sm font-bold" style={{ color: "#991b1b" }}>Compte bloque temporairement</p>
                    <p className="text-xs mt-1" style={{ color: "#b91c1c" }}>
                      Reessayez dans <strong>{formatCountdown(lockout.countdown)}</strong> ou contactez{" "}
                      <a href="mailto:support@ecompilot.fr" className="underline">support@ecompilot.fr</a>.
                    </p>
                  </div>
                </div>
              )}
              {!lockout.isPermanent && lockout.isLocked && (
                <div className="mb-5 p-4 rounded-xl border flex items-start gap-3" style={{ backgroundColor: "#fff7ed", borderColor: "#fed7aa" }}>
                  <Clock className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#ea580c" }} />
                  <div className="flex-1">
                    <p className="text-sm font-bold" style={{ color: "#9a3412" }}>Delai de securite actif</p>
                    <p className="text-xs mt-1" style={{ color: "#c2410c" }}>
                      {lockout.attempts} tentatives echouees. Reessayez dans <strong>{formatCountdown(lockout.countdown)}</strong>.
                    </p>
                    <div className="mt-2 h-1.5 rounded-full w-full overflow-hidden" style={{ backgroundColor: "#fed7aa" }}>
                      <div className="h-1.5 rounded-full transition-all" style={{
                        width: `${(lockout.countdown / (lockout.attempts === 4 ? 30 : lockout.attempts === 5 ? 120 : 600)) * 100}%`,
                        backgroundColor: "#ea580c",
                      }} />
                    </div>
                  </div>
                </div>
              )}
              {!lockout.isLocked && lockout.attempts > 0 && lockout.attempts < 7 && (
                <div className="mb-4 p-3 rounded-xl border flex items-center gap-3" style={{ backgroundColor: "#fef9c3", borderColor: "#fde047" }}>
                  <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "#a16207" }} />
                  <p className="text-xs font-semibold" style={{ color: "#854d0e" }}>
                    {lockout.attempts} tentative{lockout.attempts > 1 ? "s" : ""} echouee{lockout.attempts > 1 ? "s" : ""}.{" "}
                    {lockout.attempts <= 3 ? `Encore ${4 - lockout.attempts} avant le premier delai.` : "Prochain blocage plus long."}
                  </p>
                </div>
              )}
              {loginError && !lockout.isLocked && (
                <div className="mb-4 p-3 rounded-lg flex items-center gap-2 text-sm" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
                  <XCircle className="w-4 h-4 shrink-0" />{loginError}
                </div>
              )}

              <button onClick={handleGoogle} disabled={isLoginDisabled || googleLoading}
                className="w-full py-3 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 rounded-xl text-sm font-medium flex items-center justify-center gap-3 transition-colors mb-5 bg-white"
                style={{ color: "#374151" }}>
                <GoogleIcon />
                {googleLoading ? "Connexion…" : "Continuer avec Google"}
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs" style={{ color: "#94a3b8" }}>ou par email</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Adresse e-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                    <input type="email" value={loginEmail}
                      onChange={(e) => { setLoginEmail(e.target.value); setLoginError(null); }}
                      placeholder="vous@exemple.com" disabled={lockout.isPermanent} required
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:bg-gray-100 bg-white"
                      style={{ color: "#0f172a" }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium" style={{ color: "#374151" }}>Mot de passe</label>
                    <Link href="/forgot-password" className="text-xs font-medium hover:underline" style={{ color: "#2563eb" }}>
                      Mot de passe oublie ?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                    <input type={showPwd ? "text" : "password"} value={loginPassword}
                      onChange={(e) => { setLoginPassword(e.target.value); setLoginError(null); }}
                      placeholder="••••••••" disabled={isLoginDisabled} required
                      className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:bg-gray-100 bg-white"
                      style={{ color: "#0f172a" }} />
                    <button type="button" onClick={() => setShowPwd(v => !v)} tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:opacity-70">
                      {showPwd
                        ? <EyeOff className="w-4 h-4" style={{ color: "#94a3b8" }} />
                        : <Eye className="w-4 h-4" style={{ color: "#94a3b8" }} />}
                    </button>
                  </div>
                </div>

                {lockout.attempts > 0 && lockout.attempts < 7 && (
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-xs" style={{ color: "#94a3b8" }}>Tentatives :</span>
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div key={i} className="w-2 h-2 rounded-full transition-all"
                        style={{ backgroundColor: i < lockout.attempts ? (lockout.attempts >= 6 ? "#dc2626" : lockout.attempts >= 4 ? "#ea580c" : "#f59e0b") : "#e2e8f0" }} />
                    ))}
                  </div>
                )}

                <button type="submit" disabled={isLoginDisabled}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                  style={{ color: "#fff" }}>
                  {loginLoading
                    ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Connexion…</>
                    : lockout.isLocked
                      ? <><Clock className="w-4 h-4" /> Bloque — {formatCountdown(lockout.countdown)}</>
                      : <>Se connecter <ArrowRight className="w-4 h-4" /></>
                  }
                </button>
              </form>

              <div className="mt-5 flex items-center justify-center gap-4">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
                  <span className="text-xs" style={{ color: "#94a3b8" }}>Connexion securisee SSL</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
                  <span className="text-xs" style={{ color: "#94a3b8" }}>Verrouillage apres 7 echecs</span>
                </div>
              </div>
            </>
          )}

          {/* ── SIGNUP ── */}
          {tab === "signup" && (
            <>
              {signupError && (
                <div className="mb-4 p-3 rounded-lg flex items-center gap-2 text-sm" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
                  <XCircle className="w-4 h-4 shrink-0" />{signupError}
                </div>
              )}

              <button onClick={handleGoogle} disabled={signupLoading || googleLoading}
                className="w-full py-3 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 rounded-xl text-sm font-medium flex items-center justify-center gap-3 transition-colors mb-5 bg-white"
                style={{ color: "#374151" }}>
                <GoogleIcon />
                {googleLoading ? "Inscription…" : "Continuer avec Google"}
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs" style={{ color: "#94a3b8" }}>ou par email</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Prenom</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                    <input type="text" value={signupFirstName} onChange={(e) => setSignupFirstName(e.target.value)}
                      placeholder="Votre prenom" required
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                      style={{ color: "#0f172a" }} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Adresse e-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                    <input type="email" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="vous@exemple.com" required
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                      style={{ color: "#0f172a" }} />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                    <input type={showSignupPwd ? "text" : "password"} value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Minimum 6 caracteres" required
                      className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                      style={{ color: "#0f172a" }} />
                    <button type="button" onClick={() => setShowSignupPwd(v => !v)} tabIndex={-1}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:opacity-70">
                      {showSignupPwd
                        ? <EyeOff className="w-4 h-4" style={{ color: "#94a3b8" }} />
                        : <Eye className="w-4 h-4" style={{ color: "#94a3b8" }} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Confirmer le mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                    <input type="password" value={signupConfirm} onChange={(e) => setSignupConfirm(e.target.value)}
                      placeholder="••••••••" required
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                      style={{ color: "#0f172a" }} />
                  </div>
                </div>

                <button type="submit" disabled={signupLoading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
                  style={{ color: "#fff" }}>
                  {signupLoading
                    ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Creation du compte…</>
                    : <>Creer mon compte gratuit <ArrowRight className="w-4 h-4" /></>
                  }
                </button>
              </form>

              <p className="mt-4 text-xs text-center" style={{ color: "#94a3b8" }}>
                En creant un compte vous acceptez nos{" "}
                <Link href="/cgu" className="underline">CGU</Link> et notre{" "}
                <Link href="/politique-confidentialite" className="underline">politique de confidentialite</Link>.
              </p>
              <div className="mt-3 flex items-center justify-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
                <span className="text-xs" style={{ color: "#94a3b8" }}>Sans carte bancaire — 10 actions offertes</span>
              </div>
            </>
          )}

          <div className="mt-6 text-center">
            <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium hover:underline" style={{ color: "#64748b" }}>
              <ArrowLeft className="w-3.5 h-3.5" /> Retour a l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
