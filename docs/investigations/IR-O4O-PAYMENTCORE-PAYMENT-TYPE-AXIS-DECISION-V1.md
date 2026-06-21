# IR-O4O-PAYMENTCORE-PAYMENT-TYPE-AXIS-DECISION-V1

> **유형:** Decision IR (read-only) — 코드/DB/migration/API/UI **무변경**. 본 문서 1개만 산출.
> **작성일:** 2026-06-21
> **상위:** `CHECK-O4O-TOSS-PAYMENT-CORE-V1`(중단 #1·#2) · `IR-O4O-TOSS-PAYMENT-SCOPE-AND-TYPE-SEPARATION-V1` · `IR-O4O-PAYMENTCORE-O4O-PAYMENTS-SCHEMA-CONTRACT-AUDIT-V1`
> **결론(요약):** **옵션 A 채택 — `o4o_payments`/PlatformPayment 스키마 무변경.** SERVICE_ACCESS / B2B_ORDER 구분은 기존 PaymentCore 의 `sourceService` + `orderId` prefix + **`metadata.paymentType`** 로 표현한다. 첫 적용 `FOREIGN_VISITOR_SALES_SUPPORT` 는 `metadata.planCode` 로 표현. `paymentType` 1급 컬럼(옵션 B)은 운영자 결제 집계·검색·정산·리포팅 요구가 커지는 시점에 **nullable additive** migration 으로 후속 승격한다.

---

## 1. 목적

`WO-O4O-TOSS-PAYMENT-CORE-V1`(CHECK 에서 중단)은 기존 PaymentCore 가 이미 존재함을 확인했다. 남은 단일 결정은:

```text
기존 PaymentCore/o4o_payments 를 그대로 재사용하면서,
SERVICE_ACCESS / B2B_ORDER 를 어떻게 표현할 것인가?
```

본 IR 은 옵션 A(metadata 기반, 코어 무변경) vs 옵션 B(1급 컬럼 추가) 중 V1 결론을 고정한다.

## 2. 기존 PaymentCore 소비 계약 (실측)

`packages/payment-core/src/services/PaymentCoreService.ts` + `PreparePaymentRequest` + `PaymentProps` 실측:

| 사실 | 근거 |
|---|---|
| `prepare()` 는 `sourceService`(필수) + `orderId`(필수, 문자열) + `metadata`(선택) 를 받는다 | `PreparePaymentRequest` (PaymentTypes.ts:21-42) |
| `prepare()` 는 `request.metadata` 를 **그대로 영속**한다(+ clientKey/isTestMode 머지) | PaymentCoreService.ts:69-73 (`metadata: { ...request.metadata, ... }`) |
| `sourceService` 는 **인덱스 컬럼** (조회 가능) | PlatformPayment.entity.ts:71-73 `@Index()` |
| `orderId` 는 **인덱스 컬럼** + consumer 가 자유 생성(문자열, FK 아님) → prefix 부여 가능 | PlatformPayment.entity.ts:40-42, PaymentProps.orderId |
| `transactionId` 는 코어 자동생성(`PAY-...`)·unique — consumer 가 제어 안 함 | PaymentCoreService.ts:31-35 |
| confirm 성공 시 `PAYMENT_COMPLETED` 이벤트 발행(sourceService 포함) → **이벤트 기반 도메인 후처리** | PaymentCoreService.ts:157-170, `PaymentEventPublisher` (소비: `NetureB2bCheckoutPaymentEventHandler`, `KpaPaymentEventHandler` 등) |
| `paymentType`/`payerOrganizationId`/`orderName`/`targetRefType`/`targetRefId` 1급 컬럼 **부재** | PlatformPayment.entity.ts (전 컬럼 확인) |

→ **metadata 가 코어의 canonical 확장점**이고, prepare() 가 이를 영속하며, post-confirm 후처리는 이미 이벤트 기반이다. 즉 옵션 A 는 **코어 한 줄도 바꾸지 않고** 성립한다.

## 3. 옵션 비교

| 기준 | 옵션 A — metadata 기반 (무변경) | 옵션 B — 1급 컬럼 추가 |
|---|---|---|
| o4o_payments 스키마 | **변경 없음** | additive migration(nullable 컬럼) |
| entities.ts / PlatformPayment | 무변경 | 수정 필요 |
| 4 서비스 공통 코어 영향 | **없음** | 계약 검토 필요(KPA/Glyco/KCos/Neture B2B) |
| SERVICE_ACCESS 표현 | `metadata.paymentType='SERVICE_ACCESS'` + `metadata.planCode` | `payment_type='SERVICE_ACCESS'` 컬럼 |
| 검색/집계(운영자 결제 리포팅) | JSONB 쿼리(`metadata->>'paymentType'`) — 인덱스 추가 전엔 느림 | 컬럼 인덱스로 빠름 |
| 도입 리스크 | **최저** | 중(공유 코어 + WIP 충돌 이력) |
| 되돌리기/승격 | 나중에 옵션 B 로 nullable additive 승격 가능 | — |

## 4. 결론 — 옵션 A 채택 (V1)

```text
V1 에서는 o4o_payments(PlatformPayment) 스키마를 변경하지 않는다.

SERVICE_ACCESS / B2B_ORDER 구분은 기존 PaymentCore 의
sourceService + orderId prefix + metadata.paymentType 으로 표현한다.

첫 적용 대상 FOREIGN_VISITOR_SALES_SUPPORT 결제는
metadata.planCode = 'FOREIGN_VISITOR_SALES_SUPPORT' 로 표현한다.

paymentType 1급 컬럼(옵션 B) 추가는 운영자 결제 집계·검색·정산·리포팅
요구가 커지는 시점에 nullable additive migration 으로 후속 전환한다.
```

근거: ① 기존 PaymentCore 가 4 서비스에서 가동 중 ② o4o_payments 스키마를 지금 흔들 필요 없음 ③ 첫 SERVICE_ACCESS 는 외국인 여행객 판매지원 1건 ④ 집계/정산/검색 요구가 아직 작음 ⑤ 필요 시 nullable additive 컬럼으로 승격 가능.

## 5. SERVICE_ACCESS 표현 규약 (canonical — 후속 WO 가 따른다)

`PaymentCoreService.prepare()` 호출 시:

| 키 | 값 | 비고 |
|---|---|---|
| `sourceService` | `'neture'` | 인덱스 — 서비스 축 |
| `orderId` | `o4o_sa_<YYYYMMDD>_<rand>` | consumer 생성·유일·민감정보 없음 (Toss orderId 로 전달) |
| `orderName` | 예: `'외국인 여행객 판매지원 1개월 이용권'` | 결제창 표시 |
| `amount` | 플랜 금액(서버 설정값) | 금액 검증은 코어 내부 prepare 값 사용(위변조 차단, 이미 hardened) |
| `metadata.paymentType` | `'SERVICE_ACCESS'` | **타입 축** |
| `metadata.planCode` | `'FOREIGN_VISITOR_SALES_SUPPORT'` | 대상 플랜 |
| `metadata.entitlementPeriodDays` | `30` | 이용권 기간 |
| `metadata.targetRefType` | `'paid_feature_entitlement'` | 결제 성공 후 연결 대상 |
| `metadata.payerOrganizationId` | `<organizationId>` | 결제 주체 조직 (entitlement SSOT 축과 동일) |

post-confirm: `PAYMENT_COMPLETED` 이벤트 핸들러가 `metadata.paymentType==='SERVICE_ACCESS'` 분기에서 `store_paid_feature_entitlements` 를 ACTIVE 로 생성/연장한다(후속 WO 의 책임 — 본 IR 범위 외).

> 핵심 상태값은 명시 필드(status/amount/sourceService/orderId)에 두고, **분류/연결 메타만 metadata** 에 둔다(IR-...-SCOPE §, WO §6.3 metadata 원칙 준수).

## 6. B2B_ORDER 표현 (이미 가동 — 추가 작업 최소)

`routes/neture/controllers/neture-b2b-payment.controller.ts` 가 이미 PaymentCore 를 소비해 B2B 결제(prepare/confirm)를 가동 중이다(SCHEMA-CONTRACT IR §2). B2B_ORDER 도 동일 규약으로:
- `sourceService='neture'`, `orderId='o4o_b2b_<...>'`, `metadata.paymentType='B2B_ORDER'`, `metadata.targetRefType='payment_group'`(또는 order_group).
- 목적 코드(STORE_STOCK / FOREIGN_VISITOR_FULFILLMENT)는 후속 `WO-O4O-B2B-ORDER-PURPOSE-V1` 에서 `metadata.orderPurpose` 로 추가.

## 7. 옵션 B 승격 트리거 (후속 전환 조건)

다음 중 하나가 실제 요구로 확인되면 nullable additive migration 으로 `paymentType`(+ 필요 시 `payer_organization_id`/`target_ref_type`/`target_ref_id`) 컬럼을 승격한다:

```text
- 운영자 결제 관리 화면에서 SERVICE_ACCESS vs B2B_ORDER 필터/집계가 상시 필요
- 정산/리포팅에서 타입별 합계·건수 쿼리가 빈번(JSONB 스캔 비용 문제)
- 타입별 인덱스/제약(예: 조직별 활성 SERVICE_ACCESS 유일성)이 필요
```

승격 시: `ALTER TABLE o4o_payments ADD COLUMN payment_type VARCHAR(20)` (nullable, NOT NULL DEFAULT 회피) + backfill(`metadata->>'paymentType'`) + 4 서비스 계약 검토. 별도 WO.

## 8. 후속 WO 연결

```text
1. WO-O4O-FOREIGN-VISITOR-SALES-SUPPORT-TOSS-PAYMENT-V1
   - 기존 PaymentCore.prepare/confirm 재사용 (§5 규약)
   - 결제 성공 이벤트 → store_paid_feature_entitlements ACTIVE
2. WO-O4O-B2B-ORDER-PURPOSE-V1            ← metadata.orderPurpose 추가
3. WO-O4O-B2B-ORDER-PAYMENT-GROUP-PREPARE-V1
4. WO-O4O-B2B-ORDER-TOSS-PAYMENT-V1
(옵션 B 승격) WO-O4O-PAYMENTCORE-PAYMENT-TYPE-COLUMN-PROMOTE-V1  ← §7 트리거 충족 시
```

## 9. 무변경 확인

- 코드/entity/migration/API/UI/route/service **무변경**. 신규 파일 0(본 IR 제외).
- 다른 세션 WIP 미접촉. 결제 실행/재시도 없음.

---

## 10. 최종 기준 문장

기존 `packages/payment-core` + `o4o_payments`(PlatformPayment) 를 그대로 재사용하며, **V1 에서는 코어 스키마를 변경하지 않는다.** SERVICE_ACCESS / B2B_ORDER 는 `sourceService` + `orderId` prefix + `metadata.paymentType` 으로 표현하고, 첫 적용 `FOREIGN_VISITOR_SALES_SUPPORT` 는 `metadata.planCode` 로 표현한다. `paymentType` 1급 컬럼은 운영자 집계·검색·정산 요구가 커지는 시점에 nullable additive migration 으로 후속 승격한다.

---

*Date: 2026-06-21 · read-only Decision IR · 코드 무변경 · 결론: 옵션 A(metadata 기반, o4o_payments 무변경) · SERVICE_ACCESS=metadata.paymentType+planCode · 옵션 B(additive column)는 집계/정산 요구 시 후속 승격.*
