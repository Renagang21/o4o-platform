# CHECK-O4O-COSMETICS-SUPPLIER-PRODUCT-REGISTER-AND-EDIT-BROWSER-SMOKE-V1

- **WO**: `WO-O4O-COSMETICS-SUPPLIER-PRODUCT-REGISTER-AND-EDIT-BROWSER-SMOKE-V1`
- **선행**: `WO-O4O-COSMETICS-PRODUCTMASTER-STORE-DESCRIPTION-FULL-APPLY-V1` (CLOSED/PASS, `75108bbc8`)
- **일자**: 2026-08-11
- **판정**: **PARTIAL PASS** — 코드경로·권한·read-only 검증 전 항목 통과, 실계정 브라우저 smoke 는 **BLOCKED**(로그인 가능한 ACTIVE 공급자 계정 확보 불가 · CLAUDE.md 중지 조건 "실제 계정·자격정보 승인 필요")
- **DB write**: **0건** (전 과정 read-only)

## 1. 기준 / baseline

| 항목 | 값 |
|---|---|
| 작업 시작 HEAD | `1f483be1e` → 커밋 시점 base `2a73eda68` (타 세션 진행분, `--ff-only` 동기) |
| COSMETIC ProductMaster | 32,674 (변동 0) |
| KO STORE canonical 설명서 | 32,674 (변동 0) |
| 화장품 `supplier_product_offers` | 0 |
| DRUG 177,413 · 건강기능식품 40,948 · QUASI_DRUG 17,148 · MEDICAL_DEVICE 3,826 | drift 0 |

## 2. 현행 경로 감사 (WO §3 A~E)

| 축 | 현행 |
|---|---|
| **A. 기존 master 연결** | 유일 경로 = `/supplier/products/library` 검색 → 카드 선택 → `/supplier/products/new?barcode=…`. `masterId` 직접 전달은 서버 계약상 금지(`MASTER_ID_DIRECT_INJECTION_NOT_ALLOWED`). 연결은 반드시 `resolveOrCreateMaster` 를 거친다. |
| **B. 신규 등록** | `POST /api/v1/supplier/products` + `manualData.regulatoryType='COSMETIC'`. 등록 폼 `<select name="regulatoryType">` 에 `화장품` 옵션 존재. **바코드 필수 아님** — 없으면 `createMasterWithoutBarcode`. |
| **C. 설명서 수정** | 공급자는 본인 offer 에 draft 를 쓴다. canonical 승격은 운영자 검수 큐 경유. 화장품 32,674 SPD 는 전량 `canonical` / `source_type='o4o_cosmetics_retail'`. O4O 측 수정 경로(`POST /api/v1/o4o-product-db/product-masters/:id/store-descriptions`)는 신규 SPD candidate 를 만들고 기존 canonical 을 강등하는 구조다(= byte 단위 원복 불가). |
| **D. 소유권 판정** | `supplier_product_offers.supplier_id` **단일 기준**. 화장품 master 는 `brand_id` 전량 NULL 이므로 브랜드 기반 소유권은 도출 불가. |
| **E. 타 공급자 차단** | 조회/등록 모두 `supplierId` 로 스코프. 회수(withdraw)는 타 공급자 행에 404. 실측: supplier 미연결 계정(admin/operator role 보유)으로 `POST /supplier/products` 호출 → **401 `NO_SUPPLIER`**. |

**WO §9 (공급자 연결이 O4O 수정권을 제거하지 않는가)**: 두 경로는 서로 다른 라우터·다른 가드다. 공급자 offer 생성은 `product_masters` 에 어떤 잠금·소유 플래그도 심지 않으며, O4O 설명서 라우트의 가드는 `supplier_product_offers` 를 조회하지 않는다. → **연결이 O4O 수정을 막지 않음이 코드경로로 확인됨.**

## 3. smoke 결과

