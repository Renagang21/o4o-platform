# IR-GLYCOPHARM-WEB-CURRENT-STATE-AUDIT-PHASE2-V1

> **조사 보고서** — GlycoPharm 웹(약사용) Care 도메인 구현 성숙도 정밀 조사
> 조사일: 2026-02-26 | 코드 수정: 없음
> 선행 문서: IR-GLYCOPHARM-WEB-CURRENT-STATE-AUDIT-PHASE1-V1

---

## 요약

Care 도메인 8개 화면 + API 서비스 레이어 + 백엔드 엔티티를 정밀 조사하였다.
**2개 화면 실동작, 2개 Mock, 2개 Placeholder, 2개 부분 동작** 상태이다.

4대 축(혈당/생활/복약/신체건강) 중 **혈당만 백엔드 구현 완료**, 나머지 3축은 미구현이다.

---

## 1. 페이지별 기능 성숙도 표

| 화면 | 파일 | 줄수 | 성숙도 | API 연동 | Mock | Placeholder | 비고 |
|------|------|------|--------|----------|------|-------------|------|
| `/care` | CareDashboardPage.tsx | 318 | **FUNCTIONAL** | 2개 | - | "최근 상담" 컬럼 `-` | 실동작 |
| `/care/patients` | PatientsPage.tsx | 326 | **FUNCTIONAL** | 2개 | - | - | 실동작 + 정렬 |
| `/care/patients/:id` | PatientDetailPage.tsx | 214 | **PARTIAL** | 2개 | - | TIR/CV/코칭횟수 `--` | 헤더 Quick Stats 미연동 |
| `:id` (index) | SummaryTab.tsx | 133 | **FUNCTIONAL** | 0 (context) | - | - | 부모 데이터 소비 |
| `:id/analysis` | AnalysisTab.tsx | 43 | **PLACEHOLDER** | 0 | - | 전체 | "다음 단계에서 구현" |
| `:id/coaching` | CoachingTab.tsx | 173 | **MOCK** | 0 | 3개 세션 | 등록 버튼 | 하드코딩 Mock |
| `:id/history` | HistoryTab.tsx | 216 | **HYBRID** | 0 (context) | 코칭 3개 | - | 분석=실, 코칭=Mock |
| `/care/analysis` | AnalysisPage.tsx | 25 | **PLACEHOLDER** | 0 | - | 전체 | "다음 단계에서 구현" |
| `/care/coaching` | CoachingPage.tsx | 24 | **PLACEHOLDER** | 0 | - | 전체 | "다음 단계에서 구현" |

### 성숙도 분포

| 등급 | 화면 수 | 화면 목록 |
|------|---------|-----------|
| FUNCTIONAL | 3 | CareDashboard, PatientsPage, SummaryTab |
| PARTIAL | 1 | PatientDetailPage (Quick Stats 미연동) |
| MOCK | 1 | CoachingTab |
| HYBRID | 1 | HistoryTab (실데이터+Mock 혼합) |
| PLACEHOLDER | 3 | AnalysisTab, AnalysisPage, CoachingPage |

---

## 2. API 호출 목록

### 2.1 프론트엔드 → 백엔드 API

| 페이지 | API 엔드포인트 | Method | 파라미터 | 응답 타입 | 실호출 | 비고 |
|--------|---------------|--------|----------|-----------|--------|------|
| CareDashboard | `/api/v1/glycopharm/pharmacy/customers` | GET | search, pageSize:100 | `StoreApiResponse<Paginated<PharmacyCustomer>>` | YES | |
| CareDashboard | `/api/v1/care/dashboard` | GET | - | `CareDashboardSummary` (raw) | YES | GlucoseView Care 모듈 bridge |
| PatientsPage | `/api/v1/glycopharm/pharmacy/customers` | GET | search, pageSize:50 | `StoreApiResponse<Paginated<PharmacyCustomer>>` | YES | |
| PatientsPage | `/api/v1/care/dashboard` | GET | - | `CareDashboardSummary` (raw) | YES | |
| PatientDetail | `/api/v1/glycopharm/pharmacy/customers/:id` | GET | id (URL) | `StoreApiResponse<PharmacyCustomer>` | YES | |
| PatientDetail | `/api/v1/care/dashboard` | GET | - | `CareDashboardSummary` (raw) | YES | 전체 summary에서 환자 filter |
| SummaryTab | - | - | - | - | NO | Context 소비 |
| AnalysisTab | - | - | - | - | NO | Placeholder |
| CoachingTab | - | - | - | - | NO | Mock data |
| HistoryTab | - | - | - | - | NO | Context + Mock |
| AnalysisPage | - | - | - | - | NO | Placeholder |
| CoachingPage | - | - | - | - | NO | Placeholder |

