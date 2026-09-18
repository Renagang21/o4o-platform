# CHECK-O4O-MIGRATION-HISTORY-BASELINE-FINAL-CLOSURE-V1

> **WO**: WO-O4O-RETIRED-SERVICE-MIGRATION-HISTORY-SQUASH-AND-BASELINE-FINAL-CLOSURE-V1
> **실행일**: 2026-09-18 · **환경**: 격리 PostgreSQL 15.17(docker) 검증 → PR/CI → production 은 canonical Deploy API migration Job 경로로만 판정(쓰기 0)
> **선행**: `bbd61992a`(repository ACTIVE residual 0) · `65cc6b8f5`(DB structured residual 0) · `1af2abdc4` + CHECK `c86371df0`(DB schema residual 0 · 마지막 incremental 7번째)
> **대상**: 은퇴 서비스 트랙의 최종 마감 — historical migration source 정리 + canonical baseline rollover + legacy history provenance 를 ordered history fingerprint 로 전환

이 문서는 은퇴 서비스의 고유 명칭을 본문에 기재하지 않는다("retired service" / "은퇴 서비스"로만 지칭). 실제 DB host · 계정 · 비밀번호 · 개인식별정보는 기록하지 않는다.

**가장 중요한 결정**: production `typeorm_migrations` 행(은퇴 서비스명을 포함하는 31행 포함)은 **삭제 · 수정 · rename · 재정렬하지 않았다.** 이 WO 에서 production DB 에 대한 쓰기는 0건이다. 이 행들은 감사 이력이며 잔존물이 아니다.

---

## 1. BASE

```text
origin/main 실행 시점 최신 = a5d56fd04
worktree: C:/tmp/o4o-retired-migration-final · branch work/retired-service-migration-history-final-closure-v1 (base a5d56fd04)
메인 체크아웃의 다른 세션 dirty/미추적 파일(content-editor · store-ui-core · web-kpa-society · web-pharmacy-hub · llm spec) = 불가침 · 미접촉
```

## 2. PRE-CENSUS (base `a5d56fd04` · `git grep -niE '<4 패턴>'` · lockfile 제외)

| 영역 | 내용 hit(행) | 파일명 hit |
|---|---|---|
| `apps/api-server/src/database/**` (historical migration source 101 + `historical-migration-names.ts` + `legacy-history.facts.ts`) | 929 | 29 |
| `docs/investigations/**` (IR 2건, 서비스 종료 사례 문구) | 2 | 0 |
| 그 외 (runtime · packages · services · scripts · 기준 문서) | 0 | 0 |
| **합계** | **931** | **29** |

migration source 파일: 651개(historical 644 + incremental 7). runtime 이 로드하는 것은 `incremental/manifest.ts` 의 7개뿐(historical 644 = 로드 0, 재생 0).

## 3. PRODUCTION HISTORY (read-only · SELECT only · `default_transaction_read_only = on`)

| 항목 | 값 |
|---|---|
| `typeorm_migrations` | **684행 · 681 distinct name · max id 685** (id 순 캡처, 로컬 untracked 파일에만 보관 · repo 미포함) |
| 은퇴 서비스명 포함 행 | 31 (감사 이력 · **불변 · KEEP**) |
| live schema fingerprint | `0ca1a71b9a511f0147583c919eb37814b1ad28f1ba042ceba1038393bb54df70` (5745 lines) == 직전 `EXPECTED_SCHEMA_STATES` 최종 항목 |
| `o4o_schema_baselines` | 없음(production 은 bootstrap 된 적 없음 · 이번에도 marker 를 만들지 않는다) |
| `checkout_orders` | 23행 · `order_type` = GENERIC 23 |
| KEEP (구조화 데이터) | `DB_HISTORICAL_ORDER_METADATA = 4` · `DB_FREE_TEXT_USER_DATA = 2` — 기록이며 잔존물 아님 |
| ordered history fingerprint (684행) | `87cc2bce8b2c…` (`LEGACY_HISTORY_BASELINE.orderedNameSequenceSha256`, 전체값은 소스 참조) |

## 4. BASELINE ROLLOVER

