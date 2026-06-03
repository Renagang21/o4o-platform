# IR-O4O-OPERATOR-HUB-CONTENT-PUBLISHING-SIMPLIFICATION-V1

> **조사 요청서 (Investigation Result)**
>
> 코드 수정 없음 / UI 수정 없음 / DB 변경 없음 / API 변경 없음
>
> 본 IR 은 Operator 측 콘텐츠 작성·게시 구조를 **Source Ingestion 복잡 시스템 vs RichTextEditor 기반 단순 게시** 중 어느 방향이 적절한지 read-only 로 재검토한다.

- **작성일:** 2026-05-23
- **분류:** Investigation Result (Read Only / 방향 전환 검토)
- **기준 문서:**
  - [`O4O-BUSINESS-PHILOSOPHY-V1 §3.2`](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) (Operator 책임)
  - [`O4O-3-ROLE-FLOW-BASELINE-V1`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md)
  - [`IR-O4O-OPERATOR-WORKSPACE-A-OFFLINE-SOURCE-INGESTION-DESIGN-V1`](IR-O4O-OPERATOR-WORKSPACE-A-OFFLINE-SOURCE-INGESTION-DESIGN-V1.md) (재검토 대상)
  - [`O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1`](../architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md)
  - [`PLATFORM-CONTENT-POLICY-V1`](../baseline/PLATFORM-CONTENT-POLICY-V1.md)
- **상태:** Read-Only IR / 방향 전환 결정 대기

---

## 1. 조사 목적

직전 단계의 가설:

> 운영자는 외부/오프라인으로 수신한 원천 자료를 등록·분류·관리하는 복잡한 Workspace A 시스템이 필요하다.

→ **본 IR 의 재검토 결과 가설 자체가 과도하다.**

새 기준:

```text
운영자는 사업자다.
외주 / 내부 담당자 / 직원 / 관련 업체를 통해 이미 정리된 콘텐츠를 보유한다.
필요한 것은 RichTextEditor 로 항목별 콘텐츠를 작성·게시·진열하는 기능이다.

복잡한 원천 자료 관리 시스템 / AI 제작 파이프라인은 우선 필요하지 않다.
```

본 IR 은 이 방향 전환의 타당성과 영향 범위를 정리한다.

---

## 2. 현재 과도 설계 여부 판단

### 2.1 Source Ingestion / Workspace A 가설의 과잉

| 가설 (직전 IR) | 실제 운영자 상황 | 과잉 여부 |
|---------------|----------------|:--------:|
| 운영자가 원천 자료를 수신·등록·분류·관리하는 inbox 필요 | 운영자는 외주/직원 통해 정리된 콘텐츠 보유 | **과잉** |
| workspaceStatus 기반 5단계 상태 머신 (draft / pending_ai / ai_processed / ready_curation / archived) | 운영자는 작성 → 게시 2단계만 필요 (draft / published) | **과잉** |
| 운영자용 AI 작업 큐 (Workspace B) — 능동 AI 제작 도구 | 매장·커뮤니티 측 AI 필요는 강하나 운영자는 정리된 자료 보유 | **과잉** |
| Workspace A → B → C → HUB 4단계 흐름 | A (작성·편집) → C (게시·진열) 2단계로 충분 | **과잉** |
| sourceMetadata jsonb (수신 채널 / 공급자명 / 원본 파일명 등) | 단순 카테고리·태그·대상 서비스로 충분 | **과잉** |

### 2.2 새 방향의 정합성

| 새 방향 요소 | 근거 |
|------------|------|
| Operator 는 사업자, 콘텐츠 정리 능력 보유 | PHILOSOPHY §3.2 의 "서비스 운영 사업자" 정의 |
| 외주·내부 담당자·관련 업체 통한 콘텐츠 수신 | 현실 사업 운영 패턴 — O4O 외부 흐름 |
| 매장 HUB 항목 = 내 매장 메뉴와 같은 축 | 매장 가져가기 흐름의 자연스러운 정렬 |
| AI 도구는 매장·커뮤니티에 더 필요 | 매장 경영자·커뮤니티 사용자가 편집 스킬·시간 부족 |
| RichTextEditor 단일 편집기로 충분 | `@o4o/content-editor` 가 이미 9+ 사용처에서 검증된 공통 자산 |

### 2.3 판정

**Source Ingestion 방향은 현 단계 과도 설계.** 향후 데이터 규모·복잡도 증가 시 재도입 가능하나, 우선은 RichTextEditor 기반 단순 게시 구조로 충분하다.

