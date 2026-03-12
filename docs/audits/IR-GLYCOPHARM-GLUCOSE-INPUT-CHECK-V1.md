# IR-GLYCOPHARM-GLUCOSE-INPUT-CHECK-V1

> **WO-GLYCOPHARM-GLUCOSE-INPUT-V1 사전 기술 확인 조사**
>
> 조사일: 2026-03-12
> 범위: 혈당 입력 UI, HealthReading 엔티티/API, UserNote 엔티티/API 현황

---

## 요약 테이블

| 항목 | 상태 | 비고 |
|------|------|------|
| GlucoseInputPage (환자 페이지) | **PLACEHOLDER** | "준비 중입니다" — 비즈니스 로직 없음 |
| DataTab (약사 워크스페이스) | **ACTIVE** | 혈당/혈압/체중 입력 가능, 식전·식후 선택 없음 |
| HealthReading Entity | **ACTIVE** | `health_readings` 테이블, metadata JSONB untyped |
| HealthReading API | **ACTIVE** | POST(단일/배치) + GET(필터), pharmacy-scoped |
| UserNote Entity | **EXISTS (미배포)** | `diabetes_user_notes` 테이블 — diabetes-core dist/에만 존재 |
| UserNote API (LifestyleController) | **EXISTS (미배포)** | CRUD 완비, api-server 미등록 |
| 식전/식후 구분 | **NONE** | HealthReading·DataTab 모두 없음 |
| 생활 기록 (식사/운동/약물) | **NONE (배포 안됨)** | UserNote 구조 있으나 api-server 연결 안됨 |

---

## 1. 프론트엔드 UI 현황

### 1.1 환자 페이지 (patient/*)

5개 환자 페이지 모두 **플레이스홀더** 상태:

| 페이지 | 파일 | 상태 |
|--------|------|------|
| 프로필 관리 | `services/web-glycopharm/src/pages/patient/ProfilePage.tsx` | PLACEHOLDER |
| 데이터 입력 | `services/web-glycopharm/src/pages/patient/GlucoseInputPage.tsx` | PLACEHOLDER |
| 데이터 분석 | `services/web-glycopharm/src/pages/patient/DataAnalysisPage.tsx` | PLACEHOLDER |
| 약사 코칭 | `services/web-glycopharm/src/pages/patient/PharmacistCoachingPage.tsx` | PLACEHOLDER |
| 케어 가이드라인 | `services/web-glycopharm/src/pages/patient/CareGuidelinePage.tsx` | PLACEHOLDER |

각 페이지 구조: 아이콘 + 제목 + "이 페이지는 준비 중입니다" + "돌아가기" 버튼

### 1.2 DataTab (약사 케어 워크스페이스)

**파일**: `services/web-glycopharm/src/pages/care/patient-tabs/DataTab.tsx`

약사가 환자 상세 페이지에서 건강 데이터를 입력하는 **실제 활성 UI**.

**지원 측정 항목** (METRIC_OPTIONS):
| 값 | 라벨 | 단위 |
|----|------|------|
| `glucose` | 혈당 | mg/dL |
| `blood_pressure_systolic` | 수축기 혈압 | mmHg |
| `blood_pressure_diastolic` | 이완기 혈압 | mmHg |
| `weight` | 체중 | kg |

**입력 필드**:
- 측정 항목 (select)
- 측정값 (number, step=0.1)
- 측정 일시 (datetime-local)
- 저장 버튼

**누락 필드**:
- 식전/식후 선택 없음
- 메모/비고 입력 없음
- metadata 전달 없음 (API는 metadata 필드 지원하지만 UI에서 사용 안함)

**API 호출**:
- POST: `pharmacyApi.postHealthReading({ patientId, metricType, valueNumeric, unit, measuredAt })`
- GET: `pharmacyApi.getHealthReadings(patientId)`

### 1.3 환자 상세 페이지 탭 구조

**파일**: `services/web-glycopharm/src/pages/care/PatientDetailPage.tsx`

| 탭 | 컴포넌트 | 설명 |
|----|----------|------|
| 데이터 | DataTab | 건강 데이터 입력/조회 |
| 분석 | AnalysisTab | AI 분석 결과 |
| 코칭 | CoachingTab | 코칭 세션 관리 |
| 기록 | HistoryTab | 코칭 이력 |

