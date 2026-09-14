# IR-O4O-ROLES-TABLE-CANONICAL-SCHEMA-SEED-AND-ENTITY-DRIFT-CENSUS-V1

> **종류**: 조사 전용 IR (코드 · migration · entity · 운영 DB · canonical 문서 본문 변경 0)
> **조사 기준 SHA**: `781ebe604ef8a5b9cbfdce445768cc4f023de207` (조사 당시 `origin/main` == 작업트리 HEAD · clean · 모든 실측·grep·격리 실험은 이 SHA 기준)
> **push 기준 SHA**: `dc9fe66ba8a2300deac238a171e66ba60a0260cf` (커밋 시점 `origin/main`. 그 사이 4 커밋은 `docs/work-orders` · `docs/handoff` 만 — migration · auth entity · `docs/rbac` · 선행 CHECK 무변경, 결론 영향 없음)
> **선행**: [`CHECK-O4O-RBAC-AND-ACCOUNT-BASELINE-SNAPSHOT-MIGRATION-OWNERSHIP-FINAL-CLOSURE-V1`](../checks/CHECK-O4O-RBAC-AND-ACCOUNT-BASELINE-SNAPSHOT-MIGRATION-OWNERSHIP-FINAL-CLOSURE-V1.md) §9 후속 "roles 생성 migration STOP"
> **조사일**: 2026-09-14
> **운영 DB 접근**: read-only (`SELECT` · `information_schema` · `pg_catalog`) 만. INSERT/UPDATE/DELETE/DDL 0
> **격리 DB**: 로컬 PostgreSQL 17.9 (scratchpad · port 15999) — 운영 DB 를 대체 사용하지 않았다

---

## 0. 결론 요약 (한 화면)

| 항목 | 판정 |
|---|---|
| `roles` 테이블 생성 소유 migration | **없음** (`ROLES_TABLE_CREATION_OWNER = NONE`). 운영 `roles` 는 2025-10 synchronize 시대 camelCase `Role` entity 가 만든 테이블이며, 저장소의 어떤 migration 도 `CREATE TABLE roles` 를 갖지 않는다. `1810000000000-CreateRolePermissionTables`(2026-01-08 삭제) 는 운영에서 실행된 적이 없다 |
| 운영 18 컬럼의 정체 | **9쌍 가설은 틀렸다.** 실측 = 공유 3 (`id` · `name` · `description`) + legacy camelCase 6 (`displayName` · `permissions` · `isSystem` · `createdAt` · `updatedAt` · `isActive`) + snake 9 (entity 매핑). **진짜 camel/snake 쌍은 5쌍** (`displayName/display_name` · `isSystem/is_system` · `isActive/is_active` · `createdAt/created_at` · `updatedAt/updated_at`). `serviceKey` · `roleKey` · `isAdminRole` · `isAssignable` camelCase 컬럼은 **존재하지 않는다**. `permissions jsonb` 는 짝 없는 legacy 단독 컬럼 |
| legacy camelCase 6 컬럼 | 런타임 소비자 0 (entity 미매핑 · raw SQL 0 · migration 0) 이나, `NOT NULL DEFAULT` 덕에 entity INSERT 가 성공하므로 "죽었지만 무해". 값은 유지되지 않는다 (`displayName` NULL 41/41 · `isSystem` 불일치 39 · `isActive` 불일치 1 · `updatedAt` 불일치 14) |
| Entity ↔ 운영 drift | nullability 5건 (`display_name` · `is_active` · `is_system` · `is_admin_role` · `is_assignable` — entity NOT NULL / 운영 NULL 허용) · 길이 1건 (`display_name` entity 100 / 운영 200) · 인덱스 1건 (entity `@Index(['isActive'])` / 운영 부재) · 타입 1건(entity `created_at/updated_at` 기본 timestamp / 운영 timestamptz) |
| fresh DB 재현성 | **PARTIAL 도 아니고 FAIL** — 격리 fresh DB 에서 deploy 와 동일한 TypeORM 순서로 실행하면 **0건 실행 후 첫 migration 에서 실패**한다 (원인 = TypeORM 0.3.27 이 class 이름 **끝 13자리**로 정렬 → 14자리 `2026…` 이름이 13자리 `17…` legacy 이름보다 먼저 실행). 파일명 순으로 강제해도 6번째(`1736400000000-AddEnabledServicesToPharmacy`) 에서 실패 — 운영 이력에만 있고 저장소에서 삭제된 migration **30건**이 원인. `roles` 부재는 그 뒤 207번째(`20260318100000-ExtendRolesTable`) 에서 나타난다. 즉 **§11 중지 조건 "roles 보다 이른 fresh-DB 실패" 해당** |
| 41행 분류 | CANONICAL_SYSTEM_ROLE 1 · CANONICAL_SERVICE_ROLE 19 · ACTIVE_BUT_NOT_SEEDED 4 · DEPRECATED_BUT_REQUIRED_FOR_HISTORY 5 · INACTIVE_RETIRED 1 · ORPHAN_NO_CONSUMER 7 · DECISION_REQUIRED 4 (§7) |
| 카탈로그 ≠ SSOT | `role_assignments` 에 있으나 `roles` 에 없는 role 값 7종 (`user` 활성 2 · `neture:member` 활성 4 · `cosmetics:member` 1 · `kpa:member` 1 · `member` · `store_owner` · `super_admin` 비활성) — 특히 `user` 는 RBAC-ROLE-CATALOG-V1 Layer A 허용값인데 `roles` 에 없다 |
| seed 소유권 권고 | **A안** (구조 전용 baseline + 별도 canonical 최소 seed migration). 41행 전체 snapshot(C안) 은 채택하지 않는다 (§8) |
| 후속 WO | 5건 · 순서 §10 (구조 → 생성 소유 → 최소 seed → 은퇴/고아 데이터 처분 → Permission/LinkedAccount/AccountActivity drift) |

---

## 1. 범위 · 규칙 준수

- 조사만 수행했다. 저장소 변경은 이 IR 문서 1개(미커밋). `git status` 는 이 파일만 untracked.
- 운영 DB 는 read-only 채널(cloud-sql-proxy + `psql`, 비밀번호는 Secret Manager 환경변수) 로만 접근. write 0.
- 격리 검증은 scratchpad 내 로컬 PostgreSQL 17.9 (port 15999) 에 fresh database 4개(`fresh_a` ~ `fresh_d`) 를 만들어 수행. 조사 후 인스턴스 정지. 운영 PG 는 15.18 이라 버전 차이가 있으나 실패 원인(순서 · 부재 테이블) 은 버전 무관.
- 과거 CHECK / IR 은 증거로만 사용했고 canonical 로 승격하지 않았다.

