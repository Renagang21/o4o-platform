# E-commerce Core Specifications

> E-commerce Core App의 설계 문서 및 스펙 인덱스

---

## 문서 목록

| 문서 | 설명 | 상태 |
|------|------|------|
| [Phase 1: Order 책임 경계 설계](./phase1-design-order-boundary.md) | E-commerce Core Order 개념 정의 및 Dropshipping Core 책임 분리 설계 | 완료 |

---

## 개요

E-commerce Core는 O4O Platform의 **판매 원장(Source of Truth)**으로서,
모든 판매 유형(Retail, Dropshipping, B2B, Subscription)의 주문을 통합 관리한다.

### 핵심 책임

1. **주문 원장 관리**: EcommerceOrder Entity
2. **결제 상태 추적**: PaymentStatus
3. **주문 유형 분류**: OrderType (retail, dropshipping, b2b, subscription)

### 의존 관계

```
E-commerce Core (판매 원장)
    ↑
    │ ecommerceOrderId (FK)
    │
Dropshipping Core (공급/정산)
    ↑
    │
Dropshipping Extension (산업 특화)
```

---

## 관련 문서

- [Dropshipping Overview](../dropshipping/dropshipping-overview.md)
- [AppStore Overview](../../design/architecture/appstore-overview.md)
- [Extension Lifecycle](../../design/architecture/extension-lifecycle.md)

---

*최종 업데이트: 2025-12-13*
