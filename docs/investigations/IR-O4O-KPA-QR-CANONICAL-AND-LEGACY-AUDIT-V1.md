---
id: IR-O4O-KPA-QR-CANONICAL-AND-LEGACY-AUDIT-V1
title: "KPA QR 기능 — canonical / transitional / stale / dead 구조 분리 조사"
status: draft
date: 2026-05-09
scope:
  - QR 전체 구조 (entity / API / controller / route / component / hook) inventory
  - canonical 흐름과 실제 구현의 정합성 검증
  - 자료함 / "매장 제작 자료" 연결 가능성 (특히 store_production_materials 후보 entity)
  - POP 기능과의 공통 / 차이 비교
  - stale naming / dead code / legacy flow 식별
related:
  - docs/investigations/IR-O4O-KPA-QR-PRODUCTION-FLOW-STATE-AUDIT-V1.md
  - docs/investigations/IR-O4O-KPA-QR-LEGACY-SINGLE-ITEM-PATH-AUDIT-V1.md
  - docs/investigations/IR-O4O-KPA-POP-PRODUCTION-FLOW-STATE-AUDIT-V1.md
  - docs/investigations/IR-O4O-KPA-POP-LEGACY-CODE-CLEANUP-AUDIT-V1.md
  - docs/investigations/IR-O4O-KPA-STORE-PRODUCTION-MATERIALS-CAPABILITY-AUDIT-V1.md
  - docs/investigations/IR-O4O-STORE-EXECUTION-CONTENT-ASSET-POLICY-V1.md
  - docs/investigations/IR-O4O-STORE-PRODUCTION-MATERIALS-COMMON-ENTITY-RENAME-AUDIT-V1.md
  - docs/investigations/IR-O4O-STORE-MATERIALS-AND-PRODUCTIONS-STATE-AUDIT-V1.md
constraint:
  - 조사만 수행 — 코드 / migration / entity / table 변경 없음
  - 추정 금지 / 실제 코드 기준 / 자매 IR 사실은 출처 명시
  - 4개 분류 (active canonical / transitional / stale legacy / dead code) 적용
---

# IR-O4O-KPA-QR-CANONICAL-AND-LEGACY-AUDIT-V1

> KPA 매장 QR 기능의 현재 구현을 4 분류로 정렬하고, "매장 제작 자료" canonical
> 진영(`kpa_store_contents` → `store_production_materials` 통합 entity) 과의
> 연결 가능성을 정적 조사한다.

- 작성일: 2026-05-09
- 기준 브랜치: `main`
- 작업 규칙: 조사만 / 코드 수정 / migration / 신규 entity 생성 모두 금지

---

## 0. 결론 요약 (TL;DR)

> **QR 백엔드는 *이미 multi-service 공통* 으로 동작하고 있다 — `createStoreQrLandingController` 가 KPA / GlycoPharm / Cosmetics 세 서비스 라우터에 동일하게 mount 되며 `serviceKey` 인자로만 분기. POP 와 동등한 공통화 수준을 이미 달성했다. 그러나 결과물 entity (`store_qr_codes`) 는 `library_item_id` 단일 reference 만 보유하여 *입력 source 측 자료함 전체* 를 수용하지 못한다. 구체적으로 — POP 는 `library / snapshot / direct` 3 origin 을 모두 수용하지만 QR 은 *`library` 만 수용* 한다 (`StoreQRPage.tsx:150` 의 `find((it) => it.origin === 'library')` 가 단일 분기). 이 비대칭이 QR 을 "매장 제작 자료" canonical 흐름에 연결하지 못하게 막는 단 하나의 구조적 게이트다. 또한 admin-dashboard 에 *별도의 QR Create/List UI* (`/store/qr/create`, `/store/qr`) 가 lms-marketing.routes.tsx 에 등록되어 있으나, 사용하는 API 경로(`/api/v1/pharmacy/qr`) 는 백엔드에 mount 되어 있지 않다 — 실 운영 서비스에서는 dead code 일 가능성이 매우 높다.**

> **권장 방향: ① QR 결과물 entity 의 source reference 를 polymorphic 화 (library + production-material 두 origin 수용) — `IR-O4O-STORE-EXECUTION-CONTENT-ASSET-POLICY-V1` Phase 1 #2,#3 의 일부로 진행 ② admin-dashboard 의 parallel QR UI 의 실 가동 여부 검증 후 dead 면 제거 ③ kpa-society UI 에 잔존하는 `landingType: 'tablet'` 등 stale wording 정리 ④ ProductMarketingPage 진입의 단건 prefill 패턴 (`selectedLibraryItem`) 은 transitional — canonical items[] 시그니처로 *흡수 가능* 하나 즉시 제거는 product-context 정보 손실 (자매 IR `LEGACY-SINGLE-ITEM-PATH-AUDIT-V1` 결론).**

### 핵심 발견 10가지