### 1-1. 읽은 정본

`AGENTS.md` · `CLAUDE.md` · `docs/CANONICAL-INDEX.md` · `docs/rbac/RBAC-FREEZE-DECLARATION-V1.md` · `docs/rbac/RBAC-ROLE-CATALOG-V1.md` · `docs/rbac/RBAC-CANONICAL-STATE-V1.md` · `docs/architecture/O4O-CORE-FREEZE-V1.md` · `docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md` · 선행 CHECK(위) · `IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1`.

**어느 정본도 `roles` 테이블(카탈로그) 의 생성 · seed 소유권을 정의하지 않는다.** RBAC-CANONICAL-STATE §"roles 는 로그인 시점의 role_assignments 스냅샷" 은 JWT 의 `roles` claim 을 말하며 테이블이 아니다. RBAC-ROLE-CATALOG-V1 은 `role_assignments` 허용 문자열(Layer A) 을 정의할 뿐 `roles` 테이블 행과의 일치를 요구하지 않는다.

---

## 2. `roles` 의 정체 — 카탈로그이지 SSOT 가 아니다

| 축 | 정본 | 소비 |
|---|---|---|
| 권한 판정 SSOT | `role_assignments.role` (문자열) | 로그인 JWT · `requireRole` · `require*Scope` · `hasAnyRole` — **`roles` 테이블을 읽지 않는다** |
| 역할 메타데이터 카탈로그 | `roles` (name · display_name · service_key · role_key · is_admin_role · is_assignable · is_active · is_system) | `RoleService` (유일한 `Repository<Role>` 소비자) → `RoleController` (`/api/v1/operator/roles`) · `MembershipConsoleController` (assign/revoke 검증 · 회원 상세 `is_admin_role`) |

따라서 `roles` 가 비어 있어도 로그인 · 권한 판정은 동작하고, **운영자 콘솔의 역할 부여/회수와 역할 관리 화면만** 멈춘다 (§6).

---

## 3. 저장소 · 운영 migration 이력 대조

- 저장소 migration 파일 644 (`apps/api-server/src/database/migrations/`, 13자리 이름 82 · 14자리 562).
- 운영 `typeorm_migrations` 677행. **운영에만 있고 저장소에 없는 이름 30건** — 삭제된 초기 스키마 · seed · 테스트 계정 migration:
  `AddProductCommissionColumns1732422000000` · `CreateCMSTablesV2_1733302800000` · `CreateMembershipYaksaTables1733458800000` · `ExtendYaksaMemberFields1733600000000` · `CreateCosmeticsSchema1735470000000` · `SeedCosmeticsData1735470000001` · `CreateYaksaTables1735563600000` · `SeedYaksaData1735563600001` · `CreateGlycopharmTables1735564800000` · `SeedGlycopharmData1735564800001` · `CreateGlucoseViewTables1735566000000` · `SeedProductionTestAccounts1737000000000` · `SeedAdditionalTestAccounts1737100200000` · `UpdateKpaTestAccountPasswords1737400000000` · `UpdateGlucoseViewTestAccountPasswords1737400100000` · `CreateTestAccounts1737400200000` · `UpdateTestAccountEmailsToO4O1737200000000` · `UpdateOperatorPasswords1769408012358` · `SeedKpaTestAccounts20260207100000` · `CreateKpaSocietyOperatorAccount20260212200000` · `CreateKpaAdminAccount20260216200001` · `AddYaksa01ToKpaA20260216200002` · `SeedKpaOperatorTestData1712203200001` · `SeedKpaOrgJoinAndForumActivity20260404000100` · `SeedKpaTestPharmacyOwnerOrgMember20260404100000` · `SeedPhamacy1OrgMember20260405100000` · `FixPhamacy1OrgMemberAlignment20260419500000` · `EnsurePhamacy1OrgMemberForKpa20260419600000` · `SeedKCosmeticsStoreOwnerTestAccount20260501100000` · `ServiceMembershipCanonicalKeyDataMigration20260928000000`
- 저장소에만 있고 운영에 없는 이름 0 (11개 파일은 class 명 `…1709…` 과 `name` 속성 `…2026…` 이 다르지만 `name` 이 운영과 일치).
- **`CREATE TABLE roles` 는 677건 어디에도 없다** (`CreateRolePermissionTables1810000000000` 미실행 · 이후 삭제). 운영 `roles` 최초 생성은 `users` 등과 같은 synchronize 시대(2025-10, 원본 entity `0785eab80` camelCase) 다.

---

## 4. 생성 소유권 · 시간선

### 4-1. `roles` 를 건드리는 migration (저장소 12 + 참고 2)

| migration | roles 에 대한 동작 | 선행 요구 테이블 | 스키마 변경 | seed/데이터 변경 | fresh DB 단독 실행 (격리 fresh_d 실측) |
|---|---|---|---|---|---|
| *(synchronize · migration 아님)* | camelCase 테이블 생성 (`id name displayName description permissions isSystem createdAt updatedAt isActive`) | — | 생성 | — | 재현 불가 (코드 경로 없음) |
| `20260228000002-DropLegacyRbacColumns` | 주석 언급만 | — | 없음 | 없음 | OK |
| `20260318100000-ExtendRolesTable` | `ALTER TABLE roles` ×22 (`name` varchar(100) · snake 컬럼 10개 `ADD COLUMN IF NOT EXISTS`) · 인덱스 2 · legacy 4행 UPDATE · **37행 seed** (`ON CONFLICT (name) DO UPDATE`, `is_system=true`, glycopharm:* 6 · glucoseview:* 4 포함) | `roles` | 있음 | 있음 (구조 + seed 혼합) | **FAIL** `relation "roles" does not exist` |
| `20260331400000-UnifyGlycopharmRolesCatalog` | `glycopharm:pharmacy/consumer/supplier/partner` → bare 개명 | `roles` | 없음 | 있음 | FAIL (roles 부재) |
| `20260331500000-UnifyCosmeticsRolesCatalog` | `cosmetics:seller/user/supplier/pharmacist/partner` → bare 개명 | `roles` | 없음 | 있음 | FAIL |
| `20260900000000-BackfillStoreOwnerRoles` | `kpa:/glycopharm:/cosmetics:store_owner` INSERT (`is_system=false`) + `role_assignments` backfill | `roles` · `role_assignments` | 없음 | 있음 | FAIL |
| `20270216000000-SeedPharmacyHubServiceAndRoles` | `pharmacy-hub:operator/store_owner/supplier` + `platform_services` | `roles` · `platform_services` | 없음 | 있음 | FAIL |
| `20270226000000-SeedPharmacyHubAdminRole` | `pharmacy-hub:admin` | `roles` | 없음 | 있음 | FAIL |
| `20270305000000-SeedKpaBranchServiceAndRoles` | `kpa-branch:admin/operator/member` | `roles` · `platform_services` | 없음 | 있음 | FAIL |
| `20270314000000-DeactivatePharmacyHubSupplierRole` | `pharmacy-hub:supplier` `is_active=false` | `roles` | 없음 | 있음 | FAIL |
| `20270315000000-SeedPharmacyHubMemberRole` | `pharmacy-hub:member` | `roles` | 없음 | 있음 | FAIL |
| `20270322000000-CreateCafe24MemberLinksAndSeedCafe24B2bService` | `cafe24-b2b:store_owner` | `roles` · `organizations` · `platform_services` | 있음(다른 테이블) | 있음 | FAIL (`organizations` 부재 — roles 보다 먼저) |
| `20270326000000-DropGlycopharmService` | bare 4행 `service_key` glycopharm→platform · `glycopharm:%` DELETE (roles · role_assignments) · `platform_services` DELETE | `roles` · `role_assignments` · `platform_services` | 없음 | 있음 (삭제) | FAIL |
| `20270413000000-BaselineRbacAndAccountTables` | `role_permissions` FK 대상으로 `roles` 존재 **요구** (부재 시 throw) | `roles` | 5 테이블 생성 | 없음 | **FAIL** `required table "roles" is absent` (설계된 동작) |

