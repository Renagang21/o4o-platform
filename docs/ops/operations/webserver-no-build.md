# 웹서버 빌드 중지 가이드

## 🚨 중요: 웹서버에서 빌드하지 마세요!

### 문제점
- 웹서버에서 빌드 시 이전 코드로 빌드됨
- GitHub Actions 배포와 충돌 발생
- 변경사항이 적용되지 않음

### 올바른 배포 프로세스

```
1. 개발자 → GitHub Push
2. GitHub Actions → 자동 빌드
3. GitHub Actions → 웹서버로 배포 (/var/www/admin.neture.co.kr/)
4. Nginx → 정적 파일 서빙
```

### 웹서버에서 해야 할 일

#### 옵션 1: Nginx만 사용 (권장)
```bash
# PM2 프로세스 중지
pm2 stop o4o-admin
pm2 delete o4o-admin

# Nginx가 /var/www/admin.neture.co.kr/ 디렉토리 서빙
# GitHub Actions가 자동으로 이 디렉토리로 배포
```

#### 옵션 2: PM2 정적 서버 사용
```bash
# 기존 PM2 중지
pm2 stop all
pm2 delete all

# 정적 서버 설정 적용
pm2 start config/pm2/ecosystem.config.webserver-static.cjs
pm2 save
```

### ⚠️ 절대 하지 말아야 할 것
```bash
# 이런 명령어 실행 금지!
npm run build ❌
npm run build:admin ❌
npm run dev:admin ❌
./scripts/build-webserver.sh ❌
```

### 확인 방법
```bash
# GitHub Actions 배포 후 확인
ls -la /var/www/admin.neture.co.kr/
# 최신 타임스탬프 확인

# 브라우저 캐시 강제 새로고침
# Ctrl + Shift + R (Windows/Linux)
# Cmd + Shift + R (Mac)
```

### 문제 해결
변경사항이 보이지 않을 때:
1. GitHub Actions 배포 완료 확인
2. 웹서버에서 빌드 프로세스 실행 여부 확인
3. PM2 프로세스 확인: `pm2 list`
4. Nginx 캐시 정리: `sudo nginx -s reload`
5. CloudFlare 캐시 정리 (사용 중인 경우)

---
작성일: 2025-08-21
중요도: 🔴 매우 중요