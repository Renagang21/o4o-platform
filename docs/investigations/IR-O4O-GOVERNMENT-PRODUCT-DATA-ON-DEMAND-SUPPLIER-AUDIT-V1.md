# IR-O4O-GOVERNMENT-PRODUCT-DATA-ON-DEMAND-SUPPLIER-AUDIT-V1

> 공급자 상품 등록 시 O4O 기존 데이터 + 정부 데이터를 **on-demand 검색**해 입력을 돕고, **선택된 정부정보만 저장**하는 기능 설계를 위한 현재 상태 조사. **READ-ONLY — 코드/DB/API/UI/env/문서 수정·migration·deploy 0.**
>
> 작성일: 2026-06-28 · 범위: 공급자(1단계). Admin·매장·POS·허브는 후속.
> 근거: 코드 정적 추적(파일:라인) + 공공데이터포털 공식 명세(서비스키 미사용, 미호출).
> **상세 근거(엔티티 스키마·필드 매핑·페이로드·정부 API 실측 전체):** [`IR-O4O-GOVERNMENT-PRODUCT-DATA-ON-DEMAND-SUPPLIER-AUDIT-V1-DETAIL.md`](IR-O4O-GOVERNMENT-PRODUCT-DATA-ON-DEMAND-SUPPLIER-AUDIT-V1-DETAIL.md)

---

## 1. 한 줄 결론
**현재 구조는 정부 on-demand 검색·선택·저장을 신규 테이블 없이 대부분 수용 가능하다** — `mfds.service.ts`가 **의약품/건기식 바코드 API를 이미 호출**하고, `ProductDrugExtension`(효능/용법/주의/성분/원문URL)·`ProductIdentifier.metadata`(코드)·`ProductCandidate.rawPayload`(원문 snapshot) 등 저장 그릇이 존재하며, **정부 연결은 승인 조건이 아니다.** 부족한 것은 (a) 등록 UI의 "정부 후보 검색·선택" 진입점, (b) 바코드→품목 식별 후 **콘텐츠 API(허가/e약은요) 호출 계층**(현재 미연동), (c) 포장단위 입력 필드뿐이다.

---

## 2. 현재 공급자 등록 흐름
진입 → 유형선택 → (Import Assistant 선택) → 3-Step Wizard → 생성 → 수정 Drawer → 승인요청.

