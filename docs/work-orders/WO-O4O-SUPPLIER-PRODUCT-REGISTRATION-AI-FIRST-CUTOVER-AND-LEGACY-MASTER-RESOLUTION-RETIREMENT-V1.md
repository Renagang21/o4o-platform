# WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1

> **상태:** HANDOFF ONLY · 구현 WO (등록일 2026-09-21 · **실행 착수는 별도 명시 지시**)
> **기준 코드:** `origin/main` `da0ed9693`(④ CHECK) 기준 조사. **실행은 항상 최신 `origin/main` 에서 시작**한다 — reset/rebase 로 타 세션 커밋을 제거하지 않는다. 타 세션 dirty/untracked 파일은 불가침
> **위치:** Supplier AI First 제품 승격 트랙 7단계 중 **⑤(legacy Master resolution 제거) + ⑥(등록 UI AI First cutover) 를 하나의 원자적 전환 WO 로 통합**한다. 이 WO 가 끝나면 ⑤·⑥ 은 함께 종료된 것으로 본다. 다음은 ⑦(ChatGPT/사진/PDF/URL → Candidate 작성 보조)
> **선행:** ① [`…-GENERAL-PROMOTION-CORE-FOUNDATION-V1`](WO-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1.md)(`cc287d3ee`) · ② [`…-SINGLE-PRODUCT-CANDIDATE-INTAKE-V1`](WO-O4O-SUPPLIER-SINGLE-PRODUCT-CANDIDATE-INTAKE-V1.md)(`02f71d6d9`) · ③ [`…-CANDIDATE-PROMOTION-ADAPTER-V1`](WO-O4O-SUPPLIER-PRODUCT-CANDIDATE-PROMOTION-ADAPTER-V1.md)(`f299fb1de`) · ④ [`…-EXISTING-MASTER-DIRECT-OFFER-LINK-V1`](WO-O4O-SUPPLIER-EXISTING-MASTER-DIRECT-OFFER-LINK-V1.md)(`b4b0f70f8` · [CHECK](../checks/CHECK-O4O-SUPPLIER-EXISTING-MASTER-DIRECT-OFFER-LINK-V1.md) §3~§6 = 이 WO 의 직접 입력)
> **기준 문서:** [`O4O-PRODUCT-CORE-BASELINE-V1`](../baseline/O4O-PRODUCT-CORE-BASELINE-V1.md) §5 · §6 · §12 · [`O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1`](../baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md)(F12) · [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)(Supplier 업무공간) · [`O4O-BOUNDARY-POLICY-V1`](../architecture/O4O-BOUNDARY-POLICY-V1.md)

---

# 1. 목표와 배경

## 1.1 왜 ⑤ 를 단독으로 먼저 하면 안 되는가

④ CHECK §3 기준 `createSupplierOffer()` 에 남은 책임은 R1~R5 다. 그중 R2(`resolveOrCreateMaster` 경유)를 먼저 제거하면, 현재 신규 등록 화면 [`SupplierProductCreatePage.tsx`](../../services/web-neture/src/pages/supplier/SupplierProductCreatePage.tsx) 362 이 여전히 `supplierApi.createProduct()` → `POST /supplier/products` 를 호출하므로 **공급자 신규 제품 등록이 중간 배포에서 즉시 끊긴다.** 반대로 ⑥(UI 를 Candidate API 로 전환)만 먼저 하면 legacy 경로가 살아 있어 두 Master 생성 경로가 공존한다. 따라서 **backend 제거와 UI 전환은 같은 배포 단위**여야 한다.

## 1.2 현재 → 목표

```text
현재
  Product Library(master.id 확보 후 버림) / 신규 입력 / Import Assistant
      ↓ /supplier/products/new
  POST /supplier/products → resolveOrCreateMaster → (Master 생성·UPDATE·Identifier·brand 생성) → Offer

목표
  기존 Master 선택   → POST /supplier/products/from-master           → Offer (④)
  신규/미확정 제품    → POST /supplier/product-candidates              → ProductCandidate → 운영자 Promotion(③) → Master → 별도 Offer 연결
  bulk               → POST /supplier/products/bulk-candidates (기존) → ProductCandidate
```

`POST /supplier/products → resolveOrCreateMaster → Master 생성` 구조는 이 WO 로 **최종 제거**한다.

## 1.3 ④ CHECK 가 확정한 R1~R5 와 이 WO 의 판정

