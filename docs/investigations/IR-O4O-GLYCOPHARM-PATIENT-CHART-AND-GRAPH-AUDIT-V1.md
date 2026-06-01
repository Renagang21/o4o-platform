# IR-O4O-GLYCOPHARM-PATIENT-CHART-AND-GRAPH-AUDIT-V1

**작성일**: 2026-03-24
**상태**: 완료
**범위**: GlycoPharm 환자 데이터 차트/그래프 현황 조사

---

## 1. 현재 구현 현황표

| 화면/페이지 | 파일 | 차트/그래프 종류 | 데이터 연결 | 상태 |
|---|---|---|---|---|
| 분석 페이지 (약사용) | `services/web-glycopharm/src/pages/care/AnalysisPage.tsx:138-223` | **SVG 혈당 선 그래프** — TIR 밴드(70-180), 범위 내/외 색분리 점, 날짜 축 | ✅ 실데이터 (GET /care/health-readings) | **프로덕션** |
| 분석 페이지 KPI | `AnalysisPage.tsx:227-243` | **KPI 카드 4개** — 평균혈당, TIR%, 공복평균, 식후평균, 변동성(max/min/range/stdDev) | ✅ 실데이터 (프론트 계산) | **프로덕션** |
| 환자 자가분석 (Patient) | `services/web-glycopharm/src/pages/patient/DataAnalysisPage.tsx:118-244` | **동일 SVG 혈당 선 그래프** + KPI 카드 | ✅ 실데이터 | **프로덕션** |
| 환자 상세 > 분석 탭 | `patient-tabs/AnalysisTab.tsx:278-283` | **플레이스홀더** — "혈당 추이 차트 Phase 2에서 구현 예정" 아이콘만 | ❌ 없음 | **미구현** |
| 환자 상세 > 데이터 탭 | `patient-tabs/DataTab.tsx` | **테이블 뷰** — 최근 기록 50건 리스트, metadata 뱃지 | ✅ 실데이터 | 차트 없음 |
| 환자 상세 > 이력 탭 | `patient-tabs/HistoryTab.tsx` | **타임라인** — 세로 시간축 + 이벤트 타입별 색상 점 | ✅ 실데이터 | 차트는 아님 |
| Care 대시보드 | `CareDashboardPage.tsx` | **KPI 카드 4개** + 우선순위 환자 그리드 + 알림 스트림 | ✅ 실데이터 | 차트 없음 |
| 전체기록 페이지 | `RecordsPage.tsx` | **필터링 테이블** — 날짜/유형별 필터, metadata 뱃지 | ✅ 실데이터 | 차트 없음 |
| AI 리포트 (Operator) | `packages/ui/src/pages/operator/AiReportPage.tsx` | **바 차트** (일별 추이) + **수평 바 차트** (사유 분석) + KPI 카드 | ✅ 실데이터 | 콘텐츠 지표용 |

**요약**: 혈당 SVG 선 그래프 **1종**만 존재 (AnalysisPage + DataAnalysisPage에서 2곳 사용). 혈압/체중 그래프, 식사 시점별 분류 차트, 복합 차트는 없음.

---

## 2. 재사용 가능 코드 표

| 위치 | 사용 방식 | GlycoPharm 적용 가능 여부 | 비고 |
|---|---|---|---|
| `AnalysisPage.tsx:138-223` — `GlucoseChart` | 순수 SVG + React, 외부 의존성 없음. viewBox 360×200, TIR 밴드, 색상 점, 날짜 축 | ✅ **바로 재사용** — 동일 HealthReadingDto 사용 | AnalysisTab 플레이스홀더 자리에 삽입 가능 |
| `AnalysisPage.tsx:69-120` — `computeStats()` | 프론트엔드 통계 계산: 평균/최대/최소/표준편차/TIR%/공복평균/식후평균 | ✅ **바로 재사용** | 이미 GlycoPharm 내부 코드 |
| `AnalysisPage.tsx:227-243` — `KpiCard` | Tailwind 카드 컴포넌트: 아이콘 + 값 + 단위 + 부제 | ✅ **바로 재사용** | 범용 패턴 |
| `PartnerStats.tsx:66-94` — `renderSparkline()` | 인라인 SVG 스파크라인: 60×20px polyline | ✅ 테이블 행에 미니 추이 표시 가능 | 데이터 배열 → SVG 변환 |
| `PlaceholderChart.tsx` (GlucoseView) | 3가지 스켈레톤: 24시간 곡선, 7일 바, 요약 카드 | ⚠️ 스켈레톤 용도 (로딩/빈 상태) | 실데이터 차트가 아님 |
| `AiReportPage.tsx:168-202` — 일별 바 차트 | Tailwind div 기반 바 차트, maxHeight 스케일링 | ✅ 일별 측정 횟수/평균 등에 재사용 가능 | 콘텐츠 지표용으로 만들어졌으나 범용 |
| **Recharts v3.2.1** — `apps/admin-dashboard/` | LineChart, PieChart, ResponsiveContainer 등 | ⚠️ admin-dashboard에만 설치됨 | GlycoPharm에는 별도 설치 필요 |

