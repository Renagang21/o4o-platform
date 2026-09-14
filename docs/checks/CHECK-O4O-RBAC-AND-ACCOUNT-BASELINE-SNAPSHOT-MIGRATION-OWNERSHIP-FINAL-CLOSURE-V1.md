# CHECK-O4O-RBAC-AND-ACCOUNT-BASELINE-SNAPSHOT-MIGRATION-OWNERSHIP-FINAL-CLOSURE-V1

> **WO**: `WO-O4O-RBAC-AND-ACCOUNT-BASELINE-SNAPSHOT-MIGRATION-OWNERSHIP-FINAL-CLOSURE-V1`
> **선행**: [`CHECK-O4O-RBAC-BASELINE-TABLE-MIGRATION-OWNERSHIP-AND-LEGACY-SCHEMA-DECLARATION-CLOSURE-V1`](CHECK-O4O-RBAC-BASELINE-TABLE-MIGRATION-OWNERSHIP-AND-LEGACY-SCHEMA-DECLARATION-CLOSURE-V1.md) (MIGRATION_OWNERSHIP_REQUIRED 5 판정) · [`IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1`](../investigations/IR-O4O-CORE-LIFECYCLE-SCHEMA-OWNERSHIP-AND-RUNTIME-CONSUMER-CENSUS-V1.md)
> **기준**: [`PRODUCTION-MIGRATION-STANDARD`](../baseline/operations/PRODUCTION-MIGRATION-STANDARD.md) · [`RBAC-FREEZE-DECLARATION-V1`](../rbac/RBAC-FREEZE-DECLARATION-V1.md) (F9) · [`O4O-CORE-FREEZE-V1`](../architecture/O4O-CORE-FREEZE-V1.md)
> **작업일**: 2026-09-14 · **운영 접근**: read-only (`pg_catalog` · `information_schema` · COUNT) 만 · 운영 write 0

## 1. 문제

`permissions` · `role_permissions` · `linked_accounts` · `settings` · `account_activities` 는 런타임(Role eager JOIN · account-linking · auth-login · settingsService · 로그인 활동 기록) 이 실제로 소비하지만 **어느 migration 도 만들지 않았다**. 운영에는 존재하므로 정상 동작하지만, 새 DB · 재해복구 환경에서는 migration 만으로 동일 schema 를 재현할 수 없었다. 은퇴한 Core lifecycle installer 의 snake_case DDL 은 운영(camelCase) 을 만든 적이 없다.

단순 `CREATE TABLE IF NOT EXISTS` 는 이름만 같고 구조가 다른 운영 테이블에서도 성공해 버리므로 채택하지 않는다.

## 2. 구현 — `20270413000000-BaselineRbacAndAccountTables.ts`

| 분기 | 동작 |
|---|---|
| 테이블 부재 | canonical spec 에서 DDL 생성 → 생성 직후 동일 assertion 으로 자가 검증 |
| 테이블 존재 + 구조 일치 | **no-op** (운영 기대 경로) |
| 테이블 존재 + 구조 불일치 | `throw` → migration job 실패 → deploy 중지 · **자동 ALTER 없음** · 트랜잭션 rollback |
| 데이터 | INSERT / UPDATE / DELETE 0 · seed 0 · 역할 · permission 부여 0 |

판정 기준 (사용자 확정 2026-09-14): column(이름 · `format_type` · NOT NULL · default) 불일치 · 누락 · 초과 → 실패 / PK · UNIQUE · FK(`pg_get_constraintdef` 전체, ON DELETE 포함) 누락 · 불일치 · 초과 → 실패 / canonical index 누락 · 정의 불일치 → 실패 / **운영에만 있는 추가 index → 허용 + 로그**.

전제 확인: `uuid-ossp` extension 존재 (없으면 실패 · 생성하지 않음) · `role_permissions` 생성 전 `roles` · `permissions` 존재 (없으면 "roles has no creation migration: report" 로 명확히 실패).

금지 준수: wildcard 0 · DROP 0 · ALTER 0 · synchronize 0 · lifecycle installer 호출 0 · seed 0 · `IF NOT EXISTS` 0 · catch-and-continue 0 · `user_roles` · `organization_units` · `organization_roles` 생성 0. 파일 내 `CASCADE` 는 운영 실측 FK 의 `ON DELETE CASCADE` (role_permissions → roles/permissions) 뿐이며 spec 이 이를 고정한다.

