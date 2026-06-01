---
id: IR-O4O-KPA-MY-STORE-LIBRARY-BULK-ACTION-AUDIT-V1
title: KPA 내 매장 자료함 / 실행자산 5개 화면 — 표준 테이블 전환 가능성 + bulk action 요구사항 조사
status: completed
date: 2026-05-24
domain: kpa / my-store / library / ui-standardization
related:
  - IR-O4O-KPA-STANDARD-TABLE-LIST-AUDIT-V1
  - WO-O4O-KPA-MY-STORE-COPIES-STANDARD-TABLE-V1
constitution:
  - CLAUDE.md §1 (조사 → 문제확정 → 최소 수정 → 검증 → 종료)
  - CLAUDE.md §11 (Operator Dashboard 표준)
---

# IR-O4O-KPA-MY-STORE-LIBRARY-BULK-ACTION-AUDIT-V1

> 선행 IR (`IR-O4O-KPA-STANDARD-TABLE-LIST-AUDIT-V1`) §6 의 WO-4 (자료함 5개 페이지) 진행 전 사전 점검. 각 페이지의 UI 형태, 기존 API, 단건/bulk action 요구사항, frontend fan-out 가능 여부, backend 신규 필요 여부, DataTable 전환 난이도를 정리하고 후속 WO 묶음을 단계화한다. 코드는 변경하지 않는다.

---

## 1. 조사 대상

| # | 페이지 | route | 라인 수 |
|:-:|--------|-------|:------:|
| 1 | StoreLibraryContentsPage | `/store/library/contents` | 236 |
| 2 | StoreLibraryResourcesPage | `/store/library/resources` | 903 |
| 3 | StoreAssetsPage | `/store/content` | 88 |
| 4 | TabletRequestsPage | `/store/requests` | 235 |
| 5 | StoreTabletDisplaysPage | `/store/tablet-displays` | 752 |

## 2. 페이지별 상세 매트릭스

### 2.1 StoreLibraryContentsPage (236줄)

| 항목 | 결과 |
|------|------|
| 구조 | **위임 — `StoreContentsSelector` (`pages/pharmacy/StoreContentsSelector.tsx`) 호출** |
| 자체 list UI | 없음 (selector 컴포넌트가 list 렌더링) |
| 기존 API | `storeAssetControlApi.list` |
| 단건 action | 위임 컴포넌트 내부 (수정 진입 `/store/content/{id}/edit`) |
| 자체 bulk | **없음** |
| 위임 컴포넌트 위치 | **같은 폴더 (`pages/pharmacy/`) 내부** — 외부 패키지 아님 |
| 전환 난이도 | **중간** — selector 컴포넌트도 같이 표준화하거나 page 외부에 ActionBar/DataTable 추가 |

→ `StoreContentsSelector` 자체가 page와 `StartProductionModal` 양쪽에서 공용 (line 19 주석). 표준화 시 **selector를 손대면 production 흐름에도 영향**. 페이지 외부 wrapper에 ActionBar/bulk 추가하거나 selector 내부 점진적 표준화.

### 2.2 StoreLibraryResourcesPage (903줄)

| 항목 | 결과 |
|------|------|
| 구조 | 자체 page (전체 직접 구현) |
| 자체 list UI | 카드형 (`items.map`) |
| 기존 API | `assetSnapshotApi` (list / patch / remove) |
| 단건 action | `handleDelete` / `setDetailId` (drawer 진입) / `setRegisterOpen` (자료 등록 모달) |
| **자체 bulk** | ✅ **bulk delete 이미 구현** (line 270 `handleBulkDelete` + `selected: Set<string>` + line 266 toggle) |
| bulk action 추가 후보 | 선택 자료함 추가 / 선택 사본 생성 / 선택 태그 변경 / 선택 다운로드 |
| 전환 난이도 | **낮음** — IR-V1 B등급. 자체 bulk delete를 DataTable + ActionBar 표준 형태로 흡수만 하면 됨 |

