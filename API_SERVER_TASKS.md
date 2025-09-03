# 🔧 API Server 작업 목록

## 📅 작성일: 2025년 1월 3일

## 🚨 현재 문제
- API 서버 503 오류: "no healthy upstream"
- 서버가 응답하지 않거나 다운된 상태

---

## 📋 즉시 수행해야 할 작업

### 1. 서버 상태 확인 및 재시작
```bash
# SSH로 API 서버 접속
ssh o4o-apiserver

# PM2 프로세스 상태 확인
pm2 list
pm2 show o4o-api

# 로그 확인
pm2 logs o4o-api --lines 100

# 서버 재시작
pm2 restart o4o-api

# 재시작 실패 시 완전 재배포
pm2 delete o4o-api
cd /home/ubuntu/o4o-platform
./scripts/start-pm2-apiserver.sh
```

### 2. 메모리 및 리소스 확인
```bash
# 메모리 사용량 확인
free -h
df -h

# Node.js 프로세스 확인
ps aux | grep node

# 포트 3001 상태 확인
sudo netstat -tlnp | grep 3001
sudo lsof -i :3001
```

### 3. 데이터베이스 연결 확인
```bash
# PostgreSQL 상태 확인
sudo systemctl status postgresql

# Redis 상태 확인 (사용 중인 경우)
sudo systemctl status redis

# 데이터베이스 연결 테스트
cd /home/ubuntu/o4o-platform/apps/api-server
node -e "
const { Client } = require('pg');
const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
client.connect()
  .then(() => { console.log('✅ DB Connected'); client.end(); })
  .catch(err => console.error('❌ DB Error:', err));
"
```

---

## 🔄 pnpm 마이그레이션 관련 작업

### 4. pnpm 설치 및 의존성 재설치
```bash
cd /home/ubuntu/o4o-platform

# pnpm 설치 (아직 설치되지 않은 경우)
npm install -g pnpm@latest

# 기존 node_modules 정리
rm -rf node_modules
rm -rf apps/api-server/node_modules
rm -rf packages/*/node_modules

# pnpm으로 의존성 설치
pnpm install

# 패키지 빌드
pnpm run build:packages
```

### 5. API Server package.json 확인 및 수정
```bash
cd /home/ubuntu/o4o-platform/apps/api-server

# package.json 백업
cp package.json package.json.backup

# 스크립트 확인 (모든 npm 명령어가 pnpm으로 변경되었는지)
cat package.json | grep -E "npm |npm run"

# 필요시 수정
# npm run -> pnpm run
# npm install -> pnpm install
```

### 6. API Server 빌드 및 실행
```bash
cd /home/ubuntu/o4o-platform/apps/api-server

# TypeScript 빌드
pnpm run build

# 빌드 성공 확인
ls -la dist/

# 개발 모드로 테스트 (문제 파악용)
NODE_ENV=development pnpm run dev

# 프로덕션 모드로 실행
NODE_ENV=production pnpm run start:prod
```

---

## 🐛 트러블슈팅

### 7. Nginx 리버스 프록시 확인 (해당되는 경우)
```bash
# Nginx 설정 확인
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx

# 에러 로그 확인
sudo tail -f /var/log/nginx/error.log
```

### 8. 환경 변수 확인
```bash
# .env 파일 확인
cat /home/ubuntu/o4o-platform/.env.apiserver

# 필수 환경 변수 확인
echo "DB_HOST: $DB_HOST"
echo "DB_PORT: $DB_PORT"
echo "DB_USERNAME: $DB_USERNAME"
echo "DB_NAME: $DB_NAME"
echo "JWT_SECRET: ${JWT_SECRET:0:10}..." # 보안상 일부만 표시
echo "PORT: $PORT"
```

### 9. PM2 설정 파일 업데이트
```bash
cd /home/ubuntu/o4o-platform

# ecosystem.config.apiserver.cjs 확인
cat ecosystem.config.apiserver.cjs

# npm 명령어를 pnpm으로 변경 (이미 변경됨)
# post_deploy: 'pnpm run migration:run'
# 'post-deploy': 'pnpm install && pnpm run build:packages && cd apps/api-server && pnpm run build && pm2 reload ecosystem.config.apiserver.cjs --env production'
```

---

## 🚀 서버 재배포 절차

### 10. 완전한 재배포 (최후의 수단)
```bash
cd /home/ubuntu/o4o-platform

# 최신 코드 가져오기
git pull origin main

# 캐시 정리
./scripts/clean-before-build.sh

# pnpm 재설치
rm -rf node_modules pnpm-lock.yaml
pnpm install

# 패키지 빌드
pnpm run build:packages

# API 서버 빌드
cd apps/api-server
pnpm run build

# PM2로 재시작
pm2 delete o4o-api
pm2 start ../../ecosystem.config.apiserver.cjs

# 상태 확인
pm2 status
pm2 logs o4o-api
```

---

## 📊 모니터링 명령어

```bash
# 실시간 로그 모니터링
pm2 monit

# CPU/메모리 사용량
pm2 info o4o-api

# 시스템 리소스
htop

# 네트워크 연결 상태
ss -tulpn | grep 3001
```

---

## ⚠️ 주의사항

1. **데이터베이스 비밀번호**: 환경 변수에 특수문자가 포함된 경우 이스케이프 필요
2. **메모리 부족**: Node.js 메모리 제한 증가 필요시
   ```bash
   export NODE_OPTIONS="--max-old-space-size=2048"
   ```
3. **포트 충돌**: 3001 포트가 다른 프로세스에서 사용 중인지 확인

---

## 📞 긴급 연락

문제가 지속되면:
1. PM2 로그 전체 수집: `pm2 logs o4o-api --lines 500 > api-error.log`
2. 시스템 로그 확인: `journalctl -u pm2-ubuntu -n 100`
3. 데이터베이스 로그 확인: `sudo tail -f /var/log/postgresql/*.log`

---

**이 문서를 API 서버에서 참조하여 문제를 해결하세요.**