**down()**: no-op (irreversible 명시). 활성 인증 · 설정 · 활동 테이블을 되돌리기에서 DROP 하지 않는다 — 저장소 선례 `20270412000000-DropRetiredCmsCptResidueTables` 와 동일 정책.

## 3. Canonical schema 결정 · 테이블별 조사

canonical = **2026-09-14 운영 `pg_catalog` 실측 구조 전체** (67 fingerprint 행). 근거: (a) 런타임이 실제로 동작해 온 유일한 구조이며 entity 는 그 부분집합으로 매핑된다, (b) entity 기준 canonical 은 운영 ALTER 를 요구해 본 WO 금지 사항과 충돌한다, (c) 은퇴 installer DDL 은 운영과 무관하다(컬럼 명명 체계 자체가 다름), (d) 운영에만 있는 잉여 컬럼을 canonical 에서 빼면 fresh DB 와 운영이 영구히 갈라져 이후 migration 이 분기한다. 잉여 · drift 는 아래에 기록하고 **보정하지 않는다** (별도 WO).

| 테이블 | 운영 행 | Entity | Runtime 소비 | 기존 생성 migration | 운영 구조 요약 (= canonical) | entity ↔ 운영 차이 (기록만) | 처리 |
|---|---:|---|---|---|---|---|---|
| `permissions` | 0 | `modules/auth/entities/Permission.ts` | `Role.permissions` eager ManyToMany → Role 조회마다 JOIN · repository write 0 | 없음 | 11 col (`id` uuid PK · `name` varchar(100) **NOT NULL UNIQUE** · `key` varchar(100) NULL · `category` · `isActive` NULL default true · `createdAt` NOT NULL · `updatedAt` NULL 등) · `PK_permissions` · `UQ_permissions_name` | entity 는 `key` NOT NULL UNIQUE + idx(category · isActive) 선언, 운영엔 unique(name) 만 · 운영 `name/displayName/resource/action` 은 entity 에 없음 → **entity 로 INSERT 시 `name` NOT NULL 위반** (harness F5x 실측 · 런타임 INSERT 경로 없음) | 생성 소유 확정 · seed 0 |
| `role_permissions` | 0 | `Role.ts` `@JoinTable` (`role_id` · `permission_id`) | Role eager JOIN | 없음 | PK(`role_id`,`permission_id`) · FK→roles(id) ON DELETE CASCADE · FK→permissions(id) ON DELETE CASCADE · idx role_id · idx permission_id | 일치 | 생성 소유 확정 · 기존 역할 permission 부여 0 |
| `linked_accounts` | 0 | `entities/LinkedAccount.ts` | account-linking · auth-login · auth-account-inquiry · socialAuthService | 없음 | 18 col (`userId` **uuid** NOT NULL · `provider` varchar(50) · `providerId` · `email` NULL · `accessToken/refreshToken/expiresAt/profile` · `createdAt` NOT NULL 등) · PK · idx(provider,providerId) · idx(userId) · **users FK 없음** | entity `userId` varchar / `provider` enum / `email` NOT NULL / `@Unique(userId,provider,providerId)` / idx(email) / `ManyToOne User CASCADE` — 운영엔 unique · email idx · FK 없음 · 잉여 5 col(`accessToken` · `refreshToken` · `expiresAt` · `profile` · `createdAt`) | 생성 소유 확정 · 계정 병합 0 |
| `settings` | 4 | `entities/Settings.ts` | settingsService · passportDynamic · encryption-key-rotation · contact-settings | 없음 | 6 col · PK(`key`) | **완전 일치** | 생성 소유 확정 · 4행 불변 · platform-core 삭제 seed 복원 0 |
| `account_activities` | 8,950 | `entities/AccountActivity.ts` | auth-login · auth-guest · auth-service-user · account-linking | 없음 | 10 col (`action` varchar(**100**) NOT NULL · `details` **jsonb** · `success` NOT NULL default true · `type` varchar(50) NULL 잉여) · PK · idx(email) · idx(userId) · **users FK 없음** | entity `action` length 50 / `details` json / idx(userId,createdAt) / `ManyToOne User CASCADE` — 운영엔 idx(email) · idx(userId) · 잉여 `type` | 생성 소유 확정 · 8,950행 불변 · 대용량 index = 운영 2종 유지 |
| `roles` (대상 밖) | 41 | `Role.ts` | RBAC 핵심 | **없음** (`ExtendRolesTable20260318100000` ALTER 만 · 원 생성 = synchronize 산물, camel/snake 중복 컬럼 18개) | — | — | **STOP · 별도 보고** (WO §5 roles 규정) — 이번 WO 에 끼워 넣지 않음. harness 에서는 FK 대상으로 운영 구조 fixture 만 사용 |

