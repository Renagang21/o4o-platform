# CHECK-O4O-LEGACY-PRODUCTION-SCHEMA-AND-LOCAL-HOUSEKEEPING-FINAL-CLOSURE-V1

- **WO**: `WO-O4O-LEGACY-PRODUCTION-SCHEMA-AND-LOCAL-HOUSEKEEPING-FINAL-CLOSURE-V1`
- **작업일**: 2026-09-04
- **기준 커밋**: `origin/main` = `edeec6799`
- **작업 브랜치**: `work/o4o-legacy-prod-schema-housekeeping-v1` (격리 worktree `C:/tmp/o4o-legacy-cleanup-v1`)
- **판정**: **CLOSED_WITH_MANUAL_FOLLOWUP** — production schema 정리는 migration 으로 확정, local branch 4건만 권한 제약으로 `MANUAL_DELETE_REQUIRED`

---

## 1. 선행 CHECK 재확인 (§2)

| 문서 | 재확인 결과 |
|---|---|
| `CHECK-O4O-FROZEN-AUTH-PERMISSIONS-DB-AND-KPA-SUPPLIER-ENDPOINT-FINAL-CLOSURE-V1` | `users.permissions` = `DROP_APPROVED_READY` — **프로덕션 재조회로 유지 확인** |
| `CHECK-O4O-LEGACY-FOLLOWUP-AUTH-NOTIFICATION-CATALOG-AND-DB-FINAL-CLOSURE-V1` | `requirePermission` 계열 제거 완료 — 잔여는 주석/테스트뿐 |
| `CHECK-O4O-LEGACY-RESIDUAL-RUNTIME-AND-DEFERRED-FINAL-CLOSURE-V1` | `store_events` 엔티티 제거 완료 — 테이블만 잔존 |

이전 CHECK 의 수치를 전제하지 않고 **프로덕션에서 전부 재조회**했다 (read-only `SELECT` 만).

---

## 2. 프로덕션 census (§4~§6, read-only)

접속: Cloud SQL Auth Proxy (`netureyoutube:asia-northeast3:o4o-platform-db`), 자격증명은
`gcloud secrets versions access` 로 런타임 취득. 저장소·로그에 credential 미기록.

### 2-1. `users.permissions` — 판정 `DROP`

```text
users 총 행           : 57
permissions IS NULL   : 0
permissions = '[]'    : 57
non-empty 값          : 0
index / constraint    : 0
view / matview        : 0
trigger / function    : 0
generated column      : NEVER
pg_depend             : 컬럼 자신의 DEFAULT 1건뿐
```

의미 있는 운영 데이터 0 → **row export 불필요**. 새 consumer·write·dependency 발견 없음 →
직전 `DROP_APPROVED_READY` 판정을 뒤집지 않음 → §7 조건 충족.

### 2-2. `store_events` — 판정 `DROP`

```text
존재 여부              : TABLE_PRESENT_UNUSED
row count             : 0
n_tup_ins / upd / del : 0 / 0 / 0  (통계 기준시각 2025-12-25 이후 write 0)
inbound FK            : 0
outbound FK           : store_events_organization_id_fkey → organizations ON DELETE CASCADE
view / matview        : 0
trigger / function    : 0
pg_depend (비내부)     : 0
index                 : 3 (PK + IDX_store_events_org + IDX_store_events_org_active)
```

엔티티·라우트·서비스 read/write 경로 0 (선행 WO 에서 엔티티 제거됨). row 0 → 백업 불필요.

### 2-3. `organization_product_applications` — 판정 `TABLE_ABSENT`

```text
to_regclass('organization_product_applications') = NULL
```

`20260226000001-DropOrganizationProductApplications` 로 이미 제거됨. **추가 조치 없음.**
재생성 방지 계약만 테스트로 고정했다.

---

## 3. rollback 근거 (§8)

