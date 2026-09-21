# WO-O4O-SUPPLIER-EXISTING-MASTER-DIRECT-OFFER-LINK-V1

> **상태:** READY FOR EXECUTION · HANDOFF ONLY · 구현 WO (등록일 2026-09-21 · 실행 착수는 별도 명시 지시)
> **기준 코드:** `origin/main` `dcd8a2bba`(③ CHECK) 기준 조사 · 등록 시점 `917f92371`. **실행은 항상 최신 `origin/main` 에서 시작**한다 — 이 커밋으로 reset/rebase 해 타 세션 커밋을 제거하지 않는다. 타 세션 dirty/untracked 파일은 불가침
> **목적:** 공급자가 Product Library 에서 **이미 존재하는 `ProductMaster` 를 선택**한 경우, barcode/name/manufacturer 를 `/supplier/products/new` 로 넘겨 서버가 Master 를 **다시 추론**하는 우회를 없애고, **검증된 `masterId` 로 `SupplierProductOffer` 만 생성**하는 backend 전용 경로를 만든다. Candidate 생성 0 · ProductMaster 생성/수정 0
> **선행:** ① [`WO-…-GENERAL-PROMOTION-CORE-FOUNDATION-V1`](WO-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1.md)(`cc287d3ee`) · ② [`WO-…-SINGLE-PRODUCT-CANDIDATE-INTAKE-V1`](WO-O4O-SUPPLIER-SINGLE-PRODUCT-CANDIDATE-INTAKE-V1.md)(`02f71d6d9`) · ③ [`WO-…-CANDIDATE-PROMOTION-ADAPTER-V1`](WO-O4O-SUPPLIER-PRODUCT-CANDIDATE-PROMOTION-ADAPTER-V1.md)(`f299fb1de` · [CHECK](../checks/CHECK-O4O-SUPPLIER-PRODUCT-CANDIDATE-PROMOTION-ADAPTER-V1.md) §9) · ④ 조사(2026-09-21 · `dcd8a2bba` 기준 · 세션 인라인) · Offer 유일성 계약 [`CHECK-O4O-SUPPLIER-PRODUCT-OFFER-UNIQUE-CONSTRAINT-CONTRACT-AUDIT-V1`](../checks/CHECK-O4O-SUPPLIER-PRODUCT-OFFER-UNIQUE-CONSTRAINT-CONTRACT-AUDIT-V1.md)
> **기준 문서:** [`O4O-PRODUCT-CORE-BASELINE-V1`](../baseline/O4O-PRODUCT-CORE-BASELINE-V1.md) §5 · §6 · §12 (Master 확정 ≠ Offer · 기존 Master 기준정보 덮어쓰기 금지 · 공급자 전용 필드의 Product Core 상승 금지) · [`O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1`](../baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md)(F12) · [`O4O-BOUNDARY-POLICY-V1`](../architecture/O4O-BOUNDARY-POLICY-V1.md)(UUID 단독 조회 금지 → `supplierId` 축 필수)
> **후속(이 WO 가 아님):** ⑤ `createSupplierOffer()` 에서 `resolveOrCreateMaster()` 제거(Master resolution ↔ Offer persistence 완전 분리) → ⑥ 제품 등록 UI AI First(Product Library → `/from-master` 직접 호출로 전환) → ⑦ ChatGPT/사진/PDF/URL 입력

---

# 1. 목표와 배경

## 1.1 문제

Product Library([`SupplierProductLibraryPage.tsx`](../../services/web-neture/src/pages/supplier/SupplierProductLibraryPage.tsx) 111~130)는 이미 `master.id` 를 알고 있으면서 **선택 순간 그 ID 를 버린다**:

```text
Product Library → master.id 확보 → masterId 버림
  → barcode 있으면 barcode 전달 / 없으면 name·manufacturer·category… 전달
  → /supplier/products/new → 다시 Master 검색
  → POST /supplier/products → resolveOrCreateMaster() → 원래 Master 를 다시 찾기를 기대
```

