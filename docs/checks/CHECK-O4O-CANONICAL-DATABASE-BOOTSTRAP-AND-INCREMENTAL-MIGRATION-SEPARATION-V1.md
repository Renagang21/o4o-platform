# CHECK-O4O-CANONICAL-DATABASE-BOOTSTRAP-AND-INCREMENTAL-MIGRATION-SEPARATION-V1

**WO**: WO-O4O-CANONICAL-DATABASE-BOOTSTRAP-AND-INCREMENTAL-MIGRATION-SEPARATION-V1
**일자**: 2026-09-15
**결론**: 신규(빈) DB 는 canonical schema snapshot 으로 bootstrap 하고, 기존 운영 DB 는 incremental manifest 만 적용하도록 migration 실행 체계를 분리했다. 운영 DB 는 구조·데이터·history 무변경.
**선행 IR**: [IR-O4O-MIGRATION-TIMESTAMP-ORDERING-HISTORY-GAP-AND-FRESH-DATABASE-REPLAY-CENSUS-V1](../investigations/IR-O4O-MIGRATION-TIMESTAMP-ORDERING-HISTORY-GAP-AND-FRESH-DATABASE-REPLAY-CENSUS-V1.md) (`5e08e23ef`)

---

## 1. 기준 SHA · 최종 SHA

| 항목 | 값 |
|---|---|
| 작업 worktree 기준 | `22facc22c` (origin/main 은 작업 중 `c9c4d4add` → `0872bf05b` 로 전진, rebase 후 push) |
| snapshot `sourceCommit` | `22facc22c` (저장소 migration 644 파일 기준) |
| 구현 커밋 | `3b3c0f5e6` (origin/main, 로컬 `e553950cc` 를 `b8ea214f6` 위로 rebase) |
| 최종 SHA (CHECK 갱신 커밋) | 본 커밋 (`git log -1 -- docs/checks/CHECK-O4O-CANONICAL-DATABASE-BOOTSTRAP-AND-INCREMENTAL-MIGRATION-SEPARATION-V1.md`) |

## 2. 기존 644 migration 보존

| 검사 | 결과 |
|---|---|
| `apps/api-server/src/database/migrations/*.ts` 파일 수 | 644 (변경 전후 동일) |
| 파일명 · class 명 · `name` 변경 | 0 — `historical-migrations.manifest.json` 에 (file · class · name) 644 triple 동결, contract guard C02 + jest spec 이 비교 |
| 재실행 | 0 — `migrate.ts` 는 historical 파일을 import 조차 하지 않는다 (`HISTORICAL_REPLAY = ZERO`) |
| `git status` (migrations 디렉터리) | clean (canary 파일은 검증 후 삭제, §11-C 참고) |

## 3. 환경 상태 판정표 (`database-state.ts`)

판정은 한 트랜잭션 안에서 read-only 로 수행하며 `pg_catalog` 만 읽는다.

| `DATABASE_STATE` | 판정 조건 | job 동작 |
|---|---|---|
| `FRESH_EMPTY` | canonical schema(`public`·`cosmetics`·`neture`) 에 user object 0 · `typeorm_migrations` 없음 · `o4o_schema_baselines` 없음 · 추가 user schema 없음 | bootstrap **EXECUTED** → incremental |
| `BOOTSTRAPPED` | marker 1행 존재 · marker fingerprint == 코드 `expectedFingerprint` · live fingerprint == expected (incremental 미적용 시) 또는 incremental 적용 이력 있음 · legacy anchor 없음 · core table 17 존재 | bootstrap SKIPPED → incremental |
| `LEGACY_ESTABLISHED` | `typeorm_migrations` 에 anchor 5개(`CreateUsersTable1700000000000` · `SeedPlatformServices2026020500002` · `CreateRoleAssignmentsTable1708736400000` · `ReplaceRoleAssignmentsActiveUniqueConstraint20270301000000` · `BaselineRbacAndAccountTables20270413000000`) 전부 존재 · core table 17 존재 · marker 없음 | bootstrap SKIPPED → incremental |
| `UNKNOWN_PARTIAL` | 위 어디에도 해당하지 않음 (history 없는 schema · anchor 일부 누락 · marker+anchor 공존 · fingerprint 불일치 · core table 누락 · 빈 DB 에 여분 schema 등) | **exit 1 · 복구 없음 · DDL 없음** |