| 단계 | 파일:라인 | 비고 |
|---|---|---|
| 등록 진입(유형 선택) | [`SupplierProductRegisterEntryPage.tsx:40-43`](services/web-neture/src/pages/supplier/SupplierProductRegisterEntryPage.tsx#L40-L43) | `productType`/`regulatoryType` 를 URL 쿼리로 전달 |
| 유형 정의(5종) | [`supplierProductTypes.ts:28-64`](services/web-neture/src/lib/supplierProductTypes.ts#L28-L64) | non_drug/quasi_drug/otc_drug/rx_drug/unclassified → regulatoryType 매핑 |
| Import Assistant draft | `product-import/storage.ts:13-14`, `SupplierProductCreatePage.tsx:79,92-176` | 외부 페이지 파싱 → sessionStorage draft → Wizard prefill(이름/브랜드/제조사/규격/원산지/카테고리/가격/규제유형/이미지/B2C간이) |
| Wizard Step1 기본정보 | `SupplierProductCreatePage.tsx:612-731,735-784` | marketingName·category·제조사·**바코드 조회**·규제정보(규제 카테고리 시) |
| Wizard Step2 공급가 | (ProductForm) | priceGeneral 필수 |
| Wizard Step3 설명/이미지 | `:908-929` | specification·originCountry·B2C 설명 |
| 바코드 조회(기존) | `:206-225` | `productApi.getMasterByBarcode()` → Master hit 시 marketingName/manufacturerName prefill, miss 시 자동 생성 안내 |
| 생성 | [`supplier.ts:605`](services/web-neture/src/lib/api/supplier.ts#L605) `POST /neture/supplier/products` | `name`+`manualData{regulatoryType/Name/mfdsPermitNumber/manufacturerName/specification/originCountry/stockQty}`+가격+serviceKeys |
| 수정 Drawer | `ProductDetailDrawer.tsx`, [`supplier.ts:633`](services/web-neture/src/lib/api/supplier.ts#L633) `PATCH /neture/supplier/products/:id` | 기본정보+B2C 설명 / B2B 설명은 별도 `:299` `updateBusinessContent` / 공급방식은 별도 모달 |
| 승인요청 | [`offer.service.ts:411-524`](apps/api-server/src/modules/neture/services/offer.service.ts#L411-L524) `submitForApproval` | 정부 연결 미요구(§아래) |

**Step 검증(required):** Step1 marketingName·categoryId(+규제 카테고리 시 regulatoryType·regulatoryName) `:258-264`; Step2 priceGeneral>0 `:268`; Step3 PUBLIC 시 consumerShortDesc `:291-294`. 그 외 제조사/규격/원산지/바코드/허가번호 = **optional**.

---

## 3. 현재 상품 데이터 관계도
```
ProductMaster (SSOT, barcode UNIQUE)
 ├─ id, barcode(VARCHAR14 UNIQUE immutable), name
 ├─ regulatoryType/regulatoryName/drugCategory(immutable), manufacturerName
 ├─ mfdsProductId(VARCHAR100 UNIQUE immutable) ← 정부 item_seq 저장처
 ├─ mfdsPermitNumber(nullable immutable), isMfdsVerified
 ├─ specification(TEXT), tags(JSONB), categoryId→ProductCategory, brandId→Brand
 ├─1:N SupplierProductOffer (master_id+supplier_id UNIQUE)
 │   ├─ isPublic/serviceKeys[]/distributionType(파생)/approvalStatus(파생)/isActive
 │   ├─ priceGeneral/Gold/Platinum, consumerReferencePrice, stockQuantity
 │   ├─ consumer_short/detail_description, business_short/detail_description
 │   └─1:N OfferServiceApproval (offer_id+service_key UNIQUE, 승인 SSOT)
 ├─1:1 ProductDrugExtension (product_master_id UNIQUE) ★정부 콘텐츠 저장 적합
 │   ├─ drug_code/insurance_code/mfds_code/atc_code/approval_number
 │   ├─ active_ingredients(JSONB), dosage_form/strength
 │   ├─ package_unit/package_quantity
 │   ├─ efficacy_text/dosage_text/caution_text (+ *_source)
 │   ├─ mfds_source_url(TEXT), source_updated_at, data_source
 │   └─ pharmacy_only/public_display_policy/advertising_review_status
 ├─1:N ProductIdentifier (Identifier Core; type∈{GTIN,EAN13,...,KOREA_DRUG_CODE,MFDS_CODE,...})
 │   ├─ identifier_value/normalized_value, is_primary, verification_status
 │   └─ metadata(JSONB) ★코드/부가정보 저장 가능
 └─ (간접) SharedProductDescription (master_id, status=canonical UNIQUE, source_type∈supplier/operator/ai/drug_extension)

ProductCandidate (검토 큐): raw_payload(JSONB)★원문 snapshot, match_status, matched_product_master_id, confidence
MobileProductDraft / SupplierCsvImportRow(raw_json JSONB) — 수집·일괄 경로
```
근거(엔티티): [`ProductMaster.entity.ts:36-104`](apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts#L36-L104), [`SupplierProductOffer.entity.ts:40-123`](apps/api-server/src/modules/neture/entities/SupplierProductOffer.entity.ts#L40-L123), [`ProductDrugExtension.entity.ts:87-166`](apps/api-server/src/modules/neture/entities/ProductDrugExtension.entity.ts#L87-L166), [`ProductIdentifier.entity.ts:90-171`](apps/api-server/src/modules/neture/entities/ProductIdentifier.entity.ts#L90-L171), [`ProductCandidate.entity.ts:203-204`](apps/api-server/src/modules/neture/entities/ProductCandidate.entity.ts#L203-L204), [`SharedProductDescription.entity.ts:69-73`](apps/api-server/src/modules/neture/entities/SharedProductDescription.entity.ts#L69-L73), [`SupplierCsvImportRow.entity.ts:50`](apps/api-server/src/modules/neture/entities/SupplierCsvImportRow.entity.ts#L50).

**핵심 사실**
- **등록 단위 = 제품(barcode/Master)**. 1 Master = 1 supplier = 1 Offer max ([`SupplierProductOffer.entity.ts:40-41`](apps/api-server/src/modules/neture/entities/SupplierProductOffer.entity.ts#L40-L41)).
- **동일 제품 다중 포장 = 현재 미지원**(다른 barcode → 다른 Master). 포장정보는 `ProductDrugExtension.package_unit/quantity` + `specification` 텍스트로만 표현.
- **승인 ↔ master 느슨한 결합**: Master 생성은 승인과 독립, 승인은 OfferServiceApproval 상태 변경뿐. **정부 연결을 승인이 강제하지 않음**([`offer.service.ts:411-524`](apps/api-server/src/modules/neture/services/offer.service.ts#L411-L524)). 규제 상품만 **승인 시 허가번호(mfdsPermitNumber) 필요**(`offer.service.ts:79-94,202-224` `assertRegulatedPermit(mode:'approval')`).

---

## 4. 상품명·포장·바코드·정부코드 필드표
| 개념 | 저장 필드 | 위치 | 정부 자동입력 | 공급자 원문 보존 |
|---|---|---|:--:|:--:|
| 마케팅 상품명 | `ProductMaster.name` / offer `name` | create `:314` | ✗ (절대 덮어쓰기 금지) | ★필수 |
| 규제(공식)명 | `manualData.regulatoryName`→`ProductMaster.regulatoryName` | `:300,304,770-782` | △ 선택적(사용자 확인) | — |
| 제조사 | `manualData.manufacturerName`→`manufacturerName` | `:680-689` | ○ (기존값 우선) | — |
| 규격 | `manualData.specification`→`specification` | `:908-918` | ○ | — |
| 원산지 | `manualData.originCountry`→`originCountry` | `:920-929` | ○ | — |
| 바코드 | `barcode`(VARCHAR14 UNIQUE) | `:693-731` | ○(스캔/조회) | 입력값 비교 |
| 허가번호 | `manualData.mfdsPermitNumber`→`mfdsPermitNumber` | `:758-767` | ○(규제 시) | — |
| 품목기준코드(item_seq) | `ProductMaster.mfdsProductId` (+ `ProductIdentifier.metadata`) | entity `:103-104` | ○ | — |
| 의약품 코드류 | `ProductDrugExtension.drug_code/mfds_code/atc_code/insurance_code` | entity `:87-97` | ○ | — |
| 성분 | `ProductDrugExtension.active_ingredients(JSONB)` | entity `:112-113` | ○ | — |
| 효능/용법/주의 | `ProductDrugExtension.efficacy_text/dosage_text/caution_text` | entity `:156-166` | ○(B2B 기반) | — |
| 정부 원문 URL/snapshot | `ProductDrugExtension.mfds_source_url` / `ProductCandidate.raw_payload` | entity `:150-151` / `:203-204` | ○ | — |
| 포장단위 | (입력 필드 **미발견**) / `ProductDrugExtension.package_unit/quantity` | `:121-125` | ○ | — |
| B2C 간이/상세 설명 | offer `consumer_short/detail_description` | offer entity `:110-123` | ✗ | ★필수 |
| B2B 간이/상세 설명 | offer `business_short/detail_description` | `updateBusinessContent` `:299-301` | △ 정부 원문 기반 가능 | (공급자 작성 시 보존) |

**미발견(공급자 폼 기준):** 포장단위 입력, 신고번호 별도 필드, 품목기준코드 별도 입력 UI(현재 바코드로만).

---

## 5. 정부 API 실제 명세 (공식 포털 기준 · 서비스키 미사용)
### 5.0 바코드 식별 — **이미 코드에 연동됨**
- `mfds.service.ts:41-44,107` — **의약품 바코드** `MdcinBardInfoService01/getMdcinBardItemList01`(`bar_code` 검색) + **건기식 바코드** `HlthFoodBardInfoService`. 응답 매핑 `:172-183` → `{regulatoryType, regulatoryName(ITEM_NAME), manufacturerName(ENTP_NAME), permitNumber(ITEM_PERMIT_NO), productId(ITEM_SEQ)}`.
- 즉 **바코드 → item_seq/공식명/제조사/허가번호 매핑은 전용 바코드 API로 지원**(이미 호출 중). ⚠️ 단 **커버리지 한계**: 모든 의약품이 바코드 등록돼 있지 않을 수 있고, 건기식 바코드 데이터셋은 갱신 정체 가능성(서비스키로 실측 필요). `getProductByMfdsId()`는 바코드 URL에 `item_seq`를 넘기는데(`:81-83`) 이 operation의 item_seq 지원 여부는 키 검증 권장.

### 5.1 콘텐츠 API — **현재 코드 미연동(신규 계층 필요)**
바코드 API는 식별만 주고 효능/용법/주의 콘텐츠는 주지 않는다. 콘텐츠는 아래에서 item_seq/제품명/업체명으로 조회. **이 4종은 바코드 검색 파라미터 없음.**

| API | endpoint | 검색키 | 콘텐츠/특징 | 범위 |
|---|---|---|---|---|
| 의약품 제품 허가정보 `DrugPrdtPrmsnInfoService07` (15095677) | `apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07` | item_seq·item_name·entp_name·edi_code·취하코드·허가일 | **EE_DOC/UD_DOC/NB_DOC = 효능/용법/주의 구조화 XML**(CDATA `<DOC><SECTION>…`), 주성분·포장단위·전문일반(ETC_OTC)·유효기간·허가번호·수정일·취하상태 | **OTC+ETC 전체** (가장 넓음) ★마스터 소스 |
| 의약품개요 e약은요 `DrbEasyDrugInfoService` (15075057) | `…/DrbEasyDrugInfoService/getDrbEasyDrugList` | itemName·entpName·itemSeq·효능/사용법 텍스트 | **소비자용 평문**(efcyQesitm/useMethodQesitm/atpn/se/intrc/deposit) + itemImage + updateDe | **일반약 중 공급실적 보유 중심**(전문약·일부 일반약 누락) |
| 낱알식별 `MdcinGrnIdntfcInfoService01` (15057639) | `…/getMdcinGrnIdntfcInfoList01` | item_seq·item_name·entp_name·모양/색/각인 | 외형·각인·낱알이미지 | 정제/캡슐 |
| 회수·판매중지 (15059114) | `apis.data.go.kr/1471000/…` | 품목명·업체명·일자 | 회수사유·구분·명령일 | 안전성 게이트용 |

**공통:** JSON+XML·무료·실시간. 개발계정 10,000건/일, 운영계정=활용사례 등록+심의승인. 정부 전체 사전 동기화는 본 정책상 금지(§정책10).
**불확정(서비스키로 Swagger/실호출 검증 필요):** 각 operation 풀네임·파라미터 필수/길이, 허가정보 응답의 BAR_CODE 출력 포함 여부, 회수 API의 item_seq 출력, e약은요 평문의 태그(br/p) 정도, 바코드 API operation의 item_seq 조회 지원.

### 5.2 종합 판단(바코드 식별)
- **직접 식별 1차 = 의약품 바코드 API(이미 연동)** → item_seq 확보. 미스 시 **제품명+업체명 텍스트 검색**으로 폴백(허가정보 API).
- **콘텐츠 2차 = 허가정보(전 품목, XML) ＋ e약은요(평문, 일반약 한정 보조)**. e약은요 누락 시 허가정보 EE/UD/NB XML 파싱 폴백.
- 동일 품목도 포장단위마다 바코드 상이 가능 → 바코드 단독 1:1 식별 한계, item_seq 확정을 운영자/공급자 선택으로 보강.

---

## 6. 현재 구조 재사용 가능 영역
| 자산 | 재사용 포인트 | 파일 |
|---|---|---|
| **MFDS Service** | 바코드→식별(이미 호출), timeout/AbortController, graceful degradation, 2단계 폴백 | [`mfds.service.ts:53-128`](apps/api-server/src/modules/neture/services/mfds.service.ts#L53-L128) |
| **ProductDrugExtension** | 효능/용법/주의·성분(JSON)·코드·원문URL·포장 — **정부 콘텐츠 저장 그릇 그대로** | [`ProductDrugExtension.entity.ts:87-166`](apps/api-server/src/modules/neture/entities/ProductDrugExtension.entity.ts#L87-L166) |
| **ProductIdentifier(+metadata)** | MFDS_CODE/KOREA_DRUG_CODE 식별자 + metadata JSONB로 item_seq/부가코드 | [`ProductIdentifier.entity.ts:90-171`](apps/api-server/src/modules/neture/entities/ProductIdentifier.entity.ts#L90-L171) |
| **ProductCandidate.rawPayload** | 정부 API 응답 원문 전체 snapshot | [`ProductCandidate.entity.ts:203-204`](apps/api-server/src/modules/neture/entities/ProductCandidate.entity.ts#L203-L204) |
| **SharedProductDescription** | source_type=`drug_extension` 등으로 정부 기반 설명을 canonical 풀에 수용 | [`SharedProductDescription.entity.ts:69-73`](apps/api-server/src/modules/neture/entities/SharedProductDescription.entity.ts#L69-L73) |
| **CacheService(L1+L2 TTL)** | 정부 응답 캐싱(중복호출 방지) | `services/CacheService.ts` |
| **CircuitBreakerService** | 외부 API 장애 격리/복구 | `services/CircuitBreakerService.ts` |
| **gtin.ts** | 바코드 검증·내부생성 | `utils/gtin.ts` |
| **getMasterByBarcode UI 패턴** | "검색 버튼→prefill" 동일 UX 확장 | [`SupplierProductCreatePage.tsx:206-225`](services/web-neture/src/pages/supplier/SupplierProductCreatePage.tsx#L206-L225) |

---

## 7. 부족한 필드·테이블·API
- **콘텐츠 API 호출 계층 부재**: 허가정보(DrugPrdtPrmsnInfoService07)·e약은요는 코드 미연동 → 신규 service 메서드 필요(효능/용법/주의 fetch + XML/평문 파싱).
- **등록 UI 진입점 부재**: 정부 후보 "검색·후보목록·선택·필드 병합" UI 없음.
- **포장단위 입력 필드 부재**(공급자 폼). 백엔드 `package_unit/quantity`는 존재.
- **item_seq 표면화 부재**: 현재 mfdsProductId는 백엔드 저장만, 등록 UI에서 후보 선택/표시 흐름 없음.
- **신규 테이블은 V1 불필요**(§13). 향후 정부정보 변경 히스토리/주기 동기화 도입 시에만 audit·reconciliation 테이블 후보.

---

## 8. 등록 UX 최소 변경안
**원칙:** 기존 흐름·검증·승인정책 불변, 추가는 "옵트인 검색 + 선택 병합".

**최소 변경 위치 Top 2**
1. **Wizard Step1 바코드 조회 인접**([`SupplierProductCreatePage.tsx:692-731`](services/web-neture/src/pages/supplier/SupplierProductCreatePage.tsx#L692-L731)): "정부 정보 검색" 버튼 추가 → 모달(제품명/업체명/바코드 입력, 입력값 자동 제안) → 후보 목록 → 선택 시 제조사/규격/원산지/허가번호/규제명(선택)만 **기존값 우선**으로 병합. 마케팅명·B2C 설명은 제외.
2. **수정 Drawer 기본정보 섹션**([`ProductDetailDrawer.tsx:937-990`](services/web-neture/src/pages/supplier/ProductDetailDrawer.tsx#L937-L990)): 동일 검색 버튼 → 현재 수정 필드에만 병합(운영자/공급자 검토 시).

**병합 규칙**: 공급자 원문(마케팅명·consumer/business 설명) **덮어쓰기 금지**, regulatoryName은 사용자 확인 시만, 나머지는 기존값 있으면 skip. 후보 0건/실패 시 기존 수기 흐름 그대로(§정책8).

---

## 9. 정부 데이터 저장 최소안 (선택분만, 원문 분리)
- **식별/코드** → `ProductMaster.mfdsProductId`(item_seq), `mfdsPermitNumber`; 추가코드는 `ProductIdentifier(type=MFDS_CODE/KOREA_DRUG_CODE).metadata`.
- **의약품 콘텐츠(B2B 기반)** → `ProductDrugExtension.efficacy_text/dosage_text/caution_text/active_ingredients/package_unit/quantity` + 출처 `*_source`, `mfds_source_url`, `source_updated_at`.
- **원문 snapshot(선택분)** → `ProductCandidate.rawPayload` 또는 ProductDrugExtension의 원문URL/source 필드. **전체 사전 동기화 금지 — 사용자가 선택한 품목만**(§정책9-10).
- **분리 보존**: 정부 원문 ↔ 공급자 입력 컬럼 분리(§정책12). B2C는 공급자 공식 설명 유지(§정책14), B2B 의약품 상세는 정부 원문 기반(§정책13).
- **재사용 가능 시**: 동일 item_seq가 이미 O4O Master/Extension에 있으면 재사용(§정책11) — Master barcode UNIQUE + mfdsProductId UNIQUE로 자연 dedupe.

---

## 10. 오류·누락·API 장애 처리
- 정부 API 장애/타임아웃/미발견 → **수기 등록 계속 허용**(§정책8). 기존 `mfds.service` graceful degradation(`:56-59`) + AbortController(`:131-133`) 패턴 준수.
- 신제품/미등록 품목 → 후보 0건 시 안내 + 수기 입력. 정부 연결은 승인 조건 아님(§정책6, `assertRegulatedPermit`는 규제 상품 허가번호만).
- 중복 호출 방지 → CacheService TTL + (선택)CircuitBreaker.
- 외부 응답 HTML/XML(허가정보 EE/UD/NB) → 저장·표시 전 **sanitize 필수**(pl-content sanitizer 재사용 권장).

---

## 11. 보안·권한
- 정부 API 호출·serviceKey는 **백엔드 전용**(현 `mfds.service` 동일), 프론트 비노출. env 키 이름만: `MFDS_API_KEY`, `MFDS_TIMEOUT_MS`(값 미기록).
- 공급자 = 검색 요청 + 후보 선택만. **정부 원문 수정 권한 없음**(원문은 source 필드/snapshot로 read 보존). 정부 연결 수정·해제는 후속 Admin.
- timeout/호출량(10,000/일 개발)·중복호출 방지·실패 fallback 고려. 외부 응답 sanitize.

---

## 12. 구현 난이도와 영향 파일 후보
| 작업 | 난이도 | 영향 파일(후보) |
|---|---|---|
| 백엔드 정부 검색 endpoint(텍스트/바코드 검색 + 후보 반환) | 중 | `mfds.service.ts`(확장), 신규 `government-product.service.ts`, neture controller |
| 콘텐츠 API(허가/e약은요) fetch+파싱 | 중상(XML 파싱) | 신규 service + sanitizer 재사용 |
| 선택 정부정보 저장(Extension/Identifier/snapshot) | 중 | `offer.service.ts`/`catalog.service.ts`, ProductDrugExtension/Identifier repo |
| 등록 UI 검색·선택·병합 | 중 | `SupplierProductCreatePage.tsx`(Step1), 신규 `GovProductSearchModal`, `ProductDetailDrawer.tsx` |
| 포장단위 입력 필드(선택) | 하 | Wizard Step + ProductForm |
| 캐시/서킷브레이커 적용 | 하 | CacheService/CircuitBreaker 재사용 |

---

## 13. 신규 DB 변경 필요 여부
- **V1: 신규 테이블 불필요.** 정부 코드/콘텐츠/원문 snapshot은 기존 컬럼(ProductDrugExtension, ProductIdentifier.metadata, ProductCandidate.rawPayload, mfdsProductId)으로 수용.
- **선택적 신규 컬럼**: `ProductDrugExtension.metadata(JSONB)`(확장 코드 여분). 없어도 ProductIdentifier.metadata로 대체 가능.
- **후속(별도 정책 도입 시에만)**: 정부정보 변경 히스토리(audit), 주기 동기화 mismatch 추적(reconciliation) 테이블 — 현재 immutable 설계라 V1 불필요.

---

## 14. 공급자 Phase 구현 WO 제안 (조사 결과 — 미착수)
권장 분할(각 별도 WO, 본 IR은 구현 아님):
- **WO-1 정부검색 백엔드**: 바코드(기존 확장)+제품명/업체명 검색 → 후보 DTO. 캐시·타임아웃·sanitize.
- **WO-2 콘텐츠 fetch/파싱**: 허가정보 EE/UD/NB XML + e약은요 평문 → 정규화. e약은요 누락 폴백.
- **WO-3 선택 저장**: 선택분만 ProductDrugExtension/Identifier/snapshot 저장(원문↔공급자 분리, dedupe by item_seq/barcode).
- **WO-4 등록 UI**: Step1/Drawer 검색·후보·병합(원문 보존 규칙), 포장단위 필드.
> 전제: §정책 1-16 불변(등록·승인 흐름·마케팅명·B2C 보존·전체동기화 금지·on-demand only).

---

## 15. 후속 Admin·매장 단계와의 경계
- **Admin(2단계)**: 정부 연결 오류·중복·수정 요청 처리(연결 수정/해제 권한, mismatch 검토). 본 공급자 단계는 read 보존만.
- **매장 경영자(3단계)**: 자체 제품 등록(MobileProductDraft/ProductCandidate 경로 존재) — 본 조사 범위 외.
- **허브 공유(4단계)**: 운영자가 정부 기반 설명을 SharedProductDescription canonical로 큐레이션→매장 공유. 본 단계 미구현.
- POS·유료 상품 DB·유료 이미지는 범위 외(§정책15-16).

---

## 미확정/검증 필요 (정직 표기)
- 정부 콘텐츠 API operation 풀네임·파라미터 필수/길이, 바코드 API의 item_seq 조회 지원, e약은요 평문 태그 정도 → **서비스키로 Swagger/실호출 검증 필요**(본 조사 미수행).
- 의약품 바코드 API 실제 커버리지(미등록 품목 비율) → 운영 데이터/키 검증 필요.
- 운영 DB의 mfdsProductId/Extension 적재 현황 → Console SQL read-only 확인 권장(CLI 측정 불가, 선행 IR과 동일 제약).

---

**작성:** O4O Platform Team · 2026-06-28
**상태:** 조사 완료(코드/DB/env 변경 0). 결론: 신규 테이블 없이 on-demand 검색·선택저장 수용 가능. 부족분 = 정부 후보검색 UI + 콘텐츠 API 호출 계층 + 포장단위 필드. 구현은 WO-1~4 로 분할(미착수).