운영 이력에서 role 관련으로 실행된 나머지(`RolePrefixMigrationFoundation` · `KpaRolePrefixMigration` · `MigrateLegacyRolesToPlatformPrefixed` · `CleanupKpaOrphanRoles` · `FixKpaAdminRole` 등) 는 `users.roles[]` · `role_assignments` 를 대상으로 하며 `roles` 테이블을 읽거나 쓰지 않는다.

### 4-2. 격리 fresh DB 실험

| 실험 | 조건 | 결과 |
|---|---|---|
| A | fresh DB + `uuid-ossp` (운영과 동일 확장) · 파일명 `< 20260318100000` 244개만 · **deploy 와 동일한 `DataSource.runMigrations({transaction:'each'})`** | **실행 0건**, 첫 migration `RolePrefixMigrationFoundation20260205033223` 실패 `relation "users" does not exist`. `roles` 존재 = false |
| B | 위와 같되 644개 전체 | 동일 (실행 0건 · 같은 지점) |
| B' | `uuid-ossp` 없이 | 같은 migration 이 `function uuid_generate_v4() does not exist` 로 실패 — 운영은 확장이 있으므로 참고값 |
| C | 파일명(타임스탬프) 순으로 1건씩 트랜잭션 실행 · 첫 실패에서 중지 | **5건 성공 후 6번째** `1736400000000-AddEnabledServicesToPharmacy` 실패 `relation "glycopharm_pharmacies" does not exist` (생성 migration `CreateGlycopharmTables1735564800000` 은 §3 의 삭제된 30건에 속함). `roles` 존재 = false |
| D | 파일명 순 · 실패 건은 롤백하고 건너뜀 | 성공 515 / 실패 129. `roles` 존재 = false (끝까지). 실패 129 중 112 = `relation … does not exist`. `users` · `role_assignments` · `platform_services` · `kpa_members` 는 생성됨, `roles` · `organizations` · `service_memberships` · baseline 5 테이블은 미생성 |

**A/B 의 원인 (재현성의 첫 번째 벽)**: TypeORM 0.3.27 `MigrationExecutor.getMigrations()` 는 `parseInt(migrationClassName.substr(-13))` 으로 정렬한다. 14자리 `…20260205033223` 은 `0260205033223`(2.6e11) 로 파싱되어 13자리 `…1700000000000`(1.7e12) 보다 **앞**에 선다. 운영에서는 pending 이 항상 1~수 건이라 문제가 드러나지 않았지만, fresh DB 에서는 562개 14자리 migration 이 legacy 82개보다 먼저 실행된다. 이는 `roles` 와 무관한 **저장소 전체의 fresh-DB 재현성 결함**이며 이 IR 범위 밖 → §11 중지 조건 · §10 별도 WO.

**§4 판정**: `20260318100000-ExtendRolesTable` 이전에 `roles` 를 만드는 migration 은 없고, 그 이전 migration 들만 실행한 격리 DB 에서 `roles` 는 존재하지 않는다 (실험 A · C · D 모두 false). 사용자 1차 조사 결론(ExtendRolesTable 이 roles 를 만들지 않는다) 은 실측으로 확정.

---

## 5. 운영 `roles` 구조 실측 (read-only · 2026-09-14)

### 5-1. 컬럼 18개

