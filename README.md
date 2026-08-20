# O4O Platform

O4O Platform은 이커머스·커뮤니티·매장 운영을 통합한 멀티 서비스 플랫폼 모노레포입니다.

하나의 공통 플랫폼 계층(Content / Forum / LMS / Signage / Commerce) 위에서
KPA-Society · Neture · GlycoPharm · K-Cosmetics · Pharmacy-Hub 등 여러 서비스가
`serviceKey` 기준으로 데이터를 분리한 채 동작합니다.

## 기술 스택

| 영역 | 구성 |
|---|---|
| Frontend | React 19, Vite, TypeScript |
| Backend | Node.js, Express, TypeORM (ESM) |
| Database | PostgreSQL (GCP Cloud SQL) |
| Infra | GCP Cloud Run + Artifact Registry |
| CI/CD | GitHub Actions (`.github/workflows/`) |
| Node | 22.18.0 (`volta` 고정) |
| Package Manager | pnpm 10.25.0 (`volta` 고정) |

## 워크스페이스 구조

pnpm workspace 기준이며, 대상 범위는 `pnpm-workspace.yaml`에 정의되어 있습니다.

```
o4o-platform/
├── apps/          # 애플리케이션 (admin-dashboard, api-server, main-site, ...)
├── services/      # 서비스별 웹 (web-kpa-society, web-neture, web-glycopharm,
│                  #               web-k-cosmetics, web-pharmacy-hub, web-account, ...)
├── packages/      # 공유 패키지 (types, ui, auth-client, *-core 등)
├── extensions/    # 확장 모듈
├── scripts/       # 빌드·검증·운영 스크립트
├── config/        # 환경변수 및 설정 템플릿
├── e2e/           # E2E 테스트
└── docs/          # 프로젝트 문서
```

`services/mobile-app`은 Expo SDK를 독립 사용하므로 워크스페이스에서 분리되어 있습니다
(자체 lockfile · `pnpm install --ignore-workspace`).

## 빠른 시작

```bash
git clone <repository-url>
cd o4o-platform

pnpm install --frozen-lockfile

cp apps/api-server/.env.example apps/api-server/.env
# apps/api-server/.env 편집하여 설정 입력
```

API 서버가 실제로 읽는 환경파일은 **`apps/api-server/.env`** 입니다(루트 `.env` 아님).
로컬 개발 DB는 `127.0.0.1:5432`, 운영 DB는 Cloud SQL Auth Proxy 경유 `127.0.0.1:5442` 로 분리합니다.

프록시 설치·GCP 인증·환경변수·검증 명령·CI 게이트 등
로컬 실행환경 구성 절차의 **단일 기준 문서는 [SETUP.md](SETUP.md)** 입니다.

## 주요 명령

```bash
# 개발 서버
pnpm run dev              # web + admin 동시 실행
pnpm run dev:api          # API 서버

# 빌드
pnpm run build            # 전체
pnpm run build:packages   # 공유 패키지만
pnpm run build:apps       # 앱만

# 검증
pnpm run type-check            # 전체 (api-server 포함)
pnpm run type-check:frontend   # api-server 제외
pnpm run lint
pnpm test
pnpm run verify           # 레지스트리 검증 (shortcode / block / CPT)

# 정리
pnpm run clean
```

특정 워크스페이스만 대상으로 하려면 `pnpm --filter <package-name> <script>` 형태를 사용합니다.

CI(`ci-pipeline.yml`)는 위 검증을 `main` push · PR 에서 실행하며 대부분 **실패 시 차단**합니다.
lint 만 기존 오류 102건을 baseline 으로 둔 **회귀 차단(ratchet)** 상태입니다 —
상세는 [SETUP.md](SETUP.md) §5.

전체 스크립트 목록은 루트 [package.json](package.json), 배포 인프라·스크립트 목록은
[scripts/README.md](scripts/README.md)를 참조하세요.

## 문서

| 문서 | 내용 |
|---|---|
| [CLAUDE.md](CLAUDE.md) | 개발 규칙 · 아키텍처 경계 · 운영 정책 |
| [SETUP.md](SETUP.md) | 로컬 실행환경 정본 (설치 · 인증 · DB · 검증 · CI 게이트) |
| [docs/baseline/operations/O4O-GIT-PARALLEL-WORK-SAFETY-V1.md](docs/baseline/operations/O4O-GIT-PARALLEL-WORK-SAFETY-V1.md) | Git 병렬 작업 · PC 이동 정본 |
| [AGENTS.md](AGENTS.md) | Codex 실행 지침 |
| [docs/README.md](docs/README.md) | 문서 폴더 구조 및 우선순위 |
| [docs/baseline/](docs/baseline/) | Frozen 정책 · Baseline 기준선 |
| [docs/architecture/](docs/architecture/) | 아키텍처 · Domain Boundary · Guard Rules |
| [docs/guides/common/DOCUMENT-INDEX.md](docs/guides/common/DOCUMENT-INDEX.md) | 콘텐츠 저작 규칙 진입점 |

## 배포

GCP Cloud Run으로 배포하며, GitHub Actions가 `main` 기준으로 자동 실행합니다.

| 워크플로 | 대상 |
|---|---|
| `deploy-api.yml` | `o4o-core-api` |
| `deploy-web-services.yml` | 서비스별 웹 |
| `deploy-admin.yml` | 관리자 대시보드 |

DB 마이그레이션은 `main` 배포 시 CI/CD에서 자동 실행됩니다.

## 기여

현재 운영 단계에서는 `main` 직접 작업이 기본입니다. 브랜치 전략·작업 절차·검증 기준은
[CLAUDE.md](CLAUDE.md) §1을 따릅니다.

### 커밋 메시지 규칙

```
type(scope): description

feat / fix / docs / style / refactor / test / chore
```

### 코딩 컨벤션

- TypeScript + ES modules
- ESLint / Prettier 규칙 준수
- 컴포넌트·클래스 PascalCase, 함수·변수 camelCase, hooks `use*` prefix

## 트러블슈팅

DB 연결 실패 · 포트 충돌 · `Module not found` · 빌드 캐시 · 메모리 부족 등
로컬 문제 해결 절차는 **[SETUP.md](SETUP.md) §6** 에만 유지합니다(Windows 기준 명령 포함).

## 지원

- 이슈 트래커: GitHub Issues
- 문서: `docs/` 및 위 문서 표 참조
