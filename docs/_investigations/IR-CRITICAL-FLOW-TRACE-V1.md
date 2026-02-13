# IR-CRITICAL-FLOW-TRACE-V1

## Critical Flow Trace — 4 Core Execution Paths

> **Step 2.5**: Critical Flow Trace
> **Date**: 2026-02-13
> **Type**: Investigation Report (Read-Only)

---

## 1. GlucoseView Patients Flow

**Status: 🟡 Partial — Backend exists, Frontend disconnected**

### Trace

```
PatientsPage.tsx
  ↓ localStorage (glucoseview_customers_{userId})     ← 🔴 MOCK
  ✗ API 호출 없음

api.ts (Frontend API Client)
  ↓ listCustomers(), createCustomer(), etc.             ← ✅ 정의됨 (미사용)
  → GET /api/v1/glucoseview/customers

customer.controller.ts
  ↓ 7 endpoints (GET/POST/PUT/DELETE + stats + visit)   ← ✅ 구현됨
  → CustomerService

customer.service.ts
  ↓ TypeORM QueryBuilder                                ← ✅ 구현됨
  → GlucoseViewCustomer Repository

glucoseview-customer.entity.ts
  → glucoseview_customers 테이블                         ← ✅ Real Table
```

### 발견

| 항목 | 결과 |
|------|------|
| Frontend → Backend 연결 | ❌ **끊어짐** — PatientsPage가 api.ts를 import하지 않음 |
| Backend API 존재 | ✅ 7개 endpoint 완전 구현 |
| DB 테이블 | ✅ `glucoseview_customers` (TypeORM entity) |
| Raw SQL | ❌ 없음 (TypeORM only) |
| Ghost table 접근 | ❌ **없음** — Customer flow는 cgm_* 테이블 미참조 |
| 런타임 위험 | **LOW** — Backend 정상, Frontend만 교체하면 됨 |

### 수정 난이도

**LOW** — PatientsPage에서 `localStorage` 호출을 `api.listCustomers()` 등으로 교체하면 즉시 live 전환 가능. Backend API가 이미 존재.

---

## 2. GlucoseView Insights Flow

**Status: 🔴 Critical — Ghost table 접근, 다중 단절**

### Trace

```
InsightsPage.tsx
  ↓ Math.random() × 42명                               ← 🔴 100% MOCK
  ✗ API 호출 없음

Backend (2개 Controller 병존):

[Modern] glucoseview.controller.ts
  ↓ GET /patients, GET /patients/:id
  → GlucoseViewService
  → GlucoseViewRepository

[Legacy] glucoseviewController.ts
  ↓ GET /api/v1/glucoseview/patients/*
  → pool.query() (raw SQL)

GlucoseViewRepository
  ↓ findAllPatients()     → SELECT * FROM cgm_patients          ← ⚠️ GHOST
  ↓ findPatientSummaries() → SELECT * FROM cgm_patient_summaries ← ⚠️ GHOST
  ↓ findPatientInsights()  → SELECT * FROM cgm_glucose_insights  ← ⚠️ GHOST
```

### 발견

| 항목 | 결과 |
|------|------|
| Frontend → Backend 연결 | ❌ **완전 단절** — Math.random() only |
| Backend endpoint 존재 | ⚠️ 2개 컨트롤러 병존 (Modern + Legacy) |
| Ghost table 접근 | 🔴 **3개 ghost table 직접 쿼리** |
| Migration | ❌ 과거 존재(`CreateCgmTables1735617600000`) → **현재 삭제됨** |
| TypeORM Entity | ❌ cgm_* 테이블에 대한 Entity 없음 (raw SQL only) |
| 런타임 위험 | **HIGH** — endpoint 호출 시 `relation "cgm_patients" does not exist` 에러 |
| AI 패키지 연결 | ❌ `pharmacy-ai-insight` 미연결 |

### Ghost Table 참조 파일

| File | Lines | Tables |
|------|-------|--------|
| `routes/glucoseview/repositories/glucoseview.repository.ts` | 249-313 | cgm_patients, cgm_patient_summaries, cgm_glucose_insights |
| `controllers/glucoseview/glucoseviewController.ts` | 17-85 | cgm_patients, cgm_patient_summaries, cgm_glucose_insights |

