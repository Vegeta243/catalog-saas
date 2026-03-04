import Link from "next/link";
import {
  Zap,
  PackageSearch,
  Sparkles,
  Bot,
  BarChart3,
  Image as ImageIcon,
  FileDown,
  Bell,
  Clock,
  Store,
  ArrowRight,
  Check,
  Shield,
  Import,
} from "lucide-react";

const problems = [
  { emoji: "😩", text: "Modifier 200 prix un par un... à la main" },
  { emoji: "😴", text: "Écrire des descriptions produit pendant des heures" },
  { emoji: "😰", text: "Votre catalogue est un chaos que vous évitez" },
  { emoji: "💸", text: "Des revenus sous-optimisés faute de temps" },
  { emoji: "🔁", text: "Les mêmes tâches répétitives chaque semaine" },
  { emoji: "😤", text: "Procrastiner sur les optimisations importantes" },
  { emoji: "🤯", text: "Surcharge mentale à gérer seul votre boutique" },
  { emoji: "📉", text: "Abandonner avant que ça décolle vraiment" },
  { emoji: "⏰", text: "Jamais assez de temps pour tout faire" },
  { emoji: "🎯", text: "Vous focalisez sur le court terme faute de système" },
];

const solutions = [
  { icon: PackageSearch, title: "Catalogue en masse", desc: "Modifiez prix, titres, descriptions, images sur 500 produits en 30 secondes." },
  { icon: Bot, title: "IA qui travaille pour vous", desc: "Descriptions SEO, titres optimisés, tags — générés automatiquement." },
  { icon: Zap, title: "Automatisations intelligentes", desc: "Règles de prix, alertes stock, promotions programmées — tout tourne seul." },
];

const features = [
  { icon: PackageSearch, title: "Bulk editing ultra-rapide", desc: "Modifiez des centaines de produits en quelques clics" },
  { icon: Import, title: "Import AliExpress / CJ en 1 clic", desc: "Importez des produits depuis n'importe quelle URL fournisseur" },
  { icon: Sparkles, title: "Génération IA de descriptions", desc: "Titres et descriptions SEO générés par intelligence artificielle" },
  { icon: BarChart3, title: "Score SEO par produit", desc: "Analysez et améliorez le référencement de chaque produit" },
  { icon: Zap, title: "Automatisations de prix", desc: "Règles automatiques pour promotions et ajustements" },
  { icon: ImageIcon, title: "Modification d'images en masse", desc: "Compressez, redimensionnez et ajoutez des watermarks" },
  { icon: FileDown, title: "Export CSV", desc: "Exportez tout votre catalogue en un fichier structuré" },
  { icon: Bell, title: "Alertes stock bas", desc: "Soyez prévenu quand un produit est en rupture" },
  { icon: Clock, title: "Historique des modifications", desc: "Retrouvez toutes les actions effectuées sur vos produits" },
  { icon: Store, title: "Gestion multi-boutiques", desc: "Gérez plusieurs boutiques Shopify depuis un seul compte" },
];