| # | 시나리오 | 결과 | 근거 |
|---|---|---|---|
| §5-A | 기존 화장품 master 찾기 | **PASS** | `GET /o4o-product-db/product-masters/search` (requireAuth) — ASCII `AHC` 19건, 한글 `온리포맨` 5건. 초기 0건은 curl 인코딩 문제였고 제품 결함 아님. |
| §5-A | master 연결 handoff | **FAIL → 수정 후 PASS(코드)** | 바코드 NULL master 에서 `encodeURIComponent(null)` = 문자열 `"null"` 이 바코드로 전달 → 등록 화면이 그 값을 조회, 제출 시 `INVALID_GTIN`. 화장품 32,674 전량이 barcode NULL 이므로 **전건 차단**이었다. §4 에서 수정. |
| §5-A | 실제 연결 실행(ProductMaster 증가 0 확인) | **BLOCKED** | 로그인 가능한 ACTIVE 공급자 계정 없음. |
| §6-B | 자기 설명서 수정 후 원복 | **BLOCKED (실행 안 함)** | 계정 blocker + O4O 설명서 수정이 candidate INSERT + canonical 강등 구조라 "원복 후 pre-smoke 와 동일" 을 보장할 수 없음(WO §6 요구 미충족) → 실행하지 않음이 맞다고 판단. |
| §7-C | 신규 등록 | **PASS (계약 검증까지)** | WO §7 단서 적용 — 실제 운영에 없는 가짜 화장품을 만들지 않는다. 폼·API 계약·`regulatoryType=COSMETIC` 수용·바코드 선택 확인. **신규 ProductMaster 생성 0.** |
| §8-D | 타 공급자 제품 수정 차단 | **PASS (read-only)** | supplier 미연결 계정 실호출 401 `NO_SUPPLIER`. 컨트롤러 전 write 경로가 `supplierId` 스코프. 단순 supplier role 보유만으로는 통과 불가. |
| §9 | 공급자 연결 ≠ O4O 수정 금지 | **PASS (코드경로)** | §2 참조. |

**연결 안전성 실측(§5 위험 정량화)**: 제조사 공란 master 중 이름 중복 그룹 182개 / 453행. 그중 **여러 `regulatory_type` 에 걸친 그룹 0개** → 이름 기반 연결이 DRUG/HFF/QUASI_DRUG 로 새어나갈 수 없다. 표본 master `c57d6c66-84a9-4271-854d-a5c5ed60816d` 는 정확히 1건으로 해소.

## 4. 수정 사항 (WO §10 — 최소 수정)

새 테이블 **0** · migration **0** · 새 ownership 시스템 **0** · DB write **0**.

| 파일 | 원인 | 변경 |
|---|---|---|
| `apps/api-server/src/modules/neture/controllers/product-library.controller.ts` | 검색 응답에 `regulatoryType` 이 없어 등록 화면이 유형을 prefill 할 수 없음 | additive 필드 `regulatoryType` 노출 |
| `services/web-neture/src/lib/api/product.ts` | `MasterSearchResult` 타입이 실제 응답과 불일치(`barcode` non-null, `marketingName` 없는 필드) | `barcode: string \| null`, `name`, `regulatoryType?` 로 정정 |
| `services/web-neture/src/pages/supplier/SupplierProductLibraryPage.tsx` | **핵심 결함** — 바코드 없는 master 선택 시 `"null"` 전달 | 바코드 없으면 이름·브랜드·제조사·카테고리·유형을 전달. 같은 값으로 제출하면 서버가 (이름, 제조사) 로 기존 master 를 찾아 연결(신규 생성 아님). 카드 표기도 `바코드 없음` 으로 정정 |
| `services/web-neture/src/pages/supplier/SupplierProductCreatePage.tsx` | 넘어온 값 미수용 + `"null"` 을 바코드로 조회 | `name/brandName/manufacturerName/categoryId` prefill 수용, `'null'`/`'undefined'` 문자열 방어 |

검증: `npx tsc --noEmit` (api-server / web-neture) 각각 통과.

## 5. postVerify (read-only)