→ **3순위 WO-O4O-KPA-MY-STORE-COPIES-STANDARD-TABLE-V1 (StoreQRPage)와 동일 패턴** — 자체 bulk 보존하며 DataTable로 흡수 가능.

### 2.3 StoreAssetsPage (88줄)

| 항목 | 결과 |
|------|------|
| 구조 | **thin wrapper — `StoreAssetsPanel` (`@o4o/store-asset-policy-core`) 위임** |
| 자체 list UI | 없음 (외부 패키지 컴포넌트가 list 렌더링) |
| 기존 API | `storeAssetControlApi.list`, `updatePublishStatus` |
| 단건 action | `handleToggleStatus` (draft↔published↔hidden cycle), `handleEdit` (→ snapshot edit 페이지) |
| 자체 bulk | **없음** |
| 표준화 위치 | **`@o4o/store-asset-policy-core` 패키지 내부** — 페이지 자체는 88줄 wrapper, 실제 UI는 패키지 |
| 전환 난이도 | **높음** — 패키지 변경 필요. 같은 패키지를 사용하는 다른 서비스(GlycoPharm/K-Cos 등) 영향 확인 필요 |

→ **본 IR 범위 외로 분리 권장**. 패키지 표준화는 별도 트랙 (`@o4o/store-asset-policy-core` 자체 IR/WO).

### 2.4 TabletRequestsPage (235줄)

| 항목 | 결과 |
|------|------|
| 구조 | 자체 page |
| 자체 list UI | 카드형 + **urgency border** (10분+ red / 5분+ orange / NEW yellow 시각 단서 강함) |
| 폴링 | **5초 polling** (`setInterval(fetchInterests, 5000)`) |
| 기존 API | `fetchStaffInterestRequests` (list), `updateInterestAction(id, action)` (단건) |
| 단건 action | `acknowledge` / `complete` / `cancel` |
| 자체 bulk | **없음** |
| bulk action 후보 | 선택 일괄 확인 / 일괄 완료 / 일괄 취소 |
| 전환 난이도 | **중간** — DataTable로 옮길 때 **urgency border 시각 단서 보존 어려움**. row 색상 또는 별도 컬럼으로 표현 필요 |

→ **UX 손실 검토 필요**. carded urgency가 매장 운영자에게 시각적으로 핵심. DataTable row className override 또는 별도 emphasis 컬럼.

### 2.5 StoreTabletDisplaysPage (752줄)

| 항목 | 결과 |
|------|------|
| 구조 | 자체 page (두 영역 통합: 태블릿 목록 + 디스플레이 슬롯 편집) |
| 자체 list UI | `tablets.map` (line 505) + `displays.map` (line 679) 두 곳 |
| 기존 API | `getStoreExecutionAssets`, `assetSnapshotApi`, `tabletDisplays` API |
| 단건 action | `handleAddToDisplay` / `handleSave` / `handleSaveIdle` / `handleRegister` / `handleDeleteTablet` |
| 자체 bulk | **없음** |
| bulk action 후보 | 선택 태블릿 일괄 활성/비활성 / 선택 강제 새로고침 / 일괄 삭제 |
| 디스플레이 슬롯 편집 | 별도 그리드 — bulk action과 무관 (개별 슬롯 편집) |
| 전환 난이도 | **높음** — 두 영역 (태블릿 list + 슬롯 grid) 중 list만 DataTable. 슬롯은 grid 보존 |

→ list 영역(`tablets.map`)만 DataTable 후보. 슬롯 grid는 본 IR 범위 외.

### 2.6 종합

