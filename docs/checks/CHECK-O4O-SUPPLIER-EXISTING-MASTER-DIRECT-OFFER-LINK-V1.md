# CHECK-O4O-SUPPLIER-EXISTING-MASTER-DIRECT-OFFER-LINK-V1

> **WO**: [`WO-O4O-SUPPLIER-EXISTING-MASTER-DIRECT-OFFER-LINK-V1`](../work-orders/WO-O4O-SUPPLIER-EXISTING-MASTER-DIRECT-OFFER-LINK-V1.md)
> **선행**: ③ [`CHECK-O4O-SUPPLIER-PRODUCT-CANDIDATE-PROMOTION-ADAPTER-V1`](CHECK-O4O-SUPPLIER-PRODUCT-CANDIDATE-PROMOTION-ADAPTER-V1.md) · 비파괴 연결 원칙 [`CHECK-O4O-SUPPLIER-EXISTING-PRODUCTMASTER-NON-DESTRUCTIVE-LINK-V1`](CHECK-O4O-SUPPLIER-EXISTING-PRODUCTMASTER-NON-DESTRUCTIVE-LINK-V1.md)
> **기준 코드**: 작업 시작 `origin/main` `dbfe8e4c1`(WO 커밋 `a3eab4049` 의 자식) · 커밋 직전 타 세션 `237ffd3df`(docs) 가 앞서 들어와 그 위에 얹음 · reset/rebase 없음
> **코드 커밋**: `b4b0f70f8`
> **일자**: 2026-09-21
> **상태**: **CLOSED_WITH_SMOKE_PENDING** — 코드·테스트·배포 완료 · 미인증 401 smoke PASS · 인증 smoke(ACTIVE 공급자 계정)만 PENDING

---

## 1. 신규 route · body 계약 · Master 검증표 · 상태코드

### 1.1 route

| 항목 | 값 |
|---|---|
| route | `POST /api/v1/neture/supplier/products/from-master` |
| guard | `requireAuth` → `createRequireActiveSupplier(dataSource)` (기존 `POST /products` 와 동일 체인 · `requireLinkedSupplier` 아님) |
| `supplierId` | middleware 가 `neture_suppliers.user_id` 로 확정한 `req.supplierId` 만. body 의 `supplierId` 는 서비스가 `SUPPLIER_ID_NOT_ALLOWED` 400 |
| 컨트롤러 | `supplier-product.controller.ts` — `POST /products` 와 `GET /products` 사이 +25줄. 기존 `POST /products` 핸들러 본문 0 변경 |
| 위임 | `NetureService.createSupplierOfferFromExistingMaster(supplierId, rawBody)` → `NetureOfferService.createSupplierOfferFromExistingMaster` |

### 1.2 body 허용 / 금지 키 최종본

| 구분 | 키 |
|---|---|
| 필수 | `masterId` (UUID) |
| 허용(Offer 필드만) | `priceGeneral` `priceGold` `pricePlatinum` `consumerReferencePrice` `consumerShortDescription` `consumerDetailDescription` `stockQuantity` `isFeatured` `isPublic` `distributionType` `serviceKeys` |
| 금지 → `MASTER_FIELD_NOT_ALLOWED` 400 | `barcode` `name` `manufacturerName` `regulatoryType` `regulatoryName` `mfdsPermitNumber` `categoryId` `brandName` `brandId` `specification` `originCountry` `tags` `manualData` |
| 금지 → `SUPPLIER_ID_NOT_ALLOWED` 400 | `supplierId` |
| 그 외 → `UNSUPPORTED_FIELD` 400 | 허용 목록 밖 모든 키 |

`stockQuantity` 는 기존 경로에서도 `manualData.stockQty` → `Offer.stockQuantity` 로만 흐르고 `product_masters` 컬럼으로 가지 않음을 확인해 허용(중지 조건 C 미발동).

### 1.3 Master 서버 재검증 순서 (body 키 검증 → PUBLIC 설명 검증 → 공급자 ACTIVE 재확인 → Master)

