#!/bin/bash

# API 서버 의존성 문제 해결 스크립트

echo "🔧 API 서버 의존성 문제 해결 시작"

# 1. 모노레포 내부 패키지들 빌드
echo "📦 내부 패키지 빌드 중..."

# supplier-connector 패키지 빌드
if [ -d "packages/supplier-connector" ]; then
    echo "Building @o4o/supplier-connector..."
    cd packages/supplier-connector
    pnpm install
    pnpm run build 2>/dev/null || npx tsc
    cd ../..
fi

# shared 패키지 빌드 (있다면)
if [ -d "packages/shared" ]; then
    echo "Building @o4o/shared..."
    cd packages/shared
    pnpm install
    pnpm run build 2>/dev/null || npx tsc
    cd ../..
fi

# 2. API 서버에 필요한 의존성 설치
echo "📦 API 서버 의존성 설치..."
cd apps/api-server

# 누락된 의존성들 설치
pnpm install --save \
    cron \
    zod \
    express \
    cors \
    helmet \
    compression \
    express-rate-limit \
    jsonwebtoken \
    bcryptjs \
    typeorm \
    pg \
    redis \
    ioredis \
    multer \
    nodemailer \
    winston \
    dotenv

# 3. 빌드 재실행
echo "🔨 API 서버 재빌드..."
pnpm run build

echo "✅ 완료! 이제 서버에 배포할 준비가 되었습니다."