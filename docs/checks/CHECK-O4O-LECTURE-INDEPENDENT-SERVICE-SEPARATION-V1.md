# CHECK-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1

> **WO**: [`WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1`](../work-orders/WO-O4O-LECTURE-INDEPENDENT-SERVICE-SEPARATION-V1.md)
> **범위**: **Phase 1 — Lecture Service Foundation** (WO §6.1 step 01~04 · §1~§10) + **Phase 2 — LMS Core 독립화 · Membership Boundary · Lecture Surface · 기존 서비스 LMS 제거** (§11~§16 · 2026-09-22). production LMS 데이터 cutover(course rekey · membership 생성)는 **NOT_STARTED** (§16).
> **상태**: **Phase 1 MERGED** — PR #223 → main `3e56425b7` (2026-09-19 · merge commit) · `lecture-web` Cloud Run 첫 revision 배포 성공. **운영 reference seed APPLIED(§10.2 · 2026-09-19)** · **`study.neture.co.kr` 도메인 매핑 PASS(§10.3 · 2026-09-21 · HTTPS smoke 전부 PASS) → Phase 1 CLOSED.** · **Phase 2 COMPLETE(2026-09-22 · branch `work/lecture-phase2-v1` · production write 0 · 운영자 로그인 E2E 보류) — §15 판정표.** · **PR #225 merge-gate repair(§17 · 2026-09-22): 최신 main 통합 · CI Guide 계약 수정 · Codex P1 5건 처리 → `PHASE2_MERGE != PHASE2_DEPLOY` — merge 후 단독 배포 금지 · coordinated deploy + data cutover 로만 운영 반영.**
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
| 4 | `[C10] 20270414000000-SeedLectureServiceAndRoles.ts neither historical nor registered` (`canonical-database-bootstrap-…` · `database-state-classifier-…` 2 suites) | **아래 §4** — 등록 누락이 아니라 data-only migration 이 현행 계약에 등록 불가 | migration 제거 → CLI reference seed 로 전환 | `687e28e8e` |
| 5 | (1차 CI 에서 새로 드러남) api-server type-check `src/scripts/audit-roles.ts` TS2741 ×2 | `ServiceKey` union 에 `lecture` 가 추가되며 `Record<ServiceKey\|'none', number>` 리터럴 2곳에 키 누락 — PR 유발 회귀 | `lecture: 0` 추가(카운터 초기화만 · 동작 변경 0) · api-server 전체 `tsc --noEmit` PASS | `dbd575236` |

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
LECTURE_REFERENCE_SEED = APPLIED (2026-09-19 · §10.2)
```

PR 자체는 운영 DB 에 쓰지 않았고, merge 후 별도 승인으로 1회 실행했다(§10.2). (아래 원문 유지) merge 후 별도 승인 하에 SETUP.md 절차(Auth Proxy)로 `dry-run → apply` 1회. 그 전까지 운영에는 `platform_services.lecture` · `lecture:*` role 행이 없으므로 Admin RoleManagement 에서 lecture role 부여 · Account 서비스 목록 노출은 되지 않는다(Phase 1 은 `joinEnabled=false` · skeleton 이라 기능 영향 0).

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
- 2차(`--maxWorkers=1` · heap 6GB · CI 동일 방식): **Test Suites 320 passed / 4 skipped (324) · Tests 5,192 passed / 32 skipped (5,224) · 실패 0**.

### 5.2 PR CI (GitHub Actions)

| head | CI Pipeline | 내용 |
|---|---|---|
| `b70c929a7` | failure | API Server Jest **pass** · Code Quality Check fail = `audit-roles.ts` TS2741(§3 #5) 1건뿐 |
| `af35070c0` | **success** (run `35357077686`) | Code Quality Check pass(7m32s) · API Server Jest pass(10m46s) · Build Applications pass · Guard Static Analysis pass · CodeQL pass |

SonarCloud Code Analysis = fail(`new_security_rating` E · 11건) — **필수 체크 아님 · main branch protection 없음**. 내용: ① `HandoffPage.tsx` L34 "Client-Side Open Redirect" BLOCKER — `resolveReturnTo` 는 pharmacy-hub `HandoffPage` 와 동일한 가드(`/` 로 시작 · `//` · `/\` 거부 → 그 외 `/`)라 taint 오탐 ② `Dockerfile` `npm install -g pnpm`/`serve` · `npx vite build` · root user · 워크플로 action `@v3`/`@v2` 태그 pin — 이미 merge 된 pharmacy-hub Dockerfile · 동일 워크플로의 다른 job 과 동일 패턴(`pnpm install --ignore-scripts` 는 적용돼 있음). 인프라 패턴 변경은 Phase 1 범위 밖 → 보고만.

### 5.3 Deploy foundation 실측

`docker build -f services/web-lecture/Dockerfile` 로컬 빌드 **성공**(vite `✓ built in 6.39s`) → 컨테이너 기동 `GET /` 200 · `GET /handoff`(SPA fallback) 200 · `<title>O4O 강의 | Neture</title>` → 컨테이너 · 이미지 삭제. Cloud Run 실배포는 merge 후 `deploy-web-services.yml` `deploy-lecture` 가 수행(미실행).

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
LECTURE_DEPLOY_FOUNDATION = PASS          (workflow · Dockerfile 로컬 빌드+서빙 실측 · CORS · Cloud Run 실배포는 merge 후)

LECTURE_INCREMENTAL_MIGRATION_CONTRACT = PASS   (신규 incremental 0 · C10/C22 PASS · guard 변경 0)
LECTURE_REFERENCE_SEED = APPLIED                  (§10.2 · 2026-09-19 · idempotent 재실행 확인)
LECTURE_DOMAIN_MAPPING = PASS                     (§10.3 · 2026-09-21 · HTTPS/SPA/legal/CORS smoke)
LECTURE_FRONTEND_TYPECHECK = PASS
LECTURE_FRONTEND_BUILD = PASS
LECTURE_ADDED_TEST_REGRESSION = 0
PR_CI_PIPELINE = success (af35070c0)
SONARCLOUD = fail (비필수 · 선례 동일 패턴 + taint 오탐 · 보고만)

