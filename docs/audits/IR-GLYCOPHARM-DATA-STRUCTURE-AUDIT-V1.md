# IR-GLYCOPHARM-DATA-STRUCTURE-AUDIT-V1

> 사업자 정의 혈당관리시스템 화면전개 FLOW 대비 현재 GlycoPharm 시스템 데이터 구조 조사

---

## Executive Summary

| 기능 | 상태 | 재사용률 |
|------|------|---------|
| 개인 설정 관리 | **PARTIAL** | ~40% |
| 데이터 입력 및 조회 | **EXIST** | ~90% |
| 데이터 분석 확인 | **EXIST** | ~95% |
| 약사 코칭 확인 | **EXIST** | ~90% |
| 당뇨 케어 가이드라인 | **NONE** | 0% (CMS 인프라 있음) |

**결론**: 전체를 새로 만들 필요 없음. 데이터 입력/분석/코칭은 이미 구축됨. 개인 설정과 케어 가이드라인만 신규 개발 필요.

---

## 1. 시스템 아키텍처 현황

### 패키지 구조

```
packages/diabetes-core/          ← 순수 건강 데이터 엔티티 (CGM, 코칭, 리포트)
apps/api-server/src/modules/care/ ← 약국 레벨 케어 조정 (KPI, 분석, 알림)
apps/api-server/src/routes/glycopharm/ ← 사업 도메인 (상품, 신청, 청구)
apps/api-server/src/routes/glucoseview/ ← 고객/약사 관리
services/web-glycopharm/          ← 프론트엔드 (110+ 페이지)
services/web-glucoseview/         ← 프론트엔드 (33 페이지)
```

### 데이터 흐름

```
diabetes-core (순수 건강 데이터)
  ↓
care module (약국 스코프 분석/코칭/알림)
  ↓
glycopharm routes (비즈니스 운영)
```

---

## 2. 기능별 상세 조사

### 2.1 개인 설정 관리 — PARTIAL

#### 존재하는 구조

| 엔티티 | 테이블 | 위치 | 필드 |
|--------|-------|------|------|
| GlucoseViewCustomer | `glucoseview_customers` | glucoseview/entities | name, phone, email, birth_year, gender, notes |
| GlucoseViewPharmacist | `glucoseview_pharmacists` | glucoseview/entities | user_id, license_number, real_name, chapter_id |

#### 존재하지 않는 구조

| 필요 데이터 | 상태 | 비고 |
|------------|------|------|
| 생년월일 | PARTIAL | `birth_year`만 존재 (월/일 없음) |
| 성별 | EXIST | `gender` ('male' \| 'female') |
| 키 | NONE | 저장 구조 없음 |
| 몸무게 | PARTIAL | `health_readings`에 metricType='weight'로 저장 가능하나 프로필용 아님 |
| 당뇨 유형 | NONE | Type 1/2/gestational 구분 없음 |
| 치료 방식 | NONE | 인슐린/경구약/식이요법 구분 없음 |
| HbA1c 목표 | NONE | 개인 목표치 없음 |
| 혈당 목표 범위 | PARTIAL | `glucoseview_view_profiles.target_low/high` 존재 (기본 70-180) |

#### API 현황

```
GET  /api/v1/glucoseview/customers          — 고객 목록 (약사 스코프)
POST /api/v1/glucoseview/customers          — 고객 생성
GET  /api/v1/glucoseview/customers/:id      — 고객 상세
PUT  /api/v1/glucoseview/customers/:id      — 고객 수정
```

#### 신규 개발 필요

- **환자 건강 프로필 엔티티**: diabetesType, treatmentMethod, height, weight, targetHbA1c, birthDate(full)
- GlucoseViewCustomer 확장 또는 별도 `patient_health_profiles` 테이블

---

### 2.2 데이터 입력 및 조회 — EXIST

#### 혈당 입력

| 엔티티 | 테이블 | 위치 | 상태 |
|--------|-------|------|------|
| HealthReading | `health_readings` | care/entities | **ACTIVE** |
| CGMReading | `cgm_readings` | diabetes-core | **정의됨** (Mock 데이터만) |
| CGMSession | `cgm_sessions` | diabetes-core | **정의됨** (Mock 데이터만) |