| 책임 (④ CHECK §3) | 이 WO 판정 |
|---|---|
| R1 `validateCreateInput` — masterId 주입 차단 + Offer 공통 검증 + legacy Master 입력 검증 | Offer 공통 검증과 legacy Master 입력 검증을 **분리**. Offer 공통 검증은 유지 |
| R2 `resolveOrCreateMaster` 경유 (`offer.service.ts` 896) | **Supplier Offer 경로에서 완전 제거** |
| R3 신규 Master 대상 `updateProductMaster` (918) 및 `resolveProductMetadata` 를 통한 Master 생성 | **완전 제거** |
| R4 공급자 입력 `mfdsPermitNumber` 기반 permit 판정 (902) | **Master 값 기준으로 전환** (④ `createSupplierOfferFromExistingMaster` 와 동일 방식) |
| R5 category/brand 해석 · brand 자동 생성 (`importCommon.resolveBrandId` 891) | **Offer 경로에서 제거** |

`CatalogService.resolveOrCreateMaster()` **함수 자체는 삭제하지 않는다.** 소비처가 Supplier 외에도 있다 — `catalog-import-resolver.ts` 30 · `admin.controller.ts` 463 · `product-master-create.controller.ts` 46 · `neture.service.ts` 435(위임). Supplier Offer 경로의 호출만 제거한다.

## 1.4 두 가지 선결 격차 (cutover 전 반드시 확정)

**(a) Candidate metadata parity.** legacy 신규 Master 는 생성 직후 category/brand/origin 등을 보강하고 여러 ProductImage 를 붙인다. 반면 Candidate → Promotion 경로는 다음 상태다(② mapper [`supplier-single-candidate.mapper.ts`](../../apps/api-server/src/modules/neture/services/supplier-single-candidate.mapper.ts) · ③ Adapter 기준):

| 정보 | legacy 신규 Master | Candidate → Promotion 현재 |
|---|---|---|
| `specification` | Master 컬럼 | Promotion Core 반영 ✔ |
| `categoryId` | Master 컬럼 | evidence/rawPayload 에만 |
| `brandName`/`brandId` | Master 컬럼 (+brand 자동 생성) | evidence/rawPayload 에만 |
| `originCountry` | Master 컬럼 | evidence/rawPayload 에만 |
| `regulatoryName` | 공급자 입력 | evidence 만 · GENERAL/COSMETIC 신규 Master 는 `name` 을 사용 |
| `mfdsPermitNumber` | 공급자 입력 → permit 판정 | evidence 만 · 규제 제품군 신규 Master 는 ③ 에서 차단(`SUPPLIER_REGULATED_CREATE_BLOCKED`) |
| 대표 이미지 | Master 생성 후 `productApi.uploadProductImage(masterId, …, 'thumbnail')` | `candidateImageUrl` 단일 값 |
| content 이미지들 | Master 생성 후 `contentItems` 반복 업로드 (CreatePage 394~398) | **계약 없음** |

단순히 UI 호출만 Candidate API 로 바꾸면 등록 품질이 떨어진다. §2.5 에서 유실 없는 계약을 먼저 확정한다.

**(b) DRUG 와 정보-우선 UI 의 충돌.** 일반 상품은 `PRIVATE + serviceKeys=[]` 로 Offer 를 만들 수 있지만 DRUG 는 `assertDrugOfferAllowed` 가 `DRUG_SERVICE_CONTEXT_REQUIRED` 로 거부한다(④ CHECK §6). 현재 신규 등록 UI 는 공급방식 선택을 의도적으로 숨기므로, 기존 DRUG Master 를 `/from-master` 로 곧바로 연결하면 실패한다. §2.6 에서 gate 를 건드리지 않는 UX 로 해결한다.

## 1.5 다른 세션 보호

`git fetch origin` → `git status -sb` 후 시작. path-specific stage · `node scripts/git/check-staged-scope.mjs <paths>` · `git commit -- <paths>` · `--force`/`stash` 금지. 타 세션 dirty/untracked 는 불가침.

---

# 2. 승인 범위

## 2.1 기존 Master 선택 경로 (Product Library)

