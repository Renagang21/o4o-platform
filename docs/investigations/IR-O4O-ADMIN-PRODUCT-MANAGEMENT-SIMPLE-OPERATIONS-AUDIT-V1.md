# IR-O4O-ADMIN-PRODUCT-MANAGEMENT-SIMPLE-OPERATIONS-AUDIT-V1

> **작업 성격:** 조사(IR) 전용. 코드 수정·DB 변경·migration·API mutation·프로덕션 데이터 변경 0건.
> **대상 서비스:** `admin.neture.co.kr`
> **대상 화면:** `/admin/o4o-product-db/masters`, `/admin/o4o-product-db/masters/:id`
> **작성일:** 2026-07-10
> **상태:** 조사 완료 (read-only, static code analysis)

---

## 0. 이번 조사의 목적 (고정)

이번 조사는 관리자 기능을 **확장**하기 위한 것이 아니라, **불필요한 관리 책임과 코드 복잡성을 제거하고 가장 작은 상품 상태 관리 구현안을 확정**하기 위한 것이다.

관리자 상품관리의 책임을 다음과 같이 재확정한다.

> 관리자는 O4O 표준 상품 정보와 O4O 상품 DB에서의 이용 가능 여부만 단순하게 관리한다.
> 참여자가 상품을 어디에서 어떻게 활용하는지는 조사하거나 통제하지 않는다.

따라서 본 문서는 **사용처 추적 / 연결 매장 / 공급 상품 / 주문 / 콘텐츠 / QR / POP 추적·연쇄 변경 설계를 명시적으로 제외**하며, 기존 구조 재사용과 한 번의 상태 변경·공지로 종료되는 운영을 최우선으로 한다.

---

## 9.1 현재 구조

### (1) 목록 화면 — `/admin/o4o-product-db/masters`

**파일:** `apps/admin-dashboard/src/pages/o4o-product-db/ProductMastersPage.tsx`

| 요소 | 현황 | 위치 |
|------|------|------|
| 행 체크박스 / 선택 상태 | 렌더됨. `_select` 시스템 컬럼 + `selectedKeys` state. **동작하는 일괄 작업 없음(dead)** | `ProductMastersPage.tsx:62, 187-210, 369-371` |
| 빈 ActionBar | `selectedKeys.size > 0` 일 때만 표시. `actions={[]}`, statusInfo="…후속 WO에서 제공됩니다." — **placeholder** | `ProductMastersPage.tsx:341-350` |
| 행 작업 메뉴 (RowActionMenu) | `view`(상세 보기, 동작) + `qr`(QR 연결 (후속 WO), `disabled:true` no-op) | `ProductMastersPage.tsx:268-276` |
| 상태 배지 | 이미지 상태(있음/없음), 설명서 KO/ZH 배지만. **상품 상태(정상/중단/보관) 배지 없음** | `ProductMastersPage.tsx:232-259` |
| 상태 필터 UI | **없음** (툴바 = 텍스트 검색 + 페이지크기 + "새 상품 등록"만) | `ProductMastersPage.tsx:288-331` |
| 호출 API | `listProductMasters` → `GET /api/v1/neture/products/library/search` | api client `o4o-product-db.api.ts:211-229` |

- **체크박스 dead 여부:** `selectedKeys` 의 유일 소비처는 빈 ActionBar(341-350). 파일 헤더 주석 "구조 확립 — write 액션은 후속 WO" 로 명시. 선택은 아무 동작도 유발하지 않는다.
- **BaseTable 영향(제거 시):** 안전. `packages/ui/src/components/table/BaseTable.tsx:264-265` 주석대로, `selectable` prop 은 헤더 전체선택 체크박스만 자동 배선하고 body 셀 체크박스는 소비처(`_select` 컬럼) 책임이다. `_select` 컬럼 + `selectable/selectedKeys/onSelectionChange` prop + ActionBar 블록을 제거해도 정렬·페이지네이션·컬럼표시·행클릭은 그대로 동작한다.

### (2) 상세 화면 — `/admin/o4o-product-db/masters/:id`

