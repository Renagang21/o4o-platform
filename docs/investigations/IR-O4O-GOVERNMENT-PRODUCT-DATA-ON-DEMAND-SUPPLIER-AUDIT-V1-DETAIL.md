# IR-O4O-GOVERNMENT-PRODUCT-DATA-ON-DEMAND-SUPPLIER-AUDIT-V1 — DETAIL (상세 근거)

> 상위 요약·결정 문서: [`IR-O4O-GOVERNMENT-PRODUCT-DATA-ON-DEMAND-SUPPLIER-AUDIT-V1.md`](IR-O4O-GOVERNMENT-PRODUCT-DATA-ON-DEMAND-SUPPLIER-AUDIT-V1.md)
>
> 본 문서는 그 조사의 **전체 디테일**(프론트 흐름·엔티티 스키마·필드 매핑·페이로드·기존 외부연동 자산·정부 API 실측 명세)을 파일:라인 근거와 함께 보존한다. **READ-ONLY 조사 산출물 — 코드/DB 변경 0.**
>
> 작성일: 2026-06-28 · 방법: 코드 정적 추적(병렬 4영역) + 공공데이터포털 공식 명세(서비스키 미사용).
> 표기: 직접 검증한 라인은 ✔, 보조 조사로 수집한 라인은 그대로 기재(서비스키/런타임 검증 필요 항목은 ⚠).

---

