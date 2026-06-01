# IR-O4O-GLYCOPHARM-CARE-DATA-INPUT-STRUCTURE-AUDIT-V1

> 작성: 2026-03-25
> 조사 방법: 코드 정적 분석 (Backend + Frontend)

---

## 1. 입력 항목 목록

| # | 항목 | metricType | 저장 위치 | 상태 |
|---|------|-----------|----------|------|
| 1 | 혈당 | `glucose` | `health_readings.value_numeric` | **구현 완료** |
| 2 | 수축기 혈압 | `blood_pressure_systolic` | `health_readings.value_numeric` | **구현 완료** |
| 3 | 이완기 혈압 | `blood_pressure_diastolic` | `health_readings.value_numeric` | **구현 완료** |
| 4 | 체중 | `weight` | `health_readings.value_numeric` | **구현 완료** |
| 5 | 투약 | — | `health_readings.metadata.medication` | **메타데이터 저장** |
| 6 | 운동 | — | `health_readings.metadata.exercise` | **메타데이터 저장** |
| 7 | 증상 | — | `health_readings.metadata.symptoms` | **메타데이터 저장** |
| 8 | 식사 | — | — | **미구현** |
| 9 | HbA1c | `a1c` | `health_readings.value_numeric` | 인프라만 있음 (UI 없음) |

---

## 2. 각 항목 데이터 구조

### 혈당 (glucose)

```
value_numeric: number (mg/dL, 범위 20-600)
unit: 'mg/dL'
metadata: {
  mealTiming?: 'fasting' | 'before_meal' | 'after_meal' | 'bedtime' | 'random'
  mealTimingLabel?: string  // 한국어 라벨
}
```

### 수축기/이완기 혈압 (blood_pressure_systolic / diastolic)

```
value_numeric: number (mmHg)
unit: 'mmHg'
metadata: {}  // 맥락 정보 없음
```

참고: 레거시 포맷 `blood_pressure` + `value_text = "130/80"` 도 읽기 지원 (호환)

### 체중 (weight)

```
value_numeric: number (kg)
unit: 'kg'
metadata: {}  // 맥락 정보 없음
```

### 투약 (medication) — 메타데이터 only

```
metadata.medication: {
  name: string       // 약품명
  dose: string       // 용량 (텍스트)
  takenAt: string    // 복용 시간 (ISO datetime)
}
```

**별도 테이블/metricType 없음** — 혈당 등 주 측정값에 부착되는 부가 정보

### 운동 (exercise) — 메타데이터 only

```
metadata.exercise: {
  type: string       // 'walking'|'running'|'cycling'|'swimming'|'strength'|'yoga'|'other'
  duration: number   // 분 (1-600)
  intensity: string  // 'light'|'moderate'|'vigorous'
}
```

**별도 테이블/metricType 없음**

### 증상 (symptoms) — 메타데이터 only

```
metadata.symptoms: string[]
// ['어지러움','식은땀','손떨림','피로','두통','갈증','기타']
```

**별도 테이블/metricType 없음**

### 식사 — 미구현

mealTiming(공복/식전/식후 등)만 존재. 식사 내용/영양 데이터 없음.

---

## 3. 입력 주체 구조

| 필드 | 존재 여부 | 설정 방식 | 비고 |
|------|----------|----------|------|
| `patient_id` | **있음** | Pharmacy: 요청 body / Patient: 인증 유저 강제 | 필수 |
| `pharmacy_id` | **있음** (nullable) | Pharmacy: 미들웨어 강제 / Patient: email 룩업 | 약국 연동 |
| `created_by` | **있음** | 인증 유저 ID 강제 | 클라이언트 입력 무시 |
| `source_type` | **있음** | 엔드포인트별 강제 | `'manual'` 또는 `'patient_self'` |
| `measured_at` | **있음** | 클라이언트 제출 | ISO 8601 |

### 입력 경로 2개

| 경로 | 엔드포인트 | 주체 | sourceType |
|------|----------|------|-----------|
| 약사 입력 | `POST /api/v1/care/health-readings` | 약사 (pharmacy context) | `manual` |
| 환자 자가 입력 | `POST /api/v1/care/patient/health-readings` | 환자 본인 | `patient_self` |

---

## 4. UI 구조

### 메인 입력 폼 (DataTab.tsx)

```
┌─────────────────────────────────────────────────┐
│ 건강 데이터 입력                                │
├─────────┬──────────┬──────────────┬────────┤
│ 측정 항목 │ 측정값    │ 측정 일시     │ [저장] │
│ [combobox]│ [number]  │ [datetime]   │        │
│ 4개 옵션  │ step=0.1  │ 현재시간 기본  │        │
└─────────┴──────────┴──────────────┴────────┘

[혈당 선택 시만]
  측정 구분: [공복] [식전] [식후] [취침 전] [기타]

[접이식 패널 3개]
  ▶ 투약 기록 (선택)
    → 약품명 [text] + 용량 [text] + 복용 시간 [datetime]
  ▶ 운동 기록 (선택)
    → 운동 종류 [dropdown 7개] + 시간 [number 분] + 강도 [가벼움/보통/격렬]
  ▶ 증상 기록 (선택)
    → [어지러움] [식은땀] [손떨림] [피로] [두통] [갈증] [기타] (체크박스)
```

### combobox 옵션

| value | label | unit |
|-------|-------|------|
| `glucose` | 혈당 | mg/dL |
| `blood_pressure_systolic` | 수축기 혈압 | mmHg |
| `blood_pressure_diastolic` | 이완기 혈압 | mmHg |
| `weight` | 체중 | kg |

### 최근 기록 테이블

