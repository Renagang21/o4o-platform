# IR-GLYCOPHARM-ARCH-BASELINE-V1

## GlycoPharm + GlucoseView 아키텍처 현황 조사 보고서

> **WO-GLYCOPHARM-ARCH-INVESTIGATION-V1**
> 작성일: 2026-02-13
> 유형: 조사 전용 (Investigation Report) — 코드 변경 없음

---

## 1. 조사 범위

### 설계 사양 (Design Spec) — 4레이어 구조

| 레이어 | 역할 | 핵심 산출물 |
|--------|------|-------------|
| L1. 데이터 수집 | CGM/BGM 원시 데이터 수집·저장 | 혈당 시계열, 환자 프로필 |
| L2. 데이터 분석 | 위험도 계산, 패턴 탐지 | 위험 점수, TIR, CV, 패턴 분류 |
| L3. 약사 코칭 | 상담 기록, 개입 추적 | 코칭 세션, 개입 로그 |
| L4. 성과 분석 | 개입 효과 측정, KPI | 개선율, ROI, 약국별 성과 |

### 조사 대상

- **Backend**: `apps/api-server/src/routes/glucoseview/`, glycopharm entities/services, `packages/pharmacy-ai-insight/`
- **Frontend**: `services/web-glycopharm/`, `services/web-glucoseview/`
- **Migrations**: `apps/api-server/src/database/migrations/`

---

## 2. 엔티티 구조 현황

### 2-A. GlycoPharm 엔티티 (11개)

| 엔티티 | 테이블 | 역할 |
|--------|--------|------|
| GlycopharmPharmacy | glycopharm_pharmacies | 약국 메타데이터 |
| GlycopharmProduct | glycopharm_products | CGM 기기/시험지/란셋 제품 |
| GlycopharmProductLog | glycopharm_product_logs | 제품 변경 감사 로그 |
| GlycopharmFeaturedProduct | glycopharm_featured_products | 추천 제품 큐레이션 |
| GlycopharmApplication | glycopharm_applications | 약국 서비스 신청 |
| GlycopharmEvent | glycopharm_events | 행동 이벤트 (impression/click/qr_scan) |
| GlycopharmCustomerRequest | glycopharm_customer_requests | 인간 판단 필요 요청 |
| GlycopharmRequestActionLog | glycopharm_request_action_logs | 요청 후속 조치 |
| GlycopharmBillingInvoice | glycopharm_billing_invoices | 청구서 |
| Display* (4개) | display_playlists/media/items/schedules | 디지털 사이니지 |
| GlycopharmForumCategoryRequest | glycopharm_forum_category_requests | 포럼 카테고리 요청 |

### 2-B. GlucoseView 엔티티 (9개)

| 엔티티 | 테이블 | 역할 |
|--------|--------|------|
| GlucoseViewVendor | glucoseview_vendors | CGM 제조사 (Abbott, Dexcom 등) |
| GlucoseViewViewProfile | glucoseview_view_profiles | CGM 데이터 표시 설정 |
| GlucoseViewConnection | glucoseview_connections | 약국-벤더 연결 상태 |
| GlucoseViewCustomer | glucoseview_customers | 약사 관리 환자 기록 |
| GlucoseViewBranch | glucoseview_branches | 약사회 지부 |
| GlucoseViewChapter | glucoseview_chapters | 약사회 분회 |
| GlucoseViewPharmacist | glucoseview_pharmacists | 약사 회원 프로필 |
| GlucoseViewApplication | glucoseview_applications | CGM View 서비스 신청 |
| GlucoseViewPharmacy | glucoseview_pharmacies | 약국별 서비스 활성화 |

### 2-C. 참조되지만 존재하지 않는 테이블 (CRITICAL)

| 테이블명 | 참조 위치 | 마이그레이션 | 엔티티 |
|----------|-----------|-------------|--------|
| `cgm_patients` | glucoseview.repository.ts (raw SQL) | **없음** | **없음** |
| `cgm_patient_summaries` | glucoseview.repository.ts (raw SQL) | **없음** | **없음** |
| `cgm_glucose_insights` | glucoseview.repository.ts (raw SQL) | **없음** | **없음** |

> **결론**: 핵심 CGM 데이터 테이블이 코드에서 참조되지만, 스키마(migration)가 존재하지 않는다.
> Repository는 raw SQL로 직접 쿼리하고 있어 TypeORM 엔티티도 없다.

---

## 3. 데이터 흐름 진단

### 3-A. GlycoPharm 워크플로우 (정상 작동)

