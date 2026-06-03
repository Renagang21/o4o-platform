# IR-O4O-OPERATOR-WORKSPACE-A-OFFLINE-SOURCE-INGESTION-DESIGN-V1

> ⚠ **방향 전환 — 본 IR 은 보류 (Superseded) 됨 (2026-05-23)**
>
> 본 IR 의 Source Ingestion 시스템 방향은 [`IR-O4O-OPERATOR-HUB-CONTENT-PUBLISHING-SIMPLIFICATION-V1`](IR-O4O-OPERATOR-HUB-CONTENT-PUBLISHING-SIMPLIFICATION-V1.md) 의 재검토 결과 **현 단계 과도 설계** 로 판정됨.
>
> 새 canonical 방향: [`O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1`](../baseline/O4O-OPERATOR-HUB-CONTENT-PUBLISHING-STANDARD-V1.md) — 운영자는 정리된 콘텐츠를 보유하므로, RichTextEditor 기반 항목별 매장 HUB 게시로 전환.
>
> **중단된 후속 WO:** `WO-O4O-OPERATOR-SOURCE-MATERIALS-API-V1` (Phase 2), `WO-O4O-OPERATOR-WORKSPACE-A-UI-V1` (Phase 3).
>
> 본 IR 의 내용은 **참조 보존** 차원으로 유지. 향후 데이터 규모·복잡도 증가 시 일부 재도입 가능.
>
> ---
>
> **조사 요청서 (Investigation Result)**
>
> 코드 수정 없음 / UI 수정 없음 / 라우트 추가 없음 / DB 변경 없음 / API 변경 없음
>
> 본 IR 은 Operator Workspace A — **운영자가 외부/오프라인으로 수신한 원천 자료를 O4O 내부에 등록·분류·관리하는 공간** — 의 실제 화면 구조 / 재사용 자산 / 데이터 모델 후보를 read-only 로 설계한다.

- **작성일:** 2026-05-23
- **분류:** Investigation Result (Read Only / Design)
- **기준 문서:**
  - [`O4O-BUSINESS-PHILOSOPHY-V1 §3.2`](../baseline/O4O-BUSINESS-PHILOSOPHY-V1.md) (Operator 책임)
  - [`O4O-3-ROLE-FLOW-BASELINE-V1 §3, §4 Category A`](../baseline/O4O-3-ROLE-FLOW-BASELINE-V1.md) (원천 자료 흐름)
  - [`O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1 §3`](../baseline/O4O-OPERATOR-NON-APPROVAL-UX-BASELINE-V1.md) (Workspace A 정의)
  - [`O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1`](../architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md)
  - [`IR-O4O-SUPPLIER-CONTENT-PRODUCER-LEGACY-AUDIT-V1`](IR-O4O-SUPPLIER-CONTENT-PRODUCER-LEGACY-AUDIT-V1.md) (직전 IR)
- **상태:** Read-Only Design IR / 구현 WO 입력 자산 준비 완료

---

## 1. 명칭 정합성

### 1.1 Drift 명칭 (사용 금지)

```text
공급자 자료 등록
Supplier content registration
Supplier CMS
Supplier producer
```

이 명칭들은 공급자가 O4O 내부에 직접 진입한다는 잘못된 인상을 준다.

### 1.2 권장 명칭 후보 (3개 압축)

| # | 명칭 | 톤 | 추천도 |
|---|------|----|:------:|
| 1 | **운영자 수신 자료 등록** | 한국어 자연, 책임 주체 명확 | **★ 1순위** |
| 2 | **오프라인 수신 원천 자료 등록** | 출처 채널 명확, 다소 길음 | ★ 2순위 |
| 3 | Operator Source Ingestion | 기술 영어, 코드/문서 용 | ★ 보조 (영어 컨벤션) |

**최종 권장:**

- UI 메뉴명: **"운영자 수신 자료"** (간결)
- 페이지 헤더: **"운영자 수신 자료 등록"** (행동 명확)
- 코드 / 문서 / 컴포넌트명: **`OperatorSourceMaterial*`** (영어 컨벤션 통일)
- API 네임스페이스: `/api/v1/{service}/operator/source-materials/*`

> "공급자 자료" 라는 표현은 Drift 위험이 높으므로 UI에서 피한다. 등록자 (Operator) 와 자료 출처 (Supplier) 의 구분이 명확해야 한다.

---

## 2. Workspace A 화면 구조 후보

