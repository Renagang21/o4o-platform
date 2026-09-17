# IR-ROLE-DB-REALITY-V1

> **목적**: WO-ROLE-PHILOSOPHY-PHASE5B-STEP1-DB-AUDIT-V1 산출물
> **기준일**: 2026-02-27
> **작성**: Phase 5B Step 1 — Migration Chain 분석 기반 DB 현황 추론
> **상태**: READ-ONLY AUDIT (DB 수정 없음)
> **제약**: 로컬 psql 차단 (방화벽). 아래 SQL은 Cloud Console SQL Editor에서 수동 실행.

---

## 0. 핵심 요약

| 항목 | 결론 |
|------|------|
| BackfillRoleAssignments 마이그레이션 | 커밋 여부 확인 필요 (plan에서 UNTRACKED로 표시됨) |
| DropLegacyRbacColumns 마이그레이션 | 배포 전 (users.role/roles 컬럼 여전히 존재 가능) |
| role_assignments 테이블 | 2026-02-24 생성됨 (CreateRoleAssignmentsTable migration) |
| 이상 값 예상 건수 | `administrator`, `superadmin`, `staff` → 0 예상 (migration에서 할당 없음) |
| 백필 갭 위험 | `business` 역할 사용자가 role_assignments에 없을 수 있음 |

---

## 1. Migration Chain 분석 (실행 순서)

마이그레이션 타임스탬프 기준 실행 순서:

```
20260205033223  RolePrefixMigrationFoundation       (기반 준비)
20260205040103  KpaRolePrefixMigration               users.roles += kpa:*, platform:super_admin
20260205060000  NetureRolePrefixMigration            users.roles += neture:admin, neture:operator
20260222200000  RemoveKpaCRolesFromUsers             users.roles -= kpa-c:*
20260224100000  CreateRoleAssignmentsTable           role_assignments 테이블 CREATE
20260228000000  BackfillRoleAssignmentsFromLegacyRole [COMMIT 여부 확인 필요]
20260228000001  DropLegacyRbacColumns                [COMMIT 여부 확인 필요, 미배포]
```

**결론**: BackfillRoleAssignments 이전 시점에 Phase3-E runtime이 role_assignments 직접 쿼리로 전환됨.
따라서 **신규 로그인 발생 시** role_assignments에 자동으로 레코드가 삽입됨.
**로그인하지 않은 기존 사용자**는 백필 마이그레이션 전까지 role_assignments에 레코드 없음.

---

## 2. role 분포 표 (예상)

### 2-1. Backfill Migration 처리 대상 값

BackfillRoleAssignmentsFromLegacyRole 기준:
```sql
users.role IN ('admin','super_admin','operator','vendor','seller','supplier','partner','manager')
```
→ 이 8개 값이 `role_assignments.role`에 삽입됨 (backfill 마이그레이션이 실행된 경우)

| role | 출처 | 예상 존재 여부 |
|------|------|---------------|
| `admin` | users.role backfill | ✅ 있음 |
| `super_admin` | users.role backfill | ✅ 있음 (소수) |
| `operator` | users.role backfill | ✅ 있음 (소수) |
| `vendor` | users.role backfill | ✅ 있음 |
| `seller` | users.role backfill | ✅ 있음 |
| `supplier` | users.role backfill | ✅ 있음 |
| `partner` | users.role backfill | ✅ 있음 |
| `manager` | users.role backfill | ✅ 있음 |

### 2-2. Prefix Migration 처리 대상 값 (users.roles 배열 → role_assignments)

Backfill이 users.roles 배열도 backfill하므로, prefix migration으로 추가된 값들도 포함:

| role | 출처 Migration | 조건 | 예상 존재 여부 |
|------|---------------|------|---------------|
| `kpa:district_admin` | KpaRolePrefixMigration | users에 district_admin | ✅ 있음 |
| `kpa:branch_admin` | KpaRolePrefixMigration | users에 branch_admin | ✅ 있음 |
| `kpa:branch_operator` | KpaRolePrefixMigration | users에 branch_operator | ✅ 있음 |
| `kpa:pharmacist` | KpaRolePrefixMigration | users에 pharmacist | ✅ 있음 |
| `kpa:admin` | KpaRolePrefixMigration | service_key='kpa' AND admin | ✅ 있음 (소수) |
| `kpa:operator` | KpaRolePrefixMigration | service_key='kpa' AND operator | ✅ 있음 (소수) |
| `platform:super_admin` | KpaRolePrefixMigration | 모든 super_admin 사용자 | ✅ 있음 (소수) |
| `neture:admin` | NetureRolePrefixMigration | service_key='neture' AND admin | ✅ 있음 (소수) |
| `neture:operator` | NetureRolePrefixMigration | service_key='neture' AND operator | ✅ 있음 (소수) |
| `glucoseview:admin` | Phase4MultiServiceMigration | glucoseview_pharmacies 활성+admin | 조건부 ✅ |
| `glucoseview:operator` | Phase4MultiServiceMigration | glucoseview_pharmacies 활성+operator | 조건부 ✅ |
| `platform:admin` | Phase4MultiServiceMigration | admin+no service_key (cross-service) | ✅ 있음 |