**HealthReading 필드**:
- `patientId`, `metricType` (glucose/bp/weight), `valueNumeric`, `unit` (mg/dL), `measuredAt`, `sourceType` (manual/cgm/device), `pharmacyId`, `metadata` (JSONB)

**CGMReading 필드** (diabetes-core):
- `sessionId`, `userId`, `timestamp`, `glucoseValue`, `glucoseMmol`, `trend`, `trendDirection` (rising_fast/rising/stable/falling/falling_fast), `quality`, `isCalibration`
- Helper: `isInRange()`, `isHypo()`, `isHyper()`, `toMmol()`

**API 현황**:
```
POST /api/v1/care/health-readings          — 수동 혈당 입력 (단건/배치)
GET  /api/v1/care/health-readings/:patientId — 환자 측정값 조회
```

#### 식사 / 운동 / 투약 데이터

| 엔티티 | 테이블 | 위치 | 상태 |
|--------|-------|------|------|
| UserNote | `user_notes` | diabetes-core | **정의됨** |

**UserNote 필드**:
- `noteType`: meal / exercise / medication / insulin / stress / sleep / illness / other
- 식사: `mealType` (breakfast/lunch/dinner/snack), `carbsGrams`, `calories`, `foodItems[]`
- 운동: `exerciseDurationMinutes`, `exerciseIntensity` (light/moderate/vigorous), `exerciseType`
- 투약: `medicationName`, `dosage`, `dosageUnit`
- 인슐린: `insulinType` (rapid/short/intermediate/long/mixed)
- 수면: `sleepDurationMinutes`, `sleepQuality`
- 스트레스: `stressLevel` (1-10)
- 기분: `mood` (very_bad ~ very_good)
- `glucoseAtTime`: 기록 시점 혈당

**현재 상태**: diabetes-core에 엔티티 정의 있으나, **API 미구현**. 프론트엔드 페이지 존재 (`PatientDetailPage` 데이터 탭).

#### CGM 연동

```
CGM_PROVIDER 환경변수:
  'mock'     — MockCgmProvider (기본값, 15분 간격 생성)
  'database' — DatabaseHealthProvider (health_readings 테이블)
  'fallback' — DB 우선, 없으면 Mock
```

**MockCgmProvider**: 결정론적 혈당 시뮬레이션 (환자별 시드, 식사 스파이크, 야간 딥)
**실제 CGM 장비 연동**: 미구현. Provider 인터페이스만 정의.

#### 결론

- 혈당 수동 입력: **완전 구현**
- 식사/운동/투약: **엔티티 있음, API 없음**
- CGM: **Mock 구현, 실제 연동 없음**
- 프론트엔드: `GlucoseInputPage.tsx` 존재

---

### 2.3 데이터 분석 확인 — EXIST

#### 분석 엔진

| 컴포넌트 | 위치 | 상태 |
|---------|------|------|
| Analysis Engine | `care/domain/analysis/` | **ACTIVE** |
| DailyMetrics | diabetes-core | **정의됨** |
| PatternAnalysis | diabetes-core | **정의됨** |
| DiabetesReport | diabetes-core | **정의됨** |
| CareLlmInsight | care/entities | **ACTIVE** (Gemini API) |
| CareKpiSnapshot | care/entities | **ACTIVE** |

#### Analysis Engine 메트릭

```
TIR (Time in Range)    — 70-180 mg/dL 범위 내 비율
CV (Coefficient of Variation) — 변동성 지표
Risk Level             — low (TIR≥70) / moderate (50-69) / high (<50)
```

#### DailyMetrics 엔티티 (diabetes-core)

```
통계: meanGlucose, medianGlucose, minGlucose, maxGlucose, stdDev
TIR: tirPercent, tirBelowPercent, tirAbovePercent, tirSevereBelowPercent, tirSevereAbovePercent
변동성: cv, mage, gmi (HbA1c 추정치)
이벤트: hypoEvents, hyperEvents, hypoMinutes, hyperMinutes
시간대: hourlyMeans, avgPostMealPeak, avgTimeToPostMealPeak
```

#### PatternAnalysis 엔티티 (diabetes-core)

```
패턴: recurring_hypo, recurring_hyper, post_meal_spike, nocturnal_hypo,
      dawn_phenomenon, exercise_drop, weekend_pattern, time_of_day_pattern,
      meal_response_pattern, high_variability
신뢰도: low/medium/high + confidenceScore (0-100)
추천: lifestyle/medication/monitoring/consultation (priority 포함)
```

