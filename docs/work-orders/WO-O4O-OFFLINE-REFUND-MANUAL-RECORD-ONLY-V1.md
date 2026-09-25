# WO-O4O-OFFLINE-REFUND-MANUAL-RECORD-ONLY-V1

> **상태:** 접수 · **정책 확정 · 실행 전 보완 반영(§10) · 코드 실행 범위 미개방** (이 문서의 작성 · 커밋은 문서 작업만이며 코드 · 운영 DB · 배포 게이트 · 배포 변경 0)
> **작성일:** 2026-09-25
> **기준 코드:** 작성 시점 `origin/main` `3c0a62665`. 실행은 항상 최신 `origin/main` 에서 시작한다.
> **선행 조사:** [`CHECK-O4O-URL-FIRST-CENSUS-V1`](../checks/CHECK-O4O-URL-FIRST-CENSUS-V1.md) §14 · §19-2 (이 WO 로 §14 자동 환불 구현 제안은 대체됨)
> **CHECK:** 실행 시 `docs/checks/CHECK-O4O-OFFLINE-REFUND-MANUAL-RECORD-ONLY-V1.md` 를 만든다.
> **한 줄:** 환불은 거래 당사자가 오프라인에서 결정 · 처리하고, O4O 는 권한 있는 담당자가 확인한 결과를 **수작업으로 기록만** 한다. O4O 의 자동 PG 환불 경로와 "PG 환불 없이 원장만 환불 완료"가 되는 결함을 전수 조사해 안전하게 사용 중지하고, 수작업 기록 기능의 권한 · 데이터 · 검증 기준을 정한다.

---

# 1. 확정 정책 (재판단 대상 아님)

```text
P1. 환불 여부 · 금액 · 방법은 거래 당사자가 오프라인에서 결정하고 처리한다.
P2. O4O 는 환불을 판단하거나 PG 취소 · 환불을 자동 실행하지 않는다.
P3. 권한 있는 담당자가 실제 처리 결과를 확인한 뒤 O4O 에 수작업으로 기록한다.
P4. 세금계산서 관련 처리도 확인된 결과를 담당자가 수작업으로 적용한다.
P5. 실제 환불 완료와 O4O 기록 입력을 구분하고, 기록자 · 시각 · 근거 · 정정 이력을 남긴다.
P6. 환불 기록을 이유로 재고 · 정산 · 알림 · 세금계산서를 자동 처리하지 않는다.
P7. 결제 전 주문 취소와 결제 후 환불은 구분한다.
```

- 이 정책은 사용자 확정(2026-09-25)이다. CLAUDE.md "결제 · 정산 · 법률 · 규제 판단 필요" 중지 조건 중 **정책 판단**은 이것으로 해소된다. 세법 · 전자상거래법 등 **법률 해석**이 새로 필요해지면 여전히 중지한다.
- 정책 경계: 소비자 환불은 이미 [`O4O-STORE-COMMERCE-BOUNDARY-V1`](../baseline/O4O-STORE-COMMERCE-BOUNDARY-V1.md) §7(:154-177)이 "O4O 밖(POS · 외부 판매채널)에서 처리"로 정한다. 이 WO 는 같은 원칙을 **공급자 → 매장 B2B 결제**까지 넓힌다.

---

# 2. 현재 상태 전수 조사 (작성 시점 코드 · 운영 실측)

## 2.1 PG 취소 · 환불을 실행할 수 있는 경로 — 전부 P2 위반

| # | 경로 | 코드 | 호출 주체 | PG 호출 | 원장 기록 | 운영 도달성 |
|---|---|---|---|---|---|---|
| R-A1 | **PharmacyHub 결제 후 그룹 취소** `POST /api/v1/pharmacy-hub/store-owner/payments/:paymentGroupId/cancel` | `controllers/pharmacy-hub/PharmacyHubPaymentController.ts:311-403` · 라우트 `routes/pharmacy-hub/pharmacy-hub.routes.ts:527-531` | API 전용 — **프론트 호출처 없음**(web-pharmacy-hub · web-store 는 결제 전 취소만 호출) | 조건부(`PaymentCoreService.refund` → Toss 전체 취소) | `checkout_orders.status='cancelled'` · `paymentStatus` paid→`refunded` · `neture_orders` paid→`cancelled` · metadata `cancelReason/cancelledBy` | 마운트됨 · `requireAuth` + `pharmacy-hub:store_owner` + 구매자 소유 · 공급자 접수 후 409 |
| R-A2 | 플랫폼 결제 환불 `POST /api/checkout/refund` (별칭 `/api/orders/refund`) | `controllers/checkout/checkoutController.ts:45-150` · `routes/checkout.routes.ts:22` | API 전용 | Toss `cancelPayment`(부분 금액 가능) | `checkoutService.refundOrder`(`services/checkout.service.ts:350-414`): `checkout_payments`/`checkout_orders` REFUNDED · `refundedAt` · `checkout_order_logs` | 마운트됨 · `platform:super_admin` · **레거시 `checkout_payments` 행이 있어야 동작**(현행 결제는 `o4o_payments` → 400) |
| R-A3 | 관리자 주문 환불 `POST /api/admin/orders/:id/refund` | `controllers/admin/adminOrderController.ts:129-215` · `routes/admin-orders.routes.ts:37` | API 전용(관리자 화면 제거됨) | R-A2 와 동일 | R-A2 와 동일 | 마운트됨 · `platform:super_admin` · 사실상 레거시 전용 |
| 기반 | `PaymentCoreService.refund` → `TossPaymentProviderAdapter.refund` | `packages/payment-core/src/services/PaymentCoreService.ts:235-265` · `services/payment/adapters/TossPaymentProviderAdapter.ts:101-129` | R-A1 만 호출 | Toss `/payments/{key}/cancel` 전액 | `o4o_payments` REFUNDED | R-A1 경유 |
| 기반 | `toss-payments.service.ts` `cancelPayment` | `services/toss-payments.service.ts:192-213` | R-A2 · R-A3 | Toss 부분/전액 | — | R-A2 · R-A3 경유 |

