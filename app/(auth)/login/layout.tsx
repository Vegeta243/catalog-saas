import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Connectez-vous à EcomPilot Elite pour optimiser votre boutique Shopify avec l\'IA.',
  robots: { index: false, follow: false },
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
