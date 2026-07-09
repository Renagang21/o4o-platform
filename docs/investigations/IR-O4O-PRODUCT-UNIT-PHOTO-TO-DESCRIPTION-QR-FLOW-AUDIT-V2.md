# IR-O4O-PRODUCT-UNIT-PHOTO-TO-DESCRIPTION-QR-FLOW-AUDIT-V2

> 상태: 조사 완료 (read-only) · 작성일 2026-07-09
> 대응 WO: `WO-O4O-PRODUCT-UNIT-PHOTO-TO-DESCRIPTION-QR-GUIDE-AND-FLOW-AUDIT-V2`
> 성격: **설계·조사 전용 IR (역사·불변)**. 코드/DB 무변경. 운영 규칙은 Guide/Registry에서 관리.

---

## 1. 조사 목적

제품 사진만 제공했을 때 다음 흐름을 agent가 진행할 수 있는지, 현재 O4O 구조를 조사한다.

```text
제품 사진 → 정보 추출 → 기존 제품 존재 확인 → 분류 결정 → 제품 등록
→ 한국어 설명서 + 디자인 → 중국어 설명서 + 디자인 → 언어별 QR → 제품 리스트 후속 액션
```

이번 트랙 대상은 **의약품을 제외한 제품 단위 트랙**(건강기능식품 / 일반식품 / 기타 일반 제품)이다. 의약품은 성분·함량·제형·투여경로·허가사항 기준 **공통 그룹 설명서**로 관리하는 별도 특수 트랙이다.

---

## 2. 결론 요약 (Executive Summary)

| 단계 | 현재 상태 | 판정 |
|---|---|---|
| 제품 사진 업로드/저장 | `media_assets` + MediaPicker 완비 | ✅ 재사용 |
| 사진 → 정보 추출(OCR) | Google Vision OCR 코드 **존재하나 미배선(dormant)**, 바코드 인식 없음 | ⚠️ 후속 구현 필요 |
| 바코드/식별자 조회 | `product_identifiers.normalizedValue` + `normalizeIdentifier` | ✅ 재사용 |
| 기존 제품 존재 확인 | ProductMaster 검색 API (`/store/products/search`, `/neture/products/library/search`) | ✅ 재사용 |
| 제품 분류 | `regulatoryType`/`drugCategory` + `deriveProductClassification` | ⚠️ 부분 (일반식품 미분리) |
| 제품 등록(신규 Master) | candidate → `approveAsNewProductMaster` (**현재 drug-gated**), 직접 non-drug 생성 API/UI 없음 | ⚠️ 후속 구현 필요 |
| 매장 취급 등록 | `POST /store/products/list` (masterId, idempotent) · StoreLocalProduct CRUD | ✅ 재사용 |
| 설명서 저장 | SPD (`shared_product_descriptions`, master 단위, language 필드 존재) | ✅ 재사용 (한계 있음) |
| 다국어(ko/zh) 판매 콘텐츠 | `store_multilingual_product_content_groups/pages` **이미 완비** | ✅ 재사용 (권장 저장소) |
| 디자인 템플릿 | 전용 template 엔티티 없음. `content_format`/`usage_type`/jsonb로 표현 | ⚠️ 부분 |
| QR 생성/연결 | `store_qr_codes` + `/qr/:slug` 동적 생성, content id 타깃 가능 | ✅ 재사용 |
| 언어별 QR | QR 엔티티에 locale 컬럼 **없음**. 다국어 서브시스템은 별도 publicKey로만 접근 | ⚠️ 브리지 필요 |
| 제품 리스트 QR 액션 | 콘텐츠 리스트엔 인라인 QR 있음, **취급제품(handled-products) 리스트엔 행별 QR 액션 없음** | ⚠️ 후속 구현 필요 |

**핵심 판단**: 조회·매장 등록·설명서 저장·다국어 콘텐츠·QR 생성의 **저장 계층은 대부분 이미 존재**한다. 부족한 것은 (1) 사진→정보 자동 추출(OCR 배선), (2) non-drug 신규 Master 직접 생성 경로, (3) 다국어 콘텐츠↔QR 브리지, (4) 제품 리스트 행별 설명서/QR 액션 UI 이다.

---

## 3. 현재 가능한 흐름 (As-Is, 저장 계층)

### 3.1 제품 등록 구조

