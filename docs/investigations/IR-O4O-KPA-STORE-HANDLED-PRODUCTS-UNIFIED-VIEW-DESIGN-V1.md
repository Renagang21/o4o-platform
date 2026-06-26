# IR-O4O-KPA-STORE-HANDLED-PRODUCTS-UNIFIED-VIEW-DESIGN-V1

> 유형: 설계 조사 (read-only) / 상태: 설계 확정, 후속 WO 결정 대기
> 작성일: 2026-06-26 / 범위: KPA. 코드/route/DB 변경 없음
> 선행: `IR-...-PRODUCT-MENU-AND-LOCAL-PRODUCT-IA-AUDIT-V1`, `WO-...-PRODUCT-MENU-IA-REORG-V1`(완료)

---

## 1. 결론 요약 (먼저)

- **"매장 취급제품" = `organization_product_listings`(O4O 취급) + `store_local_products`(매장 자체)** 의 **조회 통합**. 물리 통합 아님.
- **두 소스를 같은 표에 표시 가능** — 제품명/이미지/활성/수정일은 공통, **가격·상태·등록주체는 `sourceType` 분기 + 표시 정규화** 필요.
- **매장 자체 제품의 온라인몰(checkout) 배치 = 구조적으로 불가** — DB hardening(`20260224300000`)이 `store_local_products` ↔ `ecommerce_order_items`/`organization_product_channels` 교차를 **차단**(Display Domain only). 통합 뷰에 **"온라인몰 미지원"으로만** 표시(절대 "배치 가능" 금지).
- **채널별 제품 상태 표시 신뢰도(V1)**:
  - **신뢰 가능** → 타블렛(both), 온라인몰(listing만), 상품설명(listing만).
  - **후속 필요(약한 참조)** → QR / POP / 블로그 (제품 FK 없음, content 기반 → derivation table 필요).
- **구현 방식**: 정식 목록(검색/정렬/페이지네이션/total)이 필요하므로 **백엔드 통합 조회 API 권장**.
- **V1 성격**: **조회 중심(읽기) + 원본 관리 화면 연결**. 통합 목록에서 직접 CRUD 하지 않음.
- **메뉴 IA**: 후보 **B 변형** — '약국 상품·거래'에 **매장 취급제품(통합 조회)** 을 추가하고, 기존 `내 매장 제품`/`매장 자체 제품`은 **수정 동선으로 유지**(추후 내부 탭 흡수 검토).

---

## 2. 현재 데이터 구조 / 필드 정의 (요약)

| 엔티티 | 핵심 필드 | 비고 |
|---|---|---|
| `store_local_products` | `id, organization_id, name, description, images[], price_display, summary, detail_html, thumbnail_url, badge_type, is_active, sort_order, updated_at` | **Display Domain only**, 공급사/등록주체 필드 없음, **Checkout 비연결** |
| `organization_product_listings` | `id, organization_id, service_key, master_id(→ProductMaster), offer_id(→SupplierProductOffer), price, event_price, is_active, status(pending/approved/canceled), start_at/end_at, requested_by, updated_at` | 제품명/이미지=ProductMaster, 가격=listing.price 또는 offer.price_general, **Checkout 연결** |
| `organization_product_channels` | `channel_id, product_listing_id(only), is_active, display_order` | **listing FK만** — local 불가 |
| `ProductMaster` | `id, barcode(SSOT), name, regulatory_name, manufacturer_name, images(1:N)` | listing 의 제품 신원 |
| `SupplierProductOffer` | `master_id, supplier_id, price_general, consumer_*_description, is_active` | listing.offer_id 가 참조 |
| `store_tablet_displays` | `tablet_id, product_type('supplier'|'local'), product_id, is_visible, sort_order` | **두 소스 모두** 진열(soft ref) |
| `shared_product_descriptions` | `master_id(→ProductMaster), content, status(candidate/canonical/…), source_type` | **master 기준**(barcode SSOT), local 대상 아님 |