| 순서 | 조건 | 코드 | HTTP |
|---|---|---|---|
| 1 | `masterId` 가 UUID 형식이 아님(비문자열 포함) | `INVALID_MASTER_ID` | 400 |
| 2 | `product_masters` 에 없음 (`findOne` · select `id,status,regulatoryType,categoryId,isMfdsVerified,mfdsPermitNumber,barcode`) | `MASTER_NOT_FOUND` | 404 |
| 3 | `status !== 'ACTIVE'` (`SUSPENDED` / `ARCHIVED`) | `MASTER_NOT_ACTIVE` | 409 |
| 4 | `canonicalizeRegulatoryType(master.regulatoryType) === null` (null · '' · 미지 값) | `MASTER_REGULATORY_TYPE_UNSUPPORTED` | 409 |
| 5 | 규제 카테고리(`ProductCategory.isRegulated`) + `isMfdsVerified=false` + `mfdsPermitNumber` 없음 — **Master 값만** 사용 | `PERMIT_REQUIRED_FOR_UNVERIFIED_REGULATED` | 400 |
| 6 | 이하 primitive(§2) — 약국 전용 키 · DRUG gate · Offer 유일성 | 기존 코드 그대로 | 400 / 409 |

한글 별칭(`건강기능식품` · `의약품` · `일반` …)은 ③ 의 `canonicalizeRegulatoryType` 으로 해석해 통과한다. `assertSupplierPolicy` 는 사용하지 않았다(WO §2.4 결정).

### 1.4 상태코드 매핑(컨트롤러)

`SUPPLIER_NOT_ACTIVE` 403 · `MASTER_NOT_FOUND` 404 · `MASTER_NOT_ACTIVE` 409 · `MASTER_REGULATORY_TYPE_UNSUPPORTED` 409 · `OFFER_ALREADY_EXISTS` 409 · `OFFER_IN_RECYCLE_BIN` 409 · 그 외(`INVALID_MASTER_ID` · 금지 키 3종 · `PUBLIC_REQUIRES_DESCRIPTION` · DRUG 3종 · permit) 400 · 성공 201 · 예외 500 `INTERNAL_ERROR`.

`offer-error-code.ts` 는 enum additive 7종(`INVALID_MASTER_ID` `MASTER_NOT_FOUND` `MASTER_NOT_ACTIVE` `MASTER_REGULATORY_TYPE_UNSUPPORTED` `MASTER_FIELD_NOT_ALLOWED` `SUPPLIER_ID_NOT_ALLOWED` `UNSUPPORTED_FIELD`). WO 는 4종을 예상했으나 body 계약 코드 3종을 매직 스트링 대신 enum 으로 두었다. `MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED` 불변.

---

## 2. persistence primitive 추출

### 2.1 이름 · 시그니처

```ts
private async persistOfferForResolvedMaster(
  supplierId: string,
  input: {
    masterId: string;
    masterBarcode: string;            // slug 용 — 기존 계약 master.barcode ?? master.id
    isRegulated: boolean;             // 카테고리 기반 규제 축(기존 is_regulated)
    regulatoryType?: string | null;   // 알면 전달 → DRUG gate 가 master 재조회 안 함. 없으면 gate 가 masterId 로 조회(기존 동작)
    stockQuantity: number;
    isPublic?; distributionType?; serviceKeys?;
    priceGeneral?; priceGold?; pricePlatinum?; consumerReferencePrice?;
    consumerShortDescription?; consumerDetailDescription?; isFeatured?;
  },
)
```

### 2.2 옮긴 구간

`offer.service.ts`(기준 `dbfe8e4c1`) `createSupplierOffer()` **1008행 `const { masterId, masterBarcode, manualData, isRegulated } = metadata.data;` 직후 ~ 1130행 응답 return 까지**를 그대로 이동했다. 내용: slug 생성 → `filterServiceKeysAgainstUnknownServices` → `ServiceAudienceService.getPharmacyAudienceResolver()` + `assertPharmacyOnlyServiceKeys` → `assertDrugOfferAllowed(AppDataSource, { action:'OFFER_CREATE', masterId, regulatoryType, serviceKeys, isPublic })` → `offerRepo.create` → `findDuplicateOffer(supplierId, masterId)` → `offerRepo.save` + `asOfferDuplicateViolation`(23505 · `uq_supplier_product_offers_master_supplier` → `OFFER_ALREADY_EXISTS` · 다른 constraint 는 `throw err`) → `OfferServiceApprovalService.createPendingApprovals` → 응답 shape. 순서 · 오류 코드 · 로그 문자열(`Duplicate offer race` 등) 불변. 유일한 추가는 `regulatoryType` 전달 인자(legacy 경로는 `undefined` 를 넘겨 guard 가 종전처럼 masterId 로 재조회).

