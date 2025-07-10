@echo off
echo ====================================
echo Common-Core 저장소 동기화 시작
echo ====================================

cd /d "C:\Users\sohae\OneDrive\Coding\common-core"

echo 1. 현재 디렉토리 확인:
cd

echo.
echo 2. Git 상태 확인:
git status

echo.
echo 3. 모든 변경사항 추가:
git add -A

echo.
echo 4. 커밋 생성:
git commit -m "feat: Production-ready Common-Core Auth system with OAuth integration

- Updated package.json with required OAuth dependencies
- Added TypeScript configuration for Node.js 20+
- Configured environment variables for production
- Added Passport.js OAuth strategies (Google, Naver, Kakao)
- Ready for auth.neture.co.kr deployment"

echo.
echo 5. 강제 푸시 (기존 GitHub 데이터 덮어쓰기):
git push origin main --force

echo.
echo ====================================
echo 동기화 완료!
echo ====================================

echo.
echo 다음 단계:
echo 1. GitHub에서 최신 커밋 확인
echo 2. 서버에서 Common-Core 설치 스크립트 실행
echo 3. OAuth 키값 설정

pause