# CHECK — WO-O4O-LEGACY-DATABASE-MAINTENANCE-SCRIPT-CONNECTION-LOG-MINIMIZATION-V1

**작성일**: 2026-09-15
**구현 커밋**: `76827baf7` (`main`) · CI 결과 기록 후속 커밋 1건
**판정**: **C · DEAD_LEGACY_SCRIPT → 삭제 (REMOVED_WITH_EVIDENCE)** — §16 완료 키 전부 충족

> DB host · database name · 계정 · 비밀번호 · instance 이름 · 접속 URL 은 이 문서에 기록하지 않는다. canary 값도 기록하지 않는다. 운영 DB 는 read-only 조회(컬럼 존재 여부 · migration history · 건수)만 수행했고 사용자 식별값 · 행 내용은 조회하지 않았다.

---

## 1. 기준 SHA · 작업 공간

| 항목 | 값 |
|---|---|
| 작업 시작 기준 | `0270af734` (`origin/main` == worktree HEAD, detached) |
| 작업 worktree | `C:\tmp\o4o-db-maint-log-2` — `git worktree add --detach` 로 신규 생성, 자체 `pnpm install` (node_modules junction 없음), 디스크 여유 193 GB 확인 후 생성 |
| 작업 중 상류 진입 | 0건 (`git log HEAD..origin/main` 빈 출력, push 직전 재확인) |
| 변경 파일 | `apps/api-server/scripts/run-cleanup.js` **삭제** 1건 + 본 CHECK 1건 |

## 2. 메인 체크아웃 diverged 상태 회피

| 항목 | 결과 |
|---|---|
| 메인 체크아웃 `C:\Users\home\coding\o4o-platform` | `16c4e6a8d` · ahead 7 / behind 26 · 미추적 4건(`docs/checks/CHECK-O4O-NETURE-AUTH-…`, `CHECK-O4O-NETURE-MAIN-ACCOUNT-…`, `CHECK-O4O-STORE-TABLET-…`, `scripts/e2e/`) |
| 메인 체크아웃에서 pull / rebase / reset / checkout | **하지 않음** |
| 기존 worktree `C:\tmp\o4o-db-maintenance-log` (`work/legacy-db-maintenance-script-log-v1`, `d805e50be`, clean, 0 commits ahead) | 다른 세션 소유 가능성 → **접촉 없음**, 재사용하지 않고 별도 worktree 생성 |
| 다른 세션의 cloud-sql-proxy (:5442) | 그대로 사용 · 종료하지 않음 |
| 이 WO 파일에 대한 다른 세션 dirty | 0건 |

## 3. 소비처 전수 조사 (§4)

| 조사 축 | 방법 | 결과 |
|---|---|---|
| 파일명 참조 (`run-cleanup`) 전체 추적 파일 | `git grep` | **3건 · 전부 historical CHECK** `docs/checks/CHECK-O4O-MIGRATION-HISTORICAL-MANIFEST-IDENTITY-AND-LOCAL-DB-CREDENTIAL-LOG-FINAL-CLOSURE-V1.md` L155 · L204 · L214 (본 WO 의 발원 기록) — 기록물 언급이므로 활성 소비처 아님 |
| `package.json` scripts (root · apps · packages) | `git grep -- '**/package.json'` | `apps/api-server/scripts/` 참조 0 · `run-cleanup` 0 |
| `.github/workflows/**` | `git grep` | 0 |
| `Dockerfile*` · `.dockerignore` · `docker-compose*` | 열람 | `apps/api-server/Dockerfile` 은 `dist/main.js` · `dist/migrate.js` · drug-seed job 산출물만 COPY — `apps/api-server/scripts/` 는 **이미지에 포함되지 않음** |
| 동적 `spawn` / `exec` / `fork` | `git grep -E "(spawn|exec|fork)…api-server/scripts"` | 0 |
| Cloud Run job (`gcloud run jobs list`) | 8개 job 이름 확인 · `o4o-api-migrations` command = `node dist/migrate.js` | run-cleanup 실행 job 없음 (이미지에 스크립트 자체가 없음) |
| Cloud Scheduler | `gcloud scheduler jobs list` | **API 미활성(SERVICE_DISABLED)** → scheduler 소비처 존재 불가 |
| `docs/baseline` · `docs/rules` · `docs/runbooks` · `scripts/README.md` · `apps/api-server/README*` · `SETUP.md` | `git grep` | 현행 지시문 0 |
| `docs/investigations` | `git grep` | `IR-O4O-REPOSITORY-WIDE-DEAD-CODE-AND-LEGACY-SURFACE-CENSUS-V1.md` L159 · L270 이 `apps/api-server/scripts/` 를 **UNKNOWN(묶음 F 확인 대상)** 으로 분류 — 소비처 주장 아님 |
| 다른 스크립트에서 import | `git grep` | 0 |
| 최근 운영 실행 흔적 | git 이력 · CHECK · 운영 DB 상태 | 마지막 수정 `d6ee28458` 2025-11-28 (추가 `db91d035e` 2025-11-28 "feat: Add vendor_manager cleanup scripts (SQL and JS versions)") · 이후 실행 기록 문서 0 · 운영 DB 는 대상 컬럼 자체가 없어 실행 불가(§11) |