**파일:** `apps/admin-dashboard/src/pages/o4o-product-db/ProductMasterDetailPage.tsx`

| 영역 | 배선 상태 | 위치 | 백엔드 |
|------|----------|------|--------|
| 사용 상태 / 활용 연결 (UsageCard 3종 + UsageList: 조직 상품 연결 / 매장 취급 / 자료함 콘텐츠) | 실제 API 배선(read-only) | `ProductMasterDetailPage.tsx:451-493` | `GET /admin/o4o-product-db/masters/:id/usage-links` |
| 관리 메모 | **완전 배선(write)** — 목록/추가/삭제(숨김) | `ProductMasterDetailPage.tsx:495-544` | `GET/POST/DELETE …/masters/:id/notes[/:noteId]` |
| 작업 이력(감사로그) | 배선(read-only) + 미기록 영역 명시 disclosure | `ProductMasterDetailPage.tsx:546-576` | `GET …/masters/:id/audit-logs` |
| 설명 후보 패널의 "QR 연결 · 후속 WO" | 정적 pill(비활성), "QR 연결은 후속 WO 범위" 문구 | `ProductMasterDetailPage.tsx:386, 411` | — |
| ProductQrSection (`/p/{key}` 랜딩 QR) | 동작(별개 기능, 위 placeholder 와 무관) | `ProductMasterDetailPage.tsx:231, 800-863` | `GET …/product-landings/by-master/:id/qr` |
| `FollowupNote` placeholder 컴포넌트 | 정의되어 있으나 **render 미참조(dead code)** | `ProductMasterDetailPage.tsx:615-622` | — |

- 상세 조회 API: `getProductMaster(id)` → `GET /api/v1/neture/products/library/:id` (`o4o-product-db.api.ts:320`).

### (3) 목록·상세 API (백엔드)

- **관리자 목록** = 참여자 picker 와 **동일 엔드포인트**: `GET /api/v1/neture/products/library/search` — `apps/api-server/src/modules/neture/controllers/product-library.controller.ts:29` → `netureService.searchProductMasters` → `catalog.service.ts:359` `searchProductMasters()`.
  - **상태 필터 전무.** 텍스트 `q` / `categoryId` / `brandId` / `regulatoryType` / `drugCategory` 만 필터. 아무것도 제외하지 않는다(soft-delete·status 게이트 없음). `catalog.service.ts:374-427` 확인.
- **상세**: `GET /api/v1/neture/products/library/:id` — `product-library.controller.ts:89` → `catalog.service.ts:85` `getProductMasterById` (+read-only enrichment).
- **생성**: `POST /api/v1/admin/o4o-product-db/masters` — `product-master-create.controller.ts:48` → `resolveOrCreateMaster` / `createMasterWithInternalCode` (`catalog.service.ts:109, 200`). **상태/활성 필드를 세팅하지 않음(필드 자체가 없음).** 상태 도입 시 기본값 seed 위치는 이 생성 경로.
- **기존 UPDATE**: `PATCH /api/v1/neture/admin/masters/:id` — `admin.controller.ts:653` → `catalog.service.ts:295` `updateProductMaster`. 가변 필드 화이트리스트: `name, brandName, categoryId, brandId, specification, originCountry, tags, drugCategory`. 불변: `barcode, regulatoryType, regulatoryName, manufacturerName, mfdsPermitNumber, mfdsProductId`. **status mutation 은 존재하지 않는다.**

### (4) ProductMaster 상태 관련 필드

**파일:** `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts` (table `product_masters`)

