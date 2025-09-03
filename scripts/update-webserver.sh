#!/bin/bash

# 웹서버 업데이트 스크립트
# 401 인증 오류 수정 사항 적용

echo "🔄 O4O Platform 웹서버 업데이트 시작..."

# 1. Git에서 최신 코드 가져오기
echo "📥 최신 코드 가져오기..."
git pull origin main

# 2. 패키지 설치 (변경사항이 있을 경우)
echo "📦 패키지 설치..."
pnpm install

# 3. auth-client 패키지 빌드 (토큰 우선순위 수정 적용)
echo "🔨 auth-client 패키지 빌드..."
cd packages/auth-client
pnpm run build
cd ../..

# 4. auth-context 패키지 빌드
echo "🔨 auth-context 패키지 빌드..."
cd packages/auth-context
pnpm run build
cd ../..

# 5. 전체 패키지 빌드
echo "🔨 전체 패키지 빌드..."
pnpm run build:packages

# 6. Admin Dashboard 빌드
echo "🔨 Admin Dashboard 빌드..."
cd apps/admin-dashboard
pnpm run build
cd ../..

# 7. PM2 프로세스 재시작
echo "🔄 PM2 프로세스 재시작..."
pm2 restart o4o-webserver
pm2 restart o4o-main-site

# 8. PM2 상태 확인
echo "✅ PM2 상태 확인..."
pm2 status

echo "✨ 웹서버 업데이트 완료!"
echo "📌 변경사항:"
echo "  - apiClient.ts: 토큰 조회 우선순위 수정 (accessToken 우선)"
echo "  - AuthClient: 토큰 조회 우선순위 수정"
echo "  - CategoryList: 타임스탬프 오류 처리"