추가 확인: trigger 0 · RLS/policy 0 · enum 0 · sequence 0 · inbound FK = role_permissions → permissions/roles 2건뿐 · 다른 테이블에서 5 테이블로의 FK 0.

## 4. 격리 PostgreSQL 검증 (harness)

환경: 로컬 PostgreSQL **17.9** 임시 cluster (scratchpad · `127.0.0.1:15999` · 운영 데이터 복사 0 · 합성 row 만). 운영은 PostgreSQL 15.18 — `format_type` · `pg_get_constraintdef` · `pg_indexes.indexdef` 출력은 두 버전에서 동일함을 운영 fingerprint(15) ↔ fresh 생성 fingerprint(17) 67행 완전 일치로 확인. harness 는 `apps/api-server` 안에서 `tsx` 로 실행(untracked · 커밋 안 함 · 실행 후 삭제).

| # | 시나리오 | 결과 |
|---|---|---|
| F1 | 5 테이블 부재 + `roles` fixture → migration 실행 | PASS · 5 created |
| F2 | 대상 5 테이블 생성 확인 | PASS |
| F3 | **fresh 생성 fingerprint == 운영 실측 fingerprint** (column · constraint · index 67행) | **PASS · 67 lines identical** |
| F4 | 전체 entity(240 metadata) DataSource 초기화 (synchronize 없음) | PASS |
| F5 | repository query: `Role.find()`(eager permissions JOIN) · `Permission.find()` · `Settings.save` · `AccountActivity.save` · `LinkedAccount.save/find` | PASS |
| F5x | (기록) `Permission` entity 로 INSERT | `null value in column "name" … not-null` — entity drift 실측 (런타임 INSERT 경로 없음 · 본 WO 보정 대상 아님) |
| F6a/b | history 기록 1건 · 재실행 pending 0 | PASS |
| F6c | `up()` 직접 재호출 → 5 테이블 모두 no-op | PASS |
| F6d | 재실행 후 fingerprint 불변 | PASS |
| F7 | `user_roles` · `organization_units` · `organization_roles` 미생성 | PASS |
| E0 | spec 과 독립적으로 손으로 옮긴 운영 구조 fixture DDL == spec 생성 결과 | PASS |
| E1 | 운영 구조 fixture + 합성 row → **no-op 5/5** | PASS |
| E6 | row count 불변 (2,2,1,2,2,2) | PASS |
| E7 | fingerprint 불변 | PASS |
| D2 | 컬럼 누락 (`settings.description` DROP) | PASS · 실패 `column "description" missing` |
| D3 | 타입 불일치 (`account_activities.action` varchar(50)) | PASS · 실패 |
| D4 | FK 불일치 (ON DELETE CASCADE 제거) | PASS · 실패 |
| D5a | canonical index 누락 | PASS · 실패 |
| D5b | canonical index 정의 불일치 | PASS · 실패 |
| D5c | 운영에만 있는 추가 index | PASS · **no-op + 로그** `extra non-canonical indexes kept: IDX_extra_ops_only` |
| D6 | 예상 밖 컬럼 (`permissions.appId` 추가) | PASS · 실패 `unexpected column "appId"` |
| D7 | nullability 불일치 | PASS · 실패 |
| D8 | default 불일치 | PASS · 실패 |
| D9 | UNIQUE 제약 누락 | PASS · 실패 |
| D* 공통 | 실패 시 `typeorm_migrations` 미기록 · fingerprint · row 불변 (rollback) | PASS |
| R1 | `roles` 부재 fresh DB | PASS · 명확한 실패 + rollback (테이블 0) |

**FAILS = 0 / 27 항목.**