| # | 컬럼 | 타입 | NULL | default | 출처 | Entity 매핑 | raw SQL/migration 사용 | constraint/index | 판정 |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `id` | uuid | NN | `uuid_generate_v4()` | synchronize | ○ `id` | migration 다수 | `PK_roles` | **CANONICAL_SHARED** |
| 2 | `name` | varchar(100) | NN | — | synchronize (50) → ExtendRolesTable (100) | ○ `name` | migration 다수 · MembershipConsole `LEFT JOIN roles r ON ra.role = r.name` | `UQ_roles_name` (entity `@Index(['name'],{unique})` 와 일치) | **CANONICAL_SHARED** |
| 3 | `description` | text | NULL | — | synchronize | ○ `description` | ExtendRolesTable seed | — | **CANONICAL_SHARED** |
| 4 | `displayName` | varchar(255) | NULL | — | synchronize | ✕ | 0 | — | **LEGACY_UNUSED** (NULL 41/41) |
| 5 | `permissions` | jsonb | NN | `'[]'` | synchronize (원본 entity 의 `permissions: string[]`) | ✕ (현 entity 는 `role_permissions` ManyToMany) | 0 | — | **LEGACY_UNUSED** (전 행 `[]`) · 짝 없음 |
| 6 | `isSystem` | boolean | NN | false | synchronize | ✕ | 0 | — | **LEGACY_UNUSED** (snake 와 불일치 39/41) |
| 7 | `createdAt` | timestamp | NN | CURRENT_TIMESTAMP | synchronize | ✕ | 0 | — | **LEGACY_UNUSED** (값은 우연히 일치 41/41 — 둘 다 INSERT 시각) |
| 8 | `updatedAt` | timestamp | NN | CURRENT_TIMESTAMP | synchronize | ✕ | 0 | — | **LEGACY_UNUSED** (불일치 14/41 — entity 는 snake 만 갱신) |
| 9 | `isActive` | boolean | NULL | true | synchronize | ✕ | 0 | — | **LEGACY_UNUSED** (불일치 1/41 = `pharmacy-hub:supplier` camel true / snake false) |
| 10 | `display_name` | varchar(200) | NULL | — | ExtendRolesTable | ○ `displayName` (entity: varchar(100) **NOT NULL**) | seed 전부 | — | **CANONICAL** · drift(길이 · nullability) |
| 11 | `service_key` | varchar(50) | NULL | — | ExtendRolesTable | ○ `serviceKey` | seed · DropGlycopharmService UPDATE | `idx_roles_service_key` · `idx_roles_service_role`(partial unique, `WHERE service_key IS NOT NULL`) | **CANONICAL** |
| 12 | `role_key` | varchar(50) | NULL | — | ExtendRolesTable | ○ `roleKey` | seed · MembershipConsole tier 판정(`roleEntity.roleKey === 'operator'`) | `idx_roles_service_role` | **CANONICAL** |
| 13 | `is_admin_role` | boolean | NULL | false | ExtendRolesTable | ○ `isAdminRole` (entity NOT NULL) | MembershipConsole raw `COALESCE(r.is_admin_role,false)` | — | **CANONICAL** · drift(nullability) |
| 14 | `is_system` | boolean | NULL | false | ExtendRolesTable | ○ `isSystem` (entity NOT NULL) | seed | — | **CANONICAL** · drift |
| 15 | `is_active` | boolean | NULL | true | ExtendRolesTable | ○ `isActive` (entity NOT NULL) | DeactivatePharmacyHubSupplierRole | entity `@Index(['isActive'])` **운영 부재** | **CANONICAL** · drift(nullability · 인덱스) |
| 16 | `is_assignable` | boolean | NULL | true | ExtendRolesTable | ○ `isAssignable` (entity NOT NULL) | seed | — | **CANONICAL** · drift |
| 17 | `created_at` | timestamptz | NULL | now() | ExtendRolesTable | ○ `@CreateDateColumn` | — | — | **CANONICAL** · drift(entity 타입 미지정 → timestamp) |
| 18 | `updated_at` | timestamptz | NULL | now() | ExtendRolesTable | ○ `@UpdateDateColumn` | — | — | **CANONICAL** · drift |

- 제약: `PK_roles(id)` · `UQ_roles_name(name)`. 인덱스: 위 2 + `idx_roles_service_key` + `idx_roles_service_role`. 운영 전용(코드에 근거 없는) constraint/index/trigger 는 **없다** — 모두 entity 또는 ExtendRolesTable 에서 유래. 트리거 0 · RLS off · policy 0 · 시퀀스 0 · `typeorm_metadata` 테이블 없음.
- inbound FK: `role_permissions.FK_role_permissions_role` (ON DELETE CASCADE) 1건뿐. `role_assignments` 는 FK 없이 문자열로만 연결.
- LEGACY 판정 근거는 이름이 아니라 (a) entity 매핑 부재, (b) 저장소 전체 raw SQL · migration 참조 0, (c) 값 불일치 실측 — 3가지 모두 충족.

### 5-2. 5쌍 값 대조 (41행)

| 쌍 | camel NULL | snake NULL | 값 불일치 행 | 해석 |
|---|---|---|---|---|
| `displayName` / `display_name` | 41 | 0 | 41 | camel 은 한 번도 기록되지 않음 |
| `isSystem` / `is_system` | 0 | 0 | 39 | camel 은 default false 고정, snake 는 seed 가 true |
| `isActive` / `is_active` | 0 | 0 | 1 | `pharmacy-hub:supplier` 비활성화가 snake 에만 반영 |
| `createdAt` / `created_at` | 0 | 0 | 0 | 둘 다 INSERT 시각 default |
| `updatedAt` / `updated_at` | 0 | 0 | 14 | entity `@UpdateDateColumn` 이 snake 만 갱신 |

`name ≠ service_key:role_key` (비-platform) 2행: `consumer`(cosmetics/consumer) · `pharmacist`(cosmetics/pharmacist) — UnifyCosmeticsRolesCatalog 개명 잔재 (§7).

---

## 6. 런타임 소비자 census

식별자 검색(`Repository<Role>` · `getRepository(Role)` · `RoleService` · `getRoleByName` · `isValidRole` · `getRolesByService` · `getAssignableRoles` · `createRole|updateRole|deleteRole` · raw `FROM|JOIN roles` · `is_admin_role|is_assignable|role_key|is_system`) 을 `apps/** packages/** services/** scripts/** .github/**` 에 수행한 뒤, 각 hit 의 route 등록 · guard · 화면 도달까지 추적했다.