- **`status` / `isActive` / `isArchived` / `archivedAt` / `suspendedAt` / `visibility` / `reviewStatus` / `approvalStatus` / `isDeleted` / `state` / `deletedAt` 모두 없음.**
- **soft-delete 없음** — `@DeleteDateColumn` / `deleted_at` 컬럼 없음. (자식 엔티티는 모두 `deleted_at` 보유 — master 만 예외.) 과거 의료기기 정비는 **hard `DELETE`** 로 수행됨.
- 유일한 status 유사 컬럼 = **`product_data_status` varchar(32) nullable** (`ProductMaster.entity.ts:126-127`).
  - migration `20261206000000-AddProductCurationSchemaAndCandidateIdentifierIndex.ts:37` 로 추가.
  - 의미 = **의료기기 grade 데이터 정비 파이프라인 마커** (`graded` / `delete_marked` / `review_required` / NULL). 값 세팅은 DML migration 에서만 이뤄지고 **런타임 서비스 사용처 0건**(entity 정의 외 참조 없음).
  - `delete_marked` 는 이후 hard delete 큐로 사용됨(`20261207010000-…:28` `DELETE FROM`).

### (5) 관리 메모

- 테이블 `product_master_notes` (엔티티 클래스 없음, raw SQL). 서비스 `product-master-note.service.ts` (`visibility` per note, `deleted_at` soft-delete). migration `20261212000000-CreateProductMasterNotes.ts` (FK `product_master_id → product_masters(id) ON DELETE CASCADE`).
- 컨트롤러 `product-master-note.controller.ts` (`GET/POST/DELETE /:id/notes`). **구현 완료·즉시 사용 가능.** master 는 건드리지 않고 notes 테이블만 write.

### (6) 감사로그 / 작업 이력

- **읽기 전용 파생 뷰**: `product-master-audit-log.service.ts:59` `getAuditLog()` — 공용 `audit_logs` 테이블은 ProductMaster 이벤트를 기록하지 않으므로(주석 line 12) notes/descriptions/images/identifiers 를 조합해 타임라인 생성 + `gaps`(미기록 영역) 명시.
- 컨트롤러 `product-master-audit-log.controller.ts:39` `GET …/masters/:id/audit-logs`.
- **전용 master-event writer 없음** — 상태 변경 시 현재로선 이력이 남지 않는다(명시된 gap). 별도 스냅샷 테이블 `product_master_cleanup_audits`(FK 없음, `20261206000000`) 는 삭제 감사용으로 존재.

### (7) 공지 기능

- **작성 화면**: `apps/admin-dashboard/src/pages/kpa/HubNoticeListPage.tsx` — "HUB 공지 관리", route `/operator/hub-notices`, CRUD(create/edit/archive). `cms_contents`(type='notice') 재사용, 전용 notice 테이블 없음.
- **백엔드 생성**: `POST /api/v1/cms/contents` — `cms-content-mutation.handler.ts:91`. body 에 `title/summary/body/metadata/serviceKey` 자유 입력 → **상품명·사유를 title/body/metadata 로 전달 가능**. 단, notice 를 `masterId` 에 묶는 백엔드 필드는 없다(연결 시 클라이언트 라우터 state/query 로 조합).

### (8) 참여자용 ProductMaster 검색 경로 (구조만 — 사용 데이터 미조사)

| 엔드포인트 | 파일:line | 공통 메서드 |
|-----------|-----------|-------------|
| `GET /api/v1/neture/products/library/search` (공급자/저작 picker **+ 관리자 목록**) | `product-library.controller.ts:29,33` | `searchProductMasters` |
| `GET /api/v1/store/products/search` (매장 owner picker) | `store-product-library.controller.ts:117,123` | `searchProductMasters` |
| `GET /api/v1/operator/products` (operator 콘솔) | `ProductConsoleController.ts:29` | **별도 raw SQL** |
| `GET /api/v1/neture/admin/masters` | `admin.controller.ts:591` → `getAllProductMasters` | **별도(`find` all)** |

- **핵심 확정(직접 재확인):** `catalog.service.ts:359` `searchProductMasters()` 가 관리자 목록·공급자/저작 picker·매장 picker 3경로의 **단일 공통 메서드**이다(호출부 `product-library.controller.ts:33`, `store-product-library.controller.ts:123`, admin client `o4o-product-db.api.ts:223`). 현재 상태 필터가 전혀 없다.
- 단, 관리자 목록과 공급자 picker 는 **같은 엔드포인트**(`/neture/products/library/search`)를 공유하므로, 엔드포인트 레벨 무조건 필터는 불가 → **메서드 파라미터(caller-differentiated) 방식**이 필요.

