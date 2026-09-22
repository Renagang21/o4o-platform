# WO-O4O-SUPPLIER-POST-REGISTRATION-PRODUCT-MANAGEMENT-OFFER-FIRST-REALIGNMENT-V1

> **상태:** READY FOR EXECUTION · HANDOFF ONLY · 구현 WO (등록일 2026-09-22 · 실행 착수는 별도 명시 지시)
> **기준 코드:** 작성 시점 `origin/main` `c41551ae5`. **실행은 항상 최신 `origin/main` 에서 시작**하며 특정 커밋으로 reset/rebase 해 타 세션 커밋을 제거하지 않는다
> **목적:** 제품 **등록** AI First 리팩토링(cutover `dc1c9f542` · `34ed4acd1`)에 이어 **등록 이후 상품관리** 영역을 같은 원칙으로 마감한다. 작은 후속 WO 로 쪼개지 않고 **하나의 구현·배포·CHECK 단위**로 닫는다
> **선행 조사:** [`IR-O4O-SUPPLIER-POST-REGISTRATION-WORKSPACE-REFACTORING-CENSUS-V1`](../investigations/IR-O4O-SUPPLIER-POST-REGISTRATION-WORKSPACE-REFACTORING-CENSUS-V1.md)(`3960af039`) — §2 프로덕션 현황 · §3 화면별 판정 · §4 내부 AI 잔재 · §5 ProductImage · §7 backend legacy · §8 묶음 결정
> **선행 완료:** [`CHECK-…-PROMOTION-ADAPTER-V1`](../checks/CHECK-O4O-SUPPLIER-PRODUCT-CANDIDATE-PROMOTION-ADAPTER-V1.md)(③ `f299fb1de`) · [`CHECK-…-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1`](../checks/CHECK-O4O-SUPPLIER-PRODUCT-REGISTRATION-AI-FIRST-CUTOVER-AND-LEGACY-MASTER-RESOLUTION-RETIREMENT-V1.md)(⑤+⑥ `dc1c9f542`)
> **기준 문서:** [`O4O-ROLE-WORKSPACE-ARCHITECTURE-V1`](../baseline/O4O-ROLE-WORKSPACE-ARCHITECTURE-V1.md)(Supplier 업무공간 경계) · [`O4O-PRODUCT-CORE-BASELINE-V1`](../baseline/O4O-PRODUCT-CORE-BASELINE-V1.md) §2 · §6 · §12 · [`O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1`](../baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md)(F12) · [`O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1`](../baseline/O4O-AI-AUTOMATION-EVOLUTION-PRINCIPLES-V1.md)(내부 AI 자동 호출이 아니라 목적·결과 기준) · [`O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1`](../baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md)(Drawer · store-ai util 공유 변경 절차)

---

# 1. 최상위 불변식

```text
Supplier
 → SupplierProductOffer 는 편집한다.
 → ProductMaster 기준정보는 읽기만 한다.
 → 내부 LLM 을 직접 호출하지 않는다.
```

**ProductImage 예외 — 명시 계약** (별도 Offer 자산 테이블이 없으므로 현재 스키마를 유지하는 동안의 임시 계약):

> Supplier 는 ProductMaster 의 **기준정보 · 식별자 · canonical metadata** 를 수정하지 않는다. 단 현재 스키마를 유지하는 동안 **Supplier 가 제공한 이미지 자산**은 출처와 소유자를 명시하여 ProductMaster 에 연결할 수 있으며, **다른 출처의 이미지는 변경하지 못한다.**

```text
Supplier 가 제공한 이미지  → product_images 에 연결 가능 · source='supplier_upload' · created_by=업로더
                            자기 공급자 출처 이미지에 대해서만 교체/삭제 가능
다른 공급자 / 운영자 / Candidate promotion / canonical / source=NULL(출처 불명)
                          → Supplier 수정 · 삭제 금지
```

신규 이미지 테이블 · migration 을 만들지 않는다(§12 · 중지 조건 F).

## 1.1 다른 세션 보호