#### DiabetesReport 엔티티 (diabetes-core)

```
유형: weekly, biweekly, monthly, quarterly, custom
요약: summaryMetrics (avgGlucose, tir, cv, gmi, hypo/hyper)
비교: comparison (이전 기간 대비 변화, trend: improving/stable/worsening)
일별: dailyData[]
시간대: hourlyAverages
패턴: patternsSummary[]
권장: recommendations[]
목표: goalAchievement
약사 리뷰: pharmacistComment
PDF: pdfUrl, sentAt, viewedAt
```

#### API 현황

```
GET  /api/v1/care/analysis/:patientId       — CGM 분석 (TIR, CV, Risk + AI Insight)
GET  /api/v1/care/kpi/:patientId            — KPI 스냅샷 비교
GET  /api/v1/care/risk-patients             — 고위험 환자 탐지
GET  /api/v1/care/priority-patients         — 우선순위 환자
GET  /api/v1/care/population-dashboard      — 약국 전체 통계
```

#### 프론트엔드

```
services/web-glycopharm/src/pages/care/
  CareDashboardPage.tsx       — 케어 대시보드 (KPI 요약)
  PatientsPage.tsx            — 환자 목록 (위험도 필터)
  PatientDetailPage.tsx       — 환자 상세 (탭)
  patient-tabs/SummaryTab.tsx — 최신 KPI
  patient-tabs/AnalysisTab.tsx — TIR/CV/Risk 차트 + AI
  patient-tabs/HistoryTab.tsx — KPI 타임라인
  AnalysisPage.tsx            — 배치 분석
```

#### 결론

- 혈당 분석: **완전 구현** (TIR, CV, Risk, AI Insight)
- 패턴 분석: **엔티티 정의됨** (실시간 분석 부분 구현)
- 일일 통계: **엔티티 정의됨** (집계 로직 필요)
- 리포트 생성: **엔티티 정의됨** (PDF 생성 미구현)

---

### 2.4 약사 코칭 확인 — EXIST

#### 엔티티 구조

| 엔티티 | 테이블 | 위치 | 상태 |
|--------|-------|------|------|
| CoachingSession | `coaching_sessions` | diabetes-core | **정의됨** |
| CoachingMessage | `coaching_messages` | diabetes-core | **정의됨** |
| CareCoachingSession | `care_coaching_sessions` | care/entities | **ACTIVE** (DB 생성됨) |
| CareCoachingDraft | `care_coaching_drafts` | care/entities | **ACTIVE** (AI 생성) |
| CareLlmInsight | `care_llm_insights` | care/entities | **ACTIVE** |

#### CoachingSession 필드 (diabetes-core)

```
sessionType: initial / followup / urgent / routine / report_review
status: scheduled / in_progress / completed / cancelled / no_show
mode: in_person / phone / video / chat / async
topicsDiscussed[], actionItems[] (patient/pharmacist), patientDataSnapshot
```

#### CoachingMessage 필드 (diabetes-core)

```
sender: patient / pharmacist / system
messageType: text / image / file / glucose_data / recommendation / alert
recommendation: { category, priority, actionable }
glucoseReference: { date, metrics, eventIds }
```

#### CareCoachingSession 필드 (care module)

```
pharmacyId, patientId, pharmacistId, snapshotId
summary (TEXT), actionPlan (TEXT)
```

#### CareCoachingDraft 필드 (care module)

```
patientId, snapshotId, pharmacyId
draftMessage (TEXT) — AI 생성
status: draft / approved / discarded
```

#### API 현황

```
POST /api/v1/care/coaching                  — 코칭 세션 생성
GET  /api/v1/care/coaching/:patientId       — 환자 코칭 이력
GET  /api/v1/care/coaching-drafts/:patientId — AI 코칭 초안 조회
POST /api/v1/care/coaching-drafts/:id/approve — 초안 승인 → 세션 생성
GET  /api/v1/care/llm-insight/:patientId    — AI 인사이트
```

#### AI 코칭 흐름

