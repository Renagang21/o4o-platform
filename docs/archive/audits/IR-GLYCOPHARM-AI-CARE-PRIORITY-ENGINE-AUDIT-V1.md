# IR-GLYCOPHARM-AI-CARE-PRIORITY-ENGINE-AUDIT-V1

> GlycoPharm / GlucoseView AI Care Priority 기능 조사 보고서
> 작성일: 2026-03-14

---

## 1. Care API 분석

### 1.1 전체 API 구조

| Controller | 경로 | 역할 |
|-----------|------|------|
| `care-dashboard` | GET /risk-patients | 위험 환자 분류 |
| | GET /priority-patients | Top N 우선 환자 |
| | GET /today-priority | 오늘의 우선 환자 |
| | GET /alerts | 활성 알림 |
| | PATCH /alerts/:id/ack | 알림 확인 |
| | PATCH /alerts/:id/resolve | 알림 해결 |
| | GET /population-dashboard | 모집단 통계 |
| `care-analysis` | GET /analysis/:patientId | CGM 분석 + KPI snapshot |
| | GET /kpi/:patientId | KPI 비교 (최근 2개) |
| `care-llm-insight` | GET /llm-insight/:patientId | LLM 기반 인사이트 |
| `care-coaching` | POST /coaching | 코칭 세션 생성 |
| | GET /coaching-drafts/:patientId | AI 코칭 초안 |
| `health-readings` | POST /health-readings | 건강 데이터 입력 |
| `patient-ai-insight` | GET /patient/ai-insight | 환자용 AI 인사이트 |

### 1.2 분석 파이프라인

```
GET /analysis/:patientId
  ↓
CgmProvider.getReadings() — 14일 혈당 데이터
  ↓
analyzeReadings() — TIR, CV, riskLevel 계산
  ↓
MultiMetricAnalysis — BP + 체중 + 대사 위험 (opt-in)
  ↓
recordSnapshot() — care_kpi_snapshots 저장
  ↓ (fire-and-forget, 병렬)
├→ llmInsightService.generateAndCache() — Gemini → care_llm_insights
├→ coachingDraftService.generateAndCache() — Gemini → care_coaching_drafts
└→ alertService.evaluateAndCreate() — care_alerts 자동 생성
```

---

## 2. 위험 환자 탐지 로직

### 2.1 현재 방식: Rule-Based

**glucose 위험도** (analysis.engine.ts):

```
TIR ≥ 70%  → low
TIR 50-69% → moderate
TIR < 50%  → high
```

TIR 계산:
```
inRange = readings.filter(g => g >= 70 && g <= 180)
tir = (inRange / total) × 100
```

CV 계산:
```
cv = (stddev / mean) × 100
```

### 2.2 복합 위험도 (CareRiskService)

4개 축을 각각 0–2점으로 채점 → 합산:

| 축 | 0점 | 1점 | 2점 |
|----|-----|-----|-----|
| Glucose | low | moderate | high |
| BP | normal | elevated / stage1 | stage2 |
| Weight | \|변화\| < 2kg | 2-3kg | ≥ 3kg |
| Metabolic | low | moderate | high |

**분류**:
- 0–1점 → normal
- 2–3점 → caution
- ≥ 4점 → **high**

### 2.3 데이터 소스

- **KPI snapshot** 사용 (care_kpi_snapshots 최신 1건)
- health_readings **직접 분석 아님** — snapshot의 tir/cv/metadata 활용
- 최근 기간: 분석 시점 기준 **14일**

---

## 3. Priority 환자 구조

### 3.1 Priority Score (0–100)

**5개 요소 복합 점수**:

| 요소 | 점수 | 기준 |
|------|------|------|
| Risk Level | 0–40 | high=40, caution=20, normal=0 |
| Glucose Pattern | 0–20 | TIR<70%: +10, CV>36%: +10 |
| Coaching Gap | 0–20 | 7일 코칭 없음: +20 |
| Data Freshness | 0–20 | 48시간 데이터 없음: +20 |
| Open Alerts | 0–20 | 미해결 알림 존재: +20 |

### 3.2 Today's Priority (간소화 버전)

```
riskScore = high→20, moderate→10, low→0
alertScore = critical→20, warning→10, info→5 (합산)
activityScore = 2일 데이터 없음 → +10
freshnessScore = 7일 snapshot 없음 → +10
```

### 3.3 SQL 구조

```sql
WITH latest_snapshot, latest_coaching, latest_reading, open_alerts
→ JOIN → priority_score DESC → LIMIT 5
```

**결론: 단순 필터가 아닌 score 기반 정렬. 이미 상당히 정교한 구조.**

---

## 4. Alert 시스템

### 4.1 테이블: care_alerts

```
id, pharmacy_id, patient_id
alert_type: high_risk | abnormal_glucose | data_missing | coaching_needed
severity: critical | warning | info
status: open | acknowledged | resolved
message, created_at, resolved_at
```

### 4.2 자동 생성 규칙