| 소비자 | 호출 진입점 | 읽는 컬럼 | 쓰는 컬럼 | 사용자 도달 | 권한 영향 | 판정 |
|---|---|---|---|---|---|---|
| `RoleService` (`modules/auth/services/role.service.ts`) — **유일한 `Repository<Role>`** | 아래 컨트롤러 2개에서만 import (o4o-store video 컨트롤러 2개는 주석 매치 · 실사용 0) | `name is_active service_key is_assignable` (+ eager `permissions` JOIN → `role_permissions`/`permissions` 0행) | `createRole`: name display_name description service_key role_key is_admin_role is_assignable is_system=false is_active=true · `updateRole`: display_name description is_admin_role is_assignable is_active · `deleteRole`: is_active=false (is_system 보호) | 간접 | 간접 | **RUNTIME_ACTIVE** |
| `RoleController` → `GET/POST/PUT/DELETE /api/v1/operator/roles` (`register-routes.ts:663`) | guard `authenticate` + `requireRole([admin, operator, manager, platform:super_admin, neture/cosmetics/kpa/pharmacy-hub :admin/:operator])` + `injectServiceScope`; CUD 는 `scope.isPlatformAdmin` 만 | 전 canonical 컬럼 | CUD 경유 위와 동일 | **예** — `packages/ui` `RoleManagementPage` 를 web-kpa-society · web-neture(operator + admin `PlatformRolesPage`) · web-k-cosmetics · web-pharmacy-hub 가 렌더 · `UserDetailPage` 가 `GET /operator/roles` 로 부여 후보 목록 | 카탈로그 편집 = 이후 부여 판정에 영향 | **RUNTIME_ACTIVE** (사용자 화면 有) |
| `MembershipConsoleController.assignMemberRole` (`POST /api/v1/operator/members/:userId/roles`) | `roleService.getRoleByName(role)` (+ prefix 재시도) → 없으면 400 `Invalid role`; `isAssignable` false → 403; `isAdminRole` 또는 `roleKey==='operator'` → 403 (platform admin 전용) | `name is_active service_key role_key is_admin_role is_assignable` | `role_assignments` 만 (roles 쓰기 0) | 예 (운영자 회원 콘솔) | **직접** — `roles` 에 없는 값은 부여 불가 · `is_admin_role/role_key` 가 tier 차단 근거 | **RUNTIME_ACTIVE · 권한 게이트** |
| `MembershipConsoleController.removeMemberRole` (`DELETE …/roles/:role`) | 동일 검증 | 동일 | `role_assignments` | 예 | 직접 — `roles` 에 없는 값(예 `user` · `neture:member`) 은 콘솔에서 회수 불가(400) | **RUNTIME_ACTIVE** |
| `MembershipConsoleController.getMemberDetail` raw SQL `LEFT JOIN roles r ON ra.role = r.name` (`:537`) | 회원 상세 | `is_admin_role` (`COALESCE(…,false)`) | — | 예 | 표시 · UI 회수 버튼 필터 (`UserDetailPage:740`) | **RUNTIME_ACTIVE** (LEFT JOIN 이라 부재 시 false 로 degrade) |
| `utils/role-revoke-safety.ts` `isAdminTierRoleName` | 이름 규칙 보강 | (roles 안 읽음 · 주석에서 `is_admin_role/role_key` 참조) | — | — | 보강 | 코드 소비자 아님 (문서 참조) |
| `routes/admin/users.routes.ts` `isValidRole` | admin users API | 없음 (정규식 + LEGACY_ROLES 상수) | — | 예 | admin 경로는 `roles` 테이블 무관 | **NOT_A_CONSUMER** (동명이인) |
| `packages/types/src/auth/roles.ts` `isValidRole` · `apps/api-server/src/types/roles.ts` `getRolesByService` | 코드 상수 | 없음 | — | — | — | **NOT_A_CONSUMER** (동명이인) |
| `packages/auth-core/src/manifest.ts` `services: ['RoleService', …]` | 메타데이터 문자열 | — | — | — | — | 문서/manifest 만 |
| `database/entities.ts` · `Permission.ts` | entity 등록 · 역참조 | — | — | — | — | 등록 전용 |
| 로그인 · JWT · `requireRole` · `require*Scope` · `hasAnyRole` · `MembershipApprovalService` · `roleAssignmentService` | — | **`roles` 를 읽지 않음** (role_assignments 문자열) | — | — | — | 무관 (확인됨) |
| migration 12건 (§4) | deploy job | — | — | — | — | MIGRATION_ONLY |
| 테스트 (`MembershipConsoleController.roleRevokeSafety.test.ts` mock `getRoleByName` · `role-admin-tier.test.ts`) | jest | — | — | — | — | TEST_ONLY |
| `scripts/**` · `.github/**` | — | `roles` 테이블 참조 0 (`create-manager-user.ts` 는 role_assignments 만) | — | — | — | 없음 |

**`role_assignments` 에는 있으나 `roles` 에 없는 값의 런타임 효과**: 로그인 · guard 는 정상 (SSOT 가 문자열). 운영자 콘솔에서는 (a) 회원 상세에 `isAdminRole=false` 로 표시, (b) 부여/회수 요청 시 400 `Invalid role`. 즉 `user`(활성 2) · `neture:member`(활성 4) · `cosmetics:member`(1) · `kpa:member`(1) 보유자는 콘솔로 회수할 수 없다 — admin API(`/admin/users`) 경로는 정규식 검증이라 가능.

---

## 7. 운영 41행 분류

기준: RBAC-ROLE-CATALOG-V1 Layer A · `packages/security-core/src/service-configs.ts` allowedRoles (kpa · neture · platform · cosmetics) · `apps/api-server/src/types/roles.ts` PrefixedRole(29) · guard 리터럴 census · `role_assignments` 활성/비활성 · `platform_services`(active: cafe24-b2b · cosmetics · k-cosmetics · kpa · kpa-branch · kpa-groupbuy · kpa-society · neture · pharmacy-hub) · 생성 migration · 플래그.