barcode 없는 Master(화장품 전량 · HFF 다수)는 `name + manufacturer` 가 정확히 같아야 같은 Master 로 돌아온다. **사용자가 이미 Master 를 정확히 골랐는데 서버가 정체성을 다시 추론**하고 있다. 추론이 어긋나면 중복 Master 가 생기거나(`resolveOrCreateMaster` 는 create 도 한다) 엉뚱한 Master 에 Offer 가 붙는다.

Product Library 가 masterId 를 못 넘기는 이유는 `POST /supplier/products` 의 `MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED`([`offer.service.ts`](../../apps/api-server/src/modules/neture/services/offer.service.ts) 783~805) 계약이다. 그 계약은 **그 API 에서는 옳다** — 입력 데이터로 Master 를 resolve/create 하는 레거시 복합 경로가 임의 masterId 를 받으면 안 된다. 문제는 "검증된 masterId 로 Offer 만 만드는 경로" 가 아예 없다는 것이다.

## 1.2 이번 WO 의 완료 목표

```text
ProductMaster 선택 → masterId → 서버 재검증 → SupplierProductOffer 1건
```

1. 신규 route `POST /api/v1/neture/supplier/products/from-master` — body 는 `masterId` + Offer 영역만. ProductMaster canonical/identity 필드는 받지 않는다.
2. 서버가 `masterId` 를 **반드시 다시 조회**해 존재 · `status='ACTIVE'` · `regulatoryType` canonical 해석 가능을 확인한다. Product Library 가 ACTIVE-only 라는 사실로 write 검증을 생략하지 않는다.
3. 기존 `(supplier_id, master_id)` 유일성 계약(`OFFER_ALREADY_EXISTS` / `OFFER_IN_RECYCLE_BIN` / 23505 fallback) 을 **그대로 재사용**한다. 변경 0.
4. DRUG gate(`assertDrugOfferAllowed`) · 규제 permit gate(`assertRegulatedPermit`) 는 **기존 Master 의 canonical 값**으로 판정한다. 공급자에게 허가번호·제품군을 다시 입력받지 않는다.
5. `ProductMaster`/`ProductIdentifier`/`ProductCandidate` write 0. `product_masters UPDATE` 문자열 0(소스 계약 테스트).
6. 기존 `POST /supplier/products` 의 `MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED` 는 **유지**한다. masterId 를 받는 곳은 새 전용 route 뿐이다.
7. Offer INSERT · 중복 검사 · service approval 생성 코드를 복제하지 않는다 — `offer.service.ts` 안에서 **Master identity 가 확정된 뒤의 중립적 persistence 부분**만 helper 로 추출해 기존 경로와 신규 경로가 같이 쓴다(§2.3). 기존 경로 동작 변경 0.

## 1.3 원칙

- **기존 Master 가 SSOT.** ④ 에는 Candidate 가 없다. 공급자가 주장하는 분류값이 없으므로 ③ 의 `assertSupplierPolicy()`(Candidate ↔ Master 비교) 는 **재사용하지 않는다**. ③ 의 `canonicalizeRegulatoryType()` 은 "이 Master 의 regulatoryType 을 O4O canonical 로 해석할 수 있는가" 검증에 재사용한다(③ CHECK §9 의 "④ 가 assertSupplierPolicy link 분기를 재사용" 판정은 이 조사로 **정정**한다 — 기록물 불변 · 이 WO 가 대체).
- **Master 를 신뢰하되 유효성만 서버가 재검증.** body 의 UUID 는 조작될 수 있다.
- **Product Core 상승 금지.** Offer 필드만 받는다. Master 기준정보 덮어쓰기 없음([`CHECK-O4O-SUPPLIER-EXISTING-PRODUCTMASTER-NON-DESTRUCTIVE-LINK-V1`](../checks/CHECK-O4O-SUPPLIER-EXISTING-PRODUCTMASTER-NON-DESTRUCTIVE-LINK-V1.md) 과 같은 방향 · 여기서는 입력 자체를 안 받으므로 더 강함).
- **보안 gate 를 몰래 완화하지 않는다.** DRUG `serviceKeys=[]` PRIVATE draft 는 지금도 거부된다. ④ 에서도 거부한다.
- **⑤ 를 선취하지 않는다.** `createSupplierOffer()` 의 `resolveOrCreateMaster()` 책임은 이번에 제거하지 않는다.

