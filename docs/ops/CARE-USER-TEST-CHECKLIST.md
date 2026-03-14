# Care User Test Checklist

> WO-GLYCOPHARM-CARE-TEST-ENV-FIX-V1

## 0. 테스트 환경 구조

```
Platform Admin (care.admin@test.glycopharm.com)
  │  전체 환자 조회 (pharmacyId=null)
  │
  ├─ Pharmacy A (약국 A)
  │    Owner: pharmacist.a@test.glycopharm.com
  │    ├─ 김정상 (정상, TIR≈85%)
  │    ├─ 박위험 (고위험, TIR<50%, BP+Weight)
  │    └─ 이저혈 (저혈당, 야간 hypo)
  │
  └─ Pharmacy B (약국 B)
       Owner: pharmacist.b@test.glycopharm.com
       ├─ 최식후 (식후 고혈당, 200+)
       └─ 정미입 (데이터 미입력, 3건)
```

Password (공통): `Test1234!`

---

## 1. 테스트 환경 생성

### 1-1. 환경 생성 (한 번에 모두 생성)

```bash
curl -X POST https://o4o-core-api-xxxxx.run.app/api/v1/ops/care-test-data \
  -H "Content-Type: application/json" \
  -H "X-Admin-Secret: <JWT_SECRET>"
```

이 한 번의 호출로 생성되는 것:
- 사용자 3명 (운영자 + 약사 2명)
- role_assignments 3건
- 약국 조직 2곳
- 조직 멤버 2건
- glycopharm 서비스 등록 2건
- 환자 5명
- health_readings ~430건

### 1-2. 약사A 로그인 + 토큰 획득

```bash
curl -X POST https://o4o-core-api-xxxxx.run.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pharmacist.a@test.glycopharm.com","password":"Test1234!"}'
```

### 1-3. KPI 스냅샷 생성 (분석 실행)

약사A 토큰으로 약국A 환자 분석:

```bash
TOKEN_A="<pharmacist.a token>"

# 김정상 (정상)
curl https://o4o-core-api-xxxxx.run.app/api/v1/care/analysis/e0000000-ee10-4000-a000-000000000001 \
  -H "Authorization: Bearer $TOKEN_A"

# 박위험 (고위험)
curl https://o4o-core-api-xxxxx.run.app/api/v1/care/analysis/e0000000-ee10-4000-a000-000000000002 \
  -H "Authorization: Bearer $TOKEN_A"

# 이저혈 (저혈당)
curl https://o4o-core-api-xxxxx.run.app/api/v1/care/analysis/e0000000-ee10-4000-a000-000000000003 \
  -H "Authorization: Bearer $TOKEN_A"
```

약사B 로그인 + 약국B 환자 분석:

```bash
# 약사B 로그인
curl -X POST https://o4o-core-api-xxxxx.run.app/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pharmacist.b@test.glycopharm.com","password":"Test1234!"}'

TOKEN_B="<pharmacist.b token>"

# 최식후 (식후 고혈당)
curl https://o4o-core-api-xxxxx.run.app/api/v1/care/analysis/e0000000-ee10-4000-a000-000000000004 \
  -H "Authorization: Bearer $TOKEN_B"
```

> 정미입(데이터 미입력) 환자는 3일 이상 공백이므로 분석 결과가 minimal.

---

## 2. 검증 체크리스트

### 2-1. 데이터 격리 검증

| # | 항목 | 기대 결과 | Pass |
|---|------|----------|------|
| 1 | 약사A 로그인 → Dashboard | 김정상, 박위험, 이저혈 **3명만** 표시 | [ ] |
| 2 | 약사B 로그인 → Dashboard | 최식후, 정미입 **2명만** 표시 | [ ] |
| 3 | Admin 로그인 → Dashboard | **5명 전체** 표시 | [ ] |
| 4 | 약사A → 약국B 환자 접근 | 403 거부 | [ ] |

### 2-2. Dashboard (/care/dashboard)

| # | 항목 | 기대 결과 | Pass |
|---|------|----------|------|
| 5 | 환자 목록 표시 | 해당 약국 환자만 표시 | [ ] |
| 6 | 위험도 배지 | 박위험=고위험(빨강), 이저혈=주의(노랑), 김정상=양호(초록) | [ ] |
| 7 | KPI 요약 카드 | TIR/CV 값, 우선 환자 목록 | [ ] |
| 8 | AI Chat Entry (Population) | "환자에 대해 AI에게 물어보세요" 표시 | [ ] |

