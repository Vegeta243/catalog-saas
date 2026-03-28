"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, ArrowRight, Shield, Zap, Check, HelpCircle } from "lucide-react";

export default function ConnectShopifyPage() {
  const [shop, setShop] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const cleaned = shop.trim().toLowerCase().replace(/https?:\/\//, "").replace(/\/$/, "");
    if (!cleaned) { setError("Entrez votre domaine Shopify."); return; }
    const domain = cleaned.includes(".") ? cleaned : `${cleaned}.myshopify.com`;
    if (!/^[a-z0-9][a-z0-9\-]*\.myshopify\.com$/.test(domain)) {
      setError("Format invalide. Exemple : ma-boutique.myshopify.com");
      return;
    }
    setLoading(true);
    router.push(`/api/auth/shopify?shop=${encodeURIComponent(domain)}`);
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-gradient-to-br from-green-500 to-emerald-600">
          <ShoppingBag className="w-8 h-8" style={{ color: "#fff" }} />
        </div>
        <h1 className="text-2xl font-extrabold mb-2" style={{ color: "var(--text-primary)" }}>Connecter votre boutique Shopify</h1>
        <p className="text-base" style={{ color: "var(--text-tertiary)" }}>
          Autorisez EcomPilot à accéder à votre catalogue pour l&apos;optimiser avec l&apos;IA.
        </p>
      </div>

      {/* Form */}
      <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
        <form onSubmit={handleConnect} className="space-y-5">
          <div>
            <label className="text-sm font-semibold block mb-1.5" style={{ color: "var(--text-secondary)" }}>
              Domaine de votre boutique
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <ShoppingBag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
                <input
                  type="text"
                  value={shop}
                  onChange={(e) => { setShop(e.target.value); setError(""); }}
                  placeholder="ma-boutique.myshopify.com"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-400"
                  style={{ color: "var(--text-primary)" }}
                  autoFocus
                />
              </div>
            </div>
            {error && <p className="mt-1.5 text-xs" style={{ color: "#dc2626" }}>{error}</p>}
            <p className="mt-1.5 text-xs" style={{ color: "var(--text-tertiary)" }}>
              Exemple : ma-boutique.myshopify.com ou simplement ma-boutique
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || !shop.trim()}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all"
            style={{ color: "#fff" }}
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Redirection vers Shopify…</>
            ) : (
              <>Connecter ma boutique <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </form>
      </div>

      {/* Trust section */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { icon: Shield, color: "#059669", title: "OAuth sécurisé", desc: "Aucun mot de passe Shopify n'est partagé. Autorisation officielle Shopify." },
          { icon: Zap, color: "#2563eb", title: "Accès en lecture/écriture", desc: "EcomPilot peut lire et modifier vos produits, prix et inventaire." },
          { icon: Check, color: "#7c3aed", title: "Révocable à tout moment", desc: "Désinstallez l'app depuis votre admin Shopify pour révoquer l'accès." },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${item.color}15` }}>
                <Icon className="w-4 h-4" style={{ color: item.color }} />
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: "var(--text-primary)" }}>{item.title}</p>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-tertiary)" }}>{item.desc}</p>
            </div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "#2563eb" }} />
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: "#93c5fd" }}>Comment trouver mon domaine Shopify ?</p>
            <p className="text-xs leading-relaxed" style={{ color: "#3b82f6" }}>
              Connectez-vous à votre admin Shopify. Dans l&apos;URL de votre navigateur, vous verrez{" "}
              <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">https://admin.shopify.com/store/<strong>votre-boutique</strong></code>.
              &ldquo;votre-boutique&rdquo; est votre nom de boutique. Votre domaine est donc{" "}
              <code className="font-mono bg-blue-100 px-1 py-0.5 rounded">votre-boutique.myshopify.com</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
