# IR-O4O-TABLET-INTEREST-WORKFLOW-AUDIT-V1

> Tablet Interest Workflow 3단계 연결 구조 조사
> 조사일: 2026-03-15
> 상태: **조사 완료**

---

## Executive Summary

| 질문 | 답변 | 판정 |
|------|------|------|
| 소비자 관심 표시 API가 존재하는가? | YES — `POST /tablet/interest` | **구현됨** |
| 매장 관리자 확인 API가 존재하는가? | YES — `PATCH /interest/:id/acknowledge` | **구현됨** |
| Tablet 화면에 상태가 반영되는가? | **NO** — Interest용 고객 폴링 없음 | **미구현** |
| Tablet UI에 관심 표시 버튼이 있는가? | **NO** — Backend만 존재 | **미구현** |
| 직원 관리 화면에 Interest 관리 UI가 있는가? | **NO** — 3개 서비스 모두 없음 | **미구현** |

**최종 판정: PARTIAL**

3단계 Workflow `소비자 관심 → 근무자 확인 → Tablet 표시` 중 **Backend 계층은 완성**되어 있으나, **Frontend 계층은 미구현**이다.

---

## 핵심 발견: 두 개의 Request 시스템

O4O Tablet에는 **두 가지 독립적인 요청 시스템**이 존재한다.

| 항목 | Service Request (서비스 요청) | Interest Request (관심 요청) |
|------|:----------------------------:|:----------------------------:|
| **테이블** | `tablet_service_requests` | `tablet_interest_requests` |
| **모델** | 카트 기반 (다중 상품) | 단일 상품 관심 |
| **Tablet UI** | **구현됨** — "주문 요청" 버튼 | **미구현** |
| **고객 폴링** | **구현됨** — 3초 간격 | **미구현** |
| **직원 관리 UI** | **구현됨** — TabletRequestsPage | **미구현** |
| **Backend API** | **완성** | **완성** |
| **상태 모델** | requested → acknowledged → served/cancelled | REQUESTED → ACKNOWLEDGED → COMPLETED/CANCELLED |

**Service Request**는 End-to-End 완성이다. **Interest Request**는 Backend-only 상태이다.

---

## 1. Interest Request 생성 (4.1)

### 1.1 Backend API — 완성

| 항목 | 내용 |
|------|------|
| Endpoint | `POST /api/v1/stores/:slug/tablet/interest` |
| 파일 | `unified-store-public.routes.ts:938-998` |
| 인증 | 없음 (공개 키오스크) |
| Rate Limit | 10건/10분/IP |

**Request:**
```json
{
  "masterId": "uuid (필수 — ProductMaster ID)",
  "customerName": "홍길동 (선택, max 100자)",
  "customerNote": "오전 상담 희망 (선택, max 200자)"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "requestId": "uuid",
    "status": "REQUESTED",
    "productName": "상품명 (ProductMaster.marketingName)",
    "createdAt": "2026-03-15T09:00:00.000Z"
  }
}
```

**Validation:**
- `masterId` 필수, UUID 형식
- `ProductMaster` 존재 여부 확인 (404 if not found)
- `organizationId`는 slug → `resolvePublicStore()` → storeId로 변환

### 1.2 Tablet UI — 미구현

| 항목 | 현재 상태 |
|------|----------|
| "관심 있어요" 버튼 | **없음** |
| Interest API 클라이언트 함수 | **없음** — `tablet.ts`에 export 안 됨 |
| 상품 카드 내 Interest 트리거 | **없음** |

**현재 Tablet 키오스크 동작:**

```
TabletStorePage.tsx (KPA)
  ↓
상품 클릭 → 카트에 추가 (1-click add)
  ↓
"주문 요청" 버튼 → submitTabletRequest() → Service Request 생성
```

Interest Request를 생성하는 UI 경로가 존재하지 않는다.
상품을 카트에 넣고 "주문 요청"을 하면 Service Request가 생성된다.
단일 상품에 대한 "관심 표시" 개별 버튼은 구현되어 있지 않다.

---

## 2. Interest DB 구조 (4.2)

### 2.1 테이블: `tablet_interest_requests`

