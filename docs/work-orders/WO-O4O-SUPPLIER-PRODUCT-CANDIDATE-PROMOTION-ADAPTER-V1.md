# WO-O4O-SUPPLIER-PRODUCT-CANDIDATE-PROMOTION-ADAPTER-V1

> **상태:** READY FOR EXECUTION · HANDOFF ONLY · 구현 WO (등록일 2026-09-19 · 실행 착수는 별도 명시 지시)
> **기준 코드:** `origin/main` `9b201b504`(② CHECK) 이후 — 접수 시점 `1846bf355`
> **목적:** 공급자 Candidate(단건 `supplier_web` · 대량 `csv_import`/`'공급자 대량 등록'`)를 **하나의 Supplier Promotion Adapter 계열**로 Promotion Core 에 연결해, 공급자 후보의 dead-end 를 백엔드 수준에서 해소한다. 신규 Master 는 **GENERAL · COSMETIC 만** 생성하고, 규제 제품(DRUG/HFF/QUASI/MEDICAL_DEVICE)은 **기존 Master exact link 만** 허용한다
> **선행:** ① [`WO-…-GENERAL-PROMOTION-CORE-FOUNDATION-V1`](WO-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1.md)(`cc287d3ee`) · ② [`WO-…-SINGLE-PRODUCT-CANDIDATE-INTAKE-V1`](WO-O4O-SUPPLIER-SINGLE-PRODUCT-CANDIDATE-INTAKE-V1.md)(`02f71d6d9`) · [② CHECK](../checks/CHECK-O4O-SUPPLIER-SINGLE-PRODUCT-CANDIDATE-INTAKE-V1.md) §9 · ③ 조사(2026-09-19 · `9b201b504` 기준 · 세션 인라인)
> **기준 문서:** [`O4O-PRODUCT-CORE-BASELINE-V1`](../baseline/O4O-PRODUCT-CORE-BASELINE-V1.md) §2 · §5 · §6 · §12 (Candidate 경유 · Master immutable 4필드 · Master 확정 ≠ Offer · 공급자 전용 필드의 Product Core 상승 금지) · [`O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1`](../baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md)(F12) · [`RBAC-FREEZE-DECLARATION-V1`](../rbac/RBAC-FREEZE-DECLARATION-V1.md)(F9 — `requireProductDbWrite=requireAdmin` 유지)
> **후속(이 WO 가 아님):** ④ Existing Master 직접 연결 전용 API(공급자가 처음부터 Master 를 고른 경우 Candidate 없이 검증된 masterId 사용) → ⑤ `createSupplierOffer` 에서 `resolveOrCreateMaster` 제거 → ⑥ 제품 등록 UI AI First → ⑦ ChatGPT/사진/PDF/URL 입력

---

# 1. 목표와 배경

## 1.1 문제

| 경로 | 현재 | 문제 |
|---|---|---|
| ② 단건 `supplier_web` / `neture-supplier-single` | identifier · regulatoryType · drugCategory · `rawPayload.supplierId` · `offerDraft` 채워짐 · `pending` | Core 로 가는 **Adapter 가 없다** |
| 대량 `csv_import` / `'공급자 대량 등록'` | `identifier_type/value` **비어 있음** · 식별자는 `rawPayload.fields['바코드'·'의약품표준코드'·'보험코드'·'품목신고번호'·'공급자상품코드'…]` 에만 | dedup 축 ①·② 미동작 · Adapter 없음 (IR §3-3 dead-end) |
| 기존 `POST /operator/product-candidates/:id/promote-master` | `promoteMasterFromCandidate()` — **Drug 공공 seed 전용**(`NOT_PROMOTABLE_*`) | 공급자 후보에 쓰면 의미가 바뀐다. 손대지 않는다 |
| ② mapper `deriveSupplierCandidateProductType` | `DRUG + quasi_drug` 허용 → `drug_category='quasi_drug'` 인데 `product_type='otc_drug'` | **모순**(조사 정정 ②) |
| ② mapper HFF/MEDICAL_DEVICE | `product_type='non_drug'` 고정 | `classifyProductType()` 이 `rawPayload.product_type` 을 `regulatoryType` 보다 먼저 보므로 운영자 화면에서 **HFF 가 비의약품으로 분류**(조사 정정 ③) |
| ② CHECK §9 인계 | `mfdsPermitNumber → MFDS_CODE(identityKey=false)` 권장 | **철회**. `MFDS_CODE` 는 공공 seed 의 `ITEM_SEQ`/`mfdsCode` 이고 `mfdsPermitNumber` 는 `ProductMaster.mfdsPermitNumber`(immutable 허가번호 필드). 둘은 다른 것(조사 정정 ①) |

**운영 read-only 실측(2026-09-19 · Cloud SQL Auth Proxy)** — WO 설계에 직접 영향:

| 사실 | 값 | 영향 |
|---|---|---|
| `source_type='csv_import'` 는 공급자 전용이 아님 | `mfds-drug-master-standard-code_2025-10-31` **305,522건**(approved 176,632 · archived 128,109 · matched 781) 이 같은 `csv_import` | **Bulk Normalizer 는 `source_type` 으로 인식하면 안 된다.** `source_label='공급자 대량 등록'` **AND** `rawPayload.source='supplier_bulk_upload'` 둘 다 만족할 때만 |
| 운영의 공급자 bulk 후보 | **0건** · 단건 `supplier_web` **0건** | 데이터 보정 불필요 · 정책을 자유롭게 정할 수 있는 시점 |
| `product_masters.regulatory_type` 한글 별칭 | `건강기능식품` **40,948** · `일반` 15 · 깨진 값 1 (영문 `HEALTH_FUNCTIONAL` 은 0) | regulatoryType 일치 검사(§2.4)는 **별칭 정규화 없이는 HFF 전체가 mismatch**. backfill 은 이 WO 에 끌어오지 않는다(별도 WO · ① CHECK §10) |

## 1.2 이번 WO 의 완료 목표

```text
supplier_web / 'neture-supplier-single'          csv_import / '공급자 대량 등록'
   (rawPayload.source='supplier_single')            (rawPayload.source='supplier_bulk_upload')
              ↓                                                 ↓
      Single Normalizer                                  Bulk Normalizer
              └──────────────► NormalizedSupplierCandidate ◄─────┘
                                          ↓
                          Supplier Promotion Plan Builder   ← 1개
                                          ↓
                               ProductPromotionPlan
                                          ↓
   dataSource.transaction(m):
       outcome = core.promoteWithin(m, plan)
       Supplier 정책 후검사 (create 허용 제품군 · link 시 regulatoryType 일치)
       위반 → throw → 롤백 (Master · Identifier · candidate 상태 전부 원복)
   커밋 후 core.afterCommit(plan, outcome)
                                          ↓
      POST /api/v1/operator/product-candidates/:id/promote-supplier
```

완료 정의:

1. 단건 · bulk 두 후보가 **같은 Plan Builder** 를 거쳐 Core 로 간다. Plan Builder 는 `rawPayload.source` 로 분기하지 않는다(Normalizer 가 이미 흡수).
2. **create 는 GENERAL · COSMETIC 만.** DRUG(otc) · HEALTH_FUNCTIONAL · QUASI_DRUG · MEDICAL_DEVICE 는 Core 가 `create` 를 내면 Adapter 가 `SUPPLIER_REGULATED_CREATE_BLOCKED` 로 throw → 롤백 → candidate `pending` 유지. exact **link 는 허용**하되 기존 Master 의 regulatoryType(한글 별칭 정규화 후) 이 후보와 다르면 `SUPPLIER_REGULATORY_TYPE_MISMATCH` throw → 롤백. Rx 는 Core 의 `rx_not_promotable` hold 그대로.
3. bulk 후보의 식별자는 `rawPayload.fields` 에서 정규화한다(신규 bulk intake 가 identifier 컬럼을 채우게 되더라도 **fallback 은 남는다**).
4. ② mapper 의 모순 2건(`DRUG+quasi_drug` · HFF `product_type`) 이 제거된다.
5. `promote()` 외피는 쓰지 않는다. **`promoteWithin()` 만**.
6. DDL 0 · Offer 생성 0 · P1(`drug-import/**`) · P3(`createSupplierOffer`/`resolveOrCreateMaster`) · 기존 `promote-master` route · store_web Adapter · UI 접촉 0.

## 1.3 원칙

- **Core 는 그대로.** Supplier 정책(제품군별 create 허용 · regulatoryType 일치)은 **Adapter 의 후검사**다. Core 에 `if (regulatoryType === …)` 를 넣지 않는다(① §1.3). Core 의 `PromotionHoldReason`/`PromotionConflictReason` 도 확장하지 않는다 — Supplier 전용 사유는 Adapter 의 에러 코드로 표현한다.
- **공급자 입력은 미검증 정보다.** Master 의 immutable 4필드(`regulatory_type` · `regulatory_name` · `manufacturer_name` · `mfds_permit_number`)를 공급자 입력만으로 확정하는 것은 GENERAL · COSMETIC 에서만 허용한다. 규제 제품의 신규 Master 는 공식 원천(정부 데이터 Adapter) 이 붙은 뒤의 일이다.
- **`mfdsPermitNumber` · `품목신고번호` 는 evidence 로만 보존.** `ProductIdentifier` 로 만들지 않는다. `MFDS_CODE` 로 변환하지 않는다.
- **공급자 상품코드(`공급자상품코드` · SKU)는 Master 식별자가 아니다.** `SUPPLIER_SKU` 는 union 에서 폐기됐다. `UNKNOWN` 으로 우회 승격하지 않는다. `rawPayload` 보존 → ⑤ 에서 Offer 속성 검토.
- **승격 권한은 바꾸지 않는다.** `requireProductDbWrite = requireAdmin = platform:super_admin`. `neture:operator` 는 후보 검토/반려까지. 이 경계는 F9 · Product DB 권한 계약(`product-db-write-authority.test.ts`).
- **`csv_import` 는 공급자의 것이 아니다.** 공공 seed 305,522건과 공유. Bulk Normalizer 의 인식 조건은 `source_label + rawPayload.source` 둘 다.

