"use client";

import { useState } from "react";
import {
  Store, Lock, ArrowRight, CheckCircle2, ShieldCheck, Zap, RefreshCw, Package, ExternalLink, AlertTriangle,
} from "lucide-react";

export default function ConnectShopify() {
  const [shopDomain, setShopDomain] = useState("");
  const [error, setError] = useState("");

  // Normalize shop domain input → always ends with .myshopify.com
  const normalizeDomain = (input: string) => {
    let domain = input.trim().toLowerCase();
    // Remove https:// or http://
    domain = domain.replace(/^https?:\/\//, "");
    // Remove trailing slashes
    domain = domain.replace(/\/+$/, "");
    // Remove any path components
    domain = domain.split("/")[0];
    // Append .myshopify.com if missing
    if (!domain.endsWith(".myshopify.com")) {
      // Remove any .myshopify.com variant to avoid double
      domain = domain.replace(/\.myshopify\.com$/, "");
      domain = `${domain}.myshopify.com`;
    }
    return domain;
  };

  const handleConnect = () => {
    setError("");
    if (!shopDomain.trim()) {
      setError("Veuillez entrer l'URL de votre boutique.");
      return;
    }
    const domain = normalizeDomain(shopDomain);
    // Validate format: subdomain.myshopify.com
    if (!/^[a-z0-9][a-z0-9\-]*\.myshopify\.com$/.test(domain)) {
      setError("Format invalide. Exemple : ma-boutique.myshopify.com");
      return;
    }
    // Redirect to Shopify OAuth via our backend
    window.location.href = `/api/auth/shopify?shop=${domain}`;
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-4 bg-gradient-to-br from-green-400 to-emerald-600">
          <Store className="w-8 h-8" style={{ color: "#fff" }} />
        </div>
        <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>Connecter votre boutique Shopify</h1>
        <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
          Autorisez EcomPilot à accéder à votre boutique via Shopify OAuth pour synchroniser vos produits.
        </p>
      </div>

      {/* Main card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="mb-6">
          <label className="text-sm font-semibold mb-2 block" style={{ color: "var(--text-secondary)" }}>
            URL de votre boutique Shopify
          </label>
          <div className="relative">
            <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
            <input
              type="text"
              placeholder="ma-boutique.myshopify.com"
              value={shopDomain}
              onChange={(e) => { setShopDomain(e.target.value); setError(""); }}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition-colors"
              style={{ color: "var(--text-primary)" }}
              onKeyDown={(e) => e.key === "Enter" && handleConnect()}
            />
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--text-tertiary)" }}>
            Entrez uniquement le sous-domaine, ex: <strong>ma-boutique</strong> ou <strong>ma-boutique.myshopify.com</strong>
          </p>
          {error && (
            <div className="flex items-center gap-2 mt-2 p-2.5 rounded-lg bg-red-50 border border-red-100">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" style={{ color: "#ef4444" }} />
              <p className="text-xs font-medium" style={{ color: "#dc2626" }}>{error}</p>
            </div>
          )}
        </div>

        <button
          onClick={handleConnect}
          disabled={!shopDomain.trim()}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm hover:shadow-emerald-500/20 hover:shadow-lg"
          style={{ color: "#fff" }}
        >
          <Store className="w-4 h-4" />
          Connecter ma boutique Shopify
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="mt-4 flex items-center justify-center gap-2">
          <Lock className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>Connexion sécurisée via OAuth 2.0 officiel Shopify</p>
        </div>
      </div>

      {/* Features grid */}
      <div className="mt-6 grid grid-cols-2 gap-3">
        {[
          { icon: Package, title: "Sync automatique", desc: "Vos produits synchronisés en temps réel" },
          { icon: RefreshCw, title: "Mise à jour instantanée", desc: "Les modifications se propagent immédiatement" },
          { icon: Zap, title: "Édition en masse", desc: "Modifiez des centaines de produits d'un coup" },
          { icon: ShieldCheck, title: "100% sécurisé", desc: "Token chiffré, accès révocable à tout moment" },
        ].map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="flex items-start gap-3 p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-50 flex-shrink-0">
                <Icon className="w-4 h-4" style={{ color: "#059669" }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{f.title}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-tertiary)" }}>{f.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Help section */}
      <div className="mt-6 p-4 rounded-xl border border-blue-100 bg-blue-50">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#2563eb" }} />
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: "#93c5fd" }}>Comment ça marche ?</p>
            <ol className="text-xs space-y-1" style={{ color: "#3b82f6" }}>
              <li>1. Entrez le nom de votre boutique ci-dessus</li>
              <li>2. Vous serez redirigé vers Shopify pour autoriser l&apos;accès</li>
              <li>3. Une fois autorisé, vos produits se synchronisent automatiquement</li>
            </ol>
            <a
              href="https://help.shopify.com/fr/manual/apps"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-xs font-medium underline"
              style={{ color: "#2563eb" }}
            >
              <ExternalLink className="w-3 h-3" />
              En savoir plus sur les apps Shopify
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
