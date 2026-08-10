# CHECK — WO-O4O-DRUG-COMMERCE-ABSOLUTE-BLOCK-V1

| 항목 | 값 |
|------|------|
| 작업요청서 | `WO-O4O-DRUG-COMMERCE-ABSOLUTE-BLOCK-V1` |
| 배경 | `WO-O4O-DRUG-GATE-SSOT-AND-OFFER-OPL-INGRESS-GUARD-V1` 은 **유입(offer·OPL) 축**만 막았다. 거래(장바구니·주문) 축에는 게이트가 없었다 |
| 작업 방식 | **worktree 격리** — `C:\tmp\o4o-drug-commerce-block` / `wo/drug-commerce-absolute-block` |
| 기준 커밋 | `bc79ba76f` (origin/main, ff-only 최신화 후) |
| 검증일 | 2026-08-09 |
| 결과 | **PASS** (main 미병합 — 전용 브랜치 push 까지) |

---

## 0. 착수 전 — 기존 DRUG 거래 데이터 read-only 재확인

WO 의 착수 조건(“DRUG 장바구니·주문이 0건이 아니면 중지·보고”)을 추측 없이 실측했다.
채널 = Cloud SQL Auth Proxy v2 + `gcloud auth print-access-token`, **SELECT 전용**.

| 항목 | 실측 |
|---|---|
| `store_cart_items` 전체 | **0** |
| 그중 DRUG | **0** |
| `checkout_orders` 전체 | **4** |
| 그중 DRUG 라인 / DRUG 주문 | **0 / 0** |
| `service_audience_policies` | glycopharm=T · kpa-society=T · pharmacy-hub=T · neture=F · k-cosmetics=F |

→ 0건 확인. 기존 데이터 처리와 게이트 구현을 분리할 필요가 없어 그대로 착수했다.

### 0-1. fail-closed 설계의 안전성 실측

“해석되지 않는 참조는 거부”가 **정상 흐름을 오탐으로 막지 않는지** 같은 채널에서 확인했다.

| 확인 | 실측 | 판단 |
|---|---|---|
| `organization_product_listings` | 20건, `master_id` NULL **0건** | OPL 은 항상 master 로 해석된다 |
| OPL `master_id` ↔ `offer_id→master_id` 불일치 | **0건** | 다형 참조 불일치 오탐 없음 |
| `supplier_product_offers` | 2건, `master_id` NULL **0건** | offer 도 항상 해석된다 |
| 기존 주문 4라인 중 해석 실패 | 2라인 | 둘 다 `[E2E_TEST]` 주문이며 **주문 이후 offer 가 삭제**된 흔적. 주문 시점에는 실재했다 → 게이트가 정상 주문을 막지 않는다 |

---

## 1. 접근 — 기존 가드를 고치지 않고 **별도 축**을 신설

`drug-access.guard.ts` 는 **유입 축**이라 약국 대상 서비스면 **허용**한다.
거래 축은 정반대(예외 없이 거부)이므로, 같은 파일에 조건을 얹으면 두 정책이 서로를 오염시킨다.

| | `drug-access.guard.ts` (기존, **미수정**) | `drug-commerce.guard.ts` (신설) |
|---|---|---|
| 축 | 유입 — offer / OPL / 자동확산 | 거래 — 장바구니 / 주문 |
| 약국 대상 서비스 | **허용** | **거부** |
| 판정 입력 | serviceKey · organizationId · action | **상품 참조뿐** |
| 공유 | `isDrugRegulatoryType()` (의약품 판정 SSOT) | 좌측에서 import — 재정의 없음 |

> 거래 가드는 `serviceKey` · `role` · `organizationId` 를 **입력받지 않는다.**
> 우회 조건을 넣을 자리가 없으므로 “서비스·역할·운영자 예외 없음”이 코드 형태로 고정된다.

---

## 2. 변경 파일 (6개)

| 파일 | 변경 |
|---|---|
| `apps/api-server/src/modules/neture/guards/drug-commerce.guard.ts` | **신설** — 다형 참조 해석 + 절대 차단 판정 |
| `apps/api-server/src/services/cart/store-cart.service.ts` | `add()` 저장 전 판정 · `update()` 기존 항목 재판정 · `CartError` 403 코드 확장 |
| `apps/api-server/src/routes/cart/store-cart.routes.ts` | 차단 응답을 403 으로 매핑 (기존 400/404 매핑 불변) |
| `apps/api-server/src/services/checkout.service.ts` | `createOrder()` items 전량 일괄 판정 |
| `apps/api-server/src/controllers/checkout/checkoutController.ts` | 차단 오류를 500 이 아닌 403 + 사유 코드로 응답 |
| `apps/api-server/src/__tests__/security/drug-commerce-block.spec.ts` | **신설** — 보안 회귀 16 시나리오 |

