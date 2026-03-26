"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Zap, PackageSearch, Sparkles, Bot, BarChart3,
  ArrowRight, Check, Shield, Import,
  ChevronDown, TrendingUp, Heart,
  Crown, Star,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════════════════ */

const FEATURES = [
  { icon: PackageSearch, title: "Édition en masse ultra-rapide", desc: "Modifiez prix, titres, descriptions et tags sur des centaines de produits en quelques clics." },
  { icon: Import, title: "Import AliExpress en 1 clic", desc: "Importez des produits depuis n'importe quelle URL fournisseur. Marge automatique, description IA incluse." },
  { icon: Sparkles, title: "Descriptions IA percutantes", desc: "Générez des descriptions qui vendent, adaptées à votre audience. Par lot de 10, 50 ou 200." },
  { icon: TrendingUp, title: "SEO Shopify optimisé", desc: "Titres SEO, meta descriptions, tags structurés — faites remonter vos produits dans Google." },
  { icon: BarChart3, title: "Score visibilité par produit", desc: "Visualisez la santé de chaque fiche produit. Identifiez en un coup d'œil ce qui manque." },
  { icon: Zap, title: "Automatisations intelligentes", desc: "Laissez l'IA optimiser votre boutique 24h/24. Gagnez du temps, vendez plus." },
];

const PLANS = [
  {
    id: "free", name: "Gratuit",
    monthlyPrice: 0, yearlyPrice: 0, popular: false,
    target: "Pour découvrir EcomPilot sans engagement",
    features: ["30 actions IA offertes", "1 boutique Shopify", "Édition en masse de base", "Score SEO par produit"],
  },
  {
    id: "starter", name: "Starter",
    monthlyPrice: 19, yearlyPrice: 13, popular: false,
    target: "Pour les boutiques qui démarrent",
    features: ["500 actions IA/mois", "Jusqu'à 500 produits", "Édition en masse complète", "Import produits : 20/mois", "Support email (48h)"],
  },
  {
    id: "pro", name: "Pro",
    monthlyPrice: 49, yearlyPrice: 34, popular: true,
    target: "Pour les boutiques en croissance",
    features: ["5 000 actions IA/mois", "Produits illimités", "3 boutiques", "Import illimité AliExpress", "Automatisations avancées", "Support prioritaire (24h)"],
  },
  {
    id: "agency", name: "Agency",
    monthlyPrice: 149, yearlyPrice: 104, popular: false,
    target: "Pour les agences et multi-boutiques",
    features: ["Actions illimitées", "Boutiques illimitées", "Tout Pro inclus", "Automatisations illimitées", "Support dédié (4h)", "Accès anticipé nouveautés"],
  },
];

const TESTIMONIALS = [
  { name: "Gary T.", role: "Dropshipping · 3 boutiques", quote: "J'optimisais mes fiches produits à la main, ça me prenait des heures. Maintenant j'active l'IA, je valide, c'est fini. Vraiment efficace." },
  { name: "Ghiles A.", role: "E-commerce mode", quote: "L'import AliExpress + la génération de description en un clic, c'est ce qui m'a convaincu. Mon catalogue de 200 produits optimisé en une après-midi." },
  { name: "2L", role: "Boutique généraliste", quote: "Simple à connecter avec Shopify. Les descriptions générées sont bien meilleures que ce que j'écrivais avant. Je recommande sans hésiter." },
];

const FAQ_ITEMS = [
  { q: "Est-ce que mes produits sont modifiés sans mon accord ?", a: "Non, jamais. EcomPilot génère des suggestions que vous validez avant d'appliquer. Vous gardez le contrôle total sur chaque modification." },
  { q: "Faut-il une carte bancaire pour commencer ?", a: "Non. Vous démarrez gratuitement avec vos 30 premières actions, sans renseigner de carte. Vous n'en avez besoin que lorsque vous choisissez un plan payant." },
  { q: "Puis-je annuler à tout moment ?", a: "Oui, en 1 clic depuis votre tableau de bord. Aucun engagement, aucun frais caché. Si vous annulez, vous gardez l'accès jusqu'à la fin de votre période payée." },
  { q: "Quel modèle d'IA est utilisé ?", a: "EcomPilot utilise GPT-4o-mini d'OpenAI, optimisé pour le e-commerce francophone. Les descriptions sont naturelles, uniques et pensées pour convertir." },
];

