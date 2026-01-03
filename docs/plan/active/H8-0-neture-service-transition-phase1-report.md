# H8-0: Neture.co.kr 서비스 전환 Phase 1 조사 보고서

## 개요

| 항목 | 내용 |
|------|------|
| Work Order | H8-0 (조사) |
| 목적 | Market Trial → 셀러 참여 → 제품 배송 → 다음 주문 흐름 가능성 조사 |
| 상태 | **완료** |
| 조사일 | 2026-01-03 |

---

## 1. 핵심 질문에 대한 응답

### Q1. Market Trial 데이터 구조가 존재하는가?

**응답: 예 (In-Memory Store, 비영속)**

| 항목 | 상세 |
|------|------|
| 위치 | `apps/api-server/src/controllers/market-trial/marketTrialController.ts` |
| 저장소 | `Map<string, MarketTrial>` (In-Memory) |
| Phase | L-1 (MVP) |

**MarketTrial 구조**:
```typescript
interface MarketTrial {
  id: string;
  title: string;
  description: string;
  supplierId: string;
  supplierName?: string;
  eligibleRoles: ('partner' | 'seller')[];
  rewardOptions: ('cash' | 'product')[];
  cashRewardAmount?: number;
  productRewardDescription?: string;  // ← 제품 보상 설명
  status: 'open' | 'closed';
  maxParticipants?: number;
  currentParticipants: number;
  deadline?: string;
  createdAt: string;
}
```

**TrialParticipation 구조**:
```typescript
interface TrialParticipation {
  id: string;
  trialId: string;
  participantId: string;
  participantName?: string;
  role: 'partner' | 'seller';
  rewardType: 'cash' | 'product';  // ← 보상 유형 선택
  rewardStatus: 'pending' | 'fulfilled';  // ← 보상 상태
  joinedAt: string;
}
```

**한계점**:
- In-Memory Store로 서버 재시작 시 데이터 손실
- DB 영속화 미구현

---

### Q2. 배송(제품 수령) 발생 가능성이 있는가?

**응답: 시스템 구조는 존재하나, 연결 코드 없음**

#### 2.1 Neture Order 시스템 (존재함)

| 항목 | 상세 |
|------|------|
| 위치 | `apps/api-server/src/routes/neture/` |
| Entity | `NetureOrder`, `NetureOrderItem`, `NetureProduct`, `NeturePartner` |
| Phase | G-3 (주문/결제 플로우) |
| DB | `neture` 스키마 (PostgreSQL) |

**NetureOrder Status 흐름**:
```
created → pending_payment → paid → preparing → shipped → delivered
                                              ↓
                                         cancelled / refunded
```

**NetureShippingAddress 구조**:
```typescript
interface NetureShippingAddress {
  recipient_name: string;
  phone: string;
  postal_code: string;
  address: string;
  address_detail?: string;
  delivery_note?: string;
}
```

#### 2.2 EcommerceOrders 시스템 (존재함)

| 항목 | 상세 |
|------|------|
| 위치 | `apps/api-server/src/routes/ecommerce-orders.routes.ts` |
| Phase | H4-3 |
| 저장소 | In-Memory (`orderStore`, `paymentStore`) |
| 결제 | Toss Payments 연동 |

**핵심 기능**:
- `POST /api/v1/orders/initiate` - 주문 생성 + 결제 준비
- `POST /api/v1/orders/confirm` - 결제 승인
- `POST /api/v1/orders/refund` - 환불 처리

#### 2.3 Market Trial → Order 연결

**현재 상태: 연결 없음**

| 구간 | 연결 코드 | 상태 |
|------|-----------|------|
| Trial Participation → Order 생성 | 없음 | ❌ 미구현 |
| rewardType='product' → 배송 주소 수집 | 없음 | ❌ 미구현 |
| Trial → 상품 자동 연동 | 없음 | ❌ 미구현 |

---

### Q3. Trial 이후 '다음 주문' 경로가 있는가?

**응답: 없음**

| 경로 | 상태 | 비고 |
|------|------|------|
| Trial 참여자 → 재구매 유도 | ❌ | 로직 없음 |
| Trial 상품 → 정규 상품 연동 | ❌ | 상품 ID 연결 없음 |
| Participation → Customer 전환 | ❌ | 사용자 세그먼트 분리 없음 |

**NetureProduct 존재**: Partner가 상품 등록 가능하나, Trial과 연결되지 않음

---

### Q4. 흐름 단절 지점은 어디인가?

**식별된 단절 지점 4곳**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    현재 흐름 (Broken)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [Trial 생성]  →  [참여 신청]  →  [보상 선택]  ─┬→ ❌ 단절 1    │
│  (In-Memory)      (In-Memory)    cash/product  │               │
│                                                 │               │
│                                                 ↓               │
│                                    ❌ 단절 2: 배송 주소 수집    │
│                                                 │               │
│                                                 ↓               │
│                                    ❌ 단절 3: Order 생성        │
│                                       (NetureOrder 또는         │
│                                        EcommerceOrders)        │
│                                                 │               │
│                                                 ↓               │
│                                    ❌ 단절 4: 배송 처리         │
│                                       (shipped → delivered)    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