**미변경(의도적)**: `drug-access.guard.ts` · OPL / 랜딩 / SPD · ProductMaster · `service_audience_policies` 행 · schema · migration · 기존 데이터.

---

## 3. 차단 지점 3곳

### 3-1. `StoreCartService.add()` — 저장 전

`POST /cart/:serviceKey/items` 는 `req.body` 를 그대로 `add()` 로 넘긴다.
즉 **클라이언트가 임의의 `productMasterId` 를 보낼 수 있다.** 그래서 `repo.save()` 앞에서 판정한다.

### 3-2. `StoreCartService.update()` — 기존 항목 재판정

`findOne()` 으로 읽은 **실제 저장 값**을 다시 판정한다.
게이트 도입 전에 담긴 항목이나, 상품의 `regulatory_type` 이 나중에 DRUG 로 정정된 항목이
수량 변경으로 되살아나지 않는다.

### 3-3. `CheckoutService.createOrder()` — DB 초기화·주문 생성 전

`ensureInitialized()` · 금액 계산 · 주문 row 생성보다 **먼저** items 전량을 일괄 판정한다.
모든 호출부(checkoutController · event-offer · Neture B2B · Pharmacy-Hub · KPA event-offer)가
이 한 지점을 공유하므로 주문 축의 최종 방어선이 된다.

> DataSource 연결 실패 시에는 게이트 코드로 바꿔치지 않고 **기존과 동일한 오류를 그대로 던진다**
> (주문은 어차피 생성되지 않는다 — 오류 의미를 왜곡하지 않기 위함).

---

## 4. 다형 참조 해석 (서버 전용)

요청이 자기 신고한 필드를 신뢰하지 않고, **어떤 필드로 들어왔든 4개 축 전부**에 대조한다.

```
① product_masters.id
② supplier_product_offers.id           → master_id
③ organization_product_listings.id     → master_id
④ organization_product_listings.id     → offer_id → supplier_product_offers.master_id
```

- 항목당 여러 참조가 있으면 **모두** 해석하고 **일치를 요구**한다 (불일치 → 거부).
- `eventOfferId` 도 참조 축에 포함한다 — 이벤트오퍼 cart item 의 `eventOfferId` 는
  `organization_product_listings.id` 이며, 이것이 유일한 상품 참조인 경우가 있다.
  빠뜨리면 정상 흐름이 오탐으로 막힌다.
- 주문 라인은 `productId`(다형) + `metadata` 의 상품 참조를 함께 대조한다 →
  **자기 신고와 실제 상품이 어긋난 라인**을 잡는다.
- 조회는 항목 수와 무관하게 **UNION 1회**(batch) 다 — N+1 없음.

### 거부 코드

| 코드 | 조건 | HTTP |
|---|---|---|
| `DRUG_COMMERCE_FORBIDDEN` | 의약품 (예외 없음) | 403 |
| `DRUG_COMMERCE_PRODUCT_UNRESOLVED` | 참조 없음 · UUID 오류 · 미존재 · 조회 실패 | 403 |
| `DRUG_COMMERCE_REFERENCE_CONFLICT` | 다형 참조가 서로 다른 master 를 가리킴 | 403 |

의약품 탐지가 **최우선**이다 — 다른 결함이 함께 있어도 `DRUG_COMMERCE_FORBIDDEN` 으로 보고해
보안 신호를 삼키지 않는다.

---

## 5. 보안 회귀 16 시나리오 — 전량 PASS

`npx jest src/__tests__/security/drug-commerce-block.spec.ts` → **17 passed** (16 + 부가 1)

