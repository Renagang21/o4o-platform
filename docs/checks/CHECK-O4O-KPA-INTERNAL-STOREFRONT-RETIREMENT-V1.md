# CHECK-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-V1

> **WO**: `WO-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-V1`
> **선행 IR**: [`IR-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-AND-EXTERNAL-SALES-CHANNEL-REPLACEMENT-V1`](../ir/IR-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-AND-EXTERNAL-SALES-CHANNEL-REPLACEMENT-V1.md) ·
> [`IR-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-FINAL-IMPACT-AUDIT-V1`](../ir/IR-O4O-KPA-INTERNAL-STOREFRONT-RETIREMENT-FINAL-IMPACT-AUDIT-V1.md)
> **판정**: **A안 확정** — 자체몰 철거 + `StorefrontProductDetailPage` / `GET /:slug/products/:id` 는 QR 제품 랜딩 전용으로 축소
> **기준 커밋**: `2e69b85fb` (`origin/main`)
> **DB 변경**: **0** (schema · migration · row 모두 미변경)

---

## 1. 목표

KPA 자체 운영 B2C storefront(자체몰)를 종료한다. 온라인 판매는 네이버·쿠팡 등 **외부 판매 채널**로 대체하며,
`온라인 판매` 메뉴(판매 설정 / 판매 상품 / 주문 관리)는 껍데기를 유지하고 내용만 교체한다.
신규 메뉴·신규 도메인·신규 상품 원장은 만들지 않는다.

자체몰 결제는 이미 `410 STORE_SALE_PAYMENT_DEPRECATED` 로 사망 상태였고, 실측(O-2/O-3) 결과 KPA B2C 주문·진열 데이터는 **0건**이다.

---

## 2. 판정표 (실행 결과)

| 구분 | 대상 | 결과 |
|---|---|---|
| **REMOVE** | KPA 자체 storefront 홈 `/store/:slug` + `StorefrontHomePage` | 삭제 |
| REMOVE | `/store/:slug/checkout` · `/payment/success` · `/payment/fail` + 3 페이지 | 삭제 |
| REMOVE | 로컬 장바구니 `services/cartService.ts` (소비처 0) | 삭제 |
| REMOVE | 매장 홈 디자인 프런트 `PharmacyStorePage`(765L) · `LayoutBuilderPage`(363L, route 없음) | 삭제 |
| REMOVE | `/store/settings` · `/settings/layout` · `/settings/template` | `/store/info` 로 1홉 redirect |
| REMOVE | B2C 자체몰 활성화 UI (`온라인 스토어 시작` 버튼 2곳 · `스토어 보기` · `createChannel` client) | 삭제 |
| REMOVE | `GET /:slug/layout`(KPA-only) · `/template` · `/storefront-config` · `/hero` (소비처 0) | 삭제 |
| REMOVE | `GET /:slug/products/featured`(KPA-only) · `/:slug/products` · `/:slug/categories` (소비처 0) | 삭제 |
| REMOVE | 신규 B2C 채널 생성 | 백엔드 차단 (`410 STORE_B2C_CHANNEL_RETIRED`, **kpa serviceKey 한정**) |
| **REPURPOSE** | `StorefrontProductDetailPage` | 구매 CTA·수량·장바구니·checkout 이동·자체몰 홈 복귀 제거 → 제품 정보 + owner 설명 수정만 |
| REPURPOSE | `GET /:slug/products/:id` | QR 제품 랜딩(`landingType='product'`) 착지 API 로 의미 축소 |
| **KEEP** | `GET /:slug` (KPA·GlycoPharm·K-Cosmetics 블로그 공개층 공통) | 미변경 |
| KEEP | blog (`/blog` · `/blog/settings` · `/blog/:postSlug`) · tablet 6 endpoint | 미변경 |
| KEEP | `platform_store_slugs` · `checkout_orders` · `organization_channels` · `organization_product_channels` **데이터** | 미변경 (기존 B2C row 는 역사 데이터로 보존) |
| KEEP | GlycoPharm `/api/v1/glycopharm/stores/*` · K-Cosmetics `/api/v1/cosmetics/stores/*` | 미변경 |
| KEEP | 3서비스 공용 `store-settings.controller.ts` · `layout.controller.ts` | 미변경 (프런트만 은퇴) |

---

## 3. 변경 파일

### Frontend — `services/web-kpa-society`

