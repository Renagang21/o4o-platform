# CHECK-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1

> **WO:** [`WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1`](../work-orders/WO-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1.md) (`883fec96b`)
> **실행일:** 2026-09-22 · **기준 `origin/main` 착수 시점:** `a2e89bf85` → 커밋 직전 `6581dc821`
> **커밋:** backend `dc1c9f542` · web-neture `34ed4acd1` · CHECK(본 문서) 후속 커밋
> **판정:** **CUTOVER COMPLETE — Supplier Offer 경로의 legacy Master resolution(P3) 은퇴 · 등록 UI 4경로 AI First 전환 · 프로덕션 smoke 는 §6 참고**
> **트랙 위치:** Supplier AI First 제품 승격 7단계 중 ⑤+⑥ 통합. 다음 = ⑦(Candidate 작성 보조: ChatGPT/사진/PDF/URL → Candidate)

---

## 1. metadata parity 최종 계약 (WO §2.5)

Candidate 는 **ProductMaster 를 쓰지 않는다.** 공급자 입력은 Candidate 컬럼 + `rawPayload` 에 무손실 보존되고, 운영자 Promotion(③ Adapter → Core)에서 **create 시에만** Master/ProductImage 에 도달한다. link(기존 Master 연결) 시에는 Master/ProductImage 를 건드리지 않는다.

| 항목 | Candidate 보존 위치 | 승격(create) 시 도달 위치 | 근거 코드 |
|---|---|---|---|
| `name` · `barcode` · `specification` | Candidate 컬럼 | `product_masters` (기존) | `supplier-single-candidate.mapper.ts` |
| `categoryId` | `rawPayload.categoryId` → normalizer `evidence.categoryId` | `product_masters.category_id` — `resolveRefsFromDb` 가 `is_active` 확인 후 `master.metadata.categoryId`; 비활성/부재 → `approvalMeta.droppedRefs` 기록, evidence 는 유지 | `supplier-promotion.plan.ts` · `supplier-candidate-promotion.service.ts` · `product-promotion.store.ts` `createMaster` INSERT |
| `brandId` (UUID 만) | `evidence.brandId` | `product_masters.brand_id` (동일 `is_active` 검증) | 동일 |
| `brandName` | Candidate 컬럼 + evidence | `product_masters.brand_name` (기존) · **brandId 자동 해석/brand 자동 생성은 하지 않음** (P3 R5 제거 원칙) | — |
| `originCountry` | `rawPayload` → evidence | `product_masters.origin_country` (`metadata.originCountry`) | `createMaster` INSERT |
| `regulatoryName` | evidence | `metadata.regulatoryName` → Master (GENERAL/COSMETIC 신규는 규제명 없으면 `name`) | `supplier-promotion.plan.ts` |
| `mfdsPermitNumber` | evidence | 규제 제품군 신규 Master 는 ③ `SUPPLIER_REGULATED_CREATE_BLOCKED` 그대로(변경 0) | ③ CHECK |
| 대표 이미지 | `rawPayload.images[{url,type:'thumbnail',sortOrder:0}]` (`imageUrl` 과 같은 값) | `product_images` (`is_primary=true`, `source='candidate_promotion'`) | `buildSupplierCandidateImages` · `linkPromotionImages` |
| content 이미지들(≤20) | `rawPayload.images[{url,type:'content',sortOrder:n}]` 순서 보존 | `product_images` (`type='content'`, sortOrder 유지) | 동일 |

**Core 확장 범위 (§2.5 최소 확장 · DDL 0):**

- `PromotionMasterFields.metadata?: PromotionMasterMetadata { categoryId, brandId, originCountry, regulatoryName }` — 전부 nullable · 기존 컬럼에만 쓰기 (`category_id`, `brand_id`, `origin_country`).
- `ProductPromotionEffects.images?: PromotionImageInput[] { url, type: 'thumbnail'|'content'|'detail', sortOrder }` — `ProductPromotionCore.afterCommit` 에서 create 시에만 `linkPromotionImages(dataSource, masterId, images)` 실행(`product_images` INSERT · 첫 thumbnail 이 `is_primary` · 빈 URL skip · 실패는 landing 을 막지 않음).
- `approvalMeta.imageCount` · `approvalMeta.droppedRefs`(비어 있으면 키 없음) 로 감사 근거 보존.
- Core 는 제품군 판단을 하지 않는다(불변). Supplier Adapter 가 `product_masters` 를 UPDATE 하는 우회 경로 0.

