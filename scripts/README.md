# O4O Platform Scripts

## 배포 인프라 (GCP Cloud Run)

> **2025-12-29 이후**: 모든 배포는 GCP Cloud Run으로 이관됨
> AWS Lightsail은 폐쇄됨

### 배포 방식

- **자동 배포**: GitHub Actions (main 브랜치 push 시)
- **수동 배포**: `gcloud run deploy` 명령어

### Cloud Run 서비스 목록

| 서비스 | 도메인 | 설명 | 배포 workflow |
|--------|--------|------|---------------|
| `o4o-core-api` | api.neture.co.kr | API 서버 | `deploy-api.yml` |
| `o4o-admin-dashboard` | admin.neture.co.kr | Admin Dashboard | `deploy-admin.yml` |
| `o4o-main-site` | neture.co.kr | Main Site | `deploy-main-site.yml` |
| `neture-web` | neture.co.kr | 네처 서비스 웹 | `deploy-web-services.yml` |
| `k-cosmetics-web` | k-cosmetics.site | K-화장품 | `deploy-web-services.yml` |
| `kpa-society-web` | kpa-society.co.kr | 약사회 SaaS | `deploy-web-services.yml` |
| `glycopharm-web` | glycopharm.co.kr | 글라이코팜 | `deploy-web-services.yml` |
| `pharmacy-hub-web` | pharmacyhub.co.kr | 약국 허브 | `deploy-web-services.yml` |

### GitHub Actions Workflows

```bash
.github/workflows/
├── deploy-api.yml            # o4o-core-api 배포
├── deploy-admin.yml          # o4o-admin-dashboard 배포
├── deploy-main-site.yml      # o4o-main-site 배포
├── deploy-web-services.yml   # 서비스별 웹 5종 배포 (변경 감지 후 선별 배포)
├── ci-pipeline.yml           # lint · type-check · build 검증
├── ci-appstore-guard.yml     # App Store 패키지 가드
├── ci-guard-policy.yml       # 정책 가드
├── ci-security.yml           # 보안 검사
├── e2e-auth-runtime.yml      # 인증 런타임 E2E
├── automation-pr-labeler.yml # PR 라벨 자동화
└── automation-repo-setup.yml # 저장소 설정 자동화
```

## 개발 스크립트

### 로컬 개발

```bash
# 개발 서버 시작
./scripts/dev-start.sh

# 로컬 DB 설정
./scripts/setup-local-db.sh
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
gcloud run deploy o4o-admin-dashboard \
  --image=asia-northeast3-docker.pkg.dev/netureyoutube/o4o-api/admin-dashboard:latest \
  --region=asia-northeast3 \
  --project=netureyoutube
```

## 주의사항

1. AWS Lightsail SSH 배포는 더 이상 사용하지 않음
2. 모든 배포는 GitHub Actions 또는 gcloud CLI 사용
3. 환경 변수는 Cloud Run 서비스에서 관리