export default function HomePage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("monthly");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('active');
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }, []);

  return (
    <div className="min-h-screen">
      {/* Navbar Apple-Style */}
      <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
        <div className="container flex items-center justify-between py-3">
          <Link href="/" className="text-xl font-bold text-gradient">
            EcomPilot
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm" style={{ color: 'var(--text-secondary)' }}>Fonctionnalités</Link>
            <Link href="#pricing" className="text-sm" style={{ color: 'var(--text-secondary)' }}>Tarifs</Link>
            <Link href="#testimonials" className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avis</Link>
            <Link href="#faq" className="text-sm" style={{ color: 'var(--text-secondary)' }}>FAQ</Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium" style={{ color: 'var(--text-link)' }}>
              Connexion
            </Link>
            <button 
              onClick={() => router.push('/signup')}
              className="btn btn-primary btn-small"
            >
              Essai gratuit
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="animate-fade-in-up">
          <h1>
            Optimisez votre boutique<br />Shopify avec l'IA
          </h1>
          <p style={{ margin: '24px auto 0' }}>
            Générez descriptions, titres et tags SEO en un clic.
            <br />
            Importez depuis AliExpress. Automatisez tout.
          </p>
          <div className="hero-cta animate-scale-in">
            <button 
              onClick={() => router.push('/signup')}
              className="btn btn-primary btn-large"
            >
              Commencer gratuitement
              <ArrowRight className="w-5 h-5" />
            </button>
            <button 
              onClick={() => router.push('/dashboard')}
              className="btn btn-secondary btn-large"
            >
              Voir la démo
            </button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" style={{ background: 'var(--surface-secondary)' }}>
        <div className="text-center mb-16 reveal">
          <h2 className="mb-4">
            Tout ce dont vous avez besoin
          </h2>
          <p style={{ margin: '0 auto' }}>
            Des outils puissants dans une interface simple et élégante.
          </p>
        </div>

        <div className="feature-grid">
          {FEATURES.map((feature, i) => (
            <div key={i} className="feature-card reveal" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="feature-icon">
                <feature.icon className="w-7 h-7" />
              </div>
              <h3 style={{ fontSize: '24px', marginBottom: '12px' }}>{feature.title}</h3>
              <p style={{ fontSize: '17px', margin: 0 }}>{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bulk Import Feature */}
      <section>
        <div className="text-center reveal">
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px', 
            padding: '8px 16px',
            background: 'rgba(0, 102, 204, 0.1)',
            borderRadius: '9999px',
            marginBottom: '24px',
            color: 'var(--apple-blue)',
            fontWeight: '600',
            fontSize: '14px',
          }}>
            <Star className="w-4 h-4" />
            NOUVEAU
          </div>
          <h2 className="mb-4">
            Import en Masse
          </h2>
          <p style={{ margin: '0 auto 40px', maxWidth: '600px' }}>
            Importez jusqu'à 100 produits simultanément depuis AliExpress, Alibaba, CJ Dropshipping et plus encore.
            Gain de temps : 90%.
          </p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="btn btn-primary btn-large"
          >
            Essayer l'import en masse
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{ background: 'var(--surface-secondary)' }}>
        <div className="text-center mb-16 reveal">
          <h2 className="mb-4">
            Des prix simples et transparents
          </h2>
          <p style={{ margin: '0 auto 32px' }}>
            Commencez gratuitement. Évoluez selon vos besoins.
          </p>

          {/* Billing Toggle */}
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '12px',
            padding: '6px',
            background: 'var(--surface-tertiary)',
            borderRadius: '9999px',
          }}>
            <button
              onClick={() => setBillingPeriod('monthly')}
              style={{
                padding: '10px 20px',
                borderRadius: '9999px',
                border: 'none',
                background: billingPeriod === 'monthly' ? 'var(--apple-blue)' : 'transparent',
                color: billingPeriod === 'monthly' ? 'white' : 'var(--text-secondary)',
                fontWeight: '600',
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              style={{
                padding: '10px 20px',
                borderRadius: '9999px',
                border: 'none',
                background: billingPeriod === 'yearly' ? 'var(--apple-blue)' : 'transparent',
                color: billingPeriod === 'yearly' ? 'white' : 'var(--text-secondary)',
                fontWeight: '600',
                fontSize: '15px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              Annuel
              <span style={{ 
                marginLeft: '6px', 
                fontSize: '12px', 
                opacity: 0.8,
                background: 'rgba(5, 150, 105, 0.2)',
                color: '#059669',
                padding: '2px 8px',
                borderRadius: '9999px',
              }}>
                -30%
              </span>
            </button>
          </div>
        </div>

        <div className="pricing-grid">
          {PLANS.map((plan, i) => (
            <div 
              key={i} 
              className={`pricing-card ${plan.popular ? 'popular' : ''} reveal`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px' }}>{plan.name}</h3>
              <p style={{ fontSize: '14px', margin: '0 0 24px', color: 'var(--text-tertiary)' }}>{plan.target}</p>
              <div className="price" style={{ fontSize: '48px', marginBottom: '24px' }}>
                {billingPeriod === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}€
                <span style={{ fontSize: '17px', fontWeight: '400' }}>/{billingPeriod === 'monthly' ? 'mois' : 'an'}</span>
              </div>
              <ul style={{ margin: '0 0 32px', padding: 0, listStyle: 'none' }}>
                {plan.features.map((feature, j) => (
                  <li key={j} style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '12px', 
                    marginBottom: '16px',
                    fontSize: '15px',
                  }}>
                    <Check className="w-5 h-5 flex-shrink-0" style={{ color: '#059669', marginTop: '2px' }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{feature}</span>
                  </li>
                ))}
              </ul>
              <button 
                onClick={() => router.push(`/signup?plan=${plan.id}`)}
                className={`btn ${plan.popular ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {plan.monthlyPrice === 0 ? 'Commencer' : 'Essai gratuit'}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials">
        <div className="text-center mb-16 reveal">
          <h2 className="mb-4">
            Ils nous font confiance
          </h2>
          <p style={{ margin: '0 auto' }}>
            Rejoignez des centaines de e-commerçants qui optimisent leur boutique avec EcomPilot.
          </p>
        </div>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '24px' 
        }}>
          {TESTIMONIALS.map((testimonial, i) => (
            <div 
              key={i} 
              className="card reveal"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-5 h-5" style={{ fill: '#FFB800', stroke: '#FFB800' }} />
                ))}
              </div>
              <p style={{ fontSize: '17px', lineHeight: '1.6', marginBottom: '20px', fontStyle: 'italic' }}>
                "{testimonial.quote}"
              </p>
              <div>
                <p style={{ fontWeight: '600', fontSize: '15px' }}>{testimonial.name}</p>
                <p style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ background: 'var(--surface-secondary)' }}>
        <div className="text-center mb-16 reveal">
          <h2 className="mb-4">
            Questions fréquentes
          </h2>
          <p style={{ margin: '0 auto' }}>
            Tout ce que vous devez savoir sur EcomPilot.
          </p>
        </div>

        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          {FAQ_ITEMS.map((item, i) => (
            <div 
              key={i} 
              className="reveal"
              style={{ 
                background: 'var(--surface-primary)',
                borderRadius: 'var(--radius-xl)',
                marginBottom: '16px',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{
                  width: '100%',
                  padding: '24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontWeight: '600', fontSize: '17px' }}>{item.q}</span>
                <ChevronDown 
                  className="w-5 h-5" 
                  style={{ 
                    transition: 'transform 0.3s ease',
                    transform: openFaq === i ? 'rotate(180deg)' : 'rotate(0deg)',
                  }} 
                />
              </button>
              {openFaq === i && (
                <div style={{ padding: '0 24px 24px', color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.6' }}>
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Final */}
      <section className="text-center" style={{ padding: '120px 20px' }}>
        <div className="reveal">
          <h2 className="mb-4">
            Prêt à optimiser votre boutique ?
          </h2>
          <p style={{ margin: '0 auto 40px', maxWidth: '600px' }}>
            Rejoignez EcomPilot aujourd'hui et transformez votre façon de gérer votre catalogue Shopify.
          </p>
          <button 
            onClick={() => router.push('/signup')}
            className="btn btn-primary btn-large"
          >
            Commencer gratuitement
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ 
        padding: '60px 20px', 
        borderTop: '1px solid var(--apple-gray-200)',
        background: 'var(--surface-primary)',
      }}>
        <div className="container">
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '40px',
            marginBottom: '40px',
          }}>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Produit</h4>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                <li style={{ marginBottom: '12px' }}><Link href="#features" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Fonctionnalités</Link></li>
                <li style={{ marginBottom: '12px' }}><Link href="#pricing" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Tarifs</Link></li>
                <li style={{ marginBottom: '12px' }}><Link href="/dashboard" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Dashboard</Link></li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Entreprise</h4>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                <li style={{ marginBottom: '12px' }}><Link href="/about" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>À propos</Link></li>
                <li style={{ marginBottom: '12px' }}><Link href="/contact" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Contact</Link></li>
                <li style={{ marginBottom: '12px' }}><Link href="/blog" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '16px' }}>Légal</h4>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                <li style={{ marginBottom: '12px' }}><Link href="/cgu" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>CGU</Link></li>
                <li style={{ marginBottom: '12px' }}><Link href="/cgv" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>CGV</Link></li>
                <li style={{ marginBottom: '12px' }}><Link href="/mentions-legales" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Mentions légales</Link></li>
              </ul>
            </div>
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            paddingTop: '32px',
            borderTop: '1px solid var(--apple-gray-200)',
          }}>
            <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', margin: 0 }}>
              © 2026 EcomPilot Elite. Tous droits réservés.
            </p>
            <div style={{ display: 'flex', gap: '24px' }}>
              <Link href="/twitter" style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>Twitter</Link>
              <Link href="/linkedin" style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>LinkedIn</Link>
              <Link href="/github" style={{ fontSize: '14px', color: 'var(--text-tertiary)' }}>GitHub</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