**`rawPayload.images` 형식:** `Array<{ url: string(http/https), type: 'thumbnail' | 'content', sortOrder: number }>` — thumbnail 최대 1장(normalizer 가 초과분을 content 로 강등) · 비 http / 중복 URL 제거 · bulk 는 항상 `[]`. `images` 배열이 없는 레거시 Candidate 는 `candidateImageUrl` 을 thumbnail 로 승격.

## 2. R1~R5 처분 결과

| 책임 | 처분 | 위치 |
|---|---|---|
| R1 `validateCreateInput` | **제거**. Offer 공통 검증은 `createSupplierOfferFromExistingMaster` 의 기존 검증(허용 키 목록 · `SUPPLIER_ID_NOT_ALLOWED` · `MASTER_FIELD_NOT_ALLOWED`)이 담당. masterId 주입 차단(`MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED`)은 legacy 전용이므로 코드와 함께 제거 — `offer-error-code.ts` 에 은퇴 주석만 | `offer.service.ts` · `offer-error-code.ts:41` |
| R2 `resolveOrCreateMaster` 경유 | **Supplier Offer 경로에서 완전 제거** (호출 0 — 소스 계약 테스트 고정) | `offer.service.ts` |
| R3 신규 Master `updateProductMaster` · `resolveProductMetadata` | **완전 제거** (함수 삭제 · instance 에 존재하지 않음을 테스트로 고정) | `offer.service.ts` |
| R4 공급자 입력 permit 판정 | **Master 값 기준으로 전환** — `persistOfferForResolvedMaster` 가 Master `regulatory_type` + `assertDrugOfferAllowed` 로 판정 | `offer.service.ts` · `drug-access.guard.ts:270` 주석 정렬 |
| R5 category/brand 해석 · brand 자동 생성 | **Offer 경로에서 제거** (`ProductImportCommonService`/`resolveBrandId` 참조 0) | `offer.service.ts` |

유지: `CatalogService.resolveOrCreateMaster()` 함수 · `catalog-import-resolver.ts` · `admin.controller.ts` · `product-master-create.controller.ts` 소비처 — **무변경**. Offer persistence 정본 = `persistOfferForResolvedMaster()`(정의 1 · 호출 1) + `createSupplierOfferFromExistingMaster()`.

## 3. legacy `POST /supplier/products` 처분

- **결정: 삭제(404).** 410 stub 을 두지 않음.
- Census: 저장소 전체에서 `supplierApi.createProduct()` / `POST …/supplier/products` 소비자는 web-neture `SupplierProductCreatePage.tsx` 1곳뿐(cutover 로 제거) · 다른 서비스/스크립트/문서 실사용 0. Cloud Run 30일 로그에서 해당 route 요청은 본 세션의 curl 401 확인 외 0.
- `NetureService.createSupplierOffer` · `OfferService.createSupplierOffer` 삭제 → `supplier-product.controller.ts` 에서 route 미등록 → 인증 유무와 무관하게 404 (`supplier-product.from-master.controller.test.ts` '(은퇴) 레거시 POST /products').
- **ProductMaster 를 생성하는 Supplier HTTP 경로는 이제 존재하지 않는다.**

## 4. UI 4경로 전환 결과 (web-neture `34ed4acd1`)

| 경로 | 전 | 후 |
|---|---|---|
| Product Library 선택 | master.id 확보 후 버리고 `/products/new` → legacy POST | 신규 `SupplierProductFromMasterPage.tsx` (`/supplier/products/from-master`, nav state 로 master 전달) → `POST /supplier/products/from-master` (masterId 직접 · barcode/name 재추론 0) |
| 신규/미매칭 단건 | `/products/new` → legacy POST → Master 생성 | `/products/new` → `POST /supplier/product-candidates` · Offer 생성 0 · 완료 문구 **"제품 정보 검토 요청 완료"** + Candidate 상태(운영자 검토 후 Master 확정) 안내 · 재고 입력 숨김(`hideStock`) · 대표/콘텐츠 이미지는 `mediaApi.upload` 후 URL 을 `imageUrl`/`contentImageUrls` 로 전달 |
| bulk | `POST /supplier/products/bulk-candidates` | 동일(유지) |
| Import Assistant | `/products/new` 로 prefill → legacy POST | 같은 prefill → Candidate 흐름(AI/사진/PDF/URL 확장 0 = ⑦) |

