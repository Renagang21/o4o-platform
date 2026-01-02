# H1-2 Order / Payment 최소 모델 결정서

> **Status**: Decision Finalized
> **Date**: 2025-01-02
> **Work Order**: H1-2
> **Based On**: H1-1 조사 보고서

---

## 1. H1-1 요약

### 핵심 발견

1. `packages/ecommerce-core`에 **EcommerceOrder** 모델이 이미 존재
2. **OrderType** (`retail | dropshipping | b2b | subscription`)으로 주문 유형 분기 가능
3. **Order 1:N Payment** 구조 확립 (분할 결제 지원)
4. **metadata JSONB** 필드로 유연한 확장 가능

### H1-1 권장 사항

- 신규 Order 엔티티 생성 불필요
- OrderType 확장 또는 metadata 활용으로 Local/Travel 분기
- Cosmetics Product는 UUID 참조 + 스냅샷 (FK 없음)

---

## 2. 4대 결정 항목

### 2.1 OrderType 확장 여부

#### 최종 결정: **Option B - 기존 OrderType 유지 + metadata.channel 사용**

| 옵션 | 설명 | 판단 |
|------|------|------|
| Option A | `LOCAL`, `TRAVEL` 추가 | ❌ 기각 |
| **Option B** | `metadata.channel` 사용 | ✅ **채택** |

#### 결정 근거

1. **OrderType의 설계 의도 준수**
   - 현재 OrderType은 "판매 방식/비즈니스 모델" 분류 (`retail`, `dropshipping`, `b2b`, `subscription`)
   - Local/Travel은 "채널"이지 "판매 방식"이 아님
   - Cosmetics Local 판매 = `RETAIL`
   - Cosmetics Travel 판매 = `RETAIL` (판매 방식은 동일)

2. **마이그레이션 리스크 회피**
   - enum 변경 시 DB 마이그레이션 필요
   - 기존 `RETAIL` 주문과의 구분 복잡도 증가

3. **쿼리 효율성 유지**
   - `metadata->>'channel'` 인덱스로 충분
   - PostgreSQL JSONB 인덱스 성능 검증됨

#### 기각 사유 (Option A)

- OrderType 설계 철학 위반 (판매 방식 vs 채널 혼동)
- 기존 RETAIL 주문과의 관계 모호
- 향후 채널 추가 시마다 enum 수정 필요

---

### 2.2 세금 환급(Tax Refund) 모델 위치

#### 최종 결정: **Order.metadata에 저장**

| 후보 | 설명 | 판단 |
|------|------|------|
| **Order.metadata** | 주문 단위 환급 정보 | ✅ **채택** |
| Payment.metadata | 결제 단위 환급 정보 | ⚠️ 차선안 |
| 별도 TaxRefund 엔티티 | 독립 엔티티 | ❌ 기각 |

#### 결정 근거

1. **환급은 "주문 단위"**
   - 세금환급은 "무엇을 샀는가" 기준
   - 결제 방식(분할/일시불)과 무관
   - 주문 취소 시 환급 자격도 함께 무효화

2. **부분 결제와 충돌 없음**
   - 환급 대상 = 주문 총액
   - 결제가 여러 건이어도 환급 대상은 하나

3. **회계 추적 가능**
   - `Order.metadata.taxRefund` 구조로 일괄 조회
   - 환급 상태 변경 시 Order 이력에 기록

#### Tax Refund 메타데이터 구조 (확정)

```typescript
interface TaxRefundMeta {
  eligible: boolean;           // 환급 대상 여부
  status?: 'pending' | 'applied' | 'completed' | 'rejected';
  amount?: number;             // 환급 예상 금액
  applicationId?: string;      // 환급 신청 ID (외부 연동 시)
  appliedAt?: string;          // 신청 시점
  completedAt?: string;        // 완료 시점
}
```

#### 차선안 (Payment.metadata)

분할 결제별 환급이 필요한 경우에만 고려. 현재 요구사항에서는 불필요.

---

### 2.3 투어 세션(Tour Session) 그룹핑 규칙

