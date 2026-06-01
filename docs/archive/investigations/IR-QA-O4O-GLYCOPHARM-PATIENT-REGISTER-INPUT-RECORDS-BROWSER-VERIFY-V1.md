# IR-QA-O4O-GLYCOPHARM-PATIENT-REGISTER-INPUT-RECORDS-BROWSER-VERIFY-V1

> **Browser E2E Verification Report**
> Target: WO-O4O-GLYCOPHARM-PHARMACY-PATIENT-REGISTER-FORM-COMPLETE-V1
> Date: 2026-03-24
> Environment: glycopharm.co.kr (Production)
> Account: pharmacist_test@glycopharm.co.kr
> Tool: Playwright MCP (Chrome)

---

## Summary

| # | 검증 항목 | 결과 | 비고 |
|---|----------|------|------|
| 1 | 환자 등록 진입 (버튼/모달 자동 열기) | **PASS** | `/care/patients` "당뇨인 등록" 버튼 → 모달 정상 |
| 2 | 등록 폼 필드 구성 | **PASS** | 6필드: 이름*, 연락처, 이메일, 성별, 출생연도, 메모 |
| 3 | 이름만 등록 (최소 필수) | **PASS** | "검증테스트환자" 등록 성공 |
| 4 | 등록 후 상세 자동 진입 | **PASS** | `/care/patients/{id}` 자동 네비게이션, 이름 표시 |
| 5 | 약사 데이터 입력 (metadata 포함) | **PASS** | 혈당 120 + 공복 + 메트포르민 500mg 1정 → 즉시 테이블 반영 |
| 6 | 전체기록 조회 (`/care/records`) | **PASS** | 환자 드롭다운 선택 → 1건 표시, metadata 태그 정상 |
| 7 | 중복 등록 방지 | **PASS** | 동일 연락처 등록 시 "동일한 연락처의 당뇨인이 이미 등록되어 있습니다. (중복테스트)" |
| 8 | PharmacyPatients 버튼 연결 | **PASS** | `/store/services` "고객 등록" → `/care/patients?register=true` → 모달 자동 열림 |
| 9 | 회귀 검증 — Care 대시보드 | **PASS** | AI Care Control Tower 정상, KPI 7명 표시 |
| 10 | 회귀 검증 — 분석 | **PASS** | `/care/analysis` 7명 드롭다운 정상 |
| 11 | 회귀 검증 — 코칭 | **PASS** | `/care/coaching` 연결 당뇨인 7명, 기록 정상 |
| 12 | 회귀 검증 — 가이드라인 | **PASS** | `/care/guideline` 7개 섹션 정상 렌더링 |
| 13 | 회귀 검증 — 전체기록 필터 | **PASS** | 측정 항목 필터(혈당/체중) 전환 정상, 빈 상태 메시지 정상 |

---

## 상세 검증 내역

### 1. 환자 등록 진입

- `/care/patients` 접근 → "당뇨인 등록" 버튼 존재
- 버튼 클릭 → 등록 모달 표시
- 모달 제목: "당뇨인 등록"

### 2. 등록 폼 필드 구성

| 필드 | 타입 | 필수 | 확인 |
|------|------|------|------|
| 이름 | text | ✅ | placeholder "당뇨인 이름" |
| 연락처 | tel | ❌ | placeholder "010-0000-0000" |
| 이메일 | email | ❌ | placeholder "example@email.com" |
| 성별 | select | ❌ | 선택 안 함 / 남성 / 여성 |
| 출생연도 | number | ❌ | spinbutton |
| 메모 | textarea | ❌ | placeholder "특이사항 등" |

### 3. 이름만 등록 (최소 입력)

- 이름: "검증테스트환자" 입력
- 나머지 필드: 비워둠
- "등록하기" 클릭 → 성공

### 4. 등록 후 상세 자동 진입

