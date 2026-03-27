'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const FEATURES = [
  {
    emoji: '',
    title: 'Import de produits',
    subtitle: 'Importez depuis AliExpress, CJDropshipping, DHgate, Alibaba, Banggood et plus encore.',
    href: '/dashboard/import',
    ctaLabel: 'Ouvrir l\'import →',
    steps: [
      { step: 1, title: 'Copiez l\'URL du produit', desc: 'Ouvrez le produit sur AliExpress (ou autre) et copiez l\'URL depuis la barre d\'adresse de votre navigateur.' },
      { step: 2, title: 'Collez dans le champ', desc: 'Collez l\'URL dans le champ prévu. Utilisez "Coller en masse" pour importer plusieurs produits à la fois (max 50 URLs).' },
      { step: 3, title: 'Prévisualisez', desc: 'Cliquez sur Prévisualiser pour vérifier titre, prix et images avant d\'importer. Corrigez si nécessaire.' },
      { step: 4, title: 'Importez', desc: 'Cliquez Importer. Le produit est ajouté à votre catalogue EcomPilot et synchronisé avec Shopify si une boutique est connectée.' },
    ],
  },
  {
    emoji: '',
    title: 'Optimisation IA',
    subtitle: 'Générez des titres et descriptions SEO optimisés pour vos produits en 1 clic.',
    href: '/dashboard/ai',
    ctaLabel: 'Optimiser mes produits →',
    steps: [
      { step: 1, title: 'Connectez votre boutique', desc: 'L\'optimisation IA s\'applique à vos produits Shopify. Commencez par connecter votre boutique dans Mes boutiques.' },
      { step: 2, title: 'Sélectionnez des produits', desc: 'Sur la page Optimisation IA, cochez les produits à améliorer. Vous pouvez filtrer par score SEO (Faible / Moyen / Excellent).' },
      { step: 3, title: 'Générez le contenu', desc: 'Cliquez sur le bouton IA d\'un produit pour générer titre, description et tags SEO optimisés automatiquement.' },
      { step: 4, title: 'Prévisualisez et appliquez', desc: 'Vérifiez le contenu généré dans l\'aperçu, puis appliquez en un clic pour mettre à jour votre boutique Shopify directement.' },
    ],
  },
  {
    emoji: '',
    title: 'Modification en masse',
    subtitle: 'Modifiez les prix, titres et descriptions de centaines de produits en une seule action.',
    href: '/dashboard/products',
    ctaLabel: 'Modifier mes produits →',
    steps: [
      { step: 1, title: 'Accédez à la page Produits', desc: 'La page "Modifier en masse" affiche tous vos produits Shopify avec leur score SEO, prix et statut.' },
      { step: 2, title: 'Sélectionnez les produits', desc: 'Cochez les produits à modifier. Utilisez "Tous" pour sélectionner l\'intégralité du catalogue. La barre de recherche permet de filtrer par nom.' },
      { step: 3, title: 'Choisissez une action', desc: 'Choisissez parmi : modifier le prix (% ou valeur fixe), changer le statut, appliquer un tag en masse, ou générer du contenu IA pour la sélection.' },
      { step: 4, title: 'Appliquez', desc: 'Confirmez l\'action. Les modifications sont appliquées instantanément à tous les produits sélectionnés et synchronisées avec Shopify.' },
    ],
  },
  {
    emoji: '',
    title: 'Connexion boutique Shopify',
    subtitle: 'Synchronisez votre boutique Shopify pour accéder à toutes les fonctionnalités.',
    href: '/dashboard/shops',
    ctaLabel: 'Gérer mes boutiques →',
    steps: [
      { step: 1, title: 'Ajoutez votre boutique', desc: 'Dans Mes boutiques, cliquez "Ajouter une boutique". Entrez votre domaine Shopify (ex : ma-boutique ou ma-boutique.myshopify.com).' },
      { step: 2, title: 'Connectez via OAuth', desc: 'Cliquez sur le bouton bleu "Connecter" sur la carte de votre boutique. Vous serez redirigé vers Shopify pour autoriser l\'accès.' },
      { step: 3, title: 'Vérifiez la connexion', desc: 'Une fois connecté, le badge vert "Connecté" apparaît. Vos produits sont maintenant accessibles dans EcomPilot.' },
      { step: 4, title: 'Gérez plusieurs boutiques', desc: 'EcomPilot supporte plusieurs boutiques. Basculez entre elles via le menu Mes boutiques. Chaque boutique a son propre historique.' },
    ],
  },
  {
    emoji: '',
    title: 'Forfaits et crédits',
    subtitle: 'Comprenez votre quota d\'actions IA et comment upgrader votre forfait.',
    href: '/dashboard/credits',
    ctaLabel: 'Voir mon forfait →',
    steps: [
      { step: 1, title: 'Actions IA disponibles', desc: 'Chaque action IA (génération de titre, description, etc.) consomme 1 crédit. L\'offre gratuite inclut 30 actions par mois.' },
      { step: 2, title: 'Suivi de la consommation', desc: 'La barre de progression dans la sidebar gauche indique votre consommation en temps réel. Elle se réinitialise chaque mois.' },
      { step: 3, title: 'Upgrader votre forfait', desc: 'Dans Mon forfait, comparez les offres (Starter, Pro, Business) et choisissez celle qui correspond à votre volume de produits.' },
      { step: 4, title: 'Bonus parrainage', desc: 'Parrainez un ami et gagnez des crédits bonus. Votre filleul bénéficie également d\'un avantage à l\'inscription.' },
    ],
  },
]

