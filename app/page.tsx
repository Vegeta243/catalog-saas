"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap, PackageSearch, Sparkles, BarChart3,
  ArrowRight, Check, Import, TrendingUp,
  ChevronDown, Star, Shield, Clock, Menu, X,
} from "lucide-react";

const FEATURES = [
  { icon: PackageSearch, title: "Édition en masse", desc: "Modifiez prix, titres et descriptions sur des centaines de produits en quelques clics." },
  { icon: Import, title: "Import AliExpress", desc: "Importez des produits depuis n'importe quelle URL. Marge automatique, description IA incluse." },
  { icon: Sparkles, title: "Descriptions IA", desc: "Générez des descriptions qui vendent, adaptées à votre audience. Par lot de 10, 50 ou 200." },
  { icon: TrendingUp, title: "SEO optimisé", desc: "Titres SEO, meta descriptions, tags structurés pour mieux ranker sur Google." },
  { icon: BarChart3, title: "Score visibilité", desc: "Visualisez la santé de chaque fiche produit et identifiez ce qui manque." },
];

const PLANS = [
  {
    id: "free", name: "Gratuit",
    monthlyPrice: 0, yearlyPrice: 0,
    features: ["100 actions IA", "1 boutique", "Édition de base", "Score SEO"],
  },
  {
    id: "starter", name: "Starter",
    monthlyPrice: 29, yearlyPrice: 20,
    features: ["1\u00a0500 actions IA/mois", "500 produits", "Import AliExpress", "Support email"],
  },
  {
    id: "pro", name: "Pro",
    monthlyPrice: 79, yearlyPrice: 55,
    popular: true,
    features: ["10\u00a0000 actions IA/mois", "Produits illimités", "3 boutiques", "Automatisations", "Support 24h"],
  },
  {
    id: "agency", name: "Agency",
    monthlyPrice: 199, yearlyPrice: 139,
    features: ["Actions illimitées, Boutiques illimitées", "Boutiques illimitées", "Support dédié", "Accès anticipé"],
  },
];

const TESTIMONIALS = [
  { name: "Gary T.", role: "3 boutiques", niche: "mode", quote: "J'optimisais mes fiches à la main, maintenant l'IA fait tout. Vraiment efficace." },
  { name: "2L", role: "Boutique généraliste", niche: "décoration", quote: "L'import AliExpress + descriptions IA, mon catalogue de 200 produits optimisé en une après-midi." },
  { name: "Ghiles A.", role: "Décoration intérieure", niche: "fitness", quote: "Simple à connecter. Les descriptions sont bien meilleures que ce que j'écrivais." },
];

