# IR-O4O-NETURE-SUPPLIER-STORE-CONTENT-QR-TABLET-FLOW-AUDIT-V1

> 성격: **read-only 조사(IR)**. 코드/DB/마이그레이션/시드/배포 변경 없음.
> 저장소: https://github.com/Renagang21/o4o-platform · 작업 위치: `C:\Users\sohae\coding\o4o-platform` (Laptop)
> 작성일: 2026-07-12 · 상태: 조사 완료 (2026-07-12 D1 정정 반영)
> 목표 흐름: `공급자 상품 → 매장용 상품 설명서 작성 → QR 자동 연결 → 태블릿/매장 콘텐츠 세트 → 매장 경영자 선택·활용`

> **★ 정정 (2026-07-12, 사용자 결정 반영) — 아래 본문의 `SUPPLIER_STORE 권장` 취지 전부에 우선한다**
> 1. 설명서 타입은 **작성 주체가 아니라 용도** 기준이다: `B2B`(거래·사업자용) / `B2C`(소비자 안내용) / `STORE`(매장 활용용).
> 2. 공급자가 작성하는 매장용 설명서의 타입은 **`description_type=STORE`** 이다. `SUPPLIER_STORE`는 "누가(SUPPLIER) + 어디에(STORE)"를 섞어 타입 체계를 무너뜨리므로 **신규 구현 타입으로 사용하지 않는다** (같은 STORE 용도를 운영자/AI/매장이 만들면 `OPERATOR_STORE`, `AI_STORE`… 로 무한 증식하게 됨).
> 3. "공급자가 작성"은 타입이 아니라 **출처·작성자 메타데이터**로 구분한다: 기존 `source_type='supplier'` + 신규 `created_by_role` / `created_by_supplier_id` / `reviewed_by_operator_id`.
> 4. 기존 enum의 `SUPPLIER_STORE`는 **deprecated(신규 생성 금지)** 로 두고, 참조 위치·데이터 존재 여부만 조사하며 **삭제는 별도 WO로 분리**한다.
> 5. 부수 확인: 공개 랜딩 `/p/{key}`는 **이미 `description_type='STORE'` 만 렌더**(`product-landing.service.ts:178,197`)하므로 STORE 채택 시 **읽기 경로 코드 변경 0**. (`SUPPLIER_STORE`였다면 랜딩을 바꿔야 했음 — STORE 결정이 기존 배선과도 정합.)

---

## 0. Executive Summary (먼저 읽을 결론)

### 0.1 핵심 결론 3줄

1. **목표 흐름의 상당 부분은 이미 만들어진 구조를 재사용할 수 있다.** 상품 설명서 저장소(`shared_product_descriptions`, master 기준), 상품별 고정 URL(`/p/{public_key}`), 동적 QR(비저장), 매장 가져오기=복사(`asset-copy-core`), 태블릿 Screen Set/Block 모델이 모두 존재한다.
2. **그러나 "공급자가 직접 콘텐츠를 제작·게시·제공한다"는 방향의 일부는 동결된 거버넌스 베이스라인과 충돌한다.** `O4O-3-ROLE-FLOW-BASELINE-V1 §6`은 "공급자가 O4O에서 직접 HUB 콘텐츠를 제작·게시"하는 것을 **Drift(금지)** 로 명시하고, F4는 `producer='supplier'`를 **legacy/폐기 예정 예외**로 규정한다. 정식 흐름은 `공급자 원천자료 → 운영자 등록·검수 → 게시 → 매장 복사`다.
3. **정합적인 첫 구현은 "공급자가 작성하는 매장용 상품 설명서(`description_type=STORE` 초안)"다.** 설명서 타입은 용도(STORE) 기준이고, "공급자 작성"은 타입이 아니라 출처·작성자 메타데이터로 구분한다. master 기준 SPD(STORE) + 운영자 canonical 승격 + 기존 `/p/{key}` 랜딩(이미 STORE 렌더) + 동적 QR을 그대로 활용한다. "태블릿 콘텐츠 세트를 공급자가 매장에 직접 배정"하는 부분은 **미구현 + 거버넌스 민감**이라 뒤로 미룬다.

### 0.2 사용자 판단이 필요한 결정

| # | 결정 사항 | 상태 / 방향 |
|---|-----------|-------------|
| **D1** ✅ **확정** | 공급자가 만드는 것 = master 기준 **`description_type=STORE`** 매장용 상품 설명서 **초안**. `SUPPLIER_STORE` 타입 미사용. 작성 주체는 `source_type='supplier'` + 작성자 메타(`created_by_role`/`created_by_supplier_id`)로 구분. 공급자 직접 HUB(POP/블로그/사이니지)·태블릿 세트 제작 금지 | 3-Role SSOT §6 준수. STORE는 이미 `/p/{key}`가 렌더 → 읽기 경로 변경 0 |
| **D2** | 공급자 STORE 초안을 **운영자 검수 없이 노출**할지, **운영자 canonical 승격 후 노출**할지 | 권장: canonical 승격 후 노출(SPD·3-Role·F4 정합) |
| **D3** ★ | 상품 랜딩 `/p/{key}`·QR 랜딩을 **로그인 게이트(비공개)** 로 만들지 | 사용자 정책("비공개")과 **현재 코드(전면 공개·무인증)** 정면 충돌 → **별도 WO** |
| **D4** | 태블릿 공급자 콘텐츠 세트 = **운영자 template → 매장 복제**(스키마 예약) vs 그 외 | `supplier` origin은 태블릿 모델에 없음. import/duplicate는 미구현(net-new) |

D1은 확정. D2~D4(특히 D3) 확정 후 첫 WO를 뽑는 것을 권장한다.

---

