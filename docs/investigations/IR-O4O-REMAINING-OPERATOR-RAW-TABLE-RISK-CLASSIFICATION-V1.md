---
id: IR-O4O-REMAINING-OPERATOR-RAW-TABLE-RISK-CLASSIFICATION-V1
title: "남아 있는 operator/admin raw table 화면 리스크 재분류"
status: draft
date: 2026-05-09
scope:
  - GlycoPharm operator InvoicesPage / SettlementsPage
  - Neture admin OperatorsPage / AdminSupplierApprovalPage / AdminPartnerMonitoringPage / CommunityManagementPage
  - Neture partner PartnerStoresPage
  - K-Cosmetics signage HqMediaPage / HqPlaylistsPage
  - GlycoPharm signage HqMediaPage / HqPlaylistsPage
related:
  - docs/investigations/IR-O4O-OPERATOR-LIST-COMMONIZATION-AUDIT-V1.md
  - docs/architecture/O4O-KPA-OPERATOR-CANONICAL-STATE-V1.md
  - docs/baseline/NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3.md
  - docs/baseline/NETURE-PARTNER-CONTRACT-FREEZE-V1.md
constraint:
  - 조사만 수행 — 코드 / migration / API / 권한 변경 없음
  - 자매 IR 의 분류를 *재검증* 하는 것이 목적, 무비판적 재인용 금지
---

# IR-O4O-REMAINING-OPERATOR-RAW-TABLE-RISK-CLASSIFICATION-V1

> [IR-O4O-OPERATOR-LIST-COMMONIZATION-AUDIT-V1](IR-O4O-OPERATOR-LIST-COMMONIZATION-AUDIT-V1.md) 와
> [WO-O4O-OPERATOR-DATATABLE-SOURCE-ALIGN-V1](../../) (`7c68ff1f5`),
> [WO-O4O-KCOS-ORDERS-DATATABLE-CANONICAL-ALIGN-V1](../../) (`2acd93223`) 정비 후
> 남아 있는 11개 raw table / legacy list 화면을
> **즉시 가능 / 도메인 검토 필요 / 현 구조 유지 / 미적용** 으로 재분류한다.

- 작성일: 2026-05-09
- 기준 브랜치: `main` (`2acd93223` 시점)
- 작업 규칙: 조사만, 코드 변경 없음

---

## 0. 결론 요약 (TL;DR)

> **자매 IR(IR-O4O-OPERATOR-LIST-COMMONIZATION-AUDIT-V1) 의 D 분류 4건이 오분류였음을 본 IR 가 정정한다.**
> HQ Signage 4개 화면(K-Cosmetics × 2, GlycoPharm × 2)은 *카드 그리드가 아니라 raw `<table>`*
> 이며, 이 중 3개는 즉시 canonical 가능, 1개는 thumbnail 컬럼 정책 결정 후 가능.
> 자매 IR §5.2 "HQ Signage 카드 그리드 — UX 가 정답" 은 *코드를 읽지 않은 추정* 이었다.

### 11개 화면 최종 분류

| # | 서비스 | 화면 | 이전 분류 | **재분류** | 우선순위 |
|---|---|---|:---:|:---:|---|
| 1 | GlycoPharm | `operator/InvoicesPage` | C | **B** | 자금 도메인 IR 후 정비 |
| 2 | GlycoPharm | `operator/SettlementsPage` | C | **B** (mock) | 실 API 정의 후 정비 |
| 3 | Neture | `admin/OperatorsPage` | C | **A** | 즉시 정비 가능 (가장 단순) |
| 4 | Neture | `admin/AdminSupplierApprovalPage` | C | **B** | freeze §2.1 확인 후 정비 (Approval drawer 추출 후보) |
| 5 | Neture | `admin/AdminPartnerMonitoringPage` | C | **A** (read-only KPI) | 즉시 정비 가능, 변경 금지 (freeze §5) |
| 6 | Neture | `admin/CommunityManagementPage` | C | **C** | 저트래픽, Layer 5 유연성, 후순위 |
| 7 | Neture | `partner/PartnerStoresPage` | C | **C** (mock) | 실 API 연결 전 정비 가치 0 |
| 8 | K-Cosmetics | `signage/HqMediaPage` | D | **A** | 즉시 정비 가능 (오분류 정정) |
| 9 | K-Cosmetics | `signage/HqPlaylistsPage` | D | **A** | 즉시 정비 가능 (오분류 정정) |
| 10 | GlycoPharm | `signage/HqMediaPage` | D | **B** | thumbnail 컬럼 정책 결정 후 (오분류 정정) |
| 11 | GlycoPharm | `signage/HqPlaylistsPage` | D | **A** | 즉시 정비 가능 (오분류 정정) |

