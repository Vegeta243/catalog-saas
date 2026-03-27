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
    features: ["30 actions IA", "1 boutique", "Édition de base", "Score SEO"],
  },
  {
    id: "starter", name: "Starter",
    monthlyPrice: 19, yearlyPrice: 13,
    features: ["500 actions IA", "500 produits", "Import AliExpress", "Support email"],
  },
  {
    id: "pro", name: "Pro",
    monthlyPrice: 49, yearlyPrice: 34,
    popular: true,
    features: ["5000 actions IA", "Produits illimités", "3 boutiques", "Automatisations", "Support 24h"],
  },
  {
    id: "agency", name: "Agency",
    monthlyPrice: 149, yearlyPrice: 104,
    features: ["Tout illimité", "Boutiques illimitées", "Support dédié", "Accès anticipé"],
  },
];

const TESTIMONIALS = [
  { name: "Gary T.", role: "3 boutiques", quote: "J'optimisais mes fiches à la main, maintenant l'IA fait tout. Vraiment efficace." },
  { name: "Ghiles A.", role: "E-commerce mode", quote: "L'import AliExpress + descriptions IA, mon catalogue de 200 produits optimisé en une après-midi." },
  { name: "2L", role: "Boutique généraliste", quote: "Simple à connecter. Les descriptions sont bien meilleures que ce que j'écrivais." },
];

export default function HomePage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const faqItems = [
    { q: "Est-ce que mes produits sont modifiés sans mon accord ?", a: "Non, jamais. EcomPilot génère des suggestions que vous validez avant d'appliquer." },
    { q: "Faut-il une carte bancaire pour commencer ?", a: "Non. Vous démarrez gratuitement avec 30 actions, sans carte." },
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
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <div className="animate-fade-in-up">
            <h1 className="mb-4">
              L&apos;IA qui transforme ton catalogue<br />Shopify en machine à vendre.
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Descriptions IA, import AliExpress, SEO automatique. Ton catalogue optimisé en quelques minutes.
            </p>
            <div className="flex flex-col items-center gap-3">
              <button 
                onClick={() => router.push('/signup')}
                className="btn btn-primary"
              >
                Commencer gratuitement — c&apos;est gratuit
                <ArrowRight className="w-4 h-4" />
              </button>
              <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
                J&apos;ai déjà un compte →
              </Link>
            </div>
          </div>
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
          <div className="grid md:grid-cols-3 gap-6">
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
                  {plan.monthlyPrice === 0 ? 'Commencer' : 'Essai gratuit'}
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
                  <p className="text-muted-foreground text-xs">{testimonial.role}</p>
                </div>
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