---

## 9.2 불필요 요소 (제거 또는 관리 범위 밖)

관리자 상품관리를 "O4O 표준 상품 정보 + 이용 가능 여부"로 단순화하면 다음은 **불필요**하다.

| 요소 | 판정 | 근거 |
|------|------|------|
| 사용처 확인 / 활용 연결 (UsageCard·UsageList 3종) | **제거** | 참여자 활용은 관리 책임 밖. read-only 조회지만 관리 범위 재정의로 제거 대상 |
| 사용 상태 패널(연결 수 집계 3 counts) | **제거** | 연결 수 계산은 원칙 §2.2 위반(사용처 전수 계산) |
| 목록 체크박스 + 빈 ActionBar | **제거** | 동작하는 일괄 작업 없음(dead), 원칙 §2.1(버튼 최소화) |
| 비활성 "QR 연결(후속 WO)" 행 메뉴·상세 pill | **제거** | `disabled` no-op placeholder |
| `FollowupNote` dead 컴포넌트 | **제거** | render 미참조 |
| 참여자별 추적 / 조치 완료 상태 | **미구현(범위 밖)** | 원칙 §2.3 — 공지로 종료, 관리 업무화 금지 |

> **경계 고정:** 사용처 조회 API 추가, 연결 수 집계, 참여자 데이터 자동 수정, 서비스별 연쇄 mutation, QR·POP·콘텐츠 연쇄 제거는 **이번 및 직후 구현 범위에서 명시적으로 제외**한다.

---

## 9.3 재사용 가능한 구조

| 구조 | 재사용 여부 | 비고 |
|------|:-----------:|------|
| 기존 상태 필드(`product_data_status`) | **재사용 부적합** | 의료기기 정비 파이프라인 마커. ACTIVE/SUSPENDED/ARCHIVED 로 오버로드 시 의미 충돌 |
| 공통 검색 메서드 `searchProductMasters` | **재사용(확장)** | optional `statuses` 파라미터 1개 추가로 3경로 일괄 커버 |
| 기존 `PATCH …/admin/masters/:id` | **재사용(확장)** | 화이트리스트 패턴에 `status` 1필드 추가 or 전용 status 엔드포인트 |
| 관리 메모 API/테이블 | **재사용** | 이미 완비. 상태 변경 사유 보조 기록에 활용 가능 |
| 감사로그 파생 뷰 | **재사용** | 상태 변경 이벤트 소스만 추가 연결하면 gap 축소 |
| 공지 `POST /cms/contents` (type='notice') | **재사용** | 상품명·사유 title/body 로 전달 가능 |
| 공통 UI BaseTable / RowActionMenu / ActionBar | **재사용** | 상태 배지·필터·행 작업을 최소 변경으로 수용 |

---

## 9.4 최소 구현 권고안

### 상태 구조 — **B안 채택** (단일 enum 컬럼 신설)

```
product_masters.status  varchar(32)  NOT NULL DEFAULT 'ACTIVE'
  ACTIVE | SUSPENDED | ARCHIVED
```

- 코드베이스 관례(모든 sibling = "varchar + application-level union, DB enum 미사용")를 따른다.
- **A안(기존 필드 재사용) 기각 사유는 §7 비교 참조.** 요약: 재사용 가능한 의미의 기존 필드가 없다(`product_data_status` 는 정비 파이프라인 전용, 나머지 status 는 자식 엔티티의 승인/검수/게시 정책).

### 단건 API

- **전용 최소 엔드포인트 권장**: `PATCH /api/v1/admin/o4o-product-db/masters/:id/status`
  - body: `{ status, reason }` → `status` 갱신 + `reason`/`actor`/`timestamp` 를 관리 메모(`product_master_notes`) 또는 감사 소스로 기록.
  - 대안(더 작음): 기존 `PATCH …/admin/masters/:id` 화이트리스트에 `status` 추가. 단 사유·actor 기록 요구가 있으면 전용 엔드포인트가 더 명확.
