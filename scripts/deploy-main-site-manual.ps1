#
# Manual deployment script for Main Site (Windows PowerShell)
# Use this when GitHub Actions is not working
#
# Usage: .\scripts\deploy-main-site-manual.ps1
#

$ErrorActionPreference = "Stop"

Write-Host "🚀 Starting manual deployment of Main Site..." -ForegroundColor Cyan
Write-Host ""

# Change to project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir
Set-Location $ProjectRoot

# Check if we're in the right directory
if (-not (Test-Path "apps\main-site\package.json")) {
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

# Build main site
Write-Host "🔨 Building main site..." -ForegroundColor Cyan
Set-Location "apps\main-site"

$env:NODE_ENV = "production"
$env:NODE_OPTIONS = "--max-old-space-size=4096"
$env:GENERATE_SOURCEMAP = "false"
$env:VITE_API_URL = "https://api.neture.co.kr"

pnpm run build 2>&1 | Select-String -Pattern "(✅|❌|vite|built|error|warning)" | ForEach-Object { Write-Host $_ }

Set-Location $ProjectRoot

# Create temp directory
$Timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$TempDir = "$env:TEMP\main-site-deploy-$Timestamp"
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

# Copy dist contents to temp
Write-Host "📦 Preparing deployment files..." -ForegroundColor Cyan
Copy-Item -Path "apps\main-site\dist\*" -Destination $TempDir -Recurse

Write-Host "✅ Deployment files prepared: $TempDir" -ForegroundColor Green
Write-Host ""

# Copy to web server using scp
Write-Host "📤 Uploading to web server..." -ForegroundColor Cyan
ssh o4o-web "mkdir -p /tmp/main-site-deploy"
scp -r "$TempDir\*" o4o-web:/tmp/main-site-deploy/

# Deploy on web server
Write-Host "🚀 Deploying on web server..." -ForegroundColor Cyan
$DeployScript = @'
set -e

echo "📋 Verifying files..."
if [ ! -f /tmp/main-site-deploy/index.html ]; then
  echo "❌ Error: index.html not found!"
  exit 1
fi

echo "💾 Backing up current deployment..."
sudo cp -r /var/www/neture.co.kr "/var/www/neture.co.kr.backup.$(date +%Y%m%d_%H%M%S)" 2>/dev/null || true

echo "🗑️  Clearing current deployment..."
sudo rm -rf /var/www/neture.co.kr/*

echo "📦 Deploying new files..."
sudo cp -r /tmp/main-site-deploy/* /var/www/neture.co.kr/

echo "🔧 Setting permissions..."
sudo chown -R www-data:www-data /var/www/neture.co.kr/
sudo chmod -R 755 /var/www/neture.co.kr/

echo "🧹 Cleaning up..."
rm -rf /tmp/main-site-deploy

echo "🔄 Reloading Nginx..."
sudo systemctl reload nginx

echo "✅ Deployment complete!"
echo ""
echo "📄 Deployed version:"
if [ -f /var/www/neture.co.kr/version.json ]; then
  cat /var/www/neture.co.kr/version.json
else
  echo "No version.json found"
fi
'@

$DeployScript | ssh o4o-web "bash -s"

Write-Host ""
Write-Host "✅ Main Site deployed successfully!" -ForegroundColor Green
Write-Host "🌐 URL: https://neture.co.kr" -ForegroundColor Cyan
Write-Host ""

# Clean up local temp
Remove-Item -Path $TempDir -Recurse -Force
Write-Host "🧹 Cleaned up local temp files" -ForegroundColor Gray