### 핵심 발견 6가지

1. **HQ Signage D 4건 모두 오분류**:
   - K-Cosmetics `HqMediaPage` / `HqPlaylistsPage`, GlycoPharm `HqPlaylistsPage` — *카드 그리드가 아닌 raw `<table>`* (실제 6~7컬럼 표). 자매 IR §5.2 의 "thumbnail-first 카드 그리드" 라는 비공통화 사유 미성립.
   - GlycoPharm `HqMediaPage` 만 *thumbnail 컬럼이 있는 raw table* (table + thumbnail 하이브리드). 카드 그리드는 아니지만 thumbnail 보존 결정이 필요해 B.

2. **즉시 A 분류 가능 화면 4개**:
   - Neture `admin/OperatorsPage` (가장 단순, deactivate/reactivate toggle만)
   - Neture `admin/AdminPartnerMonitoringPage` (read-only KPI display, freeze §5 "조회 최적화" 허용)
   - K-Cosmetics `signage/HqMediaPage`, `HqPlaylistsPage` (raw 6컬럼 table, no card grid)
   - GlycoPharm `signage/HqPlaylistsPage` (raw 7컬럼 table, no thumbnail column)

3. **B 분류 (도메인 검토 후 정비) 4개**:
   - GlycoPharm `InvoicesPage` — 자금 도메인 회귀 리스크: KRW 포매팅 + 다중상태 머신 (DRAFT→CONFIRMED→SENT→RECEIVED) + dispatch log. 실 API 사용 중.
   - GlycoPharm `SettlementsPage` — mock data only. 실 API 정의 + 5% commission rate 정책 확정 + status workflow 정의 후 정비.
   - Neture `admin/AdminSupplierApprovalPage` — `NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3` §2.1 (Layer 1 Supplier Approval Gate) 인접. 상태 머신 (PENDING → APPROVED|REJECTED) 보존 확인 후 정비. **`ApprovalDrawerLayout` 추출 후보 1순위**.
   - GlycoPharm `signage/HqMediaPage` — table + thumbnail 컬럼. 마이그레이션 가능하나 thumbnail-in-DataTable 패턴이 캐노니컬에 없음 → 정책 결정 필요.

4. **C 분류 (현 구조 유지 권장) 2개**:
   - Neture `admin/CommunityManagementPage` — 3 탭 + 듀얼 테이블 + 인라인 모달 폼. 트래픽 낮음, Layer 5 캠페인 유연성 영역. 정비 가치 < 비용.
   - Neture `partner/PartnerStoresPage` — *mock data only*, API 미연결. 실 API 연결되기 전까지 정비 가치 0.

5. **`ApprovalDrawerLayout` 추출 1순위**:
   - 자매 IR §6.1 의 Phase 3 추상화 후보. 본 IR 에서 **Neture `AdminSupplierApprovalPage`** 가 가장 깨끗한 패턴 (`reject reason textarea` + `BaseDetailDrawer` 후보 + `defineActionPolicy({ PENDING: ['approve', 'reject'] })`) 임을 확인.
   - KPA `ProductApplicationManagementPage`, `PharmacyRequestManagementPage`, `QualificationRequestsPage` + K-Cosmetics `EventOfferApprovalsPage`/`ForumRequestsPage`/`ForumDeleteRequestsPage` + 본 화면 = **8개 화면 동일 패턴 확인**.

6. **자금 도메인 (Invoice/Settlement) 정비는 별도 IR 사이클**:
   - InvoicesPage 의 `krw()` formatter 와 SettlementsPage 의 `(amount/10000) + '만원'` formatter 가 *서로 다름*. 정비 시 단일 canonical formatter 통일 필요. 본 IR 범위 외.

---

## 1. 분류 기준

