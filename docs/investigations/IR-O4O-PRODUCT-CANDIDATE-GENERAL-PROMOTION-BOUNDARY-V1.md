# IR-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-BOUNDARY-V1

> **종류**: 조사 전용(IR) · **기준 코드**: `origin/main` `793f6a72e` (2026-09-18) · **구현 없음**
> **선행**: Supplier 제품 등록 경계 1차 조사(제품 identity ↔ Supplier Offer 결합 · DRUG gate 위치 · Existing Master 재검색 우회). 본 IR 은 그 조사가 남긴 유일한 GAP — **`ProductCandidate → 범용 ProductMaster` 승격 계약** — 만 좁게 본다.
> **기준 문서**: [`O4O-PRODUCT-CORE-BASELINE-V1`](../baseline/O4O-PRODUCT-CORE-BASELINE-V1.md) §2 · §6 · §8 · §12 (Candidate 경유 확정 원칙 · 공급자 전용 필드의 Product Core 상승 금지)

## 0. 결론 요약

| 질문 | 판정 |
|---|---|
| 1. drug `promoteOne` 에서 범용 재사용 가능한 것 | **결정 골격(port + 순수 결정 계층 + outcome create/link/conflict/skip + 트랜잭션)은 재사용 가능. 필드 매핑·eligibility·MasterPreview 는 의약품 표준코드 전용이라 재사용 불가** |
| 2. barcode / ProductIdentifier dedup 범용 사용 | **가능** — `product_masters.barcode` 정확일치 + `product_identifiers (type, normalized)` 조회 + 이름+제조사 정확일치 3종이 이미 두 경로(`resolveOrCreateMaster` · `StoreProductRequestAdminService`)에서 쓰인다. 단 **후보 생성 시 `identifierType/identifierValue` 를 채우지 않는 소스(공급자 대량 등록)가 있어 dedup 이 실행조차 안 된다** |
| 3. 유형별 최소 필드 | ProductMaster NOT NULL 은 `regulatory_type · regulatory_name · name · manufacturer_name` 4개뿐. 유형별 추가 필수는 **DRUG(drug_category + ProductDrugExtension 보장)** 만 코드에 존재. COSMETIC/HEALTH_FUNCTIONAL/QUASI_DRUG/MEDICAL_DEVICE/GENERAL 은 추가 필수 필드 없음(§4) |
| 4. 사용자 확인 vs 운영자 확인 | 현재 코드는 **모든 Candidate→Master 확정을 운영자(admin/operator) 액션**으로만 둔다. 공급자 스스로 확정하는 경로는 0. 범위 제안은 §5 |
| 5. Master 확정 후 Offer 자동 생성 여부 | **별도 명시 액션 권장** — 기존 두 승격 경로 모두 Offer 를 만들지 않으며(baseline §6·§12-1), 공급자 Candidate 에는 `supplierId` 컬럼조차 없다(rawPayload 안) |
| 6. 공급자 bulk candidate 와 single candidate 통합 | **가능하고 필요** — 같은 `product_candidates` 테이블 · 같은 `createCandidate()`. 단 현재 bulk 후보는 **어떤 운영자 액션으로도 Master 가 될 수 없는 dead-end**(§3-3) 이므로 통합 시 그 결함을 함께 닫아야 한다 |

가장 중요한 발견은 **"범용 승격 엔진이 없다"가 정확한 표현이 아니라는 점**이다. 비-drug 범용 승격은 이미 **`StoreProductRequestAdminService.approveAsNewMaster()`(store_web 전용, A안)** 에 한 번 구현돼 있다(§3-2). 문제는 그것이 `sourceType='store_web' AND sourceLabel='kpa-store-product-request'` 로 잠겨 있고, 매장 listing 생성과 결합돼 있어 공급자 후보가 쓸 수 없다는 것이다. 따라서 첫 WO 의 방향은 "새 엔진 신설"이 아니라 **store_web 승격 경로에서 Product identity 확정 부분을 떼어 소스 중립 서비스로 올리는 것**이다.

