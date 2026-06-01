# IR-O4O-SIGNAGE-TEMPLATE-USAGE-MINI-AUDIT-V1

**작성일**: 2026-05-17
**상태**: Investigation (조사 전용 — 코드/DB 수정 없음)
**대상**: `@o4o/shared-space-ui` 의 Signage 관련 template 실제 사용처 mini-audit
**범위**: KPA-Society 중심. GlycoPharm / K-Cosmetics 는 사용처 grep 만 (cleanup 결정 prerequisite 차원).

**선행 IR**:
- `IR-O4O-STORE-WRAPPER-CANONICAL-INTERNAL-AUDIT-V1` (§10-3: SignageManagerTemplate 사용처 식별 필요)
- `IR-O4O-STORE-WRAPPER-CANONICAL-ECOSYSTEM-AUDIT-V1` (§12-6/7: SignageManagerTemplate / SignageHubTemplate 직접 검증 미수행)

---

## 0. 결론 요약

> **3 개 signage template 중 1 개는 KPA-주요 사용 (정비 후보), 1 개는 KPA 미사용 / 타 서비스 의존 (OBSERVE), 1 개는 외부 사용처 0 건 (CLEANUP candidate).**

### 핵심 발견

| Template | 정의 위치 | KPA 사용 | 타 서비스 사용 | raw `<table>` | 판단 |
|---|---|:---:|:---:|:---:|---|
| **`SignageManagerTemplate`** | `packages/shared-space-ui/src/SignageManagerTemplate.tsx` | ✅ 1 건 (`/signage` Community) | K-Cosmetics + GlycoPharm 각 1 건 | **2 (L307 video, L444 playlist)** | **KEEP + 정비 후보 (multi-service 영향)** |
| **`SignageHubTemplate`** | `packages/shared-space-ui/src/SignageHubTemplate.tsx` | **0 건** | GlycoPharm 1 건 | (직접 검증 안 함 — KPA 정비 scope 외) | **OBSERVE** (multi-service 의존, KPA 정비 시점 cleanup 부적합) |
| **`SignagePreviewSection`** | `packages/shared-space-ui/src/SignagePreviewSection.tsx` | **0 건** | **0 건** | N/A | **CLEANUP candidate** (외부 사용처 0건, dead export) |

### KPA signage 페이지 canonical 상태

| 영역 | 페이지 수 | canonical 상태 |
|---|:---:|---|
| **KPA Operator signage** (`/operator/signage/*`) | 4 list + 2 detail | ✅ **TRUE CANONICAL** — 모두 `@o4o/operator-ux-core DataTable` (`WO-KPA-SIGNAGE-UI-RESTRUCTURE-V1`) |
| **KPA Store signage** (`/store/marketing/signage/*`) | 3 (Player/Playback/Manager) | ✅ DataTable / SimpleTable / fullscreen — template 미사용 (선행 IR 검증) |
| **KPA Community signage** (`/signage/*`) | 1 list (ContentHubPage) + 5 detail/editor/player | ⚠️ **ContentHubPage 만 `SignageManagerTemplate` 사용** → raw `<table>` × 2 실 노출 |

### 즉시 결정 사항

1. **`SignageManagerTemplate` 정비는 multi-service 영향**: KPA + K-Cosmetics + GlycoPharm 3 개 서비스 동시 영향. 본 KPA 마무리 단계 scope 외 — 별도 WO + 3 개 서비스 회귀 검증 필요.
2. **`SignageHubTemplate`**: KPA 미사용이나 GlycoPharm 의존성으로 cleanup 불가. KPA 정비 시점에 손 대지 않음.
3. **`SignagePreviewSection`**: 외부 사용처 0 건 — cleanup 가능하나 정비 효과 미미 (export 한 줄 + 파일 1 개). 별도 dead-export 정리 WO 권장.

---

## 1. Template 사용처 매트릭스 (전수 grep 결과)

### 1-1. `SignageManagerTemplate`

