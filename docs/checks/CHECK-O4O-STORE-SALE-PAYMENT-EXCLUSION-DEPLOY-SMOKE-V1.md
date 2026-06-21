# CHECK — 매장 소비자 결제 O4O 제외 배포 후 운영 smoke (PASS)

**대상:** `WO-O4O-STORE-SALE-CHECKOUT-UI-ENTRY-REMOVAL-V1`(frontend) + `WO-O4O-STORE-SALE-CHECKOUT-ROUTE-DEPRECATION-V1`(backend) 묶음 배포 검증
**일자:** 2026-06-21
**성격:** 배포 + 운영 read-only smoke. 코드 변경 0(본 문서 docs-only).
**검증 방식:** gcloud/gh 배포 확인 + 프로덕션 인증 API(read-only, 결제 미생성) + Playwright headless. 자격증명 SSOT env 주입(미출력).

---

## 1. 배포

| 서비스 | 커밋 | 배포 | 결과 |
|---|---|---|---|
| api-server | `c1206ecc3` (410 deprecation) | deploy-api.yml run `27905628408` (push 자동 트리거) | **success** · 리비전 `o4o-core-api-02274-nsk` |
| web-kpa-society | `30058ddaa` (UI 제거) | deploy-web-services run `27905119250` + 후속 `27905644055`(main HEAD 기준, 변경 포함) | **success** |

## 2. API 410 smoke (인증, dummy body — 결제 미생성) — **PASS**

410 이 validation/PaymentCore **앞단**이라 dummy body 로도 결제 생성 없이 차단 확인.

| endpoint | 결과 |
|---|---|
| `POST /api/v1/kpa/payments/prepare` | **410** `STORE_SALE_PAYMENT_DEPRECATED` |
| `POST /api/v1/kpa/payments/confirm` | **410** `STORE_SALE_PAYMENT_DEPRECATED` |
| `POST /api/v1/glycopharm/payments/prepare` | **410** `STORE_SALE_PAYMENT_DEPRECATED` |
| `POST /api/v1/glycopharm/payments/confirm` | **410** `STORE_SALE_PAYMENT_DEPRECATED` |
| `POST /api/v1/cosmetics/payments/prepare` | **410** `STORE_SALE_PAYMENT_DEPRECATED` |
| `POST /api/v1/cosmetics/payments/confirm` | **410** `STORE_SALE_PAYMENT_DEPRECATED` |

- 응답 메시지: "매장 소비자 결제는 O4O에서 제공하지 않습니다. 상품 결제는 해당 매장의 POS 또는 현장 결제를 이용해 주세요." (3서비스 일관)
- 미인증 호출 → 401 `AUTH_REQUIRED`(auth gate 가 앞 — 차단 로직 도달 전, 정상).

## 3. 보존/미영향 smoke — **PASS**

| 항목 | 결과 |
|---|---|
| `GET /api/v1/kpa/payments/order/:id` (조회성 보존) | **404 ORDER_NOT_FOUND** (410 아님 — route 동작·미차단) |
| `GET /api/v1/store-entitlements/me/check?serviceKey=kpa&planCode=FOREIGN_VISITOR_SALES_SUPPORT` (구독 축) | **200** `{active:false}` (미영향) |
| Neture B2B payment controller | 코드 diff **0**(미변경) — 본 smoke 에서 능동 호출 안 함(side-effect 회피) |

## 4. Frontend smoke (KPA storefront) — **PASS**

- `https://kpa-society.co.kr/store/test-store/checkout` → **POS 안내 페이지** 렌더(시각 확인):
  - "상품 결제는 매장에서 진행해 주세요" / "온라인 상품 결제는 제공되지 않습니다. 상품 구매·결제는 매장에서 직접(카드·현금·간편결제) 진행해 주세요." / "매장으로 돌아가기" 버튼.
- **Toss 위젯/`결제하기` 버튼 없음.** 페이지 로드 중 `/payments/prepare`·`tosspayments` 네트워크 호출 = **0건**(`toss_calls_during_load: 0`).

## 5. 종합 판정

```text
PASS — 소비자→매장 O4O Toss 결제 경로가 프론트(POS 안내)·백엔드(410) 양단에서 차단됨.
보존: 조회성 route(404), 구독 entitlement(200), Neture B2B(미변경), checkout_orders/o4o_payments/PaymentCore(무변경).
데이터 변경/결제 생성 0.
```

## 6. 무변경 확인

- 본 smoke 코드/DB/route/데이터 변경 0. 실제 Toss 결제/confirm/환불 미실행. dummy body 는 410(앞단)으로 결제 생성 없음.
- 자격증명 SSOT(`docs/local/TEST-ACCOUNTS.local.md`) env 주입 — 로그/문서 미출력.

## 7. 후속

```text
WO-O4O-STORE-SERVICE-SUBSCRIPTION-TOSS-PAYMENT-V1  ← 매장 경영자 구독 결제 구현(다음)
WO-O4O-STORE-SALE-CHECKOUT-DEAD-PAGE-CLEANUP-V1    ← PaymentSuccess/Fail dead page 정리(선택)
```

---

*Date: 2026-06-21 · CHECK · 배포 smoke PASS · api `o4o-core-api-02274-nsk` + web-kpa-society 배포 success · 6 endpoint 410 STORE_SALE_PAYMENT_DEPRECATED · GET /order 보존(404) · entitlement me/check 200 · KPA checkout POS 안내·Toss 0 · neture-b2b 미변경 · 데이터/결제 생성 0.*
