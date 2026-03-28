'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, MessageSquare } from 'lucide-react';

const FAQ_ITEMS = [
  {
    category: 'Mon abonnement',
    questions: [
      { q: 'Quelles sont les limites du plan gratuit ?', a: "Le plan gratuit inclut 30 actions IA par mois, 1 boutique Shopify et jusqu'à 50 produits. Il ne nécessite aucune carte bancaire." },
      { q: 'Comment upgrader mon abonnement ?', a: 'Rendez-vous dans Mon forfait > Changer de plan. Vous pouvez upgrader à tout moment et le changement est immédiat.' },
      { q: 'Puis-je annuler mon abonnement ?', a: 'Oui, vous pouvez annuler à tout moment depuis Mon forfait > Gérer mon abonnement. Aucun frais d\'annulation. Vous gardez l\'accès jusqu\'à la fin de la période payée.' },
      { q: "Que se passe-t-il quand j'atteins ma limite d'actions ?", a: 'Vos actions sont réinitialisées le 1er de chaque mois. Vous pouvez aussi upgrader pour obtenir plus d\'actions immédiatement.' },
      { q: 'Mes 30 actions gratuites sont-elles renouvelées chaque mois ?', a: 'Oui, les 30 actions gratuites du plan Free sont renouvelées automatiquement le 1er de chaque mois.' },
    ],
  },
  {
    category: 'Shopify',
    questions: [
      { q: 'Comment connecter ma boutique Shopify ?', a: 'Allez dans Mes boutiques > Ajouter une boutique. Entrez votre domaine Shopify et suivez les étapes d\'autorisation OAuth.' },
      { q: 'Mes modifications sont-elles sauvegardées sur Shopify ?', a: 'Oui, toutes les modifications que vous sauvegardez dans EcomPilot sont synchronisées en temps réel avec votre boutique Shopify.' },
      { q: 'Puis-je connecter plusieurs boutiques ?', a: 'Oui selon votre plan : Starter (1 boutique), Pro (3 boutiques), Agency (10 boutiques).' },
      { q: 'Comment synchroniser mes produits ?', a: 'Dans Mes produits, cliquez sur le bouton Synchroniser Shopify. Tous vos produits seront importés dans EcomPilot.' },
    ],
  },
  {
    category: 'Optimisation IA',
    questions: [
      { q: "Que fait l'optimisation IA ?", a: "L'IA génère des titres SEO, descriptions marketing et méta-données optimisées pour chacun de vos produits en quelques secondes." },
      { q: 'Combien de temps prend une optimisation ?', a: "Moins de 15 secondes par produit. Pour une optimisation en masse, comptez environ 30 secondes pour 10 produits." },
      { q: "L'IA respecte-t-elle mon style de marque ?", a: "Vous pouvez configurer votre ton de marque dans les paramètres. L'IA s'adapte à votre univers." },
      { q: 'Puis-je modifier le contenu généré ?', a: 'Oui, tout le contenu généré est entièrement modifiable avant d\'être sauvegardé sur Shopify.' },
    ],
  },
  {
    category: 'Import de produits',
    questions: [
      { q: 'Quelles plateformes sont supportées ?', a: 'AliExpress, CJDropshipping, DHgate, Alibaba, Banggood et tout site e-commerce via URL.' },
      { q: 'Combien de produits puis-je importer en une fois ?', a: "Jusqu'à 50 URLs en une seule importation batch." },
      { q: 'Les images sont-elles importées ?', a: 'Oui, toutes les images disponibles sur la page produit sont importées automatiquement.' },
      { q: 'Les produits importés sont-ils directement sur Shopify ?', a: "Oui si vous activez l'option 'Synchroniser avec Shopify' avant l'import." },
    ],
  },
  {
    category: 'Données et sécurité',
    questions: [
      { q: 'Mes données sont-elles sécurisées ?', a: 'Oui. Vos données sont chiffrées, stockées sur des serveurs européens conformes RGPD. Nous n\'accédons jamais à vos données sans votre consentement.' },
      { q: 'Comment supprimer mon compte ?', a: 'Allez dans Paramètres > Données personnelles > Supprimer mon compte. Ou contactez-nous à support@ecompilotelite.com.' },
      { q: 'Mes données Shopify sont-elles partagées ?', a: 'Non. Vos données Shopify restent privées et ne sont jamais partagées avec des tiers.' },
      { q: 'Comment exporter mes données ?', a: 'Dans Paramètres > Données personnelles > Exporter mes données. Vous recevrez un fichier JSON avec toutes vos données.' },
    ],
  },
  {
    category: 'Support',
    questions: [
      { q: 'Comment contacter le support ?', a: 'Via le formulaire de contact dans Assistance > Nous contacter, par email à support@ecompilotelite.com, ou via notre chat en bas à droite.' },
      { q: 'Quel est le délai de réponse du support ?', a: 'Nous répondons sous 24h en semaine. Les plans Pro et Agency bénéficient d\'un support prioritaire sous 4h.' },
      { q: "Y a-t-il de la documentation ?", a: "Oui, consultez notre Centre d'aide dans la section Assistance du menu. Chaque fonctionnalité dispose d'une documentation détaillée." },
    ],
  },
];

export default function FAQPage() {
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => { document.title = 'FAQ | EcomPilot'; }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-0 py-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Foire aux questions
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Trouvez rapidement une réponse à vos questions
        </p>
      </div>

      {/* Contact hint */}
      <div className="flex items-start gap-3 p-4 rounded-xl border mb-6"
        style={{ background: 'rgba(79,142,247,0.06)', borderColor: 'rgba(79,142,247,0.2)' }}>
        <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#4f8ef7' }} />
        <div>
          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Vous ne trouvez pas votre réponse ?
          </p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            <a href="/dashboard/contact" style={{ color: '#4f8ef7', textDecoration: 'none' }}>
              Contactez-nous
            </a>{' '}ou écrivez à{' '}
            <a href="mailto:support@ecompilotelite.com" style={{ color: '#4f8ef7', textDecoration: 'none' }}>
              support@ecompilotelite.com
            </a>
          </p>
        </div>
      </div>

      {FAQ_ITEMS.map((cat) => (
        <div key={cat.category} className="mb-6">
          <h2 className="text-xs font-semibold uppercase mb-3" style={{ color: '#4f8ef7', letterSpacing: '0.06em' }}>
            {cat.category}
          </h2>
          <div className="space-y-2">
            {cat.questions.map((item, i) => {
              const key = cat.category + i;
              const isOpen = open === key;
              return (
                <div key={key} className="rounded-xl border overflow-hidden"
                  style={{ background: 'var(--surface-primary)', borderColor: 'var(--apple-gray-200)' }}>
                  <button
                    onClick={() => setOpen(isOpen ? null : key)}
                    className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left"
                  >
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {item.q}
                    </span>
                    <ChevronDown
                      className="w-4 h-4 flex-shrink-0 transition-transform"
                      style={{
                        color: 'var(--text-secondary)',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <div className="mt-8 text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
        <a href="/mentions-legales" className="hover:underline mx-2">Mentions légales</a>·
        <a href="/cgv" className="hover:underline mx-2">CGV</a>·
        <a href="/politique-confidentialite" className="hover:underline mx-2">Confidentialité</a>
      </div>
    </div>
  );
}
