# RBAC Data Normalization — Execution V1

> WO-RBAC-DATA-NORMALIZATION-EXECUTION-V1 | STEP 2-3 | 2026-02-27

---

## 1. 전제 조건 및 판정

- STEP 1 Dry Run 완료 (`RBAC-DATA-NORMALIZATION-DRYRUN-V1.md`)
- RBAC Freeze 선언 유효 (구조 변경 금지)

### Dry Run 판정 결과

| 항목 | 결과 | 조치 |
|------|------|------|
| Rename 대상 (administrator/superadmin/staff) | **0건** | 실행 불필요 |
| Deactivate 대상 (business/vendor_manager/beta_user) | **0건** | 실행 불필요 |
| 접두어 없는 활성 role (pharmacist/supplier/partner) | 존재 | Commerce Role로 정상 — 변경 없음 |
| RA 없는 활성 사용자 | **4명** | `user` role 부여 |

---

## 2. 실행 SQL (Cloud Console SQL Editor)

> 모든 UPDATE에 `AND is_active = true` 조건을 적용하여 비활성 이력 레코드를 보호한다.

### A. Rename — 비표준 → 표준 role

```sql
-- administrator → admin
UPDATE role_assignments
SET role = 'admin'
WHERE role = 'administrator'
  AND is_active = true;

-- superadmin → super_admin
UPDATE role_assignments
SET role = 'super_admin'
WHERE role = 'superadmin'
  AND is_active = true;

-- staff → operator
UPDATE role_assignments
SET role = 'operator'
WHERE role = 'staff'
  AND is_active = true;
```

### B. Deactivate — 금지 role 비활성화

```sql
-- business → deactivate
UPDATE role_assignments
SET is_active = false
WHERE role = 'business'
  AND is_active = true;

-- vendor_manager → deactivate
UPDATE role_assignments
SET is_active = false
WHERE role = 'vendor_manager'
  AND is_active = true;

-- beta_user → deactivate
UPDATE role_assignments
SET is_active = false
WHERE role = 'beta_user'
  AND is_active = true;
```

### C. 금지 사항

- ❌ DELETE 금지 (이력 보존)
- ❌ scope_type 변경 금지
- ❌ 새로운 role 생성 금지
- ❌ 구조(컬럼/인덱스) 변경 금지

---

## 3. 검증 SQL (STEP 3)

### A. 비표준 role 잔여 확인 (0건이어야 함)

```sql
SELECT role, COUNT(*)
FROM role_assignments
WHERE role IN (
  'administrator', 'superadmin', 'staff',
  'business', 'vendor_manager', 'beta_user'
)
  AND is_active = true
GROUP BY role;
```

**기대 결과: 0건**

### B. 전체 role 분포 (실행 후 스냅샷)

```sql
SELECT role,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE is_active = true) AS active,
       COUNT(*) FILTER (WHERE is_active = false) AS inactive
FROM role_assignments
GROUP BY role
ORDER BY role;
```

### C. RA 없는 활성 사용자 확인

```sql
SELECT COUNT(*) AS orphaned_users
FROM users u
WHERE u."isActive" = true
AND NOT EXISTS (
  SELECT 1 FROM role_assignments ra
  WHERE ra.user_id = u.id
  AND ra.is_active = true
);
```

### D. 서비스별 관리자 확인

```sql
SELECT role, COUNT(*) AS count
FROM role_assignments
WHERE role LIKE '%:admin'
  AND is_active = true
GROUP BY role
ORDER BY role;
```

---

## 4. 실행 결과

> 실행: `/__debug__/rbac-backfill-user-role/execute` | 2026-02-27T13:05:48Z

### A. Rename/Deactivate

**실행 안 함** — Dry Run에서 대상 0건 확인됨.

### B. RA 없는 사용자 backfill 결과

| email | user_id | 부여 role |
|-------|---------|----------|
| `admin@o4o.com` | `99990002-0002-...` | `user` |
| `admin@kpa.test` | `6658c9b7-722f-...` | `user` |
| `kpa-a-operator@o4o.com` | `e7225cfb-795a-...` | `user` |
| `sohae21@naver.com` | `e709bcd9-6db2-...` | `user` |

### C. 검증 결과 (실행 후 `/__debug__/rbac-db-audit` 2026-02-27T13:06:03Z)

| 항목 | 결과 |
|------|------|
| 비표준 active role 잔여 | **0건** |
| RA 없는 활성 사용자 | **0명** |
| 활성 사용자 총수 | 85 |
| RA 보유 사용자 | 85 (100%) |
| active RA 레코드 | 85 |
| distinct active role | 11 |

### D. 실행 후 전체 role 분포

| role | total | active | inactive |
|------|-------|--------|----------|
| `kpa:pharmacist` | 65 | 65 | 0 |
| `kpa:student` | 5 | 5 | 0 |
| `user` | 4 | 4 | 0 |
| `pharmacist` | 3 | 3 | 0 |
| `kpa:admin` | 2 | 2 | 0 |
| `glycopharm:admin` | 1 | 1 | 0 |
| `neture:admin` | 1 | 1 | 0 |
| `partner` | 1 | 1 | 0 |
| `supplier` | 1 | 1 | 0 |
| `glucoseview:admin` | 1 | 1 | 0 |
| `platform:super_admin` | 1 | 1 | 0 |
| `super_admin` | 1 | 0 | 1 |
| `platform:admin` | 4 | 0 | 4 |
| `admin` | 5 | 0 | 5 |

---

## 5. 완료 기준 체크리스트

- [x] 비표준 active role 0건
- [x] business active 0건
- [x] RA 없는 활성 사용자 0명 (4명 → 0명)
- [x] 활성 사용자 = RA 보유 사용자 (85 = 85)
- [x] RBAC-ROLE-CATALOG-V1.md와 정합
- [ ] 기존 admin/operator 접근 정상 *(수동 확인 필요)*
- [ ] /auth/status 정상 응답 *(수동 확인 필요)*

---

## 6. 롤백 절차 (비상 시)

```sql
-- Rename 롤백 (필요 시)
UPDATE role_assignments SET role = 'administrator' WHERE role = 'admin' AND assigned_at > '2026-02-27';
UPDATE role_assignments SET role = 'superadmin' WHERE role = 'super_admin' AND assigned_at > '2026-02-27';
UPDATE role_assignments SET role = 'staff' WHERE role = 'operator' AND assigned_at > '2026-02-27';

-- Deactivate 롤백 (필요 시)
UPDATE role_assignments SET is_active = true WHERE role = 'business' AND is_active = false;
UPDATE role_assignments SET is_active = true WHERE role = 'vendor_manager' AND is_active = false;
UPDATE role_assignments SET is_active = true WHERE role = 'beta_user' AND is_active = false;
```

> 롤백 SQL의 Rename 부분은 `assigned_at` 타임스탬프로 범위를 제한한다.
> 실행 전 반드시 Dry Run으로 영향 범위를 확인할 것.

---

*Document Version: 1.1*
*Created: 2026-02-27*
*Executed: 2026-02-27T13:05:48Z*