### 2-3. Backfill 제외 값 (설계적 갭)

| role | 제외 이유 | 위험도 |
|------|----------|--------|
| `user` | BackfillRoleAssignments에서 명시 제외 | ⚠️ 중 — 일반 사용자 RA 없음 가능 |
| `customer` | BackfillRoleAssignments에서 명시 제외 | ⚠️ 중 — 동일 |
| `business` | 백필 대상 목록에 없음 (설계 누락 가능) | ⚠️ 고 — business 역할 사용자 접근 불가 |
| `affiliate` | users_role_enum에 없음, 수동 할당 가능 | 🔍 확인 필요 |

---

## 3. 이상 값 목록 (단 한 번도 migration에서 할당된 적 없는 값)

아래 값들은 **어떤 migration에서도 role_assignments에 삽입하지 않음**.
실제 DB에 이 값들이 존재한다면 수동 할당 또는 버그로 인한 것.

| role | 발견 위치 (코드) | 예상 DB 건수 | 분류 |
|------|----------------|-------------|------|
| `administrator` | Phase4 이전 legacyRoles 배열 (**이미 제거됨**) | **0** | 삭제 가능 |
| `superadmin` | sites.routes.ts 오타 (Phase4 이후 **이미 제거됨**) | **0** | 삭제 가능 |
| `staff` | operator-notification.routes.ts requireRole guard | **0** 또는 소수 | ⚠️ 확인 필요 |
| `moderator` | admin/users.routes.ts 할당 가능 목록 | **0** 또는 소수 | ⚠️ 확인 필요 |
| `vendor_manager` | admin/users.routes.ts 할당 가능 목록 (**이미 제거됨**) | **0** 또는 소수 | 삭제 가능 |
| `beta_user` | admin/users.routes.ts 할당 가능 목록 (**이미 제거됨**) | **0** | 삭제 가능 |
| `kpa-c:operator` | RemoveKpaCRolesFromUsers migration으로 users.roles에서 삭제됨 | **0** | 안전 |
| `kpa-c:branch_admin` | 동일 | **0** | 안전 |
| `kpa-c:branch_operator` | 동일 | **0** | 안전 |
| `platform:operator` | ROLE_REGISTRY 정의만 있음, migration 할당 없음 | **0** | 확인 필요 |
| `cosmetics:admin` | Phase4 migration 언급되나 실제 할당 조건 없음 | **0** 추정 | 확인 필요 |
| `cosmetics:operator` | 동일 | **0** 추정 | 확인 필요 |

> **참고**: `administrator`, `superadmin`, `vendor_manager`, `beta_user`는 Phase 4/5A에서 코드 참조가 이미 제거됨.
> DB에 레코드가 있더라도 runtime이 이 값들을 처리하는 코드가 없으므로 사실상 dead data.

---

## 4. 표준 철학과 불일치 항목

| 불일치 | 현상 | 철학적 목표 | 현재 상태 |
|--------|------|------------|----------|
| **unprefixed vs prefixed 이중 저장** | `admin`과 `platform:admin`이 동일 사용자에게 공존 | prefixed만 남김 | ⚠️ 이중 저장 중 |
| **`operator`의 이중 의미** | Platform operator (role_assignments) vs KPA org operator (organization_members.role) | Layer A/B 분리 | ✅ 분리됨 (다른 테이블) |
| **`manager`의 모호성** | requireAdmin에 없음, 단독 guard에서만 사용 | 명확한 계층 정의 | ⚠️ 미결 |
| **`business` backfill 누락** | BackfillRoleAssignments 대상 아님 | 모든 활성 역할 RA에 존재 | 🔴 갭 위험 |
| **`staff` guard 참조** | operator-notification.routes.ts에 `staff` requireRole | 표준 역할 목록에 없음 | ⚠️ 미결 |
| **scope_type 단일화** | 모든 backfilled 레코드 scope_type='global' | 서비스별 scope 구분 | 🔵 미래 작업 |

