# CHECK-O4O-SUPPLIER-SINGLE-PRODUCT-CANDIDATE-INTAKE-V1

> **WO**: [`WO-O4O-SUPPLIER-SINGLE-PRODUCT-CANDIDATE-INTAKE-V1`](../work-orders/WO-O4O-SUPPLIER-SINGLE-PRODUCT-CANDIDATE-INTAKE-V1.md)
> **선행**: [`CHECK-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1`](CHECK-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1.md) §9
> **기준 코드**: `origin/main` `706f82108` 에서 착수 (WO 접수 `b16f4896b` · Promotion Core `cc287d3ee` 포함)
> **일자**: 2026-09-19
> **상태**: CLOSED_WITH_SMOKE_PENDING — 코드 · 테스트 · 정적 검증 완료 · 프로덕션 201 smoke 는 PENDING(§7 · 중지 조건 F)

---

## 1. 신설 파일 · route · guard · mapper

| 파일 | 역할 |
|---|---|
| `apps/api-server/src/modules/neture/services/supplier-single-candidate.mapper.ts` | 순수 mapper — `validateSupplierSingleCandidateBody(body)` · `buildSupplierSingleCandidateInput(value, ctx)` · `deriveSupplierCandidateProductType()` · 상수(`O4O_OUT_OF_SCOPE_KEYS` · `SUPPLIER_CANDIDATE_POLICY_FORBIDDEN_KEYS` · `SUPPLIER_SINGLE_CANDIDATE_FORBIDDEN_KEYS` · `SUPPLIER_CANDIDATE_REGULATORY_TYPES` · `SUPPLIER_CANDIDATE_DRUG_CATEGORIES`) |
| `apps/api-server/src/modules/neture/controllers/supplier-product-candidate.controller.ts` | `createSupplierProductCandidateController(dataSource, deps?)` — `POST /product-candidates` 1개 |
| `apps/api-server/src/modules/neture/neture.routes.ts` | `router.use('/supplier', createSupplierProductCandidateController(dataSource))` 1줄 + import 1줄 + 주석 1줄 (3 insertions) |
| `apps/api-server/src/modules/neture/services/__tests__/supplier-single-candidate.mapper.test.ts` | mapper 단위테스트 30건 |
| `apps/api-server/src/modules/neture/controllers/__tests__/supplier-product-candidate.controller.test.ts` | 라우트 테스트(supertest) 17건 |
| `apps/api-server/src/__tests__/supplier-product-candidate-intake-contract.spec.ts` | 소스 계약 테스트 19건 |

**Route 최종 경로**: `POST /api/v1/neture/supplier/product-candidates`
**Guard 체인**: `requireAuth` → `requireActiveSupplier`(`createRequireActiveSupplier(dataSource)` · `neture_suppliers.user_id` 조회 · `status='ACTIVE'` 만 통과 · `req.supplierId` 확정). 다른 guard 없음. `requireProductDbWrite`/`requireAdmin` 미사용(소스 계약 테스트로 고정).
`deps` 는 테스트 주입용(`candidateService` · `requireActiveSupplier`) — 운영 마운트는 `dataSource` 만 넘긴다.

## 2. 요청 계약 최종본 — WO §2.1 과의 차이

WO §2.1 그대로. 실행 중 확정한 세부 2건:

1. **바코드 compact 규칙** — `sanitizeIdentifierValue()` 는 하이픈을 제거하지 않는다(type 별 normalize 책임). 그대로 두면 `'880-1234-567890'` 이 `UNKNOWN` 이 된다. mapper 는 **숫자와 구분자(공백·하이픈)만인 입력은 구분자를 제거**해 GTIN 판정하고, 영숫자 코드는 제어문자만 제거하고 **원형 보존**(`'ABC-001'` → `identifierType='UNKNOWN'` · `identifierValue='ABC-001'` · `normalizedIdentifierValue` 는 `createCandidate()` 가 `'ABC001'` 로 생성).
2. **`regulatoryType` 대소문자** — 영문 코드는 대소문자 무관(`'cosmetic'` → `COSMETIC`). 한글 별칭은 400.