## 4. bootstrap marker 설계 (`baseline-marker.ts`)

- 테이블 `public.o4o_schema_baselines` (`id` · `baseline_version` UNIQUE · `schema_fingerprint` · `fingerprint_line_count` · `last_historical_migration` · `bootstrap_tool_version` · `applied_at`).
- bootstrap 트랜잭션의 **마지막 statement** 로 생성·1행 INSERT — fingerprint 검증 실패 시 롤백되어 marker 도 남지 않는다.
- `typeorm_migrations` 에 644 historical 이름을 bulk INSERT 하지 **않는다**. bootstrap 된 DB 의 `typeorm_migrations` 는 최초 incremental migration 이 실행될 때 TypeORM 이 생성한다 (pending 0 이면 테이블이 없는 상태가 정상 — API 런타임은 이 테이블에 의존하지 않음, `startup.service.ts` 주석 1건만 언급).
- marker 는 fingerprint 검증을 대체하지 않는다: `BOOTSTRAPPED` 판정은 marker + live fingerprint 재계산을 함께 요구한다.

## 5. incremental cutoff · manifest 설계 (`incremental/manifest.ts`)

| 항목 | 값 |
|---|---|
| `baselineVersion` | `2026-09-15-id678` |
| `lastHistoricalMigration` | `BaselineRbacAndAccountTables20270413000000` (운영 `typeorm_migrations` id 678) |
| `INCREMENTAL_MIGRATIONS` | `[]` (baseline 이후 신규 migration 0건) |
| 등록 규칙 | 파일 `<epoch13>-<PascalName>.ts` · class `<PascalName><epoch13>` · `name` == class · epoch 는 기존 항목보다 큼 · import 순서 == 배열 순서 · append only |
| 로더 | `src/migrate.ts` (job) · `src/database/migration-config.ts` (CLI revert) — 두 곳 모두 manifest 만, glob 0 |
| 강제 | `scripts/db/check-migration-contract.mjs` C03–C05 · jest spec |

## 6. snapshot 객체 분류 · 규모 (`canonical-schema-baseline.ts`)

`pg_dump --schema-only --no-owner --no-privileges` (운영, read-only) → `scripts/db/build-canonical-schema-baseline.mjs` 정규화.

| 분류 | 수 |
|---|---|
| CREATE SCHEMA | 2 (`cosmetics` · `neture`; `public` 은 기본) |
| CREATE TYPE (enum) | 37 |
| CREATE TABLE | 287 |
| CREATE SEQUENCE | 9 |
| CREATE INDEX | 770 |
| ALTER TABLE (PK · FK · UNIQUE · CHECK · DEFAULT) | 535 |
| ALTER SEQUENCE OWNED BY | 9 |
| COMMENT | 21 |
| **statement 합계** | **1,670** |
| 필요 extension | `uuid-ossp` (schema `public`) — 없으면 명시 `CREATE EXTENSION` (IF NOT EXISTS 아님) |
| fingerprint | `58eb27a1c17a484b49a87cb5942da782972f1778968abceec36b42af4024bdb6` / 5,876 lines |

**fingerprint 정규화 (설계 결정)**: 운영 catalog 를 그대로 hash 하면 `947c461b…` 이고, 같은 DDL 을 재생성한 DB 와 정확히 69 lines (CONSTRAINT 66 · INDEX 3) 가 다르다. 원인은 `IN (...)` 술어의 deparse 형태 차이(`ANY ((ARRAY[...])::text[])` ↔ `ANY (ARRAY[(...)::text, ...])`) 뿐이며 의미는 동일하다. `schema-fingerprint.ts` 의 `normalizeFingerprintLine()` 이 전자를 후자로 재작성하고, 정규화 후 운영 · PG15 재생성 · PG17 재생성 세 값이 모두 `58eb27a1…` 로 일치함을 확인했다. `meta.ts` 에 raw hash 와 사유를 기록.

**KNOWN_COMPATIBILITY_DEBT** (entity 없음 · 은퇴 WO 없음 → 그대로 포함): `yaksa_*` 9 테이블.

## 7. 제외한 retired 객체