| 분류 | 정의 | 후속 처리 |
|---|---|---|
| **A** | 즉시 DataTable 정비 가능 — 단순 raw table, 회귀 리스크 낮음, 도메인 freeze 미접촉 | WO 1건으로 마이그레이션 |
| **B** | 별도 도메인 IR 후 정비 — 자금 / freeze 인접 / mock data → 실 API / 캐노니컬에 없는 패턴 | 도메인 IR 선행 → WO |
| **C** | 현재 구조 유지 권장 — 저트래픽 / mock-only / Layer 5 유연성 / 정비 가치 < 비용 | 정비 보류, 변동 발생 시 재평가 |
| **D** | 정비 대상 아님 — 컴포넌트가 list 가 아니거나 (editor / KPI only / 단일 detail) | 본 IR 대상 외 |

**중요**: 본 IR 는 **자매 IR 의 D 분류 4건을 모두 정정**한다. D 는 *진짜 도메인 특화 UX (예: card grid)* 인 화면에만 부여하며, "raw `<table>` 이지만 도메인이 다르다" 는 D 가 아닌 B 분류 대상이다.

---

## 2. 화면별 조사 결과

### 2.1 GlycoPharm operator/InvoicesPage

**현재 구조**:
- **실 API**: `api.get('/glycopharm/invoices')`, `POST /glycopharm/invoices/{id}/confirm` 등 다수
- 필터: status 탭 (all/DRAFT/CONFIRMED/ARCHIVED), 검색 없음, **pagination 없음**
- Row actions: inline icon buttons 6개 (View detail / CSV export / Confirm / Send / Mark received / Dispatch log) — status 별 조건부
- Detail modal: 라인 769-887 (line-item nested table 포함)
- State complexity: **10개 useState** (상위권 복잡도)
- Status badges: 다중상태 (`InvoiceStatus + DispatchStatus` 2D 매트릭스)
- Lifecycle: DRAFT → CONFIRMED → SENT → RECEIVED + ARCHIVED 분기
- `<table>` 위치: 라인 417-521 (9 컬럼)

**raw table 사용 사유**:
- KRW 포매팅 복잡도: `unitPrice`, `amount` → `krw()` + `.toLocaleString()` (라인 114-116)
- 다중 상태 배지: status × dispatch 2D
- 조건부 액션 버튼 5-6개 (status 별 가시성)
- 단순 "아직 마이그레이션 안 됨" — 아키텍처 차단 요소 없음

**DataTable 마이그레이션 가능성**:
- 9 컬럼 → `ListColumnDef<Invoice>` 매핑 자체는 직선적
- DataTable 미지원: expandable rows, footer totals, row grouping (모두 본 화면에 없음)
- detail modal 의 nested line-item table 은 그대로 유지 가능

**회귀 리스크**:
| 항목 | 강도 | 이유 |
|---|:---:|---|
| KRW 포매팅 표시 변경 | 🟡 중간 | `krw()` formatter 가 column render 로 이동 시 thousands separator / 자릿수 누락 위험 |
| 상태→액션 매핑 | 🟡 중간 | DRAFT-only confirm, CONFIRMED-only send 등 조건부 가시성 정확히 보존 필요 |
| dispatch log 모달 wiring | 🟡 중간 | row click 외 별도 trigger, 마이그레이션 시 분리 필요 |
| 운영 데이터 (실 API) | 🟡 중간 | mock 아님 — 실 청구 데이터 표시 사이클 |

**재분류**: **B** — 자금 도메인 정확성 IR 선행 필요 (KRW formatter 통일, status transition 정의, dispatch log 분리)

---

### 2.2 GlycoPharm operator/SettlementsPage

**현재 구조**:
- **Mock data only** (라인 46-104 `sampleSettlements` 인라인) — API 미연결
- 필터: 탭 (all/pending/processing/completed) + 약국 검색 + 기간 필터
- Row actions: dropdown menu (4 actions: detail / process / retry / download statement)
- Detail modal: 미구현
- State complexity: 5개 useState
- Status badges: custom `StatusBadge()` (라인 117-133) icon + label
- Lifecycle: pending → processing → completed; failed → retry
- Pagination: client-side (10/page, full UI: prev/page-numbers/next)
- `<table>` 위치: 라인 348-460 (8 컬럼)