```
Event (행동 관찰: impression/click/qr_scan)
  ↓ [EventPromotionService: 조건 평가]
  ↓ (source∈{qr,tablet} + purpose∈{consultation,sample,order} + 10분 쿨다운)
Request (인간 판단 필요: pending → approved/rejected)
  ↓ [Operator/Pharmacist 승인]
Action (consultation_log | sample_fulfillment | order_draft)
  ↓ [ReportService 집계]
Billing (DRAFT → CONFIRMED → ARCHIVED)
```

**평가**: Event→Request→Action→Billing 파이프라인은 **완전히 구현됨**.
하지만 이것은 **"약국 비즈니스 운영"** 워크플로우이지, **"혈당 관리"** 워크플로우가 아님.

### 3-B. GlucoseView 워크플로우 (미완성)

```
CGM Device (외부 기기) → [???] → cgm_patients 테이블 (마이그레이션 없음)
  ↓
cgm_patient_summaries (마이그레이션 없음)
  ↓
GlucoseViewRepository.findAllPatients() (raw SQL 쿼리)
  ↓
GlucoseViewService.listPatients() (요약 데이터만 반환)
  ↓
Frontend (InsightsPage.tsx → 100% 샘플 데이터 사용)
```

**평가**: 데이터 파이프라인이 **중간에 끊어져** 있음.
- Backend: 테이블이 없어서 쿼리가 실패할 것
- Frontend: API를 호출하지 않고 합성 데이터(42명)를 직접 생성

---

## 4. 레이어별 GAP 분석

### L1. 데이터 수집 레이어

| 항목 | 현황 | GAP |
|------|------|-----|
| CGM 원시 데이터 수집 | **없음** | cgm_patients, cgm_patient_summaries 테이블 자체가 없음 |
| CGM 벤더 연동 | GlucoseViewConnection 존재 | 실제 데이터 동기화 로직 없음 (메타데이터만) |
| 환자 등록 | GlucoseViewCustomer 존재 | 약사별 스코핑 정상 작동 |
| GlycoPharm Event | 완전 구현 | — |
| CGM 데이터 임포트 | **없음** | 파일/API 기반 CGM 데이터 인입 경로 없음 |

### L2. 데이터 분석 레이어

| 항목 | 현황 | GAP |
|------|------|-----|
| TIR 계산 | `pharmacy-ai-insight/glucoseUtils.ts`에 존재 | **패키지 내부에만 존재**, 서비스 계층에서 호출되지 않음 |
| CV 계산 | `pharmacy-ai-insight/glucoseUtils.ts`에 존재 | 동일 — 호출 경로 없음 |
| 위험도 점수 | **없음** | 환자별 위험 점수 시스템 자체가 없음 |
| 패턴 탐지 | `getPatternDescription()` 존재 | 설명 텍스트만 존재, 실제 패턴 탐지 알고리즘 없음 |
| 시간대 분석 | `getTimeSlot()` 유틸 존재 | 입력 데이터 없어서 사용 불가 |
| GMI (추정 HbA1c) | Frontend에 하드코딩 (6.8%) | 계산 로직 없음 |
| InsightsPage 데이터 | 42명 합성 데이터, `Math.random()` | **API 호출 0건**, 완전 목업 |

### L3. 약사 코칭 레이어

| 항목 | 현황 | GAP |
|------|------|-----|
| 상담 세션 기록 | GlycopharmRequestActionLog (action_type: consultation_log) | 비즈니스 상담만, 혈당 코칭 아님 |
| 코칭 워크플로우 | **없음** | 약사→환자 구조화된 코칭 프로세스 없음 |
| 개입 기록 | **없음** | 혈당 기반 개입 추적 시스템 없음 |
| 상담 노트 | GlycopharmCustomerRequest.handle_note | 자유 텍스트만, 구조화 안 됨 |
| AI 코칭 보조 | `pharmacy-ai-insight` 패키지 존재 | 인사이트 카드 생성은 되지만, 코칭 워크플로우에 연결 안 됨 |
| 방문 추적 | GlucoseViewCustomer.visit_count | 카운터만, 방문 내용 기록 없음 |
| ConsultationLog | `cosmetics-seller-extension`에만 존재 | **GlycoPharm/GlucoseView에는 없음** |

### L4. 성과 분석 레이어