| 분류 | 위치 |
|---|---|
| 정의 | [packages/shared-space-ui/src/SignageManagerTemplate.tsx](packages/shared-space-ui/src/SignageManagerTemplate.tsx) |
| Export | [packages/shared-space-ui/src/index.ts#L57-58](packages/shared-space-ui/src/index.ts#L57) (named + types) |
| **KPA 사용** | [services/web-kpa-society/src/pages/signage/ContentHubPage.tsx#L17,L369](services/web-kpa-society/src/pages/signage/ContentHubPage.tsx#L17) — `import { SignageManagerTemplate }` + `<SignageManagerTemplate config={{...}} />` |
| K-Cosmetics 사용 | `services/web-k-cosmetics/src/pages/signage/ContentHubPage.tsx` |
| GlycoPharm 사용 | `services/web-glycopharm/src/pages/store-management/signage/ContentHubPage.tsx` |
| **KPA 라우트** | `/signage` (Community signage, App.tsx L778) |

**KPA ContentHubPage 헤더 주석** ([L1-13](services/web-kpa-society/src/pages/signage/ContentHubPage.tsx#L1)):
- `WO-O4O-SIGNAGE-HUB-TEMPLATE-FOUNDATION-V1` — SignageManagerTemplate 기반 전환 + 동영상/플레이리스트 탭 구조 + API 연결 + 모달
- `WO-KPA-SIGNAGE-LIST-UX-REFACTOR-V1` — 체크박스 선택 + ActionBar 패턴, 행별 액션 최소화 (재생만), 수정/삭제/전체화면 ActionBar

→ KPA Community signage 의 **단일 진입 list 페이지**. 선택 + ActionBar 가 의도된 정책.

### 1-2. `SignageHubTemplate`

| 분류 | 위치 |
|---|---|
| 정의 | [packages/shared-space-ui/src/SignageHubTemplate.tsx](packages/shared-space-ui/src/SignageHubTemplate.tsx) |
| Export | [packages/shared-space-ui/src/index.ts#L54-55](packages/shared-space-ui/src/index.ts#L54) (named + types) |
| **KPA 사용** | **0 건** |
| GlycoPharm 사용 | `services/web-glycopharm/src/pages/store-management/signage/ContentLibraryPage.tsx` (1 건) |

→ KPA 측에서는 명시적 dead. GlycoPharm 의존성으로 인해 cleanup 불가.

### 1-3. `SignagePreviewSection`

| 분류 | 위치 |
|---|---|
| 정의 | [packages/shared-space-ui/src/SignagePreviewSection.tsx](packages/shared-space-ui/src/SignagePreviewSection.tsx) |
| Export | [packages/shared-space-ui/src/index.ts#L13](packages/shared-space-ui/src/index.ts#L13) (named) + L99 (Props type) |
| Types | `types.ts` (`SignagePreviewSectionProps` 등) |
| **KPA 사용** | **0 건** |
| 타 서비스 사용 | **0 건** (전체 monorepo grep) |

→ **dead export**. 외부 사용처 0건, `index.ts` + `types.ts` + 자기 자신만 참조. cleanup 가능.

---

## 2. KPA signage 페이지 별 canonical 상태

### 2-1. KPA Operator signage (`pages/operator/signage/`)

| 파일 | route | canonical | 비고 |
|---|---|:---:|---|
| `HqMediaPage.tsx` | `/operator/signage/hq/media` | ✅ TRUE CANONICAL | `@o4o/operator-ux-core DataTable` ([L17](services/web-kpa-society/src/pages/operator/signage/HqMediaPage.tsx#L17), L402). `WO-KPA-SIGNAGE-UI-RESTRUCTURE-V1` |
| `HqPlaylistsPage.tsx` | `/operator/signage/hq/playlists` | ✅ TRUE CANONICAL | 동일 패턴 (L15, L450) |
| `TemplatesPage.tsx` | `/operator/signage/templates` | ✅ TRUE CANONICAL | 동일 패턴 (L12, L333) |
| `ForcedContentPage.tsx` | `/operator/signage/forced` | ✅ TRUE CANONICAL | 동일 패턴 (L15, L497) |
| `HqMediaDetailPage.tsx` | detail | — (detail) | 분류 외 |
| `HqPlaylistDetailPage.tsx` | detail | — (detail) | 분류 외 |

→ **Operator signage 4 개 list 페이지 모두 canonical 완료**. `SignageManagerTemplate` 사용 0건, raw `<table>` 0건.

### 2-2. KPA Store signage (`pages/pharmacy/Store*Signage*`, `pharmacy/Signage*`)

| 파일 | route | canonical | 비고 |
|---|---|:---:|---|
| `StoreSignagePage.tsx` | `/store/marketing/signage/{playlist,videos,schedules}` | ✅ TRUE CANONICAL | 3-tab `@o4o/ui DataTable` × 4 (선행 IR 확인) — template 미사용 |
| `SignagePlayerSelectPage.tsx` | `/store/marketing/signage/player` | ✅ SIMPLE DATATABLE | 선행 IR 확인 |
| `SignagePlaybackPage.tsx` | `/store/marketing/signage/play/:playlistId` | — (fullscreen player) | 분류 외 |
| `HubSignageLibraryPage.tsx` | `/store-hub/signage` | ✅ TRUE CANONICAL | `@o4o/operator-ux-core DataTable` (선행 IR 확인) — template 미사용 |

→ **Store signage 영역 template 사용 0건**, 모두 직접 DataTable.

### 2-3. KPA Community signage (`pages/signage/`)

| 파일 | route | canonical | 비고 |
|---|---|:---:|---|
| **`ContentHubPage.tsx`** | `/signage` | ⚠️ `SignageManagerTemplate` 사용 → **raw `<table>` × 2 실 노출** (L307 video, L444 playlist) | KPA-Community 의 단일 list 진입 |
| `PlaylistEditorPage.tsx` | `/signage/playlist/{new,:id/edit}` | — (editor) | 분류 외 |
| `PlaylistDetailPage.tsx` | `/signage/playlist/:id` | — (detail) | 분류 외 |
| `MediaDetailPage.tsx` | `/signage/media/:id` | — (detail) | 분류 외 |
| `PublicSignagePage.tsx` | `/public/signage` | — (public viewer) | template/DataTable/raw `<table>` 모두 0건 — 별도 viewer UX |
| `SignageFullscreenPlayerPage.tsx` | `/signage/play/{media,playlist}/:id` | — (fullscreen player) | 분류 외 |

→ Community signage 영역에서 list 페이지는 **ContentHubPage 단 1개**. 그 페이지가 `SignageManagerTemplate` 의존 — template 의 raw `<table>` 가 곧 KPA 사용자 노출과 동일.

---

## 3. raw `<table>` / custom list 잔존 종합

| 위치 | 상태 |
|---|---|
| `SignageManagerTemplate.tsx` L307 (video) | ⚠️ raw `<table>` — KPA / K-Cosmetics / GlycoPharm 3 서비스 노출 |
| `SignageManagerTemplate.tsx` L444 (playlist) | ⚠️ 동일 |
| `SignageHubTemplate.tsx` | 본 IR 미검증 (KPA 미사용 — scope 외) |
| `SignagePreviewSection.tsx` | N/A (table 컴포넌트 아님 — preview UI) |
| KPA Operator signage 4 페이지 | ✅ 0 건 (DataTable) |
| KPA Store signage 3 페이지 + Hub | ✅ 0 건 (DataTable) |
| KPA Community signage list (ContentHubPage) | template 통해 ⚠️ raw 노출 |

---

## 4. Dead / Template-only 후보

| 항목 | 분류 | 사유 |
|---|---|---|
| **`SignagePreviewSection`** | **dead export** | KPA 0건 + 타 서비스 0건. 단 정비 효과 미미 (export 1줄 + 파일 1개) |
| `SignageHubTemplate` | **KPA 미사용 / 외부 의존** | KPA 0건, GlycoPharm 1건 — KPA 정비 scope 에서 손 대지 않음 |

---

## 5. KPA 마무리 단계 — 즉시 처리 vs 보류

### 즉시 처리 (KPA 정비 scope 내)
- **0 건**

### 보류 (KPA 정비 scope 외, 별도 multi-service WO 권장)

| 후보 | 사유 |
|---|---|
| **`SignageManagerTemplate` raw `<table>` × 2 → BaseTable** | KPA + K-Cosmetics + GlycoPharm 3 서비스 동시 영향. `assetColumns.tsx` 패턴 (`67eddf9a0` commit) 재사용 가능하나 multi-service 회귀 검증 필요 |
| **`SignagePreviewSection` dead export cleanup** | 외부 사용처 0건. 단 GlycoPharm/K-Cosmetics 의 향후 사용 계획 확인 후 결정 |

### 명시적 손대지 않음 (이번 KPA 마무리에서)

| 항목 | 사유 |
|---|---|
| `SignageHubTemplate` | GlycoPharm 의존성 — KPA 정비 시점 cleanup 부적합 |
| KPA Operator signage 4 페이지 | 이미 TRUE CANONICAL (`WO-KPA-SIGNAGE-UI-RESTRUCTURE-V1`) |
| KPA Store signage 3 페이지 + Hub | 이미 TRUE CANONICAL (선행 IR 검증) |
| KPA Community detail/editor/player 페이지 5건 | list 아님 (분류 외) |

---

## 6. 위험 신호 / 추가 결정 사항

| # | 항목 | 비고 |
|---|---|---|
| 1 | **`SignageManagerTemplate` 의 multi-service 영향** | 3 서비스 동시 사용 — 정비 시 회귀 검증 부담. 그러나 같은 raw `<table>` 가 3 서비스에 동시 노출 중 — 정비 가치 큼 |
| 2 | **`SignagePreviewSection` 의 향후 사용 계획** | 현재 dead 이나 export 된 상태 — 의도된 미래 사용 후보일 수 있음. cleanup 결정 전 git blame / WO history 확인 권장 |
| 3 | **`SignageHubTemplate` GlycoPharm 단독 사용** | KPA / K-Cosmetics 가 비슷한 hub 패턴 필요 시 재사용 가치 — 즉시 cleanup 부적합 |
| 4 | **KPA Community signage 의 list 페이지 1 개 의존** | 정비 시 ContentHubPage 회귀 영향 직접 — 가장 careful 한 detail-test 필요 |
| 5 | **`assetColumns.tsx` 패턴 (`67eddf9a0`) 재사용 가능성** | SignageManagerTemplate 의 video / playlist 각각 `getSignageVideoColumns()` / `getSignagePlaylistColumns()` 분리 적용 가능 — 정비 비용 낮춤 |

---

## 7. 후속 WO 필요 여부

| WO 후보 | 우선순위 | 본 IR 단계 작성 |
|---|---|---|
| **`WO-O4O-SIGNAGE-MANAGER-TEMPLATE-CANONICAL-V1`** (raw `<table>` × 2 → BaseTable, 3 서비스 영향) | medium-high | 작성 금지 (본 IR scope) — 별도 multi-service WO 결정 필요 |
| `WO-O4O-SHARED-SPACE-UI-DEAD-EXPORT-CLEANUP-V1` (SignagePreviewSection 제거 결정 포함) | low | 작성 금지 |
| `WO-O4O-SIGNAGE-HUB-TEMPLATE-INTERNAL-AUDIT-V1` (KPA 미사용이나 GlycoPharm 사용 — multi-service audit) | low (OBSERVE 단계) | 작성 금지 |

→ **본 KPA 마무리 단계에서는 후속 WO 작성·실행 모두 금지**. mini-audit 결과만 기록.

---

## 8. 본 IR 범위 외 (후속)

- `SignageHubTemplate` 내부 직접 검증 (GlycoPharm 사용처 audit)
- `SignagePreviewSection` git blame / 원래 의도 확인 (cleanup 결정 prerequisite)
- GlycoPharm signage 페이지 multi-service audit
- K-Cosmetics signage ContentHubPage 의 SignageManagerTemplate 사용 패턴 검증

---

## 9. 참조

### 정의 (shared-space-ui)
- `packages/shared-space-ui/src/SignageManagerTemplate.tsx`
- `packages/shared-space-ui/src/SignageHubTemplate.tsx`
- `packages/shared-space-ui/src/SignagePreviewSection.tsx`
- `packages/shared-space-ui/src/index.ts` (L13 SignagePreviewSection, L54-55 SignageHubTemplate, L57-58 SignageManagerTemplate)

### KPA 사용처 (이번 IR scope)
- ⚠️ `services/web-kpa-society/src/pages/signage/ContentHubPage.tsx` — `SignageManagerTemplate` 1 건
- ✅ `services/web-kpa-society/src/pages/operator/signage/{HqMediaPage,HqPlaylistsPage,TemplatesPage,ForcedContentPage}.tsx` — DataTable
- ✅ `services/web-kpa-society/src/pages/pharmacy/{StoreSignagePage,SignagePlayerSelectPage,HubSignageLibraryPage}.tsx` — DataTable (선행 IR 검증)
- (분류 외) `services/web-kpa-society/src/pages/signage/{PlaylistEditorPage,PlaylistDetailPage,MediaDetailPage,PublicSignagePage,SignageFullscreenPlayerPage}.tsx`

### 타 서비스 사용처 (사용처 grep 차원만)
- `services/web-k-cosmetics/src/pages/signage/ContentHubPage.tsx` — `SignageManagerTemplate`
- `services/web-glycopharm/src/pages/store-management/signage/ContentHubPage.tsx` — `SignageManagerTemplate`
- `services/web-glycopharm/src/pages/store-management/signage/ContentLibraryPage.tsx` — `SignageHubTemplate`

### 연관 IR
- `IR-O4O-STORE-WRAPPER-CANONICAL-INTERNAL-AUDIT-V1` (raw `<table>` × 2 식별)
- `IR-O4O-STORE-WRAPPER-CANONICAL-ECOSYSTEM-AUDIT-V1` (§12-6/7 후속 식별 항목)
- `IR-O4O-STORE-HUB-LIST-UX-CANONICAL-AUDIT-V1` (KPA Store signage 페이지 분류)

### Canonical 기준
- `docs/architecture/O4O-OPERATOR-TABLE-CANONICAL-V1.md`

---

*조사 전용 — 코드/DB 수정 없음. 본 IR 단계에서 후속 WO 작성 금지. 특히 `SignageManagerTemplate` 정비는 KPA / K-Cosmetics / GlycoPharm 3 서비스 동시 영향이므로 별도 multi-service WO 로 처리. KPA 마무리 단계 scope 외.*
