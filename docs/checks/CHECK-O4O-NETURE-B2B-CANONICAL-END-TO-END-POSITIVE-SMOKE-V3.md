# CHECK-O4O-NETURE-B2B-CANONICAL-END-TO-END-POSITIVE-SMOKE-V3

> Neture B2B canonical buyer flow 최종 positive smoke — 실 데이터.
> **결과: PARTIAL PASS** — cart→confirm→**prepare 재확인 성공(HTTP 201, amount 27000)** + legacy 410 무회귀. **Toss 결제 완료~confirm~paid~bridge~supplier 는 DEFERRED** — 근본 원인 확정: **prod env 에 유효한 Toss sandbox 키 미설정**(placeholder `test_ck_test_key`/`test_sk_test_key`) + adapter confirm 은 test 모드에서도 실 Toss API 호출(우회 없음) → 위젯 초기화·confirm 모두 불가.
> 상위: `...SMOKE-V1`(o4o_payments blocker) · `...SMOKE-V2`(prepare 성공) · PaymentCore relocate · multi-supplier aggregation · checkout→neture bridge — 2026-06-12

---

## 0. 실행 정보
- 계정: `renagang21@gmail.com`(userId `6967ebe0-...`, GlycoPharm 행 비번) — production API Bearer(/auth/login → Set-Cookie accessToken).
- API: `https://o4o-core-api-...run.app/api/v1`(production). 코드 변경 없음. write 는 prepare(기존 pg 재사용, 신규 주문/결제 미생성).
- 재사용 자원: paymentGroupId `pg_690147fb-84e2-4dc3-bd5e-f32bbf0ae737`(V2), checkout_order `945f1f81...`(ORD-20260612-9471), amount 27000.

## 1. Phase 결과
| Phase | 내용 | 결과 |
|------|------|------|
| 1 | buyer cart(기존 pg payable 확인) | ✅ (pg 재사용 가능) |
| 2 | checkout-confirm-b2b | ✅ (V2 생성분 재사용 — pg payable) |
| 3 | **payment prepare(KEY)** | ✅ **HTTP 201** `paymentId 3facecc8-28c6-4697-8948-9ef67e9f72f6`, transactionId `PAY-mqah3f38-bkhcgh`, amount **27000**, orderCount 1, clientKey `test_ck_test_key`, isTestMode=true — **재배포 후에도 o4o_payments INSERT 정상, 무회귀** |
| 4 | Toss sandbox 결제 | ⛔ **DEFERRED(구조적 불가)** — §2 근본 원인 |
| 5 | confirm → paid | ⏳ DEFERRED(Phase 4 선행) |
| 6 | checkout_order paymentStatus='paid' | ⏳ DEFERRED |
| 7 | neture_order bridge | ⏳ DEFERRED |
| 8 | supplier unified view 노출 | ⏳ DEFERRED |
| 9 | legacy /neture/seller/orders 무회귀 | ✅ no-auth **401** / authed **410** `NETURE_B2B_LEGACY_SELLER_ORDER_RETIRED`(canonicalRoute=/store/cart/neture/checkout-confirm-b2b) |

## 2. Phase 4 DEFERRED — 근본 원인 확정 (V3 신규 규명)
V1/V2 는 "interactive Toss 위젯 필요"로 deferred 했으나, V3 에서 **코드/환경 레벨로 원인 확정**:
- `apps/api-server/.../adapters/TossPaymentProviderAdapter.ts`:
  - `secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY || 'test_sk_test_key'` · `clientKey = process.env.TOSS_PAYMENTS_CLIENT_KEY || 'test_ck_test_key'`.
  - prepare 응답 clientKey = **`test_ck_test_key`(default fallback)** → **prod env 에 `TOSS_PAYMENTS_CLIENT_KEY` 미설정**(유효 Toss sandbox 키 부재).
  - `confirm()` 은 **항상 실 Toss `https://api.tosspayments.com/v1/payments/confirm` 호출**(test 모드 우회/mock 분기 없음).
- 귀결:
  1. 프론트 `loadTossPayments('test_ck_test_key')` → **유효하지 않은 clientKey 라 위젯이 실제 결제 진행 불가** → paymentKey 발급 불가.
  2. 설령 합성 paymentKey 로 confirm 해도 → adapter 가 `test_sk_test_key` 로 실 Toss 호출 → Toss 거부(invalid key/payment not found) → confirm 실패.
- → **이 환경에서는 Toss 결제 완료가 구조적으로 불가.** (smoke 의 한계이며 canonical 코드 결함 아님 — prepare leg 까지는 정상.)