#### 최종 결정: **(A) metadata.tourSessionId 사용**

| 후보 | 설명 | 판단 |
|------|------|------|
| **(A) metadata.tourSessionId** | Order 내 세션 ID 저장 | ✅ **채택** |
| (B) OrderGroup 엔티티 | 상위 그룹 개념 | ❌ 기각 |
| (C) 외부 시스템 관리 | Guide App에서 관리 | ⚠️ 보조 |

#### 결정 근거

1. **Order 독립성 유지**
   - 각 Order는 독립적으로 취소/환불 가능
   - 세션 그룹핑은 "조회/통계용"일 뿐
   - 하나의 Order 취소가 다른 Order에 영향 없음

2. **엔티티 증가 방지**
   - OrderGroup 도입 시 복잡도 급증
   - 정산/환불 전파 로직 필요
   - metadata로 충분히 해결

3. **정산 단위 유연성**
   - 세션별 정산: `tourSessionId`로 그룹 쿼리
   - 가이드별 정산: `guideId`로 그룹 쿼리
   - 둘 다 metadata에서 해결

#### Tour Session 메타데이터 구조 (확정)

```typescript
interface TourSessionMeta {
  tourSessionId: string;       // 투어 세션 고유 ID
  tourDate: string;            // 투어 날짜 (YYYY-MM-DD)
  guideId: string;             // 가이드 ID (Participant UUID)
  groupSize?: number;          // 그룹 인원 수
  tourType?: string;           // 투어 유형 (optional)
}
```

#### 기각 사유 (Option B - OrderGroup)

- Order 간 결합도 증가
- 취소/환불 시 전파 로직 필요
- 복잡도 대비 이점 불명확

---

### 2.4 metadata 표준 스키마

#### 최종 확정: 계층별 허용/금지 필드

```typescript
/**
 * EcommerceOrder.metadata 표준 스키마
 * H1-2 확정 (2025-01-02)
 */
interface OrderMetadataSchema {
  // ===== Channel Context (필수) =====
  channel: 'local' | 'travel';

  // ===== Fulfillment Context =====
  fulfillment?: 'pickup' | 'delivery' | 'on-site';

  // ===== Seller Context =====
  storeId?: string;            // 매장 ID (Local/Travel 공통)
  storeName?: string;          // 매장명 (스냅샷)

  // ===== Travel Channel 전용 =====
  travel?: {
    guideId: string;           // 가이드 Participant ID
    guideName?: string;        // 가이드명 (스냅샷)
    tourSessionId?: string;    // 투어 세션 ID
    tourDate?: string;         // 투어 날짜
    groupSize?: number;        // 그룹 인원
    taxRefund?: TaxRefundMeta; // 세금환급 정보
  };

  // ===== Commission Context =====
  commission?: {
    partnerId?: string;        // 파트너 ID
    referralCode?: string;     // 추천 코드
    rate?: number;             // 커미션 비율
  };

  // ===== Local Channel 전용 =====
  local?: {
    sampleExperienced?: boolean;  // 샘플 체험 여부
    reservationId?: string;       // 예약 ID (있을 경우)
  };
}
```

#### 허용 필드 (Allowed)

| 필드 | 용도 | 필수 여부 |
|------|------|----------|
| `channel` | 채널 구분 | **필수** |
| `fulfillment` | 수령 방식 | 선택 |
| `storeId` | 매장 식별 | 권장 |
| `travel.*` | Travel 전용 | Travel 시 필수 |
| `local.*` | Local 전용 | 선택 |
| `commission.*` | 커미션 추적 | 선택 |

#### 금지 필드 (Prohibited)

| 금지 필드 | 사유 |
|----------|------|
| `userId` | Order.buyerId 사용 |
| `productId` | OrderItem.productId 사용 |
| `price`, `amount` | Order 컬럼 사용 |
| `createdAt`, `updatedAt` | Order 컬럼 사용 |
| 개인정보 (phone, email 등) | 별도 컬럼 또는 암호화 필요 |

---

## 3. 채택/기각 옵션 비교표