## 1.4 다른 세션 보호

다중 세션이 `main` 에 직접 커밋한다. `git fetch origin` → `git status -sb` 후 착수, 타 세션의 dirty · 미추적 파일 불가침, path-specific stage · `git commit -- <paths>` 만 사용. 동일 WO 가 이미 origin 에 push 돼 있으면 그 정본을 유지하고 결함만 전달한다.

---

# 2. 승인 범위

## 2.1 신규 — Supplier Normalizer 2개 + `NormalizedSupplierCandidate` (`apps/api-server/src/modules/neture/promotion/adapters/supplier/` 권장)

```ts
// 두 Normalizer 의 공통 출력. Plan Builder 는 이것만 안다.
interface NormalizedSupplierCandidate {
  candidateId: string;
  supplierId: string;                         // rawPayload.supplierId — 없으면 normalize 실패 (SUPPLIER_ID_MISSING)
  origin: 'single' | 'bulk';                  // 로그·approvalMeta 용. Plan Builder 는 이 값으로 분기하지 않는다
  regulatoryType: PromotionRegulatoryType;    // 영문 canonical
  drugCategory: 'otc' | 'rx' | null;          // DRUG 일 때만 · quasi 는 regulatoryType=QUASI_DRUG + null
  name: string | null;                        // trim · 비면 null (Core 가 hold)
  manufacturerName: string | null;
  specification: string | null;
  barcode: string | null;                     // GTIN-like 로 확정된 값만 (EAN13/GTIN/UPC/JAN)
  identifiers: Array<{ type: ProductIdentifierType; value: string; identityKey: boolean; isPrimary: boolean }>;
  evidence: {                                 // Master/Identifier 로 올리지 않는 근거 정보 — approvalMeta 에 그대로
    regulatoryName: string | null;
    mfdsPermitNumber: string | null;          // 단건
    reportNo: string | null;                  // bulk '품목신고번호'
    supplierSku: string | null;               // 단건 없음 · bulk '공급자상품코드'
    originCountry: string | null;
    categoryId: string | null;
  };
}
```

**Single Normalizer** (`normalizeSingleSupplierCandidate(candidate)`):
- 인식 조건: `sourceType='supplier_web'` AND `sourceLabel='neture-supplier-single'` AND `rawPayload.source='supplier_single'`. 아니면 `null`(다른 Normalizer 차례).
- `regulatoryType` ← `rawPayload.regulatoryType`(영문) · `drugCategory` ← DRUG 면 `rawPayload.drugCategory`(`otc|rx`) · 그 외 `null`.
- 식별자: candidate 컬럼 `identifierType/identifierValue` 사용. `EAN13|GTIN|UPC|JAN` → `identityKey=true` · `isPrimary=true` · `barcode` 에도 채움. `UNKNOWN` → `identityKey=false` · `isPrimary=false` · `barcode=null`. 없으면 `identifiers=[]`.
- `evidence.mfdsPermitNumber` ← `rawPayload.mfdsPermitNumber` (식별자로 만들지 않음).

**Bulk Normalizer** (`normalizeBulkSupplierCandidate(candidate)`):
- 인식 조건: `sourceType='csv_import'` AND `sourceLabel='공급자 대량 등록'` AND `rawPayload.source='supplier_bulk_upload'`. 셋 중 하나라도 아니면 `null`. **`csv_import` 단독 인식 금지**(공공 seed 305,522건).
- `regulatoryType/drugCategory` ← `rawPayload.regulatoryType`/`drugCategory`(typeInfo) — `unclassified`/`unknown`(둘 다 null) 은 normalize 실패 `SUPPLIER_PRODUCT_TYPE_UNCLASSIFIED`(운영자가 유형을 정한 뒤에만 승격). `quasi_drug` 는 `QUASI_DRUG + null` 로 canonicalize.
- `name/manufacturerName/specification` ← candidate 컬럼(bulk intake 가 이미 채움). 비어 있으면 `rawPayload.fields['제품명'|'제조사'|'규격'|'포장단위']` fallback.
- 식별자 — **candidate 컬럼이 비어 있으면 `rawPayload.fields` fallback** (이 fallback 은 영구 유지):