---

## 1. 현재 존재하는 Candidate → Master 경로 (전수)

| # | 경로 | 파일 | 허용 소스 | Master 생성 방식 | 부수 생성 | 트랜잭션 |
|---|---|---|---|---|---|---|
| P1 | drug promotion | `services/product-candidate.service.ts` `promoteMasterFromCandidate()` → `approveAsNewProductMaster()` → `drug-import/drug-master-promotion-apply.service.ts` `promoteOne()` | `sourceLabel` 이 `mfds-drug-master-standard-code*` 인 것만(`evaluatePromotable` → 그 외 `NOT_DRUG_SOURCE`) | `regulatoryType:'DRUG'` 하드코딩 · barcode=표준코드(13자리 GTIN 필수) · `isMfdsVerified:true` · `mfdsProductId` 합성 prefix | ProductIdentifier(KOREA_DRUG_CODE primary + MFDS/보험/ATC) · Landing(커밋 후) | `dataSource.transaction` |
| P2 | store_web 요청 승인 | `services/store-product-request-admin.service.ts` `approveAsNewMaster()` | `sourceType='store_web' AND sourceLabel='kpa-store-product-request'` 만(`loadStoreRequest`) | `candidateCategory`(또는 rawPayload.classification) → `classificationToRegulatory()` 로 8 유형 매핑 · barcode = GTIN-like 일 때만, 아니면 NULL · `is_mfds_verified=false` · Rx 차단 | ProductIdentifier(바코드 있을 때, `source_type='store_web_request'`) · **organization_product_listings + store_product_profiles(매장 listing)** · Landing(커밋 후) | `dataSource.transaction` |
| P3 | (단건 공급자 등록 — Candidate 를 거치지 않음) | `services/catalog.service.ts` `resolveOrCreateMaster()` ← `offer.service.ts` `createSupplierOffer()` | 공급자 입력 직접 | barcode 有: GTIN 검증 → MFDS stub → manualData / barcode 無: 이름+제조사 정확 dedup 후 `barcode=NULL` 생성. `regulatoryType` 기본값 `'일반'`(한글 별칭) | 없음 (Offer 는 이후 별도 save · DRUG gate 는 그 뒤) | **없음** — Master INSERT 와 Offer INSERT 가 별 트랜잭션 |

기타 후보 생성만 하는 소스(승격 아님): `mobile-product-draft.service.ts`(`convertDraftToCandidate`, identifier 채움) · `supplier-product.controller.ts` bulk-candidates(`sourceType:'csv_import'`, `sourceLabel:'공급자 대량 등록'`, **identifier 미기록**) · 공공 seed(external_api).

`matched_product_master_id` 를 세팅하는 곳: P1 DB store(`markCandidatePromoted` → `approved_new_master`/`matched`) · P2(`linked`/`approved_new_master`) · `product-library.controller.ts` · `product-db-maintenance.controller.ts` · drug OTC draft resolve. **사전 자동 매칭은 제거됨**(`WO-…-LEGACY-MASTER-MATCHING-REMOVAL-V1`) — 후보 생성 시점에 matched 가 채워지는 일은 없다.

---

## 2. Q1 — drug `promoteOne` 에서 재사용 가능한 것 / 불가한 것

### 2-1 재사용 가능 (소스 중립 골격)

