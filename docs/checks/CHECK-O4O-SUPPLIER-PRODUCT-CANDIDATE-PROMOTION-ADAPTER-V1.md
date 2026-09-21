# CHECK-O4O-SUPPLIER-PRODUCT-CANDIDATE-PROMOTION-ADAPTER-V1

> **WO**: [`WO-O4O-SUPPLIER-PRODUCT-CANDIDATE-PROMOTION-ADAPTER-V1`](../work-orders/WO-O4O-SUPPLIER-PRODUCT-CANDIDATE-PROMOTION-ADAPTER-V1.md)
> **선행**: ① [`CHECK-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1`](CHECK-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1.md) · ② [`CHECK-O4O-SUPPLIER-SINGLE-PRODUCT-CANDIDATE-INTAKE-V1`](CHECK-O4O-SUPPLIER-SINGLE-PRODUCT-CANDIDATE-INTAKE-V1.md) §9
> **기준 코드**: `origin/main` `f256c9715` 위에 커밋 (WO 는 `9d2c334df` 시점 작성 · reset/rebase 없음 · 타 세션 커밋 보존)
> **코드 커밋**: `f299fb1de`
> **일자**: 2026-09-21
> **상태**: CLOSED_WITH_SMOKE_PENDING — 코드 · 테스트(89+33+15+18 · subset 254) · TX 롤백 실증 · 빌드 · 무접촉 · CI 완료 · 프로덕션 인증 smoke 는 PENDING(§7 · 중지 조건 F · 미인증 401 만 PASS)

---

## 1. 신설 파일 · `NormalizedSupplierCandidate` · Normalizer 인식 조건 · route/guard

### 1.1 파일

| 파일 | 역할 |
|---|---|
| `apps/api-server/src/modules/neture/promotion/adapters/supplier/supplier-regulatory-type.ts` | `canonicalizeRegulatoryType(raw)` — 비교 전용 순수 함수 · DB 수정 없음 · 미지/깨진 값 → `null` |
| `…/adapters/supplier/supplier-candidate.normalizer.ts` | `normalizeSingleSupplierCandidate` · `normalizeBulkSupplierCandidate` · `normalizeSupplierCandidate`(둘 다 null → `SUPPLIER_CANDIDATE_NOT_SUPPLIER_SOURCE`) · `NormalizedSupplierCandidate` · `SupplierNormalizationError` |
| `…/adapters/supplier/supplier-promotion.plan.ts` | `buildSupplierPromotionPlan(n, ctx)` — 공통 Plan Builder · `origin` 은 `sourceLabel`/`approvalMeta.origin` 문자열에만 사용(분기 0 · 소스 계약으로 `n.origin` 사용 2회 고정) |
| `…/adapters/supplier/supplier-promotion.policy.ts` | `assertSupplierPolicy(manager, n, outcome)` — 같은 TX 안 정책 후검사 · `SupplierPolicyError` · SQL 1개(`SELECT id, regulatory_type, drug_category FROM product_masters WHERE id = $1 LIMIT 1`) |
| `…/adapters/supplier/supplier-candidate-promotion.service.ts` | `SupplierCandidatePromotionService(dataSource, { core?, loadCandidate? }).promote(candidateId, ctx)` · `SupplierPromotionNotFoundError` |
| `apps/api-server/src/modules/neture/controllers/product-candidate.controller.ts` | route 1개 추가(+45줄) · `promote-master` 본문 불변(소스 계약 테스트가 handler 원문 일치 검사) |
| 테스트 | `promotion/__tests__/supplier-candidate.normalizer.test.ts` · `promotion/__tests__/supplier-promotion.plan-policy.test.ts` · `promotion/__tests__/supplier-candidate-promotion.service.test.ts` · `controllers/__tests__/product-candidate.promote-supplier.controller.test.ts` · `src/__tests__/supplier-promotion-adapter-contract.spec.ts` |
| ② mapper (§2.4) | `services/supplier-single-candidate.mapper.ts` · `utils/product-type.util.ts` · `services/__tests__/supplier-single-candidate.mapper.test.ts` · `controllers/__tests__/supplier-product-candidate.controller.test.ts`(기대 문자열 1줄) |

Core(`promotion/product-promotion*.ts` · `in-memory-promotion-store.ts` · `adapters/store-web-promotion.adapter.ts`) 수정 0.

### 1.2 `NormalizedSupplierCandidate` 최종 필드

