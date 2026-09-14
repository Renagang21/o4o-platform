# IR-O4O-MIGRATION-TIMESTAMP-ORDERING-HISTORY-GAP-AND-FRESH-DATABASE-REPLAY-CENSUS-V1

> **종류**: 조사 전용 IR (구현 · migration 수정 · 운영 DB 변경 없음)
> **작성일**: 2026-09-14
> **조사 기준 SHA**: `bd2e33d705685cf95a0bdc37fb9d7af7b99f5744` (`origin/main`, 저장소 clean)
> **선행 IR**: [`IR-O4O-ROLES-TABLE-CANONICAL-SCHEMA-SEED-AND-ENTITY-DRIFT-CENSUS-V1`](IR-O4O-ROLES-TABLE-CANONICAL-SCHEMA-SEED-AND-ENTITY-DRIFT-CENSUS-V1.md) §13 (사용자 검토 결과 · 후속 순서 ①)
> **후속 WO(예정)**: `WO-O4O-MIGRATION-ORDERING-AND-FRESH-DATABASE-BOOTSTRAP-OWNERSHIP-CLOSURE-V1` — 본 IR 은 방향을 **판정하지 않고** 후보 3안의 성립 여부만 실측으로 확정한다.
> **금지 준수**: 기존 migration rename 0 · class name 변경 0 · `typeorm_migrations` 수정 0 · 누락 migration 추정 복원 0(§9-E4 는 격리 DB 안에서 git 이력의 **원본 그대로**를 실행한 실험이며 저장소에 복원하지 않았다) · schema snapshot 작성 0 · `roles` baseline migration 추가 0 · 운영 DB write 0.

---

## 0. 요약

| 항목 | 실측값 |
|---|---|
| 저장소 migration 파일 | **644** (`apps/api-server/src/database/migrations/*.ts`) — 파일명 prefix 13자리 82 · 14자리 562 |
| 운영 `typeorm_migrations` | **677행 · 674 distinct name** · id 1‥678 (id 479 결번 1) · 동일 name 중복 3쌍 |
| 저장소 → 운영 차집합 (운영 pending) | **0** |
| 운영 → 저장소 차집합 (운영에만 남은 이력) | **30** (§7 확정 목록 · 삭제 커밋 4개로 전부 추적됨) |
| TypeORM 이 실제 쓰는 정렬 키 | `parseInt((instance.name ?? class.name).substr(-13))` — **파일명이 아니라 유효 이름의 끝 13자리** |
| 실제 실행 순서(빈 DB 기준) | **S1** 14자리 이름 500개(값 2.6e11~2.7e11) → **S2** 13자리 epoch 이름 114개(1.70e12~1.78e12) → **S3** 13자리 날짜형 이름 30개(2.0e12+) — 파일명 순서와 쌍 역전 **67,402**, 운영 실제 실행 순서와 쌍 역전 **66,666** |
| class ≠ `name` 속성 | **11** (TypeORM 은 `name` 속성을 쓰므로 운영 이력과는 일치) |
| 파일명 prefix ≠ 유효 이름 suffix | **65** (14자리 파일명·13자리 epoch class 62 + 날짜형 13자리 파일명·epoch class 2 + `4000000000003-…` 1) |
| 빈 DB replay — TypeORM 순서(실 배포 job 과 동일) | **FAIL** — 1번째 `RolePrefixMigrationFoundation20260205033223` 부터 실패 · 성공 344 / 실패 300 · `roles` 미생성 |
| 빈 DB replay — 파일명 순서 | **FAIL** — 6번째 `1736400000000-AddEnabledServicesToPharmacy` 부터 · 성공 515 / 실패 129 |
| 빈 DB replay — 운영 실제 순서(현 저장소 644개만) | **FAIL** — 성공 549 / 실패 95 |
| 빈 DB replay — 운영 실제 순서 + 삭제 30개 원본 포함(674개, 격리 DB 실험) | **FAIL** — 성공 628 / 실패 46 · `roles` 미생성 → **과거 history chain 을 그대로 재생해도 현 운영 스키마는 재현되지 않는다** |
| 운영 스키마의 migration 외 기원 (증거) | `users`.`createdAt`/`updatedAt`/`domain`/`phone` · `forum_post`/`forum_comment`/`forum_category` · `roles` · `glycopharm_products.origin_country` — 어떤 migration(현존 644 + 삭제 30)도 생성하지 않음 → synchronize/수동 시대 산물 |

**판정 요약** (§13): `HISTORY_CHAIN_RECOVERABLE = NO` · `FULL_FRESH_DATABASE_REPLAY = FAIL`(선행 IR 재확정) · `PROD_PENDING = 0` · `ORDERING_RISK_ON_PROD_INCREMENTAL = LOW`(pending 이 신규 파일뿐이므로) · `ORDERING_RISK_ON_FRESH_DATABASE = BLOCKING` · `BOOTSTRAP_INCREMENTAL_SEPARATION_REQUIRED = YES`.

---

## 1. 범위 · 방법 · 환경

- **범위** (사용자 지시 그대로): 저장소 migration 전체 파일 수 / 운영 `typeorm_migrations` 전체 이력 / 양방향 차집합 / 13·14·기타 자리 suffix 전수 분류 / TypeORM 이 실제 계산하는 timestamp 와 실행 순서 / class name · `name` 속성 · 파일명 불일치 / 운영에만 있고 저장소에서 삭제된 30개 정확한 목록 / 그 30개가 현재 스키마 재현에 필요한지 / 현재 소스 fresh DB replay 최초 실패부터 연쇄 실패 전수 / 기존 migration rename 없이 정렬 문제 해결 방법 / baseline·snapshot migration 으로 과거 history 대체 가능성 / 빈 DB bootstrap 과 운영 incremental migration 분리 필요성.
- **운영 DB**: read-only SELECT 만 (`typeorm_migrations` 전체 · `information_schema`). 자격정보는 Secret → 환경변수 경로만 사용, 어떤 산출물에도 기록하지 않음. PostgreSQL 15.18.
- **격리 DB**: 로컬 PostgreSQL 17.9 (세션 scratch 디렉터리 · 별도 포트) · 빈 DB 4개 (`uuid-ossp` 확장만 미리 생성). 실 배포 job(`dist/migrate.js`)과 같은 TypeORM 0.3.27 · 같은 컴파일 산출물 `apps/api-server/dist/database/migrations/*.js`(644) 을 사용. 실행기는 migration 1개 = 트랜잭션 1개(`transaction: 'each'` 와 동일)로 돌리되 **실패 시 중단하지 않고 다음으로 진행**하여 연쇄 실패 전수를 얻었다. (실 job 은 첫 실패에서 중단한다 — 최초 실패 지점은 §9 각 실험의 1행.)
- **PG 버전 차(15 vs 17)** 는 DDL 성공/실패 판정에 영향을 주는 사례가 관찰되지 않았다(실패 원인은 전부 "relation/column 부재" 또는 migration 자체 guard).
- 격리 DB 실험 스크립트는 `apps/api-server/dist/`(git ignore) 아래에만 두었고 저장소 추적 파일은 변경하지 않았다.

---

## 2. 저장소 migration 전수 (644)

### 2-1. 파일명 prefix 자리수

| 파일명 prefix | 개수 | 범위 |
|---|---:|---|
| 13자리 | 82 | `1700000000000-CreateUsersTable.ts` ‥ `4000000000003-AddReasonAndReapplyCooldownToEnrollments.ts` |
| 14자리 | 562 | `20260205033223-RolePrefixMigrationFoundation.ts` ‥ `20270413000000-BaselineRbacAndAccountTables.ts` |

13자리 82 의 내역: epoch-ms 형(`17…`) 49 · 날짜+카운터 형(`2025MMDDnnnnn` 1 · `2026MMDDnnnnn` 31) 32 · 임의값 `4000000000003` 1.

### 2-2. 유효 이름(TypeORM 이 쓰는 이름)의 숫자 suffix 자리수 — 파일명 prefix 와 교차

| 파일명 prefix | 유효 이름 suffix | 개수 | 비고 |
|---|---|---:|---|
| 13 | 13 | 82 | 그 중 3개는 파일명 prefix ≠ suffix (§6-2) |
| 14 | 14 | 496 | 정상 |
| 14 | 13 | 62 | **파일명은 14자리인데 class 는 13자리 epoch** (예: `20260212000001-AddKpaMemberUniqueConstraints.ts` → `AddKpaMemberUniqueConstraints1707696001000`) |
| 14 | 15 | 3 | 이름에 `V2`가 붙어 `…V220260309300000` 형 — 끝 13자리는 정상 |
| 14 | 18 | 1 | `SeedKpaBranchAnnualReportTemplate202620270308000000` — 끝 13자리는 정상 |

### 2-3. class 이름 · `name` 속성 · 유효 이름

- `name` 속성을 가진 파일: 11 — 전부 class 이름과 **다르다** (§6-1). TypeORM 은 `migration.name || migration.constructor.name` 을 쓰므로 유효 이름은 `name` 속성이고, 운영 이력의 name 도 이 값이다.
- 유효 이름 중복: 0. 저장소의 유효 이름 644개는 **모두 운영 이력에 존재**한다(§4).

---

## 3. 운영 `typeorm_migrations` 이력 전수

| 항목 | 값 |
|---|---|
| 행 수 | 677 |
| distinct name | 674 |
| id 범위 | 1 ‥ 678 (결번 **id 479** — 478 `AddUniqueUserIdToNetureSuppliers20260926000000` 와 480 `BootstrapCanonicalSeedAccounts20260927100000` 사이; 원인 미상 — 실패 트랜잭션의 sequence 소비 또는 수동 삭제, **판단하지 않는다**) |
| 컬럼 | `id serial` · `timestamp bigint` · `name varchar` — 실행 시각 컬럼 없음 → 실제 실행 순서는 **id 순**만이 근거 |
| 저장된 `timestamp` 자리수 | 12자리 514 (14자리 이름의 끝 13자리 `0YYMMDDhhmmss` → 선행 0 탈락) · 13자리 163 |
| 동일 name 중복 | 3쌍: id 390/391 `DropSignageDeadTables20260417100000` · 455/456 `AddGradingFieldsToLmsSubmissions20260503100000` · 481/482 `NormalizeServiceMembershipsKpaKey20260928000000` — 배포 job 이 `--max-retries=1` 이므로 재시도/중복 실행 흔적으로 추정되나 확정 불가. TypeORM pending 판정은 `find(name)` 이므로 **동작에는 무해**하며 본 IR 은 수정 대상으로 삼지 않는다 |
| 마지막 실행 | id 678 `BaselineRbacAndAccountTables20270413000000` |
| id 순(실행 순)과 timestamp 순의 불일치 | 누적 최대값보다 작은 timestamp 가 뒤에 온 행 622 — 운영은 배포 회차마다 "그때의 pending" 만 실행했으므로 timestamp 순서와 무관하게 쌓였다 |

---

## 4. 양방향 차집합

| 방향 | 개수 | 의미 |
|---|---:|---|
| 저장소 유효 이름 − 운영 name | **0** | 운영에 pending 없음. 다음 배포에서 job 은 `No migrations are pending` |
| 운영 name − 저장소 유효 이름 | **30** | 저장소에서 삭제된 실행 완료 migration (§7) |

---

## 5. TypeORM 이 실제 계산하는 timestamp 와 실행 순서

### 5-1. 알고리즘 (TypeORM 0.3.27, `node_modules/typeorm/migration/MigrationExecutor.js`)

```text
getMigrations():
  name = instance.name || constructor.name
  timestamp = parseInt(name.substr(-13), 10)       // 파일명 무관 · 끝 13자리만
  sort((a,b) => a.timestamp - b.timestamp)          // Array.sort = stable → 동점은 로드(glob=파일명) 순
executePendingMigrations():
  pending = all.filter(m => !executed.find(e => e.name === m.name))   // 이름 일치만 · timestamp 비교 없음
  // "timestamp is not valid" 검사는 주석 처리되어 있음
```

배포 job(`apps/api-server/src/migrate.ts`)은 `migrations: [dist/database/migrations/*.js]` · `transaction: 'each'` · 첫 실패에서 exit 1.

### 5-2. 계산 결과 — 3개 구간

| 구간 | 유효 이름 형태 | `substr(-13)` 값 | 개수 | TypeORM 순위 | 첫 파일 → 끝 파일 |
|---|---|---|---:|---|---|
| **S1** | 14자리 `YYYYMMDDhhmmss` | `0YYMMDDhhmmss` → 2.60e11~2.70e11 | 500 | 1‥500 | `20260205033223-RolePrefixMigrationFoundation` → `20270413000000-BaselineRbacAndAccountTables` |
| **S2** | 13자리 epoch-ms | 1.70e12~1.78e12 | 114 (13자리 파일명 52 + 14자리 파일명 62) | 501‥614 | `1700000000000-CreateUsersTable` → `1771200000028-CreateInstructorProfiles` |
| **S3** | 13자리 날짜형 `2025/2026MMDDnnnnn` | 2.02e12~2.03e12 | 30 | 615‥644 | `2025011100001-AddExternalContactToUsers` → `2026052100001-CreateServicePointBudgets` |

즉 빈 DB 에서는 **`users` 를 만드는 `1700000000000-CreateUsersTable` 이 501번째**, 최신 baseline 이 500번째, 2026-01~02월의 날짜형 13자리 30개가 **맨 마지막**에 실행된다.

### 5-3. 세 가지 순서의 상호 비교 (쌍 역전 수 · 전체 쌍 207,046)

| 비교 | 쌍 역전 | 인접 역전 |
|---|---:|---:|
| 파일명 순 vs TypeORM 순 | 67,402 | — |
| 운영 실제(id) 순 vs TypeORM 순 | 66,666 | 97 |
| 파일명 순 vs 운영 실제(id) 순 | 9,130 | 70 |

파일명 순이 운영 실제 순서에 가장 가깝고(역전 4.4%), TypeORM 순은 어느 쪽과도 3분의 1 가까이 역전된다. 전체 644행의 (TypeORM 순위 · 계산 timestamp · 파일명 · 유효 이름 · 운영 id · 파일명 순위 · 운영 순위) 표는 **부록 A**.

### 5-4. 동점(같은 계산 timestamp) 32 그룹

`Array.prototype.sort` 가 stable 이므로 glob 로드 순(= 파일명 순)이 유지된다. 예: `1737100300000-FixPartnerTestAccountRole` / `1737100300000-SeedNetureData`, `20260228000001-CleanupLegacyRoles` / `20260228000001-DropLegacyRbacColumns`, `20270326000000-CreateBranchEducationCreditLedger` / `20270326000000-DropGlycopharmService`. 서로 다른 파일명의 동점 2쌍은 구간을 넘나든다: `1771200000019-AddSupplierBusinessProfileFields` = `20260417200000-DropMarketTrialServiceApprovals`(class `…1771200000019`), `1771200000020-CreateOperatorActionDismissals` = `20260417300000-CreateMarketTrialForumSyncFailures`(class `…1771200000020`).

### 5-5. 운영 incremental 에 대한 실제 영향

운영은 pending = "이력에 없는 이름" 뿐이고 현재 0이다. 한 배포에 신규 migration 이 여러 개 들어갈 때 **모두 14자리 순차 카운터 규약**(직전 번호 + 1일)을 따르면 계산 timestamp 순 = 파일명 순이므로 문제가 없다. 위험이 되는 경우는 (a) 한 배포에 13자리 suffix class 와 14자리 class 가 섞이는 경우(14자리가 무조건 먼저 실행), (b) 빈 DB 전체 재생. (a) 는 현재 규약상 신규 파일이 전부 14자리이므로 규약이 지켜지는 한 발생하지 않으나, 이를 강제하는 가드는 없다(§10 R2).

---

## 6. 불일치 census

### 6-1. class 이름 ≠ `name` 속성 (11)

전부 2026-03-01~03-09 구간의 store/product AI 계열. class 는 13자리 epoch(`1709…`), `name` 속성은 14자리 파일명 값. TypeORM 유효 이름 = `name` 속성 = 운영 이력 name 이므로 **실행·이력 관점 불일치는 없다**. class 이름은 타입/테스트 import 에서만 의미가 있다.

| 파일 | class | `name` 속성 |
|---|---|---|
| `20260301200000-CreateStoreEvents.ts` | `CreateStoreEvents1709301200000` | `CreateStoreEvents20260301200000` |
| `20260303100000-CreateStoreLibraryItems.ts` | `CreateStoreLibraryItems1709303100000` | `CreateStoreLibraryItems20260303100000` |
| `20260304100000-CreateStoreLibraryItems.ts` | `CreateStoreLibraryItems1709304100000` | `CreateStoreLibraryItems20260304100000` |
| `20260304120000-CreateStoreQrCodes.ts` | `CreateStoreQrCodes1709304120000` | `CreateStoreQrCodes20260304120000` |
| `20260304130000-CreateStoreQrScanEvents.ts` | `CreateStoreQrScanEvents1709304130000` | `CreateStoreQrScanEvents20260304130000` |
| `20260309100000-CreateServiceProducts.ts` | `CreateServiceProducts1709309100000` | `CreateServiceProducts20260309100000` |
| `20260309120000-CreateStoreAiTables.ts` | `CreateStoreAiTables1709309120000` | `CreateStoreAiTables20260309120000` |
| `20260309180000-CreateStoreAiProductTables.ts` | `CreateStoreAiProductTables1709309180000` | `CreateStoreAiProductTables20260309180000` |
| `20260309200000-CreateProductAiTags.ts` | `CreateProductAiTags1709309200000` | `CreateProductAiTags20260309200000` |
| `20260309300000-CreateProductAiContents.ts` | `CreateProductAiContents1709309300000` | `CreateProductAiContents20260309300000` |
| `20260309400000-CreateProductOcrTexts.ts` | `CreateProductOcrTexts1709309400000` | `CreateProductOcrTexts20260309400000` |

### 6-2. 파일명 prefix ≠ 유효 이름 suffix (65)

- 62: 14자리 파일명 · 13자리 epoch class (`20260212000001-…` ~ `20260422200000-…`, 2026-02~04월 작성분) → TypeORM 순서에서 **파일명 위치가 아니라 S2 로 이동**한다.
- 2: 날짜형 13자리 파일명 · epoch class — `2026020400002-SeedForumServiceOrganizations.ts`(`…1706745602002`), `2026020700001-NullifyForumPostOrgIdForCommunity.ts`(`…1706745607001`).
- 1: `4000000000003-AddReasonAndReapplyCooldownToEnrollments.ts`(`…1731129600000`).
- 특이: `20260403500000-CleanupKpaForumPostsV2.ts` 의 유효 이름은 `CleanupKpaForumPostsV2_1712192400000`(밑줄 포함) — 운영 이력도 동일하므로 문제 없음.

전체 65행은 **부록 B**.

### 6-3. 날짜형 13자리 (S3, 30)

`2025011100001` · `2026011700001`‥`2026052100001`: 파일명 = class suffix 이지만 값이 2.0e12 대라 **모든 epoch 형(1.7e12)보다 뒤**, 즉 빈 DB 에서 맨 마지막에 실행된다. 여기에는 `CreateSignageCoreEntities`, `CreatePlatformServicesCatalog`, `CreateUserServiceEnrollments`, `CreateAppRegistryTable` 등 다른 migration 이 의존하는 테이블 생성이 포함된다.

---

## 7. 운영에만 남은 30개 — 확정 목록

30개 전부 저장소 git 이력의 삭제 커밋으로 추적되었다(추정 없음). 삭제 커밋: **A** `d8e18cd84` 2026-01-08 "remove 124 unexecuted migrations"(11개 — 커밋 메시지는 "미실행" 이라 했으나 운영 이력 id 7‥17 에 **실행 완료로 남아 있다**) · **B** `1cb87e185` 2026-01-20 (3) · **C** `264348527` 2026-05-16 Revert (1) · **D** `86a08b420` 2026-05-24 `WO-O4O-KPA-TEMP-SEED-BOOTSTRAP-DEPRECATION-V1` (15).

| 운영 id | name | 삭제 파일 | 삭제 | 종류 | up() 이 만든/바꾼 객체 | 현재 운영 상태 | 현 저장소 의존 |
|---:|---|---|---|---|---|---|---|
| 7 | `AddProductCommissionColumns1732422000000` | `1732422000000-AddProductCommissionColumns.ts` | A | DDL(addColumn) | `products` 4 컬럼 (`hasTable` guard) | `products` 테이블 부재 → 당시에도 no-op | 없음 |
| 8 | `CreateCMSTablesV2_1733302800000` | `1733302800000-CreateCMSTablesV2.ts` | A | DDL | `custom_fields` `custom_post_types` `pages` `views` | 4개 모두 `20270412000000-DropRetiredCmsCptResidueTables` 로 DROP 됨 | drop migration 만(부재 시 skip) |
| 9 | `CreateMembershipYaksaTables1733458800000` | `1733458800000-CreateMembershipYaksaTables.ts` | A | DDL+seed | `yaksa_members` `yaksa_member_affiliations` `yaksa_member_categories` `yaksa_member_verifications` `yaksa_membership_roles` `yaksa_membership_years` | **6개 모두 운영에 존재** | migration 0 · entity 0 (참조: `bootstrap/register-routes.ts` 문자열, `scripts/migrate-member-to-user-fields.ts`) |
| 10 | `ExtendYaksaMemberFields1733600000000` | `1733600000000-ExtendYaksaMemberFields.ts` | A | DDL(addColumns) | `yaksa_members` 컬럼 확장 | 존재 | 없음 |
| 11 | `CreateCosmeticsSchema1735470000000` | `1735470000000-CreateCosmeticsSchema.ts` | A | DDL | `CREATE SCHEMA cosmetics` + `cosmetics.cosmetics_brands` `_lines` `_products` `_price_policies` `_product_logs` `_price_logs` | **6개 모두 운영에 존재**(cosmetics 스키마 12 테이블 중 6) | entity 12(`schema: 'cosmetics'`) · migration `20270220000000-AddCosmeticsProductInfoColumns`, `20260304100000-CleanupProductDemoData` · 스키마 자체는 `20260212000001-CreateCosmeticsStoreTables` 가 `IF NOT EXISTS` 로 재생성 |
| 12 | `SeedCosmeticsData1735470000001` | `1735470000001-SeedCosmeticsData.ts` | A | DML | cosmetics seed INSERT | 데이터 | 없음 |
| 13 | `CreateYaksaTables1735563600000` | `1735563600000-CreateYaksaTables.ts` | A | DDL | `yaksa_categories` `yaksa_posts` `yaksa_post_logs` | **3개 모두 운영에 존재** | 없음 |
| 14 | `SeedYaksaData1735563600001` | `1735563600001-SeedYaksaData.ts` | A | DML | yaksa seed | 데이터 | 없음 |
| 15 | `CreateGlycopharmTables1735564800000` | `1735564800000-CreateGlycopharmTables.ts` | A | DDL | `glycopharm_pharmacies` `glycopharm_products` `glycopharm_product_logs` | 3개 모두 부재 — `20260221100000-…PhaseC`(pharmacies 1차 DROP) → `20260318120000-EnsureGlycopharmPharmaciesTable`(재생성) → `20270326000000-DropGlycopharmService`(최종 DROP) | **14개 migration 이 `glycopharm_pharmacies` 참조** — 파일명 순 replay 의 최초 실패 지점(§9-E2) |
| 16 | `SeedGlycopharmData1735564800001` | `1735564800001-SeedGlycopharmData.ts` | A | DML | glycopharm seed | 데이터/테이블 부재 | 없음 |
| 17 | `CreateGlucoseViewTables1735566000000` | `1735566000000-CreateGlucoseViewTables.ts` | A | DDL | `glucoseview_vendors` `glucoseview_view_profiles` `glucoseview_connections` | 부재 — `20260600000000-DropGlucoseviewAndCgmTables` 로 DROP | 16개 migration 이 `glucoseview_*` 참조 |
| 29 | `SeedProductionTestAccounts1737000000000` | `1737000000000-SeedProductionTestAccounts.ts` | D | DML | `users` INSERT(테스트 계정) | 데이터 | 없음 |
| 32 | `SeedAdditionalTestAccounts1737100200000` | `1737100200000-SeedAdditionalTestAccounts.ts` | D | DML | `users` | 데이터 | 없음 |
| 43 | `UpdateKpaTestAccountPasswords1737400000000` | `1737400000000-UpdateKpaTestAccountPasswords.ts` | B | DML | `users` UPDATE | 데이터 | 없음 |
| 44 | `UpdateGlucoseViewTestAccountPasswords1737400100000` | `1737400100000-UpdateGlucoseViewTestAccountPasswords.ts` | B | DML | `users` UPDATE | 데이터 | 없음 |
| 45 | `CreateTestAccounts1737400200000` | `1737400200000-CreateTestAccounts.ts` | B | DML | `users` | 데이터 | 없음 |
| 52 | `UpdateTestAccountEmailsToO4O1737200000000` | `1737200000000-UpdateTestAccountEmailsToO4O.ts` | D | DML | `users` UPDATE | 데이터 | 없음 |
| 55 | `UpdateOperatorPasswords1769408012358` | `1769408012358-UpdateOperatorPasswords.ts` | D | DML | `users` | 데이터 | 없음 |
| 89 | `SeedKpaTestAccounts20260207100000` | `20260207100000-SeedKpaTestAccounts.ts` | D | DML | `users` `kpa_members` `kpa_organizations` | 데이터 | 없음 |
| 105 | `CreateKpaSocietyOperatorAccount20260212200000` | `20260212200000-CreateKpaSocietyOperatorAccount.ts` | D | DML | `users` | 데이터 | 없음 |
| 132 | `CreateKpaAdminAccount20260216200001` | `20260216200001-CreateKpaAdminAccount.ts` | D | DML | `users` `kpa_members` | 데이터 | 없음 |
| 133 | `AddYaksa01ToKpaA20260216200002` | `20260216200002-AddYaksa01ToKpaA.ts` | D | DML | `kpa_members` | 데이터 | 없음 |
| 328 | `SeedKpaOperatorTestData1712203200001` | `20260403900000-SeedKpaOperatorTestData.ts` | D | DML | `users` `kpa_*` `role_assignments` `service_memberships` `product_approvals` … | 데이터 | 없음 (파일명 14자리·class 13자리 유형) |
| 331 | `SeedKpaOrgJoinAndForumActivity20260404000100` | `20260404000100-SeedKpaOrgJoinAndForumActivity.ts` | D | DML | `kpa_organization_join_requests` | 데이터 | 없음 |
| 334 | `SeedKpaTestPharmacyOwnerOrgMember20260404100000` | `20260404100000-SeedKpaTestPharmacyOwnerOrgMember.ts` | D | DML | `organization_members` | 데이터 | 없음 |
| 339 | `SeedPhamacy1OrgMember20260405100000` | `20260405100000-SeedPhamacy1OrgMember.ts` | D | DML | `organization_members` | 데이터 | 없음 |
| 401 | `FixPhamacy1OrgMemberAlignment20260419500000` | `20260419500000-FixPhamacy1OrgMemberAlignment.ts` | D | DML | `organization_members` UPDATE | 데이터 | 없음 |
| 402 | `EnsurePhamacy1OrgMemberForKpa20260419600000` | `20260419600000-EnsurePhamacy1OrgMemberForKpa.ts` | D | DML | `organization_members` | 데이터 | 없음 |
| 443 | `SeedKCosmeticsStoreOwnerTestAccount20260501100000` | `20260501100000-SeedKCosmeticsStoreOwnerTestAccount.ts` | D | DML | `users` `organizations` `organization_members` `organization_service_enrollments` `role_assignments` `service_memberships` `cosmetics.*` | 데이터 | 없음 |
| 483 | `ServiceMembershipCanonicalKeyDataMigration20260928000000` | `20260928000000-ServiceMembershipCanonicalKeyDataMigration.ts` | C | DML | `service_memberships` UPDATE (revert 됨) | 데이터 | 없음 |

집계: DDL 8 (id 7·8·9·10·11·13·15·17) · DML 22.

---

## 8. 30개가 현재 스키마 재현에 필요한가

| 분류 | 개수 | 대상 | 판정 |
|---|---:|---|---|
| **현 소스가 의존하는 테이블의 유일한 생성 출처** | 1 | id 11 `CreateCosmeticsSchema` (cosmetics 핵심 6 테이블) | **필요** — 현 저장소 어디에도 `cosmetics_brands/_lines/_products/_price_policies/_product_logs/_price_logs` 의 CREATE 가 없다. entity 12개·후속 migration 2개가 의존 |
| 최종 스키마에는 없지만 **chain 재생에는 필요** | 2 | id 15 Glycopharm 3 테이블 · id 17 GlucoseView 3 테이블 | 후속 migration 14·16개가 참조하고 나중에 DROP 됨. "chain 복구" 방향에서만 필요, 최종 스키마 재현에는 불필요 |
| 운영에 **존재하지만 소비처 없음** | 3 | id 9·10·13 yaksa 9 테이블 | 현 소스 entity/migration 참조 0. 운영 스키마 "그대로" 재현에는 필요하나 현행 기능 재현에는 불필요 → 처분은 별도 WO(본 IR 범위 밖) |
| 이미 DROP 되었거나 no-op | 2 | id 8 CMS V2 4 테이블(20270412 로 DROP) · id 7 `products` 컬럼(테이블 부재) | 불필요 |
| DML(seed·테스트 계정·데이터 정정) | 22 | 나머지 | 스키마 재현 불필요. 테스트 계정은 `WO-O4O-KPA-TEMP-SEED-BOOTSTRAP-DEPRECATION-V1` 로 폐기가 확정된 축이며, 데이터 재현은 별도 정책 |

결론: **30개를 복원하지 않고도 현 소스로 만들 수 없는 스키마 요소는 cosmetics 핵심 6 테이블(+ 참고: yaksa 9 테이블)** 이고, 그것조차 §9-E4 가 보여주듯 30개를 전부 되살려도 운영 스키마는 재현되지 않는다. 따라서 "필요/불필요" 는 **어느 방향(§14)을 고르느냐에 종속**된다.

---

## 9. 빈 DB replay 실험 (격리 DB · 실패해도 계속)

| 실험 | 순서 | 대상 | 성공 | 실패 | 최초 실패 | `roles` | public 테이블 수(종료 시) |
|---|---|---|---:|---:|---|---|---:|
| **E1** | TypeORM 계산 순(= 실 배포 job) | 644 | 344 | **300** | #1 `20260205033223-RolePrefixMigrationFoundation` — `relation "users" does not exist` | 미생성 | 210 |
| **E2** | 파일명 순 | 644 | 515 | **129** | #6 `1736400000000-AddEnabledServicesToPharmacy` — `relation "glycopharm_pharmacies" does not exist` | 미생성 | 234 |
| **E3** | 운영 실제(id) 순 · 현 저장소 644만 | 644 | 549 | **95** | #7(운영 id 18) 동일 파일 · 동일 오류 | 미생성 | 236 |
| **E4** | 운영 실제(id) 순 · **삭제 30개 원본(git 이력) 포함 674** | 674 | 628 | **46** | #29 `1737000000000-SeedProductionTestAccounts` — `column "domain" of relation "users" does not exist` | **미생성** | 267 |

운영 public 테이블 수는 272(+cosmetics 12 · neture 스키마). E4 조차 267 에서 멈추고 `roles` 가 없다.

### 9-1. E1 (실 배포 경로) 연쇄 실패 구조

