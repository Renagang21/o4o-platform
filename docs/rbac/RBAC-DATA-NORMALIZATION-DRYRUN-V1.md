# RBAC Data Normalization — Dry Run V1

> WO-RBAC-DATA-NORMALIZATION-EXECUTION-V1 | STEP 1 | 2026-02-27

---

## 1. 목적

role_assignments 테이블에 비표준 role 값이 존재하는지 확인한다.
Freeze 선언 이후 **데이터 정합성 검증**만 수행.

---

## 2. Dry Run SQL

Cloud Console SQL Editor에서 실행:

### A. 비표준 role 값 탐색

```sql
-- 비표준 role 값 존재 여부 확인
SELECT role, COUNT(*),
       COUNT(*) FILTER (WHERE is_active = true) AS active_count,
       COUNT(*) FILTER (WHERE is_active = false) AS inactive_count
FROM role_assignments
WHERE role IN (
  'administrator', 'superadmin', 'staff',
  'business', 'vendor_manager', 'beta_user'
)
GROUP BY role
ORDER BY role;
```

### B. 전체 role 분포 (현재 상태 스냅샷)

```sql
-- 전체 role 분포
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
-- RA 없는 활성 사용자 수
SELECT COUNT(*) AS orphaned_users
FROM users u
WHERE u."isActive" = true
AND NOT EXISTS (
  SELECT 1 FROM role_assignments ra
  WHERE ra.user_id = u.id
  AND ra.is_active = true
);
```

---

## 3. Dry Run 결과

> 실행: `/__debug__/rbac-db-audit` 엔드포인트 | 2026-02-27T12:46:21Z

### A. 비표준 role 값

**0건** — `administrator`, `superadmin`, `staff`, `business`, `vendor_manager`, `beta_user` 모두 존재하지 않음.

### B. 전체 role 분포 (실행 전 스냅샷)

| role | total | active | inactive |
|------|-------|--------|----------|
| `kpa:pharmacist` | 65 | 65 | 0 |
| `kpa:student` | 5 | 5 | 0 |
| `pharmacist` | 3 | 3 | 0 |
| `kpa:admin` | 2 | 2 | 0 |
| `supplier` | 1 | 1 | 0 |
| `glucoseview:admin` | 1 | 1 | 0 |
| `glycopharm:admin` | 1 | 1 | 0 |
| `partner` | 1 | 1 | 0 |
| `neture:admin` | 1 | 1 | 0 |
| `platform:super_admin` | 1 | 1 | 0 |
| `super_admin` | 1 | 0 | 1 |
| `platform:admin` | 4 | 0 | 4 |
| `admin` | 5 | 0 | 5 |

### C. RA 없는 활성 사용자

| orphaned_users | 상세 |
|---------------|------|
| 4 | `admin@o4o.com`, `admin@kpa.test`, `kpa-a-operator@o4o.com`, `sohae21@naver.com` |

### D. 마이그레이션 상태

- `users.role` 컬럼: **DROP 완료**
- `users.roles` 컬럼: **DROP 완료**
- 해석: `DropLegacyRbacColumns EXECUTED`

### E. 요약

| 항목 | 값 |
|------|-----|
| 활성 사용자 | 85 |
| RA 보유 사용자 | 81 |
| RA 없는 활성 사용자 | 4 |
| active RA 레코드 | 81 |
| distinct active role | 10 |

---

## 4. 판정 기준

| 결과 | 조치 |
|------|------|
| 비표준 role 0건 | STEP 2 불필요 — 정합 완료 |
| 비표준 role 존재 | STEP 2 실행 SQL 작성 → 실행 |
| RA 없는 사용자 존재 | RBAC-RUNBOOK-V1.md 2절 절차에 따라 개별 조치 |

---

*Document Version: 1.0*
*Created: 2026-02-27*