다중 세션이 `main` 에 직접 커밋한다. `git fetch origin` → `git status -sb` 후 착수, 타 세션의 dirty · 미추적 파일 불가침, path-specific stage · `git commit -- <paths>` 만 사용. 이 WO 는 프런트·백엔드를 함께 건드리므로 **착수 직전 census 를 다시 돌려**(§2 각 항목의 "재확인") 그 사이 생긴 소비처가 없음을 확인한다. 동일 WO 가 이미 origin 에 push 돼 있으면 그 정본을 유지하고 결함만 전달한다.

## 1.2 왜 지금 한 묶음인가 (IR §2 근거)

`supplier_product_offers` 21 · 공유 master 0 · 공급자 업로드 이미지 0 · `product_ai_tags` 0행 · `spot_price_policies` 0 · B2B 설명 설정 offer 0 · CSV 배치 0. **재편 대상 데이터가 거의 없는 지금이 가장 싸다.** Orders · Content 는 같은 IR 이 drift 0 으로 판정했으므로 접촉하지 않는다(§12).

---

# 2. 승인 범위 — 한 묶음

## A. ProductDetailDrawer Offer-First 재편

대상: [`services/web-neture/src/pages/supplier/ProductDetailDrawer.tsx`](../../services/web-neture/src/pages/supplier/ProductDetailDrawer.tsx) **2,079줄**(작성 시점). 거대 Drawer 의 책임을 업무 경계로 분해한다.

```text
ProductDetailDrawer                  ← 조립 + approvalActions 계약만 소유
├─ MasterReadOnlySection             ← ProductMaster 기준정보 · 읽기 전용
├─ OfferEditSection                  ← SupplierProductOffer 소유 항목
├─ OfferDistributionSection          ← 공급 방식 · 서비스 승인
└─ (이미지) Supplier 이미지 관리 단일 진입점 (§B)
```

| 섹션 | 항목 |
|---|---|
| **MasterReadOnlySection** (읽기 전용 · 수정 UI 0) | 상품명 · 바코드/Identifier 표시 · 제조사 · 브랜드 · 카테고리 · 규격 · 원산지 · 규제 정보 · Master 이미지 |
| **OfferEditSection** | 기본 공급가 · 참고 소비자가 · 재고 · 활성 상태 · 추천 표시(`isFeatured`) · B2C 설명 · **B2B 설명**(§D) |
| **OfferDistributionSection** | `isPublic` · `serviceKeys` · 서비스별 공급가 · 서비스 승인 상태 · 공급 철회 |

- 기존 **DRUG gate · approval 계약을 그대로 사용**한다. 서버 API 의미를 바꾸지 않는다.
- **운영자 소비처**: [`OperatorProductApprovalPage`](../../services/web-neture/src/pages/operator/OperatorProductApprovalPage.tsx)(584줄)가 같은 Drawer 를 쓴다. `approvalActions` prop 계약(`ProductDetailDrawer.tsx:41`)을 **유지**하고 운영자 화면 회귀를 반드시 검증한다(§7 · 중지 조건 E).
- **새로운 거대 generic framework 를 만들지 않는다.** 섹션 분리는 같은 디렉터리의 평범한 컴포넌트 분해다.
- 스팟 정책 섹션(`spotForm` · `spot_price_policies` 프로덕션 0행)은 이번 재편에서 **제거하지 않는다** — 범위 밖. 다만 Offer 소유 항목이므로 `OfferEditSection`/`OfferDistributionSection` 중 자연스러운 쪽에 그대로 옮긴다(동작 불변).

## B. SupplierProductsPage 축소

대상: [`SupplierProductsPage.tsx`](../../services/web-neture/src/pages/supplier/SupplierProductsPage.tsx) **1,745줄**.

| 유지 | 제거/통합 |
|---|---|
| 검색 · 필터 · 페이지네이션 · Offer 4열 인라인 편집 · 벌크 저장 · 승인 요청 · 삭제/recycle · Drawer 진입 · offer action | **AI 태그 생성 버튼**(§E) · **중복 `ImageUploadModal`** |

이미지 관리는 **Drawer 한 곳으로 수렴**한다.

## C. Supply Offers 안내 허브 fold

[`SupplierSupplyOffersPage.tsx`](../../services/web-neture/src/pages/supplier/SupplierSupplyOffersPage.tsx)(105줄)는 API 없는 링크형 안내 페이지다. 독립 업무공간으로 유지하지 않는다.