### 2.2 백엔드에 존재하지만 프론트에서 미사용 API

| API 엔드포인트 | Method | 기능 | 프론트 연동 |
|---------------|--------|------|------------|
| `/api/v1/care/analysis/:patientId` | GET | CGM 분석 실행 + KPI 스냅샷 저장 | **미연동** |
| `/api/v1/care/kpi/:patientId` | GET | 최근 2개 스냅샷 비교 (TIR/CV 변화) | **미연동** |
| `/api/v1/care/coaching` | POST | 코칭 세션 생성 | **미연동** |
| `/api/v1/care/coaching/:patientId` | GET | 환자별 코칭 세션 목록 | **미연동** |
| `/api/v1/glycopharm/pharmacy/customers/:id/orders` | GET | 환자별 주문 이력 | **미연동** |

### 2.3 API 데이터 구조

```typescript
// CareDashboardSummary (pharmacy.ts:507-519)
interface CareDashboardSummary {
  totalPatients: number;
  highRiskCount: number;
  moderateRiskCount: number;
  lowRiskCount: number;
  recentCoachingCount: number;
  improvingCount: number;
  recentSnapshots: Array<{
    patientId: string;
    riskLevel: string;   // 'high' | 'moderate' | 'low'
    createdAt: string;
  }>;
}

// PharmacyCustomer (pharmacy.ts:160-171)
interface PharmacyCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  diabetesType?: 'type1' | 'type2' | 'gestational' | 'prediabetes';
  lastOrderAt?: string;
  totalOrders: number;
  totalSpent: number;
  status: 'active' | 'inactive';
  createdAt: string;
}
```

---

## 3. 4대 축 구현 체크 매트릭스

### 3.1 축별 구현 현황

| 축 | 수집 | 조회 | 분석 | 코칭 | 성과 | 비고 |
|----|------|------|------|------|------|------|
| **혈당** | O (Mock CGM) | X (프론트 미연동) | O (백엔드 TIR/CV) | X | O (스냅샷 비교) | 백엔드 완료, 프론트 미연동 |
| **생활** | X | X | X | X | X | 전무 |
| **복약** | X | X | X | X | X | 코칭 텍스트에만 언급 |
| **신체건강** | X | X | X | X | X | 전무 |

### 3.2 혈당 축 상세

| 기능 | 백엔드 | 프론트엔드 | 상태 |
|------|--------|-----------|------|
| CGM 데이터 수집 | MockCgmProvider (결정론적 시뮬레이션) | - | Mock Only |
| TIR 계산 | `analyzeReadings()` — 70-180 범위 비율 | AnalysisTab: `--` | 백엔드만 |
| CV 계산 | `(stddev/mean)*100` | AnalysisTab: `--` | 백엔드만 |
| 위험도 판정 | TIR≥70→low, 50-69→moderate, <50→high | 대시보드 배지 표시 | 조회만 연동 |
| 인사이트 생성 | Rule-based (4개 규칙) + AI optional | - | 백엔드만 |
| 스냅샷 저장 | `care_kpi_snapshots` 테이블 | - | 백엔드만 |
| 스냅샷 비교 | 최근 2개 비교 (TIR/CV 변화량) | - | 백엔드만 |

### 3.3 백엔드 엔티티 현황

| 엔티티 | 테이블 | 주요 컬럼 | 용도 |
|--------|--------|-----------|------|
| CareKpiSnapshot | `care_kpi_snapshots` | pharmacy_id, patient_id, tir, cv, risk_level, created_at | 분석 결과 스냅샷 |
| CareCoachingSession | `care_coaching_sessions` | pharmacy_id, patient_id, pharmacist_id, snapshot_id, summary, action_plan, created_at | 코칭 기록 |

