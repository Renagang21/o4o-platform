# PLAN-ROLE-DB-NORMALIZATION-V1

> **Work Order**: WO-ROLE-PHILOSOPHY-STEPWISE-V1 Phase 2 → Phase 5 실행 기반
> **기준일**: 2026-02-27
> **상태**: PLAN (코드/DB 변경 없음)
> **의존**: ROLE-PHILOSOPHY-V1.md (§2, §4)

---

## 0. 요약

| 항목 | 값 |
|------|-----|
| DB 변경 대상 | `role_assignments.role` 값 정규화 |
| 예상 마이그레이션 수 | **2개** (검증 마이그레이션 + 정규화 마이그레이션) |
| 예상 리스크 | **높음** (프로덕션 DB 직접 변경) |
| 적용 방법 | CI/CD 자동 (main 배포 시) |
| 롤백 방법 | 역방향 마이그레이션 (revert SQL) |

---

## 1. role_assignments.role 실제 분포 추정

### 1-1. BackfillMigration이 처리한 값 (2026-02-28 배포 예정)

`20260228000000-BackfillRoleAssignmentsFromLegacyRole.ts` 기준:

```sql
-- users.role에서 backfill된 값 (예상)
INSERT INTO role_assignments (user_id, role, ...)
SELECT id, role, ...
FROM users
WHERE role IN ('admin','super_admin','operator','vendor','seller','supplier','partner','manager')
  AND role IS NOT NULL;
```

예상 분포:
```
super_admin   : 1~5명   (플랫폼 최고 관리자)
admin         : 5~20명  (플랫폼 관리자)
operator      : 5~50명  (서비스 운영팀)
manager       : 10~50명 (매니저)
vendor        : 수십명
seller        : 수십명
supplier      : 수십명
partner       : 수십명
```

### 1-2. 추가로 존재할 수 있는 값 (검증 대상)

BackfillMigration 대상 외에 수동 삽입 또는 이전 마이그레이션으로 생성된 값:

| 역할 값 | 존재 가능성 | 근거 |
|--------|-----------|------|
| `administrator` | 낮음 | BackfillMigration 미처리, 레거시 코드 방어용 |
| `superadmin` | 없음 | 오타, DB에 저장된 적 없을 것 |
| `moderator` | 있음 가능 | users.routes.ts assignable 목록에 포함 |
| `affiliate` | 있음 가능 | admin/users.routes.ts assignable 목록에 포함 |
| `vendor_manager` | 낮음 | Guard 없음, 실제 할당 여부 불명 |
| `beta_user` | 낮음 | Guard 없음, 실제 할당 여부 불명 |
| `staff` | 있음 가능 | SMTP 라우트, 실제 할당 가능 |
| `user` | 없음 | BackfillMigration에 포함 안 됨 (기본값) |
| `customer` | 있음 가능 | deprecated이나 일부 존재 가능 |
| `kpa:operator` | 있음 가능 | KpaPrefixMigration 처리됨 |
| `platform:admin` | 있음 가능 | KpaPrefixMigration 처리됨 |
| `kpa:admin` | 있음 가능 | KpaPrefixMigration 처리됨 |

---

## 2. 배포 전 검증 SQL

> **실행 위치**: Cloud Console SQL Editor 또는 Admin API
> **시점**: BackfillMigration 배포 후, DB Normalization 전

```sql
-- 1. role_assignments 전체 역할 분포
SELECT
  role,
  COUNT(*)::int AS cnt,
  SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END)::int AS active_cnt,
  SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END)::int AS inactive_cnt
FROM role_assignments
GROUP BY role
ORDER BY active_cnt DESC;

-- 2. 표준 역할 외 값 확인 (이상 값 탐지)
SELECT role, COUNT(*)::int AS cnt
FROM role_assignments
WHERE role NOT IN (
  -- 표준 Platform Role
  'super_admin', 'admin', 'operator', 'manager',
  'vendor', 'seller', 'supplier', 'partner', 'business', 'user', 'customer',
  -- 표준 Prefixed Role
  'kpa:admin', 'kpa:operator', 'kpa:district_admin', 'kpa:branch_admin',
  'kpa:branch_operator', 'kpa:pharmacist',
  'platform:super_admin', 'platform:admin', 'platform:operator',
  'platform:manager', 'platform:vendor', 'platform:member', 'platform:contributor',
  'neture:admin', 'neture:supplier', 'neture:partner', 'neture:user',
  'glycopharm:admin', 'glycopharm:operator', 'glycopharm:pharmacy',
  'glycopharm:supplier', 'glycopharm:partner', 'glycopharm:consumer',
  'cosmetics:admin', 'cosmetics:operator', 'cosmetics:supplier',
  'cosmetics:seller', 'cosmetics:partner',
  'glucoseview:admin', 'glucoseview:operator'
)
AND is_active = true
GROUP BY role
ORDER BY cnt DESC;

-- 3. administrator 역할 존재 확인
SELECT COUNT(*)::int AS administrator_count
FROM role_assignments
WHERE role = 'administrator';

-- 4. staff 역할 존재 확인
SELECT COUNT(*)::int AS staff_count, user_id
FROM role_assignments
WHERE role = 'staff'
GROUP BY user_id;

-- 5. prefixed role 비율 확인
SELECT
  CASE WHEN role LIKE '%:%' THEN 'prefixed' ELSE 'unprefixed' END AS format,
  COUNT(*)::int AS cnt
FROM role_assignments
WHERE is_active = true
GROUP BY format;
```

