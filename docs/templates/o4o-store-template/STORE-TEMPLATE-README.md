# O4O Store Template

> **Phase 8 확정 문서**
> 모든 매장형 O4O 서비스는 이 템플릿을 기반으로 생성한다.

## 1. 템플릿 목적

이 템플릿은 **O4O 표준 매장**의 구조를 정의한다.

- 새로운 매장 서비스 생성 시 복사하여 사용
- 구조적 일관성 보장
- E-commerce Core 연동 패턴 통일

## 2. O4O 표준 매장 정의

| 항목 | 표준 |
|------|------|
| 주문 생성 | **E-commerce Core 전용** (`checkoutService.createOrder()`) |
| 주문 원장 | `checkout_orders` |
| 구분 키 | `OrderType` enum |
| 매장 책임 | 상품/콘텐츠/가격/패키지 관리 |
| 결제/정산 | Core 책임 |
| 독립 주문 테이블 | **금지** |

## 3. 템플릿 폴더 구조

```
/apps/api-server/src/routes/{store-name}/
├── entities/
│   ├── {store}-item.entity.ts        # 상품/패키지/콘텐츠
│   ├── {store}-category.entity.ts    # 카테고리 (선택)
│   └── {store}-log.entity.ts         # 로그 (선택)
│
├── controllers/
│   ├── {store}-order.controller.ts   # 주문 API (Core 위임 - 필수)
│   └── {store}-query.controller.ts   # 조회 전용 (선택)
│
├── {store}.routes.ts                 # 라우트 정의
└── index.ts                          # 모듈 내보내기
```

## 4. 필수 패턴

### 4.1 Order Controller 패턴 (강제)

모든 매장은 아래 패턴으로만 주문을 생성할 수 있다.

```typescript
import { checkoutService, type OrderItem } from '../../../services/checkout.service.js';
import { OrderType } from '../../../entities/checkout/CheckoutOrder.entity.js';

// 주문 생성 (유일한 허용 패턴)
const order = await checkoutService.createOrder({
  orderType: OrderType.{STORE_TYPE},   // 필수: 매장 타입
  buyerId,                              // 필수: 구매자 ID
  sellerId: dto.sellerId,               // 필수: 판매자 ID
  supplierId: dto.sellerId,             // 필수: 공급자 ID
  items: orderItems,                    // 필수: 주문 아이템
  shippingAddress: dto.shippingAddress, // 선택: 배송 주소
  metadata: {                           // 선택: 매장별 메타데이터
    ...dto.metadata,
    originalItems: dto.items,
  },
});
```

### 4.2 OrderType 등록 (필수)

새 매장 추가 시 `OrderType` enum에 값을 추가해야 한다.

**파일**: `apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts`

```typescript
export enum OrderType {
  GENERIC = 'GENERIC',
  DROPSHIPPING = 'DROPSHIPPING',
  GLYCOPHARM = 'GLYCOPHARM',
  COSMETICS = 'COSMETICS',
  TOURISM = 'TOURISM',
  // 새 매장 추가
  {NEW_STORE} = '{NEW_STORE}',
}
```

### 4.3 Entity 패턴 (권장)

매장 Entity는 아래 규칙을 따른다.

```typescript
// ESM 호환성: type-only import 필수
import type { RelatedEntity } from './related.entity.js';

// 문자열 기반 관계 데코레이터 필수
@ManyToOne('RelatedEntity', 'propertyName')
@JoinColumn({ name: 'related_id' })
related?: RelatedEntity;
```

## 5. 금지 사항

| 금지 | 이유 |
|------|------|
| `{store}_orders` 테이블 생성 | E-commerce Core 원칙 위반 |
| 직접 INSERT/UPDATE 주문 | 판매 원장 무결성 훼손 |
| `checkoutService` 미사용 | 통합 조회/정산 불가 |
| OrderType 없이 주문 생성 | 서비스 식별 불가 |

## 6. 체크리스트

새 매장 생성 시 반드시 확인:

- [ ] OrderType enum에 추가됨
- [ ] `checkoutService.createOrder()`만 사용
- [ ] 자체 주문 테이블 없음
- [ ] ESM 호환 Entity 패턴 준수
- [ ] CLAUDE.md §7 규칙 준수

## 7. 참조 구현 (Reference Implementation)

### Tourism (Phase 5-C)
- [tourism-order.controller.ts](../../../apps/api-server/src/routes/tourism/controllers/tourism-order.controller.ts)

### Cosmetics (Phase 5-B′)
- [cosmetics-order.controller.ts](../../../apps/api-server/src/routes/cosmetics/controllers/cosmetics-order.controller.ts)

## 8. 관련 문서

- [CLAUDE.md §7 - E-commerce Core 절대 규칙](../../../CLAUDE.md)
- [E-COMMERCE-ORDER-CONTRACT.md](../../_platform/E-COMMERCE-ORDER-CONTRACT.md)
- [ORDER-DELEGATION.md](./ORDER-DELEGATION.md)
- [DOMAIN-BOUNDARY.md](./DOMAIN-BOUNDARY.md)

---

*Phase 8 (2026-01-11) - O4O Store Template Standardization*
