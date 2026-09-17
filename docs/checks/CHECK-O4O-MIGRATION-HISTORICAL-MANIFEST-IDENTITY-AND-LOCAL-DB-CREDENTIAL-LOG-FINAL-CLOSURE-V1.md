# CHECK — WO-O4O-MIGRATION-HISTORICAL-MANIFEST-IDENTITY-AND-LOCAL-DB-CREDENTIAL-LOG-FINAL-CLOSURE-V1

**작성일**: 2026-09-15
**구현 커밋**: `6de03e290` (`main`)
**판정**: **CLOSED** (§17)

> 자격정보(비밀번호 · DB URL · 토큰) 는 이 문서에 기록하지 않는다. canary 값 · 로컬 개발 기본 비밀번호 값도 기록하지 않는다.

---

## 1. 기준 SHA · 경계

| 항목 | 값 |
|---|---|
| 작업 시작 기준 | `6ea6f4494` (`origin/main` == worktree HEAD) |
| 작업 중 상류 진입 | `cc53d5099` · `37ae0168c` (web-neture / CHECK — 본 WO 파일과 겹침 0건, rebase 후 push) |
| 구현 커밋 | `6de03e290` — 12 파일 (path-specific stage · `check-staged-scope` 12/12 범위 내) |
| 작업 worktree | `C:\tmp\o4o-db-harden` (`work/db-state-classifier-hardening-v1`) |
| 범위 | A축 historical manifest identity (§3~§8) · B축 `scripts/setup-local-db.sh` 자격정보 로그 (§9~§12) |
| §2.2 무변경 대상 | historical migration 파일 · class · 선언 name · 본문 / 운영 `typeorm_migrations` / canonical snapshot / expected fingerprint / incremental manifest 순서 / 운영 schema·data·role / 로컬 DB 비밀번호 값 / 다른 세션 작업 — **전부 무변경** (§9 · §10 증명) |

## 2. 다른 세션 / worktree

| 항목 | 결과 |
|---|---|
| 메인 체크아웃 미추적 | `docs/checks/CHECK-O4O-NETURE-…-SEPARATION-V1.md` · `CHECK-O4O-STORE-TABLET-…-V1.md` · `scripts/e2e/` — 접촉 없음 (Neture CHECK 는 작업 중 다른 세션이 `37ae0168c` 로 커밋) |
| 메인 체크아웃에서 본 WO 파일 dirty | 0건 (`git status -- <12 경로>` 빈 출력) |
| 상류 커밋과 파일 겹침 | 0건 (`git diff --name-only 6ea6f4494 origin/main` ∩ WO 경로 = ∅) |
| 다른 세션의 cloud-sql-proxy (PID 11964, :5442) | 그대로 사용 · 종료하지 않음 |

## 3. 3건 identity 전수표 (§5.1)

측정: 파일명 · `export class` · 소스의 class 직접 `name` 선언(AST) · TypeORM runtime name(`declaredName ?? className`) · 운영 `typeorm_migrations.name` · manifest `name`(BEFORE `6ea6f4494`).

| # | file | className | declaredName (소스) | runtimeName | 운영 history name (id) | manifest name BEFORE | manifest name AFTER | 판정 |
|---|---|---|---|---|---|---|---|---|
| 1 | — | — | (없음) | — | — | `pharmacy` | — | **MANIFEST_PARSE_ERROR** |
| 2 | `20260331500000-UnifyCosmeticsRolesCatalog.ts` | `UnifyCosmeticsRolesCatalog1711886000000` | (없음) | `UnifyCosmeticsRolesCatalog1711886000000` | `UnifyCosmeticsRolesCatalog1711886000000` (312) | `seller` | `UnifyCosmeticsRolesCatalog1711886000000` | **MANIFEST_PARSE_ERROR** |
| 3 | `20260900000000-BackfillStoreOwnerRoles.ts` | `BackfillStoreOwnerRoles20260900000000` | (없음) | `BackfillStoreOwnerRoles20260900000000` | `BackfillStoreOwnerRoles20260900000000` (422) | `seller` | `BackfillStoreOwnerRoles20260900000000` | **MANIFEST_PARSE_ERROR** |

