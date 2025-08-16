# 🚨 O4O Platform 긴급 배포 가이드

## 📋 현재 상황
- 8개 도메인 모두 503 에러 발생
- 대표님 테스트 대기 중
- **목표**: 4-6시간 내 모든 서비스 정상화

## 🎯 배포 우선순위

### 🔴 1차 (필수)
1. **api.neture.co.kr** - API 서버
2. **www.neture.co.kr** - 메인 사이트
3. **admin.neture.co.kr** - 관리자 대시보드
4. **auth.neture.co.kr** - 인증 시스템

### 🟡 2차
5. **shop.neture.co.kr** - 전자상거래
6. **forum.neture.co.kr** - 커뮤니티

### 🟢 3차
7. **signage.neture.co.kr** - 디지털 사이니지
8. **funding.neture.co.kr** - 크라우드펀딩

## 🚀 빠른 배포 절차

### 1. 로컬 빌드 (개발 서버에서)
```bash
# 1. 전체 빌드 실행
./scripts/emergency-deploy.sh

# 2. 빌드 결과 확인
# ✅ 표시된 항목만 배포 가능
```

### 2. 서버 접속 및 배포

#### API 서버 (api.neture.co.kr)
```bash
# 서버 접속
ssh ubuntu@api.neture.co.kr

# 기존 프로세스 확인
pm2 status

# 코드 업데이트
cd /home/ubuntu/o4o-platform
git pull origin main
npm install --production

# 환경변수 설정 (처음 한 번만)
cp .env.example .env.production
nano .env.production  # 실제 값으로 수정

# API 서버 시작
pm2 start ecosystem.config.js --only api-server
pm2 save

# 로그 확인
pm2 logs api-server --lines 50
```

#### 메인 사이트 (www.neture.co.kr)
```bash
# 서버 접속
ssh ubuntu@neture.co.kr

# 디렉토리 생성 (처음 한 번만)
sudo mkdir -p /var/www/neture.co.kr
sudo chown ubuntu:ubuntu /var/www/neture.co.kr

# 빌드된 파일 업로드 (로컬에서)
scp -r apps/main-site/dist/* ubuntu@neture.co.kr:/var/www/neture.co.kr/

# 서버에서 PM2 시작
pm2 start ecosystem.config.js --only o4o-main-site
pm2 save

# Nginx 설정 (처음 한 번만)
sudo cp nginx/sites-available/neture.co.kr /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/neture.co.kr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 관리자 대시보드 (admin.neture.co.kr)
```bash
# 디렉토리 생성
sudo mkdir -p /var/www/admin.neture.co.kr
sudo chown ubuntu:ubuntu /var/www/admin.neture.co.kr

# 파일 업로드 (로컬에서)
scp -r apps/admin-dashboard/dist/* ubuntu@neture.co.kr:/var/www/admin.neture.co.kr/

# PM2 시작
pm2 start ecosystem.config.js --only o4o-admin-dashboard
pm2 save

# Nginx 설정
sudo cp nginx/sites-available/admin.neture.co.kr /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/admin.neture.co.kr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. SSL 인증서 설정 (처음 한 번만)
```bash
# 각 도메인별로 실행
sudo certbot --nginx -d api.neture.co.kr
sudo certbot --nginx -d www.neture.co.kr -d neture.co.kr
sudo certbot --nginx -d admin.neture.co.kr
sudo certbot --nginx -d auth.neture.co.kr
# ... 나머지 도메인들
```

### 4. 데이터베이스 설정 (처음 한 번만)
```bash
# PostgreSQL 설치
sudo apt install postgresql

# 데이터베이스 생성
sudo -u postgres psql
CREATE DATABASE o4o_platform;
CREATE USER o4o_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE o4o_platform TO o4o_user;
\q

# 마이그레이션 실행
cd /home/ubuntu/o4o-platform/apps/api-server
npm run migration:run
```

## 🔍 배포 확인

### 1. 서비스 상태 확인
```bash
# PM2 프로세스 확인
pm2 status

# 포트 확인
sudo netstat -tlnp | grep -E ':(3000|3001|4000)'

# Nginx 상태
sudo systemctl status nginx
```

### 2. 로그 확인
```bash
# PM2 로그
pm2 logs

# Nginx 로그
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### 3. 브라우저 테스트
- https://api.neture.co.kr/health
- https://www.neture.co.kr
- https://admin.neture.co.kr
- https://auth.neture.co.kr

## 🚨 문제 해결

### 503 에러
1. PM2 프로세스가 실행 중인지 확인
2. Nginx가 올바른 포트로 프록시하는지 확인
3. 방화벽 규칙 확인

### 502 Bad Gateway
1. 백엔드 서비스가 실행 중인지 확인
2. PM2 로그에서 에러 확인
3. 포트 번호가 일치하는지 확인

### SSL 인증서 문제
1. Let's Encrypt 인증서 갱신: `sudo certbot renew`
2. Nginx 재시작: `sudo systemctl restart nginx`

## 📞 긴급 연락처
- 개발팀장: XXX-XXXX-XXXX
- 시스템 관리자: XXX-XXXX-XXXX
- AWS 지원: XXX-XXXX-XXXX

## ⏱️ 예상 소요 시간
- API 서버 배포: 30분
- 메인 사이트 배포: 20분
- 관리자 대시보드 배포: 20분
- 나머지 서비스: 각 15분

**총 예상 시간: 2-3시간**

## ✅ 배포 완료 체크리스트
- [ ] API 서버 정상 동작
- [ ] 메인 사이트 접속 가능
- [ ] 관리자 대시보드 로그인 가능
- [ ] 인증 시스템 동작 확인
- [ ] 상점 페이지 표시
- [ ] 포럼 접속 가능
- [ ] 사이니지 앱 로드
- [ ] 펀딩 페이지 표시

---
**마지막 업데이트**: 2025-07-24