- 핵심 안내가 필요하면 `SupplierProductsPage` 상단 안내 **또는** `SupplierDashboardPage` 진입 카드 중 **기존 구조에 가장 자연스러운 한 곳**으로 흡수(실행자 판단 · CHECK 에 근거).
- `/supplier/supply-offers` → `/supplier/products` **redirect** · 사이드바 항목 제거 · 컴포넌트 삭제.
- 공급 방식 자체는 ProductDetailDrawer / Offer API 가 계속 소유한다.
- **합치지 않는 별도 기능**(각각 독립 비즈니스 기능으로 유지): 판매자 모집 · Market Trial · Event Offer · Pharmacy-Hub 제공 설정.

## D. B2B 별도 화면 은퇴

IR 판정: ProductDetailDrawer 의 B2B 편집과 완전 중복. 프로덕션 B2B 설명 설정 offer **0**.

```text
SupplierB2BContentPage (236줄) · B2BContentDrawer (178줄) · /supplier/b2b-content
→ B2B 편집은 ProductDetailDrawer 단일화
→ /supplier/b2b-content → /supplier/products redirect
→ 사이드바 "거래 상품 정보" 제거 · 중복 component 삭제
```

**API/DB 의미 변경 0** — B2B 저장 계약(`businessShortDescription` · `businessDetailDescription`)과 **B2B 미입력 → B2C 설명 fallback** 을 그대로 유지한다.

## E. Supplier 내부 AI 잔재 전면 은퇴 — 목표 **Supplier 업무공간 내부 LLM 호출 = 0**

### E-1 AI Tags (Supplier 표면)

제거: `regenerateAiTags` · `suggestAiTags` · `addManualTag` · `addManualTagsBatch` · `deleteAiTag` · 관련 Sparkles CTA · 태그 관리 Section · Supplier 용 `productApi` dead 함수.

끊어야 할 흐름:

```text
Supplier action → 내부 LLM → product_ai_tags → syncMasterTags() → product_masters.tags
```

`product_ai_tags` / `product_ai_contents` **테이블은 이번 WO 에서 삭제하지 않는다.** Store/Admin 등 다른 소비처가 있으면 유지한다(착수 시 census 재확인).

### E-2 Dashboard AI Insight

제거: `GET /supplier/dashboard/ai-insight`(`supplier-management.controller.ts`) · `supplierApi`/supplierCopilot client consumer · `SupplierDashboardPage` AI insight 블록 · 그 경로의 `runAIInsight` 내부 LLM 호출. **Supplier Dashboard 진입 시 내부 LLM 이 호출되지 않아야 한다.**

`store-ai-insight.service.ts` 등 **다른 서비스의 insight 소비처는 접촉하지 않는다**(Supplier 진입점만 제거).

### E-3 Copilot SQL 집계 — 기능 유지

SQL 집계 기반 4종은 AI 가 아니므로 **유지**한다. 사용자 노출 문구만 필요 시 사실에 맞게 정리(`Copilot`/`AI 분석` → `성과 요약`/`운영 요약`). **기능 재작성 0.**

## F. store-ai Supplier actor **write** 제거 (권한 축소)

대상: [`apps/api-server/src/modules/store-ai/utils/product-access.utils.ts`](../../apps/api-server/src/modules/store-ai/utils/product-access.utils.ts) `actorType: 'supplier'` 분기(172행 부근).

> **주의 — 통째 제거 금지.** 이 분기는 `render_read` fall-through(한 사용자가 공급자·매장 관계를 동시에 보유하는 경우, 주석 `WO-O4O-PRODUCT-AI-RENDER-READ-MULTI-ACTOR-FALLTHROUGH-V1`)와 얽혀 있다. `actorType='supplier'` 자체를 지우면 렌더 조회가 깨진다.

**정확한 변경**: `mode === 'write'` 에서 공급자 관계로 허용하지 않는다(현재는 `supplierStatus==='ACTIVE'` 면 write 허용). `render_read` · `manage_read` 의 기존 판정과 fall-through 는 **불변**.

```text
Supplier → store-ai 를 통한 ProductMaster AI tag/content write 불가 (403 또는 deny)
Admin / Store 등 실제 기존 소비처 → 변경 0
store-ai router 자체 삭제 0
```

