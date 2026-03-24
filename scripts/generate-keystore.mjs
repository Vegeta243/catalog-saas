/**
 * Android Release Keystore Generator
 * 
 * Prerequisites: JDK (Java Development Kit) must be installed.
 * Download from: https://adoptium.net/  (Eclipse Temurin LTS — free)
 * 
 * Run this script ONCE to generate your release keystore:
 *   node scripts/generate-keystore.mjs
 * 
 * Then copy the SHA256 fingerprint into:
 *   public/.well-known/assetlinks.json
 * 
 * ⚠️  KEEP THE KEYSTORE FILE SAFE — you need it for every Play Store update!
 * ⚠️  NEVER commit the keystore or its password to git!
 */

import { execSync } from 'child_process'
import { existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dir, '..')
const KEYSTORE_DIR = join(ROOT, 'keys')
const KEYSTORE_PATH = join(KEYSTORE_DIR, 'ecompilot-release.keystore')

const CONFIG = {
  alias:       'ecompilot',
  storepass:   'EcomPilot2024!',   // ← change this to a strong password
  keypass:     'EcomPilot2024!',   // ← change this to a strong password
  dname:       'CN=EcomPilot Elite, OU=Mobile, O=EcomPilot, L=Paris, S=IDF, C=FR',
  validity:    10000,              // ~27 years
  keysize:     2048,
  keyalg:      'RSA',
  sigalg:      'SHA256withRSA',
}

if (!existsSync(KEYSTORE_DIR)) mkdirSync(KEYSTORE_DIR, { recursive: true })

if (existsSync(KEYSTORE_PATH)) {
  console.log('✅ Keystore already exists:', KEYSTORE_PATH)
} else {
  console.log('🔑 Generating Android release keystore...')
  const cmd = [
    'keytool -genkey -v',
    `-keystore "${KEYSTORE_PATH}"`,
    `-alias ${CONFIG.alias}`,
    `-keyalg ${CONFIG.keyalg}`,
    `-keysize ${CONFIG.keysize}`,
    `-sigalg ${CONFIG.sigalg}`,
    `-validity ${CONFIG.validity}`,
    `-storepass "${CONFIG.storepass}"`,
    `-keypass "${CONFIG.keypass}"`,
    `-dname "${CONFIG.dname}"`,
  ].join(' ')

  try {
    execSync(cmd, { stdio: 'inherit' })
    console.log('✅ Keystore generated:', KEYSTORE_PATH)
  } catch {
    console.error('❌ keytool not found. Install JDK from: https://adoptium.net/')
    process.exit(1)
  }
}

// Extract SHA256 fingerprint
console.log('\n📋 Extracting SHA256 fingerprint...\n')
try {
  const output = execSync(
    `keytool -list -v -keystore "${KEYSTORE_PATH}" -alias ${CONFIG.alias} -storepass "${CONFIG.storepass}"`,
    { encoding: 'utf-8' }
  )

  const sha256Match = output.match(/SHA256:\s*([A-F0-9:]+)/i)
  if (sha256Match) {
    const sha256 = sha256Match[1].trim()
    console.log('SHA256 fingerprint:')
    console.log(sha256)
    console.log('\n📝 Copy this SHA256 into:')
    console.log('   public/.well-known/assetlinks.json')
    console.log('   Replace: REPLACE_WITH_YOUR_KEYSTORE_SHA256_FINGERPRINT')
    console.log('\nThen run:')
    console.log('   git add public/.well-known/assetlinks.json && git commit -m "fix: update assetlinks SHA256" && git push')
    console.log('   npx vercel --prod --yes')
    console.log('\n🎉 After deploying, verify at:')
    console.log('   https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://www.ecompilotelite.com&relation=delegate_permission/common.handle_all_urls')
  }
} catch {
  console.error('❌ Could not read keystore')
}
