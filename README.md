# O4O Platform

O4O Platform은 이커머스·커뮤니티·매장 운영을 통합한 멀티 서비스 플랫폼 모노레포입니다.

하나의 공통 플랫폼 계층(Content / Forum / LMS / Signage / Commerce) 위에서
KPA-Society · Neture 등 여러 서비스가
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
├── services/      # 서비스별 웹 (web-kpa-society, web-neture,
│                  #               web-account, ...)
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
pnpm run verify           # 레지스트리 검증 (block / CPT)

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
| [docs/development/COLLABORATOR-START-HERE.md](docs/development/COLLABORATOR-START-HERE.md) | **새 공동개발자는 여기서 시작** — 관점 · 저장소 읽는 법 · 첫 대상 · Production 경계 |
| [CLAUDE.md](CLAUDE.md) | 개발 규칙 · 아키텍처 경계 · 운영 정책 |
| [SETUP.md](SETUP.md) | 로컬 실행환경 정본 (설치 · 인증 · DB · 검증 · CI 게이트) |
| [docs/baseline/operations/O4O-GIT-PARALLEL-WORK-SAFETY-V1.md](docs/baseline/operations/O4O-GIT-PARALLEL-WORK-SAFETY-V1.md) | Git 병렬 작업 · PC 이동 정본 |
| [AGENTS.md](AGENTS.md) | Codex 실행 지침 |
| [docs/README.md](docs/README.md) | 문서 폴더 구조 및 우선순위 |
| [docs/baseline/](docs/baseline/) | Frozen 정책 · Baseline 기준선 |
| [docs/architecture/](docs/architecture/) | 아키텍처 · Domain Boundary · Guard Rules |
| [docs/guides/common/DOCUMENT-INDEX.md](docs/guides/common/DOCUMENT-INDEX.md) | 콘텐츠 저작 규칙 진입점 |

## 배포

GCP Cloud Run으로 배포합니다. **일상 배포는 자동**이고, 위험한 변경과 비상 상황에만 사람이 개입합니다
([CHECK-O4O-CICD-DEPLOY-FREEZE-CUTOVER-V1](docs/checks/CHECK-O4O-CICD-DEPLOY-FREEZE-CUTOVER-V1.md) ·
자동 경로 Unified Delivery: [CHECK-O4O-CICD-UNIFIED-DELIVERY-PIPELINE-V1](docs/checks/CHECK-O4O-CICD-UNIFIED-DELIVERY-PIPELINE-V1.md)).

```text
main push → CI Pipeline → Delivery (delivery.yml) → 서비스별 "서빙 중인 SHA → 이 commit" 판정
  LEVEL 1  runtime 무영향 (문서 · CI · 테스트 · 판정 스크립트)         → 배포 없음
  LEVEL 2  일반 runtime 변경                                         → 자동 verified 배포
  LEVEL 3  migration · 인증 · 권한 · 결제 · 배포 설정 · 판정 불가      → 자동 배포 차단 → promote 1회 (통제 배포)
비상 · 정비 → 저장소 변수 DEPLOY_FREEZE=true (정상 운영값 false)
```

| 워크플로 | 대상 |
|---|---|
| `delivery.yml` | 자동 배포 진입점 — 판정 → 아래 workflow 를 `workflow_call` 로 호출 → serving SHA 확인 → commit status `production` |
| `promote.yml` | LEVEL 3 · 첫 rollout 실행 1회 — `gh workflow run promote.yml -f sha=<40자 main HEAD>` |
| `deploy-auto.yml` | **은퇴**(2026-10-02 P3 cutover) — 종전 태그 + dispatch 자동 경로. 실행되지 않음 |
| `deploy-api.yml` | `o4o-core-api` (+ 마이그레이션 Job) |
| `deploy-web-services.yml` | 서비스별 웹 |
| `deploy-admin.yml` | 관리자 대시보드 |

- **DEPLOY_FREEZE**: 배포의 유일한 게이트. 정확히 `'false'`(대소문자 무관)일 때만 배포합니다. 변수 부재 · 공백 ·
  `true` · 오타는 전부 **freeze**(fail-closed) — 새 배포 job 이 시작되지 않고 "frozen" 요약만 남습니다(migration 포함).
  진행 중이던 rollout 은 그 run 안에서 검증 · rollback 까지 마칩니다.
- **자동 배포(LEVEL 2)**: target 은 CI 가 성공한 정확한 commit 으로 고정됩니다(Delivery 가 reusable workflow 에 직접 전달 · 태그 · dispatch 없음).
  API 가 함께 바뀌면 API 를 먼저 배포하고 성공을 확인한 뒤 프런트를 배포합니다. API 가 차단되면 프런트도 보류됩니다.
  main 에 더 새 commit 이 있으면 그 commit 의 cycle 이 누적 변경을 처리합니다.