**금지 키**(대소문자 무관 · body 최상위와 `offerDraft` 양쪽):
- O4O 범위 외(bulk `BULK_FORBIDDEN_KEYS` 와 동일 23개): `lot lot_no lot_number serial serial_number expiry expiry_date expiration expiration_date stock inventory inbound_date warehouse warehouse_location traceability traceability_status 유효기간 일련번호 재고 입고일 로트 재고수량 창고`
- 계약 제외: `supplierId supplier_id distributionType distribution_type serviceKeys service_keys stockQty stock_qty stockQuantity stock_quantity`

**에러 코드 집합**(flat `{ success:false, error:'CODE', message }` · bulk 와 같은 shape):
`CANDIDATE_NAME_REQUIRED` · `INVALID_REGULATORY_TYPE` · `DRUG_CATEGORY_REQUIRED` · `INVALID_PRICE` · `INVALID_URL` · `INVALID_CATEGORY_ID` · `FORBIDDEN_FIELD` · `FIELD_TOO_LONG` (400) · `INTERNAL_ERROR` (500). 401/403 은 middleware 기존 응답(nested `error.code`) 그대로.

길이 상한: name 200 · barcode 64 · categoryId 64 · brandName/manufacturerName/regulatoryName 200 · specification 500 · mfdsPermitNumber/originCountry 100 · imageUrl 2048 · consumerShortDescription 500 · consumerDetailDescription 5000.

## 3. Candidate 매핑 최종본

WO §2.1 표와 동일. `supplierId` 출처 증명:

- 컨트롤러 [`supplier-product-candidate.controller.ts:46`](../../apps/api-server/src/modules/neture/controllers/supplier-product-candidate.controller.ts) — `const supplierId = (req as SupplierRequest).supplierId;` 가 유일한 출처. `req.body.supplierId` 참조 0(소스 계약 테스트 `supplierId 는 SupplierRequest(middleware) 에서만 읽는다`).
- mapper `buildSupplierSingleCandidateInput(value, ctx)` 는 `ctx.supplierId` 만 안다. `validateSupplierSingleCandidateBody` 는 body 의 `supplierId` 를 **금지 키**로 400.

`rawPayload` 실제 키:
```text
source='supplier_single' · supplierId · regulatoryType · drugCategory ·
product_type(non_drug|quasi_drug|otc_drug|rx_drug) · drug_category · rx(boolean) ·
categoryId · brandName · regulatoryName · mfdsPermitNumber · originCountry ·
offerDraft{priceGeneral, consumerReferencePrice, consumerShortDescription, consumerDetailDescription, isFeatured} ·
submittedAt(ISO)
```
`drug_category` 는 bulk 와 같은 어휘 — `QUASI_DRUG` 는 `drugCategory=null` 이지만 `drug_category='quasi_drug'`(운영자 콘솔 `classifyProductType` 호환). `DRUG` 는 `drugCategory` 와 같은 값.

## 4. 결정 1~11 준수

| # | 결정 | 준수 |
|---|---|---|
| 1 | `supplier_id` 컬럼 미추가 · `rawPayload.supplierId` 소유축 | ✅ DDL 0 |
| 2 | `submittedBy` 감사 정보 | ✅ `req.user.id` · 소유권 판정 코드 없음 |
| 3 | `organizationId=null` · `sourceId=null` | ✅ 상수 고정 · 테스트 |
| 4 | `distributionType` · `serviceKeys` 금지 키 | ✅ 400 `FORBIDDEN_FIELD` |
| 5 | 제조사 · 바코드 선택 · 합성 금지 | ✅ 빈 값 → `null` · 테스트 |
| 6 | 재고 · lot · 유효기간 · 일련번호 금지 키 | ✅ bulk 집합 동일성 테스트 |
| 7 | 초기 `pending` · 전이 없음 | ✅ `createCandidate()` 기본값 그대로 · 상태 변경 코드 없음 |
| 8 | 비-GTIN 바코드 `UNKNOWN` + 값 보존 | ✅ §2 #1 |
| 9 | `regulatoryType` 영문 코드만 | ✅ 한글 별칭 400 |
| 10 | intake dedup 없음 | ✅ 조회 코드 없음 |
| 11 | GET 조회 없음 | ✅ route 1개 |

