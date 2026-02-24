# IR-O4O-CHECKOUT-STABLE-DECLARATION-V1

**O4O Platform - Checkout Layer Stable Declaration (Legacy Cleanup Included)**

| 항목 | 값 |
|------|------|
| Date | 2026-02-24 |
| Status | Stable (v0.80+ 기준) |
| 근거 | IR-O4O-CHECKOUT-END-TO-END-STRUCTURE-V1 |
| 선행 WO | WO-O4O-PAYMENT-CORE-AMOUNT-VERIFICATION-HARDEN-V1 |

---

## 1. 선언 목적

Checkout End-to-End 구조는 다음을 모두 충족하였으므로 **Stable로 승격**한다:

- 4중 Storefront 게이트
- 7중 Checkout 검증
- PaymentCore 금액 내장 검증
- Atomic 상태 전이
- Sales limit 이중 방어
- ServiceKey 격리

이 선언과 함께, 레거시 결제 경로를 정리한다.

---

## 2. Stable 보호 영역

다음 영역은 **Work Order 없이 수정 불가**:

1. Storefront 4중 게이트 (`opl.is_active`, `opc.is_active`, `oc.status='APPROVED'`, `p.status='active'`)
2. Checkout 7중 검증 (약국활성/공급계약/채널승인/상품활성/재고/채널매핑/Sales limit)
3. PaymentCore 금액 검증 (`payment.amount` 내장 사용)
4. Atomic `transitionStatus()` 로직
5. Sales limit 2차 방어 (`status='PAID'` 기준)
6. `UNIQUE(paymentKey)` 제약
7. ServiceKey 격리 바인딩

---

## 3. Legacy 정리 대상

### A. Cosmetics 직접 Toss 호출 경로

| 현재 | 목표 |
|------|------|
| `cosmetics-payment.controller.ts`에서 직접 Toss API 호출 | PaymentCore를 통한 단일 경로 |

**정책**: 모든 결제 Confirm은 PaymentCore를 통해서만 수행한다.

### B. Controller 레벨 금액 검증 코드

GlycoPharm: 제거 완료 (WO-O4O-PAYMENT-CORE-AMOUNT-VERIFICATION-HARDEN-V1)

### C. 중복 결제 Dedup 개선 (후순위)

현재: 메모리 기반 Set (1시간 TTL)
Phase2: Redis 기반 이동 가능 (지금은 변경하지 않음)

---

## 4. Checkout Stable 이후 변경 금지 항목

- `transitionStatus` WHERE 조건
- Sales limit `PAID` 기준
- 2차 limit 재검증 위치
- `paymentKey` UNIQUE 제약
- `status` enum 구조
- 주문 상태 전이 흐름
- Storefront 4중 게이트 쿼리 패턴

---

## 5. Stable 상태 재판정

| 영역 | 상태 |
|------|------|
| Storefront 게이트 | **Stable** |
| Checkout 생성 | **Stable** |
| PaymentCore | **Stable** |
| Event Finalize | **Stable** |
| Sales limit | **Stable** |
| Cross-service 차단 | **Stable** |
| 금액 위변조 | **Stable** |

**Checkout Layer = Fully Stable**

---

## 6. 플랫폼 Stable 현황

| Stable 영역 | 선언 문서 |
|-------------|----------|
| Retail Stable | `docs/platform/architecture/O4O-RETAIL-STABLE-V1.md` |
| Content Stable | `docs/baseline/CONTENT-STABLE-DECLARATION-V1.md` |
| **Checkout Stable** | 본 문서 |

플랫폼 3축 (콘텐츠 / 판매 / 결제) 모두 Stable 달성.

---

## 7. 전략적 의미

이 시점부터 O4O는:

- **구조 실험 단계 종료**
- **수익 흐름 보호 완료**
- **정책 기반 운영 단계 진입**

이후 확장은 Stable 위에서 이루어진다.

---

## 8. 핵심 파일 참조

| 구분 | 파일 |
|------|------|
| PaymentCore | `packages/payment-core/src/services/PaymentCoreService.ts` |
| Storefront (통합) | `apps/api-server/src/routes/platform/unified-store-public.routes.ts` |
| Checkout | `apps/api-server/src/routes/glycopharm/controllers/checkout.controller.ts` |
| Payment (GlycoPharm) | `apps/api-server/src/routes/glycopharm/controllers/glycopharm-payment.controller.ts` |
| Payment (Cosmetics, Legacy) | `apps/api-server/src/routes/cosmetics/controllers/cosmetics-payment.controller.ts` |
| Event Handler (GlycoPharm) | `apps/api-server/src/services/glycopharm/GlycopharmPaymentEventHandler.ts` |
| Retail Stable Spec | `docs/platform/architecture/O4O-RETAIL-STABLE-V1.md` |
| E2E 조사 보고서 | `docs/investigation/IR-O4O-CHECKOUT-END-TO-END-STRUCTURE-V1.md` |

---

*Checkout Stable Declaration v1.0*
*Date: 2026-02-24*
*Status: Active*