---

## 3. 시나리오별 구현 가능성 표

| 시나리오 | 현재 상태 | 재사용 가능 여부 | 패키지 필요 여부 |
|---|---|---|---|
| **약사가 환자의 최근 혈당 추이를 빠르게 보고 싶다** | ✅ AnalysisPage에서 가능 (7/14/30일 선택) | 기존 `GlucoseChart` 재사용 | 불필요 |
| **식전/식후 혈당 차이를 시각적으로 구분하고 싶다** | ⚠️ 일부 가능 — KPI 카드에서 공복평균 vs 식후평균 **숫자**로 표시. 차트에서는 점 색상이 범위 내/외 구분만 함 | `GlucoseChart` 확장: mealTiming별 점 색상/마커 추가 가능 (SVG 수정) | 불필요 |
| **운동/복약/증상과 함께 기록을 보고 싶다** | ⚠️ DataTab 테이블에서 metadata 뱃지로 표시. 차트에서는 미표시 | metadata 기반 마커를 SVG 차트에 추가 가능 (아이콘/태그) | 불필요 (SVG 마커), 인터랙티브 tooltip이면 **필요** |
| **혈압 추이를 그래프로 보고 싶다** | ❌ 미구현 — AnalysisTab에서 평균 수축기/이완기 **숫자**만 표시 | `GlucoseChart` 패턴 복제 + Y축/색상 변경으로 구현 가능 | 불필요 (단일 선 그래프), 수축기+이완기 겹침이면 **불필요** (2-line SVG) |
| **체중 변화 추이를 보고 싶다** | ❌ 미구현 — AnalysisTab에서 최근 체중 + 변화량 **숫자**만 표시 | `GlucoseChart` 패턴 복제로 구현 가능 | 불필요 |
| **전체기록 리스트와 그래프를 같이 보고 싶다** | ❌ RecordsPage는 테이블만 | 상단에 `GlucoseChart` 삽입 + 기존 테이블 유지 가능 | 불필요 |
| **일별/주별 평균 혈당 바 차트** | ❌ 미구현 | `AiReportPage` 바 차트 패턴 재사용 가능, 또는 SVG bar 직접 구현 | 불필요 |
| **줌/팬으로 대량 시계열 탐색** | ❌ 미구현 | SVG 순수 구현은 비현실적 | **필요** (Recharts, uPlot 등) |
| **복합 인터랙티브 차트 (tooltip, legend, 줌)** | ❌ 미구현 | SVG만으로는 tooltip 정도 가능, 줌/팬은 어려움 | **필요** |
| **멀티축 차트 (혈당+혈압+체중 동시)** | ❌ 미구현 | SVG로 2축까지 가능하나 3축은 복잡 | 2축: 불필요 / 3축: **필요** |

---

## 4. 패키지 필요성 판단

### A. 패키지 설치 없이 가능한 범위

| 구현 가능 항목 | 근거 |
|---|---|
| **혈당 추이 선 그래프** (환자 상세 탭 포함) | 이미 `GlucoseChart` 존재. AnalysisTab 플레이스홀더에 삽입만 하면 됨 |
| **혈압 추이 선 그래프** (수축기/이완기 2선) | `GlucoseChart` 동일 패턴 복제, Y축 범위(60-200 mmHg)·색상 변경 |
| **체중 추이 선 그래프** | 동일 패턴 복제, Y축 범위(40-150 kg)·색상 변경 |
| **식전/식후 색분리** | 기존 SVG 점에 `metadata.mealTiming` 기반 색상 적용 (blue→fasting, orange→after_meal 등) |
| **일별 평균 바 차트** | SVG `<rect>` 또는 Tailwind div bar (AiReportPage 패턴) |
| **증상/복약/운동 마커** | SVG `<text>` 또는 소형 아이콘을 데이터 점 위에 표시 |
| **스파크라인** (테이블 인라인) | `renderSparkline()` 패턴 재사용 |
| **통계 카드 + 수치 요약** | `KpiCard` 패턴 재사용 |

