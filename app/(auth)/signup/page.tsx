"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Mail, Lock, ArrowRight, BarChart3, Zap, Sparkles, ShieldCheck, User,
  ArrowLeft, CreditCard, Calendar, Check, AlertTriangle,
} from "lucide-react";

const PLAN_LABELS: Record<string, { name: string; monthly: number }> = {
  starter: { name: "Starter", monthly: 49 },
  pro: { name: "Pro", monthly: 89 },
  scale: { name: "Scale", monthly: 129 },
};

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>}>
      <SignupContent />
    </Suspense>
  );
}

function formatCardNumber(value: string) {
  return value.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
}
function formatExpiry(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 4);
  return d.length >= 3 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

function SignupContent() {
  const [step, setStep] = useState<1 | 2>(1);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [cardName, setCardName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "starter";
  const planInfo = PLAN_LABELS[plan] || PLAN_LABELS.starter;

  const trialEndDate = new Date();
  trialEndDate.setDate(trialEndDate.getDate() + 7);
  const trialEndStr = trialEndDate.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

  const handleStep1 = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) { setError("Les mots de passe ne correspondent pas."); return; }
    if (password.length < 6) { setError("Le mot de passe doit contenir au moins 6 caractères."); return; }
    setStep(2);
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const raw = cardNumber.replace(/\s/g, "");
    if (raw.length < 16) { setError("Numéro de carte invalide."); return; }
    if (cardExpiry.length < 5) { setError("Date d'\''expiration invalide (MM/AA)."); return; }
    if (cardCvc.length < 3) { setError("Code de sécurité invalide."); return; }
    if (!cardName.trim()) { setError("Nom du titulaire requis."); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { first_name: firstName, plan },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) { setError(authError.message); setLoading(false); return; }
      router.push("/verify-email");
    } catch (err: unknown) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
    } catch {
      setError("Erreur Google OAuth. Réessayez.");
      setGoogleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12" style={{ backgroundColor: "#0f172a" }}>
        <div>
          <Link href="/"><h2 className="text-2xl font-bold" style={{ color: "#fff" }}>Ecom<span style={{ color: "#60a5fa" }}>Pilot</span></h2></Link>
          <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>Le copilote de votre catalogue Shopify</p>
        </div>
        <div className="space-y-8">
          <h3 className="text-3xl font-extrabold leading-tight" style={{ color: "#fff" }}>
            Démarrez votre<br /><span style={{ color: "#60a5fa" }}>optimisation Shopify</span>
          </h3>
          <div className="space-y-5">
            {[
              { icon: BarChart3, title: "7 jours d'\''essai gratuit", desc: "Aucun débit avant la fin de la période d'\''essai" },
              { icon: Sparkles, title: "Configuration en 2 min", desc: "Connectez votre boutique et commencez immédiatement" },
              { icon: Zap, title: "Annulation facile", desc: "Résiliez en 1 clic avant le 7ème jour — aucun frais" },
            ].map((f) => { const Icon = f.icon; return (
              <div key={f.title} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "rgba(96,165,250,0.15)" }}>
                  <Icon className="w-5 h-5" style={{ color: "#60a5fa" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#fff" }}>{f.title}</p>
                  <p className="text-xs" style={{ color: "#94a3b8" }}>{f.desc}</p>
                </div>
              </div>
            );})}
          </div>
          <div className="p-4 rounded-xl border" style={{ borderColor: "rgba(96,165,250,0.3)", backgroundColor: "rgba(96,165,250,0.05)" }}>
            <p className="text-xs font-semibold mb-1" style={{ color: "#94a3b8" }}>Plan sélectionné</p>
            <p className="text-lg font-extrabold" style={{ color: "#fff" }}>{planInfo.name} — <span style={{ color: "#60a5fa" }}>{planInfo.monthly}€/mois</span></p>
            <p className="text-xs mt-1" style={{ color: "#64748b" }}>Premier débit le {trialEndStr} si non résilié avant</p>
          </div>
        </div>
        <p className="text-xs" style={{ color: "#475569" }}>© 2026 EcomPilot — Tous droits réservés</p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-8" style={{ backgroundColor: "#f8fafc" }}>
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link href="/"><h2 className="text-xl font-bold" style={{ color: "#0f172a" }}>Ecom<span style={{ color: "#2563eb" }}>Pilot</span></h2></Link>
          </div>

          {/* Steps */}
          <div className="flex items-center gap-3 mb-8">
            <div className={`flex items-center gap-2 text-sm font-semibold ${step === 1 ? "text-blue-600" : "text-emerald-600"}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step > 1 ? "bg-emerald-600 text-white" : "bg-blue-600 text-white"}`}>
                {step > 1 ? <Check className="w-3 h-3" /> : "1"}
              </span>
              Votre compte
            </div>
            <div className="flex-1 h-0.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: step === 2 ? "100%" : "0%" }} />
            </div>
            <div className={`flex items-center gap-2 text-sm font-semibold ${step === 2 ? "text-blue-600" : "text-gray-400"}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-500"}`}>2</span>
              Paiement
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 border border-red-200" style={{ color: "#dc2626" }}>{error}</div>
          )}

          {/* ═══ ÉTAPE 1 ═══ */}
          {step === 1 && (
            <>
              <h1 className="text-2xl font-extrabold mb-2" style={{ color: "#0f172a" }}>Créer votre compte</h1>
              <p className="text-sm mb-8" style={{ color: "#64748b" }}>Plan {planInfo.name} — 7 jours d&apos;essai gratuit</p>

              <button onClick={handleGoogleSignup} disabled={googleLoading}
                className="w-full py-3 border border-gray-200 hover:bg-gray-50 disabled:opacity-60 rounded-xl text-sm font-medium flex items-center justify-center gap-3 transition-colors mb-6"
                style={{ color: "#374151" }}>
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                {googleLoading ? "Inscription…" : "Continuer avec Google"}
              </button>

              <div className="flex items-center gap-3 mb-6">
                <div className="flex-1 h-px bg-gray-200"/><span className="text-xs" style={{ color: "#94a3b8" }}>ou par email</span><div className="flex-1 h-px bg-gray-200"/>
              </div>

              <form onSubmit={handleStep1} className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Prénom</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Votre prénom"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      style={{ color: "#0f172a" }} required />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Adresse e-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      style={{ color: "#0f172a" }} required />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 caractères"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      style={{ color: "#0f172a" }} required />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Confirmer le mot de passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                    <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      style={{ color: "#0f172a" }} required />
                  </div>
                </div>
                <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors" style={{ color: "#fff" }}>
                  Continuer vers le paiement <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <p className="mt-4 text-xs text-center" style={{ color: "#94a3b8" }}>
                En créant un compte, vous acceptez nos <Link href="/cgu" className="underline">CGU</Link> et notre <Link href="/politique-confidentialite" className="underline">politique de confidentialité</Link>.
              </p>
              <p className="mt-4 text-center text-sm" style={{ color: "#64748b" }}>
                Déjà un compte ? <Link href="/login" className="font-medium hover:underline" style={{ color: "#2563eb" }}>Se connecter</Link>
              </p>
              <div className="mt-4 text-center">
                <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium hover:underline" style={{ color: "#64748b" }}>
                  <ArrowLeft className="w-3.5 h-3.5" /> Retour à l&apos;accueil
                </Link>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
                <span className="text-xs" style={{ color: "#94a3b8" }}>Connexion sécurisée SSL</span>
              </div>
            </>
          )}

          {/* ═══ ÉTAPE 2 ═══ */}
          {step === 2 && (
            <>
              <h1 className="text-2xl font-extrabold mb-2" style={{ color: "#0f172a" }}>Informations de paiement</h1>
              <p className="text-sm mb-6" style={{ color: "#64748b" }}>
                Votre carte est enregistrée de manière sécurisée. <strong>Aucun débit avant le {trialEndStr}.</strong>
              </p>

              {/* Récap plan */}
              <div className="p-4 rounded-xl mb-4 border border-blue-100" style={{ backgroundColor: "#eff6ff" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold" style={{ color: "#1e40af" }}>Plan {planInfo.name} — Essai gratuit 7 jours</p>
                    <p className="text-xs mt-0.5" style={{ color: "#3b82f6" }}>Puis {planInfo.monthly}€/mois — Annulable à tout moment</p>
                  </div>
                  <span className="text-xl font-extrabold" style={{ color: "#1e40af" }}>0€</span>
                </div>
                <p className="text-xs mt-2" style={{ color: "#6b7280" }}>Premier prélèvement le {trialEndStr} si vous ne résiliez pas avant.</p>
              </div>

              {/* Avertissement démo */}
              <div className="flex items-start gap-2 p-3 rounded-lg border mb-5" style={{ backgroundColor: "#fffbeb", borderColor: "#fde68a" }}>
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#d97706" }} />
                <p className="text-xs" style={{ color: "#92400e" }}>
                  <strong>Mode démonstration</strong> — Aucun paiement réel ne sera effectué. En production, les données de carte transitent uniquement via Stripe (PCI-DSS niveau 1) et ne sont jamais stockées sur nos serveurs.
                </p>
              </div>

              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Nom sur la carte</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                    <input type="text" value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="Jean Dupont"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      style={{ color: "#0f172a" }} required />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Numéro de carte</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                    <input type="text" inputMode="numeric" value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="1234 5678 9012 3456" maxLength={19}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-mono tracking-wider"
                      style={{ color: "#0f172a" }} required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Expiration</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                      <input type="text" inputMode="numeric" value={cardExpiry}
                        onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/AA" maxLength={5}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-mono"
                        style={{ color: "#0f172a" }} required />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>CVC</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                      <input type="text" inputMode="numeric" value={cardCvc}
                        onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="123" maxLength={4}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 font-mono"
                        style={{ color: "#0f172a" }} required />
                    </div>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
                  style={{ color: "#fff" }}>
                  {loading ? "Création du compte…" : <><ShieldCheck className="w-4 h-4" /> Démarrer mon essai gratuit de 7 jours</>}
                </button>
              </form>

              <button onClick={() => { setStep(1); setError(null); }}
                className="mt-4 w-full flex items-center justify-center gap-1 text-sm font-medium hover:underline"
                style={{ color: "#64748b" }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Étape précédente
              </button>

              <div className="mt-4 flex items-center justify-center gap-2">
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
                <span className="text-xs" style={{ color: "#94a3b8" }}>Paiement sécurisé — Données chiffrées TLS</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