**DRUG UX:** from-master 화면에서 Master 가 DRUG 이면 서비스(약국 대상 serviceKey) 선택 블록이 **같은 화면**에 노출되고 미선택/`PRIVATE + serviceKeys=[]` 는 제출 차단 + 안내 문구. 서버 `assertDrugOfferAllowed` 완화 0(빈 serviceKeys fail-closed 불변). 신규 DRUG 는 Candidate 만.

## 5. 기대값을 갱신·삭제한 기존 테스트

| 테스트(위치) | 기존 기대값 | 왜 더 이상 유효하지 않은가 | 대체한 신규 계약 테스트 |
|---|---|---|---|
| `supplier-promotion.plan-policy.test.ts` `s.master` toEqual | `metadata` 키 없음 | Core 가 `master.metadata` 를 받는 additive 확장 | 같은 파일 refs→metadata/`droppedRefs` · DRUG metadata 테스트 |
| 〃 `s.effects` toEqual | `{ ensureDrugExtension }` 만 | `effects.images` 추가 | 〃 images mapping + `imageCount` |
| 〃 keys 목록 | `metadata` 미포함 | 〃 | 〃 |
| `supplier-candidate.normalizer.test.ts` evidence toEqual | `brandId` 키 없음 | evidence 에 `brandId`(UUID 만) 추가 | 비-UUID → null · images 정규화 · legacy candidateImageUrl → thumbnail · bulk `[]` |
| `supplier-product.from-master.controller.test.ts` '기존 POST /products 불변' | legacy 201 + `createSupplierOffer` 호출 | route 삭제 | '(은퇴) 레거시 POST /products' 404 · from-master 미호출 |
| `supplier-offer-from-existing-master.test.ts` 'MASTER_ID_DIRECT_INJECTION…/resolveOrCreateMaster 경유' | legacy 가 masterId 주입 거부 · `resolveOrCreateMaster` 경유 | legacy 메서드 삭제 | '(은퇴) 레거시 createSupplierOffer' — instance 에 `createSupplierOffer`/`validateCreateInput`/`resolveProductMetadata` 없음 · from-master 성공 시 `resolveOrCreateMaster`/`updateProductMaster` 미호출 |
| `supplier-offer-master-write-paths.test.ts` `resolveProductMetadata` · `SUPPLIER_MANUAL` | Offer 경로가 metadata 를 해석·Master UPDATE | 제거 | '(은퇴) resolveProductMetadata' 소스 계약: `resolveOrCreateMaster(`/`updateProductMaster(`/`resolveBrandId`/`ProductImportCommonService`/`resolveProductMetadata` 0 · primitive 정의 1/호출 1 |
| `supplier-existing-master-direct-offer-link-contract.spec.ts` ③/⑤ | legacy 와 from-master 공존 | legacy 삭제 | 은퇴 단언으로 교체 |
| `product-promotion-core.test.ts` · `in-memory-promotion-store.ts` | metadata/images 미고려 | Core 확장 | `promoteWithStore — create metadata` · afterCommit(create 2 INSERT · link 0 · query 실패 swallow) · `linkPromotionImages` param 계약 |
| `supplier-candidate-promotion.service.test.ts` | refs 조회 없음 | `resolveRefsFromDb` 추가 | 활성 refs → metadata+images · 비활성 brand → `droppedRefs` · link 시 metadata write 0 |

신규: `apps/api-server/src/__tests__/supplier-product-registration-cutover-contract.spec.ts` (19) — route 존재/부재 · 소스 계약 · forbidden keys · web-neture 소비자 0.

## 6. 검증 §6.1 항목별 · smoke