`createSupplierOffer()` 는 `validateCreateInput` → `resolveProductMetadata` → `persistOfferForResolvedMaster(supplierId, {...})` 로 끝난다.

### 2.3 기존 테스트 기대값 수정 0 증명

| 스위트 | 결과 |
|---|---|
| `src/__tests__/supplier-offer-duplicate-contract.test.ts` (findDuplicateOffer 선검사 < save 순서 · 컨트롤러 매핑 · 23505 race 로그 원문 검사) | PASS · 수정 0 |
| `src/modules/neture/services/__tests__/supplier-offer-master-write-paths.test.ts` | PASS · 수정 0 |
| `src/__tests__/supplier-offer-update-private-gate.test.ts` | PASS · 수정 0 |
| `src/__tests__/supplier-promotion-adapter-contract.spec.ts` · `controllers/__tests__/product-candidate.promote-supplier.controller.test.ts` · `src/__tests__/supplier-product-candidate-intake-contract.spec.ts`(③·②) | PASS · 수정 0 |

추출 직후(신규 함수 작성 전) 기존 4 스위트 39 tests PASS 를 먼저 확인했고, 최종 subset 9 스위트 184 tests PASS(§7).

---

## 3. 기존 `createSupplierOffer()` 에 남아 있는 Master resolution 책임 (⑤ 인계 ①·②)

| # | 위치 | 책임 | ⑤ 처리 후보 |
|---|---|---|---|
| R1 | `validateCreateInput(data, supplierId)` | `masterId` 주입 차단(`MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED`) · 공급자 ACTIVE · barcode 정규화/필수 · PUBLIC 설명 필수 | 주입 차단은 유지(삭제·완화는 제외 범위) · barcode 검증은 Candidate 경로로 이동 대상 |
| R2 | `resolveProductMetadata(manualData, barcode, name, categoryId, brandName)` → `catalogService.resolveOrCreateMaster(...)` | barcode/name 으로 **Master 탐색 또는 신규 INSERT** | ⑤ 제거 대상 본체 |
| R3 | 같은 함수 안 `resolveMasterWriteFields` / `catalogService.updateProductMaster` | 신규 Master 에 공급자 입력(brand · manufacturer · spec · regulatory · permit …) **UPDATE** | ⑤ 제거 대상(Master write 는 Promotion Core 로만) |
| R4 | 같은 함수 안 `assertRegulatedPermit(..., mfdsPermitNumber: 공급자 입력, mode:'registration')` | 허가번호를 **공급자 입력**에서 받아 판정 | ⑤ 에서 Master 값 판정으로 전환(④ 는 이미 Master 값만 사용) |
| R5 | `resolveProductMetadata` 의 category/brand 해석(`INVALID_CATEGORY` · brand 생성) | Master 기준정보 결정 | Candidate/Promotion 으로 이동 |

primitive 이후(Offer 저장 · gate · approval)에는 Master 관련 책임이 남아 있지 않다. 중지 조건 B(한 TX 에 Master UPDATE 와 Offer save 혼재)는 발동하지 않았다 — `updateProductMaster` 는 `resolveProductMetadata` 안에서 Offer save 이전에 끝나고 트랜잭션을 공유하지 않는다.

---

## 4. ⑤ 에서 primitive 를 그대로 재사용할 수 있는가 (⑤ 인계 ③)

**그대로 사용 가능.** primitive 가 요구하는 입력은 `masterId` · `masterBarcode` · `isRegulated` · (선택) `regulatoryType` · Offer 필드뿐이며 전부 **확정된 Master row + Offer 입력**에서 나온다. `resolveOrCreateMaster()` 를 제거하면 `createSupplierOffer()` 에서 빠지는 것은 R2~R5 이고 primitive 입력은 변하지 않는다.