- 세 파일 모두 class 직접 `name` 속성이 없다. 정규식 parser 가 잡은 문자열은 각각 `UPDATE roles SET name = 'pharmacy' …`(L25) · `UPDATE roles SET name = 'seller' …`(L23) · `DELETE FROM roles WHERE name = 'seller' …`(L93) 의 **SQL 텍스트**다.
- 운영 history 에 `pharmacy` / `seller` / `^[a-z]+$` 형태의 row: **0건**. 세 className 은 각각 정확히 1 row.
- 따라서 DECLARED_NAME_DIFFERS / DUPLICATE_RUNTIME_NAME / PROD_HISTORY_MISMATCH 해당 없음. manifest 만 틀렸다.

### 3.1 잠재 4번째 사례

AST parser 도입 후 `AlignGeminiEngineRegistry` 계열 파일의 `ON CONFLICT … DO UPDATE SET name = EXCLUDED.name` 이 정규식 parser 에서는 따옴표 요구 때문에 우연히 오탐을 면했음을 확인했다. AST parser 는 이를 구조적으로 무시한다(fixture 테스트 포함). manifest 변경 없음.

## 4. Git 이력 (§5.2)

| 파일 | 이력 |
|---|---|
| `20260331500000-UnifyCosmeticsRolesCatalog.ts` | `4175592fb` (2026-03-31) 생성 이후 변경 없음 |
| `20260900000000-BackfillStoreOwnerRoles.ts` | `3e8276e94` (2026-04-26) 생성 → `6b9d497a9` (2026-04-26) UQ_roles_name 충돌 수정 → 이후 변경 없음 |
| `historical-migrations.manifest.json` | `3b3c0f5e6` (WO①, 2026-09-15) 생성 → `6de03e290` (본 WO) 정정 |

class 명 · name 이 바뀐 이력 없음. 오류는 파일이 아니라 WO① 의 정규식 parser 에서 발생했다.

## 5. 운영 history read-only 대조 (§5.1)

`psql -w -h 127.0.0.1 -p 5442 -U o4o_api_v2 -d o4o_platform` (다른 세션의 프록시 · SELECT 만 · 사용자 데이터 조회 없음).

| 측정 | 값 |
|---|---|
| `count(*) / count(DISTINCT name) / max(id)` | **678 / 675 / 679** (WO① · WO② 와 동일 · 무변경) |
| 3건 className row | 311 · 312 · 422 각 1 row |
| `name IN ('pharmacy','seller') OR name ~ '^[a-z]+$'` | **0** |
| 운영 name ∉ (644 runtime ∪ retired 30 ∪ 중복 3 ∪ incremental prefix 1) | **0** (unknown history 0) |
| 644 runtime name 중 운영에 없는 것 | **0** |
| declaredName ≠ className 인 11 entry 의 className 만으로 기록된 운영 row | **0** (allow-list 를 runtime name 만으로 좁혀도 운영 전량 포함) |

## 6. parser 오류 원인 (§6.1)

BEFORE(`3b3c0f5e6`): `/\bname\s*(?::\s*string)?\s*=\s*['"]([A-Za-z0-9_]+)['"]/` 를 **파일 전체 텍스트**에 적용 → class 속성 · 지역변수 · 객체 리터럴 · SQL 문자열을 구분하지 못한다. 세 파일에서 SQL `SET name = '…'` 이 첫 매치였다. 같은 정규식 사본이 WO① jest spec 에도 있었다(§6.3 단일 parser 위반).

## 7. parser BEFORE / AFTER (§6.2 · §6.3)

