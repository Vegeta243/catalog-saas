"use client";

import Link from "next/link";
import {
  Zap, Sparkles, PackageSearch, BarChart3, Check, Star,
  ArrowRight, Shield, Clock, Bot, TrendingUp, AlertTriangle,
  Image as ImageIcon, Download, Bell, ChevronRight,
} from "lucide-react";

const APP_FEATURES = [
  {
    icon: Sparkles,
    title: "Descriptions IA en masse",
    desc: "Générez des descriptions professionnelles et SEO-optimisées pour l'ensemble de votre catalogue en un seul clic.",
    highlight: true,
  },
  {
    icon: PackageSearch,
    title: "Édition en masse rapide",
    desc: "Mettez à jour prix, titres, tags et descriptions sur des centaines de produits simultanément.",
    highlight: false,
  },
  {
    icon: TrendingUp,
    title: "SEO Shopify optimisé",
    desc: "Titres searchés, meta descriptions, tags structurés — remontez dans Google et dans la recherche Shopify.",
    highlight: false,
  },
  {
    icon: BarChart3,
    title: "Score visibilité produit",
    desc: "Chaque produit reçoit un score SEO. Identifiez instantanément ce qui freine vos ventes.",
    highlight: false,
  },
  {
    icon: Download,
    title: "Import AliExpress & CJ",
    desc: "Importez depuis n'importe quelle URL fournisseur. Description IA et marge intégrées.",
    highlight: false,
  },
  {
    icon: ImageIcon,
    title: "Traitement images en masse",
    desc: "Compressez, redimensionnez et watermark vos images produit en un clic.",
    highlight: false,
  },
  {
    icon: Zap,
    title: "Automatisations intelligentes",
    desc: "Règles de prix, promotions programmées — votre catalogue s'optimise pendant que vous dormez.",
    highlight: false,
  },
  {
    icon: Bell,
    title: "Alertes stock & performance",
    desc: "Soyez notifié quand un produit est en rupture ou quand ses performances chutent.",
    highlight: false,
  },
];

const REVIEWS = [
  {
    stars: 5,
    name: "Sophie M.",
    store: "Boutique Mode",
    date: "Scénario illustratif",
    text: "Passer de 40 heures de travail manuel à quelques heures par semaine grâce à la génération IA : c'est exactement ce que permet EcomPilot.",
  },
  {
    stars: 5,
    name: "Marc L.",
    store: "Dropshipping Multi-boutiques",
    date: "Scénario illustratif",
    text: "L'import fournisseur couplé aux descriptions IA uniques change complètement la gestion d'un catalogue multi-boutiques.",
  },
  {
    stars: 5,
    name: "Camille D.",
    store: "Artisanat & Créations",
    date: "Scénario illustratif",
    text: "Le score de visibilité par produit m'a permis de comprendre exactement pourquoi certains produits ne se vendaient pas.",
  },
];

const APP_DETAILS = [
  { label: "Compatibilité", value: "Shopify (toutes versions)" },
  { label: "Langues", value: "Français, English" },
  { label: "Support", value: "Email · Chat · Documentation" },
  { label: "Installation", value: "< 1 minute" },
  { label: "Données", value: "Hébergé en Europe (RGPD)" },
  { label: "Intégrations", value: "AliExpress, CJ Dropshipping" },
];

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className="w-4 h-4"
          fill={i < count ? "#f59e0b" : "none"}
          style={{ color: i < count ? "#f59e0b" : "#d1d5db" }}
        />
      ))}
    </div>
  );
}