---

## 3. 매장 HUB 항목 재정의

### 3.1 정렬 기준 — 내 매장 제작/활용 메뉴와 같은 축

| 항목 | 매장 HUB 진열 | 매장 측 제작 | 가져가기 (snapshot copy) | 정렬 상태 |
|------|:------------:|:-----------:|:-----------------------:|:--------:|
| **상품 상세정보** | HubB2BCatalogPage (KPA/Glyco) | StoreProductInfoCreatorPage (KPA) | 부분 (`assetType='product'` 미확인) | **부분 정렬** |
| **POP** | StoreHubSignageLibrary 내 / 부분 | StorePopPage (KPA) | ✅ `assetType='signage'` | **정렬** |
| **QR-code** | 독립 진열 화면 부재 | StoreQRPage (KPA) | ✅ via library | **부분 정렬** |
| **블로그** | 진열 화면 부재 | PharmacyBlogPage (KPA, direct) | ❌ Hub→Store 흐름 없음 | **미정렬** |
| **사이니지** | HubSignageLibraryPage | StoreSignagePage | ✅ `assetType='signage'` | **정렬** |
| **고객 안내문 / 설명자료** | HubContentLibraryPage (CMS) | 매장 측 화면 부재 | ✅ `assetType='cms'` | **부분 정렬** |

### 3.2 결론

- **3개 항목 (POP / 사이니지 / 고객 안내문)** 은 HUB ↔ 매장 흐름이 이미 정렬됨
- **3개 항목 (상품 상세 / QR / 블로그)** 은 부분 또는 미정렬 — 후속 작업 대상
- **설문은 본 IR 범위 외** (§8 참조)

---

## 4. 운영자용 O4O 공통 RichTextEditor 기반 편집 구조

### 4.1 RichTextEditor 현황

- 위치: [`packages/content-editor/src/components/RichTextEditor.tsx`](../../packages/content-editor/src/components/RichTextEditor.tsx) (TipTap 기반)
- 지원 기능: H1-H3 / 텍스트 스타일 / 목록 / 이미지 / YouTube / HTML / 미리보기 / 템플릿 / AI 모달 / 클립보드 이미지 자동 업로드
- 사용처: 9+ 화면 (ContentWritePage / ResourceWritePage / PharmacyBlogPage / GuidelineManagementPage / OperatorResourcesPage / ForumPostForm 등)
- **검증된 공통 자산** — 신규 항목 추가 시 그대로 재사용 가능

### 4.2 항목별 편집기 구조 권장

| 항목 | 권장 구조 | 추가 필드 |
|------|----------|----------|
| 상품 상세정보 | 공통 RTE + 전용 필드 | 갤러리 / 가격 / 변형 옵션 |
| POP | 공통 RTE + config | 템플릿 선택 / 강조색 / 레이아웃 |
| QR-code | 공통 RTE + 전용 필드 | URL / QR 이미지 자동 생성 |
| 블로그 | 공통 RTE + metadata | 제목 / excerpt / slug / 발행일 |
| 사이니지 | **전용 화면 권장** | timing / 해상도 / 캐시 옵션 (RTE 부적합) |
| 고객 안내문 | 공통 RTE + config | 카테고리 / 버전 |

### 4.3 단일 통합 vs 항목별 wrapping

**판정: 항목별 wrapping 페이지 권장.**

근거:
- 항목별 특수 필드 차이 명확 (사이니지 timing / POP 템플릿 / QR url 등)
- 저장 destination 다름 (`store_execution_assets` / `cms_contents` / `signage_media` / `staff_blog_posts` 등)
- 단일 통합 시 조건부 렌더링 복잡도 증가
- 기존 패턴 (`ContentWritePage` / `ResourceWritePage`) 이 이미 wrapping 구조

**권장 구조:**

```text
OperatorContentHubPage (목록 + Workspace C 진입 허브)
├─ OperatorBlogWritePage      (RTE + excerpt/slug — 기존 ContentWritePage 패턴 재사용)
├─ OperatorPopWritePage       (RTE + 템플릿)
├─ OperatorQRWritePage        (RTE + URL + QR 생성)
├─ OperatorProductDetailPage  (RTE + 갤러리/가격)
├─ OperatorGuideWritePage     (RTE only — 기존 GuidelineManagementPage 확장)
└─ OperatorSignagePage        (전용 화면 — RTE 부적합)
```

