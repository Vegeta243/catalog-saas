import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Créer un compte gratuit',
  description: 'Rejoignez EcomPilot Elite. 30 actions IA gratuites, sans carte bancaire. Optimisez votre boutique Shopify dès aujourd\'hui.',
}

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