```ts
{
  candidateId: string;
  supplierId: string;                          // 없으면 SUPPLIER_ID_MISSING
  origin: 'single' | 'bulk';
  regulatoryType: PromotionRegulatoryType;     // GENERAL|COSMETIC|HEALTH_FUNCTIONAL|QUASI_DRUG|MEDICAL_DEVICE|DRUG
  drugCategory: 'otc' | 'rx' | null;           // DRUG 만 값
  name: string | null;                         // 합성 없음 — 빈 값은 Core name_missing hold
  manufacturerName: string | null;
  specification: string | null;
  barcode: string | null;                      // GTIN-like 일 때만
  identifiers: { type; value; identityKey; isPrimary }[];
  evidence: { regulatoryName; mfdsPermitNumber; reportNo; supplierSku; brandName; originCountry; categoryId };
}
```

`evidence` 는 `approvalMeta.evidence` 로만 전달된다(소스 계약: `approvalMeta` 밖에서 evidence 키 사용 0). `mfdsPermitNumber` · `reportNo`(`품목신고번호`) · `supplierSku`(`공급자상품코드`) 는 **identifiers 에 절대 들어가지 않는다**(단위테스트 + 소스 계약 `MFDS_CODE`/`SUPPLIER_SKU` 문자열 0).

### 1.3 Normalizer 인식 조건 — 세 값 모두 일치해야 인식

| origin | `sourceType` | `sourceLabel` | `rawPayload.source` |
|---|---|---|---|
| single | `supplier_web` | `neture-supplier-single` | `supplier_single` |
| bulk | `csv_import` | `공급자 대량 등록` | `supplier_bulk_upload` |

하나라도 다르면 `null`. 특히 공공 seed(`csv_import` + 공공 라벨) · `csv_import`+`공급자 대량 등록`+`source` 없음 → `null` 을 테스트로 고정. 소스 계약 테스트가 이 literal 이 ②/bulk 컨트롤러·mapper 의 원문과 같은지 검사한다.

### 1.4 route / guard

`POST /api/v1/operator/product-candidates/:id/promote-supplier`
guard: 라우터 상단 `authenticate → requireRole(OPERATOR_ROLES) → injectServiceScope`(기존) + **`requireProductDbWrite`**(= `requireAdmin` = `platform:super_admin` 단독). body `{ note?: string }`(trim) · `reviewedBy = req.user.id`. 권한 상수 변경 0.

## 2. Supplier 정책표 최종본

### 2.1 create / link 정책 (`assertSupplierPolicy` — 같은 TX · throw → 롤백)

| outcome | 조건 | 결과 |
|---|---|---|
| `create` | `n.regulatoryType ∈ {GENERAL, COSMETIC}` | 통과 |
| `create` | `n.regulatoryType ∈ {DRUG, HEALTH_FUNCTIONAL, QUASI_DRUG, MEDICAL_DEVICE}` | throw `SUPPLIER_REGULATED_CREATE_BLOCKED` → 롤백 |
| `link` | `canonicalizeRegulatoryType(product_masters.regulatory_type) === n.regulatoryType` | 통과 (`건강기능식품`↔`HEALTH_FUNCTIONAL` · `일반`/`general`↔`GENERAL` · `의약외품`↔`QUASI_DRUG` 등) |
| `link` | 다르거나 정규화 불가(`null` · 깨진 값 · `식품` 등) | throw `SUPPLIER_REGULATORY_TYPE_MISMATCH` → 롤백 |
| `link` | `n.regulatoryType='DRUG'` 이고 기존 `drug_category='rx'` | throw `SUPPLIER_RX_LINK_BLOCKED` → 롤백 (`의약품`+rx 포함) |
| `conflict` · `hold` | Core write 0 → 후검사 없음 | 그대로 반환 |

후보 자체가 rx(`drugCategory='rx'`)이면 Core 가 `rx_not_promotable` hold 를 낸다(Adapter throw 아님 · write 0).

### 2.2 별칭 정규화표 (`canonicalizeRegulatoryType`)

trim + 소문자 비교. `일반|general → GENERAL` · `화장품|cosmetic → COSMETIC` · `건강기능식품|health_functional → HEALTH_FUNCTIONAL` · `의약외품|quasi_drug|quasi → QUASI_DRUG` · `의료기기|medical_device → MEDICAL_DEVICE` · `의약품|drug → DRUG` · 그 외(null · 빈 문자열 · 깨진 바이트) → `null`. `store-web-promotion.adapter.ts` 의 `classificationToRegulatory` 미접촉.

