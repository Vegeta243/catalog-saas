"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Mail, Lock, BarChart3, Zap, Sparkles, ShieldCheck, User,
  ArrowLeft, Shield,
} from "lucide-react";

const PLAN_LABELS: Record<string, { name: string; monthly: number }> = {
  starter: { name: "Starter", monthly: 39 },
  pro: { name: "Pro", monthly: 89 },
  scale: { name: "Scale", monthly: 179 },
};

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>}>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "free";
  const planInfo = PLAN_LABELS[plan];

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) { setError("Les mots de passe ne correspondent pas."); return; }
    if (password.length < 6) { setError("Le mot de passe doit contenir au moins 6 caract�res."); return; }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signUp({
        email, password,
        options: {
          data: { first_name: firstName, plan: plan || "free" },
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

  const handleAppleSignup = async () => {
    setAppleLoading(true);
    try {
      const supabase = createClient();
      await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
    } catch {
      setError("Erreur Apple Sign In. Réessayez.");
      setAppleLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* -- Left panel -- */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12" style={{ backgroundColor: "#0f172a" }}>
        <div>
          <Link href="/"><img src="/logo-white.svg" alt="EcomPilot Elite" className="h-9 w-auto object-contain" /></Link>
          <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>Le copilote de votre catalogue Shopify</p>
        </div>
        <div className="space-y-8">
          <h3 className="text-3xl font-extrabold leading-tight" style={{ color: "#fff" }}>
            D�marrez votre<br /><span style={{ color: "#60a5fa" }}>optimisation Shopify</span>
          </h3>
          <div className="space-y-5">
            {[
              { icon: BarChart3, title: "30 actions gratuites offertes", desc: "Testez la génération IA sans carte bancaire" },
              { icon: Sparkles, title: "Configuration en 2 min", desc: "Connectez votre boutique et commencez imm�diatement" },
              { icon: Zap, title: "Passez au plan sup�rieur quand vous voulez", desc: "Choisissez votre abonnement quand la limite est atteinte" },
              { icon: Shield, title: "Paiement s�curis� Stripe", desc: "Chiffrement TLS, PCI-DSS niveau 1, donn�es jamais stock�es" },
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
          {planInfo ? (
            <div className="p-4 rounded-xl border" style={{ borderColor: "rgba(96,165,250,0.3)", backgroundColor: "rgba(96,165,250,0.05)" }}>
              <p className="text-xs font-semibold mb-1" style={{ color: "#94a3b8" }}>Plan s�lectionn�</p>
              <p className="text-lg font-extrabold" style={{ color: "#fff" }}>{planInfo.name} � <span style={{ color: "#60a5fa" }}>{planInfo.monthly}�/mois</span></p>
              <p className="text-xs mt-1" style={{ color: "#64748b" }}>Paiement apr�s inscription, via Stripe</p>
            </div>
          ) : (
            <div className="p-4 rounded-xl border" style={{ borderColor: "rgba(96,165,250,0.3)", backgroundColor: "rgba(96,165,250,0.05)" }}>
              <p className="text-xs font-semibold mb-1" style={{ color: "#94a3b8" }}>Plan</p>
              <p className="text-lg font-extrabold" style={{ color: "#fff" }}>Gratuit <span style={{ color: "#60a5fa" }}>&bull; 30 actions</span></p>
              <p className="text-xs mt-1" style={{ color: "#64748b" }}>Aucune carte requise pour démarrer</p>
            </div>
          )}
        </div>
        <p className="text-xs" style={{ color: "#475569" }}>� 2026 EcomPilot � Tous droits r�serv�s</p>
      </div>

      {/* -- Right panel -- */}
      <div className="flex-1 flex items-center justify-center p-8" style={{ backgroundColor: "#f8fafc" }}>
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <Link href="/"><img src="/logo.svg" alt="EcomPilot Elite" className="h-10 w-auto object-contain" /></Link>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 border border-red-200 flex items-center gap-2" style={{ color: "#dc2626" }}>
              <span className="shrink-0">?</span> {error}
            </div>
          )}

          <h1 className="text-2xl font-extrabold mb-1" style={{ color: "#0f172a" }}>Cr�er votre compte</h1>
          <p className="text-sm mb-8" style={{ color: "#64748b" }}>
            {planInfo ? `Plan ${planInfo.name} � paiement apr�s inscription` : "Commencez avec 30 actions gratuites � aucune carte requise"}
          </p>

          <button onClick={handleGoogleSignup} disabled={googleLoading || appleLoading}
            className="w-full py-3 border border-gray-200 hover:bg-gray-50 disabled:opacity-60 rounded-xl text-sm font-medium flex items-center justify-center gap-3 transition-colors mb-3 bg-white"
            style={{ color: "#374151" }}>
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            {googleLoading ? "Inscription..." : "Continuer avec Google"}
          </button>

          <button onClick={handleAppleSignup} disabled={appleLoading || googleLoading}
            className="w-full py-3 border border-gray-200 hover:bg-gray-50 disabled:opacity-60 rounded-xl text-sm font-medium flex items-center justify-center gap-3 transition-colors mb-6 bg-white"
            style={{ color: "#374151" }}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.86-3.08.38-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.38C2.79 15.25 3.51 7.7 9.05 7.4c1.22.06 2.06.65 2.77.68.94-.19 1.84-.8 2.9-.68 1.24.16 2.17.73 2.79 1.76-2.5 1.54-1.87 5.17.77 6.25-.57 1.52-1.32 3.03-2.23 4.87zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
            {appleLoading ? "Inscription..." : "Continuer avec Apple"}
          </button>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-gray-200"/><span className="text-xs" style={{ color: "#94a3b8" }}>ou par email</span><div className="flex-1 h-px bg-gray-200"/>
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Pr�nom</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Votre pr�nom"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                  style={{ color: "#0f172a" }} required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Adresse e-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                  style={{ color: "#0f172a" }} required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimum 6 caract�res"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                  style={{ color: "#0f172a" }} required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Confirmer le mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="��������"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
                  style={{ color: "#0f172a" }} required />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 hover:-translate-y-0.5"
              style={{ color: "#fff" }}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                  Cr�ation du compte�
                </span>
              ) : (
                <><ShieldCheck className="w-4 h-4" /> Cr�er mon compte gratuit</>
              )}
            </button>
          </form>

          <p className="mt-4 text-xs text-center" style={{ color: "#94a3b8" }}>
            En cr�ant un compte, vous acceptez nos <Link href="/cgu" className="underline">CGU</Link> et notre <Link href="/politique-confidentialite" className="underline">politique de confidentialit�</Link>.
          </p>
          <p className="mt-4 text-center text-sm" style={{ color: "#64748b" }}>
            D�j� un compte ? <Link href="/login" className="font-medium hover:underline" style={{ color: "#2563eb" }}>Se connecter</Link>
          </p>
          <div className="mt-4 text-center">
            <Link href="/" className="inline-flex items-center gap-1 text-sm font-medium hover:underline" style={{ color: "#64748b" }}>
              <ArrowLeft className="w-3.5 h-3.5" /> Retour � l&apos;accueil
            </Link>
          </div>
          <div className="mt-4 flex items-center justify-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
            <span className="text-xs" style={{ color: "#94a3b8" }}>Connexion sécurisée SSL</span>
          </div>
        </div>
      </div>
    </div>
  );
}