- Toss webhook 라우트 없음 · 주문/결제 취소 · 환불 job 없음(조사 확인).
- `PaymentCoreService.cancel`(CREATED → CANCELLED)은 호출처 없음(사용 안 함).

## 2.2 "PG 환불 없이 원장만 환불 완료"가 되는 결함 (결함 등급 B)

| # | 결함 | 조건 | 결과 |
|---|---|---|---|
| **B1** | R-A1 이 PAID 결제행을 못 찾아도 원장을 환불로 바꾼다 | `TypeORMPaymentRepository.findByOrderId`(`:55-58`)가 **정렬 · 상태 필터 없는 `findOne`**. `o4o_payments.orderId` 는 unique 아님, prepare 재호출마다 CREATED 행 추가(`PaymentCoreService.prepare:49-88`). 과거 prepare 행이 선택되거나 결제행이 없거나 CONFIRMING/FAILED 이면 PG 환불을 건너뛰고(`PharmacyHubPaymentController.ts:357-362`) 트랜잭션은 계속 진행(`:364-383`) | **돈은 결제된 채 원장은 `refunded`**, 응답은 `refunded:false` |
| B2 | 부분 환불이 전액 환불로 기록 | R-A2 · R-A3 이 `cancelAmount` 로 부분 취소해도 `refundOrder` 가 주문 · 결제 상태를 전액 REFUNDED 로 변경(`checkout.service.ts:379-391`) | 원장 과대 표기 |

## 2.3 원장과 실제가 어긋나는 반대 방향 · 인접 결함 (정책 P5 에 영향)

| # | 결함 | 결과 |
|---|---|---|
| B3 | PG 먼저 호출 후 DB 저장(`PaymentCoreService.refund:246-250`, R-A1 `:360`→`:364`, R-A2/R-A3 `refundOrder` 예외 가능) | **돈은 환불됐는데 원장은 `paid`** |
| R1 | **결제 전 취소 후에도 결제 확정이 막히지 않는다.** PH confirm(`PharmacyHubPaymentController.ts:197-210`)은 그룹 존재만, B2B factory confirm(`services/payment/b2b/b2b-payment-controller.factory.ts:295,326`)은 `isPayableTarget` 만 확인하고 `isPayableState`(`:108`, prepare 에서만 사용)는 쓰지 않음. Neture B2B confirm 도 동일. 완료 핸들러는 cancelled 주문을 건너뜀 | **PG 는 결제 완료 · 주문은 `cancelled` · 환불도 알림도 없음** |

## 2.4 결제 전 주문 취소 경로 — 정책 P7 에 따라 유지 대상 (돈 이동 없음)

| 경로 | 코드 | 비고 |
|---|---|---|
| PH 결제 전 취소 | `PharmacyHubPaymentController.ts:243-301` · UI "주문 취소"(web-pharmacy-hub · web-store `/work/pharmacy-hub/orders/:orderId`, `paymentStatus==='pending'` 일 때만) | 결제된 주문은 409 `ALREADY_PAID` |
| KPA · K-Cosmetics 결제 전 취소 `cancelStoreOrderBeforePayment` | `services/checkout/store-order-cancel.service.ts:99-237` · KPA `kpa-checkout.controller.ts:240-272` · KCos `cosmetics-order.controller.ts:441-473` | 결제된 주문 409 · **이벤트 특가 예약 재고 복원**(결제 전 취소의 기존 계약, 환불 기록과 무관) · 테스트가 이 파일에 "refund" 문자열 부재를 단언 |

## 2.5 부수 효과 현황 (정책 P6)

- 재고: 결제 전 취소(2.4)만 이벤트 특가 재고 복원. 결제 후 환불 경로는 복원 없음.
- 정산: 관리자 수동 계산(`neture_orders.status='delivered'` 대상) · 자동 조정 없음.
- 알림: `payment.refunded` 는 로그만(구독자 없음).
- **세금계산서: 발행 · 연동 코드 없음.** 수신 이메일 필드(`neture_suppliers.tax_invoice_email` · `organizations.metadata.taxInvoiceEmail` · `users.businessInfo.taxInvoiceEmail` 등)만 존재.

## 2.6 수작업 기록의 선례 · 재료

- **선례(모델)**: 유통참여형 펀딩 참가자 결제 상태 수기 기록 — `marketTrialOperatorController.ts:969-1119`(`neture:operator`), `ActionLogService` 로 변경 전/후 감사 기록, PG 호출 없음, 정산 mutation 금지. 정책 문서 [`O4O-MARKET-TRIAL-OFFLINE-PAYMENT-CONFIRMATION-AUDIT-POLICY-V1`](../architecture/O4O-MARKET-TRIAL-OFFLINE-PAYMENT-CONFIRMATION-AUDIT-POLICY-V1.md).
- 감사 기록: `action_logs`(`packages/action-log-core`) · `checkout_order_logs`(REFUNDED 등 액션 보유, 레거시 흐름에서만 기록).
- 현재 **PG 호출 없이 `checkout_orders` · `neture_orders` · `o4o_payments` 에 환불 결과를 기록하는 운영자 기능은 없다.**

