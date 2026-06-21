# CHECK — 매장 소비자 결제 O4O 제외 cleanup 사전 조사 V1

**조사:** `IR-O4O-STORE-SALE-PAYMENT-EXCLUSION-CLEANUP-AUDIT-V1`
**일자:** 2026-06-21
**성격:** read-only audit — 코드/DB/migration/route/API/UI **무변경**. 본 문서 1개만 산출.
**상위:** `IR-O4O-TOSS-PAYMENT-SCOPE-REVISION-STORE-SUBSCRIPTION-AND-B2B-V1` · `IR-O4O-PAYMENT-SCOPE-STORE-SALE-VS-SERVICE-SUBSCRIPTION-AUDIT-V1`

---

## 0. 요약 판정 (서비스별 등급)

| 서비스 | 고객 checkout→O4O Toss | 등급 | 근거 |
|---|---|:--:|---|
| **KPA** | **실제 도달 가능** | **C** | 공개 storefront `/store/:slug/checkout` → CheckoutPage → createOrder → prepare → `loadTossPayments`/`requestPayment` → 위젯 → success/fail. **단 프로덕션 로그 72h 무활동(실사용 흔적 없음)** |
| **GlycoPharm** | API만, UI 미노출 | **A** | payment 컨트롤러 mount(`/payments`)되나 **고객 checkout/Toss 프론트 consumer 0건** |
| **K-Cosmetics** | API만, UI 미노출 | **A** | 동일 — payment 컨트롤러 mount, 프론트 consumer 0건 |
| **Neture B2B** | B2B_ORDER (무관) | **E** | `neture-b2b-payment`(metadata.source='neture_b2b_checkout') — cleanup 대상 아님, 유지 |
| 데이터 | 최근 운영 결제 | **D 비활성** | KPA payment 로그 72h 0건. 테이블 직접 count 미수행(방화벽) → cleanup WO 에서 gcloud sql 선확인 권장 |

## 1. git 상태 / 다른 세션 WIP

- `git status --short`: `services/mobile-app/*`(M) + `docs/.../CHECK-O4O-MOBILE-AUTH-SESSION-EXPIRY-HANDLING-V1.md`(??) — 다른 세션 WIP(mobile auth), 결제 무관. **미접촉.**
- 본 조사 변경 0(코드/DB/route/API/UI).

## 2. 백엔드 — 고객 checkout → PaymentCore/Toss 연결 (실측)

| 서비스 | 컨트롤러 | mount | 결제 대상 | 식별 |
|---|---|---|---|---|
| KPA | `routes/kpa/controllers/kpa-payment.controller.ts` (`WO-O4O-KPA-CUSTOMER-COMMERCE-LOOP-V1`) | `/api/v1/kpa/payments` (kpa.routes:2462) | `CheckoutOrder`(buyerId=고객) | sourceService='kpa', paymentType/metadata.source 없음 |
| GlycoPharm | `glycopharm-payment.controller.ts` | `/api/v1/glycopharm/payments` (glyco.routes:178) | `CheckoutOrder` | sourceService='glycopharm' |
| K-Cosmetics | `cosmetics-payment.controller.ts` | `/api/v1/cosmetics/payments` (cosmetics.routes:118) | `CheckoutOrder` | sourceService='cosmetics' |
| Neture B2B | `neture-b2b-payment.controller.ts` | `/api/v1/neture/...` | B2B checkout_order(metadata.source='neture_b2b_checkout') | **B2B_ORDER — 무관** |

- 3 컨트롤러 모두 `POST /payments/prepare`(주문 조회→PaymentCore.prepare) + `POST /payments/confirm`(PaymentCore.confirm→Toss 승인) + `GET /payments/order/:orderId`. 전부 requireAuth(buyerId 매칭).
- **STORE_SALE_PAYMENT 식별자 부재**: paymentType 컬럼 없음, sourceService(=서비스명)로만 구분. neture-b2b 만 metadata.source 로 B2B 구분. → 고객 결제와 B2B 는 **컨트롤러/sourceService 단위로 분리**되어 있음(섞이지 않음).

## 3. 프론트 — 고객 결제 도달성 (실측)

**Toss 위젯/prepare 호출 프론트 consumer = KPA storefront + Neture B2B 뿐** (grep `payments/prepare|tosspayments|loadTossPayments|requestPayment|paymentKey`).

### 3.1 KPA (등급 C — 도달 가능)
- 라우트(공개): `/store/:slug`(StorefrontHome) · `/store/:slug/products/:id` · **`/store/:slug/checkout`(CheckoutPage)** · `/store/:slug/payment/success` · `/payment/fail`. (App.tsx:1011-1015, guard 없음)
- `CheckoutPage.tsx`: cart(`cartService.getCart(slug)`) → `POST /api/v1/kpa/checkout`(createOrder) → `POST /api/v1/kpa/payments/prepare` → `import('@tosspayments/payment-sdk')` `loadTossPayments(clientKey)` → `requestPayment('카드', {amount, orderId, successUrl, failUrl})`. **결제 버튼 "N원 결제하기"(로그인 시 활성)**.
- → **소비자가 매장 storefront 에서 상품→장바구니→checkout→Toss 결제까지 완전 도달 가능.**

### 3.2 GlycoPharm / K-Cosmetics (등급 A — UI 미노출)
- payment 컨트롤러는 mount 되어 있으나, **storefront CheckoutPage / Toss 위젯 / payments/prepare 호출 프론트 = 0건.**
- App.tsx 에 `/checkout`·`/payment/success|fail` 고객 라우트 부재(GlycoPharm 은 주석상 consumer storefront `/store/:pharmacyId` 언급만, checkout 라우트 없음).
- → API 는 존재하나 **고객이 도달할 UI 진입점 없음.**