## 1.4 다른 세션 보호

`git fetch origin` → `git status -sb` 후 시작. 등록 시점 타 세션 dirty 파일: `services/web-neture/src/lib/hospital-drug/localDataset.ts`(불가침). path-specific stage · `git commit -- <paths>` · `--force`/`stash` 금지.

---

# 2. 승인 범위

## 2.1 신규 — route `POST /api/v1/neture/supplier/products/from-master`

- 위치: [`supplier-product.controller.ts`](../../apps/api-server/src/modules/neture/controllers/supplier-product.controller.ts) 에 route 1개 추가(기존 `POST /products` 74~107 본문 불변). `router.post('/products', …)` 보다 **먼저 등록할 필요는 없다**(경로가 다름) — 다만 `GET /products/:id` 류 wildcard 가 있으면 그 앞에 둔다.
- guard: `requireAuth → requireActiveSupplier`(`createRequireActiveSupplier(dataSource)` · 기존 71행 인스턴스 재사용). `supplierId = req.supplierId`(middleware 확정값) — **body 에서 받지 않는다**(있으면 400 `SUPPLIER_ID_NOT_ALLOWED` 또는 무시 — 실행자 결정 후 CHECK 기록 · 권장 400).
- body (허용 키 전부 · 그 외 키는 400 `UNSUPPORTED_FIELD`):

```ts
{
  masterId: string;                       // 필수 · UUID
  priceGeneral?: number;                  // 기존 createSupplierOffer 와 동일 규칙
  priceGold?: number | null;
  pricePlatinum?: number | null;
  consumerReferencePrice?: number | null;
  consumerShortDescription?: string | null;
  consumerDetailDescription?: string | null;
  stockQuantity?: number | null;          // 기존 manualData.stockQty 가 Offer 재고로 쓰이는 경우에만 · 아니면 제외
  isFeatured?: boolean;
  isPublic?: boolean;
  distributionType?: OfferDistributionType; // 기존 호환 · isPublic 파생 규칙 동일
  serviceKeys?: string[];
}
```

- **금지 키**(존재하면 400 `MASTER_FIELD_NOT_ALLOWED`): `barcode` · `name` · `manufacturerName` · `regulatoryType` · `regulatoryName` · `mfdsPermitNumber` · `categoryId` · `brandName` · `brandId` · `specification` · `originCountry` · `tags` · `manualData` · `supplierId`.

- Master 검증(서버 · 순서 고정):

| 검사 | 실패 코드 | 상태 |
|---|---|---|
| `masterId` UUID 형식 | `INVALID_MASTER_ID` | 400 |
| `product_masters` 존재 | `MASTER_NOT_FOUND` | 404 |
| `status = 'ACTIVE'` | `MASTER_NOT_ACTIVE` | 409 |
| `canonicalizeRegulatoryType(regulatory_type) !== null` | `MASTER_REGULATORY_TYPE_UNSUPPORTED` | 409 |

  Master 조회는 `id` 단독이지만 이는 **read 검증**이고, write(Offer) 는 `supplierId` 축이 붙는다(Boundary Guard 1 충족). 조회 컬럼: `id, status, regulatory_type, drug_category, is_mfds_verified, mfds_permit_number, category_id, barcode, name`(gate 입력용 · 응답용).

- 응답:

```ts
201 { success:true, data:{ id, masterId, supplierId, isPublic, approvalStatus, serviceKeys } }   // 기존 createSupplierOffer 응답 shape 와 동일
400 INVALID_MASTER_ID | MASTER_FIELD_NOT_ALLOWED | UNSUPPORTED_FIELD | SUPPLIER_ID_NOT_ALLOWED | (기존 입력 검증 코드)
404 MASTER_NOT_FOUND
409 MASTER_NOT_ACTIVE | MASTER_REGULATORY_TYPE_UNSUPPORTED | OFFER_ALREADY_EXISTS | OFFER_IN_RECYCLE_BIN
4xx (기존 gate 코드 그대로) DRUG_* (assertDrugOfferAllowed) · PERMIT_REQUIRED_FOR_UNVERIFIED_REGULATED (assertRegulatedPermit)
```

  기존 `POST /products` 의 상태코드 매핑(93~97: `OFFER_ALREADY_EXISTS`/`OFFER_IN_RECYCLE_BIN` → 409, gate → 기존 값) 을 그대로 따른다. 신규 코드 4종은 [`offer-error-code.ts`](../../apps/api-server/src/modules/neture/constants/offer-error-code.ts) 에 additive 추가.

## 2.2 Offer 중복 · gate 계약 — 변경 0 · 재사용만

| 항목 | 계약 | 근거 |
|---|---|---|
| 유일성 | `UNIQUE(master_id, supplier_id)` = `uq_supplier_product_offers_master_supplier` · soft-delete 행도 슬롯 점유 | `SupplierProductOffer.entity.ts` `deleted_at` · `offer.service.ts` 905~962 |
| live 중복 | `409 OFFER_ALREADY_EXISTS` | `findDuplicateOffer()` |
| 휴지통 중복 | `409 OFFER_IN_RECYCLE_BIN` | 동일 |
| 사전조회 후 경쟁 INSERT | 23505 + 해당 constraint → `OFFER_ALREADY_EXISTS` | `asOfferDuplicateViolation()` |
| DRUG | `isPublic=false` · `serviceKeys.length ≥ 1` · 전부 pharmacy-target 이어야 허용. `serviceKeys=[]` PRIVATE draft 거부 유지 | [`drug-access.guard.ts`](../../apps/api-server/src/modules/neture/guards/drug-access.guard.ts) 280~ · 호출 시 `regulatoryType` 은 **조회한 Master 값**을 넘긴다(재조회 회피 · 결과 동일) |
| 규제 permit | `assertRegulatedPermit({ isRegulated, mfdsPermitNumber: master.mfds_permit_number, isMfdsVerified: master.is_mfds_verified, mode:'registration' })` — **공급자 입력 없이 Master 값만** | `offer.service.ts` 76~96 · 기존 경로는 `manualData.mfdsPermitNumber` 를 섞어 보지만(868) ④ 는 입력이 없으므로 Master 값이 유일 |
| service approval | `filterApprovalEligibleServiceKeys` → `OfferServiceApprovalService.createPendingApprovals` — 기존 그대로 | 1079~1082 |

`isRegulated` 판정 기준(카테고리/제품군 함수) 자체는 변경하지 않는다. `stockQuantity` 는 기존 경로에서 Offer 재고 컬럼으로 흘러가는지 확인 후 같은 규칙으로만 받는다 — Master 컬럼으로 가는 값이면 **제외**한다.

## 2.3 변경 — `offer.service.ts` 내부 persistence primitive 추출 (동작 변경 0)

`createSupplierOffer()`(964~) 를 다음 두 단계로 나눈다. **외부 시그니처 · 반환값 · 로그 문자열 · 오류 순서 불변.**

```text
createSupplierOffer(supplierId, data)                          ← 기존 · 시그니처 불변
  validateCreateInput → resolveOrCreateMaster → assertRegulatedPermit(manualData+master)
  → resolveMasterWriteFields(기존 non-destructive link)           ← 이 부분은 ⑤ 까지 그대로
  → persistOfferForResolvedMaster(...)                            ← 신규 primitive

createSupplierOfferFromExistingMaster(supplierId, input)       ← 신규
  masterId 검증(§2.1 표) → assertRegulatedPermit(master 값만)
  → persistOfferForResolvedMaster(...)                            ← 같은 primitive
```

