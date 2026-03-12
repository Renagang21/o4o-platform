# IR-GLYCOPHARM-TEST-DATA-AUDIT-V1

> 조사일: 2026-03-12
> 목적: GlycoPharm 사업자 테스트용 계정/데이터 조사

---

## 1. 시스템 데이터 모델 (코드 분석 결과)

### 연결 구조

```
User (약사)
  └─ creates → Organization (약국)
       └─ organization_id → glucoseview_customers (환자 목록)
            └─ patient_id → health_readings (혈당 데이터)
            └─ patient_id → care_kpi_snapshots (분석 결과)
            └─ patient_id → care_coaching_sessions (코칭 기록)

User (환자)
  └─ user_id → patient_health_profiles (건강 프로필, 자가관리)
  └─ patient_id(=user.id) → health_readings (자가입력, sourceType='patient_self')
```

### 핵심 테이블

| 테이블 | 역할 | 주요 키 |
|--------|------|---------|
| `users` | 모든 사용자 계정 | id, email |
| `organizations` | 약국 조직 | id, created_by_user_id |
| `organization_members` | 조직 멤버 | userId, organizationId |
| `organization_service_enrollments` | 서비스 가입 | service_code='glycopharm' |
| `glucoseview_customers` | 약사가 등록한 환자 | id, organization_id, email |
| `health_readings` | 건강 데이터 | patient_id, pharmacy_id |
| `patient_health_profiles` | 환자 자가 프로필 | user_id (1:1) |
| `care_kpi_snapshots` | 분석 KPI | patient_id, pharmacy_id |
| `care_coaching_sessions` | 코칭 기록 | patient_id, pharmacy_id |

---

## 2. Google Cloud Console SQL 쿼리

> 실행 위치: Google Cloud Console → SQL → o4o-platform-db → Query Editor

### 쿼리 1: 활성 GlycoPharm 약국 목록

```sql
SELECT
  o.id AS org_id,
  o.name AS org_name,
  o.is_active,
  u.id AS owner_user_id,
  u.email AS owner_email,
  u.first_name,
  u.last_name,
  ose.status AS enrollment_status
FROM organizations o
JOIN users u ON u.id = o.created_by_user_id
LEFT JOIN organization_service_enrollments ose
  ON ose.organization_id = o.id AND ose.service_code = 'glycopharm'
WHERE ose.status = 'active'
ORDER BY o.created_at DESC;
```

### 쿼리 2: 약국별 등록 환자 수

```sql
SELECT
  gc.organization_id,
  o.name AS org_name,
  COUNT(*) AS patient_count
FROM glucoseview_customers gc
LEFT JOIN organizations o ON o.id = gc.organization_id
WHERE gc.organization_id IS NOT NULL
GROUP BY gc.organization_id, o.name
ORDER BY patient_count DESC;
```

### 쿼리 3: 환자별 건강 데이터 현황

```sql
SELECT
  hr.patient_id,
  gc.name AS patient_name,
  gc.email AS patient_email,
  gc.organization_id,
  hr.metric_type,
  COUNT(*) AS reading_count,
  MAX(hr.measured_at) AS latest_reading,
  MIN(hr.measured_at) AS earliest_reading
FROM health_readings hr
LEFT JOIN glucoseview_customers gc ON gc.id = hr.patient_id
GROUP BY hr.patient_id, gc.name, gc.email, gc.organization_id, hr.metric_type
ORDER BY reading_count DESC;
```

### 쿼리 4: 최근 건강 데이터 샘플 (상위 20건)

```sql
SELECT
  hr.patient_id,
  gc.name AS patient_name,
  hr.metric_type,
  hr.value_numeric,
  hr.unit,
  hr.measured_at,
  hr.source_type,
  hr.metadata,
  hr.pharmacy_id
FROM health_readings hr
LEFT JOIN glucoseview_customers gc ON gc.id = hr.patient_id
ORDER BY hr.measured_at DESC
LIMIT 20;
```

### 쿼리 5: 로그인 가능한 환자 계정 (users + glucoseview_customers 이메일 매칭)

```sql
SELECT
  u.id AS user_id,
  u.email,
  u.first_name,
  u.last_name,
  u.status AS user_status,
  gc.id AS customer_id,
  gc.name AS customer_name,
  gc.organization_id,
  o.name AS pharmacy_name
FROM users u
JOIN glucoseview_customers gc ON gc.email = u.email
LEFT JOIN organizations o ON o.id = gc.organization_id
WHERE u.status = 'approved'
ORDER BY u.created_at DESC;
```

### 쿼리 6: 환자 자가 프로필 현황

```sql
SELECT
  php.user_id,
  u.email,
  u.first_name,
  u.last_name,
  php.diabetes_type,
  php.treatment_method,
  php.target_glucose_low,
  php.target_glucose_high,
  php.created_at
FROM patient_health_profiles php
JOIN users u ON u.id = php.user_id
ORDER BY php.created_at DESC;
```

### 쿼리 7: 코칭 세션 현황