---

## 4. 분석 로직 존재 여부 표

| 기능 | 계산 위치 | 클라이언트 | 서버 | 없음 | 비고 |
|------|----------|-----------|------|------|------|
| 평균 혈당 | - | X | X | O | AnalysisTab에 `--` placeholder만 |
| TIR (Time in Range) | 서버 | X | **O** | - | `analysis.engine.ts` — 70-180 범위 % |
| CV (변동계수) | 서버 | X | **O** | - | `analysis.engine.ts` — (stddev/mean)*100 |
| 위험도 판정 | 서버 | X | **O** | - | TIR 기반 3단계 |
| 위험도 배지 표시 | 클라이언트 | **O** | - | - | 서버 응답 riskLevel → 색상 매핑 |
| KPI 비교 (TIR 변화) | 서버 | X | **O** | - | `care-kpi-snapshot.service.ts` |
| 인사이트 생성 | 서버 | X | **O** | - | Rule-based 4규칙 + AI optional |
| 환자 수 집계 | 양쪽 | **O** (fallback) | **O** | - | summary?.totalPatients ?? patients.length |
| 위험도별 환자 수 | 서버 | X | **O** | - | `care_kpi_snapshots` GROUP BY |
| 검색 | 서버 | X | **O** | - | search 파라미터 |
| 위험도 필터링 | 클라이언트 | **O** | X | - | in-memory filter |
| 분석일 정렬 | 클라이언트 | **O** | X | - | snapshot date 기준 sort |
| 코칭 횟수 | 서버 | X | **O** | - | 최근 7일 카운트 |
| 개선율 | 서버 | X | **O** | - | improving TIR 카운트 |

---

## 5. Placeholder 목록

| 위치 | 항목 | 현재 표시 | 필요 데이터 |
|------|------|-----------|------------|
| PatientDetail 헤더 | TIR % | `--` | `/api/v1/care/kpi/:patientId` |
| PatientDetail 헤더 | CV % | `--` | `/api/v1/care/kpi/:patientId` |
| PatientDetail 헤더 | 코칭 횟수 | `--` | `/api/v1/care/coaching/:patientId` |
| AnalysisTab | 혈당 추이 차트 | 빈 차트 아이콘 | CGM 데이터 연동 |
| AnalysisTab | TIR | `--` | `/api/v1/care/analysis/:patientId` |
| AnalysisTab | CV | `--` | `/api/v1/care/analysis/:patientId` |
| AnalysisTab | 평균 혈당 | `--` | `/api/v1/care/analysis/:patientId` |
| CareDashboard 테이블 | 최근 상담 컬럼 | `-` | 코칭 세션 연동 |
| CoachingTab | 새 코칭 기록 버튼 | handler 없음 | `POST /api/v1/care/coaching` |
| AnalysisPage 전체 | 전체 화면 | "다음 단계에서 구현" | 집계 통계 API |
| CoachingPage 전체 | 전체 화면 | "다음 단계에서 구현" | 코칭 세션 API |

---

## 6. 미완성 기능 목록

| # | 기능 | 현재 상태 | 백엔드 준비 | 비고 |
|---|------|----------|------------|------|
| 1 | 환자별 CGM 분석 실행 | 프론트 미연동 | **O** — `/api/v1/care/analysis/:patientId` | 백엔드는 MockCGM으로 동작 |
| 2 | TIR/CV 메트릭 표시 | Placeholder `--` | **O** — 분석 API + KPI 비교 API | AnalysisTab + Detail 헤더 |
| 3 | 코칭 세션 CRUD | Mock 데이터 3개 | **O** — POST/GET 코칭 API | CoachingTab 전체 |
| 4 | 코칭 세션 목록 조회 | Mock 데이터 | **O** — `GET /api/v1/care/coaching/:patientId` | |
| 5 | 히스토리 타임라인 실데이터 | 코칭 부분 Mock | **O** — 코칭 API 연동 시 해결 | |
| 6 | 전역 분석 페이지 | Placeholder 25줄 | **X** — 집계 API 없음 | 환자 전체 통계? |
| 7 | 전역 코칭 페이지 | Placeholder 24줄 | **X** — 전체 세션 조회 API 없음 | 약사 전체 코칭 관리? |
| 8 | 혈당 추이 차트 | 빈 차트 아이콘 | **X** — 시계열 API 없음 | CGM readings 시계열 |
| 9 | 생활 데이터 (운동/수면/식단/스트레스) | 전무 | **X** | 전체 미구현 |
| 10 | 복약 데이터 (순응도/처방) | 전무 | **X** | 전체 미구현 |
| 11 | 신체건강 데이터 (체중/혈압/BMI) | 전무 | **X** | 전체 미구현 |
| 12 | 페이지네이션 UI | 미구현 (pageSize 고정) | **O** — API 지원 | 환자 수 증가 시 필요 |