**핵심**: 현재 GlycoPharm에 이미 존재하는 `GlucoseChart` SVG 패턴을 복제·확장하면, 외부 패키지 없이 **선 그래프 3종(혈당/혈압/체중) + 바 차트 1종 + 마커 표시**까지 가능하다.

### B. 패키지 설치가 있어야 현실적인 범위

| 구현 항목 | 패키지 필요 이유 |
|---|---|
| **줌/팬 인터랙션** | SVG 순수 구현으로 드래그 줌·팬을 만들면 코드 복잡도가 급증하고 터치 디바이스 대응이 어려움 |
| **고급 tooltip** (마우스 호버 시 값 표시, 크로스헤어) | SVG로 가능하나 이벤트 핸들링·위치 계산·모바일 대응이 비용 높음 |
| **멀티축 복합 차트** (3개 이상 Y축) | 축 간 스케일 동기화, 범례, 스크롤 등 구현이 비현실적 |
| **대량 데이터 (1000+포인트)** | Canvas 기반 렌더링이 필요 (SVG는 DOM 노드 과다로 성능 저하) |
| **에니메이션·트랜지션** | SVG CSS transition은 제한적, 부드러운 전환은 라이브러리가 효율적 |

**만약 설치한다면**: Recharts(이미 admin-dashboard에 사용 중, 러닝커브 낮음) 또는 경량 uPlot(Canvas 기반, 대량 시계열에 강함)이 후보. 그러나 이 판단은 이번 조사 범위 밖.

---

## 5. GlycoPharm vs GlucoseView 비교

| 항목 | GlycoPharm | GlucoseView |
|---|---|---|
| 혈당 선 그래프 | ✅ AnalysisPage에 존재 | ❌ PlaceholderChart만 존재 (스켈레톤) |
| KPI 카드 (TIR/CV 등) | ✅ AnalysisPage + AnalysisTab | ❌ PlaceholderChart summary만 |
| 혈압/체중 그래프 | ❌ 숫자 표시만 | ❌ 없음 |
| 약사용 분석 | ✅ 전용 분석 페이지 | ❌ 해당 없음 (환자 앱) |
| 환자 자가분석 | ✅ DataAnalysisPage 존재 | ⚠️ CareDashboardPage에서 분석 결과 표시 (차트는 없음) |
| 공용 차트 컴포넌트 | ❌ 페이지 내 인라인 | ❌ PlaceholderChart만 |

**결론**: GlucoseView에는 GlycoPharm보다 더 나은 환자 차트가 없다. 오히려 GlycoPharm의 `GlucoseChart`가 플랫폼 내 유일한 실동작 환자 데이터 차트. GlucoseView에서 가져올 것은 없고, 반대로 GlycoPharm의 차트를 공용 컴포넌트로 추출하면 GlucoseView에서도 사용 가능.

---

## 6. 데이터 구조 차트 적합성

| 항목 | 적합 여부 | 상세 |
|---|---|---|
| 혈당 시계열 | ✅ 완전 적합 | `measured_at` TIMESTAMPTZ + `value_numeric` NUMERIC(10,2) + `metric_type='glucose'` |
| 혈압 시계열 | ✅ 적합 | `metric_type='blood_pressure_systolic'/'blood_pressure_diastolic'` 별도 행. 동일 `measured_at`으로 JOIN 가능 |
| 체중 시계열 | ✅ 적합 | `metric_type='weight'` + `unit='kg'`. 빈도 낮으나 추이 가능 |
| mealTiming 색분리 | ✅ 적합 | `metadata->>'mealTiming'` = 'fasting'/'before_meal'/'after_meal'/'bedtime'/'random' |
| 복약 마커 | ✅ 적합 | `metadata->'medication'` = `{name, dose, takenAt}` |
| 운동 마커 | ✅ 적합 | `metadata->'exercise'` = `{type, duration, intensity}` |
| 증상 마커 | ✅ 적합 | `metadata->'symptoms'` = `string[]` (어지러움, 식은땀, 손떨림 등) |
| 날짜 범위 필터 | ✅ 지원됨 | API: `GET /care/health-readings/:patientId?from=ISO&to=ISO&metricType=glucose` |
| 일별 평균 집계 | ⚠️ 프론트엔드 필요 | 백엔드에 일별 grouping API 없음. 프론트에서 날짜별 그룹핑 필요 |