## 1. 조사 방법 및 범위

- 8개 축(A~H)을 6개 병렬 read-only 조사로 수행. 모든 주장은 `파일:라인` 근거를 동반.
- 근거 코드: `apps/api-server/src/modules/neture/**`, `apps/api-server/src/routes/platform/**`, `services/web-neture/**`, `services/web-kpa-society/**`, `packages/asset-copy-core/**`, `packages/content-editor/**`, `packages/types/**`.
- 근거 문서(권위): F12 `docs/baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md` + **V2 amendment**, `O4O-3-ROLE-FLOW-BASELINE-V1.md`, F4 `PLATFORM-CONTENT-POLICY-V1.md`, `STORE-LAYER-ARCHITECTURE.md`, `O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md`.
- DB 직접 조회는 **이 워크스페이스(Laptop)의 방화벽 제약(outbound 5432 차단, `gcloud sql connect` 행업)** 으로 수행하지 않음. 코드·마이그레이션·엔티티 기준으로 스키마를 확정. 실제 row 집계가 필요하면 Cloud Console SQL Editor에서 read-only로 별도 확인 권장.

---

## A. 공급자 대시보드와 온보딩 상태 구조

### A-1. 화면·라우트 (주의: "공급자 대시보드"가 3종)

| 라우트 | 레이아웃 | 컴포넌트 | 성격 |
|--------|----------|----------|------|
| `/supplier` | 없음(공개) | `SupplierLandingPage.tsx:87` | 마케팅 랜딩(앱 대시보드 아님) |
| `/supplier/dashboard` | `SupplierSpaceLayout` | `SupplierDashboardPage.tsx:34` | **실제 첫 화면 / AI Copilot 8-block** |
| `/account/supplier` | `SupplierAccountLayout` | `App.tsx:826` | 상품/주문/재고/정산 "계정" 표면 |

라우트 가드: `SupplierRoute`(`RoleGuard.tsx:188-198`, `allowedRoles=SUPPLIER_ROLES` + `requireMembership="neture"`) → `SupplierSpaceLayout`에서 2차 역할검사(`SupplierSpaceLayout.tsx:262`).

### A-2. 사이드바 메뉴 (신규 진입점 후보)

`SUPPLIER_SIDEBAR_GROUPS` = `services/web-neture/src/components/layouts/SupplierSpaceLayout.tsx:53-125`. 주요 그룹: Overview / **제품 관리**(제품 목록·등록·대량등록·등록도우미·**제품 콘텐츠 관리 `/supplier/b2b-content`**) / 공급 오퍼 / 판매자 모집 / 유통참여형 펀딩 / 이벤트 오퍼 / 주문·배송 / Finance / 설정(공급자 정보) / Community.

- **신규 "매장용 콘텐츠" 진입점 후보**:
  1. **1순위 — 사이드바 그룹 배열**(`SupplierSpaceLayout.tsx:53-125`): "제품 관리"(끝 73행)와 "공급 오퍼"(74행) 사이에 신규 그룹, 또는 제품 관리 그룹 `items`에 항목 추가. 기존 `제품 콘텐츠 관리 → /supplier/b2b-content`는 **B2B(공급자→판매자)** 콘텐츠로, 의미상 인접하나 "매장용(STORE)"과는 다름 → 혼동 주의.
  2. 대시보드 `QUICK_LINKS`(`SupplierDashboardPage.tsx:431-439`).
  3. 대시보드 CTA 블록(`SupplierDashboardPage.tsx:182-212`, 기존 "유통참여형 펀딩" 카드 패턴).
  - 신규 메뉴는 반드시 `App.tsx:772-813`의 `SupplierSpaceLayout` 블록에 `<Route>`를 동반해야 함(CLAUDE.md §1 "데드링크 0").

### A-3. 온보딩 체크리스트

- **전용 "할 일 목록" UI 없음.** 가장 근접한 것은 PENDING 배너(`SupplierActivationGate mode="banner"`, `SupplierActivationGate.tsx:104-129`)와, 소비되지 않는 `GET /supplier/profile/completeness` 엔드포인트(`supplierProfileApi.getCompleteness` — 프론트 소비처 없음).
- 백엔드 `GET/PATCH /supplier/onboarding`(`supplier-management.controller.ts:185-215`)는 **정산/서류 폼**(사업자등록증·통신판매업)이지 작업 체크리스트가 아님.
- → **온보딩 체크리스트는 신규 구현 영역**(WO 후보 1).

### A-4. PENDING/ACTIVE/INACTIVE/REJECTED 게이트

- 상태 enum: `NetureSupplier.entity.ts:11-16` = `PENDING|ACTIVE|INACTIVE|REJECTED`(기본 PENDING).
- **게이트는 사실상 "ACTIVE vs not-ACTIVE" 이진.** INACTIVE/REJECTED는 PENDING과 동일 취급.
  - 백엔드: reads = `requireLinkedSupplier`(`neture-identity.middleware.ts:75-94`), writes = `requireActiveSupplier`(`:41-68`, 비-ACTIVE면 403 `SUPPLIER_NOT_ACTIVE`).
  - 프론트: `SupplierActivationGate mode="gate"`는 ACTIVE일 때만 children 렌더. **상품 등록 4개 진입(register/new/bulk/import-assistant) 모두 gate**로 PENDING 차단(`SupplierProductRegisterEntryPage.tsx:57`, `SupplierProductCreatePage.tsx:496`, `SupplierBulkRegisterPage.tsx:127`, `SupplierProductImportPage.tsx:543`).

