# Apple App Store — EcomPilot Elite

## Prerequisites
- Apple Developer Program ($99/year)
  → https://developer.apple.com/programs/
- **Mac avec Xcode 15+** (requis — iOS ne peut pas être compilé sur Windows)
- Alternatives si pas de Mac :
  - **MacStadium** (cloud Mac) : macstadium.com
  - **GitHub Actions** avec `macos-latest` runner
  - **Codemagic** (CI/CD mobile, génère l'IPA dans le cloud)

---

## Bundle ID & App Info

| Champ | Valeur |
|-------|--------|
| Bundle ID | `com.ecompilotelite.app` |
| App Name | EcomPilot Elite |
| Category | Business |
| Subcategory | Shopping |
| Age Rating | 4+ |
| Price | Free |
| Min iOS | 14.0+ |

---

## Méthode : Capacitor

Le projet Capacitor est déjà créé dans :
`C:\Users\Admin\Documents\ecompilot-mobile`

Sur Mac :
```bash
cd /path/to/ecompilot-mobile
npx cap add ios
npx cap sync
npx cap open ios
```

## Configuration Xcode

1. **Bundle Identifier** : `com.ecompilotelite.app`
2. **Display Name** : EcomPilot Elite
3. **Version** : 1.0.0
4. **Build** : 1
5. **Deployment Target** : iOS 14.0+
6. **Signing** : Ton compte Apple Developer

## Icons iOS (tailles requises)

| Taille | Usage |
|--------|-------|
| 1024×1024 | App Store |
| 180×180 | iPhone 3x |
| 120×120 | iPhone 2x |
| 167×167 | iPad Pro |
| 152×152 | iPad 2x |

Utilise `public/icons/icon-512x512.png` comme source + redimensionne.

## Upload & Archive

```
Product → Archive → Distribute App → App Store Connect → Upload
```

---

## Contenu du listing

**Subtitle (30 chars)** :
```
IA pour boutiques Shopify
```

**Description** :
```
EcomPilot Elite est l'assistant IA conçu pour les e-commerçants Shopify
qui veulent vendre plus sans y passer des heures.

FONCTIONNALITÉS :
• Générer des fiches produits IA en 1 clic
• Optimiser le SEO automatiquement
• Importer depuis AliExpress
• Édition en masse des prix et descriptions
• Score de visibilité par produit

30 actions gratuites à l'inscription. Sans carte bancaire.
```

**Keywords (100 chars)** :
```
shopify,ia,seo,ecommerce,dropshipping,produits,optimisation,aliexpress,catalogue,boutique
```

## Screenshots requis

| Type | Taille |
|------|--------|
| iPhone 6.5" | 1242×2688px (minimum 3) |
| iPhone 5.5" | 1242×2208px (minimum 3) |
| iPad Pro 12.9" | 2048×2732px (optionnel) |

## Review notes pour Apple

```
This is a business productivity app for Shopify store owners.
The app requires a Shopify store connection to function.
Test account: [fournir des credentials de test]
The app connects to https://www.ecompilotelite.com via WKWebView.
```

---

## Étapes de soumission

1. → developer.apple.com → **Certificates, IDs & Profiles**
2. Create App ID : `com.ecompilotelite.app`
3. → App Store Connect → **New App**
4. Upload build via Xcode ou **Transporter** (outil Apple gratuit)
5. Remplir les métadonnées (description, screenshots, keywords)
6. **Submit for Review** → 1–3 business days

---

## Apple App Site Association

Le fichier `public/.well-known/apple-app-site-association` est déjà créé.
Une fois le Team ID connu (dans Apple Developer → Membership) :
Remplacer `TEAMID` par ton Team ID réel (ex: `AB12CD34EF`).

```json
{
  "applinks": {
    "details": [{
      "appID": "AB12CD34EF.com.ecompilotelite.app",
      "paths": ["*"]
    }]
  }
}
```
