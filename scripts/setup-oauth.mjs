#!/usr/bin/env node
/**
 * Configuration automatique Supabase OAuth (Google + Apple)
 *
 * USAGE - Google seulement:
 *   node scripts/setup-oauth.mjs SBP_TOKEN GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET
 *
 * USAGE - Apple seulement:
 *   node scripts/setup-oauth.mjs SBP_TOKEN "" "" APPLE_SERVICE_ID APPLE_TEAM_ID APPLE_KEY_ID APPLE_PRIVATE_KEY_FILE.p8
 *
 * USAGE - Google + Apple:
 *   node scripts/setup-oauth.mjs SBP_TOKEN GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET APPLE_SERVICE_ID APPLE_TEAM_ID APPLE_KEY_ID APPLE_PRIVATE_KEY_FILE.p8
 *
 * Obtenir SBP_TOKEN: https://supabase.com/dashboard/account/tokens
 */

import { createSign } from "crypto";
import { readFileSync, existsSync } from "fs";

const PROJECT_REF      = "mhroujagzclmdlfpiqju";
const SITE_URL         = "https://www.ecompilotelite.com";
const SUPABASE_CALLBACK = `https://${PROJECT_REF}.supabase.co/auth/v1/callback`;

const token = process.argv[2];
if (!token) {
  console.error("\n❌ Token manquant!\n");
  console.error("Usage: node scripts/setup-oauth.mjs sbp_TOKEN [GOOGLE_ID GOOGLE_SECRET] [APPLE_SERVICE_ID APPLE_TEAM_ID APPLE_KEY_ID APPLE_KEY.p8]\n");
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

/**
 * Génère le client_secret JWT Apple (ES256, valide 180 jours)
 * Conforme: https://developer.apple.com/documentation/accountorganizationaldatasharing/creating-a-client-secret
 */
function generateAppleClientSecret({ serviceId, teamId, keyId, privateKeyPath }) {
  let privateKey;
  if (existsSync(privateKeyPath)) {
    privateKey = readFileSync(privateKeyPath, "utf8");
  } else {
    // Accepte aussi le contenu brut de la clé en lieu et place du chemin
    privateKey = privateKeyPath;
  }

  const b64url = (buf) =>
    Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");

  const header  = b64url(JSON.stringify({ alg: "ES256", kid: keyId }));
  const now     = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({
    iss: teamId,
    iat: now,
    exp: now + 15552000, // 180 jours (maximum Apple)
    aud: "https://appleid.apple.com",
    sub: serviceId,
  }));

  const signingInput = `${header}.${payload}`;
  const sign = createSign("SHA256");
  sign.update(signingInput);

  // dsaEncoding: "ieee-p1363" = format r||s (64 bytes P-256) = format JWT
  const sigBuf = sign.sign({ key: privateKey, dsaEncoding: "ieee-p1363" });
  const signature = b64url(sigBuf);

  return `${signingInput}.${signature}`;
}