export default function ShopifyAppPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ── Top bar ── */}
      <nav className="border-b border-gray-100 bg-white sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5" style={{ color: "#fff" }} />
            </div>
            <span className="font-bold text-base" style={{ color: "#0f172a" }}>
              Ecom<span style={{ color: "#2563eb" }}>Pilot</span>
            </span>
            <span className="hidden sm:block mx-2 text-gray-300">|</span>
            <span className="hidden sm:block text-sm" style={{ color: "#64748b" }}>
              Application Shopify
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:block text-sm font-medium hover:text-blue-600 transition-colors"
              style={{ color: "#64748b" }}
            >
              Se connecter
            </Link>
            <a
              href="/api/auth/shopify"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all bg-blue-600 hover:bg-blue-700"
              style={{ color: "#fff" }}
            >
              Installer l&apos;app <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="py-12 sm:py-20 px-4 sm:px-6 bg-gradient-to-b from-blue-50/60 to-white">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row items-start gap-6 mb-10">
            {/* App icon */}
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0">
              <Zap className="w-10 h-10 sm:w-12 sm:h-12" style={{ color: "#fff" }} />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold" style={{ color: "#0f172a" }}>
                  EcomPilot — IA Catalogue Shopify
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}>
                  GRATUIT pour démarrer
                </span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <StarRating count={5} />
                <span className="text-sm font-semibold" style={{ color: "#0f172a" }}>4.9</span>
                <span className="text-sm" style={{ color: "#64748b" }}>· 127 avis · Scénarios illustratifs</span>
              </div>
              <p className="text-base sm:text-lg leading-relaxed max-w-2xl" style={{ color: "#475569" }}>
                Générez des descriptions IA, optimisez votre SEO, éditez en masse et automatisez votre
                catalogue Shopify. <strong style={{ color: "#0f172a" }}>30 actions gratuites, sans carte bancaire.</strong>
              </p>
              <div className="flex flex-wrap gap-2 mt-4">
                {["IA GPT-4o", "SEO intégré", "Import fournisseurs", "Édition en masse", "RGPD"].map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium border border-gray-200" style={{ color: "#374151" }}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* CTA block */}
          <div className="bg-white border-2 border-blue-100 rounded-2xl p-6 sm:p-8 mb-10 shadow-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div>
                <p className="text-xl font-extrabold mb-1.5" style={{ color: "#0f172a" }}>
                  Commencez gratuitement dès aujourd&apos;hui
                </p>
                <div className="flex flex-wrap gap-4">
                  {["30 actions offertes", "Aucune carte requise", "Installation en 1 min"].map((item) => (
                    <p key={item} className="flex items-center gap-1.5 text-sm" style={{ color: "#475569" }}>
                      <Check className="w-4 h-4" style={{ color: "#059669" }} /> {item}
                    </p>
                  ))}
                </div>
              </div>
              <a
                href="/api/auth/shopify"
                className="flex-shrink-0 inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5 bg-blue-600 hover:bg-blue-700"
                style={{ color: "#fff" }}
              >
                Ajouter à Shopify <ArrowRight className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* App mockup */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <span className="ml-3 text-xs" style={{ color: "#94a3b8" }}>dashboard.ecompilotelite.com — Optimisation IA</span>
            </div>
            <div className="p-4 sm:p-8">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: "Produits", value: "1 247", color: "#2563eb", bg: "#eff6ff" },
                  { label: "Score SEO moyen", value: "84%", color: "#059669", bg: "#f0fdf4" },
                  { label: "Descriptions IA", value: "382", color: "#7c3aed", bg: "#faf5ff" },
                  { label: "Temps économisé", value: "48h", color: "#d97706", bg: "#fffbeb" },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl p-3 sm:p-4" style={{ backgroundColor: stat.bg }}>
                    <p className="text-xs font-medium mb-1" style={{ color: stat.color }}>{stat.label}</p>
                    <p className="text-xl sm:text-2xl font-extrabold" style={{ color: "#0f172a" }}>{stat.value}</p>
                  </div>
                ))}
              </div>
              {/* AI generation row */}
              <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Bot className="w-4 h-4" style={{ color: "#7c3aed" }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#0f172a" }}>Génération IA en cours…</p>
                    <p className="text-xs" style={{ color: "#64748b" }}>42 / 50 produits optimisés</p>
                  </div>
                  <div className="ml-auto px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: "#f0fdf4", color: "#16a34a" }}>
                    84% ✓
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="h-2 rounded-full" style={{ width: "84%", backgroundColor: "#2563eb" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6" style={{ backgroundColor: "#f8fafc" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-sm font-bold uppercase tracking-widest mb-3" style={{ color: "#2563eb" }}>Fonctionnalités</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-4" style={{ color: "#0f172a" }}>
              Tout pour votre catalogue Shopify
            </h2>
            <p className="text-base sm:text-lg max-w-2xl mx-auto" style={{ color: "#64748b" }}>
              Un seul outil remplace cinq apps. Économisez du temps et de l'argent.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {APP_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.title}
                  className={`bg-white rounded-xl p-5 border transition-all hover:shadow-md ${
                    f.highlight ? "border-blue-300 shadow-md shadow-blue-500/10" : "border-gray-200"
                  }`}
                >
                  {f.highlight && (
                    <span className="inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full mb-3" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
                      ★ Populaire
                    </span>
                  )}
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: f.highlight ? "#eff6ff" : "#f8fafc" }}>
                    <Icon className="w-5 h-5" style={{ color: f.highlight ? "#2563eb" : "#475569" }} />
                  </div>
                  <h3 className="text-sm font-bold mb-1.5" style={{ color: "#0f172a" }}>{f.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold mb-4" style={{ color: "#0f172a" }}>
              Opérationnel en 3 étapes
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                step: "1",
                icon: Zap,
                title: "Cliquez « Ajouter à Shopify »",
                desc: "L'autorisation OAuth prend 30 secondes. Vos produits se synchronisent immédiatement.",
              },
              {
                step: "2",
                icon: Bot,
                title: "L'IA analyse tout",
                desc: "Score SEO, descriptions manquantes, opportunités d'optimisation — EcomPilot identifie tout.",
              },
              {
                step: "3",
                icon: TrendingUp,
                title: "Votre catalogue vend mieux",
                desc: "Appliquez les suggestions en un clic. Votre catalogue commence à remonter dans les résultats.",
              },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.step} className="relative text-center p-6 rounded-2xl border border-blue-100" style={{ backgroundColor: "#f8faff" }}>
                  <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-base font-bold mx-auto mb-4" style={{ color: "#fff" }}>
                    {s.step}
                  </div>
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: "#eff6ff" }}>
                    <Icon className="w-7 h-7" style={{ color: "#2563eb" }} />
                  </div>
                  <h3 className="text-base font-bold mb-2" style={{ color: "#0f172a" }}>{s.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#475569" }}>{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Reviews ── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6" style={{ backgroundColor: "#f8fafc" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-2 mb-3">
              <StarRating count={5} />
              <span className="font-bold text-lg" style={{ color: "#0f172a" }}>4.9 / 5</span>
            </div>
            <h2 className="text-3xl font-extrabold mb-3" style={{ color: "#0f172a" }}>
              Ce qu&apos;EcomPilot permet de faire
            </h2>
            <p className="text-sm" style={{ color: "#94a3b8" }}>
              Scénarios illustratifs basés sur l&apos;usage typique. Ces exemples ne constituent pas des témoignages réels.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {REVIEWS.map((r) => (
              <div key={r.name} className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition-all">
                <StarRating count={r.stars} />
                <p className="text-sm leading-relaxed my-4 italic" style={{ color: "#374151" }}>
                  &ldquo;{r.text}&rdquo;
                </p>
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-sm font-bold" style={{ color: "#0f172a" }}>{r.name}</p>
                  <p className="text-xs" style={{ color: "#64748b" }}>{r.store} · {r.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold mb-4" style={{ color: "#0f172a" }}>
            Tarifs simples et transparents
          </h2>
          <p className="text-base mb-10" style={{ color: "#64748b" }}>
            Démarrez gratuitement. Passez à un plan payant quand vous êtes prêt.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { name: "Gratuit", price: "0€", tasks: "30 actions", color: "#64748b", popular: false },
              { name: "Starter", price: "19€", tasks: "500 actions/mois", color: "#2563eb", popular: false },
              { name: "Pro", price: "49€", tasks: "5 000 actions/mois", color: "#7c3aed", popular: true },
              { name: "Agency", price: "149€", tasks: "Actions illimitées", color: "#059669", popular: false },
            ].map((p) => (
              <div key={p.name} className={`relative p-5 rounded-xl border-2 text-left transition-all ${p.popular ? "border-violet-400 shadow-lg shadow-violet-500/10" : "border-gray-200"}`}>
                {p.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: "#7c3aed", color: "#fff" }}>
                    POPULAIRE
                  </div>
                )}
                <p className="text-sm font-bold mb-1" style={{ color: p.color }}>{p.name}</p>
                <p className="text-2xl font-extrabold mb-1" style={{ color: "#0f172a" }}>{p.price}<span className="text-sm font-normal" style={{ color: "#64748b" }}>/mois</span></p>
                <p className="text-xs" style={{ color: "#64748b" }}>{p.tasks}</p>
              </div>
            ))}
          </div>
          <p className="text-sm mt-6" style={{ color: "#94a3b8" }}>
            Tous les plans incluent : annulation en 1 clic · accès immédiat · données RGPD
          </p>
        </div>
      </section>

      {/* ── App details ── */}
      <section className="py-16 px-4 sm:px-6" style={{ backgroundColor: "#f8fafc" }}>
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-10">
          <div>
            <h3 className="text-lg font-bold mb-5" style={{ color: "#0f172a" }}>Informations sur l&apos;application</h3>
            <dl className="space-y-3">
              {APP_DETAILS.map((d) => (
                <div key={d.label} className="flex items-start justify-between gap-4 py-2 border-b border-gray-200">
                  <dt className="text-sm font-medium" style={{ color: "#64748b" }}>{d.label}</dt>
                  <dd className="text-sm font-semibold text-right" style={{ color: "#0f172a" }}>{d.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h3 className="text-lg font-bold mb-5" style={{ color: "#0f172a" }}>Support & sécurité</h3>
            <div className="space-y-3">
              {[
                { icon: Shield, text: "Vos données Shopify ne sont jamais partagées ni vendues", color: "#059669" },
                { icon: Clock, text: "Support email en moins de 48h", color: "#2563eb" },
                { icon: Check, text: "Conformité RGPD — données hébergées en Europe", color: "#059669" },
                { icon: AlertTriangle, text: "Aucune modification sans votre validation préalable", color: "#d97706" },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.text} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: item.color + "15" }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "#374151" }}>{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-16 sm:py-20 px-4 sm:px-6" style={{ backgroundColor: "#0f172a" }}>
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-6">
            <Zap className="w-8 h-8" style={{ color: "#fff" }} />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4" style={{ color: "#fff" }}>
            Prêt à transformer votre catalogue Shopify ?
          </h2>
          <p className="text-base sm:text-lg mb-8" style={{ color: "#94a3b8" }}>
            30 actions gratuites · Sans carte bancaire · Installation en 1 minute
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="/api/auth/shopify"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-xl text-base font-bold transition-all hover:-translate-y-0.5 shadow-lg bg-white hover:bg-gray-50"
              style={{ color: "#0f172a" }}
            >
              Ajouter EcomPilot à ma boutique <ArrowRight className="w-5 h-5" />
            </a>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-4 rounded-xl text-sm font-semibold border border-white/20 hover:border-white/40 transition-all hover:bg-white/5"
              style={{ color: "#94a3b8" }}
            >
              <ChevronRight className="w-4 h-4" /> J&apos;ai déjà un compte
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 bg-white py-8 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Zap className="w-3 h-3" style={{ color: "#fff" }} />
            </div>
            <span className="text-sm font-bold" style={{ color: "#0f172a" }}>
              Ecom<span style={{ color: "#2563eb" }}>Pilot</span>
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: "#64748b" }}>
            <Link href="/cgu" className="hover:text-blue-600 transition-colors">CGU</Link>
            <Link href="/cgv" className="hover:text-blue-600 transition-colors">CGV</Link>
            <Link href="/politique-confidentialite" className="hover:text-blue-600 transition-colors">Confidentialité</Link>
            <Link href="/mentions-legales" className="hover:text-blue-600 transition-colors">Mentions légales</Link>
            <a href="mailto:contact@ecompilot.fr" className="hover:text-blue-600 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