---

## 7. 기술 부채 추정 목록

| # | 항목 | 심각도 | 설명 |
|---|------|--------|------|
| T1 | CareDashboardSummary 중복 호출 | 낮음 | 3개 페이지가 동일한 `/api/v1/care/dashboard` 호출 — 캐싱/공유 없음 |
| T2 | Risk 데이터 간접 참조 | 중간 | 환자별 risk를 summary의 recentSnapshots에서 find — N이 커지면 비효율 |
| T3 | CareDashboard vs PatientsPage 중복 | 낮음 | 동일 API 호출, 유사 구조 (패턴은 동일하나 컬럼/기능 차이 존재) |
| T4 | Mock 데이터 CoachingTab/HistoryTab 동기화 | 중간 | 두 탭이 동일 Mock 세션을 별도 상수로 유지 — 불일치 위험 |
| T5 | pageSize 하드코딩 | 낮음 | Dashboard=100, Patients=50 — 일관성 없음, 페이지네이션 UI 없음 |
| T6 | 백엔드 API 4개 미연동 | 높음 | 분석/코칭/KPI비교/주문이력 API가 존재하나 프론트에서 미호출 |
| T7 | 전역 Analysis/Coaching 페이지 설계 미정 | 중간 | 환자 집계인지 개별 환자 기반인지 아키텍처 결정 필요 |
| T8 | CGM 벤더 통합 없음 | 높음 | MockCgmProvider만 존재 — 실제 CGM 기기 연동 없음 |

---

## 8. 페이지별 상세 분석

### 8.1 CareDashboardPage (`/care`)

**파일:** `src/pages/care/CareDashboardPage.tsx` (318줄)

**Hook 구성:**
- `useState` × 7: patients, summary, loading, error, searchQuery, debouncedSearch, riskFilter
- `useEffect` × 2: 검색 디바운스 (300ms), 데이터 로딩
- `useCallback` × 1: loadData (API 2개 병렬 호출)
- `useMemo` × 2: snapshotMap (환자별 위험도 O(1) 조회), filteredPatients

**KPI 카드 4개:**

| KPI | 소스 | Fallback |
|-----|------|----------|
| 전체 환자 | `summary?.totalPatients` | `patients.length` |
| 고위험 | `summary?.highRiskCount` | 0 |
| 주의 | `summary?.moderateRiskCount` | 0 |
| 최근 7일 상담 | `summary?.recentCoachingCount` | 0 |

**테이블 5컬럼:** 환자명+전화, 위험도 배지, 최근 분석일, 최근 상담(`-` 고정), Action
**검색:** 서버사이드 (search 파라미터)
**필터:** 클라이언트사이드 (riskFilter in-memory)
**에러 처리:** try/catch + error state + 빨간 배너

### 8.2 PatientsPage (`/care/patients`)

**파일:** `src/pages/care/PatientsPage.tsx` (326줄)

**CareDashboard와 차이점:**

| 기능 | CareDashboard | PatientsPage |
|------|---------------|--------------|
| 테이블 컬럼 | 5 | 8 (당뇨유형, 주문일, 구매액 추가) |
| 정렬 | 없음 | 분석일 기준 asc/desc |
| 헤더 | 단순 타이틀 | 위험도별 칩 요약 |
| pageSize | 100 | 50 |
| "최근 상담" 컬럼 | `-` 고정 | 없음 |

