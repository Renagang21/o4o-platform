# SellerOps App Specification

> 최종 업데이트: 2025-12-10
> 앱 타입: Extension App

---

## 1. Overview

SellerOps는 범용 판매자 운영을 위한 Extension App이다.

| 항목 | 값 |
|------|-----|
| appId | `sellerops` |
| type | Extension |
| dependsOn | `dropshipping-core` |
| version | 1.0.0 |

### 핵심 기능

- **판매자 대시보드**: 매출, 주문, 정산 현황
- **공급자 관리**: 공급자 승인 요청 및 관리
- **리스팅 관리**: Offer → Listing 등록/가격 설정
- **주문/배송 모니터링**: OrderRelay 상태 추적
- **정산 대시보드**: 수익, 수수료, 정산 내역
- **알림/공지**: 재고 부족, 주문 알림

---

## 2. Architecture

```
┌─────────────────────────────────────────────────┐
│                   SellerOps                      │
├─────────────────────────────────────────────────┤
│  Controllers                                     │
│  ├─ DashboardController                         │
│  ├─ ProfileController                           │
│  ├─ SuppliersController                         │
│  ├─ ListingsController                          │
│  ├─ OrdersController                            │
│  ├─ SettlementController                        │
│  ├─ NotificationsController                     │
│  └─ DocumentsController                         │
├─────────────────────────────────────────────────┤
│  Services (dropshipping-core 연동)               │
│  ├─ ListingOpsService → ListingService          │
│  ├─ OrderOpsService → OrderRelay Entity         │
│  ├─ SettlementOpsService → SettlementBatch      │
│  └─ SupplierOpsService → SupplierContract       │
├─────────────────────────────────────────────────┤
│  Own Tables (3개)                                │
│  ├─ sellerops_settings                          │
│  ├─ sellerops_notifications                     │
│  └─ sellerops_documents                         │
└─────────────────────────────────────────────────┘
```

---

## 3. Database Schema

### 자체 테이블 (3개)

SellerOps는 dropshipping-core의 테이블을 사용하고, 자체 테이블은 최소화한다.

| 테이블 | 설명 |
|--------|------|
| `sellerops_settings` | 판매자별 설정 |
| `sellerops_notifications` | 알림 기록 |
| `sellerops_documents` | 공지/문서 |

### sellerops_notifications

```sql
id UUID PRIMARY KEY
seller_id UUID NOT NULL
type VARCHAR(50)        -- info, warning, success
title VARCHAR(255)
message TEXT
read BOOLEAN DEFAULT FALSE
data JSONB
created_at TIMESTAMP
```

### 참조 테이블 (dropshipping-core)

- `dropshipping_seller_listings` - 리스팅
- `dropshipping_supplier_offers` - 공급 오퍼
- `dropshipping_order_relays` - 주문 릴레이
- `dropshipping_settlement_batches` - 정산

---

## 4. Event Integration

### Subscribes (수신)

| Event | 처리 |
|-------|------|
| `product.master.updated` | 상품 변경 알림 |
| `product.offer.updated` | 가격/재고 변경 → 재고 부족 알림 |
| `order.created` | 새 주문 알림 |
| `order.relay.fulfilled` | 배송 시작 알림 |
| `settlement.closed` | 정산 마감 알림 |
| `commission.applied` | 수수료 적용 기록 |

### Publishes (발행)

| Event | 시점 |
|-------|------|
| `sellerops.supplier.requested` | 공급자 승인 요청 |
| `sellerops.listing.created` | 리스팅 생성 |
| `sellerops.listing.activated` | 리스팅 활성화 |
| `sellerops.notification.sent` | 알림 발송 |

---

## 5. Permissions

| Permission | 설명 |
|------------|------|
| `sellerops.read` | 기본 읽기 |
| `sellerops.write` | 기본 쓰기 |
| `sellerops.seller.profile` | 프로필 관리 |
| `sellerops.supplier.request` | 공급자 요청 |
| `sellerops.listing.manage` | 리스팅 관리 |
| `sellerops.order.view` | 주문 조회 |
| `sellerops.settlement.view` | 정산 조회 |

---

## 6. Menu Configuration

```typescript
menu: {
  label: 'SellerOps',
  icon: 'Store',
  items: [
    { label: '대시보드', path: '/sellerops/dashboard' },
    { label: '내 정보', path: '/sellerops/profile' },
    { label: '공급자 관리', path: '/sellerops/suppliers' },
    { label: '리스팅 관리', path: '/sellerops/listings' },
    { label: '주문/배송', path: '/sellerops/orders' },
    { label: '정산', path: '/sellerops/settlement' },
    { label: '공지사항', path: '/sellerops/notice' },
  ],
}
```

---

## Related Documents

- [Product Sync](./sellerops-product-sync.md)
- [Settlement Flow](./sellerops-settlement.md)
- [Event Handlers](./sellerops-events.md)
- [Dropshipping Overview](../dropshipping/dropshipping-overview.md)
- [PartnerOps](../partnerops/partnerops-overview.md)

---

*Phase 12-2에서 생성*
