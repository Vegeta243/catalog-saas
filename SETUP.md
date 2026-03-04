# EcomPilot — Guide d'installation

## Prérequis

- **Node.js** >= 18.x
- **pnpm** >= 9.x
- Compte **Supabase** (gratuit)
- Compte **Stripe** (mode test)
- Clé API **OpenAI** (optionnel, pour les fonctionnalités IA)
- Boutique **Shopify** avec API access

## Installation

```bash
git clone <repo-url>
cd catalog-saas
pnpm install
```

## Configuration des variables d'environnement

Créez un fichier `.env.local` à la racine du projet :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...votre-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...votre-service-role-key

# Site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Shopify
SHOPIFY_API_KEY=votre-api-key
SHOPIFY_API_SECRET=votre-api-secret

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_STARTER_PRICE_ID=price_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_SCALE_PRICE_ID=price_...

# OpenAI
OPENAI_API_KEY=sk-...

# Admin (emails séparés par des virgules)
ADMIN_EMAILS=admin@votredomaine.com
```

## Configuration Supabase

### 1. Tables SQL

Exécutez ces requêtes dans l'éditeur SQL de Supabase :

```sql
-- Table utilisateurs étendue
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  first_name TEXT,
  plan TEXT DEFAULT 'free',
  credits INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table boutiques Shopify
CREATE TABLE IF NOT EXISTS public.shops (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  shop_url TEXT NOT NULL,
  access_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table crédits utilisateur
CREATE TABLE IF NOT EXISTS public.user_credits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  credits_used INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT NOW()
);

-- Table contenu du site (admin)
CREATE TABLE IF NOT EXISTS public.site_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. Row Level Security (RLS)

```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can view own shops" ON public.shops FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own shops" ON public.shops FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own credits" ON public.user_credits FOR SELECT USING (auth.uid() = user_id);
```

### 3. Templates d'emails

Dans Supabase Dashboard → Authentication → Email Templates :

- **Confirm signup** : collez le contenu de `emails/verify-email.html`
- **Reset password** : collez le contenu de `emails/reset-password.html`

### 4. URL de redirection

Dans Authentication → URL Configuration :
- Site URL : `http://localhost:3000`
- Redirect URLs : `http://localhost:3000/auth/callback`

### 5. Google OAuth (optionnel)

Dans Authentication → Providers → Google :
1. Créez des identifiants OAuth dans Google Cloud Console
2. Ajoutez le Client ID et Client Secret dans Supabase

## Configuration Stripe

1. Créez 3 produits dans Stripe Dashboard (Starter, Pro, Scale)
2. Récupérez les Price IDs et ajoutez-les dans `.env.local`
3. Pour les webhooks locaux : `stripe listen --forward-to localhost:3000/api/stripe/webhook`

## Lancement

```bash
pnpm dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000).

## Structure du projet

```
app/
├── page.tsx                    # Landing page
├── (auth)/
│   ├── login/page.tsx          # Connexion
│   ├── signup/page.tsx         # Inscription
│   ├── forgot-password/page.tsx # Mot de passe oublié
│   ├── reset-password/page.tsx # Nouveau mot de passe
│   └── verify-email/page.tsx   # Vérification email
├── auth/callback/route.ts      # OAuth callback
├── (dashboard)/
│   ├── layout.tsx              # Layout sidebar
│   └── dashboard/page.tsx      # Tableau de bord
├── api/
│   └── stripe/
│       ├── checkout/route.ts   # Création session Stripe
│       └── webhook/route.ts    # Webhook Stripe
lib/
├── supabase/
│   ├── client.ts               # Client navigateur
│   └── server.ts               # Client serveur
├── validations.ts              # Schémas Zod
emails/
├── verify-email.html           # Template vérification
├── reset-password.html         # Template reset password
└── welcome.html                # Template bienvenue
```
