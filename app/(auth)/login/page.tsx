"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Mail, Lock, ArrowRight, BarChart3, Zap, Sparkles, ShieldCheck,
  ArrowLeft, Eye, EyeOff, AlertTriangle, Clock, Ban, XCircle, User,
  CheckCircle, RefreshCw, Shield, Inbox,
} from "lucide-react";
import { useLoginLockout, formatCountdown } from "@/lib/hooks/useLoginLockout";

/* ════════════════════════════════════════════════════════
   Page wrapper with Suspense (required for useSearchParams)
   ════════════════════════════════════════════════════════ */
export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#f8fafc" }}>
          <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
        </div>
      }
    >
      <AuthContent />
    </Suspense>
  );
}

/* ════════════════════════════════════════
   Google icon SVG
   ════════════════════════════════════════ */
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

/* ════════════════════════════════════════
   Password strength helper
   ════════════════════════════════════════ */
function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pwd.length >= 6) score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score: 1, label: "Faible", color: "#dc2626" };
  if (score <= 2) return { score: 2, label: "Moyen", color: "#f59e0b" };
  if (score <= 3) return { score: 3, label: "Correct", color: "#3b82f6" };
  return { score: 4, label: "Fort", color: "#059669" };
}

/* ════════════════════════════════════════════════════════
   Main auth content
   ════════════════════════════════════════════════════════ */
type AuthView = "login" | "signup" | "verify-email";