| 대상 | 백업 필요 | 근거 | 복구 |
|---|---|---|---|
| `users.permissions` | 불필요 | 57행 전부 `[]` (의미 데이터 0) | migration `down()` — `ADD COLUMN permissions json NOT NULL DEFAULT '[]'` |
| `store_events` | 불필요 | row 0 · write 이력 0 | migration `down()` — `20260301200000-CreateStoreEvents` 와 동일 DDL(프로덕션 실측 컬럼과 대조) |

repo 에 credential·비밀정보 저장 0.

---

## 4. 실행 방식 (§9 · §10)

`.github/workflows/deploy-api.yml` 은 **`Deploy to Cloud Run`(L266) → `Run database migrations`(L318)**
순서다. 즉 merge 시 migration 은 **자동 production apply** 이며, 컬럼을 더 이상 참조하지 않는
신규 리비전이 먼저 서빙된 뒤 DROP 이 실행된다. 따라서 **수동 SQL DROP 을 쓰지 않고
migration 으로 실행**한다 — DB 와 repo schema history 가 lockstep 으로 남는다(§9 필수 조건).

추가 migration 2건 (파일명 = 순차 카운터 규약):

| 파일 | 내용 |
|---|---|
| `20270320000000-DropUsersPermissionsColumn.ts` | `ALTER TABLE users DROP COLUMN IF EXISTS permissions` |
| `20270321000000-DropStoreEventsTable.ts` | 인덱스 2 DROP → `DROP TABLE IF EXISTS store_events` |

**주의**: 두 DROP 의 실제 프로덕션 반영은 **PR merge 후 CI migration job 실행 시점**이다.
merge 후 §10 4~6단계(스키마 재조회 · smoke · migration history)를 반드시 재확인한다.

---

## 5. 코드 정렬 (DROP 과 같은 커밋)

컬럼 정의가 남아 있으면 DROP 직후 모든 `users` 조회가 깨진다. 같은 커밋에서 제거했다.

| 파일 | 변경 |
|---|---|
| `modules/auth/entities/User.ts` | `@Column ... permissions!: string[]` 정의 제거 (재도입 금지 주석) |
| `controllers/admin/AdminUserController.ts` | 사용자 생성 시 `permissions: []` write 제거 |
| `scripts/diagnose-admin-login.ts` | 동일 |
| `services/auth/auth-login.service.ts` | OAuth 사용자 생성 시 `permissions: []` write 제거 |
| `scripts/check-admin-permissions.ts` | `adminUser.permissions` 직접 read 로그 제거 |
| `common/middleware/auth/authorization.middleware.ts` | `DROP_APPROVED_READY` 주석 → DROP 완료로 갱신 |
| `scripts/reset/O4O-RESET-DRYRUN-V1.sql` | `store_events` 조회·TRUNCATE 주석 제거 |
| `packages/auth-client/src/rbac.{ts,d.ts,js}` | 소비처 0 인 `createPermissionGuard` 제거 |

`getAllPermissions()` 등 **파생 값**은 컬럼이 아니므로 유지한다.

---

## 6. 회귀 계약 (§11~§13)

신규: `apps/api-server/src/__tests__/legacy-production-schema-final-closure.spec.ts`
(DB·네트워크 접근 0 · 정적 계약)

- A축: DROP migration 존재 · `User.ts` 에 컬럼 선언 없음 · 런타임 컬럼 read 0
- B축: DROP migration 존재 · `StoreEvent` 엔티티 없음 · reset SQL 에 `store_events` 0
- C축: `DropOrganizationProductApplications` 1건 · `CreateOrganizationProductApplications` 1건 (신규 CREATE 추가 금지)

기존 스펙 중 **낡은 계약 3건을 반전**했다 (`컬럼이 존재한다` → `제거됐다`):
`auth-runtime-and-legacy-package-final-closure.spec.ts`,
`frozen-auth-permissions-and-kpa-supplier-final-closure.spec.ts`.

---

## 7. Branch census (§14)

작업 시작 시 local branch 38건 → 종료 시 **17건**.