| 결정 항목 | 채택 | 기각 |
|----------|------|------|
| OrderType | `metadata.channel` | enum 확장 |
| Tax Refund 위치 | `Order.metadata` | Payment, 별도 엔티티 |
| Tour Session | `metadata.tourSessionId` | OrderGroup 엔티티 |
| Channel 분기 | metadata 필드 | OrderType 분기 |

---

## 4. 최종 Order 구조 요약

```typescript
// 최종 확정된 Cosmetics 주문 구조 (의사 코드)

interface CosmeticsOrder extends EcommerceOrder {
  // === 기존 EcommerceOrder 필드 그대로 사용 ===
  orderType: 'retail';          // Cosmetics = RETAIL 고정
  buyerId: string;
  sellerId: string;             // Store 또는 Guide의 Participant ID

  // === metadata로 채널 분기 ===
  metadata: {
    channel: 'local' | 'travel';
    storeId: string;

    // Travel 전용
    travel?: {
      guideId: string;
      tourSessionId?: string;
      taxRefund?: TaxRefundMeta;
    };

    // Local 전용
    local?: {
      sampleExperienced?: boolean;
    };
  };
}

// OrderItem은 기존 구조 유지
interface CosmeticsOrderItem extends EcommerceOrderItem {
  productId: string;            // Cosmetics Product UUID (FK 없음)
  productName: string;          // 스냅샷
  unitPrice: number;            // 스냅샷

  metadata?: {
    productSnapshot?: {
      brandId: string;
      brandName: string;
    };
  };
}
```

---

## 5. 의도적으로 하지 않은 것

### 5.1 이번 결정에서 제외

| 항목 | 사유 | 다음 단계 |
|------|------|----------|
| OrderType enum 수정 | 불필요 (metadata 사용) | N/A |
| TaxRefund 엔티티 생성 | 불필요 (metadata 사용) | N/A |
| OrderGroup 엔티티 생성 | 불필요 (tourSessionId 사용) | N/A |
| PG 연동 상세 | 구현 단계에서 결정 | H2+ |
| 정산 주기/로직 | 비즈니스 결정 필요 | H2+ |

### 5.2 H1-0 원칙 준수 확인

| 원칙 | 준수 여부 |
|------|----------|
| Cosmetics FK 설정 금지 | ✅ 준수 (UUID 참조) |
| K-Shopping 동결 | ✅ 준수 (변경 없음) |
| 도메인 경계 유지 | ✅ 준수 |

---

## 6. H2 단계에서 열리는 가능성

### 6.1 즉시 가능 (H2-0)

- `metadata.channel` 기반 주문 생성 로직 구현
- Travel 전용 metadata 검증 로직
- 채널별 주문 목록 쿼리 API

### 6.2 후속 가능 (H2-1+)

- Travel 채널 UI (travel.k-cosmetics)
- 가이드 태블릿 앱 연동
- 세금환급 외부 시스템 연동
- 정산/커미션 자동화

### 6.3 장기 가능

- 다중 채널 확장 (Online, Wholesale 등)
- 크로스 채널 통계/분석
- AI 기반 판매 추천

---

## 7. 결정 요약 (한눈에 보기)

| 결정 | 최종안 | 핵심 근거 |
|------|--------|----------|
| **OrderType** | 기존 유지 (`RETAIL`) | 판매 방식 vs 채널 구분 |
| **채널 분기** | `metadata.channel` | 유연성, 무중단 확장 |
| **세금환급** | `Order.metadata.travel.taxRefund` | 주문 단위 환급 |
| **투어 세션** | `metadata.travel.tourSessionId` | 엔티티 증가 방지 |
| **스키마** | 계층별 표준화 | 일관성, 검증 가능 |

---

## 8. 승인 체크리스트

- [x] Local / Travel 주문 모델이 하나로 고정됨
- [x] "왜 이렇게 결정했는지" 문서만으로 설명 가능
- [x] H2에서 바로 구현 Work Order 작성 가능
- [x] H1-0 도메인 경계 원칙 위반 없음

---

*Document Version: 1.0*
*Created by: H1-2 Work Order*
*Decision Authority: Platform Architecture*