## 목차
- [A. 공급자 등록 프론트 상세](#a-공급자-등록-프론트-상세)
- [B. 상품 데이터 구조 상세](#b-상품-데이터-구조-상세)
- [C. 기존 외부·정부 연동 자산 상세](#c-기존-외부정부-연동-자산-상세)
- [D. 정부 의약품 API 실측 명세 상세](#d-정부-의약품-api-실측-명세-상세)
- [E. 바코드 식별 상충점 해소](#e-바코드-식별-상충점-해소)
- [F. on-demand 검색 설계 후보 흐름](#f-on-demand-검색-설계-후보-흐름)

---

## A. 공급자 등록 프론트 상세

### A-1. productType / regulatoryType 전달 구조
| 항목 | 근거 | 설명 |
|---|---|---|
| URL 파라미터 결정 | `SupplierProductRegisterEntryPage.tsx:40-43` | `navigate('/supplier/products/new?productType=${t.key}&regulatoryType=${t.regulatoryType}')` |
| Wizard prefill | `SupplierProductCreatePage.tsx:82,105` ✔ | `searchParams.get('productType')`→`getSupplierProductType()`; `regulatoryType` 동일 prefill(기본 'GENERAL') |
| Import Assistant 전달 | `SupplierProductCreatePage.tsx:483-491` | 도우미→등록 이동 시 동일 쿼리 |
| 유형 정의(5종) | `supplierProductTypes.ts:28-64` | non_drug / quasi_drug / otc_drug / rx_drug / unclassified → regulatoryType(GENERAL/QUASI_DRUG/DRUG/빈값) |

### A-2. 상품명 필드와 저장 위치
| 필드 | 입력 위치 | 저장 키(payload) | 근거 |
|---|---|---|---|
| marketingName(상품명) | Step1 | `name` | `:612-624` UI / `:314` 저장 ✔ |
| packagingName(포장명) | Step1(선택) | `manualData.regulatoryName` | `:595-609` / `:300` |
| regulatoryName(규제명) | Step1(규제 카테고리 필수) | `manualData.regulatoryName` | `:770-782` / `:304` |
| 바코드 hit 시 표시 우선순위 | — | `marketingName ?? regulatoryName` | `:221-223` |

**Create payload(요지, `:312-325`)**
```js
{ name: marketingName, barcode|undefined, categoryId, brandName, distributionType, serviceKeys,
  manualData: { regulatoryType, regulatoryName, mfdsPermitNumber|null, manufacturerName, specification, originCountry, stockQty },
  priceGeneral, consumerReferencePrice, consumerShortDescription, isFeatured }
```

### A-3. 제조사·브랜드·규격·포장·바코드 입력 필드
| 필드 | Step | form key | 저장 키 | 조건 | 근거 |
|---|---|---|---|---|---|
| 제조사 | 1 | manufacturerName | manualData.manufacturerName | 권장 | `:680-689` |
| 브랜드 | 1 | brandName | brandName | 권장 | `:668-677` |
| 규격 | 3 | specification | manualData.specification | 권장 | `:908-918` |
| 원산지 | 3 | originCountry | manualData.originCountry | 권장 | `:920-929` |
| 바코드 | 1 | barcode | barcode | 선택(자동생성) | `:693-731` |
| **포장단위** | — | — | — | **미발견(폼 부재)** | — |

바코드 조회: `:206-225` ✔ `productApi.getMasterByBarcode(code)` → Master hit 시 marketingName/manufacturerName prefill, miss 시 "새 Master 자동 생성" 안내.

### A-4. 허가/신고/품목코드 입력 필드
| 필드 | form key | 저장 키 | 표시 조건 | 근거 |
|---|---|---|---|---|
| 허가번호(MFDS) | mfdsPermitNumber | manualData.mfdsPermitNumber | **규제 카테고리만** 표시(선택) | `:758-767` |
| 신고번호 | — | — | **미발견**(regulatoryName에 통합) | — |
| 품목기준코드 | — | — | **미발견**(별도 입력 없음, 바코드로만) | — |

규제 섹션 표시: `isRegulated = selectedCategory?.isRegulated` (`:203`) → 규제 카테고리 선택 시만 "규제 정보(필수)" 섹션(`:735-784`).

### A-5. Step별 required/optional 검증 (`validateStep` `:258-271`) ✔
| Step | 필드 | 규칙 |
|---|---|---|
| 1 | marketingName | required (`:260`) |
| 1 | categoryId | required (`:261`) |
| 1 | regulatoryType+regulatoryName | isRegulated 시 required (`:262-264`) |
| 2 | priceGeneral | >0 required (`:268`) |
| 3 | consumerShortDesc | distributionType=PUBLIC 시 required (`:291-294`) |

→ 제조사/규격/원산지/바코드/허가번호 = 모두 optional.

### A-6. Import Assistant → Wizard prefill (sessionStorage)
로드: `:79` `loadAndClearDraft()` (단회 읽기 후 삭제), 저장: `product-import/storage.ts:13-14` `sessionStorage['neture-import-draft']`.

| draft 필드 | Wizard 반영 | 근거 |
|---|---|---|
| marketingName | form | `:92` |
| brandName | form | `:95` |
| manufacturerName | form | `:96` |
| specification | form | `:108` |
| originCountry | form | `:109` |
| categoryId | form | `:94` |
| priceGeneral | form | `:101` |
| regulatoryType | form(URL param 후순위) | `:105` |
| consumerShortDesc | editor | `:146` |
| thumbnailUrl/contentImageUrls | 라이브러리/data URL | `:167-176` |

### A-7. Create vs Update 경로 차이
| 항목 | Create(POST) | Update(PATCH) | 근거 |
|---|---|---|---|
| endpoint | `/neture/supplier/products` | `/neture/supplier/products/{id}` | `supplier.ts:605,633` ✔ |
| 데이터 형태 | `manualData{}` 구조체 | flat 필드 | create `:299-310` vs `ProductDetailDrawer.tsx:328-350` |
| serviceKeys | payload 포함 | **제외**(공급방식 변경 모달 전용) | `:318` vs `Drawer:349` ✔ |
| regulatoryType | manualData 저장 | **업데이트 불가(읽기전용)** | `:302` |
| 분리 호출 | 단일 | updateProduct + **updateBusinessContent**(B2B) | `Drawer:353` vs `:366` ✔ |

**Update payload(`Drawer:328-350`)**: `{ name, categoryId, brandId, specification, originCountry, consumerShortDescription, consumerDetailDescription, priceGeneral, stockQuantity, isActive, isPublic, isFeatured }` + 별도 `updateBusinessContent(id,{businessShortDescription, businessDetailDescription})`. serviceKeys 제외.

### A-8. 공급자 원문 필수 보존 필드
| 필드 | 저장 경로 | 정부 덮어쓰기 | 근거 |
|---|---|---|---|
| marketingName | `/products`→name | **금지** | `:314` |
| consumerShortDescription | `/products` | **금지** | `:322` |
| consumerDetailDescription | PATCH(update only) | **금지** | `Drawer:347` |
| businessShort/DetailDescription | `/products/{id}/business-content` | 정부 원문 기반 가능(공급자 작성 시 보존) | `Drawer:299-301` |
| regulatoryName | manualData.regulatoryName | △ 선택적(사용자 확인) | `:300,304` |
| manufacturerName/specification/originCountry/mfdsPermitNumber | manualData | ○ 자동(기존값 우선) | A-3/A-4 |

### A-9. 정부 검색 UI 삽입 — 최소 변경 위치 Top2
1. **Step1 바코드 조회 인접(`:692-731`)** — 기존 `searchBarcode`(`:206-225`) UX와 동일, 결과→form prefill 경로 동일, 규제정보 필드 인접. 신규 `GovProductSearchModal` 오픈 → 선택 시 manufacturerName/specification/originCountry/mfdsPermitNumber/(regulatoryName 선택) 병합(기존값 우선).
2. **수정 Drawer 기본정보 섹션(`Drawer:937-990`)** — Master 필드 편집 UI 기존 존재, 검토 시 활용.

기존 패턴 참고:
```js
// :206-225
const searchBarcode = async (code) => {
  const result = await productApi.getMasterByBarcode(bc);
  if (result) setForm(prev => ({...prev,
    marketingName: prev.marketingName || result.marketingName || result.regulatoryName || '',
    manufacturerName: prev.manufacturerName || result.manufacturerName || '' }));
};
```

---

## B. 상품 데이터 구조 상세

### B-1. 엔티티 관계도(주요 컬럼)
```
ProductMaster (SSOT, barcode 기준)
  id(UUID PK) · barcode(VARCHAR14 UNIQUE, immutable) · name
  regulatory_type/regulatory_name(immutable) · drug_category(nullable)
  manufacturerName(immutable) · mfdsProductId(VARCHAR100 UNIQUE immutable)
  mfdsPermitNumber(nullable immutable) · is_mfds_verified
  specification(TEXT) · tags(JSONB) · category_id→ProductCategory · brand_id→Brand
  1:N SupplierProductOffer · 1:1 ProductDrugExtension · 1:N ProductIdentifier

SupplierProductOffer
  id · master_id→ProductMaster · supplier_id→NetureSupplier · UNIQUE(master_id,supplier_id)
  isPublic · serviceKeys(TEXT[]) · distributionType(PUBLIC|SERVICE|PRIVATE 파생) · approvalStatus(파생) · isActive
  priceGeneral/Gold/Platinum · consumerReferencePrice · stock_quantity · reserved_quantity · slug(UNIQUE)
  consumer_short/detail_description · business_short/detail_description
  1:N OfferServiceApproval(offer_id+service_key UNIQUE)

ProductDrugExtension (1:1 with master)
  product_master_id(UNIQUE) · drug_category · verification_status
  drug_code · insurance_code · mfds_code · atc_code · approval_number
  active_ingredients(JSONB [{name,amount,unit}]) · dosage_form · strength
  package_unit · package_quantity
  efficacy_text · dosage_text · caution_text (+ efficacy_source/dosage_source/caution_source)
  data_source · mfds_source_url(TEXT) · source_updated_at
  pharmacy_only(def true) · customer_display_allowed · online_sale_allowed · public_display_policy · advertising_review_status

ProductIdentifier (Identifier Core)
  product_master_id→master(CASCADE) · identifier_type(GTIN|EAN13|UPC|JAN|INTERNAL_O4O|SUPPLIER_SKU|PHARMACY_LOCAL|STORE_LOCAL|KOREA_DRUG_CODE|KOREA_INSURANCE_CODE|ATC_CODE|MFDS_CODE|UNKNOWN)
  identifier_value · normalized_value · is_primary · verification_status · source_type · source_id
  metadata(JSONB) · UNIQUE(master_id,type,normalized_value) WHERE deleted_at IS NULL

SharedProductDescription (설명 canonical 풀)
  master_id→master · content(TEXT/HTML) · source_type(supplier|operator|ai|store_contribution|drug_extension)
  source_ref_id · status(candidate|canonical|hidden|needs_review|deprecated) · curated_by
  UNIQUE(master_id, status='canonical') partial index

ProductCandidate (검토 큐) — service_key · source_type · candidate_status · match_status
  matched_product_master_id · confidence_score · candidate_name/manufacturer/spec · raw_payload(JSONB) · reviewed_by/at
MobileProductDraft — draft_status · candidate_id · captured_unit · image_urls(JSONB) · raw_payload(JSONB)
SupplierCsvImportRow — batch_id · raw_json(JSONB) · parsed_barcode · validation_status · master_id · action_type · offer_id
NetureSupplier — slug(UNIQUE) · user_id · status(PENDING|ACTIVE|INACTIVE|REJECTED) · organization_id
ProductCategory — name · slug · parent_id · depth(0~3) · is_regulated
Brand — name · slug · manufacturer_name · country_of_origin · is_active
```
근거: `ProductMaster.entity.ts:36-104`, `SupplierProductOffer.entity.ts:40-123`, `ProductDrugExtension.entity.ts:87-166`, `ProductIdentifier.entity.ts:90-171`, `SharedProductDescription.entity.ts:69-73`, `ProductCandidate.entity.ts:203-204`, `SupplierCsvImportRow.entity.ts:50`, migration `20260301100000-ProductMasterCoreReset.ts:50-73`, `20260606000000-CreateProductIdentifiers.ts:90-121`.

### B-2. 9개 핵심 질문 — 답과 근거
| # | 질문 | 답 | 근거 |
|---|---|---|---|
| 1 | 등록 단위 = 제품 vs 포장 | **제품(barcode/Master)**. 1 Master = 1 supplier = 1 Offer max | `SupplierProductOffer.entity.ts:40-41`; `ProductMaster.entity.ts:5-6` |
| 2 | 동일 제품 다중 포장 표현 | **미지원** — 다른 barcode→다른 Master. 포장정보는 `ProductDrugExtension.package_unit/quantity` + `specification` 텍스트 | `ProductMaster.entity.ts:82-84`, `ProductDrugExtension.entity.ts:121-125` |
| 3 | barcode 컬럼/타입/unique | **VARCHAR(14), UNIQUE, immutable, index** | entity `:36-38`; migration `:50-73`(uq_product_masters_barcode) |
| 4 | 정부 품목기준코드 저장 기존 필드 | `ProductMaster.mfdsProductId`(item_seq 용) + `ProductIdentifier.metadata` + `ProductDrugExtension.mfds_code` | entity `:103-104`, `ProductIdentifier.entity.ts:170-171`, `ProductDrugExtension.entity.ts:93-94` |
| 5 | 재사용 가능 JSONB metadata | tags / ProductIdentifier.metadata / active_ingredients / ProductCandidate.raw_payload / SupplierCsvImportRow.raw_json | 위 근거 |
| 6 | 정부 원문 snapshot 기존 구조 | **있음** — ProductDrugExtension(mfds_source_url/source_updated_at/*_source/active_ingredients) + ProductCandidate.raw_payload | `ProductDrugExtension.entity.ts:147-166`, `ProductCandidate.entity.ts:203-204` |
| 7 | 신규 테이블 필요 범위 | **V1 불필요**(기존 컬럼 충분). 선택: `ProductDrugExtension.metadata(JSONB)` 추가. 향후 정책 시: govt_audit / sync_reconciliation 테이블 | `offer.service.ts:79-94` 등 |
| 8 | 승인 ↔ master 결합 | **느슨**. Master 생성·Offer 생성·승인(OfferServiceApproval 상태)은 독립. 승인이 Master 연결을 만들지 않음 | `offer.service.ts:185-286`, `offer-service-approval.service.ts` |
| 9 | 정부 연결 없이 승인 가능 코드 경로 | **가능**. submitForApproval은 카테고리 게이트+서비스키 필터+약국 대상 검사뿐, 정부 link 미요구. 규제 상품만 승인 시 허가번호 필요 | `offer.service.ts:411-524`(submitForApproval), `:79-94`(assertRegulatedPermit mode:'approval'), `:202-224`(approveProduct) |

### B-3. 정부코드/원문 저장 — 재사용 가능 기존 컬럼
| 저장 대상 | 컬럼 | 엔티티:라인 |
|---|---|---|
| item_seq(품목기준코드) | mfdsProductId(VARCHAR100 UNIQUE) | ProductMaster.entity.ts:103-104 |
| 허가번호 | mfdsPermitNumber | ProductMaster.entity.ts:99-100 |
| 규제유형/공식명/제조사 | regulatory_type/regulatory_name/manufacturerName | ProductMaster.entity.ts:41-42,55-56,95-96 |
| 의약품 코드류 | drug_code/insurance_code/mfds_code/atc_code | ProductDrugExtension.entity.ts:87-97 |
| 성분(JSON) | active_ingredients | ProductDrugExtension.entity.ts:112-113 |
| 효능/용법/주의(+출처) | efficacy_text/dosage_text/caution_text/*_source | ProductDrugExtension.entity.ts:156-166 |
| 원문 URL/동기화시각 | mfds_source_url/source_updated_at | ProductDrugExtension.entity.ts:150-154 |
| 식별자 부가코드(JSON) | ProductIdentifier.metadata | ProductIdentifier.entity.ts:170-171 |
| 정부 응답 원문 전체(JSON) | ProductCandidate.raw_payload | ProductCandidate.entity.ts:203-204 |

### B-4. 신규 컬럼/테이블이 불가피한 최소 항목(향후)
- **선택 신규 컬럼**: `ProductDrugExtension.metadata(JSONB)` — 확장 코드 여분(없어도 ProductIdentifier.metadata 대체).
- **다중 포장**: 현재 barcode=Master 1:1이라, 동일 제품 다중 포장 표현은 별도 변형 구조(packaging_code 컬럼 or ProductPackaging 테이블) 필요 — **V1 범위 외**.
- **정부 변경 히스토리**: `product_master_govt_audit`(immutable 설계라 현재 불필요, 정부 업데이트 정책 도입 시).
- **주기 동기화 재조정**: `mfds_sync_reconciliation`(정부 DB 삭제/병합/분리 추적, 자동 동기화 도입 시). **V1 금지(전체 동기화 안 함)**.

---

## C. 기존 외부·정부 연동 자산 상세

### C-1. 키워드 매치 현황
| 키워드 | 매치 | 핵심 위치 |
|---|---|---|
| data.go.kr / apis.data.go.kr | ✅ | `mfds.service.ts:41-44` ✔ |
| MFDS/식약처 | ✅ (29+ 파일) | `mfds.service.ts` 전체 |
| itemSeq/item_seq/품목기준코드 | ✅ | `mfds.service.ts:83` ✔ |
| barcode/GTIN/바코드 | ✅ (126 파일) | `utils/gtin.ts`, 검증/생성 |
| 의약품/e약은요/낱알 | ✅ (116 파일) | 의약품 엔티티/서비스 |
| government/external source | ✅ (27 파일) | — |
| API cache/snapshot | ✅ | CacheService, asset-snapshot, store-ai snapshot |
| scheduler/cron/queue/retry | ✅ (제한적) | `packages/yaksa-scheduler`, CacheService |
| 외부 API service key env | ✅ | `mfds.service.ts:37-38`(이름만: MFDS_API_KEY/MFDS_TIMEOUT_MS) |

### C-2. MFDS Service (이미 구현) ✔
- 파일 `apps/api-server/src/modules/neture/services/mfds.service.ts` (184줄, 인터페이스 FROZEN).
- 엔드포인트: 의약품 바코드 `MdcinBardInfoService01/getMdcinBardItemList01`(`:41-42`), 건기식 `HlthFoodBardInfoService/getHlthFoodBardItemList`(`:43-44`).
- `verifyProductByBarcode(barcode)`(`:53-70`): 의약품→건기식 2단계 폴백, `bar_code` 파라미터(`:107`), `type=json`, `numOfRows=1`.
- `getProductByMfdsId(item_seq)`(`:75-95`): 바코드 URL에 `item_seq` 전달(⚠ 해당 operation의 item_seq 지원 여부 키 검증 필요).
- 응답 매핑 `mapDrugItem`(`:172-183`): `{regulatoryType:PRDUCT_TYPE|PRDLST_NM, regulatoryName:ITEM_NAME|PRDLST_NM, manufacturerName:ENTP_NAME|BSSH_NM, permitNumber:ITEM_PERMIT_NO|PRMS_DT, productId:ITEM_SEQ|PRDLST_REPORT_NO}`.
- 신뢰성 패턴: `MFDS_API_KEY` 미설정 시 graceful degradation(`:56-59`), AbortController 타임아웃(`:131-133`), HTTP/JSON 파싱 양형식 처리(`:143-166`).
- **반환은 식별 5필드뿐 — 효능/용법/주의 콘텐츠 없음**(콘텐츠 API 미연동).

### C-3. Product Identifier Core
- `ProductIdentifier.entity.ts` / `product-identifier.service.ts`: barcode UNIQUE 유지하며 다중 식별자 수용. type union에 `MFDS_CODE`/`KOREA_DRUG_CODE`/`ATC_CODE` 포함. `addIdentifier()`(idempotent), `findByIdentifier(type,value)`, `setPrimaryIdentifier()`, `normalizeIdentifier()`.

### C-4. 기타 재사용 자산
| 자산 | 위치 | 용도 |
|---|---|---|
| GTIN 검증/생성 | `utils/gtin.ts` | validateGtin/isValidGtin/generateInternalBarcode(GS1 prefix 200) |
| CSV/카탈로그 Import | `csv-import.service.ts`, `catalog-import.service.ts` | 파일→검증(MFDS 호출)→Master/Offer, manualData 폴백, 컬럼 매핑(barcode/가격/이름/설명/카테고리/브랜드) |
| CacheService(L1+L2) | `services/CacheService.ts` | LRU+Redis, circuit breaker, compression. env: CACHE_MEMORY_MAX/TTL, CACHE_REDIS_TTL 등(이름만) |
| CircuitBreakerService | `services/CircuitBreakerService.ts` | CLOSED/OPEN/HALF_OPEN, 인스턴스 `external-api-google` |
| Asset/Store-AI Snapshot | `asset-snapshot/`, `store-ai-snapshot.service.ts` | 원본 보존 사본/일별 dedup |
| Yaksa Scheduler | `packages/yaksa-scheduler` | job 생성/모니터/failure queue |

### C-5. 환경변수(값 제외, 이름만)
- `MFDS_API_KEY`, `MFDS_TIMEOUT_MS`(`mfds.service.ts:37-38`)
- `REDIS_HOST/PORT/PASSWORD`, `CACHE_MEMORY_MAX/TTL`, `CACHE_REDIS_TTL`, `CACHE_COMPRESSION_THRESHOLD`, `CACHE_KEY_PREFIX`(CacheService)
- ⚠ `.env.example`에 MFDS_* 미기록 → 운영 가이드 보강 권장. **시크릿 값 0건 출력**.

---

## D. 정부 의약품 API 실측 명세 상세
공식 출처 위주(서비스키 미사용·미호출). Swagger 일부 필드는 JS 렌더로 정적 추출 불가 → 의약품안전나라(nedrug) 검색폼 필드명·공식 공지로 교차확인.

### D-1. 의약품 제품 허가정보 — DrugPrdtPrmsnInfoService07 (15095677)
- Base: `http://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07` (공식 공지 확인). 복수 operation(허가 상세, 주성분 상세 등).
- 포맷 JSON+XML·무료·실시간.
- 검색키: item_seq·item_name·entp_name·edi_code·cancel_code(취하)·허가일 범위. (nedrug 폼: itemSeq/entpName/itemName/etcOtcCode/cancelCode/eeDocData/udDocData/nbDocData)
- **바코드 직접 검색: 불가**. item_seq/제품명/업체명: **가능**.
- 응답: 품목기준코드·제품명·업체명·주성분(main_item_ingr)·포장단위·저장방법·성상·유효기간·허가일자·허가번호·희귀여부·ETC_OTC(전문/일반)·취하필드·수정일.
- 효능/용법/주의: **EE_DOC_DATA/UD_DOC_DATA/NB_DOC_DATA = 구조화 XML**(CDATA `<DOC><SECTION><ARTICLE><PARAGRAPH>`) → **XML 파싱 필요**.
- 수정일·취하상태 **둘 다 제공**. 범위 **OTC+ETC 전체**(가장 넓음). 호출 개발 10,000/일, 운영 심의승인.

### D-2. 의약품개요 e약은요 — DrbEasyDrugInfoService (15075057)
- Endpoint: `…/DrbEasyDrugInfoService/getDrbEasyDrugList`. JSON+XML·무료·실시간.
- 검색키: itemName·entpName·itemSeq·효능/사용법 텍스트. **바코드 불가**, item_seq/제품명/업체명 가능.
- 응답: entpName·itemName·itemSeq·efcyQesitm(효능)·useMethodQesitm(사용법)·atpnWarn/atpn/intrc/se/depositQesitm·openDe·**updateDe**·**itemImage**.
- 콘텐츠 **소비자용 평문**(허가정보 XML 가공). 상세 operation 없음(단일 list). 취하 필드 없음.
- 범위 **일반의약품 중 공급실적 보유 중심** — 전문약·일부 일반약 누락(공식 설명 일치). ⚠ 평문 br/p 태그 정도는 키 검증 필요.

### D-3. 낱알식별 — MdcinGrnIdntfcInfoService01 (15057639)
- Endpoint: `…/getMdcinGrnIdntfcInfoList01`. 검색키 item_seq·item_name·entp_name·모양/색/각인. **바코드 불가**.
- 응답: 품목기준코드·품목명·업체명·모양/색/제형·각인 앞뒤·분할선·낱알이미지·전문일반·change_date. 효능/용법 없음(외형 전용). 범위 정제/캡슐.

### D-4. 회수·판매중지 (15059114)
- Base `apis.data.go.kr/1471000/…`(operation 풀네임 키 필요). 검색 품목명·업체명·일자. **바코드 없음**. 응답 품목명·업체명·회수사유·구분·승인/회수명령일자. ⚠ item_seq 출력 키 검증.
- 유효기간 단독 공개 API 없음 — 일련번호 단위 유통데이터(의약품관리종합정보센터/심평원, 비공개). 품목 유효기간은 D-1의 VALID_TERM으로만.

### D-5. (참고) 바코드 API 2종
| API | data.go.kr | 상태 |
|---|---|---|
| 유통바코드 | 15064775 | **식품 대상**·유통물류진흥원 유료·**2018 이후 갱신중단** |
| 바코드연계제품정보 | 15060549 | **식품 대상**(의약품 제외)·동일 사유 갱신중단·LINK 방식 |
→ 의약품 식별엔 사용 불가(단, **의약품 전용 바코드 API MdcinBardInfoService01은 별개로 사용 가능 — §E**).

### D-6. 출처
- data.go.kr 15095677/15075057/15057639/15059114/15064775/15060549 openapi 페이지
- DrugPrdtPrmsnInfoService07 변경 공지(base URL): data.go.kr 공지 NOTICE_0000000004363
- nedrug.mfds.go.kr/searchDrug(필드 교차), nedrug.mfds.go.kr/cntnts/80
- 보건복지부 "의약품 바코드 표시 및 관리요령"(GS1 표준코드/포장 바코드 체계)
- 공통: 개발 10,000건/일, 운영=활용사례 등록+심의승인.

---

## E. 바코드 식별 상충점 해소
- 조사 중 두 보고가 상충: (C) 코드가 의약품 바코드 API를 이미 호출 vs (D) "바코드 직접검색 불가".
- **직접 확인(mfds.service.ts 원문 ✔)**: `MFDS_DRUG_BARCODE_URL = MdcinBardInfoService01/getMdcinBardItemList01`(`:41-42`)에 `bar_code` 파라미터 전송(`:107`) → 의약품 바코드→품목 식별 **지원·연동됨**.
- **해소**: (D)의 "바코드 불가"는 **콘텐츠 API 4종(허가/개요/낱알/회수)** 및 **식품 바코드 API**에 한정. **의약품 전용 바코드 API(MdcinBardInfoService01)는 별개로 바코드→item_seq 매핑 제공**.
- **정확한 그림**:
  1. 바코드 → `MdcinBardInfoService01`(이미 연동) → item_seq + 공식명 + 제조사 + 허가번호.
  2. item_seq → 허가정보(전 품목 XML)·e약은요(평문 보조) → 효능/용법/주의 콘텐츠(**미연동 — 신규 계층 필요**).
- **잔여 리스크**: 의약품 바코드 API 커버리지(미등록 품목), 건기식 바코드 데이터셋 갱신 정체, `getProductByMfdsId`의 item_seq 조회 operation 적합성 → 서비스키로 실측 필요(⚠).

---

## F. on-demand 검색 설계 후보 흐름
```
1. 공급자: 상품명/바코드/품목코드 입력
2. O4O 로컬 우선 검색  (productApi.getMasterByBarcode / mfdsProductId / 텍스트)
3. 미스 시 서버가 정부 API 검색:
     - 바코드 보유 → MdcinBardInfoService01(연동됨) → item_seq
     - 바코드 미스/미보유 → 허가정보 텍스트검색(제품명+업체명)
4. 후보 목록 표시(운영자/공급자 선택)
5. 선택 시 정부 공식명·제조사·item_seq·포장·허가번호 제안
6. 공급자가 필요한 항목만 수용(기존값 우선, 마케팅명·B2C 보존)
7. (의약품) item_seq → 허가정보 EE/UD/NB XML or e약은요 평문 → B2B 상세 기반
8. 선택 정부 원문 snapshot 저장(ProductDrugExtension + ProductCandidate.raw_payload)
9. 공급자 상품 ↔ 정부 source(item_seq/mfdsProductId) 연결(dedupe by UNIQUE)
10. 실패/누락 시 수기 등록 계속(graceful degradation)
```
바코드 직접 불가(콘텐츠 API)일 때 비교 우선순위: **item_seq > 제품명+업체명 > 바코드 인덱스(자체 축적) > 입력바코드 vs 후보바코드 대조**. 캐시(CacheService)+서킷브레이커로 중복호출·장애 방어, 외부 XML/HTML sanitize 필수.

---

## 미확정/검증 필요 (정직 표기)
- 콘텐츠 API operation 풀네임·파라미터 필수/길이, 허가정보 응답 BAR_CODE 출력 포함 여부, 회수 API item_seq 출력, e약은요 평문 태그 정도, 바코드 API의 item_seq 조회 지원 → **서비스키로 Swagger/실호출 검증 필요**.
- 의약품 바코드 API 실제 커버리지(미등록 품목 비율) → 운영 데이터/키 검증.
- 운영 DB의 mfdsProductId/ProductDrugExtension 적재 현황 → Console SQL read-only 확인 권장(CLI 측정 불가).
- 본 DETAIL의 일부 라인 번호는 보조 조사 수집치(✔ 표기 외)이며, 구현 착수 전 해당 파일 최신 상태 재확인 권장.

---

**작성:** O4O Platform Team · 2026-06-28
**상태:** 상세 근거 문서(코드/DB/env 변경 0). 상위 결정 문서 IR-...-AUDIT-V1 의 evidence base.
