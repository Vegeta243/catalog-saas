/**
 * Migration Supabase - Script autonome Node.js
 * Usage: node scripts/migrate-supabase.mjs
 *
 * Ne nécessite PAS la Supabase CLI.
 * Utilise l'API Management Supabase via le token de connexion.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Lire les variables d'env depuis .env.local
const envPath = join(__dirname, "../.env.local");
const envContent = readFileSync(envPath, "utf-8");
const env = Object.fromEntries(
  envContent.split("\n")
    .filter(l => l && !l.startsWith("#") && l.includes("="))
    .map(l => {
      const [key, ...rest] = l.split("=");
      return [key.trim(), rest.join("=").trim()];
    })
);

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquant dans .env.local");
  process.exit(1);
}

// Dériver le project ref depuis l'URL Supabase
const projectRef = SUPABASE_URL.replace("https://", "").split(".")[0];
console.log(`📦 Project ref: ${projectRef}`);
console.log(`🌐 Supabase URL: ${SUPABASE_URL}`);

/**
 * Exécute du SQL via l'API Supabase Management
 * Nécessite SUPABASE_ACCESS_TOKEN dans l'environnement (token personnel)
 */
async function executeSqlViaManagementApi(sql) {
  const token = process.env.SUPABASE_ACCESS_TOKEN;
  if (!token) return null;

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });
  return res.ok ? await res.json() : null;
}

/**
 * Vérifie si une table existe via l'API REST Supabase
 */
async function tableExists(tableName) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?limit=0`, {
      headers: {
        "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
        "apikey": SERVICE_ROLE_KEY,
      },
    });
    return res.status !== 404 && res.status !== 400;
  } catch {
    return false;
  }
}

/**
 * Crée la table users via l'API upsert (si elle n'existe pas)
 * Cette approche vérifie quelles tables existent et génère le rapport
 */
async function checkAndReport() {
  console.log("\n🔍 Vérification des tables Supabase...\n");

  const tables = ["users", "shops"];
  const status = {};

  for (const table of tables) {
    const exists = await tableExists(table);
    status[table] = exists;
    console.log(`  ${exists ? "✅" : "❌"} Table '${table}': ${exists ? "existe" : "MANQUANTE"}`);
  }

  const allExist = Object.values(status).every(Boolean);

  if (allExist) {
    console.log("\n✅ Toutes les tables existent déjà ! Migration inutile.");
    return true;
  }

  console.log("\n⚠️  Tables manquantes détectées.");
  console.log("\n📋 INSTRUCTIONS POUR LA MIGRATION :\n");
  console.log("1. Ouvrez https://supabase.com/dashboard/project/" + projectRef + "/editor");
  console.log("2. Copiez le contenu de: supabase/migrations/001_users_stripe.sql");
  console.log("3. Collez dans le SQL Editor et cliquez 'Run'\n");
  console.log("OU - Passez SUPABASE_ACCESS_TOKEN dans l'environnement et relancez ce script.");

  // Tenter via Management API si token disponible
  if (process.env.SUPABASE_ACCESS_TOKEN) {
    console.log("\n🚀 SUPABASE_ACCESS_TOKEN détecté, tentative via Management API...\n");
    const sql = readFileSync(join(__dirname, "../supabase/migrations/001_users_stripe.sql"), "utf-8");
    const result = await executeSqlViaManagementApi(sql);
    if (result) {
      console.log("✅ Migration exécutée via Management API !");
      return true;
    } else {
      console.log("❌ Échec via Management API. Faites la migration manuellement.");
    }
  }

  return false;
}

/**
 * Vérifie la config Stripe
 */
function checkStripe() {
  console.log("\n🔑 Vérification configuration Stripe...\n");

  const stripeKey = env.STRIPE_SECRET_KEY;
  const pubKey = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;
  const starterMonthly = env.STRIPE_STARTER_MONTHLY_PRICE_ID;

  const hasRealKey = stripeKey && !stripeKey.startsWith("sk_test_REMPLACER");
  const hasRealPubKey = pubKey && !pubKey.startsWith("pk_test_REMPLACER");
  const hasWebhook = webhookSecret && !webhookSecret.startsWith("whsec_REMPLACER");
  const hasPrices = starterMonthly && !starterMonthly.startsWith("price_REMPLACER");

  console.log(`  ${hasRealKey ? "✅" : "❌"} STRIPE_SECRET_KEY: ${hasRealKey ? "configurée (" + stripeKey.substring(0, 12) + "...)" : "MANQUANTE"}`);
  console.log(`  ${hasRealPubKey ? "✅" : "❌"} NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ${hasRealPubKey ? "configurée" : "MANQUANTE"}`);
  console.log(`  ${hasWebhook ? "✅" : "❌"} STRIPE_WEBHOOK_SECRET: ${hasWebhook ? "configuré" : "MANQUANT (lancez: stripe listen)"}`);
  console.log(`  ${hasPrices ? "✅" : "❌"} Price IDs: ${hasPrices ? "configurés" : "MANQUANTS (lancez: POST /api/stripe/setup)"}`);

  return { hasRealKey, hasRealPubKey, hasWebhook, hasPrices };
}

async function main() {
  console.log("╔═══════════════════════════════════════════╗");
  console.log("║     EcomPilot — Migration & Setup Check   ║");
  console.log("╚═══════════════════════════════════════════╝\n");

  await checkAndReport();
  const { hasRealKey, hasPrices } = checkStripe();

  console.log("\n═══════════════════════════════════════════");
  console.log("  PROCHAINES ÉTAPES :");
  console.log("═══════════════════════════════════════════\n");

  if (!hasRealKey) {
    console.log("1. ⚠️  STRIPE_SECRET_KEY manquante !");
    console.log("   → Va sur: https://dashboard.stripe.com/test/apikeys");
    console.log("   → Copie sk_test_... et pk_test_... dans .env.local\n");
  } else {
    console.log("1. ✅ STRIPE_SECRET_KEY configurée\n");
  }

  if (hasRealKey && !hasPrices) {
    console.log("2. 🎯 Créer les produits Stripe automatiquement :");
    console.log("   → Lance le serveur: pnpm start");
    console.log("   → Appelle: curl -X POST http://localhost:3000/api/stripe/setup\n");
  } else if (hasPrices) {
    console.log("2. ✅ Price IDs Stripe configurés\n");
  }

  console.log("3. 🔔 Webhook Stripe (dans un terminal séparé) :");
  console.log("   → stripe login");
  console.log("   → stripe listen --forward-to localhost:3000/api/stripe/webhook\n");

  console.log("4. 🗄️  Migration Supabase :");
  console.log("   → https://supabase.com/dashboard/project/" + projectRef + "/editor\n");

  console.log("✅ Script terminé.\n");
}

main().catch(console.error);