- **port 패턴** `PromotionMasterStore { findMasterByBarcode · findMasterByMfdsProductId · findMasterIdsByIdentifier · createMaster · createIdentifier · markCandidatePromoted }` — read 는 dry-run/apply 공통, write 는 apply 전용. InMemory store 로 단위테스트 가능.
- **outcome 4분류** `create | link | conflict | skip` + `skipReason / conflictReason` + `existingMasterDiff`(link 시 기존 Master 와의 차이를 **덮어쓰지 않고 report 만**).
- **결정 순서**: eligibility → preview 생성 → barcode 조회 → identifier 가 다른 master 에 붙어있으면 `conflict(identifier_belongs_to_other_master)` → 기존 있으면 `link`(+identifier 보강) / 없으면 `create`.
- `ensureIdentifiers()` — (type, normalized) 가 이미 그 master 에 있으면 existing, 없으면 create.
- `approveAsNewProductMaster()` 의 외피: `dataSource.transaction` + 커밋 후 `ensureProductLandingForMaster()` best-effort.

### 2-2 재사용 불가 (의약품 표준코드 전용)

| 요소 | 왜 범용 불가 |
|---|---|
| `PromotionFields` | 필드가 HIRA 약가마스터 컬럼(표준코드·품목기준코드·보험코드·ATC·전문일반·제형·포장) |
| `evaluateEligibility` | `standardCode` 13자리 GTIN 없으면 `skip` — **바코드 없는 제품은 승격 자체가 불가** |
| `buildMasterPreview` | `regulatoryType:'DRUG'` 고정 · `isMfdsVerified:true` 고정 · `mfdsProductId = MFDS_PRODUCT_ID_PREFIX + 표준코드`(합성) · tags `import:hira-drug-master` |
| `buildIdentifierPreviews` | primary 가 항상 `KOREA_DRUG_CODE` · `sourceType:'drug_master_import'` · metadata `sourceDataset:'HIRA_DRUG_MASTER'` |
| `findMasterByMfdsProductId` conflict | 비-drug 에는 mfdsProductId 가 없음 |

→ **범용 엔진은 P1 을 파라미터화해서 만들지 말 것.** 결정 골격만 빌리고, 필드 매핑·eligibility·preview 는 유형별 어댑터로 분리한다. P1 은 그대로 두고 건드리지 않는다(약가마스터 파이프라인이 실운영 중).

---

## 3. Q2 · Q6 — dedup 과 소스 통합

### 3-1 지금 쓰이는 dedup 3종 (모두 정확일치 · 유사 매칭 없음)

| 축 | P1 | P2 | P3 |
|---|---|---|---|
| `product_masters.barcode` = | ✔ (표준코드) | ✔ (GTIN-like 일 때) — TX 밖 `findDuplicates` + TX 안 재확인 | ✔ |
| `product_identifiers (type, normalized)` | ✔ KOREA_DRUG_CODE | ✗ (barcode 컬럼만) | ✗ |
| `LOWER(TRIM(name)) + LOWER(TRIM(manufacturer_name))` | ✗ | ✔ (name AND manufacturer 둘 다 있을 때만) | ✔ (manufacturer 없으면 `manufacturer_name=''` 인 것과 매칭) |

범용 승격의 dedup 은 이 3종을 **한 곳에 모으면 된다**: ① barcode 정확 ② `product_identifiers` 정확(GTIN/EAN13/UPC/JAN/UDI_DI 등 `inferIdentifierTypeFromBarcode` 결과 type + `normalizeIdentifier`) ③ 이름+제조사 정확. 유틸은 `utils/product-identifier.util.ts` 에 이미 있음(`sanitizeIdentifierValue · isGtinLike · normalizeIdentifier · inferIdentifierTypeFromBarcode`). 유사도 매칭(`bulk-match.service.ts` 의 normalized/containment 사다리)은 **자동 확정 근거로 쓰지 말고** 사용자/운영자에게 "기존 후보" 로 제시하는 용도로만 둔다(baseline §12-2 정신 · 기존 "이름-유사 매칭 재도입 금지" 주석).

### 3-2 store_web 승격(P2)이 사실상 범용 엔진의 원형

