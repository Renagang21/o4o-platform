# ⚡ 빠른 수정 명령어 모음

## 🔴 CORS 에러 해결 (5분)
```bash
# GitHub에서 즉시 실행
gh workflow run deploy-cors-urgent.yml

# 또는 웹에서
# https://github.com/Renagang21/o4o-platform/actions → deploy-cors-urgent → Run workflow
```

## 🟡 API 서버 재배포 (10분)
```bash
# 옵션 1: 코드 변경 후 자동 배포
git add . && git commit -m "fix: api server update" && git push

# 옵션 2: 수동 워크플로우 실행
gh workflow run deploy-api-server.yml
```

## 🟢 상태 확인 (1분)
```bash
# API 헬스체크
curl https://api.neture.co.kr/health

# CORS 헤더 확인
curl -I -X OPTIONS https://api.neture.co.kr/api/v1/auth/login \
  -H 'Origin: https://admin.neture.co.kr'

# GitHub Actions 상태
gh run list --workflow=deploy-api-server.yml --limit=5
```

## 🔵 로컬 테스트 (3분)
```bash
# API 서버 로컬 실행
npm run dev:api

# 전체 스택 실행
npm run pm2:start:local

# 빌드 테스트
npm run build:api
```

## ⚫ 긴급 SSH 접속 (수동 작업)
```bash
# API 서버 접속
ssh ubuntu@43.202.242.215

# PM2 상태 확인
pm2 list
pm2 logs o4o-api --lines 50

# 재시작
pm2 restart o4o-api

# 코드 업데이트
cd /home/ubuntu/o4o-platform
git pull
cd apps/api-server && npm run build
pm2 restart o4o-api
```

## 📊 문제 진단
```bash
# 1. CORS 헤더 없음
curl -I https://api.neture.co.kr/api/health -H 'Origin: https://admin.neture.co.kr' | grep -i access-control

# 2. 서버 다운
curl -f https://api.neture.co.kr/health || echo "Server is down"

# 3. 빌드 실패
npm run build:api 2>&1 | grep -i error

# 4. PM2 프로세스 문제
ssh ubuntu@43.202.242.215 "pm2 show o4o-api"
```

## 🔧 환경 변수 확인
```bash
# GitHub Secrets 확인 (웹에서만 가능)
# Settings → Secrets and variables → Actions

# 로컬 환경 변수
cat .env.local | grep -E "JWT|DB_|CORS"

# 서버 환경 변수
ssh ubuntu@43.202.242.215 "pm2 env o4o-api | grep -E 'JWT|DB_|CORS'"
```

---
**복사해서 터미널에 바로 사용 가능한 명령어들입니다**