| # | 시나리오 | 기대 | 결과 |
|:--:|---|---|:--:|
| 1 | ProductMaster 직접 참조가 의약품 → 담기 | 거부 `FORBIDDEN` | ✅ |
| 2 | offer → master 경유 의약품 | 거부 | ✅ |
| 3 | OPL(`master_id` 축) 의약품 | 거부 | ✅ |
| 4 | OPL(`master_id`=NULL) → offer → master 의약품 | 거부 | ✅ |
| 5 | `regulatory_type='의약품'`(한글 표기) | 거부 | ✅ |
| 6 | 약국 대상 서비스(kpa-society · pharmacy-hub · glycopharm) | **거부 — 서비스 예외 없음** | ✅ |
| 7 | 운영자·role 문맥 주입 | 거부 (가드가 role 입력을 받지 않음을 컴파일 타임에 고정) | ✅ |
| 8 | 건강기능식품 · 의약외품 · 의료기기 | **통과 — 기존 동작 유지** | ✅ |
| 9 | 상품 참조 전무 | 거부 `UNRESOLVED` | ✅ |
| 10 | UUID 형식 오류 | 거부 `UNRESOLVED` | ✅ |
| 11 | 어느 축에서도 미해석 | 거부 `UNRESOLVED` | ✅ |
| 12 | 다형 참조가 서로 다른 master | 거부 `CONFLICT` | ✅ |
| 13 | 해석 조회 실패 | 전량 거부 (fail-closed) | ✅ |
| 14 | 주문 items 에 의약품 1건 혼합 | **주문 전체 거부 · 주문 row 0 · 로그 0** | ✅ |
| 15 | `metadata` 는 비의약품인데 `productId` 가 의약품 | 거부 (자기 신고 무시) | ✅ |
| 16 | 게이트 이전에 담긴 의약품 항목 수량 변경 | 거부 · 저장 없음 / 비의약품은 통과 | ✅ |
| 부가 | `CartError.status` | 의약품 차단만 403, 기존 코드 매핑 불변 | ✅ |

---

## 6. 검증 결과

| 검증 | 명령 | 결과 |
|---|---|---|
| 신규 보안 스펙 | `npx jest .../drug-commerce-block.spec.ts` | **17 passed** |
| 기존 유입 가드 회귀 | `npx jest .../drug-access-gate.spec.ts` | **20 passed** (미수정 확인) |
| cart · checkout 회귀 | `npx jest src/services/cart src/services/neture/__tests__/checkout-fulfillment-bridge-sources.test.ts` | **31 passed** |
| api-server 타입체크 | `npx tsc --noEmit` (워크스페이스 의존 선행 빌드 후) | **오류 0** |

> 타입체크는 `pnpm --filter "@o4o/api-server^..." run build` 선행이 필요하다
> (미선행 시 `@o4o/ai-core` 등 TS2307 이 대량 발생 — 본 변경과 무관한 환경 문제).

---

## 7. 알려진 동작 변화 (의도)

1. **상품 참조가 하나도 없는 cart 담기는 이제 거부된다.**
   기존에는 `productName` 만으로 담을 수 있었다. WO 의 “식별 불가 요청 전체 거부”를 따른 것이며,
   비의약품임을 증명할 수 없는 요청을 통과시키지 않는다는 뜻이다.
   (실측: 현재 `store_cart_items` 0건이라 영향 받는 기존 데이터 없음)
2. **`/cart/:serviceKey/*` 의 의약품 차단은 400 이 아니라 403** 이다.
   `VALIDATION_ERROR`(400) · `NOT_FOUND`(404) 매핑은 그대로다.
3. **`POST /api/checkout/initiate` 의 의약품 차단은 500 이 아니라 403 + 사유 코드** 다.

---

## 8. 범위 밖 (미착수 · 후속 WO 대상)

| 항목 | 사유 |
|---|---|
| `store_cart_items` 에 raw SQL 로 직접 쓰는 경로 | 현재 없음(전 경로가 `StoreCartService` 경유). 신설 시 같은 가드를 통과시켜야 한다 |
| 기존 DRUG 거래 데이터 정리 | **0건이라 대상 없음** |
| `drug-access.guard.ts` 의 하드코딩 fallback 제거 | 기존 WO(`DRUG-POLICY-LIFECYCLE`) 소관 |
| 결제·정산 축 | 주문 생성이 막히면 도달하지 않음. 별도 판단 필요 시 후속 WO |

---

## 9. Git

| 항목 | 값 |
|---|---|
| 브랜치 | `wo/drug-commerce-absolute-block` (전용 · **main 미병합**) |
| 커밋 범위 | 위 6개 파일 + 본 CHECK 문서 |
| 병행 세션 파일 접촉 | **없음** (worktree 격리 · path-specific stage) |