| 컬럼 | 타입 | Nullable | 설명 |
|------|------|:--------:|------|
| `id` | UUID | NO | PK, `gen_random_uuid()` |
| `organization_id` | UUID | NO | FK → organizations (CASCADE) |
| `master_id` | UUID | NO | FK → product_masters (CASCADE) |
| `product_name` | VARCHAR(255) | NO | 스냅샷 (비정규화) |
| `customer_name` | VARCHAR(100) | YES | 고객명 |
| `customer_note` | TEXT | YES | 고객 메모 |
| `status` | ENUM | NO | 기본값: REQUESTED |
| `created_at` | TIMESTAMP | NO | 생성일 |
| `updated_at` | TIMESTAMP | NO | 수정일 |
| `acknowledged_at` | TIMESTAMP | YES | 확인 시각 |
| `completed_at` | TIMESTAMP | YES | 완료 시각 |
| `cancelled_at` | TIMESTAMP | YES | 취소 시각 |

**Entity 파일:** `apps/api-server/src/routes/platform/entities/tablet-interest-request.entity.ts`
**Migration:** `apps/api-server/src/database/migrations/20260301400000-TabletInterestRequests.ts`

### 2.2 상태 모델

```typescript
enum InterestRequestStatus {
  REQUESTED = 'REQUESTED',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}
```

### 2.3 인덱스

| 인덱스 | 컬럼 | 용도 |
|--------|------|------|
| `idx_interest_requests_org_status` | (organization_id, status) | 대기 건수 폴링 |
| `idx_interest_requests_org_created` | (organization_id, created_at DESC) | 최근 목록 |
| `idx_interest_requests_master` | (master_id) | 인기 상품 통계 |

### 2.4 Service Request 비교

| 항목 | Interest Request | Service Request |
|------|:----------------:|:---------------:|
| 테이블 | `tablet_interest_requests` | `tablet_service_requests` |
| Boundary | `organization_id` | `pharmacy_id` |
| 상품 참조 | `master_id` (단일) | `items` JSONB (다중) |
| 상태값 | UPPERCASE ENUM | lowercase VARCHAR |
| 완료 상태 | COMPLETED | served |

---

## 3. Store 관리자 확인 구조 (5)

### 3.1 Backend Interest 관리 API — 완성

| Endpoint | Method | 설명 | 파일:라인 |
|----------|:------:|------|----------|
| `/api/v1/store/interest/pending-count` | GET | 대기 건수 (REQUESTED만) | `store-tablet.routes.ts:572` |
| `/api/v1/store/interest/recent` | GET | 최근 50건 (REQUESTED + ACKNOWLEDGED) | `store-tablet.routes.ts:599` |
| `/api/v1/store/interest/stats` | GET | 대시보드 통계 | `store-tablet.routes.ts:638` |
| `/api/v1/store/interest/:id/acknowledge` | PATCH | 확인 처리 | `store-tablet.routes.ts:700` |
| `/api/v1/store/interest/:id/complete` | PATCH | 완료 처리 | `store-tablet.routes.ts:708` |
| `/api/v1/store/interest/:id/cancel` | PATCH | 취소 처리 | `store-tablet.routes.ts:716` |

**인증:** `requireAuth` + `requirePharmacyOwner` (withStoreAuth 미들웨어)
**Boundary:** 모든 쿼리에 `organizationId` 복합 조건 적용

### 3.2 상태 전이 규칙

```
store-tablet.routes.ts:561-566

INTEREST_TRANSITIONS = {
  REQUESTED:    [ACKNOWLEDGED, COMPLETED, CANCELLED]
  ACKNOWLEDGED: [COMPLETED, CANCELLED]
  COMPLETED:    []  ← 종료 상태
  CANCELLED:    []  ← 종료 상태
}
```

**전이 함수:** `handleInterestTransition()` (store-tablet.routes.ts:727-785)

```typescript
1. 요청 조회: findOne({ id, organizationId })  ← Boundary Guard
2. 전이 검증: INTEREST_TRANSITIONS[현재상태].includes(목표상태)
3. 타임스탬프: 상태별 acknowledgedAt / completedAt / cancelledAt 설정
4. 저장 + 응답: { id, status, updatedAt }
```

### 3.3 대시보드 통계 API

```json
GET /api/v1/store/interest/stats

{
  "pendingCount": 3,
  "todayCount": 15,
  "completedTodayCount": 12,
  "topProducts": [
    { "masterId": "uuid", "productName": "인기 상품", "count": 5 }
  ]
}
```

### 3.4 직원 관리 UI — 미구현

| 서비스 | Interest 관리 UI | Service Request 관리 UI |
|--------|:----------------:|:----------------------:|
| KPA Society | **없음** | **있음** — TabletRequestsPage |
| GlycoPharm | **없음** | **있음** — CustomerRequestsPage |
| K-Cosmetics | **없음** | **없음** |

**3개 서비스 모두 Interest Request 전용 관리 화면이 존재하지 않는다.**

---

