# O4O Platform 배포 가이드

## 🖥️ 서버 구조

| 서버 | IP | 사용자 | 용도 | URL |
|------|-----|--------|------|-----|
| **API 서버** | 43.202.242.215 | ubuntu | API 백엔드 | https://api.neture.co.kr |
| **웹 서버** | 13.125.144.8 | sohae21 | Admin Dashboard | https://admin.neture.co.kr |

## 📁 프로젝트 경로

- **API 서버**: `/home/ubuntu/o4o-platform`
- **웹 서버**: `/home/sohae21/o4o-platform`

## 🚀 배포 스크립트 정리

### 메인 배포 스크립트
- `deploy.sh` - 로컬 빌드 스크립트 (Admin + API)
- `deploy-production.sh` - 프로덕션 배포 가이드 스크립트

### 서버별 배포 스크립트
- `scripts/deploy-apiserver.sh` - API 서버 전용 배포
- `scripts/deploy-webserver.sh` - 웹 서버 전용 배포 (deprecated)
- `scripts/deploy-unified.sh` - 통합 배포 스크립트

## 📋 배포 절차

### 1. 로컬 빌드
```bash
cd /home/dev/o4o-platform
./deploy.sh
```

### 2. API 서버 배포
```bash
# API 서버 접속
ssh ubuntu@43.202.242.215

# 프로젝트 디렉토리로 이동
cd /home/ubuntu/o4o-platform

# 최신 코드 가져오기
git pull origin main

# API 서버 빌드
cd apps/api-server
npm install
npm run build

# PM2로 재시작
pm2 restart o4o-api
pm2 logs o4o-api
```

### 3. 웹 서버 배포 (Admin Dashboard)
```bash
# 웹 서버 접속
ssh sohae21@13.125.144.8

# 프로젝트 디렉토리로 이동
cd /home/sohae21/o4o-platform

# 최신 코드 가져오기
git pull origin main

# Admin Dashboard 빌드
npm run build:admin
```

## ⚠️ 주의사항

1. **SSH 키**: 현재 SSH 키가 설정되어 있지 않아 수동 배포 필요
2. **PM2**: API 서버는 PM2로 관리됨 (프로세스명: o4o-api)
3. **빌드**: 각 서버에서 직접 빌드 필요
4. **환경변수**: 각 서버의 .env 파일 확인 필요

## 🔧 문제 해결

### API 500 에러 해결
1. `/api/v1/users/roles` 엔드포인트의 `requireAdmin` 미들웨어 제거됨
2. 인증된 모든 사용자 접근 가능

### Categories 테이블 없음 에러
```bash
# API 서버에서 실행
cd apps/api-server
npx typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts
```

## 📂 스크립트 정리 제안

### 삭제/이동 대상 스크립트
- `scripts/deprecated/*` - 이미 deprecated 폴더에 있음
- 중복되거나 오래된 스크립트들

### 유지할 스크립트
- `deploy.sh` - 메인 로컬 빌드
- `deploy-production.sh` - 프로덕션 가이드
- `scripts/deploy-apiserver.sh` - API 서버 전용
- `scripts/deploy-unified.sh` - 통합 배포