**raw table 사용 사유**:
- 만원 단위 포매팅: `(amount/10000).toLocaleString() + '만원'` (라인 395-404)
- Custom dropdown 액션 메뉴 (라인 417-455, 고정 backdrop)
- 자체 pagination 위젯 (라인 471-497)
- mock 단계 — 실 API 미정의로 인한 미마이그레이션

**DataTable 마이그레이션 가능성**:
- 8 컬럼 → `ListColumnDef<Settlement>` 매핑 직선적
- 자체 pagination → 외부 JSX pagination block (canonical 패턴) 으로 교체 가능
- **차단 요소**: 실 API 미정의 — endpoint / response schema / commission rate 정책 / status transition 규칙 미확정

**회귀 리스크**: mock-only → **운영 영향 0**. 단 정비 가치도 0 (실 API 정의 전).

**재분류**: **B** — *실 API 정의 + commission 정책 확정* 후 정비.

---

### 2.3 Neture admin/OperatorsPage

**현재 구조**:
- **실 API**: `adminOperatorApi.getOperators` (라인 미상)
- 필터: active/inactive toggle, 이름/이메일 검색, role 필터 — 모두 client-side
- Row actions: inline soft-deactivate / reactivate (모달 없음)
- Detail modal: 없음
- State complexity: 단순
- Status: boolean `isActive`
- Pagination: 없음 (in-memory array)
- `<table>` 위치: 라인 143-213 (6 컬럼)

**도메인 컨텍스트**:
- Neture 운영자 lifecycle 관리 (활성화/비활성화만)
- **freeze 계약 미접촉** — 운영자 user record, supplier/distribution 영역 아님
- 트래픽 낮음 (scaffold 성격)
- `UsersManagementPage` 와 **중복 아님** (OperatorsPage 는 Neture-only admin user, UsersManagement 는 광역 org user)

**DataTable 마이그레이션 가능성**: 매우 높음. 6 필드 → `ListColumnDef<NetureOperatorInfo>` 직접 매핑. row action 은 2버튼 `RowActionMenu` 충분.

**회귀 리스크**: 매우 낮음. 단순 boolean state, no notes / no approval history.

**재분류**: **A** — 즉시 정비 가능 (가장 단순한 후보).

---

### 2.4 Neture admin/AdminSupplierApprovalPage

**현재 구조**:
- **실 API**: `adminSupplierApi.getSuppliers`
- 필터: status (PENDING/ACTIVE/REJECTED/INACTIVE), 이름/이메일 검색
- Row actions: PENDING 일 때 approve / reject, ACTIVE 일 때 deactivate
- **Reject 액션 → 모달 + reason textarea** (라인 211-240)
- Detail modal: reject reason 입력 모달 (라인 211-240)
- Pagination: 없음
- `<table>` 위치: 라인 147-207 (6 필드)

**도메인 컨텍스트**:
- **`NETURE-DOMAIN-ARCHITECTURE-FREEZE-V3` §2.1 (Layer 1 Supplier Approval Gate) 직접 접촉**
- freeze 정책: supplier.status 게이트 보존 필수, UI 변경은 허용
- 운영 critical (approval workflow)
- **canonical approval 패턴 후보 1순위** — `BaseDetailDrawer` + reason textarea + `defineActionPolicy({ PENDING: ['approve', 'reject'] })` 매핑 직선적

**DataTable 마이그레이션 가능성**: 매우 높음. **`ApprovalDrawerLayout` 추출 시 reference implementation** 으로 적합.

**회귀 리스크**:
| 항목 | 강도 | 이유 |
|---|:---:|---|
| reject reason textarea 라운드트립 | 🟡 중간 | drawer 마이그레이션 시 textarea → API 와이어 누락 시 거부 사유 소실 |
| 상태 머신 (PENDING → APPROVED\|REJECTED) | 🟢 낮음 | freeze 명시적 보존, UI 마이그레이션이 머신을 건드리지 않음 |

**재분류**: **B** → freeze §2.1 의 상태 머신 보존을 명시 확인 후 **A 로 승격**. 동시에 **`ApprovalDrawerLayout` 추출 WO 의 reference 화면** 으로 활용 권장.

---

### 2.5 Neture admin/AdminPartnerMonitoringPage

**현재 구조**:
- **실 API**: `adminPartnerMonitoringApi.getPartners` (pagination 포함)
- KPI 카드 4종 (total_partners, total_commission, total_payable, total_paid)
- 검색 + pagination (prev/next, no page jumper)
- Row actions: Eye icon → detail navigate 만 (다른 액션 없음)
- `<table>` 위치: 라인 106-144 (7 필드, 모두 read-only)