| 항목 | 값 |
|---|---|
| 방식 | `scripts/db/build-canonical-schema-baseline.mjs` — 격리 PG 15.17 을 **이전 baseline `2026-09-15-id678` + incremental 7개** 로 구축한 뒤 스냅샷 (production 스냅샷 0) |
| 게이트 | 격리 DB fingerprint == production live fingerprint == 최종 expected state == `0ca1a71b…`(5745) — 3자 일치 확인 후에만 채택 |
| 새 `baselineVersion` | **`2026-09-18-id685`** (`supersedesBaselineVersion = 2026-09-15-id678` · `absorbedIncrementalMigrationCount = 7` · `sourceCapturedAt = 2026-09-18`) |
| 스냅샷 | 1635 statements · 은퇴 서비스 문자열 0 · `retiredObjectPatterns` 에 걸리는 CREATE TABLE/TYPE 0 (guard + jest) · 수동 문자열 삭제 0 |
| `INCREMENTAL_MIGRATIONS` | `[]` (`INCREMENTAL_MIGRATION_CUTOFF = { baselineVersion: '2026-09-18-id685', minimumEpoch13: 1789690338676 }`) |
| `EXPECTED_SCHEMA_STATES` | baseline 항목 1개만 (`appliedThrough: null`, fingerprint = meta) |
| 흡수된 incremental source 7개 | 삭제 |
| marker | production 에 새 marker 없음. fresh DB 는 새 marker `2026-09-18-id685` 로 bootstrap. 구 marker 를 가진 live DB 없음 → 안전 |

## 5. HISTORY CONTRACT (ordered history fingerprint)

- 신규 `incremental/legacy-history-baseline.ts`: `{ rowCount: 684, distinctNameCount: 681, orderedNameSequenceSha256, capturedThroughId: 685, capturedAt: '2026-09-18' }` — migration 이름 0.
- 신규 `bootstrap/legacy-history-fingerprint.ts`: 단일 hash 구현(`sha256(name + '\n' …)`, UTF-8, lowercase hex) + `verifyLegacyHistoryPrefix` — classifier · harness · spec 모두 이 함수만 사용(guard C21 이 제2 구현을 금지).
- classifier(`database-state.ts`): `LEGACY_ESTABLISHED` = marker 없음 · `history[0..683]` hash == baseline · `history[684..]` = incremental manifest 의 contiguous prefix · core tables 존재 · live fingerprint == expected state. 그 외 전부 `UNKNOWN_PARTIAL`(fail-closed). `BOOTSTRAPPED` 는 legacy fingerprint 불일치가 조건.
- `migrate.ts`: `UNKNOWN_HISTORY_NAMES` → **`LEGACY_HISTORY_FINGERPRINT = MATCH | MISMATCH | NOT_APPLICABLE`**.
- 삭제: `historical-migration-names.ts` · `legacy-history.facts.ts` (평문 legacy 이름 목록 0) · historical migration source 100개(은퇴 서비스 문자열 포함, 혼합 파일 포함) · incremental 7개 = **107 파일**. runtime 이 historical source 를 import 하지 않음을 jest("no runtime module imports a historical migration source") + guard 로 증명한 뒤 삭제.
- `historical-migrations.manifest.json`: **보존된 historical source 544개의 identity freeze 만** (`count: 544`, `$comment` 에 "RETAINED historical migration source files only"). `--write-historical --maintenance --baseline-rollover` 게이트를 통과해 재생성(`baseline rollover 2026-09-15-id678 -> 2026-09-18-id685: dropping 100 historical source(s) / 100 runtime identities, covered by legacy history fingerprint (684 rows)` → `historical entries 544 · identity corrections 0 · removed 100`).
- 게이트 조건(전부 충족해야 쓰기): CI 아님 · `--maintenance` 명시 · 새 baseline meta(`baselineVersion` 형식 · supersedes ≠ self · cutoff 일치) · incremental manifest listed == imported · expected states == incremental + 1 · legacy baseline 정형 + 평문 이름 0 · 삭제 source 를 runtime 이 import 하지 않음 · 이후 contract 전체 PASS.
- guard 변경(약화 없음): C03/C08 cutoff-key 항목 제거(필드 자체 폐기) · C11 baseline/supersedes/absorbed + 구 cutoff 필드 거부 · C13 retired object 패턴 확장(partner 계열 word-boundary) · C15 `LEGACY_HISTORY_FINGERPRINT` 요구 · C21 legacy baseline 구조 + 금지 파일 부재 + incremental dir 허용 파일 4개 + 단일 hash 구현 + runtime 의 은퇴 심볼 참조 0 · C23 manifest = 보존 파일만.

## 6. VALIDATION

