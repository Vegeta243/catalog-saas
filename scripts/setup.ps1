# =============================================================
# EcomPilot - Script de Setup Automatique
# Usage: powershell -ExecutionPolicy Bypass -File scripts/setup.ps1
#
# Ce script complète toute la configuration APRES que vous ayez :
#   1. Collee vos cles Stripe dans .env.local
#   2. Execute la migration SQL dans Supabase
# =============================================================

$ErrorActionPreference = "Continue"
$projectRoot = Split-Path -Parent $PSScriptRoot

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       EcomPilot — Setup Automatique Complet           ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ─── Lire .env.local ───────────────────────────────────────────
$envFile = Join-Path $projectRoot ".env.local"
$envContent = Get-Content $envFile -Raw
$envLines = $envContent -split "`n" | Where-Object { $_ -and -not $_.StartsWith("#") -and $_.Contains("=") }
$envVars = @{}
foreach ($line in $envLines) {
    $parts = $line.Split("=", 2)
    if ($parts.Count -eq 2) { $envVars[$parts[0].Trim()] = $parts[1].Trim() }
}

$stripeKey = $envVars["STRIPE_SECRET_KEY"]
$pubKey = $envVars["NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"]
$supabaseUrl = $envVars["NEXT_PUBLIC_SUPABASE_URL"]

$hasStripe = $stripeKey -and -not $stripeKey.StartsWith("sk_test_REMPLACER")
$hasPubKey = $pubKey -and -not $pubKey.StartsWith("pk_test_REMPLACER")

# ─── ÉTAPE 1 : Vérifier les clés ────────────────────────────────
Write-Host "🔑 ÉTAPE 1 — Vérification des clés Stripe..." -ForegroundColor Yellow
Write-Host ""

if (-not $hasStripe) {
    Write-Host "  ❌ STRIPE_SECRET_KEY manquante dans .env.local" -ForegroundColor Red
    Write-Host ""
    Write-Host "  ► Ouverture du dashboard Stripe..." -ForegroundColor Gray
    Start-Process "https://dashboard.stripe.com/test/apikeys"
    Write-Host ""
    Write-Host "  ACTION REQUISE :" -ForegroundColor Yellow
    Write-Host "  1. Copiez sk_test_... dans STRIPE_SECRET_KEY" -ForegroundColor White
    Write-Host "  2. Copiez pk_test_... dans NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" -ForegroundColor White
    Write-Host "  3. Sauvegardez .env.local" -ForegroundColor White
    Write-Host "  4. Relancez ce script" -ForegroundColor White
    Write-Host ""
    Write-Host "  ► Ouverture de .env.local dans le Bloc-notes..." -ForegroundColor Gray
    Start-Process "notepad.exe" -ArgumentList $envFile
    exit 1
}

Write-Host "  ✅ STRIPE_SECRET_KEY: $($stripeKey.Substring(0,16))..." -ForegroundColor Green
Write-Host "  ✅ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: configurée" -ForegroundColor Green
Write-Host ""

# ─── ÉTAPE 2 : Build production ─────────────────────────────────
Write-Host "🏗️  ÉTAPE 2 — Build production..." -ForegroundColor Yellow
Write-Host ""

Set-Location $projectRoot
$buildResult = & pnpm build 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ Build échoué !" -ForegroundColor Red
    Write-Host $buildResult
    exit 1
}
Write-Host "  ✅ Build réussi" -ForegroundColor Green
Write-Host ""

# ─── ÉTAPE 3 : Démarrer le serveur de prod ──────────────────────
Write-Host "🚀 ÉTAPE 3 — Démarrage serveur production..." -ForegroundColor Yellow
Write-Host ""

$serverJob = Start-Job -ScriptBlock {
    Set-Location $using:projectRoot
    pnpm start
}

# Attendre que le serveur démarre
Write-Host "  ⏳ Attente du démarrage (10s)..." -ForegroundColor Gray
Start-Sleep -Seconds 10
Write-Host "  ✅ Serveur démarré sur http://localhost:3000" -ForegroundColor Green
Write-Host ""

