# WO-MONOREPO-LEGACY-COMPLEXITY-INVESTIGATION-V1 Report

**조사일**: 2026-01-08
**조사자**: Claude Code
**대상**: O4O Platform Monorepo 구조
**목적**: Google Cloud + Cloud Run 배포 체계 기준 정합성 조사

---

## Executive Summary

O4O Platform은 AWS EC2/Lightsail에서 GCP Cloud Run으로 마이그레이션되었으나, 모노레포 구조에는 **AWS 시대의 레거시가 상당량 잔존**하고 있다. 특히 `apps/`와 `services/` 디렉터리 간 중복, PM2 관련 스크립트, Firebase 설정 등이 정리되지 않은 상태이다.

**분류 요약**:
- ⭕ 유지해야 할 항목: 12개
- ⚠️ 정리 후보: 18개
- 🔴 명확한 레거시: 15개+

---

## D1. Monorepo 루트 구조 조사

### 조사 결과

| 항목 | 분류 | 판단 근거 |
|------|------|-----------|
| `apps/` | ⭕ | 모노레포 빌드 대상 (api-server, admin-dashboard 등) |
| `services/` | ⭕ | Cloud Run 배포 대상 (web-* 서비스들) |
| `packages/` | ⭕ | 공유 패키지 (65개) |
| `docs/` | ⭕ | 문서 |
| `.github/` | ⭕ | CI/CD 워크플로우 |
| `scripts/` | ⚠️ | AWS 시대 스크립트 다수 포함 |
| `config/` | ⚠️ | PM2 템플릿, systemd 서비스 파일 (AWS용) |
| `CLAUDE.md` | ⭕ | 플랫폼 헌법 |
| `package.json` | ⭕ | 루트 패키지 (단, PM2 스크립트 정리 필요) |
| `pnpm-workspace.yaml` | ⭕ | 워크스페이스 설정 |
| `tsconfig*.json` | ⭕ | TypeScript 설정 |

### 명확한 레거시 (🔴)

| 항목 | 분류 | 판단 근거 |
|------|------|-----------|
| `firebase.json`, `.firebaserc`, `.firebase/` | 🔴 | Firebase Hosting 미사용 (Cloud Run 사용 중) |
| `cloudbuild-web.yaml` | 🔴 | 현재 GitHub Actions 사용, Cloud Build 미사용 |
| `cloud-deploy/` | ⚠️ | cosmetics-api 폴더만 존재, 미사용 추정 |
| `create_categories_table.sql` | 🔴 | 루트 SQL 파일, 마이그레이션으로 이전됨 |
| `production-menu-setup.sql` | 🔴 | 루트 SQL 파일, 마이그레이션으로 이전됨 |
| `*.log.gz` (JWT_REFRESH_SECRET...) | 🔴 | 로그 파일이 루트에 존재 |
| `backup-dropshipping-*` | 🔴 | 루트 백업 폴더 (archive로 이동 필요) |
| `backups/` | 🔴 | 루트 백업 폴더 |
| `bundles/` | ⚠️ | 빈 폴더 추정 |
| `logs/` | 🔴 | 22MB 로그 폴더 (gitignore 대상) |
| `tmp/` | ⚠️ | 임시 폴더 |
| `archive/` | ⚠️ | 아카이브 폴더 |
| `monitoring/` | ⚠️ | AWS 시대 모니터링 추정 |
| `extensions/` | ⚠️ | 사용 여부 확인 필요 |
| `_generated/` | ⚠️ | 생성 파일 폴더 |
| `dist/` | ⚠️ | 루트 dist (packages에서 생성?) |
| `public/` | ⚠️ | 루트 public 폴더 |
| `3` (빈 파일) | 🔴 | 의미 없는 파일 |
| `agent_manifest.md`, `AGENTS.md` | ⚠️ | AI 에이전트 관련, 현재 사용 여부 확인 필요 |
| `analyze_docs.js` | ⚠️ | 일회성 스크립트 추정 |
| `check-posts-db.cjs` | ⚠️ | 일회성 스크립트 추정 |
| `debug-template-parts.cjs` | ⚠️ | 일회성 스크립트 추정 |
| `merge_to_develop.bat` | 🔴 | Windows 배치 파일 |
| `setup_agents.bat` | 🔴 | Windows 배치 파일 |
| `start-chrome-debug.sh` | ⚠️ | 로컬 디버그용 |
| `.lighthouserc.json` | ⚠️ | Lighthouse CI (현재 사용 여부 확인) |
| `sonar-project.properties` | ⚠️ | SonarQube (현재 사용 여부 확인) |
| `jest.config.js` | ⚠️ | Jest → Vitest 이전 여부 확인 |
| `webpack.blocks.config.js` | ⚠️ | Vite 사용 중, Webpack 사용 여부 확인 |
| `vite.config.shared.*` | ⭕ | Vite 설정 공유 |
| `workspace-packages.json` | ⚠️ | 생성된 파일 추정 |

---

## D2. apps / services / packages 역할 검증

### apps/ (18개)

