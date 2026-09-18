# CHECK-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1

> **WO**: [`WO-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1`](../work-orders/WO-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1.md)
> **IR**: [`IR-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-BOUNDARY-V1`](../investigations/IR-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-BOUNDARY-V1.md)
> **일자**: 2026-09-18
> **상태**: CLOSED_WITH_SMOKE_PENDING — 코드·테스트·정적 검증 완료 · 프로덕션 브라우저 smoke 는 PENDING(§7)

---

## 1. Core 파일 · public 계약

위치: `apps/api-server/src/modules/neture/promotion/` (`drug-import/` 아래 아님)

| 파일 | 역할 |
|---|---|
| `product-promotion.types.ts` | `ProductPromotionPlan` · `PromotionOutcome` · port(`PromotionReadStore` / `PromotionWriteStore` / `PromotionStore`) · `identifierKey()` |
| `product-promotion.decide.ts` | 순수 결정 계층(DB 없음): `validatePlan` · `validateCandidateState` · `decideFromDedup` · `buildExistingMasterDiff` |
| `product-promotion.store.ts` | `DbPromotionStore(EntityManager)` — port 의 DB 구현(raw SQL · parameter binding) |
| `product-promotion-core.service.ts` | `ProductPromotionCore { promoteWithin(m, plan) · promote(plan) · afterCommit(plan, outcome) }` + `promoteWithStore(store, plan)` |
| `adapters/store-web-promotion.adapter.ts` | store_web Adapter: `classificationToRegulatory`(P2 에서 이동) · `buildStoreWebPromotionPlan` · `assertStoreWebCreate` · `holdToStoreRequestCode` · `StoreRequestDuplicate` · `StoreRequestPromotionError` |
| `__tests__/in-memory-promotion-store.ts` | InMemory port 구현(테스트 전용 · write/read 카운터) |
| `__tests__/product-promotion-core.test.ts` | Core 단위테스트 32건 |
| `__tests__/store-web-promotion.adapter.test.ts` | Adapter 단위테스트 25건 |

**계약 최종 이름** (WO §2.1 개념과 동일 · 아래 두 곳만 추가):

- `PromotionOutcome.link` 에 `matchType: 'barcode' | 'identifier' | 'name_manufacturer'` 추가 — Adapter 가 `DUPLICATE_MASTER_EXISTS.duplicates[].matchType` 을 채우기 위해 필요.
- `PromotionHoldReason` 에 `candidate_not_found` 추가 — Core 가 candidate 를 직접 조회하므로(port `loadCandidateState`) 부재를 표현할 값이 필요. Adapter 는 `STORE_REQUEST_NOT_FOUND` 로 역매핑.
- `ProductPromotionPlan.landingSource?: string` 추가 — 커밋 후 Landing 발급 시 source 라벨(`'store-request-new-master'` 현행 값 유지).
- port 이름: WO 의 `findIdentifiersOfMaster` → `findIdentifierKeysOfMaster`(Set<`type|normalized`>) · `loadCandidate` → `loadCandidateState`.

## 2. Core 가 하지 않는 것 — WO §2.1 과 일치

Offer 생성 · 매장 listing · 알림 · 권한 검사 · 제품군 적격성 판단 · `regulatoryType` 분기(effects 는 Adapter 선언) · `identityKey=false` 식별자의 타 Master 중복 검사 · 유사도 매칭 · `raw_payload` 해석 · **`identityKey` 추론** — 전부 Core 밖.

