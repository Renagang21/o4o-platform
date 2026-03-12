# IR-GLYCOPHARM-TEST-ACCOUNT-EXTRACT-V1

> 조사일: 2026-03-12
> 목적: 사업자 테스트용 계정 추출 + 비밀번호 리셋
> 실행 위치: Google Cloud Console → SQL → o4o-platform-db → Query Editor

---

## STEP 1: 조사 (읽기 전용)

아래 SQL을 **순서대로 실행**하여 테스트 대상 계정을 선정한다.

### 1-A. 전체 데이터 규모

```sql
SELECT 'users (approved)' AS metric, COUNT(*)::text AS value FROM users WHERE status = 'approved'
UNION ALL SELECT 'organizations (active)', COUNT(*)::text FROM organizations WHERE is_active = true
UNION ALL SELECT 'glycopharm enrollments', COUNT(*)::text FROM organization_service_enrollments WHERE service_code = 'glycopharm' AND status = 'active'
UNION ALL SELECT 'glucoseview_customers', COUNT(*)::text FROM glucoseview_customers
UNION ALL SELECT 'health_readings', COUNT(*)::text FROM health_readings
UNION ALL SELECT 'care_kpi_snapshots', COUNT(*)::text FROM care_kpi_snapshots
UNION ALL SELECT 'care_coaching_sessions', COUNT(*)::text FROM care_coaching_sessions;
```

### 1-B. 데이터 있는 환자 TOP 10

```sql
SELECT
  hr.patient_id,
  gc.name AS patient_name,
  gc.email AS patient_email,
  gc.organization_id AS pharmacy_id,
  COUNT(*) AS reading_count,
  MAX(hr.measured_at) AS latest_reading
FROM health_readings hr
LEFT JOIN glucoseview_customers gc ON gc.id = hr.patient_id
GROUP BY hr.patient_id, gc.name, gc.email, gc.organization_id
ORDER BY reading_count DESC
LIMIT 10;
```

### 1-C. 위 환자 중 로그인 가능한 계정

```sql
SELECT
  u.id AS user_id,
  u.email,
  u.status AS user_status,
  gc.id AS customer_id,
  gc.name AS customer_name,
  gc.organization_id AS pharmacy_id,
  (SELECT COUNT(*) FROM health_readings hr WHERE hr.patient_id = gc.id) AS reading_count
FROM glucoseview_customers gc
JOIN users u ON u.email = gc.email
WHERE gc.id IN (SELECT patient_id FROM health_readings)
  AND u.status = 'approved'
ORDER BY reading_count DESC;
```

### 1-D. 연결된 약국 + 약사

```sql
SELECT
  o.id AS org_id,
  o.name AS pharmacy_name,
  u.id AS pharmacist_user_id,
  u.email AS pharmacist_email,
  u.first_name,
  u.last_name,
  (SELECT COUNT(*) FROM glucoseview_customers gc WHERE gc.organization_id = o.id) AS patient_count
FROM organizations o
JOIN users u ON u.id = o.created_by_user_id
WHERE o.id IN (
  SELECT DISTINCT gc.organization_id
  FROM glucoseview_customers gc
  WHERE gc.id IN (SELECT patient_id FROM health_readings)
    AND gc.organization_id IS NOT NULL
)
ORDER BY patient_count DESC;
```

---

## STEP 2: 비밀번호 리셋 (쓰기)

조사 결과를 보고 **대상 이메일을 확정**한 뒤 아래 SQL을 실행한다.

### 테스트 비밀번호

```
O4oTestPass
```

### bcrypt 해시 (bcryptjs, rounds=10)

```
$2b$10$TRxdw5ytg9uyeWnllRi1P.V0pJVfq5VnEGkVjIOJVvtTc6PbQlE8G
```

### 2-A. 약사 비밀번호 리셋

```sql
-- ⚠️ 이메일을 STEP 1-D 결과로 교체
UPDATE users
SET password = '$2b$10$TRxdw5ytg9uyeWnllRi1P.V0pJVfq5VnEGkVjIOJVvtTc6PbQlE8G'
WHERE email = '약사이메일@example.com';
```

### 2-B. 환자 비밀번호 리셋

```sql
-- ⚠️ 이메일을 STEP 1-C 결과로 교체
UPDATE users
SET password = '$2b$10$TRxdw5ytg9uyeWnllRi1P.V0pJVfq5VnEGkVjIOJVvtTc6PbQlE8G'
WHERE email IN (
  '환자1@example.com',
  '환자2@example.com',
  '환자3@example.com'
);
```

---

## STEP 3: 검증

### 3-A. curl 로그인 테스트

```bash
# 약사 로그인
curl -s -X POST https://api.neture.co.kr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"약사이메일@example.com","password":"O4oTestPass"}' | jq '.accessToken'

# 환자 로그인
curl -s -X POST https://api.neture.co.kr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"환자1@example.com","password":"O4oTestPass"}' | jq '.accessToken'
```

### 3-B. 환자 프로필 조회

```bash
TOKEN="위에서_받은_토큰"
curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.neture.co.kr/api/v1/care/patient-profile/me | jq
```

### 3-C. 환자 혈당 입력 테스트

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://api.neture.co.kr/api/v1/care/patient/health-readings \
  -d '{
    "metricType": "glucose",
    "valueNumeric": 115,
    "unit": "mg/dL",
    "measuredAt": "2026-03-12T08:10:00Z",
    "metadata": {"mealTiming": "before_meal", "mealTimingLabel": "식전"}
  }' | jq
```

---

## STEP 4: 사업자 전달용 계정 카드

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GlycoPharm 테스트 계정
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▶ 약사
  이메일: (STEP 1-D 결과)
  비밀번호: O4oTestPass
  약국: (약국명)

▶ 환자 1
  이메일: (STEP 1-C 결과)
  비밀번호: O4oTestPass
  혈당 데이터: N건

▶ 환자 2
  이메일: (STEP 1-C 결과)
  비밀번호: O4oTestPass
  혈당 데이터: N건

▶ 환자 3
  이메일: (STEP 1-C 결과)
  비밀번호: O4oTestPass
  혈당 데이터: N건

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

▶ 약사 로그인 URL
  https://glycopharm.neture.co.kr/login

▶ 환자 로그인 URL
  https://glycopharm.neture.co.kr/login

▶ 약사 테스트 흐름
  로그인 → 환자 목록 → 데이터 분석 → 코칭

▶ 환자 테스트 흐름
  로그인 → 프로필 설정 → 혈당 입력 → 기록 확인

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 실행 순서 요약

```
1. Cloud Console에서 STEP 1 쿼리 실행 (조사)
2. 결과 확인 → 약사 1명 + 환자 2~3명 선정
3. STEP 2 SQL에 이메일 입력 → 실행 (비밀번호 리셋)
4. STEP 3 curl로 로그인 검증
5. STEP 4 계정 카드를 사업자에게 전달
```