### 2-3. Patient Detail (/care/patients/{id})

| # | 항목 | 기대 결과 | Pass |
|---|------|----------|------|
| 9 | 환자 헤더 블록 | 이름, 위험도, TIR, CV, 코칭 횟수 | [ ] |
| 10 | Action Panel | 고위험→분석 확인, 코칭 없음→코칭 시작 | [ ] |
| 11 | AI Summary | 환자 AI 요약 카드 | [ ] |
| 12 | AI Chat Entry (Patient) | "이 환자에 대해 AI에게 물어보세요" | [ ] |
| 13 | 탭 네비게이션 | 데이터/분석/코칭/기록 4개 탭 | [ ] |

### 2-4. AI Chat 기능

| # | 항목 | 기대 결과 | Pass |
|---|------|----------|------|
| 14 | Population 모드 질문 | "오늘 관리해야 할 환자는?" → AI 응답 | [ ] |
| 15 | Patient 모드 질문 | "이 환자의 최근 혈당 추세는?" → AI 응답 | [ ] |
| 16 | AI 응답 구조 | summary + details + recommendations | [ ] |
| 17 | Related Patients | Population에서 관련 환자 + 클릭 이동 | [ ] |

### 2-5. Action Engine

| # | 항목 | 기대 결과 | Pass |
|---|------|----------|------|
| 18 | open_patient 버튼 | 환자 상세 이동 | [ ] |
| 19 | create_coaching 버튼 | 코칭 탭 이동 | [ ] |
| 20 | run_analysis 버튼 | 분석 실행 + 분석 탭 이동 | [ ] |
| 21 | resolve_alert 버튼 | 인라인 완료 (이동 없음) | [ ] |

### 2-6. 환자 유형별 검증

| # | 환자 | 약국 | 확인 항목 | Pass |
|---|------|------|----------|------|
| 22 | 김정상 | A | TIR≈85%, CV≈20%, 양호(low) | [ ] |
| 23 | 박위험 | A | TIR<50%, CV>40%, 고위험(high), BP 존재 | [ ] |
| 24 | 이저혈 | A | 야간 저혈당 패턴, 주의(moderate) | [ ] |
| 25 | 최식후 | B | 식후 200+, 공복 정상 | [ ] |
| 26 | 정미입 | B | 데이터 3건, "데이터 미입력" 알림 | [ ] |

---

## 3. 테스트 환경 정리

```bash
curl -X DELETE https://o4o-core-api-xxxxx.run.app/api/v1/ops/care-test-data \
  -H "X-Admin-Secret: <JWT_SECRET>"
```

삭제 대상:
- health_readings, KPI snapshots, alerts, coaching sessions
- glucoseview_customers (환자 5명)
- organization_service_enrollments (2건)
- organization_members (2건)
- role_assignments (3건)
- organizations (약국 2곳)
- users (사용자 3명)

---

## 테스트 ID 참조

### 사용자

| 이름 | Email | UUID | 역할 |
|------|-------|------|------|
| Care 운영자 | care.admin@test.glycopharm.com | `e0000000-ee20-4000-a000-000000000001` | platform:admin |
| 약사 김 | pharmacist.a@test.glycopharm.com | `e0000000-ee20-4000-a000-000000000002` | glycopharm:pharmacist |
| 약사 이 | pharmacist.b@test.glycopharm.com | `e0000000-ee20-4000-a000-000000000003` | glycopharm:pharmacist |

### 약국

| 이름 | UUID | 소유자 |
|------|------|--------|
| Care 약국 A | `e0000000-ee21-4000-a000-000000000001` | 약사 김 |
| Care 약국 B | `e0000000-ee21-4000-a000-000000000002` | 약사 이 |

### 환자

| 이름 | UUID | 약국 | 유형 |
|------|------|------|------|
| 김정상 | `e0000000-ee10-4000-a000-000000000001` | A | 정상 |
| 박위험 | `e0000000-ee10-4000-a000-000000000002` | A | 고위험 |
| 이저혈 | `e0000000-ee10-4000-a000-000000000003` | A | 저혈당 |
| 최식후 | `e0000000-ee10-4000-a000-000000000004` | B | 식후고혈당 |
| 정미입 | `e0000000-ee10-4000-a000-000000000005` | B | 데이터미입력 |
