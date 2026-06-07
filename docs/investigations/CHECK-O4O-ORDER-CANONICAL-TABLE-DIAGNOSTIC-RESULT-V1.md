# CHECK-O4O-ORDER-CANONICAL-TABLE-DIAGNOSTIC-RESULT-V1

> **유형:** 운영 DB 실측 결과 기록 (read-only)
> **작성:** 2026-06-07
> **WO:** [WO-O4O-ORDER-CANONICAL-TABLE-DIAGNOSTIC-ENDPOINT-V1] (commit `0468a0387`)
> **선행 IR:** [IR-O4O-ORDER-CANONICAL-TABLE-CONFIRM-V1](IR-O4O-ORDER-CANONICAL-TABLE-CONFIRM-V1.md) (미확인 D 해소)
> **목적:** 진단 엔드포인트로 운영 DB 주문 원장 상태를 실측해 H1/H2 확정

---

## 1. 실측 방법

- 진단 엔드포인트 배포: `feat(debug): order canonical table read-only diagnostic endpoint` (`0468a0387`) → CI/CD "Deploy API Server (Cloud Run)" 성공(✓ Deploy + ✓ migrations + ✓ verify).
- 호출: 배포 서비스 `https://o4o-core-api-...run.app` 에 `sohae2100@gmail.com`(platform:super_admin) 로그인 → `GET /__debug__/order-canonical-table` (authenticate + requireAdmin).
- 인증: 로그인 httpOnly 쿠키 `accessToken`(Domain=.neture.co.kr) 값을 수동 `Cookie`/`Bearer` 헤더로 전달(호스트 불일치 회피).
- **read-only**: SELECT / information_schema 만. DB write 없음. PII row 미조회.

---

## 2. 실측 결과 (프로덕션 `o4o_platform` DB, 2026-06-07T11:35:31Z)

```json
{
  "tables": {
    "checkout_orders":  { "exists": true,  "rowCount": 0,    "columns": [23개 — id, orderNumber, buyerId, sellerId, supplierId, sellerOrganizationId, partnerId, subtotal, shippingFee, discount, totalAmount, status, paymentStatus, paymentMethod, shippingAddress, items, metadata, paidAt, refundedAt, cancelledAt, createdAt, updatedAt, order_type] },
    "ecommerce_orders": { "exists": false, "rowCount": null, "columns": [] }
  },
  "checkoutOrders": { "serviceKeyCounts": [], "statusCounts": [], "serviceKeyStatusCounts": [] },
  "ecommerceOrders": { "serviceKeyCounts": null },
  "diagnosis": { "canonicalTable": "checkout_orders", "checkoutOrdersExists": true, "ecommerceOrdersExists": false, "recommendedBranch": "H1" }
}
```

### 핵심 수치
| 항목 | 값 |
|------|-----|
| `checkout_orders` 존재 | **true** (23 컬럼, `order_type` 포함 — AlignCheckoutOrdersSchemaContract 적용 확인) |
| `checkout_orders` row 수 | **0** |
| `ecommerce_orders` 존재 | **false** (프로덕션 미존재 — 라이브 확증) |
| checkout_orders serviceKey 분포 | (없음 — 0 rows) |

---

## 3. 판정 — H1 확정

**H1: `ecommerce_orders` 프로덕션 미존재 + `checkout_orders` 0건.**

1. **`ecommerce_orders`는 프로덕션에 실재하지 않는다** — IR-O4O-ORDER-CANONICAL-TABLE-CONFIRM-V1 의 마이그레이션 기반 추론(CREATE 부재 + NO-OP + 주석)을 **라이브 DB로 확증**. canonical = `checkout_orders` 최종 확정.
2. **`checkout_orders`는 존재하지만 비어 있다(0건).** 즉 **프로덕션에 실주문이 전무**하다 — GP/K-Cos create 경로가 미존재 `ecommerce_orders`를 향해 실패해 온 결과와 정합(생성된 실주문 없음). KPA 등 다른 서비스 주문도 현재 0건.
3. 따라서 직전 IR의 미확인 단일 항목("checkout_orders 내 glycopharm/cosmetics row 분포")은 **"0건 — 분포 없음"으로 해소**.

---

## 4. 후속 WO 방향 영향 (리스크 대폭 감소)

H1 확정 + checkout_orders 0건은 **create+payment 정렬 WO의 리스크를 제거**한다:

- **회귀 위험 없음:** ecommerce_orders 기반 GP/K-Cos create+payment 경로는 미존재 테이블 대상이라 현재 동작하지 않는다. 깨뜨릴 "작동 중 흐름"이 없으므로 checkout_orders 정렬은 **순수 추가(additive)**.
- **데이터 이관 불필요:** 양 테이블 모두 GP/K-Cos 실주문 0건. 과거 데이터 backfill/migration 불필요.
- **H2(회귀) 분기 제거:** ecommerce_orders가 없으므로 "현재 ecommerce_orders로 동작 중인 GP 커머스를 깨뜨릴" 우려는 성립하지 않음.

→ **`WO-O4O-SERVICE-ORDER-FULL-CHECKOUT-ALIGN-V1`** (create + payment controller + payment event handler + list/get 을 두 서비스 동시에 checkout_orders 로 정렬)을 **회귀 걱정 없이** 진행할 수 있다. create 만 떼어내는 부분 정렬은 여전히 금지(create↔payment 동일 테이블 결합 — IR-O4O-OPERATOR-ORDER-API-CONTRACT-V1 / 직전 중단 보고 참조).

---

## 5. 진단 엔드포인트 후속 처리

- 엔드포인트 `GET /__debug__/order-canonical-table` 는 현재 prod 배포 상태(admin-only, read-only, PII 미반환 — 무해).
- **제거 또는 비공개 유지 결정 필요(별도):** 실측 목적 달성됨. 향후 정렬 WO 검증에 1~2회 더 쓸 수 있으므로 즉시 제거보다 **정렬 WO 완료 후 일괄 제거** 권장. (제거도 코드변경+배포 동반.)

---

## 6. 요약

- **canonical 주문 원장 = `checkout_orders` (라이브 확정).**
- **`ecommerce_orders` = 프로덕션 미존재 (라이브 확정).**
- **`checkout_orders` = 0건** → 실주문 전무, 데이터 이관 불필요.
- **분기 = H1.** create+payment+list 동시 정렬 WO를 **회귀 위험 없이** 진행 가능.
- 실측 채널: 배포된 진단 엔드포인트(admin-only) — 향후 정렬 검증 재사용 후 일괄 제거.