순서: **§E-1 의 Supplier UI 소비처를 먼저 제거한 뒤** 이 권한을 좁힌다. 기존 계약 spec [`product-ai-global-access.spec.ts`](../../apps/api-server/src/__tests__/security/product-ai-global-access.spec.ts) 가 현재 동작을 고정하고 있으므로 **그 spec 을 같은 커밋에서 갱신**하고, 새 deny 계약을 테스트로 고정한다.

## G. ProductImage ownership 경계 정리 — **기존 schema 유지**

현재 경로: `productApi` → `POST/PATCH/DELETE /neture/products/:masterId/images*` → `admin.controller.ts` `createProductImageController`(961~) · guard `requireAuth + requireActiveSupplier + ownsMaster(자기 offer 보유)`.

**업로드 시 필수 기록**(현존 컬럼만 사용):

```text
source = 'supplier_upload'
created_by = 인증된 공급자 user id
```

**Supplier 의 수정/삭제 허용 조건 (AND)**:

```text
내 SupplierProductOffer 가 해당 master 에 존재
AND 대상 ProductImage.source = 'supplier_upload'
AND 그 이미지를 생성한 공급자가 나 (created_by 가 내 공급자 계정)
```

다른 출처(`candidate_promotion` · `admin_upload` · operator/canonical · **다른** `supplier_upload` · **기존 `source=NULL`**)는 Supplier 가 삭제·대표 교체 대상으로 쓸 수 없다.

### G-1 기존 `source=NULL` — backfill 금지

프로덕션 `product_images` 2,792행 중 `source` NULL **100%**, 공급자 user 가 `created_by` 인 행 **0**(IR §2). 과거 데이터를 Supplier 소유라고 **추측하지 않는다.** NULL → `supplier_upload` backfill **금지**. NULL 은 "출처 불명" = Supplier 수정 불가로 취급한다.

### G-2 대표 이미지 — **가장 강한 STOP 조건** (중지 조건 B)

**실측 확인(작성 시점 코드)**: [`catalog.service.ts:776`](../../apps/api-server/src/modules/neture/services/catalog.service.ts) `setPrimaryImage(imageId, masterId)` 는

```sql
UPDATE product_images SET is_primary=false WHERE master_id=$masterId AND is_primary=true;  -- 출처 불문 전부 해제
UPDATE product_images SET is_primary=true  WHERE id=$imageId AND master_id=$masterId;
```

즉 **`is_primary` 는 master 당 1개인 canonical 개념이고 per-source 대표가 스키마에 없다.** 따라서 "자기 업로드분만 대표 지정" 을 허용해도 그 행위는 **여전히 다른 출처(운영자·승격)의 canonical primary 를 해제**한다. 이는 최상위 불변식 위반이다.

**이번 WO 의 허용 규칙 (DDL 0 · 보수적)**:

```text
Supplier 의 대표 지정 허용 =
    대상 이미지가 내 supplier_upload 이고
    AND (master 에 현재 primary 가 없음  OR  현재 primary 가 내 supplier_upload 임)

그 외(현재 primary 가 admin_upload · candidate_promotion · 다른 supplier_upload · source=NULL)
    → 409 SUPPLIER_CANNOT_REPLACE_CANONICAL_PRIMARY (해제하지 않는다)
```

같은 이유로 **삭제** 도 대상 이미지가 현재 primary 이면 위 규칙을 적용한다(자기 것이 아니면 403, 자기 것이면 기존 "다음 이미지 승격" 동작 유지 — 단 승격 대상이 다른 출처면 승격하지 말고 primary 없음 상태로 둔다).

> **이 규칙으로도 다른 출처 canonical primary 가 해제·교체되는 경로가 남는다면 중지 조건 B 다.** DDL 없이 Supplier-local ownership 을 안전하게 보장할 수 없으면 **보고하고 임의 우회하지 않는다**(Offer 소유 이미지 테이블 신설은 별도 WO).

## H. Product Image controller 위치 정리

`admin.controller.ts` 안의 Supplier-facing 이미지 controller(961~)를 Supplier 도메인 위치로 이동한다.

```text
apps/api-server/src/modules/neture/controllers/supplier-product-image.controller.ts  (권장)
```