| 개념 | 엔티티 / 테이블 | 파일 | 비고 |
|---|---|---|---|
| ProductMaster (SSOT) | `product_masters` | `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts` | 물리제품 1 = barcode 1 = master 1. barcode·regulatory·MFDS 필드 **불변** |
| ProductIdentifier | `product_identifiers` | `apps/api-server/src/modules/neture/entities/ProductIdentifier.entity.ts` | `normalizedValue` = 검색/dedup 키. type: GTIN/EAN13/... |
| StoreLocalProduct (매장 자체) | `store_local_products` | `apps/api-server/src/routes/platform/entities/store-local-product.entity.ts` | 진열 도메인. barcode는 메모용(스캔/OCR/dedup 없음) |
| OrganizationProductListing (O4O 채택) | `organization_product_listings` | `apps/api-server/src/modules/store-core/entities/organization-product-listing.entity.ts` | master_id/offer_id, is_active |
| 취급제품 통합 read | (UNION) | `apps/api-server/src/routes/platform/store-handled-products.routes.ts` | `GET /handled-products` (listing + local) |
| MobileProductDraft (사진 수집) | (draft) | `apps/api-server/src/modules/neture/entities/MobileProductDraft.entity.ts` | 사진/식별자 수집 → candidate. **직접 master 생성 안 함** |

**등록 관련 API**
- `GET /api/v1/store/products/search` — ProductMaster 검색 (q/category/brand/classification) — `store-product-library.controller.ts`
- `POST /api/v1/store/products/list` — masterId 기반 매장 취급 등록 (offer_id NULL, idempotent) — 재사용 가능
- `GET /api/v1/neture/products/library/search` — admin ProductMaster 검색 — `product-library.controller.ts`
- `POST /operator/product-candidates/:id/promote-master` — candidate → master 승격 (`approveAsNewProductMaster`, **현재 drug 소스로 게이트**)
- `POST /store/tablets/products/register-by-barcode` — 바코드 스캔 → master lookup 참조 흐름

**프론트**
- 매장 자체 진열: `/store/commerce/local-products` (`StoreLocalProductsPage.tsx`, 공용 `packages/store-ui-core/.../StoreLocalProductsManager.tsx`)
- O4O 표준 채택: `/store/my-products`, 모달 `AddO4oStandardProductModal.tsx` (KPA)
- 취급제품 통합: `/store/handled-products` (`StoreHandledProductsPage.tsx`)
- admin 조회 콘솔: `/admin/o4o-product-db/*` (masters는 **read-only**, 직접 생성 폼 없음)

### 3.2 제품 분류 구조

- 중심 로직: `apps/api-server/src/modules/neture/utils/product-type.util.ts`
- `regulatoryType`(varchar): `DRUG / QUASI_DRUG / HEALTH_FUNCTIONAL / MEDICAL_DEVICE / COSMETIC / GENERAL`
- `drugCategory`: `non_drug / otc / rx / quasi_drug / drug_unspecified`
- 표시 분류(`deriveProductClassification`): `otc`=일반의약품, `rx`=전문의약품, `quasi`=의약외품, `health_functional`=건강기능식품, `medical_device`=의료기기, `cosmetic`=화장품, `general`=일반·기타, `unknown`=미분류
- **매핑**: 건강기능식품 → `HEALTH_FUNCTIONAL`, 의약품 → `DRUG`(+otc/rx), 의약외품 → `QUASI_DRUG`, 의료기기 → `MEDICAL_DEVICE`(+ grade 1~4)
- ⚠️ **SOURCE GAP**: `GENERAL` 은 **일반식품과 기타 일반 제품을 구분하지 못한다.** 제품 단위 트랙의 "일반식품"·"기타 제품" 세분류는 신규 과제.

### 3.3 설명서 저장 구조

| 대상 | 테이블 | 파일 | 핵심 |
|---|---|---|---|
| SPD (공용 설명자산) | `shared_product_descriptions` | `apps/api-server/src/modules/neture/entities/SharedProductDescription.entity.ts` | master_id 단위. `description_type`(B2B/B2C/STORE/SUPPLIER_STORE), `status`(candidate/canonical/hidden/needs_review/deprecated), `language`(default ko) |
| 후보 draft 풀 | `product_candidate_description_drafts` | `.../entities/ProductCandidateDescriptionDraft.entity.ts` | candidate 단위(master 이전), `review_status`, `language`, `draft_type`(store_description/pop/blog/...) |
| 다국어 판매 콘텐츠(그룹) | `store_multilingual_product_content_groups` | `apps/api-server/src/routes/platform/entities/store-multilingual-product-content-group.entity.ts` | organization 단위, target_kind(local/listing)+target_id, `default_locale`, `public_key`, status |
| 다국어 판매 콘텐츠(페이지) | `store_multilingual_product_content_pages` | `.../store-multilingual-product-content-page.entity.ts` | locale 1행씩: `ko/en/zh/ja/vi/th/id`, `content_format`(blocks/html/image_sequence/json), content/assets/buttons jsonb, unique(group_id, locale) |

