# IR-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-AND-EXTERNAL-SALES-CHANNEL-REPLACEMENT-V1

- **유형**: 조사 전용 (read-only). 코드·DB 변경 0건.
- **기준 커밋**: `origin/main` = `5dc655c18`
- **작성일**: 2026-08-12
- **목적**: KPA `온라인 판매` 1급 메뉴를 유지한 채, **O4O 자체 소비자몰(B2C storefront) 실행 계층만 걷어내고** 네이버·쿠팡 외부 판매 채널로 교체하기 위한 폐기 범위 판정.

---

## 1. 배경 — 자체몰은 이미 절반 폐기 상태

| 사실 | 근거 |
|---|---|
| 소비자 결제 이미 종료 | `kpa-payment.controller.ts:91,178` · `glycopharm-payment.controller.ts:99,189` · `cosmetics-payment.controller.ts:99,195` — prepare/confirm 이 `410 STORE_SALE_PAYMENT_DEPRECATED` |
| checkout 화면 이미 안내문 | [CheckoutPage.tsx](services/web-kpa-society/src/pages/storefront/CheckoutPage.tsx) — "결제는 매장에서" 안내 전용, 라우트만 유지 |
| 온라인 판매 IA 이미 존재 | [App.tsx:1066-1074](services/web-kpa-society/src/App.tsx#L1066-L1074) — `online-sales/settings` · `products` · `orders` · `orders/:orderId`, `channels` 는 redirect |

→ 이번 결정은 방향 전환이 아니라 **중단된 자체몰의 최종 철거 + 자리 교체**다. 신규 메뉴·신규 도메인·신규 상품 원장 불필요.

---

## 2. 결정적 발견 — 단순 삭제가 불가능한 지점 3가지

### 2-1. `organization_product_channels` 는 B2C 전용이 아니다 (최우선)

같은 테이블이 **태블릿 공개 진열의 실행 축**이기도 하다.

[store-public-utils.ts](apps/api-server/src/routes/platform/store-public/store-public-utils.ts) 안에 구조가 동일한 4개 쿼리가 있고, 갈리는 곳은 단 한 줄이다.

```
L166-172  opc → oc.channel_type = 'B2C'      ← 자체 storefront 진열
L208-214  opc → oc.channel_type = 'B2C'      ← 자체 storefront 진열(상세)
L426-432  opc → oc.channel_type = 'TABLET'   ← 태블릿 공개 진열 (존치)
L502-508  opc → oc.channel_type = 'TABLET'   ← 태블릿 공개 진열(상세, 존치)
```

**판정**: 테이블·엔티티(`organization-product-channel.entity.ts`)·`organization_channels` 는 **KEEP**. 폐기 단위는 테이블이 아니라 **`channel_type='B2C'` 행(row)과 그 행만 읽는 쿼리 경로**다. `channel_type` 이 이미 폐기선을 그어 주므로, 네이버·쿠팡은 같은 구조에 새 `channel_type` 을 얹는 방식이 최소 변경이다.

### 2-2. `checkout_orders.sellerOrganizationId` 는 자체몰 전용이 아니다

소비처가 소비자몰 밖으로 넓게 퍼져 있다.

```
apps/api-server/src/services/checkout.service.ts
apps/api-server/src/services/cart/store-cart.service.ts
apps/api-server/src/services/cart/neture-b2b-cart-checkout.service.ts   ← B2B
apps/api-server/src/services/cart/event-offer-cart-checkout.service.ts  ← 이벤트 오퍼
apps/api-server/src/modules/neture/services/supplier-unified-order.service.ts ← 공급자 이행
apps/api-server/src/entities/checkout/CheckoutOrder.entity.ts
```

**판정**: 컬럼·테이블·서비스 **KEEP**. 폐기 가능한 것은 **KPA 온라인 판매 seller 주문 "UI"** 뿐이며, 그마저도 §3 의 REPURPOSE 대상이다.
※ 주문 원장은 `OrderType=RETAIL` + `metadata.serviceKey='kpa'` + `metadata.channelType='B2C'` 로 소비자몰 주문을 식별한다([kpa-checkout.controller.ts:476,571,916](apps/api-server/src/routes/kpa/controllers/kpa-checkout.controller.ts#L476)). 외부 채널 주문은 이 metadata 축을 확장하는 편이 자연스럽다.

### 2-3. `platform_store_slugs` 는 storefront 소유가 아니다

소비처 30개 파일. storefront 밖 소비가 다수다.

```
store-qr.service.ts (L200,L340,L363)   ← QR 공개 랜딩의 storeSlug
store-tablet.routes.ts                 ← 태블릿
store-blog.service.ts                  ← /store/:slug/blog (KPA·GlycoPharm·K-Cosmetics 3서비스 공통)
pharmacy-hub/*  (Store 프로비저닝·블로그·매장정보)
store-policy.routes.ts · store-hub.controller.ts · pharmacy-info.controller.ts
```

**판정**: 데이터 **KEEP(절대 삭제 금지)**. 폐기 가능한 것은 `온라인 판매 > 판매 설정` 안의 **"자체몰 공개 URL" 표시·편집 UI 의미**뿐이다. slug UI 제거와 slug 데이터 삭제는 별개 사안임을 재확인했다.

---

## 3. 코드·API·테이블 단위 판정

### REMOVE — 자체 소비자몰 실행 계층 (KPA 단독)

| 단위 | 위치 | 비고 |
|---|---|---|
| storefront 공개 홈 | [App.tsx:1095](services/web-kpa-society/src/App.tsx#L1095) `/store/:slug` + `pages/store/StorefrontHomePage.tsx` | **`/store/:slug/blog` 는 존치** (같은 prefix, 다른 기능) |
| storefront 상품 상세 | `App.tsx:1098` + `pages/storefront/StorefrontProductDetailPage.tsx` | |
| 자체 checkout | `App.tsx:1099` + `pages/storefront/CheckoutPage.tsx` | 이미 안내문 전용 |
| 결제 결과 | `App.tsx:1100-1101` + `PaymentSuccessPage.tsx` · `PaymentFailPage.tsx` | 외국인 관광객 결제 결과 페이지와 **별개**(`ForeignVisitorSalesSupportPaymentResultPage` 는 존치) |
| 매장 홈 디자인 | `App.tsx:1085` `/store/settings` + [PharmacyStorePage.tsx](services/web-kpa-society/src/pages/pharmacy/PharmacyStorePage.tsx) (765L) | storefront 레이아웃/템플릿/테마/블록 편집 + `/store/:slug` iframe 미리보기. 공개 홈 폐기 시 존치 근거 소멸 |
| 공개 홈 API | [store-public-home.handler.ts](apps/api-server/src/routes/platform/store-public/store-public-home.handler.ts) `GET /:slug` · `/layout` · `/template` · `/storefront-config` · `/hero` | **플랫폼 공용 라우터** — GlycoPharm·K-Cosmetics 소비 여부 확인 후 판단(§5 O-1) |
| B2C 진열 조회 | `store-public-utils.ts` L166-172 · L208-214, `store-public-product.handler.ts` | TABLET 쿼리(L426-508)는 존치 |
| 소비자 주문 생성 | `kpa-checkout.controller.ts` 의 B2C 채널 검증·주문 생성 경로 (L258-571) | 결제가 이미 410 이라 사실상 도달 불가 |
| 자체 storefront 활성화 UI | `StoreChannelsPage` 의 "온라인 스토어 활성화" · 공개 URL 블록 | §4 로 대체 |

### KEEP — 손대지 않는다

```
ProductMaster / 기존 B2C 상품 데이터 / 가격 · 이미지 · 상세정보 / 상품 식별자
organization_product_listings (상품-조직 관계)
organization_channels · organization_product_channels  (테이블·엔티티 — §2-1)
platform_store_slugs (데이터 전량 — §2-3)
checkout_orders · sellerOrganizationId · checkout.service (§2-2)
/store/:slug/blog · /store/:slug/blog/:postSlug (3서비스 공통)
태블릿 공개 진열(channel_type='TABLET') · QR 공개 랜딩(/qr/{slug})
외국인 관광객 판매 지원 및 그 결제 흐름 (sales-channels/foreign-visitor/*)
GlycoPharm · K-Cosmetics 의 StoreChannelsPage (1,139L · 1,130L — 이번 범위 밖)
```

### REPURPOSE — 껍데기 유지, 내용 교체

| 화면 | 현재 | 변경 |
|---|---|---|
| `온라인 판매 > 판매 설정` → **판매 채널** | `StoreChannelsPage section="settings"` (B2C 활성화 + slug + KPI) | 네이버 연결 / 쿠팡 연결 |
| `온라인 판매 > 판매 상품` | `StoreChannelsPage section="products"` (B2C 진열·순서·노출·판매한도) | 기존 B2C 상품 → 외부 채널 등록/상태 관리 |
| `온라인 판매 > 주문 관리` | [OnlineSalesOrdersPage.tsx](services/web-kpa-society/src/pages/pharmacy/OnlineSalesOrdersPage.tsx) + `OnlineSalesOrderDetailPage.tsx` (checkout_orders seller) | 외부 채널 주문 조회/처리 |

**주의**: `StoreChannelsPage` 는 1,563L 단일 파일을 `section` prop 으로 2화면이 나눠 쓴다. 여기에 외부 채널을 얹으면 파일이 더 비대해지므로, **분할 여부를 후속 WO 에서 먼저 결정**해야 한다.

### NEW — 신규

```
네이버 연결 / 쿠팡 연결 (인증·계정 연동)
외부 채널 상품 매핑 (권장: organization_channels.channel_type 확장 + 기존 opc 재사용)
외부 주문 수집·상태 동기화
의약품 외부 판매 차단 게이트 (SSOT = product_masters.regulatory_type)
```

---

## 4. 최종 IA (변경 없음 — 라벨 1개만 조정)

```
내 매장
└─ 온라인 판매
   ├─ 판매 채널   (기존 '판매 설정' 라벨 변경)
   ├─ 판매 상품
   └─ 주문 관리
```

별도 도메인·별도 앱·별도 상품 원장 모두 불필요.

---

## 5. 미해결 (다음 WO 이전에 확정 필요)

| # | 항목 | 이유 |
|---|---|---|
| O-1 | `store-public-home.handler.ts` 의 GlycoPharm·K-Cosmetics 소비 여부 | 플랫폼 공용 라우터. KPA 만 보고 지우면 §Shared Module Change Rule 위반 |
| O-2 | `channel_type='B2C'` 운영 데이터 실측 (행수·활성 조직수) | 폐기 영향 규모. **read-only SELECT/COUNT 로만 확인** |
| O-3 | 과거 소비자몰 `checkout_orders` 잔존 건수와 보존 정책 | 주문 원장은 지우지 않되 UI 노출 여부 결정 필요 |
| O-4 | 의약품 차단 게이트 위치 (등록 시 / 동기화 시 / 양쪽) | `regulatory_type` 판정 시점 |
| O-5 | `StoreChannelsPage` 분할 여부 | 1,563L 단일 파일 |
| O-6 | 네이버·쿠팡 연동 방식 (공식 API / 파트너 계약 / 수동 CSV) | NEW 범위 전체를 좌우 |

---

## 6. 결론

- **새 `온라인 판매` 메뉴 신설 불필요** — 기존 1급 메뉴·라우트·주문 화면을 그대로 재사용한다.
- **삭제 대상은 "storefront 실행 계층"이지 "데이터 계층"이 아니다.** `organization_product_channels` · `platform_store_slugs` · `checkout_orders` 는 태블릿·QR·블로그·B2B·이벤트 오퍼가 함께 쓰므로 전부 KEEP 이며, 폐기선은 **`channel_type='B2C'`** 라는 값 축에서만 그어진다.
- 다음 단계는 삭제 WO 가 아니라 **O-1·O-2 확정 → REMOVE 실행 WO → REPURPOSE/NEW WO** 순서다.