| 항목 | 값 |
|---|---|
| COSMETIC ProductMaster | 32,674 (drift 0) |
| KO STORE canonical | 32,674 (drift 0) |
| master 중복 (brand,name) | 0 |
| canonical 중복 | 0 |
| orphan 설명서 / canonical 없는 master | 0 / 0 |
| 타 `regulatory_type` drift | 0 |
| 화장품 offer | 0 (신규 생성 없음) |
| 신규 ProductMaster | 0 |
| 남긴 테스트 데이터 | 없음 |

## 6. 수정하지 않고 보고하는 발견 (WO 범위 밖 / 중지 조건)

1. **`/api/v1/admin/*` 전면 super_admin 차단** — `register-routes.ts:418` 의 `app.use('/api/v1/admin', adminDashboardRoutes)` 가 `router.use(requireAdmin)`(= `platform:super_admin` 단독)을 걸어, 이후 라인 466~586 에 마운트된 `o4o-product-db` 계열(설명서 수정 라우트 `:506` 포함)이 **서비스 admin/operator 에게도 403 `FORBIDDEN`** 이다. 컨트롤러 자체 의도는 `requireRole(ADMIN_ROLES)`(neture/cosmetics/kpa 등 admin·operator 허용)인데 상위 blanket 이 덮는다. → 전역 권한·라우트 변경이라 CLAUDE.md 중지 조건 + WO §13 에 해당. **별도 WO 필요.**
2. **공급자 연결이 기존 O4O master 필드를 덮어씀** — `offer.service.ts` `resolveProductMetadata` 가 연결 직후 `updateProductMaster(masterId, extFields)` 로 공급자가 보낸 `name/categoryId/brandId/specification/originCountry/tags` 를 기존 master 에 기록한다. 32,674 화장품에 공급자가 붙기 시작하면 O4O 정본 이름이 공급자 입력으로 바뀔 수 있다. 이번 WO 의 "최소 수정" 범위를 넘고 다른 제품군(DRUG/HFF 포함) 전체에 영향 → **별도 WO 필요.**
3. **대량 등록(bulk) 에 화장품 유형 없음** — `supplierProductTypes.ts` 의 `SUPPLIER_PRODUCT_TYPES` 는 non_drug/quasi_drug/otc_drug/rx_drug/unclassified 5종이며 백엔드 `BULK_TYPE_MAP` 도 동일(미지 key → 400 `INVALID_PRODUCT_TYPE`). 추가하려면 프론트 3개 Record 테이블 + CSV 템플릿 + 백엔드 map 을 동시 수정해야 한다. **단건 등록 폼에는 화장품이 이미 있어 WO 질문 3은 충족**되므로 UX 개선 항목으로 분리(WO §13 — UI 문구/편의는 중지 사유 아님).
4. **테스트 계정 문서 drift** — `docs/local/TEST-ACCOUNTS.local.md` 본표의 `sohae2100@gmail.com` 비밀번호는 stale(실제 동작값은 Pharmacy-Hub 절 값). `sohae21@naver.com` 은 `users.status='deleted'` 인데 supplier 행은 ACTIVE → 403 `ACCOUNT_NOT_ACTIVE`. `renagang21@gmail.com` 은 문서상 모든 값으로 401. **계정 생성·비밀번호 변경은 하지 않았다**(CLAUDE.md 중지 조건).

## 7. 미실행 사유 (숨기지 않음)

§5 실연결 / §6 설명서 수정·원복 은 **실행하지 않았다.** 사유는 로그인 가능한 ACTIVE 공급자 계정이 없고, 계정 생성·비밀번호 재설정이 CLAUDE.md 중지 조건이기 때문이다. WO §9 의 "실제 수정 테스트가 위험하면 API 권한/코드 경로 + read-only 확인으로 대체 가능" 조항을 적용해 대체 검증했다. 실계정이 제공되면 §5·§6 만 재실행하면 된다.

## 8. Git

| 항목 | 값 |
|---|---|
| 변경 파일 | 4 + 본 CHECK 문서 |
| 새 테이블 / migration | 0 / 0 |
