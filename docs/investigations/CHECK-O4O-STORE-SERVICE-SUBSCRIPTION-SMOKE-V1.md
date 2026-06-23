# CHECK — Store Service Subscription 운영 Smoke V1

**WO:** `WO-O4O-STORE-SERVICE-SUBSCRIPTION-SMOKE-V1`
**일자:** 2026-06-22
**성격:** 운영 비파괴 smoke — 구독 결제 prepare/Toss SDK 진입까지 확인. **실제 결제/confirm 미수행.** 코드 변경 0(본 문서 docs-only).
**대상 배포:** api `o4o-core-api-02283-tc4` 외 (STORE-SERVICE-SUBSCRIPTION-TOSS-PAYMENT / PLAN-CATALOG / ENDSAT-EXPOSURE 반영본).
**결과: PASS (11/12) — §11.10 Toss 결제창 실오픈만 config 한계(placeholder clientKey)로 부분.**

---

## 1. 환경 / Chrome profile lock

- 이전 블로커(persistent `.playwright-o4o-profile` lock)는 **무관** — 본 smoke 는 `chromium.launch()`(ephemeral context, persistent profile 미사용)로 수행. lock 미발생, 1회 실행 성공.
- git status clean. 코드/DB 변경 0.

## 2. 안전장치

- **confirm 하드 차단:** `ctx.route('**/subscriptions/confirm*', abort)` 적용. 결과 `confirm_calls=0`, `confirm_aborted=0`(시도 자체가 없었음).
- 실제 결제수단 선택/인증/최종결제 **미수행**.

## 3. 화면 진입 / 렌더 (§7.2, §11.1) — PASS

- store-owner(renagang21=kpa) 토큰 주입 → `/store/sales-channels/foreign-visitor` 진입. **403/redirect 없음**, store 컨텍스트("테스트 약국 매장").
- 렌더 시각 확인: "외국인 여행객 판매지원" 제목 + "유료 기능 — 이용권 필요"(잠금) + 기능 4종(다국어 상품 설명/QR·SNS 안내/숙소 배송·매장 수령/공급자 주문 연결) + **"월 이용권 결제하기"** 버튼 + **"월 99,000원 · 30일 이용권"** + 사이드바 "판매 채널 확장 > 외국인 여행객 판매지원".
- console error: 401 1건(auth bootstrap noise — 구독 무관). pageError 0.

## 4. /me/check (§7.3, §11.2) — PASS

```json
{ "success": true, "data": {
  "serviceKey":"kpa", "planCode":"FOREIGN_VISITOR_SALES_SUPPORT",
  "featureCode":"FOREIGN_VISITOR_SALES_SUPPORT",
  "active": false, "status": null, "startsAt": null, "endsAt": null } }
```
- `active`/`featureCode`/`status`/`startsAt`/`endsAt` shape 포함 ✅. 활성 이용권 없음 → active=false + null(정상).

## 5. plan catalog (§7.4, §11.3) — PASS

```json
{ "planCode":"FOREIGN_VISITOR_SALES_SUPPORT", "paymentType":"STORE_SERVICE_SUBSCRIPTION",
  "name":"외국인 여행객 판매지원 월 이용권", "amount":99000, "currency":"KRW",
  "durationDays":30, "priceSource":"V1_FIXED_CATALOG", "enabled":true }
```
- amount=99000 / KRW / durationDays=30 / priceSource=V1_FIXED_CATALOG ✅. 화면 가격(월 99,000원·30일)이 **catalog API 기반**(프론트 하드코딩 아님) ✅.
- (참고: name 은 WO 예시 "외국인 관광객 판매 지원" 과 표기 차이 있으나 동일 plan — catalog SSOT 기준.)

## 6. prepare (§7.6, §11.5–9) — PASS

```json
{ "success": true, "data": {
  "paymentId":"...", "transactionId":"PAY-...",
  "orderId":"o4o_sub_9c87f46b-..._h9vl1g",
  "amount":99000, "currency":"KRW",
  "clientKey":"test_ck_test_key", "isTestMode":true,
  "plan": { "planCode":"FOREIGN_VISITOR_SALES_SUPPORT", "name":"...", "durationDays":30, "amount":99000, "currency":"KRW" } } }
```
- **orderId `o4o_sub_` prefix** ✅ · amount 99000(=catalog) ✅ · clientKey 존재 ✅ · isTestMode ✅ · plan snapshot ✅.
- `paymentType=STORE_SERVICE_SUBSCRIPTION` 은 catalog/서버 metadata 로 확정(§5). prepare 는 CREATED o4o_payments 세션만 생성(confirm 미호출 → 미승인·미과금 abandoned 세션).

## 7. Toss 진입 (§7.7, §11.10) — **부분 (config 한계)**