증명(테스트 `Core 소스 불변식 — 제품군 분기 없음`): `product-promotion-core.service.ts` · `product-promotion.store.ts` 에 `regulatoryType ===` 0회. `product-promotion.decide.ts` 에는 `regulatoryType === 'DRUG'` 가 **구조 검증 2줄**(drugCategory 필수 · rx 불가 — WO #1 이 명시한 검증)만 존재하며 `ensureDrugExtension` / `ProductDrugExtension` 참조 0. afterCommit 은 `plan.effects.ensureDrugExtension` 플래그만 본다 — `regulatoryType=DRUG`+`false` → extension 0회 / `GENERAL`+`true` → 1회 테스트로 고정.

`identityKey`: Core 는 `id.identityKey` 값만 읽는다(`promoteWithStore` #3). store_web Adapter 가 `idType !== 'UNKNOWN'` 으로 **자기 데이터셋 기준**으로 정한다(Adapter 주석 명시).

## 3. P2 치환 결과 (`store-product-request-admin.service.ts`)

| 구분 | 내용 |
|---|---|
| Core 로 간 코드 | classification→regulatory 매핑(Adapter 로 이동) · 바코드 정규화/GTIN 판정 · TX 내 barcode 재확인 · `product_masters` INSERT · `product_identifiers` INSERT · candidate 상태 전이 UPDATE · 이름/제조사 합성(`'(이름 미상)'`/`'미상'`) **삭제** |
| P2 에 남은 코드 | `loadStoreRequest`(소스 잠금 · `allowedServiceKeys`) · `STATUS_NOT_REVIEWABLE`/`ALREADY_LINKED`/`CANDIDATE_ORG_MISSING`/`CANDIDATE_SERVICE_KEY_MISSING` 선검사 · `dataSource.transaction` 외피 · `upsertOrganizationListing` · `raw_payload.approval.listingId/identifierCreated` 보강(`jsonb_set`) · 응답 조립 · 커밋 후 `core.afterCommit` |
| 무접촉 | `findDuplicates` · `linkToExistingMaster` · `requestRevision` · `reject` · `upsertOrganizationListing` |

**`promoteWithin` 만 사용 증명**: `approveAsNewMaster()` 안 `this.dataSource.transaction(async (m) => { const outcome = await core.promoteWithin(m, plan); assertStoreWebCreate(outcome); … })`. 저장소 전체에서 `.promote(` 호출 = 0 (`grep -rn "\.promote(" apps/api-server/src` — 주석 1줄만). `promote()` 외피의 호출자는 현재 없음(향후 Supplier 용).

TX 경계: link/conflict/hold 는 `assertStoreWebCreate` 가 throw → 호출자 TX 롤백 → Core 가 쓴 candidate UPDATE 도 함께 롤백 → candidate 불변. Core 자체도 conflict/hold 에서는 write 0(테스트 `writeCount === 0` 12건).

컨트롤러(`store-product-request-admin.controller.ts`): `handleError` map 에 `CANDIDATE_FIELD_MISSING: 400` · `PROMOTION_PLAN_INVALID: 422` 2줄 추가. route · 응답 shape(`StoreRequestActionResult & { identifierCreated }` · `data.duplicates`) 불변. `StoreRequestDuplicate` 는 서비스 모듈에서 re-export 해 컨트롤러 import 경로 불변.

## 4. 행동 변경 목록

| # | 변경 | 전 | 후 |
|---|---|---|---|
| 1 | 이름·제조사 합성 폐지 | 비면 `'(이름 미상)'`/`'미상'` 으로 Master 생성 | `CANDIDATE_FIELD_MISSING`(400) · write 0 |
| 2 | 분류 `'drug'`(분류 미상 의약품) | `drug_category = NULL` | `drug_category = 'drug_unspecified'`(DB 기존 어휘 · Core 가 DRUG 에 drugCategory 요구) |
| 3 | dedup 축 ② 신설 | 바코드는 `product_masters.barcode` 만 조회 | `product_identifiers (type, normalized)` 도 조회(GTIN/EAN13 등 `identityKey=true`) → 기존에 "바코드가 identifier 로만 붙은 Master" 도 중복으로 잡힘. `UNKNOWN` 은 `identityKey=false` 라 축 ② 불참 |
| 4 | 이름+제조사 비교 | `LOWER(name)` | `LOWER(TRIM(name))` — 앞뒤 공백 차이도 중복으로 판정 |
| 5 | DRUG 신규 Master | `ProductDrugExtension` 미생성(IR §3-2 결함) | 커밋 후 `ensureForProductMaster` 호출(Adapter 가 DRUG 일 때 `ensureDrugExtension=true` 선언) · 실패 시 warn 로그 |
| 6 | 방어 코드 | — | `PROMOTION_PLAN_INVALID`(422) — Adapter 가 정상이라면 도달하지 않음 |
| 7 | `approval` 페이로드 | `{kind, masterId, listingId, identifierCreated, note}` | `{kind, note, outcome:'create', masterId, identifiersCreated, listingId, identifierCreated}` (기존 키 전부 유지 + 2키 추가) |

admin-dashboard: 응답 shape 불변이라 코드 변경 0. 단 `CANDIDATE_FIELD_MISSING` 은 `ERROR_LABELS` 에 없어 **에러 코드 원문이 그대로 표시**된다(모달 fallback). 라벨 1줄 추가는 UI 범위(WO §4 "UI 변경 0")라 하지 않았다 — 후속 ②/⑥ UI 작업 시 함께 처리 권장.

## 5. 테스트 · 정적 검증

| 항목 | 명령 | 결과 |
|---|---|---|
| Core + Adapter | `npx jest src/modules/neture/promotion` | **57/57 PASS** (2 suites) |
| P1 drug-import + promotion | `npx jest src/modules/neture/drug-import src/modules/neture/promotion` | **16 suites · 255/255 PASS** (drug-import 14 suites 회귀 0) |
| api-server 전체 | `npx jest` (apps/api-server) | §5-1 참조 |
| build | `pnpm --filter @o4o/api-server build` | PASS (초회 `!v.ok` narrowing 오류 1건 → `v.ok === false` 로 수정 후 PASS · strictNullChecks off 함정) |
| lint | `npx eslint <변경 파일 · promotion/>` | PASS (테스트 파일 `require`/빈 interface 3건 → 수정) |
| admin-dashboard | `npx tsc --noEmit -p tsconfig.json` | PASS |

### 5-1 api-server 전체 jest

결과: **FAIL 13 suites — 전부 이 WO 와 무관**(중지 조건 G → 보고만). 실패 suite: `store-owner-*` 4 · `store-policy-ownership-axis` · `store-tablet-*`/`kpa-my-store-tablet-*`/`cross-service-my-store-tablet-*` 3 · `store-hub-product-apply-gate` · `store-local-products-service-scoped-org` · `kpa-me-context-store-owner-contract` · `main-site-full-source-deletion` · `MembershipApprovalService.{rejection,bareRoleContract}`.
표본 원인 2종: `StoreOwnerBusinessInfoRequiredError: 매장 경영자 승인에 필요한 사업자정보가 누락되었습니다`(매장 경영자 승인 게이트 — 이용계약 선행조건 작업 영역) · `TypeError: Cannot read properties of undefined (reading 'map')`(store-policy ownership). 어느 suite 도 `promotion/**` · P2 서비스 · 컨트롤러를 import 하지 않으며, 이 WO 변경 전 `origin/main` 에서도 동일 코드 경로. 이 WO 접촉 모듈(`promotion/**` · P2 · P1 인접 drug-import)은 위 행 16 suites 255/255 PASS 로 별도 확인.

## 6. P1 · P3 · drug-import 무접촉

```
git diff --stat origin/main -- apps/api-server/src/modules/neture/drug-import            → 0 files
git diff --stat origin/main -- apps/api-server/src/modules/neture/services/catalog.service.ts \
                               apps/api-server/src/modules/neture/services/offer.service.ts → 0 files
```

변경 파일 전체: `promotion/**`(신규 8) · `services/store-product-request-admin.service.ts` · `routes/o4o-store/controllers/store-product-request-admin.controller.ts` · WO 문서(identityKey 비추론 1줄) · 본 CHECK.

DDL · migration · package.json · lockfile 변경: 0.

## 7. 프로덕션 smoke — PENDING

사유: 이 세션에서 admin-dashboard 검토 화면으로 **store_web 후보 1건을 신규 승인**하려면 (1) 테스트 tenant 의 매장 계정으로 신규 상품 요청을 먼저 제출하고 (2) 운영자 계정으로 승인해야 한다. 프로덕션 DB 에 write 가 발생하는 절차(Master·Identifier·listing 생성)이므로 사용자 승인 없이 실행하지 않았다. 배포 후 다음 순서로 수행 권장:

1. 테스트 매장 계정 → 신규 상품 요청 1건(바코드 있음 · 없음 각 1건이면 축 ②·행동 변경 3 까지 확인 가능)
2. 운영자 → 검토 모달 → "신규 승인" → 201 · `identifierCreated` 확인
3. read-only SELECT: `product_masters`(is_mfds_verified=false · barcode) · `product_identifiers`(source_type='store_web_request') · `organization_product_listings` · `product_candidates.candidate_status='approved_new_master'` · `raw_payload->'approval'`
4. 이름 비운 요청 1건 → `CANDIDATE_FIELD_MISSING`(400) · candidate 상태 `pending` 유지 확인

## 8. 중지 조건 A~G

| # | 발동 | 비고 |
|---|---|---|
| A DTO 제품군 충돌 | 아니오 | store_web 경로는 NOT NULL 4 + DRUG drugCategory 로 충분 |
| B identifier 중복 정책 변경 | 아니오 | 전역 UNIQUE 없음 그대로 · `identityKey` 로 흡수 |
| C schema/migration | 아니오 | DDL 0 |
| D P1/P3/drug-import 수정 | 아니오 | §6 |
| E dashboard 응답 변경 필요 | 아니오 | shape 불변 · 라벨 미표시만 §4 기록 |
| F 이름+제조사 오탐 실데이터 | 미확인 | 현행 P2 도 같은 축을 쓰고 있었음(TRIM 만 추가) · hint 로 끌 수 있음 |
| G 무관한 build/test 실패 | 예(보고만) | §5-1 — 13 suites · 이 WO 미접촉 영역 · 수정하지 않음 |

## 9. 후속 ② Supplier 단건 Candidate Intake 가 이 Core 를 쓰기 위한 요건

- **Plan 필드**: `master.regulatoryType`(영문 코드 · 공급자 입력 '일반'/'의약품' 은 Adapter 가 정규화) · `drugCategory`(DRUG 면 필수 · Rx 는 hold) · `name`/`manufacturerName`(빈 값 hold — 공급자 폼에서 필수 처리) · `barcode`(GTIN-like 만) · `identifiers[]`(GTIN → `identityKey=true` · 공급자 자체 코드/MFDS 코드 → `false` — Adapter 가 결정) · `dedupHints.nameManufacturerExact`(공급자는 보통 true) · `effects.ensureDrugExtension`(DRUG 일 때 true) · `approvalMeta`(`{kind:'supplier_single', supplierId, offerDraftId?}` 등) · `landingSource`(`'supplier-candidate'` 등 새 라벨).
- **호출 방식**: 공급자 경로가 Master 외 다른 row(Offer 초안 등)를 같은 TX 로 묶어야 하면 P2 처럼 `promoteWithin`; Master 만 만들면 `promote()` 외피 사용 가능(이 경우 `link` 를 자동 확정할지는 그 WO 가 정한다 — Core 는 `link` 시 candidate 를 `matched` 로 바꾼다).
- **공급자 후보의 identifier 채움**: 현행 bulk candidate 는 `identifier_value` 가 비어 dead-end(IR) — 단건 intake 는 폼에서 바코드를 받아 `identifierValue` 에 채워야 축 ①·② 가 동작한다. 없으면 이름+제조사 축 ③ 만으로 판정된다.
- **`supplierId` 를 `raw_payload` 로 둘 때**: Core 는 `raw_payload` 를 해석하지 않으므로 무해하지만, `updateCandidate` 는 `raw_payload || {approval}` 병합만 하므로 Adapter 가 넣은 다른 키는 유지된다. 단 공급자별 조회(내 후보 목록)는 jsonb 경로 조회가 되어 인덱스 없이 느려질 수 있다 — `product_candidates.supplier_id` 컬럼 추가는 중지 조건 C(migration) 이므로 ② WO 에서 명시 결정.
- **`candidate_status` 어휘**: Core 는 `pending`/`reviewing` 만 승격 가능으로 본다. 공급자 intake 가 다른 초기 상태를 쓰면 Core 상수 확장이 아니라 Adapter 가 `reviewing` 으로 전이시킨 뒤 호출하는 편이 Core 를 소스 중립으로 유지한다.

## 10. 문서 정합

발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건

- 발견: `product_masters.regulatory_type` 한글 별칭(`'일반'`·`'의약품'`) 잔존 데이터 — P2 `linkToExistingMaster` 의 `=== '의약품'` 비교가 그 증거. Core 는 영문 코드만 받으므로 데이터 정리 전까지 기존 한글 별칭 Master 는 dedup 축 ① ~ ③ 에 걸릴 수는 있어도(축은 regulatory_type 을 보지 않음) 새로 생성되지는 않는다. → **별도 WO 제안**: 한글 별칭 → 영문 코드 backfill(UPDATE · 사용자 승인 필요).
- `O4O-PRODUCT-CORE-BASELINE-V1` 에 Promotion Core 위치 추가는 WO 지시대로 하지 않았다(후속 ②·③ 후 별도 WO).

## 11. Git

완료 보고에 커밋 hash · `HEAD == origin/main` 기록.