| 화면 | route | PENDING | ACTIVE | 신규 콘텐츠 진입점 후보 |
|------|-------|:------:|:-----:|------|
| Dashboard | `/supplier/dashboard` | ✅(배너) | ✅ | ✅ QUICK_LINKS/CTA |
| 제품 목록 | `/supplier/products` | ✅ read | ✅ | — |
| 제품 등록(4종) | `/supplier/products/*` | ❌ gate | ✅ | — |
| 제품 콘텐츠 관리(B2B) | `/supplier/b2b-content` | ✅ view/❌ write | ✅ | ⚠ 인접(B2B, STORE 아님) |
| 공급자 정보 | `/mypage/business-profile` | ✅ read/❌ PATCH | ✅ | — |

> **함의**: PENDING 공급자는 상품 등록 자체가 막혀 있으므로, "PENDING이 매장용 설명서 초안 작성"을 하려면 상품이 이미 있어야 함. 현재 구조에서 PENDING은 상품이 없을 가능성이 큼 → 초안 작성 대상 부재. (D2 / 원칙 5와 연결)

---

## B. 공급자 상품 등록·상품 상태

### B-1. 중요 전제: ProductMaster/Offer 정의가 2벌

- **Neture(활성)**: `product_masters`(`ProductMaster.entity.ts:36`) + `supplier_product_offers`(`SupplierProductOffer.entity.ts:35`).
- dropshipping-core(별도/legacy): `dropshipping_*` — neture 모듈이 참조 안 함. 이하 분석은 전부 Neture 모델.

### B-2. 엔티티·관계

- **Offer가 소유측**: `supplier_product_offers.master_id → product_masters` `onDelete RESTRICT`(`SupplierProductOffer.entity.ts:40-45`). `ProductMaster.offers`는 역방향 `@OneToMany`(`:182`).
- **1 master ↔ N supplier offers**, 단 `UNIQUE(master_id, supplier_id)`(migration `20260301100000:115-116`) — 공급자당 master별 1 offer.
- 다운스트림: `product_approvals`(offer_id 기준, KPA 2차검수 브릿지), `organization_product_listings`(master_id NOT NULL + offer_id nullable, 매장 진열).
- `store_local_products`는 **ProductMaster/Offer와 FK 없음** — 매장 자체 등록 상품(별개 도메인).

### B-3. 상태 축(서로 독립)

1. **Offer 승인**(파생): `PENDING/APPROVED/REJECTED`, SSOT = `offer_service_approvals`(`pending/approved/rejected/cancelled`). 파생 규칙 `offer-service-approval.service.ts:421-439`.
2. **유통 유형**: `PUBLIC/SERVICE/PRIVATE` = `isPublic + serviceKeys`에서 파생(`SupplierProductOffer.entity.ts:62-74`). PUBLIC은 승인 무관 게이트 예외.
3. **Offer 활성** `is_active`(생성 false → 승인 true → 거절/취소/soft-delete false).
4. **org/KPA 2차 승인** `product_approvals`(`pending/approved/rejected/revoked`).
5. **Master 라이프사이클** `product_masters.status`(`ACTIVE/SUSPENDED/ARCHIVED`) — 직교, **비-cascade**.

### B-4. 등록 후 가능 액션 (컨트롤러 `supplier-product.controller.ts`)

모든 mutation은 `requireActiveSupplier`. 등록(→PENDING) → 편집/유통설정/서비스가격 → **승인요청(submit-approval)**. 공급자측 "publish" 없음. 판매가능은 **운영자 승인**으로만 도달.

### B-5. 승인 전 콘텐츠 부착 가능? — **YES**

- Offer 생성 시 `consumerShort/DetailDescription` 즉시 저장(승인 무관, `offer.service.ts:1003-1004`).
- PENDING/REJECTED에서도 설명 편집 가능(`updateSupplierOffer :1129`, `updateBusinessContent :1303`) — 거절후 재제출 흐름이 이에 의존.
- master 기준 `shared_product_descriptions`는 승인 상태와 무관하게 부착(§C).
- → **승인은 "판매/노출"을 게이트하지, "콘텐츠 작성"을 막지 않는다.** 목표 흐름(등록 직후 초안, 배포는 승인 후)은 구조적으로 가능.

### B-6. 삭제/비활성 cascade

- 공급자 bulk 삭제 = **HARD delete**(`offer.service.ts:1721`) → approvals/listings CASCADE. master는 RESTRICT로 보존.
- 운영자 soft-delete + 휴지통(승인상품): `deleted_at` 세팅, 목록에서 제외(`operator-product-cleanup.controller.ts:355`).
- 거절 cascade: listings `is_active=false`(비삭제).
- **Master hide(SUSPENDED/ARCHIVED)는 의도적 비-cascade** — "참여자·공급자·매장·주문·콘텐츠·**QR·POP** 등 사용처 데이터는 일절 변경하지 않는다"(`product-master-status.controller.ts:10-11`). → 상품 숨김 시 QR/콘텐츠 orphan 정책은 **설계상 "건드리지 않음"** 이 기본. (콘텐츠 노출 차단은 별도 `exposure_state`로 처리, §D)

---

## C. 상품 설명서/콘텐츠 저장 구조 (가장 중요)

### C-1. 저장소: `shared_product_descriptions`(SPD), **master 기준**