async function main() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║   EcomPilot Elite - Configuration OAuth          ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // ── Étape 1: Site URL + Redirects ─────────────────────────
  console.log("▶ [1/4] Configuration Site URL et redirects...");
  try {
    await req("PATCH", "/config/auth", {
      site_url: SITE_URL,
      uri_allow_list: `${SITE_URL}/auth/callback,http://localhost:3000/auth/callback`,
      mailer_autoconfirm: false,
      external_email_enabled: true,
      refresh_token_rotation_enabled: true,
    });
    console.log(`  ✅ Site URL: ${SITE_URL}`);
    console.log(`  ✅ Callbacks: prod + localhost`);
  } catch (e) {
    console.error(`  ❌ Erreur: ${e.message}`);
    process.exit(1);
  }

  // ── Étape 2: Lecture config actuelle ──────────────────────
  console.log("\n▶ [2/4] Lecture configuration actuelle...");
  let config;
  try {
    config = await req("GET", "/config/auth");
    console.log(`  ✅ Google activé: ${config.external_google_enabled}`);
    console.log(`  ✅ Apple activé:  ${config.external_apple_enabled}`);
    console.log(`  ✅ Site URL:      ${config.site_url}`);
  } catch (e) {
    console.error(`  ❌ Lecture config: ${e.message}`);
  }

  // ── Étape 3: Google OAuth ─────────────────────────────────
  const googleClientId = process.argv[3];
  const googleSecret   = process.argv[4];
  console.log("\n▶ [3/4] Google OAuth...");
  if (googleClientId && googleSecret) {
    try {
      await req("PATCH", "/config/auth", {
        external_google_enabled: true,
        external_google_client_id: googleClientId,
        external_google_secret: googleSecret,
      });
      console.log("  ✅ Google OAuth activé avec succès!");
    } catch (e) {
      console.error(`  ❌ Erreur Google: ${e.message}`);
    }
  } else if (config?.external_google_enabled) {
    console.log("  ✅ Google déjà activé (inchangé)");
  } else {
    console.log("  ⏭  Aucun credential Google fourni — ignoré");
  }

  // ── Étape 4: Apple Sign In ────────────────────────────────
  const appleServiceId = process.argv[5];
  const appleTeamId    = process.argv[6];
  const appleKeyId     = process.argv[7];
  const appleKeyFile   = process.argv[8];
  console.log("\n▶ [4/4] Apple Sign In...");
  if (appleServiceId && appleTeamId && appleKeyId && appleKeyFile) {
    try {
      console.log("  🔑 Génération du client_secret JWT Apple (ES256)...");
      const clientSecret = generateAppleClientSecret({
        serviceId:      appleServiceId,
        teamId:         appleTeamId,
        keyId:          appleKeyId,
        privateKeyPath: appleKeyFile,
      });
      console.log("  ✅ JWT généré (valide 180 jours)");

      await req("PATCH", "/config/auth", {
        external_apple_enabled:   true,
        external_apple_client_id: appleServiceId,
        external_apple_secret:    clientSecret,
      });
      console.log("  ✅ Apple Sign In activé avec succès!");
    } catch (e) {
      console.error(`  ❌ Erreur Apple: ${e.message}`);
    }
  } else if (config?.external_apple_enabled) {
    console.log("  ✅ Apple déjà activé (inchangé)");
  } else {
    console.log("  ⏭  Aucun credential Apple fourni — ignoré");
    console.log("\n  Pour activer Apple Sign In:");
    console.log("  1. https://developer.apple.com → Certificates, IDs & Profiles");
    console.log("  2. Identifiers → App ID → activer 'Sign In with Apple'");
    console.log("  3. Identifiers → '+' → Services ID → activer 'Sign In with Apple'");
    console.log(`     Callback à renseigner: ${SUPABASE_CALLBACK}`);
    console.log("  4. Keys → '+' → activer 'Sign In with Apple' → télécharger .p8");
    console.log("  5. Relancer:");
    console.log("     node scripts/setup-oauth.mjs sbp_TOKEN \"\" \"\" APPLE_SERVICE_ID TEAM_ID KEY_ID chemin/vers/AuthKey_XXXX.p8");
  }

  // ── Résumé final ──────────────────────────────────────────
  let finalConfig;
  try { finalConfig = await req("GET", "/config/auth"); } catch {}

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║   Configuration terminée!                        ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log("\n📋 Récapitulatif Supabase:");
  console.log(`   Site URL:    ${finalConfig?.site_url ?? SITE_URL}`);
  console.log(`   Google:      ${finalConfig?.external_google_enabled ? "✅ activé" : "❌ inactif"}`);
  console.log(`   Apple:       ${finalConfig?.external_apple_enabled  ? "✅ activé" : "❌ inactif"}`);
  console.log(`   Callback:    ${SITE_URL}/auth/callback`);
  console.log(`   Supabase CB: ${SUPABASE_CALLBACK}\n`);
}

main().catch(console.error);