### 2.3 에러 코드 · 응답 상태코드 결정

| 상태 | 코드 | 의미 |
|---|---|---|
| 200 | `data.outcome = create \| link \| conflict \| hold` | Core outcome 그대로. `conflict`/`hold` 는 write 0 + Core 판단 → **2xx 유지**(WO §2.3 기본안). `promote-master` 의 `NOT_PROMOTABLE_*`→400 관례와 다르지만, 실행자가 판단한 근거: hold 사유(`name_missing` 등)는 후보 데이터 문제이지 요청 오류가 아니고, P2 소비처는 이 route 를 쓰지 않으므로 통일 압력이 없다 |
| 409 | `SUPPLIER_REGULATED_CREATE_BLOCKED` · `SUPPLIER_REGULATORY_TYPE_MISMATCH` · `SUPPLIER_RX_LINK_BLOCKED` | 정책 위반 → **롤백됨** · `data: { regulatoryType, existingMaster?: { id, regulatoryType, drugCategory } }` |
| 400 | `SUPPLIER_ID_MISSING` · `SUPPLIER_PRODUCT_TYPE_UNCLASSIFIED` · `SUPPLIER_CANDIDATE_NOT_SUPPLIER_SOURCE` | 정규화 실패(TX 진입 전) |
| 404 | `CANDIDATE_NOT_FOUND` | |
| 500 | `handleMutationError` | 그 외 |

## 3. bulk 식별자 fallback 표 최종본

candidate 컬럼(`identifierType`/`identifierValue`)을 **먼저** 넣고 `rawPayload.fields` 로 보강 · `(type,value)` 중복 제거 · primary 1개(바코드류 첫 항목 → 없으면 `KOREA_DRUG_CODE` 첫 항목).

| `fields` 키 | identifier type | identityKey | 비고 |
|---|---|---|---|
| `바코드` | GTIN-like 면 `EAN13`/`GTIN`(길이별) · 아니면 `UNKNOWN` | GTIN-like true / UNKNOWN false | compact 규칙 = ② mapper 와 동일(숫자+구분자만 구분자 제거) |
| `의약품표준코드` | `KOREA_DRUG_CODE` | true | |
| `보험코드` | `KOREA_INSURANCE_CODE` | false | |
| `바코드또는표준코드` | GTIN-like → 바코드류 / `regulatoryType='DRUG'` → `KOREA_DRUG_CODE` / 그 외 → `UNKNOWN` | 바코드·표준코드 true · UNKNOWN false | 형식 + 제품군 분기 |
| `품목신고번호` | — (identifiers 에 **없음**) | — | `evidence.reportNo` |
| `공급자상품코드` | — (identifiers 에 **없음**) | — | `evidence.supplierSku` |

evidence 로만 남긴 키: `품목신고번호` · `공급자상품코드` · `브랜드`(`evidence.brandName`) · 단건의 `mfdsPermitNumber` · `regulatoryName` · `categoryId` · `originCountry`. 이름/제조사/규격 fallback: `제품명` · `제조사` · `규격`→`포장단위`(+`candidateUnit` 결합).
bulk `productType` 매핑: `non_drug→GENERAL` · `quasi_drug→QUASI_DRUG(null)` · `otc_drug|otc→DRUG/otc` · `rx_drug|rx→DRUG/rx` · `unclassified|unknown|미지 → SUPPLIER_PRODUCT_TYPE_UNCLASSIFIED`. bulk 경로에는 HFF/COSMETIC/MEDICAL_DEVICE 어휘가 없다(현행 bulk 업로드 `productType` 선택지 4종 그대로 · 확장은 ⑦ 입력 단계).

## 4. ② mapper 수정 (§2.4)

