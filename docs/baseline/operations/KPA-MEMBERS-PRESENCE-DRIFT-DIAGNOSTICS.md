# KPA Members Presence Drift Diagnostics

**작성일**: 2026-05-17
**연관 WO**: WO-O4O-KPA-MEMBER-CANONICAL-PRESENCE-BACKFILL-V1 (Step 1)
**근거 IR**: [IR-O4O-KPA-OPERATOR-PROFILE-PRESENCE-AUDIT-V1](../../investigations/IR-O4O-KPA-OPERATOR-PROFILE-PRESENCE-AUDIT-V1.md)
**유형**: 운영 DB read-only 진단 SQL — 데이터 변경 없음

---

## 목적

KPA 회원 canonical SSOT (`kpa_members`) 가 누락된 사용자(`service_memberships(kpa-society)` 는 존재) 의 분포를 파악한다.

- 본 문서의 SQL 은 모두 **read-only SELECT** — 운영 DB 데이터를 변경하지 않는다
- Backfill migration 작성 / 실행 전후 drift 측정에 사용
- 실행 채널: Cloud Console SQL Editor 또는 `gcloud sql connect` (psql 클라이언트 설치 시)

---

## 1. 전체 drift count

`service_memberships(kpa-society)` 존재 + `kpa_members` 누락 사용자 총 수:

```sql
SELECT COUNT(*) AS drift_count
FROM service_memberships sm
LEFT JOIN kpa_members km ON km.user_id = sm.user_id
WHERE sm.service_key IN ('kpa-society', 'kpa')
  AND km.id IS NULL;
```

**해석**:
- `drift_count = 0` → 정상 (모든 KPA SM 사용자에 `kpa_members` 존재)
- `drift_count > 0` → backfill 필요

---

## 2. drift 샘플 (최대 10건)

```sql
SELECT
  sm.user_id,
  u.email,
  sm.service_key,
  sm.status AS sm_status,
  sm.role AS sm_role,
  sm.created_at AS sm_created_at,
  pp.activity_type AS pp_activity_type,
  pp.license_number AS pp_license,
  sp.user_id IS NOT NULL AS has_student_profile,
  u."businessInfo" -> 'metadata' ->> 'workplace' AS workplace
FROM service_memberships sm
JOIN users u ON u.id = sm.user_id
LEFT JOIN kpa_members km ON km.user_id = sm.user_id
LEFT JOIN kpa_pharmacist_profiles pp ON pp.user_id = sm.user_id
LEFT JOIN kpa_student_profiles sp ON sp.user_id = sm.user_id
WHERE sm.service_key IN ('kpa-society', 'kpa')
  AND km.id IS NULL
ORDER BY sm.created_at DESC
LIMIT 10;
```

**해석**:
- `pp_activity_type` 보유 → backfill 시 `membership_type='pharmacist'` derive
- `has_student_profile=true` → `membership_type='pharmacy_student_member'`
- 둘 다 없으면 `sm_role` 기준 fallback

---

## 3. 특정 사용자 상세 진단 (사례 검증용)

특정 이메일 사용자의 전체 source row 분포 조회:

```sql
SELECT
  u.id, u.email,
  u."businessInfo" -> 'metadata' ->> 'workplace' AS workplace,
  km.id AS km_id, km.status AS km_status,
  km.activity_type AS km_activity, km.pharmacy_name, km.membership_type,
  pp.user_id AS pp_user_id, pp.activity_type AS pp_activity,
  pp.license_number AS pp_license,
  sm.id AS sm_id, sm.service_key AS sm_service_key,
  sm.status AS sm_status, sm.role AS sm_role,
  ARRAY_AGG(DISTINCT ra.role) FILTER (WHERE ra.is_active = true) AS active_roles,
  ARRAY_AGG(DISTINCT om.role || '@' || om.organization_id::text) AS org_memberships
FROM users u
LEFT JOIN kpa_members km ON km.user_id = u.id
LEFT JOIN kpa_pharmacist_profiles pp ON pp.user_id = u.id
LEFT JOIN service_memberships sm ON sm.user_id = u.id
LEFT JOIN role_assignments ra ON ra.user_id = u.id
LEFT JOIN organization_members om ON om.user_id = u.id
WHERE u.email = $1   -- 예: 'sohae2100@gmail.com'
GROUP BY
  u.id, u.email, u."businessInfo",
  km.id, km.status, km.activity_type, km.pharmacy_name, km.membership_type,
  pp.user_id, pp.activity_type, pp.license_number,
  sm.id, sm.service_key, sm.status, sm.role;
```

