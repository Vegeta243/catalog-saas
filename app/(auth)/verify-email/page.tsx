"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Mail, Zap, CheckCircle, RefreshCw } from "lucide-react";

export default function VerifyEmailPage() {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setError(null);
    setResending(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({ type: "signup", email });
      if (error) {
        setError(error.message);
      } else {
        setResent(true);
      }
    } catch {
      setError("Une erreur est survenue. Réessayez.");
    }
    setResending(false);
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

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "#dbeafe" }}>
            <Mail className="w-8 h-8" style={{ color: "#2563eb" }} />
          </div>

          <h1 className="text-2xl font-extrabold mb-2" style={{ color: "#0f172a" }}>Vérifiez votre email</h1>
          <p className="text-sm mb-6" style={{ color: "#64748b" }}>
            Un email de vérification a été envoyé à votre adresse. Cliquez sur le lien dans l'email pour activer votre compte.
          </p>

          <div className="p-4 rounded-xl mb-6" style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0" }}>
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4" style={{ color: "#16a34a" }} />
              <span className="text-sm font-medium" style={{ color: "#15803d" }}>Conseils</span>
            </div>
            <ul className="text-xs text-left space-y-1 mt-2" style={{ color: "#166534" }}>
              <li>• Vérifiez votre dossier spam ou courrier indésirable</li>
              <li>• Le lien expire après 24 heures</li>
              <li>• Vérifiez que l'adresse email est correcte</li>
            </ul>
          </div>

          <div className="border-t border-gray-100 pt-6">
            <p className="text-sm font-medium mb-3" style={{ color: "#374151" }}>Vous n'avez pas reçu l'email ?</p>

            {resent ? (
              <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: "#d1fae5", color: "#059669" }}>
                Email renvoyé avec succès !
              </div>
            ) : (
              <form onSubmit={handleResend} className="space-y-3">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="Votre adresse email"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                  style={{ color: "#0f172a" }} required />

                {error && <p className="text-xs" style={{ color: "#dc2626" }}>{error}</p>}

                <button type="submit" disabled={resending}
                  className="w-full py-2.5 border border-gray-200 hover:bg-gray-50 disabled:opacity-60 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
                  style={{ color: "#374151" }}>
                  <RefreshCw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
                  {resending ? "Envoi en cours…" : "Renvoyer l'email"}
                </button>
              </form>
            )}
          </div>

          <div className="mt-6">
            <Link href="/login" className="text-sm font-medium hover:underline" style={{ color: "#2563eb" }}>
              ← Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