const plans = [
  {
    id: "starter", name: "Starter", badge: "🥉",
    price: { monthly: 49, yearly: 41 }, popular: false,
    cta: "Commencer l'essai gratuit",
    target: "Pour les petites boutiques qui démarrent",
    fit: "Ce plan est fait pour vous si vous avez moins de 500 produits et cherchez à gagner du temps sur les tâches répétitives.",
    features: ["1 boutique Shopify connectée", "Jusqu'à 500 produits gérés", "Bulk editing prix, titres, descriptions, tags", "Import produits : 20/mois", "50 tâches IA/mois", "Export CSV", "Alertes stock bas basiques", "Support email (sous 48h)", "Essai gratuit 7 jours"],
  },
  {
    id: "pro", name: "Pro", badge: "🥇",
    price: { monthly: 89, yearly: 74 }, popular: true,
    cta: "Commencer l'essai gratuit",
    target: "Pour les boutiques en croissance",
    fit: "Ce plan est fait pour vous si vous gérez un catalogue important et voulez automatiser votre croissance avec l'IA.",
    features: ["Jusqu'à 3 boutiques Shopify", "Produits illimités", "Tout Starter +", "Import illimité AliExpress & CJ", "300 tâches IA/mois", "Automatisations avancées", "Modification images en masse", "Score SEO par produit", "Alertes personnalisées", "Support prioritaire (sous 24h)", "Essai gratuit 7 jours"],
  },
  {
    id: "scale", name: "Scale", badge: "🏆",
    price: { monthly: 129, yearly: 107 }, popular: false,
    cta: "Commencer l'essai gratuit",
    target: "Pour les boutiques à grande échelle",
    fit: "Ce plan est fait pour vous si vous gérez plusieurs boutiques et avez besoin de performances maximales.",
    features: ["Boutiques illimitées", "Tout Pro +", "1 000 tâches IA/mois", "Automatisations illimitées", "Performance gros catalogues", "Support dédié (sous 4h)", "Accès anticipé nouveautés", "Essai gratuit 7 jours"],
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header fixe */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Zap className="w-4 h-4" style={{ color: "#fff" }} />
            </div>
            <span className="text-xl font-bold" style={{ color: "#0f172a" }}>Ecom<span style={{ color: "#2563eb" }}>Pilot</span></span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#fonctionnalites" className="text-sm font-medium hover:text-blue-600 transition-colors" style={{ color: "#475569" }}>Fonctionnalités</a>
            <a href="#tarifs" className="text-sm font-medium hover:text-blue-600 transition-colors" style={{ color: "#475569" }}>Tarifs</a>
            <Link href="/login" className="text-sm font-medium hover:text-blue-600 transition-colors" style={{ color: "#475569" }}>Se connecter</Link>
            <Link href="/signup" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-semibold transition-colors" style={{ color: "#fff" }}>Essai gratuit 7 jours</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8" style={{ backgroundColor: "#eff6ff", color: "#2563eb" }}>
            <Sparkles className="w-3.5 h-3.5" /> Nouveau : Génération IA en masse disponible
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight mb-6" style={{ color: "#0f172a" }}>
            Votre boutique Shopify tourne<br />toute seule. <span style={{ color: "#2563eb" }}>Vous, vous vendez.</span>
          </h1>
          <p className="text-lg md:text-xl max-w-3xl mx-auto mb-10 leading-relaxed" style={{ color: "#475569" }}>
            Vous passez des heures à modifier vos produits un par un, à écrire des descriptions, à ajuster vos prix manuellement. Pendant ce temps, vos concurrents automatisent tout. EcomPilot fait le travail répétitif à votre place — en quelques secondes.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="px-8 py-4 bg-blue-600 hover:bg-blue-700 rounded-xl text-base font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/25" style={{ color: "#fff" }}>
              Commencer gratuitement — 7 jours d&apos;essai <ArrowRight className="w-5 h-5" />
            </Link>
            <a href="#fonctionnalites" className="px-8 py-4 border-2 border-gray-200 hover:border-gray-300 rounded-xl text-base font-semibold flex items-center gap-2 transition-colors" style={{ color: "#0f172a" }}>
              Voir comment ça marche <ArrowRight className="w-5 h-5" />
            </a>
          </div>
          <p className="mt-6 text-sm" style={{ color: "#94a3b8" }}>Sans carte bancaire · Annulation en 1 clic · +2 000 marchands</p>

          {/* Dashboard mockup */}
          <div className="mt-16 relative">
            <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl shadow-gray-200/50 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 flex items-center gap-2 border-b border-gray-200">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-yellow-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-4 text-xs" style={{ color: "#94a3b8" }}>app.ecompilot.fr/dashboard</span>
              </div>
              <div className="p-8 grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-xl p-6 text-left">
                  <p className="text-sm font-medium" style={{ color: "#2563eb" }}>Produits gérés</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: "#0f172a" }}>1 247</p>
                  <p className="text-xs mt-1" style={{ color: "#059669" }}>+12% ce mois</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-6 text-left">
                  <p className="text-sm font-medium" style={{ color: "#059669" }}>Temps économisé</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: "#0f172a" }}>48h</p>
                  <p className="text-xs mt-1" style={{ color: "#059669" }}>ce mois</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-6 text-left">
                  <p className="text-sm font-medium" style={{ color: "#7c3aed" }}>IA générées</p>
                  <p className="text-3xl font-bold mt-1" style={{ color: "#0f172a" }}>382</p>
                  <p className="text-xs mt-1" style={{ color: "#059669" }}>descriptions</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problèmes */}
      <section className="py-20 px-6" style={{ backgroundColor: "#f8fafc" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: "#0f172a" }}>Vous reconnaissez-vous ?</h2>
            <p className="text-lg" style={{ color: "#64748b" }}>Si vous cochez au moins 3 cases, EcomPilot est fait pour vous.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {problems.map((p) => (
              <div key={p.text} className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-red-200 transition-all cursor-default">
                <span className="text-2xl mb-3 block">{p.emoji}</span>
                <p className="text-sm font-medium leading-snug" style={{ color: "#0f172a" }}>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Solution */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: "#0f172a" }}>EcomPilot résout ça en automatisant tout ce qui vous freine</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {solutions.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.title} className="bg-white border border-gray-200 rounded-2xl p-8 hover:shadow-lg transition-all">
                  <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6" style={{ backgroundColor: "#eff6ff" }}>
                    <Icon className="w-7 h-7" style={{ color: "#2563eb" }} />
                  </div>
                  <h3 className="text-xl font-bold mb-3" style={{ color: "#0f172a" }}>{s.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#475569" }}>{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Fonctionnalités */}
      <section id="fonctionnalites" className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: "#0f172a" }}>Tout ce dont vous avez besoin, au même endroit</h2>
            <p className="text-lg" style={{ color: "#64748b" }}>Un seul outil pour gérer, optimiser et automatiser votre catalogue Shopify.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="flex items-start gap-4 p-5 rounded-xl hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: "#eff6ff" }}>
                    <Icon className="w-5 h-5" style={{ color: "#2563eb" }} />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-1" style={{ color: "#0f172a" }}>{f.title}</h4>
                    <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Tarifs */}
      <section id="tarifs" className="py-20 px-6" style={{ backgroundColor: "#f8fafc" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: "#0f172a" }}>Des prix simples, transparents</h2>
            <p className="text-lg mb-8" style={{ color: "#64748b" }}>7 jours d&apos;essai gratuit. Aucune carte bancaire requise. Annulez à tout moment.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div key={plan.id} className={`relative bg-white rounded-2xl border-2 p-8 flex flex-col ${plan.popular ? "border-blue-500 shadow-xl shadow-blue-500/10" : "border-gray-200"}`}>
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-blue-600 rounded-full text-xs font-semibold" style={{ color: "#fff" }}>Le plus populaire</div>
                )}
                <div className="mb-6">
                  <span className="text-2xl mr-2">{plan.badge}</span>
                  <h3 className="text-xl font-bold inline" style={{ color: "#0f172a" }}>{plan.name}</h3>
                  <p className="text-sm mt-2" style={{ color: "#64748b" }}>{plan.target}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-extrabold" style={{ color: "#0f172a" }}>{plan.price.monthly}€</span>
                  <span className="text-sm" style={{ color: "#64748b" }}>/mois</span>
                  <p className="text-xs mt-1" style={{ color: "#059669" }}>ou {plan.price.yearly}€/mois en annuel <span style={{ color: "#dc2626" }}>(-20%)</span></p>
                </div>
                <ul className="space-y-3 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm" style={{ color: "#374151" }}>
                      <Check className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#059669" }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="p-3 rounded-lg mb-6" style={{ backgroundColor: "#f0fdf4" }}>
                  <p className="text-xs" style={{ color: "#166534" }}>{plan.fit}</p>
                </div>
                <Link href={`/signup?plan=${plan.id}`} className={`block text-center py-3.5 rounded-xl text-sm font-semibold transition-colors ${plan.popular ? "bg-blue-600 hover:bg-blue-700" : "bg-gray-900 hover:bg-gray-800"}`} style={{ color: "#fff" }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 px-6" style={{ backgroundColor: "#0f172a" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold mb-4" style={{ color: "#fff" }}>
            Arrêtez de perdre du temps. <span style={{ color: "#60a5fa" }}>Commencez à automatiser.</span>
          </h2>
          <p className="text-lg mb-10" style={{ color: "#94a3b8" }}>7 jours gratuits, sans carte bancaire, annulation en 1 clic.</p>
          <Link href="/signup" className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-gray-100 rounded-xl text-base font-semibold transition-colors" style={{ color: "#0f172a" }}>
            Commencer gratuitement <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5" style={{ color: "#fff" }} />
              </div>
              <span className="text-lg font-bold" style={{ color: "#0f172a" }}>Ecom<span style={{ color: "#2563eb" }}>Pilot</span></span>
              <span className="text-xs ml-2" style={{ color: "#94a3b8" }}>Le copilote de votre catalogue Shopify</span>
            </div>
            <div className="flex items-center gap-6 text-sm" style={{ color: "#64748b" }}>
              <Link href="/cgu" className="hover:text-blue-600 transition-colors">CGU</Link>
              <Link href="/politique-confidentialite" className="hover:text-blue-600 transition-colors">Confidentialité</Link>
              <Link href="/mentions-legales" className="hover:text-blue-600 transition-colors">Mentions légales</Link>
              <a href="mailto:contact@ecompilot.fr" className="hover:text-blue-600 transition-colors">Contact</a>
            </div>
          </div>
          <div className="mt-8 text-center">
            <p className="text-xs" style={{ color: "#94a3b8" }}>© 2025 EcomPilot — Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