P2 는 이미 `classificationToRegulatory()` 로 `otc/rx/drug/quasi/health_functional/medical_device/cosmetic/general → (regulatory_type, drug_category)` 를 처리하고, 바코드 없는 제품을 `barcode=NULL` 로 만들며, Rx 를 차단하고, 단일 TX 로 Master+Identifier+candidate 상태 전이를 묶는다. 범용 승격에 필요한 것의 80% 다. 부족한 것:

- 소스 잠금(`store_web` + `kpa-store-product-request`) 해제 필요 — 공급자 후보 불가.
- **매장 listing 생성이 같은 TX 에 결합** — Product identity 확정과 매장 활용 등록이 한 함수. 공급자 후보에는 organizationId 가 없어 `CANDIDATE_ORG_MISSING` 으로 던진다.
- DRUG 신규 시 `ProductDrugExtension` 보장 없음(P1 도 없음; `refineCandidateDrugCategory` 만 `ensureForProductMaster` 호출).
- `product_identifiers` 축 dedup 없음(barcode 컬럼만).
- `manufacturer` 비면 `'미상'`, `name` 비면 `'(이름 미상)'` 을 넣어 NOT NULL 을 통과시킨다 — 범용에서는 §4 최소 필드 미충족 = skip 으로 바꿔야 한다.

### 3-3 공급자 bulk candidate 는 현재 dead-end (결함)

`POST /supplier/products/bulk-candidates` 가 만드는 후보:

- `identifierType/identifierValue` 를 **채우지 않는다** — 표준코드/바코드는 `rawPayload.fields['의약품표준코드'|'바코드또는표준코드'|'바코드']` 에만 있다. → `normalizedIdentifierValue=NULL`, 검색/충돌 표시 불가.
- `sourceLabel='공급자 대량 등록'` → P1 `NOT_DRUG_SOURCE`. `sourceType='csv_import'` → P2 `STORE_REQUEST_NOT_FOUND`.
- `matched_product_master_id` 를 세워 줄 사전 매칭은 제거됨 → `link-to-listing` 도 `CANDIDATE_NOT_MATCHED`.
- 남는 운영자 액션 = `reject / archive / manual_review(reviewing)` 뿐.

즉 **공급자 대량 등록은 "후보를 쌓기만 하고 어디로도 못 가는 상태"** 다. 단건/대량 통합 WO 는 반드시 이 결함을 같이 닫아야 한다(후보 생성 시 identifier 채움 + 범용 승격 경로 개방).

### 3-4 통합 판정

- 테이블·service·상태 enum 이 이미 하나(`product_candidates` · `ProductCandidateService.createCandidate` · `ProductCandidateStatus`). **새 테이블·새 enum 불필요.**
- 통합 키 = `sourceType`(기존 값 `supplier_web` 이 이미 enum 에 있음 · 미사용) + `rawPayload.supplierId`. 단건 = `supplier_web`, 대량 = `csv_import`, 둘 다 `rawPayload.source='supplier_*'`.
- 공급자 후보의 **정체성 컬럼 부재**: `supplierId` 가 rawPayload 안 → 공급자별 "내 후보" 목록·권한 필터가 jsonb 조회. 범위 판단: 컬럼 추가(migration = 중지 조건)냐 jsonb 인덱스냐는 WO 에서 결정. 본 IR 은 **rawPayload 유지 + `submittedBy` 로 1차 필터** 로도 첫 WO 가 성립함을 확인.

---

## 4. Q3 — 유형별 최소 필드

`product_masters` NOT NULL: `regulatory_type · regulatory_name · name · manufacturer_name`(`status` 기본 ACTIVE · `is_mfds_verified` 기본 true → 범용 승격은 **명시적으로 false**). 나머지 전부 nullable.