| 앱 | 분류 | 역할 | Cloud Run 배포 |
|----|------|------|----------------|
| `api-server` | ⭕ | 코어 API | `o4o-core-api` |
| `admin-dashboard` | ⭕ | 관리자 대시보드 | `o4o-admin-dashboard` |
| `main-site` | ⭕ | 메인 사이트 | `o4o-main-site` |
| `glucoseview-web` | 🔴 | **services/web-glucoseview와 중복** | 미사용 |
| `glycopharm-web` | 🔴 | **services/web-glycopharm과 중복** | 미사용 |
| `neture-web` | 🔴 | **services/web-neture와 중복** | 미사용 |
| `api-gateway` | ⚠️ | 사용 여부 확인 필요 | 미배포 |
| `app-api-reference` | ⚠️ | API 레퍼런스 앱 | 미배포 |
| `digital-signage-agent` | ⚠️ | 디지털 사이니지 | 미배포 |
| `ecommerce` | ⚠️ | 이커머스 앱 | 미배포 |
| `forum-api` | ⚠️ | 포럼 API | 미배포 |
| `forum-web` | ⚠️ | 포럼 웹 | 미배포 |
| `funding` | 🔴 | package.json 없음 | 미사용 |
| `healthcare` | 🔴 | package.json 없음 | 미사용 |
| `mobile-app` | ⚠️ | 모바일 앱 | 미배포 |
| `page-generator` | ⚠️ | 페이지 생성기 | 미배포 |
| `vscode-extension` | ⚠️ | VS Code 확장 | 미배포 |
| `web-server-reference` | ⚠️ | 참조용 | 미배포 |

**핵심 문제**: `glucoseview-web`, `glycopharm-web`, `neture-web`이 `apps/`와 `services/`에 **이중으로 존재**

### services/ (5개) - Cloud Run 배포 대상

| 서비스 | 분류 | Dockerfile | Cloud Run 서비스 |
|--------|------|------------|------------------|
| `web-glucoseview` | ⭕ | 있음 | `glucoseview-web` |
| `web-glycopharm` | ⭕ | 있음 | `glycopharm-web` |
| `web-k-cosmetics` | ⭕ | 있음 | `k-cosmetics-web` |
| `web-kpa-society` | ⭕ | 있음 | `kpa-society-web` |
| `web-neture` | ⭕ | 있음 | `neture-web` |

### packages/ (65개)

대부분 공유 패키지로 유지 필요. 단, 빌드 의존성 체인 검증 필요.

---

## D3. Cloud Run 기준 정합성 조사

### 현재 Cloud Run 서비스 목록

| 서비스 | 소스 위치 | 워크플로우 | 상태 |
|--------|-----------|------------|------|
| `o4o-core-api` | `apps/api-server` | `deploy-api.yml` | ⭕ 정상 |
| `o4o-admin-dashboard` | `apps/admin-dashboard` | `deploy-admin.yml` | ⭕ 정상 |
| `o4o-main-site` | `apps/main-site` | `deploy-main-site.yml` | ⭕ 정상 |
| `neture-web` | `services/web-neture` | `deploy-web-services.yml` | ⭕ 정상 |
| `glucoseview-web` | `services/web-glucoseview` | `deploy-web-services.yml` | ⭕ 정상 |
| `glycopharm-web` | `services/web-glycopharm` | `deploy-web-services.yml` | ⭕ 정상 |
| `k-cosmetics-web` | `services/web-k-cosmetics` | `deploy-web-services.yml` | ⭕ 정상 |
| `kpa-society-web` | `services/web-kpa-society` | `deploy-web-services.yml` | ⭕ 정상 |

### 정합성 문제

1. **apps/ 중복 웹앱**: `apps/glucoseview-web`, `apps/glycopharm-web`, `apps/neture-web`은 CI/CD에서 사용되지 않음
2. **pnpm-workspace.yaml에 services/ 포함**: `services/*`도 워크스페이스에 포함되어 있음 (정상)
3. **package.json workspaces에 services/ 미포함**: npm workspaces 설정과 pnpm 설정 불일치

---

## D4. Docker / Build 잔재 조사

### Dockerfile 위치

| 위치 | 분류 | 비고 |
|------|------|------|
| `apps/api-server/Dockerfile` | ⭕ | Cloud Run 배포용 |
| `apps/admin-dashboard/Dockerfile` | ⭕ | Cloud Run 배포용 |
| `services/web-*/Dockerfile` | ⭕ | Cloud Run 배포용 |
| `apps/main-site/` | ⚠️ | Dockerfile 없음, CI에서 inline 생성 |

### 레거시 빌드 관련

| 항목 | 분류 | 비고 |
|------|------|------|
| `webpack.blocks.config.js` | ⚠️ | Vite 전환 완료 여부 확인 |
| `vite.config.shared.js` | ⚠️ | .ts 버전과 중복 |
| `config/pm2-templates/` | 🔴 | PM2 미사용 (Cloud Run) |
| `config/systemd/` | 🔴 | systemd 미사용 (Cloud Run) |
| `config/server-configs/` | 🔴 | 서버 설정 미사용 |