export default function HomePage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  void mobileMenuOpen;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const faqItems = [
    { q: "Est-ce que mes produits sont modifiés sans mon accord ?", a: "Non, jamais. EcomPilot génère des suggestions que vous validez avant d'appliquer." },
    { q: "Faut-il une carte bancaire pour commencer ?", a: "Non. Vous démarrez gratuitement avec 100 actions, sans carte." },
    { q: "Puis-je annuler à tout moment ?", a: "Oui, en 1 clic. Aucun engagement, aucun frais caché." },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className={`sticky top-0 z-50 border-b transition-all ${scrolled ? 'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60' : 'bg-background'}`}>
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary">
            EcomPilot
          </Link>
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground">Fonctionnalités</Link>
            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">Tarifs</Link>
            <Link href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground">Avis</Link>
            <Link href="/login" className="text-sm font-medium text-primary">Connexion</Link>
            <button onClick={() => router.push('/signup')} className="btn btn-primary btn-sm">Essai gratuit</button>
          </div>
          {/* Mobile nav — always show login + signup */}
          <div className="flex md:hidden items-center gap-2">
            <Link href="/login" className="text-sm font-medium text-primary px-3 py-1.5">Connexion</Link>
            <button onClick={() => router.push('/signup')} className="btn btn-primary btn-sm">Essai gratuit</button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-section" style={{
        padding: '40px 24px 100px',
        paddingTop: 'max(80px, calc(env(safe-area-inset-top, 0px) + 60px))',
        textAlign: 'center',
        maxWidth: '800px',
        margin: '0 auto',
      }}>
        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '6px 16px', borderRadius: '100px',
          background: 'rgba(79,142,247,0.1)',
          border: '1px solid rgba(79,142,247,0.25)',
          color: '#4f8ef7', fontSize: '13px', fontWeight: 700,
          marginBottom: '32px',
        }}>
          ✨ IA GPT-4 • Compatible Shopify • Sans CB
        </div>

        {/* H1 */}
        <h1 style={{
          fontSize: 'clamp(32px, 5vw, 56px)',
          fontWeight: 900, lineHeight: 1.15,
          margin: '0 0 16px',
        }}>
          L&apos;IA qui transforme ton catalogue
          <span style={{ color: '#4f8ef7' }}> Shopify </span>
          en machine à vendre.
        </h1>

        {/* New subtitle */}
        <p style={{ color: '#475569', fontSize: 'clamp(16px,3vw,20px)', fontWeight: 400, margin: '0 0 20px', lineHeight: 1.6, maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
          Analyse tes concurrents en temps réel. Optimise titres, descriptions, SEO et rentabilité en 1 clic.
        </p>

        {/* Subtitle */}
        <p style={{
          fontSize: '18px',
          lineHeight: 1.7, margin: '0 0 40px',
          maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto',
        }} className="text-muted-foreground">
          Fiches produits pro en 1 clic • SEO inclus •
          100 actions gratuites sans carte bancaire.
        </p>

        {/* Video placeholder */}
        <div style={{
          width: '100%', maxWidth: '640px',
          margin: '0 auto 40px',
          borderRadius: '16px', overflow: 'hidden',
          aspectRatio: '16 / 9',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }} className="border bg-secondary/30">
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '64px', height: '64px',
              background: 'rgba(79,142,247,0.2)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 12px',
              fontSize: '28px',
            }}>▶</div>
            <p className="text-muted-foreground" style={{ fontSize: '14px', margin: 0 }}>
              Démo 30 secondes — Avant/Après fiche produit
            </p>
          </div>
        </div>

        {/* MAIN CTA */}
        <a href="/signup" style={{
          display: 'inline-block',
          padding: '18px 48px',
          background: '#4f8ef7',
          color: '#fff', fontWeight: 900,
          fontSize: '18px', borderRadius: '16px',
          textDecoration: 'none',
          boxShadow: '0 8px 32px rgba(79,142,247,0.4)',
          marginBottom: '16px',
        }}>
          Commencer gratuit (sans CB) →
        </a>

        {/* Secondary link */}
        <div style={{ marginBottom: '16px' }}>
          <Link href="/login" className="text-muted-foreground" style={{ fontSize: '14px', textDecoration: 'none' }}>
            J&apos;ai déjà un compte
          </Link>
        </div>

        {/* Download app */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
          <Link href="/download" style={{
            display: 'inline-flex', alignItems: 'center', gap: '7px',
            padding: '9px 18px',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '10px', color: 'var(--muted-foreground)',
            fontSize: '13px', fontWeight: 600, textDecoration: 'none',
            transition: 'background 0.2s',
          }}>
            📱 Télécharger l&apos;app
          </Link>
          <span className="text-muted-foreground" style={{ fontSize: '12px' }}>Android · iPhone · Desktop</span>
        </div>

        {/* Trust strip */}
        <div style={{ marginBottom: '12px' }}>
          <p style={{ color: '#475569', fontSize: '14px', fontWeight: 500 }}>
            100 actions gratuites sans carte bancaire · Résultats visibles dès le premier produit
          </p>
        </div>
        <div style={{
          display: 'flex', justifyContent: 'center',
          gap: '24px', flexWrap: 'wrap',
        }}>
          {['✓ 100 actions gratuites', '✓ Sans carte bancaire', '✓ Annulation en 1 clic'].map(t => (
            <span key={t} className="text-muted-foreground" style={{ fontSize: '13px', fontWeight: 600 }}>
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 bg-secondary/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="mb-3">Tout ce dont vous avez besoin</h2>
            <p className="text-muted-foreground">Des outils puissants dans une interface simple.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, i) => (
              <div key={i} className="card animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Before / After */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <h2 className="mb-3">Avant / Après EcomPilot</h2>
            <p className="text-muted-foreground">Vos fiches produits transformées en quelques secondes.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                product: "Montre connectée",
                before: "Montre connectée noire — livraison 2-3 semaines",
                after: "Montre connectée premium — suivi cardio, notifications, autonomie 7 jours. Parfait pour sportifs exigeants.",
              },
              {
                product: "T-shirt oversize",
                before: "T-shirt blanc oversize taille M/L",
                after: "T-shirt oversize streetwear 100% coton — coupe relaxée, polyvalent du casual au soirée. Livré en 48h.",
              },
              {
                product: "Lampe LED bureau",
                before: "Lampe LED USB — plusieurs couleurs",
                after: "Lampe LED USB tactile 3 températures — idéale télétravail et gaming. Design épuré, fixation universelle.",
              },
              {
                product: "Analyse concurrentielle",
                before: "Tu ne sais pas ce que vend ton concurrent ni à quel prix",
                after: "Score de menace concurrentielle en temps réel, prix et nouveaux produits détectés automatiquement",
              },
            ].map((item, i) => (
              <div key={i} className="card overflow-hidden p-0">
                <div className="px-5 py-4 bg-red-50 dark:bg-red-950/20 border-b">
                  <p className="text-xs font-semibold text-red-500 uppercase mb-1">Avant</p>
                  <p className="text-sm text-muted-foreground">{item.before}</p>
                </div>
                <div className="px-5 py-4 bg-green-50 dark:bg-green-950/20">
                  <p className="text-xs font-semibold text-green-600 uppercase mb-1">Après IA</p>
                  <p className="text-sm">{item.after}</p>
                </div>
                <div className="px-5 py-3 border-t">
                  <p className="text-xs text-muted-foreground font-medium">{item.product}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Competitive Intelligence */}
      <section style={{ padding: 'clamp(40px,6vw,80px) clamp(16px,5vw,40px)', background: '#f8fafc', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ color: '#0f172a', fontSize: 'clamp(22px,4vw,32px)', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.02em' }}>
            Ce que vous ne voyez pas, vos concurrents l&apos;utilisent déjà
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left', maxWidth: '500px', margin: '0 auto' }}>
            {['Détection automatique des nouveaux produits de vos concurrents', 'Suivi des changements de prix en temps réel', 'Score de menace concurrentielle mis à jour à chaque analyse'].map(item => (
              <div key={item} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ color: '#2563eb', fontWeight: 700, flexShrink: 0, marginTop: '1px' }}>✓</span>
                <p style={{ color: '#334155', fontSize: '16px', margin: 0, fontWeight: 400, lineHeight: 1.5 }}>{item}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 bg-secondary/50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="mb-3">Des prix simples</h2>
            <p className="text-muted-foreground mb-6">Commencez gratuitement. Évoluez selon vos besoins.</p>

            <div className="inline-flex items-center gap-2 p-1 bg-secondary rounded-full">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${billingPeriod === 'monthly' ? 'bg-primary text-white' : 'text-muted-foreground'}`}
              >
                Mensuel
              </button>
              <button
                onClick={() => setBillingPeriod('yearly')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${billingPeriod === 'yearly' ? 'bg-primary text-white' : 'text-muted-foreground'}`}
              >
                Annuel -30%
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map((plan, i) => (
              <div 
                key={i} 
                className={`card relative ${plan.popular ? 'border-primary shadow-md' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-xs font-semibold rounded-full tracking-wide">
                    RECOMMANDÉ
                  </div>
                )}
                <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
                <div className="mb-4">
                  <span className="text-3xl font-bold">{billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}€</span>
                  <span className="text-muted-foreground text-sm">/{billingPeriod === 'monthly' ? 'mois' : 'an'}</span>
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button 
                  onClick={() => router.push(`/signup?plan=${plan.id}`)}
                  className={`btn w-full ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {plan.monthlyPrice === 0 ? 'Commencer' : plan.id === 'pro' ? 'Essai gratuit' : 'Commencer'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="mb-3">Ils nous font confiance</h2>
            <p className="text-muted-foreground">Rejoignez des centaines de e-commerçants.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((testimonial, i) => (
              <div key={i} className="card">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm mb-4 italic">"{testimonial.quote}"</p>
                <div>
                  <p className="font-medium text-sm">{testimonial.name}</p>
                  <p className="text-muted-foreground text-xs">{testimonial.role}</p>                  <p style={{ color: '#94a3b8', fontSize: '12px', margin: '2px 0 0' }}>Boutique Shopify vérifiée — {testimonial.niche}</p>                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-secondary/50">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-12">
            <h2 className="mb-3">Questions fréquentes</h2>
            <p className="text-muted-foreground">Tout ce que vous devez savoir.</p>
          </div>

          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <div key={i} className="card overflow-hidden p-0">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-secondary/50 transition-colors"
                >
                  <span className="font-medium">{item.q}</span>
                  <ChevronDown className={`w-5 h-5 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} />
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-4 text-muted-foreground text-sm">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="card bg-primary/5 border-primary/20 py-12">
            <h2 className="mb-3">Prêt à optimiser votre boutique ?</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Rejoignez EcomPilot aujourd'hui et transformez votre façon de gérer votre catalogue.
            </p>
            <button 
              onClick={() => router.push('/signup')}
              className="btn btn-primary"
            >
              Commencer gratuitement
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="font-semibold mb-4 text-sm">Produit</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="#features" className="hover:text-foreground">Fonctionnalités</Link></li>
                <li><Link href="#pricing" className="hover:text-foreground">Tarifs</Link></li>
                <li><Link href="/dashboard" className="hover:text-foreground">Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm">Entreprise</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/politique-confidentialite" className="hover:text-foreground">Politique de confidentialité</Link></li>
                <li><a href="mailto:contact@ecompilotelite.com" className="hover:text-foreground">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm">Légal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/cgu" className="hover:text-foreground">CGU</Link></li>
                <li><Link href="/cgv" className="hover:text-foreground">CGV</Link></li>
                <li><Link href="/mentions-legales" className="hover:text-foreground">Mentions légales</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-sm">Suivez-nous</h4>
              <div className="flex gap-4">
                <Link href="#" className="text-muted-foreground hover:text-foreground text-sm">Twitter</Link>
                <Link href="#" className="text-muted-foreground hover:text-foreground text-sm">LinkedIn</Link>
              </div>
            </div>
          </div>
          <div className="border-t pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">© 2026 EcomPilot Elite. Tous droits réservés.</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <Link href="/politique-confidentialite" className="hover:text-foreground">Confidentialité</Link>
              <Link href="/cgu" className="hover:text-foreground">CGU</Link>
              <Link href="/cgv" className="hover:text-foreground">CGV</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
