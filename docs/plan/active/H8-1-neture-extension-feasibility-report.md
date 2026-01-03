# H8-1: Neture Extension 연결성 조사 보고서

## 개요

| 항목 | 내용 |
|------|------|
| Work Order | H8-1 (연결성 조사) |
| 목적 | Core 수정 없이 Extension만으로 Trial → 배송 → 주문 흐름 성립 가능성 판단 |
| 상태 | **완료** |
| 조사일 | 2026-01-03 |

---

## Extension 가능성 요약표

| 연결 지점 | Core 수정 없이 가능? | Extension 형태 | 비고 |
|-----------|---------------------|----------------|------|
| Trial → Order | **⭕ 가능** | Service + API | HookSystem 활용 또는 별도 Bridge API |
| Trial → Address | **⭕ 가능** | API + In-Memory Store | 별도 엔드포인트로 주소 수집 |
| Fulfillment | **⭕ 가능** | State Extension (In-Memory) | 외부 상태 머신으로 관리 |
| Next Order | **⭕ 가능** | 운영 규칙 | 관리자 수동 주문 생성 가능 |

---

## 상세 분석

### Q1. Trial → Order 연결을 Extension으로 구현할 수 있는가?

**응답: ⭕ 가능**

| 근거 | 상세 |
|------|------|
| HookSystem 존재 | `apps/api-server/src/services/HookSystem.ts` - WordPress 스타일 Action/Filter 시스템 |
| NetureOrder API 존재 | `POST /neture/orders` - 인증 사용자용 주문 생성 API |
| Admin Order API 존재 | `PATCH /neture/admin/orders/:id/status` - 상태 업데이트 |

**Extension 구현 방식**:

```
┌──────────────────────────────────────────────────────────────┐
│ Option A: HookSystem 기반                                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  MarketTrialController.joinTrial()                           │
│       ↓                                                      │
│  hooks.doAction('trial:participation:created', participation)│
│       ↓                                                      │
│  TrialOrderBridgeExtension.onParticipationCreated()         │
│       ↓                                                      │
│  (if rewardType === 'product') → NetureService.createOrder() │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Option B: 별도 Bridge API                                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  POST /api/trial-fulfillment/:participationId/create-order   │
│       ↓                                                      │
│  TrialFulfillmentController                                   │
│       ↓                                                      │
│  participationsStore.get() → NetureService.createOrder()     │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Core 수정 필요 없음**:
- MarketTrialController는 수정 불필요
- 별도 Extension Routes로 연결 가능

---

### Q2. 배송 주소 수집을 Extension UI/API로 분리할 수 있는가?

**응답: ⭕ 가능**

| 근거 | 상세 |
|------|------|
| Trial에 address 필드 없음 | Core 수정 없이 별도 저장소 사용 |
| NetureShippingAddress 구조 존재 | 주소 형식 이미 정의됨 |
| In-Memory 패턴 허용 | 현재 Trial도 In-Memory 사용 |

**Extension 구현 방식**:

```
┌──────────────────────────────────────────────────────────────┐
│ TrialShippingExtension                                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  In-Memory Store:                                            │
│    trialAddressStore: Map<participationId, ShippingAddress>  │
│                                                              │
│  Endpoints:                                                  │
│    POST /api/trial-shipping/:participationId                 │
│    GET  /api/trial-shipping/:participationId                 │
│                                                              │
│  Interface: (NetureShippingAddress 재사용)                    │
│    { recipient_name, phone, postal_code, address, ... }      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Core 수정 필요 없음**:
- TrialParticipation 구조 변경 불필요
- 별도 Store + API로 분리 가능

---

### Q3. Fulfillment 상태를 Extension 상태 머신으로 관리할 수 있는가?

**응답: ⭕ 가능**

| 근거 | 상세 |
|------|------|
| 현재 상태 | `rewardStatus: 'pending' \| 'fulfilled'` 만 존재 |
| 확장 가능 | External State Machine으로 세부 상태 관리 |
| NetureOrderStatus 참조 가능 | 배송 상태 흐름 이미 정의됨 |