## 4. 운영 데이터 / 사용 흔적

- **KPA payment 로그(`[KPA Payment] Payment prepared/confirmed`) = 최근 72h 0건** (gcloud logging). → 최근 실제 고객 결제 활동 없음.
- `checkout_orders`/`o4o_payments` 테이블 직접 row count 는 **프로덕션 방화벽(psql 미설치)으로 미수행**. 상위 `IR-...-SCHEMA-CONTRACT-AUDIT` 정황(이전 positive 결제 smoke 성공 이력 부재)과 합쳐 **실 운영 결제 데이터는 최소/없을 가능성 높음**. → cleanup WO 에서 `gcloud sql` read-only count 선확인 권장(데이터 변경 금지).

## 5. Neture B2B 경계 (등급 E)

- `neture-b2b-payment`(B2B_ORDER, sourceService='neture-b2b', metadata.source='neture_b2b_checkout') 는 `STORE_SERVICE_SUBSCRIPTION`/`B2B_ORDER` 축으로 **유지 대상**. 고객 checkout cleanup 과 **컨트롤러·sourceService·metadata 로 분리**되어 있어 cleanup 시 오접촉 위험 낮음.

## 6. 권장 cleanup 방식 (등급별 — 후속 WO 에서 수행)

| 서비스 | 등급 | 권장 방식 | 비고 |
|---|:--:|---|---|
| **KPA** | C | **8.1 UI 진입점 제거 우선** — `/store/:slug/checkout`·`/payment/success`·`/fail` 라우트 + CheckoutPage + cart→checkout 진입 비활성화/제거 + "매장 현장(POS) 결제 안내" 처리. 이후 **8.2 API deprecation**(`/kpa/payments/prepare|confirm` 410/403) | 로그 무활동 → 운영 영향 낮음. 단 데이터 보존(§4) 선확인 |
| **GlycoPharm** | A | **8.2 API deprecation** — `/glycopharm/payments/prepare|confirm` 410/403. UI 제거 불요(부재) | |
| **K-Cosmetics** | A | **8.2 API deprecation** — `/cosmetics/payments/prepare|confirm` 410/403 | |
| Neture B2B | E | 변경 없음 | |

- 공통: **즉시 삭제 금지.** prepare/confirm **신규 생성만 차단**(410/403), `GET /payments/order/:orderId`(기존 조회)는 데이터 보존 위해 유지 검토. checkout_orders/o4o_payments/PaymentCore/Toss adapter **삭제 금지**.

## 7. 판정 등급 종합 (§7)

```text
A. route/API만 남고 UI 미노출  → GlycoPharm, K-Cosmetics
B. UI 있으나 결제 미도달        → 해당 없음
C. 실제 결제 도달 가능          → KPA
D. 실제 운영 데이터 존재        → 미확정(로그 72h 0건; 테이블 count 미수행) → cleanup 전 gcloud sql 확인
E. Neture B2B 무관             → neture-b2b-payment (유지)
```

## 8. 후속 WO 제안

```text
1. WO-O4O-STORE-SALE-CHECKOUT-UI-ENTRY-REMOVAL-V1   (KPA 등급 C — storefront checkout UI/route 제거·안내)
2. WO-O4O-STORE-SALE-CHECKOUT-ROUTE-DEPRECATION-V1  (KPA/Glyco/KCos payments prepare/confirm 410·403)
3. WO-O4O-STORE-SALE-PAYMENT-DATA-RETENTION-POLICY-V1 (gcloud sql count → 데이터 존재 시 보존 정책)
   - 데이터 없음 확인되면 생략 가능
→ 이후 WO-O4O-STORE-SERVICE-SUBSCRIPTION-TOSS-PAYMENT-V1
```

> 권장 순서: **데이터 read-only 확인(§4) → KPA UI 제거(1) → 3서비스 API deprecation(2)**. 데이터 존재 시 (3) 선행.

## 9. 완료 기준 대비 (§11)

| 기준 | 결과 |
|---|---|
| KPA/Glyco/KCos 고객 checkout 노출·사용 확인 | ✅ KPA=도달가능(로그 무활동) / Glyco·KCos=UI 미노출 |
| 프론트 UI 진입점 존재 여부 | ✅ KPA만 storefront checkout 존재 |
| prepare/confirm 호출 여부 | ✅ KPA CheckoutPage 만 호출 |
| Toss widget 도달 여부 | ✅ KPA만 loadTossPayments/requestPayment |
| checkout_orders/o4o_payments 보존 필요성 | ⚠️ 로그 무활동·테이블 count 미수행 → cleanup 전 확인 |
| Neture B2B 분리 | ✅ 등급 E, 무관 |
| 후속 cleanup 방식 제안 | ✅ §6·§8 |
| 코드/DB/API/UI 무변경 | ✅ |

## 10. 무변경 확인

- 코드/route/API/UI/DB **무변경**. 데이터 수정/삭제/상태변경/결제 재시도 **없음**. 신규 파일 0(본 CHECK 제외).
- 다른 세션 WIP(`services/mobile-app/*`) 미접촉.

---

*Date: 2026-06-21 · read-only audit · 코드/데이터 무변경 · KPA=등급 C(공개 storefront checkout→Toss 도달가능, 로그 72h 무활동) · Glyco/KCos=등급 A(payment API mount, UI 미노출) · Neture B2B=등급 E(무관) · 데이터=로그 무활동·table count 미수행(cleanup 전 gcloud sql 확인) · 권장: KPA UI 제거 → 3서비스 API deprecation, 즉시삭제·데이터삭제 금지.*