| 항목 | 현황 | GAP |
|------|------|-----|
| 펀넬 리포트 | ReportService (Event→Request→Action 전환율) | 비즈니스 펀넬만, 혈당 개선 펀넬 아님 |
| 청구 리포트 | InvoiceService 완전 구현 | — (비즈니스 목적 달성) |
| 혈당 개선율 | **없음** | 코칭 전후 TIR/CV 비교 없음 |
| 약국별 성과 | **없음** | 약국별 환자 관리 KPI 없음 |
| ROI 분석 | **없음** | 개입 비용 대비 효과 측정 없음 |
| 환자 트렌드 | Frontend에 합성 데이터 | 실제 데이터 기반 트렌드 없음 |

---

## 5. GlucoseView 독립성 분석

### 결합 지점

| 결합 | 유형 | 세부 |
|------|------|------|
| `glucoseview_pharmacies.glycopharm_pharmacy_id` | Soft FK (nullable) | GlycoPharm 약국과 선택적 연결 |
| Auth | 별도 토큰 (`glucoseview_access_token`) | GlycoPharm과 다른 인증 경로 |
| Routes | 별도 (`/api/v1/glucoseview/`) | 완전 분리 |
| Entities | 별도 스키마 (`glucoseview_*`) | 완전 분리 |
| Frontend | 별도 서비스 (`web-glucoseview`) | 완전 분리 |
| API Server | 공유 (`apps/api-server`) | 같은 Express 인스턴스 내 |

### 판단

**GlucoseView는 논리적으로 독립 서비스이나, 물리적으로 api-server에 결합되어 있다.**

- 독립 DB 스키마, 독립 프론트엔드, 독립 라우트 → **서비스 분리 가능**
- 다만 `glycopharm_pharmacy_id` soft FK를 통해 GlycoPharm 약국과 연결 → **완전 독립은 아님**
- 약사 회원 체계 (Branch → Chapter → Pharmacist)는 GlucoseView 고유

---

## 6. pharmacy-ai-insight 패키지 진단

### 구조

```
packages/pharmacy-ai-insight/
├── src/
│   ├── backend/
│   │   ├── services/AiInsightService.ts    ← AI 인사이트 생성
│   │   ├── services/ProductHintService.ts  ← 제품 유형 힌트
│   │   ├── utils/glucoseUtils.ts           ← TIR/CV/패턴 계산
│   │   ├── dto/index.ts                    ← 입출력 계약
│   │   └── controllers/InsightController.ts
│   ├── frontend/                            ← 빈 구조
│   └── manifest.ts
```

### 평가

| 기능 | 상태 | 비고 |
|------|------|------|
| TIR 계산 | 구현됨 | `calculateTIR()` — 정상 작동하는 순수 함수 |
| CV 계산 | 구현됨 | `calculateCV()` — 표준편차 기반 |
| 변동성 판단 | 구현됨 | `getVariabilityLevel()` — low/moderate/high |
| 패턴 설명 | 구현됨 | `getPatternDescription()` — 텍스트만 |
| 시간대 분류 | 구현됨 | `getTimeSlot()` — 6개 시간대 |
| 인사이트 생성 | 구현됨 | `AiInsightService.generateInsight()` |
| **실제 호출 경로** | **불명확** | Extension 활성화 여부에 따라 다름 |

**핵심 문제**: 유틸리티 함수는 존재하지만, **입력 데이터(CGM readings)**가 없어 실제로 사용되지 않는다.
패키지의 `glucoseUtils.ts`는 `number[]` 배열을 입력으로 받지만, 그 배열을 제공하는 데이터 소스가 없다.

---

## 7. Frontend 구조 진단

### 7-A. GlycoPharm Frontend (web-glycopharm)

| 역할 | 라우트 | 상태 |
|------|--------|------|
| Pharmacy Dashboard (Cockpit) | `/pharmacy/` | 완전 구현, API 연동 |
| Store Main (Phase 1-2) | `/pharmacy/store-main` | 완전 구현 |
| Customer Requests (Phase 1) | `/pharmacy/requests` | 완전 구현 |
| Funnel (Phase 3-A) | `/pharmacy/funnel` | 완전 구현 |
| Billing (Phase 3-B/C/D) | `/operator/reports`, `/invoices` | 완전 구현 |
| Operator Dashboard (Signal) | `/operator/` | 완전 구현 |
| **Patient Management** | `/pharmacy/patients` | 고객 목록만, CGM 데이터 없음 |

### 7-B. GlucoseView Frontend (web-glucoseview)

| 기능 | 라우트 | 상태 |
|------|--------|------|
| Home + Hero | `/` | Operational Alpha v0.8.0 |
| Dashboard | `/dashboard` | 약국 정보 + 서비스 상태 |
| **Patient List** | `/patients` | **localStorage 기반**, API는 존재하나 미연결 |
| **Insights** | `/insights` | **100% 합성 데이터** (42명 Math.random) |
| Registration | `/register` | 약사 회원가입 구현됨 |
| Application | `/apply` | CGM View 서비스 신청 구현됨 |