| # | 검증 | 결과 |
|---|---|---|
| V1 | `node scripts/db/check-migration-contract.mjs` | **21 pass / 0 fail** (C01–C25) |
| V2 | `--write-historical` verify-only | exit 0 · `historical entries 544 · identity corrections 0 · removed 0` |
| V3 | `--write-historical --maintenance` under `CI=true` / `--baseline-rollover` without `--maintenance` | 둘 다 refused (exit ≠ 0) |
| V4 | `node --test scripts/db/__tests__/migration-identity.test.mjs` | 26/26 pass (manifest files == on-disk non-incremental · 금지 파일 부재) |
| V5 | jest `canonical-database-bootstrap-incremental-migration-separation.spec.ts` | PASS (20) — meta/cutoff 구 필드 부재 · legacy baseline 구조 · 평문 이름 0 · retired object 미부활 · runtime historical import 0 · guard verify-only |
| V6 | jest `database-state-classifier-schema-drift-and-connection-log-hardening.spec.ts` (`O4O_ISOLATED_PG_URL` + `O4O_LEGACY_HISTORY_FILE`) | **PASS 36/36** — 격리 PG scenario **S01–S23 전부 기대 판정**(S07/S08 LEGACY_ESTABLISHED · S16 renamed / S17 missing / S18 reordered / S19 inserted / S20 truncated / S21 third duplicate / S22 M1 inside prefix / S23 unregistered state → 전부 UNKNOWN_PARTIAL · S14 marker+legacy 공존 → UNKNOWN_PARTIAL) |
| V7 | 순수 단위: `hashOrderedHistoryNames` 알려진 벡터(빈 입력 `e3b0c442…`) · 순서 민감 · 중복 민감 / `verifyLegacyHistoryPrefix` 정합 수용 + 6종 변형 거부 + 행 수 보존 삽입 거부 + 실제 baseline 이 합성 history 를 수용하지 않음 | PASS |
| V8 | fresh 격리 DB `src/migrate.ts`: `FRESH_EMPTY` → bootstrap 1635 statements → marker `2026-09-18-id685` → `HISTORICAL_REPLAY = ZERO` · `INCREMENTAL_PENDING 0 / EXECUTED 0` → `LIVE_FINGERPRINT = 0ca1a71b…(5745)` == production 최종 · `POST PASS` · `MIGRATION_JOB = SUCCESS` | PASS |
| V9 | 같은 DB 재실행 | `BOOTSTRAPPED` · `BOOTSTRAP_EXECUTION = SKIPPED` · `INCREMENTAL_EXECUTED 0` · POST PASS · 쓰기 0 |
| V10 | production 동등 legacy 격리 DB(현행 스키마 + marker 삭제 + **실제 684행 history** 삽입) `--status` | `DATABASE_STATE = LEGACY_ESTABLISHED` · `LEGACY_HISTORY_FINGERPRINT = MATCH` · `CURRENT_INCREMENTAL_PREFIX = 0 / 0` · `INCREMENTAL_PENDING 0` · `PRE PASS` · `EXPECTED_LIVE_FINGERPRINT_MATCH = YES` · `DB_WRITES = 0` · pg_stat 카운터 · history 수 · fingerprint 전후 동일 · 로그에 host/db/user/password 0 |
| V11 | drift 격리 DB(`store_tablet_devices.last_seen_at` DROP) 실행 | `UNKNOWN_PARTIAL` · PRE FAILED · BOOTSTRAP REFUSED · EXECUTED 0 · exit 1 |
| V12 | api-server `tsc --noEmit` · `pnpm run build` · `node scripts/check-typeorm-entities.mjs` | 전부 PASS (`dist/migrate.js` 생성) |
| V13 | api-server 전체 Jest (`pnpm --filter @o4o/api-server test`, 격리 PG env 포함) | 1차: Test Suites 312 passed / 1 failed / 3 skipped · Tests 5073 passed / 1 failed / 31 skipped (5105). 실패 1 = `organization-core-dead-lifecycle-destructive-uninstall-retirement.spec.ts` 의 "정본 migration 이 존재한다" — 은퇴 문자열을 포함한 historical source 2건(`OrgServiceModelNormalizationPhaseA` · `CosmeticsStoreOrgBridge`)의 **파일 존재**를 단언하던 테스트. 본 WO 의 계약(historical source 는 runtime provenance 가 아님)에 맞춰 `CORE_TABLES` + canonical baseline `CREATE TABLE public.organizations / organization_members` 존재 단언으로 재조준 → 해당 spec 10/10 PASS. 그 외 실패 0 |

## 7. FINAL CENSUS (branch HEAD · 전체 repo · lockfile 포함)