- **상태 변경은 단일 트랜잭션 1회로 종료.** 참여자 데이터 연쇄 mutation·이벤트 전파·배치 없음.

### 관리자 목록 필터

- `searchProductMasters(params)` 에 `statuses?: string[]` (기본 `['ACTIVE']`) 추가.
- 관리자 목록 caller(`product-library.controller.ts:29`)는 `statuses` opt-in(전체/정상/이용중단/보관 조회 유지) → 프론트 툴바에 상태 필터 select 추가.

### 일반 검색 제외 조건 (참여자)

- 참여자 caller(`store-product-library.controller.ts:117`, 그리고 picker 로 쓰이는 `/neture/products/library/search` 의 참여자 진입)는 **기본값(ACTIVE-only)** 사용 → 프론트 수정 없이 백엔드 기본 필터로 SUSPENDED/ARCHIVED 제외.
- **주의(별도 커버 필요):** `/operator/products`(`ProductConsoleController.ts:29`, 별도 raw SQL)와 `/neture/admin/masters`(`getAllProductMasters`)는 공통 메서드를 쓰지 않으므로, 참여자 노출 경로에 해당한다면 각각 `status='ACTIVE'` 조건을 개별 추가해야 한다. (관리자 전용이면 불필요.)

### 행별 작업

- 상세 보기(유지) + **보관(ARCHIVE)** / **이용 중단(SUSPEND)** / **정상 복원(RESTORE→ACTIVE)** 3개 단건 액션.
- 비활성 QR 메뉴 제거.

### 상세 화면 정비

- 사용 상태/활용 연결 패널 **제거**.
- 관리 메모·작업 이력 **유지(기존 API)**.
- 상태 배지 + 상태 변경 액션 노출.

### 공지 처리 방식

- **자동 연결 최소화 권장**: 이용 중단 후 "공지 작성" 버튼 → `/operator/hub-notices` 신규 작성 화면으로 이동하며 상품명·사유를 router state/query 로 프리필. 백엔드 신규 필드 없음.
- **자동 생성이 코드를 복잡하게 하면 연결하지 않는다** — 운영자가 기존 공지 메뉴에서 직접 작성하는 방식이 더 단순하면 그것을 채택. 공지 열람 추적·대상자 계산·미확인 재알림은 **범위 밖**.

---

## 9.5 변경 파일 예상 목록 (후속 구현 시 — 실제 변경 없음)

**frontend**
- `apps/admin-dashboard/src/pages/o4o-product-db/ProductMastersPage.tsx` (체크박스/ActionBar/QR메뉴 제거, 상태 배지·필터·행 작업)
- `apps/admin-dashboard/src/pages/o4o-product-db/ProductMasterDetailPage.tsx` (사용상태/활용연결 제거, 상태 배지·액션, dead code 정리)
- `apps/admin-dashboard/src/api/o4o-product-db.api.ts` (상태 변경 client, `statuses` 파라미터)

**backend**
- `apps/api-server/src/modules/neture/controllers/product-library.controller.ts` (관리자 caller `statuses` opt-in)
- `apps/api-server/src/routes/o4o-store/controllers/store-product-library.controller.ts` (기본 ACTIVE-only 확인)
- `apps/api-server/src/modules/neture/controllers/product-master-create.controller.ts` (생성 시 기본 status)
- 신규/확장 status 엔드포인트 컨트롤러 + `catalog.service.ts` (`searchProductMasters` `statuses`, status mutation)
- (범위 판단 후) `ProductConsoleController.ts` / `admin.controller.ts` 개별 필터

**entity**
- `apps/api-server/src/modules/neture/entities/ProductMaster.entity.ts` (`status` 컬럼 추가)

**migration**
- 신규 `…-AddStatusToProductMasters.ts` (`ADD COLUMN status varchar(32) NOT NULL DEFAULT 'ACTIVE'`) — additive/nullable-safe backfill 불필요(DEFAULT)

**API client / docs**
- 위 api.ts + 본 IR 후속 WO 문서

---

## 9.6 후속 WO 분리 (§10)