부족한 입력: 없음. 다만 호출자가 `isRegulated` 를 직접 계산해야 한다(④ 는 `ProductCategory.findOne(master.categoryId).isRegulated ?? false`). ⑤ 에서 두 호출자가 같은 계산을 하게 되면 "Master row → `{ masterBarcode, isRegulated, regulatoryType }`" 를 만드는 작은 내부 helper 로 묶는 것이 자연스럽다(이번 WO 범위 밖이라 두지 않았다). permit 판정(`assertRegulatedPermit`)은 primitive 밖(호출자)에 있으므로 ⑤ 에서 Master 값 기준으로 통일하면 된다.

---

## 5. ③ 승격 결과 → Offer 경로가 같은 primitive 를 쓸 수 있는가 (⑤ 인계 ④)

③ 결과: `matchedProductMasterId`(Core 가 확정한 Master id) + `rawPayload.supplierId`(normalizer 가 필수로 요구) + `rawPayload.offerDraft` (`SupplierSingleCandidateOfferDraft` = `priceGeneral` · `consumerReferencePrice` · `consumerShortDescription` · `consumerDetailDescription` · `isFeatured`).

| primitive 입력 | ③ 결과에서 | 비고 |
|---|---|---|
| `masterId` | `matchedProductMasterId` | 그대로 |
| `masterBarcode` · `isRegulated` · `regulatoryType` | Master row 재조회(§4 helper) | ④ 와 같은 방식 |
| `priceGeneral` · `consumerReferencePrice` · 설명 2종 · `isFeatured` | `offerDraft` | 그대로 |
| `stockQuantity` | 없음 → 0 | ④ 와 같은 기본값 |
| `isPublic` · `distributionType` · `serviceKeys` · `priceGold` · `pricePlatinum` | `offerDraft` 에 없음 | ② intake 가 유통 축을 받지 않으므로 **PRIVATE draft(`isPublic=false` · `serviceKeys=[]`)** 로 생성될 수밖에 없다 → §6 정책 충돌과 직결 |

결론: **같은 primitive 를 쓸 수 있다.** 단 DRUG Candidate 는 `serviceKeys=[]` 로는 `DRUG_SERVICE_CONTEXT_REQUIRED` 로 거부되므로(§6), Candidate→Offer 경로는 (a) 승격 시점에 serviceKeys 를 함께 받거나 (b) DRUG 에 한해 Offer 자동 생성을 보류하고 공급자가 ④ route(`/from-master`)로 직접 연결하게 하는 두 선택지 중 하나를 ⑤ 설계에서 정해야 한다. primitive 자체는 어느 쪽에도 변경이 필요 없다.

---

## 6. DRUG "PRIVATE draft + serviceKeys 없음" 정책 (⑤ 인계 ⑤)

- `assertDrugOfferAllowed` 는 완화하지 않았다(guard 파일 무접촉 · §8). 실측(jest · 실제 guard 코드 사용):
  - DRUG + `isPublic=true` → `DRUG_PUBLIC_DISTRIBUTION_FORBIDDEN`
  - DRUG + `isPublic=false` + `serviceKeys=[]` → **`DRUG_SERVICE_CONTEXT_REQUIRED`(거부)**
  - DRUG + 비약국 키 포함 → `DRUG_NON_PHARMACY_SERVICE`
  - DRUG + pharmacy-target 키만 → 허용
  - 한글 `의약품` Master 도 canonical `DRUG` 로 동일 판정
- 프로덕션 read-only 실측(2026-09-21): live Offer 21건 중 DRUG 6건은 전부 `is_public=false` · `service_keys` 비어 있지 않음. `GENERAL` 1건만 `service_keys=[]`. 즉 현재 데이터에도 "DRUG PRIVATE draft(키 없음)" 는 0건이다.
- **판정: ⑥(UI) 전에 별도 판단이 필요하다.** ⑥ 의 Product Library "선택 → 등록" 흐름에서 DRUG Master 를 고른 공급자가 serviceKeys 를 고르지 않으면 409/400 으로 막힌다. UI 가 DRUG 일 때 pharmacy-target 서비스 선택을 강제하거나(정책 유지), draft 를 허용하도록 gate 를 바꾸거나(정책 변경 · 보안 gate) 둘 중 하나를 ⑥ 착수 전 결정해야 한다. 이번 WO 는 정책 유지 쪽으로 구현했다.

---

## 7. 테스트 · 빌드 · 정적 · 무접촉 · 중지 조건

### 7.1 신규 테스트