**도메인 컨텍스트**:
- **`NETURE-PARTNER-CONTRACT-FREEZE-V1` 인접** — commission (payable + paid) 컬럼 표시 (라인 129-131)
- freeze §5: "settlement 테이블 없음, payout 로직 없음, earnings 집계 없음 — 의도적 비구현 상태로 Freeze"
- 본 화면은 **read-only KPI 표시** — freeze §5 "조회 최적화" 허용 영역
- 트래픽 낮음 (대시보드 view, 편집 없음)

**DataTable 마이그레이션 가능성**: 매우 높음. 7 read-only 필드 + Eye 액션 단일.

**회귀 리스크**: 매우 낮음 — display-only, no state mutation.

**재분류**: **A** — 즉시 정비 가능. **단 freeze §5 준수: approval / editing 기능 추가 금지, read-only 유지**.

---

### 2.6 Neture admin/CommunityManagementPage

**현재 구조**:
- **실 API**: `communityManageApi.listAds / listSponsors`
- 3 탭 (hero ads / page ads / sponsors)
- 듀얼 `<table>` (`AdTable` 라인 165-220, `SponsorTable` 라인 224-279)
- Row actions: edit / delete via 인라인 모달 폼 (`FormModal` 라인 283-409)
- Pagination: 없음
- 필터/검색: 없음

**도메인 컨텍스트**:
- Community Hub 광고/스폰서 관리 — Layer 1-4 supplier/partner 도메인 아님
- freeze 정책상 Layer 5 (캠페인 오버레이) — 변경 허용
- 트래픽 낮음 (scaffold/community feature)

**DataTable 마이그레이션 가능성**: 중간. 컬럼 매핑은 직선적이나 듀얼 테이블 + 인라인 모달 폼 구조 자체가 의도적.

**회귀 리스크**: 낮음-중간. form state isolation (라인 292-304), `BaseDetailDrawer` 컨테이너로 이동 시 form.state 와이어링 검증 필요.

**재분류**: **C** — *현 구조 의도적*. 캠페인 강화 시 정비, 그 전엔 가치 < 비용.

---

### 2.7 Neture partner/PartnerStoresPage

**현재 구조**:
- **Mock data only** (라인 32-38 `mockStores` 하드코딩, API 미연결)
- 필터: search / region / status (모두 client-side)
- Desktop table (라인 118-180) + mobile card layout (라인 183-224)
- Row actions: view / links / remove — *모두 미구현 (no-op handlers)*
- Pagination: 없음

**도메인 컨텍스트**:
- Partner store listing — **트래픽 0** (mock-only scaffold)
- freeze 계약 미접촉 (display-only)

**DataTable 마이그레이션 가능성**: 구조상 trivial. 단 **API 미연결** — 정비 시점에 endpoint 도 없음.

**회귀 리스크**: 0 (mock-only, prod 영향 없음).

**재분류**: **C** — *API 와이어 전까지 정비 보류*. API 연결 시 trivial 마이그레이션.

---

### 2.8 K-Cosmetics signage/HqMediaPage ⚠ 오분류 정정

**자매 IR §5.2 분류**: D ("HQ Signage 카드 그리드 — UX 가 정답")

**실제 구조** (라인 356-410):
- **Raw `<table>` 6 컬럼** — 카드 그리드 아님
- 컬럼: 이름, 타입, 소스, 상태, 생성일, chevron
- **thumbnail 컬럼 없음** (텍스트/배지만)
- 인라인 생성 폼 (media type / source type / source URL / tags)
- 검색/필터/정렬 없음
- row click → detail page

**자매 IR D 분류 사유 ("thumbnail-first 카드 그리드") 미성립** — 코드에 thumbnail 자체가 없음.

**DataTable 마이그레이션 가능성**: 매우 높음. 6 컬럼 → `ListColumnDef<MediaItem>` 직접 매핑.

**재분류**: **A** — 즉시 정비 가능. **자매 IR 의 D 분류는 코드를 읽지 않은 추정** 이었음을 정정.

---

### 2.9 K-Cosmetics signage/HqPlaylistsPage ⚠ 오분류 정정

