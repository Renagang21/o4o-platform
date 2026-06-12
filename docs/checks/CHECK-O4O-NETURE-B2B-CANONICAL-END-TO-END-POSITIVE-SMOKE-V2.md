# CHECK-O4O-NETURE-B2B-CANONICAL-END-TO-END-POSITIVE-SMOKE-V2

> `o4o_payments` production 적용 후 Neture B2B canonical buyer flow 재검증(positive smoke).
> **결과: PASS (prepare 까지 실데이터 성공 — V1 blocker 해소). Toss 결제 완료~bridge~supplier 노출은 interactive Toss sandbox 부재로 DEFERRED.**
> 상위: `CHECK-O4O-NETURE-B2B-CANONICAL-END-TO-END-POSITIVE-SMOKE-V1` · `CHECK-O4O-PAYMENTCORE-O4O-PAYMENTS-MIGRATION-RELOCATE-V1` — 2026-06-12

---

## 0. 실행 정보
- 일시: 2026-06-12 (KST)
- 계정: `renagang21@gmail.com` (userId `6967ebe0-2f87-4cab-809b-8c7190493cef`, seed E2E buyer/공급자2) — production API 인증(Bearer, /auth/login).
- API: `https://o4o-core-api-...run.app/api/v1` (production). 코드/DB 직접 변경 없음(테스트 주문/결제 record 생성은 seed E2E 범위, §정리).
- supplier `91169739-6291-4bed-b1e9-b3d4a93d65eb`(ACTIVE) · SPO `d10c68ae-e6f9-4d07-a734-60feccadf653`(PRIVATE, allowedSellerIds∋buyer, priceGeneral 12000) · 배송 base 3000/free 50000.