| regulatory_type | 코드상 추가 필수 | 코드상 부수 보장 | 승격 시 최소 입력 제안 |
|---|---|---|---|
| DRUG | `drug_category ∈ otc/rx/drug_unspecified`(refine 가드) · Rx 는 P2 차단 · P1 은 표준코드 필수 | `ProductDrugExtension.ensureForProductMaster`(P1/P2 미호출 — refine 만) | 이름·제조사·**drug_category 확정** · 표준코드 권장(없으면 `isMfdsVerified=false` 로 생성은 허용하되 **공급 gate 에서 별도 검증**) · Rx 는 범용 승격 대상 제외 |
| QUASI_DRUG | 없음(`drug_category='quasi_drug'` 선택) | 없음 | 이름·제조사 |
| HEALTH_FUNCTIONAL | 없음 | 없음(전용 extension 없음) | 이름·제조사 (건기식 신고번호는 `product_identifiers` 나 rawPayload 로 보존, 컬럼 없음) |
| MEDICAL_DEVICE | 없음(`medical_device_grade` nullable) | 없음 | 이름·제조사 (`UDI_DI` identifier 있으면 기록) |
| COSMETIC | 없음 | 없음 | 이름·제조사(책임판매업자) |
| GENERAL | 없음 | 없음 | 이름·제조사 |

주의: P3 는 `regulatoryType` 기본값이 **한글 별칭 `'일반'`** 이고 P2 는 `'GENERAL'` 이다. `refineCandidateDrugCategory` 는 `['DRUG','의약품']` 둘 다 수용하는 것으로 보아 DB 에 두 표기가 혼재한다. 범용 승격은 **영문 코드만 쓰고** 별칭은 입력 단계에서 정규화한다(신규 drift 금지).

"바코드 없는 신규 = 상품명 하나로 Master 생성 가능"(P3) 은 baseline §5 정책(바코드는 전제조건 아님)과 맞지만, **제조사 없이 이름만으로 생성**되는 것은 dedup 축 하나가 비는 것이므로 범용 승격의 최소 필드는 **이름 + 제조사** 로 올린다(P2 와 동일).

---

## 5. Q4 — 사용자 확인 vs 운영자 확인

현재: **Candidate → Master 확정은 전부 운영자 액션**(`/operator/product-candidates/:id/promote-master` 는 `requireProductDbWrite`, store 요청은 admin-dashboard `StoreProductRequestsPage`). 공급자·매장이 스스로 Master 를 확정하는 경로는 없다. 반면 P3(단건 공급자 등록)는 **공급자 입력이 곧바로 Master** 가 된다 — 두 정책이 정반대다.

AI First 에서 "사용자 확인만으로 Master 확정" 을 열 범위를 코드 근거로 나누면:

| 조건 | 판정 근거 | 제안 |
|---|---|---|
| 기존 Master 와 barcode/identifier 정확일치 | 이미 `link` 로 취급(P1) · 덮어쓰기 없음 | **사용자 확인만으로 link** 가능 — Master 를 새로 만들지 않으므로 SSOT 오염 없음 |
| 이름+제조사 정확일치 | P2/P3 가 `created:false` 로 기존 반환 | 사용자에게 "이 제품 맞습니까" 제시 후 link. 다르다고 하면 운영자 검토(`reviewing`) |
| 신규 · GENERAL/COSMETIC/QUASI_DRUG/HEALTH_FUNCTIONAL/MEDICAL_DEVICE · 바코드 있음(GTIN 유효) · 충돌 0 | P2 가 이미 운영자 1회 클릭으로 처리하는 조건과 동일 | 사용자 확인으로 생성 허용 후보. `isMfdsVerified=false` · `product_data_status` 로 "사용자 확정" 표기 |
| 신규 · 바코드 없음 | dedup 이 이름+제조사뿐 | **운영자 확인** 유지(오염 위험이 가장 큰 구간) |
| DRUG(OTC) 신규 | baseline §12-4(OTC 를 일반 화면으로 처리 금지) · Extension 필요 | **운영자 확인** 유지 · 표준코드 있으면 P1 경로 우선 |
| Rx | baseline §10 · P2 `RX_NEW_MASTER_BLOCKED` | 사용자·운영자 모두 범용 승격 불가(P1 전용) |