snapshot 에 등장하면 guard C13 이 실패하는 패턴 (생성 시 0건 확인): `user_roles` · `organization_units` · `organization_roles` · cms legacy (`cms_acf_*` · `cms_cpt_*` · `cms_menus` · `cms_menu_items` · `cms_menu_locations` · `cms_settings` · `cms_templates` · `cms_template_parts` · `cms_views` · `cms_pages` · `cms_fields`) · `custom_fields` · `custom_media` · `custom_post_types` · `custom_posts`. 운영에 이미 없는 객체이므로 부활 0.

## 8. 데이터 · seed 제외 증거

| 검사 (guard C12 + jest) | 결과 |
|---|---|
| `INSERT` · `COPY` · `UPDATE` · `DELETE` | 0 |
| `GRANT` · `REVOKE` · `OWNER TO` · `CREATE ROLE/USER` · `CREATE DATABASE` | 0 |
| `DROP` · `IF NOT EXISTS` | 0 |
| `typeorm_migrations` · `o4o_schema_baselines` DDL | 0 (marker 는 runner 가, history 는 TypeORM 이 만든다) |
| password · host · credential 문자열 | 0 |
| roles 41행 · permission 데이터 | 0 — bootstrap 직후 `users=0 · roles=0` (§9) |

## 9. 격리 PostgreSQL fresh 결과 (S1)

환경: 로컬 PostgreSQL 17.9 (`127.0.0.1:15999`, 세션 전용 data dir) + docker PostgreSQL 15 (fingerprint 교차 확인). 운영 DB 미사용.

```text
DATABASE_STATE = FRESH_EMPTY
extension "uuid-ossp" absent → CREATE EXTENSION "uuid-ossp" WITH SCHEMA public
bootstrap statements executed: 1670
bootstrap fingerprint verified: 58eb27a1c17a484b49a87cb5942da782972f1778968abceec36b42af4024bdb6 (5876 lines)
BOOTSTRAP_EXECUTION = EXECUTED
HISTORICAL_REPLAY = ZERO
INCREMENTAL_PENDING = 0
INCREMENTAL_EXECUTED = 0
MIGRATION_JOB = SUCCESS
```

사후: 테이블 287 + `o4o_schema_baselines` 1행 · `typeorm_migrations` 없음 · enum 37 · sequence 9 · `users`/`roles` 0행.
동일 결과를 `npx tsx src/migrate.ts` · tsc `dist/migrate.js` · **tsup 번들 `dist/migrate.js`(운영 배포와 동일 산출물)** 세 경로로 재현.

**Fresh DB API smoke**: tsup 번들 `dist/main.js` 를 bootstrap 된 DB 에 기동 → `[STARTUP] phase=db_connecting` → `✅ Database connection successful` → `Database ready — migrations are owned by the deploy migration job` → `/health` 200 · `/health/ready` 200 `{"status":"ready"}`. seed 없음(users 0 · roles 0), `typeorm_query_cache` 등 추가 테이블 생성 0, 이후 `--status` 재판정 `BOOTSTRAPPED`.
※ 운영 번들은 `tsup.config.ts` 가 `process.env.NODE_ENV` 를 빌드 시 `production` 으로 고정하여 TCP 연결에 SSL 을 강제한다(Cloud Run 소켓에서는 무관). 로컬 plain-TCP PG 로 smoke 하기 위해 `NODE_ENV=development npx tsup --out-dir <scratch>` 로 별도 빌드했다(소스 무변경). 첫 시도(운영 번들 그대로)는 이 이유로 `/health/ready` 503 이었고, 원인 확인 후 재실행한 결과가 위 값이다.

## 10. 재실행 결과 (S2)

같은 DB 에 job 재실행:

```text
DATABASE_STATE = BOOTSTRAPPED
BOOTSTRAP_EXECUTION = SKIPPED
HISTORICAL_REPLAY = ZERO
INCREMENTAL_PENDING = 0
MIGRATION_JOB = SUCCESS
```

marker 1행 유지 · fingerprint 동일 · DDL 0.

## 11. partial DB negative tests (S3) — 전부 exit 1 · `BOOTSTRAP_EXECUTION = REFUSED` · 스키마 무변경

