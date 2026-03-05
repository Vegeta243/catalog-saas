/**
 * shopify-deploy.mjs — Configure & déploie l'app EcomPilot Elite via l'API Shopify Partners
 * 
 * Prérequis :
 *  1. Générer un token Partners sur https://partners.shopify.com/[PARTNER_ID]/settings/api_clients
 *  2. Ajouter SHOPIFY_PARTNERS_TOKEN et SHOPIFY_PARTNER_ID dans .env.local
 * 
 * Usage :
 *   node scripts/shopify-deploy.mjs
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Charger les variables d'environnement depuis .env.local ──
const envPath = path.join(__dirname, '..', '.env.local');
let env = {};
try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    env[key] = value;
  }
} catch (e) {
  console.error('❌ Impossible de lire .env.local:', e.message);
  process.exit(1);
}

const PARTNERS_TOKEN  = env.SHOPIFY_PARTNERS_TOKEN || process.env.SHOPIFY_PARTNERS_TOKEN;
const PARTNER_ID      = env.SHOPIFY_PARTNER_ID     || process.env.SHOPIFY_PARTNER_ID;
const APP_CLIENT_ID   = env.SHOPIFY_API_KEY         || 'cd3da6aff7869afab614e42f45a0e1a7';
const APP_URL         = (env.NEXT_PUBLIC_SITE_URL || 'https://www.ecompilotelite.com').replace(/\/$/, '');

const REDIRECT_URLS = [
  `${APP_URL}/api/auth/shopify/callback`,
  'http://localhost:3000/api/auth/shopify/callback',
];

// ── Affiche la config ──
console.log('\n🚀 EcomPilot Elite — Shopify App Deployment\n');
console.log('  App URL     :', APP_URL);
console.log('  Client ID   :', APP_CLIENT_ID);
console.log('  Redirects   :', REDIRECT_URLS.join(', '));
console.log('');

// ── Vérifie le token ──
if (!PARTNERS_TOKEN || PARTNERS_TOKEN === 'YOUR_PARTNERS_TOKEN') {
  console.error('❌ SHOPIFY_PARTNERS_TOKEN manquant dans .env.local\n');
  console.log('📋 Comment l\'obtenir :');
  console.log('   1. Allez sur https://partners.shopify.com');
  console.log('   2. Settings → Partner API clients → Create API client');
  console.log('   3. Copiez le "Partner API client secret"');
  console.log('   4. Ajoutez dans .env.local :');
  console.log('      SHOPIFY_PARTNERS_TOKEN=your_token_here');
  console.log('      SHOPIFY_PARTNER_ID=your_partner_id_here');
  console.log('\n   OU utilisez la commande CLI directement :');
  console.log('   > shopify app deploy\n');
  process.exit(1);
}

if (!PARTNER_ID) {
  console.error('❌ SHOPIFY_PARTNER_ID manquant dans .env.local\n');
  console.log('   Trouvez votre Partner ID dans l\'URL de partners.shopify.com');
  console.log('   ex: https://partners.shopify.com/12345678 → ID = 12345678\n');
  process.exit(1);
}

// ── Mutation GraphQL Partners API ──
const UPDATE_APP_MUTATION = `
  mutation AppUpdate($input: AppUpdateInput!) {
    appUpdate(input: $input) {
      app {
        id
        title
        appUrl
        redirectUrlWhitelist
      }
      userErrors {
        field
        message
      }
    }
  }
`;

async function updateShopifyApp() {
  console.log('📡 Connexion à Shopify Partners API...\n');
  
  const response = await fetch(`https://partners.shopify.com/${PARTNER_ID}/api/2024-07/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': PARTNERS_TOKEN,
    },
    body: JSON.stringify({
      query: UPDATE_APP_MUTATION,
      variables: {
        input: {
          applicationUrl: `${APP_URL}/shopify-embed`,
          redirectUrlWhitelist: REDIRECT_URLS,
          title: 'EcomPilot Elite',
          clientId: APP_CLIENT_ID,
        }
      }
    })
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('❌ Erreur API Partners:', response.status, text);
    return false;
  }

  const data = await response.json();
  
  if (data.errors) {
    console.error('❌ Erreurs GraphQL:', JSON.stringify(data.errors, null, 2));
    return false;
  }

  const { app, userErrors } = data.data?.appUpdate || {};
  
  if (userErrors?.length > 0) {
    console.error('❌ Erreurs de validation:');
    userErrors.forEach(e => console.error('  -', e.field, ':', e.message));
    return false;
  }

  console.log('✅ App mise à jour avec succès !');
  console.log('   Title     :', app?.title);
  console.log('   App URL   :', app?.appUrl);
  console.log('   Redirects :', app?.redirectUrlWhitelist?.join(', '));
  return true;
}

// ── Script principal ──
async function main() {
  const success = await updateShopifyApp();
  
  if (success) {
    console.log('\n🎉 Déploiement terminé !\n');
    console.log('📦 Lien d\'installation pour une boutique merchant :');
    console.log(`   ${APP_URL}/api/auth/shopify?shop=NOM-BOUTIQUE.myshopify.com`);
    console.log('\n🔗 Votre app dans le Partners dashboard :');
    console.log(`   https://partners.shopify.com/${PARTNER_ID}/apps\n`);
  } else {
    console.log('\n⚠️  La mise à jour automatique a échoué.');
    console.log('\n📋 Mise à jour MANUELLE (2 minutes) :');
    console.log('   1. Allez sur https://partners.shopify.com → Apps');
    console.log(`   2. Ouvrez "EcomPilot Elite" (client_id: ${APP_CLIENT_ID})`);
    console.log('   3. App setup → App URL :');
    console.log(`      ${APP_URL}/shopify-embed`);
    console.log('   4. Allowed redirection URL(s) :');
    REDIRECT_URLS.forEach(url => console.log(`      ${url}`));
    console.log('   5. Sauvegardez\n');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Erreur inattendue:', err.message);
  process.exit(1);
});