**결론**: 데이터는 이미 차트에 완전히 적합하다. UI만 부족한 상태. 별도 가공 계층 없이 기존 API 응답 그대로 차트에 매핑 가능. 일별 집계만 프론트엔드에서 간단한 groupBy 처리 필요.

---

## 7. 최종 결론

### 현재 차트/그래프 구현 수준

- **실동작 차트**: 혈당 SVG 선 그래프 **1종** (2곳에서 사용: AnalysisPage, DataAnalysisPage)
- **숫자 요약**: KPI 카드 (평균/TIR/CV/공복/식후) — 5개 지표
- **미구현**: 혈압 그래프, 체중 그래프, 식사 시점별 시각 구분, metadata 마커, 일별 바 차트
- **플레이스홀더**: AnalysisTab에 "Phase 2에서 구현 예정" 표시

### 사업자 요구에 가장 먼저 보완해야 할 시각화

1. **환자 상세 > 분석 탭에 혈당 추이 차트 삽입** — AnalysisTab 플레이스홀더 → 기존 `GlucoseChart` 삽입 (가장 즉시적)
2. **식전/식후 색분리** — 기존 GlucoseChart에 mealTiming 기반 점 색상 추가
3. **혈압 추이 선 그래프** — GlucoseChart 패턴 복제 + 수축기/이완기 2선
4. **체중 추이 선 그래프** — 동일 패턴 복제
5. **RecordsPage 상단에 미니 차트 추가** — 리스트 위에 트렌드 시각화

### 패키지 설치 없이 갈 수 있는 1차 범위

위 1~5번 모두 패키지 설치 없이 구현 가능. 기존 `GlucoseChart` SVG 패턴(78줄)을 복제·확장하면 충분. 구체적으로:
- 선 그래프 3종 (혈당/혈압/체중)
- mealTiming 색분리 마커
- metadata 아이콘 표시 (증상/복약/운동)
- 일별 바 차트 (Tailwind div 또는 SVG rect)
- 스파크라인 (테이블 인라인)

### 패키지 설치가 필요한 수준

줌/팬 인터랙션, 고급 tooltip(크로스헤어), 멀티축(3+) 복합 차트, 1000+ 데이터포인트 성능, 에니메이션이 필요해지는 시점. 이는 사업자 요구가 "빠른 판단용 차트"를 넘어 "상세 데이터 탐색 도구"로 확장될 때 고민할 사안.

---

## 핵심 파일 참조

| 파일 | 역할 |
|---|---|
| `services/web-glycopharm/src/pages/care/AnalysisPage.tsx` | 유일한 실동작 혈당 차트 (SVG, L138-223) + computeStats (L69-120) + KpiCard (L227-243) |
| `services/web-glycopharm/src/pages/patient/DataAnalysisPage.tsx` | 환자 자가분석용 동일 차트 |
| `services/web-glycopharm/src/pages/care/patient-tabs/AnalysisTab.tsx` | 차트 플레이스홀더 (L278-283) — 1차 삽입 대상 |
| `services/web-glycopharm/src/pages/care/patient-tabs/DataTab.tsx` | 데이터 입력 + 테이블 뷰 (metadata 뱃지) |
| `services/web-glycopharm/src/pages/care/RecordsPage.tsx` | 전체기록 테이블 — 미니 차트 추가 후보 |
| `apps/api-server/src/modules/care/entities/health-reading.entity.ts` | DB 스키마 (metric_type, value_numeric, measured_at, metadata JSONB) |
| `apps/admin-dashboard/src/pages/dashboard/phase2.4/PartnerStats.tsx` | 스파크라인 패턴 (L66-94) |
| `packages/ui/src/pages/operator/AiReportPage.tsx` | 바 차트 패턴 (L168-202) |
| `services/web-glucoseview/src/components/PlaceholderChart.tsx` | 스켈레톤 차트 (참고용) |

---

*끝*
