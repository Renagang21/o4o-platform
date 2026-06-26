# CHECK-O4O-KPA-STORE-HANDLED-PRODUCTS-UNIFIED-VIEW-V1

> WO: WO-O4O-KPA-STORE-HANDLED-PRODUCTS-UNIFIED-VIEW-V1
> 선행: IR-O4O-KPA-STORE-HANDLED-PRODUCTS-UNIFIED-VIEW-DESIGN-V1
> 범위: KPA 한정. 신규 조회 API + 신규 화면 + 메뉴 1개. DB/migration 없음.

## 1. 선행 IR 요약

매장 취급제품 = `organization_product_listings`(O4O 취급) + `store_local_products`(매장 자체)의 **조회 통합**(물리 통합 X).
핵심 제약: **매장 자체 제품은 온라인몰 배치 불가**(Display Domain hardening) → "미지원" 고정. 채널 신뢰 표시 = 타블렛/온라인몰(listing)/상품설명(listing). QR/POP/블로그는 후속.

## 2. 구현 범위

| 구분 | 내용 |
|---|---|
| 백엔드 | `GET /api/v1/store/handled-products` 신규(UNION listings+local, sourceType, 채널상태 3종, 검색/출처필터/페이지네이션) |
| 프론트 | `/store/handled-products` 신규 화면 + `api/handledProducts.ts` 클라이언트 |
| 메뉴 | KPA `약국 상품·거래`에 `매장 취급제품`(`/handled-products`) 추가 |
| DB | **없음** (read-only 조회) |

## 3. 신규 API

- `apps/api-server/src/routes/platform/store-handled-products.routes.ts` → `createStoreHandledProductsRoutes`
- mount: `bootstrap/register-routes.ts` `app.use('/api/v1/store', ...)`
- 인증: `requireAuth` + `resolveStoreAccess`(organization_id). org 없으면 빈 목록.
- Boundary: 모든 쿼리 `organization_id` 필터 + parameter binding(ANY($n::uuid[])). Cross-domain JOIN 없음(채널상태는 별도 쿼리 enrich).

## 4. 신규 화면

- `services/web-kpa-society/src/pages/pharmacy/StoreHandledProductsPage.tsx`
- 출처 탭(전체/O4O 취급 제품/매장 자체 제품) · 제품명 검색(debounce) · 통합 테이블 · Pagination · 원본 관리 이동.
- 컬럼: 제품 / 출처 / 표시 가격 / 상태 / 타블렛 / 온라인몰 / 상품 설명 / 최근 수정일 / 관리.
- 직접 CRUD 없음 → `관리` 버튼 = `/store/my-products?highlight=` · `/store/commerce/local-products?highlight=` 이동.
- 하단 고지: "매장 자체 제품은 온라인몰 미지원 / QR·POP·블로그 후속".

## 5. 메뉴 구조 변경

`약국 상품·거래`: O4O 제품 · **매장 취급제품(신규)** · 내 매장 제품 · 매장 자체 제품 · 발주 내역 · 신청·승인 현황.
- 기존 메뉴 유지(수정 동선 보존). MenuKey 는 free string(`key: string`) → 타입 변경 불필요.
- GP/KCos 블록 무변경.

## 6. 응답 필드 정의

`{ sourceType, sourceId, name, imageUrl, originLabel, ownerLabel, price, statusLabel, isActive, tabletExposure, onlineSalesExposure, productDescriptionStatus, updatedAt, managePath }`
- tabletExposure: `exposed`/`partial`/`not_exposed` (store_tablet_displays, both)
- onlineSalesExposure: listing=`exposed`/`inactive`/`not_exposed`, **local=`not_supported`**
- productDescriptionStatus: listing=`available`/`none`, **local=`not_supported`**

## 7. local 제품 온라인몰 미지원 처리 확인

- 백엔드: `isListing` 아닌 경우 onlineSalesExposure/productDescriptionStatus = `not_supported` 고정(쿼리 대상에서 local 제외).
- 프론트: `not_supported` → "미지원" 배지(muted). "배치 가능" 류 라벨 없음.

## 8. DB/migration 없음 확인

- 신규 엔티티/migration 없음. 기존 테이블 read-only SELECT 만.

## 9. GP/KCos 무영향 확인

- 메뉴: KPA 블록만 항목 추가. API: `/handled-products` 는 org 스코프(서비스 무관하나 KPA 화면에서만 호출). 화면/route: web-kpa-society 한정.

## 10. typecheck 결과

| 패키지 | 결과 |
|---|---|
| `apps/api-server` tsc | ✅ PASS |
| `packages/store-ui-core` tsc | ✅ PASS |
| `services/web-kpa-society` tsc | ✅ PASS |

## 11. API smoke 결과

✅ PASS (배포본 9e7dd0241, o4o-core-api/kpa-society-web deploy success). 브라우저 경유로 `GET /api/v1/store/handled-products` 200.
- 빈 상태: 매장 자체 제품(0)+내 매장 제품(0) → 통합 0건 (0=0+0, 누락/오류 없음).
- 데이터 1건(매장 자체 제품 등록): 통합 1건, sourceType=local, price=12000, onlineSalesExposure=`not_supported`("미지원"), productDescriptionStatus=`not_supported`, tabletExposure=`not_exposed`.
- 비활성화 후: 통합 0건 (activeOnly 정상).

## 12. browser smoke 결과

✅ PASS (2026-06-26, KPA `테스트 약국 매장`).

| 항목 | 결과 |
|---|---|
| 약국 상품·거래 하위 '매장 취급제품' 노출(O4O 제품 다음) | ✅ |
| /store/handled-products 접근(헤더/breadcrumb/출처탭/검색/9컬럼 표) | ✅ |
| 같은 표에 매장 자체 제품 행 표시(출처 배지 '매장 자체 제품') | ✅ |
| 표시 가격 12,000원 포맷 · 상태 '활성' | ✅ |
| **매장 자체 제품 온라인몰 = '미지원'** (핵심 불변식) | ✅ |
| 상품 설명 '미지원' · 타블렛 '노출 안함' | ✅ |
| 관리 버튼 → /store/commerce/local-products?highlight=<id> 이동 | ✅ |
| 비활성화 후 통합 뷰 0건 반영(테스트 데이터 정리) | ✅ |
| 콘솔 페이지 오류 없음(로그인 시점 401만) | ✅ |

> 검증용 매장 자체 제품 1건 등록 → 통합 뷰/미지원 배지 확인 → 비활성화로 정리(잔여 active 0).

## 13. 후속 후보

- `WO-O4O-KPA-STORE-PRODUCT-LABEL-CLARIFICATION-V1` (내 매장 제품 → 취급 중인 O4O 제품)
- `WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CHANNEL-EXPOSURE-V1` (QR/POP/블로그 파생 기록 → 정확 활용 상태)
- `WO-...-INTERNAL-TABS-V1` (기존 2메뉴 내부 탭 흡수 검토)