## 2.7 운영 실측 (2026-09-25, read-only · CHECK-O4O-URL-FIRST-CENSUS-V1 §10-1)

- PH 주문 6건 전부 `cancelled` · `o4o_payments`(pharmacy-hub) 6건 전부 `CREATED` · 결제 완료 0 → **B1 · B3 · R1 로 인한 실제 피해 0**(현재).
- `neture_orders` kpa-society 0.
- 레거시 `checkout_payments`: 1행 · pending · paymentKey 없음 → R-A2 · R-A3 현재 실행 불가(§10-1 재확인).

---

# 3. 승인 범위 (실행 시)

## A. 자동 환불 경로의 안전한 사용 중지

| 대상 | 방식 | 근거 선례 |
|---|---|---|
| R-A1 PH 결제 후 그룹 취소 | 라우트를 **410 RETIRED** 로 교체(코드는 삭제하지 않고 호출 차단) — 응답에 "환불은 거래 당사자가 처리 후 담당자가 기록" 안내 코드 | `kpa-payment.controller.ts:27-47` · `cosmetics-payment.controller.ts:42` 의 410 은퇴 스텁 + `ecommerce-core-and-commerce-residue-retirement.spec.ts` |
| R-A2 · R-A3 플랫폼/관리자 환불 | 동일하게 410 | 동일 |
| `PaymentCoreService.refund` · Toss `refund`/`cancelPayment` | 호출처 0 이 된 뒤에도 **이번 WO 에서 삭제하지 않는다**(패키지 · 테스트 계약 영향: `ecommerce-core-and-commerce-residue-retirement.spec.ts:224-226` 이 `toss-payments.service.ts` 존재를 단언). 새 호출 추가를 막는 소스 계약 테스트만 추가 | — |

- 사용 중지 전 G0 실측: 해당 라우트의 최근 호출 로그(Cloud Logging) · 레거시 `checkout_payments` 행 수. 호출이 있으면 중지하고 보고.
- env 플래그 방식(`X_ENABLED`)은 재활성화 가능성이 남으므로 **쓰지 않는다**(정책 P2 는 기능 부재를 요구).

## B. 결함 수정 (정책과 무관하게 원장 정합성)

| 결함 | 조치 |
|---|---|
| B1 · B2 · B3 | 경로 자체가 A 로 중지되므로 **코드 수정 대상에서 제외**(410 이후 도달 불가). 테스트로 도달 불가를 고정 |
| **R1** | 상태 검사만으로 끝내지 않는다 — **동시 진행(결제 확정 ↔ 결제 전 취소)까지 원자적 상태 전이로 막고**, PG 승인 뒤 불일치가 발견되면 자동 환불 없이 운영자 확인 대상으로 남긴다. 상세 설계 §10-2 |

## C. 수작업 환불 기록 기능

### C.1 권한

- 기록 권한 = **해당 거래의 서비스 운영자**: PH/KPA B2B = `kpa:operator`(PH 흡수 전까지 `pharmacy-hub:operator` 병행), Neture = `neture:operator`, K-Cosmetics = `cosmetics:operator`. 서버 가드는 기존 서비스 scope guard(membership 확인 포함 — F11).
- `platform:super_admin` 은 정정 권한(governance override).
- 매장 경영자 · 공급자 · 구매자는 기록 권한 없음(조회만).
- 새 역할을 만들지 않는다(RBAC F9 §4 절차 회피). 기존 역할로 부족하면 중지.

### C.2 데이터 (P5 — 실제 완료와 기록 입력의 구분)

권고: 별도 원장 **`order_refund_records`**(append-only).

| 컬럼 | 의미 |
|---|---|
| `id` | |
| `checkout_order_id` · `payment_group_id`(선택) · `service_key` | 대상 |
| `refund_status` | `completed`(실제 환불 완료 확인) · `partial`(부분) · `declined`(환불하지 않기로 함) |
| `refunded_amount` · `currency` | 실제 환불 금액(오프라인 확정값) |
| `refund_method` | 계좌이체 · PG 콘솔 취소 · 현금 · 기타 |
| `refunded_at` | **실제 환불 완료 시각**(당사자 처리 시각) |
| `evidence_type` · `evidence_ref` · `evidence_note` | 근거(이체 확인 · PG 콘솔 취소 번호 · 합의서 등) |
| `tax_invoice_action` · `tax_invoice_ref` | 세금계산서 처리 결과(수정 발행 · 취소 · 해당 없음) — **기록만**(P4) |
| `recorded_by` · `recorded_at` | **O4O 기록 입력자 · 입력 시각** |
| `supersedes_id` · `correction_reason` | 정정 이력(원 행 수정 금지, 정정은 새 행) |

- 기존 컬럼(`checkout_orders.refundedAt` · `paymentStatus='refunded'` 등)을 쓰는 방식(대안)은 "실제 완료 vs 기록 입력" · 정정 이력을 담지 못하므로 권고하지 않는다. 주문 상태 표시는 원장의 최신 유효 행에서 **읽어서** 보여준다.
- 테이블 신설 = DB schema/migration **중지 조건** → 실행 시 스키마안 승인 후 진행. (펀딩 선례처럼 새 컬럼 없이 `action_logs` + `metadata` 로 가는 축소안도 CHECK 에 비교 제시)