---

## D5. CI/CD ↔ Monorepo 정합성

### GitHub Actions 워크플로우 현황

| 워크플로우 | 용도 | 상태 |
|------------|------|------|
| `deploy-api.yml` | API 서버 배포 | ⭕ 정상 |
| `deploy-admin.yml` | 관리자 대시보드 배포 | ⭕ 정상 |
| `deploy-main-site.yml` | 메인 사이트 배포 | ⭕ 정상 |
| `deploy-web-services.yml` | 5개 웹 서비스 배포 | ⭕ 정상 |
| `ci-pipeline.yml` | CI 파이프라인 | ⭕ 사용 |
| `ci-appstore-guard.yml` | AppStore 검증 | ⭕ 사용 |
| `ci-security.yml` | 보안 검사 | ⭕ 사용 |
| `deploy-admin-staging.yml.example` | ⚠️ 예시 파일 |
| `automation-*.yml` | ⚠️ 자동화 워크플로우 |

### package.json 스크립트 정리 필요

**레거시 스크립트** (🔴):

```json
"deploy:log": "ssh ubuntu@admin.neture.co.kr 'tail -f /var/log/o4o-deploy.log'",
"deploy:log:last": "ssh ubuntu@admin.neture.co.kr 'tail -50 /var/log/o4o-deploy.log'",
"deploy:rollback": "ssh ubuntu@admin.neture.co.kr 'ls -la /var/www/admin-backup/'",
"pm2:start:*": "pm2 start ecosystem.config.*",
"pm2:stop:*": "pm2 stop ecosystem.config.*",
"pm2:restart:*": "pm2 restart ecosystem.config.*",
"deploy:direct": "git push production main",
"deploy:force": "git push production main --force",
"deploy:status": "git log production/main..main --oneline",
```

이 스크립트들은 AWS Lightsail SSH 배포 시절의 레거시이며, 현재 Cloud Run에서는 GitHub Actions를 통해 배포됨.

---

## D6. 구조적 위험 신호 체크

### 명확한 위험 신호 (🔴)

1. **apps/ vs services/ 중복**
   - `glucoseview-web`, `glycopharm-web`, `neture-web`이 양쪽에 존재
   - CI/CD는 `services/`만 사용
   - 개발자 혼란 유발 가능

2. **PM2 스크립트 잔존**
   - package.json에 12개+ PM2 관련 스크립트
   - config/pm2-templates/ 존재
   - Cloud Run에서 PM2 사용 불가

3. **SSH 배포 스크립트 잔존**
   - `ubuntu@admin.neture.co.kr` 참조
   - AWS Lightsail 시절 레거시

4. **Firebase 설정 잔존**
   - firebase.json, .firebaserc
   - 현재 Cloud Run 직접 배포 사용

5. **루트 레벨 잡동사니**
   - SQL 파일, 로그 파일, 백업 폴더
   - 의미 없는 파일 (예: `3`)

### 위험 신호 요약

| 위험 | 영향도 | 즉시성 |
|------|--------|--------|
| apps/services 중복 | 높음 | 중간 |
| PM2 스크립트 잔존 | 낮음 | 낮음 |
| 루트 잡동사니 | 낮음 | 낮음 |
| Firebase 설정 | 낮음 | 낮음 |

---

## 권장 조치 (구현 아님, 제안만)

### 즉시 정리 권장 (🔴)

1. `apps/glucoseview-web`, `apps/glycopharm-web`, `apps/neture-web` 삭제
2. 루트 레벨 SQL 파일 삭제 또는 archive 이동
3. 루트 레벨 로그 파일 삭제
4. `3` 파일 삭제
5. Firebase 설정 파일 삭제

### 정리 검토 필요 (⚠️)

1. package.json PM2 스크립트 제거
2. config/pm2-templates/, config/systemd/, config/server-configs/ 제거
3. apps/funding, apps/healthcare 삭제 (package.json 없음)
4. cloudbuild-web.yaml 삭제 (GitHub Actions 사용)
5. webpack.blocks.config.js 삭제 여부 확인

### 유지해야 할 구조 (⭕)

1. apps/api-server, apps/admin-dashboard, apps/main-site
2. services/web-* (5개)
3. packages/* (65개)
4. .github/workflows/* (GitHub Actions)
5. docs/
6. CLAUDE.md

---

## 결론

**O4O Platform 모노레포는 AWS → GCP Cloud Run 마이그레이션은 완료되었으나, 레포지토리 구조 정리가 미완료 상태**이다.

주요 문제:
1. `apps/`와 `services/` 간 역할 중복
2. PM2/SSH 배포 스크립트 잔존
3. 루트 레벨 불필요 파일 다수

이 조사는 **구현 없이 현황 파악만** 수행하였으며, 실제 정리 작업은 별도 Work Order로 진행해야 한다.

---

**조사 완료**: 2026-01-08
**다음 단계**: 정리 Work Order 작성 (선택 사항)