| alert_type | severity | 조건 |
|-----------|----------|------|
| `high_risk` | critical | riskLevel === 'high' |
| `abnormal_glucose` | warning | TIR < 60% OR CV > 40% |
| `data_missing` | warning | 48시간 데이터 미입력 |
| `coaching_needed` | info | 7일 코칭 없음 |

### 4.3 중복 방지

```sql
SELECT FROM care_alerts
WHERE patient_id = ? AND alert_type = ? AND status IN ('open', 'acknowledged')
```

존재하면 skip, 없으면 insert.

**결론: 완전 자동 생성. Snapshot 생성 시 fire-and-forget으로 실행.**

---

## 5. KPI Snapshot 구조

### 5.1 테이블: care_kpi_snapshots

```
id, pharmacy_id, patient_id
tir (INT), cv (INT), risk_level (VARCHAR)
metadata (JSONB) — multi-metric 분석 결과
created_at
```

### 5.2 Snapshot 생성 트리거

```
GET /analysis/:patientId 호출 시 자동 생성
```

**수동 트리거만 존재. 자동 스케줄러 없음.**

### 5.3 metadata JSONB 구조

```json
{
  "multiMetric": {
    "bp": {
      "avgSystolic": 130,
      "avgDiastolic": 80,
      "bpCategory": "high_stage1",
      "readingCount": 5
    },
    "weight": {
      "latestWeight": 75.5,
      "weightChange": 2.3,
      "readingCount": 3
    },
    "metabolicRisk": {
      "metabolicRiskLevel": "moderate",
      "metabolicScore": 45,
      "riskFactors": ["혈당 주의", "고혈압 1단계"]
    }
  }
}
```

---

## 6. GlucoseView 데이터 구조

### 6.1 health_readings 테이블

```
id, patient_id
metric_type: glucose | blood_pressure | weight
value_numeric (NUMERIC 10,2)
value_text (TEXT) — BP "130/80" 포맷
unit: mg/dL | mmHg | kg
measured_at (TIMESTAMPTZ)
source_type: manual | patient_self | cgm_device
metadata (JSONB) — mealTiming 등
pharmacy_id, created_by, created_at
```

### 6.2 데이터 입력 경로

| 경로 | source_type | pharmacy_id |
|------|-----------|-------------|
| 환자 자가입력 | patient_self | NULL |
| 약사 수동입력 | manual | 필수 |
| CGM 연동 (미래) | cgm_device | 상황에 따라 |

### 6.3 환자 AI Insight

- **캐시**: 24시간 TTL
- **최소 데이터**: 3개 이상 glucose reading
- **데이터 기간**: 14일
- **AI 입력**: count, avgGlucose, fastingAvg, postMealAvg, TIR%, high/low events, max/min
- **AI 출력**: `{ summary, warning, tip }`
- **모델**: Gemini 2.0 Flash

### 6.4 환자 건강 프로필

```
patient_health_profiles
- diabetes_type: type1 | type2 | gestational | prediabetes
- treatment_method: insulin | oral | diet | combined
- height, weight, target_hba1c
- target_glucose_low (기본 70), target_glucose_high (기본 180)
```

---

## 7. CGM 연동 준비 상태

### 7.1 현재 상태

| 항목 | 상태 |
|------|------|
| `cgm_connections` 테이블 | **없음** |
| `cgm_readings` 테이블 | **없음** |
| CGM 데이터 저장 | health_readings (source_type='cgm_device') |
| Vendor API 연동 | **미구현** |
| Token 저장 구조 | **없음** |

### 7.2 Provider 아키텍처

```
CgmProvider (interface)
├── MockCgmProvider — 결정적 가상 데이터
├── DatabaseHealthProvider — health_readings에서 glucose 조회
└── FallbackCgmProvider — DB 우선, 10개 미만이면 Mock fallback
```

**환경변수 제어**:
```
CGM_PROVIDER=database      → DB + Mock fallback
CGM_PROVIDER=mock (기본)    → Mock only
CARE_MULTI_METRIC=true     → BP + 체중 분석 추가
CARE_ANALYSIS_PROVIDER=ai  → AI 기반 분석 (기본: rule-based)
```

### 7.3 CGM 연동을 위해 필요한 것

```
1. cgm_connections 테이블 (device_type, vendor, access_token, refresh_token)
2. Vendor API 연동 서비스 (Dexcom, Abbott 등)
3. Sync scheduler (주기적 데이터 동기화)
4. health_readings에 source_type='cgm_device'로 저장
```

**현재 아키텍처가 이미 CgmProvider 인터페이스로 추상화되어 있어, 새 Provider 추가만으로 연동 가능.**

---

## 8. AI Priority Engine 도입 가능성 평가

### 8.1 현재 AI 서비스 현황

| 서비스 | 역할 | 모델 | 캐시 |
|--------|------|------|------|
| CareLlmInsightService | 약사용 분석 설명 | Gemini 2.0 Flash | Snapshot별 1회 |
| CareCoachingDraftService | AI 코칭 초안 | Gemini 2.0 Flash | Snapshot별 1회 |
| PatientAiInsightService | 환자용 건강 요약 | Gemini 2.0 Flash | 24시간 TTL |

