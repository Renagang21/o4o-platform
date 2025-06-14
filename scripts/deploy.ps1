# PowerShell 배포 스크립트

Write-Host "🚀 O4O Platform 배포 시작..." -ForegroundColor Green

# 프론트엔드 배포
Write-Host "`n📦 프론트엔드 배포 중..." -ForegroundColor Yellow
ssh o4o-webserver "cd /home/ubuntu/o4o-platform && ./scripts/deploy-frontend.sh"

# 백엔드 배포
Write-Host "`n📦 백엔드 배포 중..." -ForegroundColor Yellow
ssh o4o-apiserver "cd /home/ubuntu/o4o-platform && ./scripts/deploy-backend.sh"

Write-Host "`n✅ 배포 완료!" -ForegroundColor Green 