어긴 결정 없음.

## 5. 테스트 · 정적 검증

| 항목 | 명령 | 결과 |
|---|---|---|
| mapper 단위 | `npx jest src/modules/neture/services/__tests__/supplier-single-candidate.mapper.test.ts` | **30/30 PASS** |
| 라우트 | `npx jest src/modules/neture/controllers/__tests__/supplier-product-candidate.controller.test.ts` | **17/17 PASS** (401 · 403 NO_SUPPLIER · 403 SUPPLIER_NOT_ACTIVE · 400 ×10 · 201 ×2 · 500) |
| 소스 계약 | `npx jest src/__tests__/supplier-product-candidate-intake-contract.spec.ts` | **19/19 PASS** (금지 참조 14종 × 컨트롤러+mapper · type-only entity import · guard 체인 · supplierId 출처 · bulk 금지 키 동일 집합 · 마운트) |
| 3 suite 합산 | — | **66/66 PASS** |
| 전체 jest | `npx jest` (api-server) | §5-1 |
| build | `pnpm --filter @o4o/api-server build` | **PASS** (아래 5-2 참고) |
| lint(내 파일) | `npx eslint <신설 6파일>` | **0 problems** |
| lint ratchet(CI 게이트) | `node scripts/lint-ratchet.mjs` | **PASS** — `46 errors (baseline 46)` · 이 WO 기여 0 |

### 5-1 api-server 전체 jest

첫 실행(`npx jest` 기본 워커)은 **JS heap OOM(RC 134)** 으로 중단 — 로컬 환경 한계. CI 와 같은 `--maxWorkers=1` + `NODE_OPTIONS=--max-old-space-size=6144` 로 재실행(965s):

```text
Test Suites: 1 failed, 4 skipped, 323 passed, 324 of 328 total
Tests:       2 failed, 32 skipped, 5341 passed, 5375 total
```

- 실패 1 suite = `src/__tests__/main-site-full-source-deletion.spec.ts` — 은퇴 앱 `apps/main-site` 완전 삭제 계약. 로컬에 git 미추적 빌드 잔재(`apps/main-site/dist` · `node_modules`)가 남아 있어 실패. **이 WO 무관 · 코드 수정 없음 · 잔재 삭제도 하지 않음**(타 세션/ignored 파일 불가침). CI(clean checkout)에서는 통과 대상.
- 영향 범위 subset(route 를 읽는 계약 spec 8 + neture middleware/promotion/services 테스트 + 신설 3) 별도 실행: **30 suites · 536 tests PASS**.
- CI `API Server Jest` job: 커밋 `02f71d6d9` run `35402294776` — §11.

### 5-2 build 착수 시 stale dist

첫 build 가 `src/middleware/lecture-scope.middleware.ts(9,3): Type '"lecture"' is not assignable to type 'ServiceKey'` 로 실패 — 이 WO 와 무관. 원인은 로컬 `packages/security-core/dist`(09-12) 가 src(09-19 · Lecture Foundation `747f06c02` 가 `'lecture'` 추가)보다 오래된 **stale dist**. `pnpm --filter @o4o/security-core build` 후 api-server build PASS. 코드 수정 없음.

## 6. 무접촉 증명