| `fields` 키 | 처리 |
|---|---|
| `바코드` | GTIN-like 판정 → `EAN13/GTIN` · `identityKey=true` · `isPrimary=true` · `barcode` 채움. 비-GTIN → `UNKNOWN` · `identityKey=false` |
| `의약품표준코드` | `KOREA_DRUG_CODE` · `identityKey=true`(P1 이 dedup 축으로 쓰는 코드) · `isPrimary` 는 바코드 없을 때만 |
| `보험코드` | `KOREA_INSURANCE_CODE` · `identityKey=false` |
| `바코드또는표준코드` | 값 형식으로 판정: GTIN-like → 바코드 규칙 · 아니면 `regulatoryType=DRUG` 일 때만 `KOREA_DRUG_CODE`(identityKey=true) · 그 외 `UNKNOWN`(identityKey=false) |
| `품목신고번호` | **식별자로 만들지 않음** → `evidence.reportNo` |
| `공급자상품코드` | **식별자로 만들지 않음** → `evidence.supplierSku` |

- candidate 컬럼에 identifier 가 이미 있으면 그것을 우선하고 `fields` 에서 **추가** 식별자(보험코드 등)만 보강한다. 같은 `(type, normalized)` 중복은 제거.

**Normalizer 실패 코드**(Adapter 에러 · Core hold 아님): `SUPPLIER_ID_MISSING` · `SUPPLIER_PRODUCT_TYPE_UNCLASSIFIED` · `SUPPLIER_CANDIDATE_NOT_SUPPLIER_SOURCE`(두 Normalizer 모두 `null`).

## 2.2 신규 — Supplier Promotion Plan Builder + 정책 후검사 + 실행 서비스

```ts
buildSupplierPromotionPlan(n: NormalizedSupplierCandidate, ctx: { reviewedBy: string | null; note: string | null }): ProductPromotionPlan
```
- `master` ← `regulatoryType` · `drugCategory` · `name ?? ''` · `manufacturerName ?? ''` · `specification` · `barcode`. 합성 금지(빈 값은 Core 가 `name_missing`/`manufacturer_missing` hold).
- `identifiers[]` ← `n.identifiers` + `sourceType='supplier_candidate'` · `sourceLabel=n.origin==='single' ? 'neture-supplier-single' : '공급자 대량 등록'` · `verificationStatus='supplier_provided'`.
- `dedupHints.nameManufacturerExact = true`.
- `effects.ensureDrugExtension = (regulatoryType === 'DRUG')`.
- `approvalMeta = { kind: 'supplier', origin, supplierId, evidence }`.
- `landingSource = 'supplier-candidate'`.
- Plan Builder 는 `origin` 으로 **분기하지 않는다**(라벨 문자열에만 쓴다).

**정책 후검사** (`assertSupplierPolicy(m, n, outcome)` — 같은 TX 안 · `PromotionOutcome` 을 받아 throw 또는 통과):

| outcome | 조건 | 결과 |
|---|---|---|
| `create` | `regulatoryType ∈ {GENERAL, COSMETIC}` | 통과 |
| `create` | `regulatoryType ∈ {DRUG, HEALTH_FUNCTIONAL, QUASI_DRUG, MEDICAL_DEVICE}` | throw `SUPPLIER_REGULATED_CREATE_BLOCKED` → 롤백 · candidate `pending` 유지 · 응답 `hold` 로 표현(§2.3) |
| `link` | 같은 TX 로 `product_masters.regulatory_type` 읽어 **별칭 정규화** 후 `n.regulatoryType` 과 비교 · 같으면 통과 | 통과 |
| `link` | 다르면 | throw `SUPPLIER_REGULATORY_TYPE_MISMATCH` → 롤백 |
| `link` | `regulatoryType=DRUG` 이고 기존 Master `drug_category='rx'` | throw `SUPPLIER_RX_LINK_BLOCKED` → 롤백 (Core 는 후보 쪽 rx 만 막는다) |
| `conflict` · `hold` | Core 가 write 0 이므로 후검사 없음 | 그대로 반환 |

별칭 정규화(비교 전용 · DB 수정 아님 · 순수 함수 `canonicalizeRegulatoryType(raw)`): `일반|general→GENERAL` · `화장품|cosmetic→COSMETIC` · `건강기능식품|health_functional→HEALTH_FUNCTIONAL` · `의약외품|quasi_drug|quasi→QUASI_DRUG` · `의료기기|medical_device→MEDICAL_DEVICE` · `의약품|drug→DRUG` · 그 외(깨진 값 포함) → `null` = mismatch 로 취급(안전 쪽). 이 함수는 `store-web-promotion.adapter.ts` 의 `classificationToRegulatory` 를 **수정하지 않고** 별도로 둔다(입력 어휘가 다름).

**실행 서비스** (`SupplierCandidatePromotionService.promote(candidateId, ctx)`):