**ACTIVE_SCRIPT_CONSUMER = ZERO · ACTIVE_PACKAGE_SCRIPT_REFERENCE = ZERO · ACTIVE_WORKFLOW_REFERENCE = ZERO · ACTIVE_RUNBOOK_REFERENCE = ZERO.**

## 4. 기능 · SQL 표 (§4.3)

스크립트: ESM · `pg` `Client` 직접 생성(`DB_HOST`/`DB_PORT`/`DB_NAME`/`DB_USERNAME|DB_USER`/`DB_PASSWORD`, `host` 기본값 `localhost`) · `dotenv` 로 `apps/api-server/.env` 로드 · 실행 대상 = `users.role` · `users.roles`(simple-array 문자열 가정).

| 동작 | 대상 | 조건 | transaction | destructive | runtime 소비 |
|---|---|---|---|---|---|
| SELECT id, email, role, roles | `users` | `roles LIKE '%vendor_manager%' OR role = 'vendor_manager'` | 없음 | 아니오 (단, **email 을 stdout 에 출력** — PII) | 없음 |
| UPDATE roles = CASE … REPLACE(roles,'vendor_manager,' / ',vendor_manager' / 'vendor_manager') … | `users` | `roles LIKE '%vendor_manager%'` | 없음 | **예** (row guard: LIKE 조건만) | 없음 |
| UPDATE role = CASE WHEN roles LIKE '%,%' THEN SPLIT_PART(roles, ',', 1) WHEN roles<>'' THEN roles ELSE 'customer' END | `users` | `role = 'vendor_manager'` | 없음 | **예** | 없음 |
| UPDATE roles = 'customer' | `users` | `roles IS NULL OR roles = '' OR roles = ','` | 없음 | **예 · 대상 row 상한 없음**(vendor_manager 와 무관한 빈 roles 전부) | 없음 |
| SELECT id, email, role, roles (검증) | `users` | `id = ANY($1)` (1단계 id 목록) | 없음 | 아니오 (email 출력) | 없음 |

공통: dry-run 없음 · 환경 구분 없음 · production 차단 없음 · rollback 없음 · migration/seed 아님 · wildcard/CASCADE/TRUNCATE/DROP 없음 · 외부 명령 없음 · 오류는 `console.error('…', error)` 로 **전체 error 객체 출력**(pg 오류에 hostname 포함) · 하드코딩 자격정보 fallback 없음(`host: 'localhost'` 기본값만) · synchronize 없음.

## 5. 판정: **C · DEAD_LEGACY_SCRIPT**

§5.3 삭제 조건 대조:

| 조건 | 충족 | 근거 |
|---|---|---|
| 활성 소비처 0 | ✅ | §3 |
| runbook 참조 0 | ✅ | §3 |
| 대상 기능 · 테이블 은퇴 | ✅ | `vendor_manager` 는 api-server `src` 에 0건(enum 제거) · RBAC SSOT = `role_assignments` (F9) · `users.role` · `users.roles` · `users.active_role_id` 는 migration `20260228000002-DropLegacyRbacColumns` 가 DROP · `roles` 는 그 전에 `20260205035000-ConvertRolesToArrayType` 로 text[] 전환(스크립트의 LIKE/REPLACE/SPLIT_PART 문자열 연산과 비호환) |
| canonical migration/maintenance 경로 존재 | ✅ | 운영 migration 단일 소유자 = deploy migration job `o4o-api-migrations` (`node dist/migrate.js`, `15a9ac20a`) · 역할 정리는 migration 으로 수행됨 |
| 최근 운영 실행 흔적 없음 | ✅ | §3 · §11 |
| CI · deploy · 복구 계약 손실 없음 | ✅ | 워크플로 · Dockerfile · package script 참조 0 · 복구 경로 아님(현 스키마에 실행 불가) |

