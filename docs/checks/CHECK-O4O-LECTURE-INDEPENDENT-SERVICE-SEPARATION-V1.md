# CHECK-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1

> **WO**: [`WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1`](../work-orders/WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1.md)
> **범위**: **Phase 1 — Lecture Service Foundation** (WO §6.1 step 01~04). step 05 이후(LMS Core 정리 · surface 구축 · course migration · 기존 서비스 LMS 제거)는 **NOT_STARTED**.
> **상태**: Phase 1 코드 완료 · PR #223 (`work/lecture-service-foundation-v1-20260918`) — CI green 확인 후 merge. **운영 reference seed 는 미실행(PENDING_PRODUCTION_EXECUTION)**.
> **날짜**: 2026-09-18 · **작성**: Claude Code (Opus 5) — ChatGPT 세션이 만든 PR 을 이어받아 정리 · 검증
> **원칙**: 검증하지 않은 것을 PASS 로 쓰지 않는다. 접속값 · 자격증명 출력 0.

---

## 1. 시작 Git / PR 상태

- 인계 시점 PR HEAD `3b6a2f67e` · origin/main `e59f81dfc`(인계 문서의 `6b3b5d4ac` 보다 전진 — PR #222 merge 포함). 작업 중 main 이 `88976da2a` · `0457843df` · `7bfe0a0ea` · `3a41a04fe` 로 계속 전진 — 매번 PR 변경 경로와 **교집합 0** 확인 후 일반 merge(rebase · force 0).
- 분리 worktree `C:/tmp/o4o-lecture-foundation` 에서 진행. 메인 트리(`main`, clean) 무접촉 · 타 세션 dirty 파일 접촉 0.
- PR CI 인계 상태: Guard Policy · CodeQL · PR Size = PASS · **CI Pipeline = FAIL** (아래 §3 원인 4건).

## 2. Phase 1 에서 이미 구현돼 있던 것 (재구현 0)

| 축 | 내용 |
|---|---|
| Identity | `SERVICE_KEYS.LECTURE='lecture'` · `O4O_SERVICES` lecture entry (`name`/`nameKo`='O4O 강의' · `domain='study.neture.co.kr'` · `joinEnabled=false` · `workspaceMode='none'` · operatorWorkspaceEnabled) |
| Roles | `lecture:admin` · `lecture:operator` · `lecture:instructor` (ROLE_REGISTRY) · **`lecture:member` 없음** — 일반 학습자 = `service_memberships(service_key='lecture', status='active')` |
| Scope | `LECTURE_SCOPE_CONFIG` · `lecture-scope.middleware.ts` · security-core `ServiceKey` type-only 확장 |
| Legal | `SUPPORTED_LEGAL_SERVICE_KEYS` 에 `lecture` · footer legal · terms/privacy 페이지 · terms acceptance gate. `service_legal_profiles` · `service_policy_documents` 실값 seed 0(서비스 개시 전 Admin 입력 원칙) |
| Handoff | `handoff.controller.ts` — origin → service 판정을 `origin.includes(svc.domain)` 에서 **exact hostname** 으로 교체(`0a3572b18`). `study.neture.co.kr` 이 문자열상 `neture.co.kr` 을 포함해 Neture 로 오분류되던 결함 |
| Web | `services/web-lecture`(package `lecture-web`) shell · Dockerfile · `deploy-web-services.yml` `deploy-lecture`(Cloud Run `lecture-web`) |
| CORS | `setup-middlewares.ts` `https://study.neture.co.kr` |
| Admin | central Admin rbac-catalog · OperatorsPage lecture admin/operator |

## 3. 인계 시점 CI 실패 4건 → 처리

| # | 실패 | 원인 | 처리 | 커밋 |
|---|---|---|---|---|
| 1 | `service-catalog.ts` tail 삭제 | `3b6a2f67e` 표시명 수정 중 `getServiceOrigins()` · `getServiceOrigin()` 포함 27줄이 실수로 삭제(빌드 · 비밀번호 재설정 URL · CORS origin 소비처 파손) | `0a3572b18` 버전으로 전체 복원 + 표시명 `'O4O 강의'` 만 유지 + 개행. **origin/main 대비 diff = lecture entry 17줄 추가뿐** | `778bc3fde` |
| 2 | `lecture-web` type-check TS2339(`import.meta.env`) · TS2307(`./index.css`) | Vite client 타입 선언 부재 | `services/web-lecture/src/vite-env.d.ts` = `/// <reference types="vite/client" />` 한 줄(pharmacy-hub · kpa-branch 와 동일 선례) | `b1e888059` |
| 3 | `service-legal-scope.spec` "정확히 4개" | lecture 추가로 집합 5개 | lecture accept 케이스 추가 + **정확 집합 5개**(`k-cosmetics · kpa-society · lecture · neture · pharmacy-hub`) 검증 유지. length 완화 0 | `b1e888059` |
| 4 | `[C10] 20270414000000-SeedLectureServiceAndRoles.ts neither historical nor registered` (`canonical-database-bootstrap-…` · `database-state-classifier-…` 2 suites) | **아래 §4** — 등록 누락이 아니라 data-only migration 이 현행 계약에 등록 불가 | migration 제거 → CLI reference seed 로 전환 | 본 커밋 |

## 4. 판정 — Lecture reference seed 는 migration 이 아니라 CLI

인계 지시는 "incremental manifest 에 canonical 등록" 이었으나 조사 결과 **등록 자체가 계약 위반**이다.

1. 파일명 `20270414000000-…`(14자리) 는 C05 `<epoch13>-<PascalName>.ts` 위반 — 이건 rename 으로 해결 가능하지만,
2. **C22 는 `EXPECTED_SCHEMA_STATES` 의 fingerprint 중복을 FAIL** 로 본다(`check-migration-contract.mjs` "duplicate fingerprint in EXPECTED_SCHEMA_STATES"). schema fingerprint 는 `pg_catalog` 전용(데이터 미포함 · `database/bootstrap/schema-fingerprint.ts`)이라 INSERT 만 하는 migration 의 적용 후 fingerprint 는 직전 상태와 **동일**하다 → 등록하면 반드시 C22 FAIL. 선례 8건(id678 흡수 7 + `CreateStoreOwnerTerminationCases`) 은 전부 스키마 변경 migration · data-only 선례 0.
3. `PRODUCTION-MIGRATION-STANDARD` 규칙 8: "Reference seed (roles · permissions · catalogs) 는 bootstrap 범위 밖, **별도의 명시적 단계**". CLAUDE.md §8-1: 진단 · seed · repair 는 **CLI 우선**, HTTP route 금지.

사용자 판정(2026-09-18): **CLI seed 로 전환** — `SCHEMA MIGRATION = NO · REFERENCE DATA SEED = YES · CANONICAL PATH = CLI seed · PRODUCTION SEED EXECUTION = 별도 승인 후`. C22 계약 확장(data-only 예외)은 Phase 1 범위를 불필요하게 키우므로 채택하지 않음. guard · classifier · jest 계약 변경 0.

**실증** (격리 PostgreSQL 15.19 · docker `postgres:15` · fresh bootstrap id685 + incremental 1 → `POST_MIGRATION_SCHEMA_ASSERTION = PASS` `73d74984…`/5771): seed 를 2회 apply 한 뒤 `migrate.ts --status` → `LIVE_FINGERPRINT = 73d74984bd0448560639742fcce3c8922295f6b967f8bd71dd28f352552756d0 (5771 lines)` · `EXPECTED_LIVE_FINGERPRINT_MATCH = YES` · `DB_WRITES = 0`. 즉 seed 는 fingerprint 를 바꾸지 않는다 = migration 으로 등록했다면 중복 상태.

### 4.1 `apps/api-server/src/scripts/seed-lecture-service-and-roles.ts`

- 대상: `platform_services.code='lecture'` 1건 (`ON CONFLICT (code) DO UPDATE`) + `roles` 3건 `lecture:admin` · `lecture:operator` · `lecture:instructor` (`ON CONFLICT (name) DO UPDATE`). 값의 SSOT = `config/service-catalog.ts`(name/description/domain) · `types/roles.ts` ROLE_REGISTRY(label/description). 컬럼 · 값은 제거된 migration 과 동일(`display_name` · `service_key` · `role_key` · `is_system=true` · `is_admin_role`(admin 만) · `is_assignable` · `is_active`; platform_services `service_type='tool'` · `approval_required=false` · `featured_order=14` · `icon_emoji='🎓'` · `status='active'`).
- `lecture:member` 는 만들지 않으며 count 0 유지를 출력. `service_memberships` · `role_assignments` · `lms_*` 무접촉.
- 실행 모드: 기본 **dry-run**(`DB_WRITES = 0`) · apply 는 이중 게이트 `--apply` **+** `LECTURE_REFERENCE_SEED_CONFIRM=YES`(drug-otc 스크립트 관례). 단일 트랜잭션 · 적용 후 readback `POST_SEED_ASSERTION`. 접속값은 로그에 출력하지 않음(env 만 사용 · Cloud SQL Auth Proxy 경유).
- 검증(격리 PG15.19):
  - dry-run: 4 대상 `MISSING` · `DB_WRITES = 0` · rc 0
  - `--apply` without CONFIRM: dry-run 으로 강등 · 쓰기 0
  - APPLY: `POST_SEED_ASSERTION = PASS` · `platform_services upserted 1 · roles upserted 3 · lecture:member 0`
  - 재 APPLY: 4 대상 `present · drift=none` · 행 내용 md5 + row count **before == after** → `IDEMPOTENT = YES`
  - `service_memberships` 0 · `role_assignments` 0(무접촉)
  - 단일 파일 `tsc --noEmit`(api-server tsconfig 상속) 0 error · eslint 0
- `lecture-service-foundation.spec.ts` 를 migration 대신 seed 스크립트 기준으로 갱신(대상 3개 정확 목록 · `lecture:member` 미생성 · `database/migrations` 에 Lecture 파일 0 · dry-run/apply 게이트 · membership/role_assignments/lms_courses 무접촉).

### 4.2 운영 실행 — 미실행

```text
LECTURE_REFERENCE_SEED = PENDING_PRODUCTION_EXECUTION
```

이번 PR 은 운영 DB 에 쓰지 않는다. merge 후 별도 승인 하에 SETUP.md 절차(Auth Proxy)로 `dry-run → apply` 1회. 그 전까지 운영에는 `platform_services.lecture` · `lecture:*` role 행이 없으므로 Admin RoleManagement 에서 lecture role 부여 · Account 서비스 목록 노출은 되지 않는다(Phase 1 은 `joinEnabled=false` · skeleton 이라 기능 영향 0).

## 5. 검증

| 항목 | 결과 |
|---|---|
| `pnpm --filter lecture-web type-check` (`tsc -b`) | PASS (package name `lecture-web` 매칭 확인 · "No projects matched" 아님) |
| `pnpm --filter lecture-web build` | PASS (`✓ built in 8.58s` · dist index/css/js) |
| `node scripts/db/check-migration-contract.mjs` | **PASS 전 게이트** — `[C10] all 545 migration files are historical (544) or incremental (1)` · `[C22] baseline + 1 incremental state(s)` |
| jest `lecture-service-foundation.spec` | 6/6 PASS |
| jest `security/lecture-scope-guard.spec` | PASS |
| jest `service-legal-scope.spec` | PASS (5-key 정확 집합) |
| jest `canonical-database-bootstrap-incremental-migration-separation.spec` + `database-state-classifier-schema-drift-and-connection-log-hardening.spec` | 2 suites PASS · 53 passed · 4 skipped(격리 PG env 미설정 SKIP — 명시 출력) |
| 전체 api-server jest (로컬 · 이 worktree) | §5.1 |
| main baseline | 인계 문서의 "origin/main API Jest 12 suites / 63 tests FAIL" 은 **PR #222(`c5ae05ca5`) 로 해소** — main `d8edbf95a` · `e59f81dfc` CI Pipeline = success. 따라서 Lecture PR 은 baseline 실패를 근거로 삼지 않고 **CI 전체 green** 을 완료 조건으로 한다 |

### 5.1 전체 API Jest (로컬)

- 1차(기본 병렬 worker): 16 suites PASS 후 **`FATAL ERROR: Reached heap limit … heap out of memory`** — 로컬 환경 한계(CI 는 `--maxWorkers=1`). 테스트 실패 아님 · 결과 미확정.
- 2차(`--maxWorkers=1` · heap 6GB · CI 동일 방식): 실행 중 — 결과는 PR CI 완주 후 후속 docs 커밋으로 기입(코드 CI 를 docs push 로 cancel 시키지 않기 위해 순서 분리).

## 6. Phase 1 비범위 (NOT_STARTED · 확인)

`lms_courses.service_key` UPDATE / 11 Course migration / `currentEnrollments` 보정 / `kpaLmsScopeGuard` · `kpa:admin` LMS bypass 제거 / KPA · K-Cosmetics · PharmacyHub LMS surface 제거 / `lms:instructor` 은퇴 / Lecture learner · instructor · operator 실화면 / Lecture membership 자동 생성 / production LMS data write / 약관 · 개인정보 실제 게시 · Neture 법정정보 복제 / `joinEnabled=true` 전환. **모두 손대지 않음.** `joinEnabled=false` 유지.

## 7. 완료 조건 (Phase 1)

```text
LECTURE_SERVICE_FOUNDATION = PASS

LECTURE_SERVICE_KEY = lecture
LECTURE_DOMAIN = study.neture.co.kr
LECTURE_CLOUD_RUN = lecture-web

LECTURE_ROLE_FOUNDATION = PASS            (lecture:admin · operator · instructor · member 없음)
LECTURE_MEMBERSHIP_BOUNDARY_FOUNDATION = PASS
LECTURE_LEGAL_FOUNDATION = PASS           (scope 등록만 · 실값 seed 0)
LECTURE_WEB_SKELETON = PASS
LECTURE_DEPLOY_FOUNDATION = PASS          (workflow · Dockerfile · CORS)

LECTURE_INCREMENTAL_MIGRATION_CONTRACT = PASS   (신규 incremental 0 · C10/C22 PASS · guard 변경 0)
LECTURE_REFERENCE_SEED = PENDING_PRODUCTION_EXECUTION   (CLI · 격리 PG15 idempotent 검증 완료)
LECTURE_FRONTEND_TYPECHECK = PASS
LECTURE_FRONTEND_BUILD = PASS
LECTURE_ADDED_TEST_REGRESSION = 0

MAIN_BASELINE_API_JEST_FAILURES = 0 (PR #222 로 해소 · main CI success)

LMS_DATA_MIGRATION = NOT_STARTED
EXISTING_SERVICE_LMS_REMOVAL = NOT_STARTED
```

## 8. Git

- 커밋(모두 path-specific · `git add .` 0 · force 0): `778bc3fde` · `b1e888059` · 본 커밋(seed 전환 + CHECK). main 병합 커밋 `1ecb25951` · `7d93150f3` · (최종).
- 문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 **1건** — `PRODUCTION-MIGRATION-STANDARD` 에 "data-only reference seed 는 incremental migration 으로 등록하지 않는다(C22 fingerprint 중복) · CLI seed 경로" 를 명문화하는 문서 보강(기준 문서라 인라인 수정 안 함 · 보고만).
