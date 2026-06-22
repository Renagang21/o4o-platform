# CHECK-O4O-STORE-SERVICE-SUBSCRIPTION-TOSS-PAYMENT-V1

> **작업명:** WO-O4O-STORE-SERVICE-SUBSCRIPTION-TOSS-PAYMENT-V1
> **유형:** backend(결제 prepare/confirm + entitlement 발급/연장) + frontend(결제 진입 UI). PaymentCore/Toss adapter **재사용**, schema/migration **0**.
> **결과(Phase 1 backend): PASS(코드/타입) — `STORE_SERVICE_SUBSCRIPTION` 결제 prepare/confirm + FOREIGN_VISITOR_SALES_SUPPORT 이용권 ACTIVE 생성/30일 연장(idempotent). api-server tsc 0. Phase 2(frontend) 후속.**
> **작성일:** 2026-06-22
> 선행: 소비자→매장 결제(STORE_SALE_PAYMENT) 410 제거 완료 · `store_paid_feature_entitlements`(WO-...-ENTITLEMENT-V1, read-only)

---

## 1. git 상태 / 다른 세션 WIP

- HEAD `78d15ffa0` 기준. **다른 세션 WIP `pnpm-lock.yaml`·`apps/mobile-app/` 미접촉.** 검증 png 미staging.

## 2. 재사용 인프라 (조사 결과)

| 재사용 | 위치 |
|------|------|
| PaymentCore prepare/confirm | `packages/payment-core/.../PaymentCoreService.ts` (prepare(req)/confirm(paymentId, paymentKey, orderId), 금액=서버 prepare값 검증, 상태머신 CREATED→CONFIRMING→PAID) |
| Toss adapter | `services/payment/adapters/TossPaymentProviderAdapter.ts` (PaymentCore.confirm 내부 호출) |
| repo/publisher | `TypeORMPaymentRepository` · `EventHubPaymentPublisher` |
| 결제 metadata 저장 | `o4o_payments.metadata`(jsonb) |
| entitlement 테이블 | `store_paid_feature_entitlements`(organizationId, serviceKey, planCode, status, startsAt, endsAt, source, metadata, UNIQUE(org,svc,plan)) — **migration 불필요** |
| store owner 인증 | `isStoreOwner(dataSource, userId, serviceKey)` → { isOwner, organizationId } |
| serviceKey 축 | 'kpa'|'glycopharm'|'cosmetics' (role-prefix; /me/check 와 동일 키로 저장/조회) |

## 3. 변경 파일 (Phase 1 backend 2 + CHECK)

| 파일 | 변경 |
|------|------|
| `modules/store-entitlement/store-paid-feature-entitlement.service.ts` | **`activateOrExtend`** 신규(ACTIVE 생성/30일 연장 + paymentId idempotency) |
| `modules/store-entitlement/store-entitlement.routes.ts` | **POST `/subscriptions/prepare` · `/subscriptions/confirm`** + PaymentCore wiring + 가격/상수 |

## 4. 신규 API

- `POST /api/v1/store-entitlements/subscriptions/prepare` body `{ serviceKey, planCode, successUrl, failUrl }` → `{ paymentId, transactionId, orderId, amount, clientKey, isTestMode }`
- `POST /api/v1/store-entitlements/subscriptions/confirm` body `{ paymentId, paymentKey, orderId, serviceKey }` → `{ serviceKey, planCode, status, startsAt, endsAt, applied }`
- 기존 `GET /me/check` 보존 — 결제 후 active 확인에 재사용.

## 5. paymentType / orderId / metadata 규약

