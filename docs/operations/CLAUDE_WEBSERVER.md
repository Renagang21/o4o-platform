# CLAUDE_WEBSERVER.md - O4O Platform 웹서버 운영 가이드

## 🏠 현재 환경: 프로덕션 웹서버 (Production Web Server)

이 환경은 **프로덕션 웹서버**로, 프론트엔드 애플리케이션만 서빙합니다.

## 🚨 매우 중요한 규칙 - 반드시 준수

### ❌ 절대 하지 말아야 할 것들:

1. **빌드 명령 실행 금지**
   ```bash
   # 이런 명령어들을 절대 실행하지 마세요!
   pnpm run build ❌
   pnpm run build:admin ❌
   pnpm run build:packages ❌
   ./scripts/build-webserver.sh ❌
   ```

2. **개발 서버 실행 금지**
   ```bash
   # PM2로 개발 서버 실행 금지!
   pnpm run dev ❌
   pnpm run dev:admin ❌
   pm2 start ecosystem.config.webserver.cjs ❌ (dev 스크립트 포함된 경우)
   ```

### ✅ 올바른 운영 방식:

1. **GitHub Actions가 자동 배포**
   - 개발자가 main 브랜치에 푸시
   - GitHub Actions가 자동으로 빌드
   - 빌드된 파일을 /var/www/admin.neture.co.kr/로 배포

2. **웹서버는 정적 파일만 서빙**
   - Nginx가 /var/www/admin.neture.co.kr/ 디렉토리 서빙
   - PM2는 사용하지 않거나 정적 서버로만 사용
   - 빌드 프로세스 없음

## 📋 서버 환경 구성

O4O Platform 운영 환경:

1. **o4o-webserver** (현재): 프론트엔드 서빙 전용
   - Admin Dashboard: https://admin.neture.co.kr
   - Main Site: https://neture.co.kr
   - 빌드 없음, GitHub Actions 배포만 받음

2. **o4o-apiserver**: API 서버 (별도 서버)
   - REST API: https://api.neture.co.kr
   - 데이터베이스 연결

## 🚀 운영 가이드

### 배포 확인
```bash
# 최신 배포 확인
ls -la /var/www/admin.neture.co.kr/
ls -la /var/www/neture.co.kr/

# 파일 타임스탬프 확인으로 배포 시간 확인
stat /var/www/admin.neture.co.kr/index.html
```

### PM2 관리 (필요한 경우만)
```bash
# 현재 상태 확인
pm2 list

# 불필요한 프로세스 제거
pm2 delete o4o-admin
pm2 delete o4o-storefront
pm2 save

# PM2 로그 확인
pm2 logs
```

### Nginx 관리
```bash
# 설정 확인
sudo nginx -t

# 설정 리로드
sudo nginx -s reload

# 상태 확인
sudo systemctl status nginx
```

## 🔧 문제 해결

### 변경사항이 반영되지 않을 때

1. **GitHub Actions 배포 확인**
   - GitHub Actions 페이지에서 배포 성공 확인
   - 배포 시간 확인

2. **로컬 빌드 프로세스 확인**
   ```bash
   # PM2에서 빌드 프로세스 실행 중인지 확인
   pm2 list
   ps aux | grep "pnpm run build"
   ps aux | grep "pnpm run dev"
   ```

3. **캐시 정리**
   ```bash
   # Nginx 캐시 정리
   sudo nginx -s reload
   
   # 브라우저 캐시 강제 새로고침
   # Ctrl + Shift + R (Windows/Linux)
   # Cmd + Shift + R (Mac)
   ```

4. **CDN 캐시 정리** (CloudFlare 사용 시)
   - CloudFlare 대시보드에서 캐시 purge

## 📁 디렉토리 구조

```
/var/www/
├── admin.neture.co.kr/     # Admin Dashboard (GitHub Actions가 배포)
│   ├── index.html
│   ├── assets/
│   └── ...
├── neture.co.kr/           # Main Site (GitHub Actions가 배포)
│   ├── index.html
│   ├── assets/
│   └── ...
└── ...

/home/ubuntu/o4o-platform/  # 소스 코드 (빌드하지 말 것!)
├── apps/
├── packages/
└── ...
```

## ⚠️ 긴급 상황 대응

### 잘못 빌드를 실행한 경우
```bash
# 1. 즉시 프로세스 중지
pm2 stop all
pkill -f "pnpm run build"

# 2. GitHub Actions 재실행 요청
# GitHub에서 수동으로 workflow 재실행

# 3. 또는 개발팀에 연락
```

## 📝 체크리스트

매일 확인사항:
- [ ] PM2에 불필요한 빌드 프로세스 없는지 확인
- [ ] /var/www/ 디렉토리 권한 정상인지 확인
- [ ] Nginx 정상 작동 중인지 확인
- [ ] 디스크 공간 충분한지 확인

## 🆘 도움말

문제 발생 시:
1. 이 문서의 트러블슈팅 섹션 확인
2. `/home/ubuntu/o4o-platform/docs/WEBSERVER_NO_BUILD_GUIDE.md` 참조
3. PM2 로그 확인: `pm2 logs`
4. Nginx 로그 확인: `sudo tail -f /var/log/nginx/error.log`

---

*최종 업데이트: 2025년 8월 21일*
*중요도: 🔴 매우 중요 - 빌드 금지 규칙 반드시 준수*
*현재 환경: 프로덕션 웹서버 (SERVER_TYPE=webserver)*