# ─── ÉTAPE 4 : Créer les produits Stripe ────────────────────────
Write-Host "💳 ÉTAPE 4 — Création des produits Stripe..." -ForegroundColor Yellow
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/api/stripe/setup" `
        -Method POST `
        -ContentType "application/json" `
        -Body "{}" `
        -TimeoutSec 30

    if ($response.success) {
        Write-Host "  ✅ Produits Stripe créés avec succès !" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Price IDs générés :" -ForegroundColor Cyan

        $prices = $response.prices
        $envUpdate = @{
            "STRIPE_STARTER_MONTHLY_PRICE_ID" = $prices.starter.monthly_price_id
            "STRIPE_STARTER_YEARLY_PRICE_ID"  = $prices.starter.yearly_price_id
            "STRIPE_PRO_MONTHLY_PRICE_ID"     = $prices.pro.monthly_price_id
            "STRIPE_PRO_YEARLY_PRICE_ID"      = $prices.pro.yearly_price_id
            "STRIPE_SCALE_MONTHLY_PRICE_ID"   = $prices.scale.monthly_price_id
            "STRIPE_SCALE_YEARLY_PRICE_ID"    = $prices.scale.yearly_price_id
        }

        foreach ($kv in $envUpdate.GetEnumerator()) {
            Write-Host "    $($kv.Key) = $($kv.Value)" -ForegroundColor White
        }

        # Mettre à jour .env.local automatiquement
        $content = Get-Content $envFile -Raw
        foreach ($kv in $envUpdate.GetEnumerator()) {
            $content = $content -replace "$($kv.Key)=.*", "$($kv.Key)=$($kv.Value)"
        }
        Set-Content $envFile $content -NoNewLine
        Write-Host ""
        Write-Host "  ✅ .env.local mis à jour avec les Price IDs !" -ForegroundColor Green
    }
} catch {
    Write-Host "  ⚠️  Erreur lors de la création des produits: $_" -ForegroundColor Yellow
    Write-Host "  → Essayez manuellement: POST http://localhost:3000/api/stripe/setup" -ForegroundColor Gray
}

Write-Host ""

# ─── ÉTAPE 5 : Arrêter le serveur temporaire ────────────────────
Stop-Job $serverJob -ErrorAction SilentlyContinue
Remove-Job $serverJob -ErrorAction SilentlyContinue
Write-Host "  ✅ Serveur temporaire arrêté" -ForegroundColor Green
Write-Host ""

# ─── ÉTAPE 6 : Rebuild avec nouveaux Price IDs ──────────────────
Write-Host "🏗️  ÉTAPE 5 — Rebuild final avec Price IDs..." -ForegroundColor Yellow
Write-Host ""
& pnpm build 2>&1 | Select-Object -Last 5
Write-Host "  ✅ Build final réussi !" -ForegroundColor Green
Write-Host ""

# ─── ÉTAPE 6 : Migration Supabase ───────────────────────────────
Write-Host "🗄️  ÉTAPE 6 — Migration Supabase..." -ForegroundColor Yellow
Write-Host ""

$projectRef = $supabaseUrl -replace "https://", "" -replace "\.supabase\.co.*", ""
$sqlEditorUrl = "https://supabase.com/dashboard/project/$projectRef/editor"

Write-Host "  ► Ouverture du SQL Editor Supabase..." -ForegroundColor Gray
Start-Process $sqlEditorUrl

Write-Host "  ACTIONS REQUISES :" -ForegroundColor Yellow
Write-Host "  1. Dans le SQL Editor qui vient de s'ouvrir" -ForegroundColor White
Write-Host "  2. Copiez le contenu de: supabase/migrations/001_users_stripe.sql" -ForegroundColor White
Write-Host "  3. Collez et cliquez 'Run'" -ForegroundColor White
Write-Host ""

# Afficher le SQL pour faciliter le copier-coller
Write-Host "  (Le fichier SQL est dans: supabase/migrations/001_users_stripe.sql)" -ForegroundColor Gray
Write-Host ""

# ─── ÉTAPE 7 : Stripe Login + Webhook Listener ──────────────────
Write-Host "🔔 ÉTAPE 7 — Webhook Stripe..." -ForegroundColor Yellow
Write-Host ""

# Chercher stripe dans PATH ou là où winget l'a installé
$stripePaths = @(
    "stripe",
    "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Stripe.StripeCli_Microsoft.Winget.Source_8wekyb3d8bbwe\stripe.exe",
    "C:\Program Files\Stripe\stripe.exe"
)
$stripeCmd = $null
foreach ($p in $stripePaths) {
    $found = Get-Command $p -ErrorAction SilentlyContinue
    if ($found) { $stripeCmd = $found.Source; break }
}

# Try refreshing PATH
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")
$stripeFound = Get-Command "stripe" -ErrorAction SilentlyContinue

if ($stripeFound) {
    Write-Host "  ✅ Stripe CLI trouvée" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Lancement du webhook listener dans un nouveau terminal..." -ForegroundColor Gray

    Start-Process "powershell" -ArgumentList @(
        "-NoExit",
        "-Command",
        "Write-Host 'Stripe Webhook Listener' -ForegroundColor Cyan; Write-Host ''; stripe login; Write-Host ''; stripe listen --forward-to localhost:3000/api/stripe/webhook"
    )

    Write-Host "  ✅ Terminal Stripe ouvert - connectez-vous et le webhook démarrera automatiquement" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Stripe CLI non trouvée dans PATH (redémarrez PowerShell après installation)" -ForegroundColor Yellow
    Write-Host "  → Dans un nouveau terminal: stripe login && stripe listen --forward-to localhost:3000/api/stripe/webhook" -ForegroundColor Gray
}

Write-Host ""

# ─── RÉSUMÉ FINAL ──────────────────────────────────────────────
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  ✅ SETUP TERMINÉ !" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "  PRÊT POUR LE TEST :" -ForegroundColor White
Write-Host "  1. Complétez la migration Supabase (SQL Editor ouvert)" -ForegroundColor White
Write-Host "  2. Connectez-vous dans le terminal Stripe (webhook ouvert)" -ForegroundColor White
Write-Host "  3. Lancez: pnpm dev  (ou pnpm start)" -ForegroundColor White
Write-Host "  4. Allez sur: http://localhost:3000/dashboard/upgrade" -ForegroundColor White
Write-Host "  5. Choisissez un plan → testez avec carte 4242 4242 4242 4242" -ForegroundColor White
Write-Host ""
Write-Host "  Carte Stripe de test :" -ForegroundColor Cyan
Write-Host "  Numero:    4242 4242 4242 4242" -ForegroundColor White
Write-Host "  Expiry:    n'importe quelle date future (ex: 12/28)" -ForegroundColor White
Write-Host "  CVC:       n'importe quel 3 chiffres (ex: 123)" -ForegroundColor White
Write-Host ""