이 표는 **정책 제안**이며 확정은 WO 에서 한다. 코드상 확실한 것은 "link 는 안전, 바코드 없는 신규와 DRUG 신규는 위험" 두 가지다.

---

## 6. Q5 — Master 확정 후 SupplierProductOffer

- P1·P2 모두 Offer 를 생성하지 않는다(P1 헤더 주석 명시 · baseline §6 경계).
- 공급자 후보에는 공급자 정체성이 rawPayload 에만 있고, 공급가(`candidatePrice`)만 후보 컬럼에 있다. 공급 방식·serviceKeys·B2B 설명은 후보에 없다.
- DRUG Offer gate(`assertDrugOfferAllowed`)는 serviceKeys 를 요구하므로 **Master 확정 직후 자동 Offer 생성은 의약품에서 반드시 실패**한다(1차 조사 §10 과 같은 충돌).

→ **자동 생성하지 않는다.** Master 확정(`approved_new_master` / `matched`+link)은 identity 단계에서 끝내고, Offer 는 "이 제품을 공급하겠다" 라는 **별도 명시 액션**(1차 조사 §4 의 `from-master` 형 전용 연결 API 와 같은 것)으로 만든다. `candidatePrice` 는 그 액션의 기본값으로만 넘긴다. 이렇게 하면 P3 의 "Master 는 생겼는데 Offer 는 실패" 반쪽 상태도 구조적으로 사라진다.

---

## 7. 첫 WO 에 넣을 수 있는 최소 경계 (제안 · 구현 아님)

```text
ProductCandidate (공급자 단건 supplier_web + 대량 csv_import, identifier 채움)
        ↓
소스 중립 Promotion Core  ← P2 approveAsNewMaster 에서 identity 부분 추출
  · dedup 3종(barcode · identifiers · 이름+제조사) → link | create | conflict | skip
  · 유형별 최소 필드(§4) · Rx 차단 · 영문 regulatory_type 만
  · 단일 TX(Master + Identifier + candidate 상태) · 커밋 후 Landing
  · DRUG 이면 ProductDrugExtension 보장
        ↓
P2 = Promotion Core + 매장 listing (기존 동작 보존)
P1 = 그대로 (약가마스터 전용, 접촉 금지)
P3 = createSupplierOffer 에서 resolveOrCreateMaster 호출 제거 방향 (Offer 는 확정 Master 만 받음)
        ↓
Offer 생성 = 별도 명시 액션 (DRUG gate 는 여기서만)
```

첫 WO 에 **넣지 않는 것**: 사용자 자가확정 정책 확정(§5 표는 후속 결정) · `supplierId` 컬럼 추가(migration) · Offer 자동화 · ChatGPT/OCR 입력 · 승인(`offer_service_approvals`) 재설계.

## 8. 중지 조건 · 위험

- `product_candidates` 컬럼 추가 · `product_masters` 변경 = migration(중지 조건). 본 IR 의 첫 WO 안은 **DDL 0** 으로 성립한다(`sourceType='supplier_web'` enum 값 기존재 · rawPayload 활용).
- P1(약가마스터 승격)은 실운영 데이터 파이프라인 — 리팩터링 범위에서 제외.
- P2 는 admin-dashboard `StoreRequestReviewModal` 이 소비 중 — 추출 시 응답 계약(`StoreRequestActionResult`) 불변 유지.
- `regulatory_type` 한글 별칭(`'일반'`·`'의약품'`) 잔존 데이터는 별도 정리 대상(보고만).

## 9. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건 — `O4O-PRODUCT-CORE-BASELINE-V1` 의 Candidate 경유 원칙과 현재 코드(P3 만 예외)의 차이는 baseline drift 가 아니라 **코드가 baseline 을 아직 못 따라간 것**이므로 기준 문서 수정 없음.