| # | 페이지 | UI | 자체 bulk | bulk backend | fan-out 가능 | DataTable 난이도 | 등급 |
|:-:|--------|----|:--------:|:------------:|:------------:|:----------------:|:----:|
| 1 | StoreLibraryContents | 위임 (StoreContentsSelector) | ❌ | ❌ | △ (selector 위임) | 中 (wrapper 또는 selector) | **B/C** |
| 2 | StoreLibraryResources | 카드형 | ✅ delete | ❌ | ✅ | **낮음** | **B** (3순위 WO 패턴 mirror) |
| 3 | StoreAssets | 위임 (@o4o/store-asset-policy-core 외부 패키지) | ❌ | ❌ | (패키지 한정) | **높음 — 패키지 변경** | **E** (본 IR 범위 외) |
| 4 | TabletRequests | 카드형 + urgency border | ❌ | ❌ | ✅ | 中 (UX 손실 위험) | **C** (urgency 보존 검토) |
| 5 | StoreTabletDisplays | tablets.map + displays.map | ❌ | ❌ | ✅ | 中 (list만) | **C** (슬롯 grid 보존) |

---

## 3. Backend bulk endpoint 현황

`grep -E "bulk|batch|ids\[\]"` 결과:

| API | bulk endpoint |
|-----|:-------------:|
| `assetSnapshotApi` (copy / list / patch / remove) | **없음** — 모두 단건 |
| `storeAssetControlApi` (list / updatePublishStatus) | **없음** |
| `tabletStaff` (acknowledge / complete / cancel) | **없음** |
| `tabletDisplays` API | **없음** |
| backend `apps/api-server/src/routes/platform/*` | "bulk SQL queries per service" (read-only 집계 용도) — 자료함 mutation bulk 없음 |

→ **모든 bulk action은 frontend fan-out 패턴이 1차 진입**. backend 신규 endpoint는 사업 요구사항 명확화 후 결정.

---

## 4. bulk action 요구사항 정리 (페이지별)

### 4.1 StoreLibraryContentsPage

| bulk 후보 | backend | fan-out 가능? | 사업 의미 |
|----------|:-------:|:-------------:|----------|
| 선택 자료함 추가 (Reference) | 단건 `assetSnapshotApi.copy` 존재 | ✅ fan-out | 자료함에서 콘텐츠를 자료실로 일괄 이관 |
| 선택 사본 생성 (duplicate) | (확인 필요) | △ | 콘텐츠 duplicate WO 이미 허용 |
| 선택 삭제 | 단건 `remove` | ✅ fan-out | 자료 정리 |

→ **StoreContentsSelector 위임 구조** — 위 bulk는 page wrapper 또는 selector 내부 어느 쪽에서 구현할지 결정 필요.

### 4.2 StoreLibraryResourcesPage (최우선 — 가장 단순)

| bulk 후보 | backend | fan-out 가능? | 사업 의미 |
|----------|:-------:|:-------------:|----------|
| **선택 삭제** | 단건 `remove` | ✅ **이미 자체 구현** | bulk delete (현 line 270) |
| 선택 자료함 카테고리 변경 | 단건 `patch` (tags 등) | ✅ fan-out | 자료 분류 일괄 정리 |
| 선택 다운로드 | (단건 다운로드 endpoint) | △ | 파일 zip / sequential download |

→ **3순위 WO (StoreQRPage) 패턴 그대로 mirror 가능**. bulk delete만 1차 진행 후 나머지는 후속.

### 4.3 StoreAssetsPage (본 IR 범위 외)

| bulk 후보 | backend | 비고 |
|----------|:-------:|------|
| 선택 publish status 일괄 변경 (draft/published/hidden) | 단건 `updatePublishStatus` | fan-out 가능. 다만 **`@o4o/store-asset-policy-core` 패키지 내부 UI** — 패키지 변경 별도 IR |

### 4.4 TabletRequestsPage

| bulk 후보 | backend | fan-out 가능? | 사업 의미 |
|----------|:-------:|:-------------:|----------|
| 선택 일괄 확인 (acknowledge) | 단건 `updateInterestAction(id, 'acknowledge')` | ✅ | 다수 요청 동시 처리 |
| 선택 일괄 완료 (complete) | 단건 동일 | ✅ | 응대 종료 일괄 마감 |
| 선택 일괄 취소 (cancel) | 단건 동일 | ✅ | 무효 요청 정리 |

