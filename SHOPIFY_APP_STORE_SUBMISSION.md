# Shopify App Store Submission — EcomPilot

## App Overview

| Field | Value |
|-------|-------|
| App name | EcomPilot |
| Tagline | Optimisez votre catalogue Shopify avec l'IA |
| Category | Store management / Inventory & products |
| Pricing model | Freemium — Free / Starter €19 / Pro €49 / Agency €149 per month |
| Support URL | https://www.ecompilotelite.com/support |
| Privacy Policy URL | https://www.ecompilotelite.com/privacy |
| App URL | https://www.ecompilotelite.com |

---

## Pre-submission Checklist

### 1. API & Architecture

- [x] All Shopify API calls use **GraphQL Admin API 2024-01** (no deprecated REST endpoints except image upload via attachment still pending migration)
- [x] Pagination uses GraphQL cursor-based pagination (`after`, `pageInfo.hasNextPage`)
- [x] GID format used for all mutations (`gid://shopify/Product/{id}`)
- [x] `ShopifyTokenExpiredError` thrown on 401/403 responses — surfaces to user as reconnect prompt
- [x] No raw `fetch` to Shopify outside of `lib/shopify-graphql.ts`

### 2. OAuth & Scopes

Requested scopes (declared in `app/api/auth/shopify/route.ts`):

```
read_products
write_products
read_inventory
write_inventory
read_price_rules
write_price_rules
read_product_listings
read_orders
read_analytics
read_customers
write_customers
```

- [x] All scopes justified by app features
- [x] No scopes requested beyond what is used
- [x] OAuth flow: Authorization Code Grant via `/api/auth/shopify` → redirect to Shopify → callback at `/api/auth/shopify/callback`

### 3. Billing API

- [x] Uses Shopify Billing API (`appSubscriptionCreate` mutation) — NOT Stripe for Shopify-embedded billing
- [x] Plans: Starter €19 / Pro €49 / Agency €149 per month (`EVERY_30_DAYS`)
- [x] `test: true` set in non-production environments
- [x] Pending subscription stored in `users.shopify_pending_plan`
- [x] Subscription confirmed at `/api/shopify/billing/confirm` after Shopify redirect
- [x] `subscription_status` updated to `active` on confirmation

### 4. GDPR Webhooks

Required GDPR webhooks must be registered and handled:

| Webhook | Path | Status |
|---------|------|--------|
| `customers/data_request` | `/api/webhooks/shopify/gdpr/customers-data-request` | ✅ Implemented — HMAC verified, returns 200 (no customer PII stored) |
| `customers/redact` | `/api/webhooks/shopify/gdpr/customers-redact` | ✅ Implemented — HMAC verified, returns 200 (no customer PII stored) |
| `shop/redact` | `/api/webhooks/shopify/gdpr/shop-redact` | ✅ Implemented — HMAC verified, deletes shops/import_history/action_history rows by shop_domain |

All three handlers:
1. Verify Shopify HMAC signature (`X-Shopify-Hmac-Sha256`) using `crypto.timingSafeEqual`
2. Return HTTP 200 immediately
3. `shop/redact` performs data deletion synchronously (small dataset per shop)

### 5. App Bridge (Embedded App)

- [ ] Install `@shopify/app-bridge-react` or `@shopify/app-bridge`
- [ ] Wrap app in `AppBridgeProvider` with `apiKey` + `host` params from OAuth callback
- [ ] Replace browser `alert()`/`confirm()` with App Bridge `Modal`/`Toast`
- [ ] Navigation actions use `Redirect.Action.APP` for embedded context

**Note**: EcomPilot currently runs as a standalone web app (separate domain). If embedded mode is required for App Store listing, App Bridge integration needs to be added.

### 6. Security

- [x] HMAC verification on all inbound Shopify webhooks
- [x] Admin routes protected by `verifyAdminSession` cookie check
- [x] Supabase RLS enforced — users can only access their own data
- [x] Service role key only used server-side (never exposed to client)
- [x] No secrets in client-side code
- [x] CRON_SECRET environment variable gates email sequence endpoint
- [x] SQL injection not possible — all DB queries go through Supabase client (parameterized)
- [x] XSS protection: Next.js escapes JSX by default; no `dangerouslySetInnerHTML` with user input

### 7. Performance

- [x] GraphQL queries use field selection (no over-fetching)
- [x] Product list uses cursor pagination (50 per page)
- [x] Image upload still uses REST attachment API (acceptable — GraphQL files API requires staged uploads which adds complexity)

### 8. App Listing Content

#### Screenshots needed (1280×800 or 2560×1600):
1. Dashboard overview with health score
2. Bulk edit / AI optimization flow
3. Product list with SEO scores
4. Pricing page

#### Demo store:
- Create a Shopify development store with 20+ products
- Run through full install → optimize → billing flow
- Record a ≤3 minute walkthrough video

### 9. Environment Variables Required

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role (server only) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (client) |
| `SHOPIFY_API_KEY` | Shopify app client ID |
| `SHOPIFY_API_SECRET` | Shopify app client secret |
| `SHOPIFY_APP_URL` | `https://www.ecompilotelite.com` |
| `OPENAI_API_KEY` | For AI title/description generation |
| `RESEND_API_KEY` | For onboarding email sequence |
| `CRON_SECRET` | Gates the `/api/email/sequence` endpoint |
| `STRIPE_SECRET_KEY` | For Stripe checkout (non-Shopify billing) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook HMAC |

### 10. Pending Tasks Before Submission

- [x] Implement 3 GDPR webhook handlers (done — `/api/webhooks/shopify/gdpr/`)
- [x] Add `is_test_account`, `email_sequence_step`, `last_email_sent_at`, `shopify_subscription_id`, `shopify_pending_plan` columns to `users` table in Supabase
- [x] SQL: `ALTER TABLE users ADD COLUMN IF NOT EXISTS is_test_account BOOLEAN DEFAULT false;`
- [x] SQL: `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_sequence_step INTEGER DEFAULT 0;`
- [x] SQL: `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ;`
- [x] SQL: `ALTER TABLE users ADD COLUMN IF NOT EXISTS shopify_subscription_id TEXT;`
- [x] SQL: `ALTER TABLE users ADD COLUMN IF NOT EXISTS shopify_pending_plan TEXT;`
- [x] SQL: `UPDATE users SET is_test_account = true;` (marks all existing users as test)
- [ ] Register GDPR webhook URLs in Shopify Partners Dashboard → App Setup → GDPR webhooks
- [ ] Create `/app/privacy/page.tsx` English privacy policy page (Shopify requires English URL)
- [ ] Test full OAuth install flow end-to-end on development store
- [ ] Test Billing API confirm flow with `test: true` subscriptions
- [ ] Capture 4 screenshots (1280×800): Dashboard, Bulk Edit, Product List, Pricing
- [ ] Record ≤3 min demo video on development store
- [ ] Submit to Shopify Partners dashboard

---

## App Store Description (FR)

**EcomPilot** automatise l'optimisation de votre catalogue Shopify grâce à l'intelligence artificielle.

**Fonctionnalités principales :**
- Réécriture des titres et descriptions avec ChatGPT
- Optimisation SEO en masse (titres, balises meta, tags)
- Mise à jour des prix sur tout le catalogue en quelques clics
- Import de produits depuis AliExpress
- Score de visibilité produit en temps réel
- Tableau de bord santé du catalogue

**Plans disponibles :**
- Free : 30 actions/mois
- Starter (€19/mois) : 500 actions
- Pro (€49/mois) : 5 000 actions
- Agency (€149/mois) : illimité
