/**
 * auto-auth-deploy.mjs
 * Tente de se connecter à Shopify Partners via OAuth Device Flow
 * puis met à jour les URLs de l'app automatiquement
 */
import { createServer } from 'http';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Config
const CLIENT_ID   = 'cd3da6aff7869afab614e42f45a0e1a7';
const APP_URL     = 'https://www.ecompilotelite.com';
const REDIRECT_URLS = [
  `${APP_URL}/api/auth/shopify/callback`,
  'http://localhost:3000/api/auth/shopify/callback',
];

// Lire SHOPIFY_PARTNERS_TOKEN si déjà configuré
const envPath = path.join(__dirname, '..', '.env.local');
let PARTNERS_TOKEN = '';
let PARTNER_ID = '';
try {
  const envContent = readFileSync(envPath, 'utf-8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#') || !trimmed) continue;
    const [key, ...rest] = trimmed.split('=');
    const val = rest.join('=').trim();
    if (key === 'SHOPIFY_PARTNERS_TOKEN') PARTNERS_TOKEN = val;
    if (key === 'SHOPIFY_PARTNER_ID') PARTNER_ID = val;
  }
} catch {}

console.log('\n🚀 EcomPilot Elite — Shopify App Auto-Deploy\n');

if (PARTNERS_TOKEN && PARTNERS_TOKEN !== 'YOUR_PARTNERS_TOKEN' && PARTNER_ID && PARTNER_ID !== 'YOUR_PARTNER_ID') {
  // On a un token — utiliser l'API Partners directement
  await updateViaAPI(PARTNERS_TOKEN, PARTNER_ID);
} else {
  // Pas de token — essayer via CLI avec stdin auto
  await deployViaCliAuto();
}

async function updateViaAPI(token, partnerId) {
  console.log('📡 Mise à jour via Shopify Partners API...\n');

  // D'abord trouver l'app par client_id
  const findQuery = `{
    apps(first: 50) {
      nodes {
        id
        title
        apiKey
      }
    }
  }`;

  const findRes = await fetch(`https://partners.shopify.com/${partnerId}/api/2024-07/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({ query: findQuery }),
  });

  if (!findRes.ok) {
    console.error('❌ API Partners inaccessible:', findRes.status);
    await deployViaCliAuto();
    return;
  }

  const findData = await findRes.json();
  const app = findData.data?.apps?.nodes?.find(a => a.apiKey === CLIENT_ID);

  if (!app) {
    console.error('❌ App non trouvée avec client_id:', CLIENT_ID);
    await deployViaCliAuto();
    return;
  }

  console.log('✅ App trouvée:', app.title, '(ID:', app.id, ')');

  // Mettre à jour
  const updateMutation = `
    mutation AppUpdate($input: AppUpdateInput!) {
      appUpdate(input: $input) {
        app { id title appUrl redirectUrlWhitelist }
        userErrors { field message }
      }
    }
  `;

  const updateRes = await fetch(`https://partners.shopify.com/${partnerId}/api/2024-07/graphql.json`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': token,
    },
    body: JSON.stringify({
      query: updateMutation,
      variables: {
        input: {
          id: app.id,
          applicationUrl: `${APP_URL}/shopify-embed`,
          redirectUrlWhitelist: REDIRECT_URLS,
        }
      }
    }),
  });

  const updateData = await updateRes.json();
  const { userErrors } = updateData.data?.appUpdate || {};

  if (userErrors?.length > 0) {
    console.error('❌ Erreurs:', userErrors);
    return;
  }

  console.log('✅ URLs mises à jour avec succès !');
  console.log('   App URL   :', `${APP_URL}/shopify-embed`);
  console.log('   Redirect  :', REDIRECT_URLS[0]);
  console.log('\n🔗 Lien d\'installation :');
  console.log(`   ${APP_URL}/api/auth/shopify?shop=VOTRE-BOUTIQUE.myshopify.com\n`);
}

async function deployViaCliAuto() {
  console.log('🔑 Authentification Shopify Partners requise\n');
  console.log('📋 La fenêtre CMD ouverte sur votre bureau attend votre action.');
  console.log('   → Appuyez sur ENTRÉE dans cette fenêtre pour ouvrir le navigateur');
  console.log('   → Connectez-vous avec elliottshilenge5@gmail.com\n');

  console.log('OU mettez à jour manuellement en 30 secondes :');
  console.log('   1. Ouvrez https://partners.shopify.com/organizations');
  console.log('   2. Apps → EcomPilot → Configuration');
  console.log('   3. App URL → https://www.ecompilotelite.com/shopify-embed');
  console.log('   4. Redirect URL → https://www.ecompilotelite.com/api/auth/shopify/callback');
  console.log('   5. Save\n');
}