function AuthContent() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "login";
  const errorParam = searchParams.get("error");
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const [view, setView] = useState<AuthView>(initialTab);

  /* ── Login state ── */
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPwd, setShowLoginPwd] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(
    errorParam === "auth" ? "Echec de l'authentification. Veuillez reessayer." :
    errorParam === "config" ? "Erreur de configuration. Contactez le support." : null
  );
  const [loginLoading, setLoginLoading] = useState(false);

  /* ── Signup state ── */
  const [signupFirstName, setSignupFirstName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [showSignupPwd, setShowSignupPwd] = useState(false);
  const [showSignupConfirm, setShowSignupConfirm] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupLoading, setSignupLoading] = useState(false);
  const [acceptCgu, setAcceptCgu] = useState(false);

  /* ── Verify email state ── */
  const [verifyEmail, setVerifyEmail] = useState("");
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  /* ── Shared ── */
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const lockout = useLoginLockout();

  useEffect(() => {
    if (loginEmail.includes("@")) lockout.refresh(loginEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loginEmail]);

  /* ── Handlers ── */
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockout.isLocked) return;
    setLoginError(null);
    setLoginLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      if (error) {
        lockout.recordFailure(loginEmail);
        const n = lockout.attempts + 1;
        if (n >= 7) setLoginError("Compte bloque 24h. Trop de tentatives. Contactez support@ecompilot.fr");
        else if (n >= 5) setLoginError("Email ou mot de passe incorrect. Un delai de securite a ete ajoute.");
        else setLoginError("Email ou mot de passe incorrect.");
        setLoginLoading(false);
      } else {
        lockout.recordSuccess(loginEmail);
        router.push(redirectTo);
      }
    } catch {
      setLoginError("Une erreur est survenue. Reessayez.");
      setLoginLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError(null);
    if (!acceptCgu) {
      setSignupError("Vous devez accepter les CGU pour continuer.");
      return;
    }
    if (signupPassword !== signupConfirm) {
      setSignupError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (signupPassword.length < 6) {
      setSignupError("Le mot de passe doit contenir au moins 6 caracteres.");
      return;
    }
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
      if (error) {
        setSignupError(error.message);
        setSignupLoading(false);
        return;
      }
      // Transition to verify-email view within the same page
      setVerifyEmail(signupEmail);
      setView("verify-email");
      setSignupLoading(false);
    } catch (err: unknown) {
      setSignupError((err as Error).message);
      setSignupLoading(false);
    }
  };

  const handleResendVerification = useCallback(async () => {
    if (!verifyEmail) return;
    setVerifyError(null);
    setResending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({ type: "signup", email: verifyEmail });
      if (error) setVerifyError(error.message);
      else setResent(true);
    } catch {
      setVerifyError("Une erreur est survenue. Reessayez.");
    }
    setResending(false);
  }, [verifyEmail]);

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


  const switchView = (v: AuthView) => {
    setView(v);
    setLoginError(null);
    setSignupError(null);
    setVerifyError(null);
  };

  const isLoginDisabled = loginLoading || lockout.isLocked;
  const pwdStrength = signupPassword.length > 0 ? getPasswordStrength(signupPassword) : null;
  const passwordsMatch = signupConfirm.length > 0 && signupPassword === signupConfirm;
  const passwordsMismatch = signupConfirm.length > 0 && signupPassword !== signupConfirm;

  /* ── Features list for left panel ── */
  const features = [
    { icon: BarChart3, title: "Modification en masse", desc: "Prix, titres, tags — modifiez des centaines de produits en un clic" },
    { icon: Sparkles, title: "IA integree", desc: "Titres accrocheurs et descriptions de vente generees automatiquement" },
    { icon: Zap, title: "Automatisations", desc: "Creez des regles pour piloter votre catalogue sans effort" },
    { icon: ShieldCheck, title: "Securise et fiable", desc: "Connexion OAuth Shopify, donnees chiffrees, RGPD compliant" },
  ];

  /* ════════════════════════════════════════
     RENDER
     ════════════════════════════════════════ */
  return (
    <div className="flex min-h-screen">
      {/* ══════ LEFT PANEL (desktop only) ══════ */}
      <div className="hidden lg:flex lg:w-[45%] flex-col justify-between p-12" style={{ backgroundColor: "#0f172a" }}>
        <div>
          <Link href="/">
            <h2 className="text-2xl font-bold" style={{ color: "#fff" }}>
              Ecom<span style={{ color: "#60a5fa" }}>Pilot</span>
            </h2>
          </Link>
          <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>Le copilote de votre catalogue Shopify</p>
        </div>

        <div className="space-y-8">
          {/* Dynamic headline */}
          <h3 className="text-3xl font-extrabold leading-tight" style={{ color: "#fff" }}>
            {view === "login" && (
              <>Bon retour parmi nous<br /><span style={{ color: "#60a5fa" }}>Gerez votre catalogue</span></>
            )}
            {view === "signup" && (
              <>Lancez-vous en<br /><span style={{ color: "#60a5fa" }}>2 minutes chrono</span></>
            )}
            {view === "verify-email" && (
              <>Plus qu&apos;une etape<br /><span style={{ color: "#60a5fa" }}>Verifiez votre email</span></>
            )}
          </h3>

          {/* Features */}
          <div className="space-y-5">
            {features.map((f) => {
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

          {/* Promo badge */}
          {view !== "login" && view !== "verify-email" && (
            <div className="p-4 rounded-xl border" style={{ borderColor: "rgba(96,165,250,0.3)", backgroundColor: "rgba(96,165,250,0.05)" }}>
              <p className="text-xs font-semibold mb-1" style={{ color: "#94a3b8" }}>Offre de lancement</p>
              <p className="text-lg font-extrabold" style={{ color: "#fff" }}>
                30 actions <span style={{ color: "#60a5fa" }}>offertes</span>
              </p>
              <p className="text-xs mt-1" style={{ color: "#64748b" }}>Sans carte bancaire — acces immediat au dashboard</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { val: "2 min", label: "Configuration" },
              { val: "50", label: "Actions gratuites" },
              { val: "0 €", label: "Pour demarrer" },
            ].map((s) => (
              <div key={s.label} className="text-center p-3 rounded-xl" style={{ backgroundColor: "rgba(96,165,250,0.08)" }}>
                <p className="text-xl font-extrabold" style={{ color: "#60a5fa" }}>{s.val}</p>
                <p className="text-xs mt-0.5" style={{ color: "#94a3b8" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs" style={{ color: "#475569" }}>&copy; 2026 EcomPilot — Tous droits reserves</p>
      </div>

      {/* ══════ RIGHT PANEL ══════ */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-8 overflow-y-auto" style={{ backgroundColor: "#f8fafc" }}>
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-6 text-center">
            <Link href="/" className="inline-flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Zap className="w-4 h-4" style={{ color: "#fff" }} />
              </div>
              <span className="text-xl font-bold" style={{ color: "#0f172a" }}>
                Ecom<span style={{ color: "#2563eb" }}>Pilot</span>
              </span>
            </Link>
          </div>

          {/* ══════════════════════════════════════
             VIEW: VERIFY EMAIL
             ══════════════════════════════════════ */}
          {view === "verify-email" && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="p-8 text-center" style={{ background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)" }}>
                <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg" style={{ backgroundColor: "#2563eb" }}>
                  <Mail className="w-10 h-10" style={{ color: "#fff" }} />
                </div>
                <h1 className="text-2xl font-extrabold mb-2" style={{ color: "#0f172a" }}>Confirmez votre email</h1>
                <p className="text-sm" style={{ color: "#64748b" }}>
                  Un email de confirmation a ete envoye a{" "}
                  <strong style={{ color: "#0f172a" }}>{verifyEmail}</strong>.
                </p>
              </div>

              <div className="p-8">
                {/* Steps */}
                <div className="space-y-4 mb-8">
                  <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "#374151" }}>Etapes a suivre</h2>
                  {[
                    { icon: Inbox, step: "1", title: "Ouvrez votre boite email", desc: "Verifiez l'adresse avec laquelle vous venez de vous inscrire" },
                    { icon: Mail, step: "2", title: "Trouvez l'email de confirmation", desc: "De la part de noreply — verifiez aussi les spams" },
                    { icon: CheckCircle, step: "3", title: "Cliquez sur le lien de confirmation", desc: "Votre compte sera active — acces immediat au dashboard" },
                  ].map((s) => {
                    const Icon = s.icon;
                    return (
                      <div key={s.step} className="flex items-start gap-4 p-4 rounded-xl" style={{ backgroundColor: "#f8fafc" }}>
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 text-xs font-bold" style={{ color: "#fff" }}>
                          {s.step}
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>{s.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>{s.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Important tips */}
                <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: "#fef3c7", border: "1px solid #fde68a" }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="w-4 h-4" style={{ color: "#d97706" }} />
                    <span className="text-xs font-bold" style={{ color: "#92400e" }}>Le lien expire apres 24 heures</span>
                  </div>
                  <ul className="text-xs space-y-1" style={{ color: "#92400e" }}>
                    <li>&bull; Verifiez le dossier spam / courrier indesirable</li>
                    <li>&bull; Attendez 1-2 minutes si vous ne le recevez pas</li>
                    <li>&bull; Cliquez sur &laquo; Renvoyer &raquo; ci-dessous si besoin</li>
                  </ul>
                </div>

                {/* Resend section */}
                <div className="border-t border-gray-100 pt-6">
                  <p className="text-sm font-semibold mb-3" style={{ color: "#374151" }}>
                    Vous n&apos;avez pas recu l&apos;email ?
                  </p>

                  {resent ? (
                    <div className="p-4 rounded-xl flex items-center gap-3" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                      <CheckCircle className="w-5 h-5 shrink-0" style={{ color: "#16a34a" }} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: "#15803d" }}>Email renvoye avec succes !</p>
                        <p className="text-xs" style={{ color: "#16a34a" }}>Verifiez votre boite email dans quelques minutes.</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {verifyError && (
                        <div className="mb-3 p-3 rounded-lg text-xs flex items-center gap-2" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
                          <XCircle className="w-3.5 h-3.5 shrink-0" /> {verifyError}
                        </div>
                      )}
                      <button
                        onClick={handleResendVerification}
                        disabled={resending}
                        className="w-full py-3 border border-gray-200 hover:bg-gray-50 disabled:opacity-60 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 bg-white"
                        style={{ color: "#374151" }}
                      >
                        <RefreshCw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
                        {resending ? "Envoi en cours..." : "Renvoyer l'email de confirmation"}
                      </button>
                    </>
                  )}
                </div>

                {/* Security note */}
                <div className="mt-6 flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: "#f8fafc" }}>
                  <Shield className="w-4 h-4 shrink-0" style={{ color: "#94a3b8" }} />
                  <p className="text-xs" style={{ color: "#64748b" }}>
                    Cette etape protege votre compte. Seul vous avez acces a cette adresse email.
                  </p>
                </div>

                {/* Back to login */}
                <div className="mt-6 text-center">
                  <button
                    onClick={() => switchView("login")}
                    className="inline-flex items-center gap-1 text-sm font-medium hover:underline"
                    style={{ color: "#2563eb" }}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Retour a la connexion
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════
             VIEWS: LOGIN & SIGNUP
             ══════════════════════════════════════ */}
          {(view === "login" || view === "signup") && (
            <>
              {/* Tabs */}
              <div className="flex rounded-xl p-1 mb-6 border border-gray-200" style={{ backgroundColor: "#fff" }}>
                {([
                  { key: "login" as const, label: "Se connecter" },
                  { key: "signup" as const, label: "Creer un compte" },
                ] as const).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => switchView(t.key)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${view === t.key ? "shadow-sm" : "hover:text-gray-700"}`}
                    style={{
                      backgroundColor: view === t.key ? "#2563eb" : "transparent",
                      color: view === t.key ? "#fff" : "#64748b",
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ─── TAB: LOGIN ─── */}
              {view === "login" && (
                <>
                  <h1 className="text-xl font-extrabold mb-1" style={{ color: "#0f172a" }}>Bienvenue sur EcomPilot</h1>
                  <p className="text-sm mb-6" style={{ color: "#64748b" }}>Connectez-vous pour acceder a votre tableau de bord</p>

                  {/* Lockout banners */}
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
                          {lockout.attempts} tentatives echouees. Reessayez dans{" "}
                          <strong>{formatCountdown(lockout.countdown)}</strong>.
                        </p>
                        <div className="mt-2 h-1.5 rounded-full w-full overflow-hidden" style={{ backgroundColor: "#fed7aa" }}>
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{
                              width: `${(lockout.countdown / (lockout.attempts === 4 ? 30 : lockout.attempts === 5 ? 120 : 600)) * 100}%`,
                              backgroundColor: "#ea580c",
                            }}
                          />
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
                      <XCircle className="w-4 h-4 shrink-0" /> {loginError}
                    </div>
                  )}

                  {/* OAuth buttons */}
                  <div className="space-y-3 mb-5">
                    <button
                      onClick={handleGoogle}
                      disabled={isLoginDisabled || googleLoading}
                      className="w-full py-3 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 rounded-xl text-sm font-medium flex items-center justify-center gap-3 transition-colors bg-white"
                      style={{ color: "#374151" }}
                    >
                      <GoogleIcon />
                      {googleLoading ? "Connexion..." : "Continuer avec Google"}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs" style={{ color: "#94a3b8" }}>ou par email</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {/* Login form */}
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Adresse e-mail</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                        <input
                          type="email"
                          value={loginEmail}
                          onChange={(e) => { setLoginEmail(e.target.value); setLoginError(null); }}
                          placeholder="vous@exemple.com"
                          disabled={lockout.isPermanent}
                          required
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:bg-gray-100 bg-white"
                          style={{ color: "#0f172a" }}
                        />
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
                        <input
                          type={showLoginPwd ? "text" : "password"}
                          value={loginPassword}
                          onChange={(e) => { setLoginPassword(e.target.value); setLoginError(null); }}
                          placeholder="Votre mot de passe"
                          disabled={isLoginDisabled}
                          required
                          className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:bg-gray-100 bg-white"
                          style={{ color: "#0f172a" }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPwd((v) => !v)}
                          tabIndex={-1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:opacity-70"
                        >
                          {showLoginPwd ? (
                            <EyeOff className="w-4 h-4" style={{ color: "#94a3b8" }} />
                          ) : (
                            <Eye className="w-4 h-4" style={{ color: "#94a3b8" }} />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Attempt dots */}
                    {lockout.attempts > 0 && lockout.attempts < 7 && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="text-xs" style={{ color: "#94a3b8" }}>Tentatives :</span>
                        {Array.from({ length: 7 }).map((_, i) => (
                          <div
                            key={i}
                            className="w-2 h-2 rounded-full transition-all"
                            style={{
                              backgroundColor:
                                i < lockout.attempts
                                  ? lockout.attempts >= 6 ? "#dc2626" : lockout.attempts >= 4 ? "#ea580c" : "#f59e0b"
                                  : "#e2e8f0",
                            }}
                          />
                        ))}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoginDisabled}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
                      style={{ color: "#fff" }}
                    >
                      {loginLoading ? (
                        <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Connexion...</>
                      ) : lockout.isLocked ? (
                        <><Clock className="w-4 h-4" /> Bloque — {formatCountdown(lockout.countdown)}</>
                      ) : (
                        <>Se connecter <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>
                  </form>

                  {/* Footer badges */}
                  <div className="mt-5 flex items-center justify-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
                      <span className="text-xs" style={{ color: "#94a3b8" }}>Connexion securisee SSL</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
                      <span className="text-xs" style={{ color: "#94a3b8" }}>Verrouillage apres 7 echecs</span>
                    </div>
                  </div>

                  {/* Switch to signup text */}
                  <p className="mt-5 text-center text-sm" style={{ color: "#64748b" }}>
                    Pas encore de compte ?{" "}
                    <button onClick={() => switchView("signup")} className="font-semibold hover:underline" style={{ color: "#2563eb" }}>
                      Creer un compte gratuit
                    </button>
                  </p>
                </>
              )}

              {/* ─── TAB: SIGNUP ─── */}
              {view === "signup" && (
                <>
                  <h1 className="text-xl font-extrabold mb-1" style={{ color: "#0f172a" }}>Creez votre compte EcomPilot</h1>
                  <p className="text-sm mb-6" style={{ color: "#64748b" }}>
                    30 actions offertes — sans carte bancaire — acces immediat
                  </p>

                  {signupError && (
                    <div className="mb-4 p-3 rounded-lg flex items-center gap-2 text-sm" style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}>
                      <XCircle className="w-4 h-4 shrink-0" /> {signupError}
                    </div>
                  )}

                  {/* OAuth buttons */}
                  <div className="space-y-3 mb-5">
                    <button
                      onClick={handleGoogle}
                      disabled={signupLoading || googleLoading}
                      className="w-full py-3 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 rounded-xl text-sm font-medium flex items-center justify-center gap-3 transition-colors bg-white"
                      style={{ color: "#374151" }}
                    >
                      <GoogleIcon />
                      {googleLoading ? "Inscription..." : "S'inscrire avec Google"}
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-5">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs" style={{ color: "#94a3b8" }}>ou par email</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>

                  {/* Signup form */}
                  <form onSubmit={handleSignup} className="space-y-4">
                    {/* First name */}
                    <div>
                      <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Prenom</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                        <input
                          type="text"
                          value={signupFirstName}
                          onChange={(e) => setSignupFirstName(e.target.value)}
                          placeholder="Votre prenom"
                          required
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                          style={{ color: "#0f172a" }}
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Adresse e-mail</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                        <input
                          type="email"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          placeholder="vous@exemple.com"
                          required
                          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                          style={{ color: "#0f172a" }}
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Mot de passe</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                        <input
                          type={showSignupPwd ? "text" : "password"}
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          placeholder="Minimum 6 caracteres"
                          required
                          className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                          style={{ color: "#0f172a" }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPwd((v) => !v)}
                          tabIndex={-1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:opacity-70"
                        >
                          {showSignupPwd ? (
                            <EyeOff className="w-4 h-4" style={{ color: "#94a3b8" }} />
                          ) : (
                            <Eye className="w-4 h-4" style={{ color: "#94a3b8" }} />
                          )}
                        </button>
                      </div>
                      {/* Password strength */}
                      {pwdStrength && (
                        <div className="mt-2">
                          <div className="flex gap-1 mb-1">
                            {[1, 2, 3, 4].map((level) => (
                              <div
                                key={level}
                                className="h-1 flex-1 rounded-full transition-all"
                                style={{ backgroundColor: level <= pwdStrength.score ? pwdStrength.color : "#e2e8f0" }}
                              />
                            ))}
                          </div>
                          <p className="text-xs font-medium" style={{ color: pwdStrength.color }}>{pwdStrength.label}</p>
                        </div>
                      )}
                    </div>

                    {/* Confirm password */}
                    <div>
                      <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Confirmer le mot de passe</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                        <input
                          type={showSignupConfirm ? "text" : "password"}
                          value={signupConfirm}
                          onChange={(e) => setSignupConfirm(e.target.value)}
                          placeholder="Retapez votre mot de passe"
                          required
                          className={`w-full pl-10 pr-10 py-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 bg-white ${
                            passwordsMismatch ? "border-red-300 focus:border-red-400" :
                            passwordsMatch ? "border-green-300 focus:border-green-400" :
                            "border-gray-200 focus:border-blue-400"
                          }`}
                          style={{ color: "#0f172a" }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupConfirm((v) => !v)}
                          tabIndex={-1}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:opacity-70"
                        >
                          {showSignupConfirm ? (
                            <EyeOff className="w-4 h-4" style={{ color: "#94a3b8" }} />
                          ) : (
                            <Eye className="w-4 h-4" style={{ color: "#94a3b8" }} />
                          )}
                        </button>
                      </div>
                      {passwordsMatch && (
                        <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "#059669" }}>
                          <CheckCircle className="w-3 h-3" /> Les mots de passe correspondent
                        </p>
                      )}
                      {passwordsMismatch && (
                        <p className="text-xs mt-1 flex items-center gap-1" style={{ color: "#dc2626" }}>
                          <XCircle className="w-3 h-3" /> Les mots de passe ne correspondent pas
                        </p>
                      )}
                    </div>

                    {/* CGU checkbox */}
                    <div className="flex items-start gap-3 pt-1">
                      <input
                        type="checkbox"
                        id="accept-cgu"
                        checked={acceptCgu}
                        onChange={(e) => setAcceptCgu(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="accept-cgu" className="text-xs leading-relaxed" style={{ color: "#64748b" }}>
                        J&apos;accepte les{" "}
                        <Link href="/cgu" className="underline font-medium" style={{ color: "#2563eb" }}>conditions generales</Link>{" "}
                        et la{" "}
                        <Link href="/politique-confidentialite" className="underline font-medium" style={{ color: "#2563eb" }}>politique de confidentialite</Link>
                      </label>
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={signupLoading || !acceptCgu}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
                      style={{ color: "#fff" }}
                    >
                      {signupLoading ? (
                        <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Creation du compte...</>
                      ) : (
                        <>Creer mon compte gratuit <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>
                  </form>

                  {/* Free tier badge */}
                  <div className="mt-4 flex items-center justify-center gap-2 p-3 rounded-xl" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                    <Shield className="w-4 h-4" style={{ color: "#059669" }} />
                    <span className="text-xs font-semibold" style={{ color: "#166534" }}>Sans carte bancaire — 30 actions offertes pour demarrer</span>
                  </div>

                  {/* Footer badges */}
                  <div className="mt-4 flex items-center justify-center gap-4 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
                      <span className="text-xs" style={{ color: "#94a3b8" }}>SSL securise</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
                      <span className="text-xs" style={{ color: "#94a3b8" }}>RGPD compliant</span>
                    </div>
                  </div>

                  {/* Switch to login */}
                  <p className="mt-4 text-center text-sm" style={{ color: "#64748b" }}>
                    Deja un compte ?{" "}
                    <button onClick={() => switchView("login")} className="font-semibold hover:underline" style={{ color: "#2563eb" }}>
                      Se connecter
                    </button>
                  </p>
                </>
              )}

              {/* Back to home */}
              <div className="mt-6 text-center">
                <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium hover:underline" style={{ color: "#64748b" }}>
                  <ArrowLeft className="w-3.5 h-3.5" /> Retour a l&apos;accueil
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