- **route path 는 필요 이상 변경하지 않는다.** 기존 클라이언트 호환 유지(마운트 지점만 이동).
- 이 파일이 자체 인라인 복제한 `requireActiveSupplier` 가 있으면 **기존 Neture identity middleware**(`createRequireActiveSupplier`) 재사용이 가능한지 검토한다.
- **권한 확대 금지** — 이동은 동치여야 한다.

## I. Legacy CSV Import backend 완전 은퇴

프런트는 이미 은퇴(`WO-O4O-NETURE-SUPPLIER-LEGACY-CSV-IMPORT-RETIREMENT-V1`). 남은 backend 를 제거한다.

```text
/supplier/csv-import/* 10 route (supplier-product.controller.ts 358~531)
GET /supplier/products/template (345)
csv-import.service.ts (1,391줄)
SupplierCsvImportBatch / SupplierCsvImportRow entity runtime registration
관련 supplier client dead code
```

**가장 중요한 이유**: `applyBatch()`(619~643)가 `masterRepo.create/save` 로 **ProductMaster 를 직접 생성**한다 — cutover 가 `POST /products` 를 은퇴시킨 뒤 남은 **마지막 Supplier HTTP → Master 직접 생성 경로**다.

```text
완료 계약: Supplier HTTP → ProductMaster 직접 create = 0
```

### I-1 DB — DROP 하지 않는다

`supplier_csv_import_batches` · `supplier_csv_import_rows` 는 **이번 WO 에서 DROP 하지 않는다. migration 0.** runtime entity registration(`modules/neture/entities/index.ts` · `database/entities.ts`)만 제거 가능한지 확인한다.

> 주의: 기존 migration 파일 4건(`20260301300000-CsvImportBatchTables` 등)과 `canonical-schema-baseline.ts` 가 이 테이블을 참조한다. **migration 파일과 baseline 은 접촉하지 않는다**(이력·스키마 기대값). entity 등록 제거가 schema 검증 게이트를 깨뜨리면 그 자체를 보고한다(중지 조건 F).

### I-2 다른 소비처 census (착수 시 재확인)

`operator-supplier-quality` 등 해당 테이블을 읽는 소비처가 남아 있으면 **함께 최신 census** 하여 `dead → 제거` / `live → STOP`. **과거 문서만 보고 삭제하지 않는다.**

## J. Dead code 정리 (착수 시 최신 main 재확인)

```text
SupplierService.hasApprovedPrivateSupply (supplier.service.ts 823)
supplier.ts 클라이언트 dead 6종: getCompleteness · getInventoryItem · submitForReview
                                 · updateRegistrationNumber · updateSpotPolicy · uploadEvidence
```

소비처가 생겼으면 제거하지 않는다.

---

# 3. Route/API 계약 변경 — 이 WO 의 승인 범위

의도적으로 은퇴/축소하며 **이 WO 의 승인에 포함**한다. 구현 착수 시 각 항목의 census(프런트 소비처 0 · 90일 traffic 0 · 배치 0)를 **재확인**한다.

| # | 대상 | 처리 |
|---|---|---|
| 1 | `GET /supplier/dashboard/ai-insight` | 제거. Supplier frontend consumer 도 **같은 배포에서** 제거 |
| 2 | store-ai Supplier actor **write** capability | 제거(§F — `render_read` 불변) |
| 3 | `/supplier/csv-import/*` · `GET /supplier/products/template` | 제거 |

프런트 redirect 2건(`/supplier/b2b-content` · `/supplier/supply-offers` → `/supplier/products`)도 이 승인에 포함한다.

---

# 4. 실행 순서 (권장)

1. **착수 census 재확인** — §2 의 각 "재확인" 항목 + §3 의 3건. 최신 `origin/main` 기준. 결과를 CHECK §11 에 기록.
2. **backend 먼저**: §G 이미지 ownership 규칙 → §H controller 이동 → §F store-ai write deny(+spec 갱신) → §E-2 ai-insight route 제거 → §I CSV 은퇴 → §J dead code.
3. **frontend**: §E-1 AI 태그 제거 → §A Drawer 분해 → §B Products 축소 → §D B2B 은퇴 → §C SupplyOffers fold + redirect 2건.
4. **운영자 회귀 확인**(§A 마지막) — `OperatorProductApprovalPage` 가 분해된 Drawer 로 동일 동작.
5. 검증(§6) → 배포(§8) → CHECK 작성 → path-specific stage → `node scripts/git/check-staged-scope.mjs <경로>` → `git commit -- <경로>` → push. **코드 CI 완주 후 CHECK 커밋**(문서 커밋이 코드 CI 를 취소하지 않도록).