**D(중지) 트리거 대조**: 운영 데이터 삭제 스크립트이나 소유자 · 실행 이력이 불명한 것이 아니라 **대상 컬럼이 운영에 존재하지 않아 실행 자체가 불가능**하므로(§11) "현행 서비스 테이블 대상" · "row guard 부재" 가 실질 위험으로 성립하지 않는다. 로그 한 줄만 고쳐 형식적으로 종결하는 대신 스크립트를 제거했다.

## 6. 판정 근거 요약

1. 목적(`vendor_manager` 역할 제거)은 2025-11 시점의 1회성 작업이며, 그 열거값 · 컬럼이 모두 저장소와 운영 DB 에서 은퇴했다.
2. 현 스키마(`roles` 컬럼 없음)에서는 1단계 SELECT 가 `column "roles" does not exist` 로 실패한다 — 어떤 경로로도 유효한 유지보수 도구가 아니다.
3. 유지 시 남는 것은 위험뿐이다: 접속정보 로그 · email 출력 · 전체 error 객체 출력 · 빈 roles 전체 UPDATE(상한 없음) · transaction 없음.
4. 같은 커밋의 SQL 쌍둥이 `cleanup-vendor-manager.sql` 과 TypeORM 판 `cleanup-vendor-manager-role.ts`, 그리고 `cleanup-affiliate-role.ts` · `cleanup-moderator-role.ts` 도 같은 이유로 dead 이지만 **접속정보 로그가 없고 본 WO 지정 대상이 아니므로 범위 외** — 별도 WO 제안(§16).

## 7. 로그 BEFORE / AFTER

| | BEFORE (`run-cleanup.js`) | AFTER |
|---|---|---|
| L29 | `console.log(\`📊 Connecting to database: ${process.env.DB_NAME}@${process.env.DB_HOST}\`)` — database@host 출력 | 파일 삭제 → 출력 경로 없음 |
| L120 | `console.error('❌ Error during cleanup:', error)` — pg 오류 객체(hostname 포함) 전체 출력 | 파일 삭제 |
| L61·L129 부근 | 사용자 `email` 을 각 행마다 출력 | 파일 삭제 |

**DATABASE_CONNECTION_LOG_EXPOSURE = ZERO** (저장소 내 `DB_NAME@DB_HOST` 형 출력 0건 — §10).

## 8. 자격정보 취급 (§7)

| 항목 | 결과 |
|---|---|
| 운영 read-only 조회 자격정보 | `gcloud secrets versions access` → 명령 내부 `PGPASSWORD` 환경변수로만 전달 · 즉시 `unset` · CLI 인자 · URL · 로그 · 문서에 없음 |
| canary 실행(§9) | 격리 scratchpad 에서 env 로만 전달 · `env -i` 로 실제 env 차단 · 실행 후 출력 파일은 scratchpad(세션 임시) |
| `.env` | worktree 에 `apps/api-server/.env` 없음 · 생성 · 커밋 없음 |
| 조사 로그 | 이 문서 · 터미널 출력에 host/db/user/password 값 0건 (마스킹 `<CANARY>` 로만 표기) |

## 9. canary 검증 (§9)

격리 실행: 스크립트를 scratchpad 로 복사, `pg@8` · `dotenv@16` 을 별도 설치, `env -i` 후 `DB_HOST`/`DB_NAME`/`DB_USERNAME`/`DB_PASSWORD` 에 canary 값(호스트는 `.invalid` 도메인 → DNS 실패, **어떤 DB 에도 접속하지 않음**) 을 주고 `node scripts/run-cleanup.js` 실행.

| canary | stdout | stderr | 파일 · 명령 인자 |
|---|---|---|---|
| `O4O_CLEANUP_HOST_CANARY` | **1** (L29 로그) | **2** (`getaddrinfo ENOTFOUND <host>` 메시지 + `hostname:` 필드) | 0 |
| `O4O_CLEANUP_DATABASE_CANARY` | **1** (L29 로그) | 0 | 0 |
| `O4O_CLEANUP_USER_CANARY` | 0 | 0 | 0 |
| `O4O_CLEANUP_PASSWORD_CANARY` | 0 | 0 | 0 |

BEFORE 노출 4건 확인(exit 1). AFTER: 파일이 없으므로 실행 경로 자체가 0 → 노출 0.

## 10. 저장소 동종 로그 스캔 (§11)

범위: `apps/api-server/scripts/**` · `scripts/db/**` · `scripts/*.sh` · `.github/workflows/**`. 패턴: `DB_NAME@` · `${DB_HOST}` 류 · `console.error(…, error)` · `set -x` · `.env` 출력 · `echo $DB_*`.