---

## 2. HealthReading 엔티티 상세

**파일**: `apps/api-server/src/modules/care/entities/health-reading.entity.ts`
**테이블**: `health_readings`

| 컬럼 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| id | uuid (PK) | auto | |
| patient_id | uuid | - | 환자 ID (인덱스) |
| metric_type | varchar(50) | `'glucose'` | 측정 항목 |
| value_numeric | numeric(10,2) | null | 측정값 |
| value_text | text | null | 텍스트 값 (미사용) |
| unit | varchar(20) | `'mg/dL'` | 단위 |
| measured_at | timestamptz | - | 측정 시각 |
| source_type | varchar(30) | `'manual'` | 입력 방식 |
| created_by | uuid | null | 입력자 (서버 강제) |
| **metadata** | **jsonb** | `'{}'` | **비구조화 확장 필드** |
| pharmacy_id | uuid | - | 약국 ID (인덱스, 서버 강제) |
| created_at | timestamptz | auto | |

### metadata 필드 분석

- 타입: `Record<string, unknown>` — **스키마 정의 없음**
- 현재 사용: 빈 객체 `{}` (DataTab에서 metadata 미전달)
- API는 `item.metadata || {}` 로 수용 가능
- **식전/식후 정보를 metadata에 저장 가능** (예: `{ mealTiming: 'before_meal' }`)

### 인덱스

- `patient_id` + `measured_at` 복합 인덱스
- `pharmacy_id` 인덱스

### 서버 강제 필드

| 필드 | 강제값 | 검증 위치 |
|------|--------|----------|
| createdBy | `pcReq.user?.id` | controller (line 27) |
| pharmacyId | `pcReq.pharmacyId` | PharmacyContextMiddleware |
| sourceType | `'manual'` | controller (line 72) |

**마이그레이션**: `20260306120000-CreateHealthReadings.ts`

---

## 3. HealthReading API 상세

**파일**: `apps/api-server/src/modules/care/controllers/health-readings.controller.ts`
**마운트**: `/api/v1/care` (main.ts dynamic import)

### POST /api/v1/care/health-readings

단일 또는 배치 입력:
- 단일: `{ patientId, metricType, valueNumeric, unit, measuredAt, metadata }`
- 배치: `{ readings: [{ ... }, { ... }] }` (자동 감지)

**필수 필드**: patientId, valueNumeric, measuredAt
**선택 필드**: metricType(기본 'glucose'), unit(기본 'mg/dL'), valueText, metadata

**미들웨어**: authenticate → requirePharmacyContext
**응답**: 201 + 저장된 엔티티(단일 또는 배열)

### GET /api/v1/care/health-readings/:patientId

**쿼리 파라미터**:
- `metricType` — 측정 항목 필터
- `from` — 시작일
- `to` — 종료일

**정렬**: measured_at DESC
**Scope**: pharmacy_id 강제 (PharmacyContextMiddleware)

---

## 4. UserNote 엔티티 상세

**패키지**: `@o4o/diabetes-core` (dist/ only, 소스 없음)
**파일**: `packages/diabetes-core/dist/backend/entities/UserNote.entity.d.ts`
**테이블**: `diabetes_user_notes`

### 필드 정의