| # | fixture | 판정 사유 (log) |
|---|---|---|
| P0 | schema 만 있고 history · marker 없음 | `user objects 333 … without typeorm_migrations or o4o_schema_baselines` |
| P1 | `users` 테이블 1개만 | `user objects 1 in schemas [public] without …` |
| P2 | bootstrap 후 marker 테이블 DROP | `user objects 333 … without …` |
| P3 | marker fingerprint 변조 | `marker schema_fingerprint != code expectedFingerprint` |
| P4 | bootstrap 후 컬럼 1개 DROP | `live fingerprint 1d56cc67… (5875 lines) != baseline 58eb27a1… (5876 lines)` |
| P5 | bootstrap 후 여분 테이블 추가 | `live fingerprint 7a452807… (5878 lines) != baseline …` |
| P6 | legacy history 뒤 2 anchor 삭제 | `legacy history anchors missing: ReplaceRoleAssignments… , BaselineRbacAndAccountTables…` |
| P7 | legacy + marker 공존 | `marker present but legacy history anchors also present` |
| P8 | legacy 에서 core table `neture.neture_products` DROP | `core tables missing: neture.neture_products` |
| P9 | 빈 DB 에 `cosmetics` schema 만 미리 존재 | `user objects 0 in schemas [public, cosmetics] without …` |

각 케이스 전후 `pg_class` 카운트 · fingerprint 동일(변경 0). tsc dist(P3) · tsup 번들(P4) 로도 동일 재현.

**11-C. incremental canary (S5)** — 임시 `1789000000000-CanaryIncrementalProbe.ts` (테이블 1개 생성) 를 manifest 에 등록:

| DB | `--status` | apply | 재실행 |
|---|---|---|---|
| bootstrapped (`cb_fresh`) | `INCREMENTAL_PENDING = 1` | `INCREMENTAL_EXECUTED = 1` · `typeorm_migrations` 생성 · 1행 | `INCREMENTAL_PENDING = 0` |
| legacy (`cb_legacy`, 677행) | `INCREMENTAL_PENDING = 1` | `INCREMENTAL_EXECUTED = 1` · 678행 | `INCREMENTAL_PENDING = 0` |

guard negative: 미등록 파일(C05/C10 FAIL) · 배열/ import 순서 불일치(C04 FAIL) · 12자리 epoch(C05 FAIL) 확인. canary 파일과 manifest 항목은 **삭제** (저장소 644 · manifest `[]` 복원, git status clean).

## 12. legacy established fixture 결과 (S4)

운영 `typeorm_migrations` 이름 677행(id 그대로) 을 격리 DB 에 적재 + canonical schema 재생성 (운영 데이터 0):

```text
DATABASE_STATE = LEGACY_ESTABLISHED
  typeorm_migrations: 677 rows · anchors 5/5
  o4o_schema_baselines: absent
BOOTSTRAP_EXECUTION = SKIPPED
HISTORICAL_REPLAY = ZERO
INCREMENTAL_PENDING = 0
MIGRATION_JOB = SUCCESS
```

사후 history 677행 · max id 678 무변경 · marker 미생성 · DDL 0. tsc dist · tsup 번들 동일.

## 13. 운영 적용 전후 비교 (read-only, `o4o_api_v2`)

| 항목 | 적용 전 (2026-09-15) | 적용 후 |
|---|---|---|
| `typeorm_migrations` rows / distinct / max id | 677 / 674 / 678 | 677 / 674 / 678 (동일) |
| `o4o_schema_baselines` | 없음 | 없음 (`to_regclass` null) |
| 테이블(public+cosmetics+neture) / enum / sequence | 287 / 37 / 9 | 287 / 37 / 9 (동일 · `typeorm_migrations` 와 그 sequence 제외 기준) |
| schema fingerprint (normalized) | `58eb27a1…` 5,876 | `58eb27a1…` 5,876 — job 로그 `live fingerprint` 가 baseline `2026-09-15-id678` 과 일치 |
| roles / permissions / role_assignments 행 수 | 무변경 대상 | 41 / 0 / 73 (읽기 전용 확인 · 이 WO 는 행을 쓰지 않음) |

기대 job 로그: `DATABASE_STATE = LEGACY_ESTABLISHED / BOOTSTRAP_EXECUTION = SKIPPED / HISTORICAL_REPLAY = ZERO / INCREMENTAL_PENDING = 0 / MIGRATION_JOB = SUCCESS`.

실제 job 로그 (`o4o-api-migrations-zw9xf`, 2026-09-15T01:13:39Z, `gcloud logging read` 로 확인):

