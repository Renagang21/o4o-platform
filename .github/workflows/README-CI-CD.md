# O4O Platform CI/CD 워크플로우 가이드

## 🔄 현재 워크플로우 상태

### ✅ 활성화된 워크플로우
- **`deploy-admin.yml`** - 관리자 대시보드 배포
- **`deploy-main-site.yml`** - 메인 사이트 배포  
- **`deploy-nginx.yml`** - Nginx 설정 배포
- **`deploy.yml`** - 통합 배포 (웹 서버만)

### ⚠️ 비활성화된 워크플로우
- **`deploy-api.yml`** - API 서버 배포 (SSH 접속 불가)

## 🎯 배포 전략

### API 서버 배포
**현재 환경이 API 서버 자체이므로 로컬 배포 사용:**
```bash
# API 서버에서 직접 실행
./scripts/deploy-api-local.sh

# 빠른 재배포
./scripts/deploy-api-local.sh --skip-deps

# 초고속 재배포
./scripts/deploy-api-local.sh --skip-build --skip-deps
```

### 웹 서버 배포
**CI/CD를 통한 자동 배포:**
- `apps/admin-dashboard/**` 변경 시 → `deploy-admin.yml` 트리거
- `apps/main-site/**` 변경 시 → `deploy-main-site.yml` 트리거

## 📋 워크플로우별 설명

### `deploy-api.yml` (비활성화됨)
- **이유**: SSH 연결 타임아웃 (dial tcp ***:22: i/o timeout)
- **해결책**: 로컬 배포 스크립트 사용
- **상태**: `if: false`로 비활성화

### `deploy.yml` (부분 비활성화)
- **API 배포 섹션**: 주석 처리됨
- **웹 배포 섹션**: 활성 상태 유지
- **paths-ignore**: `apps/api-server/**` 추가

## 🚀 배포 순서

### 1. API 서버 변경사항 배포
```bash
# 1. 코드 변경 후 푸시
git push origin main

# 2. API 서버에서 로컬 배포 실행
./scripts/deploy-api-local.sh
```

### 2. 웹 서버 변경사항 배포
```bash
# 1. 코드 변경 후 푸시 (자동 CI/CD 트리거)
git push origin main

# 2. GitHub Actions에서 자동 배포 확인
```

## 🔧 문제 해결

### API 서버 SSH 타임아웃
```
Error: dial tcp ***:22: i/o timeout
```
**해결책**: 로컬 배포 스크립트 사용
```bash
./scripts/deploy-api-local.sh
```

### 웹 서버 배포 실패
1. GitHub Secrets 확인:
   - `WEB_HOST`
   - `WEB_USER` 
   - `WEB_SSH_KEY`

2. 수동 배포:
```bash
./scripts/deploy-web.sh
```

## 📝 향후 개선사항

### 1. Webhook 기반 배포
API 서버에 webhook 엔드포인트 추가하여 GitHub push 이벤트로 로컬 배포 트리거

### 2. 모니터링 개선
- 배포 상태 알림
- 헬스체크 자동화
- 롤백 메커니즘

### 3. 환경 분리
- development/staging/production 환경별 배포 전략
- 환경별 설정 관리

## 📞 지원

배포 관련 문제가 있을 경우:
1. `scripts/README-DEPLOYMENT.md` 참고
2. PM2 로그 확인: `pm2 logs`
3. 로컬 배포 스크립트 실행