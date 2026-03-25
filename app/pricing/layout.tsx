import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tarifs — Gratuit, Starter 19€, Pro 49€, Scale 129€',
  description: 'Plans EcomPilot Elite. Plan gratuit avec 30 actions IA. Starter 19€/mois, Pro 49€/mois, Scale 129€/mois. Sans engagement.',
  openGraph: {
    title: 'Tarifs EcomPilot Elite',
    description: 'Commencez gratuitement. Upgradez quand vous voulez.',
  },
}

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