| 필드 | 타입 | 용도 |
|------|------|------|
| id | string (uuid) | PK |
| userId | string (uuid) | 사용자 ID |
| noteType | NoteType | 'meal' \| 'exercise' \| 'medication' \| 'insulin' \| 'stress' \| 'sleep' \| 'illness' \| 'other' |
| timestamp | Date | 기록 시각 |
| content | string? | 자유 텍스트 메모 |
| **mealType** | MealType? | 'breakfast' \| 'lunch' \| 'dinner' \| 'snack' |
| **carbsGrams** | number? | 탄수화물(g) |
| **calories** | number? | 칼로리 |
| **foodItems** | Array<{name, amount?, carbs?}>? | 음식 항목 |
| **exerciseDurationMinutes** | number? | 운동 시간(분) |
| **exerciseIntensity** | ExerciseIntensity? | 'light' \| 'moderate' \| 'vigorous' |
| **exerciseType** | string? | 운동 종류 |
| **medicationName** | string? | 약물 이름 |
| **dosage** | number? | 복용량 |
| **dosageUnit** | string? | 복용 단위 |
| **insulinType** | string? | 'rapid' \| 'short' \| 'intermediate' \| 'long' \| 'mixed' |
| **sleepDurationMinutes** | number? | 수면 시간(분) |
| **sleepQuality** | string? | 'poor' \| 'fair' \| 'good' \| 'excellent' |
| **stressLevel** | number? | 스트레스 수준 |
| **mood** | string? | 'very_bad' \| 'bad' \| 'neutral' \| 'good' \| 'very_good' |
| **glucoseAtTime** | number? | 기록 시점 혈당 |
| tags | string[]? | 태그 |
| metadata | Record<string, unknown>? | 확장 필드 |
| createdAt | Date | 생성일 |
| updatedAt | Date | 수정일 |

### 헬퍼 메서드

- `isMeal()` — noteType === 'meal'
- `isExercise()` — noteType === 'exercise'
- `isInsulin()` — noteType === 'insulin'

### diabetes-core 전체 엔티티 목록

| 엔티티 | 설명 |
|--------|------|
| UserNote | 생활 기록 |
| CGMSession | CGM 세션 |
| CGMReading | CGM 측정값 |
| CGMEvent | CGM 이벤트 |
| CoachingSession | 코칭 세션 |
| CoachingMessage | 코칭 메시지 |
| DailyMetrics | 일일 메트릭 |
| PatternAnalysis | 패턴 분석 |
| DiabetesReport | 리포트 |

---

## 5. LifestyleController (UserNote API) 상세

**파일**: `packages/diabetes-core/dist/backend/controllers/LifestyleController.js`
**예정 마운트**: `/api/v1/diabetes/lifestyle` (미등록)

### API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | /diabetes/lifestyle | 생활 기록 추가 |
| GET | /diabetes/lifestyle/:userId | 사용자 기록 조회 |
| GET | /diabetes/lifestyle/note/:noteId | 단건 조회 |
| PUT | /diabetes/lifestyle/note/:noteId | 수정 |
| DELETE | /diabetes/lifestyle/note/:noteId | 삭제 |

### 생성 시 수용 필드

controller가 `req.body`에서 직접 매핑하는 필드:
- noteType, timestamp, content
- mealType, carbsGrams, calories, foodItems
- exerciseDurationMinutes, exerciseIntensity, exerciseType
- medicationName, dosage, dosageUnit, insulinType
- sleepDurationMinutes, sleepQuality
- stressLevel, mood, glucoseAtTime, tags

### userId 결정

```javascript
const userId = req.params.userId || req.user?.id;
```

> **주의**: PharmacyContextMiddleware 미적용. 현재 코드는 약국 스코핑이 없음.

---

## 6. api-server 통합 상태

### 현재 등록 상태

| 항목 | connection.ts | migration | route mount | 상태 |
|------|:------------:|:---------:|:-----------:|:----:|
| HealthReading | YES | YES | YES (`/api/v1/care`) | **ACTIVE** |
| UserNote | NO | NO | NO | **미배포** |
| LifestyleController | - | - | NO | **미배포** |

### UserNote 배포에 필요한 작업

1. **connection.ts**: `DiabetesCoreEntities` (또는 `UserNote`) 엔티티 등록
2. **Migration**: `diabetes_user_notes` 테이블 생성 (20+ 컬럼)
3. **Route mount**: LifestyleController 라우터를 api-server에 마운트
4. **PharmacyContext 적용**: 현재 LifestyleController에 약국 스코핑 없음 — 추가 필요
5. **소스 코드 문제**: diabetes-core는 dist/ only (소스 없음) — 수정 시 새로운 구현 필요

---

## 7. 데이터 구조 설계 옵션 분석

### Option A: HealthReading metadata 확장

기존 `health_readings.metadata` JSONB 필드를 활용하여 식전/식후 정보 저장.