**자매 IR §5.2 분류**: D

**실제 구조** (라인 326-392):
- **Raw `<table>` 7 컬럼**
- 컬럼: 이름, 항목 수, 총 재생시간, 반복, 상태, 생성일, chevron
- 인라인 생성 폼 (name / default duration / transition / loop / tags)
- 검색/필터/정렬 없음
- thumbnail 적용 가능성: playlist 는 sequence — 의미 약함

**DataTable 마이그레이션 가능성**: 매우 높음. 7 컬럼 직선 매핑.

**재분류**: **A** — 즉시 정비 가능. (오분류 정정)

---

### 2.10 GlycoPharm signage/HqMediaPage ⚠ 오분류 부분 정정

**자매 IR §5.2 분류**: D

**실제 구조** (라인 489-566):
- **Raw `<table>` 7 컬럼 + thumbnail 컬럼** — *table + thumbnail 하이브리드*
- 컬럼: 미리보기 (thumbnail), 제목, 소스 (hidden md), 상태, 사용 여부, 생성일 (hidden lg), chevron
- `MediaThumbnail` 컴포넌트 (라인 492, 528-529): `thumbnailUrl` 또는 YouTube ID 추출
- Debounced search + status filter + 사용 횟수 집계
- 인라인 생성 폼 + URL preview 검증 (`UrlPreview` 컴포넌트)

**자매 IR D 분류 부분 정정**:
- "카드 그리드" 가 아니라 *table* — D 사유 (카드 그리드 UX 보존) 미성립
- 단 thumbnail 컬럼 보존이 필요 → canonical DataTable 로 마이그레이션 시 thumbnail 컬럼 패턴 결정 필요

**DataTable 마이그레이션 가능성**: 중간-높음. canonical DataTable 에 *thumbnail 컬럼* 정책이 명시되지 않음 — `ListColumnDef.render` 로 thumbnail 표시 가능하나 caching / lazy-load / placeholder 패턴 결정 필요.

**재분류**: **B** — thumbnail-in-DataTable 정책 결정 후 정비. (오분류 부분 정정 — D → B)

---

### 2.11 GlycoPharm signage/HqPlaylistsPage ⚠ 오분류 정정

**자매 IR §5.2 분류**: D

**실제 구조** (라인 396-474):
- **Raw `<table>` 7 컬럼**
- 컬럼: 이름 (+optional desc), 항목 수, 총 시간 (hidden md), 상태, 매장 복사 횟수, 생성일 (hidden lg), chevron
- Debounced search
- 인라인 생성 폼 (name / desc / duration / transition / loop / tags)
- **thumbnail 컬럼 없음** (sequence 도메인이라 적절)
- 매장 복사 횟수 집계 (`parentPlaylistId` 역참조)

**DataTable 마이그레이션 가능성**: 매우 높음. 7 컬럼 직선 매핑, copy count 는 단순 mapped 필드.

**재분류**: **A** — 즉시 정비 가능. (오분류 정정)

---

## 3. 서비스 횡단 매트릭스

### 3.1 분류별 화면 수 (재분류 기준)

| 분류 | 화면 수 | 화면 |
|---|---:|---|
| **A 즉시 정비** | 5 | Neture `OperatorsPage`, `AdminPartnerMonitoringPage`, K-Cosmetics signage 2개, GlycoPharm `HqPlaylistsPage` |
| **B 도메인 IR 후** | 4 | GlycoPharm `InvoicesPage`, `SettlementsPage`, `signage/HqMediaPage`; Neture `AdminSupplierApprovalPage` |
| **C 현 구조 유지** | 2 | Neture `CommunityManagementPage`, `partner/PartnerStoresPage` |
| **D 미적용** | 0 | (자매 IR 의 D 4건 모두 A/B 로 정정) |

### 3.2 자매 IR 대비 분류 변화