> 파일: `store-local-product.entity.ts`, `modules/store-core/entities/organization-product-{listing,channel}.entity.ts`, `modules/neture/entities/{ProductMaster,SupplierProductOffer,SharedProductDescription}.entity.ts`, `routes/platform/entities/store-tablet-display.entity.ts`, migration `20260224300000-HardenStoreLocalProductDomain.ts`.

---

## 3. (14.1) 데이터 소스 비교표

| 항목 | O4O 취급제품 (organization_product_listings) | 매장 자체제품 (store_local_products) | 통합 뷰 처리 |
|---|---|---|---|
| 테이블/PK | uuid | uuid | `sourceType`('listing'/'local') + `sourceId` |
| 제품명 | `ProductMaster.name` (master_id) | `name` (직접) | ✅ 공통(소스별 추출) |
| 대표 이미지 | `ProductMaster.images`(isPrimary) | `thumbnail_url` ‖ `images[0]` | ✅ 공통(소스별 추출) |
| 가격 | `price`(listing override) ‖ `offer.price_general` ‖ `event_price` | `price_display`(표시가) | ⚠️ **의미 다름** — 표시용 "표시 가격" 1개로 정규화, 없으면 '—' |
| 요약/설명 | `offer.consumer_short/detail_description` | `summary` + `detail_html` | ⚠️ 구조 다름 — 목록은 요약만, 상세는 원본 화면 |
| 상태 | `is_active` + `status`(승인) + `start_at/end_at`(이벤트) | `is_active` + `badge_type` | ⚠️ **정규화** — 표시상태(활성/비활성/이벤트/승인대기) + 원본상태 동봉 |
| 공급사/등록주체 | `requested_by`(공급사 user) + `service_key` | 없음(매장 직접) | ⚠️ '등록자' 표시 — listing=공급/플랫폼, local=내 매장 |
| 활성 여부 | `is_active` | `is_active` | ✅ 공통 |
| 최근 수정일 | `updated_at` | `updated_at` | ✅ 공통(정렬 키) |
| 고유 필드 | event/소스추적/승인 | badge/강조/갤러리 | 소스별 별도 반환 |

→ **공통 4(이름·이미지·활성·수정일) + 정규화 3(가격·상태·등록주체)**. 같은 표 표시 가능.

---

## 4. (14.2) 채널 활용 상태표

| 채널 | O4O 취급제품 | 매장 자체제품 | 현재 확인 방법 | V1 표시 후보 | 후속 필요 |
|---|---|---|---|---|---|
| **타블렛** | ✅ | ✅ | `store_tablet_displays`(product_type+product_id 역조회, tablet_id 집계) | 노출 안함 / 일부 노출 / 노출 중 | 없음 |
| **온라인몰(B2C)** | ✅(listing) | ❌(불가) | `organization_product_channels`(product_listing_id, is_active) | listing: 활성/비활성 · local: **미지원** | local 확장은 도메인 재설계 필요 |
| **상품 설명** | ✅(listing=master) | ❌(master 없음) | `shared_product_descriptions`(master_id, status, source_type) | listing: 공용설명 보유/미보유(+출처) · local: 미지원 | local 대상화는 별도 |
| **QR-code** | ⚠️ | ⚠️ | `store_qr_codes.landingTargetId`(문자열 약한 참조) | "활용 가능"(제품별 판정 불가) | **derivation 필요** |
| **POP** | ⚠️ | ⚠️ | `store_pops`(content 기반, 제품 FK 없음) | "활용 가능" | **derivation/FK 필요** |
| **블로그** | ⚠️ | ⚠️ | `store_blog_posts`(content 기반, 제품 FK 없음) | "활용 가능" | **derivation 필요** |

→ **V1 신뢰 표시 = 타블렛 / 온라인몰(listing) / 상품설명(listing).** QR·POP·블로그는 제품 역참조가 불가(약한 참조)라 V1 제외(또는 "활용 가능" 정적 라벨), 정확 표시는 후속(파생 기록 필요).