| name | service_key / role_key | 생성 | flags (system/active/assignable/admin) | RA 활성/비활성 | 코드 등재 | 분류 | 근거 |
|---|---|---|---|---|---|---|---|
| `platform:super_admin` | platform/super_admin | ExtendRolesTable | t/t/t/**t** | 3/2 | 카탈로그 · security-core · guard 108 | **CANONICAL_SYSTEM_ROLE** | 부팅 최소 관리자 |
| `platform:admin` | platform/admin | ExtendRolesTable | t/t/**f**/t | 0/0 | 카탈로그 "코드에서 제거됨" | **DEPRECATED_BUT_REQUIRED_FOR_HISTORY** | `is_assignable=false` 로 이미 봉인 |
| `platform:operator` | platform/operator | ExtendRolesTable | t/t/t/f | 0/0 | 제거됨 | **DEPRECATED_BUT_REQUIRED_FOR_HISTORY** | 부여 가능 상태로 남아 있음 → 후속 WO 에서 `is_assignable=false` 검토 |
| `platform:manager` · `platform:vendor` · `platform:member` · `platform:contributor` | platform/* | ExtendRolesTable | t/t/t/f | 0/0 | `types/roles.ts` 타입만 · 카탈로그 Layer A 미등재 · guard 0 | **ORPHAN_NO_CONSUMER** (4) | 보유자 0 · 판정 코드 0 |
| `kpa:admin` · `kpa:operator` | kpa | ExtendRolesTable | t/t/t/(t·f) | 1/0 · 2/0 | security-core · guard 116/98 | **CANONICAL_SERVICE_ROLE** | |
| `kpa:pharmacist` · `kpa:student` | kpa | ExtendRolesTable | t/t/t/f | 0/0 · 0/1 | types/roles.ts · guard 8/4 | **CANONICAL_SERVICE_ROLE** (보유자 0) | 신분 역할 |
| `kpa:store_owner` | kpa | BackfillStoreOwnerRoles (`is_system=f`) | f/t/t/f | 5/1 | types/roles.ts · guard 15 | **CANONICAL_SERVICE_ROLE** | is_system=false 지만 실사용 |
| `kpa:district_admin` · `kpa:branch_admin` · `kpa:branch_operator` | kpa | ExtendRolesTable | t/t/t/(t·t·f) | 0/0 | 코드에서 제거 (WO-O4O-KPA-BRANCH-DISTRICT-LEGACY-CLEANUP-V1) · 카탈로그 §Service Prefix 예시에 잔존 | **DEPRECATED_BUT_REQUIRED_FOR_HISTORY** (3) | `is_admin_role=true` 인 채로 부여 가능 — 문서 drift 1건 (§12) |
| `kpa-branch:admin` · `kpa-branch:operator` · `kpa-branch:member` | kpa-branch | SeedKpaBranchServiceAndRoles | t/t/t/(t·f·f) | 0/0 · 1/1 · 2/0 | guard 6/6/6 · `platform_services` active · 카탈로그 미등재 | **CANONICAL_SERVICE_ROLE** (3) · 카탈로그 문서 미반영 | |
| `neture:admin` · `neture:operator` · `neture:supplier` · `neture:partner` | neture | ExtendRolesTable | t/t/t/(t·f·f·f) | 1/0 · 1/0 · 0/0 · 0/1 | security-core allowedRoles | **CANONICAL_SERVICE_ROLE** (4) | supplier/partner 실보유는 bare (§ 아래) |
| `neture:user` | neture/user | ExtendRolesTable | t/t/t/f | 0/0 | types/roles.ts · guard 5 | **DECISION_REQUIRED** | 카탈로그 미등재 · 보유자 0 · 실제 회원은 `neture:member`(roles 부재) |
| `cosmetics:admin` · `cosmetics:operator` | cosmetics | ExtendRolesTable | t/t/t/(t·f) | 1/0 · 1/0 | security-core | **CANONICAL_SERVICE_ROLE** (2) | |
| `cosmetics:store_owner` | cosmetics | BackfillStoreOwnerRoles | f/t/t/f | 4/0 | types/roles.ts | **CANONICAL_SERVICE_ROLE** | |
| `cosmetics:partner` · `cosmetics:supplier` | cosmetics | ExtendRolesTable (개명 후 재-seed 흔적) | t/t/t/f | 0/2 · 0/0 | types/roles.ts 만 | **DECISION_REQUIRED** (2) | UnifyCosmeticsRolesCatalog 가 bare 로 통합했는데 prefixed 행이 다시 존재 |
| `consumer` (cosmetics/consumer) · `pharmacist` (cosmetics/pharmacist) | cosmetics | UnifyCosmeticsRolesCatalog 개명 | t/t/t/f | 0/0 · 0/0 | 카탈로그 Layer A 미등재(bare `consumer`/`pharmacist` 없음) | **ORPHAN_NO_CONSUMER** (2) | name ≠ key · 보유자 0 |
| `pharmacy-hub:admin` · `pharmacy-hub:operator` · `pharmacy-hub:store_owner` · `pharmacy-hub:member` | pharmacy-hub | Seed* (2027-02/03) | t/t/t/(t·f·f·f) | 2/0 · 2/1 · 6/1 · 2/0 | pharmacy-hub-scope.middleware · guard | **CANONICAL_SERVICE_ROLE** (4) | `member` 는 카탈로그 문서 미등재 |
| `pharmacy-hub:supplier` | pharmacy-hub | SeedPharmacyHubServiceAndRoles → Deactivate | t/**f**/t/f | 0/0 | 카탈로그 "없다" 명시 | **INACTIVE_RETIRED** | fresh seed 재도입 금지 |
| `lms:instructor` | lms/instructor | ExtendRolesTable | t/t/t/f | 1/0 | types/roles.ts · guard 15 | **ACTIVE_BUT_NOT_SEEDED** | `lms` 는 `platform_services` 에 없음 · 카탈로그 접두어 표에 없음 |
| `cafe24-b2b:store_owner` | cafe24-b2b | CreateCafe24MemberLinks… | t/t/t/f | 0/0 | 런타임 리터럴 0 (migration 만) · `platform_services` active | **DECISION_REQUIRED** | 서비스는 살아 있으나 판정 코드 0 |
| `supplier` (platform) · `pharmacy` (platform) · `customer` (platform) | platform | UnifyGlycopharm… 개명 → DropGlycopharmService 가 platform 으로 이관 | t/t/t/f | 6/0 · 2/0 · 7/1 | 카탈로그 Layer A bare 허용 | **ACTIVE_BUT_NOT_SEEDED** (3) | seed 원본은 삭제된 glycopharm 행 — 현재 값은 migration 연쇄의 산물이며 어떤 seed 도 이 형태를 직접 만들지 않음 |
| `partner` (platform) | platform | 동일 | t/t/t/f | 0/0 | 카탈로그 허용 · 보유자 0 | **ORPHAN_NO_CONSUMER** | 카탈로그 "신규 부여 대상 아님" |

집계 (41): CANONICAL_SYSTEM_ROLE 1 · CANONICAL_SERVICE_ROLE 19 (kpa 5 · kpa-branch 3 · neture 4 · cosmetics 3 · pharmacy-hub 4) · ACTIVE_BUT_NOT_SEEDED 4(`lms:instructor` · `supplier` · `pharmacy` · `customer`) · DEPRECATED_BUT_REQUIRED_FOR_HISTORY 5(`platform:admin` · `platform:operator` · `kpa:district_admin` · `kpa:branch_admin` · `kpa:branch_operator`) · INACTIVE_RETIRED 1 · ORPHAN_NO_CONSUMER 7(`platform:manager/vendor/member/contributor` · `consumer` · `pharmacist` · `partner`) · DECISION_REQUIRED 4(`neture:user` · `cosmetics:partner` · `cosmetics:supplier` · `cafe24-b2b:store_owner`).

**`roles` 에 없는 `role_assignments` 값 7종**: `user`(활성 2 · 카탈로그 허용) · `neture:member`(활성 4 · `service_memberships` 정규값) · `cosmetics:member`(1) · `kpa:member`(1) · `member` · `store_owner` · `super_admin`(비활성 이력). `service_memberships.role` 에는 bare `member/store_owner/admin/user/operator/supplier/customer/super_admin` 이 혼재 — 이 축은 `roles` 와 계약이 없다.

> **fresh DB 에 재도입 금지**: `glycopharm:*` 6 · `glucoseview:*` 4 (ExtendRolesTable seed 에 남아 있음) · `pharmacy-hub:supplier` · `kpa:district_admin/branch_admin/branch_operator`. 운영 데이터 삭제는 이 IR 에서 하지 않는다.

---

## 8. seed 소유권 분리

| 층 | 내용 | 현재 소유자 | 비고 |
|---|---|---|---|
| 스키마 | 18 → canonical 12 컬럼 (`id name description display_name service_key role_key is_admin_role is_system is_active is_assignable created_at updated_at`) + 제약 2 + 인덱스 2 | 없음 (synchronize + ExtendRolesTable ALTER) | legacy 6 컬럼 처분은 별도 WO |
| 부팅 최소 system role | `platform:super_admin` 1행 (관리자 부트스트랩 · `BootstrapCanonicalSeedAccounts` 가 role_assignments 에 부여) | ExtendRolesTable seed 37행 중 1 | |
| 서비스별 role | kpa 5 · kpa-branch 3 · neture 4 · cosmetics 3 · pharmacy-hub 4 · lms 1 (19) | ExtendRolesTable(구조와 혼합) + 개별 Seed* migration 5 | pharmacy-hub · kpa-branch · cafe24 는 이미 **독립 seed migration** 을 갖는다 |
| history-only | DEPRECATED 5 · INACTIVE 1 | ExtendRolesTable / Deactivate | fresh DB 에는 불필요 |
| 수동/파생 | bare `supplier/pharmacy/customer/partner` · `consumer/pharmacist` | migration 연쇄(개명 · 이관) 의 산물 — 직접 seed 없음 | canonical 값이지만 fresh 경로가 없음 |