---

# 5. 하지 않는 것

```text
supplier_csv_import_* 테이블 DROP · 새 image ownership 테이블 · DB migration (전부 0)
OfferService 대분할 · NetureService facade 분할
Orders 리팩토링 · Supplier Content 리팩토링          ← IR §6 drift 0 판정
KPA supplier content-submissions 정리 · cms serviceKey 정리   ← KPA/Store Workspace 소유
WebMCP · Product Registration ⑦(Candidate 입력 보조) 재작업
product_ai_tags / product_ai_contents 테이블 삭제
store-ai router 삭제 · Admin/Store 의 store-ai 권한 변경
판매자 모집 · Market Trial · Event Offer · Pharmacy-Hub 제공 설정 통합
```

Orders 와 Content 는 IR 에서 **drift 없음**으로 판정됐으므로 불필요하게 접촉하지 않는다.

---

# 6. 검증

## 6.1 Product boundary

```text
Supplier Offer edit  → ProductMaster 기준정보 write 0
Supplier UI          → product_masters.tags write 경로 0
Supplier HTTP        → ProductMaster create 경로 0        (§I 완료 계약)
```

source-contract 테스트로 고정(파일 원문 + route 부재).

## 6.2 Internal AI zero

Supplier 표면(`services/web-neture/src/pages/supplier/**` · `components/supplier/**` · supplier product 관련 client)에서 `/ai-tags` · `ai-insight` · `runAIInsight` · 내부 AI generate/execute 진입 **0**. **외부 LLM `ChatGPT로 작업` 계약은 유지**(`storeContentAuthoringPrompt` 계열 · 접촉 0).

## 6.3 Images

```text
Supplier upload            → source='supplier_upload' · created_by 기록
Supplier → 다른 출처 image delete           403
Supplier → 다른 supplier 의 image delete     403
Supplier → source=NULL image delete/primary 403 (출처 불명)
Supplier → 자기 image 관리                  허용
대표 지정: 현재 primary 가 다른 출처         409 SUPPLIER_CANNOT_REPLACE_CANONICAL_PRIMARY
           primary 없음 또는 내 것           허용
```

**대표 이미지 변경은 canonical ownership 안전성까지 테스트한다** — 다른 출처의 `is_primary` 가 해제되지 않음을 DB 관측(또는 동치 fake)으로 증명.

## 6.4 B2B · Supply Offers

```text
B2B edit entry = ProductDetailDrawer 1곳 · SupplierB2BContentPage runtime 0 · /b2b-content = redirect
SupplierSupplyOffersPage runtime 0 · /supply-offers = /supplier/products redirect
B2B 저장 계약(businessShort/DetailDescription) · B2C fallback 불변
```

## 6.5 CSV

```text
csv-import Supplier route = 0 · products/template legacy = 0 · Supplier HTTP Master create = 0
DB table 유지(DROP 0 · migration 0)
```

## 6.6 Operator regression

`OperatorProductApprovalPage`: Drawer 표시 · 승인/반려 · Master read-only — **회귀 0**.

## 6.7 Orders / Content

관련 핵심 경로 `git diff` **0** 또는 의도된 공통 파일 변경만(그 경우 근거를 CHECK 에).

---

# 7. 테스트

필수:

```text
SupplierProductsPage
refactored ProductDetailDrawer sections
OperatorProductApprovalPage Drawer integration
B2B redirect · SupplyOffers redirect
image ownership (업로드 source · 삭제 403 4종 · 대표 지정 409/허용)
store-ai Supplier actor write deny (+ render_read 불변 회귀)
csv route absence
Supplier Master-write source-contract
Supplier internal-AI-zero source-contract
```

기존 관련 regression suite 도 실행한다(특히 `product-ai-global-access.spec.ts` · `supplier-product.from-master.controller.test.ts` · promotion/adapter 계열).

`web-neture` + `api-server`: `tsc` · `eslint` · `build` · 관련 테스트 **PASS**. CI 게이트는 `node scripts/lint-ratchet.mjs`.