---

## 5. (14.3) 메뉴 IA 후보 비교

| 후보 | 구조 | 장점 | 단점 | 권장 |
|---|---|---|---|---|
| A | 기존 메뉴 유지 + 매장 취급제품 추가(상품·거래에 5~6항목) | 기존 동선 유지, 통합뷰 신규 | 제품 메뉴 과다, 혼란 | △ |
| **B(변형)** | 상품·거래에 **매장 취급제품(통합 조회)** 추가 + 기존 내 매장 제품/매장 자체 제품은 **수정 동선으로 유지**. 통합 화면 내부 탭(전체/O4O/자체) | 사용자 관점 명확, 수정 동선 보존, route 무변경 | 메뉴 1개 증가(과도기) | **권장** |
| C | 라벨만 정리(내 매장 제품→취급 중인 O4O 제품), 통합뷰 보류 | 구현 부담 최소 | "전체 취급 제품" 단일 화면 부재 | 보류 |

> B 변형: 통합 뷰는 **읽기 허브**, 등록/수정은 기존 `/my-products`·`/commerce/local-products` 로 이동. 사용 정착 후 기존 2메뉴를 통합 화면 내부 탭으로 흡수하는 것은 **후속**(데드링크 0 유지).

---

## 6. (14.4) 구현 방식 비교

| 방식 | 설명 | 장점 | 단점 | 권장 |
|---|---|---|---|---|
| **백엔드 통합 API** | `GET /api/v1/store/handled-products` 가 두 테이블 UNION + sourceType + 채널상태 join | 정확한 검색/정렬/페이지네이션/total, org 가드 단일 | 신규 API 1개 | **권장(정식 목록)** |
| 프론트 합산 | 기존 `/store/products` + `/store/local-products` 2회 호출 후 병합 | 백엔드 변경 0 | total/정렬/페이지네이션 부정확, 대량 시 성능 | △(초간단 PoC만) |
| 단순 링크 허브 | 통합 목록 없이 두 관리 화면 링크 카드 | 가장 안전 | "전체 취급 제품" 미제공 | 폴백 |

권장: **백엔드 통합 조회 API**. 응답에 `sourceType/sourceId/name/imageUrl/originLabel/displayPrice/statusLabel + tabletExposure/onlineSalesExposure/productDescription` + pagination. 채널상태는 V1 신뢰 3종만.

---

## 7. (15) 중점 질문 12개 답변

| # | 질문 | 답 |
|---|---|---|
| 1 | "매장 취급제품" V1 범위 | listing + local **통합 조회**(읽기) + 채널 상태 3종(타블렛/온라인몰/상품설명) + 원본 관리 화면 링크 |
| 2 | 포함 소스 | `organization_product_listings`(is_active) + `store_local_products`(is_active) |
| 3 | 같은 표 표시 가능? | ✅ (sourceType 컬럼 + 공통 필드, 가격/상태/등록주체 정규화) |
| 4 | 공통/정규화 필드 | 공통: 이름·이미지·활성·수정일 / 정규화: 가격(표시가)·상태(표시상태+원본)·등록주체 |
| 5 | 서버 통합 API vs 프론트 합산 | **서버 통합 API 권장**(정렬/검색/페이지네이션/total) |
| 6 | 타블렛 노출 제품별 표시? | ✅ `store_tablet_displays`(both) — 노출/일부/미노출 |
| 7 | 온라인몰 노출 제품별 표시? | listing ✅(`organization_product_channels`), local ❌ |
| 8 | 매장 자체 제품 온라인몰 배치 가능? | **❌ 불가**(Display Domain hardening). "미지원"으로만 표시 |
| 9 | 직접 수정 vs 원본 이동 | **V1=원본 관리 화면 이동**(연결형). 직접 CRUD 안 함 |
| 10 | 기존 메뉴 유지 vs 흡수 | V1 **유지(수정 동선)** + 통합 조회 허브 추가, 흡수는 후속 |
| 11 | '내 매장 제품' 라벨 변경 시점 | 통합 뷰 도입과 함께 '취급 중인 O4O 제품' 류로(혼동 감소) — 작은 후속 WO |
| 12 | 후속 WO 안전 분할 | §9 참조 (조회뷰 V1 / 채널확장 / 라벨) |