`SharedProductDescription.entity.ts` → table `shared_product_descriptions`(`:91`). 주요 컬럼:
- `master_id`(uuid NOT NULL, `onDelete CASCADE`) — **키는 ProductMaster**(`:99-106`).
- `content`(HTML text), `summary`.
- `source_type`(varchar32) — **생산 주체/출처**: `supplier|operator|ai|store_contribution|drug_extension|mfds_*|migration|manual`(`:34-55`).
- `description_type`(varchar32, DEFAULT `'STORE'`) — `B2B|B2C|STORE|SUPPLIER_STORE`(`:79`). **신규 매장용 = `STORE`. `SUPPLIER_STORE`는 사용 안 함(정정).**
- `status`(varchar32, DEFAULT `'candidate'`) — `candidate|canonical|hidden|needs_review|deprecated`(`:58-71`).
- `language`(varchar16, DEFAULT `'ko'`; 허용 `ko/zh/en/ja`).
- **`created_by`(user uuid)만 존재. `organization_id`/`created_by_role`/`created_by_supplier_id`/`reviewed_by_operator_id`/`source_origin` 컬럼 없음** → 작성 주체 구분용 **최소 메타데이터 추가 WO 필요**.
- 미디어는 SPD에 없음. 이미지는 master 기준 `product_images`(`gcs_path`, GCS)로 분리.

### C-2. DescriptionType — 용도 기준 3종 + deprecated 1종

| 타입 | 의미 | 작성자(예) |
|------|------|-----------|
| `B2B` | 거래·공급·사업자용 | 공급자/운영자 |
| `B2C` | 일반 소비자 안내용 | 운영자/검수자 중심 |
| `STORE` | **매장 경영자가 고객 응대·QR·태블릿에 활용** | 공급자/운영자/AI/매장 |
| ~~`SUPPLIER_STORE`~~ | **(deprecated)** 작성자+용도 혼합. 신규 생성 금지 | — |

- **`SUPPLIER_STORE`는 이미 enum에 있으나 "생산 경로 0건인 죽은 값".** 참조 위치(전량):
  - 엔티티 타입/배열/주석: `SharedProductDescription.entity.ts:76, 79, 85, 121`
  - 마이그레이션 주석(값 나열만): `20261223000000-AddDescriptionTypeToSharedProductDescriptions.ts:8, 14`
  - admin allow-list + 라우트 주석: `product-master-description.controller.ts:10, 14, 48, 49, 70, 96`
  - **어떤 write/seed도 이 값을 설정하지 않음** — 공급자 offer는 `source_type='supplier'` + `description_type='STORE'`(기본)로 시드(`shared-product-description.service.ts:325-363`).
- 프론트 `ProductLandingPage.tsx:216`의 `variant="store-description"`는 **CSS 렌더 variant**(`ContentRenderer.tsx:54`)이지 `description_type`이 아님 — 이름만 유사(직교).
- **처리 방침(정정)**: `SUPPLIER_STORE`는 **deprecated**로 두고 신규 생성 금지. 삭제/legacy-alias 처리는 (a) 참조 제거 (b) 데이터 0건 확인 후 **별도 WO**로. 지금 enum 제거 금지.

### C-3. 키잉 모델 — **ProductMaster(F12 canonical)**

- F12 불변식 ②(`O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V1.md:49`): "canonical = (master, resourceType, descriptionType) 당 1개 … `(master_id, description_type)` partial unique". 실제 인덱스는 language까지 확장: `uniq_...canonical_per_master_type_lang ON (master_id, description_type, COALESCE(language,'ko')) WHERE status='canonical'`(`20261228000000`).
- F12 불변식 ⑥: "ProductMaster는 Resource를 모른다 — Resource → ProductMaster 단방향".
- **SupplierProductOffer는 canonical 키가 아니라 `source_ref_id`(출처)일 뿐.** → 매장 경영자가 ProductMaster 중심으로 보는 것과 정합.

### C-4. 콘텐츠 상태/검수 모델 (Axis G 콘텐츠 파트)

- SPD 상태 5종(위). 후보-드래프트 풀(master 없는) `product_candidate_description_drafts`는 별도 상태 `draft|needs_review|approved|rejected|hidden|deprecated`.
- **운영자 검수 컨트롤러/라우트는 제거됨**(`...REVIEW-REMOVE-V1`, `product-master-description.controller.ts:6-8`) — 서비스 메서드(`listForReview/getReviewDetail/setStatus/setCanonical/bulkCanonicalApply`)는 유지.
- 현존 admin STORE 저장 경로는 `createCandidate → setCanonical` **직접 승격(이중게이트 없음)** — 기존 audit(`IR-O4O-STORE-PRODUCT-DESCRIPTION-POLICY-CODE-AND-DOC-AUDIT-V1.md:248`)가 "J-2b 이중게이트 누락"으로 지적. ADMIN 로그인만 가드.
- → **D2 결정 필요**: 공급자 STORE 초안 → 운영자 canonical 승격을 강제할지. (권장: 강제)

### C-5. 공급자 vs 운영자 구분 — 타입이 아니라 메타데이터

- 현재 구분은 `source_type='supplier'|'operator'`로만 존재. **작성 주체 세분(역할·supplier_id)·검수자·org 소유 컬럼 없음.**
- `HubProducer='supplier'`는 F4 정책문서 개념일 뿐 SPD 스키마에 미배선.
- **정정된 목표 스키마(공급자 STORE 설명서)**:
  ```
  ProductMaster
  → shared_product_descriptions
     description_type = STORE            (용도)
     status          = candidate → (운영자) canonical
     source_type     = supplier          (기존 컬럼)
     created_by_role         = supplier  (신규 메타)
     created_by_supplier_id  = ...        (신규 메타)
     reviewed_by_operator_id = ...        (신규 메타)
  ```
  운영자 직접 작성분도 동일 타입(STORE) + `source_type=operator`.
- 예약 WO는 **이름을 정정**해야 함: 기존 `WO-O4O-PRODUCT-CONTENT-SUPPLIER-STORE-PRODUCER-V1`(SUPPLIER_STORE 산출)은 **STORE + supplier 메타 산출**로 방향 수정. 보조 `WO-O4O-SPD-AUTHOR-SUBJECT-METADATA-V1`(작성 주체/검수자 메타 컬럼 추가)이 선행/동반돼야 함.