- `metadata = { paymentType:'STORE_SERVICE_SUBSCRIPTION', planCode:'FOREIGN_VISITOR_SALES_SUPPORT', organizationId, serviceCode:serviceKey, durationDays:30 }`
- orderId prefix **`o4o_sub_`** (`o4o_sub_{organizationId}_{ts}_{rand}`) — B2B_ORDER·STORE_SALE_PAYMENT 와 구분.
- sourceService = `store-service-subscription`.
- **가격: V1 하드코딩** `FOREIGN_VISITOR_SALES_SUPPORT = 99000원` (placeholder, 사업 정책 확정 필요) → 후속 PLAN-CATALOG-V1 에서 DB화. 금액은 서버 prepare 고정값(프론트 위변조 불가).

## 6. entitlement 생성/연장 규칙

- 현재 ACTIVE & endsAt>now → startsAt 유지, endsAt += 30일.
- 없음/만료/취소 → startsAt=now, endsAt=now+30일, status='ACTIVE'.
- source = `toss-payment:<paymentId>`. UNIQUE(org,svc,plan) 단일 행 upsert.
- **idempotency**: entitlement.metadata.appliedPaymentIds 에 paymentId 기록. 동일 paymentId 재반영 시 `applied=false`(중복 연장 없음). + confirm 재시도 시 PaymentCore 상태머신이 중복 승인 차단, 이미 PAID면 이용권만 보장(복구).

## 7. 권한 검증

- prepare/confirm 모두 requireAuth + `isStoreOwner(serviceKey)` → organizationId. 비-owner/org 미연결 → 403 NOT_STORE_OWNER.
- confirm 시 결제 metadata.organizationId == 호출자 organizationId 재검증(STORE_MISMATCH 403), metadata.paymentType 재확인. **다른 storeId 결제 불가.**

## 8. 비접촉 확인 (정적)

- ✅ PaymentCore/Toss adapter/`o4o_payments` schema **무변경**(재사용만).
- ✅ STORE_SALE_PAYMENT(kpa/glyco/kcos consumer checkout 410) **미접촉** — 되살리지 않음.
- ✅ Neture B2B(`neture-b2b-payment.controller`) **diff 0**.
- ✅ migration/schema **0** (기존 entitlement 테이블/컬럼 사용).

## 9. 검증 (Phase 1)

- **api-server `tsc --noEmit`: EXIT 0, error 0.**

### 배포 후 API smoke (Phase 1)
1. 매장 경영자 로그인 토큰으로 `POST /subscriptions/prepare {serviceKey:'kpa', planCode:'FOREIGN_VISITOR_SALES_SUPPORT', successUrl, failUrl}` → 201 + orderId `o4o_sub_` + clientKey + amount.
2. 비-owner 토큰 → 403 NOT_STORE_OWNER.
3. 잘못된 planCode → PLAN_NOT_PURCHASABLE.
4. (sandbox) confirm → 이용권 ACTIVE + `/me/check active:true`.
5. confirm 재시도 → 중복 연장 없음(applied=false).
> 실 결제(운영)는 실행 금지. confirm은 sandbox/local 한정.

## 10. Phase 2 (frontend) — 후속

- `ForeignVisitorSalesSupportPanel`(store-ui-core) locked 상태의 결제 버튼 → prepare → Toss requestPayment → success → confirm → `/me/check` 재조회. 소비자 checkout 경로와 분리된 전용 흐름.
- API 클라이언트(coreApiClient) 추가, 결제 진행/성공/실패 상태 UI.

## 11. 후속 후보
- V2 billing key(정기결제) · 환불/취소 V1 · PLAN-CATALOG-V1(plan/price DB화 + 가격 확정).

---

*Date: 2026-06-22 · Phase 1 backend · STORE_SERVICE_SUBSCRIPTION prepare/confirm(PaymentCore 재사용) + FOREIGN_VISITOR_SALES_SUPPORT 이용권 ACTIVE/30일 연장(idempotent) · orderId o4o_sub_ · 권한 isStoreOwner + metadata 재검증 · STORE_SALE_PAYMENT/Neture B2B/PaymentCore schema 무변경 · migration 0 · 가격 V1 하드코딩(placeholder) · api-server tsc 0 · Phase2 frontend 후속.*