```text
git diff --stat origin/main -- apps/api-server/src/modules/neture/promotion \
  apps/api-server/src/modules/neture/drug-import \
  apps/api-server/src/modules/neture/services/offer.service.ts \
  apps/api-server/src/modules/neture/services/catalog.service.ts \
  apps/api-server/src/modules/neture/services/product-candidate.service.ts \
  apps/api-server/src/modules/neture/controllers/supplier-product.controller.ts \
  services/web-neture apps/admin-dashboard
→ 0 files
```

- `BULK_FORBIDDEN_KEYS` 공유화는 **하지 않았다**(복제 + 동일성 테스트). bulk 컨트롤러 변경 0.
- 이 WO 의 변경 = 신설 5파일 + `neture.routes.ts` 3줄.

## 7. 프로덕션 smoke — PENDING (중지 조건 F)

**배포 전 read-only 실측(Cloud SQL Auth Proxy · 2026-09-19)**:

| 항목 | 값 |
|---|---|
| `neture_suppliers` | ACTIVE 2 · PENDING 1 — **3건 모두 `user_id IS NULL`** |
| `users` | 2 (운영자 `sohae2100` · Google-only 테스트 `renagang21`) |
| `product_masters` / `product_identifiers` / `supplier_product_offers` | 272,040 / 638,428 / 22 |
| `product_candidates` | 394,495 · `source_type='supplier_web'` **0** · `source_label='neture-supplier-single'` **0** |

**PENDING 사유**: `requireActiveSupplier` 는 `neture_suppliers.user_id = 로그인 user.id` 로 공급자를 찾는다. 현재 운영 DB 의 공급자 3건 전부 `user_id NULL`(사용자 테이블 reset 이후 재연결 안 됨) 이라 **어떤 계정으로 로그인해도 403 `NO_SUPPLIER`** 가 나온다. 201 경로 smoke 는 공급자 1건에 테스트 계정을 연결하는 **DB write(UPDATE neture_suppliers SET user_id)** 가 선행돼야 하며 사용자 승인 없이 실행하지 않았다. `docs/local/TEST-ACCOUNTS.local.md` §3(2026-08-09) 의 "`renagang21` = Neture 공급자" 기재는 reset 전 상태라 현재와 다르다.

**배포 후 실측(revision = Deploy run `35402294873` success · 2026-09-19)**:

| 단계 | 결과 |
|---|---|
| (a) 쿠키 없이 `POST /api/v1/neture/supplier/product-candidates` | **401** ✅ (`AUTH_REQUIRED`) |
| (b) `sohae2100` L1(serviceKey 없음) 로그인 | **401** — `TEST-ACCOUNTS.local.md` §1 의 L1 값(2026-08-09)이 users reset 이후 유효하지 않음. L2(서비스 웹) 비밀번호는 SSOT 에 unknown → 이 세션에서 로그인 채널 없음 |
| (b′) 로그인 쿠키 → 403 `NO_SUPPLIER` | **PENDING** (b 에 종속) |
| 201 · SELECT · count 전후 · 운영자 화면 | **PENDING** (공급자 `user_id` 연결 write 선행) |

라우트 등록 자체는 CI/route 테스트(마운트 계약 · supertest 201)와 배포 빌드 성공으로 확인. 미인증 상태에서는 존재/부재 경로 모두 401 이라 운영 curl 로는 구분되지 않는다.

**권장 후속**: 사용자 승인 하에 `neture_suppliers` ACTIVE 1건의 `user_id` 를 `renagang21` users.id 로 연결(UPDATE 1 row) → 201 smoke 2건 → 운영자 `POST /:id/archive` 로 정리.

## 8. 중지 조건 A~G