### 옵션 평가

| 안 | 내용 | 장점 | 단점 | 판정 |
|---|---|---|---|---|
| **A** | 구조 전용 baseline(존재 시 assertion · 부재 시 canonical 12컬럼 생성) + **별도** canonical 최소 seed migration(system 1 + 서비스 19 + bare 4, `ON CONFLICT (name) DO NOTHING`) | 스키마/데이터 분리 · 선행 CHECK 의 5테이블 baseline 과 동일 패턴 · 은퇴 role 미재도입 · 운영 no-op | migration 2개 · seed 목록이 곧 정책이라 RBAC-ROLE-CATALOG-V1 갱신 WO 와 짝 필요 | **권고** |
| B | 구조 + 최소 system role 1행을 한 migration 에 | 파일 1개 | 구조 migration 이 데이터를 만든다(선행 CHECK 계약 위반 · 테스트 `INSERT 0` 규칙과 충돌) · 서비스 role 은 어차피 별도 | 불채택 |
| C | 41행 전체 snapshot | 운영과 동일 | DEPRECATED 5 · ORPHAN 7 · DECISION 4 를 canonical 로 승격 · glycopharm 잔재 형태의 bare 행을 "정본" 으로 고정 | **불채택** (사용자 규칙과 일치) |
| D | 기존 per-service seed migration 에 의존 | 추가 없음 | ExtendRolesTable 이 `roles` 를 만들지 않고 glycopharm/glucoseview 를 seed 함 · kpa/neture/cosmetics/platform 은 독립 seed 가 없음 · §4-2 순서 결함으로 fresh 에서 어차피 실행 불가 | 불채택 |

A 안 전제: (1) `ExtendRolesTable` 은 실행 완료 migration 이므로 수정하지 않는다 — 새 baseline 이 fresh 에서 그보다 **먼저** 실행되도록 순서를 보장해야 하는데 §4-2 의 TypeORM 정렬 결함 때문에 타임스탬프만으로는 보장할 수 없다 → 순서 결함 WO 가 선행하거나, baseline 을 "존재 시 canonical 로 수렴(legacy 컬럼 무시)" 로 설계해 순서 무관하게 만들어야 한다. (2) seed migration 은 `is_system=true` 여부 · `is_assignable` 값을 §7 판정에 맞춰 명시한다.

---

## 9. 판정 재정의

| 항목 | 선행 CHECK | 이 IR |
|---|---|---|
| `FIVE_BASELINE_TABLE_REPRODUCIBILITY` | `FRESH_DATABASE_REPRODUCIBILITY = PASS` (fingerprint 67/67) | **PASS — 단, "roles 가 이미 존재하는 DB" 조건부.** 선행 CHECK 의 격리 harness 는 roles 를 선생성한 상태에서 5테이블만 검증했다. 판정 자체는 유지(CLOSED 재개 아님) 하되 **문구 범위 오류**: `FRESH_DATABASE_REPRODUCIBILITY` → `FIVE_BASELINE_TABLE_REPRODUCIBILITY(roles 선존재 조건)` 로 읽어야 한다 |
| `ROLES_TABLE_CREATION_OWNER` | STOP (후속) | **NONE** — synchronize 잔재. 저장소 migration 0 |
| `ROLES_CATALOG_SEED_OWNER` | — | **MIXED_AND_PARTIALLY_RETIRED** — ExtendRolesTable(구조+seed 혼합 · 은퇴 role 포함) + Seed* 5 + 개명/이관 연쇄. 단일 소유자 없음 |
| `FULL_RBAC_FRESH_DATABASE_REPRODUCIBILITY` | — | **FAIL** (PARTIAL 아님) — roles 이전에 (a) TypeORM 정렬 결함으로 0건 실행, (b) 파일 순서 강제 시 삭제된 30 migration 의존으로 6번째 실패 |
| `ENTITY_TO_PRODUCTION_SCHEMA_ALIGNMENT` (roles) | — | **DRIFT_NON_BREAKING** — nullability 5 · 길이 1 · 인덱스 1 · timestamp 타입 2, legacy 6컬럼 미매핑. 런타임 오류 0 (NOT NULL default 가 INSERT 를 살림) |

---

## 10. 후속 WO 분할 (순서)

| # | WO (제안명) | 범위 | 선행 |
|---|---|---|---|
| 0 | `WO-O4O-MIGRATION-ORDERING-AND-FRESH-DB-REPRODUCIBILITY-GATE-V1` | TypeORM 끝13자리 정렬 결함 판정 · 삭제된 30 migration 의존 처리 방침 · fresh-DB CI 게이트 가능 여부 — **roles 와 무관하지만 모든 baseline 의 전제** | 이 IR |
| 1 | `WO-O4O-ROLES-TABLE-CANONICAL-SCHEMA-AND-LEGACY-COLUMN-DISPOSITION-V1` | canonical 12컬럼 선언 · legacy 6컬럼(`displayName permissions isSystem createdAt updatedAt isActive`) DROP 여부 · entity nullability/길이/인덱스 정렬(entity 를 운영에 맞출지 운영을 entity 에 맞출지) — **데이터 · 권한 변경 0** | 0 |
| 2 | `WO-O4O-ROLES-TABLE-CREATION-OWNER-BASELINE-MIGRATION-V1` | 구조 전용 baseline(존재 시 assertion · 부재 시 생성) — 선행 5테이블 CHECK 와 같은 계약 · seed 0 | 1 |
| 3 | `WO-O4O-ROLES-CANONICAL-MINIMAL-SEED-MIGRATION-V1` | system 1 + 서비스 19 + bare 4 · `ON CONFLICT DO NOTHING` · 은퇴 role 제외 · RBAC-ROLE-CATALOG-V1 갱신(kpa-branch · pharmacy-hub:member · lms · cafe24 · kpa:district/branch 잔존 표기) 동반 | 2 |
| 4 | `WO-O4O-ROLES-RETIRED-AND-ORPHAN-ROW-DISPOSITION-V1` | DEPRECATED 5 (`is_assignable=false` 봉인 여부) · ORPHAN 7 · DECISION 4 · `roles` 부재 role_assignments 7종(`user` · `*:member`) 처분 — **데이터 변경 · 사용자 승인 필수** | 3 |
| 5 | `WO-O4O-PERMISSION-LINKED-ACCOUNT-ACCOUNT-ACTIVITY-ENTITY-DRIFT-V1` | 선행 CHECK §9 잔여 | 독립 |

