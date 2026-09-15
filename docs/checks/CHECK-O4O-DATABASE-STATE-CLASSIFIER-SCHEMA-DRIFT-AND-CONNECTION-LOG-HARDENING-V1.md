# CHECK — WO-O4O-DATABASE-STATE-CLASSIFIER-SCHEMA-DRIFT-AND-CONNECTION-LOG-HARDENING-V1

- WO: `WO-O4O-DATABASE-STATE-CLASSIFIER-SCHEMA-DRIFT-AND-CONNECTION-LOG-HARDENING-V1`
- 선행 WO: `WO-O4O-CANONICAL-DATABASE-BOOTSTRAP-AND-INCREMENTAL-MIGRATION-SEPARATION-V1` (impl `3b3c0f5e6` · CHECK `c9bd48ff5` · 판정 `IMPLEMENTATION_COMPLETE / HARDENING_REQUIRED`)
- 작성일: 2026-09-15
- 기준 문서: [`PRODUCTION-MIGRATION-STANDARD`](../baseline/operations/PRODUCTION-MIGRATION-STANDARD.md) (v2.1 로 갱신)
- 최종 판정: **§13 참조**

---

## 1. 기준 SHA · 경계

| 항목 | 값 |
|---|---|
| 작업 worktree | `C:\tmp\o4o-db-harden` · branch `work/db-state-classifier-hardening-v1` |
| 기준 SHA (branch base) | `55c76b245` (origin/main, 2026-09-15) |
| push 시점 origin/main | `6e634e9c2` — 기준 SHA 이후 4 커밋(media-pilot · web-neture · local-agent) 은 본 WO 파일과 **겹침 0** (`git diff --name-only 55c76b245 origin/main` 에 migration 경로 없음) |
| 구현 커밋 | `ee9374d12` (origin/main `6e634e9c2` 위에 cherry-pick push) · spec 후속 수정 `77d96f9dc` (describe.skip 본문에서 harness 생성 → beforeAll 지연 생성; CI 형태 25 passed / 4 skipped) |
| CHECK 커밋 | 본 문서 커밋 (impl 이후 별도 커밋; git log 참조) |
| 변경 파일 (12) | `apps/api-server/src/database/bootstrap/database-state.ts` · `apps/api-server/src/migrate.ts` · `apps/api-server/src/database/bootstrap/incremental-history.ts` (신규) · `apps/api-server/src/database/bootstrap/safe-db-error.ts` (신규) · `apps/api-server/src/database/incremental/expected-schema-states.ts` (신규) · `apps/api-server/src/database/incremental/legacy-history.facts.ts` (신규) · `apps/api-server/src/database/incremental/historical-migration-names.ts` (신규 · 생성) · `apps/api-server/src/__tests__/helpers/isolated-pg-classifier-harness.ts` (신규) · `apps/api-server/src/__tests__/database-state-classifier-schema-drift-and-connection-log-hardening.spec.ts` (신규) · `scripts/db/check-migration-contract.mjs` · `docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md` · 본 CHECK |
| 무변경 (§11 금지) | canonical snapshot(`canonical-schema-baseline.sql` · `.meta.ts`) · `historical-migrations.manifest.json` (byte 동일, `--write-historical` 재실행 diff 0) · `manifest.ts` · 모든 migration 파일 · `deploy-api.yml` · 운영 `typeorm_migrations` · 운영 schema/data · `package.json` · lockfile |
| 다른 세션 파일 | 메인 체크아웃 미추적 `docs/checks/CHECK-O4O-STORE-TABLET-…-V1.md` · `scripts/e2e/` — 접촉 없음 |

## 2. BEFORE / AFTER 판정표 (§3 · §8.2 · 격리 PostgreSQL 15.17, docker `postgres:15.17`, 실제 DB 상태를 만들어 분류기 실행)

BEFORE = `3b3c0f5e6` 분류기 · AFTER = 본 WO 분류기. 같은 harness(`isolated-pg-classifier-harness.ts`), 같은 16 DB 상태.

