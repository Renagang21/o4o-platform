# IR-O4O-PRODUCT-IMAGE-TO-DESCRIPTION-START-POINT-AUDIT-V1

> **목적**: 제품 이미지를 입력받아 → 기존 제품 검색 → (있으면) 설명서 제작·등록 / (없으면) 신규 등록 후 설명서 제작 → QR-code로 사용 가능한 상태로 연결하는 흐름의 **첫 구현 시작 지점**을 찾는 사전 조사.
>
> **성격**: read-only 정적 코드 분석. DB write / migration / 새 API 구현 / 설명서 생성 실행 / QR 구조 재설계 없음.
>
> **날짜**: 2026-07-09 · **상태**: 조사 완료 (구현 전 사전 확인)

---

## 대상 흐름

```text
제품 이미지 입력
→ O4O 기존 제품 검색
→ 기존 제품이 있으면 그 제품에 설명서 제작·등록
→ 없으면 신규 제품 등록 후 설명서 제작·등록
→ 설명서를 QR-code로 사용할 수 있는 상태로 연결
```

**결론 요약**: 5개 단계 중 **검색·신규등록·설명서 저장 3개 축은 코드가 이미 완비**되어 있다. 비어 있는 링크는 딱 3곳 — ① OCR 텍스트 → 구조화 제품 필드 파싱, ② 설명서 → 매장용 안내물 디자인 조판, ③ 설명서(SPD) → QR 연결. 이 중 **③(QR 연결)이 스키마 변경 없이 가장 저렴하게 닫을 수 있는 첫 구현 지점**이다.

---

## 1. 제품 검색은 어디서 시작하면 되는가?

