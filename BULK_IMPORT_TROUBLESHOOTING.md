# 🔧 Troubleshooting - Import en Masse

**Date :** 26 Mars 2026  
**Statut :** 🚨 **À LIRE AVANT TOUTE CHOSE**

---

## ❓ "Je ne vois pas l'option d'import en masse"

### **Solution 1 : Redémarrer le Serveur de Développement**

```bash
# 1. Tuer l'ancien processus
taskkill /F /IM node.exe

# 2. Redémarrer
cd C:\Users\Admin\Documents\catalog-saas
pnpm run dev
```

**Pourquoi ?** Les nouveaux fichiers ne sont pas toujours détectés automatiquement.

---

### **Solution 2 : Vider le Cache Next.js**

```bash
# 1. Supprimer le cache
cd C:\Users\Admin\Documents\catalog-saas
rm -r .next

# 2. Redémarrer
pnpm run dev
```

**Pourquoi ?** Le cache peut contenir d'anciennes versions des pages.

---

### **Solution 3 : Vérifier que le Build est Bon**

```bash
# Build de production
pnpm run build

# Doit afficher :
# ✓ Compiled successfully
# ✓ TypeScript validated
```

**Si erreur :**
- Vérifier les imports dans `app/(dashboard)/dashboard/page.tsx`
- Ligne 15 : `import BulkImportModal from "@/components/BulkImportModal";`
- Ligne 77 : `const [showBulkImport, setShowBulkImport] = useState(false);`

---

## 🧪 Page de Test Dédiée

**URL :** `http://localhost:3000/dashboard/import-test`

Une page de test a été créée pour vérifier le modal sans passer par le dashboard.

**Comment tester :**
1. Lancer `pnpm run dev`
2. Aller sur `http://localhost:3000/dashboard/import-test`
3. Cliquer sur "📦 Ouvrir le Modal d'Import"
4. Le modal doit s'ouvrir

---

## 📍 Où Trouver l'Option sur le Dashboard

**Chemin :**
```
Dashboard → "Démarrage rapide" → 4ème carte (orange)
```

**Visuel :**
```
┌────────────────────────────────────┐
│  📦 Import en Masse                │
│                                    │
│  Importez jusqu'à 100 produits     │
│  simultanément depuis AliExpress,  │
│  Alibaba, CJ, etc.                 │
│                                    │
│  Lancer →                          │
└────────────────────────────────────┘
```

**Couleur :** Orange/Amber (`#f59e0b`)  
**Icône :** 📦 (Package)

---

## 🔍 Checklist de Vérification

### **Fichiers Présents ?**

```bash
# Vérifier que ces fichiers existent :
components/BulkImportModal.tsx       ✓
app/(dashboard)/dashboard/page.tsx   ✓ (modifié)
app/api/import/bulk/route.ts         ✓
app/api/import/from-file/route.ts    ✓
```

### **Code Correct ?**

Dans `app/(dashboard)/dashboard/page.tsx`, vérifier :

**Ligne 15 :**
```typescript
import BulkImportModal from "@/components/BulkImportModal";
```

**Ligne 77 :**
```typescript
const [showBulkImport, setShowBulkImport] = useState(false);
```

**Lignes 328-336 :**
```typescript
{ 
  id: "bulk-import", 
  icon: Package, 
  color: "#f59e0b", 
  bg: "bg-amber-50", 
  title: "Import en Masse", 
  desc: "Importez jusqu'à 100 produits simultanément depuis AliExpress, Alibaba, CJ, etc." 
},
```

**Ligne 341 :**
```typescript
onClick={() => wf.id === "bulk-import" ? setShowBulkImport(true) : startWorkflow(wf.id)}
```

**Lignes 828-835 :**
```typescript
<BulkImportModal 
  isOpen={showBulkImport}
  onClose={() => setShowBulkImport(false)}
  onSuccess={(count) => {
    addToast(`${count} produit(s) importé(s) avec succès !`, "success");
    fetchProducts();
  }}
/>
```

---

## 🚨 Erreurs Courantes

### **Erreur : "BulkImportModal is not defined"**

**Cause :** Import manquant

**Solution :**
```typescript
// Ajouter en haut de dashboard/page.tsx
import BulkImportModal from "@/components/BulkImportModal";
```

---

### **Erreur : "Package is not defined"**

**Cause :** Import manquant de l'icône

