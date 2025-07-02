# Common-Core 저장소 동기화 스크립트

Write-Host "====================================" -ForegroundColor Green
Write-Host "Common-Core 저장소 동기화 시작" -ForegroundColor Green  
Write-Host "====================================" -ForegroundColor Green

# 1. common-core 디렉토리로 이동
Set-Location "C:\Users\sohae\OneDrive\Coding\common-core"

Write-Host "`n1. 현재 디렉토리 확인:" -ForegroundColor Yellow
Get-Location

Write-Host "`n2. Git 상태 확인:" -ForegroundColor Yellow
git status

Write-Host "`n3. 모든 변경사항 추가:" -ForegroundColor Yellow
git add -A

Write-Host "`n4. 커밋 생성:" -ForegroundColor Yellow
git commit -m "feat: Production-ready Common-Core Auth system with OAuth integration

- Updated package.json with required OAuth dependencies  
- Added TypeScript configuration for Node.js 20+
- Configured environment variables for production
- Added Passport.js OAuth strategies (Google, Naver, Kakao)
- Ready for auth.neture.co.kr deployment"

Write-Host "`n5. 강제 푸시 (기존 GitHub 데이터 덮어쓰기):" -ForegroundColor Yellow
git push origin main --force

Write-Host "`n====================================" -ForegroundColor Green
Write-Host "동기화 완료!" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

Write-Host "`n다음 단계:" -ForegroundColor Cyan
Write-Host "1. GitHub에서 최신 커밋 확인" -ForegroundColor White
Write-Host "2. 서버에서 Common-Core 설치 스크립트 실행" -ForegroundColor White  
Write-Host "3. OAuth 키값 설정" -ForegroundColor White

Read-Host "`nPress Enter to continue"