### C-6. 포맷·미디어·i18n

- 리치텍스트 = **TipTap**(`@o4o/content-editor`), 저장은 `sd-*` 시맨틱 클래스 HTML(무 `<style>`). write 시 `sanitizeDescriptionHtml`(jsdom+DOMPurify), read 시 `sanitizeRichHtml`.
- 이미지 = master 기준 `product_images` → GCS(webp 리사이즈).
- 다국어 = language별 canonical(ko/zh/en/ja). 공개 랜딩은 canonical STORE 언어 목록 제공 + 로케일 폴백(`product-landing.service.ts:174-197`).

---

## D. QR / Resource / 고정 URL

### D-1. 라이브 SSOT = F12 **V2 amendment** (`/p/{key}`)

- F12 V1의 `/r/{resourceId}`는 **미구현 + 금지**(`IR-O4O-PRODUCT-TO-QR-FLOW-AUDIT-V1.md:72`, `WO-...-MINIMAL-V1.md:52`).
- V2 amendment(2026-07-09)가 라이브 SSOT: **`/p/{public_key}` = ProductMaster당 1개 안정 공개키(opaque 12자)**. 불변식 ⑦ "ProductMaster당 Product Landing 1개·대표 QR 1개(UNIQUE)".
- 저장 테이블 `product_landings`(`20261225000000`): `public_key VARCHAR(32)`, `product_master_id`, `exposure_state`, `deleted_at`. Landing → Master 단방향(불변식 ⑥ 준수).

### D-2. QR = **비저장·동적 생성**(확정)

- `qr-print.service.ts:8-9` "QR은 DB에 저장하지 않음(온디맨드 생성)". `generateQrSvg/Png/DataUrl(url)`.
- 저장하는 것은 **QR 이미지가 아니라 랜딩 신원**(`product_landings.public_key`).
- 단, **매장 QR 정의**는 row로 존재: `store_qr_codes`(`organization_id`, slug, landing_type, target) + `operator_qr_templates`(운영자 HUB 템플릿 → 매장이 자기 `store_qr_codes`로 복사). QR "이미지"는 여전히 비저장.

### D-3. 설명서 저장 → Resource 자동 생성? — **아니오(현재는 lazy)**

- 설명서 저장 컨트롤러는 `product_landings`를 전혀 참조하지 않음. Landing은 **첫 QR 요청/운영자 mint 시 idempotent lazy 생성**(`mintForMaster`, `product-landing.service.ts:92-131`).
- V2 amendment §4: "설명 없으면 QR 없음"은 폐기 — **모든 master가 Landing 대상**.
- **공개 랜딩은 `description_type='STORE'` canonical만 렌더(`product-landing.service.ts:178, 197`)** → 정정된 STORE 방향과 정합(추가 타입 노출 결정 불필요).
- → **원칙 4("저장·QR 분리 금지, published되면 QR 자동 연결")** 정합: master에 STORE canonical이 존재하면 `/p/{key}`가 즉시 렌더 → master 수준에서 **QR 사실상 자동 연결**. 문자 그대로 "저장 시 자동 mint"까지 하려면 소폭 조정(저장→mint 트리거).

### D-4. 로그인 게이트 정책 충돌 — **★ D3 (중대)**

- 사용자 정책: "O4O 상품 설명서는 공개 인터넷 콘텐츠로 제공하지 않음, 비로그인 접근 차단, O4O 내부 자유 활용".
- **현재 코드는 정반대 — 전면 공개, 무인증**:
  - 프론트 `/p/:publicKey`, `/qr/:slug`는 `App.tsx:667-668`에서 **모든 가드 밖**(레이아웃 없음 블록).
  - 백엔드 `GET /api/v1/public/product-landings/:publicKey`(`product-landing.controller.ts:34` "무인증 공개"), `GET /qr/public/:slug`(`store-qr-landing.controller.ts:11` "PUBLIC no auth").
  - 유일한 게이트는 `exposure_state`(규제 회수용)이지 로그인 아님.
- → **이 정책을 적용하려면 랜딩 라우트+API에 인증을 추가하는 별도 WO/결정 필요.** 목표 흐름의 QR 축은 "인증 랜딩"을 전제로 하므로 D3를 먼저 확정해야 함.

### D-5. 매장별 vs 전역 QR

- 전역(계층1): `product_landings`(master 기준, `/p/{key}`).
- 매장별(계층2): `store_qr_codes`(`organization_id`) + `operator_qr_templates`(운영자→매장 복사).
- → 목표는 "공급자가 매장에 제공하는 상품 콘텐츠"이므로 **처음부터 매장별 복잡성을 만들지 말고 전역 product Landing을 우선 활용**하는 것이 구조적으로 자연스러움(사용자 D-4 전제와 일치).

---

## E. 매장 경영자의 콘텐츠 가져오기

### E-1. 가져오기=복사 흐름 **이미 존재**(HUB 콘텐츠 대상)

- 진입 UI: `HubContentLibraryPage.tsx`("내 약국에 복사"). 복사 액션 = `assetSnapshotApi.copy(...)` → `POST /copy`(`create-asset-copy-controller.ts:68`).
- 3개 매장 서비스(KPA/GlycoPharm/K-Cosmetics)에 동일 존재.

### E-2. 복사 의미론 — **COPY(매장 소유 사본), 참조 아님**

- `asset-copy.service.ts:111-136`: `o4o_asset_snapshots`에 **원본 FK 없는 독립 row** 생성. `asset-snapshot.entity.ts:9-13` "No FK to source — snapshot is an independent copy". 원본 수정·삭제가 사본에 무영향.
- → **원칙 3("가져오기=복사")와 정확히 일치.**

