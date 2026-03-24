# Google Play Store — EcomPilot Elite

## Prerequisites
- Google Play Developer account ($25 one-time)
  → https://play.google.com/console/signup

## Méthode : TWA (Trusted Web Activity)
TWA = publie ta PWA sur le Play Store sans duplication de code.
L'app Android charge directement `https://www.ecompilotelite.com`.

## Outils requis
```bash
npm install -g @bubblewrap/cli
```

## Étapes de génération du .aab

```bash
mkdir C:\Users\Admin\Documents\ecompilot-android
cd C:\Users\Admin\Documents\ecompilot-android

bubblewrap init --manifest https://www.ecompilotelite.com/manifest.json
```

Quand demandé :
- **Package ID** : `com.ecompilotelite.app`
- **App name** : `EcomPilot Elite`
- **Start URL** : `/dashboard`
- **Display mode** : `standalone`
- **Orientation** : `portrait`
- **Theme color** : `#0f172a`
- **Background color** : `#0f172a`
- **Signing key** : create new keystore
  - Keystore file : `ecompilot-release.keystore`
  - Key alias : `ecompilot`
  - Password : [choisir un mot de passe fort et le SAUVEGARDER]

```bash
bubblewrap build
```

Fichiers générés :
- `app-release-signed.apk`
- `app-release-bundle.aab` ← **c'est ce fichier qu'on upload sur Play Store**

## ⚠️ KEYSTORE CRITIQUE
Le fichier `ecompilot-release.keystore` est irremplaçable.
Si tu le perds → impossible de mettre à jour l'app.
**Sauvegarde-le dans plusieurs endroits : clé USB, cloud, email.**

Chemin recommandé : `C:\Users\Admin\Documents\ecompilot-mobile\keys\ecompilot-release.keystore`

Obtenir le SHA256 (requis pour Digital Asset Links) :
```bash
keytool -list -v -keystore ecompilot-release.keystore -alias ecompilot
```
Puis remplir `public/.well-known/assetlinks.json` avec le SHA256.

---

## Fichiers nécessaires pour le listing

| Fichier | Specs |
|---------|-------|
| App icon | 512×512px PNG, fond uni |
| Feature graphic | 1024×500px PNG |
| Screenshots phone | 2–8 captures (ratio 9:16 ou 16:9) |
| Screenshots tablet | Optionnel |

## Contenu du listing

**Package name** : `com.ecompilotelite.app`  
**App name** : EcomPilot Elite  
**Category** : Business  
**Content rating** : Everyone  
**Default language** : French (France)

**Short description (80 chars max)** :
```
L'IA qui optimise votre boutique Shopify en 1 clic
```

**Full description** :
```
EcomPilot Elite est l'assistant IA conçu pour les e-commerçants Shopify
qui veulent vendre plus sans y passer des heures.

✨ CE QUE VOUS POUVEZ FAIRE :
- Générer des fiches produits professionnelles en 1 clic
- Optimiser votre SEO automatiquement
- Importer des produits depuis AliExpress
- Modifier les prix de tout votre catalogue en masse
- Analyser vos concurrents en temps réel
- Suivre la performance de chaque produit

🚀 POURQUOI ECOMPILOT ELITE ?
Arrêtez de passer des heures à écrire des descriptions produits.
Notre IA génère du contenu optimisé pour Google et vos clients
en quelques secondes.

30 actions gratuites à l'inscription. Sans carte bancaire requise.
```

**Privacy Policy URL** : `https://www.ecompilotelite.com/politique-de-confidentialite`

---

## Étapes de soumission

1. → play.google.com/console → **Create app**
2. Fill in app details (name, category, content rating)
3. **Store listing** : ajouter description + screenshots + icon
4. **App releases** : Upload `app-release-bundle.aab`
5. **Content rating** : remplir le questionnaire
6. **Pricing** : Free with in-app purchases
7. **Submit for review** → 3–7 business days

---

## Digital Asset Links (requis pour TWA sans barre navigateur)

Une fois le keystore créé, mettre à jour `public/.well-known/assetlinks.json` :

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "com.ecompilotelite.app",
    "sha256_cert_fingerprints": ["VOTRE_SHA256_ICI"]
  }
}]
```

Le fichier est déjà déployé sur `https://www.ecompilotelite.com/.well-known/assetlinks.json`.
Il suffit de remplacer `REPLACE_WITH_YOUR_KEYSTORE_SHA256_FINGERPRINT` par le vrai SHA256.