| 화면 | 이전 | 재분류 | 변화 사유 |
|---|:---:|:---:|---|
| GlycoPharm `InvoicesPage` | C | **B** | 자금 도메인 회귀 리스크 명시화 (formatter / 상태 머신) |
| GlycoPharm `SettlementsPage` | C | **B** | mock-only 명시화 (실 API 정의 선행) |
| Neture `admin/OperatorsPage` | C | **A** | 단순 raw table, freeze 미접촉 |
| Neture `admin/AdminSupplierApprovalPage` | C | **B** | freeze §2.1 인접 + ApprovalDrawerLayout 추출 후보 |
| Neture `admin/AdminPartnerMonitoringPage` | C | **A** | read-only KPI, freeze §5 조회 최적화 허용 |
| Neture `admin/CommunityManagementPage` | C | **C** (유지) | Layer 5, 트래픽 낮음 |
| Neture `partner/PartnerStoresPage` | C | **C** (유지) | mock-only, API 미연결 |
| K-Cosmetics `signage/HqMediaPage` | **D** | **A** | ⚠ 오분류 정정 — raw table, no thumbnail |
| K-Cosmetics `signage/HqPlaylistsPage` | **D** | **A** | ⚠ 오분류 정정 — raw table |
| GlycoPharm `signage/HqMediaPage` | **D** | **B** | ⚠ 오분류 부분 정정 — table+thumbnail 하이브리드, 정책 결정 필요 |
| GlycoPharm `signage/HqPlaylistsPage` | **D** | **A** | ⚠ 오분류 정정 — raw table |

**정정 4건 / 재확정 5건 / 유지 2건**

---

## 4. 우선순위 제안

### Phase 1 — 즉시 가능 (단일 WO 단위, 회귀 리스크 최소)

| 순위 | 화면 | 이유 |
|---|---|---|
| 1 | Neture `admin/OperatorsPage` | 가장 단순 (boolean state, 모달 없음) |
| 2 | Neture `admin/AdminPartnerMonitoringPage` | read-only KPI, 변경 위험 0 |
| 3 | K-Cosmetics `signage/HqMediaPage` | 6 컬럼 raw table, no thumbnail |
| 4 | K-Cosmetics `signage/HqPlaylistsPage` | 7 컬럼 raw table |
| 5 | GlycoPharm `signage/HqPlaylistsPage` | 7 컬럼 raw table, copy count 매핑만 |

→ **WO 후보**: `WO-O4O-NETURE-ADMIN-OPERATOR-DATATABLE-ALIGN-V1`, `WO-O4O-NETURE-ADMIN-PARTNER-MONITORING-DATATABLE-ALIGN-V1`, `WO-O4O-SIGNAGE-HQ-MEDIA-PLAYLIST-DATATABLE-ALIGN-V1` (3개 화면 묶음 가능)

### Phase 2 — 도메인 IR 선행

| 순위 | 화면 | 선행 IR / WO |
|---|---|---|
| 6 | Neture `admin/AdminSupplierApprovalPage` | (a) freeze §2.1 상태 머신 명시 확인 — 별도 IR 또는 WO 노트 / (b) `ApprovalDrawerLayout` 추출 WO 와 함께 |
| 7 | GlycoPharm `signage/HqMediaPage` | thumbnail-in-DataTable 정책 결정 (lazy-load / placeholder / cache 패턴) |
| 8 | GlycoPharm `InvoicesPage` | 자금 도메인 IR — KRW formatter 통일 + status transition 정의 + dispatch log 분리 |
| 9 | GlycoPharm `SettlementsPage` | 실 API 정의 + commission rate 정책 + status workflow 정의 |

### Phase 3 — `ApprovalDrawerLayout` 추출 (자매 IR §6.1 후속)

본 IR 에서 확인된 8개 동일 패턴 화면:
- KPA: `ProductApplicationManagementPage`, `PharmacyRequestManagementPage`, `QualificationRequestsPage`
- K-Cosmetics: `EventOfferApprovalsPage`, `ForumRequestsPage`, `ForumDeleteRequestsPage`
- Neture: `OperatorProductApprovalPage`, **`AdminSupplierApprovalPage` (본 IR)**

→ **WO 후보**: `WO-O4O-OPERATOR-APPROVAL-DRAWER-EXTRACT-V1` (KPA 안에서 추출 → 7개 화면에 채택)

### 명시적 비실행 (No-Go)

- Neture `admin/CommunityManagementPage` — Layer 5, 캠페인 강화 시 재평가
- Neture `partner/PartnerStoresPage` — API 와이어링 후 재평가
- 본 IR 분류 외 화면 — 본 IR scope 외

---

## 5. Risks & Open Questions

### 5.1 자매 IR 분류 정확도 우려

