# O4O Platform Scripts

## 배포 인프라 (GCP Cloud Run)

> **2025-12-29 이후**: 모든 배포는 GCP Cloud Run으로 이관됨
> AWS Lightsail은 폐쇄됨

### 배포 방식

- **자동 배포**: GitHub Actions (main 브랜치 push 시)
- **수동 배포**: `gcloud run deploy` 명령어

### Cloud Run 서비스 목록

| 서비스 | 도메인 | 설명 |
|--------|--------|------|
| `o4o-core-api` | api.neture.co.kr | API 서버 |
| `o4o-admin-web` | admin.neture.co.kr | Admin Dashboard |
| `o4o-main-site` | neture.co.kr | Main Site |

### GitHub Actions Workflows

```bash
.github/workflows/
├── deploy-api.yml          # API 서버 배포
├── deploy-admin.yml        # Admin Dashboard 배포
└── deploy-main-site.yml    # Main Site 배포
```

## 개발 스크립트

### 로컬 개발

```bash
# 개발 서버 시작
./scripts/dev-start.sh

# 로컬 DB 설정
./scripts/setup-local-db.sh

# 로컬 API 배포 테스트
./scripts/deploy-api-local.sh
```

### CI/CD

```bash
# CI 빌드
./scripts/ci-build-app.sh

# CI 설정 완료
./scripts/ci-complete-setup.sh
```

### 빌드/정리

```bash
# 빌드 전 정리
./scripts/clean-before-build.sh

# 백업 정리
./scripts/cleanup-backups.sh

# 패키지 버전 업데이트
./scripts/update-package-versions.sh
```

### 모니터링

```bash
# 모니터링 설정
./scripts/setup-monitoring.sh

# 모니터링 시작
./scripts/start-monitoring.sh
```

## 수동 Cloud Run 배포

```bash
# API 서버 배포
gcloud run deploy o4o-core-api \
  --image=asia-northeast3-docker.pkg.dev/netureyoutube/o4o-api/api-server:latest \
  --region=asia-northeast3 \
  --project=netureyoutube

# Admin Dashboard 배포
gcloud run deploy o4o-admin-web \
  --image=asia-northeast3-docker.pkg.dev/netureyoutube/o4o-api/admin-dashboard:latest \
  --region=asia-northeast3 \
  --project=netureyoutube
```

## 주의사항

1. AWS Lightsail SSH 배포는 더 이상 사용하지 않음
2. 모든 배포는 GitHub Actions 또는 gcloud CLI 사용
3. 환경 변수는 Cloud Run 서비스에서 관리