### C.3 동작 규칙

- 결제 완료(`paymentStatus='paid'`) 주문에만 기록 가능. 결제 전 주문은 기존 "주문 취소"(2.4)로만 처리(P7).
- 기록은 **재고 · 정산 · 알림 · 세금계산서 · PG 를 호출하지 않는다**(P2 · P6). 정산 대상 제외 여부는 **정산 담당자가 별도로** 판단(자동 연동 금지).
- 공급자 측 주문(`neture_orders`) 상태는 자동으로 바꾸지 않는다. 필요 시 공급자/운영자가 기존 경로로 별도 처리.
- 화면: 주문 상세에 "환불 기록" 섹션(기록 목록 · 정정 이력 · 실제 완료 시각과 기록 시각을 나란히 표시). 구매자 · 공급자 화면에는 확정 기록만 읽기 전용 노출 여부를 결정.

## D. 문서 정합 (같은 WO 안의 별도 단계 — 기준 문서는 인라인 수정 금지 §16-4)

| 문서 | 조치 |
|---|---|
| [`O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1`](../baseline/O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1.md) §6 취소표(:246-253) · :255 | **직접 충돌**. "결제 후 · 공급자 접수 전 = `POST /store-owner/payments/:paymentGroupId/cancel` 그룹 전체" 를 "결제 후 환불 = 오프라인 처리 + 운영자 수기 기록" 으로 개정. 결제 전 취소 행은 유지. 개정본은 사용자 승인 후 반영 |
| `docs/checks/CHECK-PHARMACY-HUB-PAYMENT-AND-SUPPLIER-FULFILLMENT-V1.md` §8(:161-172) · :18 · :194 | 기록물 — 본문 보존, 섹션 제목 아래 "대체됨" 인용 한 줄(`CHECK-O4O-MY-STORE-FINAL-COMMONIZATION-AUDIT-AND-CLOSURE-V1.md:72` 선례) |
| [`RBAC-CANONICAL-STATE-V1`](../rbac/RBAC-CANONICAL-STATE-V1.md) :243-267 환불 3축 | 관련 · 부분 충돌(환불 **실행** 권한 기술). "환불 결과 기록 권한"으로 개정 — **F9 동결 → 사용자 승인** |
| `docs/architecture/DROPSHIPPING-STATE-MODEL.md` · `DROPSHIPPING-SETTLEMENT-MODEL.md` · `DROPSHIPPING-ORDER-RELAY.md` | 충돌(환불 시 역정산 자동 생성 · Payment Core 환불 실행). 현행 여부 판정 후 SUPERSEDED 표기 또는 개정 — 판단 불가면 보고만(§16-6) |
| `docs/checks/CHECK-O4O-SUPPLIER-SETTLEMENT-READINESS-GUARD-V1.md:68` 후속 `WO-O4O-SUPPLIER-SETTLEMENT-REFUND-ADJUSTMENT-V1` | 이 정책으로 대체됨을 CHECK 에 기록 |
| `CLAUDE.md` Source of Truth 표 · `docs/CANONICAL-INDEX.md` | 새 정책의 정본 위치(이 WO 또는 별도 baseline) 등재 — 행 변경은 인라인 금지 → 사용자 승인 후 |
| `CHECK-O4O-URL-FIRST-CENSUS-V1` §14 | **이 WO 커밋과 함께 "대체됨" 표시 완료**(아래 §7) |

---

# 4. 하지 않는 것 / 불변식

- PG 취소 · 환불을 자동 실행하는 새 경로를 만들지 않는다(운영자 버튼 포함).
- 환불 기록으로 재고 · 정산 · 알림 · 세금계산서를 자동 처리하지 않는다.
- 세금계산서 발행 연동을 만들지 않는다(결과 기록만).
- 결제 전 취소(2.4)의 기존 동작 · 이벤트 특가 재고 복원을 바꾸지 않는다.
- 기존 원장 행을 삭제 · 소급 수정하지 않는다(정정은 새 행).
- `PaymentCoreService` · Toss 어댑터 · `toss-payments.service.ts` 를 이번 WO 에서 삭제하지 않는다.
- 운영 DB 쓰기 · 배포 게이트(`DEPLOY_ENABLED`) 변경 · 배포는 이 WO 의 문서 작성 단계에서 하지 않는다. 실행 단계에서도 각각 별도 승인.

---

# 5. 실행 순서 (실행 착수 지시 후)

1. G0: 최신 `origin/main` · 배포 게이트 상태 · 레거시 `checkout_payments` 행 수 · R-A1~A3 최근 호출 로그(read-only). — **1차 재확인 완료 §10-1**, 실행 착수 시점에 다시 확인.
2. **D 단계 기준 문서 개정을 코드 변경보다 먼저 확정**한다(§10-4 개정안) → 사용자 승인 → 기준 문서 반영 커밋. **이 단계가 끝나기 전에는 3~5 코드 단계를 시작하지 않는다**(구현자가 상충하는 정본을 받지 않도록).
3. A: 세 경로 410 은퇴 + 소스 계약 테스트.
4. B: R1 결제 확정 상태 검사 + 테스트.
5. C: 스키마안 승인 → migration(CI/CD 자동 실행 원칙) · 운영자 API · 화면 · 테스트.
6. CHECK 작성 → path-specific commit → push.
7. 배포는 별도 통제 창(사용자 승인).