### E-3. HUB 생산자: 운영자 전용 (공급자 직접 게시 = 금지)

- `HubProducer = operator|supplier|community|store`(`packages/types/src/hub-content.ts:17`)이나, **F4가 `supplier`를 legacy/명문화된 예외**로 규정(`PLATFORM-CONTENT-POLICY-V1.md §3.1/§3.2/§6.3/§10.5`).
- 라이브 쿼리는 전부 operator-only: `queryBlog/Pop/Qr/Video`가 `author_role='operator'` 하드필터(`hub-content.service.ts:159/521/704/599`).
- **3-Role SSOT §6(`O4O-3-ROLE-FLOW-BASELINE-V1.md:70`)**: "공급자가 O4O 시스템에서 직접 HUB 콘텐츠를 제작·게시" = **Drift(금지)**. 정식 흐름 §7: `공급자 원천자료 → 운영자 등록 → AI 초안 → 운영자 검수 → HUB 게시 → 매장 복사 → 매장 활용`.
- → **D1의 근거.** "공급자가 만든 콘텐츠를 매장이 가져간다"를 **HUB 콘텐츠 채널**로 구현하면 거버넌스 위반. **상품 설명서(SPD STORE) 채널은 별개이고 정합**(공급자 STORE 초안 → 운영자 canonical → 매장 활용).

### E-4. 매장 소유 사본 저장 테이블

| 계층 | 테이블 | 역할 |
|------|--------|------|
| INPUT | `o4o_asset_snapshots` | 복사된 스냅샷(불변, 원본 FK 없음) |
| CORE | `kpa_store_contents` | Store Production Material(매장 편집본; serviceKey 컬럼 없음, `organization_id` 격리) |
| OUTPUT | `store_execution_assets`/`store_pops`/`store_qr_codes`/... | 완성 실행 자산 |

- 복사본은 하단 작업막대에서 QR·POP·PDF 등 제작에 사용(`StoreLibraryContentsPage.tsx:110`, `StartProductionModal`).

### E-5. 노출 범위 스코핑 — **공급자/매장 타깃팅 불가**

- HUB 게이트 3축: `serviceKey`(서비스 격리) + `visibility`(global/service/store) + `producer`. **"공급자 X 상품을 취급하는 매장에만 노출" 메커니즘 없음.**
- 그런 스코핑은 HUB 콘텐츠 ↔ 매장 상품 카탈로그 간 cross-domain JOIN이 필요 → CLAUDE.md §7 Guard Rule 5(cross-domain JOIN 금지, WO 예외 필요) 위반.
- → **처음부터 매장-공급자 타깃 노출을 설계하지 말 것**(전역 product Landing로 단순화).

---

## F. 태블릿 / 매장 공간 콘텐츠

### F-1. 데이터 모델: store → tablet(코너) → Screen Set → Block

- `store_tablets`(org 기준, 1 태블릿=1 코너, `location`=라벨; `idle_playlist_items` jsonb; `current_screen_set_id`).
- `store_tablet_screen_sets`(`20270120000000`): `organization_id`, `tablet_id`**(nullable=매장 재사용)**, `origin CHECK(store|operator)`, `status CHECK(draft|active|archived|operator_template)`, `template_key`.
- `store_tablet_screen_blocks`: `block_type CHECK(idle_media|product_list|product_content|corner_description|health_info|staff_inquiry|qr_guide)`, `sort_order`, `is_visible`, `config` jsonb.
- 배정 = `store_tablets.current_screen_set_id`(NULL=legacy 경로).
- 관리 API `/api/v1/store/*`(`requireAuth+requirePharmacyOwner`, org 스코프): screen-sets CRUD + `POST/DELETE /tablets/:id/current-screen-set`.

### F-2. idle = **블록 타입**(별도 설정 아님)

- `idle_media` 블록(`TabletScreenSetManager.tsx:28`)이 기존 idle playlist/operator-common을 `source` 옵션으로 흡수(dual-read).

### F-3. 외부 제공 콘텐츠 세트 배정 — **미구현(net-new)**

- 스키마는 예약: `origin(store|operator)`, `status=operator_template`. 설계문서(`CHECK-O4O-KPA-TABLET-CORNER-SCREEN-SET-BLOCK-DESIGN-V1.md:76-77`)가 `POST /screen-sets/:id/duplicate`, `GET /operator-screen-set-templates`를 예정.
- **그러나 미구현**: `POST /screen-sets`는 `origin='store'` 하드코딩(`store-tablet.routes.ts:1230`), writable status에 `operator_template` 제외, duplicate/import 엔드포인트 grep 0건.
- **`supplier` origin은 태블릿 모델에 아예 없음.** 정식 통로는 operator_template → 매장 복제(D4).

### F-4. Resource/QR 재사용? — **대체로 분리**

- 태블릿 `qr_guide` 블록 = `{label,url}` 자유 텍스트, **F12 `/r/` 미사용**.
- `product_content` 블록은 `kpa_store_contents`(계층2 Store Production Material) 단방향 참조 — Resource 소비자이지 Resource/QR 구조 자체는 아님.
- → 태블릿은 별개 콘텐츠 시스템. 공급자 콘텐츠는 **매장 경영자가 가져와 Store Production Material로 만든 뒤 태블릿 블록이 참조**하는 간접 경로가 자연스러움.

---

## G. 권한·승인·검수 (종합)

### G-1. 공급자 라이프사이클
- ACTIVE 이진 게이트. PENDING은 대시보드/프로필 read·초안 편집 가능하나 **상품 등록 자체가 gate**(§A-4). INACTIVE/REJECTED=PENDING 취급.

