# CHECK-O4O-KPA-STORE-PRODUCT-MULTILINGUAL-BADGES-PILOT-V1

WO: **WO-O4O-KPA-STORE-PRODUCT-MULTILINGUAL-BADGES-PILOT-V1**
작업 제목: KPA 매장 상품 다국어 콘텐츠 연결 상태 배지 파일럿

## 1. 목적

QR 랜딩 전 단계로, store-owner 가 매장 상품 목록/상세에서 해당 상품에
store-scoped 다국어 콘텐츠가 연결되어 있는지(지원 언어 수/목록)를 눈으로 확인할 수 있게 한다.
콘텐츠 제작/가져오기 기능 확장이 아니라 **관찰성(observability)** 작업이다.

## 2. 조사 결과 (선행 구조)

- 엔티티: `store_multilingual_product_content_groups` / `store_multilingual_product_content_pages`
  - 핵심 컬럼: `target_kind`(local|listing), `target_id`, `content_key`(default), `status`, `source_type`, locale별 page
- 기존 store-owner API: `/api/v1/kpa/pharmacy/multilingual-product-contents` (+ `/hub`, `/import`, `/:groupId/resolve`)
  - 컨트롤러: `apps/api-server/src/routes/o4o-store/controllers/multilingual-product-content.controller.ts`
  - 기존 목록 GET 은 **단일 targetId** 필터만 지원 → 목록 배지에 그대로 쓰면 **N+1** 발생
- 프론트 (web-kpa-society):
  - 매장 취급 상품(local): `pages/pharmacy/StoreLocalProductsPage.tsx` (BaseTable), targetId = `store_local_products.id`
  - O4O 주문 가능 상품(listing): `pages/pharmacy/PharmacyB2BPage.tsx` (DataTable), targetId = `organization_product_listings.id`(=listingId)
  - Store Hub 가져오기 UI 이미 존재: `/store-hub/multilingual-product-contents` (HubMultilingualContentLibraryPage) + `/my`

## 3. 문제 확정 / 결정

목록 화면에서 상품별 배지를 N+1 없이 표시하려면 집계 API 가 필요하다.
→ 공유 컨트롤러에 **org-scoped summary 엔드포인트 1개**를 최소 추가한다.

```
GET /pharmacy/multilingual-product-contents/summary?targetKind=local|listing
→ { success, data: [{ groupId, targetKind, targetId, title, status, sourceType,
                       defaultLocale, updatedAt, locales[], localeCount, publishedLocaleCount }] }
```

- `content_key='default'` 한정, `status<>'archived'` 만 집계 (V1 범위)
- 컨트롤러는 kpa/cosmetics/glycopharm 공통이므로 GP/KCos backend 에도 동일 라우트가 생기지만
  **프론트에서 호출하는 곳은 web-kpa-society 뿐** → GP/KCos UX 무변경 (Shared Module 정책 준수: KPA-only 포크 대신 공통 엔드포인트 추가)

## 4. 변경 파일

### Backend (1)
- `apps/api-server/src/routes/o4o-store/controllers/multilingual-product-content.controller.ts`
  - `/summary` GET 엔드포인트 추가 (메인 목록 GET 직후, `/hub` 앞). 정적 경로라 `:groupId` 라우트와 무충돌.

### Frontend (web-kpa-society, 4)
- `src/api/multilingualProductContentStore.ts` — `StoreMlcSummaryItem` 타입 + `getMlcSummaryMap(targetKind)` 추가
- `src/components/MultilingualContentBadge.tsx` — 신규 공용 배지 컴포넌트 (`localeLabel` export)
- `src/pages/pharmacy/StoreLocalProductsPage.tsx` — summary 조회 + "다국어" 컬럼 + 편집 모달 상세 패널(연결/빈상태 Store Hub 링크)
- `src/pages/pharmacy/PharmacyB2BPage.tsx` — summary 조회 + "다국어" 컬럼

연결 없는 상품: 목록은 배지 미표시(과도 표시 방지), 상세(모달)는 안내 문구 + Store Hub 링크.
QR 관련 문구 미사용 (후속 단계 안내만 약하게 표기).

## 5. 검증

- web-kpa-society `tsc --noEmit`: **error 0**
- api-server `tsc --noEmit`: **error 0**
- 기능 smoke: 배포 후 KPA store-owner 브라우저 검증 예정 (renagang21 = ACTIVE 상품 보유 계정 기준)

## 6. 후속

PASS 시: WO-O4O-MULTILINGUAL-PRODUCT-QR-LANDING-V1 → TABLET-CONTENT → CROSS-SERVICE-ADOPTION