| 항목 | 결과 |
|---|---|
| `SUPPLIER_CANDIDATE_DRUG_CATEGORIES` | `['otc','rx']` — `quasi_drug` 제거. `DRUG+quasi_drug` → 400 `DRUG_CATEGORY_REQUIRED`(메시지에 "의약외품은 `regulatoryType=QUASI_DRUG`" 추가) |
| HFF `product_type` | **(b) 선택** — `deriveSupplierCandidateProductType('HEALTH_FUNCTIONAL') = 'health_functional'`, `classifyProductType` 에 `case 'health_functional'` **additive** 추가. (a)(fallback 변경)를 피한 이유: 기존 입력 어휘(bulk `BULK_TYPE_MAP` · `product_masters.drug_category`)에 `health_functional` 문자열이 없어 기존 분류 결과가 바뀌지 않음이 소스로 확인되는 반면, fallback 변경은 소비처 3곳의 `unknown` 결과를 바꿀 수 있어 중지 조건 D 위험 |
| MEDICAL_DEVICE | `deriveSupplierCandidateProductType('MEDICAL_DEVICE') = null` → `rawPayload.product_type` 미기록 · `ProductTypeClass` 는 `unknown` 유지(`non_drug` 임의 변환 금지) |
| util 소비처 3곳 회귀 | `product-type.util.ts` 소비처(운영자 후보 콘솔 · bulk mapper · 제품군 표시)는 기존 case 불변 · 새 case 만 추가 → 영향 subset jest 11 suites 254 PASS(§5) · 기존 util 테스트 불변 |
| ② 테스트 | mapper 30건 → 33건(quasi_drug 400 · HFF product_type · MEDICAL_DEVICE null) · ② route 테스트 기대 문자열 1줄 갱신 |

## 5. 테스트 · 빌드 · 정적 결과

실행 명령과 결과(모두 `apps/api-server` · `pnpm exec jest <path>` 계열):

| 대상 | 결과 |
|---|---|
| `promotion/__tests__/supplier-candidate.normalizer.test.ts` + `supplier-promotion.plan-policy.test.ts` + `supplier-candidate-promotion.service.test.ts` | **89 passed** (canonicalize 표 · 인식 3조건 · 식별자 규칙 · evidence · Plan 동등성 · 정책 결정표 · TX 롤백 실증) |
| `services/__tests__/supplier-single-candidate.mapper.test.ts` | **33 passed** |
| `src/__tests__/supplier-promotion-adapter-contract.spec.ts` | **15 passed** |
| `controllers/__tests__/product-candidate.promote-supplier.controller.test.ts` | **18 passed** (401 · 403×2 · super_admin 통과/reviewedBy/note trim · 200×4 · 409×3 · 400×3 · 404 · 500 · promote-master 불변 2) |
| 영향 subset(promotion · product-candidate · supplier-product-candidate · mapper · util · 계약 spec) | **11 suites · 254 passed** · 실패 0 · skip 0 |
| `pnpm --filter @o4o/api-server build` | PASS — 1차 실패 `lecture-scope.middleware.ts: '"lecture"' not assignable to ServiceKey` 는 타 세션 커밋 `747f06c02` 의 `packages/security-core` **stale dist** 원인 → `pnpm --filter @o4o/security-core build` 후 재빌드 PASS(내 변경 무관 · 코드 수정 0) |
| eslint(내 파일) | 0 error / 0 warning (`_l` 미사용 경고 1건 수정 후) |
| lint ratchet | 로컬 150 > baseline 46 — 초과 104건 전부 `.claude/worktrees/cosmetics-ko-guide-full-production-v1/**`(타 세션 worktree 가 저장소 안에 있어 lint 대상에 포함). 메인 트리만 = 46 = baseline. **CI 가 실제 게이트**(§11) |

### 5.1 롤백 실증 (`supplier-candidate-promotion.service.test.ts` — WO §6.1 (i))

`TxRollbackHarness`: InMemory store 위에 transaction fake — **진입 시 snapshot(masters/identifiers/candidates/writes JSON) · throw 시 restore** · `begun/committed/rolledBack` 카운터 · `manager.query` 가 정책 SELECT 응답 · fake core `promoteWithin` 이 같은 manager 인지 assert 후 `promoteWithStore` 실행 · `afterCommit` 호출 수 기록.