| | BEFORE | AFTER (`scripts/db/migration-identity.mjs`) |
|---|---|---|
| 방식 | 정규식 · 텍스트 전체 | TypeScript AST (`typescript` 5.4.5 · `ts.createSourceFile`) |
| migration class | `export class (\w+)` 첫 매치 | export 된 ClassDeclaration; 2개 이상이면 `implements MigrationInterface` 로 선별, 그래도 애매하면 `AMBIGUOUS_MIGRATION_CLASS` 실패 |
| `name` 인정 범위 | 파일 어디든 `name = '…'` | class **직접** 멤버 `name`(non-static) 의 정적 문자열 리터럴 (`'…'` · `"…"` · 치환 없는 template · 괄호/as 래핑) 또는 constructor 의 `this.name = '리터럴'` |
| 무시 | — | SQL 텍스트 · 지역변수 · 객체 리터럴/컬럼 옵션 · 비-export helper class · static 멤버 |
| 동적 name | 무시하고 className | **실패** `DYNAMIC_NAME` (identifier · 호출 · 치환 template · getter · 값 없는 선언) |
| 기타 실패 | — | `DUPLICATE_NAME_PROPERTY` · `NO_MIGRATION_CLASS` · `INVALID_NAME`(`^[A-Za-z0-9_]+$` 위반) |
| 출력 | `name` | `{ file, className, declaredName: string\|null, runtimeName }` |
| 소비처 | guard 내부 정규식 + jest spec 사본 | guard (`parseMigrationFile` · C02 · C06 · C25) · `--write-historical` · node 테스트 · WO① jest spec 은 guard verify-only 를 spawn 하여 위임 — **parser 1개** |
| 런타임 | `historical-migration-names.ts` (name ∪ class, 657) | 동일 파일 · runtime name 만 644 · CI 가 C21 lockstep 으로 검증 |

`--write-historical`: 기본 **verify-only**(정정 필요 시 `would correct <file> / field: old -> new` 출력 후 exit 1) · `--maintenance` 만 기록 · `process.env.CI` 에서는 `refused: --maintenance never runs in CI` · entry 추가/삭제/흡수 감지 시 거부 · diff 는 name/className 만(자격정보 무관).

## 8. manifest 정정 내역 (§7)

| file | className | declaredName(소스) | runtimeName | 운영 history | manifestName BEFORE → AFTER |
|---|---|---|---|---|---|
| `20260331500000-UnifyCosmeticsRolesCatalog.ts` | 무변경 | null (무변경) | 무변경 | 무변경 | `seller` → `UnifyCosmeticsRolesCatalog1711886000000` |
| `20260900000000-BackfillStoreOwnerRoles.ts` | 무변경 | null (무변경) | 무변경 | 무변경 | `seller` → `BackfillStoreOwnerRoles20260900000000` |

- 그 외 641 entry 의 `name` 무변경. 644 entry 전부에 `declaredName` 필드 추가(434 non-null · 그중 className 과 다른 것 11 — 2026-03 `CreateStore*`/`CreateProduct*` 계열, 운영 history 는 declaredName 으로 기록됨 · 무변경).
- `count` 644 무변경 · 추가/삭제 0 · `$comment` 만 생성 명령을 반영.
- `HISTORICAL_MIGRATION_NAMES`: 657 → **644** (제거 13 = 오류 2 `pharmacy`/`seller` + 11 className 중복). 운영 커버리지 §5.

## 9. historical 무변경 증명

`git diff --stat 6ea6f4494 6de03e290 -- apps/api-server/src/database/migrations apps/api-server/src/database/bootstrap incremental/manifest.ts incremental/expected-schema-states.ts incremental/legacy-history.facts.ts` → **빈 출력**. 645 migration 파일 · canonical snapshot · expected fingerprint · incremental manifest · legacy facts 전부 바이트 무변경.

## 10. 운영 history 무변경 증명

- 본 WO 는 운영 DB 에 SELECT 만 실행(§5). INSERT/UPDATE/DELETE/DDL 0건.
- 678 / 675 / 679 는 WO①(2026-09-15) · WO②(2026-09-15) 측정과 동일.
- 배포 job 결과는 §15.

## 11. local DB 로그 BEFORE / AFTER (§10)