---

# 6. 중지 조건

- A. 사용 중지 대상 경로에 최근 실제 호출 · 미처리 환불 건이 있음.
- B. 새 테이블 · 컬럼 등 DB schema 변경(C.2) — 스키마안 승인 전.
- C. 라우트 은퇴(410) · 응답 계약 변경 — API contract 변경.
- D. 기준 문서(B2B 계약 · RBAC F9 · CANONICAL-INDEX · CLAUDE.md) 개정.
- E. 세금계산서 처리에 관한 세법 해석이 필요해짐.
- F. 기존 역할로 기록 권한을 표현할 수 없음(새 역할 필요).
- G. 현재 변경과 무관한 build · test 실패.
- H. 다른 세션의 dirty · 미추적 파일 접촉 필요.

---

# 7. 검증 기준

| # | 기준 |
|---|---|
| V1 | R-A1 · R-A2 · R-A3 호출 시 410 · PG 어댑터 미호출(테스트에서 PG mock 호출 0) |
| V2 | 소스 계약: 서버 코드에서 `PaymentCoreService.refund` · `cancelPayment` 의 **신규 호출처 0**(허용 목록 외 호출 시 테스트 실패) |
| V3 | R1: 취소된 주문을 포함한 그룹/단건 confirm → PG 승인 전 거부. PH · B2B factory · Neture B2B 3곳 |
| V4 | 결제 전 취소 회귀: 기존 테스트(`b2b-supplier-to-store-order-canonical-contract.spec.ts` · 이벤트 특가 재고 복원) 유지 |
| V5 | 환불 기록: 운영자만 작성 · 매장/공급자/구매자 403 · 결제 전 주문 기록 거부 · 정정은 새 행 · 원 행 불변 |
| V6 | 환불 기록 후 재고 · `neture_orders` · 정산 · 알림 · 세금계산서 관련 테이블 **변화 0**(테스트 스냅샷) |
| V7 | 화면: 실제 환불 완료 시각과 O4O 기록 시각이 분리 표시 · 정정 이력 조회 |
| V8a | **격리 환경**(§10-3): 테스트 주문으로 환불 기록 작성 · 정정, 결제-주문 불일치 표시, 동시성 시나리오 |
| V8b | **운영 환경**(배포 후): 세 경로 410 응답 확인 + 기존 데이터 **읽기 전용** 대조만. 운영에서 테스트 주문 생성 · 기록 작성 · 정정 **금지** |

---

# 8. 완료 보고 (CHECK 필수 항목)

- commit hash · `HEAD == origin/main` · 이번 WO 범위 미커밋 변경 0
- 중지 조건 발동 여부와 사용자 판단 결과
- 검증 V1~V8 결과(미실시 항목은 사유)
- `문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건`

---

# 9. 기존 문서 규칙과의 충돌 (작성 시점 명시)

| 충돌 | 내용 | 처리 |
|---|---|---|
| 사용자 이전 지시 | 2026-09-25 "초안은 저장소에 WO 파일로 커밋하지 마세요, 작업지시는 대화 화면에서 전달" | 이후 사용자가 **이 WO 를 저장소에 작성 · 커밋 · push 하라고 명시**(최신 지시 우선). 이 WO 한 건에 한정 |
| B2B 계약 baseline §6 | 결제 후 · 접수 전 PG 그룹 환불을 현행 계약으로 규정 | 이 WO 정책이 대체. baseline 개정은 §3-D 단계(인라인 수정 금지 §16-4) — **개정 전까지 baseline 문구와 이 WO 정책이 공존**하므로, 실행 단계에서는 이 WO 를 우선하되 개정을 완료 조건에 포함 |
| RBAC F9 | 환불 실행 권한 3축 기술 | 기록 권한으로 개정 필요 — 동결 문서, 승인 필요 |
| CHECK 기록물 규칙(§16-1) | `checks/` 는 정비 대상 아님 · 파일 단위 SUPERSEDED 헤더는 기준 문서 전용 | CHECK 는 본문 보존 + 섹션 아래 "대체됨" 인용 한 줄(하우스 선례)로만 표시 |
| CLAUDE.md 중지 조건 | 결제 · 정산 판단 / DB schema / API contract / Frozen 변경 | 정책 판단은 사용자 확정으로 해소. 나머지는 §6 에 그대로 유지 |
| COMMERCE-BOUNDARY §15 | 소비자 commerce 모델 변경 절차 | **해당 없음** — 이 WO 는 자동화를 줄이는 방향이며 소비자 commerce 를 도입하지 않음 |

---

# 10. 실행 전 보완 (2026-09-25 · G0 재확인 · 변경안 · 검증 계획)

사용자 보완 지시 3건: ① R1 은 동시 진행까지 검증하고 PG 승인 후 불일치는 자동 환불 없이 운영자 확인 대상으로 ② V8 테스트 주문 작성 · 정정은 격리 환경에서만, 운영은 410 · 읽기 전용 확인만 ③ 기준 문서 충돌을 코드 변경 전에 해소. 아래는 이를 반영한 변경안이며, **410 전환 · 수작업 기록 기능의 코드 실행 범위는 사용자 개방 전까지 닫혀 있다.**

## 10-1. G0 운영 재확인 (read-only, 2026-09-25)

