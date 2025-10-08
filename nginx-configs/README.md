# Nginx Configuration for O4O Platform

## 📋 개요

O4O Platform의 프로덕션 Nginx 설정 파일들입니다. SSL, 리버스 프록시, 보안 헤더 등이 포함된 완전한 설정입니다.

---

## 🗂️ 설정 파일 목록

### 프로덕션 설정
- **admin.neture.co.kr.conf** - 관리자 대시보드 (SSL, /var/www/admin.neture.co.kr)
- **api.neture.co.kr.conf** - API 서버 (SSL, 프록시 to :3001)
- **neture.co.kr.conf** - 메인 사이트 (SSL, /var/www/neture.co.kr)
- **forum.neture.co.kr.conf** - 포럼 (SSL)
- **shop.neture.co.kr.conf** - 쇼핑몰 (SSL)
- **signage.neture.co.kr.conf** - 사이니지 (SSL)

### 간소화 설정 (개발/테스트용)
- **admin-simple.conf** - Admin 기본 설정 (SSL 없음)
- **api-simple.conf** - API 기본 설정 (SSL 없음)

### 실험 설정
- **api.neture.co.kr.new.conf** - API 서버 새 설정 (테스트용)

---

## 🏗️ 아키텍처

```
Internet
    ↓
Nginx (80/443)
    ├── admin.neture.co.kr → /var/www/admin.neture.co.kr (정적 파일)
    ├── api.neture.co.kr → localhost:3001 (API Server with PM2)
    ├── neture.co.kr → /var/www/neture.co.kr (정적 파일)
    ├── forum.neture.co.kr → (포럼)
    ├── shop.neture.co.kr → (쇼핑몰)
    └── signage.neture.co.kr → (사이니지)
```

---

## 🚀 설치 및 배포

### 자동 배포 (권장)

배포 스크립트를 사용하면 자동으로 설정이 적용됩니다:

```bash
# Nginx 설정만 배포
./scripts/deploy-nginx.sh

# 또는 통합 배포 스크립트
./scripts/deploy-unified.sh nginx
```

### 수동 배포

필요시 수동으로 배포할 수 있습니다:

```bash
# 1. 서버 접속
ssh webserver

# 2. 저장소에서 최신 설정 가져오기
cd /home/ubuntu/o4o-platform
git pull origin main

# 3. 백업 생성
sudo mkdir -p /etc/nginx/backup/$(date +%Y%m%d_%H%M%S)
sudo cp -r /etc/nginx/sites-available /etc/nginx/backup/$(date +%Y%m%d_%H%M%S)/
sudo cp -r /etc/nginx/sites-enabled /etc/nginx/backup/$(date +%Y%m%d_%H%M%S)/

# 4. 설정 파일 복사
sudo cp nginx-configs/*.conf /etc/nginx/sites-available/

# 5. 심볼릭 링크 생성 (활성화)
sudo ln -sf /etc/nginx/sites-available/admin.neture.co.kr.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/api.neture.co.kr.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/neture.co.kr.conf /etc/nginx/sites-enabled/

# 6. 설정 테스트
sudo nginx -t

# 7. Nginx 재로드 (테스트 성공시)
sudo systemctl reload nginx

# 8. 상태 확인
sudo systemctl status nginx
```

---

## 🔐 SSL 인증서 설정

### Let's Encrypt (Certbot)

```bash
# Certbot 설치
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# 인증서 발급
sudo certbot --nginx -d admin.neture.co.kr
sudo certbot --nginx -d api.neture.co.kr
sudo certbot --nginx -d neture.co.kr -d www.neture.co.kr

# 자동 갱신 설정 (이미 설정됨)
sudo systemctl status certbot.timer

# 수동 갱신 테스트
sudo certbot renew --dry-run
```

### 인증서 확인

```bash
# 인증서 목록 및 만료일
sudo certbot certificates

# 특정 도메인 인증서 확인
sudo openssl x509 -in /etc/letsencrypt/live/admin.neture.co.kr/fullchain.pem -text -noout
```

---

## 📝 설정 파일 상세

### Admin Dashboard (admin.neture.co.kr.conf)

```nginx
- 포트: 443 (SSL), 80 (자동 리다이렉트)
- 루트: /var/www/admin.neture.co.kr
- 인덱스: index.html
- 보안 헤더: X-Frame-Options, CSP, HSTS
- Gzip 압축: 활성화
- 캐싱: 정적 파일 30일
```

**주요 기능:**
- HTTP → HTTPS 자동 리다이렉트
- SPA (Single Page App) 라우팅 지원
- 보안 헤더 적용
- 정적 파일 캐싱