**Extension 구현 방식**:

```
┌──────────────────────────────────────────────────────────────┐
│ TrialFulfillmentExtension                                     │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Extended Status (외부 관리):                                 │
│    'pending'                                                 │
│      → 'address_collected'                                   │
│        → 'order_created'                                     │
│          → 'shipped'                                         │
│            → 'delivered'                                     │
│              → 'fulfilled' (Trial Core 업데이트)              │
│                                                              │
│  In-Memory Store:                                            │
│    fulfillmentStateStore: Map<participationId, ExtendedState>│
│                                                              │
│  Sync Point:                                                 │
│    state === 'delivered' → participationsStore.rewardStatus = 'fulfilled'
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Core 수정 필요 없음**:
- TrialParticipation.rewardStatus는 최종 상태만 업데이트
- 세부 진행 상태는 Extension에서 관리

---

### Q4. "다음 주문"을 유도하는 최소 연결 고리가 무엇인가?

**응답: ⭕ 가능 (운영 규칙)**

| 연결 고리 | 방식 | Core 수정 |
|-----------|------|-----------|
| Trial Product ID 노출 | Trial.metadata에 productId 추가 (Extension 생성 시) | ❌ 불필요 |
| 관리자 주문 생성 | `POST /neture/admin/orders` 미존재 but `POST /neture/orders` 가능 | ❌ 불필요 |
| Trial 참여자 가격 적용 | NetureProduct.salePrice 수동 조정 | ❌ 불필요 |

**최소 연결 고리**:

```
┌──────────────────────────────────────────────────────────────┐
│ 수동 운영 흐름 (자동화 없음)                                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Trial 생성 시 metadata.productId 기록 (운영자)            │
│  2. Trial 참여자 목록 조회 (관리자 UI)                         │
│  3. 참여자에게 상품 ID + 가격 안내 (이메일/알림 - 수동)         │
│  4. 참여자가 직접 주문 (POST /neture/orders)                  │
│                                                              │
│  ※ 자동 추천, 자동 가격 적용은 Phase 2 이후                    │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

**Core 수정 필요 없음**:
- 운영/수작업 기반으로 즉시 실현 가능

---

## 결론

### 전체 판정: **Extension만으로 서비스 루프 성립 가능**

| 연결 지점 | 가능 여부 | 이유 한 줄 |
|-----------|----------|-----------|
| Trial → Order | ⭕ | HookSystem 또는 Bridge API로 연결 가능 |
| Trial → Address | ⭕ | 별도 In-Memory Store + API로 분리 가능 |
| Fulfillment | ⭕ | External State Machine으로 세부 상태 관리 가능 |
| Next Order | ⭕ | 운영 규칙으로 수동 연결 가능 |

### 필요 Extension 목록

| Extension | 역할 | 예상 파일 |
|-----------|------|-----------|
| TrialShippingExtension | 배송 주소 수집 API | `routes/trial-shipping.routes.ts` |
| TrialFulfillmentExtension | 상태 머신 + Order 생성 연결 | `routes/trial-fulfillment.routes.ts` |

### Core 수정 없이 불가능한 것

**없음** - 모든 연결이 Extension으로 가능

단, 다음은 **권장되지만 필수는 아님**:
- MarketTrialController에 Hook emit 추가 (편의성 향상)
- Trial Entity DB 영속화 (데이터 안정성)

---

## 다음 단계

이 조사 결과에 따라 다음 Work Order 진행 가능:

| Work Order | 내용 |
|------------|------|
| **H8-2** | TrialShippingExtension 구현 |
| **H8-3** | TrialFulfillmentExtension 구현 (Order Bridge 포함) |

---

## 참고 파일

- [HookSystem.ts](apps/api-server/src/services/HookSystem.ts) - Action/Filter 시스템
- [marketTrialController.ts](apps/api-server/src/controllers/market-trial/marketTrialController.ts) - Trial Core
- [neture.controller.ts](apps/api-server/src/routes/neture/controllers/neture.controller.ts) - Order API
- [H8-0 Phase 1 Report](./H8-0-neture-service-transition-phase1-report.md)
