# WO-O4O-SUPPLIER-SINGLE-PRODUCT-CANDIDATE-INTAKE-V1

> **상태:** READY FOR EXECUTION · HANDOFF ONLY · 구현 WO (등록일 2026-09-18 · 실행 착수는 별도 명시 지시)
> **기준 코드:** `origin/main` `cc287d3ee`(Promotion Core Foundation) 이후 — 접수 시점 `3a41a04fe`
> **목적:** 공급자가 **신규 제품 후보 1건**을 `ProductCandidate` 로 안전하게 제출하는 **서버 경로**를 추가한다. `ProductMaster` · `ProductIdentifier` · `SupplierProductOffer` · 기존 단건 등록 UI 는 **접촉 0** 인 additive backend foundation 이다
> **선행:** [`WO-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1`](WO-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1.md)(①) · [`CHECK`](../checks/CHECK-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1.md) **§9**(② 가 Core 를 쓰기 위한 요건) · [`IR-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-BOUNDARY-V1`](../investigations/IR-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-BOUNDARY-V1.md) §3-3(공급자 bulk candidate dead-end) · ② 조사(2026-09-18 · `cc287d3ee` 기준 · 세션 인라인)
> **기준 문서:** [`O4O-PRODUCT-CORE-BASELINE-V1`](../baseline/O4O-PRODUCT-CORE-BASELINE-V1.md) §2 · §5 · §6 · §8 · §12 (Candidate 경유 확정 · 바코드는 전제조건 아님 · Master 확정 ≠ Offer · 공급자 전용 필드의 Product Core 상승 금지) · [`O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1`](../baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md)(F12)
> **후속(이 WO 가 아님):** ③ Supplier Promotion Adapter(단건 + bulk `csv_import` 수렴 · bulk identifier 채움) → ④ Existing Master 직접 연결 전용 API → ⑤ `createSupplierOffer` 에서 `resolveOrCreateMaster` 제거 → ⑥ 제품 등록 UI AI First(기존 `/supplier/products/new` 전환은 여기) → ⑦ ChatGPT/사진/PDF/URL 입력

---

# 1. 목표와 배경

## 1.1 문제

| 경로 | 현재 | 문제 |
|---|---|---|
| 공급자 단건 `POST /supplier/products` | `createSupplierOffer()` → `resolveOrCreateMaster()` (P3) | 공급자 입력이 **Candidate 를 거치지 않고 곧 Master** 가 된다. Master/Offer 가 별 TX |
| 공급자 대량 `POST /supplier/products/bulk-candidates` | `ProductCandidate(sourceType='csv_import', sourceLabel='공급자 대량 등록', rawPayload.supplierId)` | Candidate 까지는 오지만 `identifierType/identifierValue` 를 채우지 않아 dedup 축 ①·② 가 동작하지 않는 **dead-end**(IR §3-3) |
| 공급자 단건 Candidate | **없음** | ① 이 만든 Promotion Core 를 공급자 경로에서 쓸 **입구가 없다** |

즉 ② 는 "공급자 입력 → Candidate" 라는 **입구**를 만드는 일이며, Candidate 를 Master 로 올리는 일(③)과 기존 UI 를 그 위로 옮기는 일(⑥)은 **하지 않는다**.

## 1.2 이번 WO 의 완료 목표

```text
공급자(ACTIVE)
      ↓  POST /api/v1/neture/supplier/product-candidates
requireAuth → requireActiveSupplier (supplierId 는 여기서만 확정)
      ↓
서버 입력 검증 (frontend 와 독립)
      ↓
순수 mapper: body + {supplierId, submittedBy} → CreateCandidateInput
      ↓
ProductCandidateService.createCandidate()      ← 기존 서비스 재사용 · status=pending
      ↓
201 { candidateId, candidateStatus:'pending', identifierType, identifierValue, normalizedIdentifierValue }

write:  product_candidates 1
        product_masters · product_identifiers · supplier_product_offers · offer_service_approvals · organization_product_listings  0
```

완료 정의:

1. 위 route 가 존재하고, `supplierId` 를 **body 에서 받지 않으며** `requireActiveSupplier` 가 확정한 값만 `rawPayload.supplierId` 에 기록한다.
2. 바코드가 있으면 `identifierType` · `identifierValue` · `normalizedIdentifierValue` 가 채워진다(bulk 의 dead-end 를 단건에서는 반복하지 않는다).
3. Master · Identifier · Offer · 승인 · listing 테이블에 write 0 — **단위테스트 + 소스 계약 테스트**로 고정한다.
4. DDL 0 · P1 · P3 · Promotion Core · 기존 단건 UI · Product Library · 운영자 화면 접촉 0.

