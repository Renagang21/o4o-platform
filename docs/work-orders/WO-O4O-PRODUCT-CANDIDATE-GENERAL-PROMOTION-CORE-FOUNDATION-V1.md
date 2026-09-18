# WO-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1

> **상태:** DRAFT · HANDOFF ONLY · 구현 WO (등록일 2026-09-18 · 실행 착수는 별도 명시 지시)
> **기준 코드:** `origin/main` `89ef8f68b` 이후
> **목적:** `ProductCandidate → ProductMaster / ProductIdentifier` 승격의 **소스 중립 공통 Core(Promotion Core)** 를 만들고, 기존 `store_web` 승격 경로 1개를 그 위로 옮겨 동작 보존을 증명한다
> **선행:** [`IR-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-BOUNDARY-V1`](../investigations/IR-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-BOUNDARY-V1.md)(89ef8f68b) — 승격 경로 P1/P2/P3 전수 · dedup 3종 · 유형별 최소 필드 · 첫 WO 최소 경계(§7)
> **기준 문서:** [`O4O-PRODUCT-CORE-BASELINE-V1`](../baseline/O4O-PRODUCT-CORE-BASELINE-V1.md) §2 · §5 · §6 · §8 · §12 (Candidate 경유 확정 · 바코드는 전제조건 아님 · Master 확정 ≠ Offer · 공급자 전용 필드의 Product Core 상승 금지) · [`O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1`](../baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md)(F12)
> **후속(이 WO 가 아님):** ② Supplier 단건 Candidate Intake(`POST /supplier/product-candidates`) → ③ Supplier Promotion Adapter → ④ Existing Master 직접 연결 전용 API → ⑤ `createSupplierOffer` 에서 `resolveOrCreateMaster` 제거 → ⑥ 제품 등록 UI AI First → ⑦ ChatGPT/사진/PDF/URL 입력

---

# 1. 목표와 배경

## 1.1 문제

IR 이 확인한 현재 구조:

| 경로 | 위치 | 상태 |
|---|---|---|
| P1 drug 승격 | `modules/neture/drug-import/drug-master-promotion-apply.service.ts` `promoteOne()` | 약가마스터 표준코드 전용 · 실운영 파이프라인 |
| P2 store_web 승격 | `modules/neture/services/store-product-request-admin.service.ts` `approveAsNewMaster()` · `linkToExistingMaster()` | **범용 승격의 원형(80%)** 이나 `sourceType='store_web' AND sourceLabel='kpa-store-product-request'` 로 잠겨 있고 매장 listing 생성과 같은 TX 에 결합 |
| P3 공급자 단건 | `services/catalog.service.ts` `resolveOrCreateMaster()` ← `offer.service.ts` `createSupplierOffer()` | Candidate 를 거치지 않고 공급자 입력이 곧 Master · Master/Offer 가 별 TX |

즉 "범용 승격 엔진이 없다" 가 아니라 **"있는데 store_web 에 갇혀 있다"** 가 정확하다. 공급자 대량 후보(`csv_import` · `'공급자 대량 등록'`)는 어떤 운영자 액션으로도 Master 가 되지 못하는 dead-end 다(IR §3-3).

## 1.2 이번 WO 의 완료 목표

```text
ProductCandidate
      ↓
ProductPromotionPlan          ← 제품군별 Adapter 가 만든다 (이번 WO: store_web Adapter 1개)
      ↓
Promotion Core                ← 이번 WO 의 산출물
  · dedup 3종 (barcode · product_identifiers (type, normalized) · 이름+제조사)
  · 단일 TX: Master 생성 or 기존 Master 연결 + Identifier 멱등 생성 + candidate 상태 전이
  · 결과 = create | link | conflict | hold
      ↓
ProductMaster · ProductIdentifier · Candidate(matchedProductMasterId · 상태)
```

완료 정의:

1. Promotion Core 가 `ProductPromotionPlan` 입력만으로 Master/Identifier/Candidate 를 확정하는 **소스 중립 서비스**로 존재한다. Core 는 `sourceType` · `sourceLabel` · `organizationId` · `serviceKey` 로 **분기하지 않는다**.
2. P2 `approveAsNewMaster()` 의 **Product identity 확정 부분**이 Core 호출로 대체되고, 매장 listing(`upsertOrganizationListing`) · 알림 · 응답 계약(`StoreRequestActionResult & { identifierCreated }`) · 에러 코드(`DUPLICATE_MASTER_EXISTS`+`duplicates` · `RX_NEW_MASTER_BLOCKED` · `STATUS_NOT_REVIEWABLE` · `ALREADY_LINKED` · `CANDIDATE_ORG_MISSING` · `CANDIDATE_SERVICE_KEY_MISSING`)는 **그대로** 다.
3. Core 는 InMemory store 로 단위테스트된다(P1 의 `PromotionMasterStore` 테스트 방식과 동일).
4. DDL 0 · P1 접촉 0 · P3 접촉 0.

## 1.3 원칙

- **Core 는 제품군을 판단하지 않는다.** "의약품인가 · 허가가 유효한가 · 신고번호가 맞는가 · 이 자료를 믿을 수 있는가" 는 Adapter 책임이다. Core 는 Adapter 가 넘긴 `PromotionPlan` 을 **구조적으로만** 검증한다(최소 필드 · 영문 `regulatory_type` 코드 · Rx 차단 · 식별자 형식).
- **P1 을 파라미터화하지 않는다.** 결정 골격(port + 순수 결정 계층 + outcome + TX)만 빌리고 코드는 새로 둔다. P1 파일은 열지 않는다.
- **기존 Master 연결 시 불변 필드를 수정하지 않는다.** 차이는 `existingMasterDiff` 로 report 만 한다.
- `product_identifiers (type, normalized)` 는 **여러 Master 에 존재할 수 있는 현재 구조를 유지**한다. 전역 UNIQUE 를 만들지 않는다. 같은 Master 안의 멱등만 보장한다.

## 1.4 다른 세션 보호

다중 세션이 `main` 에 직접 커밋한다. `git fetch origin` → `git status -sb` 후 착수, 타 세션의 dirty · 미추적 파일 불가침, path-specific stage · `git commit -- <paths>` 만 사용. 동일 WO 가 이미 origin 에 push 돼 있으면 그 정본을 유지하고 결함만 전달한다.

---

# 2. 승인 범위

## 2.1 신규 — Promotion Core (`apps/api-server/src/modules/neture/promotion/` 권장 · 위치는 실행자 판단, 단 `drug-import/` 아래는 금지)

**계약 (개념 · 이름은 실행자가 확정하되 아래 의미를 유지)**

```ts
// Adapter → Core 입력. Core 가 아는 것은 이것뿐이다.
interface ProductPromotionPlan {
  candidateId: string;
  master: {
    regulatoryType: 'GENERAL' | 'COSMETIC' | 'HEALTH_FUNCTIONAL' | 'QUASI_DRUG' | 'MEDICAL_DEVICE' | 'DRUG';  // 영문 코드만
    drugCategory: 'otc' | 'rx' | 'drug_unspecified' | 'quasi_drug' | null;
    name: string;                // 필수 · trim 후 비어 있으면 hold
    manufacturerName: string;    // 필수 · '미상' 합성 금지 → hold
    specification: string | null;
    barcode: string | null;      // GTIN-like 일 때만 · 아니면 null(합성 금지)
  };
  identifiers: Array<{ type: ProductIdentifierType; value: string; isPrimary: boolean; sourceType: string; sourceLabel: string | null; verificationStatus: string }>;
  dedupHints: { nameManufacturerExact: boolean };   // 이름+제조사 정확일치 dedup 사용 여부(기본 true)
  reviewedBy: string | null;
  note: string | null;
  approvalMeta: Record<string, unknown>;             // candidate.raw_payload.approval 에 병합될 Adapter 고유 정보
}

type PromotionOutcome =
  | { kind: 'create';   masterId: string; identifiersCreated: number }
  | { kind: 'link';     masterId: string; identifiersCreated: number; existingMasterDiff: ExistingMasterDiff | null }
  | { kind: 'conflict'; reason: 'identifier_belongs_to_other_master' | 'barcode_belongs_to_other_master' | 'multiple_masters_match'; masters: Array<{ id: string; name: string | null; barcode: string | null; manufacturerName: string | null; matchType: 'barcode' | 'identifier' | 'name_manufacturer' }> }
  | { kind: 'hold';     reason: 'name_missing' | 'manufacturer_missing' | 'rx_not_promotable' | 'regulatory_type_invalid' | 'drug_category_required' | 'identifier_invalid' | 'candidate_not_reviewable' | 'candidate_already_linked' };
```