| 판정 | 건수 | 처리 |
|---|---:|---|
| `MERGED` (unapplied 0 · worktree 미점유) | 20 | 삭제 완료 |
| `PATCH_EQUIVALENT` (`git cherry` unapplied 0 이나 fast-forward 아님) | 4 | **`MANUAL_DELETE_REQUIRED`** (아래) |
| `ACTIVE_WIP` (worktree 점유 — 다른 세션) | 9 | 유지 |
| `BACKUP_REQUIRED` | 1 | `backup/pre-reset-main-20260826` 유지 |
| `ACTIVE_WIP` (미적용 커밋 1건 보유) | 2 | `work/channel-retirement-admin-auth-guard-residual-v1`, `work/channels-servicekey-canonical-scope-alignment-v1` 유지 |
| 본 WO 브랜치 + `main` | 2 | 유지 |

### `MANUAL_DELETE_REQUIRED` — `git branch -D` 권한 거부

`git branch -D` 가 실행 환경 권한 정책으로 거부됐다. **강제 우회하지 않았다**(§16 규칙).
아래 4건은 `git cherry origin/main` 기준 **미적용 커밋 0** 으로 내용은 이미 main 에 있다.

```bash
git branch -D work/glycopharm-ai-admin-role-guard-v1              # 115dc1435
git branch -D work/kpa-approval-org-contact-write-alignment-v1    # 1466d7d0e
git branch -D work/o4o-block-core-orphan-v1                       # cd985f194
git branch -D work/o4o-post-legacy-editor-residue-v1              # 575cd69cc
```

삭제된 20건의 SHA 는 본 CHECK 커밋 시점의 reflog 로 복구 가능하며, 이 중 13건은 origin 에도 존재한다.

---

## 8. Worktree census (§15)

`git worktree list` 10건 — 전부 `ACTIVE` (main repo 1 + `.claude/worktrees` 1 + `C:/tmp` 8).
`git worktree prune -n` 결과 stale 등록 **0**. 제거 대상 없음.

본 WO 의 격리 worktree `C:/tmp/o4o-legacy-cleanup-v1` 은 push 완료 후 정리 대상이다.

---

## 9. 알려진 housekeeping (§16 · §17)

| 대상 | 판정 | 처리 |
|---|---|---|
| `C:\tmp\wo-main-registry` | 잔존 (빈 디렉터리) | **제거 완료** |
| `C:\tmp\o4o-signage-followup` | `ALREADY_CLEAN` | 조치 없음 |
| `backup/pre-reset-main-20260826` | `BACKUP_REQUIRED` | 유지 (§16 명시 대상 · 미적용 커밋 1건 보유) |
| signage / channel drop 후보 branch | 위 §7 참조 | signage 계열 5건 삭제 · channel 계열 2건은 미적용 커밋 보유로 유지 |
| repo `scratchpad/` | 다른 세션 미추적 파일 | **불가침 — 손대지 않음** |
| `C:\tmp` 기타 파일 | 다중 세션 공용 scratch | 본 트랙 산출물 아님 — 손대지 않음 |

---

## 10. Repo-wide 잔재 재검색 (§18)

`apps packages services scripts` 범위 (node_modules · dist · .git 제외).

| 키워드 | hit | 분류 |
|---|---:|---|
| `users.permissions` | 17 | migration 2 + `RETIREMENT_GUARD` 주석 3 + 계약 테스트 3파일 |
| `store_events` | 22 | migration 2(CREATE 이력 + DROP) + 계약 테스트 1 |
| `organization_product_applications` | 16 | migration 2 + 계약 테스트 1 |
| `PermissionGuard` / `createPermissionGuard` | 0 | **DEAD 제거 완료** |
| `requirePermission` | 6 | `RETIREMENT_GUARD` 주석 + 계약 테스트 |
| `user.dbRoles` | 4 | `RETIREMENT_GUARD` 주석 + 계약 테스트 |
| `partnerops` / `supplierops` / `sellerops` | — | `ACTIVE` / `COMPATIBILITY` (문서화된 catalog · guide 화면) |
| `NotificationType` legacy | 0 | 비테스트 hit 0 |
| consumer checkout | 0 | 없음 |
| legacy settlement | 3 | `HISTORY_ONLY` 주석 |
| `@deprecated` | — | 전부 문서화된 `COMPATIBILITY` fallback |