**정렬 우선순위:** analysisDate → lastOrderAt → createdAt (클라이언트사이드)

### 8.3 PatientDetailPage (`/care/patients/:id`)

**파일:** `src/pages/care/PatientDetailPage.tsx` (214줄)

**데이터 로딩:** 2개 API 병렬 호출 (getCustomerDetail + getCareDashboardSummary)
**탭 구조:** React Router Outlet + Context 패턴
**Context Export:** `usePatientDetail()` → { patient, snapshot, loading }

**Quick Stats (모두 Placeholder):**

| 항목 | 현재 표시 | 연동 가능 API |
|------|-----------|-------------|
| TIR % | `--` | `/api/v1/care/kpi/:patientId` |
| CV % | `--` | `/api/v1/care/kpi/:patientId` |
| 코칭 횟수 | `--` | `/api/v1/care/coaching/:patientId` |

### 8.4 SummaryTab (`:id` index)

**파일:** `src/pages/care/patient-tabs/SummaryTab.tsx` (133줄)
**API 호출:** 없음 (Context 소비)

**표시 항목:**
- 현재 위험도 (배지), 최근 분석일, 당뇨 유형, 연락처
- 등록일, 상태, 주문 횟수, 이메일

모든 데이터 실제 API 기반 (부모 Context 경유)

### 8.5 AnalysisTab (`:id/analysis`)

**파일:** `src/pages/care/patient-tabs/AnalysisTab.tsx` (43줄)
**상태:** 완전 Placeholder

**표시 항목 (모두 `--`):**
- 혈당 추이 차트: "CGM 데이터 연동 후 표시됩니다"
- TIR (Time in Range): `--`
- CV (변동계수): `--`
- 평균 혈당: `--`
- 하단: "분석 기능은 다음 단계에서 구현됩니다."

### 8.6 CoachingTab (`:id/coaching`)

**파일:** `src/pages/care/patient-tabs/CoachingTab.tsx` (173줄)
**상태:** Mock 데이터

**Mock 세션 3개:**

| 날짜 | 유형 | 요약 |
|------|------|------|
| 2026-02-18 | 대면 상담 | 식후 혈당 관리 방법 안내, 저녁 식단 조정 권유 |
| 2026-02-12 | 전화 상담 | 복약 순응도 확인, 인슐린 투여 시간 조정 논의 |
| 2026-02-05 | 메시지 | 운동 프로그램 안내 자료 전달 |

**"새 코칭 기록" 버튼:** handler 없음 (`/* placeholder — 향후 modal/form 연결 */`)

### 8.7 HistoryTab (`:id/history`)

**파일:** `src/pages/care/patient-tabs/HistoryTab.tsx` (216줄)
**상태:** Hybrid (실 분석 + Mock 코칭)

**타임라인 이벤트 병합:**
- 분석 이벤트: Context의 snapshot → 1개 (실데이터)
- 코칭 이벤트: MOCK_COACHING_EVENTS → 3개 (Mock)
- 날짜 역순 정렬 후 표시

**필터:** 전체 / 분석 / 코칭

### 8.8 AnalysisPage (`/care/analysis`)

**파일:** `src/pages/care/AnalysisPage.tsx` (25줄)
**상태:** Placeholder — "분석 화면은 다음 단계에서 구현됩니다."
**설계 미정:** 환자 집계 통계인지, 개별 환자 분석 진입인지 결정 필요

### 8.9 CoachingPage (`/care/coaching`)

**파일:** `src/pages/care/CoachingPage.tsx` (24줄)
**상태:** Placeholder — "코칭 화면은 다음 단계에서 구현됩니다."
**설계 미정:** 약사 전체 코칭 관리인지, 예약/일정 관리인지 결정 필요

---

## 9. 백엔드 Care 모듈 상세

### 9.1 분석 엔진

**MockCgmProvider** (`apps/api-server/src/modules/care/mock-cgm.provider.ts`)
- 환자 ID 해시 기반 결정론적 시뮬레이션
- 15분 간격 CGM 리딩 생성
- 식사 스파이크 패턴: 아침(+35), 점심(+30), 저녁(+40)
- 혈당 범위: 40-350 mg/dL (클램핑)