| 컬럼 | 내용 |
|------|------|
| 날짜 | measuredAt |
| 항목 | metricType 라벨 |
| 값 | valueNumeric |
| 단위 | unit |
| 부가 정보 | mealTiming + medication + exercise + symptoms 태그 |
| 입력 방식 | sourceType 라벨 |

---

## 5. API 흐름

```
[DataTab 폼]
  → pharmacyApi.postHealthReading()
  → POST /api/v1/care/health-readings
  → {
      patientId, metricType, valueNumeric, unit, measuredAt,
      metadata: { mealTiming?, medication?, exercise?, symptoms? }
    }
  → health_readings 테이블 INSERT
  → created_by = auth.user (강제)
  → pharmacy_id = middleware context (강제)
  → source_type = 'manual' (강제)
```

### 데이터 활용 파이프라인

```
health_readings
  → DatabaseHealthMetricProvider (glucose/BP/weight 집계)
  → MultiMetricAnalysisProvider (TIR/CV, BP 분류, 체중 추이, 대사 위험도)
  → care_kpi_snapshots (KPI 자동 생성)
  → care_llm_insights (AI 분석 요약)
  → care_coaching_drafts (AI 코칭 초안)
  → care_alerts (알림 자동 생성)
```

---

## 6. DB 스키마 (health_readings)

| 컬럼 | 타입 | Null | 기본값 | 용도 |
|------|------|------|--------|------|
| id | UUID | NO | gen_random_uuid() | PK |
| patient_id | UUID | NO | — | 환자 연결 |
| metric_type | VARCHAR(50) | NO | 'glucose' | 측정 유형 |
| value_numeric | NUMERIC(10,2) | YES | — | 숫자 값 |
| value_text | TEXT | YES | — | 텍스트 값 (BP 레거시) |
| unit | VARCHAR(20) | NO | 'mg/dL' | 단위 |
| measured_at | TIMESTAMPTZ | NO | — | 측정 시각 |
| source_type | VARCHAR(30) | NO | 'manual' | 입력 소스 |
| created_by | UUID | YES | — | 입력자 |
| metadata | JSONB | NO | '{}' | **맥락 확장 필드** |
| pharmacy_id | UUID | YES | — | 약국 연결 |
| created_at | TIMESTAMPTZ | NO | NOW() | 생성 시각 |

**인덱스:**
- `IDX_health_readings_patient_measured` (patient_id, measured_at DESC)
- `IDX_health_readings_pharmacy` (pharmacy_id)

---

## 7. 현재 구조의 한계 (문제 요약)

### 구조적 한계

| # | 항목 | 현재 상태 | 한계 |
|---|------|----------|------|
| 1 | **투약** | metadata에 1건만 | 다중 약품 불가, 독립 조회/통계 불가 |
| 2 | **운동** | metadata에 1건만 | 독립 기록 불가 (반드시 측정값에 부착) |
| 3 | **증상** | metadata에 배열 | 독립 기록 불가, 시간축 없음 |
| 4 | **식사** | mealTiming만 존재 | 식사 내용/영양 데이터 없음 |
| 5 | **HbA1c** | 인프라만 있음 | UI 입력 없음, metricType은 지원 |
| 6 | **혈압 맥락** | 없음 | 안정시/운동후/투약후 등 구분 없음 |
| 7 | **체중 맥락** | 없음 | 아침/저녁, 식전/식후 구분 없음 |

### 맥락(Context) 부족

| 측정 항목 | 있는 맥락 | 없는 맥락 |
|----------|----------|----------|
| 혈당 | mealTiming (5종) | 식사 내용, 운동 전후 |
| 혈압 | 없음 | 안정시/활동시, 좌/우, 체위 |
| 체중 | 없음 | 측정 시점(아침/저녁), 식사 전후 |
| 투약 | name, dose, takenAt | 복용 방법, 부작용, 처방 연결 |
| 운동 | type, duration, intensity | 시작/종료 시간, 혈당 영향 |
| 증상 | 증상 이름 목록 | 심각도, 지속 시간, 관련 혈당 |

### 아키텍처 한계

1. **metadata 의존** — 투약/운동/증상이 주 측정값에 부착. 단독 기록 불가
2. **단일 테이블** — 모든 metricType이 같은 테이블. 확장 시 value_numeric + value_text + metadata로 부족할 수 있음
3. **분석 파이프라인** — MultiMetricAnalysisProvider가 metadata 내 투약/운동/증상을 활용하지 않음. AI 프롬프트에서만 텍스트로 전달

---

## 참조 파일

| 영역 | 파일 | 역할 |
|------|------|------|
| Entity | `apps/api-server/src/modules/care/entities/health-reading.entity.ts` | DB 스키마 |
| Entity | `apps/api-server/src/modules/care/entities/patient-health-profile.entity.ts` | 환자 프로필 |
| Controller | `apps/api-server/src/modules/care/controllers/health-readings.controller.ts` | 약사 입력 API |
| Controller | `apps/api-server/src/modules/care/controllers/patient-health-readings.controller.ts` | 환자 자가 입력 API |
| Provider | `apps/api-server/src/modules/care/infrastructure/provider/database-health-metric.provider.ts` | 데이터 집계 |
| Frontend | `services/web-glycopharm/src/pages/care/patient-tabs/DataTab.tsx` | 입력 UI |
| Frontend | `services/web-glycopharm/src/pages/care/PatientDetailPage.tsx` | 탭 컨테이너 |
| API Client | `services/web-glycopharm/src/api/pharmacy.ts` L788-812 | postHealthReading/getHealthReadings |

---

*작성: 2026-03-25*
*방법: 코드 정적 분석 (수정 없음)*