## 4. 관리자 처리 흐름 (6)

### 4.1 Service Request 처리 흐름 — 완성 (참조)

KPA TabletRequestsPage에서 Service Request를 처리하는 완전한 흐름:

| 버튼 | 라벨 | 색상 | API action |
|------|------|------|-----------|
| 확인 | "확인" | 파란색 | `acknowledge` |
| 완료 | "완료" | 초록색 | `serve` |
| 취소 | "취소" | 빨간 외곽선 | `cancel` |

**파일:** `services/web-kpa-society/src/pages/pharmacy/TabletRequestsPage.tsx`

- 5초 폴링으로 신규 요청 자동 감지 (line 74)
- 요청 카드: 고객명, 경과 시간, 상품 목록, 수량, 가격, 메모
- "NEW" 뱃지 (requested), "확인됨" 뱃지 (acknowledged)

### 4.2 Interest Request 처리 흐름 — Backend만 존재

Backend에 PATCH API는 있으나 이를 호출하는 UI가 없다:

```
API 존재: PATCH /interest/:id/acknowledge  ← 호출하는 UI 없음
API 존재: PATCH /interest/:id/complete     ← 호출하는 UI 없음
API 존재: PATCH /interest/:id/cancel       ← 호출하는 UI 없음
```

---

## 5. Tablet 화면 반영 구조 (7)

### 5.1 Service Request — 완성

```
TabletStorePage.tsx (KPA)

[요청 전송] → viewMode = 'submitted'
     ↓
3초 폴링: GET /stores/:slug/tablet/requests/:id
     ↓
상태별 표시:
  requested    → "요청 접수됨" (노란색)    + "직원이 곧 확인합니다"
  acknowledged → "직원 확인 중" (파란색)    + "직원이 요청을 확인했습니다"
  served       → "완료" (초록색)           + "요청이 완료되었습니다"
  cancelled    → "취소됨" (빨간색)          + "요청이 취소되었습니다"
     ↓
자동 리셋: served/cancelled 후 2분 (120초)
```

**이 흐름은 완전히 동작한다.** 직원이 "확인" 버튼을 누르면 3초 이내 Tablet에 "직원 확인 중"이 표시된다.

### 5.2 Interest Request — 미구현

| 항목 | 현재 상태 |
|------|----------|
| 고객 폴링 엔드포인트 | **없음** — `GET /tablet/interest/:id` 미존재 |
| Tablet 상태 표시 UI | **없음** |
| WebSocket | **없음** |
| Push 알림 | **없음** |

Interest Request를 생성한 후 고객이 상태를 확인할 방법이 없다.

**비교:**

| 항목 | Service Request | Interest Request |
|------|:--------------:|:----------------:|
| 생성 후 requestId 반환 | YES | YES |
| 고객 상태 폴링 API | `GET /tablet/requests/:id` | **없음** |
| Tablet 상태 표시 | 4단계 표시 | **없음** |
| 자동 리셋 | 2분 | **없음** |

---

## 6. Service별 구조 차이 (9)

### 6.1 KPA Society

| 기능 | 상태 | 비고 |
|------|:----:|------|
| Tablet 키오스크 | **완성** | `/tablet/:slug` — TabletStorePage |
| Service Request 생성 | **완성** | "주문 요청" 버튼 |
| Service Request 폴링 | **완성** | 3초 간격 |
| Service Request 직원 관리 | **완성** | TabletRequestsPage |
| Interest Request 생성 UI | **미구현** | |
| Interest Request 직원 관리 | **미구현** | |

### 6.2 GlycoPharm

| 기능 | 상태 | 비고 |
|------|:----:|------|
| Tablet 레이아웃 | **완성** | TabletLayout (직원 보조 모드) |
| Service Request | **완성** | Common Request 시스템 통합 |
| 요청 관리 | **완성** | CustomerRequestsPage (종합 요청) |
| Interest Request 생성 UI | **미구현** | |
| Interest Request 직원 관리 | **미구현** | |

GlycoPharm의 CustomerRequestsPage는 **종합 요청 관리 시스템**(consultation, sample, order, survey_followup, info_followup)으로, Tablet Interest와는 다른 구조이다.

### 6.3 K-Cosmetics

| 기능 | 상태 | 비고 |
|------|:----:|------|
| Tablet 키오스크 | **미구현** | 키오스크 페이지 없음 |
| Tablet 진열 관리 | **완성** | StoreTabletDisplaysPage |
| 자체 상품 관리 | **완성** | StoreLocalProductsPage |
| Service Request | **미구현** | |
| Interest Request | **미구현** | |

