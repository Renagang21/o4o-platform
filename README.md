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
| Node | 22.18.0 이상 |
| Package Manager | pnpm 9.x 이상 |

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

pnpm install

cp .env.example .env
# .env 편집하여 설정 입력
```

개발 DB는 GCP Cloud SQL을 Cloud SQL Proxy 경유로 사용합니다. 프록시 설치·인증·환경변수 등
**로컬 개발 환경 구성 절차는 아래 문서를 참조**하세요.

- [QUICK-START.md](QUICK-START.md) — 3단계 로컬 개발 시작
- [SETUP.md](SETUP.md) — 설치 항목 및 초기 설정
- [README-LOCAL-DEV.md](README-LOCAL-DEV.md) — 일일 개발 루틴 · 문제 해결
- [GCP-SETUP-GUIDE.md](GCP-SETUP-GUIDE.md) — Cloud SQL 연결 상세

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
pnpm run type-check
pnpm run lint
pnpm test
pnpm run verify           # 레지스트리 검증 (shortcode / block / CPT)

# 정리
pnpm run clean
```

특정 워크스페이스만 대상으로 하려면 `pnpm --filter <package-name> <script>` 형태를 사용합니다.

전체 스크립트 목록은 루트 [package.json](package.json), 스크립트 시스템 상세는
[scripts/README.md](scripts/README.md)를 참조하세요.

## 문서

| 문서 | 내용 |
|---|---|
| [CLAUDE.md](CLAUDE.md) | 개발 규칙 · 아키텍처 경계 · 운영 정책 |
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
| `deploy-main-site.yml` | 메인 사이트 |

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

```bash
# 포트 확인 (API 3001 / Admin 5173)
lsof -i :3001

# 빌드 실패 시 캐시 정리 후 재설치
pnpm run clean
rm -rf node_modules
pnpm install
pnpm run build:packages

# 메모리 부족
export NODE_OPTIONS="--max-old-space-size=4096"
pnpm run build
```

## 지원

- 이슈 트래커: GitHub Issues
- 문서: `docs/` 및 위 문서 표 참조