---

## 5. 실제 제거 가능 항목

DB에서 발견 시 안전하게 비활성화(is_active=false) 또는 삭제 가능한 항목:

| role 값 | 제거 조건 | 제거 방법 |
|---------|---------|---------|
| `administrator` | 건수 확인 후 0이면 확인 완료 | 수동 DELETE 필요시 |
| `superadmin` | 건수 확인 후 0이면 확인 완료 | 수동 DELETE 필요시 |
| `kpa-c:*` | 건수 확인 후 0이면 확인 완료 | 이미 users.roles에서 제거됨 |
| `vendor_manager` | 건수 확인 후 → is_active=false | 마이그레이션 불필요, 수동 처리 |
| `beta_user` | 건수 확인 후 → is_active=false | 마이그레이션 불필요, 수동 처리 |

---

## 6. 보류 필요 항목 (섣불리 건드리면 안 되는 항목)

| role 값 | 보류 이유 | 조치 시점 |
|---------|---------|---------|
| `manager` | requireAnyRole guard에서 사용 중 (admin/users.routes.ts) | Phase 5B Step 2 설계 후 |
| `moderator` | assignable 목록에 있었음, 실제 사용자 있을 수 있음 | 건수 확인 후 결정 |
| `staff` | operator-notification.routes.ts guard 참조 중 | guard 수정 전 제거 불가 |
| `business` | backfill 누락으로 RA에 없을 수 있음 → 제거 시 접근 불가 위험 | BackfillRoleAssignments 재검토 필요 |
| `user`, `customer` | 대부분의 일반 사용자 해당 | Phase3-E 이후 로그인 시 자동 생성 |
| `affiliate` | content-assets.routes.ts guard 참조 중 | guard 수정 없이 건드리면 안 됨 |

---

## 7. 실제 DB 확인을 위한 SQL (Cloud Console SQL Editor에서 실행)

### 7-1. 핵심: 전체 role 분포

```sql
-- ① 전체 role 분포 (active 포함)
SELECT
  role,
  COUNT(*)::int AS total,
  SUM(CASE WHEN is_active THEN 1 ELSE 0 END)::int AS active,
  SUM(CASE WHEN NOT is_active THEN 1 ELSE 0 END)::int AS inactive
FROM role_assignments
GROUP BY role
ORDER BY active DESC;
```

### 7-2. 이상 값 존재 여부 확인

```sql
-- ② 이상 값 (migration에서 할당 없었던 값)
SELECT role, COUNT(*)::int AS cnt
FROM role_assignments
WHERE role IN (
  'administrator', 'superadmin', 'staff', 'moderator',
  'vendor_manager', 'beta_user',
  'kpa-c:operator', 'kpa-c:branch_admin', 'kpa-c:branch_operator',
  'platform:operator', 'cosmetics:admin', 'cosmetics:operator'
)
GROUP BY role
ORDER BY role;
-- 기대: 모두 0건
```

### 7-3. backfill 갭 분석 — business/user/customer

```sql
-- ③ backfill 제외 역할값 사용자 현황
SELECT role, COUNT(*)::int AS cnt
FROM role_assignments
WHERE role IN ('business', 'user', 'customer', 'affiliate')
GROUP BY role;

-- ④ 'business' users.role인데 RA에 없는 사용자 수
--    (DropLegacyRbacColumns 아직 실행 안 됐을 때만 유효)
SELECT COUNT(*)::int AS business_users_without_ra
FROM users u
WHERE u.role = 'business'
  AND u."isActive" = true
  AND NOT EXISTS (
    SELECT 1 FROM role_assignments ra
    WHERE ra.user_id = u.id
      AND ra.role = 'business'
      AND ra.is_active = true
  );
```

### 7-4. BackfillRoleAssignments 실행 여부 확인

```sql
-- ⑤ users.role 컬럼 존재 여부 (존재하면 DropLegacy 미실행)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN ('role', 'roles');
-- 결과:
--   role 있음 + roles 있음 → Backfill 실행, Drop 미실행
--   role 없음 + roles 없음 → Drop까지 완료
--   role 있음 + roles 없음 → 비정상 상태
```

### 7-5. scope_type 분포

```sql
-- ⑥ scope_type 분포 (global vs organization)
SELECT
  scope_type,
  (scope_id IS NULL) AS scope_id_null,
  COUNT(*)::int AS cnt
FROM role_assignments
GROUP BY scope_type, (scope_id IS NULL)
ORDER BY cnt DESC;
-- 기대: 대부분 scope_type='global', scope_id=NULL
```