| 시나리오 | TX | Master Δ | Identifier Δ | Candidate | writes | afterCommit |
|---|---|---|---|---|---|---|
| HFF / QUASI_DRUG / MEDICAL_DEVICE / DRUG(otc) create | rolledBack 1 | **0** | **0** | `pending` · `matchedProductMasterId null` | 0 | **0** |
| (보조 관측) 정책 throw 직전 | — | 1 (`approved_new_master` 로 바뀐 상태) | ≥1 | — | >0 | — |
| GENERAL create | committed 1 | +1 | +1 | `approved_new_master` · approval kind `supplier` + evidence(`mfdsPermitNumber`) | >0 | 1 |
| link → `건강기능식품` Master (HFF 후보) | committed 1 | 0 | 보강(+) | `matched` · `matchedProductMasterId='m-hff'` | >0 | 1 |
| link mismatch | rolledBack 1 | 0 | 0 (boost 되돌림) | `pending` | 0 | 0 |
| 후보 rx | committed(hold) | 0 | 0 | `pending` | **0** (writeCount 단언) | 미단언(코드상 1회 · Core hold no-op) |
| not found / 비공급자 source | TX 0 | — | — | — | — | 0 |

"정책 throw 이전에 Core write 가 실제로 있었고 → 롤백 후 0" 이 관측되므로 §1.2 #2 "롤백 → candidate pending 유지" 를 보고할 수 있다. 중지 조건 B(롤백 안 되는 경로) 미발견 — `afterCommit` 은 `transaction()` 반환 뒤에만 호출(소스 계약 테스트로 순서 고정).

## 6. 무접촉 증명

```
git diff --stat origin/main~1 f299fb1de -- \
  apps/api-server/src/modules/neture/promotion/product-promotion*.ts \
  apps/api-server/src/modules/neture/promotion/adapters/store-web-promotion.adapter.ts \
  apps/api-server/src/modules/neture/drug-import \
  apps/api-server/src/modules/neture/services/offer.service.ts \
  apps/api-server/src/modules/neture/services/catalog.service.ts \
  apps/api-server/src/modules/neture/services/store-product-request-admin.service.ts \
  apps/api-server/src/modules/neture/controllers/supplier-product.controller.ts \
  services/web-neture apps/admin-dashboard
→ 0 files
```

커밋 `f299fb1de` 변경 파일 15개 전부 §1.1 목록 안. `package.json`/lockfile/migration/permission 상수 변경 0. Offer 생성 0 · UI 0. 타 세션 dirty/untracked 파일 접촉 0.

## 7. 프로덕션 smoke

배포: `Deploy API Server (Cloud Run)` run `35549275201` (`f299fb1de`) **success** 후 실행. 프로덕션 데이터 생성 0 · `neture_suppliers.user_id` 수정 0 · 약관 동의 등 계정 상태 변경 0.

### 7.1 결과 — **PENDING(중지 조건 F)** · 미인증 401 만 PASS

| # | 호출 | 기대 | 결과 |
|---|---|---|---|
| 0 | 미인증 `POST …/bc3336d0-…/promote-supplier` | 401 | **401 `AUTH_REQUIRED`** PASS |
| (a) | super_admin · 공공 `csv_import` archived 후보 `bc3336d0-d968-4108-961d-a1fd897e1fae` | 400 `SUPPLIER_CANDIDATE_NOT_SUPPLIER_SOURCE` | **PENDING** — 인증 불가(아래) |
| (b) | super_admin · 임의 UUID | 404 `CANDIDATE_NOT_FOUND` | **PENDING** — 인증 불가 |
| (c) | `neture:operator`/`neture:admin` | 403 | **PENDING** — 해당 역할만 가진 테스트 계정 없음(아래) |

인증 불가 사유(실측 · 비밀번호 값은 기록하지 않음):

1. `platform:super_admin` 문서 계정 `renariver21@gmail.com` — 로그인 `401 INVALID_USER`. read-only 확인 결과 `users.password IS NULL`(2D Google-only 전환 · 2C reset 이후) → 비밀번호 로그인 경로 자체가 없다. `docs/local/TEST-ACCOUNTS.local.md` L15 의 L1 비밀번호 행은 **stale**(로컬 미추적 파일 · 이 WO 는 수정하지 않음 · 사용자에게 보고).
2. 사용자 본인 계정 `sohae2100@gmail.com`(`serviceKey=neture`) — 로그인 200. 그러나 토큰 roles 에 `platform:super_admin` 이 포함돼 있어 (c) 403 검증 계정으로 부적합하고, 어떤 요청이든 route 앞의 전역 gate 가 **`428 TERMS_ACCEPTANCE_REQUIRED`**(pending 4 서비스 약관)를 반환한다. 약관 동의는 사용자 본인의 법적 행위이자 프로덕션 write 이므로 대행하지 않았다 → 이 계정으로 (a)(b) 도 실행하지 않음.