**공통 패턴**:
- Fire-and-forget (분석 실패해도 메인 흐름 불차단)
- JSON 출력 강제 (system prompt)
- 의료 진단/처방 금지 (안전 가이드)
- 2회 retry + 2초 대기

### 8.2 AI Priority Engine 도입 평가

#### 데이터 충분성

| 데이터 | 상태 | 평가 |
|--------|------|------|
| Glucose readings | ✅ 존재 (health_readings) | **충분** (14일 기준) |
| BP readings | ✅ 존재 (health_readings) | 보통 (입력 의존) |
| Weight readings | ✅ 존재 (health_readings) | 보통 (입력 의존) |
| CGM 연속 데이터 | ⚠️ Mock 또는 수동 | **부족** (실제 CGM 미연결) |
| 행동 패턴 (식사, 운동) | ❌ 없음 | 부족 |
| 약물 복용 기록 | ❌ 없음 | 부족 |

#### 현재 구조 호환성: **높음**

```
✅ CgmProvider 추상화 — 새 데이터 소스 추가 용이
✅ AnalysisProvider 추상화 — AI 분석기 교체 가능
✅ Fire-and-forget 패턴 — AI 실패가 시스템 장애 아님
✅ Snapshot 기반 — AI 결과를 snapshot에 저장 가능
✅ Priority Score 구조 — AI가 score 조정 가능
```

#### 구현 난이도

| 수준 | 설명 |
|------|------|
| Level 1 (낮음) | AI가 기존 rule-based score에 가중치 조정 |
| Level 2 (중간) | AI가 패턴 분석 후 추가 score 제공 |
| Level 3 (높음) | AI가 전체 priority ranking을 직접 결정 |

**권장: Level 1 — AI Score Adjustment**

기존 rule-based priority score (0–100) 유지하면서
AI가 다음을 추가 분석:

```
최근 48시간 저혈당 2회 → +15점
TIR 7일 연속 하락 → +10점
야간 저혈당 증가 패턴 → +20점
식후 혈당 급등 패턴 → +10점
```

#### 서비스 가치: **매우 높음**

```
약사가 출근 시 "오늘 우선 관리 환자" 자동 추천
→ 진짜 위험한 환자를 놓치지 않음
→ 약국 Care 서비스의 핵심 가치
```

---

## 9. 최종 답변

### AI 기반 Priority Patient Engine을 WO 범위에 포함시키는 것이 적절한가?

```
적절하다. 단, Level 1 (AI Score Adjustment) 수준으로.
```

### 근거

| 기준 | 평가 | 이유 |
|------|------|------|
| 데이터 충분성 | ⭐⭐⭐ | glucose 데이터 존재, BP/체중 보조 |
| 현재 구조 호환성 | ⭐⭐⭐⭐⭐ | Provider/Score 추상화 완비 |
| 구현 난이도 | ⭐⭐⭐⭐ | 기존 score에 AI 보정만 추가 |
| 서비스 가치 | ⭐⭐⭐⭐⭐ | 약국 Care의 핵심 차별화 |

### 권장 구현 방식

```
1. 기존 priority_score (rule-based) 유지
2. AI가 glucose 패턴 분석 → ai_adjustment_score (+0~30)
3. final_score = rule_score + ai_adjustment_score
4. AI 분석은 fire-and-forget (실패 시 rule_score만 사용)
```

### 선행 조건

```
1. health_readings에 실제 데이터가 충분해야 함 (최소 3일)
2. CGM 연동 없이도 수동 입력 데이터로 동작 가능해야 함
3. AI 실패 시 기존 rule-based로 fallback
```

---

## 10. 핵심 파일 목록

| 영역 | 파일 |
|------|------|
| Risk Service | `apps/api-server/src/modules/care/services/care-risk.service.ts` |
| Priority Service | `apps/api-server/src/modules/care/services/care-priority.service.ts` |
| Alert Service | `apps/api-server/src/modules/care/services/care-alert.service.ts` |
| Analysis Engine | `apps/api-server/src/modules/care/domain/analysis/analysis.engine.ts` |
| Multi-Metric Engine | `apps/api-server/src/modules/care/domain/analysis/multi-metric.engine.ts` |
| KPI Snapshot | `apps/api-server/src/modules/care/services/kpi/care-kpi-snapshot.service.ts` |
| LLM Insight | `apps/api-server/src/modules/care/services/llm/care-llm-insight.service.ts` |
| Coaching Draft | `apps/api-server/src/modules/care/services/llm/care-coaching-draft.service.ts` |
| Patient AI Insight | `apps/api-server/src/modules/care/services/llm/patient-ai-insight.service.ts` |
| DB Health Provider | `apps/api-server/src/modules/care/infrastructure/provider/database-health.provider.ts` |
| Mock CGM Provider | `apps/api-server/src/modules/care/infrastructure/provider/mock-cgm.provider.ts` |

---

*IR 작성 완료: 2026-03-14*