**핵심 문제**: InsightsPage는 API를 전혀 호출하지 않고, 프론트엔드에서 `Math.random()`으로 42명의 가짜 데이터를 생성하여 UI를 렌더링한다.

---

## 8. GAP 목록 (설계 사양 대비)

| # | GAP ID | 레이어 | 설명 | 심각도 |
|---|--------|--------|------|--------|
| 1 | **GAP-L1-01** | L1 | `cgm_patients` 테이블 마이그레이션 없음 — 스키마 자체가 존재하지 않음 | CRITICAL |
| 2 | **GAP-L1-02** | L1 | `cgm_patient_summaries` 테이블 마이그레이션 없음 | CRITICAL |
| 3 | **GAP-L1-03** | L1 | `cgm_glucose_insights` 테이블 마이그레이션 없음 | CRITICAL |
| 4 | **GAP-L1-04** | L1 | CGM 데이터 인입 경로 없음 — 벤더 API 연동, 파일 임포트 모두 미구현 | HIGH |
| 5 | **GAP-L1-05** | L1 | GlucoseViewConnection.config에 연동 설정만 있고 실제 sync 로직 없음 | HIGH |
| 6 | **GAP-L2-01** | L2 | 환자별 위험도 점수 시스템 없음 — 계산 함수는 있으나 호출 경로 없음 | CRITICAL |
| 7 | **GAP-L2-02** | L2 | InsightsPage가 API 미연동 — 42명 합성 데이터(`Math.random()`)만 사용 | HIGH |
| 8 | **GAP-L2-03** | L2 | GMI(추정 HbA1c) 하드코딩 (6.8%) — 계산 로직 없음 | MEDIUM |
| 9 | **GAP-L2-04** | L2 | 패턴 탐지가 텍스트 설명만 — 실제 시계열 분석 알고리즘 없음 | HIGH |
| 10 | **GAP-L2-05** | L2 | `pharmacy-ai-insight` 유틸이 입력 데이터 없이 고립됨 | HIGH |
| 11 | **GAP-L3-01** | L3 | 구조화된 코칭 세션/워크플로우 없음 — 자유 텍스트 노트만 | HIGH |
| 12 | **GAP-L3-02** | L3 | 혈당 기반 개입 추적 시스템 없음 | HIGH |
| 13 | **GAP-L3-03** | L3 | AI 인사이트 → 코칭 워크플로우 연결 없음 | MEDIUM |
| 14 | **GAP-L3-04** | L3 | ConsultationLog가 cosmetics-seller-extension에만 존재, GlycoPharm에 없음 | MEDIUM |
| 15 | **GAP-L4-01** | L4 | 혈당 개선율 측정 시스템 없음 — 코칭 전후 비교 불가 | HIGH |
| 16 | **GAP-L4-02** | L4 | 약국별 환자 관리 KPI 없음 | MEDIUM |
| 17 | **GAP-L4-03** | L4 | 개입 ROI 분석 없음 | LOW |

### 심각도 분포

| 심각도 | 건수 | 해당 GAP |
|--------|------|----------|
| CRITICAL | 4 | GAP-L1-01, L1-02, L1-03, L2-01 |
| HIGH | 8 | GAP-L1-04, L1-05, L2-02, L2-04, L2-05, L3-01, L3-02, L4-01 |
| MEDIUM | 4 | GAP-L2-03, L3-03, L3-04, L4-02 |
| LOW | 1 | GAP-L4-03 |

---

## 9. 리팩토링 우선순위 권고

### Level 1 (Foundation — 다른 모든 것의 전제)

> **cgm_* 테이블 생성 + 데이터 인입 경로 확보**

| 작업 | GAP 해소 | 설명 |
|------|----------|------|
| cgm_patients 마이그레이션 생성 | GAP-L1-01 | 환자 프로필 테이블 |
| cgm_patient_summaries 마이그레이션 생성 | GAP-L1-02 | 기간별 요약 테이블 |
| cgm_glucose_insights 마이그레이션 생성 | GAP-L1-03 | AI/알고리즘 인사이트 |
| CGM 데이터 인입 API (수동/파일) | GAP-L1-04 | 최소한 수동 입력 경로 |

**이유**: 테이블이 없으면 L2~L4 전체가 작동 불가. Repository의 raw SQL이 런타임 에러를 발생시킬 것.