재실행 조건: 사용자가 `sohae2100@gmail.com` 으로 약관 동의를 마치면 (a)(b) 는 같은 계정으로 즉시 실행 가능(예상 400/404 · write 0). (c) 는 `neture:operator`/`neture:admin` **만** 가진 계정이 있어야 한다(현재 users 2건뿐).

### 7.2 read-only count 전후 (cloud-sql-proxy · `o4o_api_v2` · SELECT 만)

| 대상 | 전 | 후 |
|---|---|---|
| `product_masters` | 272,040 | 272,040 |
| `product_identifiers` | 638,428 | 638,428 |
| `product_identifiers WHERE source_type='supplier_candidate'` | 0 | 0 |
| 후보 `bc3336d0-…` `candidate_status` | `archived` | `archived` |
| 공급자 후보(single `supplier_web` / bulk `supplier_bulk_upload`) | 0 / 0 | 0 / 0 |
| `users` | 2 | 2 |

### 7.3 프로덕션 baseline(참고 · 중지 조건 E 판정 자료)

`product_masters.regulatory_type` 분포: `DRUG` 177,413 · `건강기능식품` 40,948 · `COSMETIC` 32,675 · `QUASI_DRUG` 17,148 · `MEDICAL_DEVICE` 3,826 · `일반` 15 · `GENERAL` 14 · 깨진 값(utf8 hex `efbfbdcfb9efbfbd`) **1**. 정규화표로 canonical 화되지 않는 값은 깨진 1건뿐 → `canonicalizeRegulatoryType` → `null` → link 시 `SUPPLIER_REGULATORY_TYPE_MISMATCH`(안전 쪽). 공공 `csv_import` 후보 305,522(approved_new_master 176,632 / archived 128,109 / matched 781 · pending 0) · approval kind `supplier` 0.

## 8. 중지 조건 A~G

| # | 발동 | 근거 |
|---|---|---|
| A | 아니오 | 정책 후검사는 `PromotionOutcome` 만 받아 Core 밖에서 표현됨. Core 타입/결정 변경 0 |
| B | 아니오 | §5.1 — 롤백 경로 전부 실증 · `afterCommit` 은 TX 밖 |
| C | 아니오 | DDL 0 |
| D | 아니오 | (b) 선택으로 fallback 미변경 · 기존 분류 결과 불변 |
| E | 아니오 | 프로덕션 `regulatory_type` 분포(read-only, §7): 정규화표 밖 값은 깨진 바이트 1건뿐(→ `null` = mismatch · 안전 쪽). `건강기능식품` 40,948 · `일반` 15 는 표로 정규화됨 |
| F | **예 (PENDING)** | super_admin 문서 계정은 `users.password NULL`(Google-only) → 비밀번호 로그인 불가 · 본인 계정은 428 약관 gate(대행 금지) · 공급자 후보 0건. 데이터 생성 write 없이 §7 기록 |
| G | 아니오 | 무관한 build 실패 1건은 stale dist 재빌드로 해소(코드 수정 0) · lint ratchet 초과는 타 세션 worktree 포함 때문 · dirty 파일 접촉 0 |

## 9. 후속 인계