- [`SupplierProductLibraryPage.tsx`](../../services/web-neture/src/pages/supplier/SupplierProductLibraryPage.tsx) `handleSelect`(118~130)는 더 이상 `master.id` 를 버리고 barcode/name/manufacturer 로 `/supplier/products/new` 에 우회 전달하지 않는다. 선택한 `masterId` 를 정본으로 유지한다.
- 등록은 ④ `POST /api/v1/neture/supplier/products/from-master` 를 사용한다. `services/web-neture/src/lib/api/supplier.ts` 에 해당 client 함수를 추가한다(현재 없음).
- ProductMaster 정보를 다시 입력받거나 barcode/name 으로 재탐색하지 않는다. 화면은 Master 기준정보를 **읽기 전용**으로 보여주고 Offer 필드(가격 · 설명 · 공급방식 · serviceKeys · isFeatured 등 ④ 허용 필드)만 입력받는다.

## 2.2 신규 제품 경로 (단건)

- Product Library 에서 적절한 Master 를 찾지 못한 제품은 `POST /api/v1/neture/supplier/product-candidates`(②)로 제출한다. web-neture 에 공급자용 candidate client 를 추가한다(현재 운영자용 `operatorProductCandidates.ts` 만 존재).
- 완료 상태 문구는 "공급 상품 등록 완료" 가 아니라 **`제품 정보 검토 요청 완료`** 류로, Candidate 상태임을 명확히 구분한다. 이 시점에 `SupplierProductOffer` 는 생성하지 않는다.
- 공급자가 입력한 Offer 초안(가격 · 설명 등)은 ② `offerDraft` 로 보존한다.

## 2.3 Bulk

`POST /supplier/products/bulk-candidates` 흐름은 **유지**한다. 단건과 bulk 모두 ProductCandidate 에 수렴한다.

## 2.4 Import Assistant

[`SupplierProductImportPage.tsx`](../../services/web-neture/src/pages/supplier/SupplierProductImportPage.tsx) 376 이 `/supplier/products/new` 로 초안을 넘기는 구조를 **신규 Candidate 작성 경로**로 수렴시킨다. AI/사진/PDF/URL 자동 분석은 ⑦ 이며, 이번 WO 는 기존 Import Assistant 가 수집한 값을 Candidate 에 안전하게 전달하는 것까지만 한다.

## 2.5 Candidate metadata parity — cutover 전 필수 판정

§1.4(a) 표의 `categoryId · brandName/brandId · originCountry · specification · regulatoryName · 대표 이미지 · content 이미지들` 이 **유실되지 않는 계약**을 코드 변경 전에 확정하고 CHECK 에 기록한다.

- Supplier Adapter 가 별도로 `ProductMaster` 를 UPDATE 하는 우회는 **금지**(③ 원칙 유지).
- 필요하면 Promotion Core 의 **optional canonical metadata 계약**(categoryId · brandId · originCountry 등)을 확장하되, Core 가 제품군을 판단하지 않는 원칙은 유지한다. Core 변경은 ① 계약 변경이므로 CHECK 에 근거와 범위를 명시한다.
- 이미지는 Master 생성 전에 `ProductImage` 로 쓰지 않는다. Candidate 단계에서 media URL/evidence(`rawPayload` 배열)로 보존하고, 승격 후 Master 에 연결하는 구조를 사용한다. **신규 테이블 없이 `rawPayload` 배열로 충분한지 우선 검토**한다. 파일 업로드 자체는 기존 media asset 경로를 재사용한다(Master 없이 업로드 가능한 경로가 없으면 §5 중지).
- 규제 제품군 신규 Candidate 는 ③ 정책대로 create 차단이 유지된다. 이는 유실이 아니라 의도된 경계다.

## 2.6 DRUG 정책

- `assertDrugOfferAllowed()` 는 이번 cutover 에서 **완화하지 않는다**.
- 기존 DRUG Master 선택 시 UI 는 **`약국 대상 서비스 선택 → /from-master`** 로 안내한다(pharmacy-target serviceKey 필수). 서비스 미선택 상태로는 제출 버튼을 열지 않는다.
- 신규 DRUG 제품은 Candidate 제출까지만 허용하고 Offer 자동 생성은 하지 않는다. Master 승격 후 serviceKey 를 정한 뒤 Offer 를 만든다.
- `DRUG + PRIVATE + serviceKeys=[]` draft 허용 정책 변경은 본 WO 와 분리된 명시적 정책 결정 없이는 하지 않는다.

## 2.7 P3 retirement (UI cutover 와 같은 배포)

[`offer.service.ts`](../../apps/api-server/src/modules/neture/services/offer.service.ts) 의 Supplier Offer 경로에서 제거:

- `createSupplierOffer()` 의 `resolveOrCreateMaster()` 호출
- `resolveProductMetadata()` 를 통한 Master 생성
- 신규 Master 대상 `updateProductMaster()` 호출
- 공급자 입력 기반 permit 판정(R4 → Master 값 기준)
- Offer 경로의 category/brand 해석 및 brand 자동 생성