→ urgency 시각 단서 보존 위해 **DataTable row className override** 또는 별도 `urgency` 컬럼 도입. 매장 운영자 즉시 식별성이 핵심 UX 요구.

### 4.5 StoreTabletDisplaysPage

| bulk 후보 | backend | fan-out 가능? | 사업 의미 |
|----------|:-------:|:-------------:|----------|
| 선택 태블릿 활성/비활성 | (확인 필요) | △ | 다수 매장 태블릿 운영 모드 일괄 |
| 선택 강제 새로고침 | (확인 필요 — 푸시 endpoint) | △ | 콘텐츠 업데이트 push |
| 선택 삭제 | 단건 `handleDeleteTablet` | ✅ | 등록 정리 |

→ **푸시(force refresh) endpoint 존재 여부 확인 필요**. backend 신규 가능성 있음.

---

## 5. DataTable 전환 난이도 + 후속 WO 묶음 권장

### 5.1 전환 등급 매트릭스

| # | 페이지 | 등급 | 다음 단계 |
|:-:|--------|:----:|----------|
| 2 | StoreLibraryResources | **B (단순 mirror)** | **5순위 WO 1차** — StoreQRPage 패턴 그대로 |
| 4 | TabletRequests | **C (UX 보존)** | 5순위 WO 2차 — urgency 단서 보존 결정 후 |
| 5 | StoreTabletDisplays | **C (list만)** | 5순위 WO 3차 — 슬롯 grid 보존, list만 |
| 1 | StoreLibraryContents | **B/C (selector 위임)** | 6순위 — `StoreContentsSelector` 표준화 결정 선행 |
| 3 | StoreAssets | **E (본 IR 범위 외)** | 별도 트랙 — `@o4o/store-asset-policy-core` 패키지 IR/WO |

### 5.2 후속 WO 권장 단계화

| # | WO | 범위 | 작업량 |
|:-:|----|------|:------:|
| 1 | **WO-O4O-KPA-STORE-LIBRARY-RESOURCES-STANDARD-TABLE-V1** | StoreLibraryResourcesPage 단일 — 자체 bulk delete를 DataTable + ActionBar 표준 형태로 흡수. 추가 bulk (카테고리 변경 / 다운로드) 는 별도 WO. | 小 (PharmacyPop 작업량과 유사) |
| 2 | **WO-O4O-KPA-TABLET-REQUESTS-STANDARD-TABLE-V1** | TabletRequestsPage — DataTable 전환 + urgency 보존 (row className 또는 컬럼). bulk 3종 (acknowledge/complete/cancel) fan-out. 5초 polling 유지. | 中 (UX 단서 보존이 핵심) |
| 3 | **WO-O4O-KPA-STORE-TABLET-DISPLAYS-STANDARD-TABLE-V1** | StoreTabletDisplaysPage — `tablets.map` 영역만 DataTable. 슬롯 grid 그대로. bulk 활성/강제 새로고침 backend 확인 선행 (없으면 단순 삭제 fan-out만) | 中 (큰 페이지, list만 부분 변경) |
| 4 | **IR-O4O-KPA-STORE-CONTENTS-SELECTOR-STANDARDIZATION-V1** (IR 선행) | StoreContentsSelector 위임 구조 표준화 방향 결정 — page wrapper vs selector 내부. | 小 (IR) |
| 5 | **WO-O4O-KPA-STORE-LIBRARY-CONTENTS-STANDARD-TABLE-V1** | IR 결과 따라 진행 | 中 |
| 6 | **IR-O4O-STORE-ASSET-POLICY-CORE-DATATABLE-V1** (별도 트랙) | `@o4o/store-asset-policy-core` 패키지의 `StoreAssetsPanel` 표준화 — 다른 서비스(GlycoPharm/K-Cos) 영향 분석 포함 | 中 (IR) — 패키지 변경 신중 |

### 5.3 1순위 진행 권장: WO-1 (StoreLibraryResources)