- 1~7번(2026-02-05~06 role prefix 계열)은 전부 `users` 부재로 실패. 첫 성공은 8번째 `20260206190000-CreateKpaFoundationTables`. `users` 는 501번째에야 생성된다.
- 실패 300 의 원인 분류: relation 부재 287 · column 부재 4 · 트랜잭션 abort(같은 migration 내 선행 문 실패) 1 · migration 자체 guard/ABORT 8.
- 부재 relation 상위: `users` 36 · `product_masters` 27 · `organizations` 25 · `role_assignments` 15 · `service_memberships` 15 · `neture_suppliers` 13 · `market_trials` 11 · `supplier_product_offers` 10 · `cms_contents` 8 · `roles` 8 · `forum_category` 7 · `product_categories` 6 · (총 66종).
- 즉 S1 안에서도 "테이블 생성 migration 이 그 테이블을 고치는 migration 보다 뒤" 인 경우가 다수이며, 근본 원인은 S2·S3(기초 테이블 생성)가 S1 뒤로 밀린 것이다. 전체 300행은 **부록 C**.

### 9-2. E2·E3 — 순서를 고쳐도 남는 실패

파일명 순(E2)·운영 순(E3)으로 바꾸면 실패가 129·95 로 줄지만, 첫 실패는 둘 다 **삭제된 `CreateGlycopharmTables` 가 만들던 테이블** 이다. 이후 실패의 상위 원인: `organizations` · `service_memberships` · `roles` · `forum_category` · `glycopharm_pharmacies` · `users`(컬럼) · `store_tablet_*` … 전체는 **부록 D · E**.

### 9-3. E4 — history chain 을 원본 그대로 재생해도 남는 46 (전수)

| 원인 | 건수 | 해당 순번(운영 id) |
|---|---:|---|
| `users` 의 `createdAt`/`updatedAt`/`domain` 컬럼 부재 | 15 | 29 32 45 52 55 89 95 105 132 187 253 254 328 442 477 |
| `roles` 부재 | 12 | 259(`ExtendRolesTable`) 311 312 421 619 629 634 643 644 651 656 674(`BaselineRbacAndAccountTables` 의 STOP guard) |
| `forum_category` 부재 | 7 | 67 68 262 271 337 361 407 |
| `forum_comment` / `forum_post` 부재 | 4 | 65 324 / 417 435 |
| `users.phone` 부재(`u.phone`) | 3 | 298 469 551 |
| `glycopharm_products.origin_country` 부재 | 2 | 348 349 |
| migration 자체 data guard(ABORT/Validation) | 2 | 287(`SeedNetureOrgEnrollments` — KPA 조직 없음) 471(`FixKpaOrphanRoleCleanup`) |
| 트랜잭션 abort(선행 문 실패) | 1 | 434(`ForumFullCategoryRemoval`) |

전체 46행은 **부록 F**.

### 9-4. 운영 스키마의 migration 외 기원 (읽기 전용 실측)

- `1700000000000-CreateUsersTable` 은 `CREATE TABLE IF NOT EXISTS "users"` 에 **`created_at`/`updated_at`(snake)** 를 정의한다. 운영 `users` 에는 `created_at` 과 **`createdAt`·`updatedAt`·`domain`·`phone`** 이 함께 있다 → 운영 `users` 는 이 migration 이전에 entity synchronize 로 만들어졌고 migration 은 no-op 였다.
- `forum_post`·`forum_comment` 는 운영에 존재하지만 CREATE 하는 migration 이 현존 644·삭제 30 어디에도 없다(`forum_category` 는 이후 `ForumFullCategoryRemoval` 로 제거).
- `roles` — 선행 IR 과 동일(생성 migration 없음). `glycopharm_products.origin_country` 도 동일 유형.
- 따라서 **"과거 history 를 복구해서 chain 을 완성한다" 는 방향은 성립하지 않는다.** 복구할 원본이 존재하지 않고, 만들면 그것이 곧 금지된 "누락 migration 추정 복원" 이다.

---

## 10. 기존 migration rename 없이 정렬 문제를 해결하는 방법 (평가)

| # | 방법 | rename/이력 변경 | 빈 DB 재현 | 운영 incremental | 평가 |
|---|---|---|---|---|---|
| R1 | `migrate.ts` 가 TypeORM `runMigrations()` 대신 **자체 순서(파일명 순 또는 명시 manifest)** 로 migration 을 하나씩 `up()`+이력 INSERT | 없음 (이름 그대로 기록) | E2 와 동일 → 여전히 FAIL(129) | pending 이 신규뿐이라 결과 동일. 13/14자리 혼입 배포의 순서 위험은 제거 | 정렬 함정은 없애지만 재현 문제는 못 푼다. 배포 job 코드 변경이므로 별도 WO |
| R2 | **신규 migration 규약 가드**(CI 스크립트): 14자리 · 직전 +1 · class == `name` == 파일명 prefix · 13자리 금지 | 없음 | 무관 | 미래 혼입 차단 | 비용 낮음 · 기존 파일 무변경 · 권고 |
| R3 | **빈 DB bootstrap 을 migration chain 과 분리**: 기준 시점 스키마(운영 `pg_dump --schema-only`, `roles` 포함) 적용 + `typeorm_migrations` 에 이력 이름 674개(또는 현존 644개) 기록 → 이후는 incremental 그대로 | 없음 | **가능** (재생이 아니라 이식) | 무변경 | 유일하게 빈 DB 를 성립시키는 경로 = 후보 ②·③ |
| R4 | 13자리 class 에 14자리 `name` 속성 부여 / 파일 rename | **이력 이름 변경** | — | 운영 pending 재실행 사고 | **금지** (사용자 확정) |
| R5 | TypeORM 버전 변경 | — | `substr(-13)` 로직은 0.3.x 전 버전 동일 | — | 효과 없음 |
| R6 | `typeorm_migrations` 의 timestamp 를 재계산해 넣기 | **이력 수정** | 정렬은 name 기준 계산이라 무의미 | — | **금지** · 효과도 없음 |

정렬 문제 자체는 **운영에서는 현재 실해가 없고**(pending 0 · 규약상 신규는 전부 14자리), 빈 DB 에서는 정렬을 고쳐도(R1) 재현이 안 되므로, 정렬 교정은 R2(예방)로 충분하고 본질은 R3 이다.

---

## 11. baseline / snapshot migration 으로 과거 history 대체 가능성