**DEAD = 0.** `UNKNOWN` = 0 · `UNJUDGED` = 0 · 신규 `DEFERRED` = 0.

> 참고(범위 밖 · 보고만): `packages/auth-client` 의 `createRoleGuard` 도 소비처 0 이나
> §18 키워드 목록 밖이라 손대지 않았다. 별도 판단 대상.

---

## 11. 문서/테스트 정리 (§19)

`apps/admin-dashboard/src/tests/admin-operation-boundary.test.ts` 의 `KNOWN` 허용목록 10건 중
**9건이 삭제된 파일을 가리키는 stale** 이라 가드가 약화돼 있었다. 실존 1건만 남기고,
`알려진 목록에 사라진 파일이 남아 있지 않다` 케이스를 추가해 재발을 막았다.

과거 CHECK / WO / history 문서는 **유지**했다 (CLAUDE.md §16-1: 기록물은 정비 대상 아님).

---

## 12. 검증 결과 (§20~§22)

| 항목 | 결과 |
|---|---|
| `apps/api-server` `pnpm type-check` | **PASS** (초기 실패 3건 → `permissions: []` write 3곳 제거로 해소) |
| `apps/api-server` `pnpm build` | **PASS** |
| `apps/api-server` 전체 Jest | **PASS** — 224 suites / 3,772 tests |
| 변경 계약 스펙 재실행 | **PASS** — 4 suites / 41 tests |
| `scripts/check-unsafe-routes.mjs` | **PASS** — 1,157 파일 · 위반 0 |
| `scripts/check-typeorm-entities.mjs` | **PASS** — DEFINED_BUT_UNREGISTERED 0 / 중복 0 / stale 0 |
| `scripts/lint-ratchet.mjs` | **PASS** — ESLint 오류 59 → **55** (baseline 55 로 하향) |
| `packages/auth-client` type-check + build | **PASS** |
| `apps/admin-dashboard` type-check | **PASS** |
| `apps/admin-dashboard` boundary 테스트 (Vitest) | **PASS** — 4 tests |
| production read-only smoke | `/health` 200 · `/health/database` 200 · `/api/v1/auth/status` 200 |

금전 write **0** · POS 개발 **0** · 프로덕션 데이터 변경 SQL **0** (DROP 은 merge 후 CI migration).

---

## 13. 중지 조건 점검 (§24)

| 조건 | 발생 |
|---|---|
| meaningful production data 발견 | 없음 (57행 전부 `[]` · `store_events` 0행) |
| active row / write / consumer 발견 | 없음 |
| FK · view · trigger 의존 발견 | 없음 (`store_events` 의 outbound FK 는 자기 자신 제거로 소멸) |
| backup · rollback 확보 불가 | 해당 없음 (DDL rollback 확보) |
| DB credential 안전 사용 불가 | 해당 없음 |
| 다른 세션이 동일 migration · schema 파일 수정 중 | 없음 (`work/o4o-tracked-artifact-cleanup-v1` 은 `packages/auth-client` 미접촉 확인) |

**중지 조건 미발동.**

---

## 14. 남은 후속 (merge 후 필수)

1. PR merge → CI `Run database migrations` job 성공 확인
2. 프로덕션 재조회: `users` 에 `permissions` 컬럼 부재 · `to_regclass('store_events')` = NULL
3. `typeorm_migrations` 에 `DropUsersPermissionsColumn20270320000000` ·
   `DropStoreEventsTable20270321000000` 기록 확인
4. 로그인 / service membership / operator·admin auth / KPA / GlycoPharm / K-Cosmetics /
   Neture / PharmacyHub / signage auth / B2B buyer·order read smoke
5. §7 의 `MANUAL_DELETE_REQUIRED` branch 4건 수동 삭제

---

## 15. 문서 정합

발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건

- 발견: `authorization.middleware.ts` 의 `DROP_APPROVED_READY` 주석이 본 WO 로 낡음 → 같은 커밋에서 갱신 (인라인 허용 범위: 본 WO 대상 파일)