| 단절 | 위치 | 설명 | 필요 작업 |
|------|------|------|-----------|
| **단절 1** | Trial → Fulfillment | `rewardStatus`가 'pending'에서 변경되지 않음 | Fulfillment 서비스 필요 |
| **단절 2** | Participation → Address | 제품 보상 시 배송 주소 수집 로직 없음 | 주소 수집 UI/API 필요 |
| **단절 3** | Trial → Order | Trial 참여가 Order로 이어지지 않음 | 연결 로직 필요 |
| **단절 4** | Order → Delivery | Order 생성 후 배송 상태 업데이트 프로세스 없음 | 배송 관리 시스템 필요 |

---

## 2. 시스템 구성 요소 정리

### 2.1 API 엔드포인트 현황

| API | 경로 | 상태 | 비고 |
|-----|------|------|------|
| Market Trial 목록 | `GET /api/market-trial` | ✅ 동작 | In-Memory |
| Market Trial 상세 | `GET /api/market-trial/:id` | ✅ 동작 | In-Memory |
| Trial 참여 | `POST /api/market-trial/:id/join` | ✅ 동작 | 보상 선택 포함 |
| 참여 정보 조회 | `GET /api/market-trial/:id/participation` | ✅ 동작 | |
| Neture 상품 목록 | `GET /api/v1/neture/products` | ✅ 동작 | DB 기반 |
| Neture 주문 생성 | `POST /api/v1/neture/orders` | ✅ 동작 | 결제 흐름 포함 |
| EcommerceOrders | `POST /api/v1/orders/initiate` | ✅ 동작 | Toss 결제 |

### 2.2 프론트엔드 현황

| 서비스 | Trial UI | 주문 UI | 상태 |
|--------|----------|---------|------|
| neture-web | ❌ 없음 | ❌ 없음 | 랜딩 페이지만 |
| main-site | ❌ 없음 | ⚠️ cosmetics용 | Seller Dashboard만 |

### 2.3 데이터 저장소 현황

| 도메인 | 저장소 | 영속성 |
|--------|--------|--------|
| Market Trial | In-Memory Map | ❌ 비영속 |
| Neture Order | PostgreSQL (neture 스키마) | ✅ 영속 |
| EcommerceOrders | In-Memory Map | ❌ 비영속 |

---

## 3. 흐름 실현을 위한 필요 요소

### 3.1 데이터 영속화

| 대상 | 현재 | 필요 |
|------|------|------|
| MarketTrial | In-Memory | DB Entity |
| TrialParticipation | In-Memory | DB Entity |
| rewardStatus 업데이트 | 없음 | Fulfillment 서비스 |

### 3.2 연결 로직

| 연결 | 필요 작업 |
|------|-----------|
| Trial → Neture Product | `trial.productId` 필드 추가 또는 metadata 활용 |
| Participation → Order | `rewardType='product'` 시 Order 생성 트리거 |
| Trial → 배송 주소 | `POST /api/market-trial/:id/shipping-address` 또는 참여 시 수집 |

### 3.3 UI 구현

| 화면 | 현재 | 필요 |
|------|------|------|
| Trial 목록 | ❌ 없음 | 페이지 구현 |
| Trial 상세 | ❌ 없음 | 페이지 구현 |
| 참여 신청 (보상 선택) | ❌ 없음 | 모달/페이지 구현 |
| 배송 주소 입력 | ❌ 없음 | 폼 구현 |
| 내 참여 목록 | ❌ 없음 | 마이페이지 섹션 |

---

## 4. 결론

### 4.1 핵심 발견

1. **Market Trial 구조 존재**: 데이터 모델은 있으나 In-Memory 비영속
2. **주문 시스템 존재**: NetureOrder, EcommerceOrders 두 시스템 모두 배송 지원
3. **연결 코드 부재**: Trial → Order 연결 로직이 전무
4. **프론트엔드 부재**: neture-web은 랜딩 페이지만 존재

### 4.2 한 줄 요약

> **"백엔드 조각들은 존재하나 연결되지 않았고, 프론트엔드는 부재하다."**

### 4.3 다음 단계 제안

| 우선순위 | 작업 | 의존성 |
|----------|------|--------|
| 1 | Trial Entity DB 영속화 | 없음 |
| 2 | Trial → Order 연결 서비스 | Trial 영속화 |
| 3 | neture-web Trial UI 구현 | API 준비 후 |
| 4 | Fulfillment 상태 관리 | 연결 서비스 |

---

## 참고 파일

- [marketTrialController.ts](apps/api-server/src/controllers/market-trial/marketTrialController.ts)
- [neture-order.entity.ts](apps/api-server/src/routes/neture/entities/neture-order.entity.ts)
- [neture.service.ts](apps/api-server/src/routes/neture/services/neture.service.ts)
- [ecommerce-orders.routes.ts](apps/api-server/src/routes/ecommerce-orders.routes.ts)
- [H7-1 Frontend Readiness Report](./H7-1-frontend-service-readiness-report.md)