| 항목 | 판정 |
|---|---|
| ④ Existing Master 직접 연결 API | **재사용 가능.** ④ 는 `masterId` 를 받아 link 만 하므로 `canonicalizeRegulatoryType` + `assertSupplierPolicy` 의 link 분기(`SUPPLIER_REGULATORY_TYPE_MISMATCH`/`SUPPLIER_RX_LINK_BLOCKED`)를 그대로 호출하면 된다. 필요한 것: Core 에 "지정 masterId 로 link" 하는 Plan 힌트가 없으므로 ④ 는 Core 를 거치지 않고 (i) Candidate → `matched` + Identifier 생성을 Adapter 가 직접 하거나 (ii) Core 에 `dedupHints.forceMasterId` 같은 additive 힌트를 추가해야 한다. (ii) 는 Core 변경이므로 ④ WO 에서 명시 승인 대상. 정책 함수는 어느 쪽이든 재사용 |
| ⑤ `offerDraft` · supplier SKU → SupplierProductOffer | 필요한 것: (1) 승격 결과 `masterId` + Candidate `rawPayload.offerDraft` + `evidence.supplierSku` 를 입력으로 Offer 를 만드는 별도 서비스(`offer.service.ts` 접촉 여부는 ⑤ 에서 판단) (2) `(supplierId, masterId)` Offer 유일성 계약 확인([`CHECK-O4O-SUPPLIER-PRODUCT-OFFER-UNIQUE-CONSTRAINT-CONTRACT-AUDIT-V1`](CHECK-O4O-SUPPLIER-PRODUCT-OFFER-UNIQUE-CONSTRAINT-CONTRACT-AUDIT-V1.md)) (3) supplier SKU 는 Offer 속성이지 ProductIdentifier 가 아님(이 WO 계약 유지). 이 WO 는 Offer 를 만들지 않으므로 승격된 Candidate 는 ⑤ 전까지 Offer 없는 상태 |
| Promotion Core canonical metadata 확장(category/brand/origin) | **현 시점 확장 불필요 · 판정 자료만.** §2.2-A 대로 `categoryId`/`brandName`/`originCountry` 는 `rawPayload` + `approvalMeta.evidence` 에 보존되고 Master 에는 안 들어간다. 프로덕션 `product_masters` 에 brand/origin 컬럼이 없고(공공 seed 27만 건도 없음) Store 노출은 Offer/listing 쪽이므로, 확장 필요는 ⑤ 에서 Offer 가 이 값을 소비하는지로 판정하는 것이 맞다. 승격 시점 저장이 필수라는 근거는 이번에 발견되지 않음 |
| MEDICAL_DEVICE `ProductTypeClass` 확장 | **⑥ 전 판정 필요(소규모).** 현재 `unknown` 유지. 운영자 콘솔 표시/필터가 `unknown` 을 "미분류" 로 보여 MEDICAL_DEVICE 와 구분이 안 되므로 UI 단계에서 `medical_device` 값 additive 추가가 필요할 가능성 높음. 공유 util 이므로 Shared Module Protocol 절차 |
| 규제 제품 신규 Master 를 위한 정부 데이터 Adapter 자리 | `promotion/adapters/<gov-source>/`(예: `mfds-permit/`) — 이 WO 의 supplier adapter 와 같은 층. 입력은 공급자 `mfdsPermitNumber`/`reportNo`(evidence) → 정부 데이터 조회 → Core Plan(`approvalMeta.kind='government'`). Adapter 가 하는 일은 검증된 Plan 생성뿐이고 정책(regulated create 허용)은 그 Adapter 에만 둔다 |
| UI(`promote-supplier` 버튼) WO 제안 | ⑥ 에서 `apps/admin-dashboard` 운영자 후보 콘솔에 `promote-supplier` 액션 + 409 사유 표시. 지금은 API 만 존재(super_admin) |
| 기준 문서 갱신 WO 제안 | [`O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1`](../baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md)(F12) 에 Promotion Core 위치(`neture/promotion/`) · Adapter 층 · Supplier create 정책(GENERAL/COSMETIC 만)이 없음. Frozen 본문 수정은 인라인 금지(§16-4) → 별도 doc WO 1건 제안 |

## 10. 문서 정합

`발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 2건`

- 발견: ② CHECK §9 의 인계 "`mfdsPermitNumber` → `identifiers[]` `MFDS_CODE`" 는 이 WO 의 계약(`MFDS_CODE` 금지 · evidence 만)과 충돌. **기록물 불변 · 이 WO 가 대체** — ② CHECK 는 수정하지 않고 여기 기록한다.
- 별도 WO 제안 ①: `product_masters.regulatory_type` 한글 별칭(`건강기능식품` 40,948 · `일반` 15) → 영문 canonical backfill(대량 UPDATE · 사용자 승인). 이 WO 는 비교 시 정규화로 우회했을 뿐 데이터는 손대지 않음.
- 별도 WO 제안 ②: F12 baseline 에 Promotion Core/Adapter/Supplier 정책 반영(§9 마지막 행).

## 11. Git

| 항목 | 값 |
|---|---|
| 코드 커밋 | `f299fb1de` (15 files · +1732 −8) |
| CI (`f299fb1de`) | CI Pipeline `35549275211` **success**(Code Quality Check · API Server Jest · Build Applications) · Deploy API Server `35549275201` **success** · CodeQL `35549275214` **success** |
| CHECK 커밋 | 이 문서 커밋(코드 CI 완주 후 · path-specific) |
| `HEAD == origin/main` | push 직후 확인 · 이번 WO 범위 미커밋 0건 |