| 노출 지점 | BEFORE (`6ea6f4494`) | AFTER (`6de03e290`) |
|---|---|---|
| stdout 완료 요약 | L135 `echo "  비밀번호: $DB_PASSWORD"` — **평문 출력** | `비밀번호: (출력하지 않음 — <env 파일> 의 DB_PASSWORD)` · `Database password: SET` |
| 프로세스 인자 | L50 `psql -c "CREATE USER … WITH PASSWORD '$DB_PASSWORD'"` — `ps`/감사 로그에 노출 | heredoc **stdin** `\set db_pw` + `:'db_pw'` (argv 에 비밀번호 0) |
| stderr | psql 실패 시 문장(비밀번호 포함) 그대로 되풀이 | psql stdout/stderr 폐기 · `Database user/database setup: FAILED (statement not echoed)` |
| 접속 테스트 | `PGPASSWORD=$DB_PASSWORD psql …` 인자 노출 없음(env) 이나 미인용 | `PGPASSWORD="$DB_PASSWORD" psql -w …` 프로세스 한정 env · 출력 폐기 · `Local database connection: SUCCESS\|FAILED` |
| `.env` | 기본 umask · 경로 `/home/sohae21/…` 하드코딩 | `umask 077` + `chmod 600` · `O4O_API_ENV_FILE` / `REPO_ROOT` 파생 |
| 비밀번호 값 | 하드코딩 | `LOCAL_DB_PASSWORD` env 재정의 · 기본값 **유지**(값 무변경 · 출력 안 함) · MISSING / INVALID(따옴표·백슬래시) 검사 |
| `set -x` / `DATABASE_URL` / `cat .env` | 없음 | 없음 + `set +x` 명시 · 정적 테스트로 고정 |

기능 유지: DROP/CREATE USER·DATABASE·GRANT · `.env` 생성 · 접속 테스트 · 완료 안내 — canary 테스트가 psql stdin/argv 로 문장 도달을 확인.

## 12. canary 테스트 (§11)

`scripts/db/__tests__/setup-local-db-credential-log.test.mjs` (node --test · CI 편입). PATH shim(`sudo`/`psql`/`systemctl`) 이 argv · stdin 을 파일에 기록 · 실제 PostgreSQL/root 불필요 · bash 없으면 명시 SKIP.

| 케이스 | 검사 | 결과 |
|---|---|---|
| 정적 | `set -x` 없음 · `echo/printf` 에 `$DB_PASSWORD/$LOCAL_DB_PASSWORD/$PGPASSWORD` 없음 · `DATABASE_URL` 없음 · `cat $ENV_FILE` 없음 · `psql -c … PASSWORD` 없음 · 접속 테스트는 프로세스 env | PASS |
| `bash -n` | 문법 | PASS |
| 성공 경로 | stdout · stderr · argv 로그 · 생성 파일(.env 제외) canary **0** · 기본 비밀번호 0 · URL 0 · `.env` 에 정확히 1회 · `SET`/`SUCCESS`/`COMPLETE` 출력 · CREATE USER 는 stdin 으로만 | PASS |
| 실패 경로 ① CREATE USER 오류(shim 이 문장을 stderr 로 되풀이) | canary 0 · `setup: FAILED` · `.env` 미생성 | PASS |
| 실패 경로 ② 접속 오류(libpq 형식 · `PGPASSWORD=` 언급) | canary 0 · `connection: FAILED` | PASS |
| 자기검증 mutant ×3 (stdout echo / psql argv / stderr 미억제) | 하네스가 각각 **검출**(`canary in …`) | PASS |
| MISSING/INVALID | 값 없이 `Database password: INVALID` | PASS |

**9 pass / 0 fail / 0 skipped** (Windows Git Bash). BEFORE 스크립트를 같은 하네스에 넣으면 정적 검사 `password variable echoed` 실패 + 하드코딩 경로 때문에 실행 자체 실패 → 1 pass / 5 fail. `.env` 0600 모드 검사는 POSIX 에서만 assert(Windows 는 mode 미보존) — CI ubuntu 에서 실검사.

## 13. 저장소 전역 동종 패턴 분류 (§12)

범위: `scripts/db/**` · `scripts/setup-local-db.sh` · `apps/api-server/scripts/**` · `.github/workflows/**` · `docker-compose*.yml`(파일 없음). 패턴: `password|DATABASE_URL|PGPASSWORD|set -x|DB_PASS`.