`persistOfferForResolvedMaster({ supplierId, master:{id, regulatoryType}, offerFields, serviceKeys, isPublic })` 이 맡는 것(현행 1030~1090 구간을 **옮기기만**): DRUG gate(`assertDrugOfferAllowed`) → `findDuplicateOffer` → Offer 엔티티 구성(`approvalStatus: PENDING` 등 기존 기본값) → `save` + `asOfferDuplicateViolation` fallback → service approval 생성 → 응답 shape. 이름은 실행자가 정하되 "Master identity 가 이미 확정됐다" 는 뜻이 드러나야 한다.

**하지 않는 것:** `resolveOrCreateMaster()` 제거 · `validateCreateInput` 의 barcode/GTIN 규칙 변경 · `MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED` 삭제/완화 · gate 조건 변경 · `catalog.service.ts` 접촉.

## 2.4 이번 WO 에서 확정하는 결정 (실행자가 다시 열지 않는다)

1. masterId 를 받는 API 는 **`/from-master` 하나뿐**. 기존 `POST /products` 는 계속 거부한다.
2. ③ 의 `assertSupplierPolicy()` **재사용 안 함**. `canonicalizeRegulatoryType()` 만 import(`promotion/adapters/supplier/supplier-regulatory-type.ts` — 순수 함수 · Promotion Core 의존 없음).
3. DRUG PRIVATE draft(`serviceKeys=[]`) 는 **거부 유지**. "제품 먼저 등록 → 서비스 선택은 나중" 을 DRUG 에도 적용할지는 ⑥ 전 별도 정책 WO.
4. 공급자에게 `mfdsPermitNumber` 재입력 요구 없음. 미검증 규제 Master 이고 Master 에 허가번호도 없으면 기존 코드 `PERMIT_REQUIRED_FOR_UNVERIFIED_REGULATED` 로 거부한다(공급자가 우회 입력할 길을 만들지 않는다 — 그 Master 의 permit 보강은 운영자/정부데이터 경로).
5. UI 미변경. Product Library 의 `/supplier/products/new?…` 우회는 ⑥ 까지 그대로.
6. 응답 shape 는 기존 `createSupplierOffer` 성공 응답과 동일하게 맞춘다(⑥ 이 두 경로를 같은 UI 로 소비).

## 2.5 허용되는 부수 작업

- `offer-error-code.ts` enum additive 4종.
- `supplier-product.controller.ts` 상태코드 매핑에 신규 코드 4종 추가(기존 행 불변).
- 테스트 파일 신설 · 기존 `offer.service` 테스트가 있으면 primitive 추출 후에도 **그대로 PASS** 해야 한다(기대값 수정 금지 — 수정이 필요하면 동작이 바뀐 것).

---

# 3. 실행 순서

1. `git fetch origin` · `git status -sb` · 최신 `origin/main` 확인 · 타 세션 dirty 목록 기록.
2. `offer.service.ts` 964~1100 정독 → persistence 구간 경계 확정(어디까지가 "Master 확정 이후" 인지) → primitive 추출 → 기존 테스트 전량 PASS 확인(**여기서 실패하면 추출 경계가 틀린 것 · 기대값을 고치지 않는다**).
3. `createSupplierOfferFromExistingMaster()` 구현(검증표 → permit → primitive).
4. route + controller 매핑 + error code enum.
5. 테스트(§6.1) → build → 영향 subset jest → lint ratchet.
6. 무접촉 확인(§6.1) → 커밋 → push → CI → 프로덕션 smoke(§6.1 · 비파괴) → CHECK → 커밋.

---

# 4. 제외 범위

