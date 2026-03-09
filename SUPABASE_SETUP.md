# Tables à créer dans Supabase

## Action requise avant d'utiliser Concurrence et Calendrier

1. Va sur **https://supabase.com** → ton projet → **SQL Editor**
2. Copie-colle le contenu de `supabase/migrations/004_new_tables.sql`
3. Clique **Run**

### Tables créées :
- `competitors` — concurrents par utilisateur
- `competitor_snapshots` — historique d'analyse des concurrents
- `calendar_events` — événements du calendrier marketing

---

## Variables d'environnement requises

Dans Vercel → ton projet → **Settings → Environment Variables** :

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL de ton projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service role (secret) |
| `ADMIN_EMAIL` | Email de l'admin (ex: elliottshilenge5@gmail.com) |
| `ADMIN_PASSWORD` | Mot de passe admin (voir ci-dessous) |

---

## Identifiants Admin

Le panneau admin est accessible sur `/admin/login`.

**ADMIN_EMAIL** et **ADMIN_PASSWORD** sont définis dans `.env.local` (et à ajouter dans Vercel).