**BEFORE 8/16 정답 · AFTER 16/16 정답.** (BEFORE 오판 8건: S06 · S08 · S09 · S10 · S11 · S12 · S14 · S15 — 모두 "잘못된 DB 를 정상으로 오인" 방향)

| ID | scenario | expected | BEFORE | AFTER | AFTER reason |
|---|---|---|---|---|---|
| S01 | fresh empty database | `FRESH_EMPTY` | `FRESH_EMPTY PASS` | `FRESH_EMPTY PASS` | no user relations/types, no typeorm_migrations, no o4o_schema_baselines, only schema public |
| S02 | bootstrap only (marker, no incremental) | `BOOTSTRAPPED` | `BOOTSTRAPPED PASS` | `BOOTSTRAPPED PASS` | marker 2026-09-15-id678 verified; incremental prefix 0 (pending 1); live fingerprint == expected |
| S03 | bootstrap, non-core column dropped | `UNKNOWN_PARTIAL` | `UNKNOWN_PARTIAL PASS` | `UNKNOWN_PARTIAL PASS` | live fingerprint 227d7b4559a8… (5875 lines) != expected 58eb27a1c17a… (5876 lines) for incremental prefix 0 (baseline) |
| S04 | bootstrap, extra table added | `UNKNOWN_PARTIAL` | `UNKNOWN_PARTIAL PASS` | `UNKNOWN_PARTIAL PASS` | live fingerprint d75f215653fd… (5878 lines) != expected 58eb27a1c17a… (5876 lines) for incremental prefix 0 (baseline) |
| S05 | bootstrap + incremental 1 applied normally | `BOOTSTRAPPED` | `BOOTSTRAPPED PASS` | `BOOTSTRAPPED PASS` | marker 2026-09-15-id678 verified; incremental prefix 1 (pending 0); live fingerprint == expected |
| S06 | bootstrap + incremental 1, then non-core column dropped | `UNKNOWN_PARTIAL` | `BOOTSTRAPPED WRONG` | `UNKNOWN_PARTIAL PASS` | live fingerprint d97c6c4727f5… (5894 lines) != expected bbef95607b3f… (5895 lines) for incremental prefix 1 (CreateStoreTabletDevicesAndScreenSetDescription1789435443554) |
| S07 | legacy established (history 678-shaped, no marker) + incremental 1 | `LEGACY_ESTABLISHED` | `LEGACY_ESTABLISHED PASS` | `LEGACY_ESTABLISHED PASS` | typeorm_migrations 691 rows, all 5 anchors present, every name known, core tables present, no marker; incremental prefix 1 (pending 0); live fingerprint == expected |
| S08 | legacy, non-core constraint dropped | `UNKNOWN_PARTIAL` | `LEGACY_ESTABLISHED WRONG` | `UNKNOWN_PARTIAL PASS` | live fingerprint 1cf3ebbff3fa… (5894 lines) != expected bbef95607b3f… (5895 lines) for incremental prefix 1 (CreateStoreTabletDevicesAndScreenSetDescription1789435443554) |
| S09 | legacy, incremental history gap [M2] (M1 missing) | `UNKNOWN_PARTIAL` | `LEGACY_ESTABLISHED WRONG` | `UNKNOWN_PARTIAL PASS` | incremental history [HarnessSyntheticSecond1800000000002] is not a contiguous prefix of the manifest (missing CreateStoreTabletDevicesAndScreenSetDescription1789435443554 |
| S10 | legacy, incremental history skip [M1, M3] | `UNKNOWN_PARTIAL` | `LEGACY_ESTABLISHED WRONG` | `UNKNOWN_PARTIAL PASS` | incremental history [CreateStoreTabletDevicesAndScreenSetDescription1789435443554, HarnessSyntheticThird1800000000003] is not a contiguous prefix of the manifest (missing |
| S11 | legacy, incremental history reversal [M2, M1] | `UNKNOWN_PARTIAL` | `LEGACY_ESTABLISHED WRONG` | `UNKNOWN_PARTIAL PASS` | incremental history [HarnessSyntheticSecond1800000000002, CreateStoreTabletDevicesAndScreenSetDescription1789435443554] is not a contiguous prefix of the manifest |
| S12 | legacy, history name outside manifest / historical / retired facts | `UNKNOWN_PARTIAL` | `LEGACY_ESTABLISHED WRONG` | `UNKNOWN_PARTIAL PASS` | typeorm_migrations has 1 unknown name(s): HarnessUnknownName1799999999999 |
| S13 | marker AND legacy anchors coexist | `UNKNOWN_PARTIAL` | `UNKNOWN_PARTIAL PASS` | `UNKNOWN_PARTIAL PASS` | marker present but legacy history anchors also present: CreateUsersTable1700000000000, SeedPlatformServices2026020500002, CreateRoleAssignmentsTable1708736400000, Replace |
| S14 | bootstrap + incremental 1, M1 recorded twice | `UNKNOWN_PARTIAL` | `BOOTSTRAPPED WRONG` | `UNKNOWN_PARTIAL PASS` | incremental migration 'CreateStoreTabletDevicesAndScreenSetDescription1789435443554' recorded more than once |
| S15 | legacy, known duplicate recorded a third time | `UNKNOWN_PARTIAL` | `LEGACY_ESTABLISHED WRONG` | `UNKNOWN_PARTIAL PASS` | 'AddGradingFieldsToLmsSubmissions20260503100000' recorded 3 times (allowed 2) |
| S16 | legacy, anchors present but last historical migration row missing | `UNKNOWN_PARTIAL` | `UNKNOWN_PARTIAL PASS` | `UNKNOWN_PARTIAL PASS` | legacy history anchors missing: BaselineRbacAndAccountTables20270413000000; last historical migration 'BaselineRbacAndAccountTables20270413000000' not in typeorm_migratio |

harness DB 이름은 `o4o_hz_<tag>_sNN` 로 생성 후 `DROP DATABASE … WITH (FORCE)` 로 정리. `assertLocalIsolated()` 가 host 가 loopback 이 아니거나 DB 이름이 `o4o_platform` 이면 실행을 거부한다(운영 대체 사용 불가).

## 3. Expected Schema State Registry (§4 A축)

[`expected-schema-states.ts`](../../apps/api-server/src/database/incremental/expected-schema-states.ts) — `EXPECTED_SCHEMA_STATES[k]` = baseline + `INCREMENTAL_MIGRATIONS[0..k-1]`:

| k | appliedThrough | fingerprint | lines | 산출 근거 |
|---|---|---|---|---|
| 0 | `null` (baseline `2026-09-15-id678`) | `58eb27a1c17a484b49a87cb5942da782972f1778968abceec36b42af4024bdb6` (META 참조, 리터럴 복제 없음) | 5876 | 선행 WO snapshot META |
| 1 | `CreateStoreTabletDevicesAndScreenSetDescription1789435443554` | `bbef95607b3f24ae61796f4e2042b01e171e1cb7ec6a8470f6c6f3963306d816` | 5895 | 격리 PG 에서 bootstrap + M1 실행 후 계산 → 운영 read-only 교차검증(`typeorm_migrations` id 679 적용 상태) hash·line count **동일** |

- 자동 채택 없음: 불일치는 `UNKNOWN_PARTIAL` / `POST_MIGRATION_SCHEMA_ASSERTION = FAILED` 로만 보고. CI 는 레지스트리를 재생성하지 않는다.
- lockstep: guard **C22** (개수 = incremental + 1 · `[0]` 은 META 참조 · `appliedThrough[i] == manifest[i-1]` · 64-hex 리터럴 · 양의 정수 line count · fingerprint 중복 없음) + jest `expected schema state registry ↔ incremental manifest lockstep` 3건.
- 등록 절차는 `PRODUCTION-MIGRATION-STANDARD` "Step 4: Register the Expected Schema State" 에 문서화.

## 4. Incremental History Prefix 규칙 (§5)

[`incremental-history.ts`](../../apps/api-server/src/database/bootstrap/incremental-history.ts) `resolveIncrementalPrefix(historyNames, manifestNames)` — 순수 함수:

- history 에 있는 manifest 이름을 **id 순**으로 모아 `manifest[0..k-1]` 과 정확히 같을 때만 `contiguous = true, prefixLength = k, pending = manifest[k..]`.
- 거부(`prefixLength = -1`, `pending = []`, `problems ≥ 1`): gap `[M2]` · skip `[M1, M3]` · 역전 `[M3, M2]` · 완전집합 역순 `[M2, M1]` · 중복 `[M1, M1]` · 진행 후 중복 `[M1, M2, M1]`.
- jest `incremental prefix rule` 10 케이스(허용 4 · 거부 6) + 격리 PG S09 · S10 · S11 · S14 (실제 `typeorm_migrations` 행으로 재현).
- `validateLegacyHistoryNames()` — LEGACY 이름 집합 = historical(657, name ∪ className) ∪ retired facts(30) ∪ manifest prefix. 미등록 이름 1개라도 있으면 `unknown` → `UNKNOWN_PARTIAL` (S12). 알려진 중복 3개는 최대 2회(S15 3회 → 거부); 그 외 이름은 2회부터 거부.

## 5. Fingerprint 비교 방식 (§5 B축)

- 산출: 기존 [`schema-fingerprint.ts`](../../apps/api-server/src/database/bootstrap/schema-fingerprint.ts) `computeSchemaFingerprint()` (pg_catalog 전용 · 정렬된 정규화 라인 · `o4o_schema_baselines` · 그 sequence · `typeorm_migrations` 제외) — **변경 없음**(snapshot 재생성 없음).
- 비교: `sha256` **그리고** line count 둘 다 `EXPECTED_SCHEMA_STATES[prefixLength]` 와 일치해야 PASS. `fingerprintMatch: boolean | null` 을 facts 에 기록.
- 적용 범위 확대: BEFORE 는 marker 상태(BOOTSTRAPPED, prefix 0)에서만 비교 → AFTER 는 `establishedChecks()` 로 **BOOTSTRAPPED(incremental 포함) · LEGACY_ESTABLISHED 모두** 비교 (S06 · S08 이 이 확대로 잡힘). 이 외에 prefix 불연속 · core 테이블 부재 · 미등록 expected state 도 같은 공통 검사로 `UNKNOWN_PARTIAL`.
- PG 버전 차이에 따른 정규화 문제: 격리 PG 15.17 ↔ 운영 Cloud SQL PG 15 사이 hash·line count 동일 확인 → §12 중지 조건 미발동.

## 6. LEGACY_ESTABLISHED / BOOTSTRAPPED 판정 근거 (§5)

| 상태 | 필요 조건 (전부) |
|---|---|
| `FRESH_EMPTY` | 사용자 relation/type 0 · `typeorm_migrations` 없음 · `o4o_schema_baselines` 없음 · schema `public` 만 |
| `BOOTSTRAPPED` | marker 정확히 1행(version·fingerprint = 코드 META) · legacy anchor 0 · history 이름 전부 manifest 안 · prefix 연속 · core 테이블 · **fingerprint == expected[prefix]** |
| `LEGACY_ESTABLISHED` | marker 없음 · anchor 5개 전부 + 마지막 historical(`BaselineRbacAndAccountTables20270413000000`) 존재 · unknown 이름 0 · 중복 문제 0 · prefix 연속 · core 테이블 · **fingerprint == expected[prefix]** |
| `UNKNOWN_PARTIAL` | 그 외 전부 (marker + anchor 공존 S13 포함) |

[`legacy-history.facts.ts`](../../apps/api-server/src/database/incremental/legacy-history.facts.ts): 운영 read-only 로 수집한 사실 — retired 이름 30(파일 없음, 선행 WO 에서 삭제된 seed/test-account/retired-schema 마이그레이션) · 알려진 중복 3(`AddGradingFieldsToLmsSubmissions20260503100000` 등). guard **C23** 이 retired 가 historical/incremental 이 아니고 파일이 없음을, 중복이 historical 임을 고정.

[`historical-migration-names.ts`](../../apps/api-server/src/database/incremental/historical-migration-names.ts): JSON manifest 644 entries → 657 names (name ∪ className). guard **C21** 이 JSON 과 lockstep 강제(`--write-historical` 만 재생성). JSON 자체는 byte 무변경.

> **발견 (범위 밖 · 별도 WO 제안)**: JSON manifest 3 entries 의 `name` 이 `'pharmacy'` · `'seller'` · `'seller'` 로 mis-parse 되어 있음(`className` 은 정상). 운영 history 에는 className 이 기록되어 있으므로 name ∪ className 으로 흡수했고 JSON 은 §11 에 따라 수정하지 않음.

## 7. Drift 음성 테스트 (§8.2)

격리 PG 에서 실제 DDL 로 만든 drift — 전부 `UNKNOWN_PARTIAL`, `PRE_MIGRATION_SCHEMA_ASSERTION = FAILED`, 실행 0:

| 시나리오 | drift | 결과 |
|---|---|---|
| S03 | baseline 상태에서 non-core 컬럼 `store_tablet_screen_sets.updated_at` DROP | fingerprint 5875 ≠ 5876 → UNKNOWN_PARTIAL |
| S04 | baseline 상태에 extra table 추가 | 5878 ≠ 5876 → UNKNOWN_PARTIAL |
| S06 | bootstrap + M1 후 `store_tablet_devices.last_seen_at` DROP | 5894 ≠ 5895 → UNKNOWN_PARTIAL (**BEFORE 는 BOOTSTRAPPED 오판**) |
| S08 | legacy + M1 후 FK `FK_std_current_location` DROP | 5894 ≠ 5895 → UNKNOWN_PARTIAL (**BEFORE 는 LEGACY_ESTABLISHED 오판**) |
| jest `drifted database: PRE assertion FAILED …` | `migrate.ts` 서브프로세스로 실행: `CLASSIFICATION = UNKNOWN_PARTIAL` · `PRE_MIGRATION_SCHEMA_ASSERTION = FAILED` · `BOOTSTRAP_EXECUTION = REFUSED` · `INCREMENTAL_EXECUTED = 0` · `MANUAL_INVESTIGATION_REQUIRED = YES` · exit 1 | PASS |

POST 검증(§6 C축): jest `fresh database full sequence` — FRESH_EMPTY → bootstrap EXECUTED → `INCREMENTAL_EXECUTED = 1` → `POST_MIGRATION_SCHEMA_ASSERTION = PASS` → 2회차 `BOOTSTRAPPED` no-op(PENDING 0 · POST PASS). POST 는 rolled-back 트랜잭션에서 재-fingerprint(쓰기 0), FAILED 시 자동 rollback 없이 `MIGRATION_JOB = FAILED` + `MANUAL_INVESTIGATION_REQUIRED = YES`.

## 8. 로그 비노출 테스트 (§7 D축 · §8.3)

- `migrate.ts` 에서 `DB_HOST` / `DB_NAME` / `DB_PORT` / `DB_USERNAME` / `DB_PASSWORD` 값 로그 전부 제거. 허용 출력만: `Database transport: CLOUD_SQL_SOCKET | TCP` · `Database configuration: COMPLETE (environment …)` · `Database connection: SUCCESS` · `DB_X: SET | MISSING`. 오류는 [`safe-db-error.ts`](../../apps/api-server/src/database/bootstrap/safe-db-error.ts) `summarizeDatabaseError()` (env 값 · `database "…"` · `user "…"` · socket path · URL · getaddrinfo host 치환, `error.stack` 원문 출력 없음).
- guard **C24**: `${DB_X}` / `${process.env.DB_X}` 보간 금지 · console 에 connection 값 전달 금지 · `error.stack` 금지 · 필수 리터럴(transport/config/connection · PRE/POST/CURRENT_INCREMENTAL_PREFIX/EXPECTED·LIVE_FINGERPRINT · `MANUAL_INVESTIGATION_REQUIRED = YES` · `DB_WRITES = 0`).
- jest §8.3 (`migrate.ts --status with fake credentials never echoes them`): `DB_HOST=test-secret-host DB_NAME=test-secret-database DB_USERNAME=test-secret-user DB_PASSWORD=test-secret-password` 로 `node tsx src/migrate.ts --status` 서브프로세스 실행 → exit 1(접속 실패), stdout+stderr 에 4 값 · 연결 문자열 모두 **부재**, `Database transport: TCP` 존재. 변수 누락 시 `SET | MISSING` 만 출력.
- 격리 PG `--status` 테스트: 실제 DB 이름 · 사용자 · 비밀번호가 출력에 없음을 추가 확인.
- 범위 밖 발견: `scripts/setup-local-db.sh:133,143` 이 **로컬 docker 개발 DB** 비밀번호를 echo — 운영 경로 아님, 본 WO 범위 밖(보고만).

## 9. 운영 read-only 사전 · 사후 (§9 · §10)

사전(push 전, 새 분류기로 cloud-sql-proxy read-only 분류 · 쓰기 0):

| 항목 | 값 |
|---|---|
| `CLASSIFICATION` | `LEGACY_ESTABLISHED` |
| `typeorm_migrations` | 678 rows · 675 distinct · max id 679 |
| incremental applied / pending | `[CreateStoreTabletDevicesAndScreenSetDescription1789435443554]` / `[]` → `CURRENT_INCREMENTAL_PREFIX = 1 / 1`, contiguous true |
| history 이름 | manifest 밖 677 · unknown **0** · duplicate problems `[]` |
| fingerprint | expected `bbef9560…` (5895) == live `bbef9560…` (5895) → match true |

사후(deploy 후): §10 참조.

## 10. 배포 job 결과 (§10)

Deploy API Server run `34926088309` (`ee9374d12`) = **success** · Cloud Run Job `o4o-api-migrations` execution `o4o-api-migrations-cxb77` (2026-09-15T03:50:35Z) · revision `o4o-core-api-03667-7g8` 100 % 트래픽.

Job 로그 (Cloud Logging, sha256 은 앞 8자리로 축약):

```text
Step 1: Creating database connection...
Database transport: CLOUD_SQL_SOCKET
Database configuration: COMPLETE (environment production)
Database connection: SUCCESS
Incremental manifest: 1 migration(s) after cutoff BaselineRbacAndAccountTables20270413000000 · expected schema states: 2
Step 2: Classifying database state...
DATABASE_STATE = LEGACY_ESTABLISHED
CLASSIFICATION = LEGACY_ESTABLISHED
  reason: typeorm_migrations 678 rows, all 5 anchors present, every name known, core tables present, no marker; incremental prefix 1 (pending 0); live fingerprint == expected
  typeorm_migrations: 678 rows · anchors 5/5
  o4o_schema_baselines: absent
CURRENT_INCREMENTAL_PREFIX = 1 / 1
EXPECTED_SCHEMA_STATE = CreateStoreTabletDevicesAndScreenSetDescription1789435443554
EXPECTED_FINGERPRINT = bbef9560… (5895 lines)
LIVE_FINGERPRINT = bbef9560… (5895 lines)
UNKNOWN_HISTORY_NAMES = 0
PRE_MIGRATION_SCHEMA_ASSERTION = PASS
BOOTSTRAP_EXECUTION = SKIPPED
HISTORICAL_REPLAY = ZERO
INCREMENTAL_PENDING = 0
Step 4: No incremental migrations pending
INCREMENTAL_EXECUTED = 0
Step 5: Post-migration schema assertion...
POST_MIGRATION_SCHEMA_ASSERTION = PASS
MIGRATION_JOB = SUCCESS
Container called exit(0).
```

- 로그 40줄 전체에서 DB host · DB 이름 · 사용자 · 비밀번호 · socket path · IP 패턴 검색 → **0건**.
- `/health/ready` → HTTP 200. 신규 revision `o4o-core-api-03667-7g8` 의 HTTP 5xx (Cloud Logging `httpRequest.status>=500`) → **0건** (트래픽 유입 확인 03:54Z~).
- 사후 read-only (cloud-sql-proxy, SELECT 만): `typeorm_migrations` **678 rows · 675 distinct · max id 679** (사전과 동일) · `o4o_schema_baselines` 부재(marker 삽입 없음) · public/cosmetics/neture 사용자 relation 299 (변화 없음) · live fingerprint `bbef9560…` 5895 lines == expected → **운영 schema · data · typeorm_migrations 변경 ZERO**.

2차 배포 (spec 수정 `77d96f9dc`, Deploy run `34927020061` = success · execution `o4o-api-migrations-6zgk9` · revision `o4o-core-api-03669-m5f`): `CLASSIFICATION = LEGACY_ESTABLISHED` · `PRE_MIGRATION_SCHEMA_ASSERTION = PASS` · `INCREMENTAL_PENDING = 0` · `INCREMENTAL_EXECUTED = 0` · `POST_MIGRATION_SCHEMA_ASSERTION = PASS` · `MIGRATION_JOB = SUCCESS` · 로그 내 접속정보 0건 · 사후 `typeorm_migrations` 678/675/679 · marker 부재 · `/health/ready` 200 · 5xx 0건.

## 11. CI / CodeQL / Deploy run IDs

| 커밋 | 워크플로 | run ID | 결과 |
|---|---|---|---|
| `ee9374d12` (impl) | CI Pipeline | `34926088356` | **cancelled** (다른 세션 push `4a22be517` 의 concurrency) — success 로 기록하지 않음 |
| `ee9374d12` | CodeQL Security Analysis | `34926088344` | cancelled (동일 사유) |
| `ee9374d12` | Deploy API Server (Cloud Run) | `34926088309` | **success** (job `o4o-api-migrations-cxb77`) |
| `4a22be517` (다른 세션, `ee9374d12` 후손) | CI Pipeline | `34926197627` | **failure** — 원인은 본 WO spec(`describe.skip` 본문에서 harness 생성 → `TypeError: Invalid URL`); Code Quality Check 는 success |
| `77d96f9dc` (spec 수정, `ee9374d12` 후손) | CI Pipeline | `34927020083` | **success** (Code Quality Check · API Server Jest · Build Applications) |
| `77d96f9dc` | CodeQL Security Analysis | `34927020029` | **success** |
| `77d96f9dc` | Deploy API Server (Cloud Run) | `34927020061` | **success** (job `o4o-api-migrations-6zgk9`) |

`git merge-base --is-ancestor ee9374d12 77d96f9dc` = true → 구현 커밋 전체가 `77d96f9dc` 의 CI/CodeQL success 에 포함된다.

## 12. 중지 조건 (§12) 점검

| 조건 | 결과 |
|---|---|
| 운영 DB 가 새 분류기에서 LEGACY_ESTABLISHED 실패 | 미발동 (§9 PASS) |
| expected ↔ live fingerprint 불일치 | 미발동 (hash·line count 동일) |
| incremental history 불연속 | 미발동 (prefix 1/1 contiguous) |
| expected fingerprint 재현 불가 | 미발동 (격리 PG 재현 = 운영 값) |
| PG 버전 정규화 차이 | 미발동 |
| 다른 세션 동일 파일 변경 | 미발동 (겹침 0) |
| CI / CodeQL / Deploy 실패 | 1회 발동: 후손 CI `34926197627` 이 본 WO spec 결함으로 failure → 최소 수정 `77d96f9dc` 로 해소(CI · CodeQL · Deploy 모두 success). Deploy 는 두 번 모두 success, 운영 영향 없음 |
| 자격정보 노출 | 미발동 (터미널 · 문서 · diff · 커밋 어디에도 host/name/user/password 없음; 로컬 harness URL 은 env 로만 전달) |

## 13. 최종 판정

| 항목 | 결과 |
|---|---|
| 잘못된 기존 DB 를 정상으로 오인하지 않음 | 격리 PG 16/16 (BEFORE 8/16 → AFTER 16/16) |
| incremental 적용 이후에도 예상 ↔ 실제 스키마 비교 | S06 · S08 · jest POST assertion · 운영 job `PRE/POST = PASS` |
| history 중간 누락 · 역전 · 미등록 차단 | S09 · S10 · S11 · S12 · S14 · S15 + prefix 단위 테스트 10 |
| DB 접속 위치 · 이름 로그 비노출 | guard C24 · jest §8.3 · 운영 job 로그 2회 검색 0건 |
| 운영 schema · data · 권한 · typeorm_migrations 무변경 | 사전/사후 678/675/679 · fingerprint 동일 · marker 부재 · DDL/DML 0 |

```text
CLASSIFIER_FINGERPRINT_VERIFICATION = ALL_ESTABLISHED_STATES
INCREMENTAL_HISTORY_PREFIX_RULE = ENFORCED
EXPECTED_SCHEMA_STATE_REGISTRY = LOCKSTEP_WITH_MANIFEST
PRE_MIGRATION_SCHEMA_ASSERTION = REPORTED
POST_MIGRATION_SCHEMA_ASSERTION = REPORTED
DB_CONNECTION_DETAILS_IN_LOGS = NONE
ISOLATED_PG_NEGATIVE_TESTS = 16/16
PRODUCTION_SCHEMA_CHANGE = ZERO
PRODUCTION_DATA_CHANGE = ZERO
PRODUCTION_TYPEORM_MIGRATIONS_CHANGE = ZERO
DATABASE_STATE_CLASSIFIER_SCHEMA_DRIFT_AND_CONNECTION_LOG_HARDENING = CLOSED
```

## 14. 문서 정합

- [`PRODUCTION-MIGRATION-STANDARD`](../baseline/operations/PRODUCTION-MIGRATION-STANDARD.md) v2.1: Step 4 "Register the Expected Schema State" 신설(기존 Step 4 → Step 5) · Components 표 6행 추가 · States 표 조건 갱신 · 기대 job 로그 블록 갱신 · Rules 9–11 추가 · Change Log v2.1 행.
- 발견 2건(historical manifest JSON name mis-parse 3 entries · `setup-local-db.sh` 로컬 비밀번호 echo) — 별도 WO 제안 2건, SUPERSEDED 표기 0, 링크 수정 0.

## 15. 자체 검증 명령 기록 (§13)

| 검증 | 명령 | 결과 |
|---|---|---|
| 의존성 | `pnpm install --frozen-lockfile` | OK (lockfile 무변경) |
| 패키지 빌드 | `pnpm run build:packages` | OK |
| 프론트 타입 | `pnpm run type-check:frontend` | `type-check:frontend: OK` EXIT 0 |
| api-server 타입 | `apps/api-server`: `tsc --noEmit` | EXIT 0 |
| migration contract guard | `node scripts/db/check-migration-contract.mjs` | **20 pass / 0 fail** (C01–C24, 신규 C21·C22·C23·C24 포함) |
| 관련 Jest | `jest src/__tests__/database-state-classifier-schema-drift-and-connection-log-hardening.spec.ts` (`O4O_ISOLATED_PG_URL` 설정) | **29 passed / 29** (143 s; §8.2 격리 PG 4 케이스 · §8.3 서브프로세스 2 케이스 포함) |
| api-server 전체 Jest | `jest` (격리 PG 포함) | 4683 passed · 8 failed · 21 skipped / 4712. **실패 8건 전부 `local-agent-oneclick-pairing.spec.ts`** — 자체 local server 기동이 `listen EADDRINUSE 127.0.0.1:47821` (이 PC 에서 실제 Local Agent 가 같은 포트 점유). 본 WO 파일과 무관, 단독 재실행도 동일 원인으로 실패 — 환경 요인으로 기록(숨기지 않음) |
| lint | `eslint` (변경 TS 파일 scope) | 0 errors (미사용 `eslint-disable` 경고 2건 → 제거 후 0 warnings) |
| 격리 PG harness BEFORE/AFTER | `run-harness.mts WHICH=before\|after` (임시 probe, 커밋 제외) | BEFORE 8/16 · AFTER 16/16 (§2 표) |
| 운영 read-only 사전 분류 | cloud-sql-proxy + 새 분류기 probe (SELECT 만) | LEGACY_ESTABLISHED · match true (§9) |