### G-2. 콘텐츠 상태/검수
- SPD `candidate→canonical`(운영자 승격), 검수 컨트롤러 제거·서비스 유지, 현 admin 경로 이중게이트 누락(§C-4).

### G-3. 거버넌스 (★ 핵심)
- **3-Role SSOT §6**: 공급자 직접 HUB 제작·게시 = 금지. 정식 = 운영자 매개.
- **F4**: `producer='supplier'` legacy/폐기 예정.
- → 목표 흐름을 **"매장용 상품 설명서(SPD `STORE`, source=supplier, 운영자 검수)"** 로 좁히면 정합. **"HUB 콘텐츠(POP/블로그/사이니지) 공급자 직접 게시"** 로 넓히면 Drift.

### G-4. 권장 상태·권한 모델(조사 기반 제안, 결정 전제)
```
콘텐츠 상태(SPD 재사용): candidate → (운영자) canonical → hidden/deprecated
description_type = STORE (용도) · source_type = supplier (출처)
PENDING 공급자 : (상품이 있다면) STORE 초안 candidate 작성까지. 매장 노출 불가.
ACTIVE 공급자  : STORE candidate 작성 · 제출.
운영자        : 검수 → canonical 승격 · 숨김 · 노출범위.
매장 경영자    : 가져오기=복사 · 자기 매장 편집 · QR/태블릿 적용.
```

---

## H. 최소 구현 단위 제안 (결정 D2~D4 확정 후 / D1 확정됨)

> 전제: D1=STORE 설명서 채널(확정), D2=운영자 canonical 검수 유지, D3=랜딩 인증 정책 별도 확정, D4=태블릿은 operator_template.

| 순서 | WO 후보 | 재사용 자산 | 신규 필요 | 위험 |
|:---:|---------|-------------|-----------|------|
| 1 | **공급자 대시보드 온보딩 체크리스트 + "매장용 콘텐츠" 진입점** | `SupplierSpaceLayout` 사이드바, completeness API(미소비) | 체크리스트 UI, 메뉴+라우트 | 낮음(UI) |
| 2 | **상품별 `STORE` 설명서 초안 작성·저장·미리보기 (source=supplier)** | SPD 저장/`createCandidate`, `/p/{key}` 읽기(이미 STORE), `@o4o/content-editor`, `product_images` | STORE 설명서 **공급자 작성 진입/API**, 작성자 메타(WO-...-AUTHOR-SUBJECT-METADATA) | 중(검수 정책 D2) |
| 3 | **canonical 승격 시 QR 자동 연결·미리보기** | `product_landings` lazy mint, `qr-print.service`, `/p/{key}`(STORE 렌더) | 저장→mint 트리거(원칙4), **D3 인증 게이트** | 중~높(D3) |
| 4 | **매장 경영자 가져오기=복사** | `asset-copy-core`, `kpa_store_contents` | 상품설명서용 resolver/진입(현 HUB 채널과 별개 결정) | 중(채널 정합) |
| 5 | **태블릿 콘텐츠 세트 제공** | Screen Set/Block, `product_content` 블록 | operator_template 생성 + `duplicate` API(미구현) + 운영자 매개 | 높(net-new+거버넌스) |

---

## 4. 완료 기준 질문에 대한 답 (IR §7)

1. **어디에 새 서비스?** → `SupplierSpaceLayout.tsx:53-125` 사이드바(제품 관리↔공급 오퍼 사이) + `App.tsx:772-813` 라우트.
2. **매장용 설명서 저장 위치·타입?** → `shared_product_descriptions`(SPD), `master_id` 기준, **`description_type='STORE'`**, `source_type='supplier'` + 작성자 메타. (`SUPPLIER_STORE` 아님 — 정정)
3. **키잉?** → **ProductMaster**(F12 canonical). Offer는 `source_ref_id`.
4. **QR가 가리킬 대상?** → `neture.co.kr/p/{public_key}`(master 기준 Product Landing, 이미 STORE 렌더).
5. **QR row 저장?** → **불필요**(동적 생성). 신원만 `product_landings`(master당 1개 자동 mint).
6. **매장 가져오기 방법?** → `asset-copy-core` 복사(원본 분리). 단 **상품설명서 채널을 HUB 복사와 동일 통로로 할지 별도로 할지 결정 필요**(설명서는 현재 `/p` 랜딩·Store Production Material 경유, HUB 복사 채널과 다름).
7. **태블릿 세트 연결 가능?** → 모델은 있으나 **외부 세트 import/assign 미구현(net-new)**; `supplier` origin 없음 → operator_template 경유.
8. **운영자 검수 필요?** → **YES**(3-Role SSOT §6 + F4 + SPD canonical 모델). 현 admin 경로의 이중게이트 누락은 별도 보정 대상.
9. **가장 먼저 만들 최소 기능?** → WO 후보 1(온보딩+진입점) + 2(**STORE** 설명서 초안 작성 + 작성자 메타).
10. **지금 만들면 안 되는 것?** → (a) 공급자 직접 HUB 게시(Drift), (b) 공급자 태블릿 세트 직접 배정, (c) 매장-공급자 타깃 노출(cross-domain JOIN 금지), (d) 랜딩 인증정책을 결정(D3) 없이 변경, (e) `SUPPLIER_STORE` 신규 사용 / 성급한 enum 제거.

---

## 5. 위험한 방향(구현 금지 후보)