- `resolveOrCreateMaster()` 제거 · `createSupplierOffer()` 의 Master resolution 책임 이전(⑤).
- Product Library / `SupplierProductCreatePage` / admin-dashboard UI 변경(⑥).
- Candidate 승격 후 Offer 생성 경로(③ 결과 → Offer · ⑤).
- DRUG PRIVATE draft 정책 재검토(별도 정책 WO).
- `MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED` 삭제·완화.
- unique/index/migration/DDL · 권한 상수 · route guard 변경.
- `catalog.service.ts` · `drug-access.guard.ts` · `promotion/**`(import 만) · `store-product-request-admin.service.ts` · `drug-import/**` 수정.
- Master 기준정보 보강(`product_masters` UPDATE) — 어떤 사유로도 0.

---

# 5. 중지 조건

| # | 조건 | 왜 |
|---|---|---|
| A | persistence primitive 를 추출하면 기존 `createSupplierOffer` 테스트/동작이 바뀜(기대값 수정 없이는 PASS 불가) | 동작 변경 0 전제. 경계 재검토 또는 복제 없이 최소 중복 허용 여부는 사용자 판단 |
| B | 기존 경로가 Offer save 와 Master UPDATE 를 한 TX/한 함수에서 섞어 하고 있어 "Master 확정 이후" 경계를 자를 수 없음 | ⑤ 선취 없이는 불가 → 보고 |
| C | `stockQuantity` 등 Offer 필드로 보이는 값이 실제로는 `product_masters` 컬럼으로 흐름 | Product Core 상승 금지. 해당 필드 제외 후 보고 |
| D | schema · migration · unique 변경 필요 | DDL 0 |
| E | DRUG/규제 gate 가 Master 값만으로 판정 불가한 분기 발견(공급자 입력에 의존) | 보안 gate 완화 금지. 보고 |
| F | `requireActiveSupplier` 를 통과하는 ACTIVE 공급자 테스트 계정 부재 · 약관 428 gate 등으로 smoke 불가 | PENDING 기록. 프로덕션 Offer 생성은 승인 없이 하지 않음 |
| G | 현재 변경과 무관한 build · test 실패 · 타 세션 dirty 파일 접촉 필요 | 상시 규칙 |

---

# 6. 검증과 Git

## 6.1 검증

| 항목 | 방법 | PASS 기준 |
|---|---|---|
| Master 검증표 | jest (service · repo/manager fake) | UUID 아님→400 · 없음→404 · `INACTIVE`/`ARCHIVED`→409 · `regulatory_type` 깨진 값/`null`→409 `MASTER_REGULATORY_TYPE_UNSUPPORTED` · ACTIVE+`건강기능식품`(한글 별칭)→통과 |
| masterId 보존 | jest | 응답/저장 Offer `masterId === body.masterId` · barcode/name 검색 호출 0(`resolveOrCreateMaster` spy 미호출) |
| write 0 | jest + 소스 계약 | `ProductMaster`/`ProductIdentifier`/`ProductCandidate` repo write 0 · 신규 함수/파일 원문에 `UPDATE product_masters`/`product_masters SET`/`resolveOrCreateMaster`/`ProductCandidate` 0 |
| 금지 키 | supertest | `barcode`·`name`·`regulatoryType`·`mfdsPermitNumber`·`supplierId` 등 각각 → 400 · Offer 생성 0 |
| 중복 계약 | jest | live → `OFFER_ALREADY_EXISTS` · soft-deleted → `OFFER_IN_RECYCLE_BIN` · save 가 23505(해당 constraint) throw → `OFFER_ALREADY_EXISTS` · 다른 constraint 23505 → 원 오류 |
| DRUG gate | jest | DRUG+`isPublic=true`→거부 · DRUG+`serviceKeys=[]`→거부 · DRUG+비약국 key 포함→거부 · DRUG+pharmacy key 만→허용 · GENERAL/COSMETIC/HFF/QUASI/MD → gate 통과(기존 규칙) · gate 에 넘긴 `regulatoryType` 이 Master 조회값 |
| permit gate | jest | 규제 Master + `is_mfds_verified=false` + `mfds_permit_number=null` → `PERMIT_REQUIRED_FOR_UNVERIFIED_REGULATED` · verified → 통과 · body 에 허가번호를 넣어도 400(금지 키) |
| 기존 route 불변 | supertest | `POST /products` + `masterId` → 여전히 `MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED` · 기존 정상 등록 응답 동일 |
| 기존 서비스 회귀 | 기존 offer.service / supplier-product 테스트 전량 | 기대값 수정 0 으로 PASS |
| route guard | supertest | 미인증 401 · 비공급자/비ACTIVE 공급자 → 기존 `requireActiveSupplier` 응답 · body `supplierId` 무시/400 |
| 무접촉 | `git diff --stat origin/main -- services/catalog.service.ts guards/drug-access.guard.ts promotion services/store-product-request-admin.service.ts drug-import services/web-neture apps/admin-dashboard` | 0 files |
| 빌드 · 정적 | build · 영향 subset jest · lint ratchet | PASS(무관 실패는 원문 보고) |
| 프로덕션 smoke(비파괴) | 배포 후 | 미인증 → 401 · ACTIVE 공급자 계정으로 임의 UUID → 404 · `INACTIVE` Master id(read-only 로 1건 확보) → 409 · **정상 생성은 실행하지 않는다**(프로덕션 Offer write 는 사용자 승인) · read-only `supplier_product_offers` count 전후 동일. 계정 없으면 PENDING(중지 F) |

