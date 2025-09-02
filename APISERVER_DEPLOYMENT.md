# API 서버 배포 가이드

## 📋 배포 전 확인사항
- 현재 위치: 프로덕션 API 서버 (o4o-apiserver)
- SERVER_TYPE: apiserver
- 포트: 3001
- PM2 프로세스명: o4o-api-server

## 🚀 표준 배포 절차

### 1. 코드 동기화
```bash
git pull origin main
```

### 2. NPM 캐시 정리 (오류 방지)
```bash
npm cache clean --force
rm -rf node_modules/.uuid-* node_modules/.tmp-*
```

### 3. 의존성 설치
```bash
# 프로덕션 의존성만 설치 (빠른 배포)
npm ci --production || npm install --production
```

### 4. 빌드
```bash
# 패키지 빌드
npm run build:packages

# API 서버 빌드
npm run build --workspace=@o4o/api-server
# 또는
cd apps/api-server && npm run build
```

### 5. 데이터베이스 마이그레이션 (필요시)
```bash
cd apps/api-server
npm run migration:run
```

### 6. PM2 재시작
```bash
# 무중단 재시작 (추천)
pm2 reload o4o-api-server --update-env

# 또는 완전 재시작 (필요시)
pm2 restart o4o-api-server --update-env
```

### 7. 배포 확인
```bash
# PM2 상태 확인
pm2 status

# Health check
curl http://localhost:3001/health

# API 응답 테스트
curl http://localhost:3001/api/v1/status

# 로그 확인
pm2 logs o4o-api-server --lines 50
```

## 🔧 Nginx 설정 (도메인 접속용)

### 1. Nginx 설정 파일 적용
```bash
# 설정 파일 복사
sudo cp nginx-config/api.neture.co.kr.conf /etc/nginx/sites-available/

# 심볼릭 링크 생성
sudo ln -sf /etc/nginx/sites-available/api.neture.co.kr.conf /etc/nginx/sites-enabled/

# 설정 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

### 2. SSL 인증서 설정 (Let's Encrypt)
```bash
# Certbot 설치 (최초 1회)
sudo apt-get install certbot python3-certbot-nginx

# SSL 인증서 발급
sudo certbot --nginx -d api.neture.co.kr

# 자동 갱신 테스트
sudo certbot renew --dry-run
```

## ⚡ 빠른 배포 스크립트

### 전체 자동화 스크립트
```bash
#!/bin/bash
# deploy-api.sh

echo "🚀 API 서버 배포 시작..."

# 1. 코드 동기화
echo "📥 코드 동기화 중..."
git pull origin main

# 2. 캐시 정리
echo "🧹 캐시 정리 중..."
npm cache clean --force
rm -rf node_modules/.uuid-* node_modules/.tmp-*

# 3. 의존성 설치
echo "📦 의존성 설치 중..."
npm ci --production || npm install --production

# 4. 빌드
echo "🔨 빌드 중..."
npm run build:packages
npm run build --workspace=@o4o/api-server

# 5. 마이그레이션 (선택적)
read -p "데이터베이스 마이그레이션을 실행하시겠습니까? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cd apps/api-server
    npm run migration:run
    cd ../..
fi

# 6. PM2 재시작
echo "♻️ PM2 재시작 중..."
pm2 reload o4o-api-server --update-env

# 7. 확인
echo "✅ 배포 확인 중..."
pm2 status
curl http://localhost:3001/health

echo "✨ 배포 완료!"
```

## ⚠️ 트러블슈팅

### 빌드 실패시
```bash
# 메모리 부족 해결
export NODE_OPTIONS='--max-old-space-size=4096'
npm run build --workspace=@o4o/api-server

# 의존성 문제 해결
rm -rf node_modules package-lock.json
npm install
npm run build:packages
```

### PM2 문제시
```bash
# PM2 리스트 확인
pm2 list

# 프로세스 강제 재시작
pm2 delete o4o-api-server
pm2 start ecosystem.config.apiserver.cjs

# 로그 확인
pm2 logs o4o-api-server --err --lines 100
```

### 데이터베이스 연결 실패
```bash
# PostgreSQL 상태 확인
sudo systemctl status postgresql

# 연결 테스트
psql -h localhost -U [DB_USERNAME] -d [DB_NAME]

# 환경변수 확인
pm2 env o4o-api-server
```

## 📊 모니터링

### 실시간 모니터링
```bash
# PM2 대시보드
pm2 monit

# 메모리/CPU 사용량
pm2 info o4o-api-server

# 실시간 로그
pm2 logs o4o-api-server --follow
```

### 성능 지표
```bash
# API 응답 시간 테스트
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3001/health

# 부하 테스트 (Apache Bench)
ab -n 1000 -c 10 http://localhost:3001/health
```

## 🔄 롤백 절차

```bash
# 이전 커밋 확인
git log --oneline -5

# 특정 커밋으로 롤백
git checkout [previous-commit-hash]

# 재빌드 및 재시작
npm run build --workspace=@o4o/api-server
pm2 reload o4o-api-server --update-env

# 또는 PM2 이전 버전으로 롤백
pm2 reload o4o-api-server --revert
```

## 📝 환경변수 관리

### 프로덕션 환경변수 확인
```bash
# 현재 환경변수 확인
pm2 env o4o-api-server

# .env.production 파일 확인
cat apps/api-server/.env.production
```

### 중요 환경변수
- `NODE_ENV=production`
- `SERVER_TYPE=apiserver`
- `PORT=3001`
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `CORS_ORIGIN=https://admin.neture.co.kr,https://neture.co.kr`

## 🚨 긴급 대응

### 서비스 중단시
```bash
# 1. 즉시 재시작
pm2 restart o4o-api-server

# 2. 로그 확인
pm2 logs o4o-api-server --err --lines 200

# 3. 시스템 리소스 확인
free -h
df -h
top
```

### 데이터베이스 문제시
```bash
# PostgreSQL 재시작
sudo systemctl restart postgresql

# 연결 수 확인
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# 느린 쿼리 확인
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity WHERE state != 'idle' AND query_start < now() - interval '1 minute';"
```

---

최종 업데이트: 2025년 9월
프로덕션 API 서버 (o4o-apiserver)