| 항목 | 방법 | 결과 |
|---|---|---|
| 세 환불 API 호출 | Cloud Logging `o4o-core-api` 요청 로그, URL 정규식 `refund` 또는 `/store-owner/payments/{id}/cancel` | **0건** — 조회 가능 구간 **2026-08-26 ~ 2026-09-25**(`_Default` 버킷 보존 30일). 동일 구간 요청 로그 존재 확인(빈 저장소 아님). 30일 이전은 로그 없음 → 미확인 |
| 레거시 `checkout_payments` | 운영 DB 집계 | **1행 · `pending` · `paymentKey` 없음** · SUCCESS 0 → R-A2 · R-A3 은 현재 데이터로 **실행 불가**(필요 조건 불충족) |
| `o4o_payments` | 〃 | 13행 전부 `CREATED`(neture-b2b 2 · pharmacy-hub 6 · store-service-subscription 5) · **PAID 0 · REFUNDED 0** |
| `checkout_orders` 환불 상태 | 〃 | `paymentStatus='refunded'` **0** · `refundedAt` 설정 0 · 취소 20건 전부 결제 전(`pending`) |
| B1 노출(원장만 환불) | 〃 | **0** |
| R1 노출(취소 주문 + PAID 결제) | 〃 | **0** |
| `neture_orders` 취소/환불 · `checkout_order_logs` 환불/취소 액션 | 〃 | 0 · 0 |
| 추가 발견 | 코드 | RBAC 문서의 `STORE_OWNER_REFUND` 대표 경로 `PATCH /api/v1/kpa/checkout/store-orders/:orderId/status` 는 **이미 제거됨**(`kpa-checkout.controller.ts:278-293`, 소비자 commerce 은퇴) — 문서 stale |

**판정**: 세 경로 모두 최근 30일 사용 0 · 자동 환불로 처리된 거래 0 · 결함으로 인한 기존 피해 0. 사용 중지(A)의 중지 조건 A("최근 실제 호출 · 미처리 환불 건")는 **현재 발동하지 않는다.**

## 10-2. R1 — 동시 진행을 포함한 설계

### 현재 경쟁 조건 (코드 확인)

- 결제 전 취소: 상태를 **읽어서 검사한 뒤** 무조건 `UPDATE checkout_orders SET status='cancelled' ... WHERE id = $1`(`store-order-cancel.service.ts`, PH `cancelBeforePayment`) — 검사와 쓰기 사이가 열려 있다.
- 결제 완료 핸들러: 주문 엔티티를 읽고 `created|pending_payment` 이면 `PAID` 로 **저장**(PH · Store B2B · Neture 핸들러) — 역시 읽기-쓰기 분리.
- 결제 확정(confirm)은 주문 상태를 보지 않고 PG 승인을 호출(§2.3 R1). `PaymentCoreService.confirm` 은 결제행만 `CREATED → CONFIRMING` 조건부 전이로 보호.
- 따라서 두 방향 모두 가능: (a) 취소 후 결제 완료 → PG 결제 · 주문 취소 (b) 결제 완료 전이 직후 취소가 덮어씀 → 결제됐는데 주문 취소.

### 설계 — 주문 상태의 원자적 전이로 직렬화

| 단계 | 변경 |
|---|---|
| confirm 진입 | PG 승인 **전에** 대상 주문 전부를 `UPDATE checkout_orders SET status='pending_payment' WHERE id = ANY($ids) AND status='created' AND "paymentStatus"='pending' RETURNING id` 로 선점. 반환 행 수 ≠ 대상 수 → **PG 호출 없이 409**(`ORDER_NOT_PAYABLE`) 하고 방금 선점한 행은 `created` 로 되돌림 |
| PG 승인 실패 | 선점 행을 `pending_payment → created` 로 조건부 복귀 |
| 결제 전 취소 | `UPDATE ... SET status='cancelled' WHERE id=$1 AND status='created' AND "paymentStatus"='pending' RETURNING` — 0행이면 재조회 후 `pending_payment` 는 **409 `PAYMENT_IN_PROGRESS`**, `paid` 는 409 `ALREADY_PAID` |
| 결제 완료 핸들러 | `UPDATE ... SET status='paid', "paymentStatus"='paid' WHERE id=$1 AND status IN ('created','pending_payment') RETURNING` — 0행이고 현재 `cancelled` 이면 **불일치 기록**(아래) |
| 방치된 `pending_payment` | confirm 도중 프로세스 중단 시 잔존 가능 → 운영자 확인 목록에 노출(자동 복귀 여부는 결정 필요: 일정 시간 후 `created` 복귀 vs 운영자 수동) |

- 사실: `pending_payment` 는 enum 에 있으나 **현재 이 상태를 기록하는 코드가 없다**(읽기만: 핸들러 · factory `isPayableState` · Neture 운영 대시보드 `pending` 집계 `operator-dashboard.controller.ts:335`). 따라서 "결제 확정 진행 중" 선점 상태로 쓸 수 있다. 단 결제 전 취소 허용 상태가 현재 `created`·`pending_payment` 둘 다이므로(`store-order-cancel.service.ts:40`, PH `PAYABLE_STATUSES` :40) "결제 진행 중 취소 불가"로 바뀐다 — **API 동작 계약 변경 → 승인 대상**. 운영 대시보드 `pending` 집계 의미도 함께 확인.
- 세 결제 경로(PH · Store B2B factory · Neture B2B)에 같은 규칙을 공용 헬퍼로 적용.