자매 IR (IR-O4O-OPERATOR-LIST-COMMONIZATION-AUDIT-V1) 의 D 분류 4건이 모두 *코드를 읽지 않은 추정* 이었음. 이는 다음 의문을 제기:

1. 자매 IR 의 다른 분류 (특히 GlycoPharm/K-Cosmetics/Neture 의 다른 D/E 분류) 에서도 같은 추정이 있을 가능성?
2. 자매 IR §5 "공통화 비추천 항목" 명단의 신뢰도 재검증 필요?

**대응**: 본 IR 는 11개만 재검증. 나머지 D 분류 (Neture freeze 화면 5개) 는 freeze 계약 문서가 비공통화의 *정책적* 사유이므로 코드 재읽기 없이도 정당. 단 *향후 IR 작성 시 코드 읽기 우선* 원칙을 강화할 것.

### 5.2 Open Questions

1. **GlycoPharm InvoicesPage 의 KRW formatter 규격** — 통일 formatter는 무엇이어야 하는가? (현재 `krw()` vs `(amount/10000) + '만원'` 불일치) → 자금 도메인 IR 선행 필요.
2. **GlycoPharm SettlementsPage 의 commission rate** — 5% 하드코딩이 정책인가, 약국별 가변인가? → 회계 팀 / 도메인 오너 확인 필요.
3. **Neture AdminSupplierApprovalPage 의 reject reason 라운드트립** — drawer 마이그레이션 시 textarea → API 와이어 보존 검증 필수. 회귀 시 거부 사유 소실.
4. **GlycoPharm HqMediaPage 의 thumbnail 컬럼** — DataTable 에 thumbnail-in-column 패턴이 캐노니컬에 없음. 정책 결정: (a) `ListColumnDef.render` 에 inline 표시 / (b) 별도 `MediaThumbnailColumn` 추출 / (c) thumbnail-only side panel.
5. **Neture admin 영역 전반의 staff-facing 트래픽 측정** — 본 IR 는 코드 기반으로 "scaffold/저트래픽" 추정. 운영 텔레메트리로 정량 확인 필요.

### 5.3 Constitutional 정합성

- **§7 Boundary Policy** — 본 IR 의 권장은 frontend list 정비뿐, cross-domain JOIN / boundary 위반 영향 없음.
- **§14 Frozen Baselines**:
  - F1 (Operator OS) — 기존 `@o4o/operator-ux-core` 채택 확산만, 컴포넌트 자체 변경 없음.
  - F8 (Neture Distribution Engine) — 본 IR 화면은 distribution 영역 미접촉.
  - F7 (Neture Partner Contract) — `AdminPartnerMonitoringPage` 가 §5 "조회 최적화" 영역, 변경 시 read-only 유지 명시.

---

## 6. Next Step

본 IR 의 직접 후속 액션은 **없음** (조사 결과물).

후속 WO 작성 시 다음 순서로 권장:

1. `WO-O4O-NETURE-ADMIN-OPERATOR-DATATABLE-ALIGN-V1` — Phase 1 #1 (가장 단순)
2. `WO-O4O-NETURE-ADMIN-PARTNER-MONITORING-DATATABLE-ALIGN-V1` — Phase 1 #2 (read-only)
3. `WO-O4O-SIGNAGE-HQ-DATATABLE-ALIGN-V1` — Phase 1 #3-5 묶음 (3개 signage 화면)
4. `WO-O4O-OPERATOR-APPROVAL-DRAWER-EXTRACT-V1` — Phase 3 (KPA + 4서비스 7화면 추상화)
5. `IR-O4O-GLYCOPHARM-FINANCIAL-DOMAIN-FORMATTER-AUDIT-V1` — Phase 2 #8 자금 도메인 IR
6. `WO-O4O-GLYCOPHARM-INVOICES-DATATABLE-ALIGN-V1` — Phase 2 #8 (#5 IR 후)
7. `WO-O4O-GLYCOPHARM-SETTLEMENTS-API-DEFINE-V1` — Phase 2 #9 (실 API 정의)

자매 IR 의 D 분류 정정 사항은 자매 IR 본문 갱신 또는 본 IR 인용으로 추적.

---

*조사 완료. 코드/migration/API/권한 변경 없음. 본 IR 의 분류는 후속 WO 의 입력으로만 사용.*