```sql
SELECT
  cs.patient_id,
  gc.name AS patient_name,
  cs.pharmacy_id,
  o.name AS pharmacy_name,
  COUNT(*) AS session_count,
  MAX(cs.created_at) AS latest_session
FROM care_coaching_sessions cs
LEFT JOIN glucoseview_customers gc ON gc.id = cs.patient_id
LEFT JOIN organizations o ON o.id = cs.pharmacy_id
GROUP BY cs.patient_id, gc.name, cs.pharmacy_id, o.name
ORDER BY session_count DESC;
```

### 쿼리 8: 전체 데이터 요약 (총계)

```sql
SELECT 'users (total)' AS metric, COUNT(*)::text AS value FROM users
UNION ALL
SELECT 'users (approved)', COUNT(*)::text FROM users WHERE status = 'approved'
UNION ALL
SELECT 'organizations', COUNT(*)::text FROM organizations WHERE is_active = true
UNION ALL
SELECT 'glycopharm enrollments', COUNT(*)::text FROM organization_service_enrollments WHERE service_code = 'glycopharm' AND status = 'active'
UNION ALL
SELECT 'glucoseview_customers', COUNT(*)::text FROM glucoseview_customers
UNION ALL
SELECT 'health_readings', COUNT(*)::text FROM health_readings
UNION ALL
SELECT 'patient_health_profiles', COUNT(*)::text FROM patient_health_profiles
UNION ALL
SELECT 'care_kpi_snapshots', COUNT(*)::text FROM care_kpi_snapshots
UNION ALL
SELECT 'care_coaching_sessions', COUNT(*)::text FROM care_coaching_sessions;
```

---

## 3. API 엔드포인트 테스트

### 약사 로그인 후 테스트 가능한 엔드포인트

```
POST /api/v1/auth/login          → 토큰 획득
GET  /api/v1/auth/status         → 계정 상태/역할 확인
GET  /api/v1/glycopharm/pharmacy/customers → 등록 환자 목록
GET  /api/v1/care/dashboard      → 케어 대시보드
GET  /api/v1/care/health-readings/:patientId → 환자 혈당 데이터
```

### 환자 로그인 후 테스트 가능한 엔드포인트

```
POST /api/v1/auth/login          → 토큰 획득
GET  /api/v1/auth/status         → 계정 상태 확인
GET  /api/v1/care/patient-profile/me → 내 프로필 조회
POST /api/v1/care/patient/health-readings → 혈당 입력
GET  /api/v1/care/patient/health-readings → 내 기록 조회
```

### curl 테스트 예시

```bash
# 1. 로그인
TOKEN=$(curl -s -X POST https://api.neture.co.kr/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"..."}' \
  | jq -r '.accessToken // .data.accessToken')

# 2. 상태 확인
curl -s -H "Authorization: Bearer $TOKEN" \
  https://api.neture.co.kr/api/v1/auth/status | jq

# 3. 환자 혈당 입력 (환자 로그인 시)
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://api.neture.co.kr/api/v1/care/patient/health-readings \
  -d '{"metricType":"glucose","valueNumeric":115,"unit":"mg/dL","measuredAt":"2026-03-12T08:10:00Z","metadata":{"mealTiming":"before_meal","mealTimingLabel":"식전"}}' | jq
```

---

## 4. 테스트 계정 세트 템플릿

> 아래는 쿼리 실행 후 채워야 할 템플릿입니다.

### 약사 테스트 계정

| 항목 | 값 |
|------|-----|
| 이름 | (쿼리 1 결과) |
| 이메일 | |
| 약국 ID | |
| 약국명 | |
| 등록 환자 수 | (쿼리 2 결과) |

### 환자 테스트 계정

| 항목 | 환자1 | 환자2 | 환자3 |
|------|-------|-------|-------|
| 이름 | | | |
| 이메일 | | | |
| customer_id | | | |
| 혈당 데이터 수 | | | |
| 최근 데이터 | | | |
| 소속 약국 | | | |

### 연결 관계

```
약사: (이메일)
  약국: (약국명)
  ├─ 환자1: (이름) — 혈당 N건
  ├─ 환자2: (이름) — 혈당 N건
  └─ 환자3: (이름) — 혈당 N건
```

---

## 5. 제한 사항

- **로컬 DB 접근 불가** (CLAUDE.md 정책: 방화벽 차단)
- **프로덕션 JWT_SECRET**: Cloud Run 환경변수에만 존재 (로컬 .env와 다름)
- 조사용 SQL은 **Google Cloud Console SQL Editor**에서만 실행 가능
- 비밀번호는 bcrypt 해시 — 기존 테스트 계정의 비밀번호를 알아야 로그인 테스트 가능

---

## 6. 다음 단계

1. Google Cloud Console에서 쿼리 8 (전체 요약) 실행하여 데이터 규모 파악
2. 쿼리 1 실행하여 활성 약국 확인
3. 쿼리 3 실행하여 데이터가 있는 환자 찾기
4. 쿼리 5 실행하여 로그인 가능한 환자 계정 확인
5. 결과를 이 문서 Section 4 템플릿에 기입
6. curl로 API 테스트 실행
