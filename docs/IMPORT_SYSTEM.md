# 📦 Système d'Import en Masse — EcomPilot Elite

## 🎯 Vue d'ensemble

Le système d'import en masse permet d'importer des produits depuis **6 plateformes majeures** avec :
- **Scraping multi-stratégies** pour un taux de réussite maximal
- **Réessai automatique intelligent** avec backoff exponentiel
- **Synchronisation Shopify** en un clic
- **Calcul de marge automatique**
- **Jusqu'à 100 URLs par lot**

---

## 🌐 Plateformes Supportées

| Plateforme | Statut | Stratégies | Taux de réussite |
|------------|--------|------------|------------------|
| **AliExpress** | ✅ Amélioré | 4 (RapidAPI, ScrapingBee, JSON, HTML) | ~85-95% |
| **Alibaba** | ✅ Amélioré | 2 (HTML, JSON) | ~70-80% |
| **CJ Dropshipping** | ✅ Amélioré | 2 (HTML, Demo fallback) | ~60-70% |
| **DHgate** | ✅ Amélioré | 2 (HTML, JSON) | ~65-75% |
| **Banggood** | ✅ Amélioré | 2 (HTML, JSON) | ~60-70% |
| **Temu** | ✅ Nouveau | 2 (HTML, JSON) | ~50-65% |

---

## 🚀 Comment Utiliser

### 1. **Accéder à la page d'import**
```
Dashboard → Import de produits
```
ou directement : `/dashboard/import`

### 2. **Ajouter des URLs**

**Méthode 1 : Une par une**
- Cliquez sur "+ Ajouter"
- Collez l'URL du produit
- Répétez jusqu'à 100 URLs

**Méthode 2 : En masse (recommandé)**
- Cliquez sur "Coller en masse"
- Collez toutes vos URLs (une par ligne, virgule ou espace)
- Le système détecte automatiquement les plateformes

### 3. **Configurer les paramètres**

| Paramètre | Description | Recommandation |
|-----------|-------------|----------------|
| **Synchroniser Shopify** | Pousse les produits vers Shopify après import | ✅ Activé si boutique connectée |
| **Réessai automatique** | Réessaie les imports échoués (max 3 fois) | ✅ Activé |
| **Marge commerciale** | Multiplicateur de prix (1.1x à 5x) | 1.5x à 2.5x selon niche |

### 4. **Lancer l'import**

1. **Aperçu** (optionnel) : Prévisualisez le premier produit
2. **Importer** : Lance l'import en masse
3. **Suivez la progression** : Barre de progression en temps réel
4. **Résultats** : Consultez les succès/échecs

### 5. **Réessayer les échecs**

Si certains produits ont échoué :
- Cliquez sur "Réessayer les échecs"
- Le système réessaie automatiquement (si activé)
- Jusqu'à 3 tentatives avec backoff exponentiel

---

## ⚙️ Configuration Requise

### Variables d'environnement

Ajoutez ces clés à `.env.local` et Vercel :