MAIN_BASELINE_API_JEST_FAILURES = 0 (PR #222 로 해소 · main CI success)

LMS_DATA_MIGRATION = NOT_STARTED
EXISTING_SERVICE_LMS_REMOVAL = NOT_STARTED
```

## 8. Git

- 커밋(모두 path-specific · `git add .` 0 · force 0): `778bc3fde`(catalog tail 복구) · `b1e888059`(vite-env + legal test) · `687e28e8e`(seed CLI 전환 + CHECK) · `dbd575236`(audit-roles) · 본 docs 커밋. main 병합 커밋 `1ecb25951` · `7d93150f3` · `b70c929a7` · `af35070c0`(각 교집합 0).
- 문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 **1건** — `PRODUCTION-MIGRATION-STANDARD` 에 "data-only reference seed 는 incremental migration 으로 등록하지 않는다(C22 fingerprint 중복) · CLI seed 경로" 를 명문화하는 문서 보강(기준 문서라 인라인 수정 안 함 · 보고만).

## 9. merge 후 (2026-09-19)

| 항목 | 결과 |
|---|---|
| merge | PR #223 `--merge` → main `3e56425b7`. head `78bfb8d30` CI Pipeline success · MERGEABLE(UNSTABLE 표시 = 비필수 SonarCloud 뿐) |
| main CI Pipeline | `3e56425b7` 은 직후 타 세션 push `0f2c71f15`(docs merge)에 의해 **cancelled** → `0f2c71f15` CI Pipeline **success**(Lecture 코드 포함) |
| Deploy API Server | success (`35399192942`) |
| Deploy Web Services | success (`35399192940`) — **`deploy-lecture: success`** → Cloud Run `lecture-web` revision `lecture-web-00001-6k7` · run.app 직접 `GET /` 200 |
| Deploy Admin Dashboard | success |
| `study.neture.co.kr` | **DNS 미해석(curl exit 6)** — Cloud Run 도메인 매핑 + DNS 레코드는 인프라 작업(코드 범위 밖 · 별도 승인). WO §1.3 "DNS 배치 ≠ 서비스 종속" 대로 서비스 identity 는 영향 없음. `LECTURE_DOMAIN_MAPPING = PENDING_INFRA` |
| E2E — Auth Runtime Regression | **failure** — PR 이 `packages/security-core/src/types.ts` 를 건드려 path 트리거로 자동 실행. 실패 자체는 09-17 이후 연속 red(stale E2E secret · `d5be1eb31` 기록). ⚠️ 부작용: 이 워크플로는 3서비스 반복 로그인으로 운영자 계정 `loginAttempts` 를 누적시킨다(타 세션 기록 "잔존 8 · 실패 1회면 재잠금") → 본 merge 가 유발한 실행이 **운영자 계정을 재잠금했을 수 있음**. 확인 · 해제 · 워크플로 트리거 정비는 `WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1` 트랙(별도 승인)에서 |

남은 순서: ① 운영자 계정 잠금 상태 확인(read-only) → ② 승인 후 `seed-lecture-service-and-roles.ts` dry-run → apply 1회 → §4.2 갱신 → ③ 도메인 매핑(인프라 승인) → ④ Phase 2 (WO §6.1 step 05~).

## 10. 운영 반영 (2026-09-19 · 사용자 승인 후)

### 10.1 운영자 계정 잠금 상태 — read-only 확인 · **STOP(수정 0)**

Cloud SQL Auth Proxy(loopback) · `SELECT` 만. DB timezone UTC.

| 계정 | loginAttempts | lockedUntil (UTC) | 잠금 중 | lastLoginAt (UTC) |
|---|---|---|---|---|
| 운영자 `soh***` | **10** | **2026-09-18 23:15:21** | **YES**(조회 시각 22:59Z · KST 08:15 까지) | 2026-09-18 00:11 |
| 테스트 `ren***` | 0 | — | no | 2026-09-18 13:40 |

- 정책(`auth-login.service.ts`): 실패 5회 이상 → 30분 잠금 · 실패마다 30분 연장 · 성공 시 0 리셋.
- **정정(타 세션 `1846bf355` 대조):** 21:55Z 에 시작된 E2E Auth Runtime 실행(PR #223 merge 의 `packages/security-core/src/**` 경로 트리거)이 **34회 실패를 추가**해 loginAttempts 10 · 23:15Z 잠금을 만들었다(실행이 22:45Z 까지 이어짐 — 위 "E2E 아님" 추정은 오류). 타 세션이 22:58Z 사용자 승인 하에 운영자 1행 reset(`UPDATE 1`) · `f51d5a362` 로 `on.push` 트리거 제거(workflow_dispatch 만 유지). 본 세션의 22:59Z 조회는 reset 직전 값.
- **재확인 23:09Z(read-only):** 운영자 `soh***` loginAttempts **3** · lockedUntil NULL · 잠금 없음 / 테스트 `ren***` 0. ⚠️ reset(22:58Z) 후 ~11분 사이 실패 3회가 **새로 누적** — E2E 트리거가 제거된 뒤이므로 **다른 실패 로그인 소스가 아직 존재**(다른 세션 smoke · 브라우저 재시도 · 수동 입력 중 하나). 2회 더 실패하면 재잠금. **STOP — 수정 0 · 원인 추적은 Auth 트랙.**
- 지시대로 해제 · 리셋 · 어떤 write 도 하지 않음.

### 10.2 Lecture reference seed — APPLIED

| 단계 | 결과 |
|---|---|
| baseline(read-only) | platform_services 9 · ps_lecture 0 · roles 41 · roles_lecture 0 · lecture:member 0 · service_memberships 5 · role_assignments 11 · lms_courses 11 (max updatedAt 2026-08-26 · id/service_key hash `1ddf1adb…`) |
| dry-run | 4 대상 MISSING · `DB_WRITES = 0` |
| `--apply` + `LECTURE_REFERENCE_SEED_CONFIRM=YES` | `POST_SEED_ASSERTION = PASS` · platform_services upserted 1 · roles upserted 3 · lecture:member 0 |
| read-only 재조회 | platform_services 10 · **ps_lecture 1** · roles 44 · **roles_lecture 3**(admin `is_admin_role=t` · operator · instructor) · **lecture:member 0** · **service_memberships 5(=)** · **role_assignments 11(=)** · **lms_courses 11 · hash 동일(=)** |
| 동일 명령 재실행 | 4 대상 `present · drift=none` · 행 내용 md5(`be8b45cb…`/`7241dbb3…` = 격리 PG 검증값과 동일) + count 전부 동일 → **IDEMPOTENT = YES** |

기대값 대비: `platform_services.code='lecture' = 1 · lecture:admin/operator/instructor = 1/1/1 · lecture:member = 0 · service_memberships 신규 0 · role_assignments 신규 0 · lms_courses 변경 0` — **전부 일치**.

### 10.3 `study.neture.co.kr` 도메인 매핑 — **PASS** (2026-09-21 · 인프라 · 코드 변경 0)

구조 확인: 기존 웹 서비스는 Cloud Run domain mapping 이 아니라 **Global External HTTPS LB `o4o-global-lb`(IP `136.110.132.35`) + serverless NEG + Certificate Manager map `o4o-main-cert-map`**, DNS 는 **Gabia** 네임서버(Cloud DNS 없음). 선례 = pharmacyhub(`neg-pharmacy-hub-web` → `backend-pharmacy-hub-web`(HTTPS · EXTERNAL_MANAGED) → host rule → `cm-cert-pharmacyhub` + `cm-entry-pharmacyhub-*`).

| 단계 | 상태 | 비고 |
|---|---|---|
| ① serverless NEG `neg-lecture-web`(asia-northeast3 → lecture-web) | DONE (9/19) | |
| ② backend service `backend-lecture-web` | DONE (9/21) | 분류기 차단 → **사용자가 터미널에서 직접 생성**(EXTERNAL_MANAGED · HTTPS · port-name http · timeout 30 · CDN off = `backend-pharmacy-hub-web` 과 동일, describe 로 확인). add-backend `neg-lecture-web` 은 Claude Code |
| ③ URL map `o4o-global-lb` | DONE (9/21) | `add-path-matcher path-matcher-lecture --default-service=backend-lecture-web --new-hosts=study.neture.co.kr`. 전후 스냅샷(`C:/tmp/lecture-lb-urlmap-before-2.yaml` / `-after.yaml`) diff = fingerprint + 추가 5줄 → **기존 9 host rule · 7 path matcher 변경 0** |
| ④ 인증서 | DONE (9/21) | 기존 `cm-cert-lecture`(9/18 생성)는 DNS 완전 전파 후에도 마지막 인증 시도가 02:49Z(DNS 등록 전) 에 머물러 1.5h 재시도 없음(backoff). 사용자 승인 하에 **dual-cert 전환**: `cm-cert-lecture-v2` 생성 → entry `cm-entry-lecture-study` 에 old+v2 병행 → v2 AUTHORIZING → **ACTIVE(7분)** → v2 단독 → smoke PASS 후 old 삭제. 다른 17 entry 무접촉(전부 ACTIVE) |
| ⑤ DNS `study A 136.110.132.35 TTL 600` | DONE (9/21) | 사용자 Gabia 작업. Gabia 권한 서버 · 8.8.8.8 · 1.1.1.1 · 로컬 전부 해석 |

smoke (2026-09-21 15:28~ KST · 공개 URL · 로그인 0):

```text
TLS            CN=study.neture.co.kr · Google Trust Services WR3 · 2026-09-21 ~ 2026-12-20
GET /          200 text/html · <title>O4O 강의 | Neture</title>
SPA fallback   /courses/abc 200
GET /terms     200
GET /privacy   200
HTTP :80       301 → https://study.neture.co.kr/
정적 asset     /assets/index-*.js 200 application/javascript
API CORS       OPTIONS api.neture.co.kr Origin=https://study.neture.co.kr → 204 · access-control-allow-origin: https://study.neture.co.kr
대조군         pharmacyhub.co.kr · neture.co.kr · kpa-society.co.kr · k-cosmetics.site 전부 200 (LB 변경 영향 0)
```

관찰(수정 0 · 범위 밖): `<title>` 접미 `| Neture` — web-lecture shell 의 기본 title 템플릿. Phase 2 surface 구축 시 `O4O 강의` 단독으로 정리 대상.

운영자 로그인은 §10.1 대로 계속 보류(도메인 매핑 · 공개 smoke 에 불필요).

`LECTURE_DOMAIN_MAPPING = PASS` (5/5) · **Phase 1 CLOSED**. 다음 = Phase 2 (WO §6.1 step 05~ · 별도 지시).

---

# Phase 2 — LMS Core 독립화 · Lecture Membership Boundary · Lecture Surface 구축 (2026-09-22)

> worktree `C:\tmp\o4o-lecture-phase2` · branch `work/lecture-phase2-v1` (base `2744ea809`) · 한 단위 실행.
> production 무접촉: **DB write 0 · migration 0 · DDL 0 · role_assignment write 0** (§18 · §20 · 팀장 STOP 조건 전부 미발동).

## 11. 신규 census (§4) — Phase 2 착수 시점

| class | 발견 | 처분 |
|---|---|---|
| `KPA_RUNTIME_COUPLING` | `middleware/kpa-lms-scope-guard.ts` · `register-routes.ts` 의 `/api/v1/lms` 에 kpaLmsScopeGuard 결합 · KPA `course-request.controller/service` · KPA `instructor.service` · `mypage.controller` · `qualification.controller` · `operator-dashboard.service` 의 lms 집계 · PH `/home/latest` course 축 · cosmetics routes lms 위임 | 전부 제거 (`git rm` 3 · 수정 8) |
| `LEGACY_LMS_ROLE` | `requireInstructor.ts` `lms:instructor` · `types/roles.ts` 선언 · migration `20260700200000-MigrateLmsCreatorQualification.ts` | runtime 소비 0 으로 (requireInstructor → `lecture:instructor`). `types/roles.ts` 의 `'lms:instructor'` 타입·표 항목은 **legacy 선언만 유지**(data cutover 전 제거 시 기존 role_assignment 해석 불능 위험 · §13 read-only) · migration 은 §13 불변 |
| `SERVICE_SCOPE_INFERENCE` | `lms-service-scope.ts` 가 프런트 `serviceKey` query/header 로 스코프 추론 · KCos `apiClient` interceptor `/lms/*` serviceKey 부착 | 서버 고정 `lecture` (요청값 무시) · KCos interceptor 제거 |
| `PLATFORM_ADMIN_SURFACE` | admin-dashboard `pages/lms-instructor/*` · `lib/api/lmsInstructor.ts` | 삭제 → Lecture Operator `/operator/instructors` 로 이관 (§11) |
| `COURSE_SERVICEKEY_FALLBACK` | `CourseService.createCourse` 는 Phase 1 에서 이미 `lecture` 고정 · update 경로·목록 조회의 serviceKey fallback | update 에서 serviceKey 변경 불가 · 조회는 `lecture` 단일 (§8) |
| `SAFE_SHARED_LMS_CORE` | `@o4o/lms-core` · `@o4o/lms-client` · `@o4o/lms-ui` · `packages/content-editor` · lms entity/service 계층 | **재사용 · 구조 변경 0** (§10). `packages/organization-lms` 부활 없음 |

## 12. 구현 요약

### 12-1. backend (`apps/api-server`)
- **신설** `modules/lms/middleware/lecture-access.ts` — `requireLectureLearner / Instructor / Operator / Admin` · `hasLectureAdminRole(req)` · `hasLectureOperatorRole` · `rolesIncludeLectureAdmin(roles)`. 계약: `lecture:admin ⊇ lecture:operator` · admin/operator ≠ instructor · `platform:super_admin` break-glass (§6). Learner = `service_memberships(service_key='lecture', status='active')` (§7) — role 만 있고 membership 없으면 deny.
- **삭제** `middleware/kpa-lms-scope-guard.ts` · KPA `course-request.controller.ts` · `course-request.service.ts`.
- Course/Lesson/Quiz/Assignment/Certificate/Instructor controller 의 ownership bypass → `lecture:admin` 만 (`kpa:admin` role-literal 0). `requireInstructor` → `lecture:instructor`. `requireEnrollment` · `lms-enrollment-owner-guard` · `lms-scope-guard` 는 Lecture 경계로 정렬.
- `CourseService` update 에서 `serviceKey` 변경 불가 · `content_kind` 와 `service_key` 분리 유지 (§9).
- **수료증 검증 base** (§17): `certificate-verification-base.ts` → `LECTURE_FRONTEND_URL || https://study.neture.co.kr` 단일. **KPA fallback 없음**. Reward = OFF (변경 0 · courses/lessons metadata rewardPolicy 0 — §14 재확인).
- KPA `/api/ai/course-structure` · `/api/ai/lesson-body` (`ai-proxy.routes.ts`): **프런트 소비자 0** 확인 — 기록만, 삭제 안 함 (§16 · 공용 `/api/ai/content` 무접촉).
- PH `pharmacy-hub.routes.ts` `/home/latest` 의 course 축 제거 · cosmetics routes 의 lms 위임 제거.

### 12-2. Lecture surface (`services/web-lecture`) — §11
| 축 | 화면 | 재사용 |
|---|---|---|
| Learner | `/courses` · `/courses/:id` · `/courses/:id/lesson/:lessonId` · `/my/enrollments` · `/my/certificates` · `/my/instructor-apply` · `/certificates/verify/:code` · `/certificate/verify/:id`(PDF QR · 기존 서비스 외부 이동 alias, id 기반 `GET /lms/certificates/:id/verify` fallback) | `@o4o/lms-client` (`createLmsLearnerClient(lmsHttp)` · serviceKey 미부착) · `@o4o/lms-ui` (`CourseListView` · `LmsHubTemplate` · `LmsLoading`) |
| Instructor | `/instructor` · `/instructor/courses/new` · `/instructor/courses/:id/edit`(태그 1개 이상 필수 — 서버 `sanitizeCourseTags` 계약 반영) · `/instructor/enrollments` · `/instructor/lessons/:id/quiz` · `/assignment` · `/submissions` | `@o4o/content-editor` RichTextEditor(내부 AI 기본값 유지 · 강의 자동 생성 없음 §16) |
| Operator | `/operator`(강의) · `/operator/instructors`(Platform Admin 에서 이관 · KPA 약사 자격 요구 없음 §12) · `/operator/certificates` | `AccessGate`(role + membership 경계) |
- `RoleBoundaryPage.tsx`(Phase 1 임시) 삭제. KPA/KCos/PH 화면 **복사 0** (신규 작성).
- `package.json` 에 `@o4o/lms-client` · `@o4o/lms-ui` · `@o4o/content-editor` workspace 의존 추가 → `pnpm-lock.yaml` importer 링크 9줄(외부 패키지 추가 0) · `Dockerfile` 선별 COPY + `lms-client build` 추가.

### 12-3. 기존 서비스 LMS surface 제거 (§14 · §15)
| 서비스 | 삭제 | 남긴 것 |
|---|---|---|
| KPA (`web-kpa-society`) | `api/lms.ts` · `api/instructor.ts` · `api/lms-instructor.ts` · `api/ai.ts` · `pages/courses/*` · `pages/instructors/*` · `pages/lms/*` · `pages/instructor/**` · `pages/mypage/My{Enrollments,Certificates}Page` · `pages/operator/OperatorLmsCoursesPage` · `pages/services/LmsServicePage` · `pages/work/WorkLearningPage` · `pages/guide/GuideFeatureLmsPage` · `components/instructor/InstructorLayout` (31) | `/lms/*` · `/courses/*` · `/instructor/*` · `/mypage/enrollments`·`certificates` · `/certificate/verify/:id` → `LectureExternalRedirect`(study.neture.co.kr) · operator 메뉴 `/operator/lms` 제거 |
| K-Cosmetics | `api/lms.ts` · `api/ai.ts` · `pages/lms/*` · `pages/instructor/*` · `pages/mypage/My*` · `pages/operator/OperatorLmsCoursesPage` (11) · `apiClient` serviceKey interceptor | 동일 외부 이동 |
| PharmacyHub | `api/lms.ts` · `api/ai.ts` · `pages/education/*` · `pages/instructor/*` · `pages/account/My{Enrollments,Certificates}Page` · `pages/operator/OperatorLmsCoursesPage` (17) | `/education/*` · `/instructor/*` · `/account/enrollments`·`certificates` · `/certificate/verify/:certificateId` 외부 이동 · `MyCreditsPage` 학습 CTA = 외부 링크 |
| Platform Admin (`apps/admin-dashboard`) | `pages/lms-instructor/*` · `lib/api/lmsInstructor.ts` (3) | — |
- KCos/PH `package.json` 의 `@o4o/lms-client` · `@o4o/lms-ui` 의존 선언은 **무접촉**(소비 import 0 · 의존성 변경 = 중지 조건 → 별도 정리 제안).

## 13. 검증 (§22)

| 항목 | 결과 |
|---|---|
| `apps/api-server` tsc | 0 |
| `services/web-lecture` tsc · vite build | 0 · PASS |
| `web-kpa-society` · `web-k-cosmetics` · `web-pharmacy-hub` · `admin-dashboard` tsc · vite build | 전부 0 · PASS (회귀) |
| `lecture-phase2-access-contract.spec.ts` (신규 · negative 포함: membership 없는 role → deny · instructor 의 operator 경로 deny · learner 의 instructor 경로 deny · 타 serviceKey 요청 무시) | 20/20 PASS |
| `certificate-verification-base.test.ts` (재작성 5) | 5/5 PASS |
| 기존 spec 정합 갱신 12 (`lms-course-list-hub-view-commonization` · `lms-instructor-course-create-tags-contract` · `lms-instructor-course-service-scope` · `lms-kpa-frontend-api-contract-residue` · `lms-public-course-service-scope` · `lms-crossservice-read-write-boundary` · `store-ai-first-editor-boundary-contract` · `store-internal-ai-retirement-contract` · `security/ownership` · `service-operator-workspace-realignment` · `pharmacy-hub-community-baseline` · `pharmacy-hub-lms-learner-adoption`(은퇴 계약으로 재작성 · 파일명 유지)) | PASS |
| **api-server jest 전체** | **338 suites PASS · 0 failed · 4 skipped / 5681 tests PASS · 32 skipped** |
| 운영자 실 로그인 E2E | **보류** (§21 · Phase 1 §10.1 동일 — Auth 는 이 WO 에서 다루지 않음) |

발견·수정한 실제 결함 2건(둘 다 Lecture 신규 surface 내부):
1. 강사 강의 편집 화면에 태그 입력이 없어 서버 `태그 1개 이상` 계약으로 생성이 항상 실패 → 태그 입력 + 화면 선검증.
2. PDF QR · 기존 서비스 외부 이동은 certificate **id** 로 `/certificate/verify/:id` 를 부르는데 Lecture 는 verificationCode 경로만 있었음 → alias route + id fallback(`verifyCertificateById`).

## 14. Production 재-census (§18 · §19) — SELECT only · 2026-09-22

read-only(`o4o_api_v2` · cloud-sql-proxy). 9/18 IR 대비 **이탈 0** — STOP 미발동.

| 항목 | 값 |
|---|---|
| `lms_courses` | 11 (NULL service_key 0 · content_kind≠lecture 0 · org-scoped 0 · paid 0) |
| service_key × status/visibility | kpa-society 8 (archived/members 2 · pending_review/members 1 · published/members 2 · published/public 3) · pharmacy-hub 3 (archived: members 2 · public 1) |
| lessons / enrollments / progress / quizzes / assignments | 10 / 3 / 0 / 6 / 1 |
| certificates / quiz_attempts / submissions / instructor_applications | 0 / 0 / 0 / 0 |
| orphan lessons / enrollments | 0 / 0 |
| `currentEnrollments` 불일치 | 7 (IR 동일 · §20 범위 밖 · 미수정) |
| reward policy (courses/lessons metadata) | 0 |
| `role_assignments` `lms%` / `lecture:%` | 0 / 0 (전체 11 · 전부 active) · `roles` `lecture:*` 3 (Phase 1 seed) |
| `service_memberships` lecture active | 0 |
| `platform_services` lecture | active · approval_required f |
| users / service_memberships 전체 | 2 (IR 1 → +1 · Identity 트랙 정상 증가) / 5 |
| 마지막 course 갱신 | 2026-08-26 (Phase 2 기간 write 0 확인) |

## 15. 판정표 (§23)

| 항목 | 판정 |
|---|---|
| `LECTURE_PHASE2` | **COMPLETE** (운영 배포 · 운영자 로그인 E2E 제외) |
| `LMS_KPA_RUNTIME_COUPLING` | 0 (잔존 = `register-routes.ts:131` 주석 1) |
| `KPA_LMS_SCOPE_GUARD` | REMOVED |
| `KPA_ADMIN_LMS_BYPASS` | 0 |
| `LECTURE_MEMBERSHIP_BOUNDARY` | ENFORCED (`lecture-access.ts` · spec 20 + **members 강의 목록·상세 gating(§17 · spec 38)**) |
| `LECTURE_COURSE_SERVICEKEY_FORCE` | ENFORCED (create 서버 고정 · **update allowlist — PATCH serviceKey/instructorId 무시(§17)** · 조회 scope 고정) |
| `LECTURE_LEARNER_SURFACE` / `LECTURE_INSTRUCTOR_SURFACE` / `LECTURE_OPERATOR_SURFACE` | BUILT / BUILT / BUILT |
| `PLATFORM_ADMIN_LMS_INSTRUCTOR_SURFACE` | REMOVED_OR_MIGRATED (→ Lecture `/operator/instructors`) |
| `LEGACY_LMS_INSTRUCTOR_RUNTIME_CONSUMERS` | 0 (`types/roles.ts` 선언 · historical migration 은 non-runtime 잔존) |
| `KPA_LMS_RUNTIME_SURFACE` / `KCOS_LMS_RUNTIME_SURFACE` / `PHARMACY_HUB_LMS_RUNTIME_SURFACE` | 0 / 0 / 0 (외부 이동 route 만) |
| `LMS_CORE_REUSED` / `NEW_LMS_CORE` | YES / NO |
| `PRODUCTION_LMS_WRITE` | 0 |
| `PRODUCTION_RE_CENSUS` | DONE (SELECT only · 이탈 0) |
| `READY_FOR_LECTURE_DATA_CUTOVER` | **YES (coordinated)** — 실행 순서는 §17-5 로 확정: **merge → final production re-census → coordinated deploy + data cutover → public smoke → operator E2E(Auth gate 해소 시)**. Phase 2 runtime 단독 배포 금지(`PHASE2_MERGE != PHASE2_DEPLOY`) |

## 16. Phase 2 비범위 (§20 · 미착수 확인)
production `service_key` migration(kpa-society 8 · pharmacy-hub 3 → lecture) · `currentEnrollments` 7 정정 · production membership 생성 · reward/credit/certificate/organization/paid 이관 · KCos/PH `package.json` lms 의존 선언 정리 · `types/roles.ts` `lms:instructor` 제거 · KPA AI route 2 삭제. 전부 **별도 WO**.

## 17. PR #225 merge-gate repair (2026-09-22 · 같은 PR · 신규 WO/CHECK 0)

팀장 판정: `LECTURE_PHASE2_IMPLEMENTATION=COMPLETE` · `PHASE2_MERGE_GATE_REPAIR=REQUIRED` · `PR_225_READY_TO_MERGE=NO`(CI FAIL · Codex P1 5건) · `PHASE2_PRODUCTION_DEPLOY=HOLD`. 제약: production DB write 0 · data cutover 미실행 · 운영자 로그인 보류 — 전부 준수(이 절의 작업은 코드 · 테스트 · 문서만).

### 17-1. 최신 main 통합

- `origin/main 5f463c95d`(hospital-pharmacy Foundation · auth lockout 정정 등 5커밋) → `work/lecture-phase2-v1` 일반 merge `d0e6a7f03`. **충돌 0** · reset/stash/`add .` 0 · 타 세션 파일 접촉 0.
- `pnpm-lock.yaml`: origin/main 대비 diff = web-lecture importer 링크(`@o4o/content-editor` · `@o4o/lms-client` · `@o4o/lms-ui`) 만 · main 측 변경 유실 0 · 외부 패키지 추가 0 (재확인).

### 17-2. CI 실패 — shared-space-ui Guide 계약 (test expectation 완화 0)

원인: KPA/KCos Guide copy 가 Phase 2 에서 삭제된 LMS surface 경로(`/guide/features/lms` · `/lms/course/:id` · `/lms/course/:courseId/lesson/:lessonId` · `/instructor/courses` · `/operator/lms`)를 참조 → `guideRouteContract` FAIL.
처리(copy/route 계약 자체를 Lecture 독립 구조에 맞춤): KPA·KCos "강의" 그룹 = **O4O 강의(study.neture.co.kr) 외부 진입 안내**로 교체(진입 route 는 실존 redirect `/lms` · KPA `/mypage/enrollments` 만) · `/guide/features/lms` 섹션과 `kpaGuideFeatureLmsProps` · `kCosmeticsGuideFeatureLmsProps` export 삭제(소비처 0 확인) · KPA 운영자 가이드 step 04 에서 `/operator/lms` 제거("강의 운영은 O4O 강의 운영자 화면"). → `vitest --config packages/shared-space-ui/vitest.config.mjs` **8 files / 100 tests PASS**.

### 17-3. Codex P1 — 처리표

| # | 지적 | 처리 | 판정 |
|---|---|---|---|
| 1 | members 강의가 로그인만으로 노출 | `isActiveLectureLearner(req)`(lecture-access) 신설. `GET /courses` — active lecture membership 없으면(비로그인 · 타 서비스 membership 포함) `visibility=public` 강제 → members 강의 목록 제외. `GET /courses/:id` — 비로그인 401 `MEMBERS_ONLY`(종전) · 로그인+membership 없음 **403 `LECTURE_MEMBERSHIP_REQUIRED`**(제목·설명 비노출) · active membership 200. | **FIXED** |
| 2 | PATCH body `serviceKey` 가 `Object.assign` 으로 반영 | `CourseService.updateCourse` 를 **allowlist**(`UPDATABLE_COURSE_FIELDS` · `pickUpdatableCourseFields`) 로 전환 — `serviceKey` · `instructorId` · id/createdAt 등 비요청 필드 무시. `contentKind` 는 별개 축으로 계속 허용. Lecture 강의를 kpa-society/null/'' 로 옮기는 PATCH 4종 + controller 경유 1종 테스트. | **FIXED** |
| 3 | 직접 publish 가 호출자 role 만 검사 | `isLectureCourse()` 를 lecture-access 로 승격(routes 로컬 정의 삭제) → `CourseController.loadLectureCourseOr404` 로 **publish · update · delete · submit-review · unpublish · archive** 전부 대상 `serviceKey==='lecture'` 검사, legacy(KPA/PH/NULL) 는 non-disclosure 404 (operator approve/reject/archive 와 동일 규칙 공유). | **FIXED** |
| 4 | 강사 편집기가 learner sanitized quiz 응답 사용 → 저장 시 정답 유실 | 신규 `GET /lms/instructor/lessons/:lessonId/quiz`(requireInstructor · 소유자 또는 lecture:admin · lecture 강의만) = `QuizService.getQuizForLessonWithAnswers`(정답 포함 · 미공개 포함). learner `GET /lessons/:lessonId/quiz` 는 그대로 정답 제거. `PATCH /quizzes/:id` 에 scope guard + **소유권 검사** 추가 · body allowlist(lessonId/courseId/id 귀속 변경 불가). web-lecture `instructorApi.getQuizForLesson` → 강사 경로. 편집 왕복(제목만 변경) 정답 보존 + learner 응답 회귀 테스트. | **FIXED** |
| 5 | pre-cutover legacy 강의 가용성(temporary KPA membership fallback 요구) | **runtime fallback · cross-service compatibility 추가 0**. 정책으로 고정: `PHASE2_MERGE != PHASE2_DEPLOY` — PR 은 merge 가능하되 Phase 2 runtime 은 production LMS course `service_key` rekey 전에 단독 배포하지 않는다(§17-5). 기존 KPA/PH membership → Lecture membership 자동 변환 0 · cleanup user 포함 auto membership creation 0. | **OPERATIONAL_GATE** |

신규 spec `apps/api-server/src/__tests__/lecture-phase2-merge-gate-contract.spec.ts` — controller/service 를 in-memory repository 로 실행 · 1차 **38/38 PASS**(P1-1 10 · P1-2 8 · P1-3 10 · P1-4 8 · 정적 3) → 2차(§17-3-b) **46/46**.

### 17-3-b. Codex 재검토(`f3b8c8ca5` 대상 · `@codex review`) — 신규 지적 처리표

| # | 등급 | 지적 | 처리 | 판정 |
|---|---|---|---|---|
| 6 | P1 | `LessonController.checkCourseOwnership` 가 `lecture:admin` / 소유 강사에게 course.serviceKey 검사 없이 허용 → legacy course 의 lesson create/update/delete/reorder 가 ID 로 가능 | ownership override **이전에** `isLectureCourse(course.serviceKey)` 검사 — 비-lecture 는 404 non-disclosure(`notFound`) · update/delete 경로가 `notFound` 를 무시하던 결함도 함께 정정 | **FIXED** |
| 7 | P1 | `POST /certificates/issue` 가 courseId 의 service scope 를 검사하지 않음 → Lecture 운영자가 타 서비스 강의 수료증 발급 가능 | `CertificateController.issueCertificate` 진입 시 `guardCourseScope(req, res, body.courseId)` — legacy/미존재/누락 courseId 는 404 · 발급 0 | **FIXED** |
| 8 | P2 | web-lecture `lmsViewAdapter.toEnrollment` 가 `e.progress` 를 읽어 항상 0% (서버 영속 필드는 `progressPercentage`) | `progressPercentage ?? progress ?? 0` · `LectureEnrollment` 타입에 `progressPercentage` 추가 | **FIXED** |

spec 추가: 재검토 P1-6 4건(legacy create/update/delete/reorder 404 · write 0 / lecture course 소유자 200·타 강사 403·admin 200) · P1-7 3건(legacy·null·미존재·누락 courseId 404 · 발급 0 / lecture 201) · P2-1 정적 1건.

### 17-3-c. CodeQL (CI `CodeQL` check FAIL → 처리)

- 1차 push 결과 `36 new alerts`: `js/missing-rate-limiting` **35건 전부 `lms.routes.ts`**(Phase 2 이전에도 main 에 동일 규칙으로 열려 있던 pre-existing 패턴 — 파일 재작성으로 위치가 바뀌어 "new" 로 집계 · `273fce582` 시점에도 35건 FAIL) + `js/missing-token-validation` `bootstrap/setup-middlewares.ts:240` 1건(**본 PR 미접촉 파일** · main 에 이미 open · CodeQL 이 "changes too large" 사유로 포함).
- 처리: 저장소 선례(`notifications.routes.ts` · `store-owner-terminations.routes.ts`)와 동일하게 `middleware/rateLimiter` 의 `apiLimiter`(분당 60 · key=(ip,userId)) 를 LMS 라우터 전체에 `router.use(apiLimiter)` 로 적용. 새 limiter 정의 0 · 의존성 0.
- `setup-middlewares.ts:240` 은 범위 외(pre-existing · 미접촉) — 보고만. CodeQL 이 이를 계속 "new" 로 집계하면 팀장 판정 사항.

### 17-3-d. Codex 3차 재검토(`6d1c89576` 대상) — 신규 지적 처리표 + 동일 계열 일괄 정리

3차 지적은 전부 **"legacy course 가 ID 로 Lecture runtime 의 write/ownership 경로에 도달"** 하는 동일 계열이다. 지적 6건만 고치지 않고 LMS controller 의 course/lesson/enrollment 로딩 지점을 전수 sweep 해 **scope 판정을 ownership override(`lecture:admin`) 보다 항상 먼저** 두는 규칙으로 통일했다.

| # | 등급 | 지적 | 처리 | 판정 |
|---|---|---|---|---|
| 9 | P1 | `UPDATABLE_COURSE_FIELDS` 에 `status` 가 남아 강사가 PATCH 로 `published` 자가 승인 가능 | `status` 를 allowlist 에서 제거 — 상태 전이는 전용 endpoint(submit-review / publish / unpublish / archive · operator approve/reject) 만. web-lecture `CourseInput` 은 status 를 보내지 않음(소비처 영향 0) | **FIXED** |
| 10 | P1 | `PATCH/POST /certificates/:id(update·revoke·renew)` 가 certificate 의 course scope 를 검사하지 않음 | `CertificateController.loadLectureCertificateOr404` — certificate→course 를 로드해 `guardLoadedCourseScope` 로 lecture 만 통과 · legacy/미존재 404 · write 0 | **FIXED** |
| 11 | P1 | `AssignmentController.checkLessonOwnership` 가 lecture:admin 이면 lesson 만 보고 허용 → legacy lesson 에 assignment upsert 가능 | lesson→course 를 항상 로드 · `isLectureCourse` 아니면 admin 이라도 404 · 그 뒤 admin override | **FIXED** |
| 12 | P1 | `InstructorController.approveEnrollment / rejectEnrollment` 가 enrollment.course 의 serviceKey 를 검사하지 않음 | ownership 이전에 `isLectureCourse(enrollment.course?.serviceKey)` — legacy 수강은 404 · save 0 | **FIXED** |
| 13 | P1 | `InstructorController.checkLessonOwnership` 가 admin 이면 course 로드 없이 허용 → legacy submission 열람/채점 가능 | course 로드 + lecture 검사를 admin early-return 앞으로 이동 | **FIXED** |
| 14 | P2 | `MyEnrollmentsPage` 가 `e.progress` 만 읽어 목록 진행률 0% | `progressPercentage ?? progress ?? 0` | **FIXED** |

sweep(지적 외 · 동일 계열): `InstructorController` `dashboardStats · participants · participantsSummary · participantsExport · courseLessons · coursePoints` 6곳 — `select` 에 `serviceKey` 추가 + `isLectureCourse` 아니면 404. `QuizController.createQuiz` 의 courseId 소유권 검사도 legacy course 404. (`QuizController` 나머지 · `LessonController` · `CourseController` · `EnrollmentController` 는 2차까지 이미 scope-first.)

spec 추가(3차): P1-8 2건 · P1-9 2건 · P1-10 2건 · P1-11 2건 · P1-12 2건 · P2-2 정적 1건 → merge-gate spec **56/56**.


### 17-3-e. Codex 4·5·6차 재검토 — 처리표 (커밋 당시 CHECK 미기록분 · 사후 기록)

4~6 차는 같은 PR 에서 별도 세션이 처리했고 CHECK 에 남기지 않았다. 판정 근거는 각 커밋 메시지와 merge-gate spec 이며, 여기 한 표로 합친다 (새 CHECK 없음).

| # | 등급 | 지적 | 처리 | 커밋 | 판정 |
|---|---|---|---|---|---|
| 15 | P1 | `POST /quizzes` 가 `courseId` 를 생략하고 `lessonId` 만 보내면 scope·소유권 검사를 통째로 건너뜀 | 귀속될 course 를 먼저 확정(lessonId → `guardLessonScope` + 실제 courseId) · courseId 와 lesson 소속 불일치 404 · 둘 다 없으면 400 · 확정된 courseId 로 저장 | `edc209933` | **FIXED** |
| 16 | P1 | 강사 편집기가 `questions[].id` 를 버려 저장 시 기존 제출 답안의 채점 매칭이 전부 깨짐 | 편집기가 id 를 유지 · `QuizService.updateQuiz` 가 같은 order 의 기존 id 를 승계(없으면 발급) | `c8154a108` | **FIXED** |
| 17 | P1 | quiz/assignment 제출이 membership 만 보고 유료·승인 강의에서 승인 enrollment 없이 저장(보상 포함) | `requireEnrollment({ checkQuiz \| checkAssignment })` 를 두 제출 라우트에 — write 이전 판정 · 미존재는 404 | `c8154a108` | **FIXED** |
| 18 | P1 | 정답 없는 문항 저장 가능 → `checkAnswer` 가 항상 false 라 합격 불가 | 저장 전 문항별 정답 필수 · 선택형은 남은 보기 중 하나여야 함(문항 번호 안내) | `c05128897` | **FIXED** |
| 19 | P2 | 보기 텍스트 편집·삭제 시 선택해 둔 정답이 보기에 없는 값으로 남음 | `patchQ` 에서 options 변경 시 answer remap(이름 변경 승계 · 삭제 시 해제) | `c05128897` | **FIXED** |
| 20 | P2 | 퀴즈 로드 실패(5xx·네트워크·권한)를 "퀴즈 없음" 으로 삼켜 중복 생성 | 404 만 새로 만들기 · 그 외는 배너 + 저장 차단(`errorStatus`) · 같은 결함의 과제 편집기에도 적용 | `c05128897` | **FIXED** |

4·5차 P2 중 **lifecycle notification 의 serviceKey 누락**, **legacy KPA 딥링크 보존**은 범위 밖으로 보고만 했다 (§17-6 잔여).

### 17-3-f. Codex 7차 재검토(`71a03a3f5` 대상) — 신규 지적 처리표

| # | 등급 | 지적 | 처리 | 판정 |
|---|---|---|---|---|
| 21 | P1 | Lecture membership 이 없는 사용자에게 `AccessGate` 가 안내만 하고 실제 가입 동작이 없음(`lecture.joinEnabled=false` · 전용 가입 API 없음) | 코드로 닫지 않는다. self-join 을 켜는 것은 서비스 가입 정책 변경(route·계약 변경 · WO 중지 조건)이고, WO 의 `AUTO_LECTURE_MEMBERSHIP=0` 과 직접 충돌한다. **배포 게이트**로 고정: coordinated deploy 전에 운영자가 membership 부여 경로(운영자 지정 또는 `joinEnabled` 정책 결정)를 확정해야 한다 — §17-5 실행 순서에 편입 | **OPERATIONAL_GATE** |
| 22 | P1 | 학습자 목록·상세가 게시 상태를 강제하지 않아 익명 사용자가 `?status=draft` 또는 알려진 ID 로 승인 전 초안 열람 | `listCourses` 는 서버가 `status=PUBLISHED` 고정(운영 목록은 `/operator/courses` + `requireLectureOperator` 경로일 때만 클라이언트 status 유지) · `getCourse` 는 PUBLISHED 가 아니면 소유 강사·Lecture 운영자 외 404(non-disclosure) | **FIXED** |
| 23 | P2 | `GET /lessons/:lessonId/quiz` · `/assignment` 가 `requireAuth` 만 — 비회원·미등록자가 문항·과제 안내 열람 | 두 조회에 `requireEnrollment({ checkLesson: true, allowCourseOwner: true })` — visibility·membership·유료/승인 enrollment 정책을 제출 경로와 동일하게 적용. 소유 강사·`lecture:admin` 은 통과(편집 화면 회귀 방지) · `checkLesson` 이 `:lessonId` 파라미터도 역추적 | **FIXED** |
| 24 | P2 | `createCourse` 가 클라이언트 `instructorId` 를 보존해 타인 명의 초안 생성 가능 | `serviceKey` 와 동일하게 서버가 `instructorId = 요청자` 로 무조건 고정 | **FIXED** |

spec 추가(7차): P1-17 8건 · P2-7 1건 · P2-8 5건 · 정적 계약 1건 → merge-gate spec **83/83**.

### 17-3-g. Codex 8차 재검토(`d4b31848c` 대상) — 신규 지적 처리표

P1·P0 지적 0건, P2 1건.

| # | 등급 | 지적 | 처리 | 판정 |
|---|---|---|---|---|
| 25 | P2 | 7차에 넣은 "게시 전 강의 열람 예외" 가 `instructorId` 일치·role 만 보고 membership 을 확인하지 않는다 — 정지·해지된 강사나 stale `lecture:operator`/`admin` 토큰이 초안을 계속 읽는다. 초안은 visibility 기본값이 public 이라 뒤의 members 판정도 돌지 않는다 | `canSeeUnpublished` 를 async 로 바꾸고 role·소유권을 **필요조건**으로만 쓴다 — 그 위에 `resolveLectureMembershipStatus(req) === 'active'` 를 요구한다. `platform:super_admin` break-glass 만 예외 | **FIXED** |

spec 추가(8차): '8차 P2-9' 4건(membership 없는 소유 강사 404 · stale operator 404 · inactive membership 404 · super_admin 200) → merge-gate spec **87/87**.

### 17-3-h. Codex 9차 재검토(`eb15af32a` 대상) — 신규 지적 처리표

| # | 등급 | 지적 | 처리 | 판정 |
|---|---|---|---|---|
| 26 | P1 | `requireEnrollment` 가 `visibility==='public'` 이면 `isPaid`·`requiresApproval` 판정 전에 통과시킨다. 편집기는 "공개 + 승인 필요" 강의를 허용하므로, 승인 enrollment 없는 회원이 quiz attempt·assignment submission 을 저장하고 합격 보상까지 받을 수 있다 | enrollment 요구를 visibility 와 분리했다 — PUBLIC 은 **membership 만** 면제하고, `isPaid \| requiresApproval` 이면 visibility 와 무관하게 승인 enrollment 를 요구한다. 조회·제출 라우트가 같은 미들웨어라 둘 다 닫힌다 | **FIXED** |
| 27 | P2 | `allowCourseOwner` 면제가 `instructorId` 일치 또는 `lecture:admin` role 만 본다 — 정지된 회원·회수된 role 이 members 강의 평가를 계속 읽는다 | `canReadOwnCourseAssessments` 로 분리: 소유자 축은 **소유권 + 현재 `lecture:instructor`**, 그 외는 `lecture:admin`, 그리고 어느 쪽이든 **active membership** 필수. `platform:super_admin` 만 예외 | **FIXED** |
| 28 | P2 | 8차의 초안 열람 예외에서 `isOwner` 가 여전히 `instructorId` 일치만 본다 — 강사 role 이 회수되어도 일반 membership 만 있으면 과거 자기 초안을 계속 읽는다 | `canSeeUnpublished` 의 소유자 축을 **소유권 + 현재 `lecture:instructor`** 로 좁혔다(operator/admin 축·membership 요구는 8차 그대로) | **FIXED** |

판정 근거는 `lecture-access.ts` 머리말의 계약 그대로다 — *Instructor = active lecture membership + `lecture:instructor`*. 소유권은 role 을 대체하지 않는다.

spec 추가(9차): P1-18 3건 · P2-10 4건 · P2-11 1건 → merge-gate spec **95/95**.

### 17-3-i. 10차 — SonarCloud Quality Gate (Codex 지적 아님 · CI 게이트)

`a4b5a3c4b` 에서 SonarCloud Quality Gate 가 **New Code 중복 3.5% (허용 3%)** 로 FAIL 했다. 나머지 check(API Server Jest · Code Quality · CodeQL · Analyze typescript · builds · guards)는 전부 PASS.

| # | 등급 | 지적 | 처리 | 판정 |
|---|---|---|---|---|
| 29 | CI | 7차/9차에 추가한 merge-gate describe 3개가 동일한 `requireEnrollment` 실행 래퍼와 평가 정책 fixture 를 각자 복제 | `runEnrollment(req, options)` 공용 헬퍼 1개로 합치고, `lec-paid`·`lec-pub-approval`·`lec-pub-paid` 와 lesson fixture 를 전역 `beforeEach` 로 올렸다. describe 지역 `beforeEach` 3개 제거 | **FIXED** |

**계약·단언 변경 0** — 테스트 수·단언은 그대로이고(95/95 동일) 중복된 보일러플레이트만 제거했다. test expectation 완화 0.

**10차 CI 결과(head `6850cb6fb`)**: API Server Jest · Code Quality Check · **SonarCloud Code Analysis(Quality Gate passed)** · CodeQL · Analyze (typescript) · Build Applications(admin-dashboard) · Guard Static Analysis · Detect affected scope · Apply Size Labels 전부 PASS. Admin Fast 2 · Docs Fast 1 은 `detect-affected` fast path 로 skipping. `mergeable=MERGEABLE` · `mergeStateStatus=CLEAN`.

> 01:06Z 의 `sonarqubecloud[bot]` "The last analysis has failed" 코멘트는 **직전에 취소된 run(`c98d0539b`)의 중복 분석**이다. head check-run 은 `conclusion=success` · `Quality Gate passed` 로 확인했다.

> **정정(2026-09-23)**: 이 문단에 있던 "Codex 10차 재검토 = 미응답" 기록은 **사실이 아니었다.** 세션이 `gh api .../reviews` 를 **페이지네이션 없이**(기본 `per_page=30`) 조회해 오래된 페이지만 읽었고, 그 사이 올라온 리뷰 3건(00:48Z `a4b5a3c4b` · 01:04Z `6850cb6fb` · 02:21:51Z `6850cb6fb`)을 보지 못했다. 미응답이 아니라 **조회 실패**다. 리뷰 3건의 지적 7건(P1 3 · P2 4)은 §17-3-j 에서 전부 처리했다. 재발 방지: GitHub list endpoint 는 항상 `per_page=100&page=N` 으로 끝까지 읽는다.


### 17-3-j. 11차 — Codex 8~10차 응답 7건 (P1 3 · P2 4) · merge-gate FINAL runtime repair

§17-3-i 의 조회 실패로 밀려 있던 Codex 리뷰 3건을 한 라운드에 닫았다. **test expectation 완화 0 · 계약 약화 0 · 임시 cross-service fallback 0.**

| # | 등급 | 지적 | 처리 | 판정 |
|---|---|---|---|---|
| 30 | P1 | LMS 라우터 최상단 `router.use(apiLimiter)` 는 인증 **전**에 실행돼 키가 항상 `${ip}:anonymous` — 같은 NAT/사무실 IP 뒤 사용자 전체가 분당 60 요청 한 통을 공유한다 | 라우터 전역 적용을 제거하고 **라우트마다 2겹**으로 배치(69개 인증 라우트): `ipBurstLimiter → requireAuth\|optionalAuth → apiLimiter → role/membership guard → enrollment guard → controller`. 공개 라우트는 `apiLimiter → controller` 로 IP 단위 제한 유지. Auth Core 무변경 · 새 인증 로직 0 · invalid token 은 인증 실패로 anonymous IP 버킷에 남아 개인 버킷을 만들지 못한다 | **FIXED** |
| 31 | P1 | `LessonController.updateLesson` 이 `req.body` 를 그대로 `Object.assign(lesson, data)` — 소유권은 **수정 전** `courseId` 로만 검사하므로 `courseId` 를 실어 보내면 자기 강의의 lesson 을 타인 강의로 옮길 수 있다 | `LessonService` 에 `pickUpdatableLessonFields` allowlist(15필드) 신설, `updateLesson` 이 단일 choke point 에서 걸러낸다. allowlist 밖 키(`courseId`·`id`·소유권 파생)는 조용히 버린다 | **FIXED** |
| 32 | P1 | `CertificateService.updateCertificate` 도 동일 — scope 통과 후 `courseId`·`userId`·`id` 를 바꿔 수료증을 다른 강의·다른 사용자 소유로 옮길 수 있다 | `pickUpdatableCertificateFields` allowlist(지원 5필드: `certificateUrl`·`badgeUrl`·`isValid`·`expiresAt`·`metadata`) 신설 | **FIXED** |
| 33 | P2 | 운영자가 강의 **내용을 볼 수 없는 채로** 승인/반려만 가능하다. 운영 목록의 강의 링크가 learner `coursePath` 로 향해 membership·enrollment 정책에 막힌다 | **읽기 전용 운영자 검토 surface** 신설. 서버 `GET /api/v1/lms/operator/courses/:courseId/review` = `requireAuth → apiLimiter → requireLectureOperator`(active lecture membership + `lecture:operator`⊂`lecture:admin` · `platform:super_admin` break-glass 유지) · `course.serviceKey==='lecture'` 만, legacy KPA/PH/NULL 은 **non-disclosure 404** (scope 가 소유권·admin override 보다 먼저). 노출 = 강의 정보 · 커리큘럼 · lesson 내용 · 평가 존재 여부(문항·정답 비노출). 화면 `/operator/courses/:courseId/review` 는 읽기 전용이고 편집 진입점이 없다. **learner enrollment 정책 무변경 · 운영자 자동 수강 등록 0 · instructor 권한 부여 0 · write 0** | **FIXED** |
| 34 | P2 | learner 경로(`/courses/:courseId/lessons`, `/lessons/:id`)가 `isPublished=false` 인 초안 lesson 까지 그대로 돌려준다 | 목록은 서버가 `isPublished=true` 로 고정(요청 query 위조 무시), 상세는 미발행이면 404. 예외는 **소유 강사 · `lecture:admin`** 뿐이고, 강사 초안 편집은 기존 `/instructor/courses/:courseId/lessons` 경로가 그대로 담당한다 | **FIXED** |
| 35 | P2 | PharmacyHub 가이드 copy 가 `/education` 을 "PharmacyHub 에 등록된 강의" 로 안내 — Phase 2 §14 에서 `/education/*` 은 외부 이동(redirect) 이 됐다 | KPA·K-Cosmetics 와 같은 문구로 정렬: "O4O 강의로 이동"(study.neture.co.kr). 경로 자체는 외부 이동 진입점으로 유지 | **FIXED** |
| 36 | P2 | KPA `HomeLatestPage` 에 `강의` 탭이 남아 `type=course` 를 요청하지만 backend 홈 피드에서 `course` 는 이미 은퇴해 항상 빈 결과 | 탭·배지 제거 | **FIXED** |

> **두 limiter 를 겹친 이유 — Codex 와 CodeQL 의 요구가 반대 방향이었다.** Codex 는 limiter 가 `req.user` 를 볼 수 있도록 **인증 뒤**를 요구하고, CodeQL `js/missing-rate-limiting` 은 "authorization 을 수행하는 handler **앞**"을 요구한다(첫 push `f4d5f0baf` 에서 `requireAuth`·`optionalAuth` 자체가 60건 flagged). 한쪽만 만족시키면 다른 쪽이 깨지므로 **축을 나눠** 둘 다 만족시켰다:
>
> | | 위치 | 키 | 한도 | 의미 |
> |---|---|---|---|---|
> | `ipBurstLimiter` (신설 · additive) | 인증 **앞** | `getTrustedClientIp(req)` | 분당 600 | IP **상한** — 미인증 폭주 차단. 1인 할당량이 아니다(1인 할당량의 10배로 잡아 공유 NAT 정상 사용은 닿지 않는다) |
> | `apiLimiter` (기존 · 무변경) | 인증 **뒤** | `${ip}:${userId}` | 분당 60 | 사용자 **할당량** |
>
> 임의 JWT decode/hash 기반 인증 로직은 만들지 않았고, `apiLimiter` 와 Auth Core 는 수정하지 않았다. `rateLimiter.ts` 변경은 **export 1개 추가뿐**(기존 소비처 영향 0).

spec 추가(11차): 신규 `lecture-lms-rate-limit-ordering.spec.ts` **11건**(정적 7 + 동작 4: 같은 IP 의 user A/B 버킷 분리 · limiter 실행 시점에 `req.user` 존재 · 익명 IP 버킷 유지 및 위조 토큰의 개인 버킷 생성 불가 · `ipBurstLimiter` 가 인증 앞에서 IP 만으로 동작하고 한도가 600 · 두 limiter 의 키 축이 섞이지 않음) · merge-gate spec **+20건**(allowlist 5 · 운영자 검토 3 + 권한 5 · 초안 비노출 5 · 정적 2) → merge-gate spec **115/115**.

> 기존 정적 단언 10개(merge-gate spec 7 · `lms-operator-multi-service-scope` 2 · `lms-course-create-service-scope` 1 — 총 3개 spec)는 라우트 순서에 `apiLimiter` 가 들어오면서 **갱신**했다(`requireAuth, apiLimiter, …`). 단언의 대상·강도는 그대로이고 완화 0 — 순서 상수만 현행 라우트에 맞췄다.

> **10차 CI 실패(head `79a2f83d3`)는 이 PR 의 변경과 무관한 main drift 였다.** `AdminUserController` 가 `services/admin/service-membership-ensure.js` 를 import 하는 커밋이 main 에 먼저 들어가고 실제 파일은 `1e30e24ee`(11:58 KST)에서야 추가돼, 02:48Z 에 돌아간 PR CI 의 merge-ref 가 깨진 main 을 물었다(`TS2307` 5건 → Code Quality Check · API Server Jest FAIL). 현재 `origin/main` 에는 파일이 존재한다. 본 PR 은 해당 파일들을 건드리지 않는다.

### 17-3-k. 12차 — Codex 11차 리뷰 응답 2건 (P2 2) · merge-gate 종결 라운드

`f4d5f0baf` 에 대한 Codex 리뷰(2026-09-23T03:47:51Z) 2건. 둘 다 **authorization 축**이라 UX-polish DEFERRED 대상이 아니다.

| # | 등급 | 지적 | 처리 | 판정 |
|---|---|---|---|---|
| 37 | P2 | 실제 `requireAuth` 는 토큰이 없거나 만료·무효·미존재 사용자면 `next()` 없이 401 을 돌려주므로 `apiLimiter` 에 도달하지 못한다 — 미인증 트래픽이 JWT 검증(및 사용자 조회)을 무제한 반복할 수 있다. 신규 spec 의 mock 인증은 항상 `next()` 라 이 경로를 잡지 못한다 | **이미 `9bf65de68` 에서 해소** — 인증 **앞**의 `ipBurstLimiter`(IP 단위, 분당 600)가 인증 실패로 끝나는 요청까지 센다(리뷰 시점 head `f4d5f0baf` 에는 없었다). 12차에서 **그 사실을 잡는 동작 테스트**를 추가했다: `next()` 를 호출하지 않고 401 로 끝나는 미들웨어를 뒤에 두고, 두 번째 요청의 `ratelimit-remaining` 이 1 감소하는지 확인한다. 사용자 단위 키는 `apiLimiter` 에 그대로 남는다 | **FIXED** |
| 38 | P2 | `LessonController` 의 초안 예외(#34)가 **소유권 단독** 또는 **stale `lecture:admin` role** 만으로 성립한다. 무료·public 강의에서는 `requireEnrollment` 가 Lecture membership 판정을 건너뛰므로, role 이 회수됐지만 `instructorId` 에 남아 있는 과거 강사나 membership 이 정지된 admin 토큰이 미발행 lesson 을 목록·상세로 계속 읽는다 | `canSeeUnpublishedLessons` 를 `CourseController.canSeeUnpublished` 와 **동일 조건**으로 맞췄다(async): `platform:super_admin` break-glass → 그 외에는 (소유 `instructorId` 일치 + 현재 `lecture:instructor`) 또는 lecture staff(`lecture:operator` \| `lecture:admin`) **이면서** `resolveLectureMembershipStatus(req)==='active'`. 목록 경로에서 membership 을 건너뛰던 `rolesIncludeLectureAdmin` 선행 단축도 제거해 판정 지점을 하나로 모았다. **소유권은 role 을 대체하지 않는다** | **FIXED** |

spec 추가(12차): rate-limit-ordering spec **+1건**(401 로 끊긴 요청도 IP 상한을 소모) → **12/12** · merge-gate spec **+4건**(role 회수된 과거 소유 강사 · membership 없는 stale `lecture:admin` · active membership 운영자는 검토 목적으로 초안 열람 · 타 강의 소유 강사 차단) → **119/119**. 완화 0 · 신규 계약 약화 0.

> **PR CI 의 남은 적색 2건은 main drift 다 — 이 PR 의 변경이 아니다.** `9bf65de68` 의 `API Server Jest` / `Code Quality Check` 실패는 `origin/main` 자체(`1e30e24ee`, 운영자 초대 Google 전환)에서 이미 동일하게 실패하고 있다: ① `unified-store-workspace-handoff.spec.ts › manifest 에 append 되고 expected-schema-states 와 lockstep 이다`(`1790125106065-CreateOperatorInvitations` 가 manifest·expected-schema-states 와 lockstep 이 아님) ② admin-dashboard vitest `OperatorsPage`(password-policy 단언이 재작성된 화면과 불일치). 그 뒤 main 의 "success" 런은 docs-only fast path 로 두 job 이 **skipped** 된 것이다. 본 PR 은 두 파일군 중 어느 것도 diff 에 포함하지 않고(로컬 full jest 347 suites PASS), **범위 밖이라 수정하지 않는다** — 해당 세션/별도 WO 소관.

### 17-3-l. 13차 — Codex 12차 리뷰 응답 2건 (P2 2) · 운영자 검토 surface 완결

`c2aac0b55` 리뷰(2026-09-23T04:47:34Z). **신규 P0/P1 = 0.** 2건 모두 신설 surface 의 실사용 가능성에 관한 것이라 반영했다.

| # | 등급 | 지적 | 처리 | 판정 |
|---|---|---|---|---|
| 39 | P2 | 운영자 검토 화면이 "영상 있음 · 첨부 N · 퀴즈 N문항 · 과제 있음"만 보여준다. 재생기·첨부 링크가 없어 **운영자가 실제 자료를 확인하지 못한 채 승인**하게 된다 | 서버는 이미 `videoUrl`·`attachments`·`content` 를 돌려주고 있었고 화면이 존재 여부만 표시하고 있었다 → 화면에서 **영상 재생기 + 원본 열기 링크**, **첨부 개별 링크**(`target="_blank" rel="noopener noreferrer"`)를 렌더한다. `content` 는 기존대로 가공 없이 표시한다(instructor 초안 HTML 을 그대로 주입하지 않는다). **퀴즈 문항·정답은 계속 비노출** — WO 가 정한 노출 범위가 "평가 존재 여부"이고, 검토용 정답 노출은 별도 판단이 필요하므로 화면에 그 사실을 명시했다. 읽기 전용·write 0 불변 | **FIXED (문항·정답 노출은 범위 밖 · DEFERRED)** |
| 40 | P2 | `operatorCourseReview` 가 lesson 마다 `getQuizForLessonWithAnswers` + `getAssignmentByLesson` 2쿼리를 `Promise.all` 로 띄운다 — 500 lesson 강의에서 요청 1건이 **1,000 쿼리**. DB pool 독점 · 큰 강의일수록 검토가 timeout 된다 | `QuizService.countQuizQuestionsByLessons(lessonIds)` · `AssignmentService.findLessonIdsWithAssignment(lessonIds)` 배치 조회 신설(각각 `IN` · 200건 chunk). controller 는 lesson 수와 무관하게 **배치 2회**만 쏜다. 퀴즈 배치는 문항 **수**만 map 으로 돌려주므로 정답이 controller 로 흘러오지 않는다(기존 `getQuizForLessonWithAnswers` 경로보다 노출면이 좁다) | **FIXED** |

spec 추가(13차): merge-gate spec **+3건**(배치 2회 · 인자에 lessonId 전량 · 영상/첨부 실제 반환 및 `questions` 비노출 · 화면 정적 계약) → **122/122**. rate-limit-ordering spec 12/12 유지. 완화 0.

### 17-3-m. 14차 — Codex 13차 리뷰 응답 3건 (P1 3) · 접근 경계 마감

`9384bddfd` 리뷰(2026-09-23T05:44:36Z). **P1 3건 · P0 0 · P2 0.** 전부 authorization · 개인정보 노출 축이라 종료 기준상 지연 불가 — 3건 모두 반영했다.
이 리뷰 시점의 PR CI 는 전부 green 이었다(§17-3-k 의 main drift 적색 2건 해소 — 같은 job 이 이번 run 에서 pass).

| # | 등급 | 지적 | 처리 | 판정 |
|---|---|---|---|---|
| 41 | P1 | `requireEnrollment` 가 `course.status` 를 로드하지 않는다. 게시된 강의가 수정되거나 평가가 바뀌면 `CourseService` 가 `PENDING_REVIEW` 로 되돌리는데, 학습자는 그 사이에도 lesson · quiz · assignment 를 읽고 **승인 대기 중 본문에 대해 attempt/submission 까지 저장**한다 | select 에 `status` 추가 후 **scope 판정 다음 · 학습자 정책 앞**에서 게시 여부를 판정한다. 미게시면 403 이 아니라 **404 non-disclosure**(`CourseController.getCourse` 와 동일 계약 · lesson/quiz/assignment 경로별 메시지). 예외는 `canSeeUnpublishedCourse` — `CourseController.canSeeUnpublished` 와 같은 판정으로 **소유 강사 · lecture staff 이고 현재 role + active membership** 을 함께 요구하며 break-glass 만 무조건 통과. 학습자 enrollment 정책은 약화하지 않았고, 게시된 강의의 기존 접근은 불변(회귀 테스트 추가) | **FIXED** |
| 42 | P1 | `isLmsElevatedManager` 가 강사를 elevated 로 인정해, learner-facing `GET /lms/enrollments` 에서 `userId` 축소가 풀린다 → **타 강사 강의의 수강생·학습자 정보까지 조회**된다 | 강사를 제외하고 **운영자 · 관리자 · break-glass** 만 남겼다. 강사의 수강 관리는 `course.instructorId` 술어가 이미 걸린 `/lms/instructor/enrollments` 가 담당한다(신규 경로 · 신규 bypass 0) | **FIXED** |
| 43 | P1 | 강사 신청 목록 route 가 admin guard → `lecture:operator` 로 넓어졌는데 `listApplications` 는 `leftJoinAndSelect('app.user')` 로 User 엔티티를 통째로 반환한다 → **password hash · reset token · login metadata** 가 모든 Lecture 운영자에게 전달 | `leftJoin` + `addSelect(['user.id','user.name','user.email'])` 로 운영자 화면이 실제로 쓰는 최소 프로필만 투영. 화면(`OperatorInstructorsPage`)이 쓰는 필드는 `user.name`·`user.email` 뿐이라 UI 변경 0 | **FIXED** |

기존 spec 갱신 1건: `lms-enrollment-ownership-boundary` 가 "lecture:instructor 도 전체 목록 계약을 가진다"를 단언하고 있었다 — #42 가 바로 그 계약을 결함으로 지적했으므로, 기대치를 **강화 방향**(운영자·관리자만 전체 목록 · 강사는 본인 목록으로 강제)으로 갱신했다. 완화 0.

spec 추가(14차): merge-gate spec **+10건**(재검토 강의 learner 404 · 소유 강사/운영자 예외 · membership 없는 stale operator 차단 · 게시 강의 기존 접근 불변 · `isLmsElevatedManager` 역할별 판정 3건 · 정적 계약 2건) → **132/132**. 완화 0.

**Codex 재리뷰(`c4dd2aa9c` · 2026-09-23T06:32:46Z): "Didn't find any major issues." — 신규 finding 0.**
종료 기준 충족: 신규 P0/P1 = 0 · data integrity / authorization / service scope / cutover continuity / 기존 사용자 접근을 깨는 P2 = 0. 잔존 DEFERRED 는 §17-3-l #39 의 "검토 화면 퀴즈 문항·정답 노출"(순수 범위 판단 · 별도 지시 사항) 1건뿐이다.
이 head 의 PR CI 는 전부 green — API Server Jest · Code Quality Check · CodeQL · Analyze(typescript) · SonarCloud Quality Gate · Build Applications · Guard Static Analysis 전부 pass, `mergeable=MERGEABLE` · `mergeStateStatus=CLEAN`.

### 17-4. 검증 (merge-gate)

| 항목 | 결과 |
|---|---|
| shared-space-ui vitest | 8 files / 100 PASS |
| api-server tsc | 0 |
| api-server jest 전체 (1차 f3b8c8ca5) | 전체 실행 345 suites(4 skipped) — 344 PASS + `lms-operator-multi-service-scope` 1 FAIL(정적 계약이 `isLectureCourse` 정의를 routes 파일에서 찾음 → lecture-access.ts 로 승격된 위치로 assertion 갱신 · 완화 0) → 재실행 PASS. 최종 345/345 · 5799 tests PASS(32 skipped) · 0 FAIL |
| 14차(Codex 13차 응답 3건 · §17-3-m) | api-server tsc 0 · **api-server full jest 347 suites / 5,920 tests PASS (fail 0 · 32 skipped)** · merge-gate spec **132/132** · rate-limit-ordering spec 12/12 · eslint(변경 3파일) error 0 |
| 13차(Codex 12차 응답 2건 · §17-3-l) | api-server tsc 0 · web-lecture tsc 0 · web-lecture vite build PASS · **api-server full jest 347 suites / 5,909 tests PASS (fail 0 · 32 skipped)** · merge-gate spec **122/122** · rate-limit-ordering spec 12/12 · eslint(변경 5파일) error 0(기존 unused-vars warning 2 유지) |
| 12차(Codex 11차 응답 2건 · §17-3-k) | api-server tsc 0 · web-lecture tsc 0 · web-lecture vite build PASS · **api-server full jest 347 suites / 5,906 tests PASS (fail 0 · 32 skipped)** · merge-gate spec **119/119** · rate-limit-ordering spec **12/12** · eslint(LessonController + 신규/수정 spec 2) error 0. PR CI 의 `API Server Jest` · `Code Quality Check` 적색 2건은 **main drift**(§17-3-k 하단) — 본 PR diff 밖 |
| 11차(Codex 8~10차 응답 7건 · §17-3-j) | api-server tsc 0 · web-lecture tsc 0 · web-lecture vite build PASS · web-kpa-society build PASS · **api-server full jest 347 suites / 5,898 tests PASS (fail 0)** · merge-gate spec **115/115** · rate-limit-ordering spec **11/11** · eslint(LMS 모듈 + 신규 spec) 신규 error 0 · CodeQL `js/missing-rate-limiting` 0 |
| 10차(SonarCloud 중복 해소 · §17-3-i) | merge-gate spec 95/95 (동일) · 계약/단언 변경 0 |
| 9차(재검토 반영 · §17-3-h) | api-server tsc 0 · merge-gate spec 95/95 · LMS·enrollment 관련 jest 16 suites / 207 tests PASS |
| 8차(재검토 반영 · §17-3-g) | api-server tsc 0 · merge-gate spec 87/87 · LMS 관련 jest 15 suites / 198 tests PASS |
| 7차(재검토 반영 · §17-3-f) | api-server tsc 0 · web-lecture tsc 0 · vite build PASS · merge-gate spec 83/83 · api-server jest 전체 346/350 suites(4 skipped) · 5,858/5,890 tests PASS(32 skipped) |
| 3차(재검토 반영 · §17-3-d) | api-server tsc 0 · web-lecture tsc 0 · vite build PASS · merge-gate spec 56/56 · api-server jest 전체 345/345 suites(4 skipped) · 5817 tests PASS(32 skipped) |
| 2차(재검토 반영) | api-server tsc 0 · web-lecture tsc 0 · lecture 3 suites 71/71 · api-server jest 전체 345/345 suites · 5807 tests PASS(32 skipped · 0 FAIL — P1-6/7/P2 반영본 · apiLimiter 1줄은 tsc+lecture 3 suites 로 로컬 확인, 전체는 CI jest) |
| web-lecture tsc · vite build | 0 · PASS |
| shared-space-ui · web-kpa-society · web-k-cosmetics · web-pharmacy-hub · admin-dashboard tsc | 전부 0 |
| production DB write / cutover / 운영자 로그인 | 0 / 미실행 / 보류 |

### 17-5. 실행 순서 (확정 · PR 설명 동기화)

```
merge(PR #225) → final production re-census(SELECT only)
  → coordinated deploy + data cutover (api + web-lecture 배포와 lms_courses.service_key rekey 를 한 창에서 · 별도 WO)
  → public smoke(study.neture.co.kr) → operator E2E (Auth gate 해소 시)
```

- Phase 2 runtime 만 먼저 배포하면 production 11 course(kpa-society 8 · pharmacy-hub 3) 가 Lecture 경로에서 404 가 되고 기존 서비스 URL 은 이미 Lecture 로 외부 이동한다 → 단독 배포 금지.
- membership: `service_memberships(lecture)` 는 사용자 가입/운영자 지정으로만 생성. 자동 변환 0.
- **배포 전 확정 필요(7차 OPERATIONAL_GATE · §17-3-f #21)**: Lecture membership 부여 경로. 현재 `joinEnabled=false` 라 일반 사용자는 로그인 후에도 스스로 가입할 수 없다 — 운영자 지정으로 갈지 `joinEnabled` 를 켤지는 사용자 판단이며, 코드 기본값은 바꾸지 않았다.

---

## 18. PR #225 merge · 최종 production re-census (2026-09-23)

### 18-1. merge

세 조건을 실측으로 확인한 뒤 merge 했다(merge commit · rebase/force 0).

| 조건 | 결과 |
|---|---|
| CI Pipeline | head `20290660c` **전부 SUCCESS** — API Server Jest 10m55s · Code Quality 7m56s · Build Applications · CodeQL · Guard Static Analysis · Detect affected scope · **SonarCloud pass** |
| Codex 신규 P0/P1 | **0** — 14차 리뷰(2026-09-23 06:32Z) `Didn't find any major issues` · reviewed commit `c4dd2aa9c`. 그 위 head `20290660c` 는 **docs 1파일만** 변경(코드 diff 0)이라 리뷰 대상 동일 |
| mergeable | `MERGEABLE` / `CLEAN` |

→ **main `9a3b402b9`** (PR #225 merge). 7~13차 수정(P1 누적 다수)은 타 PC 세션이 진행했고, 본 세션은 4~6차 P1 4건(P1-13~16)과 같은 계열 P2 2건을 처리했다.

### 18-2. ⚠️ merge 가 배포 워크플로를 자동 트리거 — 즉시 취소

`main` push 는 `Deploy API Server` · `Deploy Web Services` · `Deploy Admin Dashboard` 를 자동 실행한다. §17-5 의 `PHASE2_MERGE != PHASE2_DEPLOY` 를 지키기 위해 merge 직후 **API · Web 배포 run 2건을 즉시 cancel** 했다(run `35855595361` · `35855595462`). 배포 직전 운영 revision 기준값: `o4o-core-api-03746-qlz` · `lecture-web-00012-rfj`.

> **다음 merge 때도 같은 일이 일어난다.** cutover 전까지 Lecture runtime 이 운영에 나가면 안 되므로, coordinated deploy WO 는 "배포 워크플로를 의도적으로 실행" 하는 단계를 명시적으로 포함해야 한다.

**취소 결과 실측**: `Deploy API Server` · `Deploy Web Services` = **cancelled**, Cloud Run revision 불변(`o4o-core-api-03746-qlz` · `lecture-web-00012-rfj`) → **Lecture runtime 은 운영에 나가지 않았다.**

**단, `Deploy Admin Dashboard` 는 취소 전에 완주했다(success · revision `o4o-admin-dashboard-01306-qmv`).** 이 배포에 포함된 Phase 2 변경은 admin 4파일 뿐이고 전부 **제거**다: `/admin/lms-instructor/*` 콘솔(router · dashboard · lmsInstructor API client) 삭제 + route 등록 해제(+7/−518). 즉 **Platform Admin 의 LMS instructor 콘솔이 cutover 전에 먼저 사라졌다.** 운영 영향은 "Platform Admin 에서 강사·수강 승인 화면 진입 불가"이며, LMS 데이터·API·학습자 경로에는 영향이 없다(백엔드 미배포). 되돌리지 않고 기록만 한다 — cutover 창에서 Lecture Operator surface 가 이를 대체한다(§12-3).

### 18-3. 최종 production re-census (SELECT only · Cloud SQL Auth Proxy)

§14(2026-09-22) 대비 **LMS 축 이탈 0** — cutover 대상·분포·하위 데이터 전부 동일.

| 항목 | 9/22 | 9/23 최종 | 판정 |
|---|---|---|---|
| `lms_courses` | 11 (NULL 0 · non-lecture kind 0) | **11 (NULL 0 · non-lecture kind 0)** | 동일 |
| service_key × status × visibility | kpa-society 8 · pharmacy-hub 3 | **kpa-society 8**(published/public 3 · published/members 2 · archived/members 2 · pending_review/members 1) · **pharmacy-hub 3**(archived: members 2 · public 1) | 동일 |
| lessons / enrollments / progress / quizzes / assignments | 10 / 3 / 0 / 6 / 1 | **10 / 3 / 0 / 6 / 1** | 동일 |
| certificates / quiz_attempts | 0 / 0 | **0 / 0** | 동일 |
| orphan lessons / enrollments | 0 / 0 | **0 / 0** | 동일 |
| 마지막 course 갱신 | 2026-08-26 | **2026-08-26 03:52:55** | Phase 2 기간 LMS write 0 |
| `currentEnrollments` 불일치 | 7 | **7** | 동일(§20 범위 밖 · 미수정) |
| `roles` lecture:* / lms:* | 3 / 1 | **3 / 1** | 동일(legacy 선언 유지) |
| `role_assignments` 전체 / lecture:* / lms:* | 11 / 0 / 0 | **11(전부 active) / 0 / 0** | 동일 |
| `service_memberships` 전체 / lecture active | 5 / 0 | **5 / 0** | 동일 — 자동 생성 0 |
| `platform_services` lecture | active | **active** | 동일 |
| `users` | 2 | **1** | ⚠️ 감소 — Identity 트랙(테스트 계정 정리) 소관 · Lecture 축 무관 · 본 세션 write 0 |

cutover 대상 11 course id 를 §18-3 실행 로그(`C:/tmp/p2-final-census-out.txt`)에 고정했다(kpa-society 8 · pharmacy-hub 3 · 전부 instructorId 보유).

```text
FINAL_RE_CENSUS = PASS (이탈 0 · STOP 미발동)
PRODUCTION_DB_WRITES = 0
LMS_DATA_CUTOVER = NOT_STARTED
PHASE2_PRODUCTION_DEPLOY = HELD (merge 직후 자동 트리거 배포 취소)
OPERATOR_LOGIN_E2E = 보류 (Auth 트랙)
```

### 18-4. 다음 (coordinated deploy + cutover WO 에서)

1. Lecture membership 부여 경로 확정(§17-5 OPERATIONAL_GATE) — 운영자 지정 vs `joinEnabled=true`
2. api + web-lecture 배포와 `lms_courses.service_key` rekey(11건)를 **한 창에서** 실행 · 기존 KPA/PH membership → Lecture membership 자동 생성 **금지**
3. `currentEnrollments` 정합 복구(7건)는 cutover 직후 같은 창에서 판단
4. public smoke(study.neture.co.kr) → operator E2E(Auth gate 해소 후)

---

## 19. INCIDENT — Phase 2 runtime 이 cutover 없이 운영 배포 → 전량 롤백 (2026-09-23)

> **판정**: `INCIDENT = RESOLVED_BY_ROLLBACK` · `DATABASE_CUTOVER = FORBIDDEN(미실행)` · `PRODUCTION_DB_WRITES = 0` · `ROOT_CAUSE_DUPLICATE_PUSH = INVESTIGATE`

### 19-1. 타임라인 (UTC)

| 시각 | 사건 |
|---|---|
| 11:37:17 | main `9a3b402b9`(PR #225 merge) push → Deploy API/Web/Admin 자동 트리거 |
| ~11:39 | **취소 전에 일부 job 이 이미 revision 생성**: `lecture-web-00012-rfj`(11:39:36 · deploy-lecture job 은 success) · `kpa-society-web-01994`(11:39:56) · `k-cosmetics-web-01162`(11:39:56) · `pharmacy-hub-web-00252`(11:40:00) · `o4o-admin-dashboard-01306`(11:40:06 · Admin run 자체가 success) |
| 11:40:29~30 | Deploy API(`35855595361`) · Deploy Web(`35855595462`) **cancel 성공** — API 는 `build-and-deploy: cancelled` 로 revision 미생성 |
| 11:46:06 | **같은 sha `9a3b402b9` 로 배포 3종이 다시 실행**(`35856452770` · `35856452629` · `35856452621`) — GitHub 메타상 `event=push · run_attempt=1 · actor=Renagang21` = **Re-run 이 아니라 동일 SHA 에 대한 두 번째 push 이벤트** |
| 11:48~11:53 | 전 서비스 Phase 2 revision 생성 (`o4o-core-api-03747-kxq` 11:53:27 · `lecture-web-00013` · `kpa-society-web-01995` · `k-cosmetics-web-01163` · `pharmacy-hub-web-00253` · `o4o-admin-dashboard-01307`) |
| — | 장애 실측: `GET /api/v1/lms/courses` → `total 0` · KPA published/public 강의 단건 **404** (production 11 course 는 전부 kpa-society/pharmacy-hub 인데 `/api/v1/lms/*` 가 `lecture` scope 고정) |
| 이후 | 사용자 승인(선택 A) → **6축 traffic 100% 롤백** |

### 19-2. 롤백 대상 — "직전 revision"이 아니라 **Phase 2 이전** revision

⚠️ 11:39~11:40 revision 들은 *취소된 첫 run* 이 이미 만든 **Phase 2 산출물**이다. 따라서 롤백 기준은 11:37 merge **이전** 배포분이다. 06:20 / 05:18 배포 이후 11:37 merge 전까지 해당 표면을 건드린 main 커밋이 **0건**임을 git log 로 확인한 뒤 선택했다(추측 0).

| 서비스 | 롤백 전(Phase 2) | **롤백 후(pre-Phase 2)** | 근거 |
|---|---|---|---|
| `o4o-core-api` | 03747-kxq (11:53) | **03746-qlz** (06:53:48) | 첫 run 은 revision 미생성 |
| `lecture-web` | 00013-7ls (11:48) | **00011-drs** (06:20:29) | 00012-rfj(11:39)도 Phase 2 — 1차 롤백 대상 오인 후 **정정** |
| `kpa-society-web` | 01995-5qr (11:48) | **01993-6z9** (06:20:41) | 01994(11:39)=Phase 2 |
| `k-cosmetics-web` | 01163-4bh (11:48) | **01161-lw5** (06:20:33) | 01162(11:39)=Phase 2 |
| `pharmacy-hub-web` | 00253-l44 (11:48) | **00251-49n** (06:20:41) | 00252(11:40)=Phase 2 |
| `o4o-admin-dashboard` | 01307-r2k (11:49) | **01305-z8l** (05:18:58) | 01306(11:40)=Phase 2 · 직전 커밋 `cc87a9385`(05:14)은 01305 에 포함 |

`neture-web` · `store-web` 은 Phase 2 LMS 장애와 직접 관계가 확인되지 않아 **롤백하지 않았다**(사용자 지시).

### 19-3. 복구 smoke (전부 PASS)

```text
GET /api/v1/lms/courses            total 4 (published 3 · archived 1 · 전부 public) — 복귀
KPA published/public 단건 3종       200 / 200 / 200   (장애 중 404 → 복구)
kpa-society.co.kr · /courses/:id · /lms   200
k-cosmetics.site · pharmacyhub.co.kr · study.neture.co.kr · admin.neture.co.kr   200
서빙 번들 Phase 2 마커              LectureExternalRedirect 0 · study.neture.co.kr 0  (3 서비스 index/vendor 번들)
```

### 19-4. DB (read-only · write 0)

`lms_courses 11` · `lms_enrollments 3` · `lessons 10` · `quizzes 6` · `assignments 1` · **`service_key='lecture'` 0** · `service_memberships(lecture, active)` 0 · 마지막 course 갱신 `2026-08-26 03:52:55` · 마지막 enrollment 생성 `2026-08-18`. 분포도 §18-3 과 동일(kpa-society 8 · pharmacy-hub 3).

→ **장애 기간에도 데이터는 무변경**. rekey · membership 생성 · destructive 작업 전부 미실행.

### 19-5. 후속 (복구 후 조사 · 필수)

1. **`ROOT_CAUSE_DUPLICATE_PUSH`** — 동일 main SHA `9a3b402b9` 가 11:37 과 11:46 두 번 push 이벤트를 만든 원인. 규명 전에는 **같은 일이 재발해 롤백이 무효화될 수 있다**(main 에 Phase 2 코드가 있는 한 어떤 push 든 배포를 트리거한다).
2. 재발 방지 없이는 main 의 다른 WO push 도 Phase 2 를 실어 나른다 → coordinated deploy WO 전까지 **배포 트리거 차단 수단**(workflow 조건 · 수동 승인 게이트 등)을 먼저 정한다.

   **기전 — 정정 확정(2026-09-23 · 실측 근거)**: 처음 여기에 "`--no-traffic` 이 없으니 다음 deploy 가 트래픽을 덮어쓴다" 고 적었으나 **틀렸다.** 실제로는 롤백이 `update-traffic --to-revisions <rev>=100` 으로 트래픽을 **특정 revision 에 pin** 했고, 그 상태에서 `gcloud run deploy` 는 새 revision 을 만들되 **트래픽을 옮기지 않는다.** gcloud 자신이 배포 로그에 그렇게 출력한다:

   ```
   Service [o4o-core-api] revision [o4o-core-api-03747-kxq] has been deployed and is serving 0 percent of traffic.
   ```
   (run `35864390517` · 13:10:43Z · `deploy-api.yml` 의 Deploy to Cloud Run step)

   즉 **pin 이 유지되는 동안은 배포가 곧 장애 재현이 아니다** — 새 revision 이 0% 로 쌓일 뿐이다. 단 `update-traffic --to-latest`(또는 콘솔에서 최신 승격) 한 번이면 즉시 Phase 2 가 서빙되므로, pin 은 안전장치이지 통제 수단이 아니다. 이 판정은 타 세션(`o4o-platform-32`)의 관측과 일치하며, 앞선 반대 서술은 본 절로 대체한다.
3. data cutover 는 **별도 지시 전까지 시작 금지**.

---

## 20. 배포 차단 게이트 적용과 그 한계 (2026-09-23)

§19 후속으로 사용자 승인(C안 · fail-closed)을 받아 **저장소 변수 kill switch** 를 세 배포 워크플로에 넣었다. 적용 직후 같은 변수가 외부에서 'true' 로 바뀌어 게이트가 한 번 열렸고, 그 사건 자체가 "변수 하나로는 배포 통제가 충분하지 않다" 는 실증이 됐다.

### 20-1. 적용 내용 (`3c7083be5`)

| 워크플로 | 게이트 위치 | 효과 |
|---|---|---|
| `deploy-api.yml` | `build-and-deploy` **잡 전체** | Docker build/push · `gcloud run jobs execute o4o-api-migrations` · `gcloud run deploy` 가 함께 멈춘다(보류 중 migration 0) |
| `deploy-web-services.yml` | 서비스별 deploy job **9개** | 각 `vars.DEPLOY_ENABLED == 'true' && needs.detect-changes.outputs.<svc> == 'true'` |
| `deploy-admin.yml` | `deploy` job | 기존 `force_deploy` OR 조건을 괄호로 묶어 게이트가 **우선**하도록 AND |

- 조건은 **fail-closed**: `vars.DEPLOY_ENABLED == 'true'` 일 때만 배포. 변수 부재·공백이면 Actions 가 빈 문자열을 돌려주므로 **차단이 기본값**이다.
- 각 워크플로에 `deploy-hold-notice` job 추가 — `if: vars.DEPLOY_ENABLED != 'true'` 로 **게이트가 닫혔을 때만** 돌며 사유·현재 값·해제 방법을 Job Summary 에 남긴다. 배포 job 과 `needs` 관계가 없어 skip 여부와 무관하게 출력된다.
- 적용 순서: **변수를 먼저 false 로**(13:00:05Z) → 워크플로 커밋 push(13:02). 순서가 반대면 게이트 커밋 자체가 기존 규칙대로 배포를 일으킨다.

### 20-2. 게이트가 한 번 열린 사건 (13:02:37Z)

| 시각 | 사실 |
|---|---|
| 13:00:05Z | `DEPLOY_ENABLED = false` (본 세션이 설정) |
| **13:02:37Z** | **`DEPLOY_ENABLED = true` 로 변경 — 본 세션이 하지 않았다** |
| 13:02:48Z | 게이트 커밋 push 로 배포 3종 트리거 → 변수가 true 라 deploy job 전부 실행 |
| 13:05~13:11 | 새 revision 생성(`o4o-core-api-03748-64l` · `kpa-society-web-01996-r8d` · `o4o-admin-dashboard-01308-29m` 등) · API migration job `o4o-api-migrations-46z8t` 실행 |
| 13:21:59Z | 사용자 지시로 `DEPLOY_ENABLED = false` 복구 · 진행/대기 run 0 확인 |

게이트 **로직은 정상 동작**했다(`deploy-hold-notice` skipped = 조건이 거짓 = 변수가 'true'). 입력값이 바뀐 것이 원인이다.

**주체 미특정(추측 금지)**: GitHub 변수 API 는 `updated_at` 만 주고 actor 를 주지 않으며(`{"name":"DEPLOY_ENABLED","value":…,"created_at":…,"updated_at":…}`), 개인 저장소라 `repos/.../audit-log` · `users/.../audit-log` 모두 404 다. 남길 수 있는 사실은 다음 둘뿐이다.

- 본 세션(Lecture)은 13:00:05Z `false` 설정과 13:21:59Z `false` 복구 두 번만 호출했다. 13:02:37Z 변경은 본 세션이 아니다.
- 병행 세션 `o4o-platform-32`(legacy-password WO)는 **GitHub 변수/시크릿 write 0** 이라고 회신했다(해당 세션의 쓰기는 로컬 파일 편집과 `wo/legacy-password-auth-retirement` 브랜치 push 뿐이며, 배포 워크플로 3종은 `branches: main`/`develop` 한정이라 그 push 로는 트리거되지 않는다). 이 진술을 근거로 해당 세션은 배제한다.

→ 남는 경로는 **사용자 직접 변경 또는 본 저장소에 접근하는 다른 PC/세션**이며, 현재 가용한 기록으로는 **특정 불가**로 남긴다.

### 20-3. 운영 영향 — read-only 실측으로 **없음**

- **트래픽**: 6축 전부 pre-Phase2 revision 100% 유지. 새 revision 은 **0%** (§19-5 정정 참조 · gcloud 가 "serving 0 percent of traffic" 출력).
- **migration**: `o4o-api-migrations-46z8t`(13:10) 로그 — `DATABASE_STATE = LEGACY_ESTABLISHED` · `BOOTSTRAP_EXECUTION = SKIPPED` · `HISTORICAL_REPLAY = ZERO` · `INCREMENTAL_PENDING = 0` · **`INCREMENTAL_EXECUTED = 0`** · `PRE/POST_MIGRATION_SCHEMA_ASSERTION = PASS` · fingerprint `bc27f5bc…`(5826 lines) **전후 동일** · `typeorm_migrations` 688 rows · 기대 상태 `CreateHospitalDeviceTables1790125390245`(타 WO 가 이전에 적용한 것).
- **데이터**: `lms_courses` 11(**`service_key='lecture'` 0**) · `lms_enrollments` 3 · lessons 10 · quizzes 6 · assignments 1 · quiz_attempts 0 · `service_memberships` 5(**lecture active 0**) · `roles` lecture 3 · `role_assignments` 11(lecture 0) · 마지막 course 갱신 `2026-08-26` → §19-4 와 **완전 동일**.

즉 게이트가 열린 채 배포가 돌았어도 **스키마·데이터·서빙 트래픽 모두 무변경**이었다. 이는 게이트 덕분이 아니라 **트래픽 pin** 과 **적용할 migration 이 없었다**는 두 우연 덕분이다.

### 20-4. 판정 — 변수 단일 게이트의 한계

```text
DEPLOY_GATE_APPLIED      = YES (api · web-services · admin · fail-closed)
DEPLOY_GATE_SUFFICIENT   = NO  — 저장소 변수는 누구나 되돌릴 수 있고 변경 주체가 감사되지 않는다
DEPLOY_ENABLED           = false (13:21:59Z 복구)
PRODUCTION_IMPACT        = 0 (트래픽 · 스키마 · 데이터)
0%_REVISIONS             = 보존 (삭제·승격 금지)
```

보강 후보(다음 지시 전 미실행): GitHub **Environment + required reviewer**(배포 job 에 `environment:` 를 걸면 승인 없이는 job 이 시작되지 않고 승인 이력이 남는다) · 변수 대신 **보호된 environment secret/variable** · 배포 워크플로의 `workflow_dispatch` 전용화.