| # | 발동 | 비고 |
|---|---|---|
| A `CreateCandidateInput` 계약 변경 필요 | 아니오 | 기존 필드로 충분 |
| B schema/migration | 아니오 | DDL 0 |
| C 복수 공급자 연결 | 아니오 | middleware `LIMIT 1` 그대로 |
| D 운영자 화면 미표시 | 미확인 | 후보 0건이라 실측 불가. `ProductCandidateReviewPage.tsx` 가 `supplier_web` 을 이미 "공급자" 로 표시함은 코드로 확인 |
| E bulk 동작 변경 | 아니오 | bulk 컨트롤러 무접촉 |
| F smoke 계정 없음 | **예** | §7 — `user_id NULL` 3/3 |
| G 무관한 build/test 실패 | 예(보고만) | §5-2 stale dist(코드 무관) · §5-1 |

## 9. 후속 ③ Supplier Promotion Adapter 인계

- **단건 `rawPayload` 에서 Adapter 가 읽을 키**: `supplierId`(소유축 · `approvalMeta.kind='supplier_single'`) · `regulatoryType`(영문 · 그대로 `master.regulatoryType`) · `drugCategory`(DRUG 면 `master.drugCategory` · `rx` → Core hold) · `regulatoryName` · `mfdsPermitNumber`(→ `identifiers[]` `MFDS_CODE` · `identityKey=false`) · `offerDraft`(⑤ 에서 Offer 생성 입력 · Master 승격 데이터 아님) · `categoryId`(Product Core 상승 금지 · Offer/listing 쪽).
- **`identifierType='UNKNOWN'` 후보**: Adapter 는 `identityKey=false` 로 Plan 에 넣거나(dedup 축 편입 안 함 · 멱등 부가 식별자) 아예 제외하는 두 선택지 중 **`identityKey=false` 부가 식별자** 를 권장 — 공급자 자체 코드가 사라지지 않고 Master 에 남아 ④ 연결 시 힌트가 된다. `master.barcode` 는 GTIN-like 일 때만(`EAN13`/`GTIN`).
- **bulk `csv_import` 수렴 시 rawPayload 차이**: bulk 는 `source='supplier_bulk_upload'` · `productType`(BULK_TYPE_MAP 키) · `regulatoryType`/`drugCategory` 가 typeInfo 에서 옴 · `fields`/`raw`(한글 컬럼명) · `rowNumber` · identifier 컬럼 **비어 있음**. 단건은 `source='supplier_single'` · 정규 키 · identifier 채워짐. Adapter 는 `raw_payload.source` 로 분기하지 말고 **정규화 단계**(`fields['바코드'…]` → identifier · `productType` → regulatoryType)를 bulk 전용으로 한 번 거친 뒤 같은 Plan builder 로 합류시키는 것이 좋다. bulk identifier 채움(WO ① §4 미결)은 그 정규화 단계에서 해결.
- **`candidate_status`**: 단건은 `pending`. Core 가 그대로 받는다. 전이 불필요.

## 10. 문서 정합

발견 1건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건

- 발견: `docs/local/TEST-ACCOUNTS.local.md` §3 "`renagang21` = Neture 공급자" — 운영 `neture_suppliers.user_id` 전부 NULL 이라 현재와 불일치(로컬 전용 · git 미추적 · §16-1 대상 아님 → 보고만).

## 11. Git

| 항목 | 값 |
|---|---|
| WO 접수 | `b16f4896b` |
| 코드 커밋 | `02f71d6d9` — 신설 5파일 + `neture.routes.ts` 3줄 · pathspec commit · `check-staged-scope` 6/6 |
| CI Pipeline | run `35402294776` **success** (Code Quality Check · API Server Jest · Build admin-dashboard) |
| Deploy API Server (Cloud Run) | run `35402294873` **success** |
| CHECK 커밋 | 코드 CI 완주 후 별도 커밋(CI 취소 방지) — 이 파일의 커밋 hash 는 git log 참조 |
| 완료 조건 | 이 WO 범위 미커밋 0건 · `HEAD == origin/main` (CHECK push 후 확인) |

타 세션 dirty 파일(`docs/baseline/O4O-STORE-OWNER-SERVICE-AGREEMENT-V1.0.md`) 불가침 · `apps/main-site` 잔재 미접촉.