## 5. 저장소 검증

| 항목 | 결과 |
|---|---|
| 신규 계약 spec `__tests__/rbac-account-baseline-snapshot-migration-ownership-closure.spec.ts` | PASS 12 tests (단일 생성 소유자 · 금지 사항 · CASCADE=FK only · catch 0 · 은퇴 테이블 0 · down no-op · canonical ⊇ entity 매핑 · JoinTable 일치 · 존재 시 assertion 경로) |
| Core lifecycle 계약 8 suites (`rbac-*` 2 · `auth/organization/platform/lms-core-dead` · `cms-lifecycle` · `app-management`) | PASS 8 suites / 183 tests |
| `apps/api-server` `tsc -p tsconfig.build.json --noEmit` | PASS (exit 0) |
| eslint (신규 2 파일) | PASS |
| `scripts/check-forbidden-tables.mjs` | 기존 위반(`o4o_payments` 등 · 본 WO 무관) 만 — 신규 위반 0 |

## 6. 운영 적용 전 기록 (read-only · 2026-09-14)

| 항목 | 값 |
|---|---|
| 대상 5 테이블 존재 | 5/5 |
| row count | permissions 0 · role_permissions 0 · linked_accounts 0 · settings 4 · account_activities 8,950 |
| 불변 대조군 | roles 41 · role_assignments 73 · users 58 |
| schema fingerprint | 67 행 · md5 `c2df13a2cd0912d66fe8042ddeb2fe75` |
| `typeorm_migrations` | 676 건 |
| 예상 효과 | **no-op** (fresh 생성 fingerprint == 운영 fingerprint · 같은 assertion 로직) |

## 7. 운영 적용 후 검증 (read-only · 2026-09-14)

적용 경로: commit `5499a2864` → `Deploy API Server (Cloud Run)` run `#34807284797` SUCCESS → Cloud Run job `o4o-api-migrations` execution `th247` (04:52:36Z). 수동 실행 0.

| 항목 | 결과 |
|---|---|
| migration job 로그 | `[BaselineRbacAndAccountTables] permissions / role_permissions / linked_accounts / settings / account_activities: exists · structure matches canonical · no-op` ×5 → `Migrations executed: 1` · `Migration Job - SUCCESS` |
| `typeorm_migrations` | 676 → **677** (id 678 `BaselineRbacAndAccountTables20270413000000` · 직전 677 `DropRetiredCmsCptResidueTables20270412000000`) |
| row count | permissions 0 · role_permissions 0 · linked_accounts 0 · settings 4 · account_activities **8,950** (적용 직후 · 불변) |
| 불변 대조군 | roles 41 · role_assignments 73 · users 58 — **불변** |
| schema fingerprint | 67 행 · md5 `c2df13a2cd0912d66fe8042ddeb2fe75` — **적용 전과 동일** (diff 0) |
| `/health/ready` | 200 `ready` |
| 로그인 (`POST /api/v1/auth/login` · kpa-society 테스트 계정) | 200 · `accessToken` · `refreshToken` 쿠키 발급 |
| `GET /api/v1/auth/me` | 200 · email 일치 |
| `POST /api/v1/auth/refresh` | 200 `Token refreshed successfully` · 이후 `/me` 200 |
| account_activities 기록 | smoke 로그인 2회 → `login_email` success 2건 기록 (8,950 → 8,952 · 증가분 = smoke 로그인만) |
| settings | 4 key (`email` · `general` · `reading` · `theme`) 불변 · 로그인 경로(passportDynamic) 가 정상 읽음 |
| CodeQL (`5499a2864`) | SUCCESS |
| CI Pipeline (`5499a2864`) | **FAILURE 1건** — `cms-retired-physical-table-final-drop.spec.ts` 의 "마지막 migration 파일 == 20270412" 시간 고정 assertion (어떤 신규 migration 이라도 실패시키는 stale 계약) → 의도 보존형(파일 존재 + 직전 파일 고정) 으로 완화 커밋 `771d1008c` (테스트만 수정 · 다른 세션 커밋 `5d6e3bf03` · `ac16737e2` 의 CI 도 같은 사유로 실패 중이었음) |
| CI Pipeline · CodeQL · Deploy API (`771d1008c`) | §7-1 |