| 위치 | 내용 | 분류 |
|---|---|---|
| `scripts/setup-local-db.sh` L50 · L135 (BEFORE) | 비밀번호 argv · stdout | **FIX_IN_SCOPE** → 수정 |
| `scripts/db/check-migration-contract.mjs` L239 · L419 · L423, `build-canonical-schema-baseline.mjs` L43 | `PASSWORD '` 금지 패턴 검사 · `DB_PASSWORD/DATABASE_URL` 로그 금지 검사 | SAFE_SET_OR_MISSING_LOG (검사 코드) |
| `.github/workflows/deploy-api.yml` L308 · L320 · L374 | `--set-secrets="DB_PASSWORD=o4o-db-password:latest"` (Secret Manager 참조 · 값 없음) | SAFE_PLACEHOLDER |
| `.github/workflows/e2e-auth-runtime.yml` L89~L114 | `${{ secrets.E2E_*_PASSWORD }}` 존재 검사(`-z`) · env 주입 · 미설정 시 secret **이름** 만 echo | SAFE_SET_OR_MISSING_LOG |
| `apps/api-server/scripts/run-cleanup.js` L10 · L15 | `password: process.env.DB_PASSWORD` (env) · `console.log(DB_NAME@DB_HOST)` (host/name 출력, 비밀번호 아님) | OUT_OF_SCOPE_ACTIVE_RISK(낮음 · 로컬 1회성 스크립트 · host 표시) — 별도 WO 후보 |
| `apps/api-server/scripts/*.sql` · `cleanup-*.ts` | 자격정보 패턴 없음 | — |
| `scripts/db/__tests__/setup-local-db-credential-log.test.mjs` | canary 상수(가짜) | TEST_FIXTURE |
| `docs/**` 의 BEFORE 스크립트 인용 | 없음 | HISTORICAL_DOCUMENT 해당 없음 |

## 14. 검증 결과 (§13)

| 항목 | 명령 | 결과 |
|---|---|---|
| 의존성 | `pnpm install --frozen-lockfile` | Done (lockfile 무변경) |
| 패키지 빌드 | `pnpm run build:packages` | exit 0 |
| api-server 타입 | `pnpm run type-check` | exit 0 |
| migration contract guard | `node scripts/db/check-migration-contract.mjs` | **21 pass / 0 fail** (C25 신규) |
| verify-only | `--write-historical` | `historical entries 644 · identity corrections 0 · … in lockstep` exit 0 |
| CI 거부 | `CI=true … --write-historical --maintenance` | `refused: --maintenance never runs in CI` |
| parser 테스트 | `node --test scripts/db/__tests__/migration-identity.test.mjs` | **26 pass / 0 fail** (SQL 오탐 3형 · 지역변수 · 객체 리터럴 · helper class · static / 인정 8형 / className fallback / 다중 export / DYNAMIC·DUPLICATE·NO_CLASS·AMBIGUOUS·INVALID / 실저장소 645 전수 · manifest==parser · names TS lockstep · historical∩incremental=∅) |
| canary 테스트 | `node --test scripts/db/__tests__/setup-local-db-credential-log.test.mjs` | **9 pass / 0 fail** |
| shell 문법 | `bash -n scripts/setup-local-db.sh` | SYNTAX_OK |
| 분류기 jest (격리 PG 없이) | `jest database-state-classifier-…hardening.spec.ts` | 25 passed / 4 skipped |
| 분류기 jest (격리 PG · docker `postgres:15.17` 1회용 :15499) | 같은 spec + `O4O_ISOLATED_PG_URL` | **29 passed / 29** (16 DB 상태 · 644 runtime name 으로 운영 history 재현 시 LEGACY_ESTABLISHED 판정 유지) |
| migration jest | `canonical-database-bootstrap-…separation.spec.ts` + `database-migration-ownership-…closure.spec.ts` | **45 passed / 45** (WO① spec 의 정규식 사본 → guard 위임으로 수정; 수정 전에는 본 정정으로 정확히 3건 drift 실패 → 사본이 같은 오류를 갖고 있었음을 확인) |
| lint | `eslint` 변경 mjs/ts 7 파일 | exit 0 |
| 미실행 | 실 Ubuntu 에서 `setup-local-db.sh` 실행 (apt/sudo 필요 · Windows) — shim 테스트가 CI ubuntu 에서 실행됨 · `.env` 0600 은 CI 에서 실검사 | 사유 기재 |