```
1. 분석 실행 (GET /care/analysis/:patientId)
2. 자동: KPI 스냅샷 저장
3. 자동: LLM 인사이트 생성 (Gemini API)
4. 자동: 코칭 초안 생성 (draftMessage)
5. 자동: 알림 평가 (care_alerts)
6. 약사 리뷰: 초안 확인 → 승인/수정
7. 코칭 세션 기록
```

#### 프론트엔드

```
services/web-glycopharm/src/pages/care/
  CoachingPage.tsx              — 코칭 관리
  patient-tabs/CoachingTab.tsx  — 환자별 코칭 탭
```

#### 결론

- 약사 → 환자 코칭: **완전 구현** (API + UI + AI 초안)
- 환자 → 약사 메시지: **엔티티 있음** (CoachingMessage), API 미구현
- AI 코칭 추천: **ACTIVE** (Gemini API 연동)

---

### 2.5 당뇨 케어 가이드라인 — NONE

#### 현재 상태

- 전용 당뇨 교육 콘텐츠 엔티티: **없음**
- 케어 가이드라인 테이블: **없음**
- CMS 시스템: **존재** (CustomPostType 기반)
- LMS 모듈: **존재** (템플릿/블록 기반 콘텐츠)

#### 활용 가능한 인프라

| 시스템 | 위치 | 재사용 가능성 |
|--------|------|-------------|
| CMS CustomPostType | `modules/cms/` | CPT "DiabetesCareGuide" 정의 가능 |
| LMS Template/Block | `modules/lms/` | 블록 기반 교육 콘텐츠 저장 가능 |
| Store Content | `modules/lms/StoreContent` | 매장별 콘텐츠 배포 가능 |
| Content Core | `packages/content-core/` | 단일 출처 원칙 |

#### 신규 개발 필요

- 당뇨 케어 가이드라인 콘텐츠 구조 설계
- CMS CPT 또는 LMS 템플릿 활용 결정
- 환자 앱에서의 콘텐츠 소비 UX

---

## 3. 추가 조사 결과

### CGM 데이터

| 항목 | 상태 | 비고 |
|------|------|------|
| CGMSession | 정의됨 | diabetes-core 엔티티 (deviceType, sensorId, status) |
| CGMReading | 정의됨 | 5분 간격, glucose/trend/quality |
| CGMEvent | 정의됨 | hypo/hyper/rapid_rise/fall/meal_response/dawn |
| 실제 연동 | 미구현 | MockCgmProvider만 활성 |

### 식사 데이터

| 항목 | 상태 | 비고 |
|------|------|------|
| UserNote (meal) | 정의됨 | mealType, carbsGrams, calories, foodItems[] |
| API | 미구현 | 엔티티만 존재 |
| 프론트엔드 | 미구현 | 데이터 입력 UI 없음 |

### 운동 데이터

| 항목 | 상태 | 비고 |
|------|------|------|
| UserNote (exercise) | 정의됨 | duration, intensity, exerciseType |
| API | 미구현 | 엔티티만 존재 |
| 프론트엔드 | 미구현 | 데이터 입력 UI 없음 |

---

## 4. 알림 시스템 현황

| 엔티티 | 테이블 | 상태 | 기능 |
|--------|-------|------|------|
| CareAlert | `care_alerts` | **ACTIVE** | 위험도 기반 자동 알림 |
| CGMEvent | `cgm_events` | 정의됨 | 저혈당/고혈당 이벤트 |

**CareAlert 유형**: high_hypo_risk, poor_control 등
**CareAlert 심각도**: critical / warning / info
**CareAlert 상태**: open → acknowledged → resolved

**API**:
```
GET   /api/v1/care/alerts              — 활성 알림 조회
PATCH /api/v1/care/alerts/:id/ack      — 확인 처리
PATCH /api/v1/care/alerts/:id/resolve  — 해결 처리
```

---

## 5. 프론트엔드 페이지 현황

### GlycoPharm 환자 페이지 (services/web-glycopharm)

| 페이지 | 파일 | 상태 |
|--------|------|------|
| 환자 프로필 | `pages/patient/ProfilePage.tsx` | 존재 |
| 혈당 입력 | `pages/patient/GlucoseInputPage.tsx` | 존재 |
| 데이터 분석 | `pages/patient/DataAnalysisPage.tsx` | 존재 |
| 약사 코칭 | `pages/patient/PharmacistCoachingPage.tsx` | 존재 |
| 케어 가이드 | `pages/patient/CareGuidelinePage.tsx` | 존재 |