### 1순위 — `WO-O4O-ADMIN-PRODUCT-MASTER-CONSOLE-SIMPLIFICATION-V1`
- 동작 안 하는 체크박스 제거 / 빈 ActionBar 제거 / 비활성 QR 메뉴 제거 / 활용 연결·사용 상태 영역 제거 / dead code 정리. **DB·API 무변경(프론트 정리 위주).** 가장 안전, 선행 가능.

### 2순위 — `WO-O4O-ADMIN-PRODUCT-MASTER-STATUS-FOUNDATION-V1`
- `product_masters.status` enum 컬럼(ACTIVE/SUSPENDED/ARCHIVED) 신설 + migration. 생성 시 기본 상태 = ACTIVE. 상태 변경 사유·변경자·시각 최소 기록(메모/감사 연결).

### 3순위 — `WO-O4O-ADMIN-PRODUCT-MASTER-STATUS-ACTIONS-V1`
- 단건 보관/이용 중단/정상 복원 API + 관리자 상태 배지·필터 + 참여자 검색 ACTIVE-only 기본 필터(`searchProductMasters` `statuses`).

### 4순위 — `WO-O4O-ADMIN-PRODUCT-MASTER-BASIC-EDIT-V1`
- 제한된 기본 정보 수정(기존 PATCH 화이트리스트 활용) + 변경 사유 + 작업 이력.

### 5순위 — 이미지·설명·메모·작업 이력 세부는 조사 결과에 따라 별도 분리(현재 대부분 이미 배선됨).

---

## 7. A안 vs B안 비교 (§7 요구)

### A안 — 기존 필드 재사용
- **조건 불충족.** ProductMaster 에 ACTIVE/SUSPENDED/ARCHIVED 의미를 표현할 수 있는 기존 필드가 없다.
  - `product_data_status`: 의료기기 정비 파이프라인 전용(`graded`/`delete_marked`/`review_required`), 런타임 사용 0건 → 오버로드 시 의미 충돌.
  - 승인/검수/게시 status 는 모두 **자식 엔티티**(`ProductDrugExtension`, `SharedProductDescription`, `ProductIdentifier`, `supplier_product_offers`)에 존재 → master 라이프사이클과 무관.
  - soft-delete(`deletedAt`)도 없음.
- 결론: 재사용할 필드가 없어 A안은 성립하지 않음(migration 없이 끝나는 이점 실현 불가).

### B안 — 단일 상태 컬럼 추가 (채택)
- `product_masters.status varchar(32) NOT NULL DEFAULT 'ACTIVE'`.

### 판정 기준 대조

| 기준 | A안 | B안 |
|------|:---:|:---:|
| 코드가 더 단순한가 | ✗(존재 필드 없음 → 우회 로직 필요) | ✔ |
| 운영자 이해 쉬움 | ✗(정비 마커 혼재) | ✔ |
| 기존 의미와 충돌 없음 | ✗ | ✔ |
| 서비스별 수정 최소 | 동일 | ✔(공통 메서드 1곳) |
| 상태 변경 1 API 종료 | 동일 | ✔ |
| 장기 관리 부담 적음 | ✗ | ✔ |

→ **B안 추천.** additive DEFAULT 컬럼이라 backfill 불필요, 공통 검색 메서드 1곳 확장으로 참여자 노출 제외를 커버, 상태 변경이 단일 API 로 종료된다.

---

## 최종 보고 (§12 형식)

