# Nginx Configuration for O4O Platform

> **📌 메인 설정 위치**: `/nginx-configs/` 디렉토리
> **📖 상세 가이드**: [nginx-configs/README.md](../../nginx-configs/README.md)

---

## 📋 개요

O4O Platform의 Nginx 설정 및 배포 가이드입니다. 모든 Nginx 설정 파일은 프로젝트 루트의 `nginx-configs/` 디렉토리에 있습니다.

---

## 🚀 Quick Setup

### 자동 배포 (권장)

```bash
# Nginx 설정 배포
./scripts/deploy-nginx.sh

# 또는 통합 배포 스크립트
./scripts/deploy-unified.sh nginx
```

### 수동 배포

```bash
# 1. 서버 접속
ssh webserver

# 2. 설정 파일 복사
sudo cp /home/ubuntu/o4o-platform/nginx-configs/*.conf /etc/nginx/sites-available/

# 3. 심볼릭 링크 생성
sudo ln -sf /etc/nginx/sites-available/admin.neture.co.kr.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/api.neture.co.kr.conf /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/neture.co.kr.conf /etc/nginx/sites-enabled/

# 4. 설정 테스트 및 재로드
sudo nginx -t && sudo systemctl reload nginx
```

---

## 🔐 SSL 인증서

### Let's Encrypt (Certbot)

```bash
# Admin Dashboard
sudo certbot --nginx -d admin.neture.co.kr

# API Server
sudo certbot --nginx -d api.neture.co.kr

# Main Site
sudo certbot --nginx -d neture.co.kr -d www.neture.co.kr

# 자동 갱신 확인
sudo certbot renew --dry-run
```

---

## 📁 설정 파일

모든 설정 파일은 `/nginx-configs/` 디렉토리에 있습니다:

- **admin.neture.co.kr.conf** - 관리자 대시보드
- **api.neture.co.kr.conf** - API 서버
- **neture.co.kr.conf** - 메인 사이트
- **forum.neture.co.kr.conf** - 포럼
- **shop.neture.co.kr.conf** - 쇼핑몰
- **signage.neture.co.kr.conf** - 사이니지

---

## 🏗️ Architecture

```
Internet
    ↓
Nginx (80/443)
    ├── admin.neture.co.kr → /var/www/admin.neture.co.kr (정적 파일)
    ├── api.neture.co.kr → localhost:3001 (API Server with PM2)
    └── neture.co.kr → /var/www/neture.co.kr (정적 파일)
```

### 주요 구성

**Admin Dashboard (admin.neture.co.kr)**
- 정적 파일 서빙: /var/www/admin.neture.co.kr
- SSL 자동 리다이렉트
- SPA 라우팅 지원
- 보안 헤더 적용

**API Server (api.neture.co.kr)**
- 프록시: localhost:3001 (PM2)
- WebSocket 지원
- CORS 설정
- 타임아웃: 60초

**Main Site (neture.co.kr)**
- 정적 파일 서빙: /var/www/neture.co.kr
- www → non-www 리다이렉트
- SSL 자동 리다이렉트

---

## 🔧 Troubleshooting

### 설정 테스트
```bash
sudo nginx -t
```

### 로그 확인
```bash
# Error 로그
sudo tail -f /var/log/nginx/admin.neture.co.kr.error.log
sudo tail -f /var/log/nginx/api.neture.co.kr.error.log

# Access 로그
sudo tail -f /var/log/nginx/admin.neture.co.kr.access.log
```

### 일반적인 문제

**502 Bad Gateway (API 서버)**
```bash
# PM2 상태 확인
ssh o4o-apiserver "pm2 list"

# API 서버 재시작
ssh o4o-apiserver "pm2 restart o4o-api-server"
```

**404 Not Found (정적 파일)**
```bash
# 빌드 파일 확인
ssh webserver "ls -la /var/www/admin.neture.co.kr/"

# 권한 확인
ssh webserver "sudo chown -R www-data:www-data /var/www/admin.neture.co.kr"
```

**SSL 인증서 오류**
```bash
# 인증서 상태 확인
sudo certbot certificates

# 인증서 갱신
sudo certbot renew
```

---

## 📚 추가 문서

- **📖 상세 설정 가이드**: [/nginx-configs/README.md](../../nginx-configs/README.md)
- **🚀 배포 가이드**: [README.md](./README.md)
- **🔍 트러블슈팅**: [../troubleshooting/](../troubleshooting/)
- **🖥️ 서버 접속**: [../operations/SERVER_ACCESS.md](../operations/SERVER_ACCESS.md)

---

**최종 업데이트**: 2025-10-08