K-Cosmetics는 **진열 구성만 관리** 가능하며, Tablet 키오스크 자체가 존재하지 않는다.

### 6.4 공통 Backend

3개 서비스 모두 동일한 Backend API를 사용한다:

```
Platform-level:
  POST /api/v1/stores/:slug/tablet/interest     ← Interest 생성 (공개)
  /api/v1/store/interest/*                       ← Interest 관리 (인증)

O4O Store-level:
  POST /api/v1/stores/:slug/tablet/requests      ← Service Request 생성 (공개)
  GET  /api/v1/stores/:slug/tablet/requests/:id  ← 상태 조회 (공개)
  /api/v1/stores/:slug/tablet/staff/*            ← 직원 관리 (인증)
```

서비스별 별도 구현이 아닌 **Platform-level 공통 API**이며, Frontend만 서비스별로 구현한다.

---

## 7. Architecture 평가 (10)

### 7.1 Domain 분리 준수

```
Display Domain (진열 전용)
  ├ store_local_products
  ├ store_tablet_displays
  └ store_tablets

Tablet Interest Domain (관심 큐)
  └ tablet_interest_requests

Tablet Service Domain (서비스 큐)
  └ tablet_service_requests

Commerce Domain (결제 가능)
  ├ orders
  └ payments
```

**Interest ≠ Order 확인:**
- `tablet_interest_requests`와 `orders` 테이블 간 FK 없음
- Interest API에서 Checkout 경로 없음
- Interest 상태 모델(REQUESTED → COMPLETED)과 Order 상태 모델 완전 독립

### 7.2 Boundary Policy 준수

| 규칙 | Interest Request | Service Request |
|------|:----------------:|:---------------:|
| UUID 단독 조회 금지 | **YES** — `{ id, organizationId }` | **YES** — `{ id, pharmacyId }` |
| Raw SQL Parameter Binding | **YES** | **YES** |
| Domain Boundary 필터 | **YES** — organizationId | **YES** — pharmacyId |
| Cross-domain JOIN 금지 | **YES** | **YES** |

---

## 8. 문제 영역 확인 (11)

### 문제 1: Interest 생성만 있고 처리 UI 없음 — **확인됨**

```
Interest Request 생성 (Backend API)
     ↓
관리자 확인 불가 (Frontend UI 없음)
```

Backend에 6개 관리 API가 존재하나, 이를 호출하는 Frontend 화면이 3개 서비스 모두 없다.

### 문제 2: Tablet 상태 업데이트 없음 — **확인됨**

```
관리자 확인 (API는 존재)
     ↓
Tablet 화면 미변경 (고객 폴링 API 부재)
```

Interest Request에 대한 `GET /tablet/interest/:id` 공개 엔드포인트가 존재하지 않아, 고객이 관심 표시 후 상태를 확인할 수 없다.

### 문제 3: 서비스별 구조 분리 — **확인됨**

```
KPA: Service Request 완성, Interest 미구현
GlycoPharm: Common Request 별도 구조, Interest 미구현
K-Cosmetics: Tablet 키오스크 자체 없음, Interest 미구현
```

---

## 9. 현재 실제 동작하는 Workflow

### Service Request (실제 동작)

```
┌─────────────────────────────────────────────────────┐
│              Tablet 키오스크 (KPA)                     │
│                                                      │
│  상품 그리드 → 클릭 → 카트 추가                         │
│       ↓                                              │
│  "주문 요청" 버튼 클릭                                  │
│       ↓                                              │
│  POST /stores/:slug/tablet/requests                  │
│       ↓                                              │
│  상태 표시 (3초 폴링)                                   │
│  "요청 접수됨" → "직원 확인 중" → "완료"                 │
│       ↓                                              │
│  자동 리셋 (2분)                                       │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│           직원 화면 (TabletRequestsPage)               │
│                                                      │
│  5초 폴링 → NEW 뱃지                                   │
│       ↓                                              │
│  "확인" → "완료" / "취소"                               │
└─────────────────────────────────────────────────────┘
```

**이 흐름은 End-to-End 완성이다.**

### Interest Request (설계만 존재)

```
┌─────────────────────────────────────────────────────┐
│              Tablet 키오스크                           │
│                                                      │
│  상품 카드에 "관심" 버튼 ← 없음                          │
│       ↓                                              │
│  POST /stores/:slug/tablet/interest ← API는 존재      │
│       ↓                                              │
│  고객 상태 확인 ← 폴링 API 없음                         │
└─────────────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────────────┐
│           직원 화면                                    │
│                                                      │
│  Interest 관리 UI ← 없음                               │
│  (Backend API 6개는 존재)                               │
└─────────────────────────────────────────────────────┘
```