**AnalysisEngine** (`apps/api-server/src/modules/care/analysis.engine.ts`)
- TIR: 70-180 범위 내 비율 (%)
- CV: (표준편차/평균) × 100
- 위험도: TIR≥70→low, 50-69→moderate, <50→high
- 인사이트: 4개 규칙 기반 메시지

### 9.2 백엔드 API 컨트롤러

| 컨트롤러 | 엔드포인트 | 기능 | 프론트 연동 |
|----------|-----------|------|------------|
| care-dashboard | `GET /api/v1/care/dashboard` | 대시보드 요약 (집계) | **O** |
| care-analysis | `GET /api/v1/care/analysis/:patientId` | CGM 분석 실행 + 스냅샷 저장 | **X** |
| care-analysis | `GET /api/v1/care/kpi/:patientId` | 최근 2개 스냅샷 비교 | **X** |
| care-coaching | `POST /api/v1/care/coaching` | 코칭 세션 생성 | **X** |
| care-coaching | `GET /api/v1/care/coaching/:patientId` | 환자별 코칭 세션 목록 | **X** |

### 9.3 KPI 비교 응답 구조

```typescript
interface KpiComparisonDto {
  latestTir: number | null;
  previousTir: number | null;
  tirChange: number | null;
  latestCv: number | null;
  previousCv: number | null;
  cvChange: number | null;
  riskTrend: 'improving' | 'stable' | 'worsening' | null;
}
```

---

## 10. 데이터 흐름 다이어그램

```
[프론트엔드]                              [백엔드]

CareDashboardPage ──GET──→ /pharmacy/customers ──→ DB: glucoseview_customers
       │          ──GET──→ /care/dashboard ──→ DB: care_kpi_snapshots (집계)
       │                                        DB: care_coaching_sessions (카운트)
       ▼
PatientsPage ──────GET──→ /pharmacy/customers
       │          ──GET──→ /care/dashboard
       ▼
PatientDetailPage ─GET──→ /pharmacy/customers/:id
       │          ──GET──→ /care/dashboard (전체→환자 filter)
       │
       ├→ SummaryTab ─── (Context 소비)
       ├→ AnalysisTab ── (PLACEHOLDER — 미연동)
       │                   ╳──→ /care/analysis/:id (백엔드 존재, 미호출)
       │                   ╳──→ /care/kpi/:id (백엔드 존재, 미호출)
       ├→ CoachingTab ── (MOCK — 미연동)
       │                   ╳──→ GET /care/coaching/:id (백엔드 존재, 미호출)
       │                   ╳──→ POST /care/coaching (백엔드 존재, 미호출)
       └→ HistoryTab ─── (Context + MOCK)

AnalysisPage ───── (PLACEHOLDER)
CoachingPage ───── (PLACEHOLDER)
```

---

## 11. 참조된 Work Order

| WO | 영역 | 비고 |
|----|------|------|
| WO-CARE-INTERNAL-NAV-STRUCTURE-V1 | Care 네비게이션 | CareSubNav 4탭 |
| WO-CARE-DATA-ALIGNMENT-PHASE1-V1 | 위험도/분석일 정렬 | Dashboard/Patients |
| WO-CARE-SUMMARY-DATA-ALIGNMENT-V1 | 요약 탭 데이터 | SummaryTab |
| WO-CARE-PATIENT-DETAIL-STRUCTURE-V1 | 환자 상세 탭 구조 | PatientDetailPage |
| WO-CARE-COACHING-FLOW-STRUCTURE-V1 | 코칭 흐름 | CoachingTab |
| WO-CARE-HISTORY-INTEGRATION-V1 | 타임라인 통합 | HistoryTab |
| WO-ORG-RESOLUTION-UNIFICATION-V1 | 조직 ID 스코핑 | 백엔드 미들웨어 |

---

*조사 완료: 2026-02-26*
*코드 수정: 없음*
*다음 단계: Phase 3 — 요구사항 vs 구현 상태 Gap 분석*