### 2.1 화면 일람

| 코드 | 화면 | 주요 기능 | 우선순위 |
|:----:|------|----------|:--------:|
| **A-1** | 수신 원천 자료 목록 | DataTable / 검색 / 필터 (자료 유형 / 공급자 / 상태 / 수신 채널) | **MUST** |
| **A-2** | 새 원천 자료 등록 폼 | 다중 입력 방식 (파일 / URL / 텍스트 / 메모) + 메타데이터 | **MUST** |
| **A-3** | 자료 상세 / 미리보기 | drawer 또는 page — 원본 보기 + 메타 편집 + AI 보조 | **MUST** |
| **A-4** | 공급자 / 브랜드 / 상품 연결 | 자료 → 공급자 마스터 / 브랜드 / 상품 연결 (드롭다운 / 검색) | SHOULD |
| **A-5** | AI 작업으로 보내기 | Workspace B 진입점 — 작업 큐에 등록 + 작업 유형 선택 (요약 / 초안 / 매칭) | SHOULD |
| **A-6** | 큐레이션 후보로 보내기 | Workspace C 진입점 — HUB 노출 후보 표시 (단, 자료 자체가 아닌 가공 후) | NICE |
| **A-7** | 보류 / 폐기 / 중복 표시 | 상태 관리 (`hold` / `discarded` / `duplicate_of`) | NICE |

### 2.2 화면 흐름

```text
A-1 (목록)
   │
   ├─ "신규 등록" → A-2 (등록 폼)
   │                  │
   │                  ↓
   │              저장 → A-1 (목록 복귀)
   │
   ├─ row 클릭 → A-3 (상세 drawer)
   │              │
   │              ├─ "공급자 연결" → A-4 (modal)
   │              ├─ "AI 작업으로" → A-5 (Workspace B 진입)
   │              ├─ "큐레이션으로" → A-6 (Workspace C 진입)
   │              └─ "보류/폐기" → A-7 (상태 변경)
   │
   └─ bulk action → A-5 / A-6 / A-7 (다중 자료 일괄 처리)
```

### 2.3 표준 UX 패턴 따름

- 목록 유지형 콘솔 ([`O4O-OPERATOR-CANONICAL-WORKFLOW-V1`](../architecture/O4O-OPERATOR-CANONICAL-WORKFLOW-V1.md) 검수 워크플로 와 동일 패턴)
- A-1 = 목록 + 검색·필터 / A-3 = drawer 상세 / bulk action 지원
- Workspace A 는 "검수 게이트" 가 아니라 "입력·등록·분류" 영역이지만, UX 패턴은 동일 (목록 + drawer + bulk)

---

## 3. 입력 방식

### 3.1 입력 채널 (A-2 등록 폼)

| 채널 | 입력 방식 | 비고 |
|------|----------|------|
| **파일 업로드** | drag-drop / 클릭 업로드 | 이미지 / PDF / 영상 |
| **URL 입력** | 텍스트 필드 + URL preview | 공식 영상 / 외부 클라우드 / 카탈로그 링크 |
| **텍스트 붙여넣기** | RichTextEditor | 마케팅 문구 / 제품 설명 / 브랜드 소개 |
| **외부 클라우드 링크 기록** | 텍스트 필드 + 메모 | Google Drive / Dropbox / OneDrive 등 |
| **이메일 / 카카오톡 전달 자료 메모** | 텍스트 메모 + 첨부 | 수신 채널 명시 (선택) |

### 3.2 메타데이터 (필수 / 선택)

| 필드 | 필수 | 설명 |
|------|:----:|------|
| 제목 | ✅ | 자료 식별용 |
| 자료 유형 (다중 선택) | ✅ | §4 Category 참조 |
| 공급자 / 브랜드 | △ | 가능하면 입력 (A-4 에서 연결도 가능) |
| 수신 채널 | △ | 이메일 / 카톡 / 파일 전달 / 클라우드 / 방문 / 기타 |
| 수신 일시 | △ | 기본값 = 등록 시각 |
| 등록자 (Operator) | ✅ | 서버 자동 (현재 user) |
| 원본 파일/URL | ✅ (둘 중 하나) | 본문 또는 첨부 |
| 본문 / 설명 | △ | RichTextEditor (선택) |
| 태그 | △ | 자유 입력 (검색용) |
| 메모 | △ | 운영자 내부 메모 |

### 3.3 입력 원칙