**- API (존재함):**
- 매장 검색: `GET /api/v1/store/products/search` — [store-product-library.controller.ts:117](../../apps/api-server/src/routes/o4o-store/controllers/store-product-library.controller.ts#L117) (guard: `requireAuth + requireStoreOwner`, 파라미터 `q/categoryId/brandId/classification/page/limit`)
- 공급자·Admin 라이브러리 검색: `GET /api/v1/neture/products/library/search` — [product-library.controller.ts:29](../../apps/api-server/src/modules/neture/controllers/product-library.controller.ts#L29)
- 바코드 단건: `GET /api/v1/neture/masters/barcode/:barcode` — [neture.routes.ts:359](../../apps/api-server/src/modules/neture/neture.routes.ts#L359) / admin판 [admin.controller.ts:605](../../apps/api-server/src/modules/neture/controllers/admin.controller.ts#L605)
- 서비스 코어: `NetureService.searchProductMasters` [neture.service.ts:472](../../apps/api-server/src/modules/neture/neture.service.ts#L472), `getProductMasterByBarcode` [neture.service.ts:440](../../apps/api-server/src/modules/neture/neture.service.ts#L440)
- 후보 매칭 4단계 로직(식별자→정규화식별자→`product_masters.barcode` fallback→이름 ILIKE): `product-candidate.service.ts:318` `computeMatch`

**- UI (존재함):**
- Admin: [ProductMastersPage.tsx](../../apps/admin-dashboard/src/pages/o4o-product-db/ProductMastersPage.tsx), [ProductCandidatesPage.tsx](../../apps/admin-dashboard/src/pages/o4o-product-db/ProductCandidatesPage.tsx) (API 클라이언트 `o4o-product-db.api.ts:216` → library/search)
- Store/Supplier(web-neture): `StoreProductLibraryPage.tsx`, `SupplierProductLibraryPage.tsx`

**- 부족한 점:** 없음. 제품명·바코드 검색은 API·UI 모두 완비. **이미지→(바코드/이름)로 넘어가는 앞단만 비어 있음** (조사 2-D 참조).

---

## 2. 기존 제품이 없을 때 등록은 어디서 시작하면 되는가?

**- ProductMaster 직행 가능 여부 (조건부 가능):**
- `POST /api/v1/neture/admin/masters/resolve` — [admin.controller.ts:625](../../apps/api-server/src/modules/neture/controllers/admin.controller.ts#L625), 서비스 `catalog.service.ts:101` `resolveOrCreateMaster(barcode, manualData?)`.
- **제약: barcode를 필수 키로 요구.** 순수 이미지-only(바코드 없음) 신규 Master 직접 생성 경로는 없음.

**- ProductCandidate 경유 필요 여부 (권장 경로):**
- 후보 생성: `POST /api/v1/operator/product-candidates` — [product-candidate.controller.ts:126](../../apps/api-server/src/modules/neture/controllers/product-candidate.controller.ts#L126) (`candidateImageUrl/candidateName/identifierType/Value/rawPayload` 수용)
- 신규 Master 승격: `POST /api/v1/operator/product-candidates/:id/promote-master` — [product-candidate.controller.ts:174](../../apps/api-server/src/modules/neture/controllers/product-candidate.controller.ts#L174), 서비스 `approveAsNewProductMaster` [product-candidate.service.ts:790](../../apps/api-server/src/modules/neture/services/product-candidate.service.ts#L790)
- **제약: 현재 승격 게이트(`evaluatePromotable`)가 사실상 drug 소스(HIRA_DRUG_MASTER) 전용.** 일반 이미지-수집 후보 승격은 게이트에서 막힐 수 있음 → 확장 필요 지점.

**- 권장:** 이미지 기반(비의약품 제품 단위) 흐름은 **바코드가 있으면 `resolve`, 없으면 `ProductCandidate` 경유**가 자연스럽다. Candidate는 이미지·이름을 그대로 수용하므로 이미지 입력과 궁합이 좋다. 단 비-drug 후보 승격 게이트는 별도 확장이 필요하다.

---

## 3. 제품 설명서는 어디에 저장하면 되는가?

**- 관련 테이블/API (존재함):**
- **canonical 설명서 = `shared_product_descriptions` (SPD)**: 엔티티 [SharedProductDescription.entity.ts](../../apps/api-server/src/modules/neture/entities/SharedProductDescription.entity.ts). `content`=**HTML text**, `master_id` FK, `description_type ∈ {B2B,B2C,STORE,SUPPLIER_STORE}`, `status ∈ {candidate,canonical,hidden,needs_review,deprecated}`.
- write API: `POST /api/v1/admin/shared-product-descriptions/by-master/:masterId` (`createCandidate`), `PATCH /:id/canonical` (`setCanonical`), `POST /by-master/:masterId/seed` — [shared-product-description.controller.ts](../../apps/api-server/src/modules/neture/controllers/shared-product-description.controller.ts) / 서비스 [shared-product-description.service.ts](../../apps/api-server/src/modules/neture/services/shared-product-description.service.ts). content는 jsdom+DOMPurify로 sanitize 후 저장.
- **AI 초안(ProductMaster 부재 후보용) = `product_candidate_description_drafts`**: 엔티티 [ProductCandidateDescriptionDraft.entity.ts](../../apps/api-server/src/modules/neture/entities/ProductCandidateDescriptionDraft.entity.ts). `content_json`=jsonb 구조화 블록 + `content_html`. 컨트롤러는 현재 **read-only(GET only)**.

**- ProductMaster 연결 방식:**
- SPD → ProductMaster 단방향 nullable `@ManyToOne('ProductMaster', onDelete: CASCADE)` on `master_id`. **ProductMaster 구조 무변경(F12 준수)**.
- canonical key = **(master_id, description_type)** 조합, status='canonical' — partial unique index로 DB 레벨 보장 (`20261223000000-AddDescriptionTypeToSharedProductDescriptions`).

**- 기존 설명서 기준 문서 위치:**
- 진입점: [docs/guides/common/DOCUMENT-INDEX.md](../guides/common/DOCUMENT-INDEX.md) (5축: common/content-authoring/ai/products/services)
- 제품 단위 트랙: `docs/guides/products/O4O-PRODUCT-UNIT-DESCRIPTION-AGENT-GUIDE-V1.md`, `...-REGISTRATION-FROM-PHOTO-AGENT-GUIDE-V1.md`
- 축별: `docs/guides/products/{drug,medical-device,quasi-drug,health-functional-food}/`

---

## 4. 설명서 디자인은 현재 가능한가?

**- 가능 (렌더 훅 존재):**
- Admin 미리보기: [DescriptionReviewDetailPage.tsx](../../apps/admin-dashboard/src/pages/o4o-product-db/DescriptionReviewDetailPage.tsx) — content를 `dangerouslySetInnerHTML` + `prose prose-sm`으로 렌더. canonical 승격/반려 액션 포함.
- ProductMaster 상세: [ProductMasterDetailPage.tsx](../../apps/admin-dashboard/src/pages/o4o-product-db/ProductMasterDetailPage.tsx) — "공식 소비자 설명" 패널 canonical HTML 렌더.
- Store/public 노출: `store-public-utils.ts` — canonical(`status='canonical' AND description_type='STORE'`) LEFT JOIN 우선 노출.

**- 부족:**
- **"canonical 설명서를 전문 매장용 안내물(리플렛/인쇄물)로 조판하는 전용 템플릿·컴포넌트는 없음.** 존재하는 렌더는 admin 검토용 `prose` 뷰와 storefront/태블릿 공개 노출(HTML 그대로)뿐.
- `DescriptionReviewDetailPage`의 경고 배너("e약은요 공식 원문이며 매장용 최종 설명이 아니다")가 **매장용 디자인 적용이 별도 미구현 단계임을 스스로 명시**.
- 저장 방식이 혼재: canonical=HTML 단일 필드, AI초안=구조화 JSON. 통일된 "콘텐츠 블록" 모델 없음.

**- 필요한 최소 작업:** SPD `content`(HTML)를 입력으로 하는 매장용 안내물 렌더 템플릿을 `DescriptionReviewDetailPage`의 HTML 렌더 지점 또는 store 노출 계층 위에 신설. (첫 구현에서는 필수 아님 — 기존 `prose` 렌더로도 QR 연결까지 도달 가능)

---

## 5. QR-code 연결은 현재 가능한가?

**- 현재 상태: SPD → QR 직접 연결은 미구현(deferred).**
- QR 대상 화이트리스트 `landing_type ∈ {product, promotion, page, link, video}` — `store-qr-landing.controller.ts:788`. **SPD/description 없음.**
- 운영자 템플릿 콘텐츠 kind `{blog, cms, pop, content_hub}` — `operator-qr-template.entity.ts:73`. **SPD 없음.**
- `product-description-qr-summary.controller.ts`가 QR 상태를 `qr: { exists:false, deferred:true }`로 반환하며 "master↔QR 직접 매핑 테이블 없음, 후속 WO로 분리" 명시.

**- 실제 사용 공개 경로:**
- **`/qr/{slug}`** (매장 QR canonical) — [store-qr-landing.controller.ts:110](../../apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts#L110) `GET /qr/public/:slug`
- **`/multilingual-products/:publicKey`** (다국어 상품 전용)
- **`/r/{resourceId}` 는 baseline(F12) 설계 목표일 뿐 라우트 미구현.**

**- store_qr_codes 스키마 정정:** 대상 종류는 **`landing_type` 단일 컬럼**으로 표현되고 `landing_target_id`(varchar 500, 비-UUID 링크도 수용)가 대상 식별자. **`landing_target_type` 컬럼은 존재하지 않음.** QR 이미지는 비저장·동적생성(F12 준수), slug row만 저장.

**- 최소 연결 지점 (스키마 변경 없이, 회귀 위험 최소순):**
1. **`landing_type='link'` 브리지** — SPD 공개 URL(신규 alias 또는 `/r/{id}`)을 만들어 `store_qr_codes`에 `link` 타입 + `landing_target_id`(varchar 500)에 permalink 저장. 스키마 무변경. 가이드 문서(`O4O-PRODUCT-UNIT-DESCRIPTION-AGENT-GUIDE-V1.md:133`)도 이 방식 언급.
2. **`landing_type='page'` 브리지** — SPD를 매장 사본(store_execution_assets)으로 copy-on-import 후 page QR. copy-on-import 불변식 필요(무거움).
3. **다국어 경로 재사용** — `store_multilingual_product_content_groups`에 SPD를 소스로 투입 → `/multilingual-products/:publicKey`.

---

## 6. 바로 시작할 구현 WO 제안

> **원칙**: 검색·등록·설명서 저장 3축은 재사용, 신규 코드는 "비어 있는 링크"에만. F12(ProductMaster 무변경 / QR 비저장) 및 copy-on-import 불변식 준수. **스키마 변경 없는 경로 우선.**

**- 1단계 (QR 링크 브리지 — 가장 저렴한 첫 성과):**
`WO-O4O-PRODUCT-DESCRIPTION-QR-LINK-MINIMAL-V1` — SPD canonical을 공개 렌더하는 read-only 경로(신규 alias 또는 기존 storefront 노출 재사용)를 확정하고, 그 URL을 `landing_type='link'`로 `store_qr_codes`에 연결하는 최소 브리지. 스키마 변경 없음. 산출: 제품 상세/설명서 화면의 "QR 만들기" 액션 1개.

**- 2단계 (이미지 → 제품 필드 어댑터):**
`WO-O4O-PRODUCT-OCR-TO-CANDIDATE-FIELD-ADAPTER-V1` — `ProductOcrService.getCombinedOcrText`(store-ai, [product-ocr.service.ts](../../apps/api-server/src/modules/store-ai/services/product-ocr.service.ts) — 이미 배선됨) 출력을 파싱해 제품명/제조사/바코드 후보 필드로 구조화하고, `computeMatch` 검색 → no_match 시 `ProductCandidate` 생성으로 잇는 어댑터. 비-drug 후보 승격 게이트 확장 포함 검토.

**- 3단계 (매장용 안내물 디자인 템플릿):**
`WO-O4O-STORE-DESCRIPTION-LEAFLET-TEMPLATE-V1` — SPD `content`(HTML)를 입력으로 하는 전문 매장용 안내물 렌더 템플릿을 store 노출 계층 위에 신설. (1·2단계 완료 후, 품질 단계)

---

## 관련 기존 문서

- 정책/설계: [O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md](../baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md) (F12, `/r/{id}` 목표)
- 선행 감사: `docs/investigations/IR-O4O-PRODUCT-UNIT-PHOTO-TO-DESCRIPTION-QR-FLOW-AUDIT-V2.md`, `docs/work-orders/IR-O4O-PRODUCT-TO-QR-FLOW-AUDIT-V1.md`
- 가이드: [docs/guides/common/DOCUMENT-INDEX.md](../guides/common/DOCUMENT-INDEX.md), `docs/guides/products/O4O-PRODUCT-UNIT-REGISTRATION-FROM-PHOTO-AGENT-GUIDE-V1.md`

---

*read-only 조사. DB write 0 · migration 0 · 신규 API 0. 다음 착수는 별도 지시 시.*