1. **백엔드 multi-service 공통 mount** — `createStoreQrLandingController(ds, auth, serviceKey)` 가 KPA / GlycoPharm / Cosmetics 세 서비스 라우터에 mount. 이미 공통 capability ([§2.2](#22-controller--route)).
2. **결과물 entity 는 library 단일 reference** — `store_qr_codes.library_item_id UUID` 만 보유. snapshot / direct 콘텐츠 reference 부재 ([§4.1](#41-store_qr_codes-entity-필드)).
3. **canonical entry는 자료함 → StartProductionModal 로 정렬됨** — 자매 IR `IR-O4O-KPA-QR-PRODUCTION-FLOW-STATE-AUDIT-V1` 결론과 일치. "신규 제작 시작" 버튼은 [StoreQRPage.tsx:372-374](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx#L372) 에서 명시 제거 처리됨.
4. **POP vs QR origin 수용 비대칭** — POP (`StorePopPage.tsx:50-54, 109-153`): `library + snapshot + direct` 3종. QR (`StoreQRPage.tsx:150`): `library` **단일**. **QR 만 production material 흐름에서 막힌다.**
5. **admin-dashboard 에 parallel QR UI** — [`apps/admin-dashboard/src/pages/store/qr/QrCreatePage.tsx`](apps/admin-dashboard/src/pages/store/qr/QrCreatePage.tsx), [`QrListPage.tsx`](apps/admin-dashboard/src/pages/store/qr/QrListPage.tsx) 가 [`lms-marketing.routes.tsx:168-178`](apps/admin-dashboard/src/routes/lms-marketing.routes.tsx) 에 등록. **사용 API path `/api/v1/pharmacy/qr` 는 backend 에 미mount** — 실 운영 동작 의심 ([§5.3](#53-admin-dashboard-parallel-qr-ui-dead-의심)).
6. **`StoreQRCreateEntryModal` 컴포넌트는 물리적으로 제거됨** — 4 개 prior IR 문서 외에는 참조 0건. 제거 완료 (dead-removed).
7. **`landingType: 'tablet'` 미정의** — 백엔드 allowlist `['product','promotion','page','link']` 에 없음. UI 옵션에서도 제거됨 (kpa-society 는 3종, admin-dashboard 는 4종) — dead.
8. **`promotion` 타입 부분 활성** — 백엔드는 수용 / kpa-society UI 옵션은 제거됨 / admin-dashboard UI 에는 잔존. 부분 transitional.
9. **`selectedLibraryItem` 단건 path 는 transitional** — 자매 IR `IR-O4O-KPA-QR-LEGACY-SINGLE-ITEM-PATH-AUDIT-V1` 결론 그대로 인용: dead 가 아니라 "ProductMarketingPage 단건 자동 prefill" 의 active 인터페이스 ([§5.4](#54-selectedlibraryitem--productmarketingpage-진입)).
10. **QR 결과물 → 제작 자료 reference 불가 (현재)** — `library_item_id` 외 source 필드 없음. `store_production_materials` 통합 entity ([상위 IR](./IR-O4O-STORE-PRODUCTION-MATERIALS-COMMON-ENTITY-RENAME-AUDIT-V1.md)) 와 연결하려면 `source_material_id` 추가 필요. *지금은 미연결 상태* ([§7](#7-매장-제작-자료-연결-가능성)).

### 4 분류 요약

| 분류 | 항목 |
|------|------|
| **active canonical** | StoreQRPage / StartProductionModal 통합 / store_qr_codes entity / multi-service controller / public landing `/qr/:slug` / scan analytics / PNG·SVG·A4·Flyer 출력 |
| **transitional** | `selectedLibraryItem` 단건 prefill (ProductMarketingPage 진입 전용) / admin-dashboard parallel QR UI (검증 필요) / `promotion` landingType (UI/백엔드 부분 활성) / library 외 origin 미수용 (개선 필요) |
| **stale legacy** | StoreQRPage Empty state 가이드 ("'QR 코드 생성' 버튼…" 텍스트) — 자매 IR 미반영 / `description` 필드 미사용 (form 에 입력 항목 없음) |
| **dead code** | `StoreQRCreateEntryModal` (파일 자체 제거됨) / `landingType: 'tablet'` (UI/API 모두 제거) / `WO-O4O-STORE-WORKSPACE-QR-PREFILL-V2` 안내 외 잔존 텍스트 |

---

## 1. canonical 흐름 정의 (조사 기준)

QR canonical 흐름 (자매 IR `IR-O4O-KPA-QR-PRODUCTION-FLOW-STATE-AUDIT-V1` §1.3 기준):

```text
[1] 내 자료함 (콘텐츠 / 자료)
        │
        ▼
[2] 자료 선택 (체크박스 N개)
        │
        ▼
[3] StartProductionModal 진입 — 제작 대상 4-choice (POP / QR / 블로그 / 상품 상세설명)
        │   target='qr' 선택
        ▼
[4] /store/marketing/qr 으로 navigate
        │   location.state.production.source.items[]
        ▼
[5] StoreQRPage 가 location.state 수신
        │   현재: items.find(it => it.origin === 'library') 로 첫 library 항목만 사용
        │   → getStoreLibraryItem(id) fetch → handleLibrarySelect()
        ▼
[6] Create form 자동 전개 (slug / landingType / landingTargetId 입력)
        │
        ▼
[7] POST /pharmacy/qr → store_qr_codes 저장
        │
        ▼
[8] QR 리스트 + 출력 (PNG / SVG / A4 PDF / Flyer)
        │
        ▼
[9] 공개 URL: /qr/{slug} → store_qr_landing.controller GET /qr/public/:slug
        │
        ▼
[10] (분석) /pharmacy/qr/:id/analytics — store_qr_scan_events 집계
```

본 IR 의 핵심 질문:

> **각 단계의 어느 곳이 active canonical / transitional / stale / dead 인가? 그리고 Step [5] 의 "library 단일 origin" 제약을 풀어 *제작 자료(store_production_materials) 와 연결* 하는 것이 가능한가?**

---

## 2. QR 전체 구조 inventory

### 2.1 Entity (백엔드)

| Entity | 파일 | 테이블 | 역할 | 분류 |
|--------|------|--------|------|:---:|
| `StoreQrCode` | [store-qr-code.entity.ts](apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts) | `store_qr_codes` | QR 결과물 (id / org / type / title / description / library_item_id / landing_type / landing_target_id / slug / is_active) | **canonical** |
| `StoreQrScanEvent` | [store-qr-scan-event.entity.ts](apps/api-server/src/routes/platform/entities/store-qr-scan-event.entity.ts) | `store_qr_scan_events` | 스캔 이벤트 (org / qr_code_id / device / UA / referer / ip_hash) | **canonical** |

**Migration 이력:**

| 파일 | 클래스 | 내용 |
|------|--------|------|
| `20260304120000-CreateStoreQrCodes.ts` | `CreateStoreQrCodes1709304120000` (file ts ≠ class ts — [Memory: TypeORM Migration Class Naming](C:/Users/sohae/.claude/projects/c--Users-sohae-o4o-platform/memory/MEMORY.md) 위반 의심 — 단 `name = 'CreateStoreQrCodes20260304120000'` 명시로 우회) | CREATE TABLE / 3 INDEX |
| `20260304130000-CreateStoreQrScanEvents.ts` | (확인 필요) | scan_event 테이블 |

> ⚠ Migration class 식별자(`1709304120000`) 와 file timestamp(`20260304120000`) 가 다름. `name` property 로 우회되어 동작은 하나, 표준에서 벗어남. **transitional**.

**Connection 등록:**

| 위치 | 라인 |
|------|------|
| [connection.ts](apps/api-server/src/database/connection.ts) | 351–352 (import), 959–962 (DataSource entities) |

### 2.2 Controller / Route

**Controller:** [`apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts`](apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts)

이름은 `store-qr-landing` 이지만 실제로는 *모든 QR CRUD + 공개 랜딩 + 출력 + 분석* 을 포함한 통합 컨트롤러. **`serviceKey` 인자로 cross-service leakage 차단** ([WO-O4O-STORE-GUARD-PHASE2A-CHANNEL-AND-QR-V1](apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts#L56)).

**Route 매핑:**

| Service | mount | 라인 |
|---------|:-----:|:----:|
| KPA | `/api/v1/kpa/{qr/public/*, pharmacy/qr/*}` | [kpa.routes.ts:79, 389](apps/api-server/src/routes/kpa/kpa.routes.ts#L389) |
| GlycoPharm | `/api/v1/glycopharm/{qr/public/*, pharmacy/qr/*}` | [glycopharm.routes.ts:35, 373](apps/api-server/src/routes/glycopharm/glycopharm.routes.ts#L373) |
| Cosmetics | `/api/v1/cosmetics/{qr/public/*, pharmacy/qr/*}` | [cosmetics.routes.ts:30, 128](apps/api-server/src/routes/cosmetics/cosmetics.routes.ts#L128) |

> 이미 **multi-service 공통 capability** — 자매 IR (`IR-O4O-STORE-PRODUCTION-MATERIALS-COMMON-ENTITY-RENAME-AUDIT-V1`) 의 `kpa_store_contents` 와 동일한 구조. 분류: **active canonical**.

**Endpoint 일람:**

| Method | Path | 인증 | 설명 | 분류 |
|--------|------|:---:|------|:---:|
| GET | `/qr/public/:slug` | none | 공개 랜딩 데이터 + scan event 기록 + product 타입 시 상품 정보 | canonical |
| GET | `/pharmacy/qr/source/products` | auth + storeOwner | 공급자 상품 목록 (직접 연결용) | canonical |
| GET | `/pharmacy/qr` | auth + storeOwner | 내 QR 목록 + scanCount LEFT JOIN | canonical |
| POST | `/pharmacy/qr` | auth + storeOwner | QR 생성 (productId 직접 연결 지원) | canonical |
| PUT | `/pharmacy/qr/:id` | auth + storeOwner | QR 수정 | canonical |
| DELETE | `/pharmacy/qr/:id` | auth + storeOwner | soft-delete (`is_active=false`) | canonical |
| GET | `/pharmacy/qr/:id/analytics` | auth + storeOwner | 스캔 통계 (totalScans / today / weekly / device) | canonical |
| GET | `/pharmacy/qr/:id/image` | auth + storeOwner | PNG/SVG 다운로드 | canonical |
| POST | `/pharmacy/qr/print` | auth + storeOwner | 선택 QR 일괄 PDF (max 24) | canonical |
| GET | `/pharmacy/qr/:id/flyer` | auth + storeOwner | 상품 QR 전단지 PDF (template 1/4/8) | canonical |

### 2.3 Frontend — kpa-society (canonical 진입처)

| 파일 | 역할 | 분류 |
|------|------|:---:|
| [pages/pharmacy/StoreQRPage.tsx](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx) | QR 목록 + 생성 form + 분석 + 출력 | canonical (단 `origin === 'library'` 단일 분기는 **transitional**) |
| [pages/pharmacy/StartProductionModal.tsx](services/web-kpa-society/src/pages/pharmacy/StartProductionModal.tsx) | 자료함에서 QR/POP/Blog/상품 상세설명 선택 (4-choice) | canonical |
| [pages/pharmacy/QrPrintTemplateModal.tsx](services/web-kpa-society/src/pages/pharmacy/QrPrintTemplateModal.tsx) | 출력 템플릿 선택 (sheet / flyer1 / flyer4 / flyer8) | canonical |
| [pages/pharmacy/ProductMarketingPage.tsx](services/web-kpa-society/src/pages/pharmacy/ProductMarketingPage.tsx) | 상품-그래프 진입에서 단건 자동 prefill QR 생성 | **transitional** (자매 IR `LEGACY-SINGLE-ITEM-PATH-AUDIT-V1`) |
| [pages/qr/QrLandingPage.tsx](services/web-kpa-society/src/pages/qr/QrLandingPage.tsx) | 공개 `/qr/:slug` 랜딩 페이지 | canonical |
| [api/storeQr.ts](services/web-kpa-society/src/api/storeQr.ts) | API client (`storeContentApi`-style) — `/pharmacy/qr` 호출 (서비스 prefix 는 apiClient baseURL 에서) | canonical |
| [components/store/StoreAssetSelectorModal.tsx](services/web-kpa-society/src/components/store/StoreAssetSelectorModal.tsx) | 자료 재선택 모달 (`usageType="qr"`) — 추가 자료 변경 시 사용 | canonical |

### 2.4 Frontend — admin-dashboard (parallel UI)

| 파일 | 라우트 | 분류 |
|------|--------|:---:|
| [pages/store/qr/QrListPage.tsx](apps/admin-dashboard/src/pages/store/qr/QrListPage.tsx) | `/store/qr` (lms-marketing.routes:175-178) | **dead 의심** |
| [pages/store/qr/QrCreatePage.tsx](apps/admin-dashboard/src/pages/store/qr/QrCreatePage.tsx) | `/store/qr/create` (lms-marketing.routes:168-171) | **dead 의심** |
| [api/qr.api.ts](apps/admin-dashboard/src/api/qr.api.ts) | API client — **`/api/v1/pharmacy/qr` 호출 (서비스 prefix 없음)** | **dead 의심** |
| [pages/storefront/QrLandingPage.tsx](apps/admin-dashboard/src/pages/storefront/QrLandingPage.tsx) | (별도 — 확인 필요) | 별도 |

**핵심 의심 근거**: `qr.api.ts` 의 호출 경로 `/api/v1/pharmacy/qr` 는 [§2.2](#22-controller--route) 의 mount 표 어디에도 없음. backend 는 `/api/v1/{kpa|glycopharm|cosmetics}/pharmacy/qr` 만 mount — admin-dashboard 가 무인증 호출 시도 시 404. 별도 검증 필요. → [§5.3](#53-admin-dashboard-parallel-qr-ui-dead-의심) 참고.

### 2.5 Other Service QR 랜딩 페이지 (다중 deploy)

| 파일 | 서비스 | 역할 |
|------|-------|------|
| [services/web-glycopharm/src/pages/qr/QrLandingPage.tsx](services/web-glycopharm/src/pages/qr/QrLandingPage.tsx) | GlycoPharm | 공개 QR 랜딩 |
| [services/web-neture/src/pages/store/QrLandingPage.tsx](services/web-neture/src/pages/store/QrLandingPage.tsx) | Neture | 공개 QR 랜딩 |
| [services/web-kpa-society/src/pages/qr/QrLandingPage.tsx](services/web-kpa-society/src/pages/qr/QrLandingPage.tsx) | KPA | 공개 QR 랜딩 |

> 각 서비스 frontend 가 자기 도메인의 `/qr/:slug` 를 받음. 공통 backend `GET /qr/public/:slug` 로 호출. **active canonical, multi-deploy**.

### 2.6 Service / Helper

| 파일 | 역할 | 분류 |
|------|------|:---:|
| [services/qr-print.service.ts](apps/api-server/src/services/qr-print.service.ts) | `generateQrPng / generateQrSvg / generateQrPrintPdf` (qrcode + PDFKit) | canonical |
| [services/qr-flyer.service.ts](apps/api-server/src/services/qr-flyer.service.ts) | `generateProductFlyer` (1/4/8 인쇄 템플릿) | canonical |
| [services/ai-prompts/storeQr.ts](apps/api-server/src/services/ai-prompts/storeQr.ts) | AI prompt 템플릿 (제목/설명 자동 생성용?) | 검증 필요 |

---

## 3. canonical 진입 흐름 검증

### 3.1 진입 단계별 정합성

| Step | 코드 위치 | 정합성 | 분류 |
|------|----------|:------:|:---:|
| [1] 내 자료함 | [pages/pharmacy/StoreLibraryContentsPage.tsx / StoreLibraryResourcesPage.tsx](services/web-kpa-society/src/pages/pharmacy/) | ✅ | canonical |
| [2] 다건 선택 (checkbox) | toolbar 패턴 (자매 IR `STORE-MATERIALS-AND-PRODUCTIONS-STATE-AUDIT-V1` §3.2 인용) | ✅ | canonical |
| [3] StartProductionModal | [StartProductionModal.tsx:36-41](services/web-kpa-society/src/pages/pharmacy/StartProductionModal.tsx#L36) — 4 target | ✅ | canonical |
| [4] navigate state | [StartProductionModal.tsx:60-67](services/web-kpa-society/src/pages/pharmacy/StartProductionModal.tsx#L60) — `production.source.items[]` 전달 | ✅ | canonical |
| [5] StoreQRPage 수신 | [StoreQRPage.tsx:141-173](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx#L141) — `items.find(it => it.origin === 'library')` | ⚠ **library 만 수용** | **transitional** |
| [6] Create form | [StoreQRPage.tsx:402-514](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx#L402) | ✅ | canonical |
| [7] POST /pharmacy/qr | [store-qr-landing.controller.ts:524-614](apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts#L524) | ✅ | canonical |
| [8] 출력 | controller `:image / /print / /flyer` | ✅ | canonical |
| [9] 공개 랜딩 | controller `/qr/public/:slug` | ✅ | canonical |
| [10] 분석 | controller `:analytics` + `store_qr_scan_events` | ✅ | canonical |

### 3.2 Step [5] 의 "library 단일 분기" 상세

[StoreQRPage.tsx:150](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx#L150):

```typescript
const incoming = state?.production?.source?.items?.find((it) => it.origin === 'library');
if (incoming) {
  // 자료실 항목 fetch 후 creation mode 진입
  (async () => {
    try {
      const res = await getStoreLibraryItem(incoming.id);
      const lib = res.data;
      handleLibrarySelect({
        id: lib.id, title: lib.title, category: lib.category,
        fileUrl: lib.fileUrl, assetType: lib.assetType,
        url: lib.url, htmlContent: lib.htmlContent,
      });
    }
    ...
```

**제약**:

- `origin === 'library'` 항목 **첫 1개만** 처리 (`.find()`)
- 자료함에서 `direct` (kpa_store_contents 직접 콘텐츠) 또는 `snapshot` (커뮤니티 콘텐츠 스냅샷) 항목을 골라 QR 으로 보내면 **silent fail** (incoming = undefined)
- POP 의 처리 ([StorePopPage.tsx:109-153](services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx#L109)) 와 명백히 비대칭

### 3.3 POP vs QR origin 수용 비교

| origin | 의미 | POP 수용 | QR 수용 |
|--------|------|:--------:|:-------:|
| `library` | `store_execution_assets` (file / external-link / content) | ✅ `getStoreLibraryItem(id)` | ✅ `getStoreLibraryItem(id)` |
| `snapshot` | `o4o_asset_snapshots` (커뮤니티에서 가져온 콘텐츠) | ✅ state title/description 그대로 | ❌ 무시 (find 통과 못함) |
| `direct` | `kpa_store_contents` (매장 직접 작성 콘텐츠) | ✅ state title/description 그대로 | ❌ 무시 |

> **이 비대칭이 *QR 의 production-material 흐름 단절* 을 만든다.** "매장 제작 자료" canonical 흐름 ([상위 IR](./IR-O4O-KPA-STORE-PRODUCTION-MATERIALS-CAPABILITY-AUDIT-V1.md) §1) 은 `direct` / `snapshot edit` / AI 정리 결과를 모두 `kpa_store_contents` 에 모은다 — 그러나 그것을 QR 으로 보내면 사라진다.

---

## 4. QR 결과물 entity 구조

### 4.1 `store_qr_codes` entity 필드

[store-qr-code.entity.ts](apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts):

```typescript
@Entity({ name: 'store_qr_codes' })
@Index('IDX_store_qr_codes_org_active', ['organizationId', 'isActive'])
export class StoreQrCode {
  id!: string;                                          // UUID
  organizationId!: string;                              // multi-tenant
  type!: string;                                        // 'product' / 'page' / 'link' / ... (varchar(50))
  title!: string;                                       // varchar(300)
  description?: string | null;                          // text
  libraryItemId?: string | null;                        // ★ 단일 origin reference (UUID)
  landingType!: string;                                 // 'product' / 'promotion' / 'page' / 'link'
  landingTargetId?: string | null;                      // varchar(500) — productId / URL / pageId
  slug!: string;                                        // varchar(200), UNIQUE
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
```

> **결정적 한계**: source 측 reference 가 `libraryItemId` 단 하나. snapshot / direct / production-material 어느 쪽도 가리킬 수 없음. `store_execution_assets` 에 종속된 단방향 FK.

### 4.2 source 구조 매트릭스

| 후보 source 필드 | 현재 보유 여부 | 비고 |
|------------------|:-------------:|------|
| `libraryItemId` | ✅ | `store_execution_assets.id` 논리 참조 |
| `sourceMaterialId` (`kpa_store_contents.id`) | ❌ | **부재** |
| `sourceType` (library / snapshot / direct / production-material) | ❌ | **부재** — `type` / `landingType` 은 *결과물 분류* 이지 *source 분류* 가 아님 |
| `snapshotId` (`o4o_asset_snapshots.id`) | ❌ | **부재** |
| `productId` (`supplier_product_offers.id`) | 🟡 `landingTargetId` 에 *string* 으로 저장 | type 검증은 백엔드에서, FK 없음 |
| `metadata jsonb` | ❌ | **부재** — POP / blog 와 달리 jsonb 메타 컬럼 없음 |

### 4.3 결과물 vs source 관계

- 현재 구조: **혼합** — landingTargetId 는 *URL / productId / pageId* 모두 받는 polymorphic varchar
- libraryItemId 는 *UI 표시용 prefill source* (자료의 title / fileUrl 을 끌어오기 위함)
- 영속적 source 추적 불가 — 자료가 삭제되어도 QR 은 살아있음 (libraryItemId 가 유효하지 않은 상태로 잔존)

### 4.4 재편집 lifecycle

[store-qr-landing.controller.ts:617-658](apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts#L617): `PUT /pharmacy/qr/:id` 는 `title / description / type / libraryItemId / landingType / landingTargetId / slug` 모두 수정 가능. **재편집 가능 ✅**. 다만 frontend `StoreQRPage` 에서 update UI 가 노출되지 않음 — 생성 → 삭제만 가능 (목록 화면에 edit 버튼 없음). 백엔드만 활성, frontend transitional.

---

## 5. stale naming / dead code / legacy flow 조사

### 5.1 stale UI / wording

| 항목 | 위치 | 현재 텍스트 | 분류 | 자매 IR |
|------|------|------------|:----:|:------:|
| Empty state 가이드 | [StoreQRPage.tsx:530-533](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx#L530) | "내 자료함에서 자료를 선택해 QR 코드를 제작할 수 있습니다." + 자료함 이동 버튼 | **active canonical** | (자매 IR `QR-PRODUCTION-FLOW-STATE-AUDIT-V1` §2.1 #1 의 stale 지적은 *이미 정정됨*. 현재 코드는 canonical 표현) |
| GuideBlock — "QR 코드는 '연결 대상'을 저장합니다" | [StoreQRPage.tsx:351-357](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx#L351) | "QR 코드는 내용을 저장하는 것이 아니라 연결 대상을 저장합니다…" | canonical | — |
| `description` 입력 폼 | StoreQRPage Create form | **존재하지 않음** (entity 에는 description 컬럼 있으나 UI 미노출) | **stale** | — |
| `landingType: 'tablet'` | UI 옵션 / API allowlist | **모두 제거됨** | **dead** | self-validated |
| `LANDING_TYPE_OPTIONS = ['product', 'page', 'link']` | [StoreQRPage.tsx:37-41](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx#L37) | 3 종 | canonical | (단 backend 는 `promotion` 도 수용 — UI 만 좁힘) |

### 5.2 dead 컴포넌트

**`StoreQRCreateEntryModal`** — 자매 IR (`IR-O4O-KPA-QR-PRODUCTION-FLOW-STATE-AUDIT-V1` §2.1 #2) 에서 "title 부정확" 으로 지적되었던 컴포넌트.

검증 결과:

```
Glob "**/StoreQRCreateEntryModal*" → No files found
Grep "StoreQRCreateEntryModal" → 4 docs only (모두 IR 문서)
```

> **파일 자체가 제거됨 (dead-removed)**. 자매 IR 시점 이후 정리됨. ✅ 이미 cleanup 완료.

### 5.3 admin-dashboard parallel QR UI (dead 의심)

**구조:**

```
apps/admin-dashboard/src/routes/lms-marketing.routes.tsx:168-178
   ├─ /store/qr/create  → QrCreatePage (3-step wizard)
   └─ /store/qr         → QrListPage
```

**API 호출:**

[apps/admin-dashboard/src/api/qr.api.ts:88, 108, 123, 131, 138, 150](apps/admin-dashboard/src/api/qr.api.ts):

```typescript
authClient.api.get('/api/v1/pharmacy/qr/source/products?...')
authClient.api.get('/api/v1/pharmacy/qr?...')
authClient.api.post('/api/v1/pharmacy/qr', payload)
authClient.api.delete('/api/v1/pharmacy/qr/${id}')
authClient.api.get('/api/v1/pharmacy/qr/${id}/image?...')
authClient.api.get('/api/v1/pharmacy/qr/${id}/flyer?...')
```

**Backend mount 검증** ([§2.2](#22-controller--route)):

```
KPA        : /api/v1/kpa/{qr/public, pharmacy/qr/*}        ✓ mounted
GlycoPharm : /api/v1/glycopharm/{qr/public, pharmacy/qr/*} ✓ mounted
Cosmetics  : /api/v1/cosmetics/{qr/public, pharmacy/qr/*}  ✓ mounted

/api/v1/pharmacy/qr (서비스 prefix 없음) → ❌ 미mount
```

추가 grep:

```
Grep "app\.use\(['\"]/api/v1/pharmacy" → No matches found
```

**판정:**

- admin-dashboard 의 QR API client 가 호출하는 path 는 어디에도 mount 되어 있지 않음
- 이 페이지가 실제로 호출되면 404
- 단 [`StoreContentWorkspacePage.tsx:131`](apps/admin-dashboard/src/pages/kpa/StoreContentWorkspacePage.tsx#L131) 에서 `navigate('/store/qr/create', ...)` 로 진입 코드는 존재 → frontend route 는 살아있고 사용자가 진입할 수 있으나 API 호출은 실패

> **분류: dead 의심 (transitional 가능)**. 두 가지 가능성:
> 1. **dead** — admin-dashboard 의 `qr.api.ts` 는 작성 단계 미완성 (서비스 prefix 누락) 혹은 `/api/v1/pharmacy/qr` mount 가 다른 곳에 잠재 (확인 못 함). 실 가동 시 404.
> 2. **transitional** — admin-dashboard 라우터의 axios interceptor 가 `/api/v1/pharmacy/qr` 를 다른 path 로 rewrite 하거나, baseURL 차원에서 service prefix 를 주입하는 가능성. 본 IR 의 정적 분석으로는 확인 불가 — runtime 검증 필요.
>
> **권장: 운영 환경에서 admin-dashboard 의 `/store/qr` 페이지 진입 후 network 탭으로 실 호출 path 확인 1회로 즉시 판정 가능**. 결과에 따라 (a) 제거 (dead) 또는 (b) baseURL/interceptor 정책 명문화 (transitional).

### 5.4 `selectedLibraryItem` & ProductMarketingPage 진입

자매 IR `IR-O4O-KPA-QR-LEGACY-SINGLE-ITEM-PATH-AUDIT-V1` 의 결론을 그대로 인용:

> 판정: **B(특수 단건 UX 유지) + C(canonical 흡수 가능)** — 단순 dead legacy(A)는 아님.

본 IR 의 분류: **transitional**.

**근거** (자매 IR §1, §2):

- ProductMarketingPage (`/store/commerce/products/:productId/marketing`) → 상품 컨텍스트에서 "QR 만들기" / "POP 만들기" 클릭 시 **첫 활성 자료 1개 자동 prefill** + productContext 동봉 navigate
- StoreQRPage 가 이 단건 prefill 도 canonical items[].length=1 시그니처로 수신 — 이미 canonical 시그니처 통합됨 ([WO-O4O-KPA-STORE-QR-PRODUCT-CONTEXT-CANONICAL-MERGE-V1](services/web-kpa-society/src/pages/pharmacy/ProductMarketingPage.tsx#L41-L42))

> **즉 단건 path 는 *데이터 시그니처 수준에서 이미 canonical 흡수* 되었고, `productContext` 메타만 별도 채널로 유지 중**. 이는 dead 가 아니라 *서로 다른 진입 컨텍스트의 정상 분기*.

### 5.5 admin-dashboard `prefillTitle` / `prefillLibraryItemId` state

[StoreContentWorkspacePage.tsx:131-135](apps/admin-dashboard/src/pages/kpa/StoreContentWorkspacePage.tsx#L131):

```typescript
navigate('/store/qr/create', {
  state: {
    prefillTitle: qrWarningAsset?.title,
    prefillLibraryItemId: qrWarningAsset?.id,
  },
});
```

**분류: dead 의심** — admin-dashboard 의 parallel QR UI (§5.3) 가 dead 면 함께 dead. transitional (§5.3 판정 보류) 이면 함께 transitional.

### 5.6 dead 항목 종합

| 항목 | 위치 | 분류 |
|------|------|:----:|
| `StoreQRCreateEntryModal` 컴포넌트 | (제거됨) | dead-removed |
| `landingType: 'tablet'` | UI/API 모두 제거 | dead-removed |
| StoreQRPage `description` 입력 form | (entity 에 컬럼 있으나 form 없음) | stale-frontend |
| admin-dashboard `/store/qr/*` parallel UI | [§5.3](#53-admin-dashboard-parallel-qr-ui-dead-의심) | **dead 의심 (검증 필요)** |
| `prefillTitle / prefillLibraryItemId` state | StoreContentWorkspacePage 진입 | §5.3 의존 |

---

## 6. POP vs QR 구조 비교

자매 IR `IR-O4O-KPA-QR-PRODUCTION-FLOW-STATE-AUDIT-V1` §3 의 비교를 본 IR 의 분류 관점으로 재정리:

| 항목 | POP | QR | 본 IR 의 함의 |
|------|-----|----|--------------|
| 결과물 entity | ❌ 없음 (휘발성 PDF) | ✅ `store_qr_codes` (영속) | QR 이 *Production Material 결과물 reference 의 이상적 위치* |
| source reference | (entity 없으므로 무관) | `library_item_id` 단일 | QR 이 *오히려 더 적합한 후보* — 영속이므로 reference 통일 가능 |
| 자료함 연결 origin | library + snapshot + direct ✅ | **library only** ❌ | QR 의 결정적 비대칭 — 본 IR 의 핵심 발견 |
| 출력 방식 | A4/A5 PDF (on-demand) | PNG/SVG/A4/Flyer (all on-demand) | 동일 |
| 영속화 | ❌ | ✅ | QR 이 우위 |
| 재편집 | (재선택 → 다시 출력) | ✅ (PUT API 활성, UI 미활성) | QR 이 우위 (UI 보강 필요) |
| 백엔드 multi-service mount | ✅ (ㅎPOP-LIBRARY-INTEGRATION) | ✅ (3 service common) | 양쪽 동등 |
| 공개 URL | ❌ | ✅ `/qr/:slug` | QR 만 활성 |
| Analytics | ❌ | ✅ scan events | QR 만 활성 |
| StartProductionModal 통합 | ✅ | ✅ | 동등 |

### 6.1 "QR 이 오히려 Store Production Material canonical 에 더 적합한가?" — 핵심 질문 답

> **YES — *결과물 측면* 에서 QR 이 POP 보다 production-material 결과물 reference 의 모범 패턴 역할에 더 적합**.

근거:

1. **영속성** — POP 은 휘발성 PDF, QR 은 영속 entity. 결과물 lifecycle 관리 가능.
2. **public surface** — QR 은 `/qr/:slug` 로 공개 노출. 자료 변경 시 자동 반영 가능 구조.
3. **multi-channel reuse** — QR 은 1 source → N reference (PNG/SVG/A4/Flyer + 공개 URL).
4. **이미 product-target reference 패턴 존재** — `landingTargetId` 가 productId 를 받음. 동일 패턴으로 `sourceMaterialId` 를 추가하기 자연스럽다.

> **단 *현재 구현* 에서는 source 수용이 비대칭(library only) 이라 적합성이 잠재 상태**. `library_item_id` 외 `sourceMaterialId` 추가 + `[5]` 단계 origin 분기 확장 시 즉시 active 가 됨.

### 6.2 POP 와 공통 cleanup 가능 영역

| 영역 | POP / QR 공통 | cleanup 후보 |
|------|:-------------:|:-----------:|
| canonical entry (자료함 → StartProductionModal) | ✅ | (이미 통일) |
| origin 분기 처리 패턴 | ⚠ 비대칭 | **QR 측에 snapshot/direct 분기 추가** (POP 와 정합) |
| 출력 service (qr-print / qr-flyer / pop-pdf) | 별도 service | 공통화 가능성 낮음 (자체 로직) |
| StartProductionModal 4-target | ✅ | (이미 통일) |
| StoreAssetSelectorModal `usageType` 필터 | `pop` / `qr` / `signage` / ... | `usageType="qr"` 통일됨 — 변경 불필요 |
| `storeMenuConfig.ts` "매장 실행" 그룹 | ✅ | (이미 정렬) |

---

## 7. 매장 제작 자료 연결 가능성

상위 IR ([IR-O4O-STORE-PRODUCTION-MATERIALS-COMMON-ENTITY-RENAME-AUDIT-V1](./IR-O4O-STORE-PRODUCTION-MATERIALS-COMMON-ENTITY-RENAME-AUDIT-V1.md)) 의 결론:

> `kpa_store_contents` → `store_production_materials` rename 이 권장됨. Phase 2-A (code-only rename) 즉시 가능.

본 IR 은 그 entity 와 QR 결과물을 **연결 가능한가** 를 묻는다.

### 7.1 향후 canonical 흐름

```
[source]
 ├─ snapshot (o4o_asset_snapshots)
 ├─ direct  (kpa_store_contents.direct)
 └─ library (store_execution_assets)
       │
       ▼
[편집 / AI 정리]    → kpa_store_contents (= store_production_materials)
       │
       ▼
[QR 결과물 생성]    → store_qr_codes
       │
       ▼
[QR.sourceMaterialId → store_production_materials.id]
```

### 7.2 현재 entity 에서 `sourceMaterialId` 추가 가능성

| 변경 | 영향 | 평가 |
|------|------|:---:|
| `store_qr_codes` 에 `source_material_id UUID nullable` 추가 | ALTER TABLE ADD COLUMN | 🟢 안전 (nullable, 기존 row 영향 없음) |
| 추가 컬럼 `source_type VARCHAR(30)` (library / production_material) | ALTER TABLE ADD COLUMN | 🟢 안전 |
| `landingType` 와의 의미 분리 | source vs landing 두 개념을 명시 | ⚠ 코드 정렬 필요 |
| frontend Step [5] 분기 확장 | StoreQRPage:150 의 `find` 로직 변경 | 🟢 작은 수정 |
| StorePopPage 의 origin 처리 패턴 재사용 | [StorePopPage.tsx:109-153](services/web-kpa-society/src/pages/pharmacy/StorePopPage.tsx#L109) | 🟢 모범 패턴 존재 |

### 7.3 metadata/json 활용 가능 여부

`store_qr_codes` 에 jsonb metadata 컬럼 **없음**. POP / 자료함 (`store_execution_assets`) 와 다른 점.

후속 옵션:

- **A. `metadata jsonb` 컬럼 신설** — metadata 필요 시 모범 패턴
- **B. 명시 컬럼 추가** — `source_type`, `source_material_id` 만 추가
- **C. 기존 `description` 활용** — 텍스트 컬럼이라 reference 로 부적절. ❌

> 권장: **B** — source 추적은 검색/조회/통계 대상이므로 명시 컬럼이 적합. metadata 는 추후 필요 시 추가.

### 7.4 URL / source 분리 가능 여부

현재 `landingTargetId` 는 *URL 또는 productId* 모두 받는 polymorphic varchar. source 정보가 섞여 있지 않음 (다행). 따라서 *URL/source 분리 작업이 별도 필요 없음* — `source_material_id` 신설은 *깨끗한 추가* 만으로 충분.

### 7.5 direct content 연결 가능성

자매 IR `IR-O4O-KPA-STORE-PRODUCTION-MATERIALS-CAPABILITY-AUDIT-V1` §0 핵심 발견 #1 의 결론 — `kpa_store_contents` 에 이미 `source_type='direct'` row 들이 존재. QR 측에 `sourceMaterialId` + 분기만 추가하면 즉시 연결 가능.

### 7.6 판정

| 평가 축 | 결과 |
|--------|------|
| 현재 구조에서 production-material 연결 가능 | ❌ 불가 (source reference 부재) |
| 컬럼 추가만으로 연결 가능 | ✅ (`source_material_id`, `source_type` 2 컬럼) |
| frontend 변경 범위 | 🟢 small (`StoreQRPage.tsx:150` 분기 + form 분기) |
| 백엔드 변경 범위 | 🟢 small (entity 컬럼 / POST validate / response 직렬화) |
| 자매 IR 의존 | `IR-O4O-STORE-EXECUTION-CONTENT-ASSET-POLICY-V1` Phase 1 #2,#3 (결과물 → source reference 통일) 와 동일 작업 |

---

## 8. Risk & 의존성

| Risk | 강도 | 원인 | 완화 |
|------|:---:|------|------|
| admin-dashboard QR UI 의 실 가동 여부 미확인 | 🟡 중간 | 정적 분석으로 판단 불가 (baseURL/interceptor 가능성) | 운영 환경 1회 진입으로 즉시 판정 |
| QR 의 origin 비대칭 → production-material 연결 차단 | 🟢 낮음 | `find(origin === 'library')` 단일 분기 | 후속 WO 로 분기 확장 (POP 패턴 재사용) |
| `landingType` 와 `source_type` 의미 혼동 | 🟢 낮음 | 컬럼 추가 시 명명 신중 필요 | 자매 IR 의 어휘 정합 (`store_production_materials`) 따름 |
| migration class name file/class timestamp 불일치 | 🟢 낮음 | `name=` property 로 우회 동작 | 후속 신규 migration 시 [Memory: TypeORM Migration Class Naming](C:/Users/sohae/.claude/projects/c--Users-sohae-o4o-platform/memory/MEMORY.md) 규칙 준수 |
| `store_qr_codes.libraryItemId` FK 부재 + 자료 삭제 시 잔존 | 🟢 낮음 | 논리 참조만 (`Neture FK 금지` 정책) | 운영상 dangling reference 발생 — public landing 시 silent skip (LEFT JOIN) |
| frozen baseline (Store Layer Architecture F3) 위반 | 🟢 낮음 | 본 IR 권장은 *컬럼 추가 + 분기 추가* 이지 구조 변경 아님 | explicit WO 형식 진행 |

---

## 9. 최종 정리

### A. active canonical 구조

| 영역 | 항목 |
|------|------|
| 백엔드 controller | `createStoreQrLandingController` (multi-service common, 3-mount) |
| 백엔드 entity | `StoreQrCode`, `StoreQrScanEvent` |
| 백엔드 endpoint | `POST/GET/PUT/DELETE /pharmacy/qr` 등 10개 |
| 백엔드 service | `qr-print`, `qr-flyer` |
| 프런트 페이지 | `StoreQRPage` (kpa-society), `QrLandingPage` (kpa-society / glycopharm / neture) |
| 프런트 통합 진입 | `StartProductionModal` (4-target) |
| 프런트 출력 모달 | `QrPrintTemplateModal` |
| 프런트 API client | `services/web-kpa-society/src/api/storeQr.ts` |
| 메뉴 | `storeMenuConfig.ts` "매장 실행 / QR 코드" |
| 라우트 | `/store/marketing/qr` (App.tsx:839) |
| 공개 URL | `/qr/:slug` |

### B. transitional structure

| 항목 | 이유 | 권장 방향 |
|------|------|----------|
| `StoreQRPage.tsx:150` `origin === 'library'` 단일 분기 | snapshot/direct origin 미수용 → production-material 연결 차단 | POP 패턴(StorePopPage:109-153) 재사용하여 3 origin 분기 |
| `selectedLibraryItem` 단건 path | ProductMarketingPage 의 product-context 진입 | 시그니처는 이미 canonical 흡수됨, 그대로 유지 |
| `promotion` landingType | 백엔드 수용 ✅ / kpa-society UI 제거 / admin-dashboard UI 잔존 | UI 일치 (kpa-society 에 추가 또는 admin 에서 제거) |
| admin-dashboard `/store/qr/*` parallel UI | API path mismatch — 실 가동 의심 | runtime 검증 후 dead 면 제거 / transitional 면 명문화 |
| `description` 입력 폼 미노출 (frontend) | entity 컬럼은 있으나 form 부재 | 입력 form 추가 또는 entity 에서 제거 |
| edit (PUT) UI 부재 (frontend) | 백엔드 활성 / frontend 미연결 | edit 모달 추가 |
| migration class file/class timestamp 불일치 (`1709304120000` vs `20260304120000`) | name property 로 우회 | 후속 신규 migration 시 표준 준수 |

### C. stale naming / UI

| 항목 | 위치 | 권장 |
|------|------|------|
| 자매 IR (`QR-PRODUCTION-FLOW-STATE-AUDIT-V1` §2.1 #1) 에서 지적된 empty state 가이드 | StoreQRPage:530-535 | ✅ 이미 정정됨 (canonical) |
| `landingType: 'tablet'` 잔재 | UI 옵션 / API allowlist | ✅ 이미 제거됨 |
| `StoreQRCreateEntryModal` 모달 제목 부정확 | (자매 IR §2.1 #2) | ✅ 컴포넌트 제거됨 |

→ stale 항목 *대부분이 자매 IR 시점 이후 정리됨*. 잔존: `description` form 부재, edit UI 부재 정도.

### D. dead code

| 항목 | 위치 | 상태 |
|------|------|:---:|
| `StoreQRCreateEntryModal` | 파일 자체 | dead-removed ✅ |
| `landingType: 'tablet'` | UI/API | dead-removed ✅ |
| admin-dashboard `qr.api.ts` `/api/v1/pharmacy/qr` 호출 | API path | **dead 의심** (검증 필요) |
| admin-dashboard `QrCreatePage` / `QrListPage` | route | (위 의존) |

### E. POP 와 공통 cleanup 가능 영역

| 영역 | 현재 | cleanup 후보 |
|------|------|-------------|
| canonical 진입 | 이미 통일 | — |
| origin 분기 | **비대칭** | QR 측에 snapshot/direct 추가 (모범 패턴 = StorePopPage) |
| 출력 service | 별도 (qr-print / qr-flyer) | 공통화 가치 낮음 |
| StoreAssetSelectorModal `usageType` | 통일 (`"qr"` / `"pop"`) | — |
| menuConfig 그룹 | 통일 | — |

### F. Store Production Material 연결 가능 여부

| 평가 축 | 결과 |
|--------|------|
| 현재 그대로 가능 | ❌ |
| 컬럼 추가 (`source_material_id`, `source_type`) + 프런트 분기 확장 | ✅ |
| 자매 IR 의존 | `IR-O4O-STORE-PRODUCTION-MATERIALS-COMMON-ENTITY-RENAME-AUDIT-V1` Phase 2-A 후 / `IR-O4O-STORE-EXECUTION-CONTENT-ASSET-POLICY-V1` Phase 1 #2,#3 와 함께 |
| 변경 규모 | 🟢 small (entity 2 컬럼 + frontend 분기 + StoreQRPage form 분기) |
| frozen baseline 위반 여부 | ❌ (구조 변경 아닌 reference 통일) |

### G. 후속 WO 후보

| WO 제안 | 단계 | 의존 |
|---------|:---:|------|
| `WO-O4O-STORE-QR-ORIGIN-EXPANSION-V1` | independent | — — StoreQRPage 의 origin 분기를 POP 와 동일하게 (library + snapshot + direct) |
| `WO-O4O-STORE-QR-SOURCE-MATERIAL-REFERENCE-V1` | after RENAME-AUDIT Phase 2-A | `store_qr_codes` 에 `source_material_id` + `source_type` 추가, 자매 IR `EXECUTION-CONTENT-ASSET-POLICY-V1` Phase 1 #2,#3 의 일부로 진행 |
| `WO-O4O-ADMIN-DASHBOARD-QR-UI-FATE-DECISION-V1` | independent | runtime 1 회 검증 → dead 확인 시 제거 / 살아있을 시 baseURL 정책 명문화 |
| `WO-O4O-STORE-QR-EDIT-UI-V1` | independent | edit 모달 / `description` form 추가 (백엔드 PUT 이미 활성) |
| `WO-O4O-STORE-QR-LANDINGTYPE-PROMOTION-UI-ALIGN-V1` | independent | kpa-society 에 `promotion` 추가 또는 admin-dashboard 에서 제거 |

### H. QR canonical 방향 제안

```text
1. 결과물 entity (store_qr_codes) 를 *production-material reference 의 first-class consumer* 로 정렬
   - source_material_id (UUID, FK 없음 — 논리 참조) 추가
   - source_type ('library' | 'production_material' | …) 추가
   - 기존 library_item_id 유지 (호환성)

2. frontend Step [5] 의 origin 분기 확장
   - library → 기존 흐름
   - direct  → kpa_store_contents (= store_production_materials) 직접 fetch + form prefill
   - snapshot → state title/description fallback (POP 패턴)

3. admin-dashboard parallel QR UI 의 운명 결정
   - dead 면 제거 (라우트 + 페이지 + qr.api.ts + StoreContentWorkspacePage 진입)
   - 살아있을 시 service prefix baseURL 정책 명문화

4. landingType 'promotion' UI 정합
   - 백엔드는 이미 수용 → kpa-society UI 에 추가 또는 admin 에서 제거 (택일)

5. edit UI 활성화
   - 백엔드 PUT 이미 활성 → frontend edit 모달 추가
```

---

## 결론 (4 분류 판정)

| 분류 | 비중 | 주요 항목 |
|------|:---:|----------|
| **active canonical** | ★★★★★ | 백엔드 controller / entity / endpoint / 출력 service / kpa-society StoreQRPage 진입 / StartProductionModal / 공개 URL / scan analytics — *대부분이 canonical 정렬 완료* |
| **transitional** | ★★ | (1) origin 분기 비대칭 (production-material 연결 차단 게이트) / (2) admin-dashboard parallel QR UI / (3) ProductMarketingPage 단건 prefill (이미 시그니처 흡수됨) / (4) `promotion` UI 부정합 / (5) frontend edit UI 부재 |
| **stale legacy** | ★ | `description` form 부재, 자매 IR 시점 이후 대부분 cleanup 완료 |
| **dead code** | ★ | StoreQRCreateEntryModal (제거됨), `landingType:'tablet'` (제거됨), admin-dashboard `/api/v1/pharmacy/qr` 호출 (검증 필요) |

**핵심 결론**

> **QR 의 canonical 정렬은 거의 완료되어 있다 — 진입 흐름 / multi-service / 출력 / 공개 URL / 분석 모두 active canonical**. 남은 작업은 (a) **origin 분기 비대칭의 해소** — POP 와 동일 패턴으로 snapshot/direct 수용 → production-material 연결 / (b) **admin-dashboard parallel UI 의 운명 결정** — runtime 검증 1회로 즉시 판정 가능 / (c) **edit UI / promotion UI / description form 등 frontend 보강** 의 3 가지 transitional 정리.

> **본 IR 의 권장 진행 순서:**
>
> 1. `IR-O4O-STORE-PRODUCTION-MATERIALS-COMMON-ENTITY-RENAME-AUDIT-V1` Phase 2-A (code rename) 완료 후
> 2. `WO-O4O-STORE-QR-ORIGIN-EXPANSION-V1` — frontend 단독 작업 (백엔드 변경 없음, 가장 빠른 정렬)
> 3. `WO-O4O-STORE-QR-SOURCE-MATERIAL-REFERENCE-V1` — 백엔드 컬럼 추가 + frontend 표시
> 4. `WO-O4O-ADMIN-DASHBOARD-QR-UI-FATE-DECISION-V1` — runtime 1회 검증 후 dead 면 제거
> 5. (선택) edit UI / promotion UI / description form 정렬 WO

---

## Appendix — Cross-Reference Inventory

### 백엔드 변경 영향 (후속 WO 시)

| 파일 | 영향 | 변경 종류 |
|------|------|----------|
| [store-qr-code.entity.ts](apps/api-server/src/routes/platform/entities/store-qr-code.entity.ts) | `source_material_id` / `source_type` 컬럼 추가 | entity |
| [store-qr-landing.controller.ts](apps/api-server/src/routes/o4o-store/controllers/store-qr-landing.controller.ts) | POST validate / response 직렬화 | controller |
| 신규 migration `*-AddSourceMaterialReferenceToStoreQrCodes.ts` | ALTER TABLE ADD COLUMN | migration |

### 프런트엔드 변경 영향

| 파일 | 영향 | 변경 종류 |
|------|------|----------|
| [StoreQRPage.tsx:150](services/web-kpa-society/src/pages/pharmacy/StoreQRPage.tsx#L150) | origin 분기 확장 (`find` → 모든 origin 처리) | 단일 useEffect 수정 |
| [api/storeQr.ts](services/web-kpa-society/src/api/storeQr.ts) | `StoreQrCode` 인터페이스 + create payload 에 `sourceMaterialId` 추가 | type 확장 |
| (선택) [admin-dashboard/api/qr.api.ts](apps/admin-dashboard/src/api/qr.api.ts) | runtime 검증 결과에 따라 path 정렬 또는 제거 | dependent |

### 무관 (영향 없음)

| 파일 | 이유 |
|------|------|
| `services/qr-print.service.ts`, `services/qr-flyer.service.ts` | URL → QR 이미지 변환 로직만 — source 추적 무관 |
| `services/ai-prompts/storeQr.ts` | AI prompt 템플릿 — source 추적 무관 |
| 타 서비스 `QrLandingPage.tsx` (kpa-society / glycopharm / neture) | public 랜딩만 표시 — source 추적 무관 |

---

*조사 완료. 코드 / migration / 신규 entity 변경 없음. 후속 WO 진행은 본 IR 의 권장 순서 검토 후 별도 승인.*