| 위치 | 내용 | 분류 |
|---|---|---|
| `apps/api-server/scripts/run-cleanup.js` L29 · L120 | database@host 로그 · 전체 error 출력 | **REMOVED** (파일 삭제) |
| `apps/api-server/scripts/cleanup-vendor-manager-role.ts` L80 · L93 / `cleanup-affiliate-role.ts` L80 · L93 / `cleanup-moderator-role.ts` L80 · L93 | `console.error('…', error)` 전체 error 출력 (접속정보 직접 출력 없음 · AppDataSource 경유) | **OUT_OF_SCOPE_ACTIVE_RISK** (낮음 · dead 스크립트 · 별도 WO 제안, §16) |
| `scripts/dev-start.sh` L54 · `scripts/sync-local.sh` L33 · `scripts/fix-view-text.sh` L21·25·39 | `PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST …` — env 변수를 psql 인자로 전달, **로그 출력 아님**(`set -x` 없음) · 로컬 개발 스크립트 | **OUT_OF_SCOPE_ACTIVE_RISK** (낮음 · 로컬 전용 · `fix-view-text.sh` 는 `DB_NAME` 등 literal 기본값 보유 — 별도 WO 후보) |
| `scripts/setup-local-db.sh` L172-182 | `데이터베이스: $DB_NAME` · `사용자: $DB_USER` 출력(로컬 setup 안내) · 비밀번호는 `(출력하지 않음)` | **SAFE_SET_OR_MISSING** (직전 WO 에서 canary 회귀 테스트 보유) |
| `scripts/db/__tests__/setup-local-db-credential-log.test.mjs` | 패턴 문자열은 테스트 검증 대상 | **TEST_FIXTURE** |
| `.github/workflows/automation-repo-setup.yml` L70 | GitHub label 생성 실패 `console.error(…, error)` — DB 무관 | **SAFE_STATIC_TEXT** (DB 접속정보 아님) |
| `docs/checks/CHECK-O4O-MIGRATION-HISTORICAL-…-FINAL-CLOSURE-V1.md` L155·204·214 | `run-cleanup.js` 언급 | **HISTORICAL_DOCUMENT** (보존) |

워크플로 · 다른 기능으로의 확장 필요 없음 → 중지 조건 미발동.

## 11. 운영 DB 무변경 · 은퇴 증거 (read-only)

cloud-sql-proxy(:5442, 다른 세션 기동) 경유 `psql -w` · SELECT 만 실행. 사용자 식별값 · 행 내용 조회 없음.

| 조회 | 결과 |
|---|---|
| `information_schema.columns` — `users` 의 `role` · `roles` · `active_role_id` | **0 컬럼** (스크립트 대상 컬럼 부재 → 실행 불가) |
| `information_schema.tables` — `user_roles` | **0** (drop 됨) |
| `information_schema.tables` — `role_assignments` | **1** (SSOT 존재) |
| `role_assignments WHERE role='vendor_manager'` 건수 | **0** |
| `typeorm_migrations` — `ConvertRolesToArrayType20260205035000` · `DropLegacyRbacColumns20260228000001` · `DropLegacyRbacColumns20260228000002` | **3행 존재** (운영 적용 완료) |

**PRODUCTION_DATABASE_WRITE = ZERO · PRODUCTION_SCHEMA_CHANGE = ZERO · PRODUCTION_DATA_CHANGE = ZERO · PRODUCTION_MIGRATION_HISTORY_CHANGE = ZERO** (UPDATE/DELETE/DDL 0회 · 스크립트 실행 0회).

## 12. 검증 (§14)

| 검증 | 결과 |
|---|---|
| `git diff --cached --check` | PASS |
| §10 삭제 회귀 계약 | 파일 부재 ✅ · package.json 참조 0 · workflow 참조 0 · `src/**` import 0 · 현행 문서 지시 0 · SQL 사본(`REPLACE(roles` / `SPLIT_PART(roles`) 0 · fallback cleanup 경로 0 · API endpoint 0 (`vendor_manager` in `apps/api-server/src` 0) · deploy migration job 포함 0 (이미지에 미포함) · **rename 아님(파일 완전 삭제)** |
| `node scripts/db/check-migration-contract.mjs` | **21 pass / 0 fail** (C24 migrate.ts 접속정보 비출력 포함) |
| `node --test scripts/db/__tests__/migration-identity.test.mjs scripts/db/__tests__/setup-local-db-credential-log.test.mjs` | **35/35 PASS** |
| api-server `tsc --noEmit` | PASS (0 errors; `scripts/` 는 tsconfig include 밖) — 신규 worktree 의 `build:deps` 누락 7패키지는 알려진 기존 결함(별도 빌드 후 통과) |
| api-server Jest (RBAC legacy-schema 관련 3 spec) | **3 suites · 31/31 PASS** |
| api-server eslint (`--fix` 없이) | 46 errors / 469 warnings — **전부 기존 `src/__tests__/*.spec.ts` 의 사전 존재 항목**, 본 변경(`scripts/` 삭제)과 무관 · CI lint 게이트는 admin-dashboard 만 실행 |
| 스크립트 실행 테스트 | 격리 scratchpad canary 실행 (§9) · fixture/운영 DB 접속 0회 |