```ts
const candidate = await load(candidateId);                     // 없으면 CANDIDATE_NOT_FOUND
const n = normalizeSingle(candidate) ?? normalizeBulk(candidate); // 둘 다 null → SUPPLIER_CANDIDATE_NOT_SUPPLIER_SOURCE
const plan = buildSupplierPromotionPlan(n, ctx);
const outcome = await dataSource.transaction(async (m) => {
  const o = await core.promoteWithin(m, plan);
  await assertSupplierPolicy(m, n, o);                          // throw → 롤백
  return o;
});
await core.afterCommit(plan, outcome);                          // DRUG extension(선언 시) · Landing — best-effort
return outcome;
```

P2(`store-product-request-admin.service.ts` 229~262) 와 같은 골격. `promote()` 외피 호출 0(소스 계약 테스트로 고정).

## 2.3 신규 — route `POST /api/v1/operator/product-candidates/:id/promote-supplier`

- 위치: `product-candidate.controller.ts` 에 route 1개 추가(기존 `promote-master` 본문 불변). guard: 라우터 상단 `authenticate → requireRole(OPERATOR_ROLES) → injectServiceScope` 그대로 + **`requireProductDbWrite`**(= `requireAdmin` = `platform:super_admin`). 권한 상수 변경 0.
- body: `{ note?: string }`. `reviewedBy = req.user.id`.
- 응답(Core 결과 유지 + Supplier 사유):

```ts
200 { success:true, data: { outcome:'create'|'link', masterId, identifiersCreated, matchType?, existingMasterDiff? } }
200 { success:true, data: { outcome:'conflict', reason, masters } }
200 { success:true, data: { outcome:'hold', reason } }          // Core hold 사유 그대로 (name_missing · rx_not_promotable …)
409 { success:false, error:'SUPPLIER_REGULATED_CREATE_BLOCKED' | 'SUPPLIER_REGULATORY_TYPE_MISMATCH' | 'SUPPLIER_RX_LINK_BLOCKED',
      message, data:{ regulatoryType, existingMaster?:{id, regulatoryType} } }   // 롤백됨 · candidate 불변
400 { success:false, error:'SUPPLIER_ID_MISSING' | 'SUPPLIER_PRODUCT_TYPE_UNCLASSIFIED' | 'SUPPLIER_CANDIDATE_NOT_SUPPLIER_SOURCE' }
404 { success:false, error:'CANDIDATE_NOT_FOUND' }
```

`conflict`/`hold` 를 2xx 로 두는 것은 "Core 가 판단했고 write 0" 이라는 의미이며 기존 `promote-master` 의 관례(`NOT_PROMOTABLE_*`→400)와 다르다. 이 WO 는 Core outcome 을 그대로 노출하는 쪽을 택한다 — 실행자가 P2 소비처와 맞추기 위해 400 으로 통일하고 싶으면 CHECK 에 근거를 적고 바꿔도 된다(단 `409` 롤백 계열은 유지).

## 2.4 변경 — ② mapper 모순 제거 (`supplier-single-candidate.mapper.ts` · 테스트 동반)

1. `SUPPLIER_CANDIDATE_DRUG_CATEGORIES = ['otc', 'rx']` — `quasi_drug` 제거. `regulatoryType=DRUG` + `drugCategory='quasi_drug'` 는 400 `DRUG_CATEGORY_REQUIRED`(메시지: 의약외품은 `regulatoryType=QUASI_DRUG`). `QUASI_DRUG` 의 `drugCategory` 는 `null`(현행).
2. HFF/MEDICAL_DEVICE 의 `rawPayload.product_type` — `classifyProductType()` 이 `product_type` 을 먼저 보므로 `non_drug` 를 넣으면 오분류. 해결은 **둘 중 하나**를 실행자가 택하고 CHECK 에 근거를 적는다:
   - (a) `product-type.util.ts` `classifyProductType()` 에 additive fallback: `rawPayload.regulatoryType`(영문/별칭) 을 `input.regulatoryType` 이 없을 때 읽는다. mapper 는 HFF/MEDICAL_DEVICE 에 `product_type` 을 **넣지 않는다**(`drug_category=null`). 공유 util 변경이므로 **소비처 3곳**(`product-candidate.service.ts` 210 · 214 · 459) 의 동작이 바뀌지 않음을 테스트로 증명(`product_type`/`drug_category` 가 있는 기존 rawPayload 는 우선순위상 영향 0).
   - (b) util 무접촉 · mapper 가 HFF 에 `product_type='health_functional'` 를 넣고 `fromDrugCategory` 에 `health_functional` 케이스만 additive 추가. MEDICAL_DEVICE 는 `ProductTypeClass` 에 값이 없어 `non_drug` 로 남는다(한계를 CHECK 에 기록).
   - 권장 (a). 어느 쪽이든 `deriveSupplierCandidateProductType` 은 `DRUG`(otc/rx) · `QUASI_DRUG` 에만 `product_type` 을 돌려주고 나머지는 `null`.