- 결제 버튼 클릭 → prepare 성공 → **Toss SDK 로드됨(`window.TossPayments` present)**. 그러나 실제 Toss 결제창으로 **navigate 안 됨**(`navigated_to_toss:false`).
- 원인: prepare 가 반환한 `clientKey`가 **placeholder `test_ck_test_key`**(실 Toss 테스트 키 아님) → `requestPayment` 가 유효 키 부재로 결제창을 열지 못함. **코드 결함 아님 — 운영 env 미설정.**
- **⚠️ 정확한 env 변수명:** 구독 흐름은 PaymentCore `TossPaymentProviderAdapter` 사용 → `process.env.TOSS_PAYMENTS_CLIENT_KEY || 'test_ck_test_key'`(`TossPaymentProviderAdapter.ts:29`). 따라서 o4o-core-api 에 설정할 변수는 **`TOSS_PAYMENTS_CLIENT_KEY`** 이다. (레거시 `TOSS_CLIENT_KEY` 는 ecommerce-core/`toss-payments.service` 경로용 — **다른 변수**라 이 흐름엔 무효. 후속 WO 가 변수명을 혼동하면 결제창이 여전히 안 열림.)
- 결론: 구독 결제는 prepare + Toss SDK 로드까지 정상 연결. **결제창 실오픈 검증은 실 `test_ck_` 키 설정 후 가능**(후속).

## 8. confirm 미호출 / 실결제 없음 (§7.8, §11.11–12) — PASS

- `POST /subscriptions/confirm` 호출 **0건**(route 차단 무관하게 시도 자체 없음).
- `store_paid_feature_entitlements` 신규 생성 없음. 결제 완료 화면 이동 없음. 실 과금 없음.

## 9. 보존 경계 (§8) — PASS

- 소비자 `/kpa/payments/prepare`(STORE_SALE_PAYMENT) 호출 없음 / checkout Toss widget 호출 없음 → 차단 상태 유지.
- Neture B2B 미접촉. PaymentCore/Toss adapter/DB/schema/migration 변경 없음(본 WO read-only).

## 10. 완료 기준 (§11) 대비

| # | 기준 | 결과 |
|:--:|---|:--:|
| 1 | store-owner 구독 화면 진입 | ✅ |
| 2 | /me/check active/status/startsAt/endsAt shape | ✅ |
| 3 | catalog 기준 가격 표시 | ✅ |
| 4 | 결제 버튼 노출 | ✅ |
| 5 | prepare 성공 | ✅ |
| 6 | orderId `o4o_sub_` prefix | ✅ |
| 7 | paymentType STORE_SERVICE_SUBSCRIPTION | ✅ (catalog/서버) |
| 8 | planCode FOREIGN_VISITOR_SALES_SUPPORT | ✅ |
| 9 | amount = catalog | ✅ |
| 10 | Toss 위젯/결제창 진입 | ⚠️ 부분 — SDK 로드 ✅ / 결제창 실오픈은 placeholder clientKey 로 미검증(env config) |
| 11 | confirm 0건 | ✅ |
| 12 | 실 결제 미수행 | ✅ |

## 11. 결론 / 후속

- **PASS (11/12)** — STORE_SERVICE_SUBSCRIPTION V1 축(기능·가격·상태표시·운영 진입·prepare 규약·confirm 안전)이 운영에서 검증됨. 소비자 결제(STORE_SALE_PAYMENT) 차단도 유지.
- **유일 미검증:** Toss 결제창 실오픈 — 운영 env **`TOSS_PAYMENTS_CLIENT_KEY`** 미설정이라 prepare 가 placeholder(`test_ck_test_key`) 반환. **후속:** o4o-core-api 에 실 Toss test/live `clientKey` 를 **`TOSS_PAYMENTS_CLIENT_KEY`** 로 설정(레거시 `TOSS_CLIENT_KEY` 아님) 후 결제창 진입 1회 재확인(`WO-O4O-TOSS-CLIENT-KEY-CONFIG-AND-WIDGET-SMOKE-V1`). 코드는 SDK 로드까지 정상.
- abandoned CREATED o4o_payments 세션(prepare 2건)은 미승인·미과금·test mode — 정리 불요(무해).

---

*Date: 2026-06-22 · CHECK · 비파괴 운영 smoke · PASS 11/12 · 화면 렌더/catalog 가격/me-check shape/prepare(o4o_sub_·99000·clientKey) PASS · confirm 0·실결제 0 · Toss 결제창 실오픈만 placeholder clientKey(env) 로 부분 → 실 TOSS_CLIENT_KEY 후속 · STORE_SALE_PAYMENT 차단·Neture B2B·PaymentCore·DB 무변경.*