| 검사 | 결과 |
|---|---|
| `git grep -niE '<WO §16 의 4 패턴(영문 고유명 · 한글 고유명 · E2E 접두 · 대문자 접두)>'` (전체 repo · docs · lockfile 포함) | **0** |
| `git ls-files \| rg -i '<retired name>'` | **0** |
| `apps/api-server/src/database/migrations` 파일 수 | 651 → **544** (historical 100 + incremental 7 삭제) |
| 보존 source 에 은퇴 서비스 문자열 | 0 |
| canonical baseline `.ts` 에 은퇴 서비스 문자열 | 0 |
| IR 2건 문구 | 고유명 → "은퇴 서비스" 일반 표현(사실 유지 · §16-1 override 에 따라 기록물도 수정) |
| GP alias (`-GP-` · `GP-KCOS` · `GP/KCos`) | 잔존 = 과거 **WO 식별자**(`WO-O4O-…-GP-KCOS-…` 등 코드 주석 15 · 문서 8) — 서비스 명칭이 아니라 CHECK 추적용 고정 식별자 → **KEEP(false positive)**. 활성 코드 경로 · 설정 · 라우트에서의 GP 별칭 0 |

## 8. 금지 사항 준수

production history 재작성 0 · production business data 정리 0 · checkout order metadata 수정 0 · 사용자 자유텍스트 수정 0 · historical replay 복원 0 · `synchronize:true` 0 · migration glob 0 · API 기동 bootstrap 0 · 구 서비스 호환 layer 0 · 다른 서비스명으로의 기계적 치환 0.

## 9. 문서

- `docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md` v2.3 — "Historical source files are not runtime provenance. Legacy production history provenance is verified by an ordered history fingerprint. Historical source replay remains ZERO. Fresh databases use the canonical baseline." 명문화 · 구성요소 표(삭제 파일 제거 · legacy baseline/fingerprint 추가) · 상태 규칙 · 기대 로그(`LEGACY_HISTORY_FINGERPRINT = MATCH`) · 규칙 2/3/7/10/12/14 · change log.
- 과거 CHECK/IR 의 `historical-migration-names.ts` · `legacy-history.facts.ts` · `UNKNOWN_HISTORY_NAMES` 언급 = 당시 기록 · 불변.

## 10. PR-CI · DEPLOY · POST-CHECK

### 10-1. 브랜치 · PR

| 항목 | 값 |
|---|---|
| 브랜치 | `work/retired-service-migration-history-final-closure-v1` |
| 커밋 | `d51e1e694` (WO 본 커밋 · 134 files +1039/−13593) → `ee3efe48f` (merge `8eb16083b`) → `3f9b8065d` (ESLint ratchet 47>46 해소: 신규 spec 의 `require('crypto')` → ESM `import { createHash }`) → `18b4db6f0` (Sonar S4158 `INCREMENTAL_MIGRATIONS=[]` map 경고 — append-only registry 주석 + `NOSONAR`) → `d248d2433` (merge `89ef8f68b`) → `032d91528` (merge `33c75d925`) |
| 머지 전 반복 검증 (커밋마다) | census `git grep -niE` 0 · 파일명 0 · `check-migration-contract.mjs` 21 pass/0 fail · `tsc --noEmit` exit 0 · `git merge-base --is-ancestor origin/main HEAD` true |
| PR | **#221** → main **`25e0f4bf7`** (머지 커밋 · 직접 push 없음) |

### 10-2. CI

| run | HEAD | 결과 |
|---|---|---|
| `35306448671` | `d51e1e694`/`ee3efe48f` | Code Quality **fail** (ESLint ratchet 47 > baseline 46 · 원인 = 내 신규 spec 의 `require`) · Jest pass · CodeQL pass |
| `35307237216` | `3f9b8065d` | Code Quality pass · API Server Jest pass · Build pass · CodeQL pass · SonarCloud fail |
| `35308268643` | `18b4db6f0` | 동일 (Sonar reliability B → OK · duplication 만 잔존) |
| `35309273914` | `d248d2433` | **API Server Jest fail 12 suites** (`store-owner*` · `policy-acceptance` · `MembershipApprovalService.*`) — main `55c60e081`(타 세션) 이 main 자체에서 동일 실패. 본 WO 무관 = 중지 조건 → 사용자 판단 **"main 이 녹색이 될 때까지 대기"** |
| main 복구 | `da357c9cc`(→2 suites) · `33c75d925`(GREEN · run `35318309891`) — 타 세션 |
| `35319555079` | `032d91528` | API Server Jest pass · Code Quality pass · Build pass · CodeQL pass · Analyze pass · **SonarCloud fail** |