3. ② CHECK §9 의 `mfdsPermitNumber → MFDS_CODE` 인계는 **철회** — 이 WO §1.3. ② CHECK 본문은 기록물이므로 수정하지 않고 이 WO 가 대체 사실을 적는다.

## 2.5 허용되는 부수 작업

- `product-candidate.controller.ts` route 1개 + import · `register-routes.ts` 접촉 0(기존 마운트 재사용).
- `ProductIdentifier.entity.ts` 주석에 `supplier_candidate` sourceType 값 한 줄(컬럼 아님 · varchar 값) — 선택.
- `docs/checks/CHECK-O4O-SUPPLIER-PRODUCT-CANDIDATE-PROMOTION-ADAPTER-V1.md` 작성.
- 기준 문서(`O4O-PRODUCT-CORE-BASELINE-V1` 등) 수정 **0** — ③ 까지 끝났으므로 다음은 "Promotion Core 위치 · Supplier 정책(create 허용 제품군)" 을 기준 문서에 올리는 **별도 문서 WO** 를 완료 보고에서 제안한다(§16-4).

---

# 3. 실행 순서

1. **읽기**: ① CHECK 전문(특히 §1 계약 이름 · §9) · `promotion/product-promotion.types.ts` · `product-promotion-core.service.ts` · `adapters/store-web-promotion.adapter.ts`(패턴만 · 수정 금지) · P2 서비스 229~262(`promoteWithin` 골격) · ② mapper · bulk handler(`supplier-product.controller.ts` 534~660 · `BULK_TYPE_MAP` · rawPayload 키) · `services/web-neture/src/lib/bulkUploadValidation.ts` 의 정규화 한글 필드명(35~52 · 94~98) · `product-type.util.ts` `classifyProductType` · `ProductIdentifier.entity.ts` union · `product-candidate.controller.ts` guard/OPERATOR_ROLES/`promote-master`.
2. **`canonicalizeRegulatoryType` + Normalizer 2개 + `NormalizedSupplierCandidate`** — 순수 함수 · DB 없음 · 단위테스트 먼저.
3. **Plan Builder + `assertSupplierPolicy`** — InMemory store(① 의 `__tests__/in-memory-promotion-store.ts`) 위에서 `promoteWithStore` 로 create/link/conflict/hold 각 경로 + 정책 throw 테스트.
4. **실행 서비스 + route** — supertest(`requireProductDbWrite` 403 · 200 outcome 4종 · 409 롤백 3종 · 400/404).
5. **② mapper 수정**(§2.4) + 기존 30건 테스트 갱신 + (a) 선택 시 util 소비처 회귀 테스트.
6. **소스 계약 테스트**: Adapter 파일들에 `promote(` 외피 호출 0 · `createSupplierOffer`/`resolveOrCreateMaster`/`offer.service` 참조 0 · Core 파일 `git diff` 0 · `drug-import/**` 0 · `store-web-promotion.adapter.ts` 0 · Bulk Normalizer 가 `sourceLabel` 과 `rawPayload.source` 둘 다 검사함(문자열 존재).
7. `pnpm --filter @o4o/api-server build` · 영향 subset jest · `node scripts/lint-ratchet.mjs`. 전체 jest 는 CI(`--maxWorkers=1`)에 맡기되 로컬에서 돌리면 `NODE_OPTIONS=--max-old-space-size=6144 npx jest --maxWorkers=1`(② CHECK §5-1).
8. **프로덕션 smoke**(§6.1) — 공급자 후보가 0건이고 ② 의 계정 연결 PENDING 이 그대로이므로 **201 intake → promote-supplier 실측은 PENDING 이 기본**. 대신 `platform:super_admin` 계정으로 (a) 공공 seed `csv_import` 후보 1건에 `promote-supplier` → **400 `SUPPLIER_CANDIDATE_NOT_SUPPLIER_SOURCE`** (Bulk Normalizer 의 오인식 방지 실증 · write 0) (b) 존재하지 않는 id → 404 (c) `neture:operator` 계정 → 403. 이 세 가지는 계정 연결 없이 가능하다면 수행.
9. CHECK 작성 → path-specific stage → `node scripts/git/check-staged-scope.mjs <경로>` → `git commit -- <경로>` → push. 코드 CI 완주 후 CHECK 커밋(CI 취소 방지).

---

# 4. 제외 범위