| 항목 | 결과 |
|---|---|
| web-neture legacy `createProduct()` 실사용 0(함수 삭제) | PASS (spec + grep) |
| Library→from-master · 신규→Candidate · bulk→Candidate · Import→Candidate | PASS (코드 · tsc · build) |
| Candidate 제출 ProductMaster write 0 · existing direct path Master write 0 | PASS (테스트) |
| Supplier Offer `resolveOrCreateMaster` 0 · 신규 `updateProductMaster` 0 · brand 생성 0 | PASS (소스 계약 테스트) |
| persistence = `persistOfferForResolvedMaster` 1 | PASS |
| metadata/이미지 승격 후 Master/ProductImage 도달 | PASS (Core · Adapter · service 테스트) |
| DRUG gate 회귀 0 | PASS (기존 DRUG 테스트 전부 PASS · 완화 0) |
| `(supplierId, masterId)` unique 유지 | PASS (④ 계약 테스트) |
| Admin/system Master 생성 경로 회귀 0 | PASS (해당 파일 무변경 · 관련 spec PASS) |
| DDL/migration 0 | PASS |
| `tsc --noEmit` · eslint · api-server build · web-neture build | PASS (api-server 46 suites / 759 tests · eslint 변경 파일 0 errors · web-neture eslint 0 errors/6 기존 warnings · vite build PASS) |

**프로덕션 smoke:** §6-A 에 배포 후 결과를 기록한다(본 문서 후속 커밋). 인증 UI smoke(실 Offer/Candidate 생성)는 **운영 데이터 write 승인 없음 → PENDING**. 미인증 401 · legacy 404 · read-only 계수는 write 없이 수행.

### 6-A. 배포·smoke 결과 (2026-09-22 09:1x KST)

- **배포:** `Deploy API Server (Cloud Run)` run 35669938816 SUCCESS → revision `o4o-core-api-03731-7n5`(100% traffic · 00:13Z) · `Deploy Web Services` run 35669938801 `deploy-neture` SUCCESS. `CI Pipeline` run 35669938825 는 후속 push(`082f5887f`, 타 세션) concurrency 로 **cancelled** — 본 WO 테스트는 로컬 46 suites/759 PASS 로 대체 근거, 최신 main 의 CI 는 `082f5887f` 런이 담당.
- **API 미인증(write 0):** `POST …/supplier/products/from-master` 401 · `…/product-candidates` 401 · `…/products/bulk-candidates` 401 · legacy `…/products` 401 · 존재하지 않는 경로도 401 → `/supplier` 라우터 레벨 `requireAuth` 가 route 매칭보다 앞서므로 **미인증으로는 legacy 404 를 구분할 수 없음**. 404 는 컨트롤러 테스트(활성 공급자 → 404)로 고정.
- **web-neture 배포 bundle:** `index-DNZz2MPx.js` 에 `products/from-master` · `product-candidates` 각 3회, legacy `POST /neture/supplier/products` 호출 0(남은 `/neture/supplier/products` 문자열은 `getProducts` GET 목록 · `approval-counts`·`batch`·`bulk`·`submit-approval` 등 기존 경로) · `SupplierProductCreatePage-CoPoVE4N.js` 에 "제품 정보 검토 요청 완료" 포함 · `SupplierProductFromMasterPage-FyAaCh2Z.js` 배포 확인 · `/supplier/products/from-master` 200.
- **read-only 계수(before=after · write 0):** `supplier_product_offers` 22 · `product_masters` 272,040 · `product_candidates` 394,495 · `product_images(source='candidate_promotion')` 0.
- **인증 UI smoke: PENDING.** 공급자 표준 test 계정(`docs/local/TEST-ACCOUNTS.local.md`)은 `POST /auth/login serviceKey=neture` 가 `SERVICE_NOT_MEMBER` — Identity 재정렬(9/21) 이후 Google-only 전환 상태로 판단되며 이 세션은 Google OAuth 를 수행할 수 없다. 또한 실제 Offer/Candidate 생성은 운영 write 승인 대상이므로 미수행. 재개 조건: Google 인증 가능한 ACTIVE 공급자 계정 + write 승인.

## 7. 중지 조건 발동 여부

