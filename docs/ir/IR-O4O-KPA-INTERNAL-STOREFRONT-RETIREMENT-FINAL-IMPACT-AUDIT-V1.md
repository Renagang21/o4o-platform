# IR-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-FINAL-IMPACT-AUDIT-V1

- **유형**: 조사 전용 (read-only). 코드·DB 변경 0건.
- **기준 커밋**: `origin/main` = `177d3fb1f`
- **작성일**: 2026-08-12
- **선행**: [IR-...-RETIREMENT-AND-EXTERNAL-SALES-CHANNEL-REPLACEMENT-V1](IR-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-AND-EXTERNAL-SALES-CHANNEL-REPLACEMENT-V1.md)
- **범위**: O-1(공용 storefront API 소비처 전수) · O-2(B2C channel row census) · O-3(RETAIL+KPA+B2C 주문 census)
- **상태**: **O-1 · O-2 · O-3 전부 완료** — 추가 발견으로 철거 판정 1건 보류(§6)

---

## 1. O-1 — 공용 storefront API 서비스별 소비처 전수 · **완료**

### 1-1. 전제 정정 — 서비스마다 storefront 백엔드가 다르다

| 서비스 | storefront API 베이스 | 구현 |
|---|---|---|
| KPA-Society | `/api/v1/stores/*` | **플랫폼 공용** ([unified-store-public.routes.ts:44-47](apps/api-server/src/routes/platform/unified-store-public.routes.ts#L44-L47), 마운트 [register-routes.ts:323](apps/api-server/src/bootstrap/register-routes.ts#L323)) |
| GlycoPharm | `/api/v1/glycopharm/stores/*` | **자체 컨트롤러** ([store.controller.ts](apps/api-server/src/routes/glycopharm/controllers/store.controller.ts)) — `/:slug` · `/storefront-config` · `/hero` · `/template` · `/categories` · `/products` · `/cart` · `/orders` 를 **중복 구현** |
| K-Cosmetics | `/api/v1/cosmetics/stores/*` | 자체 — `settings` · `listings` 중심. storefront-config/hero **없음** |
| Pharmacy-Hub | — | 플랫폼 storefront API **소비 0건** |

→ "공용 handler 라서 못 지운다"는 우려는 **endpoint 단위로 갈린다.** 아래가 전수 결과다.

### 1-2. endpoint × 서비스 소비 매트릭스 (플랫폼 `/api/v1/stores` 기준)

| endpoint | KPA | Glyco | K-Cos | PH | 판정 |
|---|:--:|:--:|:--:|:--:|---|
| `GET /:slug` | O | **O** | **O** | – | **CROSS-SERVICE → KEEP** |
| `GET /:slug/layout` | O | – | – | – | KPA-only → REMOVE |
| `GET /:slug/template` | – | – | – | – | **DEAD** |
| `GET /:slug/storefront-config` | – | – | – | – | **DEAD** |
| `GET /:slug/hero` | – | – | – | – | **DEAD** |
| `GET /:slug/products/featured` | O | – | – | – | KPA-only → REMOVE |
| `GET /:slug/products` | – | – | – | – | **DEAD** |
| `GET /:slug/products/:id` | O | – | – | – | KPA-only → REMOVE |
| `GET /:slug/categories` | – | – | – | – | **DEAD** |
| `GET /:slug/blog` · `/blog/settings` · `/blog/:postSlug` | O | **O** | **O** | – | **CROSS-SERVICE → KEEP** |
| `/:slug/tablet/*` (6개) | O | O | – | – | **CROSS-SERVICE → KEEP** |

**근거**

- `GET /:slug` 가 cross-service 인 이유 — 블로그 공개 페이지가 매장 identity 를 이 endpoint 로 읽는다.
  [packages/shared-space-ui/src/blog/client.ts:78](packages/shared-space-ui/src/blog/client.ts#L78) `fetchPublicStoreInfo()` → `{base}/api/v1/stores/{slug}`.
  소비처: KPA `StoreBlogPage` · GlycoPharm [StoreBlogPage.tsx](services/web-glycopharm/src/pages/store/StoreBlogPage.tsx) · K-Cosmetics `StoreBlogPage.tsx` (3서비스 모두 `@o4o/shared-space-ui` 재사용).
- KPA-only 3건의 유일 소비처 — [StorefrontHomePage.tsx:140-183](services/web-kpa-society/src/pages/store/StorefrontHomePage.tsx#L140-L183) (`/:slug`, `/:slug/layout`, `/products/featured`, `/blog`) · [StorefrontProductDetailPage.tsx:10](services/web-kpa-society/src/pages/storefront/StorefrontProductDetailPage.tsx#L10) (`/products/:id`).
- DEAD 5건 — 플랫폼 경로로 호출하는 프런트가 **한 곳도 없다**. GlycoPharm 이 쓰는 것은 동명의 **자체** endpoint(`/glycopharm/stores/...`)다. `packages/ui/store-blocks` 도 직접 fetch 하지 않는다(렌더 전용).

### 1-3. 선행 IR 판정 정정 2건

| 선행 IR 판정 | 정정 |
|---|---|
| 공용 홈 API(`store-public-home.handler.ts`) 전체를 REMOVE 후보 | **`GET /:slug` 는 KEEP.** handler 파일 삭제 불가. 삭제 단위는 `/layout` + product handler 3건이며, `/template`·`/storefront-config`·`/hero`·`/products`·`/categories` 는 dead 정리 대상 |
| `매장 홈 디자인` REMOVE | **프런트만 REMOVE.** 백엔드 [store-settings.controller.ts](apps/api-server/src/routes/o4o-store/controllers/store-settings.controller.ts) · [layout.controller.ts](apps/api-server/src/routes/o4o-store/controllers/layout.controller.ts) 는 kpa/glycopharm/cosmetics **3서비스 라우터에 각각 마운트**된 공용 컨트롤러다 (`kpa.routes.ts:113` · `glycopharm.routes.ts:41` · `cosmetics.routes.ts:57`). KPA 소비만 제거하고 컨트롤러는 KEEP |

### 1-4. O-1 부수 발견 (범위 밖, 별도 판단 필요)

GlycoPharm 자체 storefront 는 **`/cart` · `/orders` · `/orders/:id/cancel` 까지 살아 있다** ([store.controller.ts](apps/api-server/src/routes/glycopharm/controllers/store.controller.ts), 소비 [web-glycopharm/src/api/store.ts:179-282](services/web-glycopharm/src/api/store.ts#L179-L282)). 결제만 `410` 이므로 **장바구니·주문 생성 UI 는 남고 결제에서 막히는 상태**다. KPA 철거와 동일한 문제가 GlycoPharm 에도 있으나 이번 WO 범위 밖이므로 **별도 WO 로 분리**한다.

---

## 2. O-2 / O-3 — 실측 완료

- 실행: cloud-sql-proxy `127.0.0.1:5443` → `o4o_platform` (프로덕션), read-only SELECT/COUNT 만. **DB write 0건**
- 프로덕션 확인: `product_masters` 272,038 · `organizations` 22 · `users` 45 · `kpa_members` 6

### 2-1. O-2 — B2C channel / product-channel census · **결과**

| 대상 | 실측 |
|---|---|
| `organization_channels` 전체 | **2행** — `B2C` APPROVED 1 · `KIOSK` APPROVED 1 (둘 다 같은 조직, 2026-05-15 생성) |
| B2C 보유 조직 | **1개** — `테스트 약국 (E2E)` (type=association). **E2E 테스트 조직** |
| `organization_product_channels` 전체 | **0행** |
| B2C 에 매달린 opc | **0행** |
| TABLET 채널 · TABLET opc | **각 0행** |
| B2C+TABLET 동시 보유 조직 | **0개** |
| `organization_product_listings` | 20행 전부 `service_key='neture'`. **KPA 진열 0건** |

→ **B2C 폐기로 발생하는 orphan 데이터는 0건이다.** `organization_product_channels` 는 테이블 자체가 비어 있어, "TABLET 이 같은 테이블을 쓰므로 삭제 불가" 는 **코드 계층의 사실이지 데이터 계층의 제약이 아니다**. 그래도 §3 정책대로 **테이블·행 삭제는 하지 않는다**.

### 2-2. O-3 — RETAIL + KPA + B2C 주문 census · **결과**

**전제가 틀렸다.** `checkout_orders.order_type` 은 enum `checkout_orders_order_type_enum` 이고 실제 값은 다음 5개뿐이다.

```
GENERIC · DROPSHIPPING · GLYCOPHARM · COSMETICS · TOURISM
```

**`RETAIL` 은 enum 에 존재하지 않는다.** 선행 IR 과 [kpa-checkout.controller.ts:7](apps/api-server/src/routes/kpa/controllers/kpa-checkout.controller.ts#L7) 주석의 "OrderType = RETAIL" 은 DB 계약이 아니다. 코드의 `orderType: 'retail'` ([L571](apps/api-server/src/routes/kpa/controllers/kpa-checkout.controller.ts#L571) · [L713](apps/api-server/src/routes/kpa/controllers/kpa-checkout.controller.ts#L713)) 은 **응답 JSON 리터럴**일 뿐 저장되지 않는다. 컬럼도 `"orderType"` 이 아니라 snake_case `order_type` 이다.

| 대상 | 실측 |
|---|---|
| `checkout_orders` 전체 | **5행** — 전부 `GENERIC` |
| 내역 | `neture` created 2 (2026-06-11·12) · `pharmacy-hub` cancelled 2 (2026-08-01) · serviceKey 없음 created 1 (2026-08-09) |
| `metadata.channelType` | **5행 전부 NULL** |
| **KPA B2C 주문** | **0건** |
| 주문 테이블 전수 | `checkout_orders` · `checkout_order_logs` · `neture_orders` · `neture_settlement_orders` — KPA 전용 주문 테이블 없음 |

### 2-3. 식별축 판정

`metadata.channelType` 은 **100% NULL 이라 식별축으로 성립하지 않는다.** 다만 **보존해야 할 KPA B2C 주문이 0건**이므로 식별 문제 자체가 성립하지 않는다.

→ **판정 1 (안전).** 대체 식별축 조사는 불필요하다. 애초에 자체몰로 생성된 주문이 프로덕션에 하나도 없다.

### 2-4. 실행한 SQL

`storefront-census.sql` 기준. 실행 중 확인된 실제 컬럼명은 다음과 같다 (선행 문서의 인용부호 가정 정정).

| 테이블 | 표기 |
|---|---|
| `checkout_orders` | `order_type` 은 **snake_case**. `"createdAt"` · `"sellerOrganizationId"` · `"orderNumber"` 는 camelCase |
| `organization_channels` · `organization_product_channels` | 전부 snake_case |
| `organizations` | `"createdAt"` camelCase |

```sql
-- O-2
SELECT channel_type, status, COUNT(*), COUNT(DISTINCT organization_id),
       MIN(created_at)::date, MAX(updated_at)::date
FROM organization_channels GROUP BY 1,2;

SELECT COUNT(*) FROM organization_product_channels;

-- O-3 (order_type 은 snake_case, RETAIL 값 없음)
SELECT order_type, COUNT(*), MIN("createdAt")::date, MAX("createdAt")::date
FROM checkout_orders GROUP BY 1;

SELECT order_type, status, metadata->>'serviceKey', metadata->>'channelType', "createdAt"::date
FROM checkout_orders ORDER BY "createdAt";
```

## 3. 확정된 정책 (사용자 판정)

| # | 항목 | 확정 |
|---|---|---|
| O-4 | 의약품 외부 판매 차단 게이트 | **등록 시 + 동기화 시 양쪽.** 공통 함수 `assertExternalSalesEligible(product)` 를 모든 외부 채널 adapter 앞에 둔다. 판정은 **`product_masters.regulatory_type` 단일 기준** — 서비스별 분기(KPA 금지 / K-Cos 허용 등) 금지 |
| O-5 | `StoreChannelsPage` 분할 | **후행.** 자체 B2C UI 제거 → 네이버·쿠팡 UI 추가 → 그 시점에 파일 크기 재판단. 선행 분할은 곧 삭제할 코드를 정리하는 이중 작업 |
| O-6 | 네이버·쿠팡 연동 방식 | **REMOVE 이후 조사.** 외부 공식 API 계약은 변동성이 커서 구현 직전 재조사 |
| — | B2C 운영 데이터 | **삭제하지 않는다.** 기존 row 는 역사 데이터로 남기고 **신규 생성만 차단**하는 것이 1단계 |

---

## 4. DB 접근 경위 (기록)

1. `apps/api-server/.env` 의 `DB_PASSWORD` 는 **빈 값**(길이 0) — 로컬 자격정보 없음
2. Secret Manager 에는 `cosmetics-db-password` 1건뿐 — 해당 없음
3. 접속 정보는 Cloud Run 서비스 env 에서 확보 (`o4o_api_v2` @ `o4o_platform`)
4. 1차 시도는 실행 환경 정책에 의해 차단 → 사용자가 `Bash(psql:*)` 허용 → 실행
5. cloud-sql-proxy 는 `127.0.0.1:5443` (다른 세션의 5442 와 분리)

> 자격정보 값은 본 문서·커밋·메모리 어디에도 기록하지 않았다. 실행은 전부 read-only 이며 DB write 0건이다.

---

## 5. 결론

- **O-1** — 공용 handler 라서 못 지운다는 우려는 endpoint 단위로 갈린다. `GET /:slug` 와 blog·tablet 은 cross-service KEEP, `/layout` · `/products/featured` · `/products/:id` 는 KPA-only, 나머지 5건은 dead.
- **O-2** — B2C 운영 데이터는 **E2E 테스트 조직 1개의 채널 행 1건이 전부**다. `organization_product_channels` 는 **완전히 비어 있다**. 폐기로 발생하는 orphan 0건.
- **O-3** — **KPA 자체몰 주문은 프로덕션에 0건**이다. 나아가 `order_type` enum 에 `RETAIL` 자체가 없어, 선행 문서의 "OrderType=RETAIL" 전제는 DB 계약이 아니었다.
- **따라서 데이터 손실 위험은 없다.** 그럼에도 §3 정책대로 **기존 row 는 삭제하지 않고 신규 B2C 생성만 차단**한다.
- 다만 철거 대상 중 1건이 **자체몰이 아닌 다른 기능의 랜딩 대상**으로 쓰이고 있어 판정을 보류한다 (§6).

---

## 6. 보류 판정 — storefront 제품 상세는 **QR 제품 랜딩의 착지 화면**이다

선행 IR 은 `GET /:slug/products/:id` 와 `StorefrontProductDetailPage` 를 **KPA-only → REMOVE** 로 분류했다. 그러나 자체몰 외에 **QR 이 이 화면을 착지 대상으로 쓴다.**

- [QrLandingPage.tsx:92-95](services/web-kpa-society/src/pages/qr/QrLandingPage.tsx#L92-L95) — `landingType === 'product'` → `navigate('/store/{slug}/products/{landingTargetId}')`
- QR 생성 UI 에 **제품 랜딩이 선택지로 살아 있다** — [StoreQRPage.tsx:51](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx#L51) `{ value: 'product', label: '제품' }`, [L211](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx#L211) **폼 기본값이 `'product'`**
- 백엔드도 유지 중 — [store-qr.service.ts:690](apps/api-server/src/services/store/store-qr.service.ts#L690) 이 `supplier_product_offers` 유효성을 검증하고, [L766](apps/api-server/src/services/store/store-qr.service.ts#L766) 이 `product_marketing_assets` 에 QR→상품 링크를 적재한다
- 인쇄 템플릿도 제품 QR 을 별도 분기한다 — [QrPrintTemplateModal.tsx:65-68](services/web-kpa-society/src/pages/pharmacy/QrPrintTemplateModal.tsx#L65-L68)

### 실측 (현재 데이터는 전부 0)

| 대상 | 실측 |
|---|---|
| `store_qr_codes` landing_type 분포 | `screen_set` 36(active 18) · `page` 16(9) · `link` 13(0) · `video` 1(0) |
| **`landing_type='product'`** | **0행** |
| `landing_type='promotion'` | 0행 |
| `product_marketing_assets` | 0행 |
| `supplier_product_offers` | 3행 (live 0) |
| `foreign_visitor_partners` · `foreign_visitor_partner_qr_codes` | 각 0행 |

→ **데이터는 0이지만 기능은 오늘도 선택 가능한 상태**다. 그대로 제거하면 QR 제작 화면에서 만들 수 있는 랜딩이 착지할 곳을 잃는다.

### 선택지

| 안 | 내용 | 영향 |
|---|---|---|
| **A. REPURPOSE (권장)** | `StorefrontProductDetailPage` 와 `GET /:slug/products/:id` 를 **QR 제품 랜딩 전용 뷰**로 남기고, 자체몰 잔재(구매 CTA → `/checkout`, "매장으로 돌아가기" → 자체몰 홈)만 제거 | QR 제품 랜딩 유지. 자체몰 홈·결제는 예정대로 철거 |
| B. QR 제품 랜딩 동시 은퇴 | `landingType='product'` 선택지·백엔드 분기·인쇄 분기까지 함께 제거 | 철거 범위가 QR 트랙으로 번짐. 별도 WO 규모 |
| C. 랜딩 대상 교체 | 제품 QR 을 `/qr/{slug}` 뷰어(설명서)로 착지시키고 storefront 상세는 제거 | 가장 깔끔하나 QR 트랙 설계 변경이라 이번 범위 밖 |

A 안이면 이번 WO 범위 안에서 끝나고, B·C 는 QR 업무동선 트랙과 조정이 필요하다.

### 그 외 자체몰 홈(`/store/:slug`) 링크 소비처

제거 시 함께 정리해야 하는 참조다. 전부 자체몰 계열이거나 데이터 0건이라 차단 요인은 아니다.

| 위치 | 성격 |
|---|---|
| [PharmacyStorePage.tsx:546-567](services/web-kpa-society/src/pages/pharmacy/PharmacyStorePage.tsx#L546-L567) | 매장 홈 디자인의 미리보기 iframe + 새 창 열기 |
| [LayoutBuilderPage.tsx:334](services/web-kpa-society/src/pages/pharmacy/LayoutBuilderPage.tsx#L334) | 레이아웃 빌더 미리보기 |
| [StoreChannelsPage.tsx:1119](services/web-kpa-society/src/pages/pharmacy/StoreChannelsPage.tsx#L1119) | B2C 채널 카드의 "매장 보기" |
| [ForeignVisitorAffiliatePublicLandingPage.tsx:36](services/web-kpa-society/src/pages/public/ForeignVisitorAffiliatePublicLandingPage.tsx#L36) | 외국인 관광객 파트너 랜딩 → 매장 홈 (**파트너 0건**) |
| `CheckoutPage` · `PaymentSuccessPage` · `PaymentFailPage` | 전부 함께 철거 대상 |

---

## 7. 다음 단계

1. **§6 판정 확정** (A / B / C)
2. `WO-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-V1` — 데이터 삭제 없이 **신규 B2C 생성 차단** + 자체몰 프런트·라우트·KPA-only handler·dead endpoint 정리. `GET /:slug` · blog · tablet · `platform_store_slugs`(17행: kpa 9 · pharmacy-hub 5 · glycopharm 2 · cosmetics 1) · `checkout_orders` 공용 축 · GlycoPharm·K-Cosmetics 경로는 **불가침**
3. 네이버 연동 조사·파일럿 → 쿠팡 → 공통 Online Sales 모듈 추출
4. 별도 분리: **GlycoPharm 자체 storefront cart/orders 잔존** (§1-4)