- **`SUPPLIER_STORE`를 신규 매장용 설명서 타입으로 사용** — 작성자+용도 혼합. 타입은 용도(STORE) 기준, 작성자는 메타데이터. (정정)
- **`SUPPLIER_STORE` enum 즉시 제거** — 참조(엔티티/마이그레이션/컨트롤러 allow-list) 존재. 데이터 0건 재확인 후 별도 WO.
- **공급자 → HUB 직접 게시 채널 신설** — 3-Role SSOT §6 / F4 위반. 반드시 운영자 매개.
- **`producer='supplier'` 신규 생성 확대** — F4상 폐기 예정 값. 신규는 operator-origin으로.
- **매장별 QR/콘텐츠를 처음부터 설계** — 전역 product Landing로 단순화. 매장별은 계층2에서만.
- **공급자 상품별 매장-타깃 노출(취급 매장에만)** — cross-domain JOIN 필요, Guard Rule 5 위반.
- **랜딩 무인증 공개 유지 채로 "비공개 정책" 홍보** — D3 미해결 상태로 노출하면 정책-코드 불일치.
- **상품 hide(SUSPENDED/ARCHIVED) 시 QR/콘텐츠 자동 삭제** — 현 설계는 비-cascade(사용처 보존). orphan 처리 정책은 별도 결정.

---

## 6. 후속 WO 목록(제안)

- `WO-O4O-SUPPLIER-DASHBOARD-ONBOARDING-CHECKLIST-V1` (후보 1)
- `WO-O4O-SPD-AUTHOR-SUBJECT-METADATA-V1` (SPD에 `created_by_role`/`created_by_supplier_id`/`reviewed_by_operator_id` 추가 — 후보 2 선행)
- `WO-O4O-PRODUCT-CONTENT-STORE-SUPPLIER-DRAFT-V1` (후보 2 — 공급자 `STORE` 초안 작성·제출. ※ 기존 `...SUPPLIER-STORE-PRODUCER-V1` 명칭·타입은 STORE로 정정)
- `WO-O4O-STORE-DESCRIPTION-QR-AUTOLINK-V1` (canonical→/p 노출·mint 트리거)
- `WO-O4O-PRODUCT-LANDING-AUTH-GATE-V1` (D3 — 인증 정책; 결정 후)
- `WO-O4O-STORE-IMPORT-STORE-DESCRIPTION-V1` (매장 가져오기 채널 정합)
- `WO-O4O-KPA-TABLET-OPERATOR-TEMPLATE-DUPLICATE-V1` (후보 5 — operator_template import; net-new)
- `WO-O4O-SPD-SUPPLIER-STORE-TYPE-DEPRECATE-V1` (죽은 `SUPPLIER_STORE` 참조 정리·제거; 데이터 0건 확인 후)

---

## 7. 추가 조사 필요 항목 (첫 WO 전 확정)

정정된 STORE 중심 방향에 맞춰 다음을 read-only로 재확인한다(일부는 이미 확인, 표기).

| 항목 | 현재까지 확인 | 남은 확인 |
|------|---------------|-----------|
| `DescriptionType.STORE` 실재 | ✅ 존재(기본값), enum `SharedProductDescription.entity.ts:79` | — |
| STORE canonical 현재 용도 | ✅ 공개 랜딩 `/p/{key}`가 STORE canonical 렌더(`product-landing.service.ts:178,197`) | STORE canonical 실데이터 규모/출처 분포(DB) |
| SPD 작성자/출처 컬럼 | ✅ `source_type`, `created_by`(user uuid)만. 역할/supplier_id/검수자 **없음** | 최소 메타 추가 범위 확정(WO-AUTHOR-SUBJECT-METADATA) |
| `SUPPLIER_STORE` 참조 위치 | ✅ 엔티티/마이그레이션 주석/컨트롤러 allow-list (§C-2). **write 경로 0건** | — |
| `SUPPLIER_STORE` 데이터 0건 | ⚠ Laptop DB 차단으로 미확인 | Cloud Console: `SELECT description_type, count(*) FROM shared_product_descriptions GROUP BY 1;` |
| STORE 초안→canonical 승격 review 구조 | ✅ 서비스 메서드 존재(`setStatus/setCanonical/listForReview`), 컨트롤러 제거됨 | 공급자 초안용 검수 진입을 재수립할지(D2) |

> read-only 집계 권장 쿼리: `SELECT description_type, source_type, status, count(*) FROM shared_product_descriptions GROUP BY 1,2,3 ORDER BY 1,2,3;`

---

## 8. 조사 제약·비고

- DB row 실측은 이 워크스페이스에서 미수행(방화벽). 스키마는 엔티티/마이그레이션 기준으로 확정. 필요 시 Cloud Console SQL Editor read-only 권장.
- 본 IR은 read-only. 코드/DB/배포 변경 없음. 발견한 기존 이슈(예: SPD admin 저장 이중게이트 누락, `SUPPLIER_STORE` dead value, 랜딩 무인증)는 수정하지 않고 후속 WO로 분리.
- 관련 선행 문서: `docs/investigations/IR-O4O-STORE-PRODUCT-DESCRIPTION-POLICY-CODE-AND-DOC-AUDIT-V1.md`, `docs/work-orders/WO-O4O-SUPPLIER-OFFER-TO-SPD-SEED-ON-APPROVAL-V1.md`, `docs/baseline/O4O-PRODUCT-RESOURCE-ARCHITECTURE-BASELINE-V2-AMENDMENT.md`, `docs/checks/CHECK-O4O-KPA-TABLET-CORNER-SCREEN-SET-BLOCK-DESIGN-V1.md`.

---

## 9. 변경 이력

- 2026-07-12 초판.
- 2026-07-12 **D1 정정**: 설명서 타입을 작성 주체가 아니라 용도 기준으로 확정. 공급자 매장용 설명서 = `description_type=STORE`(+`source_type=supplier`/작성자 메타), `SUPPLIER_STORE`는 deprecated·신규 미사용. 후속 WO 명칭/타입 및 추가 조사 항목(§7) 반영.
</content>
