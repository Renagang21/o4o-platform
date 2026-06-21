# CHECK — Toss 결제 공통 Core V1 (중단 기준 #1·#2·#6 — 재구현 안 함)

**WO:** `WO-O4O-TOSS-PAYMENT-CORE-V1`
**일자:** 2026-06-21
**성격:** 조사 → 중단 판정. **코드/DB/migration/entity/route 무변경.** 본 CHECK 문서 1개만 산출.
**상위 IR:** `IR-O4O-TOSS-PAYMENT-SCOPE-AND-TYPE-SEPARATION-V1` · `IR-O4O-PAYMENTCORE-O4O-PAYMENTS-SCHEMA-CONTRACT-AUDIT-V1`

---

## 1. 판정 — 기존 PaymentCore 가 이미 존재·가동 중. 재구현 거부.

WO §15 중단 기준 **#1(동일 Payment Core 모델 기존재) + #2(기존 Toss 결제 구현 존재) + #6(다른 세션 WIP 충돌)** 이 동시에 확인되었다. §15 규정("중단 #1 또는 #2 확인 시 재구현하지 않고 기존 구현을 조사하여 CHECK 로 닫는다")에 따라 **신규 entity/migration/service 를 만들지 않는다.**

---

## 2. 기존 PaymentCore 실측 (이미 4 서비스 공통 가동)

| 계층 | 구현 | 비고 |
|---|---|---|
| Core 패키지 | `packages/payment-core` | `PaymentCoreService`(prepare/confirm/cancel/refund/getStatus) + `PaymentStateMachine`(assertTransition) + `PaymentStatus` enum + `PaymentProps` interface + `PaymentEventLog`/`PaymentEventPublisher` |
| 결제 원장 entity | `apps/api-server/src/entities/payment/PlatformPayment.entity.ts` → `@Entity('o4o_payments')` | `WO-O4O-PAYMENT-CORE-GLYCOPHARM-PILOT-V1` |
| migration | `src/database/migrations/1771027200000-CreateO4oPaymentsTable.ts` (+ `...01-AddPaymentKeyUniqueAndStatusIndex`) | `WO-O4O-PAYMENTCORE-O4O-PAYMENTS-MIGRATION-RELOCATE-V1` (스캔 dir 이전 완료 → CI/CD 적용) |
| repository adapter | `services/payment/adapters/TypeORMPaymentRepository.ts` → PlatformPayment | |
| Toss provider | `services/payment/adapters/TossPaymentProviderAdapter.ts` · `services/toss-payments.service.ts` · `config/payment.config.ts`(TOSS_SECRET_KEY/CLIENT_KEY env, getTossAuthHeader) | **WO §10 이 "설정 안 함"이라 한 Toss env/SDK 가 이미 존재** |
| 서비스 소비처 | `routes/{kpa,glycopharm,cosmetics}/controllers/*-payment.controller.ts` + `routes/neture/controllers/neture-b2b-payment.controller.ts` | 4 서비스 전부 PaymentCoreService → o4o_payments 공통 의존 (IR-...-SCHEMA-CONTRACT §2) |

→ WO §3 목표("O4O 의 모든 Toss 결제가 공통으로 사용할 Payment Core")는 **이미 구축되어 4 서비스에서 prepare/confirm 가동 중**이다.

## 3. WO §17 완료 기준 대비 매핑

| # | WO 요구 | 기존 구현 | 판정 |
|:--:|---|---|:--:|
| 1 | 공통 Payment entity | `PlatformPayment`(o4o_payments) + `PaymentProps` | ✅ 기존재 |
| 2 | `paymentType = SERVICE_ACCESS \| B2B_ORDER` | **명시 컬럼 부재** — `sourceService`(varchar) + `metadata` 로 서비스/목적 표현 | ⚠️ **유일한 실질 GAP** |
| 3 | `paymentStatus` 6종 | `PaymentStatus`: CREATED / CONFIRMING / PAID / FAILED / CANCELLED / REFUNDED | ✅ (어휘 차이: READY→CREATED · PAYMENT_PENDING→CONFIRMING · CANCELED→CANCELLED 철자) |
| 4 | tossOrderId unique | `transactionId`(unique IDX) + `orderId`(index) | ✅ (명칭만 다름) |
| 5 | tossPaymentKey 후속 저장 | `paymentKey`(confirm 시 set) | ✅ |
| 6 | amount/orderName/payer 조직 | `amount`/`currency` ✅ · `orderName`/`payerOrganizationId` 부재(metadata) | ⚠️ 부분 |
| 7 | targetRefType/targetRefId or metadata | `metadata` ✅ · `targetRefType`/`targetRefId` 명시 부재 | ⚠️ 부분(metadata 로 가능) |
| 8 | PaymentCoreService 생성/조회/상태전환 | prepare/confirm/cancel/refund/getStatus + StateMachine | ✅ (WO 요구보다 완성도 높음) |
| 9 | Toss SDK/UI/env 무변경 | env/adapter/service 이미 존재 | — (WO "안 함" 목록이 이미 done) |

**결론:** 기존 PaymentCore 는 WO 범위를 **초과 충족**한다. 유일한 개념적 차이는 **`paymentType`(SERVICE_ACCESS/B2B_ORDER) 1급 컬럼 부재** + 일부 비정규화 필드(payerOrganizationId/orderName/targetRef)이며, 현재는 `sourceService`+`orderId`+`metadata` 로 표현 가능하다.

## 4. 재구현하지 않는 이유 (중단 근거)