**Core 책임 (전부 · 이 외 없음)**

| # | 책임 | 근거 |
|---|---|---|
| 1 | Plan 구조 검증 → `hold` | IR §4 최소 필드 = 이름+제조사 · 영문 코드만 · DRUG 는 `drugCategory` 필수 · Rx 는 범용 승격 불가(baseline §10) |
| 2 | candidate 상태 검증(`pending`/`reviewing` 만 · `matchedProductMasterId` 비어 있어야) → `hold` | P2 현행 |
| 3 | dedup 3종을 **한 곳에서** 실행: ① `product_masters.barcode` 정확 ② `product_identifiers (identifier_type, normalized_value)` 정확 ③ `LOWER(TRIM(name))+LOWER(TRIM(manufacturer_name))` 정확(hint 가 true 일 때) | IR §3-1 · 유사도 매칭 금지 |
| 4 | dedup 결과 판정: 0건 → `create` / 정확히 1 Master → `link` / 2 Master 이상 또는 identifier 가 다른 Master 소속 → `conflict` | P1 골격 |
| 5 | `create`: `product_masters` INSERT(`is_mfds_verified=false` 명시 · `status='ACTIVE'` · `regulatory_name=name`) | P2 현행 |
| 6 | `link`: 기존 Master 불변 · `existingMasterDiff` 계산만 | P1 `link` 의미 |
| 7 | Identifier 멱등 생성: 대상 Master 에 (type, normalized) 가 이미 있으면 skip, 없으면 INSERT | P1 `ensureIdentifiers` |
| 8 | `regulatoryType='DRUG'` 이고 `create` 이면 `ProductDrugExtensionService.ensureForProductMaster()` 호출 | IR §3-2 결함 보완 · 같은 TX 또는 커밋 직후(실행자 판단 · 실패 시 로그) |
| 9 | candidate UPDATE: `matched_product_master_id` · `candidate_status`(`create`→`approved_new_master` / `link`→`matched`) · `reviewed_by/at` · `raw_payload.approval` 병합 | P2 현행 (P2 의 `linked` 는 §2.2 참조) |
| 10 | 3~9 를 **하나의 `dataSource.transaction`** 안에서 · TX 안 barcode 재확인(동시 생성 방어) | P2 현행 |
| 11 | 커밋 후 `ensureProductLandingForMaster()` best-effort (`create` 일 때만) | P2 현행 |
| 12 | `conflict` · `hold` 는 **아무것도 쓰지 않는다** (candidate 상태 불변) | 안전 |

**Core 가 하지 않는 것**: Offer 생성 · 매장 listing · 알림 · 권한 검사(`allowedServiceKeys`) · 제품군 정책 판단 · 유사도 매칭 · `raw_payload` 해석(Adapter 가 한다).

**port**: read(`findMastersByBarcode` · `findMastersByIdentifier` · `findMastersByNameManufacturer` · `findIdentifiersOfMaster` · `loadCandidate`) / write(`createMaster` · `createIdentifier` · `updateCandidate`). DB 구현 1 + InMemory 구현 1(테스트).

## 2.2 변경 — P2 `StoreProductRequestAdminService` 를 Core 위로