### 수정 난이도

**HIGH** — cgm_* 테이블 migration 재생성 + data ingestion 경로 확보 필요. 단순 연결로는 해결 불가.

---

## 3. GlycoPharm Commerce Flow

**Status: 🟡 Partial — Billing 완전, Commerce 중간 단절**

### Trace

```
[Consumer Store → Cart]
StoreCart.tsx
  ↓ storeApi.getCart(), updateCartItem(), removeFromCart()  ← ✅ API 호출
  → GET/PATCH/DELETE /api/v1/glycopharm/stores/{slug}/cart
  → Cart Controller                                         ← ❌ MISSING (404)

[Cart → Order]
StoreCart.tsx "주문하기" 버튼
  ↓ alert('주문이 접수되었습니다')                             ← 🔴 TODO stub
  ✗ checkout API 미호출

checkout.controller.ts (Backend)
  ↓ POST /api/v1/glycopharm/checkout/                        ← ✅ 구현됨
  → orderRepo.create() + orderItemRepo.save()                ← ⚠️ VIOLATION
  → ecommerce_orders 테이블                                   ← ✅ E-commerce Core

[Billing — 별도 경로]
invoice.controller.ts
  ↓ POST /invoices (DRAFT)                                   ← ✅ Live
  ↓ POST /invoices/:id/confirm (CONFIRMED)                   ← ✅ Live
  → glycopharm_billing_invoices 테이블

invoice-dispatch.controller.ts
  ↓ POST /invoices/:id/send                                  ← ✅ Live
  → pdfkit PDF + CSV 생성 → emailService.sendEmail()          ← ✅ Live
```

### 발견

| 항목 | 결과 |
|------|------|
| Store → Cart | ⚠️ Frontend 호출 O, **Backend cart controller 없음** (404) |
| Cart → Order | 🔴 **Frontend TODO stub** (alert only) |
| Checkout Backend | ✅ 구현됨 (Frontend에서 미호출) |
| `checkoutService.createOrder()` | ❌ **VIOLATION** — 직접 `orderRepo.create()` 사용 |
| OrderType.GLYCOPHARM | ⚠️ **CLAUDE.md 모순** — "BLOCKED"이라 하지만 실제 코드에서 사용 중 |
| Billing Invoice | ✅ **완전 작동** — DRAFT→CONFIRMED→DISPATCH |
| Invoice Migration | ✅ `1739180400000-CreateGlycopharmBillingInvoices.ts` 존재 |
| Payment 처리 | ❌ **미구현** — PG 연동 없음, 수동 처리 |
| Dead routes | ⚠️ Checkout 3개 endpoint (Backend 존재, Frontend 미호출) |

### Commerce vs Billing 분리

```
[Commerce Path — BROKEN]
Store → Cart(404) → Checkout(TODO) → Order(unreachable) → Payment(없음)

[Billing Path — WORKING]
BillingPreview → InvoiceDraft → InvoiceConfirm → InvoiceDispatch(PDF+Email) ✅
```

**핵심**: Billing은 상담 서비스 청구 시스템이며, 제품 주문과 **별개 경로**.

### CLAUDE.md 위반 사항

| Rule | 위반 | Detail |
|------|------|--------|
| §7 `checkoutService.createOrder()` 필수 | ❌ 위반 | `orderRepo.create()` 직접 사용 |
| §7 OrderType.GLYCOPHARM BLOCKED | ⚠️ 모순 | 코드에서 실제 사용 중 |

### IR-GLYCOPHARM-DATA-MODEL-V1 정정

> **이전 보고서에서 `glycopharm_billing_invoices`에 migration 없다고 기재했으나,
> 실제로는 `1739180400000-CreateGlycopharmBillingInvoices.ts` + `1739266800000-AddInvoiceDispatchFields.ts`가 존재.**
> 이전 보고서의 해당 항목은 **오류**임.

---

## 4. AI Insight Wiring

**Status: 🟡 Frontend-only Dormant — 완전 Dormant는 아님**

### Trace