export default function FeaturesHelpPage() {
  useEffect(() => { document.title = 'Guide des fonctionnalités | EcomPilot' }, [])

  return (
    <div style={{ padding: '32px 32px 64px', maxWidth: 900, margin: '0 auto' }}>
      {/* Nav */}
      <div style={{ marginBottom: 32 }}>
        <Link
          href="/dashboard/help"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#8b9fc4', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginBottom: 20 }}
        >
          <ArrowLeft style={{ width: 14, height: 14 }} />
          Retour au centre d&apos;aide
        </Link>
        <h1 style={{ color: '#f0f4ff', fontWeight: 900, fontSize: 28, marginBottom: 8 }}>Guide des fonctionnalités</h1>
        <p style={{ color: '#8b9fc4', fontSize: 15, lineHeight: 1.6 }}>
          Découvrez comment utiliser chaque fonctionnalité d&apos;EcomPilot Elite pour maximiser vos ventes.
        </p>
      </div>

      {/* Feature cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {FEATURES.map(feature => (
          <div
            key={feature.title}
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 20,
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{ padding: '24px 28px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 26, flexShrink: 0,
                  }}>
                    {feature.emoji}
                  </div>
                  <div>
                    <h2 style={{ color: '#f0f4ff', fontWeight: 800, fontSize: 18, marginBottom: 4 }}>{feature.title}</h2>
                    <p style={{ color: '#8b9fc4', fontSize: 13, lineHeight: 1.5 }}>{feature.subtitle}</p>
                  </div>
                </div>
                <Link
                  href={feature.href}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', background: '#4f8ef7', color: '#fff',
                    borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none',
                    flexShrink: 0,
                  }}
                >
                  {feature.ctaLabel}
                </Link>
              </div>
            </div>

            {/* Steps */}
            <div style={{ padding: '20px 28px 24px' }}>
              <p style={{ color: '#4a5878', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>GUIDE ÉTAPE PAR ÉTAPE</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {feature.steps.map(s => (
                  <div
                    key={s.step}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 14,
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: 8, background: '#4f8ef7',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontSize: 12, fontWeight: 900, flexShrink: 0,
                      }}>
                        {s.step}
                      </div>
                      <p style={{ color: '#f0f4ff', fontWeight: 700, fontSize: 13 }}>{s.title}</p>
                    </div>
                    <p style={{ color: '#8b9fc4', fontSize: 12, lineHeight: 1.6 }}>{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer CTA */}
      <div style={{
        marginTop: 40, padding: '28px 32px',
        background: 'rgba(79,142,247,0.08)',
        border: '1px solid rgba(79,142,247,0.20)',
        borderRadius: 20, textAlign: 'center',
      }}>
        <p style={{ color: '#f0f4ff', fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Besoin d&apos;aide supplémentaire ?</p>
        <p style={{ color: '#8b9fc4', fontSize: 14, marginBottom: 20 }}>Notre équipe support est disponible pour répondre à toutes vos questions.</p>
        <Link
          href="/dashboard/help"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '10px 22px', background: '#4f8ef7', color: '#fff',
            borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none',
          }}
        >
          Ouvrir un ticket de support
        </Link>
      </div>
    </div>
  )
}