| 파일 | 건수 | 검증 |
|---|---|---|
| `src/modules/neture/services/__tests__/supplier-offer-from-existing-master.test.ts` | 44 | body 키 계약 13 · Master 재검증 13(UUID 4 · 없음 · SUSPENDED/ARCHIVED · regulatoryType null/''/WEIRD · 한글 별칭 통과 · 공급자 비활성 · PUBLIC 설명) · 정상 생성 3(`offer.masterId === 선택 masterId` · `resolveOrCreateMaster`/`updateProductMaster` 호출 0 · `product_masters`/`product_identifiers`/`product_candidates` raw query 0 · INSERT/UPDATE/DELETE 0 · slug 계약 · approval) · 유일성 4(live/휴지통/23505 fallback/다른 constraint 전파) · DRUG 5 · permit 4 · 기존 경로 2(`masterId` → `MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED` · legacy 는 `resolveOrCreateMaster` 경유 + guard 가 masterId 로 재조회) |
| `src/modules/neture/controllers/__tests__/supplier-product.from-master.controller.test.ts` | 21 | 미인증 401 · 비공급자 403 · PENDING 공급자 403 · body `supplierId='attacker'` 가 middleware 값에 밀려남 · 201 · 코드→status 15종 · 500 · 기존 `POST /products` 는 body `masterId` 를 서비스에 넘기지 않음 · 기존 매핑 불변 |
| `src/__tests__/supplier-existing-master-direct-offer-link-contract.spec.ts` | 31 | 신규 함수 본문에 `resolveOrCreateMaster`/`updateProductMaster`/`resolveProductMetadata`/`ProductCandidate`/`ProductIdentifier`/`UPDATE product_masters`/`assertSupplierPolicy` 0 · ProductMaster 는 `findOne` 만 · 검증 순서 · 금지 키 목록 · primitive 1회 정의·2 경로 호출 · 유일성/DRUG gate/approval 은 primitive 안에만 · legacy 는 `regulatoryType` 미전달 · `validateCreateInput` 의 주입 차단 유지 · 컨트롤러 guard/매핑/`body.supplierId` 0 · guard 파일 코드 3종 그대로 · DDL 0 · `services/web-neture` 에 `products/from-master` 호출 0 |

### 7.2 실행 결과

| 명령 | 결과 |
|---|---|
| `npx jest` 신규 3 + 기존 6 (duplicate-contract · master-write-paths · update-private-gate · promotion-adapter-contract · promote-supplier route · candidate-intake-contract) | **9 suites · 184 tests PASS** · 기대값 수정 0 |
| `npx tsc --noEmit -p tsconfig.json` (api-server) | PASS |
| `npx eslint` 변경 7 파일 | PASS (신규 spec 의 `no-regex-spaces` 5건은 `--fix` 로 정리 후 재실행 PASS) |
| `pnpm run build` (api-server · `tsc -p tsconfig.build.json`) | PASS |
| CI `b4b0f70f8` | `Deploy API Server (Cloud Run)` **success** (run 35564888444 · 리비전 `o4o-core-api-03723-m7s` 05:39 UTC) · `CodeQL` success · `CI Pipeline` 은 후속 push `007068b61` 의 concurrency 로 **cancelled** — 단 그 안의 `Code Quality Check` success · `API Server Jest` success 까지 완료, `Build Applications (admin-dashboard)` 만 취소(api-server 변경과 무관) |

### 7.3 무접촉

`git diff --stat origin/main -- catalog.service.ts guards/drug-access.guard.ts promotion/ store-product-request-admin.service.ts drug-import services/web-neture apps/admin-dashboard apps/api-server/src/database/migrations` → **0 files**. 변경 파일은 `offer.service.ts` · `offer-error-code.ts` · `neture.service.ts` · `supplier-product.controller.ts` + 테스트 3 뿐. DDL/migration/unique/index 0.

### 7.4 중지 조건