```typescript
// 혈당 입력 시 metadata에 mealTiming 추가
{
  patientId: "...",
  metricType: "glucose",
  valueNumeric: 120,
  measuredAt: "2026-03-12T08:00:00Z",
  metadata: {
    mealTiming: "before_meal",  // 'before_meal' | 'after_meal' | 'fasting' | 'bedtime' | 'random'
    mealTimingLabel: "식전"
  }
}
```

**장점**:
- 기존 테이블/API 변경 최소
- metadata는 이미 JSONB로 수용 가능
- DataTab UI만 수정하면 즉시 사용 가능
- 분석 엔진(care-analysis)이 metadata 접근 가능

**단점**:
- 스키마 없음 → 타입 안전성 부재
- metadata 쿼리 시 JSONB 연산 필요 (`metadata->>'mealTiming'`)
- 식사/운동 등 생활 기록을 담기엔 구조 부족

### Option B: UserNote 테이블 활성화

diabetes-core의 `diabetes_user_notes` 테이블을 api-server에 등록.

**장점**:
- 정규화된 스키마 (20+ 전용 컬럼)
- 식사/운동/약물/인슐린/수면/스트레스 모두 타입 안전
- LifestyleController CRUD 이미 구현됨
- 향후 환자 앱에서도 재사용 가능

**단점**:
- Migration 필요 (새 테이블 생성)
- PharmacyContext 미적용 → 보안 계층 추가 필요
- 소스 없음 → controller 재구현 또는 dist/ 직접 사용
- HealthReading과 UserNote 간 데이터 분리 → 분석 엔진 연동 필요

### Option C: 혼합 접근 (권장 후보)

- **혈당 측정값** → HealthReading (metadata에 mealTiming 추가)
- **생활 기록(식사/운동/약물)** → UserNote 신규 활성화

**장점**: 각 테이블이 본래 목적에 맞게 사용됨
**단점**: 두 테이블 모두 작업 필요

---

## 8. 프론트엔드 API 클라이언트 현황

**파일**: `services/web-glycopharm/src/api/pharmacy.ts`

### HealthReading 관련 메서드 (활성)

| 메서드 | 설명 |
|--------|------|
| `postHealthReading(data)` | 건강 데이터 입력 |
| `getHealthReadings(patientId, params?)` | 건강 데이터 조회 (metricType, from, to 필터) |

### postHealthReading 시그니처

```typescript
async postHealthReading(data: {
  patientId: string;
  metricType?: string;
  valueNumeric: number;
  unit?: string;
  measuredAt: string;
  metadata?: Record<string, unknown>;  // ← metadata 필드 이미 존재
}): Promise<HealthReadingDto>
```

> `metadata` 필드가 이미 API 클라이언트에 정의되어 있어, 식전/식후 정보를 즉시 전달 가능

### UserNote 관련 메서드

없음. pharmacy.ts에 UserNote/Lifestyle API 호출 메서드 미정의.

---

## 9. 결론 및 WO 수행 권장사항

### 즉시 가능한 작업 (Option A — metadata 확장)

1. **DataTab.tsx에 식전/식후 선택 UI 추가** — select 또는 radio
2. **postHealthReading 호출 시 metadata에 mealTiming 포함**
3. **최근 기록 테이블에 mealTiming 컬럼 표시**
4. **API 변경 불필요** — metadata JSONB 이미 수용

### 중기 작업 (Option B — UserNote 활성화)

1. Migration: `diabetes_user_notes` 테이블 생성
2. connection.ts에 UserNote 엔티티 등록
3. LifestyleController 재구현 (PharmacyContext 적용)
4. pharmacy.ts에 lifestyle API 메서드 추가
5. GlucoseInputPage 또는 DataTab에 생활 기록 입력 UI 추가

### WO-GLYCOPHARM-GLUCOSE-INPUT-V1 추천 범위

**Phase 1** (최소 변경, 즉시 배포 가능):
- DataTab에 식전/식후 선택 추가 → metadata.mealTiming
- GlucoseInputPage: 아직 플레이스홀더 유지 (환자 앱은 별도 WO)

**Phase 2** (UserNote 통합, 별도 WO):
- WO-GLYCOPHARM-LIFESTYLE-RECORDING-V1 으로 분리 권장
- UserNote 테이블 활성화 + 식사/운동/약물 기록 UI

---

*Generated: 2026-03-12*
*Status: Complete*