**핵심 질의 응답**
- **한 제품에 ko/zh 설명서를 각각 저장 가능한가?** → YES. **권장 저장소는 `store_multilingual_product_content_pages`** (locale별 독립 페이지, unique(group_id, locale)). SPD도 `language` 컬럼이 있으나 canonical 유니크가 `(master_id, description_type)`로 language를 포함하지 않아 언어별 canonical 구분엔 부적합. SPD는 master-scope 공용(주로 ko) 설명자산.
- **설명서에 디자인/템플릿 필드가 있는가?** → 전용 template FK 없음. 다국어 page의 `content_format` + `assets`/`buttons`/`metadata` jsonb, SPD는 raw HTML `content`만.
- **draft/canonical 분리?** → YES. SPD 내 status로 분리(+ canonical 부분 유니크), master 이전 draft는 별도 테이블, 다국어 page는 자체 draft/published/archived.
- **제품 단위 vs 의약품 그룹 설명 구분?** → SPD는 항상 master_id 단위(그룹 테이블 없음). 의약품 그룹은 (성분|함량|제형) 단위로 작성 후 각 member master SPD에 canonical fan-out. 구분 신호 = `source_type`(mfds_easy_drug/drug_extension 등) + seed groupKey. **본 IR의 제품 단위 트랙은 그룹 fan-out 없이 master별 직접 작성.**

### 3.4 미디어 / 이미지 / OCR

- `media_assets` — `apps/api-server/src/modules/media/entities/MediaAsset.entity.ts`, 버킷 `o4o-media-library`, sharp 처리, metadata(title/tags/language/usage_type/status) 검색. 업로드: `media-library.service.ts`
- MediaPicker: 공용 `packages/store-ui-core/src/components/media/MediaPickerModal.tsx` + 서비스별 사본
- **OCR**: `apps/api-server/src/modules/store-ai/services/product-ocr.service.ts` (Google Vision `TEXT_DETECTION`) + 테이블 `product_ocr_texts` **존재하나, `new ProductOcrService()` 호출처 0건 = 배선 안 됨(dormant)**. 읽기 경로(AI content/tag가 `product_ocr_texts`를 옵션 입력으로 소비)만 배선됨.
- **바코드/라벨 이미지 인식**: 없음. 모바일 수집(`services/mobile-app/.../collect/new.tsx`)은 사진만 캡처, 인식 없음.

### 3.5 디자인 콘텐츠 / QR

- `store_qr_codes` — `apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts`. `landing_type`, `landing_target_id`(varchar), `slug`(전역 유니크), consultation CTA 필드. **QR 이미지 비저장·온디맨드 생성**(`services/qr-print.service.ts`, `qrcode` lib).
- 공개 경로: **`/qr/:slug`** (`services/web-kpa-society/src/pages/qr/QrLandingPage.tsx`), 데이터 API `GET /api/v1/kpa/qr/public/:slug`, 핸들러 `store-qr-landing.controller.ts`.
- landingType: `product / promotion / page / link / video`(+ 렌더러 `tablet`). content id 타깃 가능(`page` + landingTargetId → store_execution_assets/kpa_store_contents). 원본→사본 가드 `qr-content-hub-copy.service.ts`.
- 렌더러: `@o4o/content-editor` `ContentRenderer`(HTML) + `@o4o/block-renderer` fallback.
- **언어별 QR**: `store_qr_codes`에 locale 컬럼 없음(감사 `IR-O4O-KPA-QR-MULTILINGUAL-LANGUAGE-OPTION-AUDIT-V1.md`). 다국어 서브시스템은 자체 `publicKey` URL(`GET /public/multilingual-product-contents/:publicKey?locale=`)로만 접근, `/qr/:slug`와 미연결. **권장 브리지(미구현)**: `landingType='link'` → publicKey URL, 또는 QR에 locale/그룹 타깃 신설.
- locale enum은 `zh`(zh-CN 아님) 사용 중 — 트랙 표준화 필요.
- **제품 리스트 QR 액션**: 콘텐츠 리스트엔 인라인 QR 생성 있음(`StoreQrCreateModal.tsx`). **취급제품 리스트(`StoreHandledProductsPage.tsx`)엔 행별 QR 생성/보기 없음.**

---

## 4. 현재 없는 기능 (Gap)

1. **사진 → 정보 자동 추출 파이프라인 (배선)** — Vision OCR 코드는 있으나 미배선. 바코드/라벨 인식 없음.
2. **non-drug 신규 ProductMaster 직접 생성 경로** — 승격이 drug 소스로 게이트됨, admin 직접 생성 폼 없음.
3. **일반식품/기타 제품 세분류** — `GENERAL`이 둘을 구분 못함.
4. **다국어 콘텐츠 ↔ QR 브리지** — `/qr/:slug`가 다국어 그룹/locale을 인식 못함.
5. **제품 리스트 행별 설명서/QR 액션 UI** — 취급제품 리스트에 없음.
6. **설명서 디자인 템플릿 1급 엔티티** — 없음(jsonb/usage_type로 우회 중).