| # | 발동 | 근거 |
|---|---|---|
| A | 아니오 | 기존 스위트 전부 기대값 수정 0 으로 PASS |
| B | 아니오 | Master UPDATE 는 `resolveProductMetadata` 안에서 끝나고 Offer save 와 TX 를 공유하지 않음 |
| C | 아니오 | `stockQuantity` 는 Offer 컬럼으로만 흐름 |
| D | 아니오 | DDL 0 |
| E | 아니오 | DRUG gate 는 Master `regulatory_type` 만, permit 은 Master `is_mfds_verified`/`mfds_permit_number` 만으로 판정 가능 |
| F | **예(부분)** | 인증 smoke 계정 부재 → §8 PENDING |
| G | 아니오 | 무관 실패 없음 · 타 세션 dirty 접촉 없음(작업 중 타 세션 커밋 `237ffd3df` 는 fetch 로 흡수) |

---

## 8. 프로덕션 smoke (비파괴)

| # | 케이스 | 결과 |
|---|---|---|
| S1 | `POST /api/v1/neture/supplier/products/from-master` 미인증 (body `{masterId:<uuid>}`) | **401** `AUTH_REQUIRED` — 서비스 미도달 · 리비전 `o4o-core-api-03723-m7s`(= `b4b0f70f8` 배포분) |
| S2 | 같은 route `GET` 미인증 | 401 `AUTH_REQUIRED` (guard 가 method 무관하게 선행) |
| S3 | 기존 `POST /api/v1/neture/supplier/products` 미인증 | 401 `AUTH_REQUIRED` — 기존 경로 불변 |
| S4 | read-only 사후 계수 `supplier_product_offers` | **22 / live 21 · max(created_at) 2026-09-04** — smoke 전(05:33 UTC)과 동일 → 프로덕션 write 0 |
| S5 | 인증 케이스 (INVALID_MASTER_ID 400 · MASTER_NOT_FOUND 404 · MASTER_FIELD_NOT_ALLOWED 400 · 정상 201) | **PENDING** — ACTIVE 공급자 test 계정 부재(§7.4 F). 정상 201 은 프로덕션 Offer 생성 write 이므로 계정이 있어도 **별도 승인 전 실행 금지**. 오류 케이스(400/404)는 write 0 이라 계정 확보 시 즉시 가능 |

`MASTER_NOT_ACTIVE` 409 는 실 데이터에 비ACTIVE Master 가 0건이라 프로덕션 smoke 로는 재현 불가 — 단위 테스트(SUSPENDED/ARCHIVED 2 케이스)로만 검증.

read-only 관찰(2026-09-21 · Master write 0 · 수정 제안 없음): `product_masters` 는 전부 `ACTIVE`(SUSPENDED/ARCHIVED 0건 → 실 데이터로 `MASTER_NOT_ACTIVE` 409 smoke 불가) · `regulatory_type` 은 `DRUG` 177,413 · `건강기능식품` 40,948 · `COSMETIC` 32,675 · `QUASI_DRUG` 17,148 · `MEDICAL_DEVICE` 3,826 · `일반` 15 · `GENERAL` 14 · 깨진 인코딩 값 1건(이 1건은 `canonicalizeRegulatoryType` 이 null 을 돌려 `MASTER_REGULATORY_TYPE_UNSUPPORTED` 409 로 차단됨 — 의도된 동작).

---

## 9. 문서 정합

`문서 정합: 발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건`

- 발견 1건: ③ CHECK §9 후속 인계 표의 "④ Existing Master 직접 연결 API — `assertSupplierPolicy` link 분기 재사용" 판정은 이 WO(§2.4)에서 **미재사용**으로 확정됐다. ③ CHECK 는 기록물이므로 본문 불변 · 이 CHECK 가 대체 판정이다.

---

## 10. Git

| 항목 | 값 |
|---|---|
| 코드 커밋 | `b4b0f70f8` — offer.service(primitive + 신규 함수) · error code · neture.service · controller · 테스트 3 (WO §6.2 ①+② 는 같은 파일 `offer.service.ts` 안이라 1 커밋) |
| CHECK 커밋 | 이 문서를 담은 커밋 (`b4b0f70f8` 이후 · path-specific) |
| 상태 | `HEAD == origin/main` · WO 범위 미커밋 0 |

## 11. 다음

⑤ 를 바로 구현하지 않는다. §2~§5 의 primitive 와 `createSupplierOffer()` 잔여 책임(R1~R5)을 검토해 ⑤ 의 제거 범위를 확정하는 것이 다음 순서다. §6 의 DRUG draft 정책은 ⑥ 전 별도 판단.
