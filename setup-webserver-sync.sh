#!/bin/bash
# o4o-webserver 전용 Git Sparse Checkout 설정 스크립트

echo "🚀 o4o-webserver용 선택적 동기화 설정 중..."

# Git Sparse Checkout 활성화
git config core.sparseCheckout true

# sparse-checkout 파일 생성 (웹 서버에 필요한 파일들만)
cat > .git/info/sparse-checkout << EOF
# 공통 설정 파일들
package.json
package-lock.json
.env.example
.gitignore
.gitattributes
tsconfig.json
prettier.config.js
.eslintrc.js
Dockerfile
docker-compose.production.yml
README.md
playwright.config.ts

# 웹 서버 전용
/services/main-site/

# 공통 리소스
/scripts/
/docs/
/tests/

# GitHub Actions (배포 자동화용)
/.github/
EOF

echo "📋 웹 서버용 sparse-checkout 설정 완료!"
echo "포함된 경로:"
cat .git/info/sparse-checkout

# 설정 적용
git read-tree -m -u HEAD

echo "✅ o4o-webserver 동기화 설정 완료!"
echo "🔄 이제 git pull 시 웹 서버 관련 파일만 동기화됩니다."

# 상태 확인
echo ""
echo "📊 현재 체크아웃된 파일 목록:"
git ls-files | head -20
echo "... (총 $(git ls-files | wc -l)개 파일)"