## 13. CI · CodeQL · Deploy (§15)

대상 커밋 `76827baf7` (본 WO 구현 커밋 자체 · 조상 SHA 대체 없음 · cancelled 없음).

| 항목 | 값 |
|---|---|
| CI_PIPELINE | **SUCCESS** — run `34934728115` |
| CODEQL | **SUCCESS** — run `34934728207` |
| DEPLOY_API | **SUCCESS** — run `34934728103` (`apps/api-server/**` 경로 트리거 · 스크립트는 이미지 미포함이므로 런타임 내용 변화 없음) |

## 14. 중지 조건 (§13) 점검

| # | 조건 | 발동 |
|---|---|---|
| 1 | 운영 자동화에서 사용 | ✗ (§3) |
| 2 | 현행 의미 있는 데이터 삭제 | ✗ (대상 컬럼 부재) |
| 3 | wildcard/CASCADE/무제한 DELETE | ✗ (UPDATE 만 · 무제한 UPDATE 1건은 현 스키마에서 실행 불가) |
| 4 | 최근 운영 실행 흔적 | ✗ |
| 5 | canonical 대체 없음 + 복구 손실 | ✗ (migration job 이 canonical) |
| 6 | 실제 DB write 필요 | ✗ (read-only 로 충분) |
| 7 | 실제 자격정보 노출 | ✗ |
| 8 | redaction 불충분 | ✗ (삭제) |
| 9 | 다른 세션이 같은 파일 편집 | ✗ (기존 worktree 는 0 commits ahead · 파일 dirty 없음) |
| 10 | 메인 diverged 해소 필요 | ✗ (별도 worktree) |
| 11 | 운영 migration/schema/data 변경 필요 | ✗ |
| 12 | 관련 CI/CodeQL 실패 | ✗ (§13 전부 SUCCESS) |

## 15. 최종 판정 · 완료 키 (§16)

```
LEGACY_DB_MAINTENANCE_SCRIPT = REMOVED_WITH_EVIDENCE
ACTIVE_SCRIPT_CONSUMER = ZERO
ACTIVE_PACKAGE_SCRIPT_REFERENCE = ZERO
ACTIVE_WORKFLOW_REFERENCE = ZERO
ACTIVE_RUNBOOK_REFERENCE = ZERO
REPLACEMENT_CLEANUP_PATH = ZERO
DATABASE_CONNECTION_LOG_EXPOSURE = ZERO
PRODUCTION_DATABASE_WRITE = ZERO
PRODUCTION_SCHEMA_CHANGE = ZERO
PRODUCTION_DATA_CHANGE = ZERO
PRODUCTION_MIGRATION_HISTORY_CHANGE = ZERO
API_RUNTIME_CHANGE = ZERO
OTHER_SERVICE_REGRESSION = PASS
CI_PIPELINE = SUCCESS (34934728115)
CODEQL = SUCCESS (34934728207)
DEPLOY_API = SUCCESS (34934728103)
LEGACY_DATABASE_MAINTENANCE_SCRIPT_CONNECTION_LOG_MINIMIZATION = CLOSED
```

## 16. 문서 정합

- 문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건
- 별도 WO 제안: `apps/api-server/scripts/` 잔여 dead 스크립트 은퇴 — `cleanup-vendor-manager.sql` · `cleanup-vendor-manager-role.ts` · `cleanup-affiliate-role.ts` · `cleanup-moderator-role.ts` (모두 drop 된 `users.role`/`users.roles` 대상 · 전체 error 객체 출력 · email 출력) + `scripts/fix-view-text.sh` 의 DB 이름 literal 기본값. 기존 census IR 묶음 F (`WO-O4O-DEAD-SCRIPT-AND-PM2-CONFIG-RETIREMENT-V1` 후보) 에 합류 가능.
- historical 기록(`CHECK-O4O-MIGRATION-HISTORICAL-…-FINAL-CLOSURE-V1.md` 의 `run-cleanup.js` 언급) 은 보존.