- **운영자가 등록 주체** — 공급자는 직접 폼에 진입하지 않는다
- **출처 명시** — 어디서 어떻게 받았는지 (메타) 는 가능한 한 입력
- **공급자명은 텍스트 + 마스터 연결** — A-2 에서 자유 텍스트 입력 가능, A-4 에서 공식 마스터에 연결 가능

---

## 4. 원천 자료 유형 정의

### 4.1 자료 유형 vs 실행 자산 매핑

| 원천 자료 유형 (Workspace A 입력) | 실행 자산 (Workspace B/C 산출물 후보) |
|----------------------------------|-------------------------------------|
| 제품 정보 (텍스트 / 스펙) | 상품 상세 설명, POP, 사이니지 텍스트 |
| 제품 이미지 | POP, QR, 블로그, 사이니지, 상품 상세 |
| 제품 설명 PDF | 상품 상세 설명, 블로그, POP |
| 카탈로그 | 사이니지, 매장 안내 책자 |
| 브랜드 자료 | 매장 안내문, 사이니지, 매장 매뉴얼 |
| 광고 자료 (이미지 / 영상) | 사이니지, 블로그 |
| 공식 영상 URL | 사이니지, 블로그, QR (영상 링크) |
| 마케팅 문구 (텍스트) | POP, 블로그, 사이니지 텍스트 |
| 오프라인 전달 파일 (그 외) | (유형 추정 후 분류) |
| 외부 링크 | (참조용 - 가공 시 별도 다운로드) |

### 4.2 분류 원칙

- **다중 유형 가능** — 한 자료가 여러 유형을 가질 수 있음 (예: 이미지 + 마케팅 문구 = "제품 이미지" + "마케팅 문구" 동시 선택)
- **유형 → 가공 가능 자산 자동 제안** — Workspace B 진입 시 가공 가능한 산출물 유형이 자동 제안됨
- **유형 자체는 자료의 속성** — 가공 결과물 유형 (POP / QR / 블로그) 은 Workspace B/C 에서 결정

---

## 5. 재사용 가능한 기존 구현

### 5.1 그대로 재사용 가능 (강한 후보)

| 컴포넌트 | 위치 | Workspace A 재사용 방식 |
|---------|------|----------------------|
| **`ResourceWritePage`** | [`services/web-kpa-society/src/pages/resources/ResourceWritePage.tsx:52-276`](../../services/web-kpa-society/src/pages/resources/ResourceWritePage.tsx) | A-2 등록 폼의 토대. 파일/URL/텍스트 다중 입력, 태그·상태 관리, usage_type 기반 제약 패턴. **명칭만 `OperatorSourceMaterialFormPage` 로 wrapping** |
| **`AiContentModal`** | [`packages/content-editor/src/components/AiContentModal.tsx:1-120`](../../packages/content-editor/src/components/AiContentModal.tsx) | A-3 / A-5 의 AI 보조. URL/텍스트 → AI 변환, HTML 출력, `onInsert` 콜백. **그대로 사용**, 메타 추출 프롬프트만 신규 |
| **`DataTable` + `ListColumnDef`** | [`packages/operator-ux-core/src/list/DataTable.tsx:24-100`](../../packages/operator-ux-core/src/list/DataTable.tsx) | A-1 목록. 정렬·선택·렌더링·검색·페이지네이션 |
| **`MediaPickerModal`** | [`services/web-kpa-society/src/components/common/MediaPickerModal.tsx:64-120`](../../services/web-kpa-society/src/components/common/MediaPickerModal.tsx) | A-2 파일/이미지 업로드. 업로드 + 라이브러리 탭, 폴더 필터 |
| **`BaseDetailDrawer` + `ActionBar`** | `@o4o/ui` / `@o4o/operator-ux-core` | A-3 상세 drawer + bulk action |
| **`RichTextEditor`** | `@o4o/content-editor` | A-2 / A-3 본문 입력 |
| **`OperatorDashboardLayout`** | `@o4o/operator-ux-core` | 페이지 외곽 표준 |

### 5.2 패턴 재사용 (구조 차용)