SonarCloud (merge blocker 아님 · `main` 비보호): `new_duplicated_lines_density` 18.6% > 3% — 전량 생성물 `apps/api-server/src/database/bootstrap/canonical-schema-baseline.ts`(163 dup lines · `pg_dump` 기반 DDL 문자열). CPD 제외(`sonar.cpd.exclusions`)는 CI 인프라 변경 = 중지 조건 → 미수정 · 보고만.

### 10-3. DEPLOY (`25e0f4bf7`)

| 항목 | 값 |
|---|---|
| Deploy API Server (Cloud Run) | run `35320745216` · completed **success** · job build-and-deploy success |
| Migration Job 실행 | `o4o-api-migrations-nz25p` · successfully completed |
| Job 로그 (Cloud Run Job execution log) | `Incremental manifest: 0 migration(s) after baseline 2026-09-18-id685` · `DATABASE_STATE = LEGACY_ESTABLISHED` · reason `typeorm_migrations 684 rows; legacy history fingerprint (684 rows) == baseline, core tables present, no marker; incremental prefix 0 (pending 0); live fingerprint == expected` · `o4o_schema_baselines: absent` · `CURRENT_INCREMENTAL_PREFIX = 0 / 0` · `EXPECTED_FINGERPRINT = 0ca1a71b…54df70 (5745 lines)` · `LIVE_FINGERPRINT = 0ca1a71b…54df70 (5745 lines)` · **`LEGACY_HISTORY_FINGERPRINT = MATCH`** · `PRE_MIGRATION_SCHEMA_ASSERTION = PASS` · **`BOOTSTRAP_EXECUTION = SKIPPED`** · **`HISTORICAL_REPLAY = ZERO`** · **`INCREMENTAL_PENDING = 0`** · **`INCREMENTAL_EXECUTED = 0`** · `POST_MIGRATION_SCHEMA_ASSERTION = PASS` · **`MIGRATION_JOB = SUCCESS`** |
| Cloud Run service | `o4o-core-api` latest ready revision `o4o-core-api-03710-k2f` · traffic 100% |
| Health | `https://api.neture.co.kr/health` **200** · `/health/ready` **200** (READY + DB `SELECT 1`) |

### 10-4. 운영 사후 점검 (SELECT only · `default_transaction_read_only = on` · 배포 후)

| 항목 | 값 | 판정 |
|---|---|---|
| `typeorm_migrations` | 684 rows · max id 685 · distinct name 681 | §3 과 동일 · **불변** |
| `o4o_schema_baselines` | 테이블 없음 | 새 baseline 운영 재적용 없음 · marker 없음 |
| live schema fingerprint | `0ca1a71b9a511f0147583c919eb37814b1ad28f1ba042ceba1038393bb54df70` (5745) — Job 로그 LIVE == EXPECTED | 스키마 변경 0 |
| `checkout_orders` | 23 | 불변 |
| 은퇴 서비스 스키마 객체 (table · column · type · enum label) | 0 | `DB_SCHEMA_RESIDUAL = 0` |
| `typeorm_migrations` 은퇴 문자열 name | 31 | KEEP `HISTORICAL_DB_AUDIT_RECORDS` (불변 감사 기록) |
| `checkout_orders.metadata.serviceKey` | 4 | KEEP `DB_HISTORICAL_ORDER_METADATA = 4` |
| `organizations.name` 1 · `store_playlists.name` 1 · `users.name` 0 | 2 | KEEP `DB_FREE_TEXT_USER_DATA = 2` |

운영 write 0 · DDL 0 · `typeorm_migrations` DELETE/UPDATE 0.

## 11. FINAL

```text
REPOSITORY_ACTIVE_RESIDUAL = 0
DB_STRUCTURED_RESIDUAL = 0
DB_SCHEMA_RESIDUAL = 0
RETIRED_SERVICE_MIGRATION_SOURCE_RESIDUAL = 0
RETIRED_SERVICE_REPOSITORY_RESIDUAL = 0
ACTIVE_SYSTEM_RESIDUAL = 0
MIGRATION_SOURCE_CLOSURE = CLOSED
BASELINE_ROLLOVER = CLOSED
KEEP: HISTORICAL_DB_AUDIT_RECORDS (typeorm_migrations 684행 불변) · DB_HISTORICAL_ORDER_METADATA = 4 · DB_FREE_TEXT_USER_DATA = 2 — 기록이며 잔존물 아님
```

은퇴 서비스 잔존 제로 트랙은 이 WO 로 **최종 CLOSED** — 후속 cleanup WO 없음.