- **Promotion Core 본문 · 타입 · store · decide** — 접촉 0. `PromotionHoldReason`/`PromotionConflictReason` 확장 0. Supplier 사유는 Adapter 에러 코드.
- **store_web Adapter · P2 서비스 · `promote-master`(Drug seed 전용) route 본문** — 접촉 0.
- **P1** `drug-import/**` · Medical Device Gate B · HFF/Quasi 공공 import — 접촉 0.
- **P3** `createSupplierOffer` · `resolveOrCreateMaster` · `POST /supplier/products` — 접촉 0. 제거는 ⑤.
- **`SupplierProductOffer` 생성 · `offerDraft` 소비 · DRUG 공급 gate · `offer_service_approvals`** — 0. `offerDraft` 는 `approvalMeta.evidence` 로 넘기지 않아도 된다(rawPayload 에 남아 있음).
- **bulk intake handler(`bulk-candidates`) 가 identifier 컬럼을 채우도록 바꾸는 것** — 이 WO 는 Normalizer fallback 으로 흡수한다. intake 개선은 선택이 아니라 **제외**(bulk 컨트롤러 무접촉 유지 · 후보 0건이라 이득 없음). 필요해지면 별도 WO.
- **`product_masters.regulatory_type` 한글 별칭 backfill(40,948건 UPDATE)** — 0. 비교 시 정규화만. backfill 은 별도 WO(① CHECK §10 제안 유지).
- **권한 변경**(`requireProductDbWrite` · `OPERATOR_ROLES` · 서비스 운영자에게 Master 생성 권한) — 0.
- **`product_candidates` · `product_masters` · `product_identifiers` schema · 인덱스 · migration** — 0.
- **UI**(web-neture 운영자 후보 화면 · admin-dashboard) — 0. `promote-supplier` 버튼은 별도 WO(응답 계약이 굳은 뒤).
- **④ Existing Master 직접 연결 API** — 이 WO 아님.
- **공급자 SKU 의 Offer 속성화** — ⑤.

---

# 5. 중지 조건

| # | 조건 | 왜 |
|---|---|---|
| A | Supplier 정책 후검사를 Core 밖에서 표현할 수 없어 Core 타입/결정 변경이 필요함 | Core 소스 중립 전제. 설계 재검토 |
| B | `promoteWithin` 안에서 throw 해도 롤백되지 않는 경로가 발견됨(예: `afterCommit` 이 TX 안에서 호출됨) | 원자성 전제. Core 결함이면 별도 WO |
| C | schema · migration 필요 | DDL 0 |
| D | `classifyProductType` fallback(§2.4 (a))이 기존 소비처 3곳의 분류 결과를 바꿈이 테스트로 확인됨 | 공유 util 회귀. (b) 로 전환하거나 보고 |
| E | `product_masters.regulatory_type` 에 위 별칭표로 정규화되지 않는 값이 **다수**(깨진 값 1건 외) 존재해 link 가 대량 mismatch | 데이터 판단은 사용자. 별칭표 확장은 WO 범위 밖 |
| F | `platform:super_admin` 테스트 계정으로 smoke 불가 · 공급자 후보 0건 | PENDING 기록. 데이터 생성 write 는 승인 없이 하지 않음 |
| G | 현재 변경과 무관한 build · test 실패 · 타 세션 dirty 파일 접촉 필요 | 상시 규칙 |

---

# 6. 검증과 Git

## 6.1 검증