- `approveAsNewMaster()`: 다음만 남긴다 — `loadStoreRequest`(소스 잠금 · 권한) → `CANDIDATE_ORG_MISSING`/`CANDIDATE_SERVICE_KEY_MISSING` → **store_web Adapter** 가 `candidateCategory`/`rawPayload.classification` → `classificationToRegulatory()` 로 Plan 생성 → Core 호출 → 결과 매핑:
  - `create` → 같은 TX 또는 후속 TX 에서 `upsertOrganizationListing` → 기존 응답 그대로(`identifierCreated = identifiersCreated > 0`)
  - `link` → P2 는 지금 "신규 승인" 액션에서 기존 Master 를 발견하면 `DUPLICATE_MASTER_EXISTS` 를 던진다. **이 동작을 유지한다** — Core 가 `link` 를 돌려주면 Adapter 가 `DUPLICATE_MASTER_EXISTS`+`duplicates` 로 변환한다(운영자가 명시적으로 "기존 연결" 을 고르게 하는 현행 UX 보존). 즉 P2 신규승인 Adapter 는 `link` 를 자동 확정하지 않는다.
  - `conflict` → `DUPLICATE_MASTER_EXISTS`+`duplicates`
  - `hold` → 기존 에러 코드로 역매핑(`rx_not_promotable`→`RX_NEW_MASTER_BLOCKED` · `candidate_not_reviewable`→`STATUS_NOT_REVIEWABLE` · `candidate_already_linked`→`ALREADY_LINKED`). `name_missing`/`manufacturer_missing` 은 **현행이 `'(이름 미상)'`/`'미상'` 합성으로 통과시키던 구간** — 새 코드 `CANDIDATE_FIELD_MISSING` 로 400 반환. 이는 의도된 행동 변경이며 §7 보고에 명시한다.
- `linkToExistingMaster()`: **이번 WO 접촉 안 함**(운영자가 masterId 를 명시하는 별도 액션 · 후속 ④ 에서 "검증된 Existing Master 연결 전용" 으로 함께 정리).
- `findDuplicates()`: Core 의 dedup 조회(read port)를 재사용하도록 바꿔도 되고 두어도 된다. 응답 shape(`StoreRequestDuplicate[]`) 불변.
- **TX 경계 결정**: listing 을 Core TX 안에 넣으려면 Core 가 "커밋 전 hook" 을 받아야 한다. 허용되는 두 안 — (a) Core 가 `EntityManager` 를 받는 `promoteWithin(m, plan)` + 외피 `promote(plan)` 두 진입점을 제공하고 P2 는 자기 TX 안에서 `promoteWithin` 을 부른다 (권장 · Master+listing 원자성 유지) / (b) Core TX 커밋 후 listing 별도 TX. (b) 를 고르면 Master 는 생기고 listing 은 실패하는 반쪽 상태가 가능하므로 §7 에 이유를 적는다.

## 2.3 허용되는 부수 작업

- `classificationToRegulatory()` 를 store_web Adapter 파일로 이동(순수 함수 · 동작 불변).
- `utils/product-identifier.util.ts` 의 기존 함수 사용(수정 금지).
- 단위테스트: Core(InMemory store) `create / link / conflict / hold / identifier 멱등 / DRUG extension 호출 / Rx hold / 이름+제조사 dedup on·off`. P2 Adapter 의 결과→에러코드 매핑 테스트.
- CHECK 문서 1건 (`docs/checks/CHECK-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1.md`).
- `O4O-PRODUCT-CORE-BASELINE-V1` 에 Promotion Core 위치 한 줄 추가는 **하지 않는다** — 기준 문서는 후속 ②·③ 이 끝나 계약이 굳은 뒤 별도 WO 로 갱신(§16-4).

---

# 3. 실행 순서

