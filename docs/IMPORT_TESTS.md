# 🧪 Test du Système d'Import

## Instructions de Test

### 1. Exécuter les tests API

```bash
# Test de l'endpoint de test
curl http://localhost:3000/api/import/test

# Test d'un import unitaire
curl -X POST http://localhost:3000/api/import/test \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.aliexpress.com/item/1005006294704696.html"}'

# Test de preview
curl -X POST http://localhost:3000/api/import/preview \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.aliexpress.com/item/1005006294704696.html", "margin": 1.5}'
```

### 2. Tester l'interface UI

1. Lancez le serveur de développement :
```bash
pnpm dev
```

2. Accédez à : `http://localhost:3000/dashboard/import`

3. Testez les fonctionnalités :
   - [ ] Ajout d'URLs une par une
   - [ ] Coller en masse (50 URLs max)
   - [ ] Validation des URLs
   - [ ] Aperçu d'un produit
   - [ ] Import avec synchronisation Shopify
   - [ ] Réessai automatique
   - [ ] Affichage des résultats
   - [ ] Historique des imports

### 3. Vérifier la base de données

```sql
-- Vérifier que la table import_jobs existe
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'import_jobs';

-- Vérifier les imports récents
SELECT 
  id,
  platform,
  status,
  imported_count,
  total_products,
  created_at
FROM import_jobs
ORDER BY created_at DESC
LIMIT 10;

-- Vérifier les statistiques
SELECT 
  status,
  COUNT(*) as count,
  SUM(imported_count) as total_imported,
  SUM(total_products) as total attempted
FROM import_jobs
GROUP BY status;
```

### 4. Checklist de Validation

#### Backend
- [ ] Migration 021 exécutée dans Supabase
- [ ] Table `import_jobs` créée
- [ ] Table `import_job_items` créée
- [ ] Fonctions RPC créées (`retry_failed_import_items`, etc.)
- [ ] Endpoint `/api/import/bulk` fonctionnel
- [ ] Endpoint `/api/import/preview` fonctionnel
- [ ] Endpoint `/api/import/history` fonctionnel
- [ ] Endpoint `/api/import/image-proxy` fonctionnel
- [ ] Endpoint `/api/import/test` fonctionnel

#### Frontend
- [ ] Page `/dashboard/import` accessible
- [ ] Ajout d'URLs fonctionnel
- [ ] Coller en masse fonctionnel
- [ ] Validation des URLs fonctionnelle
- [ ] Aperçu des produits fonctionnel
- [ ] Import en masse fonctionnel
- [ ] Progress bar fonctionnelle
- [ ] Résultats affichés correctement
- [ ] Historique consultable
- [ ] Retry des échecs fonctionnel

#### Intégrations
- [ ] Shopify push fonctionnel (si boutique connectée)
- [ ] Supabase RLS configuré correctement
- [ ] Rate limiting fonctionnel
- [ ] Gestion des erreurs robuste

### 5. Tests de Performance

```bash
# Test de charge avec 10 URLs
curl -X POST http://localhost:3000/api/import/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "urls": [
      "https://www.aliexpress.com/item/1005006294704696.html",
      "https://www.aliexpress.com/item/1005005531234567.html",
      ... (10 URLs)
    ],
    "push_to_shopify": false,
    "auto_retry": true
  }'

# Mesurer le temps de réponse
# Objectif : < 60s pour 10 URLs en parallèle (5 threads)
```

### 6. Tests d'Erreurs

Testez les cas limites :

```javascript
// URL invalide
POST /api/import/bulk
{
  "urls": ["not-a-valid-url"]
}
// Attendu : Erreur 400 avec message explicite

// URL vide
POST /api/import/bulk
{
  "urls": []
}
// Attendu : Erreur 400 "Aucune URL fournie"

// Trop d'URLs
POST /api/import/bulk
{
  "urls": [...Array(101).keys()].map(i => `https://example.com/${i}`)
}
// Attendu : Erreur 400 "Maximum 100 URLs par lot"

// Sans authentification
GET /api/import/history
// Attendu : Erreur 401 "Non autorisé"
```

### 7. Critères d'Acceptation

Le système est considéré comme **fonctionnel** si :

✅ **Import unitaire**
- Un produit AliExpress peut être importé en < 10s
- Les données extraites sont correctes (titre, prix, images)
- Le produit est poussé vers Shopify (si connecté)

✅ **Import en masse**
- 10 produits peuvent être importés en parallèle en < 60s
- La progression est affichée en temps réel
- Les résultats sont corrects (succès/échecs identifiés)

✅ **Réessai automatique**
- Les produits échoués sont réessayés automatiquement
- Maximum 3 tentatives avec backoff exponentiel
- Le taux de réussite final est > 80%

✅ **Interface utilisateur**
- L'interface est intuitive et réactive
- Les erreurs sont clairement affichées
- L'historique est consultable

✅ **Base de données**
- Les jobs d'import sont enregistrés
- Les statistiques sont correctes
- Le RLS fonctionne (chaque utilisateur ne voit que ses données)

### 8. Rapport de Test

Après les tests, remplissez ce rapport :

```
## Rapport de Test - Import en Masse

**Date :** 2026-03-26
**Testeur :** [Votre nom]

### Résultats

| Test | Statut | Notes |
|------|--------|-------|
| Import unitaire AliExpress | ✅/❌ | |
| Import unitaire Alibaba | ✅/❌ | |
| Import unitaire CJ | ✅/❌ | |
| Import en masse (10 URLs) | ✅/❌ | |
| Réessai automatique | ✅/❌ | |
| Synchronisation Shopify | ✅/❌ | |
| Affichage historique | ✅/❌ | |

### Bugs Trouvés

1. [Description du bug]
   - Étapes pour reproduire : ...
   - Comportement attendu : ...
   - Comportement observé : ...
   - Sévérité : Haute/Moyenne/Basse

### Performance

- Temps moyen par produit : ___ s
- Taux de réussite : ___ %
- URLs max testées : ___

### Conclusion

[ ] Prêt pour la production
[ ] Prêt avec corrections mineures
[ ] Nécessite des corrections majeures
[ ] Non prêt

**Commentaires :**
...
```

---

## 🔧 Commandes Utiles

```bash
# Voir les logs en temps réel
pnpm dev

# Build de production
pnpm build

# Test rapide
curl http://localhost:3000/api/import/test

# Vérifier la base de données
# Allez dans Supabase Dashboard → SQL Editor
```

## 📞 Support

En cas de problème :
1. Consultez les logs Vercel/locaux
2. Vérifiez la configuration des clés API
3. Testez les endpoints individuellement
4. Contactez : support@ecompilotelite.com