### 4.4 AiContentModal 의 위치

| 위치 | 사용 |
|------|------|
| 운영자 | **보조 옵션** — 필수 아님 (운영자는 정리된 자료 보유) |
| 매장 경영자 | **우선 필요** — 매장이 가져온 자료를 자기 매장에 맞게 보완 시 |
| 커뮤니티 | **우선 필요** — 일반 사용자 편집 스킬 보완 |

→ 운영자 화면에는 AI 모달이 **있어도 좋고 없어도 무방**. 향후 매장·커뮤니티 측에 집중 확장.

---

## 5. 내 매장 기능과의 정렬

### 5.1 매장 측 제작 화면 현황

| 항목 | 매장 제작 구현도 | 비고 |
|------|:--------------:|------|
| POP | 100% (KPA 중심) | `StorePopPage` + `store_execution_assets` |
| QR | 90% (KPA) | `StoreQRPage` + library 참조 |
| 사이니지 | 95% (KPA / Glyco) | `StoreSignagePage` + `o4o_asset_snapshots` |
| 블로그 | 70% (KPA 단독) | `PharmacyBlogPage` — 직접 작성 위주, Hub 가져오기 없음 |
| 상품 상세 | 60% (KPA 단독) | `StoreProductInfoCreatorPage` — 직접 작성, Hub 흐름 부재 |
| 고객 안내문 | 0% | 전체 미구현 |

### 5.2 통합 메뉴 정의 부재

- 매장 메뉴는 페이지별로 분산 — 중앙 메뉴 정의 (`storeMenuTree.ts` 같은 canonical) 부재
- 매장 HUB ↔ 내 매장 제작 메뉴 정렬을 위해 **메뉴 표준 정의 필요**

### 5.3 출처 표시 패턴 (부분 구현)

기존 `StorePopPage` 의 origin badge:
- `library` — 자료 (운영자 게시 콘텐츠를 가져온 것)
- `snapshot` — 커뮤니티 콘텐츠
- `direct` — 직접 작성 콘텐츠

→ 이 패턴을 다른 항목 (블로그 / 상품 상세 / 고객 안내문) 에도 확장 권장.

### 5.4 운영자 게시 콘텐츠 ↔ 매장 자체 작성의 통합 표시

매장 화면에서 두 출처를 동일 자료실에 표시 + badge 로 구분하는 것이 권장 구조. 기존 `assetSnapshotApi.copy()` 패턴이 이를 지원.

---

## 6. 매장 HUB 게시/진열 구조

### 6.1 현재 표준 흐름

```text
Operator 작성 (CmsContentManager + RichTextEditor)
   ↓ 게시 (status='published')
HUB 진열 (HubContentQueryService)
   ↓ 매장 가져오기 (assetSnapshotApi.copy())
o4o_asset_snapshots / 매장 측 entity
   ↓ 매장 활용
매장 실행 자산 (POP/QR/블로그 등으로 변환)
```

### 6.2 분류·진열 메타데이터

**공통화 가능 필드:**

- `producer` ('operator' / 'community') — PLATFORM-CONTENT-POLICY-V1 §3.2
- `serviceKey` (cross-service 격리)
- `createdAt` / `creatorName`
- `category` / `tags` / `target_service`
- `visibilityScope` ('platform' / 'service' / 'organization')
- `isPinned` / 정렬 우선순위

**항목별 고유 필드:**

- CMS: `type` (notice / news / guide), `tags`
- Signage: `mediaType` / `duration` / `scope`
- Product: 별도 메타

### 6.3 게시 표준화 권장

CmsContentManager 패턴을 다른 항목으로 확장:

```text
- CmsContentManager (현존, 통합도 높음) — 콘텐츠/안내문/공지
- (신규) OperatorBlogManager — 블로그 게시 (CmsContentManager 확장 가능)
- (신규) OperatorPopManager — POP 게시
- (신규) OperatorQRManager — QR 게시
- (신규) OperatorProductDetailManager — 상품 상세 게시
- SignagePage (현존, 전용 유지) — 사이니지
```

---

## 7. 기존 구현 재사용 가능성

### 7.1 그대로 재사용 가능 (강한 후보)