**Solution :**
```typescript
// Modifier l'import lucide-react
import {
  Package, TrendingUp, Clock, CheckCircle2, Circle,
  Sparkles, DollarSign, Download, X, ChevronRight,
  Heart, AlertTriangle, AlertCircle, Image as ImageIcon,
  Zap, Activity, ArrowRight, Check,
} from "lucide-react";
```

---

### **Erreur : "showBulkImport is not defined"**

**Cause :** State manquant

**Solution :**
```typescript
// Ajouter dans les states (ligne ~77)
const [showBulkImport, setShowBulkImport] = useState(false);
```

---

### **Modal ne s'ouvre pas**

**Cause :** `isOpen` mal passé

**Vérifier :**
```typescript
<BulkImportModal 
  isOpen={showBulkImport}  // Doit être true quand on clique
  onClose={() => setShowBulkImport(false)}
  ...
/>
```

---

## 🧪 Test Rapide des Endpoints

### **Test 1 : Endpoint Bulk Import**

```bash
curl -X POST http://localhost:3000/api/import/bulk \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://www.aliexpress.com/item/1005006294704696.html"],"push_to_shopify":false,"auto_retry":true,"margin":1.5}'
```

**Réponse attendue :**
```json
{
  "success": true,
  "imported": 1,
  "results": [...]
}
```

---

### **Test 2 : Endpoint From File**

```bash
# Créer un fichier test.txt
echo "https://www.aliexpress.com/item/1005006294704696.html" > test.txt

# Envoyer
curl -X POST http://localhost:3000/api/import/from-file \
  -F "file=@test.txt" \
  -F "push_to_shopify=false" \
  -F "auto_retry=true" \
  -F "margin=1.5"
```

---

## 📞 Ça Ne Marche Toujours Pas ?

### **Étapes de Debug :**

1. **Ouvrir la console navigateur (F12)**
   - Regarder les erreurs JavaScript
   - Vérifier que le modal est dans le DOM

2. **Vérifier les logs serveur**
   ```bash
   # Dans le terminal où tourne pnpm dev
   # Chercher les erreurs de compilation
   ```

3. **Tester la page de test**
   ```
   http://localhost:3000/dashboard/import-test
   ```

4. **Rebuild complet**
   ```bash
   rm -r .next
   rm -r node_modules
   pnpm install
   pnpm run build
   pnpm run dev
   ```

---

## ✅ Comment Savoir si Ça Marche

### **Signes que ça fonctionne :**

1. ✅ La carte "Import en Masse" est visible sur le dashboard
2. ✅ Au click, un modal s'ouvre avec :
   - Zone de texte pour coller les URLs
   - Slider de marge
   - Bouton "Importer"
3. ✅ Après import, un toast affiche "X produit(s) importé(s) avec succès"
4. ✅ Les produits apparaissent dans le catalogue

---

## 🎯 Solution Rapide (TL;DR)

```bash
# 1. Tuer tout processus Node
taskkill /F /IM node.exe

# 2. Nettoyer
cd C:\Users\Admin\Documents\catalog-saas
rm -r .next

# 3. Réinstaller (optionnel)
pnpm install

# 4. Build
pnpm run build

# 5. Démarrer
pnpm run dev

# 6. Tester
# Aller sur : http://localhost:3000/dashboard/import-test
```

---

## 📊 Stats du Code

| Fichier | Lignes | Statut |
|---------|--------|--------|
| `components/BulkImportModal.tsx` | 400 | ✅ Créé |
| `app/(dashboard)/dashboard/page.tsx` | +50 | ✅ Modifié |
| `app/api/import/bulk/route.ts` | 365 | ✅ Existant |
| `app/api/import/from-file/route.ts` | 150 | ✅ Créé |
| `app/(dashboard)/dashboard/import-test/page.tsx` | 100 | ✅ Créé |

---

## 🎉 Si Tout Marche

Vous devriez voir :

```
┌─────────────────────────────────────────┐
│  Dashboard → Démarrage rapide           │
│                                         │
│  [Optimiser] [Prix] [Importer] [MASS]  │
│                              ↑          │
│                         NOUVEAU !       │
└─────────────────────────────────────────┘
```

---

**Dernière mise à jour :** 26 Mars 2026  
**Auteur :** Assistant IA  
**Prochain step :** Tester en production !