| 컴포넌트 | 위치 | 차용 부분 | 신규 작성 부분 |
|---------|------|----------|--------------|
| `ContentWritePage` (KPA) | `pages/contents/ContentWritePage.tsx` | RichTextEditor 통합, AI 삽입 패턴, 태그 칩 입력 | 다중 입력 채널 (파일/URL/메모), 운영자 메타 (수신 채널·공급자 연결) |
| `BrandManagementPage` (Neture) | `pages/operator/BrandManagementPage.tsx` | DataTable + GuideBlock + EditableTextCell | "검수 → 배정 → 발행" 이 아닌 "수신 → 등록 → B/C 배정" 워크플로 |
| `GuidelineManagementPage` (Glyco) | `pages/operator/GuidelineManagementPage.tsx` | RichTextEditor 통합, 발행/초안 상태 전환, 상태 배지 | Workspace A 의 상태 머신 (`received → meta_extracted → assigned → completed`) |
| `SupplierLibraryPage` (Neture) | `pages/supplier/SupplierLibraryPage.tsx` | 목록 조회 + 가시성 필터 패턴 | Workspace A 는 운영자 측 등록자, supplier 측 아님 — 권한·역할 분리 |
| `WorkingContentEditPage` (KPA) | `pages/operator/WorkingContentEditPage.tsx` | 블록 단위 편집 + BlockRenderer 미리보기 | 원천 자료 → 메타 입력 → AI 변환 → 블록 구성 흐름 |

### 5.3 부적합 (사용 금지 또는 영역 다름)

| 후보 | 부적합 사유 |
|------|------------|
| **Supplier 측 등록 컴포넌트** (이미 [UI cleanup WO 로 제거됨](IR-O4O-SUPPLIER-CONTENT-PRODUCER-LEGACY-AUDIT-V1.md)) | Workspace A 는 Operator 등록 — 공급자 측 UI 와 명확히 구분 |
| **공급자 자료실 (`/supplier/library`)** | 공급자 자체 자료 (legacy) — Operator 가 진입하지 않음 |
| **AssetSnapshot 관련** | Store 의 매장 실행 자산 복사 도구. Workspace A 의 입력 단계 아님 |
| **HubSignageLibraryPage** | 매장이 HUB 에서 자료 선택 — 입력 단계 아님 |

---

## 6. 신규 필요 구조

### 6.1 신규 화면 / 컴포넌트

| 항목 | 신규 작성 사유 |
|------|--------------|
| **`OperatorSourceMaterialInboxPage`** (A-1) | 운영자 수신 자료 전용 목록 — DataTable 재사용하되 필터·컬럼 운영자 특화 |
| **`OperatorSourceMaterialReceiveForm`** (A-2 신규 영역) | 다중 입력 채널 (파일/URL/텍스트/메모) + 수신 채널·공급자 연결 필드 — 기존 ResourceWritePage 에 없는 다채널 동시 지원 |
| **`SourceMaterialDetailDrawer`** (A-3) | drawer 자체는 BaseDetailDrawer 재사용, 내부 layout 신규 (원본 미리보기 + 메타 편집 + AI 보조 통합) |
| **`SourceTypeMultiSelectModal`** (A-2 보조) | 자료 유형 다중 선택 — §4 Category 매핑 기반 |
| **`SupplierBrandLinkModal`** (A-4) | 공급자 / 브랜드 마스터 연결 — 검색 + 드롭다운 |
| **`WorkspaceBHandoffModal`** (A-5) | Workspace B 진입 — 작업 유형 선택 (요약 / 초안 / 매칭) |
| **`SourceMaterialAssignModal`** (A-5 / A-6) | Workspace B / C 배정 — 담당자 / 작업 유형 지정 |

### 6.2 신규 컴포넌트 추정량

- 페이지 **2-3개** (Inbox, ReceiveForm, optional EditPage)
- 모달 **4-5개** (SourceTypeMultiSelect, SupplierBrandLink, WorkspaceBHandoff, SourceMaterialAssign, optional duplicate detection)
- **기존 자산 재사용 60-70%** — 신규 작성량은 도메인 특화 로직에 집중

---

## 7. 데이터 모델 후보

### 7.1 후보 평가 매트릭스