- **가능 조건**: (i) snapshot 은 "현재 운영 스키마" 를 원천으로 해야 한다(현 소스 migration 을 재생해서는 만들 수 없음 — §9). (ii) snapshot 적용 후 `typeorm_migrations` 에 **기존 이름 그대로** 이력을 기록해야 이후 incremental 이 pending 을 0 으로 본다. (iii) 기존 644 파일은 그대로 두고 **빈 DB 에서만 skip** 되도록 해야 한다 — 이는 이력 이름을 미리 INSERT 하면 TypeORM 의 `find(name)` 만으로 달성된다(파일 수정 불필요).
- **선례**: `20270413000000-BaselineRbacAndAccountTables`(5 테이블, 운영 no-op ×5) — 다만 이 방식(테이블별 `IF NOT EXISTS` baseline migration 을 chain 안에 넣는 것)은 `roles` 에서 이미 막혔고(E4 #674 STOP guard), chain 안에 두면 정렬 함정(S1 500번째)에 그대로 노출된다. 즉 **"chain 안의 baseline migration" 은 부분 해법이고 "chain 밖의 bootstrap snapshot" 이 온전한 해법**이다.
- **형태 선택지**(후속 WO 판단): (a) 저장소에 `bootstrap/schema-baseline-<YYYYMMDD>.sql`(pg_dump 산출물) + 이력 seed SQL 을 두고 `migrate.ts` 또는 별도 entry 가 "typeorm_migrations 가 비어 있을 때만" 적용 — 코드 변경 소 · 대규모 snapshot **파일** 작성이므로 현재 금지 항목 해제가 필요 (b) 운영 DB 의 `pg_dump` 를 운영 절차(SETUP/RUNBOOK)로만 정의하고 저장소에는 두지 않음 — 저장소 무변경이나 재현성이 절차에 의존.
- **대체 불가 영역**: DML 22개가 만든 데이터(테스트 계정 등)는 snapshot 에 넣지 않는 것이 이미 확정된 정책과 일치한다. `roles` 24행 등 최소 seed 는 후속 ④ WO 범위.

---

## 12. 빈 DB bootstrap 과 운영 incremental 분리 필요성

**필요하다 (YES).** 근거: (1) 같은 644개 파일이 운영에서는 pending 0 이고 빈 DB 에서는 1번째부터 실패한다 — 한 경로가 두 목적을 동시에 만족할 수 없다. (2) 운영 스키마의 일부(`users` camel 컬럼 · `forum_*` · `roles` · `origin_country` · cosmetics 6 · yaksa 9)는 migration 으로 만들어진 적이 없어 chain 만으로는 영원히 재현되지 않는다. (3) 사용자 확정 금지(rename·이력 수정·추정 복원) 아래에서 빈 DB 를 성립시키는 유일한 경로는 R3 이며, 이는 정의상 incremental 과 다른 진입점이다. (4) 분리해 두면 정렬 함정(S1→S2→S3)은 빈 DB 경로에서 사라지고, 운영 경로에는 R2 가드만으로 충분하다.

분리 시 **운영 서비스 변경은 없다** — 운영 DB 는 이미 이력 674개를 가진 "incremental 경로" 상태이고, bootstrap 경로는 빈 DB(로컬·격리 검증·재해복구)에만 적용된다.

---

## 13. 판정

| 라벨 | 값 | 근거 |
|---|---|---|
| `REPO_MIGRATION_FILES` | 644 (13자리 82 / 14자리 562) | §2 |
| `PROD_MIGRATION_HISTORY` | 677행 / 674 name / id 결번 1 / 중복 3쌍 | §3 |
| `PROD_PENDING` | 0 | §4 |
| `PROD_ONLY_DELETED_MIGRATIONS` | 30 (전부 삭제 커밋 추적) | §7 |
| `TYPEORM_EFFECTIVE_ORDER` | S1(500) → S2(114) → S3(30); 파일명 순과 67,402 쌍 역전 | §5 |
| `CLASS_NAME_PROPERTY_MISMATCH` | 11 (실행·이력 무해) | §6-1 |
| `FILENAME_EFFECTIVE_NAME_MISMATCH` | 65 | §6-2 |
| `FULL_FRESH_DATABASE_REPLAY` | **FAIL** (E1 300 / E2 129 / E3 95) | §9 |
| `HISTORY_CHAIN_RECOVERABLE` | **NO** (E4: 원본 30개 포함해도 46 실패 · `roles` 미생성) | §9-3 · §9-4 |
| `DELETED_30_REQUIRED_FOR_CURRENT_SCHEMA` | 조건부 — chain 방향에서만 3(id 11·15·17) 필요, snapshot 방향에서는 0 | §8 |
| `ORDERING_RISK_ON_PROD_INCREMENTAL` | LOW (pending 0 · 신규는 14자리 규약) — 가드 부재는 잔여 위험 | §5-5 |
| `ORDERING_RISK_ON_FRESH_DATABASE` | BLOCKING | §9-1 |
| `RENAME_FREE_ORDERING_FIX_EXISTS` | YES (R1/R2) — 단 재현 문제는 R3 없이는 해결 불가 | §10 |
| `BOOTSTRAP_INCREMENTAL_SEPARATION_REQUIRED` | **YES** | §12 |
| `ROLES_TABLE_CREATION_OWNER` | NONE (선행 IR 재확정 — 4개 실험 모두 미생성) | §9 |

---

## 14. 후속 WO 방향 — 후보 3안의 성립 여부 (결정은 사용자)

| 후보 | 성립 | 근거 |
|---|---|---|
| ① 삭제된 history chain 복구 | **불성립** | 복구할 원본이 없는 객체(§9-4)가 존재. 30개 원본을 전부 넣어도 FAIL(E4). 만들어 넣으면 "추정 복원" |
| ② 빈 DB bootstrap + 운영 incremental 분리 | **성립** | R3. 운영 무변경 · rename 0 · 이력 수정 0 |
| ③ 기준 시점 snapshot + 이후 replay | **성립 (②의 구현 형태)** | snapshot = 기준 시점 운영 스키마, replay = 기준 시점 이후 incremental. ②와의 차이는 snapshot 을 저장소 파일로 두는지(대규모 snapshot 작성 금지 해제 필요)와 기준 시점을 어디로 잡는지(현재 = 이력 id 678 이후) 뿐 |

후속 WO 가 정해야 할 것: 기준 시점(id 678 = `BaselineRbacAndAccountTables20270413000000` 직후 권장 — 그 뒤 pending 0), snapshot 의 원천(운영 `pg_dump --schema-only`) 과 보관 위치, 이력 seed 방식(674 전부 vs 현존 644 — 30개 이름도 넣어야 운영과 동형), `roles` 등 최소 seed 의 소속(④ WO), yaksa 9 테이블·`users` camel/snake 중복 컬럼 등 dead 스키마의 처분 여부(별도 WO · snapshot 에 그대로 담을지).

---

## 15. 중지 조건 · 범위 밖 발견 (보고만)

- 운영 `typeorm_migrations` 중복 3쌍 · id 479 결번 — 수정하지 않음(금지). 원인 확정 불가.
- `d8e18cd84`(2026-01-08) 커밋 메시지 "124 unexecuted" 중 11개는 실제로 운영 실행 완료였다 — 기록 정정은 불가(이력 재작성 금지), 본 IR 이 사실을 남긴다.
- yaksa 9 테이블: 운영 존재 · 소비처 0 → 별도 처분 WO 후보(본 IR 은 판단하지 않음).
- `users` 에 `created_at` 과 `createdAt`/`updatedAt` 이 공존 — 별도 IR/WO 후보(선행 IR 의 roles camel/snake 쌍과 같은 유형).
- 배포 job `--max-retries=1` 과 migration 중복 실행 흔적 — CI/인프라 변경 필요 → 중지 조건, 보고만.

## 16. 문서 정합

- 발견 1건: [`PRODUCTION-MIGRATION-STANDARD`](../baseline/operations/PRODUCTION-MIGRATION-STANDARD.md) 의 "Need to Skip a Migration" 예시가 `INSERT INTO migrations (…)` 로 실제 테이블명 `typeorm_migrations` 와 다르고, 파일명·class·`name` 규약(14자리 순차 카운터 · class == name == prefix)과 TypeORM `substr(-13)` 정렬 특성이 기준 문서 어디에도 없다 → **별도 WO 제안 1건** (기준 문서이므로 인라인 수정하지 않음, CLAUDE.md §16-2).
- SUPERSEDED 표기 0 · 링크 수정 0.

---

## 부록 G. 실험 재현 정보

- 실행기: `apps/api-server/dist/__ir2_replay.mjs`(git ignore 영역 · 저장소 미추적) — `node dist/__ir2_replay.mjs <db> <typeorm|file|prodid> <out.tsv> [삭제30 컴파일 디렉터리]`. 정렬 규칙은 TypeORM `getMigrations()` 와 동일하게 `parseInt(name.substr(-13))` stable sort.
- 삭제 30개 원본은 `git show <삭제커밋>^:apps/api-server/src/database/migrations/<파일>` 로 추출해 별도 디렉터리에 컴파일했고 저장소에 되돌리지 않았다.
- 운영 이력 원본: `SELECT id, timestamp, name FROM typeorm_migrations ORDER BY id` (677행, 세션 scratch 에만 보관).

---

## 부록 A. TypeORM 계산 순서 전체 (644)

<details><summary>펼치기 — 순위 · 계산 timestamp · 파일명 · 유효 이름 · 운영 id · 파일명 순위 · 운영 실행 순위</summary>

| TypeORM 순위 | 계산 timestamp | 파일명 | TypeORM 유효 이름 | 운영 id | 파일명 순위 | 운영 순위 |
|---:|---:|---|---|---:|---:|---:|
| 1 | 260205033223 | `20260205033223-RolePrefixMigrationFoundation.ts` | `RolePrefixMigrationFoundation20260205033223` | 81 | 74 | 63 |
| 2 | 260205035000 | `20260205035000-ConvertRolesToArrayType.ts` | `ConvertRolesToArrayType20260205035000` | 82 | 75 | 64 |
| 3 | 260205040103 | `20260205040103-KpaRolePrefixMigration.ts` | `KpaRolePrefixMigration20260205040103` | 83 | 76 | 65 |
| 4 | 260205060000 | `20260205060000-NetureRolePrefixMigration.ts` | `NetureRolePrefixMigration20260205060000` | 84 | 77 | 66 |
| 5 | 260205070000 | `20260205070000-Phase4MultiServiceRolePrefixMigration.ts` | `Phase4MultiServiceRolePrefixMigration20260205070000` | 85 | 78 | 67 |
| 6 | 260205104038 | `20260205104038-AddKpaAuthFields.ts` | `AddKpaAuthFields20260205104038` | 80 | 79 | 62 |
| 7 | 260206100000 | `20260206100000-SetDefaultNameForExistingUsers.ts` | `SetDefaultNameForExistingUsers20260206100000` | 86 | 81 | 68 |
| 8 | 260206190000 | `20260206190000-CreateKpaFoundationTables.ts` | `CreateKpaFoundationTables20260206190000` | 87 | 82 | 69 |
| 9 | 260206200000 | `20260206200000-AddMembershipTypeToKpaMember.ts` | `AddMembershipTypeToKpaMember20260206200000` | 88 | 83 | 70 |
| 10 | 260207200000 | `20260207200000-SeedKpaTestForums.ts` | `SeedKpaTestForums20260207200000` | 90 | 86 | 71 |
| 11 | 260207300000 | `20260207300000-SeedKpaTestPostsComments.ts` | `SeedKpaTestPostsComments20260207300000` | 91 | 87 | 72 |
| 12 | 260207400000 | `20260207400000-SeedKpaSignageContent.ts` | `SeedKpaSignageContent20260207400000` | 92 | 88 | 73 |
| 13 | 260207500000 | `20260207500000-SeedKpaBannerContent.ts` | `SeedKpaBannerContent20260207500000` | 93 | 89 | 74 |
| 14 | 260207700000 | `20260207700000-SeedKpaBenefitContent.ts` | `SeedKpaBenefitContent20260207700000` | 94 | 90 | 75 |
| 15 | 260209000001 | `20260209000001-CreateGlycopharmCustomerRequests.ts` | `CreateGlycopharmCustomerRequests20260209000001` | 96 | 94 | 77 |
| 16 | 260209000002 | `20260209000002-CreateGlycopharmEvents.ts` | `CreateGlycopharmEvents20260209000002` | 97 | 95 | 78 |
| 17 | 260210000001 | `20260210000001-AddContentViewCountAndRecommendations.ts` | `AddContentViewCountAndRecommendations20260210000001` | 98 | 96 | 79 |
| 18 | 260210000002 | `20260210000002-CreateGlycopharmRequestActionLogs.ts` | `CreateGlycopharmRequestActionLogs20260210000002` | 99 | 97 | 80 |
| 19 | 260212000001 | `20260212000001-CreateCosmeticsStoreTables.ts` | `CreateCosmeticsStoreTables20260212000001` | 106 | 99 | 86 |
| 20 | 260212000002 | `20260212000002-AddStoreAttributionToEcommerceOrders.ts` | `AddStoreAttributionToEcommerceOrders20260212000002` | 107 | 100 | 87 |
| 21 | 260212000003 | `20260212000003-CreateCosmeticsStorePlaylistTables.ts` | `CreateCosmeticsStorePlaylistTables20260212000003` | 108 | 102 | 88 |
| 22 | 260212100000 | `20260212100000-SeedKpaOrganizationsFullHierarchy.ts` | `SeedKpaOrganizationsFullHierarchy20260212100000` | 102 | 103 | 83 |
| 23 | 260213000001 | `20260213000001-AddSoftDeleteToCosmeticsStoreMembers.ts` | `AddSoftDeleteToCosmeticsStoreMembers20260213000001` | 109 | 104 | 89 |
| 24 | 260213100000 | `20260213100000-CreatePhysicalStoreTables.ts` | `CreatePhysicalStoreTables20260213100000` | 110 | 105 | 90 |
| 25 | 260214000004 | `20260214000004-CreateKpaOperatorAuditLogs.ts` | `CreateKpaOperatorAuditLogs20260214000004` | 114 | 109 | 94 |
| 26 | 260214000005 | `20260214000005-AddBranchSoftDelete.ts` | `AddBranchSoftDelete20260214000005` | 115 | 110 | 95 |
| 27 | 260215000001 | `20260215000001-CreateCareKpiSnapshots.ts` | `CreateCareKpiSnapshots20260215000001` | 116 | 111 | 96 |
| 28 | 260215000002 | `20260215000002-CreateCareCoachingSessions.ts` | `CreateCareCoachingSessions20260215000002` | 117 | 112 | 97 |
| 29 | 260215000003 | `20260215000003-AddStorefrontConfig.ts` | `AddStorefrontConfig20260215000003` | 118 | 113 | 98 |
| 30 | 260215000010 | `20260215000010-AddKpaStorefrontConfig.ts` | `AddKpaStorefrontConfig20260215000010` | 119 | 114 | 99 |
| 31 | 260215000020 | `20260215000020-CreateOrganizationProductApplications.ts` | `CreateOrganizationProductApplications20260215000020` | 120 | 115 | 100 |
| 32 | 260215000021 | `20260215000021-CreateOrganizationProductListings.ts` | `CreateOrganizationProductListings20260215000021` | 121 | 116 | 101 |
| 33 | 260215100001 | `20260215100001-AddPharmacyIdToCareKpiSnapshots.ts` | `AddPharmacyIdToCareKpiSnapshots20260215100001` | 128 | 117 | 108 |
| 34 | 260215100002 | `20260215100002-AddPharmacyIdToCareCoachingSessions.ts` | `AddPharmacyIdToCareCoachingSessions20260215100002` | 129 | 118 | 109 |
| 35 | 260215200001 | `20260215200001-CreateOrganizationChannels.ts` | `CreateOrganizationChannels20260215200001` | 122 | 119 | 102 |
| 36 | 260215200002 | `20260215200002-CreateOrganizationProductChannels.ts` | `CreateOrganizationProductChannels20260215200002` | 123 | 120 | 103 |
| 37 | 260215200003 | `20260215200003-SeedDefaultB2CChannels.ts` | `SeedDefaultB2CChannels20260215200003` | 124 | 121 | 104 |
| 38 | 260215200004 | `20260215200004-AddSalesLimitToProductChannels.ts` | `AddSalesLimitToProductChannels20260215200004` | 125 | 122 | 105 |
| 39 | 260215300001 | `20260215300001-AddFkListingOrganization.ts` | `AddFkListingOrganization20260215300001` | 126 | 123 | 106 |
| 40 | 260215300002 | `20260215300002-AddFkPharmacyOrganization.ts` | `AddFkPharmacyOrganization20260215300002` | 127 | 124 | 107 |
| 41 | 260216000001 | `20260216000001-CreateO4oAssetSnapshots.ts` | `CreateO4oAssetSnapshots20260216000001` | 130 | 125 | 110 |
| 42 | 260216100001 | `20260216100001-AddUniqueConstraintAssetSnapshots.ts` | `AddUniqueConstraintAssetSnapshots20260216100001` | 131 | 126 | 111 |
| 43 | 260216100001 | `20260216100001-CreateActionLogs.ts` | `CreateActionLogs20260216100001` | 134 | 127 | 112 |
| 44 | 260218000001 | `20260218000001-AddSellerOrganizationIdToCheckoutOrders.ts` | `AddSellerOrganizationIdToCheckoutOrders20260218000001` | 135 | 128 | 113 |
| 45 | 260219000001 | `20260219000001-CreateKpaStoreAssetControls.ts` | `CreateKpaStoreAssetControls20260219000001` | 136 | 129 | 114 |
| 46 | 260219000002 | `20260219000002-AddV2ColumnsToKpaStoreAssetControls.ts` | `AddV2ColumnsToKpaStoreAssetControls20260219000002` | 137 | 130 | 115 |
| 47 | 260219000003 | `20260219000003-CreateKpaStoreContents.ts` | `CreateKpaStoreContents20260219000003` | 138 | 131 | 116 |
| 48 | 260219000004 | `20260219000004-PharmacyIdentityRealign.ts` | `PharmacyIdentityRealign20260219000004` | 139 | 132 | 117 |
| 49 | 260219000005 | `20260219000005-CreateKpaPharmacyRequests.ts` | `CreateKpaPharmacyRequests20260219000005` | 140 | 133 | 118 |
| 50 | 260219000006 | `20260219000006-MigratePharmacyJoinToIndependentTable.ts` | `MigratePharmacyJoinToIndependentTable20260219000006` | 141 | 134 | 119 |
| 51 | 260221000000 | `20260221000000-OrgServiceModelNormalizationPhaseA.ts` | `OrgServiceModelNormalizationPhaseA20260221000000` | 142 | 135 | 120 |
| 52 | 260221100000 | `20260221100000-OrgServiceModelNormalizationPhaseC.ts` | `OrgServiceModelNormalizationPhaseC20260221100000` | 143 | 136 | 121 |
| 53 | 260222000000 | `20260222000000-NetureSupplierRelationStateExtension.ts` | `NetureSupplierRelationStateExtension20260222000000` | 145 | 137 | 123 |
| 54 | 260222000000 | `20260222000000-OfficerMemberFK.ts` | `OfficerMemberFK20260222000000` | 144 | 138 | 122 |
| 55 | 260222000001 | `20260222000001-AddSnapshotPolicyColumns.ts` | `AddSnapshotPolicyColumns20260222000001` | 153 | 139 | 131 |
| 56 | 260222100000 | `20260222100000-RequestTypeNormalization.ts` | `RequestTypeNormalization20260222100000` | 146 | 141 | 124 |
| 57 | 260222200000 | `20260222200000-RemoveKpaCRolesFromUsers.ts` | `RemoveKpaCRolesFromUsers20260222200000` | 147 | 142 | 125 |
| 58 | 260222300000 | `20260222300000-CreateGlucoseViewCustomersTable.ts` | `CreateGlucoseViewCustomersTable20260222300000` | 149 | 143 | 127 |
| 59 | 260222400000 | `20260222400000-AddOrganizationIdToGlucoseViewCustomers.ts` | `AddOrganizationIdToGlucoseViewCustomers20260222400000` | 150 | 144 | 128 |
| 60 | 260222500000 | `20260222500000-AddPharmacyIdToCareCoachingSessions.ts` | `AddPharmacyIdToCareCoachingSessions20260222500000` | 151 | 145 | 129 |
| 61 | 260222600000 | `20260222600000-CreateStorePlaylistTables.ts` | `CreateStorePlaylistTables20260222600000` | 152 | 146 | 130 |
| 62 | 260222900000 | `20260222900000-GlycopharmOrgEnrollmentRepair.ts` | `GlycopharmOrgEnrollmentRepair20260222900000` | 156 | 149 | 134 |
| 63 | 260224200000 | `20260224200000-CreateStoreLocalProductTables.ts` | `CreateStoreLocalProductTables20260224200000` | 161 | 154 | 139 |
| 64 | 260224300000 | `20260224300000-HardenStoreLocalProductDomain.ts` | `HardenStoreLocalProductDomain20260224300000` | 162 | 155 | 140 |
| 65 | 260224400000 | `20260224400000-AddStoreLocalProductContentFields.ts` | `AddStoreLocalProductContentFields20260224400000` | 163 | 156 | 141 |
| 66 | 260224500000 | `20260224500000-AddEcommerceOrdersServiceKeyIndex.ts` | `AddEcommerceOrdersServiceKeyIndex20260224500000` | 164 | 157 | 142 |
| 67 | 260224600000 | `20260224600000-CreateSellerPartnerContractTable.ts` | `CreateSellerPartnerContractTable20260224600000` | 165 | 159 | 143 |
| 68 | 260225000001 | `20260225000001-AddConfigToOrganizationChannels.ts` | `AddConfigToOrganizationChannels20260225000001` | 168 | 161 | 146 |
| 69 | 260225000002 | `20260225000002-NormalizePendingBaseRightChannels.ts` | `NormalizePendingBaseRightChannels20260225000002` | 169 | 162 | 147 |
| 70 | 260225100000 | `20260225100000-CreateProductApprovalsTable.ts` | `CreateProductApprovalsTable20260225100000` | 170 | 163 | 148 |
| 71 | 260225100001 | `20260225100001-AddProductIdToOrganizationProductListings.ts` | `AddProductIdToOrganizationProductListings20260225100001` | 171 | 164 | 149 |
| 72 | 260225100002 | `20260225100002-AddServiceDistributionType.ts` | `AddServiceDistributionType20260225100002` | 172 | 165 | 150 |
| 73 | 260226000001 | `20260226000001-DropOrganizationProductApplications.ts` | `DropOrganizationProductApplications20260226000001` | 173 | 166 | 151 |
| 74 | 260226000002 | `20260226000002-DropNetureSupplierRequestTables.ts` | `DropNetureSupplierRequestTables20260226000002` | 174 | 167 | 152 |
| 75 | 260226200001 | `20260226200001-AddSupplierOnboardingColumns.ts` | `AddSupplierOnboardingColumns20260226200001` | 175 | 169 | 153 |
| 76 | 260226200002 | `20260226200002-BackfillOrganizationMembersOwner.ts` | `BackfillOrganizationMembersOwner20260226200002` | 176 | 170 | 154 |
| 77 | 260226300001 | `20260226300001-AddProductApprovalStatus.ts` | `AddProductApprovalStatus20260226300001` | 177 | 171 | 155 |
| 78 | 260226400001 | `20260226400001-AddRevokedApprovalStatus.ts` | `AddRevokedApprovalStatus20260226400001` | 178 | 172 | 156 |
| 79 | 260227000001 | `20260227000001-CreateKpaPharmacistProfiles.ts` | `CreateKpaPharmacistProfiles20260227000001` | 179 | 173 | 157 |
| 80 | 260227000002 | `20260227000002-DropUsersPharmacistColumns.ts` | `DropUsersPharmacistColumns20260227000002` | 180 | 174 | 158 |
| 81 | 260227999999 | `20260227999999-DropRoleAssignmentsRoleIdColumn.ts` | `DropRoleAssignmentsRoleIdColumn20260227999999` | 182 | 175 | 160 |
| 82 | 260228000000 | `20260228000000-BackfillRoleAssignmentsFromLegacyRole.ts` | `BackfillRoleAssignmentsFromLegacyRole20260228000000` | 183 | 176 | 161 |
| 83 | 260228000001 | `20260228000001-CleanupLegacyRoles.ts` | `CleanupLegacyRoles20260228000001` | 185 | 177 | 163 |
| 84 | 260228000001 | `20260228000001-DropLegacyRbacColumns.ts` | `DropLegacyRbacColumns20260228000001` | 184 | 178 | 162 |
| 85 | 260228000002 | `20260228000002-DropLegacyRbacColumns.ts` | `DropLegacyRbacColumns20260228000002` | 186 | 179 | 164 |
| 86 | 260228100000 | `20260228100000-AddUserConsentColumns.ts` | `AddUserConsentColumns20260228100000` | 187 | 180 | 165 |
| 87 | 260301100000 | `20260301100000-ProductMasterCoreReset.ts` | `ProductMasterCoreReset20260301100000` | 192 | 185 | 170 |
| 88 | 260301200000 | `20260301200000-CreateStoreEvents.ts` | `CreateStoreEvents20260301200000` | 194 | 186 | 172 |
| 89 | 260301200000 | `20260301200000-ProductMasterWOAlignment.ts` | `ProductMasterWOAlignment20260301200000` | 193 | 187 | 171 |
| 90 | 260301210000 | `20260301210000-CampaignCleanCore.ts` | `CampaignCleanCore20260301210000` | 195 | 188 | 173 |
| 91 | 260301300000 | `20260301300000-CsvImportBatchTables.ts` | `CsvImportBatchTables20260301300000` | 196 | 189 | 174 |
| 92 | 260301400000 | `20260301400000-TabletInterestRequests.ts` | `TabletInterestRequests20260301400000` | 197 | 190 | 175 |
| 93 | 260303100000 | `20260303100000-CreateNetureSupplierLibraryItems.ts` | `CreateNetureSupplierLibraryItems20260303100000` | 202 | 192 | 180 |
| 94 | 260303100000 | `20260303100000-CreateStoreLibraryItems.ts` | `CreateStoreLibraryItems20260303100000` | 210 | 193 | 188 |
| 95 | 260304100000 | `20260304100000-CreateStoreLibraryItems.ts` | `CreateStoreLibraryItems20260304100000` | 198 | 195 | 176 |
| 96 | 260304120000 | `20260304120000-CreateStoreQrCodes.ts` | `CreateStoreQrCodes20260304120000` | 199 | 197 | 177 |
| 97 | 260304130000 | `20260304130000-CreateStoreQrScanEvents.ts` | `CreateStoreQrScanEvents20260304130000` | 200 | 198 | 178 |
| 98 | 260304200000 | `20260304200000-CreateProductMarketingAssets.ts` | `CreateProductMarketingAssets20260304200000` | 201 | 199 | 179 |
| 99 | 260304210000 | `20260304210000-BackfillKpaStoreOwners.ts` | `BackfillKpaStoreOwners20260304210000` | 203 | 200 | 181 |
| 100 | 260305100000 | `20260305100000-AllowNullableKpaMembersOrganizationId.ts` | `AllowNullableKpaMembersOrganizationId20260305100000` | 207 | 201 | 185 |
| 101 | 260306120000 | `20260306120000-CreateHealthReadings.ts` | `CreateHealthReadings20260306120000` | 208 | 202 | 186 |
| 102 | 260307000001 | `20260307000001-AddRequestedSlugToGlycopharmApplications.ts` | `AddRequestedSlugToGlycopharmApplications20260307000001` | 211 | 203 | 189 |
| 103 | 260307100000 | `20260307100000-CreateCatalogImportTables.ts` | `CreateCatalogImportTables20260307100000` | 209 | 204 | 187 |
| 104 | 260307200000 | `20260307200000-CategoryBrandProductMasterExtension.ts` | `CategoryBrandProductMasterExtension20260307200000` | 212 | 205 | 190 |
| 105 | 260307210000 | `20260307210000-CreateProductImages.ts` | `CreateProductImages20260307210000` | 213 | 206 | 191 |
| 106 | 260307300000 | `20260307300000-AddInventoryToSupplierProductOffers.ts` | `AddInventoryToSupplierProductOffers20260307300000` | 215 | 207 | 193 |
| 107 | 260308000000 | `20260308000000-CreateNetureShipmentsTable.ts` | `CreateNetureShipmentsTable20260308000000` | 216 | 208 | 194 |
| 108 | 260308100000 | `20260308100000-AddMetadataToKpiSnapshots.ts` | `AddMetadataToKpiSnapshots20260308100000` | 214 | 209 | 192 |
| 109 | 260308100000 | `20260308100000-CreateNetureSettlementsTable.ts` | `CreateNetureSettlementsTable20260308100000` | 217 | 210 | 195 |
| 110 | 260308200000 | `20260308200000-AddApprovedAtToNetureSettlements.ts` | `AddApprovedAtToNetureSettlements20260308200000` | 218 | 211 | 196 |
| 111 | 260308200000 | `20260308200000-CreateCareLlmInsightsAndAiModelSettings.ts` | `CreateCareLlmInsightsAndAiModelSettings20260308200000` | 219 | 212 | 197 |
| 112 | 260308300000 | `20260308300000-CreateCareCoachingDrafts.ts` | `CreateCareCoachingDrafts20260308300000` | 220 | 213 | 198 |
| 113 | 260308400000 | `20260308400000-CreatePartnerCommissionsTable.ts` | `CreatePartnerCommissionsTable20260308400000` | 221 | 214 | 199 |
| 114 | 260308500000 | `20260308500000-CreateCareAlerts.ts` | `CreateCareAlerts20260308500000` | 223 | 215 | 201 |
| 115 | 260308500000 | `20260308500000-CreateSupplierPartnerCommissionsTable.ts` | `CreateSupplierPartnerCommissionsTable20260308500000` | 222 | 216 | 200 |
| 116 | 260308510000 | `20260308510000-CreatePartnerReferralsTable.ts` | `CreatePartnerReferralsTable20260308510000` | 224 | 217 | 202 |
| 117 | 260308520000 | `20260308520000-AlterPartnerCommissionsAddReferralColumns.ts` | `AlterPartnerCommissionsAddReferralColumns20260308520000` | 225 | 218 | 203 |
| 118 | 260308600000 | `20260308600000-AddSlugToSupplierProductOffers.ts` | `AddSlugToSupplierProductOffers20260308600000` | 226 | 219 | 204 |
| 119 | 260308700000 | `20260308700000-CreatePartnerSettlementsTables.ts` | `CreatePartnerSettlementsTables20260308700000` | 227 | 220 | 205 |
| 120 | 260309100000 | `20260309100000-BackfillKpaStoreSlugs.ts` | `BackfillKpaStoreSlugs20260309100000` | 229 | 222 | 207 |
| 121 | 260309100000 | `20260309100000-CreateServiceProducts.ts` | `CreateServiceProducts20260309100000` | 230 | 223 | 208 |
| 122 | 260309120000 | `20260309120000-CreateStoreAiTables.ts` | `CreateStoreAiTables20260309120000` | 232 | 224 | 210 |
| 123 | 260309180000 | `20260309180000-CreateStoreAiProductTables.ts` | `CreateStoreAiProductTables20260309180000` | 234 | 225 | 212 |
| 124 | 260309200000 | `20260309200000-CreateProductAiTags.ts` | `CreateProductAiTags20260309200000` | 236 | 226 | 214 |
| 125 | 260309200000 | `20260309200000-EnsurePlatformStoreSlugHistory.ts` | `EnsurePlatformStoreSlugHistory20260309200000` | 231 | 227 | 209 |
| 126 | 260309200000 | `20260309200000-SeedProductServiceKeys.ts` | `SeedProductServiceKeys20260309200000` | 235 | 228 | 213 |
| 127 | 260309300000 | `20260309300000-BackfillKpaStoreSlugsV2.ts` | `BackfillKpaStoreSlugsV220260309300000` | 233 | 229 | 211 |
| 128 | 260309300000 | `20260309300000-CreateProductAiContents.ts` | `CreateProductAiContents20260309300000` | 237 | 230 | 215 |
| 129 | 260309400000 | `20260309400000-CreateProductOcrTexts.ts` | `CreateProductOcrTexts20260309400000` | 238 | 231 | 216 |
| 130 | 260311000001 | `20260311000001-CreateNetureContactMessages.ts` | `CreateNetureContactMessages20260311000001` | 240 | 232 | 218 |
| 131 | 260311100000 | `20260311100000-CreateStoreCapabilities.ts` | `CreateStoreCapabilities20260311100000` | 241 | 233 | 219 |
| 132 | 260311200000 | `20260311200000-CosmeticsStoreOrgBridge.ts` | `CosmeticsStoreOrgBridge20260311200000` | 242 | 234 | 220 |
| 133 | 260312100000 | `20260312100000-AlterHealthReadingsPharmacyIdNullable.ts` | `AlterHealthReadingsPharmacyIdNullable20260312100000` | 244 | 235 | 222 |
| 134 | 260315120000 | `20260315120000-CreatePatientAiInsights.ts` | `CreatePatientAiInsights20260315120000` | 250 | 240 | 228 |
| 135 | 260316100000 | `20260316100000-DropUserServiceEnrollments.ts` | `DropUserServiceEnrollments20260316100000` | 251 | 241 | 229 |
| 136 | 260317100000 | `20260317100000-NormalizeUserStatusCase.ts` | `NormalizeUserStatusCase20260317100000` | 253 | 243 | 231 |
| 137 | 260317110000 | `20260317110000-ActivateGlycopharmTestAccounts.ts` | `ActivateGlycopharmTestAccounts20260317110000` | 254 | 244 | 232 |
| 138 | 260318100000 | `20260318100000-BackfillServiceMembershipsFromRoles.ts` | `BackfillServiceMembershipsFromRoles20260318100000` | 255 | 245 | 233 |
| 139 | 260318100000 | `20260318100000-ExtendRolesTable.ts` | `ExtendRolesTable20260318100000` | 259 | 246 | 237 |
| 140 | 260318110000 | `20260318110000-RenamePharmacistToPharmacyRole.ts` | `RenamePharmacistToPharmacyRole20260318110000` | 256 | 247 | 234 |
| 141 | 260318120000 | `20260318120000-EnsureGlycopharmPharmaciesTable.ts` | `EnsureGlycopharmPharmaciesTable20260318120000` | 257 | 248 | 235 |
| 142 | 260318130000 | `20260318130000-LinkTestPharmacistToOrganization.ts` | `LinkTestPharmacistToOrganization20260318130000` | 258 | 249 | 236 |
| 143 | 260321100000 | `20260321100000-AddFieldsToCatalogImportRows.ts` | `AddFieldsToCatalogImportRows20260321100000` | 264 | 253 | 242 |
| 144 | 260322000001 | `20260322000001-CreatePatientHealthProfiles.ts` | `CreatePatientHealthProfiles20260322000001` | 265 | 254 | 243 |
| 145 | 260322100000 | `20260322100000-SeedGlycopharmForumCategory.ts` | `SeedGlycopharmForumCategory20260322100000` | 266 | 255 | 244 |
| 146 | 260323100000 | `20260323100000-CreateAiLlmPolicies.ts` | `CreateAiLlmPolicies20260323100000` | 267 | 257 | 245 |
| 147 | 260323200000 | `20260323200000-CreateAiUsageLogs.ts` | `CreateAiUsageLogs20260323200000` | 268 | 258 | 246 |
| 148 | 260323300000 | `20260323300000-CreateAiQuotaTables.ts` | `CreateAiQuotaTables20260323300000` | 269 | 259 | 247 |
| 149 | 260323400000 | `20260323400000-CreateAiBillingSummary.ts` | `CreateAiBillingSummary20260323400000` | 270 | 260 | 248 |
| 150 | 260323500000 | `20260323500000-AddIsRegulatedToProductCategories.ts` | `AddIsRegulatedToProductCategories20260323500000` | 272 | 261 | 250 |
| 151 | 260323700000 | `20260323700000-AddMetadataToForumCategory.ts` | `AddMetadataToForumCategory20260323700000` | 271 | 263 | 249 |
| 152 | 260323700000 | `20260323700000-SeedProductCategories.ts` | `SeedProductCategories20260323700000` | 275 | 264 | 253 |
| 153 | 260325100000 | `20260325100000-AddPromptVersionToAiModelSettings.ts` | `AddPromptVersionToAiModelSettings20260325100000` | 277 | 266 | 255 |
| 154 | 260325200000 | `20260325200000-AddServiceKeysToOffers.ts` | `AddServiceKeysToOffers20260325200000` | 278 | 267 | 256 |
| 155 | 260325300000 | `20260325300000-CreateOfferServiceApprovals.ts` | `CreateOfferServiceApprovals20260325300000` | 279 | 268 | 257 |
| 156 | 260326100000 | `20260326100000-NormalizeGlycopharmPharmacyRole.ts` | `NormalizeGlycopharmPharmacyRole20260326100000` | 281 | 270 | 259 |
| 157 | 260326200000 | `20260326200000-CreateKpaStudentProfiles.ts` | `CreateKpaStudentProfiles20260326200000` | 284 | 271 | 262 |
| 158 | 260326300000 | `20260326300000-AddUserIdToGlucoseviewCustomers.ts` | `AddUserIdToGlucoseviewCustomers20260326300000` | 282 | 272 | 260 |
| 159 | 260326300000 | `20260326300000-DeactivateQualificationRoles.ts` | `DeactivateQualificationRoles20260326300000` | 285 | 273 | 263 |
| 160 | 260326400000 | `20260326400000-UnifyCarePatientIdToUsersId.ts` | `UnifyCarePatientIdToUsersId20260326400000` | 283 | 274 | 261 |
| 161 | 260326600000 | `20260326600000-NetureSupplierOrgBridge.ts` | `NetureSupplierOrgBridge20260326600000` | 288 | 276 | 266 |
| 162 | 260327000100 | `20260327000100-CreateCareMessages.ts` | `CreateCareMessages20260327000100` | 289 | 278 | 267 |
| 163 | 260327000200 | `20260327000200-AddPatientReadAtToCoaching.ts` | `AddPatientReadAtToCoaching20260327000200` | 290 | 279 | 268 |
| 164 | 260327000300 | `20260327000300-DropNetureSupplierDeprecatedColumns.ts` | `DropNetureSupplierDeprecatedColumns20260327000300` | 291 | 280 | 269 |
| 165 | 260328100000 | `20260328100000-FixMarketTrialTitle.ts` | `FixMarketTrialTitle20260328100000` | 295 | 284 | 273 |
| 166 | 260328110000 | `20260328110000-CreateOfferCurationsTable.ts` | `CreateOfferCurationsTable20260328110000` | 296 | 285 | 274 |
| 167 | 260328120000 | `20260328120000-AddAnalyticsIndexesOfferServiceApprovals.ts` | `AddAnalyticsIndexesOfferServiceApprovals20260328120000` | 299 | 286 | 277 |
| 168 | 260328200000 | `20260328200000-AddOperatorNotesToServiceMemberships.ts` | `AddOperatorNotesToServiceMemberships20260328200000` | 297 | 287 | 275 |
| 169 | 260328300000 | `20260328300000-BridgeApprovedRegistrationsToSuppliers.ts` | `BridgeApprovedRegistrationsToSuppliers20260328300000` | 298 | 288 | 276 |
| 170 | 260328400000 | `20260328400000-AddCmsMetadataGinIndex.ts` | `AddCmsMetadataGinIndex20260328400000` | 300 | 289 | 278 |
| 171 | 260328500000 | `20260328500000-AddGuidelineContentIdToCoaching.ts` | `AddGuidelineContentIdToCoaching20260328500000` | 301 | 290 | 279 |
| 172 | 260329100000 | `20260329100000-CreateCategoryMappingRulesTable.ts` | `CreateCategoryMappingRulesTable20260329100000` | 302 | 291 | 280 |
| 173 | 260329200000 | `20260329200000-ExpandCategoryTreeAndMappingRules.ts` | `ExpandCategoryTreeAndMappingRules20260329200000` | 303 | 292 | 281 |
| 174 | 260330100000 | `20260330100000-CreateContentTemplatesTable.ts` | `CreateContentTemplatesTable20260330100000` | 304 | 293 | 282 |
| 175 | 260330200000 | `20260330200000-AddIsPublicToContentTemplates.ts` | `AddIsPublicToContentTemplates20260330200000` | 305 | 294 | 283 |
| 176 | 260330300000 | `20260330300000-AddUsageAnalyticsToContentTemplates.ts` | `AddUsageAnalyticsToContentTemplates20260330300000` | 306 | 295 | 284 |
| 177 | 260331100000 | `20260331100000-BackfillGlycopharmPharmacyOrganizations.ts` | `BackfillGlycopharmPharmacyOrganizations20260331100000` | 313 | 296 | 291 |
| 178 | 260331500000 | `20260331500000-UnifyNetureRoles.ts` | `UnifyNetureRoles20260331500000` | 310 | 302 | 288 |
| 179 | 260401300000 | `20260401300000-CreateMediaAssetsTable.ts` | `CreateMediaAssetsTable20260401300000` | 316 | 305 | 294 |
| 180 | 260401400000 | `20260401400000-AddMediaAssetFolder.ts` | `AddMediaAssetFolder20260401400000` | 317 | 306 | 295 |
| 181 | 260402100000 | `20260402100000-AddConsultationResultToAppointments.ts` | `AddConsultationResultToAppointments20260402100000` | 318 | 307 | 296 |
| 182 | 260403100000 | `20260403100000-CleanupNetureServiceData.ts` | `CleanupNetureServiceData20260403100000` | 321 | 309 | 299 |
| 183 | 260403100001 | `20260403100001-CreateSpotPricePolicies.ts` | `CreateSpotPricePolicies20260403100001` | 322 | 310 | 300 |
| 184 | 260403200000 | `20260403200000-AddIsPublicToSupplierProductOffers.ts` | `AddIsPublicToSupplierProductOffers20260403200000` | 320 | 311 | 298 |
| 185 | 260404000200 | `20260404000200-CreateKpaLegalDocuments.ts` | `CreateKpaLegalDocuments20260404000200` | 332 | 319 | 308 |
| 186 | 260404200000 | `20260404200000-RemoveGlucoseViewFromFeatured.ts` | `RemoveGlucoseViewFromFeatured20260404200000` | 335 | 321 | 310 |
| 187 | 260404300000 | `20260404300000-EnablePharmacyCoreCapabilities.ts` | `EnablePharmacyCoreCapabilities20260404300000` | 336 | 322 | 311 |
| 188 | 260404400000 | `20260404400000-CreateForumCategoryMembersTable.ts` | `CreateForumCategoryMembersTable20260404400000` | 337 | 323 | 312 |
| 189 | 260405200000 | `20260405200000-BackfillIsRegulatedFlags.ts` | `BackfillIsRegulatedFlags20260405200000` | 340 | 325 | 314 |
| 190 | 260405300000 | `20260405300000-CreateCommunityAdsAndSponsors.ts` | `CreateCommunityAdsAndSponsors20260405300000` | 341 | 326 | 315 |
| 191 | 260406200000 | `20260406200000-CreateMarketTrialForumCategory.ts` | `CreateMarketTrialForumCategory20260406200000` | 342 | 327 | 316 |
| 192 | 260406300000 | `20260406300000-BackfillTestProductsEmptyFields.ts` | `BackfillTestProductsEmptyFields20260406300000` | 343 | 328 | 317 |
| 193 | 260406400000 | `20260406400000-BackfillGlycopharmApplicationsForPendingPharmacy.ts` | `BackfillGlycopharmApplicationsForPendingPharmacy20260406400000` | 344 | 329 | 318 |
| 194 | 260409100000 | `20260409100000-AddIsFeaturedToSupplierProductOffers.ts` | `AddIsFeaturedToSupplierProductOffers20260409100000` | 345 | 330 | 319 |
| 195 | 260409110000 | `20260409110000-DropOfferCurationsTable.ts` | `DropOfferCurationsTable20260409110000` | 346 | 331 | 320 |
| 196 | 260409200000 | `20260409200000-CreateCatalogAndStoreProducts.ts` | `CreateCatalogAndStoreProducts20260409200000` | 347 | 332 | 321 |
| 197 | 260409300000 | `20260409300000-MigrateGlycopharmProductsToCatalogAndStore.ts` | `MigrateGlycopharmProductsToCatalogAndStore20260409300000` | 348 | 333 | 322 |
| 198 | 260409400000 | `20260409400000-RebackfillGlycopharmProductsAfterDualWrite.ts` | `RebackfillGlycopharmProductsAfterDualWrite20260409400000` | 349 | 334 | 323 |
| 199 | 260409500000 | `20260409500000-UnifyCareMessagesSenderTypePharmacy.ts` | `UnifyCareMessagesSenderTypePharmacy20260409500000` | 350 | 335 | 324 |
| 200 | 260410000001 | `20260410000001-CreateLmsCoreTables.ts` | `CreateLmsCoreTables20260410000001` | 351 | 336 | 325 |
| 201 | 260410100000 | `20260410100000-CreateSignageCategories.ts` | `CreateSignageCategories20260410100000` | 352 | 337 | 326 |
| 202 | 260410200000 | `20260410200000-AddCategoryIdToSignageMedia.ts` | `AddCategoryIdToSignageMedia20260410200000` | 354 | 338 | 328 |
| 203 | 260410300000 | `20260410300000-DeleteKpaSocietyOrganizationChannels.ts` | `DeleteKpaSocietyOrganizationChannels20260410300000` | 353 | 339 | 327 |
| 204 | 260410400000 | `20260410400000-CreateKpaContentHub.ts` | `CreateKpaContentHub20260410400000` | 355 | 340 | 329 |
| 205 | 260410500000 | `20260410500000-AddMissingColumnsToLmsCourses.ts` | `AddMissingColumnsToLmsCourses20260410500000` | 356 | 341 | 330 |
| 206 | 260411100000 | `20260411100000-BackfillKpaOrgsToOrganizations.ts` | `BackfillKpaOrgsToOrganizations20260411100000` | 357 | 342 | 331 |
| 207 | 260411200000 | `20260411200000-BackfillApprovedListings.ts` | `BackfillApprovedListings20260411200000` | 358 | 343 | 332 |
| 208 | 260411300000 | `20260411300000-NormalizeKpaServiceKeys.ts` | `NormalizeKpaServiceKeys20260411300000` | 359 | 344 | 333 |
| 209 | 260411400000 | `20260411400000-CreateCommunityQuickLinks.ts` | `CreateCommunityQuickLinks20260411400000` | 360 | 345 | 334 |
| 210 | 260412100000 | `20260412100000-CleanupForumTestData.ts` | `CleanupForumTestData20260412100000` | 361 | 346 | 335 |
| 211 | 260415000000 | `20260415000000-ArchiveBranchAndChapterData.ts` | `ArchiveBranchAndChapterData20260415000000` | 362 | 348 | 336 |
| 212 | 260415200000 | `20260415200000-AddConversionFieldsToMarketTrials.ts` | `AddConversionFieldsToMarketTrials20260415200000` | 373 | 349 | 347 |
| 213 | 260415210000 | `20260415210000-AddNotificationSentAtToMarketTrials.ts` | `AddNotificationSentAtToMarketTrials20260415210000` | 374 | 350 | 348 |
| 214 | 260415220000 | `20260415220000-AddCustomerConversionToMarketTrialParticipants.ts` | `AddCustomerConversionToMarketTrialParticipants20260415220000` | 375 | 351 | 349 |
| 215 | 260415230000 | `20260415230000-AddListingLinkToMarketTrialParticipants.ts` | `AddListingLinkToMarketTrialParticipants20260415230000` | 376 | 352 | 350 |
| 216 | 260415240000 | `20260415240000-AddSourceToOrganizationProductListings.ts` | `AddSourceToOrganizationProductListings20260415240000` | 377 | 353 | 351 |
| 217 | 260415250000 | `20260415250000-CreateLmsQuizTables.ts` | `CreateLmsQuizTables20260415250000` | 379 | 354 | 353 |
| 218 | 260415260000 | `20260415260000-CreateCreditTables.ts` | `CreateCreditTables20260415260000` | 380 | 355 | 354 |
| 219 | 260415260000 | `20260415260000-ReseedMarketTrialForumCategory.ts` | `ReseedMarketTrialForumCategory20260415260000` | 378 | 356 | 352 |
| 220 | 260415270000 | `20260415270000-CreateCourseCompletionsTable.ts` | `CreateCourseCompletionsTable20260415270000` | 381 | 357 | 355 |
| 221 | 260415280000 | `20260415280000-CreateGlycopharmMembersTable.ts` | `CreateGlycopharmMembersTable20260415280000` | 382 | 358 | 356 |
| 222 | 260416000001 | `20260416000001-BackfillPharmacyToGlycopharmPharmacist.ts` | `BackfillPharmacyToGlycopharmPharmacist20260416000001` | 383 | 359 | 357 |
| 223 | 260416100000 | `20260416100000-AddRewardRateToMarketTrials.ts` | `AddRewardRateToMarketTrials20260416100000` | 384 | 360 | 358 |
| 224 | 260416200000 | `20260416200000-ForceAddRewardRateToMarketTrials.ts` | `ForceAddRewardRateToMarketTrials20260416200000` | 385 | 361 | 359 |
| 225 | 260416300000 | `20260416300000-BackfillMissingKpaSlugs.ts` | `BackfillMissingKpaSlugs20260416300000` | 386 | 362 | 360 |
| 226 | 260416400000 | `20260416400000-BackfillKpaSlugsByMembership.ts` | `BackfillKpaSlugsByMembership20260416400000` | 388 | 363 | 362 |
| 227 | 260416500000 | `20260416500000-AddSettlementFieldsToParticipants.ts` | `AddSettlementFieldsToParticipants20260416500000` | 387 | 364 | 361 |
| 228 | 260416600000 | `20260416600000-AddSourceIndexToCreditTransactions.ts` | `AddSourceIndexToCreditTransactions20260416600000` | 389 | 365 | 363 |
| 229 | 260417100000 | `20260417100000-DropSignageDeadTables.ts` | `DropSignageDeadTables20260417100000` | 390 | 366 | 364 |
| 230 | 260417400000 | `20260417400000-MigrateApprovedTrialToRecruiting.ts` | `MigrateApprovedTrialToRecruiting20260417400000` | 392 | 369 | 365 |
| 231 | 260418100000 | `20260418100000-CreateSignageForcedContent.ts` | `CreateSignageForcedContent20260418100000` | 395 | 370 | 368 |
| 232 | 260419100000 | `20260419100000-AddAssetTypeFieldsToStoreLibraryItems.ts` | `AddAssetTypeFieldsToStoreLibraryItems20260419100000` | 396 | 371 | 369 |
| 233 | 260419100000 | `20260419100000-AddSalesScenarioToMarketTrials.ts` | `AddSalesScenarioToMarketTrials20260419100000` | 397 | 372 | 370 |
| 234 | 260419200000 | `20260419200000-AddOneLinerToMarketTrials.ts` | `AddOneLinerToMarketTrials20260419200000` | 398 | 373 | 371 |
| 235 | 260419300000 | `20260419300000-AddVideoUrlToMarketTrials.ts` | `AddVideoUrlToMarketTrials20260419300000` | 399 | 374 | 372 |
| 236 | 260419400000 | `20260419400000-ResetMarketTrialDataAndRemoveServiceKeys.ts` | `ResetMarketTrialDataAndRemoveServiceKeys20260419400000` | 400 | 375 | 373 |
| 237 | 260420100000 | `20260420100000-CreateKpaResourcesTable.ts` | `CreateKpaResourcesTable20260420100000` | 403 | 376 | 374 |
| 238 | 260421000000 | `20260421000000-DropKpaResourcesTable.ts` | `DropKpaResourcesTable20260421000000` | 404 | 377 | 375 |
| 239 | 260421010000 | `20260421010000-RenameStoreLibraryToExecutionAssets.ts` | `RenameStoreLibraryToExecutionAssets20260421010000` | 405 | 378 | 376 |
| 240 | 260421100000 | `20260421100000-AddContentMetaToLibraryItems.ts` | `AddContentMetaToLibraryItems20260421100000` | 406 | 379 | 377 |
| 241 | 260422100000 | `20260422100000-AddContentLikeCount.ts` | `AddContentLikeCount20260422100000` | 412 | 380 | 383 |
| 242 | 260422300000 | `20260422300000-KpaContentHubCommunity.ts` | `KpaContentHubCommunity20260422300000` | 413 | 383 | 384 |
| 243 | 260424100000 | `20260424100000-DropSignageCategorySchema.ts` | `DropSignageCategorySchema20260424100000` | 414 | 384 | 385 |
| 244 | 260425100000 | `20260425100000-AddPlaylistTagsColumn.ts` | `AddPlaylistTagsColumn20260425100000` | 416 | 385 | 387 |
| 245 | 260425200000 | `20260425200000-AddStorePlaylistIdToSchedules.ts` | `AddStorePlaylistIdToSchedules20260425200000` | 417 | 386 | 388 |
| 246 | 260425300000 | `20260425300000-ConvertForumPostTagsToArray.ts` | `ConvertForumPostTagsToArray20260425300000` | 418 | 387 | 389 |
| 247 | 260425400000 | `20260425400000-DropForumTagTable.ts` | `DropForumTagTable20260425400000` | 419 | 388 | 390 |
| 248 | 260425500000 | `20260425500000-MigrateLmsCourseTagsToTextArray.ts` | `MigrateLmsCourseTagsToTextArray20260425500000` | 421 | 389 | 392 |
| 249 | 260429200000 | `20260429200000-AddUsageTypeToKpaContents.ts` | `AddUsageTypeToKpaContents20260429200000` | 429 | 391 | 400 |
| 250 | 260430000001 | `20260430000001-AddCampaignFieldsToSignageForcedContent.ts` | `AddCampaignFieldsToSignageForcedContent20260430000001` | 440 | 392 | 411 |
| 251 | 260430100000 | `20260430100000-BackfillKpaContentsSubType.ts` | `BackfillKpaContentsSubType20260430100000` | 433 | 393 | 404 |
| 252 | 260500000000 | `20260500000000-DropBranchTables.ts` | `DropBranchTables20260500000000` | 363 | 394 | 337 |
| 253 | 260501000000 | `20260501000000-AddVisibilityToLmsCourses.ts` | `AddVisibilityToLmsCourses20260501000000` | 444 | 395 | 414 |
| 254 | 260501000000 | `20260501000000-BackfillQualificationRequests.ts` | `BackfillQualificationRequests20260501000000` | 442 | 396 | 413 |
| 255 | 260502000000 | `20260502000000-DropLevelFromLmsCourses.ts` | `DropLevelFromLmsCourses20260502000000` | 447 | 397 | 417 |
| 256 | 260502120000 | `20260502120000-CreateLmsAssignmentTables.ts` | `CreateLmsAssignmentTables20260502120000` | 449 | 398 | 419 |
| 257 | 260502140000 | `20260502140000-AddLiveFieldsToLmsLessons.ts` | `AddLiveFieldsToLmsLessons20260502140000` | 450 | 399 | 420 |
| 258 | 260502160000 | `20260502160000-NormalizeLessonTypeLowercase.ts` | `NormalizeLessonTypeLowercase20260502160000` | 451 | 400 | 421 |
| 259 | 260503000000 | `20260503000000-AddRejectionReasonToLmsCourses.ts` | `AddRejectionReasonToLmsCourses20260503000000` | 452 | 401 | 422 |
| 260 | 260503100000 | `20260503100000-AddGradingFieldsToLmsSubmissions.ts` | `AddGradingFieldsToLmsSubmissions20260503100000` | 455 | 402 | 425 |
| 261 | 260506000000 | `20260506000000-AddLifecycleTrackingToMarketTrials.ts` | `AddLifecycleTrackingToMarketTrials20260506000000` | 458 | 403 | 427 |
| 262 | 260506010000 | `20260506010000-AddPaymentFieldsToMarketTrialParticipants.ts` | `AddPaymentFieldsToMarketTrialParticipants20260506010000` | 459 | 404 | 428 |
| 263 | 260508200000 | `20260508200000-FixTestYaksaMemberRecords.ts` | `FixTestYaksaMemberRecords20260508200000` | 462 | 405 | 431 |
| 264 | 260509000000 | `20260509000000-AddIdlePlaylistItemsToStoreTablets.ts` | `AddIdlePlaylistItemsToStoreTablets20260509000000` | 465 | 406 | 434 |
| 265 | 260510000001 | `20260510000001-AddReusablePolicyToKpaContents.ts` | `AddReusablePolicyToKpaContents20260510000001` | 466 | 407 | 435 |
| 266 | 260518000000 | `20260518000000-BackfillKpaSlugsLateJoin.ts` | `BackfillKpaSlugsLateJoin20260518000000` | 491 | 408 | 457 |
| 267 | 260520000000 | `20260520000000-DropLiveFieldsFromLmsLessons.ts` | `DropLiveFieldsFromLmsLessons20260520000000` | 494 | 409 | 460 |
| 268 | 260521120000 | `20260521120000-AddSurveyRewardFields.ts` | `AddSurveyRewardFields20260521120000` | 499 | 411 | 465 |
| 269 | 260522100000 | `20260522100000-CreateAppreciationSends.ts` | `CreateAppreciationSends20260522100000` | 502 | 412 | 468 |
| 270 | 260523000000 | `20260523000000-CreateServiceCredentials.ts` | `CreateServiceCredentials20260523000000` | 505 | 413 | 471 |
| 271 | 260524083827 | `20260524083827-CreateCosmeticsMembersTable.ts` | `CreateCosmeticsMembersTable20260524083827` | 511 | 414 | 477 |
| 272 | 260524224943 | `20260524224943-CreateOperatorQrTemplates.ts` | `CreateOperatorQrTemplates20260524224943` | 512 | 415 | 478 |
| 273 | 260530124500 | `20260530124500-NullifyKpaWithdrawnLicenseNumbers.ts` | `NullifyKpaWithdrawnLicenseNumbers20260530124500` | 517 | 416 | 483 |
| 274 | 260530180000 | `20260530180000-RepairForumGlycopharmOrganization.ts` | `RepairForumGlycopharmOrganization20260530180000` | 518 | 417 | 484 |
| 275 | 260530220000 | `20260530220000-BackfillGlycopharmStoreOwnerEnrollmentAndRole.ts` | `BackfillGlycopharmStoreOwnerEnrollmentAndRole20260530220000` | 519 | 418 | 485 |
| 276 | 260600000000 | `20260600000000-DropGlucoseviewAndCgmTables.ts` | `DropGlucoseviewAndCgmTables20260600000000` | 371 | 419 | 345 |
| 277 | 260601000000 | `20260601000000-DropCareTables.ts` | `DropCareTables20260601000000` | 372 | 420 | 346 |
| 278 | 260601200000 | `20260601200000-ForumRequestStateMachineColumns.ts` | `ForumRequestStateMachineColumns20260601200000` | 407 | 421 | 378 |
| 279 | 260603000000 | `20260603000000-AddServiceKeyToQualification.ts` | `AddServiceKeyToQualification20260603000000` | 520 | 422 | 486 |
| 280 | 260606000000 | `20260606000000-CreateProductIdentifiers.ts` | `CreateProductIdentifiers20260606000000` | 526 | 423 | 492 |
| 281 | 260606010000 | `20260606010000-CreateProductCandidates.ts` | `CreateProductCandidates20260606010000` | 527 | 424 | 493 |
| 282 | 260606020000 | `20260606020000-CreateMobileProductDrafts.ts` | `CreateMobileProductDrafts20260606020000` | 528 | 425 | 494 |
| 283 | 260606030000 | `20260606030000-AddDrugCategoryToProductMasters.ts` | `AddDrugCategoryToProductMasters20260606030000` | 529 | 426 | 495 |
| 284 | 260606040000 | `20260606040000-CreateProductDrugExtensions.ts` | `CreateProductDrugExtensions20260606040000` | 530 | 427 | 496 |
| 285 | 260607000000 | `20260607000000-AddSupplierShippingPolicyFields.ts` | `AddSupplierShippingPolicyFields20260607000000` | 531 | 428 | 497 |
| 286 | 260609000000 | `20260609000000-CreateStoreCartItems.ts` | `CreateStoreCartItems20260609000000` | 532 | 429 | 498 |
| 287 | 260615120000 | `20260615120000-CreateKycDocuments.ts` | `CreateKycDocuments20260615120000` | 547 | 430 | 513 |
| 288 | 260615130000 | `20260615130000-AddSupplierBasicDocumentsAndSettlement.ts` | `AddSupplierBasicDocumentsAndSettlement20260615130000` | 548 | 431 | 514 |
| 289 | 260615140000 | `20260615140000-AddSupplierMailOrderReporting.ts` | `AddSupplierMailOrderReporting20260615140000` | 549 | 432 | 515 |
| 290 | 260615150000 | `20260615150000-AddSupplierRegulatedCategories.ts` | `AddSupplierRegulatedCategories20260615150000` | 550 | 433 | 516 |
| 291 | 260615160000 | `20260615160000-CreateServiceAudiencePolicies.ts` | `CreateServiceAudiencePolicies20260615160000` | 551 | 434 | 517 |
| 292 | 260616000000 | `20260616000000-AddCancelledApplicationStatus.ts` | `AddCancelledApplicationStatus20260616000000` | 553 | 435 | 519 |
| 293 | 260616100000 | `20260616100000-AddRecruitmentExposureStatus.ts` | `AddRecruitmentExposureStatus20260616100000` | 554 | 436 | 520 |
| 294 | 260618000000 | `20260618000000-BackfillNetureSupplierProfiles.ts` | `BackfillNetureSupplierProfiles20260618000000` | 555 | 437 | 521 |
| 295 | 260619000000 | `20260619000000-ExpandRecruitmentUniqueToService.ts` | `ExpandRecruitmentUniqueToService20260619000000` | 556 | 438 | 522 |
| 296 | 260621000000 | `20260621000000-CreateStorePaidFeatureEntitlements.ts` | `CreateStorePaidFeatureEntitlements20260621000000` | 562 | 439 | 528 |
| 297 | 260621010000 | `20260621010000-CreateStoreMultilingualProductContent.ts` | `CreateStoreMultilingualProductContent20260621010000` | 561 | 440 | 527 |
| 298 | 260623100000 | `20260623100000-CreateStoreVideos.ts` | `CreateStoreVideos20260623100000` | 568 | 441 | 534 |
| 299 | 260700000000 | `20260700000000-AddTagsToForumCategory.ts` | `AddTagsToForumCategory20260700000000` | 408 | 442 | 379 |
| 300 | 260700200000 | `20260700200000-MigrateLmsCreatorQualification.ts` | `MigrateLmsCreatorQualification20260700200000` | 409 | 443 | 380 |
| 301 | 260801000000 | `20260801000000-ResetAndSeedKpaChannels.ts` | `ResetAndSeedKpaChannels20260801000000` | 415 | 444 | 386 |
| 302 | 260900000000 | `20260900000000-BackfillStoreOwnerRoles.ts` | `BackfillStoreOwnerRoles20260900000000` | 422 | 445 | 393 |
| 303 | 260901000000 | `20260901000000-CleanupKCosmeticsSellerRole.ts` | `CleanupKCosmeticsSellerRole20260901000000` | 423 | 446 | 394 |
| 304 | 260902000000 | `20260902000000-AddSupplierOrderCondition.ts` | `AddSupplierOrderCondition20260902000000` | 424 | 447 | 395 |
| 305 | 260902500000 | `20260902500000-CreateNetureOrders.ts` | `CreateNetureOrders20260902500000` | 425 | 448 | 396 |
| 306 | 260903000000 | `20260903000000-AddOrderTypeAndCustomerInfoToNetureOrders.ts` | `AddOrderTypeAndCustomerInfoToNetureOrders20260903000000` | 426 | 449 | 397 |
| 307 | 260904000000 | `20260904000000-RemoveStoreProductStockQuantity.ts` | `RemoveStoreProductStockQuantity20260904000000` | 427 | 450 | 398 |
| 308 | 260905000000 | `20260905000000-CreateNeturePartnerProductTables.ts` | `CreateNeturePartnerProductTables20260905000000` | 428 | 451 | 399 |
| 309 | 260906000000 | `20260906000000-AddContentKindToLmsCourses.ts` | `AddContentKindToLmsCourses20260906000000` | 441 | 452 | 412 |
| 310 | 260906000000 | `20260906000000-AddRequestedSlugToCosmeticsApplications.ts` | `AddRequestedSlugToCosmeticsApplications20260906000000` | 431 | 453 | 402 |
| 311 | 260906100000 | `20260906100000-AddEventOfferColumnsToListings.ts` | `AddEventOfferColumnsToListings20260906100000` | 432 | 454 | 403 |
| 312 | 260906200000 | `20260906200000-CleanupOrphanForumCategories.ts` | `CleanupOrphanForumCategories20260906200000` | 434 | 455 | 405 |
| 313 | 260906300000 | `20260906300000-ForumFullCategoryRemoval.ts` | `ForumFullCategoryRemoval20260906300000` | 435 | 456 | 406 |
| 314 | 260907000000 | `20260907000000-AddForumIdToForumPostAndSlugToRequests.ts` | `AddForumIdToForumPostAndSlugToRequests20260907000000` | 436 | 457 | 407 |
| 315 | 260908000000 | `20260908000000-DropForumCategory.ts` | `DropForumCategory20260908000000` | 437 | 458 | 408 |
| 316 | 260909000000 | `20260909000000-AddShareStatusToKpaStoreContents.ts` | `AddShareStatusToKpaStoreContents20260909000000` | 438 | 459 | 409 |
| 317 | 260910000000 | `20260910000000-CreateSignagePlaybackLogs.ts` | `CreateSignagePlaybackLogs20260910000000` | 439 | 460 | 410 |
| 318 | 260911000000 | `20260911000000-CreateLmsSurveyTables.ts` | `CreateLmsSurveyTables20260911000000` | 445 | 461 | 415 |
| 319 | 260911100000 | `20260911100000-AddSurveyCoreFields.ts` | `AddSurveyCoreFields20260911100000` | 446 | 462 | 416 |
| 320 | 260912000000 | `20260912000000-AddApprovalFieldsToOpl.ts` | `AddApprovalFieldsToOpl20260912000000` | 448 | 463 | 418 |
| 321 | 260913000000 | `20260913000000-CreateNotificationsTable.ts` | `CreateNotificationsTable20260913000000` | 453 | 464 | 423 |
| 322 | 260914000000 | `20260914000000-CreateO4OEventLogs.ts` | `CreateO4OEventLogs20260914000000` | 454 | 465 | 424 |
| 323 | 260915000000 | `20260915000000-AddEventPriceToOrgProductListings.ts` | `AddEventPriceToOrgProductListings20260915000000` | 457 | 466 | 426 |
| 324 | 260916000000 | `20260916000000-ActionLogUserIdNullable.ts` | `ActionLogUserIdNullable20260916000000` | 460 | 467 | 429 |
| 325 | 260917000000 | `20260917000000-ExtendKpaStoreContentsForDirect.ts` | `ExtendKpaStoreContentsForDirect20260917000000` | 461 | 468 | 430 |
| 326 | 260918000000 | `20260918000000-CreateStoreBlogSettings.ts` | `CreateStoreBlogSettings20260918000000` | 463 | 469 | 432 |
| 327 | 260919000000 | `20260919000000-AddReusablePolicyToLmsCourses.ts` | `AddReusablePolicyToLmsCourses20260919000000` | 464 | 470 | 433 |
| 328 | 260920000000 | `20260920000000-DropUniqueConstraintAssetSnapshots.ts` | `DropUniqueConstraintAssetSnapshots20260920000000` | 467 | 471 | 436 |
| 329 | 260920000000 | `20260920000000-MakeOfferIdNullableAddMasterListing.ts` | `MakeOfferIdNullableAddMasterListing20260920000000` | 470 | 472 | 439 |
| 330 | 260921000000 | `20260921000000-AddCreatedAtToKpaStoreContents.ts` | `AddCreatedAtToKpaStoreContents20260921000000` | 468 | 473 | 437 |
| 331 | 260922000000 | `20260922000000-CreateContactRequests.ts` | `CreateContactRequests20260922000000` | 469 | 474 | 438 |
| 332 | 260923000000 | `20260923000000-AddOperatorSourceMaterialFieldsToKpaStoreContents.ts` | `AddOperatorSourceMaterialFieldsToKpaStoreContents20260923000000` | 506 | 475 | 472 |
| 333 | 260923000000 | `20260923000000-FixNetureSupplierRoleAssignments.ts` | `FixNetureSupplierRoleAssignments20260923000000` | 471 | 476 | 440 |
| 334 | 260924000000 | `20260924000000-CleanupKpaOrphanRoles.ts` | `CleanupKpaOrphanRoles20260924000000` | 472 | 477 | 441 |
| 335 | 260924100000 | `20260924100000-FixKpaOrphanRoleCleanup.ts` | `FixKpaOrphanRoleCleanup20260924100000` | 473 | 478 | 442 |
| 336 | 260924200000 | `20260924200000-DeleteOrphanKpaUsers.ts` | `DeleteOrphanKpaUsers20260924200000` | 474 | 479 | 443 |
| 337 | 260924300000 | `20260924300000-DiagnosticMembershipGateAudit.ts` | `DiagnosticMembershipGateAudit20260924300000` | 476 | 480 | 445 |
| 338 | 260924400000 | `20260924400000-DiagnosticKpaMembershipFlowAudit.ts` | `DiagnosticKpaMembershipFlowAudit20260924400000` | 477 | 481 | 446 |
| 339 | 260925000000 | `20260925000000-CleanupNetureOrphanSuppliers.ts` | `CleanupNetureOrphanSuppliers20260925000000` | 475 | 482 | 444 |
| 340 | 260926000000 | `20260926000000-AddUniqueUserIdToNetureSuppliers.ts` | `AddUniqueUserIdToNetureSuppliers20260926000000` | 478 | 483 | 447 |
| 341 | 260927100000 | `20260927100000-BootstrapCanonicalSeedAccounts.ts` | `BootstrapCanonicalSeedAccounts20260927100000` | 480 | 484 | 448 |
| 342 | 260928000000 | `20260928000000-NormalizeServiceMembershipsKpaKey.ts` | `NormalizeServiceMembershipsKpaKey20260928000000` | 481 | 485 | 449 |
| 343 | 260929000000 | `20260929000000-NormalizeServiceMembershipsCosmeticsKey.ts` | `NormalizeServiceMembershipsCosmeticsKey20260929000000` | 484 | 486 | 450 |
| 344 | 260930000000 | `20260930000000-BackfillCosmeticsServiceEnrollments.ts` | `BackfillCosmeticsServiceEnrollments20260930000000` | 513 | 487 | 479 |
| 345 | 260930000000 | `20260930000000-DropKpaExternalExpertAndSupplierStaffProfiles.ts` | `DropKpaExternalExpertAndSupplierStaffProfiles20260930000000` | 485 | 488 | 451 |
| 346 | 261001000000 | `20261001000000-CreateForumJoinRequests.ts` | `CreateForumJoinRequests20261001000000` | 514 | 489 | 480 |
| 347 | 261001000000 | `20261001000000-NormalizeServiceMembershipsWithdrawnStatus.ts` | `NormalizeServiceMembershipsWithdrawnStatus20261001000000` | 486 | 490 | 452 |
| 348 | 261002000000 | `20261002000000-BackfillServiceMembershipsActiveFromKpaMembers.ts` | `BackfillServiceMembershipsActiveFromKpaMembers20261002000000` | 487 | 491 | 453 |
| 349 | 261004000000 | `20261004000000-BackfillMissingKpaMembersCanonical.ts` | `BackfillMissingKpaMembersCanonical20261004000000` | 488 | 492 | 454 |
| 350 | 261020000000 | `20261020000000-BackfillKpaStoreOwnerForTestUsers.ts` | `BackfillKpaStoreOwnerForTestUsers20261020000000` | 489 | 493 | 455 |
| 351 | 261021000000 | `20261021000000-CreateEmailLogs.ts` | `CreateEmailLogs20261021000000` | 490 | 494 | 456 |
| 352 | 261022000000 | `20261022000000-BackfillKpaSlugsPostMemberApprovalPath.ts` | `BackfillKpaSlugsPostMemberApprovalPath20261022000000` | 492 | 495 | 458 |
| 353 | 261023000000 | `20261023000000-BackfillKpaOrganizationPharmacyInfo.ts` | `BackfillKpaOrganizationPharmacyInfo20261023000000` | 493 | 496 | 459 |
| 354 | 261024000000 | `20261024000000-BackfillApprovedKpaCourseStatus.ts` | `BackfillApprovedKpaCourseStatus20261024000000` | 495 | 497 | 461 |
| 355 | 261025000000 | `20261025000000-BackfillApprovedKpaCourseStatusV2.ts` | `BackfillApprovedKpaCourseStatusV220261025000000` | 496 | 498 | 462 |
| 356 | 261026000000 | `20261026000000-AddServiceKeyToPasswordResetTokens.ts` | `AddServiceKeyToPasswordResetTokens20261026000000` | 500 | 499 | 466 |
| 357 | 261026000001 | `20261026000001-RenameServiceKeyColumnInPasswordResetTokens.ts` | `RenameServiceKeyColumnInPasswordResetTokens20261026000001` | 501 | 500 | 467 |
| 358 | 261026000002 | `20261026000002-NormalizeServiceKeyColumnName.ts` | `NormalizeServiceKeyColumnName20261026000002` | 503 | 501 | 469 |
| 359 | 261027000000 | `20261027000000-MigrateLegacyRolesToPlatformPrefixed.ts` | `MigrateLegacyRolesToPlatformPrefixed20261027000000` | 504 | 502 | 470 |
| 360 | 261028000000 | `20261028000000-AddAuthorRoleToStoreBlogPosts.ts` | `AddAuthorRoleToStoreBlogPosts20261028000000` | 507 | 503 | 473 |
| 361 | 261028100000 | `20261028100000-MakeStoreBlogPostsStoreIdNullableForOperator.ts` | `MakeStoreBlogPostsStoreIdNullableForOperator20261028100000` | 508 | 504 | 474 |
| 362 | 261029000000 | `20261029000000-CreateCosmeticsContentsTables.ts` | `CreateCosmeticsContentsTables20261029000000` | 509 | 505 | 475 |
| 363 | 261029000000 | `20261029000000-CreateStorePops.ts` | `CreateStorePops20261029000000` | 510 | 506 | 476 |
| 364 | 261030000000 | `20261030000000-CanonicalBusinessFieldAlignment.ts` | `CanonicalBusinessFieldAlignment20261030000000` | 515 | 507 | 481 |
| 365 | 261030000001 | `20261030000001-GlycopharmPharmaciesOrgBridgeV2.ts` | `GlycopharmPharmaciesOrgBridgeV220261030000001` | 516 | 508 | 482 |
| 366 | 261031000000 | `20261031000000-NormalizeKCosmeticsSellerRoleWritepathBackfill.ts` | `NormalizeKCosmeticsSellerRoleWritepathBackfill20261031000000` | 521 | 509 | 487 |
| 367 | 261031000001 | `20261031000001-BackfillKCosmeticsSellerStoreContext.ts` | `BackfillKCosmeticsSellerStoreContext20261031000001` | 522 | 510 | 488 |
| 368 | 261101000000 | `20261101000000-AddServiceKeyToLmsCourses.ts` | `AddServiceKeyToLmsCourses20261101000000` | 523 | 511 | 489 |
| 369 | 261102000000 | `20261102000000-AlignCheckoutOrdersSchemaContract.ts` | `AlignCheckoutOrdersSchemaContract20261102000000` | 524 | 512 | 490 |
| 370 | 261103000000 | `20261103000000-CreateStoreAssetDerivations.ts` | `CreateStoreAssetDerivations20261103000000` | 525 | 513 | 491 |
| 371 | 261104000000 | `20261104000000-CreateServiceLegalTables.ts` | `CreateServiceLegalTables20261104000000` | 533 | 514 | 499 |
| 372 | 261105000000 | `20261105000000-CreateContactInquiries.ts` | `CreateContactInquiries20261105000000` | 537 | 515 | 503 |
| 373 | 261106000000 | `20261106000000-CreateServiceContactSettings.ts` | `CreateServiceContactSettings20261106000000` | 539 | 516 | 505 |
| 374 | 261107000000 | `20261107000000-AddContactAutoReply.ts` | `AddContactAutoReply20261107000000` | 540 | 517 | 506 |
| 375 | 261108000000 | `20261108000000-AddContactNotificationStatusNetureKpa.ts` | `AddContactNotificationStatusNetureKpa20261108000000` | 541 | 518 | 507 |
| 376 | 261109000000 | `20261109000000-AddContactPrivacyConsentNetureKpa.ts` | `AddContactPrivacyConsentNetureKpa20261109000000` | 542 | 519 | 508 |
| 377 | 261110000000 | `20261110000000-CleanupNetureContactLegacyIpAddress.ts` | `CleanupNetureContactLegacyIpAddress20261110000000` | 543 | 520 | 509 |
| 378 | 261111000000 | `20261111000000-AlignGeminiEngineRegistry.ts` | `AlignGeminiEngineRegistry20261111000000` | 544 | 521 | 510 |
| 379 | 261112000000 | `20261112000000-AddBodyToGpKcosContents.ts` | `AddBodyToGpKcosContents20261112000000` | 545 | 522 | 511 |
| 380 | 261113000000 | `20261113000000-DropSiteGuideSchema.ts` | `DropSiteGuideSchema20261113000000` | 546 | 523 | 512 |
| 381 | 261114000000 | `20261114000000-CreateSharedProductDescriptions.ts` | `CreateSharedProductDescriptions20261114000000` | 552 | 524 | 518 |
| 382 | 261115000000 | `20261115000000-DropMarketTrialFulfillmentAndShipping.ts` | `DropMarketTrialFulfillmentAndShipping20261115000000` | 557 | 525 | 523 |
| 383 | 261116000000 | `20261116000000-DropMarketTrialConversionColumns.ts` | `DropMarketTrialConversionColumns20261116000000` | 559 | 526 | 525 |
| 384 | 261117000000 | `20261117000000-CreateOfferServicePrices.ts` | `CreateOfferServicePrices20261117000000` | 558 | 527 | 524 |
| 385 | 261118000000 | `20261118000000-CleanupNetureTestSuppliers.ts` | `CleanupNetureTestSuppliers20261118000000` | 560 | 528 | 526 |
| 386 | 261119000000 | `20261119000000-CreateOperatorMultilingualProductContent.ts` | `CreateOperatorMultilingualProductContent20261119000000` | 563 | 529 | 529 |
| 387 | 261120000000 | `20261120000000-AddPublicKeyToStoreMultilingualProductContent.ts` | `AddPublicKeyToStoreMultilingualProductContent20261120000000` | 564 | 530 | 530 |
| 388 | 261121000000 | `20261121000000-CreateForeignVisitorPartnersTable.ts` | `CreateForeignVisitorPartnersTable20261121000000` | 565 | 531 | 531 |
| 389 | 261122000000 | `20261122000000-CreateForeignVisitorPartnerQrCodesTable.ts` | `CreateForeignVisitorPartnerQrCodesTable20261122000000` | 566 | 532 | 532 |
| 390 | 261123000000 | `20261123000000-CreateForeignVisitorPartnerQrScanEventsTable.ts` | `CreateForeignVisitorPartnerQrScanEventsTable20261123000000` | 567 | 533 | 533 |
| 391 | 261124000000 | `20261124000000-AddBodyToKpaWorkingContents.ts` | `AddBodyToKpaWorkingContents20261124000000` | 569 | 534 | 535 |
| 392 | 261125000000 | `20261125000000-AddQrConsultationCtaAndNullableInterestMaster.ts` | `AddQrConsultationCtaAndNullableInterestMaster20261125000000` | 570 | 535 | 536 |
| 393 | 261126000000 | `20261126000000-AddTagsToStoreContentSources.ts` | `AddTagsToStoreContentSources20261126000000` | 571 | 536 | 537 |
| 394 | 261127000000 | `20261127000000-CreateStoreTabletDisplaySettings.ts` | `CreateStoreTabletDisplaySettings20261127000000` | 572 | 537 | 538 |
| 395 | 261128000000 | `20261128000000-CreateKpaStoreContentProductLinks.ts` | `CreateKpaStoreContentProductLinks20261128000000` | 573 | 538 | 539 |
| 396 | 261129000000 | `20261129000000-AddContentIdToStoreTabletDisplays.ts` | `AddContentIdToStoreTabletDisplays20261129000000` | 574 | 539 | 540 |
| 397 | 261130000000 | `20261130000000-AddImageImportResultToCsvBatch.ts` | `AddImageImportResultToCsvBatch20261130000000` | 575 | 540 | 541 |
| 398 | 261201000000 | `20261201000000-AddBarcodeToStoreLocalProduct.ts` | `AddBarcodeToStoreLocalProduct20261201000000` | 576 | 541 | 542 |
| 399 | 261202000000 | `20261202000000-CreateRepresentativeProductsAndLink.ts` | `CreateRepresentativeProductsAndLink20261202000000` | 577 | 542 | 543 |
| 400 | 261203000000 | `20261203000000-AddTabletIdleToForcedContentAndSelections.ts` | `AddTabletIdleToForcedContentAndSelections20261203000000` | 578 | 543 | 544 |
| 401 | 261204000000 | `20261204000000-CreateProductCandidateDescriptionDrafts.ts` | `CreateProductCandidateDescriptionDrafts20261204000000` | 579 | 544 | 545 |
| 402 | 261205000000 | `20261205000000-SeedHffStoreDescriptionAiPolicy.ts` | `SeedHffStoreDescriptionAiPolicy20261205000000` | 580 | 545 | 546 |
| 403 | 261206000000 | `20261206000000-AddProductCurationSchemaAndCandidateIdentifierIndex.ts` | `AddProductCurationSchemaAndCandidateIdentifierIndex20261206000000` | 581 | 546 | 547 |
| 404 | 261206010000 | `20261206010000-DeleteMedicalDeviceGrade4Masters.ts` | `DeleteMedicalDeviceGrade4Masters20261206010000` | 582 | 547 | 548 |
| 405 | 261207000000 | `20261207000000-MarkMedicalDeviceGrade3ByCategory.ts` | `MarkMedicalDeviceGrade3ByCategory20261207000000` | 583 | 548 | 549 |
| 406 | 261207010000 | `20261207010000-DeleteMedicalDeviceGrade3DeleteMarked.ts` | `DeleteMedicalDeviceGrade3DeleteMarked20261207010000` | 584 | 549 | 550 |
| 407 | 261208000000 | `20261208000000-MarkMedicalDeviceGrade2ByCategory.ts` | `MarkMedicalDeviceGrade2ByCategory20261208000000` | 585 | 550 | 551 |
| 408 | 261208010000 | `20261208010000-DeleteMedicalDeviceGrade2DeleteMarked.ts` | `DeleteMedicalDeviceGrade2DeleteMarked20261208010000` | 586 | 551 | 552 |
| 409 | 261209000000 | `20261209000000-MarkMedicalDeviceGrade1ByCategory.ts` | `MarkMedicalDeviceGrade1ByCategory20261209000000` | 587 | 552 | 553 |
| 410 | 261209010000 | `20261209010000-DeleteMedicalDeviceGrade1DeleteMarked.ts` | `DeleteMedicalDeviceGrade1DeleteMarked20261209010000` | 588 | 553 | 554 |
| 411 | 261210000000 | `20261210000000-MarkDrugUnspecifiedByRawGubun.ts` | `MarkDrugUnspecifiedByRawGubun20261210000000` | 589 | 554 | 555 |
| 412 | 261210000000 | `20261210000000-ReclassifyMedicalDeviceReviewRequiredByMarketEvidence.ts` | `ReclassifyMedicalDeviceReviewRequiredByMarketEvidence20261210000000` | 590 | 555 | 556 |
| 413 | 261210010000 | `20261210010000-DeleteMedicalDeviceReviewResolvedDeleteMarked.ts` | `DeleteMedicalDeviceReviewResolvedDeleteMarked20261210010000` | 591 | 556 | 557 |
| 414 | 261211000000 | `20261211000000-SlimMedicalDeviceToDistributionFields.ts` | `SlimMedicalDeviceToDistributionFields20261211000000` | 592 | 557 | 558 |
| 415 | 261212000000 | `20261212000000-CreateProductMasterNotes.ts` | `CreateProductMasterNotes20261212000000` | 593 | 558 | 559 |
| 416 | 261220000000 | `20261220000000-AddProductImageActionColumnsAndAuditLogTable.ts` | `AddProductImageActionColumnsAndAuditLogTable20261220000000` | 594 | 559 | 560 |
| 417 | 261221000000 | `20261221000000-AddNameIndexToProductMasters.ts` | `AddNameIndexToProductMasters20261221000000` | 595 | 560 | 561 |
| 418 | 261222000000 | `20261222000000-AddMediaAssetMetadata.ts` | `AddMediaAssetMetadata20261222000000` | 596 | 561 | 562 |
| 419 | 261223000000 | `20261223000000-AddDescriptionTypeToSharedProductDescriptions.ts` | `AddDescriptionTypeToSharedProductDescriptions20261223000000` | 597 | 562 | 563 |
| 420 | 261224000000 | `20261224000000-CreateStoreProductDescriptionSelections.ts` | `CreateStoreProductDescriptionSelections20261224000000` | 598 | 563 | 564 |
| 421 | 261225000000 | `20261225000000-CreateProductLandings.ts` | `CreateProductLandings20261225000000` | 599 | 564 | 565 |
| 422 | 261226000000 | `20261226000000-ApproveNeedsReviewSharedProductDescriptions.ts` | `ApproveNeedsReviewSharedProductDescriptions20261226000000` | 600 | 565 | 566 |
| 423 | 261227000000 | `20261227000000-AddStatusToProductMasters.ts` | `AddStatusToProductMasters20261227000000` | 601 | 566 | 567 |
| 424 | 261228000000 | `20261228000000-CanonicalPerMasterTypeLanguage.ts` | `CanonicalPerMasterTypeLanguage20261228000000` | 602 | 567 | 568 |
| 425 | 261229000000 | `20261229000000-DropLegacyMatchColumnsFromProductCandidates.ts` | `DropLegacyMatchColumnsFromProductCandidates20261229000000` | 603 | 568 | 569 |
| 426 | 261230000000 | `20261230000000-ProductMasterBarcodeAndMfdsIdNullable.ts` | `ProductMasterBarcodeAndMfdsIdNullable20261230000000` | 604 | 569 | 570 |
| 427 | 261231000000 | `20261231000000-AddOriginServiceKeyToOrganizationProductListings.ts` | `AddOriginServiceKeyToOrganizationProductListings20261231000000` | 605 | 570 | 571 |
| 428 | 270102000000 | `20270102000000-LegacyInternalCodeBarcodeToNull.ts` | `LegacyInternalCodeBarcodeToNull20270102000000` | 606 | 571 | 572 |
| 429 | 270108000000 | `20270108000000-AddAuthorSubjectMetadataToSharedProductDescriptions.ts` | `AddAuthorSubjectMetadataToSharedProductDescriptions20270108000000` | 609 | 572 | 575 |
| 430 | 270120000000 | `20270120000000-CreateTabletScreenSetsAndBlocks.ts` | `CreateTabletScreenSetsAndBlocks20270120000000` | 607 | 573 | 573 |
| 431 | 270121000000 | `20270121000000-AddRevisionRequestToSharedProductDescriptions.ts` | `AddRevisionRequestToSharedProductDescriptions20270121000000` | 610 | 574 | 576 |
| 432 | 270205000000 | `20270205000000-AddTemplateKeyToTabletScreenSets.ts` | `AddTemplateKeyToTabletScreenSets20270205000000` | 608 | 575 | 574 |
| 433 | 270206000000 | `20270206000000-AddContentListToTabletBlockTypeCheck.ts` | `AddContentListToTabletBlockTypeCheck20270206000000` | 611 | 576 | 577 |
| 434 | 270207000000 | `20270207000000-AddScreenSetQrLandingContract.ts` | `AddScreenSetQrLandingContract20270207000000` | 615 | 577 | 581 |
| 435 | 270207000000 | `20270207000000-CreateSharedProductDescriptionAuditLogs.ts` | `CreateSharedProductDescriptionAuditLogs20270207000000` | 612 | 578 | 578 |
| 436 | 270208000000 | `20270208000000-CreateStoreTabletCornerContents.ts` | `CreateStoreTabletCornerContents20270208000000` | 616 | 579 | 582 |
| 437 | 270208000000 | `20270208000000-NormalizeHffRegulatoryTypeBrokenLiteral.ts` | `NormalizeHffRegulatoryTypeBrokenLiteral20270208000000` | 613 | 580 | 579 |
| 438 | 270209000000 | `20270209000000-DeleteHffCorruptedProductMasters.ts` | `DeleteHffCorruptedProductMasters20270209000000` | 614 | 581 | 580 |
| 439 | 270210000000 | `20270210000000-AddScreenSetOwnerScopeModel.ts` | `AddScreenSetOwnerScopeModel20270210000000` | 617 | 582 | 583 |
| 440 | 270211000000 | `20270211000000-AddScreenSetHubTargetStoreType.ts` | `AddScreenSetHubTargetStoreType20270211000000` | 618 | 583 | 584 |
| 441 | 270212000000 | `20270212000000-DropKpaApplicationsDeadTable.ts` | `DropKpaApplicationsDeadTable20270212000000` | 620 | 584 | 586 |
| 442 | 270213000000 | `20270213000000-DropKpaWorkingContentsDeadTable.ts` | `DropKpaWorkingContentsDeadTable20270213000000` | 621 | 585 | 587 |
| 443 | 270214000000 | `20270214000000-AddProductAiGlobalIntegrityConstraints.ts` | `AddProductAiGlobalIntegrityConstraints20270214000000` | 619 | 586 | 585 |
| 444 | 270215000000 | `20270215000000-DropKpaOrganizationJoinRequestsDeadTable.ts` | `DropKpaOrganizationJoinRequestsDeadTable20270215000000` | 622 | 587 | 588 |
| 445 | 270216000000 | `20270216000000-SeedPharmacyHubServiceAndRoles.ts` | `SeedPharmacyHubServiceAndRoles20270216000000` | 623 | 588 | 589 |
| 446 | 270217000000 | `20270217000000-GrantPharmacyHubInitialOperator.ts` | `GrantPharmacyHubInitialOperator20270217000000` | 624 | 589 | 590 |
| 447 | 270218000000 | `20270218000000-SeedPharmacyHubPharmacyAudience.ts` | `SeedPharmacyHubPharmacyAudience20270218000000` | 625 | 590 | 591 |
| 448 | 270219000000 | `20270219000000-RemoveLegacyCosmeticsPartnerAppRegistry.ts` | `RemoveLegacyCosmeticsPartnerAppRegistry20270219000000` | 626 | 591 | 592 |
| 449 | 270220000000 | `20270220000000-AddCosmeticsProductInfoColumns.ts` | `AddCosmeticsProductInfoColumns20270220000000` | 627 | 592 | 593 |
| 450 | 270221000000 | `20270221000000-CreatePlatformStorePolicyTables.ts` | `CreatePlatformStorePolicyTables20270221000000` | 628 | 593 | 594 |
| 451 | 270222000000 | `20270222000000-CreateGlycopharmFeaturedProductsTable.ts` | `CreateGlycopharmFeaturedProductsTable20270222000000` | 629 | 594 | 595 |
| 452 | 270223000000 | `20270223000000-CreateGlycopharmBillingInvoicesTable.ts` | `CreateGlycopharmBillingInvoicesTable20270223000000` | 630 | 595 | 596 |
| 453 | 270224000000 | `20270224000000-AddServiceKeyToNetureOrders.ts` | `AddServiceKeyToNetureOrders20270224000000` | 631 | 596 | 597 |
| 454 | 270225000000 | `20270225000000-AddActionLogsStatusCheckConstraint.ts` | `AddActionLogsStatusCheckConstraint20270225000000` | 632 | 597 | 598 |
| 455 | 270226000000 | `20270226000000-SeedPharmacyHubAdminRole.ts` | `SeedPharmacyHubAdminRole20270226000000` | 633 | 598 | 599 |
| 456 | 270301000000 | `20270301000000-ReplaceRoleAssignmentsActiveUniqueConstraint.ts` | `ReplaceRoleAssignmentsActiveUniqueConstraint20270301000000` | 634 | 599 | 600 |
| 457 | 270302000000 | `20270302000000-NormalizeNetureOperatorMembershipRole.ts` | `NormalizeNetureOperatorMembershipRole20270302000000` | 635 | 600 | 601 |
| 458 | 270303000000 | `20270303000000-AddKpaOrganizationSlug.ts` | `AddKpaOrganizationSlug20270303000000` | 636 | 601 | 602 |
| 459 | 270304000000 | `20270304000000-CreateBranchFoundationTables.ts` | `CreateBranchFoundationTables20270304000000` | 637 | 602 | 603 |
| 460 | 270305000000 | `20270305000000-SeedKpaBranchServiceAndRoles.ts` | `SeedKpaBranchServiceAndRoles20270305000000` | 638 | 603 | 604 |
| 461 | 270306000000 | `20270306000000-CreateExternalChannelProductLinks.ts` | `CreateExternalChannelProductLinks20270306000000` | 639 | 604 | 605 |
| 462 | 270307000000 | `20270307000000-CreateAnnualReportTemplates.ts` | `CreateAnnualReportTemplates20270307000000` | 640 | 605 | 606 |
| 463 | 270308000000 | `20270308000000-SeedKpaBranchAnnualReportTemplate2026.ts` | `SeedKpaBranchAnnualReportTemplate202620270308000000` | 641 | 606 | 607 |
| 464 | 270309000000 | `20270309000000-CreateAnnualReports.ts` | `CreateAnnualReports20270309000000` | 642 | 607 | 608 |
| 465 | 270310000000 | `20270310000000-DropUsersLegacyUpdatedAt.ts` | `DropUsersLegacyUpdatedAt20270310000000` | 643 | 608 | 609 |
| 466 | 270311000000 | `20270311000000-CreateHandoffTokens.ts` | `CreateHandoffTokens20270311000000` | 644 | 609 | 610 |
| 467 | 270312000000 | `20270312000000-AddPlatformStoreSlugsOrganizationFk.ts` | `AddPlatformStoreSlugsOrganizationFk20270312000000` | 645 | 610 | 611 |
| 468 | 270313000000 | `20270313000000-CreateCafe24Connections.ts` | `CreateCafe24Connections20270313000000` | 646 | 611 | 612 |
| 469 | 270314000000 | `20270314000000-DeactivatePharmacyHubSupplierRole.ts` | `DeactivatePharmacyHubSupplierRole20270314000000` | 647 | 612 | 613 |
| 470 | 270315000000 | `20270315000000-SeedPharmacyHubMemberRole.ts` | `SeedPharmacyHubMemberRole20270315000000` | 648 | 613 | 614 |
| 471 | 270316000000 | `20270316000000-NormalizePharmacyHubMemberMembershipRole.ts` | `NormalizePharmacyHubMemberMembershipRole20270316000000` | 649 | 614 | 615 |
| 472 | 270317000000 | `20270317000000-NormalizePharmacyHubBareMembershipRoles.ts` | `NormalizePharmacyHubBareMembershipRoles20270317000000` | 650 | 615 | 616 |
| 473 | 270318000000 | `20270318000000-RevokeOrphanedBareStoreOwnerRole.ts` | `RevokeOrphanedBareStoreOwnerRole20270318000000` | 651 | 616 | 617 |
| 474 | 270319000000 | `20270319000000-AddChannelsCodeUniqueIndex.ts` | `AddChannelsCodeUniqueIndex20270319000000` | 652 | 617 | 618 |
| 475 | 270320000000 | `20270320000000-DropUsersPermissionsColumn.ts` | `DropUsersPermissionsColumn20270320000000` | 653 | 618 | 619 |
| 476 | 270321000000 | `20270321000000-DropStoreEventsTable.ts` | `DropStoreEventsTable20270321000000` | 654 | 619 | 620 |
| 477 | 270322000000 | `20270322000000-CreateCafe24MemberLinksAndSeedCafe24B2bService.ts` | `CreateCafe24MemberLinksAndSeedCafe24B2bService20270322000000` | 655 | 620 | 621 |
| 478 | 270323000000 | `20270323000000-AddAnnualReportMembershipSync.ts` | `AddAnnualReportMembershipSync20270323000000` | 656 | 621 | 622 |
| 479 | 270324000000 | `20270324000000-AddAnnualReportReview.ts` | `AddAnnualReportReview20270324000000` | 657 | 622 | 623 |
| 480 | 270325000000 | `20270325000000-CreateBranchFeeLedger.ts` | `CreateBranchFeeLedger20270325000000` | 658 | 623 | 624 |
| 481 | 270326000000 | `20270326000000-CreateBranchEducationCreditLedger.ts` | `CreateBranchEducationCreditLedger20270326000000` | 659 | 624 | 625 |
| 482 | 270326000000 | `20270326000000-DropGlycopharmService.ts` | `DropGlycopharmService20270326000000` | 660 | 625 | 626 |
| 483 | 270327000000 | `20270327000000-AddStoreQrContentSource.ts` | `AddStoreQrContentSource20270327000000` | 661 | 626 | 627 |
| 484 | 270328000000 | `20270328000000-AddBranchFeeExemptionReason.ts` | `AddBranchFeeExemptionReason20270328000000` | 662 | 627 | 628 |
| 485 | 270329000000 | `20270329000000-CreateBranchEvents.ts` | `CreateBranchEvents20270329000000` | 663 | 628 | 629 |
| 486 | 270330000000 | `20270330000000-CreateStoreQrPlacements.ts` | `CreateStoreQrPlacements20270330000000` | 664 | 629 | 630 |
| 487 | 270331000000 | `20270331000000-CreateBranchOfficers.ts` | `CreateBranchOfficers20270331000000` | 665 | 630 | 631 |
| 488 | 270401000000 | `20270401000000-ExtendBranchPostsCategoryMeeting.ts` | `ExtendBranchPostsCategoryMeeting20270401000000` | 666 | 631 | 632 |
| 489 | 270402000000 | `20270402000000-CreateLocalAgentTables.ts` | `CreateLocalAgentTables20270402000000` | 667 | 632 | 633 |
| 490 | 270403000000 | `20270403000000-CreateStorePopDocuments.ts` | `CreateStorePopDocuments20270403000000` | 668 | 633 | 634 |
| 491 | 270404000000 | `20270404000000-DeactivateRetiredPartnerOpsAppRegistry.ts` | `DeactivateRetiredPartnerOpsAppRegistry20270404000000` | 669 | 634 | 635 |
| 492 | 270405000000 | `20270405000000-AddBranchMembershipMemberAttributes.ts` | `AddBranchMembershipMemberAttributes20270405000000` | 670 | 635 | 636 |
| 493 | 270406000000 | `20270406000000-AddAnnualReportTemplateReferenceYears.ts` | `AddAnnualReportTemplateReferenceYears20270406000000` | 671 | 636 | 637 |
| 494 | 270407000000 | `20270407000000-MediaLibraryV2Foundation.ts` | `MediaLibraryV2Foundation20270407000000` | 672 | 637 | 638 |
| 495 | 270408000000 | `20270408000000-DropStoreQrCodesTypeColumn.ts` | `DropStoreQrCodesTypeColumn20270408000000` | 673 | 638 | 639 |
| 496 | 270409000000 | `20270409000000-RemoveProductContentFromTabletBlockTypeCheck.ts` | `RemoveProductContentFromTabletBlockTypeCheck20270409000000` | 674 | 639 | 640 |
| 497 | 270410000000 | `20270410000000-CreateAutomationJobs.ts` | `CreateAutomationJobs20270410000000` | 675 | 640 | 641 |
| 498 | 270411000000 | `20270411000000-AddAutomationJobTempOutput.ts` | `AddAutomationJobTempOutput20270411000000` | 676 | 641 | 642 |
| 499 | 270412000000 | `20270412000000-DropRetiredCmsCptResidueTables.ts` | `DropRetiredCmsCptResidueTables20270412000000` | 677 | 642 | 643 |
| 500 | 270413000000 | `20270413000000-BaselineRbacAndAccountTables.ts` | `BaselineRbacAndAccountTables20270413000000` | 678 | 643 | 644 |
| 501 | 1700000000000 | `1700000000000-CreateUsersTable.ts` | `CreateUsersTable1700000000000` | 1 | 1 | 1 |
| 502 | 1700100000000 | `1700100000000-CreateForumNotifications.ts` | `CreateForumNotifications1700100000000` | 2 | 2 | 2 |
| 503 | 1703000000000 | `1703000000000-AddRefreshTokenAndLoginAttempt.ts` | `AddRefreshTokenAndLoginAttempt1703000000000` | 3 | 3 | 3 |
| 504 | 1704362400000 | `1704362400000-AddPerformanceIndexes.ts` | `AddPerformanceIndexes1704362400000` | 4 | 4 | 4 |
| 505 | 1706000000000 | `1706000000000-CreateAISettings.ts` | `CreateAISettings1706000000000` | 5 | 5 | 5 |
| 506 | 1706745602002 | `2026020400002-SeedForumServiceOrganizations.ts` | `SeedForumServiceOrganizations1706745602002` | 70 | 70 | 52 |
| 507 | 1706745607001 | `2026020700001-NullifyForumPostOrgIdForCommunity.ts` | `NullifyForumPostOrgIdForCommunity1706745607001` | 75 | 84 | 57 |
| 508 | 1707696001000 | `20260212000001-AddKpaMemberUniqueConstraints.ts` | `AddKpaMemberUniqueConstraints1707696001000` | 100 | 98 | 81 |
| 509 | 1707696002000 | `20260212000002-CreateKpaMemberServicesAndIdentityStatus.ts` | `CreateKpaMemberServicesAndIdentityStatus1707696002000` | 101 | 101 | 82 |
| 510 | 1708300000001 | `20260214000001-NormalizeBusinessNumbers.ts` | `NormalizeBusinessNumbers1708300000001` | 111 | 106 | 91 |
| 511 | 1708300000002 | `20260214000002-AddBusinessNumberConstraints.ts` | `AddBusinessNumberConstraints1708300000002` | 112 | 107 | 92 |
| 512 | 1708300000003 | `20260214000003-AddStoreIdentityFields.ts` | `AddStoreIdentityFields1708300000003` | 113 | 108 | 93 |
| 513 | 1708675200000 | `20260223100000-SeedHubSlotContent.ts` | `SeedHubSlotContent1708675200000` | 157 | 150 | 135 |
| 514 | 1708682400000 | `20260223120000-AlignHubSlotKeys.ts` | `AlignHubSlotKeys1708682400000` | 158 | 151 | 136 |
| 515 | 1708732800000 | `20260224000000-AddAuthorRoleAndVisibilityScopeToCmsContents.ts` | `AddAuthorRoleAndVisibilityScopeToCmsContents1708732800000` | 159 | 152 | 137 |
| 516 | 1708736400000 | `20260224100000-CreateRoleAssignmentsTable.ts` | `CreateRoleAssignmentsTable1708736400000` | 160 | 153 | 138 |
| 517 | 1708819200000 | `20260224500000-SignageApprovalStatusModel.ts` | `SignageApprovalStatusModel1708819200000` | 167 | 158 | 145 |
| 518 | 1708819200000 | `20260224700000-CmsContentPendingStatus.ts` | `CmsContentPendingStatus1708819200000` | 166 | 160 | 144 |
| 519 | 1709420400000 | `20260303000000-DropNetureSupplierContents.ts` | `DropNetureSupplierContents1709420400000` | 204 | 191 | 182 |
| 520 | 1709560000000 | `20260304100000-CleanupProductDemoData.ts` | `CleanupProductDemoData1709560000000` | 205 | 194 | 183 |
| 521 | 1709564400000 | `20260304110000-CleanupDemoSeedData.ts` | `CleanupDemoSeedData1709564400000` | 206 | 196 | 184 |
| 522 | 1709884800000 | `20260308800000-AddPharmacistCommentToStoreProductProfiles.ts` | `AddPharmacistCommentToStoreProductProfiles1709884800000` | 228 | 221 | 206 |
| 523 | 1710360000000 | `20260313200000-AddBodyBlocksToCmsContents.ts` | `AddBodyBlocksToCmsContents1710360000000` | 247 | 237 | 225 |
| 524 | 1710367800000 | `20260313210000-AddAttachmentsToCmsContents.ts` | `AddAttachmentsToCmsContents1710367800000` | 249 | 238 | 227 |
| 525 | 1710590400000 | `20260316150000-AddDescriptionColumnsToSupplierProductOffers.ts` | `AddDescriptionColumnsToSupplierProductOffers1710590400000` | 252 | 242 | 230 |
| 526 | 1710748800000 | `20260318200000-AddStructuredAddress.ts` | `AddStructuredAddress1710748800000` | 260 | 250 | 238 |
| 527 | 1711094400000 | `20260322120000-UpdateCareAiModelToGemini25Flash.ts` | `UpdateCareAiModelToGemini25Flash1711094400000` | 273 | 256 | 251 |
| 528 | 1711209600000 | `20260323600000-FixGeminiModelName.ts` | `FixGeminiModelName1711209600000` | 274 | 262 | 252 |
| 529 | 1711382400000 | `20260325400000-AddBarcodeSourceToProductMasters.ts` | `AddBarcodeSourceToProductMasters1711382400000` | 280 | 269 | 258 |
| 530 | 1711440600000 | `20260326500000-RepointListingOrganizationFK.ts` | `RepointListingOrganizationFK1711440600000` | 286 | 275 | 264 |
| 531 | 1711444200000 | `20260326600000-SeedNetureOrgEnrollments.ts` | `SeedNetureOrgEnrollments1711444200000` | 287 | 277 | 265 |
| 532 | 1711500000000 | `20260327100000-CsvPartialSuccess.ts` | `CsvPartialSuccess1711500000000` | 292 | 281 | 270 |
| 533 | 1711500000001 | `20260325000001-AddTypeToProductImages.ts` | `AddTypeToProductImages1711500000001` | 276 | 265 | 254 |
| 534 | 1711501100000 | `20260327110000-ImportProductTrace.ts` | `ImportProductTrace1711501100000` | 293 | 282 | 271 |
| 535 | 1711584060000 | `20260328000100-BackfillOfferServiceApprovals.ts` | `BackfillOfferServiceApprovals1711584060000` | 294 | 283 | 272 |
| 536 | 1711871600000 | `20260331100000-UnifyUserRoleToCustomer.ts` | `UnifyUserRoleToCustomer1711871600000` | 307 | 297 | 285 |
| 537 | 1711875200000 | `20260331200000-UnifyGlycopharmSellerToPharmacy.ts` | `UnifyGlycopharmSellerToPharmacy1711875200000` | 308 | 298 | 286 |
| 538 | 1711878800000 | `20260331300000-UnifyGlycopharmPharmacyRole.ts` | `UnifyGlycopharmPharmacyRole1711878800000` | 309 | 299 | 287 |
| 539 | 1711882400000 | `20260331400000-UnifyGlycopharmRolesCatalog.ts` | `UnifyGlycopharmRolesCatalog1711882400000` | 311 | 300 | 289 |
| 540 | 1711886000000 | `20260331500000-UnifyCosmeticsRolesCatalog.ts` | `UnifyCosmeticsRolesCatalog1711886000000` | 312 | 301 | 290 |
| 541 | 1712000000000 | `20260401100000-BackfillHealthReadingsPharmacyId.ts` | `BackfillHealthReadingsPharmacyId1712000000000` | 314 | 303 | 292 |
| 542 | 1712070000000 | `20260401200000-FixHealthReadingsPatientId.ts` | `FixHealthReadingsPatientId1712070000000` | 315 | 304 | 293 |
| 543 | 1712134800000 | `20260403100000-AddSoftDeleteToSupplierProductOffers.ts` | `AddSoftDeleteToSupplierProductOffers1712134800000` | 319 | 308 | 297 |
| 544 | 1712170800000 | `20260403300000-CreateKpaApprovalRequestsTable.ts` | `CreateKpaApprovalRequestsTable1712170800000` | 323 | 312 | 301 |
| 545 | 1712192400000 | `20260403500000-CleanupKpaForumPostsV2.ts` | `CleanupKpaForumPostsV2_1712192400000` | 324 | 313 | 302 |
| 546 | 1712195400000 | `20260403950000-BackfillKpaSecondReviewPendingRows.ts` | `BackfillKpaSecondReviewPendingRows1712195400000` | 330 | 318 | 307 |
| 547 | 1712196000000 | `20260403600000-CleanupKpaAuditLogs.ts` | `CleanupKpaAuditLogs1712196000000` | 325 | 314 | 303 |
| 548 | 1712199600000 | `20260403700000-CleanupOrphanKpaMembers.ts` | `CleanupOrphanKpaMembers1712199600000` | 326 | 315 | 304 |
| 549 | 1712203200000 | `20260403800000-CleanupAllKpaTestAccounts.ts` | `CleanupAllKpaTestAccounts1712203200000` | 327 | 317 | 305 |
| 550 | 1712246400000 | `20260404500000-FixKpaAdminRole.ts` | `FixKpaAdminRole1712246400000` | 338 | 324 | 313 |
| 551 | 1713052800000 | `20260414100000-CreateCheckoutTables.ts` | `CreateCheckoutTables1713052800000` | 364 | 347 | 338 |
| 552 | 1714700000000 | `20260403800000-BackfillServiceOfferListings.ts` | `BackfillServiceOfferListings1714700000000` | 329 | 316 | 306 |
| 553 | 1714780800000 | `20260404100000-FixCoachingPatientIdNormalization.ts` | `FixCoachingPatientIdNormalization1714780800000` | 333 | 320 | 309 |
| 554 | 1720868400000 | `20260313100000-CreateCarePharmacyLinkRequests.ts` | `CreateCarePharmacyLinkRequests1720868400000` | 246 | 236 | 224 |
| 555 | 1720954800000 | `20260314100000-CreateCareAppointments.ts` | `CreateCareAppointments1720954800000` | 248 | 239 | 226 |
| 556 | 1731129600000 | `4000000000003-AddReasonAndReapplyCooldownToEnrollments.ts` | `AddReasonAndReapplyCooldownToEnrollments1731129600000` | 6 | 644 | 6 |
| 557 | 1736400000000 | `1736400000000-AddEnabledServicesToPharmacy.ts` | `AddEnabledServicesToPharmacy1736400000000` | 18 | 6 | 7 |
| 558 | 1736500000000 | `1736500000000-CreateCmsContentTables.ts` | `CreateCmsContentTables1736500000000` | 19 | 7 | 8 |
| 559 | 1736500001000 | `1736500001000-SeedCmsContent.ts` | `SeedCmsContent1736500001000` | 20 | 8 | 9 |
| 560 | 1736600000000 | `1736600000000-CreateChannelsTable.ts` | `CreateChannelsTable1736600000000` | 21 | 9 | 10 |
| 561 | 1736700000000 | `1736700000000-CreateChannelPlaybackLog.ts` | `CreateChannelPlaybackLog1736700000000` | 22 | 10 | 11 |
| 562 | 1736710000000 | `1736710000000-CreateChannelHeartbeat.ts` | `CreateChannelHeartbeat1736710000000` | 23 | 11 | 12 |
| 563 | 1736720000000 | `1736720000000-AddSlotLockFields.ts` | `AddSlotLockFields1736720000000` | 24 | 12 | 13 |
| 564 | 1736800000000 | `1736800000000-CreateGlycopharmApplications.ts` | `CreateGlycopharmApplications1736800000000` | 25 | 13 | 14 |
| 565 | 1736900000000 | `1736900000000-CreateAIQueryTables.ts` | `CreateAIQueryTables1736900000000` | 27 | 14 | 16 |
| 566 | 1736950000000 | `1736950000000-CreateNetureTables.ts` | `CreateNetureTables1736950000000` | 28 | 15 | 17 |
| 567 | 1737100000000 | `1737100000000-UpdateGlucoseViewTestAccountPasswords.ts` | `UpdateGlucoseViewTestAccountPasswords1737100000000` | 30 | 16 | 18 |
| 568 | 1737100100000 | `1737100100000-ActivateGlucoseViewTestAccounts.ts` | `ActivateGlucoseViewTestAccounts1737100100000` | 31 | 17 | 19 |
| 569 | 1737100300000 | `1737100300000-FixPartnerTestAccountRole.ts` | `FixPartnerTestAccountRole1737100300000` | 37 | 18 | 24 |
| 570 | 1737100300000 | `1737100300000-SeedNetureData.ts` | `SeedNetureData1737100300000` | 33 | 19 | 20 |
| 571 | 1737100400000 | `1737100400000-RecreateNetureTables.ts` | `RecreateNetureTables1737100400000` | 34 | 20 | 21 |
| 572 | 1737100500000 | `1737100500000-AddNetureProductColumns.ts` | `AddNetureProductColumns1737100500000` | 35 | 21 | 22 |
| 573 | 1737100600000 | `1737100600000-CreateGlycopharmForumCategoryRequests.ts` | `CreateGlycopharmForumCategoryRequests1737100600000` | 36 | 22 | 23 |
| 574 | 1737100700000 | `1737100700000-CreateAiEnginesAndAdminColumns.ts` | `CreateAiEnginesAndAdminColumns1737100700000` | 38 | 23 | 25 |
| 575 | 1737100800000 | `1737100800000-AddUserIdToNetureSuppliers.ts` | `AddUserIdToNetureSuppliers1737100800000` | 39 | 24 | 26 |
| 576 | 1737200000000 | `1737200000000-CreateNetureSupplierDashboardTables.ts` | `CreateNetureSupplierDashboardTables1737200000000` | 40 | 25 | 27 |
| 577 | 1737200100000 | `1737200100000-RemoveOldAdminVaultAccount.ts` | `RemoveOldAdminVaultAccount1737200100000` | 53 | 26 | 36 |
| 578 | 1737330000000 | `1737330000000-CreateSiteGuideTables.ts` | `CreateSiteGuideTables1737330000000` | 42 | 27 | 29 |
| 579 | 1737450000000 | `1737450000000-RemoveKCosmeticsConsumerAccount.ts` | `RemoveKCosmeticsConsumerAccount1737450000000` | 46 | 28 | 30 |
| 580 | 1737900000000 | `1737900000000-AddCmsSlotLockColumns.ts` | `AddCmsSlotLockColumns1737900000000` | 51 | 29 | 35 |
| 581 | 1738300000000 | `1738300000000-AddPartnerRecruitingToGlycopharmProducts.ts` | `AddPartnerRecruitingToGlycopharmProducts1738300000000` | 61 | 30 | 43 |
| 582 | 1739500000000 | `1739500000000-AddInstructorRoleSupport.ts` | `AddInstructorRoleSupport1739500000000` | 538 | 31 | 504 |
| 583 | 1739600000000 | `1739600000000-AddKpaMemberProfessionFields.ts` | `AddKpaMemberProfessionFields1739600000000` | 103 | 32 | 84 |
| 584 | 1739700000000 | `1739700000000-NormalizePhoneNumbers.ts` | `NormalizePhoneNumbers1739700000000` | 104 | 33 | 85 |
| 585 | 1740200000000 | `20260222100000-AddDistributionPolicyToNetureSupplierProducts.ts` | `AddDistributionPolicyToNetureSupplierProducts1740200000000` | 148 | 140 | 126 |
| 586 | 1740222700000 | `20260222700000-CreateMarketTrialTables.ts` | `CreateMarketTrialTables1740222700000` | 154 | 147 | 132 |
| 587 | 1740222800000 | `20260222800000-AddVisibleServiceKeysToMarketTrials.ts` | `AddVisibleServiceKeysToMarketTrials1740222800000` | 155 | 148 | 133 |
| 588 | 1740556801000 | `20260226100001-RemoveExternalProductIdFromListings.ts` | `RemoveExternalProductIdFromListings1740556801000` | 181 | 168 | 159 |
| 589 | 1740700801000 | `20260228200001-NeturePriceArchitectureFreeze.ts` | `NeturePriceArchitectureFreeze1740700801000` | 188 | 181 | 166 |
| 590 | 1740700810001 | `20260228210001-NetureTimeLimitedPriceCampaign.ts` | `NetureTimeLimitedPriceCampaign1740700810001` | 189 | 182 | 167 |
| 591 | 1740700820001 | `20260228220001-CampaignSimplification.ts` | `CampaignSimplification1740700820001` | 190 | 183 | 168 |
| 592 | 1740783601000 | `20260228230001-CampaignPeriodCheck.ts` | `CampaignPeriodCheck1740783601000` | 191 | 184 | 169 |
| 593 | 1745287200000 | `20260422100000-RenameMarketingNameToName.ts` | `RenameMarketingNameToName1745287200000` | 410 | 381 | 381 |
| 594 | 1745290800000 | `20260422200000-CreateProductAliases.ts` | `CreateProductAliases1745290800000` | 411 | 382 | 382 |
| 595 | 1770601460383 | `1770601460383-ActivateAdminUser.ts` | `ActivateAdminUser1770601460383` | 95 | 34 | 76 |
| 596 | 1771027200000 | `1771027200000-CreateO4oPaymentsTable.ts` | `CreateO4oPaymentsTable1771027200000` | 534 | 35 | 500 |
| 597 | 1771027200001 | `1771027200001-AddPaymentKeyUniqueAndStatusIndex.ts` | `AddPaymentKeyUniqueAndStatusIndex1771027200001` | 535 | 36 | 501 |
| 598 | 1771200000006 | `1771200000006-CreateStoreBlogPosts.ts` | `CreateStoreBlogPosts1771200000006` | 420 | 37 | 391 |
| 599 | 1771200000010 | `1771200000010-CreateServiceMemberships.ts` | `CreateServiceMemberships1771200000010` | 239 | 38 | 217 |
| 600 | 1771200000015 | `1771200000015-CreateAuthTokenTables.ts` | `CreateAuthTokenTables1771200000015` | 243 | 39 | 221 |
| 601 | 1771200000016 | `1771200000016-RemoveGlycopharmTestAccounts.ts` | `RemoveGlycopharmTestAccounts1771200000016` | 245 | 40 | 223 |
| 602 | 1771200000017 | `20260320000001-AddForumTypeToCategory.ts` | `AddForumTypeToCategory1771200000017` | 262 | 251 | 240 |
| 603 | 1771200000018 | `20260320000002-CreateMarketTrialServiceApprovals.ts` | `CreateMarketTrialServiceApprovals1771200000018` | 263 | 252 | 241 |
| 604 | 1771200000019 | `1771200000019-AddSupplierBusinessProfileFields.ts` | `AddSupplierBusinessProfileFields1771200000019` | 261 | 41 | 239 |
| 605 | 1771200000019 | `20260417200000-DropMarketTrialServiceApprovals.ts` | `DropMarketTrialServiceApprovals1771200000019` | 393 | 367 | 366 |
| 606 | 1771200000020 | `1771200000020-CreateOperatorActionDismissals.ts` | `CreateOperatorActionDismissals1771200000020` | 536 | 42 | 502 |
| 607 | 1771200000020 | `20260417300000-CreateMarketTrialForumSyncFailures.ts` | `CreateMarketTrialForumSyncFailures1771200000020` | 394 | 368 | 367 |
| 608 | 1771200000023 | `1771200000023-AddKpaMemberSubRole.ts` | `AddKpaMemberSubRole1771200000023` | 365 | 43 | 339 |
| 609 | 1771200000024 | `1771200000024-CreateKpaExternalExpertProfiles.ts` | `CreateKpaExternalExpertProfiles1771200000024` | 366 | 44 | 340 |
| 610 | 1771200000025 | `1771200000025-CreateKpaSupplierStaffProfiles.ts` | `CreateKpaSupplierStaffProfiles1771200000025` | 367 | 45 | 341 |
| 611 | 1771200000026 | `1771200000026-MakeKpaMemberOrganizationIdNullable.ts` | `MakeKpaMemberOrganizationIdNullable1771200000026` | 368 | 46 | 342 |
| 612 | 1771200000027 | `1771200000027-CreateGlycopharmContentsTables.ts` | `CreateGlycopharmContentsTables1771200000027` | 497 | 47 | 463 |
| 613 | 1771200000027 | `1771200000027-CreateQualificationTables.ts` | `CreateQualificationTables1771200000027` | 369 | 48 | 343 |
| 614 | 1771200000028 | `1771200000028-CreateInstructorProfiles.ts` | `CreateInstructorProfiles1771200000028` | 370 | 49 | 344 |
| 615 | 2025011100001 | `2025011100001-AddExternalContactToUsers.ts` | `AddExternalContactToUsers2025011100001` | 26 | 50 | 15 |
| 616 | 2026011700001 | `2026011700001-CreateSignageCoreEntities.ts` | `CreateSignageCoreEntities2026011700001` | 41 | 51 | 28 |
| 617 | 2026012100001 | `2026012100001-CreateO4OAdminVaultAccount.ts` | `CreateO4OAdminVaultAccount2026012100001` | 47 | 52 | 31 |
| 618 | 2026012100002 | `2026012100002-CreatePlatformInquiriesTable.ts` | `CreatePlatformInquiriesTable2026012100002` | 48 | 53 | 32 |
| 619 | 2026012200001 | `2026012200001-CreateAppRegistryTable.ts` | `CreateAppRegistryTable2026012200001` | 49 | 54 | 33 |
| 620 | 2026012200002 | `2026012200002-SeedDefaultApps.ts` | `SeedDefaultApps2026012200002` | 50 | 55 | 34 |
| 621 | 2026012600001 | `2026012600001-UpdateAdminEmailToMatch.ts` | `UpdateAdminEmailToMatch2026012600001` | 54 | 56 | 37 |
| 622 | 2026012700001 | `2026012700001-MakeForumPostAuthorNullable.ts` | `MakeForumPostAuthorNullable2026012700001` | 56 | 57 | 38 |
| 623 | 2026012700002 | `2026012700002-CreateForumCategoryRequest.ts` | `CreateForumCategoryRequest2026012700002` | 57 | 58 | 39 |
| 624 | 2026012800001 | `2026012800001-CreateKpaOrganizationJoinRequests.ts` | `CreateKpaOrganizationJoinRequests2026012800001` | 58 | 59 | 40 |
| 625 | 2026013000001 | `2026013000001-RemoveNetureSeedData.ts` | `RemoveNetureSeedData2026013000001` | 59 | 60 | 41 |
| 626 | 2026013000002 | `2026013000002-RestoreNetureSupplierData.ts` | `RestoreNetureSupplierData2026013000002` | 60 | 61 | 42 |
| 627 | 2026013100001 | `2026013100001-CreateNeturePartnerDashboardItems.ts` | `CreateNeturePartnerDashboardItems2026013100001` | 62 | 62 | 44 |
| 628 | 2026013100002 | `2026013100002-CreatePartnerDashboardItemContents.ts` | `CreatePartnerDashboardItemContents2026013100002` | 63 | 63 | 45 |
| 629 | 2026013100003 | `2026013100003-AddOrderAndPrimaryToItemContents.ts` | `AddOrderAndPrimaryToItemContents2026013100003` | 64 | 64 | 46 |
| 630 | 2026013100004 | `2026013100004-CleanupForumOrphanedPosts.ts` | `CleanupForumOrphanedPosts2026013100004` | 65 | 65 | 47 |
| 631 | 2026020100001 | `2026020100001-CreatePartnerRecruitmentTables.ts` | `CreatePartnerRecruitmentTables2026020100001` | 66 | 66 | 48 |
| 632 | 2026020200001 | `2026020200001-AddIconUrlToForumCategory.ts` | `AddIconUrlToForumCategory2026020200001` | 67 | 67 | 49 |
| 633 | 2026020300001 | `2026020300001-AddPinnedAndIconEmojiToForumCategory.ts` | `AddPinnedAndIconEmojiToForumCategory2026020300001` | 68 | 68 | 50 |
| 634 | 2026020400001 | `2026020400001-AddContactVisibilityToNetureSuppliers.ts` | `AddContactVisibilityToNetureSuppliers2026020400001` | 69 | 69 | 51 |
| 635 | 2026020500001 | `2026020500001-CreatePlatformServicesCatalog.ts` | `CreatePlatformServicesCatalog2026020500001` | 71 | 71 | 53 |
| 636 | 2026020500002 | `2026020500002-SeedPlatformServices.ts` | `SeedPlatformServices2026020500002` | 72 | 72 | 54 |
| 637 | 2026020500003 | `2026020500003-CreateUserServiceEnrollments.ts` | `CreateUserServiceEnrollments2026020500003` | 73 | 73 | 55 |
| 638 | 2026020600001 | `2026020600001-CreateForumPostLikeTable.ts` | `CreateForumPostLikeTable2026020600001` | 74 | 80 | 56 |
| 639 | 2026020700002 | `2026020700002-CreateKpaStewardsTable.ts` | `CreateKpaStewardsTable2026020700002` | 76 | 85 | 58 |
| 640 | 2026020800001 | `2026020800001-RemoveNetureFromFeatured.ts` | `RemoveNetureFromFeatured2026020800001` | 77 | 91 | 59 |
| 641 | 2026020800002 | `2026020800002-RemoveNonAdminTestAccounts.ts` | `RemoveNonAdminTestAccounts2026020800002` | 78 | 92 | 60 |
| 642 | 2026020800003 | `2026020800003-CreateOperatorNotificationSettings.ts` | `CreateOperatorNotificationSettings2026020800003` | 79 | 93 | 61 |
| 643 | 2026042900001 | `2026042900001-CreateGuideContents.ts` | `CreateGuideContents2026042900001` | 430 | 390 | 401 |
| 644 | 2026052100001 | `2026052100001-CreateServicePointBudgets.ts` | `CreateServicePointBudgets2026052100001` | 498 | 410 | 464 |

</details>

## 부록 B. 파일명 prefix ≠ 유효 이름 suffix (65)

<details><summary>펼치기</summary>

| 파일명 | TypeORM 유효 이름 | class | name 속성 | 유형 |
|---|---|---|---|---|
| `2026020400002-SeedForumServiceOrganizations.ts` | `SeedForumServiceOrganizations1706745602002` | `SeedForumServiceOrganizations1706745602002` | `(없음)` | 13자리 날짜형 파일명 · 13자리 epoch class |
| `2026020700001-NullifyForumPostOrgIdForCommunity.ts` | `NullifyForumPostOrgIdForCommunity1706745607001` | `NullifyForumPostOrgIdForCommunity1706745607001` | `(없음)` | 13자리 날짜형 파일명 · 13자리 epoch class |
| `20260212000001-AddKpaMemberUniqueConstraints.ts` | `AddKpaMemberUniqueConstraints1707696001000` | `AddKpaMemberUniqueConstraints1707696001000` | `AddKpaMemberUniqueConstraints1707696001000` | 14자리 파일명 · 13자리 epoch class |
| `20260212000002-CreateKpaMemberServicesAndIdentityStatus.ts` | `CreateKpaMemberServicesAndIdentityStatus1707696002000` | `CreateKpaMemberServicesAndIdentityStatus1707696002000` | `CreateKpaMemberServicesAndIdentityStatus1707696002000` | 14자리 파일명 · 13자리 epoch class |
| `20260214000001-NormalizeBusinessNumbers.ts` | `NormalizeBusinessNumbers1708300000001` | `NormalizeBusinessNumbers1708300000001` | `NormalizeBusinessNumbers1708300000001` | 14자리 파일명 · 13자리 epoch class |
| `20260214000002-AddBusinessNumberConstraints.ts` | `AddBusinessNumberConstraints1708300000002` | `AddBusinessNumberConstraints1708300000002` | `AddBusinessNumberConstraints1708300000002` | 14자리 파일명 · 13자리 epoch class |
| `20260214000003-AddStoreIdentityFields.ts` | `AddStoreIdentityFields1708300000003` | `AddStoreIdentityFields1708300000003` | `AddStoreIdentityFields1708300000003` | 14자리 파일명 · 13자리 epoch class |
| `20260222100000-AddDistributionPolicyToNetureSupplierProducts.ts` | `AddDistributionPolicyToNetureSupplierProducts1740200000000` | `AddDistributionPolicyToNetureSupplierProducts1740200000000` | `AddDistributionPolicyToNetureSupplierProducts1740200000000` | 14자리 파일명 · 13자리 epoch class |
| `20260222700000-CreateMarketTrialTables.ts` | `CreateMarketTrialTables1740222700000` | `CreateMarketTrialTables1740222700000` | `CreateMarketTrialTables1740222700000` | 14자리 파일명 · 13자리 epoch class |
| `20260222800000-AddVisibleServiceKeysToMarketTrials.ts` | `AddVisibleServiceKeysToMarketTrials1740222800000` | `AddVisibleServiceKeysToMarketTrials1740222800000` | `AddVisibleServiceKeysToMarketTrials1740222800000` | 14자리 파일명 · 13자리 epoch class |
| `20260223100000-SeedHubSlotContent.ts` | `SeedHubSlotContent1708675200000` | `SeedHubSlotContent1708675200000` | `SeedHubSlotContent1708675200000` | 14자리 파일명 · 13자리 epoch class |
| `20260223120000-AlignHubSlotKeys.ts` | `AlignHubSlotKeys1708682400000` | `AlignHubSlotKeys1708682400000` | `AlignHubSlotKeys1708682400000` | 14자리 파일명 · 13자리 epoch class |
| `20260224000000-AddAuthorRoleAndVisibilityScopeToCmsContents.ts` | `AddAuthorRoleAndVisibilityScopeToCmsContents1708732800000` | `AddAuthorRoleAndVisibilityScopeToCmsContents1708732800000` | `AddAuthorRoleAndVisibilityScopeToCmsContents1708732800000` | 14자리 파일명 · 13자리 epoch class |
| `20260224100000-CreateRoleAssignmentsTable.ts` | `CreateRoleAssignmentsTable1708736400000` | `CreateRoleAssignmentsTable1708736400000` | `CreateRoleAssignmentsTable1708736400000` | 14자리 파일명 · 13자리 epoch class |
| `20260224500000-SignageApprovalStatusModel.ts` | `SignageApprovalStatusModel1708819200000` | `SignageApprovalStatusModel1708819200000` | `SignageApprovalStatusModel1708819200000` | 14자리 파일명 · 13자리 epoch class |
| `20260224700000-CmsContentPendingStatus.ts` | `CmsContentPendingStatus1708819200000` | `CmsContentPendingStatus1708819200000` | `CmsContentPendingStatus1708819200000` | 14자리 파일명 · 13자리 epoch class |
| `20260226100001-RemoveExternalProductIdFromListings.ts` | `RemoveExternalProductIdFromListings1740556801000` | `RemoveExternalProductIdFromListings1740556801000` | `(없음)` | 14자리 파일명 · 13자리 epoch class |
| `20260228200001-NeturePriceArchitectureFreeze.ts` | `NeturePriceArchitectureFreeze1740700801000` | `NeturePriceArchitectureFreeze1740700801000` | `NeturePriceArchitectureFreeze1740700801000` | 14자리 파일명 · 13자리 epoch class |
| `20260228210001-NetureTimeLimitedPriceCampaign.ts` | `NetureTimeLimitedPriceCampaign1740700810001` | `NetureTimeLimitedPriceCampaign1740700810001` | `NetureTimeLimitedPriceCampaign1740700810001` | 14자리 파일명 · 13자리 epoch class |
| `20260228220001-CampaignSimplification.ts` | `CampaignSimplification1740700820001` | `CampaignSimplification1740700820001` | `CampaignSimplification1740700820001` | 14자리 파일명 · 13자리 epoch class |
| `20260228230001-CampaignPeriodCheck.ts` | `CampaignPeriodCheck1740783601000` | `CampaignPeriodCheck1740783601000` | `CampaignPeriodCheck1740783601000` | 14자리 파일명 · 13자리 epoch class |
| `20260303000000-DropNetureSupplierContents.ts` | `DropNetureSupplierContents1709420400000` | `DropNetureSupplierContents1709420400000` | `DropNetureSupplierContents1709420400000` | 14자리 파일명 · 13자리 epoch class |
| `20260304100000-CleanupProductDemoData.ts` | `CleanupProductDemoData1709560000000` | `CleanupProductDemoData1709560000000` | `CleanupProductDemoData1709560000000` | 14자리 파일명 · 13자리 epoch class |
| `20260304110000-CleanupDemoSeedData.ts` | `CleanupDemoSeedData1709564400000` | `CleanupDemoSeedData1709564400000` | `CleanupDemoSeedData1709564400000` | 14자리 파일명 · 13자리 epoch class |
| `20260308800000-AddPharmacistCommentToStoreProductProfiles.ts` | `AddPharmacistCommentToStoreProductProfiles1709884800000` | `AddPharmacistCommentToStoreProductProfiles1709884800000` | `(없음)` | 14자리 파일명 · 13자리 epoch class |
| `20260313100000-CreateCarePharmacyLinkRequests.ts` | `CreateCarePharmacyLinkRequests1720868400000` | `CreateCarePharmacyLinkRequests1720868400000` | `CreateCarePharmacyLinkRequests1720868400000` | 14자리 파일명 · 13자리 epoch class |
| `20260313200000-AddBodyBlocksToCmsContents.ts` | `AddBodyBlocksToCmsContents1710360000000` | `AddBodyBlocksToCmsContents1710360000000` | `AddBodyBlocksToCmsContents1710360000000` | 14자리 파일명 · 13자리 epoch class |
| `20260313210000-AddAttachmentsToCmsContents.ts` | `AddAttachmentsToCmsContents1710367800000` | `AddAttachmentsToCmsContents1710367800000` | `AddAttachmentsToCmsContents1710367800000` | 14자리 파일명 · 13자리 epoch class |
| `20260314100000-CreateCareAppointments.ts` | `CreateCareAppointments1720954800000` | `CreateCareAppointments1720954800000` | `CreateCareAppointments1720954800000` | 14자리 파일명 · 13자리 epoch class |
| `20260316150000-AddDescriptionColumnsToSupplierProductOffers.ts` | `AddDescriptionColumnsToSupplierProductOffers1710590400000` | `AddDescriptionColumnsToSupplierProductOffers1710590400000` | `AddDescriptionColumnsToSupplierProductOffers1710590400000` | 14자리 파일명 · 13자리 epoch class |
| `20260318200000-AddStructuredAddress.ts` | `AddStructuredAddress1710748800000` | `AddStructuredAddress1710748800000` | `AddStructuredAddress1710748800000` | 14자리 파일명 · 13자리 epoch class |
| `20260320000001-AddForumTypeToCategory.ts` | `AddForumTypeToCategory1771200000017` | `AddForumTypeToCategory1771200000017` | `AddForumTypeToCategory1771200000017` | 14자리 파일명 · 13자리 epoch class |
| `20260320000002-CreateMarketTrialServiceApprovals.ts` | `CreateMarketTrialServiceApprovals1771200000018` | `CreateMarketTrialServiceApprovals1771200000018` | `CreateMarketTrialServiceApprovals1771200000018` | 14자리 파일명 · 13자리 epoch class |
| `20260322120000-UpdateCareAiModelToGemini25Flash.ts` | `UpdateCareAiModelToGemini25Flash1711094400000` | `UpdateCareAiModelToGemini25Flash1711094400000` | `UpdateCareAiModelToGemini25Flash1711094400000` | 14자리 파일명 · 13자리 epoch class |
| `20260323600000-FixGeminiModelName.ts` | `FixGeminiModelName1711209600000` | `FixGeminiModelName1711209600000` | `FixGeminiModelName1711209600000` | 14자리 파일명 · 13자리 epoch class |
| `20260325000001-AddTypeToProductImages.ts` | `AddTypeToProductImages1711500000001` | `AddTypeToProductImages1711500000001` | `(없음)` | 14자리 파일명 · 13자리 epoch class |
| `20260325400000-AddBarcodeSourceToProductMasters.ts` | `AddBarcodeSourceToProductMasters1711382400000` | `AddBarcodeSourceToProductMasters1711382400000` | `(없음)` | 14자리 파일명 · 13자리 epoch class |
| `20260326500000-RepointListingOrganizationFK.ts` | `RepointListingOrganizationFK1711440600000` | `RepointListingOrganizationFK1711440600000` | `RepointListingOrganizationFK1711440600000` | 14자리 파일명 · 13자리 epoch class |
| `20260326600000-SeedNetureOrgEnrollments.ts` | `SeedNetureOrgEnrollments1711444200000` | `SeedNetureOrgEnrollments1711444200000` | `SeedNetureOrgEnrollments1711444200000` | 14자리 파일명 · 13자리 epoch class |
| `20260327100000-CsvPartialSuccess.ts` | `CsvPartialSuccess1711500000000` | `CsvPartialSuccess1711500000000` | `(없음)` | 14자리 파일명 · 13자리 epoch class |
| `20260327110000-ImportProductTrace.ts` | `ImportProductTrace1711501100000` | `ImportProductTrace1711501100000` | `(없음)` | 14자리 파일명 · 13자리 epoch class |
| `20260328000100-BackfillOfferServiceApprovals.ts` | `BackfillOfferServiceApprovals1711584060000` | `BackfillOfferServiceApprovals1711584060000` | `BackfillOfferServiceApprovals1711584060000` | 14자리 파일명 · 13자리 epoch class |
| `20260331100000-UnifyUserRoleToCustomer.ts` | `UnifyUserRoleToCustomer1711871600000` | `UnifyUserRoleToCustomer1711871600000` | `(없음)` | 14자리 파일명 · 13자리 epoch class |
| `20260331200000-UnifyGlycopharmSellerToPharmacy.ts` | `UnifyGlycopharmSellerToPharmacy1711875200000` | `UnifyGlycopharmSellerToPharmacy1711875200000` | `(없음)` | 14자리 파일명 · 13자리 epoch class |
| `20260331300000-UnifyGlycopharmPharmacyRole.ts` | `UnifyGlycopharmPharmacyRole1711878800000` | `UnifyGlycopharmPharmacyRole1711878800000` | `(없음)` | 14자리 파일명 · 13자리 epoch class |
| `20260331400000-UnifyGlycopharmRolesCatalog.ts` | `UnifyGlycopharmRolesCatalog1711882400000` | `UnifyGlycopharmRolesCatalog1711882400000` | `(없음)` | 14자리 파일명 · 13자리 epoch class |
| `20260331500000-UnifyCosmeticsRolesCatalog.ts` | `UnifyCosmeticsRolesCatalog1711886000000` | `UnifyCosmeticsRolesCatalog1711886000000` | `(없음)` | 14자리 파일명 · 13자리 epoch class |
| `20260401100000-BackfillHealthReadingsPharmacyId.ts` | `BackfillHealthReadingsPharmacyId1712000000000` | `BackfillHealthReadingsPharmacyId1712000000000` | `(없음)` | 14자리 파일명 · 13자리 epoch class |
| `20260401200000-FixHealthReadingsPatientId.ts` | `FixHealthReadingsPatientId1712070000000` | `FixHealthReadingsPatientId1712070000000` | `(없음)` | 14자리 파일명 · 13자리 epoch class |
| `20260403100000-AddSoftDeleteToSupplierProductOffers.ts` | `AddSoftDeleteToSupplierProductOffers1712134800000` | `AddSoftDeleteToSupplierProductOffers1712134800000` | `(없음)` | 14자리 파일명 · 13자리 epoch class |
| `20260403300000-CreateKpaApprovalRequestsTable.ts` | `CreateKpaApprovalRequestsTable1712170800000` | `CreateKpaApprovalRequestsTable1712170800000` | `(없음)` | 14자리 파일명 · 13자리 epoch class |
| `20260403500000-CleanupKpaForumPostsV2.ts` | `CleanupKpaForumPostsV2_1712192400000` | `CleanupKpaForumPostsV2_1712192400000` | `(없음)` | 14자리 파일명 · 13자리 epoch class |
| `20260403600000-CleanupKpaAuditLogs.ts` | `CleanupKpaAuditLogs1712196000000` | `CleanupKpaAuditLogs1712196000000` | `(없음)` | 14자리 파일명 · 13자리 epoch class |
| `20260403700000-CleanupOrphanKpaMembers.ts` | `CleanupOrphanKpaMembers1712199600000` | `CleanupOrphanKpaMembers1712199600000` | `(없음)` | 14자리 파일명 · 13자리 epoch class |
| `20260403800000-BackfillServiceOfferListings.ts` | `BackfillServiceOfferListings1714700000000` | `BackfillServiceOfferListings1714700000000` | `(없음)` | 14자리 파일명 · 13자리 epoch class |
| `20260403800000-CleanupAllKpaTestAccounts.ts` | `CleanupAllKpaTestAccounts1712203200000` | `CleanupAllKpaTestAccounts1712203200000` | `(없음)` | 14자리 파일명 · 13자리 epoch class |
| `20260403950000-BackfillKpaSecondReviewPendingRows.ts` | `BackfillKpaSecondReviewPendingRows1712195400000` | `BackfillKpaSecondReviewPendingRows1712195400000` | `(없음)` | 14자리 파일명 · 13자리 epoch class |
| `20260404100000-FixCoachingPatientIdNormalization.ts` | `FixCoachingPatientIdNormalization1714780800000` | `FixCoachingPatientIdNormalization1714780800000` | `(없음)` | 14자리 파일명 · 13자리 epoch class |
| `20260404500000-FixKpaAdminRole.ts` | `FixKpaAdminRole1712246400000` | `FixKpaAdminRole1712246400000` | `FixKpaAdminRole1712246400000` | 14자리 파일명 · 13자리 epoch class |
| `20260414100000-CreateCheckoutTables.ts` | `CreateCheckoutTables1713052800000` | `CreateCheckoutTables1713052800000` | `CreateCheckoutTables1713052800000` | 14자리 파일명 · 13자리 epoch class |
| `20260417200000-DropMarketTrialServiceApprovals.ts` | `DropMarketTrialServiceApprovals1771200000019` | `DropMarketTrialServiceApprovals1771200000019` | `DropMarketTrialServiceApprovals1771200000019` | 14자리 파일명 · 13자리 epoch class |
| `20260417300000-CreateMarketTrialForumSyncFailures.ts` | `CreateMarketTrialForumSyncFailures1771200000020` | `CreateMarketTrialForumSyncFailures1771200000020` | `CreateMarketTrialForumSyncFailures1771200000020` | 14자리 파일명 · 13자리 epoch class |
| `20260422100000-RenameMarketingNameToName.ts` | `RenameMarketingNameToName1745287200000` | `RenameMarketingNameToName1745287200000` | `(없음)` | 14자리 파일명 · 13자리 epoch class |
| `20260422200000-CreateProductAliases.ts` | `CreateProductAliases1745290800000` | `CreateProductAliases1745290800000` | `(없음)` | 14자리 파일명 · 13자리 epoch class |
| `4000000000003-AddReasonAndReapplyCooldownToEnrollments.ts` | `AddReasonAndReapplyCooldownToEnrollments1731129600000` | `AddReasonAndReapplyCooldownToEnrollments1731129600000` | `(없음)` | 임의 13자리 파일명(4000…) · 13자리 epoch class |

</details>

## 부록 C. E1 — TypeORM 순서(실 배포 경로) 빈 DB replay 실패 전수 (300)

<details><summary>펼치기 — 순번은 TypeORM 순위</summary>

| 순번 | 파일 | 운영 id | 오류 |
|---:|---|---:|---|
| 1 | `20260205033223-RolePrefixMigrationFoundation.js` | 81 | relation "users" does not exist |
| 2 | `20260205035000-ConvertRolesToArrayType.js` | 82 | relation "users" does not exist |
| 3 | `20260205040103-KpaRolePrefixMigration.js` | 83 | relation "users" does not exist |
| 4 | `20260205060000-NetureRolePrefixMigration.js` | 84 | relation "users" does not exist |
| 5 | `20260205070000-Phase4MultiServiceRolePrefixMigration.js` | 85 | relation "users" does not exist |
| 6 | `20260205104038-AddKpaAuthFields.js` | 80 | relation "users" does not exist |
| 7 | `20260206100000-SetDefaultNameForExistingUsers.js` | 86 | relation "users" does not exist |
| 12 | `20260207400000-SeedKpaSignageContent.js` | 92 | relation "signage_media" does not exist |
| 13 | `20260207500000-SeedKpaBannerContent.js` | 93 | relation "users" does not exist |
| 14 | `20260207700000-SeedKpaBenefitContent.js` | 94 | relation "users" does not exist |
| 17 | `20260210000001-AddContentViewCountAndRecommendations.js` | 98 | relation "cms_contents" does not exist |
| 29 | `20260215000003-AddStorefrontConfig.js` | 118 | relation "glycopharm_pharmacies" does not exist |
| 40 | `20260215300002-AddFkPharmacyOrganization.js` | 127 | relation "glycopharm_pharmacies" does not exist |
| 48 | `20260219000004-PharmacyIdentityRealign.js` | 139 | relation "users" does not exist |
| 49 | `20260219000005-CreateKpaPharmacyRequests.js` | 140 | relation "users" does not exist |
| 51 | `20260221000000-OrgServiceModelNormalizationPhaseA.js` | 142 | relation "platform_services" does not exist |
| 52 | `20260221100000-OrgServiceModelNormalizationPhaseC.js` | 143 | relation "glycopharm_pharmacy_extensions" does not exist |
| 53 | `20260222000000-NetureSupplierRelationStateExtension.js` | 145 | type "neture_supplier_request_status_enum" does not exist |
| 54 | `20260222000000-OfficerMemberFK.js` | 144 | relation "users" does not exist |
| 56 | `20260222100000-RequestTypeNormalization.js` | 146 | relation "kpa_organization_join_requests" does not exist |
| 57 | `20260222200000-RemoveKpaCRolesFromUsers.js` | 147 | relation "users" does not exist |
| 59 | `20260222400000-AddOrganizationIdToGlucoseViewCustomers.js` | 150 | relation "organizations" does not exist |
| 62 | `20260222900000-GlycopharmOrgEnrollmentRepair.js` | 156 | relation "organizations" does not exist |
| 63 | `20260224200000-CreateStoreLocalProductTables.js` | 161 | relation "organizations" does not exist |
| 64 | `20260224300000-HardenStoreLocalProductDomain.js` | 162 | relation "store_tablet_displays" does not exist |
| 65 | `20260224400000-AddStoreLocalProductContentFields.js` | 163 | relation "store_local_products" does not exist |
| 67 | `20260224600000-CreateSellerPartnerContractTable.js` | 165 | relation "neture_partner_applications" does not exist |
| 70 | `20260225100000-CreateProductApprovalsTable.js` | 170 | relation "neture_supplier_products" does not exist |
| 71 | `20260225100001-AddProductIdToOrganizationProductListings.js` | 171 | relation "neture_supplier_products" does not exist |
| 72 | `20260225100002-AddServiceDistributionType.js` | 172 | type "neture_supplier_products_distribution_type_enum" does not exist |
| 75 | `20260226200001-AddSupplierOnboardingColumns.js` | 175 | type "neture_supplier_status_enum" does not exist |
| 77 | `20260226300001-AddProductApprovalStatus.js` | 177 | relation "neture_supplier_products" does not exist |
| 78 | `20260226400001-AddRevokedApprovalStatus.js` | 178 | type "product_approval_status_enum" does not exist |
| 79 | `20260227000001-CreateKpaPharmacistProfiles.js` | 179 | relation "users" does not exist |
| 81 | `20260227999999-DropRoleAssignmentsRoleIdColumn.js` | 182 | relation "role_assignments" does not exist |
| 86 | `20260228100000-AddUserConsentColumns.js` | 187 | relation "users" does not exist |
| 87 | `20260301100000-ProductMasterCoreReset.js` | 192 | relation "product_approvals" does not exist |
| 88 | `20260301200000-CreateStoreEvents.js` | 194 | relation "organizations" does not exist |
| 89 | `20260301200000-ProductMasterWOAlignment.js` | 193 | relation "product_masters" does not exist |
| 91 | `20260301300000-CsvImportBatchTables.js` | 196 | relation "neture_suppliers" does not exist |
| 92 | `20260301400000-TabletInterestRequests.js` | 197 | relation "organizations" does not exist |
| 93 | `20260303100000-CreateNetureSupplierLibraryItems.js` | 202 | relation "neture_suppliers" does not exist |
| 94 | `20260303100000-CreateStoreLibraryItems.js` | 210 | relation "organizations" does not exist |
| 95 | `20260304100000-CreateStoreLibraryItems.js` | 198 | relation "organizations" does not exist |
| 96 | `20260304120000-CreateStoreQrCodes.js` | 199 | relation "organizations" does not exist |
| 98 | `20260304200000-CreateProductMarketingAssets.js` | 201 | relation "organizations" does not exist |
| 102 | `20260307000001-AddRequestedSlugToGlycopharmApplications.js` | 211 | relation "glycopharm_applications" does not exist |
| 103 | `20260307100000-CreateCatalogImportTables.js` | 209 | relation "neture_suppliers" does not exist |
| 104 | `20260307200000-CategoryBrandProductMasterExtension.js` | 212 | relation "product_masters" does not exist |
| 105 | `20260307210000-CreateProductImages.js` | 213 | relation "product_masters" does not exist |
| 106 | `20260307300000-AddInventoryToSupplierProductOffers.js` | 215 | relation "supplier_product_offers" does not exist |
| 118 | `20260308600000-AddSlugToSupplierProductOffers.js` | 226 | relation "supplier_product_offers" does not exist |
| 120 | `20260309100000-BackfillKpaStoreSlugs.js` | 229 | relation "organizations" does not exist |
| 121 | `20260309100000-CreateServiceProducts.js` | 230 | relation "product_masters" does not exist |
| 127 | `20260309300000-BackfillKpaStoreSlugsV2.js` | 233 | relation "organizations" does not exist |
| 131 | `20260311100000-CreateStoreCapabilities.js` | 241 | relation "organizations" does not exist |
| 132 | `20260311200000-CosmeticsStoreOrgBridge.js` | 242 | relation "organizations" does not exist |
| 136 | `20260317100000-NormalizeUserStatusCase.js` | 253 | relation "users" does not exist |
| 137 | `20260317110000-ActivateGlycopharmTestAccounts.js` | 254 | relation "users" does not exist |
| 138 | `20260318100000-BackfillServiceMembershipsFromRoles.js` | 255 | relation "role_assignments" does not exist |
| 139 | `20260318100000-ExtendRolesTable.js` | 259 | relation "roles" does not exist |
| 140 | `20260318110000-RenamePharmacistToPharmacyRole.js` | 256 | relation "role_assignments" does not exist |
| 142 | `20260318130000-LinkTestPharmacistToOrganization.js` | 258 | relation "users" does not exist |
| 143 | `20260321100000-AddFieldsToCatalogImportRows.js` | 264 | relation "catalog_import_rows" does not exist |
| 145 | `20260322100000-SeedGlycopharmForumCategory.js` | 266 | relation "organizations" does not exist |
| 150 | `20260323500000-AddIsRegulatedToProductCategories.js` | 272 | relation "product_categories" does not exist |
| 151 | `20260323700000-AddMetadataToForumCategory.js` | 271 | relation "forum_category" does not exist |
| 152 | `20260323700000-SeedProductCategories.js` | 275 | relation "product_categories" does not exist |
| 154 | `20260325200000-AddServiceKeysToOffers.js` | 278 | relation "supplier_product_offers" does not exist |
| 155 | `20260325300000-CreateOfferServiceApprovals.js` | 279 | relation "supplier_product_offers" does not exist |
| 156 | `20260326100000-NormalizeGlycopharmPharmacyRole.js` | 281 | relation "role_assignments" does not exist |
| 157 | `20260326200000-CreateKpaStudentProfiles.js` | 284 | relation "users" does not exist |
| 158 | `20260326300000-AddUserIdToGlucoseviewCustomers.js` | 282 | relation "users" does not exist |
| 159 | `20260326300000-DeactivateQualificationRoles.js` | 285 | relation "role_assignments" does not exist |
| 160 | `20260326400000-UnifyCarePatientIdToUsersId.js` | 283 | column gc.user_id does not exist |
| 165 | `20260328100000-FixMarketTrialTitle.js` | 295 | relation "market_trials" does not exist |
| 166 | `20260328110000-CreateOfferCurationsTable.js` | 296 | relation "supplier_product_offers" does not exist |
| 167 | `20260328120000-AddAnalyticsIndexesOfferServiceApprovals.js` | 299 | relation "offer_service_approvals" does not exist |
| 168 | `20260328200000-AddOperatorNotesToServiceMemberships.js` | 297 | relation "service_memberships" does not exist |
| 169 | `20260328300000-BridgeApprovedRegistrationsToSuppliers.js` | 298 | relation "users" does not exist |
| 170 | `20260328400000-AddCmsMetadataGinIndex.js` | 300 | relation "cms_contents" does not exist |
| 172 | `20260329100000-CreateCategoryMappingRulesTable.js` | 302 | relation "product_categories" does not exist |
| 173 | `20260329200000-ExpandCategoryTreeAndMappingRules.js` | 303 | relation "product_categories" does not exist |
| 177 | `20260331100000-BackfillGlycopharmPharmacyOrganizations.js` | 313 | relation "users" does not exist |
| 178 | `20260331500000-UnifyNetureRoles.js` | 310 | relation "role_assignments" does not exist |
| 181 | `20260402100000-AddConsultationResultToAppointments.js` | 318 | relation "care_appointments" does not exist |
| 182 | `20260403100000-CleanupNetureServiceData.js` | 321 | relation "offer_service_approvals" does not exist |
| 184 | `20260403200000-AddIsPublicToSupplierProductOffers.js` | 320 | relation "supplier_product_offers" does not exist |
| 186 | `20260404200000-RemoveGlucoseViewFromFeatured.js` | 335 | relation "platform_services" does not exist |
| 187 | `20260404300000-EnablePharmacyCoreCapabilities.js` | 336 | relation "store_capabilities" does not exist |
| 188 | `20260404400000-CreateForumCategoryMembersTable.js` | 337 | relation "forum_category" does not exist |
| 189 | `20260405200000-BackfillIsRegulatedFlags.js` | 340 | relation "product_categories" does not exist |
| 192 | `20260406300000-BackfillTestProductsEmptyFields.js` | 343 | relation "product_categories" does not exist |
| 194 | `20260409100000-AddIsFeaturedToSupplierProductOffers.js` | 345 | relation "supplier_product_offers" does not exist |
| 195 | `20260409110000-DropOfferCurationsTable.js` | 346 | relation "offer_curations" does not exist |
| 202 | `20260410200000-AddCategoryIdToSignageMedia.js` | 354 | relation "signage_media" does not exist |
| 203 | `20260410300000-DeleteKpaSocietyOrganizationChannels.js` | 353 | relation "organization_service_enrollments" does not exist |
| 206 | `20260411100000-BackfillKpaOrgsToOrganizations.js` | 357 | relation "organizations" does not exist |
| 207 | `20260411200000-BackfillApprovedListings.js` | 358 | column "master_id" of relation "organization_product_listings" does not exist |
| 208 | `20260411300000-NormalizeKpaServiceKeys.js` | 359 | relation "product_approvals" does not exist |
| 210 | `20260412100000-CleanupForumTestData.js` | 361 | relation "forum_category" does not exist |
| 212 | `20260415200000-AddConversionFieldsToMarketTrials.js` | 373 | relation "market_trials" does not exist |
| 213 | `20260415210000-AddNotificationSentAtToMarketTrials.js` | 374 | relation "market_trials" does not exist |
| 214 | `20260415220000-AddCustomerConversionToMarketTrialParticipants.js` | 375 | relation "market_trial_participants" does not exist |
| 215 | `20260415230000-AddListingLinkToMarketTrialParticipants.js` | 376 | relation "market_trial_participants" does not exist |
| 221 | `20260415280000-CreateGlycopharmMembersTable.js` | 382 | relation "users" does not exist |
| 222 | `20260416000001-BackfillPharmacyToGlycopharmPharmacist.js` | 383 | relation "role_assignments" does not exist |
| 223 | `20260416100000-AddRewardRateToMarketTrials.js` | 384 | relation "market_trials" does not exist |
| 224 | `20260416200000-ForceAddRewardRateToMarketTrials.js` | 385 | relation "market_trials" does not exist |
| 225 | `20260416300000-BackfillMissingKpaSlugs.js` | 386 | relation "organizations" does not exist |
| 226 | `20260416400000-BackfillKpaSlugsByMembership.js` | 388 | relation "organizations" does not exist |
| 227 | `20260416500000-AddSettlementFieldsToParticipants.js` | 387 | relation "market_trial_participants" does not exist |
| 230 | `20260417400000-MigrateApprovedTrialToRecruiting.js` | 392 | relation "market_trials" does not exist |
| 232 | `20260419100000-AddAssetTypeFieldsToStoreLibraryItems.js` | 396 | relation "store_library_items" does not exist |
| 233 | `20260419100000-AddSalesScenarioToMarketTrials.js` | 397 | relation "market_trials" does not exist |
| 234 | `20260419200000-AddOneLinerToMarketTrials.js` | 398 | relation "market_trials" does not exist |
| 235 | `20260419300000-AddVideoUrlToMarketTrials.js` | 399 | relation "market_trials" does not exist |
| 236 | `20260419400000-ResetMarketTrialDataAndRemoveServiceKeys.js` | 400 | relation "market_trial_forum_sync_failures" does not exist |
| 239 | `20260421010000-RenameStoreLibraryToExecutionAssets.js` | 405 | relation "store_library_items" does not exist |
| 240 | `20260421100000-AddContentMetaToLibraryItems.js` | 406 | relation "neture_supplier_library_items" does not exist |
| 241 | `20260422100000-AddContentLikeCount.js` | 412 | relation "cms_contents" does not exist |
| 243 | `20260424100000-DropSignageCategorySchema.js` | 414 | relation "signage_media" does not exist |
| 244 | `20260425100000-AddPlaylistTagsColumn.js` | 416 | relation "signage_playlists" does not exist |
| 245 | `20260425200000-AddStorePlaylistIdToSchedules.js` | 417 | relation "signage_schedules" does not exist |
| 246 | `20260425300000-ConvertForumPostTagsToArray.js` | 418 | relation "forum_post" does not exist |
| 254 | `20260501000000-BackfillQualificationRequests.js` | 442 | relation "qualification_requests" does not exist |
| 261 | `20260506000000-AddLifecycleTrackingToMarketTrials.js` | 458 | relation "market_trials" does not exist |
| 262 | `20260506010000-AddPaymentFieldsToMarketTrialParticipants.js` | 459 | relation "market_trial_participants" does not exist |
| 263 | `20260508200000-FixTestYaksaMemberRecords.js` | 462 | relation "users" does not exist |
| 264 | `20260509000000-AddIdlePlaylistItemsToStoreTablets.js` | 465 | relation "store_tablets" does not exist |
| 266 | `20260518000000-BackfillKpaSlugsLateJoin.js` | 491 | relation "organizations" does not exist |
| 268 | `20260521120000-AddSurveyRewardFields.js` | 499 | relation "lms_surveys" does not exist |
| 270 | `20260523000000-CreateServiceCredentials.js` | 505 | relation "users" does not exist |
| 271 | `20260524083827-CreateCosmeticsMembersTable.js` | 511 | relation "users" does not exist |
| 273 | `20260530124500-NullifyKpaWithdrawnLicenseNumbers.js` | 517 | relation "kpa_pharmacist_profiles" does not exist |
| 275 | `20260530220000-BackfillGlycopharmStoreOwnerEnrollmentAndRole.js` | 519 | relation "service_memberships" does not exist |
| 278 | `20260601200000-ForumRequestStateMachineColumns.js` | 407 | relation "forum_category_requests" does not exist |
| 279 | `20260603000000-AddServiceKeyToQualification.js` | 520 | relation "qualification_requests" does not exist |
| 280 | `20260606000000-CreateProductIdentifiers.js` | 526 | relation "product_masters" does not exist |
| 281 | `20260606010000-CreateProductCandidates.js` | 527 | relation "product_masters" does not exist |
| 282 | `20260606020000-CreateMobileProductDrafts.js` | 528 | relation "product_candidates" does not exist |
| 283 | `20260606030000-AddDrugCategoryToProductMasters.js` | 529 | relation "product_masters" does not exist |
| 284 | `20260606040000-CreateProductDrugExtensions.js` | 530 | relation "product_masters" does not exist |
| 285 | `20260607000000-AddSupplierShippingPolicyFields.js` | 531 | relation "neture_suppliers" does not exist |
| 287 | `20260615120000-CreateKycDocuments.js` | 547 | relation "users" does not exist |
| 288 | `20260615130000-AddSupplierBasicDocumentsAndSettlement.js` | 548 | relation "neture_suppliers" does not exist |
| 289 | `20260615140000-AddSupplierMailOrderReporting.js` | 549 | relation "neture_suppliers" does not exist |
| 290 | `20260615150000-AddSupplierRegulatedCategories.js` | 550 | relation "neture_suppliers" does not exist |
| 292 | `20260616000000-AddCancelledApplicationStatus.js` | 553 | type "neture_partner_application_status_enum" does not exist |
| 293 | `20260616100000-AddRecruitmentExposureStatus.js` | 554 | relation "neture_partner_recruitments" does not exist |
| 294 | `20260618000000-BackfillNetureSupplierProfiles.js` | 555 | relation "neture_suppliers" does not exist |
| 295 | `20260619000000-ExpandRecruitmentUniqueToService.js` | 556 | relation "neture_partner_recruitments" does not exist |
| 299 | `20260700000000-AddTagsToForumCategory.js` | 408 | relation "forum_category" does not exist |
| 300 | `20260700200000-MigrateLmsCreatorQualification.js` | 409 | relation "member_qualifications" does not exist |
| 301 | `20260801000000-ResetAndSeedKpaChannels.js` | 415 | relation "organization_service_enrollments" does not exist |
| 302 | `20260900000000-BackfillStoreOwnerRoles.js` | 422 | relation "roles" does not exist |
| 303 | `20260901000000-CleanupKCosmeticsSellerRole.js` | 423 | relation "role_assignments" does not exist |
| 304 | `20260902000000-AddSupplierOrderCondition.js` | 424 | relation "neture_suppliers" does not exist |
| 313 | `20260906300000-ForumFullCategoryRemoval.js` | 435 | current transaction is aborted, commands ignored until end of transaction block |
| 314 | `20260907000000-AddForumIdToForumPostAndSlugToRequests.js` | 436 | relation "forum_post" does not exist |
| 329 | `20260920000000-MakeOfferIdNullableAddMasterListing.js` | 470 | column "offer_id" of relation "organization_product_listings" does not exist |
| 333 | `20260923000000-FixNetureSupplierRoleAssignments.js` | 471 | relation "service_memberships" does not exist |
| 334 | `20260924000000-CleanupKpaOrphanRoles.js` | 472 | relation "role_assignments" does not exist |
| 335 | `20260924100000-FixKpaOrphanRoleCleanup.js` | 473 | relation "role_assignments" does not exist |
| 336 | `20260924200000-DeleteOrphanKpaUsers.js` | 474 | relation "users" does not exist |
| 337 | `20260924300000-DiagnosticMembershipGateAudit.js` | 476 | relation "users" does not exist |
| 338 | `20260924400000-DiagnosticKpaMembershipFlowAudit.js` | 477 | relation "service_memberships" does not exist |
| 339 | `20260925000000-CleanupNetureOrphanSuppliers.js` | 475 | relation "neture_suppliers" does not exist |
| 340 | `20260926000000-AddUniqueUserIdToNetureSuppliers.js` | 478 | relation "neture_suppliers" does not exist |
| 341 | `20260927100000-BootstrapCanonicalSeedAccounts.js` | 480 | relation "users" does not exist |
| 342 | `20260928000000-NormalizeServiceMembershipsKpaKey.js` | 482 | relation "service_memberships" does not exist |
| 343 | `20260929000000-NormalizeServiceMembershipsCosmeticsKey.js` | 484 | relation "service_memberships" does not exist |
| 344 | `20260930000000-BackfillCosmeticsServiceEnrollments.js` | 513 | column cs.organization_id does not exist |
| 346 | `20261001000000-CreateForumJoinRequests.js` | 514 | relation "forum_category_requests" does not exist |
| 347 | `20261001000000-NormalizeServiceMembershipsWithdrawnStatus.js` | 486 | relation "service_memberships" does not exist |
| 348 | `20261002000000-BackfillServiceMembershipsActiveFromKpaMembers.js` | 487 | relation "service_memberships" does not exist |
| 349 | `20261004000000-BackfillMissingKpaMembersCanonical.js` | 488 | relation "service_memberships" does not exist |
| 350 | `20261020000000-BackfillKpaStoreOwnerForTestUsers.js` | 489 | relation "users" does not exist |
| 352 | `20261022000000-BackfillKpaSlugsPostMemberApprovalPath.js` | 492 | relation "organizations" does not exist |
| 353 | `20261023000000-BackfillKpaOrganizationPharmacyInfo.js` | 493 | relation "organizations" does not exist |
| 354 | `20261024000000-BackfillApprovedKpaCourseStatus.js` | 495 | relation "kpa_approval_requests" does not exist |
| 355 | `20261025000000-BackfillApprovedKpaCourseStatusV2.js` | 496 | relation "kpa_approval_requests" does not exist |
| 356 | `20261026000000-AddServiceKeyToPasswordResetTokens.js` | 500 | relation "password_reset_tokens" does not exist |
| 357 | `20261026000001-RenameServiceKeyColumnInPasswordResetTokens.js` | 501 | relation "password_reset_tokens" does not exist |
| 359 | `20261027000000-MigrateLegacyRolesToPlatformPrefixed.js` | 504 | relation "role_assignments" does not exist |
| 360 | `20261028000000-AddAuthorRoleToStoreBlogPosts.js` | 507 | relation "store_blog_posts" does not exist |
| 361 | `20261028100000-MakeStoreBlogPostsStoreIdNullableForOperator.js` | 508 | relation "store_blog_posts" does not exist |
| 364 | `20261030000000-CanonicalBusinessFieldAlignment.js` | 515 | relation "neture_suppliers" does not exist |
| 365 | `20261030000001-GlycopharmPharmaciesOrgBridgeV2.js` | 516 | relation "organizations" does not exist |
| 366 | `20261031000000-NormalizeKCosmeticsSellerRoleWritepathBackfill.js` | 521 | relation "role_assignments" does not exist |
| 367 | `20261031000001-BackfillKCosmeticsSellerStoreContext.js` | 522 | relation "role_assignments" does not exist |
| 378 | `20261111000000-AlignGeminiEngineRegistry.js` | 544 | relation "ai_engines" does not exist |
| 379 | `20261112000000-AddBodyToGpKcosContents.js` | 545 | relation "glycopharm_contents" does not exist |
| 381 | `20261114000000-CreateSharedProductDescriptions.js` | 552 | relation "product_masters" does not exist |
| 383 | `20261116000000-DropMarketTrialConversionColumns.js` | 559 | relation "market_trials" does not exist |
| 384 | `20261117000000-CreateOfferServicePrices.js` | 558 | relation "supplier_product_offers" does not exist |
| 385 | `20261118000000-CleanupNetureTestSuppliers.js` | 560 | relation "neture_suppliers" does not exist |
| 392 | `20261125000000-AddQrConsultationCtaAndNullableInterestMaster.js` | 570 | relation "store_qr_codes" does not exist |
| 393 | `20261126000000-AddTagsToStoreContentSources.js` | 571 | relation "store_execution_assets" does not exist |
| 396 | `20261129000000-AddContentIdToStoreTabletDisplays.js` | 574 | relation "store_tablet_displays" does not exist |
| 397 | `20261130000000-AddImageImportResultToCsvBatch.js` | 575 | relation "supplier_csv_import_batches" does not exist |
| 398 | `20261201000000-AddBarcodeToStoreLocalProduct.js` | 576 | relation "store_local_products" does not exist |
| 399 | `20261202000000-CreateRepresentativeProductsAndLink.js` | 577 | relation "product_masters" does not exist |
| 401 | `20261204000000-CreateProductCandidateDescriptionDrafts.js` | 579 | relation "product_candidates" does not exist |
| 403 | `20261206000000-AddProductCurationSchemaAndCandidateIdentifierIndex.js` | 581 | relation "product_candidates" does not exist |
| 404 | `20261206010000-DeleteMedicalDeviceGrade4Masters.js` | 582 | relation "product_masters" does not exist |
| 405 | `20261207000000-MarkMedicalDeviceGrade3ByCategory.js` | 583 | relation "product_masters" does not exist |
| 406 | `20261207010000-DeleteMedicalDeviceGrade3DeleteMarked.js` | 584 | relation "product_master_cleanup_audits" does not exist |
| 407 | `20261208000000-MarkMedicalDeviceGrade2ByCategory.js` | 585 | relation "product_masters" does not exist |
| 408 | `20261208010000-DeleteMedicalDeviceGrade2DeleteMarked.js` | 586 | relation "product_master_cleanup_audits" does not exist |
| 409 | `20261209000000-MarkMedicalDeviceGrade1ByCategory.js` | 587 | relation "product_masters" does not exist |
| 410 | `20261209010000-DeleteMedicalDeviceGrade1DeleteMarked.js` | 588 | relation "product_master_cleanup_audits" does not exist |
| 411 | `20261210000000-MarkDrugUnspecifiedByRawGubun.js` | 589 | relation "product_candidates" does not exist |
| 412 | `20261210000000-ReclassifyMedicalDeviceReviewRequiredByMarketEvidence.js` | 590 | relation "product_masters" does not exist |
| 413 | `20261210010000-DeleteMedicalDeviceReviewResolvedDeleteMarked.js` | 591 | relation "product_master_cleanup_audits" does not exist |
| 414 | `20261211000000-SlimMedicalDeviceToDistributionFields.js` | 592 | relation "product_candidates" does not exist |
| 415 | `20261212000000-CreateProductMasterNotes.js` | 593 | relation "product_masters" does not exist |
| 416 | `20261220000000-AddProductImageActionColumnsAndAuditLogTable.js` | 594 | relation "product_images" does not exist |
| 417 | `20261221000000-AddNameIndexToProductMasters.js` | 595 | relation "product_masters" does not exist |
| 419 | `20261223000000-AddDescriptionTypeToSharedProductDescriptions.js` | 597 | relation "shared_product_descriptions" does not exist |
| 422 | `20261226000000-ApproveNeedsReviewSharedProductDescriptions.js` | 600 | relation "shared_product_descriptions" does not exist |
| 423 | `20261227000000-AddStatusToProductMasters.js` | 601 | relation "product_masters" does not exist |
| 424 | `20261228000000-CanonicalPerMasterTypeLanguage.js` | 602 | relation "shared_product_descriptions" does not exist |
| 426 | `20261230000000-ProductMasterBarcodeAndMfdsIdNullable.js` | 604 | relation "product_masters" does not exist |
| 428 | `20270102000000-LegacyInternalCodeBarcodeToNull.js` | 606 | relation "product_masters" does not exist |
| 429 | `20270108000000-AddAuthorSubjectMetadataToSharedProductDescriptions.js` | 609 | relation "shared_product_descriptions" does not exist |
| 430 | `20270120000000-CreateTabletScreenSetsAndBlocks.js` | 607 | relation "store_tablets" does not exist |
| 431 | `20270121000000-AddRevisionRequestToSharedProductDescriptions.js` | 610 | relation "shared_product_descriptions" does not exist |
| 432 | `20270205000000-AddTemplateKeyToTabletScreenSets.js` | 608 | relation "store_tablet_screen_sets" does not exist |
| 433 | `20270206000000-AddContentListToTabletBlockTypeCheck.js` | 611 | relation "store_tablet_screen_blocks" does not exist |
| 434 | `20270207000000-AddScreenSetQrLandingContract.js` | 615 | relation "store_tablet_screen_sets" does not exist |
| 435 | `20270207000000-CreateSharedProductDescriptionAuditLogs.js` | 612 | relation "product_masters" does not exist |
| 436 | `20270208000000-CreateStoreTabletCornerContents.js` | 616 | relation "store_tablets" does not exist |
| 437 | `20270208000000-NormalizeHffRegulatoryTypeBrokenLiteral.js` | 613 | relation "product_masters" does not exist |
| 438 | `20270209000000-DeleteHffCorruptedProductMasters.js` | 614 | relation "product_masters" does not exist |
| 439 | `20270210000000-AddScreenSetOwnerScopeModel.js` | 617 | relation "store_tablet_screen_sets" does not exist |
| 440 | `20270211000000-AddScreenSetHubTargetStoreType.js` | 618 | relation "store_tablet_screen_sets" does not exist |
| 443 | `20270214000000-AddProductAiGlobalIntegrityConstraints.js` | 619 | relation "product_masters" does not exist |
| 445 | `20270216000000-SeedPharmacyHubServiceAndRoles.js` | 623 | relation "platform_services" does not exist |
| 446 | `20270217000000-GrantPharmacyHubInitialOperator.js` | 624 | relation "users" does not exist |
| 449 | `20270220000000-AddCosmeticsProductInfoColumns.js` | 627 | [AddCosmeticsProductInfoColumns] ABORT: cosmetics.cosmetics_products 이 존재하지 않는다. 선행 스키마 확인 필요. |
| 451 | `20270222000000-CreateGlycopharmFeaturedProductsTable.js` | 629 | relation "glycopharm_products" does not exist |
| 455 | `20270226000000-SeedPharmacyHubAdminRole.js` | 633 | relation "roles" does not exist |
| 456 | `20270301000000-ReplaceRoleAssignmentsActiveUniqueConstraint.js` | 634 | relation "role_assignments" does not exist |
| 457 | `20270302000000-NormalizeNetureOperatorMembershipRole.js` | 635 | relation "service_memberships" does not exist |
| 460 | `20270305000000-SeedKpaBranchServiceAndRoles.js` | 638 | relation "platform_services" does not exist |
| 461 | `20270306000000-CreateExternalChannelProductLinks.js` | 639 | relation "organizations" does not exist |
| 465 | `20270310000000-DropUsersLegacyUpdatedAt.js` | 643 | relation "users" does not exist |
| 469 | `20270314000000-DeactivatePharmacyHubSupplierRole.js` | 647 | relation "roles" does not exist |
| 470 | `20270315000000-SeedPharmacyHubMemberRole.js` | 648 | relation "roles" does not exist |
| 471 | `20270316000000-NormalizePharmacyHubMemberMembershipRole.js` | 649 | relation "service_memberships" does not exist |
| 472 | `20270317000000-NormalizePharmacyHubBareMembershipRoles.js` | 650 | relation "service_memberships" does not exist |
| 473 | `20270318000000-RevokeOrphanedBareStoreOwnerRole.js` | 651 | relation "role_assignments" does not exist |
| 475 | `20270320000000-DropUsersPermissionsColumn.js` | 653 | relation "users" does not exist |
| 477 | `20270322000000-CreateCafe24MemberLinksAndSeedCafe24B2bService.js` | 655 | relation "users" does not exist |
| 482 | `20270326000000-DropGlycopharmService.js` | 660 | relation "roles" does not exist |
| 483 | `20270327000000-AddStoreQrContentSource.js` | 661 | relation "store_qr_codes" does not exist |
| 486 | `20270330000000-CreateStoreQrPlacements.js` | 664 | relation "store_qr_codes" does not exist |
| 496 | `20270409000000-RemoveProductContentFromTabletBlockTypeCheck.js` | 674 | relation "store_tablet_screen_blocks" does not exist |
| 500 | `20270413000000-BaselineRbacAndAccountTables.js` | 678 | [BaselineRbacAndAccountTables] role_permissions: required table "roles" is absent — cannot create FK target (roles has no creation migration: report, do not imp |
| 513 | `20260223100000-SeedHubSlotContent.js` | 157 | relation "cms_contents" does not exist |
| 514 | `20260223120000-AlignHubSlotKeys.js` | 158 | relation "cms_content_slots" does not exist |
| 515 | `20260224000000-AddAuthorRoleAndVisibilityScopeToCmsContents.js` | 159 | relation "cms_contents" does not exist |
| 517 | `20260224500000-SignageApprovalStatusModel.js` | 167 | relation "signage_media" does not exist |
| 518 | `20260224700000-CmsContentPendingStatus.js` | 166 | relation "cms_contents" does not exist |
| 522 | `20260308800000-AddPharmacistCommentToStoreProductProfiles.js` | 228 | relation "store_product_profiles" does not exist |
| 523 | `20260313200000-AddBodyBlocksToCmsContents.js` | 247 | relation "cms_contents" does not exist |
| 524 | `20260313210000-AddAttachmentsToCmsContents.js` | 249 | relation "cms_contents" does not exist |
| 526 | `20260318200000-AddStructuredAddress.js` | 260 | relation "organizations" does not exist |
| 527 | `20260322120000-UpdateCareAiModelToGemini25Flash.js` | 273 | relation "ai_model_settings" does not exist |
| 528 | `20260323600000-FixGeminiModelName.js` | 274 | relation "ai_model_settings" does not exist |
| 529 | `20260325400000-AddBarcodeSourceToProductMasters.js` | 280 | relation "product_masters" does not exist |
| 530 | `20260326500000-RepointListingOrganizationFK.js` | 286 | relation "organizations" does not exist |
| 531 | `20260326600000-SeedNetureOrgEnrollments.js` | 287 | relation "organizations" does not exist |
| 532 | `20260327100000-CsvPartialSuccess.js` | 292 | type "supplier_csv_import_batch_status_enum" does not exist |
| 533 | `20260325000001-AddTypeToProductImages.js` | 276 | relation "product_images" does not exist |
| 534 | `20260327110000-ImportProductTrace.js` | 293 | relation "supplier_csv_import_rows" does not exist |
| 535 | `20260328000100-BackfillOfferServiceApprovals.js` | 294 | relation "supplier_product_offers" does not exist |
| 536 | `20260331100000-UnifyUserRoleToCustomer.js` | 307 | relation "service_memberships" does not exist |
| 537 | `20260331200000-UnifyGlycopharmSellerToPharmacy.js` | 308 | relation "service_memberships" does not exist |
| 538 | `20260331300000-UnifyGlycopharmPharmacyRole.js` | 309 | relation "service_memberships" does not exist |
| 539 | `20260331400000-UnifyGlycopharmRolesCatalog.js` | 311 | relation "roles" does not exist |
| 540 | `20260331500000-UnifyCosmeticsRolesCatalog.js` | 312 | relation "roles" does not exist |
| 541 | `20260401100000-BackfillHealthReadingsPharmacyId.js` | 314 | relation "health_readings" does not exist |
| 542 | `20260401200000-FixHealthReadingsPatientId.js` | 315 | relation "health_readings" does not exist |
| 543 | `20260403100000-AddSoftDeleteToSupplierProductOffers.js` | 319 | relation "supplier_product_offers" does not exist |
| 545 | `20260403500000-CleanupKpaForumPostsV2.js` | 324 | relation "forum_comment" does not exist |
| 546 | `20260403950000-BackfillKpaSecondReviewPendingRows.js` | 330 | relation "product_approvals" does not exist |
| 552 | `20260403800000-BackfillServiceOfferListings.js` | 329 | column "master_id" of relation "organization_product_listings" does not exist |
| 553 | `20260404100000-FixCoachingPatientIdNormalization.js` | 333 | relation "care_coaching_sessions" does not exist |
| 581 | `1738300000000-AddPartnerRecruitingToGlycopharmProducts.js` | 61 | relation "public.glycopharm_products" does not exist |
| 588 | `20260226100001-RemoveExternalProductIdFromListings.js` | 181 | column "product_id" does not exist |
| 593 | `20260422100000-RenameMarketingNameToName.js` | 410 | relation "product_masters" does not exist |
| 594 | `20260422200000-CreateProductAliases.js` | 411 | relation "product_masters" does not exist |
| 595 | `1770601460383-ActivateAdminUser.js` | 95 | column "updatedAt" of relation "users" does not exist |
| 599 | `1771200000010-CreateServiceMemberships.js` | 239 | column u.service_key does not exist |
| 602 | `20260320000001-AddForumTypeToCategory.js` | 262 | relation "forum_category" does not exist |
| 630 | `2026013100004-CleanupForumOrphanedPosts.js` | 65 | relation "forum_comment" does not exist |
| 632 | `2026020200001-AddIconUrlToForumCategory.js` | 67 | relation "forum_category" does not exist |
| 633 | `2026020300001-AddPinnedAndIconEmojiToForumCategory.js` | 68 | relation "forum_category" does not exist |

</details>

## 부록 D. E2 — 파일명 순서 replay 실패 전수 (129)

<details><summary>펼치기</summary>

| 순번 | 파일 | 운영 id | 오류 |
|---:|---|---:|---|
| 6 | `1736400000000-AddEnabledServicesToPharmacy.js` | 18 | relation "glycopharm_pharmacies" does not exist |
| 30 | `1738300000000-AddPartnerRecruitingToGlycopharmProducts.js` | 61 | relation "public.glycopharm_products" does not exist |
| 32 | `1739600000000-AddKpaMemberProfessionFields.js` | 103 | relation "kpa_members" does not exist |
| 34 | `1770601460383-ActivateAdminUser.js` | 95 | column "updatedAt" of relation "users" does not exist |
| 38 | `1771200000010-CreateServiceMemberships.js` | 239 | column u.service_key does not exist |
| 40 | `1771200000016-RemoveGlycopharmTestAccounts.js` | 245 | relation "role_assignments" does not exist |
| 43 | `1771200000023-AddKpaMemberSubRole.js` | 365 | relation "kpa_members" does not exist |
| 46 | `1771200000026-MakeKpaMemberOrganizationIdNullable.js` | 368 | relation "kpa_members" does not exist |
| 65 | `2026013100004-CleanupForumOrphanedPosts.js` | 65 | relation "forum_comment" does not exist |
| 67 | `2026020200001-AddIconUrlToForumCategory.js` | 67 | relation "forum_category" does not exist |
| 68 | `2026020300001-AddPinnedAndIconEmojiToForumCategory.js` | 68 | relation "forum_category" does not exist |
| 76 | `20260205040103-KpaRolePrefixMigration.js` | 83 | column "service_key" does not exist |
| 77 | `20260205060000-NetureRolePrefixMigration.js` | 84 | column "service_key" does not exist |
| 78 | `20260205070000-Phase4MultiServiceRolePrefixMigration.js` | 85 | column "service_key" does not exist |
| 113 | `20260215000003-AddStorefrontConfig.js` | 118 | relation "glycopharm_pharmacies" does not exist |
| 124 | `20260215300002-AddFkPharmacyOrganization.js` | 127 | relation "glycopharm_pharmacies" does not exist |
| 135 | `20260221000000-OrgServiceModelNormalizationPhaseA.js` | 142 | relation "glycopharm_pharmacies" does not exist |
| 136 | `20260221100000-OrgServiceModelNormalizationPhaseC.js` | 143 | relation "glycopharm_pharmacy_extensions" does not exist |
| 144 | `20260222400000-AddOrganizationIdToGlucoseViewCustomers.js` | 150 | relation "organizations" does not exist |
| 149 | `20260222900000-GlycopharmOrgEnrollmentRepair.js` | 156 | relation "organizations" does not exist |
| 154 | `20260224200000-CreateStoreLocalProductTables.js` | 161 | relation "organizations" does not exist |
| 155 | `20260224300000-HardenStoreLocalProductDomain.js` | 162 | relation "store_tablet_displays" does not exist |
| 156 | `20260224400000-AddStoreLocalProductContentFields.js` | 163 | relation "store_local_products" does not exist |
| 173 | `20260227000001-CreateKpaPharmacistProfiles.js` | 179 | column km.activity_type does not exist |
| 180 | `20260228100000-AddUserConsentColumns.js` | 187 | column "createdAt" does not exist |
| 186 | `20260301200000-CreateStoreEvents.js` | 194 | relation "organizations" does not exist |
| 190 | `20260301400000-TabletInterestRequests.js` | 197 | relation "organizations" does not exist |
| 193 | `20260303100000-CreateStoreLibraryItems.js` | 210 | relation "organizations" does not exist |
| 195 | `20260304100000-CreateStoreLibraryItems.js` | 198 | relation "organizations" does not exist |
| 197 | `20260304120000-CreateStoreQrCodes.js` | 199 | relation "organizations" does not exist |
| 199 | `20260304200000-CreateProductMarketingAssets.js` | 201 | relation "organizations" does not exist |
| 222 | `20260309100000-BackfillKpaStoreSlugs.js` | 229 | relation "organizations" does not exist |
| 229 | `20260309300000-BackfillKpaStoreSlugsV2.js` | 233 | relation "organizations" does not exist |
| 233 | `20260311100000-CreateStoreCapabilities.js` | 241 | relation "organizations" does not exist |
| 234 | `20260311200000-CosmeticsStoreOrgBridge.js` | 242 | relation "organizations" does not exist |
| 243 | `20260317100000-NormalizeUserStatusCase.js` | 253 | column "updatedAt" of relation "users" does not exist |
| 244 | `20260317110000-ActivateGlycopharmTestAccounts.js` | 254 | column "updatedAt" of relation "users" does not exist |
| 245 | `20260318100000-BackfillServiceMembershipsFromRoles.js` | 255 | relation "service_memberships" does not exist |
| 246 | `20260318100000-ExtendRolesTable.js` | 259 | relation "roles" does not exist |
| 247 | `20260318110000-RenamePharmacistToPharmacyRole.js` | 256 | relation "service_memberships" does not exist |
| 250 | `20260318200000-AddStructuredAddress.js` | 260 | relation "organizations" does not exist |
| 251 | `20260320000001-AddForumTypeToCategory.js` | 262 | relation "forum_category" does not exist |
| 255 | `20260322100000-SeedGlycopharmForumCategory.js` | 266 | relation "organizations" does not exist |
| 263 | `20260323700000-AddMetadataToForumCategory.js` | 271 | relation "forum_category" does not exist |
| 270 | `20260326100000-NormalizeGlycopharmPharmacyRole.js` | 281 | relation "service_memberships" does not exist |
| 275 | `20260326500000-RepointListingOrganizationFK.js` | 286 | relation "organizations" does not exist |
| 276 | `20260326600000-NetureSupplierOrgBridge.js` | 288 | relation "organizations" does not exist |
| 277 | `20260326600000-SeedNetureOrgEnrollments.js` | 287 | relation "organizations" does not exist |
| 287 | `20260328200000-AddOperatorNotesToServiceMemberships.js` | 297 | relation "service_memberships" does not exist |
| 288 | `20260328300000-BridgeApprovedRegistrationsToSuppliers.js` | 298 | relation "service_memberships" does not exist |
| 296 | `20260331100000-BackfillGlycopharmPharmacyOrganizations.js` | 313 | relation "service_memberships" does not exist |
| 297 | `20260331100000-UnifyUserRoleToCustomer.js` | 307 | relation "service_memberships" does not exist |
| 298 | `20260331200000-UnifyGlycopharmSellerToPharmacy.js` | 308 | relation "service_memberships" does not exist |
| 299 | `20260331300000-UnifyGlycopharmPharmacyRole.js` | 309 | relation "service_memberships" does not exist |
| 300 | `20260331400000-UnifyGlycopharmRolesCatalog.js` | 311 | relation "roles" does not exist |
| 301 | `20260331500000-UnifyCosmeticsRolesCatalog.js` | 312 | relation "roles" does not exist |
| 302 | `20260331500000-UnifyNetureRoles.js` | 310 | relation "service_memberships" does not exist |
| 303 | `20260401100000-BackfillHealthReadingsPharmacyId.js` | 314 | column gc.organization_id does not exist |
| 313 | `20260403500000-CleanupKpaForumPostsV2.js` | 324 | relation "forum_comment" does not exist |
| 316 | `20260403800000-BackfillServiceOfferListings.js` | 329 | relation "organization_service_enrollments" does not exist |
| 322 | `20260404300000-EnablePharmacyCoreCapabilities.js` | 336 | relation "store_capabilities" does not exist |
| 323 | `20260404400000-CreateForumCategoryMembersTable.js` | 337 | relation "forum_category" does not exist |
| 339 | `20260410300000-DeleteKpaSocietyOrganizationChannels.js` | 353 | relation "organization_service_enrollments" does not exist |
| 342 | `20260411100000-BackfillKpaOrgsToOrganizations.js` | 357 | relation "organizations" does not exist |
| 346 | `20260412100000-CleanupForumTestData.js` | 361 | relation "forum_category" does not exist |
| 358 | `20260415280000-CreateGlycopharmMembersTable.js` | 382 | relation "organizations" does not exist |
| 362 | `20260416300000-BackfillMissingKpaSlugs.js` | 386 | relation "organizations" does not exist |
| 363 | `20260416400000-BackfillKpaSlugsByMembership.js` | 388 | relation "organizations" does not exist |
| 371 | `20260419100000-AddAssetTypeFieldsToStoreLibraryItems.js` | 396 | relation "store_library_items" does not exist |
| 378 | `20260421010000-RenameStoreLibraryToExecutionAssets.js` | 405 | relation "store_library_items" does not exist |
| 387 | `20260425300000-ConvertForumPostTagsToArray.js` | 418 | relation "forum_post" does not exist |
| 406 | `20260509000000-AddIdlePlaylistItemsToStoreTablets.js` | 465 | relation "store_tablets" does not exist |
| 408 | `20260518000000-BackfillKpaSlugsLateJoin.js` | 491 | relation "organizations" does not exist |
| 411 | `20260521120000-AddSurveyRewardFields.js` | 499 | relation "lms_surveys" does not exist |
| 416 | `20260530124500-NullifyKpaWithdrawnLicenseNumbers.js` | 517 | relation "kpa_pharmacist_profiles" does not exist |
| 418 | `20260530220000-BackfillGlycopharmStoreOwnerEnrollmentAndRole.js` | 519 | relation "service_memberships" does not exist |
| 437 | `20260618000000-BackfillNetureSupplierProfiles.js` | 555 | column "tax_invoice_email" of relation "neture_suppliers" does not exist |
| 442 | `20260700000000-AddTagsToForumCategory.js` | 408 | relation "forum_category" does not exist |
| 444 | `20260801000000-ResetAndSeedKpaChannels.js` | 415 | relation "organization_service_enrollments" does not exist |
| 445 | `20260900000000-BackfillStoreOwnerRoles.js` | 422 | relation "roles" does not exist |
| 446 | `20260901000000-CleanupKCosmeticsSellerRole.js` | 423 | relation "service_memberships" does not exist |
| 456 | `20260906300000-ForumFullCategoryRemoval.js` | 435 | current transaction is aborted, commands ignored until end of transaction block |
| 457 | `20260907000000-AddForumIdToForumPostAndSlugToRequests.js` | 436 | relation "forum_post" does not exist |
| 476 | `20260923000000-FixNetureSupplierRoleAssignments.js` | 471 | relation "service_memberships" does not exist |
| 478 | `20260924100000-FixKpaOrphanRoleCleanup.js` | 473 | [FixKpaOrphanRoleCleanup] Validation failed: kpa-a-operator role not restored |
| 480 | `20260924300000-DiagnosticMembershipGateAudit.js` | 476 | relation "service_memberships" does not exist |
| 481 | `20260924400000-DiagnosticKpaMembershipFlowAudit.js` | 477 | relation "service_memberships" does not exist |
| 484 | `20260927100000-BootstrapCanonicalSeedAccounts.js` | 480 | column "createdAt" of relation "users" does not exist |
| 485 | `20260928000000-NormalizeServiceMembershipsKpaKey.js` | 482 | relation "service_memberships" does not exist |
| 486 | `20260929000000-NormalizeServiceMembershipsCosmeticsKey.js` | 484 | relation "service_memberships" does not exist |
| 487 | `20260930000000-BackfillCosmeticsServiceEnrollments.js` | 513 | column cs.organization_id does not exist |
| 490 | `20261001000000-NormalizeServiceMembershipsWithdrawnStatus.js` | 486 | relation "service_memberships" does not exist |
| 491 | `20261002000000-BackfillServiceMembershipsActiveFromKpaMembers.js` | 487 | relation "service_memberships" does not exist |
| 492 | `20261004000000-BackfillMissingKpaMembersCanonical.js` | 488 | relation "service_memberships" does not exist |
| 495 | `20261022000000-BackfillKpaSlugsPostMemberApprovalPath.js` | 492 | relation "organizations" does not exist |
| 496 | `20261023000000-BackfillKpaOrganizationPharmacyInfo.js` | 493 | relation "organizations" does not exist |
| 508 | `20261030000001-GlycopharmPharmaciesOrgBridgeV2.js` | 516 | relation "organizations" does not exist |
| 509 | `20261031000000-NormalizeKCosmeticsSellerRoleWritepathBackfill.js` | 521 | relation "service_memberships" does not exist |
| 510 | `20261031000001-BackfillKCosmeticsSellerStoreContext.js` | 522 | relation "service_memberships" does not exist |
| 528 | `20261118000000-CleanupNetureTestSuppliers.js` | 560 | relation "service_memberships" does not exist |
| 535 | `20261125000000-AddQrConsultationCtaAndNullableInterestMaster.js` | 570 | relation "store_qr_codes" does not exist |
| 536 | `20261126000000-AddTagsToStoreContentSources.js` | 571 | relation "store_execution_assets" does not exist |
| 539 | `20261129000000-AddContentIdToStoreTabletDisplays.js` | 574 | relation "store_tablet_displays" does not exist |
| 541 | `20261201000000-AddBarcodeToStoreLocalProduct.js` | 576 | relation "store_local_products" does not exist |
| 573 | `20270120000000-CreateTabletScreenSetsAndBlocks.js` | 607 | relation "store_tablets" does not exist |
| 575 | `20270205000000-AddTemplateKeyToTabletScreenSets.js` | 608 | relation "store_tablet_screen_sets" does not exist |
| 576 | `20270206000000-AddContentListToTabletBlockTypeCheck.js` | 611 | relation "store_tablet_screen_blocks" does not exist |
| 577 | `20270207000000-AddScreenSetQrLandingContract.js` | 615 | relation "store_tablet_screen_sets" does not exist |
| 579 | `20270208000000-CreateStoreTabletCornerContents.js` | 616 | relation "store_tablets" does not exist |
| 582 | `20270210000000-AddScreenSetOwnerScopeModel.js` | 617 | relation "store_tablet_screen_sets" does not exist |
| 583 | `20270211000000-AddScreenSetHubTargetStoreType.js` | 618 | relation "store_tablet_screen_sets" does not exist |
| 588 | `20270216000000-SeedPharmacyHubServiceAndRoles.js` | 623 | relation "roles" does not exist |
| 592 | `20270220000000-AddCosmeticsProductInfoColumns.js` | 627 | [AddCosmeticsProductInfoColumns] ABORT: cosmetics.cosmetics_products 이 존재하지 않는다. 선행 스키마 확인 필요. |
| 594 | `20270222000000-CreateGlycopharmFeaturedProductsTable.js` | 629 | relation "glycopharm_products" does not exist |
| 598 | `20270226000000-SeedPharmacyHubAdminRole.js` | 633 | relation "roles" does not exist |
| 600 | `20270302000000-NormalizeNetureOperatorMembershipRole.js` | 635 | relation "service_memberships" does not exist |
| 603 | `20270305000000-SeedKpaBranchServiceAndRoles.js` | 638 | relation "roles" does not exist |
| 604 | `20270306000000-CreateExternalChannelProductLinks.js` | 639 | relation "organizations" does not exist |
| 612 | `20270314000000-DeactivatePharmacyHubSupplierRole.js` | 647 | relation "roles" does not exist |
| 613 | `20270315000000-SeedPharmacyHubMemberRole.js` | 648 | relation "roles" does not exist |
| 614 | `20270316000000-NormalizePharmacyHubMemberMembershipRole.js` | 649 | relation "service_memberships" does not exist |
| 615 | `20270317000000-NormalizePharmacyHubBareMembershipRoles.js` | 650 | relation "service_memberships" does not exist |
| 616 | `20270318000000-RevokeOrphanedBareStoreOwnerRole.js` | 651 | relation "service_memberships" does not exist |
| 620 | `20270322000000-CreateCafe24MemberLinksAndSeedCafe24B2bService.js` | 655 | relation "organizations" does not exist |
| 625 | `20270326000000-DropGlycopharmService.js` | 660 | relation "roles" does not exist |
| 626 | `20270327000000-AddStoreQrContentSource.js` | 661 | relation "store_qr_codes" does not exist |
| 629 | `20270330000000-CreateStoreQrPlacements.js` | 664 | relation "store_qr_codes" does not exist |
| 639 | `20270409000000-RemoveProductContentFromTabletBlockTypeCheck.js` | 674 | relation "store_tablet_screen_blocks" does not exist |
| 643 | `20270413000000-BaselineRbacAndAccountTables.js` | 678 | [BaselineRbacAndAccountTables] role_permissions: required table "roles" is absent — cannot create FK target (roles has no creation migration: report, do not imp |

</details>

## 부록 E. E3 — 운영 실제 순서(현존 644) replay 실패 전수 (95)

<details><summary>펼치기 — 순번은 운영 id 순 내 위치</summary>

| 순번 | 파일 | 운영 id | 오류 |
|---:|---|---:|---|
| 7 | `1736400000000-AddEnabledServicesToPharmacy.js` | 18 | relation "glycopharm_pharmacies" does not exist |
| 43 | `1738300000000-AddPartnerRecruitingToGlycopharmProducts.js` | 61 | relation "public.glycopharm_products" does not exist |
| 47 | `2026013100004-CleanupForumOrphanedPosts.js` | 65 | relation "forum_comment" does not exist |
| 49 | `2026020200001-AddIconUrlToForumCategory.js` | 67 | relation "forum_category" does not exist |
| 50 | `2026020300001-AddPinnedAndIconEmojiToForumCategory.js` | 68 | relation "forum_category" does not exist |
| 76 | `1770601460383-ActivateAdminUser.js` | 95 | column "updatedAt" of relation "users" does not exist |
| 98 | `20260215000003-AddStorefrontConfig.js` | 118 | relation "glycopharm_pharmacies" does not exist |
| 107 | `20260215300002-AddFkPharmacyOrganization.js` | 127 | relation "glycopharm_pharmacies" does not exist |
| 120 | `20260221000000-OrgServiceModelNormalizationPhaseA.js` | 142 | relation "glycopharm_pharmacies" does not exist |
| 121 | `20260221100000-OrgServiceModelNormalizationPhaseC.js` | 143 | relation "glycopharm_pharmacy_extensions" does not exist |
| 128 | `20260222400000-AddOrganizationIdToGlucoseViewCustomers.js` | 150 | relation "organizations" does not exist |
| 134 | `20260222900000-GlycopharmOrgEnrollmentRepair.js` | 156 | relation "organizations" does not exist |
| 139 | `20260224200000-CreateStoreLocalProductTables.js` | 161 | relation "organizations" does not exist |
| 140 | `20260224300000-HardenStoreLocalProductDomain.js` | 162 | relation "store_tablet_displays" does not exist |
| 141 | `20260224400000-AddStoreLocalProductContentFields.js` | 163 | relation "store_local_products" does not exist |
| 165 | `20260228100000-AddUserConsentColumns.js` | 187 | column "createdAt" does not exist |
| 172 | `20260301200000-CreateStoreEvents.js` | 194 | relation "organizations" does not exist |
| 175 | `20260301400000-TabletInterestRequests.js` | 197 | relation "organizations" does not exist |
| 176 | `20260304100000-CreateStoreLibraryItems.js` | 198 | relation "organizations" does not exist |
| 177 | `20260304120000-CreateStoreQrCodes.js` | 199 | relation "organizations" does not exist |
| 179 | `20260304200000-CreateProductMarketingAssets.js` | 201 | relation "organizations" does not exist |
| 188 | `20260303100000-CreateStoreLibraryItems.js` | 210 | relation "organizations" does not exist |
| 207 | `20260309100000-BackfillKpaStoreSlugs.js` | 229 | relation "organizations" does not exist |
| 211 | `20260309300000-BackfillKpaStoreSlugsV2.js` | 233 | relation "organizations" does not exist |
| 219 | `20260311100000-CreateStoreCapabilities.js` | 241 | relation "organizations" does not exist |
| 220 | `20260311200000-CosmeticsStoreOrgBridge.js` | 242 | relation "organizations" does not exist |
| 231 | `20260317100000-NormalizeUserStatusCase.js` | 253 | column "updatedAt" of relation "users" does not exist |
| 232 | `20260317110000-ActivateGlycopharmTestAccounts.js` | 254 | column "updatedAt" of relation "users" does not exist |
| 237 | `20260318100000-ExtendRolesTable.js` | 259 | relation "roles" does not exist |
| 238 | `20260318200000-AddStructuredAddress.js` | 260 | relation "organizations" does not exist |
| 240 | `20260320000001-AddForumTypeToCategory.js` | 262 | relation "forum_category" does not exist |
| 244 | `20260322100000-SeedGlycopharmForumCategory.js` | 266 | relation "organizations" does not exist |
| 249 | `20260323700000-AddMetadataToForumCategory.js` | 271 | relation "forum_category" does not exist |
| 264 | `20260326500000-RepointListingOrganizationFK.js` | 286 | relation "organizations" does not exist |
| 265 | `20260326600000-SeedNetureOrgEnrollments.js` | 287 | relation "organizations" does not exist |
| 266 | `20260326600000-NetureSupplierOrgBridge.js` | 288 | relation "organizations" does not exist |
| 276 | `20260328300000-BridgeApprovedRegistrationsToSuppliers.js` | 298 | column u.phone does not exist |
| 289 | `20260331400000-UnifyGlycopharmRolesCatalog.js` | 311 | relation "roles" does not exist |
| 290 | `20260331500000-UnifyCosmeticsRolesCatalog.js` | 312 | relation "roles" does not exist |
| 291 | `20260331100000-BackfillGlycopharmPharmacyOrganizations.js` | 313 | relation "organizations" does not exist |
| 292 | `20260401100000-BackfillHealthReadingsPharmacyId.js` | 314 | column gc.organization_id does not exist |
| 302 | `20260403500000-CleanupKpaForumPostsV2.js` | 324 | relation "forum_comment" does not exist |
| 306 | `20260403800000-BackfillServiceOfferListings.js` | 329 | relation "organization_service_enrollments" does not exist |
| 311 | `20260404300000-EnablePharmacyCoreCapabilities.js` | 336 | relation "store_capabilities" does not exist |
| 312 | `20260404400000-CreateForumCategoryMembersTable.js` | 337 | relation "forum_category" does not exist |
| 327 | `20260410300000-DeleteKpaSocietyOrganizationChannels.js` | 353 | relation "organization_service_enrollments" does not exist |
| 331 | `20260411100000-BackfillKpaOrgsToOrganizations.js` | 357 | relation "organizations" does not exist |
| 335 | `20260412100000-CleanupForumTestData.js` | 361 | relation "forum_category" does not exist |
| 356 | `20260415280000-CreateGlycopharmMembersTable.js` | 382 | relation "organizations" does not exist |
| 360 | `20260416300000-BackfillMissingKpaSlugs.js` | 386 | relation "organizations" does not exist |
| 362 | `20260416400000-BackfillKpaSlugsByMembership.js` | 388 | relation "organizations" does not exist |
| 369 | `20260419100000-AddAssetTypeFieldsToStoreLibraryItems.js` | 396 | relation "store_library_items" does not exist |
| 376 | `20260421010000-RenameStoreLibraryToExecutionAssets.js` | 405 | relation "store_library_items" does not exist |
| 379 | `20260700000000-AddTagsToForumCategory.js` | 408 | relation "forum_category" does not exist |
| 386 | `20260801000000-ResetAndSeedKpaChannels.js` | 415 | relation "organization_service_enrollments" does not exist |
| 389 | `20260425300000-ConvertForumPostTagsToArray.js` | 418 | relation "forum_post" does not exist |
| 393 | `20260900000000-BackfillStoreOwnerRoles.js` | 422 | relation "roles" does not exist |
| 406 | `20260906300000-ForumFullCategoryRemoval.js` | 435 | current transaction is aborted, commands ignored until end of transaction block |
| 407 | `20260907000000-AddForumIdToForumPostAndSlugToRequests.js` | 436 | relation "forum_post" does not exist |
| 434 | `20260509000000-AddIdlePlaylistItemsToStoreTablets.js` | 465 | relation "store_tablets" does not exist |
| 440 | `20260923000000-FixNetureSupplierRoleAssignments.js` | 471 | column u.phone does not exist |
| 442 | `20260924100000-FixKpaOrphanRoleCleanup.js` | 473 | [FixKpaOrphanRoleCleanup] Validation failed: kpa-a-operator role not restored |
| 448 | `20260927100000-BootstrapCanonicalSeedAccounts.js` | 480 | column "createdAt" of relation "users" does not exist |
| 457 | `20260518000000-BackfillKpaSlugsLateJoin.js` | 491 | relation "organizations" does not exist |
| 458 | `20261022000000-BackfillKpaSlugsPostMemberApprovalPath.js` | 492 | relation "organizations" does not exist |
| 459 | `20261023000000-BackfillKpaOrganizationPharmacyInfo.js` | 493 | relation "organizations" does not exist |
| 479 | `20260930000000-BackfillCosmeticsServiceEnrollments.js` | 513 | column cs.organization_id does not exist |
| 482 | `20261030000001-GlycopharmPharmaciesOrgBridgeV2.js` | 516 | relation "organizations" does not exist |
| 485 | `20260530220000-BackfillGlycopharmStoreOwnerEnrollmentAndRole.js` | 519 | relation "organizations" does not exist |
| 521 | `20260618000000-BackfillNetureSupplierProfiles.js` | 555 | column u.phone does not exist |
| 536 | `20261125000000-AddQrConsultationCtaAndNullableInterestMaster.js` | 570 | relation "store_qr_codes" does not exist |
| 537 | `20261126000000-AddTagsToStoreContentSources.js` | 571 | relation "store_execution_assets" does not exist |
| 540 | `20261129000000-AddContentIdToStoreTabletDisplays.js` | 574 | relation "store_tablet_displays" does not exist |
| 542 | `20261201000000-AddBarcodeToStoreLocalProduct.js` | 576 | relation "store_local_products" does not exist |
| 573 | `20270120000000-CreateTabletScreenSetsAndBlocks.js` | 607 | relation "store_tablets" does not exist |
| 574 | `20270205000000-AddTemplateKeyToTabletScreenSets.js` | 608 | relation "store_tablet_screen_sets" does not exist |
| 577 | `20270206000000-AddContentListToTabletBlockTypeCheck.js` | 611 | relation "store_tablet_screen_blocks" does not exist |
| 581 | `20270207000000-AddScreenSetQrLandingContract.js` | 615 | relation "store_tablet_screen_sets" does not exist |
| 582 | `20270208000000-CreateStoreTabletCornerContents.js` | 616 | relation "store_tablets" does not exist |
| 583 | `20270210000000-AddScreenSetOwnerScopeModel.js` | 617 | relation "store_tablet_screen_sets" does not exist |
| 584 | `20270211000000-AddScreenSetHubTargetStoreType.js` | 618 | relation "store_tablet_screen_sets" does not exist |
| 589 | `20270216000000-SeedPharmacyHubServiceAndRoles.js` | 623 | relation "roles" does not exist |
| 593 | `20270220000000-AddCosmeticsProductInfoColumns.js` | 627 | [AddCosmeticsProductInfoColumns] ABORT: cosmetics.cosmetics_products 이 존재하지 않는다. 선행 스키마 확인 필요. |
| 595 | `20270222000000-CreateGlycopharmFeaturedProductsTable.js` | 629 | relation "glycopharm_products" does not exist |
| 599 | `20270226000000-SeedPharmacyHubAdminRole.js` | 633 | relation "roles" does not exist |
| 604 | `20270305000000-SeedKpaBranchServiceAndRoles.js` | 638 | relation "roles" does not exist |
| 605 | `20270306000000-CreateExternalChannelProductLinks.js` | 639 | relation "organizations" does not exist |
| 613 | `20270314000000-DeactivatePharmacyHubSupplierRole.js` | 647 | relation "roles" does not exist |
| 614 | `20270315000000-SeedPharmacyHubMemberRole.js` | 648 | relation "roles" does not exist |
| 621 | `20270322000000-CreateCafe24MemberLinksAndSeedCafe24B2bService.js` | 655 | relation "organizations" does not exist |
| 626 | `20270326000000-DropGlycopharmService.js` | 660 | relation "roles" does not exist |
| 627 | `20270327000000-AddStoreQrContentSource.js` | 661 | relation "store_qr_codes" does not exist |
| 630 | `20270330000000-CreateStoreQrPlacements.js` | 664 | relation "store_qr_codes" does not exist |
| 640 | `20270409000000-RemoveProductContentFromTabletBlockTypeCheck.js` | 674 | relation "store_tablet_screen_blocks" does not exist |
| 644 | `20270413000000-BaselineRbacAndAccountTables.js` | 678 | [BaselineRbacAndAccountTables] role_permissions: required table "roles" is absent — cannot create FK target (roles has no creation migration: report, do not imp |

</details>

## 부록 F. E4 — 운영 실제 순서 + 삭제 30개 원본(674) replay 실패 전수 (46)

<details><summary>펼치기 — 순번은 운영 id 순 내 위치</summary>

| 순번 | 파일 | 운영 id | 오류 |
|---:|---|---:|---|
| 29 | `1737000000000-SeedProductionTestAccounts.js` | 29 | column "domain" of relation "users" does not exist |
| 32 | `1737100200000-SeedAdditionalTestAccounts.js` | 32 | column "domain" of relation "users" does not exist |
| 45 | `1737400200000-CreateTestAccounts.js` | 45 | column "createdAt" of relation "users" does not exist |
| 52 | `1737200000000-UpdateTestAccountEmailsToO4O.js` | 52 | column "updatedAt" of relation "users" does not exist |
| 55 | `1769408012358-UpdateOperatorPasswords.js` | 55 | column "createdAt" of relation "users" does not exist |
| 65 | `2026013100004-CleanupForumOrphanedPosts.js` | 65 | relation "forum_comment" does not exist |
| 67 | `2026020200001-AddIconUrlToForumCategory.js` | 67 | relation "forum_category" does not exist |
| 68 | `2026020300001-AddPinnedAndIconEmojiToForumCategory.js` | 68 | relation "forum_category" does not exist |
| 89 | `20260207100000-SeedKpaTestAccounts.js` | 89 | column "domain" of relation "users" does not exist |
| 95 | `1770601460383-ActivateAdminUser.js` | 95 | column "updatedAt" of relation "users" does not exist |
| 105 | `20260212200000-CreateKpaSocietyOperatorAccount.js` | 105 | column "createdAt" of relation "users" does not exist |
| 132 | `20260216200001-CreateKpaAdminAccount.js` | 132 | column "domain" of relation "users" does not exist |
| 187 | `20260228100000-AddUserConsentColumns.js` | 187 | column "createdAt" does not exist |
| 253 | `20260317100000-NormalizeUserStatusCase.js` | 253 | column "updatedAt" of relation "users" does not exist |
| 254 | `20260317110000-ActivateGlycopharmTestAccounts.js` | 254 | column "updatedAt" of relation "users" does not exist |
| 259 | `20260318100000-ExtendRolesTable.js` | 259 | relation "roles" does not exist |
| 262 | `20260320000001-AddForumTypeToCategory.js` | 262 | relation "forum_category" does not exist |
| 271 | `20260323700000-AddMetadataToForumCategory.js` | 271 | relation "forum_category" does not exist |
| 287 | `20260326600000-SeedNetureOrgEnrollments.js` | 287 | ABORT: Target organizations not found. Seed KPA organizations first. |
| 298 | `20260328300000-BridgeApprovedRegistrationsToSuppliers.js` | 298 | column u.phone does not exist |
| 311 | `20260331400000-UnifyGlycopharmRolesCatalog.js` | 311 | relation "roles" does not exist |
| 312 | `20260331500000-UnifyCosmeticsRolesCatalog.js` | 312 | relation "roles" does not exist |
| 324 | `20260403500000-CleanupKpaForumPostsV2.js` | 324 | relation "forum_comment" does not exist |
| 328 | `20260403900000-SeedKpaOperatorTestData.js` | 328 | column "createdAt" of relation "users" does not exist |
| 337 | `20260404400000-CreateForumCategoryMembersTable.js` | 337 | relation "forum_category" does not exist |
| 348 | `20260409300000-MigrateGlycopharmProductsToCatalogAndStore.js` | 348 | column gp.origin_country does not exist |
| 349 | `20260409400000-RebackfillGlycopharmProductsAfterDualWrite.js` | 349 | column gp.origin_country does not exist |
| 361 | `20260412100000-CleanupForumTestData.js` | 361 | relation "forum_category" does not exist |
| 407 | `20260700000000-AddTagsToForumCategory.js` | 408 | relation "forum_category" does not exist |
| 417 | `20260425300000-ConvertForumPostTagsToArray.js` | 418 | relation "forum_post" does not exist |
| 421 | `20260900000000-BackfillStoreOwnerRoles.js` | 422 | relation "roles" does not exist |
| 434 | `20260906300000-ForumFullCategoryRemoval.js` | 435 | current transaction is aborted, commands ignored until end of transaction block |
| 435 | `20260907000000-AddForumIdToForumPostAndSlugToRequests.js` | 436 | relation "forum_post" does not exist |
| 442 | `20260501100000-SeedKCosmeticsStoreOwnerTestAccount.js` | 443 | column "createdAt" of relation "users" does not exist |
| 469 | `20260923000000-FixNetureSupplierRoleAssignments.js` | 471 | column u.phone does not exist |
| 471 | `20260924100000-FixKpaOrphanRoleCleanup.js` | 473 | [FixKpaOrphanRoleCleanup] Validation failed: kpa-a-operator role not restored |
| 477 | `20260927100000-BootstrapCanonicalSeedAccounts.js` | 480 | column "createdAt" of relation "users" does not exist |
| 551 | `20260618000000-BackfillNetureSupplierProfiles.js` | 555 | column u.phone does not exist |
| 619 | `20270216000000-SeedPharmacyHubServiceAndRoles.js` | 623 | relation "roles" does not exist |
| 629 | `20270226000000-SeedPharmacyHubAdminRole.js` | 633 | relation "roles" does not exist |
| 634 | `20270305000000-SeedKpaBranchServiceAndRoles.js` | 638 | relation "roles" does not exist |
| 643 | `20270314000000-DeactivatePharmacyHubSupplierRole.js` | 647 | relation "roles" does not exist |
| 644 | `20270315000000-SeedPharmacyHubMemberRole.js` | 648 | relation "roles" does not exist |
| 651 | `20270322000000-CreateCafe24MemberLinksAndSeedCafe24B2bService.js` | 655 | relation "roles" does not exist |
| 656 | `20270326000000-DropGlycopharmService.js` | 660 | relation "roles" does not exist |
| 674 | `20270413000000-BaselineRbacAndAccountTables.js` | 678 | [BaselineRbacAndAccountTables] role_permissions: required table "roles" is absent — cannot create FK target (roles has no creation migration: report, do not imp |

</details>