---

## 3. 표준 철학에 맞지 않는 role 값 처리 계획

### 3-1. `administrator` → `admin`

**처리**: 마이그레이션으로 일괄 교체

```sql
-- 검증 먼저
SELECT COUNT(*) FROM role_assignments WHERE role = 'administrator';

-- 정규화
UPDATE role_assignments
SET role = 'admin', updated_at = NOW()
WHERE role = 'administrator';
```

**위험도**: 낮음 (DB에 없을 가능성 높음)

### 3-2. `superadmin` → `super_admin`

**처리**: 마이그레이션으로 일괄 교체

```sql
UPDATE role_assignments
SET role = 'super_admin', updated_at = NOW()
WHERE role = 'superadmin';
```

**위험도**: 없음 (오타이므로 없을 것)

### 3-3. `staff` → `operator`

**처리**: SMTP 라우트의 Guard 변경 후 DB 정규화

```sql
-- Guard 변경 완료 후
UPDATE role_assignments
SET role = 'operator', updated_at = NOW()
WHERE role = 'staff' AND is_active = true;
```

**위험도**: 낮음 (staff 역할 소유자 수 적을 것)
**전제**: Phase 4 Guard 변경 완료 후 진행

### 3-4. `customer` — 처리 방향 결정 필요

**옵션 A**: `user`로 통합
```sql
UPDATE role_assignments SET role = 'user' WHERE role = 'customer';
```

**옵션 B**: 유지 (deprecated 표시만)
```sql
-- 변경 없음, UserRole.CUSTOMER = 'customer' 유지
```

**결정**: Phase 5 실행 시 DB 실존 수 확인 후 결정.
수가 많으면 B (유지), 수가 적으면 A (통합).

### 3-5. `moderator`, `affiliate`, `vendor_manager`, `beta_user` — 보류

```sql
-- 현황 파악 후 결정
SELECT role, COUNT(*)::int
FROM role_assignments
WHERE role IN ('moderator','affiliate','vendor_manager','beta_user')
GROUP BY role;
```

실존하는 경우: 해당 역할 사용 목적과 Guard 유무 재검토 후 처리.

---

## 4. Prefixed Role 처리 전략

### 4-1. 현재 상태

`types/roles.ts`에 정의된 prefixed role이 이미 일부 DB에 존재할 수 있음:
- KpaPrefixMigration(20260205040103): `'kpa'` 서비스 키로 분기 처리
- Phase4MultiServicePrefixMigration(20260205070000): 멀티 서비스 처리

### 4-2. Prefixed Role 방침 (ROLE-PHILOSOPHY-V1 §4 기준)

```
유지: kpa:*, glycopharm:*, cosmetics:*, glucoseview:*, neture:*
미사용: platform:* (→ 그냥 unprefixed 사용)
```

### 4-3. `platform:*` 역할 처리

```sql
-- platform:* 역할 보유자 확인
SELECT role, COUNT(*) FROM role_assignments
WHERE role LIKE 'platform:%' AND is_active = true
GROUP BY role;

-- platform:super_admin → super_admin 교체 (결정 후)
-- platform:admin → admin 교체 (결정 후)
-- platform:operator → operator 교체 (결정 후)
```

**위험도**: 중간. ActivateAdminUser 마이그레이션에서 `platform:super_admin`을 삽입했으므로 존재 가능.

---

## 5. 마이그레이션 설계

### Migration 1: 검증 마이그레이션 (읽기 전용)

```typescript
// 파일명: 20260305000000-ValidateRoleAssignmentsSnapshot.ts
export class ValidateRoleAssignmentsSnapshot implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // SELECT만 수행, 이상 값 발견 시 경고 로그
    const anomalies = await queryRunner.query(`
      SELECT role, COUNT(*)::int AS cnt
      FROM role_assignments
      WHERE role NOT IN (/* 표준 목록 */)
        AND is_active = true
      GROUP BY role
    `);

    if (anomalies.length > 0) {
      console.warn('[ROLE-NORMALIZATION] 비표준 역할 발견:', anomalies);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // 롤백 없음 (읽기 전용)
  }
}
```

### Migration 2: 정규화 마이그레이션