| 테이블 / 엔티티 | 적합도 | 판정 | 근거 |
|----------------|:------:|------|------|
| **`kpa_store_contents`** | ★★★ | **단기 SSOT 후보 (조건부 확장)** | 매장 편집층 정위치, `source_type` 구분 가능, 조직 격리, HUB 직접 노출 없음. 3 서비스 공통 사용 중 |
| `store_library_items` | ★ | 입력 임시 저장용 보조 | sourceType 'uploaded' 고정, 메타 약함 |
| `cms_contents` | ✕ | **부적합** | HUB 직접 노출 위험 (visibilityScope=service/global 가능) |
| `media_assets` | ✕ | **부적합** | `isLibraryPublic=true` 기본값 — 공용 라이브러리 |
| `o4o_asset_snapshots` | ✕ | **부적합** | Community 도메인, 운영자 수신 대상 아님 |
| `store_execution_assets` | ✕ | **부적합** | Workspace C 산출물 (POP/QR/사이니지 결과물) |
| `neture_supplier_contents` | — | **레거시 / 제거됨** | 마이그레이션 `20260303000000` 으로 이미 삭제 ✓ |

### 7.2 권장 모델 (단기 — 기존 확장)

**`kpa_store_contents` 에 4개 컬럼 추가** (별도 WO 의 마이그레이션 대상):

| 컬럼 | 타입 | 용도 |
|------|------|------|
| `authorRole` | enum (`'operator' \| 'store'`) | Operator 수신 vs Store 직접 생성 구분 |
| `visibilityScope` | enum (`'organization'`) | 항상 매장만 — global/service 금지 (Drift 방지) |
| `sourceMetadata` | jsonb | 공급자명 / 수신 채널 / 수신 일시 / 외부 링크 / 원본 파일명 등 |
| `workspaceStatus` | enum (`'draft' \| 'pending_ai' \| 'ai_processed' \| 'ready_curation' \| 'archived'`) | Workspace A → B → C 전환 추적 |

**현재 사용처와의 충돌:**

- KPA / GlycoPharm / K-Cosmetics 3 서비스 공통 사용 — 충돌 위험 낮음
- 기존 `share_status` 컬럼은 HUB 공유 (Store → HUB) 용도 — Workspace A 의 `workspaceStatus` 와 직교
- 단, KPA 하드코딩 guard (`isStoreOwner(... 'kpa')`) 가 일부 존재 — [`WO-O4O-STORE-CONTENT-CONTROLLER-SERVICE-AGNOSTIC-V1`] 로 별도 정렬 필요

### 7.3 중장기 옵션 (별도 IR 후속)

| 옵션 | 장점 | 비용 |
|------|------|------|
| (A) `kpa_store_contents` 계속 확장 운영 | 코드 안정성 / 마이그레이션 비용 낮음 | 테이블 명 `kpa_*` 잔재, Canonical 명확성 부족 |
| (B) `operator_source_materials` 신규 테이블 신설 | Workspace A 개념 명확, 책임 분리 | 마이그레이션 비용 높음, 기존 데이터 분리 필요 |
| (C) `kpa_store_contents` → `store_production_materials` 표준 명 rename | Canonical 명 정렬 | 별도 [STORE-PRODUCTION-MATERIAL-CANONICAL-V1](../architecture/O4O-STORE-PRODUCTION-MATERIAL-CANONICAL-V1.md) 와 정합. 3 서비스 영향 |

**본 IR 권장: 단기 (A) — 기존 확장.** 중장기 (B) 또는 (C) 는 별도 후속 IR.

---

## 8. Workspace B/C 연계 방식

### 8.1 Canonical 흐름

```text
[Workspace A]                       [Workspace B]                  [Workspace C]              [HUB / Store]
운영자 수신 자료 등록                AI 작업                         큐레이션                    매장 실행
  ├─ 파일 / URL / 텍스트              ├─ 요약                         ├─ HUB 노출                ├─ POP 게시
  ├─ 메타 입력                        ├─ 초안 생성                    ├─ 추천 / 시즌             ├─ QR 운영
  ├─ 공급자 연결                      ├─ 이미지 매칭                  ├─ 매장 그룹 매핑          ├─ 블로그 활용
  └─ workspaceStatus='draft'         └─ workspaceStatus='ai_processed' └─ workspaceStatus='ready_curation' └─ 사이니지 송출
       │                                   │                              │                          │
       ↓ A-5 진입                          ↓ B 검수 게이트                 ↓ HUB 배포                 ↓ 매장 선택
       Workspace B 진입               Operator 검수 게이트            HUB Producer = 'operator'       Store
```

### 8.2 전환 규칙

| 전환 | 조건 | 책임 주체 |
|------|------|----------|
| A → B (AI 작업 진입) | 자료 등록 완료 + Operator A-5 액션 | Operator |
| B → C (큐레이션 진입) | AI 산출물 + Operator 검수 통과 | Operator |
| C → HUB | Operator 큐레이션 + HUB 노출 결정 | Operator |
| HUB → Store | 매장 선택 (Asset Snapshot Copy) | Store |