### 7-6. RA 미존재 사용자 현황 (백필 갭 확인)

```sql
-- ⑦ 활성 사용자 중 RA 레코드 없는 사용자 샘플
SELECT u.id, u.email,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='role')
       THEN 'check users.role directly' ELSE 'role col dropped' END AS note
FROM users u
WHERE u."isActive" = true
  AND NOT EXISTS (
    SELECT 1 FROM role_assignments ra
    WHERE ra.user_id = u.id
      AND ra.is_active = true
  )
LIMIT 20;
-- 결과가 많으면 backfill 마이그레이션 재검토 필요
```

### 7-7. prefixed vs unprefixed 이중화 현황

```sql
-- ⑧ admin + platform:admin 이중 보유 사용자 수
SELECT COUNT(DISTINCT a.user_id)::int AS double_admin_users
FROM role_assignments a
WHERE a.role = 'admin'
  AND a.is_active = true
  AND EXISTS (
    SELECT 1 FROM role_assignments b
    WHERE b.user_id = a.user_id
      AND b.role = 'platform:admin'
      AND b.is_active = true
  );

-- ⑨ 전체 prefixed role 보유 사용자 수
SELECT COUNT(DISTINCT user_id)::int AS prefixed_role_users
FROM role_assignments
WHERE role LIKE '%:%'
  AND is_active = true;
```

### 7-8. 전체 커버리지 요약

```sql
-- ⑩ 전체 요약 (사용자 커버리지)
SELECT
  (SELECT COUNT(*)::int FROM users WHERE "isActive" = true) AS total_active_users,
  (SELECT COUNT(DISTINCT user_id)::int FROM role_assignments WHERE is_active = true) AS users_with_active_ra,
  (SELECT COUNT(*)::int FROM role_assignments WHERE is_active = true) AS total_active_ra_records,
  (SELECT COUNT(DISTINCT role)::int FROM role_assignments WHERE is_active = true) AS distinct_role_values;
```

---

## 8. 다음 단계 결정 트리

SQL 실행 결과를 받은 후 Phase 5B Step 2 진행 전 판단:

```
Query ⑦ (RA 미존재 사용자) 결과가 많다 (>10)
  └── YES → BackfillRoleAssignments 마이그레이션을 배포해야 함 (Phase 1 미완료)
      NO  → Phase 2 설계 진행 가능

Query ④ (business 갭) 결과가 1 이상
  └── YES → BackfillRoleAssignments에 'business' 추가 필요 (마이그레이션 재검토)
      NO  → 갭 없음, 진행 가능

Query ② (이상 값) 결과가 1 이상
  └── YES → 해당 값별 건수 확인 후 정리 마이그레이션 작성
      NO  → 클린 상태, Phase 5B Step 3 진행 가능
```

---

## 9. 절대 건드리면 안 되는 항목

Phase 5B 작업 중 아래 항목은 **명시적 WO 없이 절대 수정 금지**:

| 항목 | 이유 |
|------|------|
| `role_assignments` 테이블 구조 | `20260224100000-CreateRoleAssignmentsTable` Freeze 대상 |
| `organization_members.role` | Layer B SSOT, Layer A와 독립 |
| `kpa_pharmacist_profiles.role` | Qualification Layer, 별도 도메인 |
| `platform:super_admin` 보유 사용자 | 최상위 권한, 수동 배정 이력 |
| `kpa:*` 역할 | KPA-C Role 분리가 완료된 Layer A 데이터 |

---

## 10. 결론

1. **`role_assignments`에 존재할 것으로 예상되는 값**: admin, super_admin, operator, vendor, seller, supplier, partner, manager, kpa:district_admin, kpa:branch_admin, kpa:branch_operator, kpa:pharmacist, kpa:admin, kpa:operator, platform:super_admin, platform:admin, neture:admin, neture:operator, glucoseview:admin/operator

2. **존재해서는 안 되는 값**: administrator, superadmin, kpa-c:*, vendor_manager, beta_user

3. **가장 큰 리스크**: `business` 역할 사용자의 RA 누락 가능성 (backfill 목록에서 누락)

4. **Phase 5B Step 2 진행 조건**: SQL ①②⑦ 실행 결과를 사용자가 제공한 후 설계 문서 작성

---

*Generated: WO-ROLE-PHILOSOPHY-PHASE5B-STEP1-DB-AUDIT-V1*
*Next: WO-ROLE-PHILOSOPHY-PHASE5B-STEP2-NORMALIZATION-DESIGN-V1 (사용자가 SQL 결과 제공 후)*