```text
Incremental manifest: 0 migration(s) after cutoff BaselineRbacAndAccountTables20270413000000
DATABASE_STATE = LEGACY_ESTABLISHED
  reason: typeorm_migrations 677 rows, all 5 anchors present, core tables present, no marker
  schemas: [public, cosmetics, neture] · user objects: 335
  o4o_schema_baselines: absent
  live fingerprint: 58eb27a1c17a484b49a87cb5942da782972f1778968abceec36b42af4024bdb6 (5876 lines)
  baseline 2026-09-15-id678 fingerprint: 58eb27a1c17a484b49a87cb5942da782972f1778968abceec36b42af4024bdb6
BOOTSTRAP_EXECUTION = SKIPPED
HISTORICAL_REPLAY = ZERO
INCREMENTAL_PENDING = 0
INCREMENTAL_EXECUTED = 0
MIGRATION_JOB = SUCCESS
Container called exit(0).
```

배포 후 `GET https://api.neture.co.kr/health/ready` → 200.

## 14. CI · 배포 run ID

커밋 `3b3c0f5e6` 기준.

| 워크플로 | run ID | 결과 |
|---|---|---|
| CI Pipeline | `34915889560` | success (Code Quality Check · API Server Jest · Build Applications 모두 success — contract guard step 포함) |
| CodeQL | `34915889532` | success |
| Deploy API (migration job 포함) | `34915889538` | success — migration job execution `o4o-api-migrations-zw9xf` SUCCESS (§13 로그) |

## 15. 실패 · 취소 · 미수행 항목

| 항목 | 상태 |
|---|---|
| tsc 산출물 `dist/main.js` 로 API 기동 | **불가(범위 밖 기존 결함)** — `packages/forum-core/src/public-ui/components/index.ts` 의 `export … from './ForumBlockRenderer'` (확장자 없는 ESM import) 로 `ERR_MODULE_NOT_FOUND`. 운영은 tsup 번들을 쓰므로 영향 없음. API smoke 는 tsup 번들로 수행 |
| `npx tsx src/main.ts` 로 API 기동 | 불가 — tsx 는 `emitDecoratorMetadata` 미지원 → `ColumnTypeUndefinedError` (기존 상태, WO 무관) |
| eslint 경고 2건 (`connection.ts` 미사용 import `SnakeNamingStrategy` · catch 변수) | HEAD 에 이미 존재 · 미수정 |
| 운영 migration job 실행 | 배포 파이프라인이 수행 (§14) — 수동 실행 0 |
| 전체 jest | 관련 spec 5개(75 tests) 실행 · 전체 suite 는 미실행 |

## 16. 중지 조건

발동 0. 운영 DB 는 read-only 조회만(pg_dump schema-only · catalog 카운트 · history 이름 목록) 수행. 격리 DB 부재 시 운영 대체 사용 없음(로컬 PG 17 + docker PG 15 확보).

## 17. 후속 WO 경계

이번 WO 에서 선행 구현하지 않은 것: `CANONICAL_REFERENCE_SEED` · `ROLES_CANONICAL_12_COLUMN_ALIGNMENT` · `ROLES_LEGACY_6_COLUMN_REMOVAL` · `CANONICAL_ROLE_CATALOG_SEED` · `PERMISSION_LINKEDACCOUNT_ACTIVITY_DRIFT` (전부 OUT_OF_SCOPE). 후속 순서는 WO §22.

범위 밖 발견 (보고만):
1. `packages/forum-core` ESM import 확장자 누락 (§15) — tsc 산출물로는 API 기동 불가.
2. `PRODUCTION-MIGRATION-STANDARD.md` Method 2 「Admin API 로 migration 실행」 — 해당 endpoint 는 소스에 없고 CLAUDE.md §8 (HTTP repair route 금지) 과 충돌. §16 범위 밖이라 본문 유지, 별도 WO 제안.
3. `SETUP.md:164` 는 `migration:run` 을 가리키며(이제 `src/migrate.ts` 로 연결되어 빈 DB 는 bootstrap 됨 — 설명 갱신 필요) · `scripts/dev-start.sh:64-68` 은 `typeorm-ts-node-commonjs -d src/database/data-source.ts migration:show/run` 을 직접 호출하여 manifest 를 우회(data-source.ts 는 CI/배포 경로가 아님) — 둘 다 보고만, 별도 WO.
4. `tsup.config.ts` 의 `NODE_ENV` 빌드 시 고정 — 운영 영향 없음, 로컬 smoke 시 유의.