### PG 승인 뒤 불일치 — 자동 환불 금지, 운영자 확인 대상

- 조건: 결제 `PAID` 인데 주문이 `cancelled`(또는 그룹 일부만 전이).
- 처리: 주문 · 결제 원장을 **바꾸지 않는다**. `checkout_orders.metadata.paymentOrderMismatch = { paymentId, detectedAt, detectedBy:'payment-handler' }` 표시 + `action_logs` 기록.
- 운영자 화면: 서비스 운영자용 "결제-주문 불일치" 조회 목록(읽기 전용). 해소는 거래 당사자 오프라인 환불 후 §3-C 수작업 기록으로 한다(표시는 기록이 생기면 해소로 간주).
- PG 취소 API 는 호출하지 않는다(정책 P2).

## 10-3. 검증 환경 분리 (V8)

| 환경 | 허용 | 방법 |
|---|---|---|
| **격리** | 테스트 주문 생성 · 결제 흉내 · 환불 기록 작성/정정 · 불일치 표시 · 동시성 시나리오 | 로컬 PostgreSQL 15 컨테이너 + `scripts/db/build-canonical-schema-baseline.mjs` 스키마 부트스트랩 + 수동 시드(사용자 · 조직 · enrollment · 주문) + PG 어댑터 mock. **로컬 `apps/api-server/.env` 는 운영 DB 프록시를 가리키므로 격리 검증에는 별도 env 를 쓴다**(운영 DB 연결 금지 확인을 검증 첫 단계로) |
| **운영** | 세 경로 410 응답 확인(요청은 상태를 바꾸지 않음) · 기존 데이터 읽기 전용 대조(§10-1 쿼리 재실행 결과 불변) | curl(인증 쿠키) · Cloud SQL proxy read-only 세션 |
| 운영 금지 | 테스트 주문 생성 · 환불 기록 작성/정정 · 결제 시도 | — |

## 10-4. 기준 문서 개정안 (코드 변경 전 확정 대상)

### (1) `O4O-B2B-SUPPLIER-TO-STORE-ORDER-CONTRACT-V1` §6 취소 계약

현행(:246-253) → 개정안:

```text
**취소 · 환불 계약 (Axis C 기준)**

| 시점 | 경로 | 범위 |
|---|---|---|
| 결제 전 | `POST /store-owner/orders/:orderId/cancel` | 단건 (O4O 가 주문 상태 전이 · 돈 이동 없음) |
| 결제 진행 중 (`pending_payment`) | 취소 불가 — 409 `PAYMENT_IN_PROGRESS` | — |
| 결제 후 | **O4O 환불 실행 경로 없음.** 환불 여부 · 금액 · 방법은 거래 당사자가 오프라인에서 결정 · 처리하고, 서비스 운영자가 확인된 결과를 수작업으로 기록한다 (WO-O4O-OFFLINE-REFUND-MANUAL-RECORD-ONLY-V1) | 기록 단위: 주문 |
| (은퇴) | `POST /store-owner/payments/:paymentGroupId/cancel` | 410 RETIRED |

불변식 R0. O4O 는 PG 취소 · 환불을 실행하지 않는다. 환불 기록은 재고 · 정산 · 알림 · 세금계산서를 자동 처리하지 않는다.
```

불변식 L0(:255) 보완: "주문 취소는 write 다 — **결제 전 취소에 한해** `checkout_orders` 상태를 바꾸고 이벤트오퍼 예약 재고를 되돌린다. 결제 후 환불 기록은 재고를 바꾸지 않는다."

### (2) `RBAC-CANONICAL-STATE-V1` "환불 authorization 계약"(:243-267, F9)

개정안:

```text
### 환불 기록 authorization 계약

O4O 는 환불을 실행하지 않는다(WO-O4O-OFFLINE-REFUND-MANUAL-RECORD-ONLY-V1).
환불 관련 권한은 "확인된 결과를 기록하는 권한" 하나이며, 주체는 거래가 속한 서비스의 운영자다.

| 축 | 주체 | 판정 조건 | 대표 경로 |
|----|------|----------|-----------|
| `SERVICE_OPERATOR_REFUND_RECORD` | 서비스 운영자 | active membership + `{service}:operator` | (신설) 주문 환불 기록 작성 · 정정 |
| `PLATFORM_REFUND_RECORD_OVERRIDE` | 플랫폼 관리자 | `platform:super_admin` | 기록 정정(governance) |
| (기존 선례) 펀딩 참가자 결제 상태 | 서비스 운영자 | `neture:operator` | `PATCH /api/v1/neture/operator/market-trial/:id/participants/:pid/payment-status` |

은퇴: `POST /api/checkout/refund` · `POST /api/admin/orders/:id/refund` · `POST /store-owner/payments/:paymentGroupId/cancel` (410).
제거 완료(문서 정정): `PATCH /api/v1/kpa/checkout/store-orders/:orderId/status` (소비자 commerce 은퇴).
구매자 축은 결제 전 취소 권한만 가진다.
```

- 같은 문서 :242-244 행(`/api/checkout/refund` super_admin 전용)도 은퇴로 정정.
- 축 이름은 새 **역할**이 아니라 기존 역할의 판정 규칙 이름이다(F9 §4 새 역할 절차 불요). F9 문서 본문 수정 자체는 동결 대상이므로 **승인 필요**.

### (3) 부수 기록물 · 문서