```typescript
// 파일명: 20260305000001-NormalizeRoleAssignmentValues.ts
export class NormalizeRoleAssignmentValues implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. administrator → admin
    await queryRunner.query(`
      UPDATE role_assignments
      SET role = 'admin', updated_at = NOW()
      WHERE role = 'administrator'
    `);

    // 2. superadmin → super_admin (오타)
    await queryRunner.query(`
      UPDATE role_assignments
      SET role = 'super_admin', updated_at = NOW()
      WHERE role = 'superadmin'
    `);

    // 3. staff → operator (Phase 4 완료 후)
    await queryRunner.query(`
      UPDATE role_assignments
      SET role = 'operator', updated_at = NOW()
      WHERE role = 'staff'
    `);

    // 4. platform:super_admin → super_admin (결정 후 활성화)
    -- 조건부: platform:* 제거 방침 확정 시
    -- await queryRunner.query(`
    --   UPDATE role_assignments SET role = 'super_admin' WHERE role = 'platform:super_admin'
    -- `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    // 역방향 (롤백용) — 실제 실행 시 원복 SQL 추가
    await queryRunner.query(`
      UPDATE role_assignments
      SET role = 'administrator', updated_at = NOW()
      WHERE role = 'admin' AND /* 원래 administrator였던 것 구분 불가 — 로그 기반 */
    `);
    // ⚠️ administrator 원복 불가능 (admin과 구분 불가)
    // → down() 실행 시 경고 로그 필요
  }
}
```

> ⚠️ **롤백 제한**: `administrator → admin` 변환은 되돌리기 어려움.
> (admin 중 어느 것이 원래 administrator였는지 알 수 없음)
> 적용 전 DB 스냅샷 필수.

---

## 6. 일괄 SQL 가능 여부

| 작업 | 일괄 SQL 가능 여부 | 주의사항 |
|------|-----------------|---------|
| administrator → admin | ✅ 가능 | 되돌리기 어려움 |
| superadmin → super_admin | ✅ 가능 | 안전 |
| staff → operator | ✅ 가능 | Phase 4 완료 후 |
| customer → user | ⚠️ 주의 | 수 확인 후 |
| platform:* → unprefixed | ⚠️ 주의 | 방침 확정 후 |
| moderator/affiliate 처리 | ❌ 보류 | 실사용 여부 먼저 확인 |

---

## 7. 위험도 분석

| 위험 | 발생 가능성 | 대응 |
|------|------------|------|
| 정규화 후 특정 사용자 접근 불가 | 낮음 | `administrator` 보유자가 있으면 `admin`으로 교체하므로 오히려 정상화 |
| platform:super_admin 제거 후 super_admin 권한 상실 | 중간 | 교체 전 해당 사용자에 unprefixed 역할도 보유 확인 필요 |
| DB 롤백 불가 | 높음 (administrator → admin) | Cloud SQL 스냅샷 적용 전 필수 |
| prefixed role과 unprefixed role 중복 | 낮음 | 중복이어도 `hasAnyRole`은 OR 조건이므로 권한 강화됨 |

---

## 8. 적용 순서 (의존성 고려)

```
Phase 4 완료 (Guard 리팩터) — staff Guard 제거 포함
    ↓
DB 현황 확인 SQL 실행 (Cloud Console)
    ↓
커밋 1: ValidateRoleAssignmentsSnapshot 마이그레이션
    ↓
배포 → Cloud Run 로그 확인 → 이상 값 목록 파악
    ↓
커밋 2: NormalizeRoleAssignmentValues 마이그레이션 (확인된 항목만)
    ↓
배포 후 검증 SQL 재실행
```

---

## 9. 배포 후 검증 SQL

```sql
-- 정규화 완료 확인
SELECT role, COUNT(*)::int AS active_cnt
FROM role_assignments
WHERE is_active = true
  AND role IN ('administrator', 'superadmin', 'staff')  -- 제거 대상들
GROUP BY role;
-- 기대값: 0 rows

-- 최종 역할 분포
SELECT role, COUNT(*)::int AS cnt
FROM role_assignments
WHERE is_active = true
GROUP BY role
ORDER BY cnt DESC;
```

---

## 10. 테스트 체크리스트

- [ ] 정규화 마이그레이션 배포 후 기존 admin 사용자 로그인 성공
- [ ] 기존 operator 사용자 서비스 접근 정상
- [ ] `SELECT COUNT(*) FROM role_assignments WHERE role='administrator'` = 0
- [ ] `SELECT COUNT(*) FROM role_assignments WHERE role='superadmin'` = 0
- [ ] `/api/v1/auth/status` → 역할 정상 반환
- [ ] requireAdmin 체크 통과 (admin, super_admin, operator 역할)

---

## 11. 롤백 전략

### 단계 1 (마이그레이션 배포 전)
```bash
git revert <커밋해시>  # 마이그레이션 파일 제거
```

### 단계 2 (마이그레이션 배포 후)
```sql
-- Cloud SQL 스냅샷에서 role_assignments 복원 (DBA 작업)
-- 또는 영향받은 사용자 수동 복구:
-- UPDATE role_assignments SET role = 'administrator' WHERE role = 'admin' AND user_id IN (...)
```

> ⚠️ **중요**: DB 변경 후 롤백은 어렵다.
> 반드시 적용 전 Cloud SQL 자동 백업 확인 (GCP: 매일 백업 7일 보관).

---

*Phase 2 산출물 — 코드/DB 변경 없음*
*실행: Phase 5 (Phase 4 완료 후)*
*선행 확인: BackfillMigration 배포 후 DB 현황 SQL 실행*
