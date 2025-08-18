#!/bin/bash

# API 서버 전용 Git Sparse Checkout 설정 스크립트
# 이 스크립트는 API 서버에 필요한 파일만 동기화하도록 설정합니다.

echo "🔧 API 서버 전용 Sparse Checkout 설정 시작..."

# 1. Sparse checkout 활성화
git config core.sparseCheckout true
echo "✅ Sparse checkout 활성화 완료"

# 2. sparse-checkout 파일 생성
cat > .git/info/sparse-checkout << EOF
# API 서버 관련 파일
apps/api-server/*

# API 서버가 의존하는 패키지들
packages/types/*
packages/utils/*
packages/auth-client/*
packages/crowdfunding-types/*

# 루트 설정 파일들
package.json
package-lock.json
tsconfig.json
.env.example

# 필요한 스크립트
scripts/create-admin.ts
scripts/test-database.js

# 설정 파일
.eslintrc.js
.prettierrc
EOF

echo "✅ Sparse checkout 파일 생성 완료"

# 3. 변경사항 적용
git read-tree -m -u HEAD
echo "✅ Sparse checkout 적용 완료"

echo "📦 API 서버 전용 동기화 설정 완료!"
echo ""
echo "제외된 디렉토리:"
echo "  - apps/main-site"
echo "  - apps/admin-dashboard"
echo "  - apps/crowdfunding"
echo "  - apps/digital-signage"
echo "  - apps/ecommerce"
echo "  - apps/forum"
echo "  - packages/ui"
echo "  - packages/auth-context"
echo "  - packages/shortcodes"
echo "  - packages/forum-types"
echo "  - packages/supplier-connector"