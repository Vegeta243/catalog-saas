"use client";

import { useState } from "react";
import {
  CreditCard, CheckCircle2, AlertTriangle, ExternalLink, Copy, Loader2,
  Key, Webhook, Package, Store, ChevronDown, ChevronUp, Terminal
} from "lucide-react";

type SetupStatus = "idle" | "loading" | "success" | "error";

interface PriceIds {
  starter: { monthly: string; yearly: string };
  pro: { monthly: string; yearly: string };
  agency: { monthly: string; yearly: string };
}

export default function StripeSetupPage() {
  const [stripeKeyConfigured] = useState(() => {
    // This check runs client-side — just UI hint
    return false;
  });
  const [autoSetupStatus, setAutoSetupStatus] = useState<SetupStatus>("idle");
  const [priceIds, setPriceIds] = useState<PriceIds | null>(null);
  const [envSnippet, setEnvSnippet] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [openSection, setOpenSection] = useState<number | null>(0);

  const runAutoSetup = async () => {
    setAutoSetupStatus("loading");
    try {
      const res = await fetch("/api/stripe/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const data = await res.json();
      if (data.success) {
        setAutoSetupStatus("success");
        setPriceIds(data.prices);
        setEnvSnippet(data.env_snippet);
      } else {
        setAutoSetupStatus("error");
      }
    } catch {
      setAutoSetupStatus("error");
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const sections = [
    {
      icon: Key,
      title: "1. Clés API Stripe",
      color: "#2563eb",
      content: (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "#64748b" }}>
            Récupérez vos clés API Stripe (mode test d&apos;abord, puis production).
          </p>
          <ol className="space-y-3">
            {[
              <>Allez sur <a href="https://dashboard.stripe.com/test/apikeys" target="_blank" rel="noopener noreferrer" className="underline font-medium" style={{ color: "#2563eb" }}>dashboard.stripe.com/test/apikeys <ExternalLink className="inline w-3 h-3" /></a></>,
              <>Copiez la <strong>Clé publiable</strong> (commence par <code className="px-1 py-0.5 rounded bg-gray-100 text-xs">pk_test_</code>)</>,
              <>Copiez la <strong>Clé secrète</strong> (commence par <code className="px-1 py-0.5 rounded bg-gray-100 text-xs">sk_test_</code>)</>,
              <>Ajoutez-les dans <code className="px-1 py-0.5 rounded bg-gray-100 text-xs">.env.local</code> :</>,
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "#374151" }}>
                <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "#dbeafe", color: "#1d4ed8" }}>{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-900">
              <span className="text-xs font-mono" style={{ color: "#94a3b8" }}>.env.local</span>
              <button onClick={() => copy("STRIPE_SECRET_KEY=sk_test_...\nNEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...")} className="text-xs" style={{ color: "#60a5fa" }}>
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
            <pre className="px-4 py-3 text-xs overflow-x-auto" style={{ backgroundColor: "#0f172a", color: "#e2e8f0" }}>
{`STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE`}
            </pre>
          </div>
        </div>
      ),
    },
    {
      icon: Package,
      title: "2. Créer les produits & prix Stripe",
      color: "#059669",
      content: (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "#64748b" }}>
            Créez automatiquement tous les produits et prix EcomPilot (Starter/Pro/Agency × Mensuel/Annuel) en un clic.
          </p>
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50">
            <p className="text-xs font-medium" style={{ color: "#92400e" }}>
              ⚠️ Assurez-vous d&apos;avoir configuré <code>STRIPE_SECRET_KEY</code> dans .env.local et redémarré le serveur avant de continuer.
            </p>
          </div>
          <button
            onClick={runAutoSetup}
            disabled={autoSetupStatus === "loading"}
            className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-70"
            style={{ backgroundColor: "#059669", color: "#fff" }}
          >
            {autoSetupStatus === "loading" ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Création en cours…</>
            ) : autoSetupStatus === "success" ? (
              <><CheckCircle2 className="w-4 h-4" /> Produits créés avec succès !</>
            ) : (
              <><Package className="w-4 h-4" /> Créer automatiquement les produits Stripe</>
            )}
          </button>
          {autoSetupStatus === "error" && (
            <div className="flex items-start gap-2 p-3 rounded-xl border border-red-200 bg-red-50">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
              <p className="text-xs" style={{ color: "#dc2626" }}>
                Erreur — Vérifiez que STRIPE_SECRET_KEY est correctement configurée et que le serveur est redémarré.
              </p>
            </div>
          )}
          {autoSetupStatus === "success" && priceIds && envSnippet && (
            <div className="space-y-3">
              <p className="text-sm font-medium" style={{ color: "#065f46" }}>
                ✅ Copiez ces Price IDs dans votre .env.local :
              </p>
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <div className="flex items-center justify-between px-4 py-2 bg-gray-900">
                  <span className="text-xs font-mono" style={{ color: "#94a3b8" }}>.env.local — Price IDs</span>
                  <button onClick={() => copy(envSnippet)} className="flex items-center gap-1 text-xs" style={{ color: copied ? "#4ade80" : "#60a5fa" }}>
                    <Copy className="w-3.5 h-3.5" />
                    {copied ? "Copié !" : "Copier"}
                  </button>
                </div>
                <pre className="px-4 py-3 text-xs overflow-x-auto" style={{ backgroundColor: "#0f172a", color: "#e2e8f0" }}>
                  {envSnippet}
                </pre>
              </div>
              <p className="text-xs" style={{ color: "#64748b" }}>
                Après avoir mis à jour .env.local, redémarrez le serveur avec <code className="px-1 py-0.5 rounded bg-gray-100">pnpm dev</code>.
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      icon: Webhook,
      title: "3. Configurer le Webhook Stripe",
      color: "#7c3aed",
      content: (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "#64748b" }}>
            Le webhook permet de synchroniser les abonnements Stripe avec Supabase en temps réel.
          </p>

          <div>
            <p className="text-sm font-semibold mb-2" style={{ color: "#374151" }}>En développement (Stripe CLI) :</p>
            <div className="rounded-xl overflow-hidden border border-gray-200">
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-900">
                <Terminal className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
                <span className="text-xs font-mono" style={{ color: "#94a3b8" }}>Terminal</span>
              </div>
              <pre className="px-4 py-3 text-xs overflow-x-auto whitespace-pre-wrap" style={{ backgroundColor: "#0f172a", color: "#e2e8f0" }}>
{`# Installez Stripe CLI : https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook`}
              </pre>
            </div>
            <p className="text-xs mt-2" style={{ color: "#64748b" }}>
              Stripe CLI affichera votre <strong>STRIPE_WEBHOOK_SECRET</strong> (commence par <code className="px-1 py-0.5 rounded bg-gray-100">whsec_</code>). Ajoutez-le dans .env.local.
            </p>
          </div>

          <div>
            <p className="text-sm font-semibold mb-2" style={{ color: "#374151" }}>En production :</p>
            <ol className="space-y-2">
              {[
                <>Allez sur <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer" className="underline font-medium" style={{ color: "#7c3aed" }}>dashboard.stripe.com/webhooks</a></>,
                <>Cliquez <strong>+ Ajouter un endpoint</strong></>,
                <>URL : <code className="px-1 py-0.5 rounded bg-gray-100 text-xs">https://app.ecompilot.fr/api/stripe/webhook</code></>,
                <>Événements à écouter : <code className="px-1 py-0.5 rounded bg-gray-100 text-xs">checkout.session.completed</code>, <code className="px-1 py-0.5 rounded bg-gray-100 text-xs">customer.subscription.*</code>, <code className="px-1 py-0.5 rounded bg-gray-100 text-xs">invoice.*</code></>,
                <>Copiez le <strong>Signing Secret</strong> dans <code className="px-1 py-0.5 rounded bg-gray-100 text-xs">STRIPE_WEBHOOK_SECRET</code></>,
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "#374151" }}>
                  <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "#ede9fe", color: "#7c3aed" }}>{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      ),
    },
    {
      icon: Store,
      title: "4. Shopify Partners — connexion app",
      color: "#0f172a",
      content: (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "#64748b" }}>
            L&apos;application Shopify est configurée via votre compte Shopify Partners.
          </p>
          <div className="grid grid-cols-1 gap-3">
            {[
              { label: "Client ID", value: "cd3da6aff7869afab614e42f45a0e1a7" },
              { label: "Redirect URL (dev)", value: "http://localhost:3000/api/auth/shopify/callback" },
              { label: "Redirect URL (prod)", value: "https://app.ecompilot.fr/api/auth/shopify/callback" },
              { label: "Endpoint OAuth", value: "/api/auth/shopify?shop=DOMAIN" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50">
                <span className="text-xs font-medium" style={{ color: "#64748b" }}>{item.label}</span>
                <div className="flex items-center gap-2">
                  <code className="text-xs" style={{ color: "#0f172a" }}>{item.value}</code>
                  <button onClick={() => copy(item.value)} className="opacity-50 hover:opacity-100">
                    <Copy className="w-3 h-3" style={{ color: "#374151" }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50">
            <p className="text-xs font-medium" style={{ color: "#065f46" }}>
              ✅ Le flux OAuth est complet : <code>/api/auth/shopify</code> → Shopify → <code>/api/auth/shopify/callback</code> → Supabase <code>shops</code> table.
            </p>
          </div>
          <p className="text-sm" style={{ color: "#64748b" }}>
            Pour tester, utilisez la page{" "}
            <a href="/connect" className="underline font-medium" style={{ color: "#2563eb" }}>Connecter une boutique</a> et entrez un nom de boutique de développement Shopify (créez-en une sur <a href="https://partners.shopify.com" target="_blank" rel="noopener noreferrer" className="underline font-medium" style={{ color: "#2563eb" }}>partners.shopify.com</a>).
          </p>
        </div>
      ),
    },
    {
      icon: CheckCircle2,
      title: "5. Migration Supabase",
      color: "#059669",
      content: (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: "#64748b" }}>
            Exécutez la migration SQL pour créer les tables <code className="px-1 py-0.5 rounded bg-gray-100">users</code> et <code className="px-1 py-0.5 rounded bg-gray-100">shops</code> dans Supabase.
          </p>
          <ol className="space-y-2">
            {[
              <>Allez sur <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline font-medium" style={{ color: "#059669" }}>supabase.com/dashboard <ExternalLink className="inline w-3 h-3" /></a></>,
              "Sélectionnez votre projet",
              "SQL Editor → + New query",
              <>Copiez le contenu de <code className="px-1 py-0.5 rounded bg-gray-100 text-xs">supabase/migrations/001_users_stripe.sql</code></>,
              "Cliquez Run",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm" style={{ color: "#374151" }}>
                <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold" style={{ backgroundColor: "#dcfce7", color: "#15803d" }}>{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      ),
    },
  ];

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2" style={{ color: "#0f172a" }}>Guide de configuration</h1>
        <p className="text-sm" style={{ color: "#64748b" }}>
          Suivez ces étapes pour activer les paiements Stripe et la connexion Shopify en production.
        </p>
      </div>

      <div className="space-y-3">
        {sections.map((section, i) => {
          const Icon = section.icon;
          const isOpen = openSection === i;
          return (
            <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <button
                className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                onClick={() => setOpenSection(isOpen ? null : i)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${section.color}15` }}>
                    <Icon className="w-5 h-5" style={{ color: section.color }} />
                  </div>
                  <span className="text-sm font-semibold" style={{ color: "#0f172a" }}>{section.title}</span>
                </div>
                {isOpen
                  ? <ChevronUp className="w-4 h-4" style={{ color: "#94a3b8" }} />
                  : <ChevronDown className="w-4 h-4" style={{ color: "#94a3b8" }} />
                }
              </button>
              {isOpen && (
                <div className="px-5 pb-6 border-t border-gray-100 pt-4">
                  {section.content}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-8 p-5 rounded-2xl border border-blue-200 bg-blue-50">
        <div className="flex items-start gap-3">
          <CreditCard className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: "#2563eb" }} />
          <div>
            <p className="text-sm font-semibold mb-1" style={{ color: "#1e40af" }}>Mode démo actif</p>
            <p className="text-xs" style={{ color: "#3b82f6" }}>
              Tant que STRIPE_SECRET_KEY n&apos;est pas configurée, tous les paiements se font en mode démo (aucun argent débité).
              Les redirections simulées permettent de tester l&apos;UI sans configuration Stripe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