## 2.8 유지할 정본

- `persistOfferForResolvedMaster()` = Offer persistence 정본. Offer INSERT · 유일성 · DRUG gate · approval 생성은 이 1곳으로 수렴한다.
- `createSupplierOfferFromExistingMaster()` = existing Master → Offer 공식 경로.
- Candidate 승격 완료 후 Offer 를 만들 때도 같은 primitive 를 재사용할 수 있어야 한다(④ CHECK §5 판정: `matchedProductMasterId + rawPayload.offerDraft + supplierId` 로 PRIVATE draft 연결 가능).

## 2.9 legacy `POST /supplier/products` 처분

1. 내부 UI 소비(`supplierApi.createProduct` · CreatePage 362)를 전부 제거한 뒤 repo census 를 다시 수행한다(`services/*` · `apps/*` · scripts).
2. 운영 access log(Cloud Run 요청 로그)에서 외부 consumer 유무를 확인할 수 있으면 확인한다(read-only).
3. **외부 consumer 0 이 증명되면** legacy POST create route 를 제거한다.
4. **확정할 수 없으면** Master write 는 즉시 제거하되, no-write compatibility stub 으로 `410` + `LEGACY_SUPPLIER_PRODUCT_CREATE_RETIRED` 를 반환하게 둘 수 있다.
5. 어떤 경우에도 legacy endpoint 가 ProductMaster 를 다시 생성하도록 남겨두지 않는다.
6. `MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED` 는 legacy endpoint 가 살아 있는 동안만 의미가 있다. route 최종 삭제 후 별도로 dead-code 판정한다(이 WO 에서 삭제하지 않음).

---

# 3. 실행 순서

1. **조사·계약 확정(코드 변경 전):** §2.5 metadata parity 표를 실제 코드로 재확인하고 보존 계약(Core optional metadata 확장 범위 · 이미지 `rawPayload` 배열 형식)을 CHECK 초안에 기록. Core 변경이 "큰 변경" 이면 §5 중지.
2. **Backend — Candidate 측 보강:** ② intake 에 이미지/metadata 보존 필드 추가(additive) · ③ Adapter/Core 에 optional metadata 반영 · 승격 후 이미지 연결. 신규 Master write 는 여전히 Promotion Core 1곳.
3. **Backend — P3 retirement(§2.7):** `createSupplierOffer()` 에서 R2~R5 제거 · R1 분리. 기존 6 suites 중 legacy 생성 동작을 기대하던 테스트는 **이 WO 의 명시 범위이므로** 기대값을 새 계약으로 갱신하되, 변경 사유를 CHECK 에 표로 남긴다(④ 의 "기대값 수정 0" 조건은 이 WO 에는 적용되지 않음).
4. **Backend — legacy route 처분(§2.9):** census → 로그 확인 → 삭제 또는 stub.
5. **Frontend cutover:** Library `handleSelect` → `/from-master` 화면 · CreatePage → Candidate 제출 · Import Assistant → Candidate · DRUG 안내(§2.6) · 완료 문구 구분. `supplierApi.createProduct` 삭제.
6. **검증(§6)** → CHECK → path-specific commit(backend / frontend / docs 분리 커밋 권장, 단 **배포는 하나의 push 단위**로 묶어 중간 상태를 만들지 않는다) → push → smoke.

---

# 4. 제외 범위

- ⑦ ChatGPT/사진/PDF/URL 자동 분석 — 별도 WO.
- `CatalogService.resolveOrCreateMaster()` 함수 삭제 · Admin/system 의 Master 생성 경로 변경.
- `assertDrugOfferAllowed()` · `assertRegulatedPermit()` 완화 · DRUG PRIVATE draft 정책 변경.
- `(supplier_id, master_id)` unique 제약 · 인덱스 · migration 변경. DDL 은 §2.5 metadata 보존에 **정말 필요하지 않은 한 0**.
- 운영자 Candidate 검토 콘솔(`/operator/product-candidates`) UX 개편.
- ProductCandidate bulk 흐름 재설계.
- `MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED` dead-code 정리(후속 판정).

---

# 5. 중지 조건

구현자가 임의 결정하지 않고 중지해 보고한다.