- 등록 직후 URL이 `/care/patients/{uuid}`로 자동 이동
- 페이지에 "검증테스트환자" 이름 표시
- 데이터 입력 영역 표시

### 5. 약사 데이터 입력 (metadata 포함)

- 환자 상세에서 "혈당" 탭 선택
- 수치: 120 입력
- 측정 시점: "공복" 선택
- 복용 약물: "메트포르민 500mg 1정" 입력
- "기록 저장" → 성공
- 테이블에 즉시 반영:
  - 값: 120 mg/dL
  - 태그: 공복, 투약 메트포르민 500mg 1정

### 6. 전체기록 조회

- `/care/records` 이동
- 환자 드롭다운에 7명 전원 표시 (검증테스트환자 포함)
- "검증테스트환자" 선택 → 1건 표시
- 기록 내용: 혈당 120.0 mg/dL, 공복 태그, 투약 태그 정상

### 7. 중복 등록 방지

- "중복테스트" (연락처: 010-9999-8888, 남성) 먼저 등록 → 성공
- "중복시도환자" (연락처: 010-9999-8888) 등록 시도
- 결과: 에러 메시지 "동일한 연락처의 당뇨인이 이미 등록되어 있습니다. (중복테스트)"
- 환자 목록 7명 유지 (8명 아님) → 중복이 실제로 차단됨

### 8. PharmacyPatients 버튼 연결

- **발견**: PharmacyPatients.tsx는 `/pharmacy/patients`가 아닌 **`/store/services`** 경로에 마운트
  - App.tsx L599: `<Route path="services" element={<PharmacyPatients />} />` (under `/store`)
  - `/pharmacy/patients`는 별도 `PharmacistPatientsPage` 컴포넌트
- `/store/services` 접근 → "고객 관리" 제목, 7명 고객 목록, "고객 등록" 버튼 확인
- "고객 등록" 클릭 → `/care/patients` 이동 + 등록 모달 자동 열림
- 모달에 6개 필드 모두 표시

### 9~13. 회귀 검증

| 페이지 | URL | 상태 |
|--------|-----|------|
| Care 대시보드 | `/care` | 정상 — AI Control Tower, KPI(전체 7명, 고위험 0, 주의 0), 우선 관리 3명, 알림 4건 |
| 당뇨인목록 | `/care/patients` | 정상 — 7명 테이블, 위험도 필터, 검색 |
| 분석 | `/care/analysis` | 정상 — 7명 드롭다운, 환자 선택 대기 |
| 코칭 | `/care/coaching` | 정상 — 총 1회, 7명 연결, 기록 표시 |
| 가이드라인 | `/care/guideline` | 정상 — 7개 가이드 섹션 렌더링 |
| 전체기록 | `/care/records` | 정상 — 측정 항목 필터, 날짜 범위, 빈 상태 메시지 |

---

## 발견된 이슈

### P2 — 라우트 정리 (기능 이상 아님)

| # | 내용 | 심각도 |
|---|------|--------|
| 1 | PharmacyPatients.tsx가 `/store/services`에 마운트됨 — "고객 관리" 페이지가 Store 하위에 위치. `/pharmacy/patients`는 별도 `PharmacistPatientsPage`로 다른 UI. 혼동 가능. | P2 |

### 이슈 없음 (Clean)

- 모든 검증 항목 PASS
- 등록 → 상세 → 데이터 입력 → 조회 전체 흐름 정상
- 중복 방지 동작 확인
- Care 하위 모든 페이지 회귀 이상 없음

---

## Conclusion

**WO-O4O-GLYCOPHARM-PHARMACY-PATIENT-REGISTER-FORM-COMPLETE-V1 — 전체 PASS**

13개 검증 항목 모두 통과. 등록 폼 확장(성별/출생연도), 중복 검사, PharmacyPatients 버튼 연결, 등록 후 상세 네비게이션 모두 프로덕션에서 정상 동작 확인.