### GlycoPharm 케어 페이지 (약사용)

| 페이지 | 파일 | 상태 |
|--------|------|------|
| 케어 대시보드 | `pages/care/CareDashboardPage.tsx` | 활성 |
| 환자 목록 | `pages/care/PatientsPage.tsx` | 활성 |
| 환자 상세 | `pages/care/PatientDetailPage.tsx` | 활성 |
| 분석 | `pages/care/AnalysisPage.tsx` | 활성 |
| 코칭 | `pages/care/CoachingPage.tsx` | 활성 |

---

## 6. 재사용 가능한 서비스

| 서비스 | 위치 | 기능 |
|--------|------|------|
| CareAnalysisController | `care/controllers/care-analysis.controller.ts` | TIR/CV/Risk 분석 |
| CareDashboardController | `care/controllers/care-dashboard.controller.ts` | 대시보드 집계 |
| CareCoachingController | `care/controllers/care-coaching.controller.ts` | 코칭 CRUD |
| HealthReadingsController | `care/controllers/health-readings.controller.ts` | 건강 데이터 입력 |
| CareLlmInsightService | `care/services/` | AI 인사이트 생성 |
| CareCoachingDraftService | `care/services/` | AI 코칭 초안 |
| CareAlertService | `care/services/` | 알림 엔진 |
| CareKpiSnapshotService | `care/services/` | KPI 스냅샷 |
| MockCgmProvider | `care/infrastructure/provider/` | CGM 시뮬레이션 |
| AnalysisEngine | `care/domain/analysis/` | 혈당 분석 엔진 |

---

## 7. 신규 개발 필요 영역

### 7.1 환자 건강 프로필 (신규)

**필요 엔티티**: `patient_health_profiles`
```
diabetesType:    type1 / type2 / gestational / prediabetes
treatmentMethod: insulin / oral / diet / combined
height:          cm
weight:          kg
targetHbA1c:     %
targetGlucoseLow:  mg/dL
targetGlucoseHigh: mg/dL
birthDate:       full date (기존 birth_year 확장)
```

### 7.2 식사/운동/투약 API (신규)

**UserNote CRUD API** — diabetes-core 엔티티 활용:
```
POST /api/v1/care/notes       — 기록 생성
GET  /api/v1/care/notes       — 기록 목록
GET  /api/v1/care/notes/:id   — 기록 상세
PUT  /api/v1/care/notes/:id   — 기록 수정
DELETE /api/v1/care/notes/:id — 기록 삭제
```

### 7.3 당뇨 케어 가이드라인 (신규)

**방안 A**: CMS CPT 활용 — `CustomPostType = 'diabetes_care_guide'`
**방안 B**: LMS 템플릿 활용 — 블록 기반 교육 콘텐츠
**방안 C**: 별도 care_guidelines 테이블

### 7.4 실제 CGM 연동 (미래)

`CgmProvider` 인터페이스 구현체 교체만으로 가능 (Provider 패턴 준비됨)

---

## 8. 다음 단계 권장

| WO | 범위 | 신규/재사용 |
|----|------|-----------|
| WO-GLYCOPHARM-PATIENT-MAIN-SCREEN-V1 | 환자 메인 화면 + 건강 프로필 | **신규 50%** (프로필 엔티티) + 재사용 (기존 환자 페이지) |
| WO-GLYCOPHARM-GLUCOSE-INPUT-V1 | 혈당 입력 개선 + 식사/운동 API | **신규 30%** (UserNote API) + 재사용 (HealthReading) |
| WO-GLYCOPHARM-DATA-ANALYSIS-V1 | 분석 화면 + 리포트 | **재사용 90%** (분석 엔진 + AI 인사이트 활성) |
| WO-GLYCOPHARM-PHARMACIST-COACHING-V1 | 코칭 화면 개선 | **재사용 90%** (코칭 + AI 초안 활성) |
| WO-GLYCOPHARM-CARE-GUIDELINE-V1 | 케어 가이드라인 | **신규 80%** (콘텐츠 구조 + 소비 UX) |

---

*작성일: 2026-03-12*
*조사 범위: api-server, web-glycopharm, web-glucoseview, diabetes-core, care module*
*상태: Complete*