## 1.3 원칙

- **Candidate 는 "사실 확인 전 데이터" 를 안전하게 받는 곳이다.** 따라서 intake 는 제조사 · 바코드를 강제하지 않는다. 부족하면 ③ 에서 `hold` 되고 운영자/공급자가 보완한다. `'미상'` · `'UNKNOWN'` 같은 값을 **합성하지 않는다**(비어 있으면 `null`).
- **`supplierId` 는 소유권 축, `submittedBy` 는 감사 정보다.** "내 공급자 후보인가" 판정의 정본은 `rawPayload.supplierId` 이며 `submittedBy === user.id` 를 정본으로 쓰지 않는다(공급자 조직에 관리자가 추가되면 깨진다).
- **`organizationId` · `sourceId` 를 공급자 소유축으로 재사용하지 않는다.** `organizationId` 는 매장/조직 경계용이고 bulk 도 `null` 이다. `sourceId` 는 원천 레코드(draft · import row · offer) ID 다. 둘 다 이번 WO 에서는 `null`.
- **공급 정책(`distributionType` · `serviceKeys`)은 Candidate 계약에서 제외한다.** 제품 정체성 확정(Candidate → Master)과 공급 방식(Offer · DRUG/service gate)을 다시 섞지 않는다(BASELINE §6 · §12).
- **재고 · lot · 유효기간 · 일련번호는 받지 않는다.** bulk 의 `BULK_FORBIDDEN_KEYS` 정책과 동일하다. 단건 폼의 `stockQty` 는 Offer 영역이며 Candidate 에 보존하지 않는다(② 조사가 `offerDraft.stockQty` 를 제안했으나 bulk 정책과 충돌하므로 제외 — §2.3 #6).
- **Promotion Core 를 호출하지 않는다.** intake 는 `pending` 으로 끝난다. Core 는 `pending`/`reviewing` 을 승격 가능으로 보므로 상태 전이도 하지 않는다(CHECK §9).

## 1.4 다른 세션 보호

다중 세션이 `main` 에 직접 커밋한다. `git fetch origin` → `git status -sb` 후 착수, 타 세션의 dirty · 미추적 파일 불가침, path-specific stage · `git commit -- <paths>` 만 사용. 동일 WO 가 이미 origin 에 push 돼 있으면 그 정본을 유지하고 결함만 전달한다.

---

# 2. 승인 범위

## 2.1 신규 — route `POST /api/v1/neture/supplier/product-candidates`

**위치(권장):** `apps/api-server/src/modules/neture/controllers/supplier-product-candidate.controller.ts` 신설 → `neture.routes.ts` 의 `/supplier` 광역 마운트 블록에 `router.use('/supplier', createSupplierProductCandidateController(dataSource))` 한 줄 추가. `supplier-product.controller.ts` 안에 route 를 추가해도 무방하나 **기존 route 의 본문은 수정하지 않는다**.

**Guard:** `requireAuth` → `requireActiveSupplier`(`neture-identity.middleware.ts` · `neture_suppliers.user_id` 조회 · `status='ACTIVE'` 만 통과 · `req.supplierId` 확정). 이 둘 외 다른 guard 를 두지 않는다. `requireProductDbWrite`(=`requireAdmin`)는 **운영자 Product DB 정본용**이므로 공급자 intake 에 붙이지 않는다.

**요청 body (전부 서버에서 재검증 · 미지정 키는 무시하되 금지 키는 400):**

```ts
{
  name: string;                       // 필수 · trim 후 비어 있으면 400 · ≤ 200자
  barcode?: string | null;            // 선택 · sanitize 후 비어 있으면 null
  brandName?: string | null;
  manufacturerName?: string | null;   // 선택 (③ 에서 없으면 hold)
  specification?: string | null;
  categoryId?: string | null;         // uuid 형식만 · 존재 검증은 하지 않는다(rawPayload 보존)
  imageUrl?: string | null;           // http(s) URL 형식만

  regulatoryType?: 'GENERAL' | 'COSMETIC' | 'HEALTH_FUNCTIONAL' | 'QUASI_DRUG' | 'MEDICAL_DEVICE' | 'DRUG';
                                      // 기본 'GENERAL' · Promotion Core 의 PROMOTION_REGULATORY_TYPES 와 동일 어휘 · 한글 별칭('일반'·'의약품')은 400
  drugCategory?: 'otc' | 'rx' | 'quasi_drug' | null;
                                      // DRUG 면 필수(없으면 400) · DRUG 아니면 무시(null)
  regulatoryName?: string | null;     // 허가/신고 제품명
  mfdsPermitNumber?: string | null;
  originCountry?: string | null;

  offerDraft?: {                      // Offer 를 만들 때 다시 쓰기 위한 공급자 입력의 임시 보존값 (Master 승격 데이터 아님)
    priceGeneral?: number | null;     // 숫자 · 0 이상 · 아니면 400
    consumerReferencePrice?: number | null;
    consumerShortDescription?: string | null;   // ≤ 500자
    consumerDetailDescription?: string | null;  // ≤ 5000자
    isFeatured?: boolean;
  };
}
```

**금지 키(400 `FORBIDDEN_FIELD`):** `supplierId` · `distributionType` · `serviceKeys` · `stockQty` / `stockQuantity` / 재고 · lot · 유효기간 · 일련번호 계열(bulk 의 `BULK_FORBIDDEN_KEYS` 어휘 재사용 — 상수를 공유 모듈로 빼도 되고 복제해도 된다. 단 두 곳 값이 같음을 테스트로 고정). body 최상위와 `offerDraft` 양쪽 모두 검사.

**Candidate 매핑 (`CreateCandidateInput`):**

| Candidate 필드 | 값 | 비고 |
|---|---|---|
| `serviceKey` | `'neture'` | bulk 와 동일 |
| `organizationId` | `null` | 공급자 소유축 아님(§1.3) |
| `sourceType` | `'supplier_web'` | 기존 union 값 · 운영자 화면이 "공급자" 로 이미 표시 |
| `sourceId` | `null` | |
| `sourceLabel` | `'neture-supplier-single'` | bulk `'공급자 대량 등록'` 과 구분되는 **고정 라벨** · `FindCandidatesFilter.sourceLabel` 정확일치로 걸러진다 |
| `submittedBy` | `req.user.id` | 감사 정보 |
| `identifierType` | `barcode` 있으면 `inferIdentifierTypeFromBarcode(barcode)` | GTIN-like → `EAN13`/`GTIN` · 그 외 → `'UNKNOWN'`(값은 보존 · 합성 안 함 · `identityKey` 판정은 ③ Adapter) |
| `identifierValue` | `sanitizeIdentifierValue(barcode)` 또는 `null` | |
| `normalizedIdentifierValue` | `createCandidate()` 가 자동 생성 | 접촉 안 함 |
| `candidateName` | `name` | |
| `candidateBrand` | `brandName` | |
| `candidateManufacturer` | `manufacturerName` | 비면 `null` |
| `candidateCategory` | `null` | `categoryId` 는 rawPayload 에만(카테고리명 조회를 하지 않는다) |
| `candidateSpec` | `specification` | |
| `candidateUnit` | `null` | 단건 폼에 없음 |
| `candidateImageUrl` | `imageUrl` | |
| `candidatePrice` | `offerDraft.priceGeneral` | 기존 staging 필드 재사용 |
| `rawPayload` | 아래 | |

```ts
rawPayload = {
  source: 'supplier_single',                 // bulk 의 'supplier_bulk_upload' 와 대비
  supplierId,                                // requireActiveSupplier 가 확정한 값만 · body 값 절대 사용 금지
  regulatoryType, drugCategory,              // 영문 코드
  // classifyProductType 가 읽는 키 — bulk 와 같은 어휘 (운영자 콘솔 분류 추론용)
  product_type: <regulatoryType/drugCategory 에서 파생: non_drug | quasi_drug | otc_drug | rx_drug>,
  drug_category: drugCategory ?? null,
  rx: drugCategory === 'rx',
  categoryId, brandName, regulatoryName, mfdsPermitNumber, originCountry,
  offerDraft: { priceGeneral, consumerReferencePrice, consumerShortDescription, consumerDetailDescription, isFeatured },
  submittedAt: ISO string,
}
```

`product_type` 파생표는 bulk 의 `BULK_TYPE_MAP` 의 **역방향**이다(`GENERAL`/`COSMETIC`/`HEALTH_FUNCTIONAL`/`MEDICAL_DEVICE` → `non_drug` · `QUASI_DRUG` → `quasi_drug` · `DRUG`+`otc` → `otc_drug` · `DRUG`+`rx` → `rx_drug`). 운영자 콘솔이 두 경로의 후보를 같은 방식으로 분류하게 하기 위함이며, 다른 목적으로 쓰지 않는다.

**응답:**

```ts
201 { success: true, data: { candidateId, candidateStatus: 'pending', identifierType, identifierValue, normalizedIdentifierValue } }

400 { success: false, error: 'CANDIDATE_NAME_REQUIRED' | 'INVALID_REGULATORY_TYPE' | 'DRUG_CATEGORY_REQUIRED'
                        | 'INVALID_PRICE' | 'INVALID_URL' | 'INVALID_CATEGORY_ID' | 'FORBIDDEN_FIELD' | 'FIELD_TOO_LONG', message }
401 / 403  requireAuth · requireActiveSupplier 의 기존 응답 그대로 (NO_SUPPLIER · SUPPLIER_NOT_ACTIVE)
500 { success: false, error: 'INTERNAL_ERROR', message }
```

에러 shape 는 같은 컨트롤러 계열(`bulk-candidates`)의 **flat `error: 'CODE'`** 형식을 따른다. 새 형식을 만들지 않는다.

## 2.2 신규 — 순수 mapper + 테스트

- `apps/api-server/src/modules/neture/services/supplier-single-candidate.mapper.ts`(이름은 실행자 판단): `validateSupplierSingleCandidateBody(body) → { ok, input } | { ok:false, code, message }` 와 `buildSupplierSingleCandidateInput(validated, { supplierId, submittedBy, now }) → CreateCandidateInput` 두 **순수 함수**. DB · Express 의존 없음.
- jest 단위테스트(`__tests__/supplier-single-candidate.mapper.test.ts`): §6.1 표의 케이스.
- 소스 계약 테스트(`apps/api-server/src/__tests__/supplier-product-candidate-intake-contract.spec.ts` 등 — 기존 `product-db-write-authority.test.ts` · `store-ai-first-editor-boundary-contract.spec.ts` 방식): 신설 컨트롤러 파일 원문에 `ProductMaster` · `ProductIdentifier` · `SupplierProductOffer` · `createSupplierOffer` · `resolveOrCreateMaster` · `promotion/` · `promoteWithin` · `promote(` 참조가 **0** 임을 고정. 이것이 "write 0" 의 회귀 방어선이다.

## 2.3 이번 WO 에서 확정하는 결정 (실행자가 다시 열지 않는다)

| # | 결정 | 근거 |
|---|---|---|
| 1 | `product_candidates.supplier_id` 컬럼을 **추가하지 않는다**. 소유축은 `rawPayload.supplierId` | DDL 0 전제. CHECK §9 가 "② WO 에서 명시 결정" 으로 넘긴 항목. 공급자별 목록 조회(jsonb 경로 · 인덱스 없음)는 이번 WO 에 없으므로 성능 문제도 아직 없다. 컬럼 승격은 ③ 이후 "내 후보 목록" 이 필요해질 때 별도 WO(migration) |
| 2 | `submittedBy` 는 감사 정보. 소유권 판정에 쓰지 않는다 | §1.3 |
| 3 | `organizationId = null` · `sourceId = null` | §1.3 |
| 4 | `distributionType` · `serviceKeys` 는 **금지 키** | 제품 정체성과 공급 정책 분리 |
| 5 | 제조사 · 바코드 선택. 합성 금지 | Candidate 의 존재 이유 |
| 6 | `stockQty` 등 재고 · lot · 유효기간 · 일련번호 **금지 키** | bulk `BULK_FORBIDDEN_KEYS` 정책과 통일. ② 조사의 `offerDraft.stockQty` 는 채택하지 않음 |
| 7 | 초기 상태 `pending` 그대로. `reviewing` 전이 없음 | Core 가 `pending`/`reviewing` 둘 다 승격 가능(CHECK §9) |
| 8 | 비-GTIN 바코드는 `identifierType='UNKNOWN'` + 값 보존. 400 으로 거부하지 않는다 | 사실 확인 전 데이터 보존. `identityKey` 판정(dedup 축 편입 여부)은 ③ Adapter 책임 |
| 9 | `regulatoryType` 은 영문 코드만. 한글 별칭 400 | Core 가 영문 코드만 받음. 별칭 잔존 데이터 정리는 별도 WO(CHECK §10) |
| 10 | intake 단계 dedup(같은 공급자 · 같은 바코드 pending 후보 존재 시 409 등) **하지 않는다** | dedup 은 Core(③) 의 단일 책임. 중복 pending 은 운영자 큐에서 보이고 ③ 이 `link`/`conflict` 로 판정 |
| 11 | `GET /supplier/product-candidates`(내 후보 목록/단건 조회) 는 **이 WO 에 없다** | 결정 1 과 묶임. 조회 없이도 운영자 화면(`/operator/product-candidates` · `sourceType='supplier_web'`)에서 확인 가능. 공급자용 조회는 ⑥ UI 와 함께 |

## 2.4 허용되는 부수 작업

- `neture.routes.ts` 마운트 1줄 + 주석(WO 번호).
- `BULK_FORBIDDEN_KEYS` 를 공유 상수 모듈로 추출하는 경우 `supplier-product.controller.ts` 의 **import 교체만** 허용(값 · 검사 로직 불변 · 테스트로 동일성 고정).
- `docs/checks/CHECK-O4O-SUPPLIER-SINGLE-PRODUCT-CANDIDATE-INTAKE-V1.md` 작성.
- `O4O-PRODUCT-CORE-BASELINE-V1` 등 기준 문서 수정은 **하지 않는다**(③ 까지 끝나 계약이 굳은 뒤 별도 WO · §16-4).

---

# 3. 실행 순서

1. **읽기**: 이 WO · CHECK(①) §9 · `product-candidate.service.ts` `CreateCandidateInput`/`createCandidate()` · `supplier-product.controller.ts` 의 `bulk-candidates` handler(534~)와 `BULK_TYPE_MAP` · `BULK_FORBIDDEN_KEYS` · `neture-identity.middleware.ts` `createRequireActiveSupplier` · `product-identifier.util.ts`(`sanitizeIdentifierValue` · `inferIdentifierTypeFromBarcode`) · `ProductCandidate.entity.ts` source type union · 운영자 화면 `ProductCandidateReviewPage.tsx` 가 `supplier_web` 을 어떻게 표시하는지(수정 금지 · 확인만).
2. **mapper 순수 함수 + 단위테스트 먼저** — DB 없이 통과.
3. **컨트롤러 + 마운트** — handler 는 guard → validate → build → `createCandidate()` → 201. try/catch 로 500. 로그는 `[Neture API]` prefix 기존 관례.
4. **소스 계약 테스트** 작성 → 통과.
5. `pnpm --filter @o4o/api-server build` · `test` · `lint:no-fix`. 무관한 실패는 §5 G.
6. **프로덕션 smoke**(§6.1 마지막 행) — 배포 후. 불가하면 PENDING 사유 명시.
7. CHECK 작성 → path-specific stage → `node scripts/git/check-staged-scope.mjs <경로>` → `git commit -- <경로>` → push.

---

# 4. 제외 범위

- **Promotion Core 호출 · Supplier Promotion Adapter · Candidate → Master 승격 · 기존 Master 연결** — 후속 ③ · ④. `promotion/**` 파일 접촉 0.
- **`SupplierProductOffer` 생성 · `createSupplierOffer` · `resolveOrCreateMaster`(P3) · DRUG 공급 gate · `offer_service_approvals`** — 접촉 0. 제거는 ⑤.
- **공급자 bulk candidate(`csv_import`) 의 identifier 채움 · dead-end 해소** — ③ 에서 단건과 같은 Adapter 계열로 수렴시키며 처리. 이번 WO 는 `bulk-candidates` handler 본문을 수정하지 않는다(§2.4 의 import 교체 예외만).
- **기존 `SupplierProductCreatePage` · `supplierApi.createProduct()` · Product Library(`/supplier/products/new` 로 barcode/name 전달) · 어떤 web-neture UI 변경도 0** — 성공 후 `result.data.masterId` 로 이미지 업로드 · 완료 화면을 이어가는 현재 구조가 Candidate 응답과 맞지 않아 즉시 깨진다. 전환은 ⑥.
- **운영자 화면(`/operator/product-candidates` · admin-dashboard) 변경 0** — `supplier_web` 표시는 이미 있다. 범용 Promotion 호출 UI 는 ③ 이후.
- **`GET` 조회 route · 공급자용 목록** — 결정 11.
- **이미지 파일 업로드 · PDF · URL 스크래핑 · AI/ChatGPT 연결** — ⑦. `imageUrl` 문자열 보존만.
- **`product_candidates` 컬럼 추가(`supplier_id` 등) · 인덱스 · migration** — 0(결정 1).
- **`neture_suppliers` · 공급자 승인 상태 · `requireActiveSupplier` 로직 변경** — 0.
- P1(`drug-import/**`) — 접촉 0.

---

# 5. 중지 조건

아래가 나오면 임의로 확대하지 않고 **보고 후 대기**한다.

| # | 조건 | 왜 |
|---|---|---|
| A | `CreateCandidateInput` 이 위 매핑을 표현하지 못해 `product-candidate.service.ts` 의 **계약 변경**이 필요함 | 기존 서비스 재사용 전제. 서비스 변경은 모든 소비처(store_web · drug import 5종 · bulk) 영향 |
| B | `product_candidates` schema · migration 이 필요함 | DDL 0 전제(결정 1) |
| C | `requireActiveSupplier` 가 확정한 `supplierId` 만으로 소유권을 표현할 수 없음(예: 한 user 가 복수 공급자에 연결) | 소유축 설계 재검토. 현재 middleware 는 `LIMIT 1` |
| D | 운영자 후보 목록/검토 화면이 `sourceLabel='neture-supplier-single'` · `rawPayload.source='supplier_single'` 후보를 표시하지 못하거나 오류를 냄 | 운영자 화면 접촉 0 전제. 수정은 별도 WO |
| E | `BULK_FORBIDDEN_KEYS` 공유화가 `bulk-candidates` 동작을 바꾸는 것으로 확인됨 | bulk 본문 불변 전제 |
| F | 프로덕션 smoke 용 ACTIVE 공급자 테스트 계정이 없음 | PENDING 으로 기록. 실운영 공급자 계정 사용 금지(§15) |
| G | 현재 변경과 무관한 build · test 실패 · 타 세션 dirty 파일 접촉 필요 | 상시 규칙 |

---

# 6. 검증과 Git

## 6.1 검증

| 항목 | 방법 | PASS 기준 |
|---|---|---|
| mapper 단위테스트 | jest · 순수 함수 | `name` 빈 값 → `CANDIDATE_NAME_REQUIRED` · 한글 `regulatoryType` → `INVALID_REGULATORY_TYPE` · `DRUG` + `drugCategory` 없음 → `DRUG_CATEGORY_REQUIRED` · `DRUG` 아닌데 `drugCategory` 있음 → `null` 로 무시 · `priceGeneral` 음수/문자 → `INVALID_PRICE` · body 의 `supplierId`/`distributionType`/`serviceKeys`/`stockQty`/lot 계열 → `FORBIDDEN_FIELD`(최상위 · `offerDraft` 양쪽) · 13자리 숫자 바코드 → `EAN13` · 8/12/14자리 → `GTIN` · 하이픈 포함 숫자 → sanitize 후 판정 · 영숫자 코드 → `UNKNOWN` + 값 보존 · 바코드 공백 → `identifierType/Value` `null` · 제조사 공백 → `null`(합성 없음) · `rawPayload.supplierId === 인자 supplierId`(body 값 아님) · `product_type` 파생 4종 · `organizationId === null` · `sourceType === 'supplier_web'` · `sourceLabel === 'neture-supplier-single'` |
| 라우트 테스트 | jest + supertest · `createCandidate` mock | 401(미인증) · 403(`NO_SUPPLIER` · `SUPPLIER_NOT_ACTIVE`) · 400 각 코드 · 201 응답 shape · mock 이 정확히 1회 · `CreateCandidateInput` 인자 검증 |
| 소스 계약 테스트 | 파일 원문 grep | 신설 컨트롤러 · mapper 에 `ProductMaster` · `ProductIdentifier` · `SupplierProductOffer` · `createSupplierOffer` · `resolveOrCreateMaster` · `promotion/` · `promoteWithin` · `promote(` 참조 0 |
| bulk 불변 | `git diff origin/main -- apps/api-server/src/modules/neture/controllers/supplier-product.controller.ts` | 변경 0 또는 `BULK_FORBIDDEN_KEYS` import 교체 hunk 1개만 |
| 무접촉 증명 | `git diff --stat origin/main -- apps/api-server/src/modules/neture/promotion apps/api-server/src/modules/neture/drug-import apps/api-server/src/modules/neture/services/offer.service.ts apps/api-server/src/modules/neture/services/catalog.service.ts apps/api-server/src/modules/neture/services/product-candidate.service.ts services/web-neture apps/admin-dashboard` | 0 files |
| 빌드 · 정적 | `pnpm --filter @o4o/api-server build` · `test` · `lint:no-fix` | 전부 성공(무관한 기존 실패는 원문 보고) |
| 프로덕션 smoke | 배포 후 · ACTIVE **테스트** 공급자 계정(`docs/local/TEST-ACCOUNTS.local.md`) · 쿠키 인증 curl → `https://api.neture.co.kr/api/v1/neture/supplier/product-candidates` (1) `name`+13자리 바코드 1건 → 201 (2) `name` 만 1건 → 201 · `identifierType null` (3) `name` 빈 값 → 400 (4) body 에 `supplierId` 주입 → 400 `FORBIDDEN_FIELD` · 이어서 read-only SELECT: `product_candidates`(2 row · `candidate_status='pending'` · `source_type='supplier_web'` · `source_label='neture-supplier-single'` · `raw_payload->>'supplierId'` = 테스트 공급자 id · (1) 의 `identifier_type='EAN13'` · `normalized_identifier_value`) · `product_masters` · `product_identifiers` · `supplier_product_offers` **count 전후 동일** · 운영자 화면 `/operator/product-candidates` 에서 2건이 "공급자" 로 보임 | 전부 확인. 생성한 테스트 후보 2건은 운영자 `POST /:id/archive`(기존 액션)로 정리하거나 그대로 두고 ID 를 CHECK 에 기록. **DELETE 금지**. 계정이 없으면 PENDING 사유 명시 — PASS 로 쓰지 않는다 |

## 6.2 Git

- 커밋 단위 권장: ① mapper + 테스트 ② 컨트롤러 + 마운트 + 계약 테스트 ③ CHECK. 하나로 합쳐도 무방.
- 커밋 메시지 끝에 `(WO-O4O-SUPPLIER-SINGLE-PRODUCT-CANDIDATE-INTAKE-V1)`.
- `git add <path>` · `node scripts/git/check-staged-scope.mjs <paths>` · `git commit -m "..." -- <paths>` · `git push origin main`. `--force` 금지.
- 완료 = 이 WO 범위 미커밋 0건 + `HEAD == origin/main`. 저장소 전체 clean 은 요구하지 않는다.
- API 배포는 `deploy-*.yml` 자동. 워크플로 파일만 바뀐 push 는 배포가 skip 되므로(메모) 코드 커밋이 배포를 트리거하는지 Actions 에서 확인.

---

# 7. 완료 보고

WO 제목을 첫 줄에 두고 한국어로. 다음 항목을 **전부** 포함한다.

1. 신설 파일 목록 · route 최종 경로 · guard 체인 · mapper public 이름
2. 요청 계약 최종본(§2.1 과 다른 점이 있으면 무엇을 왜) · 금지 키 목록 · 에러 코드 집합
3. Candidate 매핑 최종본 — 특히 `supplierId` 출처가 middleware 뿐임을 코드 위치로 증명 · `rawPayload` 실제 키
4. 결정 1~11 준수 여부(어긴 것이 있으면 어느 것 · 왜)
5. 테스트 결과: mapper / 라우트 / 소스 계약 · 실행 명령 · 실패 · 건너뜀 있으면 원문
6. 무접촉 증명(`git diff --stat`) — promotion · drug-import · offer/catalog/product-candidate service · web-neture · admin-dashboard
7. 프로덕션 smoke 결과(생성한 candidate id · SELECT 결과 요약 · Master/Identifier/Offer count 전후) 또는 PENDING 사유
8. 중지 조건 A~G 발동 여부
9. 후속 ③(Supplier Promotion Adapter) 인계 — 단건 `rawPayload` 에서 Adapter 가 읽을 키 · `identifierType='UNKNOWN'` 후보의 `identityKey` 처리 제안 · bulk `csv_import` 후보를 같은 Adapter 로 수렴할 때 필요한 rawPayload 차이(`supplier_bulk_upload` vs `supplier_single` · `fields`/`raw` vs 정규 키)
10. 문서 정합: `발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건`
11. 커밋 hash · `HEAD == origin/main` 확인
