# Dropshipping App Overview

## 1. 목적(Purpose)

드랍쉬핑 시스템의 핵심 앱으로,
공급사(Supplier), 판매자(Partner), 상품 연동(ProductLink), 주문 처리(OrderLink), 정산(Settlement)을
통합 관리하는 구조를 제공한다.

## 2. 개요(Overview)

- **Core App**: dropshipping-core
- **Extension App**: dropshipping-cosmetics (화장품 특화)
- **연동 앱**: SellerOps, PartnerOps, SupplierOps
- **CMS 연동**: CPT(Product, Order), ACF(필드 확장), View(목록/상세)

## 3. 핵심 구성요소(Key Components)

### 1) Supplier (공급사)

| 필드 | 타입 | 설명 |
|------|------|------|
| name | string | 공급사명 |
| code | string | 공급사 코드 |
| contactInfo | object | 연락처 정보 |
| status | enum | 상태 (active/inactive) |

### 2) Partner (판매자)

| 필드 | 타입 | 설명 |
|------|------|------|
| name | string | 판매자명 |
| type | enum | 유형 (individual/business) |
| supplierId | relation | 연결된 공급사 |
| commissionRate | number | 수수료율 |

### 3) ProductLink (상품 연동)

| 필드 | 타입 | 설명 |
|------|------|------|
| productId | relation | 원본 상품 참조 |
| supplierId | relation | 공급사 참조 |
| partnerId | relation | 판매자 참조 |
| price | number | 판매가 |
| stock | number | 재고 수량 |

### 4) OrderLink (주문 연동)

| 필드 | 타입 | 설명 |
|------|------|------|
| orderId | relation | 원본 주문 참조 |
| productLinkId | relation | 상품 연동 참조 |
| status | enum | 주문 상태 |
| trackingNumber | string | 배송 추적 번호 |

### 5) Settlement (정산)

| 필드 | 타입 | 설명 |
|------|------|------|
| partnerId | relation | 판매자 참조 |
| period | dateRange | 정산 기간 |
| amount | number | 정산 금액 |
| status | enum | 정산 상태 |

## 4. 흐름(Flow)

```
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  상품 선택    │───▶│  판매자 등록  │───▶│  주문 발생    │
└──────────────┘    └──────────────┘    └──────┬───────┘
                                               │
                    ┌──────────────┐           │
                    │    정산      │◀──────────┤
                    └──────────────┘           │
                                               ▼
                                        ┌──────────────┐
                                        │ Supplier 전달 │
                                        └──────────────┘
```

**요약**: 상품 선택 → 판매자 등록 → 주문 발생 → Supplier 전달 → 정산

## 5. 규칙(Rule Set)

1. **ProductLink 원본 연결**: 상품 원본(product)과의 연결을 항상 유지
2. **OrderLink 상태 일관성**: 상태 업데이트는 일관된 enum 사용
3. **역할 분리**: 공급자/판매자/파트너는 고유 역할을 갖고 충돌하지 않음
4. **Extension 패턴**: 특화 기능은 dropshipping-cosmetics 등 Extension으로 확장

---
*최종 업데이트: 2025-12-10*
*상태: 초안 완료*
