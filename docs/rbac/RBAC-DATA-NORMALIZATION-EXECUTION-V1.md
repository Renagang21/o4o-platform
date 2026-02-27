# RBAC Data Normalization — Execution V1

> WO-RBAC-DATA-NORMALIZATION-EXECUTION-V1 | STEP 2-3 | 2026-02-27

---

## 1. 전제 조건

- STEP 1 Dry Run 완료 (`RBAC-DATA-NORMALIZATION-DRYRUN-V1.md`)
- Dry Run에서 비표준 role 존재 확인됨
- RBAC Freeze 선언 유효 (구조 변경 금지)

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

> Cloud Console 실행 후 결과를 아래에 기록

### A. Rename 결과

| SQL | affected_rows |
|-----|--------------|
| administrator → admin | *(기록)* |
| superadmin → super_admin | *(기록)* |
| staff → operator | *(기록)* |

### B. Deactivate 결과

| SQL | affected_rows |
|-----|--------------|
| business → deactivate | *(기록)* |
| vendor_manager → deactivate | *(기록)* |
| beta_user → deactivate | *(기록)* |

### C. 검증 결과

| 항목 | 결과 |
|------|------|
| 비표준 active role 잔여 | *(0건 기대)* |
| RA 없는 활성 사용자 | *(기록)* |
| /auth/status 정상 | *(확인)* |

---

## 5. 완료 기준 체크리스트

- [ ] 비표준 active role 0건
- [ ] business active 0건
- [ ] 기존 admin/operator 접근 정상
- [ ] Guard 이상 없음
- [ ] /auth/status 정상 응답
- [ ] RBAC-ROLE-CATALOG-V1.md와 정합

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

*Document Version: 1.0*
*Created: 2026-02-27*
