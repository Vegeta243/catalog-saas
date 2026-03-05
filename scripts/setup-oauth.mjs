#!/usr/bin/env node
/**
 * Configuration automatique Supabase OAuth
 * 
 * USAGE:
 *   node scripts/setup-oauth.mjs sbp_VOTRE_TOKEN_MANAGEMENT
 * 
 * Obtenir le token: https://supabase.com/dashboard/account/tokens
 * → "Generate new token" → copier le token
 */

const PROJECT_REF = "mhroujagzclmdlfpiqju";
const SITE_URL    = "https://www.ecompilotelite.com";
const SUPABASE_CALLBACK = `https://${PROJECT_REF}.supabase.co/auth/v1/callback`;

const token = process.argv[2];
if (!token) {
  console.error("\n❌ Token manquant!\n");
  console.error("Usage: node scripts/setup-oauth.mjs sbp_VOTRE_TOKEN\n");
  console.error("Obtenir un token: https://supabase.com/dashboard/account/tokens");
  process.exit(1);
}

const API = `https://api.supabase.com/v1/projects/${PROJECT_REF}`;
const headers = {
  "Authorization": `Bearer ${token}`,
  "Content-Type": "application/json",
};

async function req(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }
  return res.json();
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║   EcomPilot Elite - Configuration OAuth          ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // ── Étape 1: Mise à jour Site URL + Redirects ─────────────
  console.log("▶ [1/3] Configuration Site URL et redirects...");
  try {
    await req("PATCH", "/config/auth", {
      site_url: SITE_URL,
      uri_allow_list: `${SITE_URL}/auth/callback,http://localhost:3000/auth/callback`,
      mailer_autoconfirm: false,
      external_email_enabled: true,
      refresh_token_rotation_enabled: true,
    });
    console.log(`  ✅ Site URL: ${SITE_URL}`);
    console.log(`  ✅ Callback autorisé: ${SITE_URL}/auth/callback`);
    console.log(`  ✅ Callback local: http://localhost:3000/auth/callback`);
  } catch (e) {
    console.error(`  ❌ Erreur: ${e.message}`);
    process.exit(1);
  }

  // ── Étape 2: Vérification config actuelle ─────────────────
  console.log("\n▶ [2/3] Lecture configuration actuelle...");
  let config;
  try {
    config = await req("GET", "/config/auth");
    console.log(`  ✅ Google activé: ${config.external_google_enabled}`);
    console.log(`  ✅ Apple activé:  ${config.external_apple_enabled}`);
    console.log(`  ✅ Site URL:      ${config.site_url}`);
  } catch (e) {
    console.error(`  ❌ Lecture config: ${e.message}`);
  }

  // ── Étape 3: Instructions Google OAuth ────────────────────
  console.log("\n▶ [3/3] Google OAuth...");
  if (!config?.external_google_enabled) {
    console.log("\n  🔑 Pour activer Google OAuth, tu as besoin de:");
    console.log("     → Client ID + Client Secret Google\n");
    console.log("  Étapes (2 minutes):");
    console.log("  1. Va sur https://console.cloud.google.com");
    console.log("  2. APIs & Services > Identifiants > Créer des identifiants");
    console.log("  3. Type: 'ID client OAuth 2.0' + Application Web");
    console.log("  4. Ajouter dans 'URI de redirection autorisés':");
    console.log(`     ${SUPABASE_CALLBACK}`);
    console.log("  5. Copier Client ID + Client Secret");
    console.log("  6. Relancer:");
    console.log("     node scripts/setup-oauth.mjs sbp_TOKEN GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET\n");
  } else {
    console.log("  ✅ Google OAuth déjà activé!");
  }

  // Si credentials Google passés en arguments
  const googleClientId = process.argv[3];
  const googleSecret   = process.argv[4];
  if (googleClientId && googleSecret) {
    console.log("\n▶ Activation Google OAuth avec les credentials fournis...");
    try {
      await req("PATCH", "/config/auth", {
        external_google_enabled: true,
        external_google_client_id: googleClientId,
        external_google_secret: googleSecret,
      });
      console.log("  ✅ Google OAuth activé avec succès!\n");
    } catch (e) {
      console.error(`  ❌ Erreur Google: ${e.message}`);
    }
  }

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║   Configuration terminée!                        ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("\n📋 Récapitulatif:");
  console.log(`   Site URL:   ${SITE_URL}`);
  console.log(`   Callback:   ${SITE_URL}/auth/callback`);
  console.log(`   Supabase callback (pour Google): ${SUPABASE_CALLBACK}\n`);
}

main().catch(console.error);