## 18. 문서 정합

- `docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md` v2.0: `migrations`→`typeorm_migrations` · 명명 계약(13자리 epoch · class==name · manifest 등록) · bootstrap/legacy 분리 절 · fail-fast · rename/history 수정 금지 · CLI 스크립트 경로 · Change Log(근거 · 적용 시점). WO §16 이 명시한 범위만 수정.
- `docs/CANONICAL-INDEX.md` 변경 없음 (보고만: PRODUCTION-MIGRATION-STANDARD 행의 버전 표기가 있다면 v2.0 반영 필요 — 현재 행에는 버전 없음).
- 문서 정합: 발견 3건(§17 2·3 + 표준 문서 정정) / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 3건.

---

## 완료 조건 블록

```text
DATABASE_STATE_CLASSIFIER                    = PASS
FRESH_EMPTY_BOOTSTRAP                        = PASS
BOOTSTRAPPED_REENTRY                         = PASS
UNKNOWN_PARTIAL_FAIL_FAST                    = PASS
LEGACY_ESTABLISHED_BOOTSTRAP_EXECUTION       = ZERO

CANONICAL_SCHEMA_SNAPSHOT                    = PRESENT
SNAPSHOT_OPERATIONAL_DATA                    = ZERO
SNAPSHOT_CREDENTIAL_OR_OWNER                 = ZERO
SNAPSHOT_RETIRED_OBJECT_RESURRECTION         = ZERO
SNAPSHOT_FINGERPRINT                         = VERIFIED

HISTORICAL_MIGRATION_FILES_RENAMED           = ZERO
HISTORICAL_MIGRATION_FILES_REEXECUTED        = ZERO
PRODUCTION_MIGRATION_HISTORY_REWRITE         = ZERO
FAKE_HISTORICAL_HISTORY_INSERT               = ZERO

INCREMENTAL_MIGRATION_OWNER                  = DEPLOY_MIGRATION_JOB_ONLY
INCREMENTAL_ORDER                            = EXPLICIT_AND_DETERMINISTIC
NEW_MIGRATION_NAMING                         = 13_DIGIT_EPOCH
UNREGISTERED_INCREMENTAL_MIGRATION           = ZERO
DUPLICATE_INCREMENTAL_TIMESTAMP_OR_NAME      = ZERO

API_STARTUP_SCHEMA_WRITE                     = ZERO
CORE_LIFECYCLE_SCHEMA_WRITE                  = ZERO
SYNCHRONIZE_TRUE                             = ZERO
DEPLOY_MIGRATION_FAILURE_GATE                = ENFORCED

PRODUCTION_BOOTSTRAP_EXECUTION               = ZERO
PRODUCTION_SCHEMA_CHANGE                     = ZERO
PRODUCTION_DATA_CHANGE                       = ZERO
PRODUCTION_ROLE_CHANGE                       = ZERO
PRODUCTION_PERMISSION_CHANGE                 = ZERO
PRODUCTION_AUTHORIZATION_CHANGE              = ZERO

ISOLATED_FRESH_DATABASE                      = PASS
ISOLATED_PARTIAL_DATABASE_NEGATIVE_TESTS     = PASS
ISOLATED_INCREMENTAL_CANARY                  = PASS
PRODUCTION_MIGRATION_JOB                     = SUCCESS (LEGACY_ESTABLISHED · SKIPPED · ZERO · pending 0)
PRODUCTION_READINESS                         = PASS (/health/ready 200)
CI_PIPELINE                                  = PASS (34915889560)
CODEQL                                       = PASS (34915889532)
DEPLOY_API                                   = SUCCESS (34915889538)

CANONICAL_DATABASE_BOOTSTRAP_AND_INCREMENTAL_MIGRATION_SEPARATION = CLOSED
```

```text
CANONICAL_REFERENCE_SEED                     = OUT_OF_SCOPE
ROLES_CANONICAL_12_COLUMN_ALIGNMENT          = OUT_OF_SCOPE
ROLES_LEGACY_6_COLUMN_REMOVAL                = OUT_OF_SCOPE
CANONICAL_ROLE_CATALOG_SEED                  = OUT_OF_SCOPE
PERMISSION_LINKEDACCOUNT_ACTIVITY_DRIFT      = OUT_OF_SCOPE
```