스키마(1·2) 와 role 데이터/권한(3·4) 은 섞지 않는다.

---

## 11. 중지 조건 발생 목록

| 조건 | 발생 | 내용 |
|---|---|---|
| camel/snake 값 불일치 | **예** | `isSystem` 39 · `updatedAt` 14 · `isActive` 1 · `displayName` 41 (§5-2) |
| camelCase 활성 소비자 | 아니오 | 6컬럼 모두 소비자 0 |
| role 현행성 불명 | **예** | DECISION_REQUIRED 4 · `roles` 부재 role_assignments 7종 |
| 운영 전용 constraint/index/trigger | 아니오 | 전부 코드 유래 |
| 저장소 밖 소비자 | 불명 | `roles` 를 직접 읽는 외부 시스템 증거 없음 (DB 사용자 `o4o_api_v2` 단일) — 단정하지 않음 |
| roles 보다 이른 fresh-DB 실패 | **예** | §4-2 (0건 실행 / 6번째 실패) |
| 자격정보 필요 | 기존 경로만 사용 | Secret Manager → 환경변수 |
| 운영 write | 없음 | |
| 경로 충돌 | 없음 | 다른 세션 파일 접촉 0 |
| 무관 CI 실패 | 참고 | `work-agent.spec.ts` (다른 세션 `5d6e3bf03`) — 이 IR 과 무관 · 미수정 |

---

## 12. 문서 정합

- 발견: **3건** — ① 선행 CHECK §8 `FRESH_DATABASE_REPRODUCIBILITY = PASS` 는 범위 한정어 누락(기록물이라 본문 불변 · 이 IR §9 로 보정) ② `RBAC-ROLE-CATALOG-V1` §Service Prefix 표가 제거된 `kpa:branch_admin/branch_operator` 를 예시로 유지하고 `kpa-branch:` · `pharmacy-hub:member` · `lms:` · `cafe24-b2b:` 를 누락 ③ `ExtendRolesTable` 주석 "35개" ≠ 실제 37행 (실행 완료 migration · 수정 금지)
- SUPERSEDED 표기 0 · 링크 수정 0 · 별도 WO 제안 **5건 + 순서결함 1건** (§10)

---

## 13. 사용자 검토 결과 반영 (2026-09-14 · 조사 결론 확정)

사용자가 자체 1차 조사와 이 IR 을 대조해 아래를 확정했다 (이 IR 본문 §0~§12 는 조사 시점 기록으로 유지).

- camel/snake 쌍은 **5쌍**으로 정정 (1차 조사의 9쌍 가설 철회).
- 판정 명칭 확정: `RBAC_AND_ACCOUNT_BASELINE_MIGRATION_OWNERSHIP = CLOSED (지정 5테이블)` · `FIVE_BASELINE_TABLE_REPRODUCIBILITY = PASS_WITH_PREEXISTING_ROLES_FIXTURE` · `FULL_DATABASE_MIGRATION_REPLAY = FAIL` · `FULL_RBAC_FRESH_DATABASE_REPRODUCIBILITY = FAIL` · `ROLES_TABLE_CREATION_OWNER = NONE`. 선행 CHECK 는 재개하지 않으며, 수정한다면 정정 부록 추가 방식만.
- TypeORM 끝13자리 정렬 문제는 **P0** (저장소 전체 migration 신뢰성). 단, 실행 완료 migration 의 파일명·class name 일괄 rename 은 history 불일치 위험이 있으므로 **금지**.
- canonical 12컬럼 = 공통 3 + snake 9. legacy 6 은 제거 후보이나 DROP 전 행 단위 값 비교 · default/constraint/index 연결 · rollback · 구·신 revision 혼재 호환 · 저장소 밖 소비자 최종 확인 필요.
- `roles` 미등재 `role_assignments` 7종은 무조건 추가도 삭제도 하지 않고 역할별 서비스 계약 · 실제 보유자 대조 후 처분.
- 최소 seed **24행은 권고 모집단이지 확정값이 아니다** — 회귀 테스트에 고정하지 말고 역할별 판정 후 정본 카탈로그에서 산출.
- §10 순서 조정: 0단계는 구현 WO 가 아니라 **전수 IR** `IR-O4O-MIGRATION-TIMESTAMP-ORDERING-HISTORY-GAP-AND-FRESH-DATABASE-REPLAY-CENSUS-V1` 로 시작. 그 IR 전에는 migration rename · class name 변경 · `typeorm_migrations` history 수정 · 누락 migration 추정 복원 · 대규모 schema snapshot · `roles` baseline migration 추가를 하지 않는다. 이후 순서: ① `WO-O4O-MIGRATION-ORDERING-AND-FRESH-DATABASE-BOOTSTRAP-OWNERSHIP-CLOSURE-V1` → ② `WO-O4O-ROLES-CANONICAL-SCHEMA-AND-LEGACY-COLUMN-DISPOSITION-V1` → ③ `WO-O4O-ROLES-TABLE-BASELINE-MIGRATION-OWNERSHIP-FINAL-CLOSURE-V1` → ④ `WO-O4O-CANONICAL-ROLE-CATALOG-AND-MINIMUM-SEED-OWNERSHIP-V1` → ⑤ 운영 role 데이터 처분(별도 승인) → ⑥ Permission · LinkedAccount · AccountActivity drift.
- 보안: 이전 세션 터미널에 노출된 테스트 계정 비밀번호는 변경 + refresh token · 로그인 세션 무효화 + 동일 비밀번호 재사용 여부 확인 (사용자 조치 · 새 값은 어디에도 기록하지 않음).

---

## 14. 부록 — 실측 원자료 요약

- 운영 `roles` 41행 상세(name · service_key · role_key · flags · created_at · RA 활성/비활성 · role_permissions 0): 세션 scratchpad `prod-roles-data.txt` (민감정보 없음 · 저장소 미포함).
- 격리 실험 D 실패 129건 목록: scratchpad `fresh-skip.txt`.
- 사용 도구: `psql` read-only · `information_schema.columns` · `pg_attribute` · `pg_constraint` · `pg_indexes` · `pg_trigger` · `pg_policies` · `pg_extension` · TypeORM 0.3.27 `DataSource.runMigrations` (deploy `migrate.ts` 와 동일 `transaction:'each'`).