| 컴포넌트 | 위치 | Workspace 게시 재사용 |
|---------|------|---------------------|
| `RichTextEditor` | `@o4o/content-editor` | 모든 항목 본문 편집 |
| `AiContentModal` | `@o4o/content-editor` | 항목별 선택적 보조 |
| `CmsContentManager` | `@o4o/operator-core-ui/modules/cms-content` | 콘텐츠 / 안내문 / 공지 게시 표준 |
| `assetSnapshotApi.copy()` | `apps/api-server/.../asset-snapshot.controller.ts` | 매장 가져오기 통일 |
| `HubContentQueryService` | `apps/api-server/src/modules/hub-content/` | HUB 통합 조회 |
| `DataTable + BaseDetailDrawer + ActionBar` | `@o4o/operator-ux-core` | 운영자 목록 / 상세 / bulk |
| `ContentWritePage` 패턴 | KPA | 블로그 wrapping 토대 |
| `ResourceWritePage` 패턴 | KPA | 자료 wrapping 토대 |
| `GuidelineManagementPage` 패턴 | Glyco | 안내문 wrapping 토대 |

### 7.2 신규 작성 (소규모)

- 항목별 wrapping 페이지 2-3개 (블로그 / POP / QR / 상품 상세 / 안내문 중 일부)
- 매장 메뉴 canonical 정의 (`storeMenuTree.ts`)
- 운영자 측 통합 게시 콘솔 진입 (`OperatorContentHubPage`)

### 7.3 재사용 비율

**약 70-80% 재사용 가능.** 신규 작성량은 도메인 특화 wrapping 에 집중. RichTextEditor / CmsContentManager / DataTable 등 핵심 자산은 모두 그대로.

---

## 8. 설문 제외 및 후속 논의 메모

본 IR 에서는 설문을 설계하지 않는다.

**메모 (향후 별도 논의):**

```text
설문은 필요함
당분간 매장 HUB 중심
우선은 매장 경영자 대상 설문
소비자 대상 설문은 QR-code / 태블릿 등 실제 소비자 환경 설계 필요
배치 방식 (매장 HUB 내 / 별도 영역) 별도 논의
```

→ 본 IR 의 항목 정의 (POP / QR / 블로그 / 상품 상세 / 사이니지 / 고객 안내문) 에 **설문 미포함**. 향후 별도 IR 로 처리.

---

## 9. 기존 Source Materials 컬럼 사용 여부

### 9.1 직전 WO 의 4 컬럼 평가

[`WO-O4O-OPERATOR-SOURCE-MATERIALS-DATA-MODEL-EXTENSION-V1`](../work-orders/...) 으로 `kpa_store_contents` 에 추가된 4 컬럼:

| 컬럼 | 본 IR 방향에서의 사용 여부 | 판정 |
|------|---------------------------|------|
| `author_role` ('operator' / 'store') | 운영자 vs 매장 직접 작성 구분 — 본 IR 방향에서도 유용 | **즉시 활용** |
| `visibility_scope` ('organization' 강제) | 매장 단위 격리 — 본 IR 방향에서도 유용 (HUB 직접 노출 차단 가드) | **즉시 활용** |
| `source_metadata` (jsonb) | Source Ingestion 의 수신 채널·공급자명 메타 — 본 IR 방향에서는 사용 안 함 (단순 카테고리/태그로 충분) | **미사용 가능성** |
| `workspace_status` (5단계 상태 머신) | A→B→C 워크플로 추적용 — 본 IR 방향은 draft/published 2단계 | **미사용 가능성** |

### 9.2 처리 권장

**판정: 2 컬럼 즉시 활용 / 2 컬럼 보류 (미삭제).**

- `author_role` / `visibility_scope` — Drift 가드 (DB CHECK 제약) 로 즉시 가치 있음. 유지.
- `source_metadata` / `workspace_status` — 본 IR 방향에서는 미사용. 그러나:
  - 마이그레이션 이미 적용됨 (rollback 비용 발생)
  - 향후 재도입 가능성 (확장 여지 보존)
  - default 값으로 backfill 되어 운영 부담 없음
  - → **삭제 불필요, 보류 상태로 잔존**

**미사용 컬럼은 본 IR 채택 시 향후 코드에서 참조하지 않음.** 실질적 dead column 이 되지만 DB 비용 무시 가능.

### 9.3 신규 WO 시 영향

본 IR 채택 시 Phase 2 (`WO-O4O-OPERATOR-SOURCE-MATERIALS-API-V1`) 는 **중단**. 대신 다음 방향:

```text
WO-O4O-OPERATOR-HUB-CONTENT-PUBLISHING-V1 (가칭)
  - CmsContentManager 기반 통합 게시 콘솔
  - 항목별 wrapping 페이지 (블로그/POP/QR/상품 상세/안내문)
  - 매장 메뉴 canonical 정의
```

---

## 10. Drift 목록

본 IR 의 새 방향 기준에서 Drift 로 식별되는 상태:

| # | Drift | 등급 | 비고 |
|---|-------|:----:|------|
| HCS1 | 운영자에게 복잡한 원천 자료 수신 관리 시스템을 우선 구축 | **HIGH** | Source Ingestion 방향 자체 — 본 IR 로 보류 결정 시 해소 |
| HCS2 | 운영자에게 공급자처럼 콘텐츠 제작 도구를 과도하게 제공 (대형 AI 파이프라인 / 작업 큐) | **HIGH** | Workspace B 신설 보류로 해소 |
| HCS3 | 공급자가 O4O 내부 Producer 로 다시 등장 | HIGH | 기존 명문화된 예외 유지 (별도 IR 처리 완료) |
| HCS4 | 매장 HUB 항목이 내 매장 실행 메뉴와 다른 축으로 분리 | MED | 매장 메뉴 canonical 정의 부재 — 후속 WO 대상 |
| HCS5 | 운영자 편집 콘텐츠가 매장 경영자가 가져가 쓰기 어려운 형태로 저장 | MED | `assetSnapshotApi.copy()` 통일 패턴으로 완화 가능 |
| HCS6 | O4O 공통 RichTextEditor 대신 서비스별 임시 편집기 도입 | LOW | 현재 광범위 재사용 중 — 위반 없음 |
| HCS7 | 설문을 이번 범위에 포함하여 구조를 복잡하게 만듦 | LOW | 본 IR 범위 외 명시 |
| HCS8 | 블로그 / 상품 상세 / 고객 안내문이 HUB ↔ 매장 흐름에서 정렬 안 됨 | MED | 후속 WO 신규 항목 추가 대상 |

---

## 11. 후속 WO 권장 순서

### 11.1 즉시 — 방향 전환 확정

| # | 작업 | 비고 |
|---|------|------|
| **D1** | Source Ingestion 방향 **보류** 결정 | `IR-O4O-OPERATOR-WORKSPACE-A-OFFLINE-SOURCE-INGESTION-DESIGN-V1` 의 Phase 2/3 진행 중단 |
| **D2** | 직전 WO 의 4 컬럼 중 2 컬럼 미사용 처리 (삭제 X, 코드 미참조) | `source_metadata` / `workspace_status` |

### 11.2 Phase 1 — 운영자 게시 콘솔 정렬 (문서 정렬)

| # | WO | 범위 |
|---|----|------|
| **W1** | `WO-O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1` | 운영자 측 통합 게시 표준 정의 (CmsContentManager 패턴 확장) + 항목별 wrapping 페이지 구조 명시 |
| **W2** | `WO-O4O-STORE-MENU-CANONICAL-TREE-V1` | 매장 메뉴 canonical 정의 (`storeMenuTree.ts`) — HUB 항목과 같은 축 정렬 |

### 11.3 Phase 2 — 부족 항목 신설 (구현)

| # | WO | 범위 |
|---|----|------|
| **W3** | `WO-O4O-OPERATOR-BLOG-PUBLISHING-V1` | 블로그 운영자 게시 화면 신설 + 매장 가져오기 흐름 추가 |
| **W4** | `WO-O4O-OPERATOR-PRODUCT-DETAIL-PUBLISHING-V1` | 상품 상세 운영자 게시 + 매장 Hub 흐름 |
| **W5** | `WO-O4O-OPERATOR-QR-PUBLISHING-V1` | QR 운영자 게시 화면 |
| **W6** | `WO-O4O-OPERATOR-CUSTOMER-GUIDE-PUBLISHING-V1` | 고객 안내문 항목 신설 (현재 0%) |

### 11.4 Phase 3 — 매장 측 보완

| # | WO | 범위 |
|---|----|------|
| **W7** | `WO-O4O-STORE-HUB-CONTENT-IMPORT-STANDARD-V1` | 매장 가져오기 흐름 통일 (`assetSnapshotApi.copy()` 항목별 적용) |
| **W8** | `WO-O4O-STORE-CONTENT-ORIGIN-BADGE-V1` | 출처 표시 (`library`/`snapshot`/`direct`) 다른 항목으로 확장 |