> 로컬 팁(② CHECK §5): api-server 전체 jest 는 기본 워커에서 heap OOM → `NODE_OPTIONS=--max-old-space-size=6144 npx jest --maxWorkers=1`(약 16분). `main-site-full-source-deletion.spec` 은 로컬 빌드 잔재로 항상 FAIL(무관 · 접촉 금지). api-server build 전 `packages/*` dist 가 stale 이면 먼저 패키지 build.

---

# 8. 배포 · smoke

- **backend + web-neture 를 같은 완료 흐름에서 배포**한다(§3 #1 은 route 와 consumer 가 같은 배포에 있어야 한다).
- **비파괴 smoke 우선.** 운영 데이터 mutation 을 smoke 목적으로 **새로 만들지 않는다.**
- 인증된 ACTIVE Supplier 계정이 없으면 `AUTHENTICATED_UI_SMOKE = PENDING` 으로 기록하며 **이 사유만으로 완료를 막지 않는다**.
  > 현재 알려진 차단(③ CHECK §7): super_admin 문서 계정은 `users.password IS NULL`(Google-only) · 사용자 본인 계정은 전역 `428 TERMS_ACCEPTANCE_REQUIRED` gate(약관 동의는 본인의 법적 행위 · 대행 금지) · `neture_suppliers.user_id` 전부 NULL. **이 상태를 smoke 목적으로 수정하지 않는다.**
- 미인증 계약 확인(401/404/redirect)은 가능한 범위에서 수행한다.
- **read-only before/after counts**: `supplier_product_offers` · `product_masters` · `product_images` · `product_ai_tags` · `product_ai_contents` · `supplier_csv_import_batches`.

---

# 9. 중지 조건

임의 구현하지 않고 **보고 후 대기**한다.

| # | 조건 |
|---|---|
| **A** | ProductImage 를 현재 schema 로 supplier ownership 안전하게 제한할 수 없음 |
| **B** | **Supplier 대표 이미지 변경이 다른 공급자/운영자 canonical primary 를 반드시 변경하게 됨** (§G-2 규칙으로도 회피 불가) |
| **C** | CSV legacy route 에 실제 외부 consumer 또는 최근 production traffic 발견 |
| **D** | store-ai Supplier actor write 제거가 Store/Admin 실제 소비처를 깨뜨림 (또는 `render_read` 를 불변으로 유지할 수 없음) |
| **E** | `OperatorProductApprovalPage` 의 Drawer 공유 때문에 Supplier/Operator 권한을 안전하게 분리할 수 없음 |
| **F** | DB migration · 새 테이블이 반드시 필요 (entity 등록 제거가 schema 게이트를 깨는 경우 포함) |
| **G** | package/lockfile 구조 변경이 필요 |
| **H** | 타 세션과 동일 파일 충돌 |

---

# 10. 완료 보고 (CHECK 필수 항목)

1. 최종 Supplier product-management 구조(화면 · route · 소유 API)
2. **ProductMaster / SupplierProductOffer 수정 책임표** — 어느 필드를 누가 쓰는가
3. Drawer 분해 결과(파일 · 줄 수 · `approvalActions` 계약 유지 증명)
4. B2B / SupplyOffers retirement 결과(redirect · runtime 0 증명)
5. **Supplier 내부 AI 잔재 0 증명**(검색 축 · 결과)
6. **ProductImage ownership 최종 계약** — 허용/거부 매트릭스 · 대표 이미지 규칙 · canonical primary 불변 증명
7. CSV backend retirement · **Supplier HTTP Master-create 0** 증명
8. route/API 은퇴 결과(§3 3건 + redirect 2건) · 착수 시 census 재확인 결과
9. Operator 회귀 결과
10. 테스트 · 배포 · smoke(또는 `AUTHENTICATED_UI_SMOKE = PENDING` 사유)
11. 프로덕션 read-only before/after(§8 6개 테이블)
12. 문서 정합: `발견 N건 / SUPERSEDED 표기 N건 / 링크 수정 N건 / 별도 WO 제안 N건`
13. commit hash · `HEAD == origin/main`

> **이 WO 완료 후 등록 후 상품관리 리팩토링을 다시 작은 후속 WO 로 나누지 않는다.** 그 시점에 Supplier Products 축을 닫고, 실제 잔여가 있으면 **Supplier 전체 closeout census** 로 넘어간다.