### 8.3 금지 흐름 (Drift)

| 금지 | 사유 |
|------|------|
| A → HUB 직접 노출 | Workspace A 자료는 원천 / 가공 전. HUB 노출 = Canonical 위반 |
| A 자료를 실행 자산처럼 취급 | 원천 자료 ≠ 실행 자산. POP / QR / 블로그 형식이 아닌 raw 자료 |
| 공급자 producer 로 저장 | Canonical: `authorRole='operator'` 강제 |
| 매장이 Workspace A 진입 | A 는 Operator 전용 — 매장은 Workspace D (지원 수신) 또는 HUB 에서 선택 |

### 8.4 예외 후보 (별도 검토 필요)

현재 시점에서 **A → HUB 직접 노출 예외는 없음**. 모든 자료는 B 또는 C 를 경유한다.

단, 향후 다음 케이스는 별도 IR 로 검토:

- 외부 영상 URL (변형 없이 사이니지 그대로 송출 — B/C 경유?)
- 브랜드 공식 자료 (변형 없이 매장 안내문으로 — B 경유 불필요?)

→ 본 IR 에서는 결정하지 않음. 후속 `IR-O4O-OPERATOR-WORKSPACE-A-EXCEPTION-CASES-V1` 후보.

---

## 9. Drift 위험

### 9.1 식별된 Drift 위험

| # | Drift | 위험 수준 | 방어 |
|---|-------|:--------:|------|
| WA1 | 공급자가 O4O 내부에 직접 자료를 등록 | HIGH | A-2 폼이 Operator 전용 UI, Supplier 권한으로 접근 불가 (`SupplierRoute` 사용 금지) |
| WA2 | 운영자 수신 자료 등록 화면이 Supplier CMS 처럼 보이는 구조 | MED | UI 명칭·UX 가 Operator 워크플로 임을 명확히 표시 (메뉴: "운영자 수신 자료") |
| WA3 | 원천 자료와 실행 자산이 같은 화면에서 섞임 | MED | A-1 목록은 `workspaceStatus IN ('draft','pending_ai','ai_processed')` 만 표시. 완료된 실행 자산 (Workspace C 산출) 은 별도 화면 |
| WA4 | Workspace A 자료가 B/C 없이 HUB 에 직접 노출 | HIGH | `visibilityScope='organization'` 강제, `visibilityScope NOT IN ('global','service')` |
| WA5 | 매장 경영자가 원천 자료를 직접 등록 | HIGH | A-2 폼은 `requireOperatorScope('{service}:operator')` 가드, Store role 접근 불가 |
| WA6 | A 화면이 단순 파일 저장소처럼 사용 (메타 / 분류 / 배정 없음) | LOW | A-2 메타 필수 필드 (제목·유형) 강제, A-5/A-6 배정 가능 |
| WA7 | A 등록 시 `authorRole='supplier'` 로 잘못 저장 | MED | 서버 강제 (`authorRole='operator'` 자동), body 값 무시 |

### 9.2 가드 매트릭스

| 가드 | 적용 위치 | 영향 |
|------|----------|------|
| `authorRole='operator'` 서버 강제 | API 측 (POST 시 body 무시) | WA1, WA7 차단 |
| `visibilityScope='organization'` 서버 강제 | API 측 | WA4 차단 |
| `requireOperatorScope` Guard | Backend route | WA5 차단 |
| Operator-only UI | Frontend (Supplier / Store 진입점 없음) | WA1, WA5 차단 |
| `workspaceStatus` 분리 | DB 컬럼 | WA3 차단 (목록 필터) |
| 메타 필수 검증 | A-2 폼 + API | WA6 완화 |

---

## 10. 후속 WO 권장 순서

### Phase 1 — 데이터 모델 확장 (선행 필수)

**`WO-O4O-OPERATOR-SOURCE-MATERIALS-DATA-MODEL-EXTENSION-V1`**

범위:
- `kpa_store_contents` 에 4개 컬럼 추가 마이그레이션 (`authorRole`, `visibilityScope`, `sourceMetadata`, `workspaceStatus`)
- Entity 정의 갱신
- `visibilityScope` 서버 강제 로직 추가

크기: SMALL — 단일 마이그레이션 + Entity 갱신

### Phase 2 — Backend API 신설