1. **읽기**: IR 전문 · P2 서비스 전체(381줄) · P1 `drug-master-promotion-apply.service.ts` 의 **타입·`promoteOne` 결정 순서만**(수정 금지) · `product-identifier.util.ts` · `product-drug-extension.service.ts` `ensureForProductMaster` · `product-landing.service.ts` `ensureProductLandingForMaster` · admin-dashboard 의 P2 소비처(`StoreRequestReviewModal` · `StoreProductRequestsPage`)가 읽는 응답 필드.
2. **Core 타입·순수 결정 계층 먼저** (`decidePromotion(plan, dedupResult) → outcome`) — DB 없이 단위테스트 통과.
3. **port + InMemory + DB 구현** · TX 외피 · Landing 후처리 · DRUG extension 보장.
4. **store_web Adapter** 작성 → P2 `approveAsNewMaster` 를 Core 호출로 치환 → 응답·에러코드 매핑 테스트.
5. **회귀 확인**: P2 controller 의 route/응답 shape 불변 · admin-dashboard 타입 오류 0 · P1 테스트 4종 그대로 통과(파일 미접촉 증명은 `git diff --stat` 로).
6. `pnpm --filter @o4o/api-server build` · `test` · `lint:no-fix` (api-server) · admin-dashboard typecheck.
7. CHECK 작성 → path-specific stage → `node scripts/git/check-staged-scope.mjs <경로>` → `git commit -- <경로>` → push.

---

# 4. 제외 범위

- **P1**(약가마스터 drug 승격 · `drug-import/**` 전체 · Medical Device Gate B · HFF/Quasi candidate import) — 파일 접촉 0. 이들의 Core 이전은 각각 별도 WO.
- **P3**(`resolveOrCreateMaster` · `createSupplierOffer`) — 접촉 0. 제거는 후속 ⑤.
- 공급자 단건 Candidate intake · 공급자 bulk candidate 의 identifier 채움 · dead-end 해소 — 후속 ②.
- 공급자/제품군별 Adapter(GENERAL·COSMETIC·QUASI·HFF·MEDICAL_DEVICE·DRUG 별 최소 확인 수준) — 후속 ③. 이번 WO 의 Adapter 는 **store_web 하나**뿐.
- "사용자 확인만으로 Master 확정" 정책(IR §5 표) — 결정하지 않는다. Core 는 호출자가 누구인지 모른다.
- `SupplierProductOffer` 자동 생성 · DRUG Offer gate 이동 · `offer_service_approvals` — 접촉 0.
- `product_candidates` 컬럼 추가(`supplierId` 등) · `product_masters`/`product_identifiers` schema · 인덱스 · migration — **0**.
- `regulatory_type` 한글 별칭(`'일반'`·`'의약품'`) 잔존 데이터 정리 — 보고만.
- UI(admin-dashboard · web-neture supplier wizard) 변경 — 0. 응답 shape 가 불변이므로 필요 없어야 한다.
- 새 HTTP route — 0. Core 는 내부 service 다.

---

# 5. 중지 조건

아래가 나오면 임의로 확대하지 않고 **보고 후 대기**한다.

| # | 조건 | 왜 |
|---|---|---|
| A | ProductMaster 필수 immutable 필드 계약이 제품군 간 충돌해 `ProductPromotionPlan.master` 하나로 표현되지 않음 (예: DRUG 가 store_web 경로에서 P1 전용 필드를 요구) | Core DTO 분기 = Core 가 제품군을 판단하게 됨. 설계 재검토 |
| B | `product_identifiers (type, normalized)` 중복 정책 변경이 필요해짐 (전역 UNIQUE · 기존 중복 row 정리 요구) | 현재 구조 유지가 전제. 데이터 영향 범위 판단은 사용자 |
| C | `product_masters` · `product_identifiers` · `product_candidates` schema 변경 · migration 필요 | DDL 0 전제 |
| D | P1 / P3 / `drug-import/**` 파일 수정 없이는 Core 가 성립하지 않음 | 기존 운영 경로 보존 전제 |
| E | admin-dashboard 응답 소비처가 이번 응답 shape 변경 없이는 동작하지 않음 | P2 계약 불변 전제 |
| F | 이름+제조사 dedup 정확일치가 프로덕션에서 **오탐(다른 제품이 같은 이름+제조사)** 을 낼 수 있음이 실데이터로 확인되고 hint off 로 회피할 수 없음 | 정책 판단 |
| G | 현재 변경과 무관한 build · test 실패 · 타 세션 dirty 파일 접촉 필요 | 상시 규칙 |