### API Server (api.neture.co.kr.conf)

```nginx
- 포트: 443 (SSL), 80 (자동 리다이렉트)
- 프록시: localhost:3001 (PM2 프로세스)
- WebSocket: 지원
- CORS: 설정됨
- 타임아웃: 60초
```

**주요 기능:**
- Node.js API 서버로 프록시
- WebSocket 연결 지원
- CORS 헤더 설정
- 요청 크기 제한: 10M

### Main Site (neture.co.kr.conf)

```nginx
- 포트: 443 (SSL), 80 (자동 리다이렉트)
- 루트: /var/www/neture.co.kr
- www 리다이렉트: www → non-www
- 정적 파일 캐싱
```

---

## 🔧 트러블슈팅

### 502 Bad Gateway (API 서버)

```bash
# PM2 프로세스 확인
ssh o4o-apiserver "pm2 list"

# API 서버 재시작
ssh o4o-apiserver "pm2 restart o4o-api-server"

# 로그 확인
ssh o4o-apiserver "pm2 logs o4o-api-server --lines 50"
```

### 404 Not Found (Admin/Main Site)

```bash
# 빌드 파일 확인
ssh webserver "ls -la /var/www/admin.neture.co.kr/"
ssh webserver "ls -la /var/www/neture.co.kr/"

# 권한 확인
ssh webserver "sudo chown -R www-data:www-data /var/www/admin.neture.co.kr"
ssh webserver "sudo chmod -R 755 /var/www/admin.neture.co.kr"
```

### SSL 인증서 오류

```bash
# 인증서 상태 확인
ssh webserver "sudo certbot certificates"

# 인증서 갱신
ssh webserver "sudo certbot renew"

# Nginx 재로드
ssh webserver "sudo systemctl reload nginx"
```

### 설정 문법 오류

```bash
# 설정 테스트
sudo nginx -t

# 상세 오류 로그
sudo nginx -t 2>&1

# 오류시 백업에서 복원
sudo cp -r /etc/nginx/backup/YYYYMMDD_HHMMSS/sites-available/* /etc/nginx/sites-available/
sudo systemctl reload nginx
```

---

## 📊 로그 확인

### Access 로그

```bash
# Admin Dashboard
sudo tail -f /var/log/nginx/admin.neture.co.kr.access.log

# API Server
sudo tail -f /var/log/nginx/api.neture.co.kr.access.log

# Main Site
sudo tail -f /var/log/nginx/neture.co.kr.access.log
```

### Error 로그

```bash
# Admin Dashboard
sudo tail -f /var/log/nginx/admin.neture.co.kr.error.log

# API Server
sudo tail -f /var/log/nginx/api.neture.co.kr.error.log

# Main Site
sudo tail -f /var/log/nginx/neture.co.kr.error.log

# Nginx 전체 에러
sudo tail -f /var/log/nginx/error.log
```

---

## 🔍 상태 모니터링

### Nginx 상태

```bash
# Nginx 서비스 상태
sudo systemctl status nginx

# Nginx 프로세스 확인
ps aux | grep nginx

# 포트 리스닝 확인
sudo netstat -tlnp | grep nginx
# 또는
sudo ss -tlnp | grep nginx
```

### 연결 테스트

```bash
# HTTP → HTTPS 리다이렉트 확인
curl -I http://admin.neture.co.kr

# HTTPS 응답 확인
curl -I https://admin.neture.co.kr

# API 헬스체크
curl https://api.neture.co.kr/health
```

---

## ⚙️ 최적화 설정

### Gzip 압축
- 활성화됨
- 최소 크기: 1024 bytes
- 압축 타입: text/*, application/json, application/javascript

### 캐싱
- 정적 파일: 30일 (max-age=2592000)
- HTML: no-cache
- API 응답: no-cache

### 보안 헤더
```nginx
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
Content-Security-Policy: frame-ancestors 'self' https://admin.neture.co.kr
```

### Rate Limiting
- 구현 예정

---

## 📚 추가 문서

- [배포 가이드](../docs/deployment/README.md)
- [트러블슈팅 가이드](../docs/troubleshooting/)
- [서버 접속 가이드](../docs/operations/SERVER_ACCESS.md)

---

## 🔄 변경 이력

- **2025-10-02**: X-Frame-Options → CSP 변경 (iframe 허용)
- **2025-09-20**: 초기 SSL 설정
- **2025-08-30**: Nginx 설정 초기화

---

**최종 업데이트**: 2025-10-08
**관리자**: O4O Platform Team
