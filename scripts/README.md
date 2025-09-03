# O4O Platform Scripts

## 📁 현재 스크립트 (8개)

### 🚀 배포 스크립트
- **`update-webserver.sh`** - 웹서버 업데이트 (pull + build + PM2 재시작)
- **`deploy-api-server.sh`** - API 서버 배포
- **`deploy.sh`** - 통합 배포 스크립트

### 🧹 유지보수 스크립트
- **`clean-before-build.sh`** - 빌드 전 캐시 정리
- **`install.sh`** - 패키지 설치 스크립트
- **`validate-deploy-env.sh`** - 배포 환경 검증

### 📦 유틸리티 스크립트
- **`update-package-versions.sh`** - 패키지 버전 업데이트
- **`optimize-npm-immediate.sh`** - npm 최적화

### 📂 개발 스크립트
- **`development/dev.sh`** - 개발 도구 (lint, type-check, test)

---

## 🗑️ 삭제된 스크립트 (18개)
- deploy-apiserver-safe.sh
- deploy-api.sh
- deploy-index-html.sh
- deploy-to-server.sh
- force-deploy-admin.sh
- manual-deploy-admin.sh
- test-ssh-deploy.sh
- rollback-api-server.sh
- ci-build-app.sh
- ci-build-packages.sh
- ci-complete-setup.sh
- ci-install-fixed.sh
- ci-install-pnpm.sh
- ci-setup-workspace.sh
- archive/* (모든 archive 스크립트)

---

## 💡 사용 방법

### 웹서버 업데이트
```bash
./scripts/update-webserver.sh
```

### API 서버 배포
```bash
./scripts/deploy-api-server.sh
```

### 개발 환경 작업
```bash
./scripts/development/dev.sh lint
./scripts/development/dev.sh type-check
```

---
*최종 정리: 2025년 9월*