```
[Admin Dashboard — Frontend]
admin-menu.static.tsx
  → "AI Insight" 메뉴 (line 365-369)                       ← ✅ 존재
App.tsx
  → lazy import SummaryPage (line 217)                      ← ✅ 존재
  → Route /pharmacy-ai-insight (lines 1538-1546)            ← ✅ 존재
  → AppRouteGuard + AdminProtectedRoute                     ← ✅ 권한 체크
rolePermissions.ts
  → 'pharmacy-ai-insight.read' (lines 92-95)                ← ✅ 정의됨

SummaryPage.tsx
  → fetchInsight()                                          ← 🔴 MOCK (hardcoded)
  ✗ API 호출 없음

[API Server — Backend]
package.json     → ❌ dependency 없음
main.ts          → ❌ route 등록 없음
src/ 전체         → ❌ import 0건
deploy-api.yml   → ❌ build step 없음
appsCatalog.ts   → ✅ status: 'active' (메타데이터 only)

[Package 자체]
InsightController     → ✅ 구현 (createInsightRoutes)
AiInsightService      → ✅ 구현 (generateInsight)
ProductHintService    → ✅ 구현 (generateHints)
glucoseUtils          → ✅ 구현 (calculateTIR, calculateCV)
Lifecycle hooks       → ⚠️ Stub (console.log only)
```

### 발견

| 항목 | 결과 |
|------|------|
| 완전 Dormant? | **NO** — Admin Dashboard에서 SummaryPage 렌더링됨 |
| Partially wired? | **YES** — Frontend wired, Backend disconnected |
| Hidden extension? | **NO** — 조건부 활성화 메커니즘 없음 |
| 런타임 위험 | **LOW** — Mock UI는 정상 표시, API 404는 사용자 미도달 |

### Activation 최소 단계

| Step | 작업 | 난이도 |
|------|------|--------|
| 1 | api-server package.json에 dependency 추가 | LOW |
| 2 | main.ts에 route 등록 (`app.use('/api/v1/pharmacy-ai-insight', ...)`) | LOW |
| 3 | deploy-api.yml Layer 4에 build step 추가 | LOW |
| 4 | SummaryPage mock → real API 호출 교체 | LOW |
| 5 | CGM 데이터 테이블 + 인입 경로 확보 (Flow 2 전제) | **HIGH** |

**Step 1-4는 LOW effort지만, Step 5 (데이터 소스)가 없으면 실제 인사이트 생성 불가.**

---

## 5. 종합 판정

| Flow | Status | 런타임 위험 | Ghost Table | Dead Code | DB 연결 |
|------|--------|-----------|-------------|-----------|---------|
| **1. GV Patients** | 🟡 Partial | LOW | ❌ 없음 | ❌ 없음 | ✅ Real table |
| **2. GV Insights** | 🔴 Critical | **HIGH** | **🔴 3개** | ⚠️ Legacy controller | ❌ Ghost tables |
| **3. GP Commerce** | 🟡 Partial | MEDIUM | ❌ 없음 | ⚠️ Cart(missing), Checkout(TODO) | ✅ Real tables |
| **4. AI Wiring** | 🟡 Dormant | LOW | ❌ 없음 | ❌ 없음 | N/A (미연결) |

### 🔴 발견 — Step 3 전 구조 수정 필요 항목

**Flow 2 (GlucoseView Insights)가 🔴**:
- Repository가 존재하지 않는 ghost table을 raw SQL로 쿼리
- 이 endpoint를 호출하면 **런타임 에러** 발생
- Migration이 과거 삭제됨 — 테이블 재생성 또는 코드 제거 필요

### 🟡 주의 사항

1. **Flow 3 CLAUDE.md 모순**: OrderType.GLYCOPHARM이 "BLOCKED"으로 문서화되었으나 실제 코드에서 사용 중. 문서 또는 코드 정리 필요.
2. **Flow 3 checkoutService 위반**: 직접 `orderRepo.create()` 사용 중.
3. **IR-GLYCOPHARM-DATA-MODEL-V1 오류 정정**: `glycopharm_billing_invoices`는 migration이 존재함 (이전 보고서 오류).

---

*Investigation Report - Read-Only, No Code Changes*
*Version: 1.0*
*Status: Complete*