### 11.5 Phase 4 — 매장·커뮤니티 측 AI (장기)

| # | 작업 | 비고 |
|---|------|------|
| W9 | 매장·커뮤니티 측 AI 보조 도구 강화 — `AiContentModal` 활용 확장 | 운영자보다 우선순위 높음 (편집 스킬·시간 부족 영역) |

### 11.6 Phase 5 — 설문 (별도 IR)

`IR-O4O-SURVEY-STRUCTURE-DESIGN-V1` — 매장 경영자 대상 우선, 소비자 대상은 QR/태블릿 환경 설계 선행 필요. 본 IR 범위 외.

### 11.7 권장 진행 순서

```text
D1 (방향 전환 확정) + D2 (컬럼 보류)
   ↓
W1 (게시 표준) + W2 (메뉴 canonical)  — 병렬, 문서 정렬
   ↓
W3 / W4 / W5 / W6 (항목별 구현)       — 우선순위 순차
   ↓
W7 + W8 (매장 측 보완)               — 병렬
   ↓
W9 (매장·커뮤니티 AI 강화)            — 장기
```

---

## 12. Current Structure vs O4O Philosophy Conflict Check

| 차원 | Source Ingestion 방향 (직전 IR) | 본 IR 새 방향 | PHILOSOPHY §3.2 | 충돌 |
|------|--------------------------------|--------------|-----------------|:----:|
| Operator = 사업자 (콘텐츠 정리 능력 보유) | 가정 없음 — Inbox 시스템 전제 | 명시 인정 | 일치 (PHILOSOPHY §3.2) | **본 IR 일치** |
| Operator AI 활용 (능동 사용) | 작업 큐 + 파이프라인 (과잉) | AiContentModal 보조 옵션 | "능동 사용" 가능 — 정도는 자유 | **본 IR 일치** |
| 매장 실행 자산 제작 | 운영자 직접 제작 (가공 단계 강제) | 운영자 작성·게시 + 매장 가져가기 가공 | 운영자 제작 명시 — 단계 자유 | **본 IR 일치** |
| 매장 지원 | Workspace D 별도 영역 | 매장 HUB 게시 = 매장 지원의 핵심 행위 | 일치 | **본 IR 일치** |
| Supplier 직접 Producer 금지 | 기존 명문화 유지 | 동일 (변경 없음) | 일치 | 일치 |
| HUB Producer = Operator | 가정 | 명시 인정 | 일치 | 일치 |
| Store = 실행 주체 | Workspace 단방향 | 매장 가져가기 후 활용 | 일치 | 일치 |

**판정:**
- Source Ingestion 방향은 PHILOSOPHY §3.2 와 명시적 충돌 없음 (Operator 능동 AI 활용 가능 명시) 그러나 **현 단계 과잉**.
- 본 IR 의 단순 게시 방향은 PHILOSOPHY §3.2 의 모든 차원과 일치하며, 현재 운영 단계에 적합.
- 향후 데이터 규모·복잡도 증가 시 Source Ingestion 일부 재도입 가능 (보류된 2 컬럼 활용).

---

## 13. 확인 항목

| 검증 | 결과 |
|------|------|
| 1. 조사 목적 | ✅ §1 |
| 2. 현재 과도 설계 여부 판단 | ✅ §2 — Source Ingestion 과도 결정 |
| 3. 매장 HUB 항목 재정의 | ✅ §3 — 6 항목 정렬 상태 명시 |
| 4. 운영자용 RichTextEditor 기반 편집 구조 | ✅ §4 — 항목별 wrapping 권장 |
| 5. 내 매장 기능과의 정렬 | ✅ §5 — 메뉴 canonical 정의 필요 |
| 6. 매장 HUB 게시/진열 구조 | ✅ §6 — CmsContentManager 패턴 확장 권장 |
| 7. 기존 구현 재사용 가능성 | ✅ §7 — 70-80% 재사용 가능 |
| 8. 설문 제외 및 후속 논의 메모 | ✅ §8 |
| 9. 기존 Source Materials 컬럼 사용 여부 | ✅ §9 — 2 활용 / 2 보류 |
| 10. Drift 목록 | ✅ §10 — 8건 |
| 11. 후속 WO 권장 순서 | ✅ §11 — 5 Phase |
| 12. Current Structure vs O4O Philosophy Conflict Check | ✅ §12 |

---

**작성:** Claude Code (조사)
**상태:** Read-Only IR / 방향 전환 결정 대기