---

# 6. 검증과 Git

## 6.1 검증

| 항목 | 방법 | PASS 기준 |
|---|---|---|
| Core 단위테스트 | jest · InMemory store | create/link/conflict/hold 각 1+ · identifier 멱등(같은 Master 2회 → 1건) · Rx→hold · DRUG create→extension 호출 1회 · 이름+제조사 hint off 시 dedup ③ 미실행 · conflict/hold 시 write 0 |
| P2 Adapter 매핑 | jest | Core 결과 → 기존 에러코드 · `identifierCreated` · `listingId` 매핑 |
| P2 회귀 | `git diff` + controller 타입 | route · 응답 shape · 에러코드 집합 불변(추가 `CANDIDATE_FIELD_MISSING` 만) |
| P1 무접촉 | `git diff --stat origin/main -- apps/api-server/src/modules/neture/drug-import` | 0 files |
| 빌드·정적 | `pnpm --filter @o4o/api-server build` · `test` · `lint:no-fix` · admin-dashboard `tsc --noEmit` | 전부 성공 |
| 프로덕션 smoke | admin-dashboard 매장 상품 요청 검토 화면에서 **store_web 후보 1건 신규 승인**(테스트 tenant 후보) → Master·Identifier·listing·candidate 상태 확인(read-only SELECT) | 승인 전후 동일 동작. 테스트 후보를 만들 수 없으면 **PENDING 사유 명시** — PASS 로 쓰지 않는다 |

## 6.2 Git

- 커밋 단위 권장: ① Core(타입·결정·port·테스트) ② P2 Adapter 치환 ③ CHECK. 하나로 합쳐도 무방.
- 커밋 메시지 끝에 `(WO-O4O-PRODUCT-CANDIDATE-GENERAL-PROMOTION-CORE-FOUNDATION-V1)`.
- `git add <path>` · `node scripts/git/check-staged-scope.mjs <paths>` · `git commit -m "..." -- <paths>` · `git push origin main`. `--force` 금지.
- 완료 = 이 WO 범위 미커밋 0건 + `HEAD == origin/main`. 저장소 전체 clean 은 요구하지 않는다.

---

# 7. 완료 보고

WO 제목을 첫 줄에 두고 한국어로. 다음 항목을 **전부** 포함한다.

1. Core 파일 목록 · public 계약(`ProductPromotionPlan` · `PromotionOutcome` · port) 최종 이름
2. Core 가 **하지 않는 것** 목록이 §2.1 과 일치하는지 (달라졌으면 무엇이 왜)
3. P2 치환 결과: 남은 코드 / Core 로 간 코드 / TX 경계 선택(§2.2 (a)·(b) 중 무엇 · 이유)
4. 행동 변경 목록 — 최소 `CANDIDATE_FIELD_MISSING` 도입(이름·제조사 합성 폐지) · 그 외 있으면 전부
5. 테스트 결과: Core / Adapter / P1 4종 그대로 통과 여부 · 실행 명령 · 실패·건너뜀 있으면 원문
6. P1 · P3 · `drug-import/**` 무접촉 증명(`git diff --stat`)
7. 프로덕션 smoke 결과 또는 PENDING 사유
8. 중지 조건 A~G 발동 여부(발동 시 어느 것 · 어디서)
9. 후속 ②(Supplier 단건 Candidate Intake) 가 이 Core 를 쓰기 위해 필요한 것 — Adapter 가 채워야 할 Plan 필드 · 공급자 후보의 identifier 채움 요건 · `supplierId` 를 rawPayload 로 둘 때의 제약
10. 문서 정합: `발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건` — `regulatory_type` 한글 별칭 잔존은 별도 WO 제안으로 기록
11. 커밋 hash · `HEAD == origin/main` 확인