---

## 4. backfill 영향 분포 (membership_type 별 추정)

backfill 시 어떤 `membership_type` 으로 채워질지 사전 분포:

```sql
SELECT
  CASE
    WHEN pp.user_id IS NOT NULL THEN 'pharmacist'
    WHEN sp.user_id IS NOT NULL THEN 'pharmacy_student_member'
    ELSE COALESCE(sm.role, 'unknown')
  END AS derived_membership_type,
  COUNT(*) AS count
FROM service_memberships sm
LEFT JOIN kpa_members km ON km.user_id = sm.user_id
LEFT JOIN kpa_pharmacist_profiles pp ON pp.user_id = sm.user_id
LEFT JOIN kpa_student_profiles sp ON sp.user_id = sm.user_id
WHERE sm.service_key IN ('kpa-society', 'kpa')
  AND km.id IS NULL
GROUP BY 1
ORDER BY count DESC;
```

---

## 5. backfill 사후 검증

migration 실행 후 drift 가 0 인지 확인:

```sql
-- 5-A. 잔존 drift 검증 (반드시 0 이어야 함)
SELECT COUNT(*) AS remaining_drift
FROM service_memberships sm
LEFT JOIN kpa_members km ON km.user_id = sm.user_id
WHERE sm.service_key IN ('kpa-society', 'kpa')
  AND km.id IS NULL;

-- 5-B. 생성된 skeleton row 분포 확인
SELECT
  membership_type,
  status,
  COUNT(*) AS count
FROM kpa_members
WHERE created_at >= (NOW() - INTERVAL '1 day')  -- 최근 24시간 내 생성
GROUP BY membership_type, status
ORDER BY count DESC;

-- 5-C. service_memberships vs kpa_members 정합성 검증
-- 매칭 매트릭스: SM 의 status 별 KM 존재 분포
SELECT
  sm.status AS sm_status,
  km.status AS km_status,
  COUNT(*) AS count
FROM service_memberships sm
LEFT JOIN kpa_members km ON km.user_id = sm.user_id
WHERE sm.service_key IN ('kpa-society', 'kpa')
GROUP BY sm.status, km.status
ORDER BY sm.status, km.status;
```

---

## 6. 실행 절차

### 6-A. backfill 전 (사전 진단)
1. SQL #1 (전체 drift count) 실행 → `drift_count_before` 기록
2. SQL #2 (샘플 10건) 실행 → 데이터 패턴 파악
3. SQL #4 (membership_type 분포) 실행 → backfill 영향 범위 추정

### 6-B. backfill 후 (사후 검증)
1. SQL #5-A 실행 → `remaining_drift = 0` 확인 (필수)
2. SQL #5-B 실행 → 생성된 skeleton 분포 확인
3. SQL #5-C 실행 → SM ↔ KM 정합성 매트릭스 확인

### 6-C. 진단 결과 보고 포맷
```
[drift_count_before]: NN
[membership_type 분포]:
  - pharmacist: NN
  - pharmacy_student_member: NN
  - other: NN
[backfill 실행 후 remaining_drift]: 0
[생성된 skeleton]: NN
```

---

## 7. 안전 보장

- 본 문서의 모든 SQL 은 `SELECT` — 데이터 변경 없음
- backfill `UPDATE` / `INSERT` 는 본 문서 범위 외 — 별도 migration 파일 (`apps/api-server/src/database/migrations/`) 에서 처리
- migration 자동 실행 정책: `docs/baseline/operations/PRODUCTION-MIGRATION-STANDARD.md` 참조

---

*WO-O4O-KPA-MEMBER-CANONICAL-PRESENCE-BACKFILL-V1 Step 1 — 운영 DB 진단 SQL 문서화. 데이터 변경 없음.*