## 15. CI · CodeQL · 배포 (§14)

| run | 결과 |
|---|---|
| CI Pipeline `34930542339` | **success** — Code Quality Check(guard 21/0 · parser test 26/26 · canary test 9/9) · API Server Jest(59 pass) · Build |
| CodeQL `34930542417` | **success** |
| Deploy API Server `34930542352` | **success** — migration job execution `o4o-api-migrations-lj5jd` (04:59 UTC): `DATABASE_STATE = LEGACY_ESTABLISHED` · `CURRENT_INCREMENTAL_PREFIX = 1 / 1` · `EXPECTED_FINGERPRINT == LIVE_FINGERPRINT` (`bbef9560…` 5895 lines) · `UNKNOWN_HISTORY_NAMES = 0` · `PRE_MIGRATION_SCHEMA_ASSERTION = PASS` · `BOOTSTRAP_EXECUTION = SKIPPED` · `HISTORICAL_REPLAY = ZERO` · **`INCREMENTAL_PENDING = 0` · `INCREMENTAL_EXECUTED = 0`** · `POST_MIGRATION_SCHEMA_ASSERTION = PASS` · exit 0 · 로그에 host/db/user/password 0건 |
| 배포 후 운영 read-only | 678 / 675 / 679 (job 이후 05:0x UTC 재측정) · 3건 history name 무변경 · unknown 0 · schema/data/row 변경 ZERO |

## 16. 중지 조건 (§15)

12개 조건 중 발동 **0건**. 실제 secret 출력 0 · 다른 세션 동일 파일 편집 없음 · 운영 write 없음 · manifest add/remove 없음 · 동적 name 없음 · CI/CodeQL/Deploy 전부 success.

## 17. 최종 판정

```
HISTORICAL_MANIFEST_IDENTITY_ROOT_CAUSE = MANIFEST_PARSE_ERROR (3/3)
IDENTITY_PARSER = TypeScript AST · scripts/db/migration-identity.mjs · single parser (guard · writer · tests)
MANIFEST_CORRECTIONS = 3 (name only) · ADDED 0 · REMOVED 0 · ABSORBED 0 · declaredName field added 644
HISTORICAL_FILES_CHANGED = 0
PROD_TYPEORM_MIGRATIONS = 678 / 675 / 679 unchanged · UNKNOWN_HISTORY 0 · WRITES 0
HISTORICAL_MIGRATION_NAMES = 644 (runtime names only, production fully covered)
GUARD = 21 pass / 0 fail (C25) · --write-historical verify-only · --maintenance refused in CI
LOCAL_DB_SCRIPT_CREDENTIAL_EXPOSURE = stdout 0 · stderr 0 · argv 0 · URL 0 · files: .env(0600) only
CANARY_TEST = 9/9 (success + 2 failure paths + 3 mutants) · CI step
REPO_SCAN = FIX_IN_SCOPE 1 · SAFE_PLACEHOLDER 1 · SAFE_SET_OR_MISSING_LOG 2 · TEST_FIXTURE 1 · OUT_OF_SCOPE_ACTIVE_RISK 1(low, run-cleanup.js host log) · HISTORICAL_DOCUMENT 0
STOP_CONDITIONS_TRIGGERED = 0
MIGRATION_HISTORICAL_MANIFEST_IDENTITY_AND_LOCAL_DB_CREDENTIAL_LOG_FINAL_CLOSURE = CLOSED
```

## 18. 문서 정합

- `docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md` v2.2 — Components(Historical freeze · Historical names · Migration identity parser · Contract guard C01–C25) · Rules 12·13 · Change Log 행.
- `scripts/README.md` — 환경변수 · 비출력 한 줄.
- `.github/workflows/ci-pipeline.yml` — guard step 에 node 테스트 2개 편입 (CI 는 운영 DB 무의존 §8.3).
- 문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건 (`apps/api-server/scripts/run-cleanup.js` host/name 로그 — 낮음).