---

## 8. 구현 위험

| 위험 | 내용 | 대응 |
|---|---|---|
| 온라인몰 오표기 | local 을 "온라인몰 배치 가능"으로 표시하면 결제 불가 제품 노출 | **"미지원" 고정**(§4·Q8) |
| 가격 의미 혼동 | listing(판매가/공급가/이벤트) vs local(표시가) | 목록은 "표시 가격" 단일, 의미는 원본 화면 |
| 상태 의미 혼동 | listing 복합 상태(승인/이벤트) vs local 단순 | 표시상태 정규화 + 원본상태 tooltip |
| 채널 과표기 | QR/POP/블로그 제품 역참조 불가인데 "활용 중"으로 오인 | V1 제외 또는 "활용 가능"(정적), 정확 표시는 derivation 후속 |
| 공유 컴포넌트 영향 | StoreProductsManagerPage 등 공유 | **신규 화면/API 로 분리**, 기존 컴포넌트 미수정 |
| 페이지네이션 | UNION total/정렬 | 백엔드 API 에서 처리(프론트 합산 지양) |

---

## 9. (17) 후속 WO 제안

1. **`WO-O4O-KPA-STORE-HANDLED-PRODUCTS-UNIFIED-VIEW-V1`** (조회뷰 V1)
   - 백엔드 `GET /api/v1/store/handled-products`(UNION + 채널상태 3종 + pagination/search) + KPA 신규 화면(매장 취급제품, 출처/상태/표시가/타블렛·온라인몰·상품설명 상태 + 원본 관리 이동). local 온라인몰="미지원" 고정. 메뉴 IA 후보 B 적용.
2. **`WO-O4O-KPA-STORE-PRODUCT-LABEL-CLARIFICATION-V1`** (라벨, 소규모)
   - '내 매장 제품' → '취급 중인 O4O 제품'. storeMenuConfig KPA 블록 라벨만.
3. **`WO-O4O-KPA-STORE-HANDLED-PRODUCTS-CHANNEL-EXPOSURE-V1`** (채널 확장, 후속)
   - QR/POP/블로그 제품 파생 기록(derivation table 또는 product_id FK) → 통합 뷰에 정확한 활용 상태 표시. 선행 설계 필요.

---

## 10. 이번 IR 비범위 / 완료 기준

- 비범위: 신규 API/화면/메뉴/route/DB/migration/라벨 변경 — 모두 후속. read-only.
- 완료: 매장 취급제품 정의 확정(§1) · 필드 공통/차이(§3) · 채널 표시 가능성(§4) · 조회 방식 권장(§6) · 메뉴 IA 후보(§5) · V1 범위 확정(§1·§7) · 위험(§8) · 후속 WO(§9) ✅

---

## 11. 참고 파일

- 엔티티/마이그레이션: `store-local-product.entity.ts`, `organization-product-{listing,channel}.entity.ts`, `ProductMaster.entity.ts`, `SupplierProductOffer.entity.ts`, `SharedProductDescription.entity.ts`, `store-tablet-display.entity.ts`, `migrations/20260224300000-HardenStoreLocalProductDomain.ts`
- 컨트롤러: `store-channel-products.controller.ts`(listing-only 채널), `store-tablet.routes.ts`(product-pool/displays), `shared-product-description.controller.ts`(master 기준), `store-qr-landing.controller.ts`/`store-pop.controller.ts`/`blog.controller.ts`(약한 참조)
- 선행: `IR-O4O-KPA-STORE-PRODUCT-MENU-AND-LOCAL-PRODUCT-IA-AUDIT-V1.md`, `WO-O4O-KPA-STORE-PRODUCT-MENU-IA-REORG-V1`