```env
# ─── Scraping APIs (OPTIONNEL mais RECOMMANDÉ) ──────────────────────────────
# RapidAPI (gratuit, 500 req/mois)
RAPIDAPI_KEY=votre_cle_rapidapi
RAPIDAPI_HOST=aliexpress-datahub.p.rapidapi.com

# ScrapingBee (gratuit, 1000 req/mois)
SCRAPINGBEE_API_KEY=votre_cle_scrapingbee
# ou
SCRAPINGBEE_KEY=votre_cle_scrapingbee

# ─── Shopify (pour synchronisation) ─────────────────────────────────────────
SHOPIFY_STORE_URL=https://votre-boutique.myshopify.com
# Le token est stocké automatiquement via OAuth

# ─── Supabase (déjà configuré) ──────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Installation des migrations

Exécutez la migration dans Supabase SQL Editor :

```bash
# 1. Connectez-vous à Supabase Dashboard
# 2. Allez dans SQL Editor
# 3. Copiez-collez le contenu de :
#    supabase/migrations/021_import_jobs.sql
# 4. Exécutez
```

**Vérification :**
```sql
SELECT COUNT(*) FROM import_jobs;
-- Devrait retourner 0 (ou plus si déjà utilisé)
```

---

## 🔧 Dépannage

### Problème : "URL AliExpress invalide"

**Cause :** L'URL ne contient pas d'ID produit valide

**Solution :**
```
❌ https://www.aliexpress.com/
✅ https://www.aliexpress.com/item/1005006294704696.html
✅ https://fr.aliexpress.com/item/1005006294704696.html
```

### Problème : "Échec de l'import - Toutes les méthodes ont échoué"

**Causes possibles :**
1. Produit supprimé ou indisponible
2. Blocage anti-bot (CAPTCHA)
3. Clés API manquantes ou expirées

**Solutions :**
1. Vérifiez que l'URL est accessible dans un navigateur
2. Ajoutez les clés RapidAPI/ScrapingBee
3. Réessayez dans quelques minutes
4. Utilisez le réessai automatique

### Problème : "Maximum 100 URLs par lot"

**Solution :** Divisez votre import en plusieurs lots de 100 URLs maximum.

### Problème : "Aucune boutique connectée"

**Solution :**
1. Allez dans `/dashboard/shops`
2. Connectez votre boutique Shopify
3. Revenez à l'import

---

## 📊 Performances

### Temps d'import moyens (par produit)

| Plateforme | Sans API | Avec RapidAPI | Avec ScrapingBee |
|------------|----------|---------------|------------------|
| AliExpress | 3-8s | 1-2s | 5-10s |
| Alibaba | 2-5s | N/A | 5-8s |
| CJ Dropshipping | 2-4s | N/A | 5-8s |
| DHgate | 2-4s | N/A | 4-7s |
| Banggood | 2-4s | N/A | 4-7s |
| Temu | 2-5s | N/A | 5-8s |

### Optimisations incluses

- ✅ **Parallélisation** : 5 URLs traitées simultanément
- ✅ **Cache** : Images proxyfiées en cache 24h
- ✅ **Retry intelligent** : Backoff exponentiel (1s, 2s, 4s)
- ✅ **Timeout adaptatif** : 15-60s selon la méthode

---

## 🛠️ API Endpoints

### `POST /api/import/preview`

Prévisualise un produit avant import.

**Body :**
```json
{
  "url": "https://www.aliexpress.com/item/...",
  "margin": 1.5
}
```

**Response :**
```json
{
  "success": true,
  "preview": {
    "platform": "aliexpress",
    "product": {
      "title": "...",
      "price": 19.99,
      "supplierPrice": 9.99,
      "images": ["...", "..."],
      ...
    }
  }
}
```

---

### `POST /api/import/bulk`

Importe plusieurs produits en masse.

**Body :**
```json
{
  "urls": [
    "https://www.aliexpress.com/item/...",
    "https://cjdropshipping.com/product/..."
  ],
  "push_to_shopify": true,
  "auto_retry": true,
  "margin": 1.5
}
```

**Response :**
```json
{
  "success": true,
  "job_id": "uuid",
  "total": 10,
  "imported": 8,
  "failed": 2,
  "results": [...],
  "stats": {
    "success_rate": 80,
    "platforms": { "aliexpress": 5, "cjdropshipping": 3 }
  }
}
```

---

### `GET /api/import/history`

Récupère l'historique des imports.

**Response :**
```json
{
  "success": true,
  "jobs": [
    {
      "id": "uuid",
      "platform": "aliexpress",
      "status": "completed",
      "imported_count": 8,
      "total_products": 10,
      "created_at": "2026-03-26T10:30:00Z"
    }
  ]
}
```

---

### `GET /api/import/test`

Teste le système d'import.

**Response :**
```json
{
  "success": true,
  "results": [
    {
      "platform": "AliExpress",
      "detected": "aliexpress",
      "success": true,
      "duration": "1234ms",
      "title": "Produit test..."
    }
  ],
  "message": "✅ Tous les tests ont réussi"
}
```

---

## 🎯 Bonnes Pratiques

### ✅ À faire

1. **Grouper par plateforme** : Importez les produits AliExpress ensemble, puis CJ, etc.
2. **Commencer petit** : Testez avec 5-10 URLs avant les gros imports
3. **Vérifier l'aperçu** : Prévisualisez toujours le premier produit
4. **Utiliser le réessai** : Activez le réessai automatique pour les gros imports
5. **Surveiller les quotas** : Vérifiez vos limites API (RapidAPI: 500/mois gratuit)

### ❌ À éviter

1. **URLs invalides** : Vérifiez que toutes les URLs sont accessibles
2. **Trop d'URLs d'un coup** : Max 100 URLs par lot
3. **Désactiver le retry** : Vous perdrez des produits importables
4. **Marge trop faible** : Minimum 1.3x pour être rentable

---

## 📈 Statistiques & Suivi

### Tableaux de bord

Consultez :
- `/dashboard/import` : Import en cours
- `/dashboard/import/history` : Historique complet
- `/dashboard/products` : Produits importés

### Métriques clés

- **Taux de réussite** : Objectif > 80%
- **Temps moyen par produit** : Objectif < 5s
- **Produits importés aujourd'hui** : Voir dashboard
- **Échecs récurrents** : Identifier les URLs problématiques

---

## 🔐 Sécurité

- ✅ **RLS Supabase** : Chaque utilisateur ne voit que ses imports
- ✅ **Validation des URLs** : Seules les URLs HTTPs sont acceptées
- ✅ **Rate limiting** : Protection contre les abus
- ✅ **Chiffrement** : Tokens Shopify chiffrés AES-256-GCM

---

## 🆘 Support

**Problème technique ?**
1. Consultez cette documentation
2. Testez avec `/api/import/test`
3. Vérifiez les logs Vercel
4. Contactez : support@ecompilotelite.com

**Logs utiles :**
```bash
# Vercel Logs
vercel logs --follow

# Ou dans Vercel Dashboard :
# Project → Activity → Function Logs
```

---

## 📝 Changelog

### v2.0.0 — 26 Mars 2026
- ✅ Refonte complète du système d'import
- ✅ Ajout de 6 plateformes (AliExpress, Alibaba, CJ, DHgate, Banggood, Temu)
- ✅ Scraping multi-stratégies avec fallback automatique
- ✅ Réessai automatique intelligent
- ✅ Interface UI entièrement repensée
- ✅ Synchronisation Shopify en temps réel
- ✅ Calcul de marge dynamique
- ✅ Historique des imports avec statistiques
- ✅ Proxy d'images pour éviter CORS

### v1.0.0 — Version précédente
- Import AliExpress basique
- Interface simple
- Pas de réessai

---

**Développé avec ❤️ par EcomPilot Elite**