1. **#1·#2**: `o4o_payments`/`PlatformPayment`/`PaymentCoreService`/Toss adapter 가 이미 존재·배포·4 서비스 가동. 신규 `O4oPayment` entity + `o4o_payments` 테이블 생성은 **기존 `@Entity('o4o_payments')` 와 직접 충돌**(중복 테이블/엔티티).
2. **#6**: 본 WO 는 `entities.ts` 등록이 필요한데, 현재 `apps/api-server/src/database/entities.ts` 는 **다른 세션 WIP**(`WO-O4O-MULTILINGUAL-PRODUCT-CONTENT-ENTITY-REGISTRY-AND-ROUTE-MOUNT-V1`, uncommitted)로 수정 중 → 접촉 금지(작업 규칙 "다른 세션 WIP 미접촉").
3. **공유 코어 리스크**: PlatformPayment 는 KPA/Glyco/KCos/Neture B2B 공통 원장 — 스키마 변경은 4 서비스 계약에 영향하며 `IR-...-SCHEMA-CONTRACT-AUDIT-V1` 거버넌스 대상.

## 5. `paymentType` GAP 처리 권고 (후속)

WO 가 원한 SERVICE_ACCESS/B2B_ORDER 1급 분리는 **다음 시퀀스 WO 에서 실제 소비 시점에 설계 결정**하는 것이 안전하다.

- `WO-O4O-FOREIGN-VISITOR-SALES-SUPPORT-TOSS-PAYMENT-V1`(§12.1) 가 SERVICE_ACCESS 를 처음 사용한다. 이때:
  - **옵션 A (확장 없음, 권장 1순위 검토)**: `sourceService='neture'` + `metadata.paymentType='SERVICE_ACCESS'` + `metadata.planCode='FOREIGN_VISITOR_SALES_SUPPORT'` + `orderId` 로 표현. 코어 스키마 무변경.
  - **옵션 B (1급 컬럼 추가)**: 검색/집계가 필요하면 `PlatformPayment` 에 `paymentType`/`payerOrganizationId`/`targetRefType`/`targetRefId` **additive** 컬럼 추가(NOT NULL DEFAULT 회피, nullable). 단 entities.ts WIP commit 이후 + 4 서비스 계약 검토 후.
- 어느 옵션이든 **본 WO 단독으로는 진행하지 않는다**(소비 맥락 없이 코어 계약을 흔들면 contract drift — WO §9 의 "섣불리 API/contract 흔들지 말 것" 원칙과 동일).

권고 후속: `IR-O4O-PAYMENTCORE-PAYMENT-TYPE-AXIS-DECISION-V1` (옵션 A vs B 1쪽 결정) → `WO-O4O-FOREIGN-VISITOR-SALES-SUPPORT-TOSS-PAYMENT-V1` 에 반영.

## 6. V1 제외/무변경 확인

- 코드/entity/migration/route/service **무변경**. 신규 파일 0(본 CHECK 제외).
- `entities.ts` 외 4개 WIP 파일(multilingual product content) **미접촉**.
- Toss SDK/UI/confirm 실호출/secret 설정 **무변경**(기존 구현 그대로 둠).
- entitlement 후처리 / B2B 주문 PAID / 장바구니·주문 상태 / 네이버·쿠팡 / 자동결제 / 부분취소환불 **무변경**.
- typecheck: 코드 변경 0 → 별도 실행 불요(기존 PaymentCore 는 이미 빌드/배포됨).

## 7. 후속 WO 연결 (재정렬)

```text
(GAP 선결정) IR-O4O-PAYMENTCORE-PAYMENT-TYPE-AXIS-DECISION-V1   ← 옵션 A/B
1. WO-O4O-FOREIGN-VISITOR-SALES-SUPPORT-TOSS-PAYMENT-V1         ← 기존 PaymentCore.prepare/confirm 재사용 + 결제 성공 후 entitlement ACTIVE
2. WO-O4O-B2B-ORDER-PURPOSE-V1 …                                ← B2B_ORDER 는 이미 neture-b2b-payment 가 코어 소비 중(목적 코드만 추가)
```

---

## 8. 최종 기준 문장

`WO-O4O-TOSS-PAYMENT-CORE-V1` 이 만들려는 공통 결제 기록/상태/타입 기반은 **`packages/payment-core`(PaymentCoreService + PaymentStateMachine) + `PlatformPayment`(o4o_payments) + Toss adapter + 4 서비스 payment 컨트롤러**로 **이미 구현·배포·가동 중**이다. 따라서 중단 기준 #1·#2 에 따라 신규 코어를 재구현하지 않는다. 유일한 개념적 차이인 `paymentType`(SERVICE_ACCESS/B2B_ORDER) 1급 분리는 현재 `sourceService`+`metadata` 로 표현 가능하며, 실제 SERVICE_ACCESS 를 소비하는 후속 WO 에서 옵션 A(metadata) vs B(컬럼 추가)로 결정한다. `entities.ts` 가 다른 세션 WIP 상태(#6)이므로 어떤 entity 등록 변경도 본 작업에서 수행하지 않는다.

---

*Date: 2026-06-21 · CHECK · 중단(#1·#2·#6) · 코드 무변경 · 기존 packages/payment-core + o4o_payments(PlatformPayment) + Toss adapter + 4 서비스 컨트롤러 가동 확인 · 재구현 거부 · paymentType GAP 은 후속 SERVICE_ACCESS WO 에서 옵션 A/B 결정.*
