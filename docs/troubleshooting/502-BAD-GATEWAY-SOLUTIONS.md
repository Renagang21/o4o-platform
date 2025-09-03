# 502 Bad Gateway 문제 해결 가이드

## 🚨 문제 증상
- 브라우저에서 502 Bad Gateway 에러
- PM2 프로세스가 실행되지 않음
- 포트 3001에 응답 없음

## 🔍 진단 과정

### 1. PM2 상태 확인
```bash
pm2 list
pm2 status
pm2 logs o4o-admin-dashboard --lines 50
```

### 2. 포트 확인
```bash
sudo lsof -i :3001
ss -tlnp | grep :3001
```

### 3. 빌드 상태 확인
```bash
ls -la apps/admin-dashboard/dist/
```

## 🛠️ 해결 방법

### 방법 1: 개발 서버 사용 (빠른 해결)
```bash
cd /home/ubuntu/o4o-platform/apps/admin-dashboard

# PM2로 개발 서버 실행
pm2 start npm --name "o4o-admin-dashboard" -- run dev -- --port 3001
pm2 save
```

### 방법 2: 프로덕션 빌드 사용 (권장)
```bash
# 1. 패키지 설치 및 빌드
cd /home/ubuntu/o4o-platform
pnpm install
npm run build:packages

# 2. Admin Dashboard 빌드
cd apps/admin-dashboard
pnpm install
npm run build

# 3. serve 패키지 설치 (없는 경우)
pnpm install serve

# 4. PM2로 실행
cd /home/ubuntu/o4o-platform
pm2 start deployment/pm2/ecosystem.config.js --only o4o-admin-dashboard
pm2 save
```

## 🔧 Vite 호스트 차단 문제

### 에러 메시지
```
Blocked request. This host ("admin.neture.co.kr") is not allowed.
```

### 해결책
vite.config.ts 수정:
```typescript
server: {
  port: 3001,
  host: true  // 모든 호스트 허용
}
```

## 📋 체크리스트

1. ✅ PM2 프로세스 실행 중인가?
2. ✅ 포트 3001이 열려 있는가?
3. ✅ dist 폴더가 존재하는가? (프로덕션)
4. ✅ serve 패키지가 설치되어 있는가? (프로덕션)
5. ✅ vite.config.ts에 host 설정이 있는가? (개발)
6. ✅ Nginx가 올바르게 프록시하고 있는가?

## 🚀 개발 vs 프로덕션

### 개발 모드
- **장점**: Hot reload, 디버깅 용이, serve 패키지 불필요
- **단점**: 메모리 사용량 높음, 속도 느림
- **사용 시기**: 개발 및 테스트

### 프로덕션 모드
- **장점**: 빠른 속도, 낮은 메모리 사용
- **단점**: 빌드 필요, serve 패키지 필요
- **사용 시기**: 실제 서비스

## 📝 관련 문서
- [PM2 설정 가이드](../deployment/deployment-overview.md)
- [NPM 스크립트 가이드](../development/NPM_SCRIPTS_GUIDE.md)
- [서버 구조 분석](../../O4O_PLATFORM_SERVER_SYNC_ANALYSIS_REPORT.md)

---
*작성일: 2025-07-19*