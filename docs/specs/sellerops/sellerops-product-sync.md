# SellerOps Product Sync Specification

> 최종 업데이트: 2025-12-10
> Offer → Listing 동기화 워크플로우

---

## 1. Overview

SellerOps의 핵심 워크플로우는 **Offer → Listing** 변환이다.
판매자는 공급자의 Offer를 선택하여 자신의 Listing으로 등록한다.

```
Supplier                    Seller                     Customer
   │                          │                           │
   │──── ProductMaster ───────│                           │
   │──── Offer (공급가) ──────│                           │
   │                          │─── Listing (판매가) ──────│
   │                          │                           │
```

---

## 2. Data Flow

### Offer → Listing 변환

```
┌─────────────────────┐     ┌─────────────────────┐
│   SupplierOffer     │     │   SellerListing     │
├─────────────────────┤     ├─────────────────────┤
│ productMasterId     │────→│ offerId             │
│ supplyPrice: 10000  │     │ sellingPrice: 15000 │
│ stock: 100          │     │ margin: 5000        │
│ supplierId          │     │ sellerId            │
│                     │     │ channel             │
│                     │     │ isActive            │
└─────────────────────┘     └─────────────────────┘
```

### 가격 계산

| 항목 | 계산 |
|------|------|
| margin | sellingPrice - supplyPrice |
| marginRate | (margin / supplyPrice) × 100 |

---

## 3. Listing Workflow

### 생성 플로우

```
1. 판매자가 Offer 목록에서 상품 선택
2. 판매가 설정 (margin 자동 계산)
3. 판매 채널 선택 (cosmetics-store, etc.)
4. Listing 생성 (비활성 상태)
5. 검토 후 활성화
```

### 상태

| 상태 | 설명 |
|------|------|
| `isActive: false` | 비활성 (노출 안됨) |
| `isActive: true` | 활성 (판매 중) |

---

## 4. API Endpoints

### GET /sellerops/listings

리스팅 목록 조회.

**Query:**
- `isActive`: boolean
- `channel`: string

**Response:**
```json
{
  "listings": [{
    "id": "uuid",
    "offer": {
      "productMaster": { "name": "상품명", "sku": "SKU" },
      "supplyPrice": 10000,
      "stock": 100
    },
    "sellingPrice": 15000,
    "margin": 5000,
    "marginRate": 50.0,
    "channel": "cosmetics-store",
    "isActive": true
  }]
}
```

### POST /sellerops/listings

리스팅 생성.

**Request:**
```json
{
  "offerId": "offer-uuid",
  "sellingPrice": 15000,
  "channel": "cosmetics-store",
  "isActive": false
}
```

### PUT /sellerops/listings/:id

리스팅 수정 (가격, 활성화).

---

## 5. Sync Events

### 재고 동기화

Offer의 재고가 변경되면 SellerOps가 알림 생성:

```typescript
@OnEvent('product.offer.updated')
handleOfferUpdated(data: { offerId, changes: { stock } }) {
  if (changes.stock < 10) {
    // 재고 부족 알림 생성
    createNotification(sellerId, {
      type: 'warning',
      title: '재고 부족 알림',
      message: `남은 재고: ${stock}`
    });
  }
}
```

### 가격 동기화

공급가 변경 시 마진 재계산 필요 알림.

---

## 6. Channel Integration

### 지원 채널

| 채널 | 설명 |
|------|------|
| `cosmetics-store` | 네쳐 화장품 스토어 |
| `marketplace` | 일반 마켓플레이스 |
| `partner` | 파트너 채널 |

### 채널별 노출

```typescript
// cosmetics-store에서 리스팅 조회
GET /api/v1/listings?channel=cosmetics-store&isActive=true
```

---

## Related Documents

- [SellerOps Overview](./sellerops-overview.md)
- [Dropshipping DB Schema](../dropshipping/db-inventory.md)
- [Cosmetics Storefront](../cosmetics/cosmetics-storefront.md)

---

*Phase 12-2에서 생성*
