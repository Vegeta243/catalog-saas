"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Mail, Lock, ArrowRight, BarChart3, Zap, Sparkles, ShieldCheck } from "lucide-react";

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full" /></div>}>
      <SignupContent />
    </Suspense>
  );
}

function SignupContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan");

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel — Marketing */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12" style={{ backgroundColor: "#0f172a" }}>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "#fff" }}>
            Ecom<span style={{ color: "#60a5fa" }}>Pilot</span>
          </h2>
          <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>Le copilote de votre catalogue Shopify</p>
        </div>

        <div className="space-y-8">
          <h3 className="text-3xl font-extrabold leading-tight" style={{ color: "#fff" }}>
            Rejoignez <span style={{ color: "#60a5fa" }}>+2 000</span><br />
            e-commerçants satisfaits
          </h3>
          <div className="space-y-5">
            {[
              { icon: BarChart3, title: "7 jours d'essai gratuit", desc: "Testez toutes les fonctionnalités sans carte bancaire" },
              { icon: Sparkles, title: "Configuration en 2 min", desc: "Connectez votre boutique Shopify et commencez immédiatement" },
              { icon: Zap, title: "+50% de productivité", desc: "Nos utilisateurs économisent en moyenne 12h par semaine" },
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

        <p className="text-xs" style={{ color: "#475569" }}>© 2026 EcomPilot — Tous droits réservés</p>
      </div>

      {/* Right panel — Form */}
      <div className="flex-1 flex items-center justify-center p-8" style={{ backgroundColor: "#f8fafc" }}>
        <div className="w-full max-w-md">
          <div className="lg:hidden mb-8">
            <h2 className="text-xl font-bold" style={{ color: "#0f172a" }}>Ecom<span style={{ color: "#2563eb" }}>Pilot</span></h2>
          </div>

          <h1 className="text-2xl font-extrabold mb-2" style={{ color: "#0f172a" }}>Créer votre compte</h1>
          <p className="text-sm mb-8" style={{ color: "#64748b" }}>
            {plan ? `Plan ${plan.charAt(0).toUpperCase() + plan.slice(1)} sélectionné — 7 jours gratuits` : "Commencez avec 7 jours d'essai gratuit"}
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 border border-red-200" style={{ color: "#dc2626" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Adresse e-mail</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  style={{ color: "#0f172a" }} required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  style={{ color: "#0f172a" }} required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Confirmer le mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  style={{ color: "#0f172a" }} required />
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              style={{ color: "#fff" }}>
              {loading ? "Création du compte…" : (
                <>Créer mon compte <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: "#64748b" }}>
            Déjà un compte ?{" "}
            <Link href="/login" className="font-medium hover:underline" style={{ color: "#2563eb" }}>Se connecter</Link>
          </p>

          <div className="mt-8 flex items-center justify-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
            <span className="text-xs" style={{ color: "#94a3b8" }}>Connexion sécurisée SSL — Aucune carte bancaire requise</span>
          </div>
        </div>
      </div>
    </div>
  );
}