## 3. 검증된 계약(누적)
- subtotal 24000(12000×2) + shipping 3000 = **27000**. prepare amount 27000 일치 ✅.
- prepare: o4o_payments INSERT 정상(relocate #534/535 효과 지속), isTestMode, clientKey 반환. PRIVATE offer gate 통과(failedItems 무).
- legacy seller/orders 410(P2e) 유지 — canonical buyer 경로(/store/cart/* · /neture/b2b/payments/*)만 사용.

## 4. PASS / PARTIAL / FAIL 판정
- **PARTIAL PASS**(WO §8 부분 PASS 기준: "Toss 위젯/외부 결제 환경 문제로 Phase 4 에서 막힘 → Phase 1~3 검증 후 DEFERRED").
- FAIL 아님: prepare 실패·confirm 후 미전이·bridge 누락 등 결함 미발생(해당 Phase 미도달).
- V2 대비 진전: ① 재배포 후 prepare 무회귀 재확인 ② Phase 4 블록의 **근본 원인(Toss 키 미설정 + adapter 무우회) 확정** ③ legacy 410 재확인.

## 5. UNBLOCK 경로 (Phase 4~8 닫기)
다음 중 하나가 선행되어야 V3→full PASS:
1. **prod env 에 유효한 Toss sandbox 키 설정** — Cloud Run `o4o-core-api` 에 `TOSS_PAYMENTS_CLIENT_KEY`/`TOSS_PAYMENTS_SECRET_KEY`(test_ck_.../test_sk_... 실값) 주입 → 브라우저(Playwright)로 `/store/payment?paymentGroupId=pg_690147fb...` → Toss 테스트카드 결제 → success → confirm → paid → bridge → supplier.
2. **(대안) test 모드 confirm bypass 도입** — `WO-O4O-PAYMENTCORE-TEST-MODE-CONFIRM-BYPASS-V1`: isTestMode 시 adapter.confirm 이 실 Toss 호출 대신 합성 승인(검증된 stored amount 기준) → E2E 자동화 가능. (단 운영 경로에 영향 없도록 test 키일 때만.)
- 어느 쪽이든 결정·키 확보는 운영/시크릿 관리 영역 → 사용자 결정 필요.

## 6. 생성/잔여 자원
| 자원 | id |
|------|-----|
| paymentGroupId(payable) | pg_690147fb-84e2-4dc3-bd5e-f32bbf0ae737 |
| checkout_order(pending) | 945f1f81-6b1d-4751-96e1-5cb89f8f9082 (ORD-20260612-9471) |
| o4o_payment(CREATED, V3 prepare) | 3facecc8-28c6-4697-8948-9ef67e9f72f6 (PAY-mqah3f38-bkhcgh) |
| (V2 prepare) | b6818b18-d142-460c-afb9-f821d0282429 |
| supplier / SPO | 91169739-... / d10c68ae-... ([E2E_TEST]) |
- 결제 미완료 → 실 금전 이동 없음, 공급자 미노출(무해). 정리는 `WO-O4O-NETURE-B2B-E2E-TEST-RESOURCE-CLEANUP-V1`(서비스 오픈 전). renagang21 멀티롤이라 삭제 대신 비활성 권장.

## 7. 완료 기준 체크 (WO §11)
1(기존 pg 재사용 — payable 확인) ✅. 2(필요시 새 cart — 불요, 재사용) ✅. 3(pg/금액 기록) ✅. 4(prepare 성공) ✅. 5(Toss sandbox 결제) ⛔ DEFERRED(§2). 6(confirm) ⏳. 7(paid 전이) ⏳. 8(bridge) ⏳. 9(supplier 노출) ⏳. (legacy 410) ✅. 11(CHECK) ✅. 12(코드 무변경·문서 path-specific) ✅. 13(다른 세션 무접촉) ✅.

## 8. 후속
- (unblock 결정 후) Toss 키 주입 또는 test-mode confirm bypass → **SMOKE-V4** 로 Phase 4~8 닫기.
- `WO-O4O-NETURE-B2B-E2E-TEST-RESOURCE-CLEANUP-V1`(서비스 오픈 전 seed 정리).
- (선택) `WO-O4O-LMS-INSTRUCTOR-APPLICATION-ADMIN-ROUTE-CLEANUP-V1`.

## 9. 수정하지 않은 것
```
코드 / DB / migration / API / UI 무변경. prepare(기존 pg 재사용) 외 write 없음 — 신규 주문/결제 row 미생성(o4o_payment 1건은 prepare 부수효과, 무해).
운영 데이터 paid/bridge 강제 변경 없음(수동 SQL UPDATE 금지 준수). 다른 세션 WIP 무접촉.
```

---

*Date: 2026-06-12 · Status: PARTIAL PASS. prepare 재확인 성공(27000) + legacy 410 무회귀. Toss 결제~bridge~supplier 는 prod Toss 키 미설정(placeholder) + adapter 무우회로 구조적 DEFERRED — unblock §5(키 주입 or test-mode confirm bypass) 후 V4.*