## 1. 요약 — Phase 결과
| Phase | 내용 | 결과 |
|------|------|------|
| 0 | o4o_payments production 적용 | ✅ (typeorm_migrations `[X] 534 CreateO4oPaymentsTable` / `[X] 535 AddPaymentKeyUniqueAndStatusIndex`) |
| 2 | canonical cart add (b2b) | ✅ cart item `3f743bc2...`, sourceType=b2b, priceSnapshot 12000, qty 2 |
| 2 | checkout-confirm-b2b | ✅ `paymentGroupId pg_690147fb...`, groupTotalAmount **27000**, orderCount 1, order `945f1f81...`(ORD-20260612-9471), failedItems [] |
| 3 | **payment prepare (KEY)** | ✅ **HTTP 201**, `paymentId b6818b18...`, amount 27000, clientKey present, isTestMode=true — **o4o_payments INSERT 성공, V1 오류 재발 없음** |
| 4 | Toss sandbox 결제 | ⏳ **DEFERRED** (interactive Toss 위젯/테스트카드 필요 — API 로 완료 불가) |
| 5 | confirm → checkout_order paid | ⏳ DEFERRED (Toss paymentKey 필요) |
| 6 | bridge → neture_order + supplier view | ⏳ DEFERRED (paid 선행) |
| 7 | legacy /neture/seller/orders 미사용 | ✅ authed → **HTTP 410 `NETURE_B2B_LEGACY_SELLER_ORDER_RETIRED`** (canonicalAction=store_cart_checkout_b2b). canonical 흐름은 /store/cart/* · /neture/b2b/payments/* 만 사용 |

## 2. 핵심 결론 — V1 blocker 해소 입증
- **V1**: prepare → `relation "o4o_payments" does not exist` 로 차단(PARTIAL PASS).
- **V2**: migration relocate 적용 후 동일 prepare 가 **HTTP 201 + paymentId 발급(o4o_payments row INSERT)** → 오류 재발 없음. **PaymentCore 결제 leg 활성화 확정**(amount 27000, isTestMode).
- 실데이터로 **cart→confirm→prepare** 가 정상 동작(SPO 서버 재검증·공급자별 배송비 3000 합산·paymentGroupId 발급 포함).

## 3. 검증된 금액/계약
- subtotal 24000(=12000×2) + shippingFee 3000 = **27000**. checkout-confirm-b2b groupTotalAmount 27000 = prepare amount 27000 = 일치 ✅.
- prepare 응답: paymentGroupId 그대로, orderCount 1, clientKey(Toss) 존재, isTestMode=true(테스트 모드).
- PRIVATE offer distribution gate: allowedSellerIds∋buyer → DISTRIBUTION_DENIED 없이 통과(failedItems []).

## 4. DEFERRED 사유 (Phase 4~6)
- Toss 결제 완료는 **hosted 결제 위젯에서 테스트카드 입력 → paymentKey 발급**이 필요. API/headless 로 paymentKey 를 생성할 수 없어 confirm/paid/bridge/supplier-view 실측 불가.
- 후속: 브라우저 Toss **sandbox** 결제(테스트카드)로 `/store/payment?paymentGroupId=pg_690147fb...` → success → confirm → paid → bridge → supplier unified view 확인(별도 세션/수동). prepare 까지는 검증 완료이므로 잔여는 결제 완료 1건.
- (paymentGroupId pg_690147fb... + order 945f1f81 + payment b6818b18 은 payable 상태로 남아 재사용 가능.)

## 5. legacy / 무회귀
- legacy `/neture/seller/orders` → 410 retired(P2e). canonical buyer 경로만 사용.
- 본 smoke 는 4서비스 공통 PaymentCore(o4o_payments) 활성화도 간접 입증(prepare 성공) — KPA/Glyco/KCos 결제도 동일 경로로 이제 가능.

## 6. 자격증명 주의 (SSOT 정합)
- `docs/local/TEST-ACCOUNTS.local.md` 의 renagang21@gmail.com "약국 경영자" 행 비밀번호로는 로그인 실패(INVALID_CREDENTIALS), "GlycoPharm 약국" 행 비밀번호로 성공. **로컬 SSOT 의 약국경영자 행이 stale** — 로컬 문서 갱신 권장(값은 본 CHECK 에 미기록). (TEST-ACCOUNTS.local.md 는 gitignore, 본 CHECK 에서 미수정.)

## 7. 생성 자원 / 정리 대상 (§17)
| 자원 | id |
|------|-----|
| cart item(확정 시 제거됨) | 3f743bc2-bec8-49ed-b3b1-06986fac8e42 |
| checkout_order (pending) | 945f1f81-6b1d-4751-96e1-5cb89f8f9082 (ORD-20260612-9471) |
| o4o_payment (CREATED) | b6818b18-d142-460c-afb9-f821d0282429 |
| paymentGroupId | pg_690147fb-84e2-4dc3-bd5e-f32bbf0ae737 |
| (V1 잔여 pending) | pg_08e1501d.../ORD-20260611-6689 |
- 결제 미완료 → 실 금전 이동 없음. pending checkout_order/CREATED payment 는 무해(공급자 미노출). 정리는 seed cleanup WO 에서 일괄. renagang21 은 멀티롤 계정이라 삭제 대신 비활성/비번 변경 권장.

## 8. 완료 기준 체크 (WO §18)
1(o4o_payments 적용) ✅. 2(기존 pg 재사용 여부 — 신규 생성 택함, 기록) ✅. 3(새 cart/confirm) ✅. 4(paymentGroupId 확보) ✅. 5(/store/payment prepare 호출) ✅(API 직접). 6(prepare 성공·amount 27000) ✅. 7(Toss 가능 여부 확인 — 불가/deferred) ✅. 8~11(confirm/paid/bridge/supplier) ⏳ DEFERRED(사유 기록). 12(/seller/orders 미사용 — 410) ✅. 13(deferred phase·사유 기록) ✅. 14(CHECK) ✅. 15(코드 무변경, 문서만 path-specific) ✅. 16(다른 세션 무접촉) ✅.

## 9. 남은 GAP · 후속
- **Toss sandbox 결제 완료 1건**(Phase 4~6) → 브라우저로 `/store/payment?paymentGroupId=pg_690147fb...` 결제 후 confirm→paid→bridge→supplier unified view 노출 확인(SMOKE-V3 또는 수동).
- `IR-O4O-API-SERVER-ORPHANED-SRC-MIGRATIONS-AUDIT-V1`(src/migrations 잔여 38개 — 동일 미적용 위험), `IR-O4O-NETURE-B2B-PRIVATE-OFFER-APPROVAL-GATE-AUDIT-V1`.
- TEST-ACCOUNTS.local.md 약국경영자 비밀번호 행 갱신(로컬).

---

*Date: 2026-06-12 · Status: PASS (prepare 까지 실데이터 성공 — o4o_payments blocker 해소 입증, legacy 410. Toss 결제 완료~bridge~supplier 는 interactive sandbox 부재로 deferred).*