| # | 조건 |
|---|---|
| A | Candidate → Promotion 에서 category/brand/origin 보존을 위해 ProductMaster/Promotion Core 계약의 **큰 변경**(필수 필드 추가 · Core 가 제품군 판단 · Adapter 의 Master UPDATE)이 필요 |
| B | 이미지 보존이 `rawPayload`/기존 media asset 만으로 불가능해 **신규 schema/DDL** 이 필요 |
| C | legacy `POST /supplier/products` 의 **외부 실사용자**가 census 또는 access log 에서 발견됨 |
| D | DRUG info-first UX 를 위해 security gate 변경이 반드시 필요함 |
| E | Admin/system 의 `resolveOrCreateMaster()` 소비처가 Supplier 제거 작업 때문에 영향받음 |
| F | 타 세션이 같은 파일(`offer.service.ts` · CreatePage · LibraryPage 등)을 변경 중이거나 충돌 |
| G | 현재 변경과 무관한 build/test 실패 · 프로덕션 smoke 에 write 가 필요한 경우(별도 승인) |

---

# 6. 검증과 Git

## 6.1 성립 조건 (전부)

- web-neture 에서 legacy `supplierApi.createProduct()` 실사용 0 (함수 삭제)
- Product Library 선택 → `/from-master` · 신규 제품 → Candidate · bulk → Candidate · Import Assistant → Candidate
- 신규 Candidate 제출 시 ProductMaster write 0 · existing Master direct path 에서 ProductMaster write 0
- Supplier Offer 코드에서 `resolveOrCreateMaster` 호출 0 · 신규 Master `updateProductMaster` 0 · brand 자동 생성 0
- Offer persistence 는 `persistOfferForResolvedMaster` 1개로 수렴(소스 계약 테스트)
- Candidate 정보(category/brand/origin/specification/regulatoryName) · 이미지(대표+content) 유실 없음 — 승격 후 Master/ProductImage 에 도달함을 테스트로 증명
- DRUG gate 회귀 없음(기존 DRUG 테스트 PASS · 신규 DRUG Candidate 는 Offer 0)
- 기존 `(supplierId, masterId)` unique 계약 유지(④ 계약 테스트 PASS)
- 기존 Admin/system Master 생성 경로 회귀 없음(`catalog-import-resolver` · `admin.controller` · `product-master-create.controller` 테스트/계약 PASS)
- DDL/migration 0(§2.5 예외 시 CHECK 에 근거)
- `tsc --noEmit` · eslint · api-server build · web-neture build PASS

## 6.2 smoke

- 프로덕션: 미인증 401 · legacy route 처분 결과(404 또는 410 `LEGACY_SUPPLIER_PRODUCT_CREATE_RETIRED`) · read-only 계수(`supplier_product_offers` · `product_masters` · `product_candidates`) 전후 비교.
- 인증 UI smoke(Library → from-master · 신규 → Candidate)는 ACTIVE 공급자 test 계정이 있을 때 실브라우저로 수행. **프로덕션 Offer/Candidate 생성 write 는 별도 승인 없이는 하지 않는다.** 계정 부재 시 PENDING 사유를 CHECK 에 기록.

## 6.3 Git

`git fetch origin` · `git status -sb` → path-specific stage → `node scripts/git/check-staged-scope.mjs <paths>` → `git commit -m "… (WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1)" -- <paths>` → push. backend/frontend 커밋을 나누더라도 **한 push 단위**로 올린다. 완료 조건 = `HEAD == origin/main` + WO 범위 미커밋 0. `--force`/`stash` 금지.

---

# 7. 완료 보고

CHECK `docs/checks/CHECK-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1.md` 를 작성하고 보고에 다음을 포함한다.

1. metadata parity 최종 계약(항목별 보존 위치 · Core 확장 범위 · 이미지 `rawPayload` 형식)
2. R1~R5 처분 결과(제거/분리/전환 각각의 위치)
3. legacy `POST /supplier/products` 처분(삭제 vs 410 stub · census/로그 근거)
4. UI 4경로 전환 결과(Library · 신규 · bulk · Import Assistant) 및 DRUG 안내 UX
5. 기대값을 갱신한 기존 테스트 목록과 사유
6. 검증 §6.1 항목별 PASS/FAIL · smoke 결과/PENDING 사유
7. 중지 조건 발동 여부 표
8. `문서 정합: 발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건`
9. commit hash · `HEAD == origin/main` · WO 범위 미커밋 0
10. ⑦ 인계: Candidate 작성 보조가 채워야 할 입력 필드 목록 · `MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED` dead-code 판정 결과