| WO §5 | 발동 |
|---|---|
| A 새 스키마/DDL | 없음 (기존 컬럼만) |
| B Core 대규모 재설계 | 없음 (additive 2필드) |
| C DRUG gate 완화 필요 | 없음 |
| D 외부 소비자 발견 | 없음 (census 0) |
| E 타 세션 파일 접촉 | 없음 (foreign dirty/untracked/staged 불가침 유지 · commit `-- <paths>`) |
| F 권한/route contract 변경 | 없음 (legacy route 삭제는 WO 가 명시) |
| G 무관 build/test 실패 · smoke write | 없음 · write smoke 는 미수행(PENDING) |

## 8. 문서 정합

`문서 정합: 발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건` — 기준 문서(`O4O-PRODUCT-CORE-BASELINE-V1` §5·§6·§12)와 충돌 없음. `drug-access.guard.ts:270` 주석의 `createSupplierOffer` 참조만 코드 주석으로 정정.

## 9. Git

- backend `dc1c9f542` · web-neture `34ed4acd1` · `HEAD == origin/main` 확인 · WO 범위 미커밋 0 (CHECK 커밋 후 재확인).

## 10. ⑦ 인계 — Candidate 입력 계약

`POST /api/v1/neture/supplier/product-candidates` (requireAuth + requireActiveSupplier · `supplierId` 는 ctx 에서만)

```jsonc
{
  "name": "string ≤200 (필수)",
  "barcode": "string ≤64 | null",
  "categoryId": "uuid | null",          // 존재/활성 검증은 승격 시 · 없으면 droppedRefs
  "brandId": "uuid | null",             // UUID 형식만 · brandName→brandId 자동 해석 없음
  "brandName": "string ≤200 | null",
  "manufacturerName": "string ≤200 | null",
  "specification": "string ≤500 | null",
  "originCountry": "string ≤100 | null",
  "regulatoryType": "GENERAL | COSMETIC | HEALTH_FUNCTIONAL | QUASI_DRUG | DRUG | MEDICAL_DEVICE",
  "drugCategory": "OTC | RX | null",    // DRUG 일 때만
  "regulatoryName": "string ≤200 | null",
  "mfdsPermitNumber": "string ≤100 | null",
  "imageUrl": "http(s) url ≤2048 | null",           // 대표 → rawPayload.images[thumbnail]
  "contentImageUrls": ["http(s) url", "... ≤20"],   // 순서 보존 → rawPayload.images[content]
  "offerDraft": {
    "priceGeneral": "number ≥0",
    "consumerReferencePrice": "number | null",
    "consumerShortDescription": "string ≤500 | null",
    "consumerDetailDescription": "string ≤5000 | null",
    "isFeatured": "boolean"
  }
}
```

- **금지 키(400):** `supplierId`/`supplier_id` · `distributionType` · `serviceKeys` · `stockQty`/`stockQuantity` 및 O4O 범위 밖 키(lot/serial/expiry/재고 …). 소문자 비교.
- **응답:** Candidate 1건(`status=PENDING`) · Offer 0 · ProductMaster write 0. ⑦ 은 이 body 를 채우는 보조(ChatGPT/사진/PDF/URL)만 만들면 되고 서버 계약 변경은 필요 없다.
- `MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED` dead-code 판정: **legacy 전용 → 코드와 함께 제거**(enum 값 삭제 · 은퇴 주석만). masterId 는 `/products/from-master` 의 정식 입력.

### 남은 실제 공백 (⑦ 또는 별도 WO)

1. link(기존 Master 연결) 승격 시 Candidate 이미지는 기존 Master 에 붙지 않는다(의도된 보수 정책 · 필요 시 운영자 판단 UI).
2. `brandName` → `brandId` 자동 해석 없음(브랜드 생성은 운영자 축).
3. 약국 대상 serviceKey 목록이 공급자 UI 에 API 로 노출되지 않아 `AVAILABLE_SERVICES` 상수에 의존.
4. 공급자용 Master 단건 조회 API 부재 → from-master 화면은 nav state 의존(새로고침 시 Library 로 복귀).
5. 인증 UI 실브라우저 smoke(Offer/Candidate 실제 생성)는 운영 write 승인 후.