근거:
- IR-V1 B등급 분류 그대로 — **자체 bulk delete 이미 존재**
- 3순위 WO-3 의 StoreQRPage 와 동일 mirror 패턴 (자체 selection + bulk 보존 + DataTable 흡수)
- 위험 가장 낮음
- backend 신규 0
- 검증 부담 가장 적음

---

## 6. Backend 신규 필요 여부

| 페이지 | 1차 (fan-out으로 cover) | 후속 backend 신규 후보 |
|--------|:---------------------:|-----------------------|
| StoreLibraryResources | ✅ delete (이미 fan-out 가능) | 선택 다운로드 zip endpoint (사용 빈도 확인 후) |
| TabletRequests | ✅ acknowledge/complete/cancel | 일괄 status 변경 단일 endpoint (성능 이슈 시) |
| StoreTabletDisplays | △ delete만 fan-out 가능 | **선택 강제 새로고침 push** (실시간 동기화) / 선택 활성·비활성 |
| StoreLibraryContents | ✅ copy/remove fan-out | — |
| StoreAssets | (패키지 영역 — 본 IR 외) | — |

→ **1차는 모두 frontend fan-out**으로 cover 가능. backend 신규는 사용 빈도/성능 측정 후 후속 별도 WO.

---

## 7. Drift Guard / 본 IR 범위 외

본 IR 에서 명시적 제외:

| 항목 | 사유 |
|------|------|
| `@o4o/store-asset-policy-core` 패키지 변경 | 별도 트랙 — 다른 서비스 영향 분석 선행 필요 |
| `StoreContentsSelector` 내부 표준화 | 별도 IR 선행 (production-materials 모달과 공용) |
| bulk backend 신규 endpoint 구현 | 1차 fan-out으로 가능 — 사용 빈도 측정 후 결정 |
| 5초 polling 변경 (TabletRequests) | 기존 운영 가정 유지 |
| 슬롯 grid 영역 변경 (StoreTabletDisplays) | bulk 무관, list만 표준화 |
| GlycoPharm / K-Cosmetics 동일 페이지 | KPA 검증 후 별도 WO |

---

## 8. 결론

| 질문 | 답 |
|------|-----|
| 자료함 5개 페이지 표준화 가능? | ✅ 5개 중 **2개 (Resources/TabletRequests)** 는 즉시 가능, 2개 (TabletDisplays/LibraryContents) 는 조건부, 1개 (Assets) 는 본 IR 범위 외 |
| Bulk backend 신규 필요? | **1차 불필요** — 모두 frontend fan-out으로 cover. 후속 사용 빈도 측정 후 결정 |
| 1순위 진행? | **StoreLibraryResources** (3순위 WO StoreQRPage 패턴 mirror — 위험 최저) |
| UX 손실 위험? | TabletRequests urgency border — 보존 방안 (row className 또는 컬럼) 결정 필요 |
| 패키지 변경 필요? | StoreAssets — 별도 트랙 분리 |

---

## 9. 산출물 요약

| 항목 | 결과 |
|------|------|
| 5개 페이지 등급 | B=1 (Resources) / C=2 (TabletRequests, TabletDisplays) / B/C=1 (LibraryContents) / E=1 (StoreAssets — 범위 외) |
| Backend bulk endpoint 현황 | **모두 부재** — fan-out 패턴 1차 진입 |
| 1순위 WO | **WO-O4O-KPA-STORE-LIBRARY-RESOURCES-STANDARD-TABLE-V1** (Resources 단독) |
| 후속 WO 단계화 | 6 묶음 (Resources → TabletRequests → TabletDisplays → ContentsSelector IR → ContentsPage → AssetPolicy 패키지 IR) |
| 코드 변경 | **없음** (조사 전용 IR) |

---

*Author: Claude (Investigation only — no code change executed)*
*Investigation date: 2026-05-24*
*Status: completed — ready for WO-O4O-KPA-STORE-LIBRARY-RESOURCES-STANDARD-TABLE-V1 (1순위)*