---

## 5. 재사용 가능한 API/UI (요약)

- 사진 저장: `media_assets` + MediaPicker
- 식별자 조회: `product_identifiers.normalizedValue` + `normalizeIdentifier`
- Master 검색: `/store/products/search`, `/neture/products/library/search`
- 매장 등록: `POST /store/products/list`(masterId), StoreLocalProduct CRUD
- 다국어 저장: `store_multilingual_product_content_*` (ko/zh page)
- QR 생성/공개: `POST /pharmacy/qr`, `/qr/:slug`, 온디맨드 이미지/PDF export

---

## 6~10. 저장·언어·디자인·QR·리스트 가능 여부

- **6. 제품 등록 구조**: master 직접 생성은 candidate 승격 경유(현 drug-gated). 매장 등록은 즉시 가능.
- **7. 설명서 저장 구조**: SPD(master, ko 중심 공용) + 다국어 page(store, locale별).
- **8. 언어별 설명서**: 가능(다국어 page 권장). locale 표준 `zh` 정렬 필요.
- **9. 디자인 콘텐츠**: content_format/jsonb로 표현 가능, 전용 템플릿 엔티티는 없음.
- **10. QR 생성/연결**: 단일 언어 콘텐츠는 완전 가능. 언어별 QR은 브리지 신설 필요.
- **제품 리스트 action**: 통합 read + managePath 패턴은 있음. 행별 설명서/QR 생성 액션은 신규 UI 필요.

---

## 11. 개발 필요 항목 (우선순위)

| # | 항목 | 성격 | 규모 |
|---|---|---|---|
| D1 | 다국어 콘텐츠 ↔ QR 브리지 (`landingType=link`→publicKey 또는 QR locale 타깃) | 배선 | 소~중 |
| D2 | 제품 리스트(취급제품) 행별 "설명서 만들기/QR 만들기/보기" 액션 | 프론트 | 중 |
| D3 | non-drug 신규 ProductMaster 생성 경로(승격 게이트 완화 또는 매장 로컬 등록 우선) | 백엔드 | 중 |
| D4 | 제품 사진 OCR 배선(Vision) + 바코드 인식 | 백엔드/외부 | 중~대 |
| D5 | 일반식품/기타 제품 세분류(태그/서브카테고리) | 데이터 모델 | 소~중 |
| D6 | locale 표준 정렬(`zh` vs `zh-CN`) | 정책 | 소 |

---

## 12. 권장 후속 WO

- `WO-O4O-PRODUCT-LIST-DESCRIPTION-QR-ACTIONS-V1` (D2 — 가장 사용자 체감 큼, 저장 계층 완비되어 착수 용이)
- `WO-O4O-PRODUCT-UNIT-MULTILINGUAL-DESCRIPTION-QR-LINK-V1` (D1 — 다국어 콘텐츠↔QR 브리지)
- `WO-O4O-PRODUCT-UNIT-DESCRIPTION-DRAFT-GENERATION-V1` (설명서 초안 저장 — SPD/다국어 page 대상, 이중게이트)
- `WO-O4O-PRODUCT-UNIT-REGISTRATION-FROM-PHOTO-UI-V1` (D3 — 매장 로컬 우선, master 생성은 별도)
- `WO-O4O-PRODUCT-UNIT-PHOTO-OCR-PIPELINE-V1` (D4 — Vision 배선/바코드)
- `WO-O4O-PRODUCT-CLASSIFICATION-FOOD-SUBTYPE-V1` (D5)

---

## 13. 산출 Guide (5축 정렬)

문서 배치는 콘텐츠 문서 **5축 아키텍처**(`docs/guides/common/DOCUMENT-INDEX.md`)에 정렬한다.

- `docs/guides/products/O4O-PRODUCT-UNIT-DESCRIPTION-AGENT-GUIDE-V1.md` — 제품 단위 설명서 작성 기준(건기식/일반식품/기타 공통 + 분류별 섹션). 예제 톤(아쿠아셀 알티지 오메가-3 The Pure) 반영. `products/health-functional-food/` 스캐폴드는 본 가이드로 포인터.
- `docs/guides/products/O4O-PRODUCT-UNIT-REGISTRATION-FROM-PHOTO-AGENT-GUIDE-V1.md` — 제품 사진 기반 등록 파이프라인 기준.

> ⚠️ 본 IR은 조사·설계 기록(불변)이다. 운영 규칙 변경은 Guide/Registry에서, 구현은 후속 WO에서 수행한다. 코드·DB·QR·배포 무변경.