| 항목 | 방법 | PASS 기준 |
|---|---|---|
| `canonicalizeRegulatoryType` | jest | 영문 6종 · 한글 별칭 6종 · 소문자 · 공백 · 깨진 값→null |
| Single Normalizer | jest | 인식 조건 3개 모두 검사(하나라도 다르면 null) · EAN13→identityKey true+barcode · UNKNOWN→false+barcode null · identifier 없음→[] · `mfdsPermitNumber` 가 identifiers 에 **없음** · supplierId 없음→`SUPPLIER_ID_MISSING` |
| Bulk Normalizer | jest | 인식 조건 3개(특히 `csv_import`+공공 seed 라벨 → null · `csv_import`+`'공급자 대량 등록'`+`source` 없음 → null) · `fields` fallback 6키 각각 · `바코드또는표준코드` 형식/제품군 분기 · `품목신고번호`/`공급자상품코드` 가 identifiers 에 **없음**(evidence 에 있음) · candidate 컬럼 우선 + fields 보강 + 중복 제거 · `unclassified`→`SUPPLIER_PRODUCT_TYPE_UNCLASSIFIED` · `quasi_drug`→`QUASI_DRUG+null` |
| Plan Builder | jest | `origin` 별 라벨만 다르고 나머지 동일 · `effects.ensureDrugExtension` DRUG 만 true · `approvalMeta.kind='supplier'` · `landingSource='supplier-candidate'` · 빈 name/manufacturer 는 `''` 로 전달(합성 없음) |
| 정책 후검사 + 실행 | jest · InMemory store · `promoteWithStore` 또는 TX mock | GENERAL create 통과 · COSMETIC create 통과 · HFF/QUASI/MEDICAL_DEVICE/DRUG(otc) create → throw `SUPPLIER_REGULATED_CREATE_BLOCKED` + **store write 카운터 롤백 확인(candidate 상태 pending 유지)** · link + 같은 regulatoryType(한글 별칭 `건강기능식품` vs `HEALTH_FUNCTIONAL`) 통과 · link + 다른 regulatoryType → `SUPPLIER_REGULATORY_TYPE_MISMATCH` · link + 기존 rx → `SUPPLIER_RX_LINK_BLOCKED` · 후보 rx → Core hold `rx_not_promotable`(throw 아님) · conflict 그대로 · `afterCommit` 은 성공 커밋 후 1회 · throw 시 0회 |
| route | supertest | `platform:super_admin` 만 200/409 · `neture:operator`/`neture:admin` 403 · 미인증 401 · 응답 shape 4종 + 409 3종 + 400 3종 + 404 |
| ② mapper 회귀 | 기존 30건 갱신 | `DRUG+quasi_drug` 400 · HFF `product_type` 규칙 변경 반영 · 나머지 불변 |
| 소스 계약 | 파일 원문 | `promote(` 외피 0 · P3/offer 참조 0 · Bulk Normalizer 에 `'공급자 대량 등록'` 과 `'supplier_bulk_upload'` 문자열 둘 다 존재 · `MFDS_CODE` 문자열이 supplier adapter 디렉터리에 없음 · `SUPPLIER_SKU` 없음 |
| 무접촉 | `git diff --stat origin/main -- promotion/product-promotion*.ts promotion/adapters/store-web-promotion.adapter.ts drug-import services/offer.service.ts services/catalog.service.ts services/store-product-request-admin.service.ts controllers/supplier-product.controller.ts services/web-neture apps/admin-dashboard` | 0 files |
| 빌드 · 정적 | build · 영향 subset jest · lint ratchet | 전부 PASS(무관한 실패는 원문 보고) |
| 프로덕션 smoke | §3-8 (a)(b)(c) + read-only: `product_masters`/`product_identifiers` count 전후 동일 · 대상 후보 상태 불변 | 계정이 없으면 PENDING 사유 명시 — PASS 로 쓰지 않는다 |

## 6.2 Git

- 커밋 단위 권장: ① Normalizer/canonicalize + 테스트 ② Plan Builder/정책/서비스/route + 테스트 ③ ② mapper 수정 ④ CHECK. 합쳐도 무방(CHECK 는 CI 완주 후 별도).
- 커밋 메시지 끝에 `(WO-O4O-SUPPLIER-PRODUCT-CANDIDATE-PROMOTION-ADAPTER-V1)`.
- `git add <path>` · `node scripts/git/check-staged-scope.mjs <paths>` · `git commit -m "..." -- <paths>` · `git push origin main`. `--force` 금지.
- 완료 = 이 WO 범위 미커밋 0건 + `HEAD == origin/main`.

---

# 7. 완료 보고

WO 제목을 첫 줄에 두고 한국어로. 다음 항목을 **전부** 포함한다.

1. 신설 파일 · `NormalizedSupplierCandidate` 최종 필드 · Normalizer 인식 조건 · route/guard
2. Supplier 정책표(§2.2) 최종본 — create 허용 제품군 · link 검사 · 에러 코드 집합 · 응답 상태코드 결정(2xx hold/conflict 유지 여부와 근거)
3. bulk 식별자 fallback 표 최종본 — `fields` 키별 type/identityKey · evidence 로 남긴 키
4. ② mapper 수정 내용 — `DRUG+quasi_drug` · HFF `product_type` 선택지 (a)/(b) 와 근거 · util 소비처 3곳 회귀 결과
5. 테스트 결과 전부(실행 명령 · 실패/건너뜀 원문) · 롤백 실증(카운터)
6. 무접촉 증명(`git diff --stat`)
7. 프로덕션 smoke 결과 또는 PENDING 사유 · read-only count 전후
8. 중지 조건 A~G 발동 여부
9. 후속 인계 — ④(Existing Master 직접 연결 API 가 이 Adapter 의 link 경로/regulatoryType 검사를 재사용할 수 있는가) · ⑤(`offerDraft`/SKU 를 Offer 로 옮길 때 필요한 것) · 규제 제품 신규 Master 를 위한 정부 데이터 Adapter 자리 · UI(`promote-supplier` 버튼) WO 제안 · 기준 문서 갱신 WO 제안(Promotion Core 위치 · Supplier create 정책)
10. 문서 정합: `발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건` — ② CHECK §9 `MFDS_CODE` 인계 철회는 "기록물 불변 · 이 WO 가 대체" 로 기록 · `regulatory_type` 한글 별칭 40,948건 backfill 제안 유지
11. 커밋 hash · `HEAD == origin/main`
