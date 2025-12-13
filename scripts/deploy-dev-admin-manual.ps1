#
# Manual deployment script for Dev Admin Dashboard (Windows PowerShell)
# Deploys to dev-admin.neture.co.kr (development environment)
#
# Usage: .\scripts\deploy-dev-admin-manual.ps1
#

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting manual deployment of Dev Admin Dashboard..." -ForegroundColor Cyan
Write-Host "⚠️  Target: dev-admin.neture.co.kr (DEVELOPMENT)" -ForegroundColor Yellow
Write-Host ""

# Change to project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

# Check if we're in the right directory
if (-not (Test-Path "apps\admin-dashboard\package.json")) {
    Write-Host "❌ Error: Not in the correct directory" -ForegroundColor Red
    exit 1
}

# Check git status
$GitStatus = git status --porcelain
if ($GitStatus) {
    Write-Host "⚠️  Warning: You have uncommitted changes" -ForegroundColor Yellow
    $Response = Read-Host "Continue anyway? (y/N)"
    if ($Response -ne "y" -and $Response -ne "Y") {
        exit 1
    }
}

# Build packages first
Write-Host "📦 Building packages..." -ForegroundColor Cyan
pnpm run build:packages 2>&1 | Select-String -Pattern "(✅|❌|Error|error|warning)" | ForEach-Object { Write-Host $_ }

# Build admin dashboard
Write-Host "🔨 Building admin dashboard..." -ForegroundColor Cyan
Set-Location "apps\admin-dashboard"

$env:NODE_ENV = "production"
$env:NODE_OPTIONS = "--max-old-space-size=4096"
$env:VITE_API_URL = "https://api.neture.co.kr/api"
$env:VITE_PUBLIC_APP_ORIGIN = "https://neture.co.kr"
$env:VITE_GIT_BRANCH = "develop"

pnpm run build:prod 2>&1 | Select-Object -Last 20

Set-Location $ProjectRoot

# Create temp directory
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$TempDir = "$env:TEMP\dev-admin-deploy-$Timestamp"
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

# Copy dist contents to temp
Write-Host "📦 Preparing deployment files..." -ForegroundColor Cyan
Copy-Item -Path "apps\admin-dashboard\dist\*" -Destination $TempDir -Recurse

Write-Host "✅ Deployment files prepared: $TempDir" -ForegroundColor Green
Write-Host ""

# Copy to web server using scp
Write-Host "📤 Uploading to web server..." -ForegroundColor Cyan
ssh o4o-web "mkdir -p /tmp/dev-admin-deploy"
scp -r "$TempDir\*" o4o-web:/tmp/dev-admin-deploy/

# Deploy on web server
Write-Host "🚀 Deploying on web server..." -ForegroundColor Cyan
$DeployScript = @'
set -e

echo "📋 Verifying files..."
if [ ! -f /tmp/dev-admin-deploy/version.json ]; then
  echo "❌ Error: version.json not found!"
  exit 1
fi

echo "📄 New version:"
cat /tmp/dev-admin-deploy/version.json
echo ""

echo "💾 Backing up current deployment..."
sudo cp -r /var/www/dev-admin.neture.co.kr "/var/www/dev-admin.neture.co.kr.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true

echo "🗑️  Clearing current deployment..."
sudo rm -rf /var/www/dev-admin.neture.co.kr/*

echo "📦 Deploying new files..."
sudo cp -r /tmp/dev-admin-deploy/* /var/www/dev-admin.neture.co.kr/

echo "🔧 Setting permissions..."
sudo chown -R www-data:www-data /var/www/dev-admin.neture.co.kr/
sudo chmod -R 755 /var/www/dev-admin.neture.co.kr/

echo "🧹 Cleaning up..."
rm -rf /tmp/dev-admin-deploy

echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx

echo "✅ Deployment complete!"
echo ""
echo "📄 Deployed version:"
cat /var/www/dev-admin.neture.co.kr/version.json
'@

$DeployScript | ssh o4o-web "bash -s"

Write-Host ""
Write-Host "✅ Dev Admin Dashboard deployed successfully!" -ForegroundColor Green
Write-Host "🌐 URL: https://dev-admin.neture.co.kr" -ForegroundColor Cyan
Write-Host ""

# Clean up local temp
Remove-Item -Path $TempDir -Recurse -Force
Write-Host "🧹 Cleaned up local temp files" -ForegroundColor Gray