```
IR-O4O-ADMIN-PRODUCT-MANAGEMENT-SIMPLE-OPERATIONS-AUDIT-V1 완료

1. 현재 상품 상태 구조
- 기존 필드: product_data_status(varchar32, 정비 파이프라인 전용, 런타임 미사용) 외 없음.
              status/isActive/isArchived/deletedAt/reviewStatus 전무. soft-delete 없음.
- 재사용 가능 여부: 부적합 (의미 충돌, 재사용할 라이프사이클 필드 없음).
- 권장안: B안 — product_masters.status varchar(32) NOT NULL DEFAULT 'ACTIVE' (ACTIVE/SUSPENDED/ARCHIVED).

2. 목록 화면 정비
- 제거: 행 체크박스, 빈 ActionBar, 비활성 QR 연결 메뉴.
- 유지: 텍스트 검색, 이미지/설명서 배지, 상세 보기 행 작업.
- 후속: 상태 배지 + 상태 필터(전체/정상/이용중단/보관) + 보관/중단/복원 행 작업.

3. 상세 화면 정비
- 제거: 사용 상태 패널, 활용 연결(UsageCard/UsageList), 연결 수 집계, FollowupNote dead code, QR placeholder.
- 유지: 기본 정보, 이미지, 설명 후보, 관리 메모(write 완비), 작업 이력(read 완비), ProductQrSection.
- 후속: 상태 배지 + 보관/중단/복원 액션.

4. 일반 상품 검색 제외 방법
- 공통 API: catalog.service.searchProductMasters (관리자 목록·공급자/저작 picker·매장 picker 3경로 단일 메서드).
- 관리자 예외: statuses 파라미터 opt-in 으로 전체 상태 조회 유지 (관리자·참여자 동일 엔드포인트라 caller-differentiated 필요).
- 서비스별 프론트 수정 필요 여부: 불필요 (백엔드 기본값 ACTIVE-only). 단 /operator/products·/neture/admin/masters 별도 raw SQL 은 참여자 노출 시 개별 조건 추가.

5. 관리 메모·작업 이력
- 기존 구조: product_master_notes(write API 완비) + audit-log 파생 뷰(read, gaps 명시).
- 재사용 여부: 재사용. 상태 변경 사유/actor 는 메모 또는 감사 소스에 기록.

6. 공지 처리
- 기존 공지 재사용: POST /cms/contents(type='notice') + /operator/hub-notices 작성 화면.
- 권장 방식: 이용 중단 후 공지 작성 화면으로 상품명·사유 프리필(라우터 state). 복잡하면 자동 연결 생략, 운영자 직접 작성. 열람 추적·대상자 계산·재알림은 범위 밖.

7. 명시적 제외
- 사용처 추적: 제외.
- 참여자 데이터 연쇄 변경: 제외.
- 참여자별 조치 관리: 제외.
- (추가) 연결 수 집계·QR/POP/콘텐츠 연쇄 제거·영구 삭제·상품 병합·대량 정비·프로덕션 데이터 변경: 제외.

8. 다음 WO
- 1순위: WO-O4O-ADMIN-PRODUCT-MASTER-CONSOLE-SIMPLIFICATION-V1 (프론트 정리, DB·API 무변경).
- 2순위: WO-O4O-ADMIN-PRODUCT-MASTER-STATUS-FOUNDATION-V1 (status 컬럼 + migration + 생성 기본값).
- 3순위: WO-O4O-ADMIN-PRODUCT-MASTER-STATUS-ACTIONS-V1 (단건 보관/중단/복원 + 배지/필터 + 참여자 ACTIVE-only 기본 필터).

9. 변경
- 코드 변경 0
- DB 변경 0
- API mutation 0
- 프로덕션 데이터 변경 0
```

---

## 영구 삭제 (§4.4) 확인 결과

- 현재 ProductMaster 에 **soft-delete 없음**, hard `DELETE` 만 과거 migration 에서 사용.
- FK 영향: `supplier_product_offers.master_id` / `organization_product_listings.master_id` 는 **ON DELETE RESTRICT** → 활성 offer/listing 있는 master 물리 삭제는 DB 레벨에서 차단. 그 외 `product_images`·`product_identifiers`·`product_drug_extensions`·`shared_product_descriptions`·`product_master_notes`·`product_aliases` 는 CASCADE, `product_candidates.matched_product_master_id` 는 SET NULL.
- **판정:** RESTRICT FK 때문에라도 영구 삭제보다 **ARCHIVED 상태 전환이 안전**. 영구 삭제 기능은 일반 관리자 화면에서 제외해도 운영상 문제 없음(정리는 ARCHIVE 로 커버). 영구 삭제 구현은 별도 판단으로 남긴다.