| 문서 | 조치 |
|---|---|
| `CHECK-PHARMACY-HUB-PAYMENT-AND-SUPPLIER-FULFILLMENT-V1` §8 · :18 · :194 | 섹션 아래 "대체됨" 인용 한 줄(본문 보존) |
| `DROPSHIPPING-STATE-MODEL` · `DROPSHIPPING-SETTLEMENT-MODEL` · `DROPSHIPPING-ORDER-RELAY` | 현행 여부 판정 → 현행이면 환불 자동 역정산 절 개정, 레거시면 SUPERSEDED 표기, 판단 불가면 보고만 |
| `CHECK-O4O-SUPPLIER-SETTLEMENT-READINESS-GUARD-V1` :68 후속 WO | 대체됨 기록 |
| `CANONICAL-INDEX` · `CLAUDE.md` SoT 표 | 새 정책 정본 위치 등재(행 변경 = 승인) |

**순서**: (1)(2) 개정안 승인 → 반영 커밋 → (3) → 그다음 코드 단계. (1)(2) 반영 전에는 410 · 기록 기능 코드를 시작하지 않는다.

## 10-5. 코드 변경안 (파일 단위, 실행 개방 후)

| 묶음 | 파일 | 변경 |
|---|---|---|
| A 410 | `routes/pharmacy-hub/pharmacy-hub.routes.ts:527-531` | `cancelAfterPayment` 라우트 → 410 스텁(`kpa-payment.controller.ts` 선례 형식) |
| A 410 | `routes/checkout.routes.ts:22` · `routes/admin-orders.routes.ts:37` | 환불 라우트 → 410 |
| A 테스트 | 신규 spec | 세 경로 410 · PG mock 호출 0 · `PaymentCoreService.refund` / `cancelPayment` 호출처 허용목록(0) 소스 계약. 기존 `checkout-refund-authorization-canonical-role.spec.ts` 는 410 계약으로 갱신 |
| B R1 | `services/checkout/store-order-cancel.service.ts` · `PharmacyHubPaymentController.ts`(prepare/confirm/cancelBeforePayment) · `services/payment/b2b/b2b-payment-controller.factory.ts` · `routes/neture/controllers/neture-b2b-payment.controller.ts` · 결제 완료 핸들러 3종 | §10-2 조건부 전이 · 선점 · 불일치 표시. 공용 헬퍼 1개 |
| B 운영자 조회 | 서비스별 운영자 라우트 | 불일치 목록(읽기 전용) |
| C 기록 | 신규 migration(`order_refund_records`) · 서비스 · 운영자 API(작성 · 정정 · 조회) · 운영자 화면(주문 상세 섹션) | §3-C. 재고 · 정산 · 알림 · 세금계산서 · PG 호출 0 |
| 비대상 | `PaymentCoreService` · Toss 어댑터 · `toss-payments.service.ts` | 삭제하지 않음 |

## 10-6. 검증 계획

| # | 대상 | 방법 | 환경 | 통과 기준 |
|---|---|---|---|---|
| T1 | 410 | 단위/계약 테스트 | CI | 세 경로 410 · PG mock 0회 |
| T2 | 호출처 계약 | 소스 스캔 테스트 | CI | refund/cancel PG 호출처 허용목록 외 0 |
| T3 | R1 순서 시나리오 | 결정적 인터리빙 테스트(취소→confirm, confirm 선점→취소, 핸들러 전이→취소, 취소→핸들러) | CI(모킹) + 격리 DB | 모든 순서에서 "PAID 결제 + 취소 주문"이 **불일치 표시 없이** 생기지 않음 · 결제된 주문이 취소로 덮이지 않음 |
| T4 | R1 실제 동시성 | 격리 PG 에서 `Promise.all`(취소 · confirm · 핸들러) 반복 N회 | 격리 DB | T3 불변식 위반 0 |
| T5 | 불일치 처리 | 강제 불일치 주입 | 격리 DB | 원장 불변 · metadata 표시 · action_logs 1건 · PG 취소 호출 0 |
| T6 | 결제 전 취소 회귀 | 기존 spec + 이벤트 특가 재고 복원 | CI · 격리 | 기존과 동일 |
| T7 | 환불 기록 권한 | API 테스트 | CI · 격리 | 운영자만 작성 · 매장/공급자/구매자 403 · 결제 전 주문 거부 |
| T8 | 기록 무부작용 | 기록 전후 스냅샷(재고 · `neture_orders` · 정산 · 알림 · 세금계산서 관련 테이블) | 격리 DB | 변화 0 |
| T9 | 정정 이력 | 정정 2회 | 격리 DB | 원 행 불변 · 새 행 체인 · 화면에 실제 완료 시각 / 기록 시각 분리 |
| T10 | 운영 확인 | 배포 후 세 경로 410 · §10-1 쿼리 재실행 결과 불변 | 운영(read-only) | 410 · 데이터 변화 0 |

## 10-7. 사용자 승인이 필요한 결정 (실행 개방 전)

1. §10-4 (1) B2B 계약 · (2) RBAC 개정안 승인.
2. R1: "결제 진행 중(`pending_payment`) 취소 불가" 동작 계약 변경 승인 · 방치된 `pending_payment` 처리 방식(자동 복귀 시간 vs 운영자 수동).
3. C: `order_refund_records` 신설 vs `action_logs`+metadata 축소안.
4. 격리 검증 환경 구성(로컬 컨테이너 · 별도 env) 승인.