**`WO-O4O-OPERATOR-SOURCE-MATERIALS-API-V1`**

범위:
- `/api/v1/{service}/operator/source-materials/*` 엔드포인트 신설 (CRUD)
- `authorRole='operator'` / `visibilityScope='organization'` 서버 강제
- 4 서비스 (Neture / KPA / Glycopharm / K-Cosmetics) 적용

크기: MEDIUM

### Phase 3 — Frontend 화면 구현

**`WO-O4O-OPERATOR-WORKSPACE-A-UI-V1`**

범위:
- A-1 ~ A-7 화면 구현
- 기존 자산 재사용 (ResourceWritePage / AiContentModal / DataTable / MediaPickerModal / RichTextEditor)
- 신규 컴포넌트 5-7개 작성
- Sidebar Workspace A Group 진입 추가

크기: LARGE (Phase 1, 2 완료 후)

### Phase 4 — Backend Supplier API Deprecation (별도)

**`WO-O4O-SUPPLIER-CONTENT-PRODUCER-BACKEND-DEPRECATION-V1`** ([IR-O4O-SUPPLIER-CONTENT-PRODUCER-LEGACY-AUDIT-V1 §9.2](IR-O4O-SUPPLIER-CONTENT-PRODUCER-LEGACY-AUDIT-V1.md))

범위:
- `POST /api/v1/kpa/supplier/content-submissions` 등 deprecation 표시
- Operator Source Ingestion 으로 데이터 마이그레이션 (필요 시)
- 일정 후 실제 제거

크기: MEDIUM (Phase 3 완료 후)

### 권장 진행 순서

```text
Phase 1 (Data Model)
   ↓
Phase 2 (Backend API)
   ↓
Phase 3 (Frontend UI)
   ↓
Phase 4 (Supplier API Deprecation)
   ↓
Phase 5 (장기 — 신규 테이블 / rename / enum cleanup, IR 후속)
```

각 Phase 는 이전 Phase 의 안정화 확인 후 진입.

---

## 11. 핵심 발견 요약

| 항목 | 결론 |
|------|------|
| 권장 명칭 | **"운영자 수신 자료"** (UI 메뉴) / `OperatorSourceMaterial*` (코드) |
| 화면 구조 | 7개 화면 (A-1 ~ A-7) — A-1/A-2/A-3 가 MUST |
| 입력 방식 | 5채널 (파일·URL·텍스트·클라우드 링크·메모) + 메타 |
| 자료 유형 | 10종 — 각 유형이 가공 가능한 실행 자산 매핑 명시 |
| 재사용 가능 | 60-70% (ResourceWritePage / AiContentModal / DataTable / MediaPickerModal 등) |
| 신규 필요 | 페이지 2-3개 + 모달 4-5개 + 도메인 특화 폼 |
| 데이터 모델 | **단기: `kpa_store_contents` 확장** (4 컬럼 추가) / 중장기: rename or 신규 테이블 |
| Workspace B/C 연계 | `workspaceStatus` 컬럼으로 상태 추적, A → B → C → HUB → Store 단방향 |
| Drift 위험 | 7건 식별, 가드 6종으로 모두 방어 가능 |
| 후속 WO | Phase 1 (Data Model) → Phase 2 (API) → Phase 3 (UI) → Phase 4 (Supplier Deprecation) |

---

## 12. 검증 항목

| 검증 | 결과 |
|------|------|
| 명칭 정합성 — Drift 명칭 식별 + 권장 명칭 3개 압축 | ✅ §1 |
| 화면 구조 후보 A-1~A-7 정의 | ✅ §2 |
| 입력 방식 / 메타데이터 정의 | ✅ §3 |
| 자료 유형 / 실행 자산 매핑 | ✅ §4 |
| 재사용 카탈로그 (강한 후보 + 패턴 차용 + 부적합) | ✅ §5 |
| 신규 필요 컴포넌트 | ✅ §6 |
| 데이터 모델 후보 (단기 / 중장기 옵션) | ✅ §7 |
| Workspace B/C 연계 (Canonical 흐름 + 금지 흐름 + 예외) | ✅ §8 |
| Drift 위험 7건 + 가드 매트릭스 | ✅ §9 |
| 후속 WO Phase 1~4 권장 순서 | ✅ §10 |

---

**작성:** Claude Code (조사)
**상태:** Read-Only Design IR / Phase 1 (Data Model Extension WO) 입력 자산 준비 완료