| 파일 | 조치 |
|---|---|
| `src/App.tsx` | 자체몰 route 4건 제거 · `settings*` 3건 `/store/info` redirect · `/kpa/store/:slug` legacy redirect 제거(대상 소멸) · lazy import 정리 |
| `src/pages/store/StorefrontHomePage.tsx` | 삭제 |
| `src/pages/storefront/CheckoutPage.tsx` · `PaymentSuccessPage.tsx` · `PaymentFailPage.tsx` | 삭제 |
| `src/services/cartService.ts` | 삭제 (소비처 0) |
| `src/pages/pharmacy/PharmacyStorePage.tsx` · `LayoutBuilderPage.tsx` | 삭제 |
| `src/pages/pharmacy/index.ts` | 위 2건 export 제거 |
| `src/pages/pharmacy/StoreChannelsPage.tsx` | `createChannel` import·`handleCreateChannel`·활성화 버튼 2곳·`스토어 보기` 제거 · B2C 공개 주소를 **매장 블로그**로 재지정(slug 편집 UI 는 유지) · `/store/settings` → `/store/info` |
| `src/pages/pharmacy/sections/StoreManagementSection.tsx` | dead 링크 `/store/settings` 2건 → `약국 정보`(`/store/info`) 1건으로 정리 |
| `src/pages/storefront/StorefrontProductDetailPage.tsx` | QR 제품 랜딩 전용으로 축소 |
| `src/pages/store/StoreBlogPage.tsx` · `StoreBlogPostPage.tsx` | `storeHomePath={null}` 전달 (자체몰 홈 링크 숨김) |
| `src/api/storeHub.ts` | `createChannel()` client 제거 |

### Shared package

| 파일 | 조치 |
|---|---|
| `packages/shared-space-ui/src/blog/BlogPublicHeader.tsx` | `storeHomePath?: string \| null` prop 신설. **기본값은 기존 동작(`/store/{slug}`) 유지** → GlycoPharm·K-Cosmetics 무영향. KPA 만 `null` 로 링크 숨김 |

> **Shared Module Change Rule 준수**: 공용 컴포넌트를 KPA 전용으로 바꾸지 않고 **opt-in prop** 으로 분기했다. 3개 소비 서비스 전부 typecheck 통과.

### Backend — `apps/api-server`

| 파일 | 조치 |
|---|---|
| `src/routes/platform/store-public/store-public-home.handler.ts` | `/:slug/layout` · `/template` · `/storefront-config` · `/hero` 제거. **`GET /:slug` 존치** |
| `src/routes/platform/store-public/store-public-product.handler.ts` | `/products/featured` · `/products` · `/categories` 제거. **`/products/:id` 존치** |
| `src/routes/o4o-store/controllers/store-hub.controller.ts` | `POST /store-hub/channels` 에 `serviceKey === 'kpa' && channelType === 'B2C'` → `410 STORE_B2C_CHANNEL_RETIRED` 가드 추가 |

---

## 4. 불가침 확인

| 항목 | 확인 |
|---|---|
| DB schema / migration | 변경 0 |
| 운영 데이터 (row) | 변경 0 — 기존 B2C 채널·진열·주문 row 삭제 없음 |
| `platform_store_slugs` | 미변경. slug 는 QR(`/qr/:slug`) · 태블릿(`/tablet/:slug`) · 블로그(`/store/:slug/blog`) 공용 식별자이므로 편집 UI 도 존치 |
| `organization_product_channels` | 미변경 (B2C·TABLET 공용 구조) |
| `checkout_orders` | 미변경 |
| GlycoPharm / K-Cosmetics | 코드·경로 미변경, typecheck 통과 |
| QR 트랙 | `QrLandingPage` · `StoreQRPage` · `store-qr.service.ts` · `QrPrintTemplateModal` 미변경. `landingType='product'` 착지 경로 유지 |
| 다른 세션 파일 (`kpa-branch/**` 등) | 미접촉 |

---

## 5. 검증

| 항목 | 결과 |
|---|---|
| `tsc --noEmit` web-kpa-society | PASS |
| `tsc --noEmit` shared-space-ui | PASS |
| `tsc --noEmit` web-glycopharm | PASS |
| `tsc --noEmit` web-k-cosmetics | PASS |
| `pnpm --filter @o4o/web-kpa-society build` | PASS |
| `pnpm --filter @o4o/api-server build` | PASS |
| 브라우저 smoke | **미수행** — 배포 후 필요 |

---

## 6. 잔여 부채 (이번 범위 밖 · 별도 WO)

| # | 내용 |
|---|---|
| 1 | **GlycoPharm 자체 storefront** 가 `/cart` · `/orders` · `/orders/:id/cancel` 를 여전히 노출하는데 결제는 `410` — 별도 WO |
| 2 | `store-public-utils.ts` 의 `generateDefaultBlocks` · `deriveChannels` 가 이번 제거로 소비처 0 (동명 함수가 `layout.controller.ts` 에 별도 존재). 삭제는 별도 정리 WO |
| 3 | `QrLandingPage` 의 `landingType='promotion'` → `/store/:slug/events/:id` 는 **원래부터 route 없음**(선행 dead-end, 이번 변경과 무관) |
| 4 | 네이버 연동 조사·파일럿 → 쿠팡 연동 → 공통 Online Sales 모듈 추출 (후속 트랙) |
| 5 | `StoreChannelsPage`(1,563L → 1,49xL) 분할은 외부 채널 구현 시점에 수행 |

---

## 7. Git

| 항목 | 값 |
|---|---|
| 기준 | `2e69b85fb` |
| stage 방식 | path-specific (`git add .` 미사용) |
| 다른 세션 파일 | 미접촉 |

**문서 정합**: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건 (§6-1, §6-2)
