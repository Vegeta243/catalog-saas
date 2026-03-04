"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Mail, ArrowLeft, Zap, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setError(error.message);
      } else {
        setSent(true);
      }
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "#f8fafc" }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Zap className="w-4 h-4" style={{ color: "#fff" }} />
            </div>
            <span className="text-xl font-bold" style={{ color: "#0f172a" }}>Ecom<span style={{ color: "#2563eb" }}>Pilot</span></span>
          </Link>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "#d1fae5" }}>
                <CheckCircle className="w-8 h-8" style={{ color: "#059669" }} />
              </div>
              <h1 className="text-2xl font-extrabold mb-2" style={{ color: "#0f172a" }}>Email envoyé !</h1>
              <p className="text-sm mb-6" style={{ color: "#64748b" }}>
                Un lien de réinitialisation a été envoyé à <strong style={{ color: "#0f172a" }}>{email}</strong>. Vérifiez votre boîte mail (et vos spams).
              </p>
              <Link href="/login" className="text-sm font-medium hover:underline" style={{ color: "#2563eb" }}>
                ← Retour à la connexion
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-extrabold mb-2" style={{ color: "#0f172a" }}>Mot de passe oublié ?</h1>
              <p className="text-sm mb-6" style={{ color: "#64748b" }}>
                Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
              </p>

              {error && (
                <div className="mb-4 p-3 rounded-lg text-sm bg-red-50 border border-red-200" style={{ color: "#dc2626" }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium block mb-1.5" style={{ color: "#374151" }}>Adresse e-mail</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#94a3b8" }} />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vous@exemple.com"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                      style={{ color: "#0f172a" }}
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-xl text-sm font-semibold transition-colors"
                  style={{ color: "#fff" }}
                >
                  {loading ? "Envoi en cours…" : "Envoyer le lien de réinitialisation"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link href="/login" className="inline-flex items-center gap-1 text-sm font-medium hover:underline" style={{ color: "#2563eb" }}>
                  <ArrowLeft className="w-3.5 h-3.5" /> Retour à la connexion
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
