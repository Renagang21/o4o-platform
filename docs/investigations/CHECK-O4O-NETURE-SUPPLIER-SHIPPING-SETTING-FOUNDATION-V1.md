# CHECK-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1

> 공급자별 배송/무료배송/반품 정책을 `NetureSupplier`에 additive 추가하고 설정 UI에서 저장/조회. **배송비 계산은 변경하지 않음** (V2).
>
> WO: `WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1`
> 선행 IR: `IR-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-DESIGN-V1` (판정 A)
> 작성일: 2026-06-07
> 상태: 구현·정적검증 완료.

---

## 1. Summary

선행 IR 판정 A대로 `neture_suppliers`(NetureSupplier)에 배송 정책 필드를 **additive**로 추가하고, 공급자 설정 화면(`/mypage/business-profile` → SupplierProfilePage)에 "배송 정책" 섹션을 추가했다. **저장/조회 foundation 만** — `checkout.service`의 `shippingFee=0` 계산은 그대로 둠.

- 신규 필드(4): `base_shipping_fee`, `free_shipping_threshold`, `average_dispatch_days`, `return_exchange_notice`.
- 기존 배송 안내 필드(3, 엔티티엔 있으나 profile read/write 미연결이던) `shipping_standard/island/mountain`도 같은 섹션에 배선.
- migration: 4개 컬럼 `ADD COLUMN IF NOT EXISTS`, nullable, backfill 없음.

---

## 2. Files Changed

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/neture/entities/NetureSupplier.entity.ts` | 배송 정책 4필드 추가 + shipping_standard/island/mountain 타입 `string \| null` 정정 |
| `apps/api-server/src/database/migrations/20260607000000-AddSupplierShippingPolicyFields.ts` | **신규** — 4컬럼 additive nullable |
| `apps/api-server/src/modules/neture/services/supplier.service.ts` | getSupplierProfile 반환 + updateSupplierProfile DTO/persist에 7필드 추가 |
| `apps/api-server/src/modules/neture/neture.service.ts` | updateSupplierProfile DTO 확장 |
| `apps/api-server/src/modules/neture/controllers/supplier-management.controller.ts` | PATCH /profile destructure + passthrough |
| `services/web-neture/src/lib/api/supplier.ts` | SupplierProfile 타입 + updateProfile payload 7필드 |
| `services/web-neture/src/pages/supplier/SupplierProfilePage.tsx` | "배송 정책" 섹션(상태/로드/저장/UI) + 안내 문구 |
| `docs/investigations/CHECK-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1.md` | 본 문서 |

---

## 3. 필드 (저장/조회 foundation)

| 필드 (camelCase / column) | 타입 | 비고 |
|---|---|---|
| baseShippingFee / base_shipping_fee | int nullable | 기본 배송비 |
| freeShippingThreshold / free_shipping_threshold | int nullable | 무료배송 기준 금액 |
| averageDispatchDays / average_dispatch_days | int nullable | 평균 출고 소요일 |
| returnExchangeNotice / return_exchange_notice | text nullable | 반품/교환 안내 |
| shippingStandard/Island/Mountain (기존) | text nullable | 배송 안내(이번에 read/write 배선) |
| minOrderAmount/Surcharge/orderConditionNote (기존) | — | B2B 주문조건(무변경, 같은 화면) |

검증(서버): 숫자 필드 `< 0` 또는 null → null 저장. 텍스트 trim, 빈값 → null.

---

## 4. UI ("배송 정책" 섹션, SupplierProfilePage Section E)

- 기본 배송비 / 무료배송 기준 / 평균 출고 소요일 (숫자) + 일반/제주·도서산간/산간 배송 안내 + 반품·교환 안내.
- 안내 박스:
  - "이번 단계에서는 배송비 계산에 자동 반영되지 않음"(계산 미적용 명시).
  - "향후 같은 공급자 일반+이벤트 오퍼 상품은 공급자별 주문금액에 함께 포함, 다른 공급자 금액은 미포함"(이벤트 오퍼 포함 기준).
  - "유통참여형 펀딩은 온라인 주문·배송 계산 대상 아님, 적용 범위 제외".

---

## 5. Verification Results

| 항목 | 결과 |
|---|---|
| api-server `tsc --noEmit` | ✅ 0 errors (exit 0) |
| web-neture `tsc --noEmit` | ✅ 0 errors (exit 0) |
| migration compile | ✅ (tsc 포함) |
| profile 조회 신규 필드 포함 | ✅ getSupplierProfile 반환 |
| profile 저장 신규 필드 저장 | ✅ updateSupplierProfile persist |
| 숫자 필드 검증(<0/null) | ✅ |
| 배송 정책 섹션 렌더 | ✅ |
| 계산 미적용 안내 / 이벤트 포함 기준 / 펀딩 제외 안내 | ✅ |
| 기존 프로필(B2B 주문조건 등) 저장 영향 | ✅ 없음(additive) |

---

## 6. What Was Not Changed (§7)

- ✅ `checkout.service` shippingFee 계산 변경 없음 (shippingFee=0 유지)
- ✅ 무료배송 자동 계산 없음 · 공급자별 order grouping 변경 없음
- ✅ checkout_orders / order_items 구조 변경 없음
- ✅ 이벤트 오퍼 주문 로직 변경 없음 · 유통참여형 펀딩 주문/배송 연결 없음(구조적 제외)
- ✅ 정산/세금계산서 변경 없음 · 서비스별/상품별/온도대 정책 없음 · 택배사/송장/배송상태 UI 없음
- ✅ 제품 등록/대량 등록/목록 후속 액션/허브 무영향

---

## 7. Follow-ups (§10)

| WO | 범위 |
|---|---|
| WO-O4O-NETURE-SUPPLIER-SHIPPING-CALCULATION-V2 | checkout.service shippingFee=0 → 공급자 정책 기준 계산(이벤트 오퍼 subtotal 포함) |
| WO-O4O-NETURE-SUPPLIER-ORDER-FULFILLMENT-WORKSPACE-V1 | 공급자 주문 확인·배송 준비/완료 화면 |
| WO-O4O-NETURE-SUPPLIER-SHIPPING-POLICY-ENTITY-V2 | 서비스별/상품별/온도대 예외 → 별도 policy table 승격 |

---

**작성:** O4O Platform Team · 2026-06-07
**상태:** 배송 정책 저장 foundation 완료. 배송비 계산은 V2.