### Level 2 (Analysis — L1 완료 후)

> **위험도 계산 서비스 + Frontend API 연동**

| 작업 | GAP 해소 | 설명 |
|------|----------|------|
| RiskScoringService 구현 | GAP-L2-01 | TIR/CV 기반 환자별 위험 점수 |
| InsightsPage API 연동 | GAP-L2-02 | 합성 데이터 → 실제 API 호출 |
| pharmacy-ai-insight 호출 경로 연결 | GAP-L2-05 | 유틸 → 서비스 → 컨트롤러 |
| 패턴 탐지 알고리즘 | GAP-L2-04 | 시계열 기반 패턴 분석 |

### Level 3 (Coaching + Performance — L2 완료 후)

> **코칭 워크플로우 + 성과 측정**

| 작업 | GAP 해소 | 설명 |
|------|----------|------|
| CoachingSession 엔티티 + 서비스 | GAP-L3-01, L3-02 | 구조화된 코칭 기록 |
| AI → 코칭 통합 | GAP-L3-03 | 인사이트 기반 코칭 제안 |
| 혈당 개선율 대시보드 | GAP-L4-01 | 코칭 전후 TIR/CV 비교 |
| 약국별 KPI 대시보드 | GAP-L4-02 | 관리 환자 수, 개선율 |

---

## 10. 현재 실제 작동하는 것 (What Works)

부정적 측면만 강조하지 않기 위해, **현재 완전히 작동하는 기능**을 명시한다.

### GlycoPharm (Production-Grade)

1. **약국 서비스 신청/승인 워크플로우** — Application → Review → Approve/Reject
2. **제품 카탈로그 관리** — CRUD + 감사 로그 + 추천 큐레이션
3. **Event → Request → Action 파이프라인** — 완전 자동화 (쿨다운, 프로모션 규칙)
4. **청구/정산** — DRAFT → CONFIRMED → ARCHIVED + 디스패치 추적
5. **펀넬 시각화** — Event→Request→Approved→Action 전환율
6. **Operator Signal Dashboard** — 실시간 서비스 상태 모니터링
7. **Pharmacy Cockpit** — 5블록 구조 대시보드 (API 연동)
8. **Store Front** — 소비자 대면 매장, 장바구니, 주문
9. **디지털 사이니지** — 플레이리스트, 미디어, 스케줄 관리
10. **포럼** — 커뮤니티 게시판 + 카테고리 요청

### GlucoseView (Alpha-Grade)

1. **약사 회원 가입/승인** — Branch → Chapter → Pharmacist 계층 구조
2. **CGM View 서비스 신청** — Application → Approval 워크플로우
3. **고객(환자) CRUD** — 약사별 스코핑, 방문 추적
4. **벤더/프로필 관리** — CGM 제조사, 표시 설정 CRUD
5. **UI 프레임워크** — InsightsPage의 카드/모달/필터링 UI (데이터만 가짜)

---

## 11. 핵심 결론

1. **GlycoPharm은 "약국 비즈니스 운영 플랫폼"으로는 성숙했다.**
   Event→Request→Action→Billing 파이프라인이 완전히 작동한다.

2. **GlucoseView는 "혈당 관리 플랫폼"으로는 기반만 존재한다.**
   약사 회원 체계와 UI 프레임워크는 있지만, 핵심 데이터 레이어(cgm_* 테이블)가 없다.

3. **L2(분석)와 L3(코칭) 사이에 가장 큰 단절이 있다.**
   - 계산 유틸리티(`pharmacy-ai-insight`)는 존재하지만 호출되지 않음
   - 코칭 구조는 GlycoPharm의 비즈니스 상담에만 존재, 혈당 관리 코칭은 없음

4. **GlucoseView는 독립 서비스로 분리 가능하나, 현재는 api-server에 결합되어 있다.**
   독립 스키마, 독립 프론트엔드, 독립 인증 → 분리 조건 충족.

5. **4레이어 설계 사양 대비 현재 구현 수준:**

| 레이어 | 구현율 | 상태 |
|--------|--------|------|
| L1. 데이터 수집 | ~20% | 엔티티/UI만 존재, 핵심 테이블 없음 |
| L2. 데이터 분석 | ~15% | 유틸 함수만 존재, 호출 경로 없음 |
| L3. 약사 코칭 | ~10% | 비즈니스 상담만, 혈당 코칭 없음 |
| L4. 성과 분석 | ~5% | 비즈니스 KPI만, 혈당 성과 없음 |

---

*Investigation Report — Read-Only, No Code Changes*
*Version: 1.0*
*Status: Complete*