- **통제 배포(LEVEL 3 · 배포 방식 변경 뒤 첫 배포)**: 기술 gate 확인 → `promote.yml` 1회 (일반 배포는 별도 사용자 승인 불필요, commit status `production` 에 명령이 적힌다).
  migration 포함 promote는 운영 DB write/DDL을 수행하므로, 해당 migration 실행이 명시적으로 승인되지 않았다면 dispatch 전에 사용자 확인을 받습니다.
  `deploy/*` 태그 → 해당 workflow 수동 dispatch 는 break-glass 로만 남습니다.
  deploy workflow 들은 더 이상 push 에 반응하지 않습니다.
- DB 마이그레이션은 API 배포가 실행합니다
  ([PRODUCTION-MIGRATION-STANDARD](docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md)).
  migration 이 포함된 변경은 LEVEL 3 이므로 자동 배포되지 않습니다. `deploy-api.yml` 의 `migrate_only` 수동 실행
  (`refs/tags/deploy/*` 태그 + `expected_sha` 일치)은 migration 만 실행합니다(freeze 적용).
- **CI gate**: target commit 의 `CI Pipeline` 이 green 이 아니면(실패 · 취소 · 진행 중 · 부재 — 부재와 진행 중은 제한 시간 재조회)
  배포 job 은 실행되지 않습니다 (`migrate_only` 포함).
- **rollout_mode**: 기본 `verified` — 새 revision 을 traffic 0% 로 올려 직접 검사(web · admin = tag URL HTTP,
  API = revision Ready)한 뒤에만 전환합니다. 검사 실패 시 기존 revision 이 그대로 서빙되고, API 는 전환 후
  `/health/ready` 실패 시 이전 revision 으로 되돌립니다. `legacy` 는 종전 방식(수동 실행 전용).
- 배포 job 에 붙은 `environment: production` 은 **배포 ref 경계**입니다(승인 게이트 아님 · required reviewer 없음).
  GitHub `production` Environment 는 배포 ref 를 `main` branch · `deploy/*` tag 로 제한하며, production credential
  은 이 environment 의 secret 으로 둡니다 — collaborator branch · PR 의 workflow 는 받지 못합니다.
- **GCP 인증은 WIF** 입니다(장기 SA key `GCP_SA_KEY` 없음 · 2026-10-02). GitHub OIDC → Workload Identity Federation →
  `github-actions` SA impersonation 이며, provider 조건이 repository · `environment: production` · ref(`main` · `deploy/*`) ·
  허용 workflow · 소유자 dispatch 를 요구합니다 — collaborator branch 의 workflow 는 GCP 에 인증할 수 없습니다
  ([SECRETS_SETUP](.github/SECRETS_SETUP.md)). 공동개발자에게 production GCP credential 은 제공하지 않습니다.
  > **이행 상태**: environment ref 제한은 적용됨. credential 의 저장소 수준 → environment secret 이전 · 저장소 수준
  > 사본 삭제는 소유자 작업으로 **진행 전**입니다(그 전까지는 저장소 쓰기 권한자가 branch workflow 로 secret 에 닿을 수 있음).
- 수동 배포(`workflow_dispatch` · promote 경유)는 **저장소 소유자만** 게이트를 엽니다. 다른 계정이 실행하면 배포 job 은 skip 됩니다.

## 기여

소유자 · AI 세션의 브랜치 전략·작업 절차·검증 기준은 [CLAUDE.md](CLAUDE.md) §1 을 따릅니다.

### Production 변경 원칙 (공동개발자 포함 · 전원 적용)

이 저장소는 **Public** 입니다. 강제 수단(ruleset · environment)과 아래 **합의 규칙**을 함께 씁니다.
"사용자"는 저장소 소유자(Renagang21)입니다.

- 강제: `main` ruleset — 삭제 · force push 금지, PR 필수 + required check `CI Gate`(필수 human approval 없음 ·
  소유자 bypass 가능하나 정상 경로로 쓰지 않음). main 통합 절차는 [AGENTS.md §4-1(e)](AGENTS.md#4-1-parallel-session--worktree-policy). `deploy/*` tag 생성 · 변경은
  소유자만. `production` Environment 는 `main` · `deploy/*` 에서만. 수동 배포 게이트는 소유자만.

1. `main` 이 저장소 정본입니다. 공동개발자는 별도 branch 에서 작업하고 PR 로 `main` 에 반영합니다(기술 gate 충족 후 별도 승인 없이 merge).
2. `.github/workflows/**` 는 production 에 영향을 줄 수 있으므로 사용자 승인 없이 변경하지 않습니다.
   PR 의 workflow 변경도 merge 전에 사용자가 검토합니다.
3. 정상적인 push · main PR 병합 · 배포 실행은 별도 승인 없이 진행합니다. 새 위험 변경으로 사용자 확인이 필요한 것은:
   - production 배포 설정 변경 · `DEPLOY_FREEZE` 해제(`false` 로 변경) — 비상 시 `true` 설정은 누구나 즉시 해도 된다
   - production migration 실행 (`migrate_only` 포함) · `deploy/*` 태그 생성 · push
   - production DB write
4. Repository · Environment · Actions secret 과 production credential 은 임의로 변경 · 열람 · 반출하지 않습니다.

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