### 7-1. `771d1008c` 결과

| workflow | 결과 |
|---|---|
| Deploy API Server (Cloud Run) `#34809849778` | SUCCESS (migration job: pending 0 · 재실행 no-op) |
| CodeQL `#34809849731` | SUCCESS |
| CI Pipeline `#34809849721` | FAILURE — `cms-retired-physical-table-final-drop.spec` 은 **해소(PASS)**. 남은 실패 1건 = `work-agent.spec.ts` "Work Agent 코드는 automation_jobs · 큐 · 스케줄러 · DB 에 닿지 않는다" — 다른 세션 커밋 `5d6e3bf03`(local-agent 복구 계층) 의 run `#34808176447` 에서 이미 실패하던 항목이며 본 WO 파일(migration · 2 spec · CHECK) 과 무관. 범위 밖이므로 수정하지 않고 보고 (별도 세션 소관) |

## 8. 완료 조건

```
BASELINE_TABLE_TARGETS                  = 5
BASELINE_TABLE_CREATION_OWNER           = DEPLOY_MIGRATION_JOB (20270413000000-BaselineRbacAndAccountTables)
FRESH_DATABASE_REPRODUCIBILITY          = PASS (fingerprint == 운영 67/67)
EXISTING_SCHEMA_ASSERTION               = PASS (drift 9종 실패 · 추가 index 허용)
EXISTING_SCHEMA_DRIFT_SILENT_ACCEPTANCE = ZERO
PRODUCTION_MIGRATION_EFFECT             = NO_OP (5/5 exists · structure matches canonical · history +1)
PRODUCTION_ROW_COUNT_CHANGE             = ZERO (smoke 로그인에 의한 account_activities +2 는 정상 런타임 기록)
PRODUCTION_ROLE_CHANGE                  = ZERO (코드상 write 0)
PRODUCTION_PERMISSION_ASSIGNMENT_CHANGE = ZERO
PRODUCTION_AUTHORIZATION_CHANGE         = ZERO
RETIRED_USER_ROLES_RECREATION           = ZERO
CORE_LIFECYCLE_SCHEMA_RUNTIME           = ZERO
LOGIN_AND_TOKEN_REGRESSION              = PASS (login 200 · me 200 · refresh 200)
SETTINGS_REGRESSION                     = PASS (4 key 불변 · 로그인 경로 읽기 정상)
ACCOUNT_ACTIVITY_REGRESSION             = PASS (login_email 기록 정상)
CODEQL                                  = SUCCESS
DEPLOY_API                              = SUCCESS (#34807284797 · migration job th247)
CI_PIPELINE                             = FAILURE_OUT_OF_SCOPE (본 WO 유발 실패 0 · 잔여 1건 = 다른 세션 work-agent.spec · §7-1)
RBAC_AND_ACCOUNT_BASELINE_MIGRATION_OWNERSHIP = CLOSED
```

## 9. 잔여 · 별도 WO 제안

1. **`roles` 생성 migration 부재** (WO §5 STOP 규정) — 41행 · camel/snake 중복 컬럼 18개 · synchronize 산물. 같은 방식(실측 canonical + assertion) 의 별도 WO 필요. 본 baseline 은 fresh DB 에서 `roles` 가 먼저 있어야 `role_permissions` 를 만들 수 있으므로, 완전한 fresh 재현은 이 WO 까지 닫혀야 성립한다.
2. **entity ↔ 운영 drift 정비** — `Permission`(name NOT NULL 미매핑 · key unique 부재) · `LinkedAccount`(userId 타입 · unique · users FK 부재 · 잉여 5 col) · `AccountActivity`(action 길이 · details 타입 · 잉여 `type`) . 운영 ALTER 또는 entity 정정이 필요하므로 F9 · Core Freeze 절차의 별도 WO.
3. platform-core manifest `exposes` / `backend` metadata 정비 (`WO-O4O-PLATFORM-CORE-MANIFEST-EXPOSES-AND-BACKEND-METADATA-TRUTHFULNESS-CLOSURE-V1`, 우선순위 낮음).

4. (범위 밖 · 보고) `work-agent.spec.ts` CI 실패 — 다른 세션 `5d6e3bf03` 소관.

**문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (roles 생성 migration · entity↔운영 drift 정비)**
