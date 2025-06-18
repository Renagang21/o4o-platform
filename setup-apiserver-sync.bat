@echo off
REM o4o-apiserver 전용 Git Sparse Checkout 설정 스크립트 (Windows)

echo 🚀 o4o-apiserver용 선택적 동기화 설정 중...

REM Git Sparse Checkout 활성화
git config core.sparseCheckout true

REM sparse-checkout 파일 생성
(
echo # 공통 설정 파일들
echo package.json
echo package-lock.json
echo .env.example
echo .gitignore
echo .gitattributes
echo tsconfig.json
echo prettier.config.js
echo .eslintrc.js
echo Dockerfile
echo docker-compose.production.yml
echo README.md
echo.
echo # API 서버 전용
echo /services/api-server/
echo.
echo # 공통 리소스
echo /scripts/
echo /docs/
echo /tests/
echo.
echo # GitHub Actions
echo /.github/
) > .git\info\sparse-checkout

echo 📋 API 서버용 sparse-checkout 설정 완료!

REM 설정 적용
git read-tree -m -u HEAD

echo ✅ o4o-apiserver 동기화 설정 완료!
echo 🔄 이제 git pull 시 API 서버 관련 파일만 동기화됩니다.
pause
