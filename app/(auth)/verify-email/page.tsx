"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Mail, Zap, CheckCircle, RefreshCw, ArrowLeft, Clock, Shield, Inbox, Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  // Auto-detect when user confirms email and redirect
  useEffect(() => {
    const supabase = createClient();

    // Check if already authenticated
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email_confirmed_at) {
        setRedirecting(true);
        router.replace("/dashboard");
      }
    };
    checkAuth();

    // Listen for auth state changes (email confirmed)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, session: { user?: { id: string } } | null) => {
      if (_event === "SIGNED_IN" && session?.user) {
        setRedirecting(true);
        router.replace("/dashboard");
      }
    });

    // Poll every 3 seconds in case onAuthStateChange doesn't fire
    const interval = setInterval(async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email_confirmed_at) {
        setRedirecting(true);
        router.replace("/dashboard");
      }
    }, 3000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [router]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError(null);
    setResending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) { setError(error.message); } else { setResent(true); }
    } catch { setError("Une erreur est survenue. Réessayez."); }
    setResending(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#f8fafc" }}>
      <div className="w-full max-w-lg">
        {/* Redirecting overlay */}
        {redirecting && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/90">
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4" style={{ color: "#2563eb" }} />
              <p className="text-lg font-bold" style={{ color: "#0f172a" }}>Email confirmé !</p>
              <p className="text-sm mt-1" style={{ color: "#64748b" }}>Redirection vers votre espace…</p>
            </div>
          </div>
        )}

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Zap className="w-4 h-4" style={{ color: "#fff" }} />
            </div>
            <span className="text-xl font-bold" style={{ color: "#0f172a" }}>Ecom<span style={{ color: "#2563eb" }}>Pilot</span></span>
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Header */}
          <div className="p-8 text-center" style={{ background: "linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)" }}>
            <div className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg" style={{ backgroundColor: "#2563eb" }}>
              <Mail className="w-10 h-10" style={{ color: "#fff" }} />
            </div>
            <h1 className="text-2xl font-extrabold mb-2" style={{ color: "#0f172a" }}>Confirmez votre email</h1>
            <p className="text-sm" style={{ color: "#64748b" }}>
              Un email de confirmation a été envoyé à votre adresse. Cliquez sur le lien pour activer votre compte.
            </p>
          </div>

          <div className="p-8">
            {/* Steps */}
            <div className="space-y-4 mb-8">
              <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: "#374151" }}>Étapes à suivre</h2>
              {[
                { icon: Inbox, step: "1", title: "Ouvrez votre boîte email", desc: "Vérifiez l'adresse avec laquelle vous venez de vous inscrire" },
                { icon: Mail, step: "2", title: `Trouvez l'email "Confirmez votre inscription"`, desc: "De la part de noreply@ecompilot.fr — peut être dans les spams" },
                { icon: CheckCircle, step: "3", title: "Cliquez sur le lien de confirmation", desc: "Votre compte sera activé immédiatement — accès au dashboard" },
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

            {/* Tips */}
            <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: "#fef3c7", border: "1px solid #fde68a" }}>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4" style={{ color: "#d97706" }} />
                <span className="text-xs font-bold" style={{ color: "#92400e" }}>Le lien expire après 24 heures</span>
              </div>
              <ul className="text-xs space-y-1" style={{ color: "#92400e" }}>
                <li>• Vérifiez le dossier spam / courrier indésirable</li>
                <li>• Attendez quelques minutes si vous ne le recevez pas</li>
                <li>• Utilisez le formulaire ci-dessous si besoin d&apos;un renvoi</li>
              </ul>
            </div>

            {/* Resend form */}
            <div className="border-t border-gray-100 pt-6">
              <p className="text-sm font-semibold mb-3" style={{ color: "#374151" }}>
                Vous n&apos;avez pas reçu l&apos;email ? Renvoyez-le.
              </p>

              {resent ? (
                <div className="p-4 rounded-xl flex items-center gap-3" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                  <CheckCircle className="w-5 h-5 shrink-0" style={{ color: "#16a34a" }} />
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#15803d" }}>Email renvoyé avec succès !</p>
                    <p className="text-xs" style={{ color: "#16a34a" }}>Vérifiez votre boîte email dans quelques minutes.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleResend} className="space-y-3">
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    placeholder="Votre adresse email"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    style={{ color: "#0f172a" }} required
                  />
                  {error && <p className="text-xs flex items-center gap-1" style={{ color: "#dc2626" }}>⚠ {error}</p>}
                  <button type="submit" disabled={resending}
                    className="w-full py-3 border border-gray-200 hover:bg-gray-50 disabled:opacity-60 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    style={{ color: "#374151" }}>
                    <RefreshCw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
                    {resending ? "Envoi en cours…" : "Renvoyer l'email de confirmation"}
                  </button>
                </form>
              )}
            </div>

            {/* Security note */}
            <div className="mt-6 flex items-center gap-2 p-3 rounded-xl" style={{ backgroundColor: "#f8fafc" }}>
              <Shield className="w-4 h-4 shrink-0" style={{ color: "#94a3b8" }} />
              <p className="text-xs" style={{ color: "#64748b" }}>
                Cette étape protège votre compte. Seul vous avez accès à cette adresse email.
              </p>
            </div>

            <div className="mt-6 text-center">
              <Link href="/login" className="inline-flex items-center gap-1 text-sm font-medium hover:underline" style={{ color: "#2563eb" }}>
                <ArrowLeft className="w-3.5 h-3.5" /> Retour à la connexion
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