---

## 10. Tablet UX에서의 "관심 표시 버튼"

조사 요청서의 질문에 대한 답변:

> "현재 Tablet 화면에서 관심 표시 버튼이 정확히 어떤 이름으로 구현되어 있습니까?"

**답변: 구현되어 있지 않다.**

현재 KPA TabletStorePage의 버튼 구성:

| 요소 | 라벨 | 동작 |
|------|------|------|
| 상품 카드 클릭 | (카드 자체) | 카트에 추가 (+1) |
| 카트 수량 조절 | `+` / `-` | 수량 증감 |
| 요청 전송 버튼 | **"주문 요청"** | Service Request 생성 |
| 요청 중 표시 | "요청 중..." | 전송 진행 |

"관심 있어요", "직원에게 문의", "상담 요청" 등의 **Interest 전용 버튼은 존재하지 않는다.**

---

## 11. 최종 판정

### PARTIAL

```
3단계 Workflow: 소비자 관심 → 근무자 확인 → Tablet 표시

  Step 1: 소비자 관심 표시
    Backend: ✅ API 완성 (POST /tablet/interest)
    Frontend: ❌ UI 버튼 미구현

  Step 2: 근무자 확인
    Backend: ✅ API 완성 (6개 관리 엔드포인트)
    Frontend: ❌ 관리 화면 미구현 (3개 서비스 모두)

  Step 3: Tablet 표시
    Backend: ❌ 고객 폴링 API 미구현 (GET /tablet/interest/:id 없음)
    Frontend: ❌ 상태 표시 UI 미구현
```

### 계층별 완성도

| 계층 | Interest Request | Service Request |
|------|:----------------:|:---------------:|
| DB Schema | **100%** | **100%** |
| Backend API | **100%** | **100%** |
| Frontend API Client | **0%** | **100%** |
| Tablet UI (고객) | **0%** | **100%** |
| Staff UI (직원) | **0%** | **100%** |
| 고객 상태 폴링 | **0%** (API 부재) | **100%** |

### 완성을 위해 필요한 작업

**Backend (1건):**

1. `GET /api/v1/stores/:slug/tablet/interest/:id` — 고객 상태 폴링 공개 API

**Frontend (서비스별 3건 × 3 서비스 = 최대 9건):**

1. Tablet 키오스크에 "관심 표시" 버튼 추가
2. Interest API 클라이언트 함수 추가
3. Interest 전용 직원 관리 화면 (또는 기존 Request 화면에 탭 통합)

**대안:**
Interest Request를 별도 UI로 구현하지 않고, **Service Request에 통합**하는 방식도 가능하다. 현재 Service Request의 "주문 요청"이 사실상 "관심 + 서비스 요청"의 역할을 수행하고 있다.

---

## 관련 파일 참조

### Backend — Interest Request

```
apps/api-server/src/routes/platform/entities/tablet-interest-request.entity.ts
apps/api-server/src/routes/platform/store-tablet.routes.ts:558-785
apps/api-server/src/routes/platform/unified-store-public.routes.ts:938-998
apps/api-server/src/database/migrations/20260301400000-TabletInterestRequests.ts
```

### Backend — Service Request (비교용)

```
apps/api-server/src/routes/glycopharm/entities/tablet-service-request.entity.ts
apps/api-server/src/routes/o4o-store/controllers/tablet.controller.ts
```

### Frontend — Tablet 키오스크

```
services/web-kpa-society/src/pages/tablet/TabletStorePage.tsx
services/web-kpa-society/src/api/tablet.ts
services/web-glycopharm/src/components/layouts/TabletLayout.tsx
```

### Frontend — 직원 관리 (Service Request만)

```
services/web-kpa-society/src/pages/pharmacy/TabletRequestsPage.tsx
services/web-glycopharm/src/pages/pharmacy/CustomerRequestsPage.tsx
```

### Frontend — 진열 관리

```
services/web-kpa-society/src/pages/pharmacy/StoreTabletDisplaysPage.tsx
services/web-glycopharm/src/pages/pharmacy/StoreTabletDisplaysPage.tsx
services/web-k-cosmetics/src/pages/store/StoreTabletDisplaysPage.tsx
```

---

*IR-O4O-TABLET-INTEREST-WORKFLOW-AUDIT-V1*
*조사일: 2026-03-15*
*Status: Complete*
*Verdict: PARTIAL — Backend 완성, Frontend 미구현*