## 6.2 Git

- 커밋 단위 권장: ① primitive 추출(동작 0 변경 · 기존 테스트 PASS) ② 신규 서비스 함수 + route + 테스트 ③ CHECK(CI 완주 후).
- 메시지 끝 `(WO-O4O-SUPPLIER-EXISTING-MASTER-DIRECT-OFFER-LINK-V1)` · `Co-Authored-By` 유지.
- `git add <path>` · `node scripts/git/check-staged-scope.mjs <paths>` · `git commit -m "..." -- <paths>` · `git push origin main`. `--force`/`stash` 금지.
- 완료 = 이 WO 범위 미커밋 0건 + `HEAD == origin/main`.

---

# 7. 완료 보고

WO 제목을 첫 줄에 두고 한국어로. 다음을 **전부** 포함한다.

1. 신규 route · body 허용/금지 키 최종본 · Master 검증표 · 상태코드 매핑
2. 추출한 persistence primitive 의 이름 · 시그니처 · 옮긴 구간(원 라인 범위) · 기존 `createSupplierOffer()` 테스트 기대값 수정 0 증명
3. 기존 `createSupplierOffer()` 에 **아직 남아 있는** Master resolution 책임 목록(⑤ 인계)
4. ⑤ 에서 `resolveOrCreateMaster()` 를 제거할 때 이 primitive 를 그대로 재사용할 수 있는지 · 부족한 입력이 무엇인지
5. ③ 승격 결과(`matchedProductMasterId` + `rawPayload.supplierId` + `offerDraft`)로 Offer 를 만드는 경로가 같은 primitive 를 쓸 수 있는지(⑤ 설계 자료)
6. DRUG "PRIVATE draft + serviceKeys 없음" 정책 충돌을 ⑥ 전 별도 판단해야 하는지 · 현재 거부되는 케이스 실측
7. 테스트 결과 전부(명령 · 실패/건너뜀 원문) · 무접촉 `git diff --stat` · 중지 조건 A~G 발동 여부
8. 프로덕션 smoke 결과 또는 PENDING 사유 · read-only count 전후
9. 문서 정합: `발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건` — ③ CHECK §9 "④ 가 `assertSupplierPolicy` link 분기 재사용" 판정 정정은 "기록물 불변 · 이 WO 가 대체" 로 기록
10. 커밋 hash · `HEAD == origin/main`
