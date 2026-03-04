# =============================================================================
# Script de configuration automatique Supabase OAuth
# =============================================================================
# COMMENT L'UTILISER :
# 1. Va sur https://supabase.com/dashboard/account/tokens
# 2. Cree un token personnel (nom: "catalog-saas-config")
# 3. Lance ce script:
#    .\scripts\configure-supabase-oauth.ps1 -SupabaseToken "sbp_VOTRE_TOKEN"
#
# Pour Google OAuth, ajouter aussi:
#    .\scripts\configure-supabase-oauth.ps1 -SupabaseToken "sbp_..." -GoogleClientId "VOTRE_ID" -GoogleClientSecret "VOTRE_SECRET"
# =============================================================================

param(
    [Parameter(Mandatory=$true)]
    [string]$SupabaseToken,
    
    [string]$GoogleClientId = "",
    [string]$GoogleClientSecret = "",
    [string]$AppleClientId = "",
    [string]$AppleTeamId = "",
    [string]$AppleKeyId = "",
    [string]$ApplePrivateKey = ""
)

$PROJECT_REF  = "mhroujagzclmdlfpiqju"
$SITE_URL     = "https://www.ecompilotelite.com"
$API_BASE     = "https://api.supabase.com/v1/projects/$PROJECT_REF"
$HEADERS      = @{
    "Authorization" = "Bearer $SupabaseToken"
    "Content-Type"  = "application/json"
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   EcomPilot - Configuration Supabase OAuth       ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# ── 1. Configuration Site URL + Redirect URLs ────────────────
Write-Host "▶ Etape 1/4 - Configuration Site URL et Redirects..." -ForegroundColor Yellow

$authConfig = @{
    site_url     = $SITE_URL
    uri_allow_list = @(
        "$SITE_URL/auth/callback",
        "http://localhost:3000/auth/callback"
    )
    external_email_enabled     = $true
    mailer_autoconfirm         = $false
    smtp_admin_email           = "noreply@ecompilotelite.com"
    smtp_sender_name           = "EcomPilot Elite"
    jwt_exp                    = 3600
    refresh_token_rotation_enabled = $true
    security_update_password_require_reauthentication = $false
}

try {
    $body = $authConfig | ConvertTo-Json -Depth 5
    $r = Invoke-RestMethod -Uri "$API_BASE/config/auth" -Headers $HEADERS -Method PATCH -Body $body
    Write-Host "  ✅ Site URL configuré: $SITE_URL" -ForegroundColor Green
    Write-Host "  ✅ Redirects autorisés:" -ForegroundColor Green
    Write-Host "     - $SITE_URL/auth/callback" -ForegroundColor Green
    Write-Host "     - http://localhost:3000/auth/callback" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Erreur: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "  Vérifiez que votre token est valide." -ForegroundColor Red
    exit 1
}

# ── 2. Activation Google OAuth ───────────────────────────────
Write-Host ""
Write-Host "▶ Etape 2/4 - Google OAuth..." -ForegroundColor Yellow

if ($GoogleClientId -ne "" -and $GoogleClientSecret -ne "") {
    $googleConfig = @{
        external_google_enabled       = $true
        external_google_client_id     = $GoogleClientId
        external_google_secret        = $GoogleClientSecret
    }
    try {
        $body = $googleConfig | ConvertTo-Json
        $r = Invoke-RestMethod -Uri "$API_BASE/config/auth" -Headers $HEADERS -Method PATCH -Body $body
        Write-Host "  ✅ Google OAuth activé!" -ForegroundColor Green
        Write-Host "  ✅ Client ID: $($GoogleClientId.Substring(0, [Math]::Min(20, $GoogleClientId.Length)))..." -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Erreur Google OAuth: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "  ⏭ Ignoré (credentials non fournis)" -ForegroundColor Gray
    Write-Host "  Pour activer Google: relancez avec -GoogleClientId et -GoogleClientSecret" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Comment obtenir les credentials Google:" -ForegroundColor Cyan
    Write-Host "  1. https://console.cloud.google.com" -ForegroundColor White
    Write-Host "  2. Créer un projet ou sélectionner le vôtre" -ForegroundColor White
    Write-Host "  3. APIs & Services > Identifiants > Créer des identifiants > ID client OAuth 2.0" -ForegroundColor White
    Write-Host "  4. Type: Application Web" -ForegroundColor White
    Write-Host "  5. URI de redirection autorisés: https://mhroujagzclmdlfpiqju.supabase.co/auth/v1/callback" -ForegroundColor White
    Write-Host "  6. Télécharger le JSON ou copier Client ID + Client Secret" -ForegroundColor White
}

# ── 3. Activation Apple Sign In ──────────────────────────────
Write-Host ""
Write-Host "▶ Etape 3/4 - Apple Sign In..." -ForegroundColor Yellow

if ($AppleClientId -ne "" -and $AppleTeamId -ne "" -and $AppleKeyId -ne "" -and $ApplePrivateKey -ne "") {
    $appleConfig = @{
        external_apple_enabled    = $true
        external_apple_client_id  = $AppleClientId
        external_apple_secret     = "$($AppleTeamId):$($AppleKeyId):$($ApplePrivateKey)"
    }
    try {
        $body = $appleConfig | ConvertTo-Json
        $r = Invoke-RestMethod -Uri "$API_BASE/config/auth" -Headers $HEADERS -Method PATCH -Body $body
        Write-Host "  ✅ Apple Sign In activé!" -ForegroundColor Green
    } catch {
        Write-Host "  ❌ Erreur Apple Sign In: $($_.Exception.Message)" -ForegroundColor Red
    }
} else {
    Write-Host "  ⏭ Ignoré (credentials non fournis)" -ForegroundColor Gray
    Write-Host "  Pour activer Apple: https://developer.apple.com > Certificates > Sign In with Apple" -ForegroundColor Gray
}

# ── 4. Vérification finale ───────────────────────────────────
Write-Host ""
Write-Host "▶ Etape 4/4 - Vérification de la configuration..." -ForegroundColor Yellow

try {
    $config = Invoke-RestMethod -Uri "$API_BASE/config/auth" -Headers $HEADERS -Method GET
    Write-Host "  ✅ Site URL actuel: $($config.site_url)" -ForegroundColor Green
    Write-Host "  ✅ Email activé: $($config.external_email_enabled)" -ForegroundColor Green
    Write-Host "  ✅ Google activé: $($config.external_google_enabled)" -ForegroundColor Green
    Write-Host "  ✅ Apple activé: $($config.external_apple_enabled)" -ForegroundColor Green
    Write-Host ""
    $redirects = $config.uri_allow_list -join "`n     "
    Write-Host "  ✅ Redirects autorisés:`n     $redirects" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Impossible de vérifier: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "╔══════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Configuration terminée!                        ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Prochaine étape: Redéploiement sur Vercel pour appliquer" -ForegroundColor Yellow
Write-Host "  git push origin main  →  Vercel redéploie automatiquement" -ForegroundColor White
Write-Host ""
