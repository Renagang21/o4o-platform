# Care Core Architecture

> Status: Frozen (WO-O4O-CARE-CORE-DOMAIN-REFORM)
> Last Updated: 2026-03-06

---

## 1. Core / Extension 구분

```
Care Core (이 모듈)
  = Health Data Engine
  = Patient, Analysis, KPI, Coaching의 도메인 로직

Service Extensions (Care Core를 사용하는 서비스)
  = GlycoPharm Extension (약국 운영 관점)
  = GlucoseView Extension (환자 개인 관점)
```

Care Core는 **서비스 중립적**이다.
특정 서비스(glycopharm, glucoseview)의 비즈니스 로직을 포함하지 않는다.

---

## 2. Core Domain

| Domain | 설명 | 저장소 |
|--------|------|--------|
| Patient | 환자 모델 | `glucoseview_customers` (외부 테이블) |
| Analysis | CGM 데이터 분석 (TIR/CV/Risk) | 계산 결과만 영속화 |
| KPI Snapshot | 분석 결과 스냅샷 | `care_kpi_snapshots` |
| Coaching Session | 약사-환자 코칭 기록 | `care_coaching_sessions` |

### Patient 규칙

- `glucoseview_customers` 테이블을 그대로 사용
- `care_patients` 테이블은 존재하지 않으며 만들지 않는다
- Patient scoping: `organization_id` (약국 소속)

### CGM 데이터 규칙

- CGM 데이터는 DB에 저장하지 않는다
- `CgmProvider` 인터페이스를 통해 매 요청마다 조회/생성
- 현재 구현: `MockCgmProvider` (합성 데이터)
- 향후: `VendorCgmProvider` (외부 CGM 기기 연동)
- DB에는 파생 KPI만 영속화 (`care_kpi_snapshots`)

---

## 3. Module Structure

```
modules/care/
├── care-pharmacy-context.middleware.ts   # 약국 스코프 미들웨어 (공유)
│
├── domain/
│   ├── dto.ts                           # CareInsightDto
│   ├── analysis/
│   │   ├── analysis.engine.ts           # 순수 함수: readings → TIR/CV/Risk
│   │   └── analysis.provider.ts         # AnalysisProvider 인터페이스 + Default 구현
│   └── provider/
│       └── cgm.provider.ts              # CgmProvider 인터페이스
│
├── services/
│   ├── coaching/
│   │   └── care-coaching-session.service.ts
│   └── kpi/
│       └── care-kpi-snapshot.service.ts
│
├── controllers/
│   ├── care-analysis.controller.ts      # GET /analysis/:patientId, GET /kpi/:patientId
│   ├── care-coaching.controller.ts      # POST /coaching, GET /coaching/:patientId
│   └── care-dashboard.controller.ts     # GET /dashboard
│
├── infrastructure/provider/
│   ├── mock-cgm.provider.ts             # MockCgmProvider (기본값)
│   └── ai-analysis.provider.ts          # AiInsightProvider (opt-in)
│
└── entities/
    ├── care-kpi-snapshot.entity.ts       # care_kpi_snapshots
    └── care-coaching-session.entity.ts   # care_coaching_sessions
```

---

## 4. API Endpoints

모든 Care API는 `/api/v1/care`에 마운트된다.

| Method | Path | 기능 |
|--------|------|------|
| GET | `/analysis/:patientId` | CGM 분석 실행 + KPI 자동 기록 |
| GET | `/kpi/:patientId` | 최근 2개 스냅샷 비교 (트렌드) |
| POST | `/coaching` | 코칭 세션 생성 |
| GET | `/coaching/:patientId` | 코칭 세션 목록 |
| GET | `/dashboard` | 대시보드 집계 (환자수, risk 분포, 최근 활동) |

모든 엔드포인트: `authenticate` + `PharmacyContextMiddleware` 적용

---

## 5. Service Extensions

### GlycoPharm Extension — Pharmacy Care Operations

약국 운영자가 환자를 관리하는 관점.

| 역할 | 설명 |
|------|------|
| Patient Management | 환자 목록, 상세, risk 필터링 |
| Care Dashboard | 약국별 KPI 요약, risk 분포 |
| Coaching Management | 코칭 세션 생성/조회 |
| Pharmacy Workflow | 약국 컨텍스트 기반 데이터 격리 |

Frontend: `web-glycopharm/src/pages/care/*` (9 페이지)
API 호출: `/api/v1/care/dashboard`, `/api/v1/glycopharm/pharmacy/customers`

### GlucoseView Extension — Patient Self Service

환자 본인이 자신의 건강 데이터를 확인하는 관점.

| 역할 | 설명 |
|------|------|
| Patient Dashboard | 개인 환자 대시보드 |
| Glucose Logging | 혈당 기록 입력 |
| Analysis View | 분석 결과 조회 |
| Personal Report | 개인 리포트 |

Frontend: `web-glucoseview/src/pages/CareDashboardPage.tsx`, `PatientsPage.tsx`
API 호출: `/api/v1/care/dashboard`, `/api/v1/glucoseview/customers`

---

## 6. Boundary Rules

### Care Core는 다음과 직접 연결되지 않는다

- Commerce (orders, payments, checkout)
- Products (glycopharm_products, product_masters)
- Store/HUB (organization_stores, store_blog_posts)

### Care Core Dependency

```
users           → 인증 (JWT)
organizations   → 약국 소속 확인
glucoseview_customers → 환자 모델
```

### Extension은 Core를 사용한다 (역방향 금지)

```
✅ GlycoPharm → Care Core API (/api/v1/care/*)
✅ GlucoseView → Care Core API (/api/v1/care/*)
❌ Care Core → GlycoPharm 코드
❌ Care Core → GlucoseView 코드
```

### PharmacyContextMiddleware — 공유 미들웨어

- Care controllers와 GlycoPharm routes 양쪽에서 사용
- 위치: `modules/care/care-pharmacy-context.middleware.ts` (Core에 귀속)
- 역할: `req.pharmacyId` 설정 (admin은 null = 전역 접근)

---

## 7. 확장 가능성

Care Core는 Health Data Engine으로서 다음 서비스에도 확장 가능:

```
glycopharm    → 약국 혈당 관리 (현재)
glucoseview   → 환자 자기 관리 (현재)
hypertension  → 고혈압 관리 (향후)
weight        → 체중 관리 (향후)
wellness      → 웰니스 (향후)
```

확장 시 새 `CgmProvider` 구현체, 새 `AnalysisProvider` 구현체를
`infrastructure/provider/`에 추가하면 된다.
