# CHECK-O4O-MY-STORE-CONTENT-PRODUCTION-CROSSSERVICE-AUDIT-V1

- **WO**: WO-O4O-MY-STORE-CONTENT-PRODUCTION-CROSSSERVICE-AUDIT-V1 — 내 매장 POP / QR / 태블릿 / 제작자료 / 콘텐츠 제작 진입 구조 조사
- **성격**: **조사 전용 (read-only)** — 코드 변경 0건
- **브랜치**: `work/commonization-my-store-shell-parts` (main 병합 없음)
- **작성일**: 2026-08-13

---

## 1. 화면 인벤토리 (서비스 × 영역)

`L` = 파일 라인 수. `Core` = 해당 화면이 이미 소비 중인 `@o4o/*` 공통 패키지.

| 영역 | KPA | K-Cosmetics | GlycoPharm | PharmacyHub |
|---|---|---|---|---|
| **POP 제작** | `pharmacy/StorePopPage` 1085L<br>Core: store-ui-core(GuideBackLink) | `store/StorePopPage` 650L<br>Core: store-ui-core(GuideBackLink, parseProductionRouterState) | `store-management/StorePopPage` 742L<br>Core: 동일 | `store-owner/PopPage` 458L<br>Core: content-editor |
| **QR** | `pharmacy/StoreQRPage` 2067L<br>Core: store-ui-core, shared-space-ui, ui | `store/StoreQrPage` 550L<br>Core: store-ui-core, types | **화면 없음** | `store-owner/QrPage` 617L<br>Core: **없음** |
| **태블릿** | `StoreTabletDisplaysPage` 1877L<br>Core: tablet-kiosk-core, tablet-screen-set-editor, store-asset-policy-core | 536L<br>Core: tablet-kiosk-core | 600L<br>Core: tablet-kiosk-core, store-asset-policy-core | `TabletsPage` 400L<br>Core: tablet-screen-set-editor |
| **제작자료 목록** | **화면 없음** (자료함>콘텐츠로 통합) | `StoreProductionMaterialsPage` 73L<br>Core: **StoreProductionMaterialsView** | 73L<br>Core: 동일 | `LibraryPage` 100L<br>Core: 동일 |
| **제작자료 편집기** | `ProductionMaterialEditorPage` **490L**<br>Core: content-editor **only** | 56L<br>Core: **ProductionMaterialEditorShell** | 56L<br>Core: 동일 | 없음 |
| **자료함 / 콘텐츠** | `StoreLibraryContentsPage` 251L<br>Core: StartProductionModal(래퍼 경유) | 217L<br>Core: **StartProductionModal** | 217L<br>Core: 동일 | `ContentPage` 291L<br>Core: content-editor |
| **자료함 / 자료** | `StoreLibraryResourcesPage` 929L<br>Core: ui, error-handling | 257L<br>Core: ui | 261L<br>Core: ui | `LibraryResourcesPage` 383L<br>Core: content-editor |
| **사이니지** | `StoreSignagePage` 2289L | 394L | 986L (Core 0) | `SignagePage` 420L (Core 0) |

---

## 2. 이미 공통 Core 를 쓰는 곳 (재추출 대상 아님)

`packages/store-ui-core` 에서 export 되어 실제 소비 중인 제작 계열 Core:

| Core | L | 소비처 |
|---|---:|---|
| `StartProductionModal` (제작 시작 진입점: POP/QR/블로그/상품설명 + 템플릿 registry + AI 카드) | 576 | KPA(42L thin wrapper `pharmacy/StartProductionModal.tsx`) · KCos · GP |
| `StoreProductionMaterialsView` (제작자료 목록) | 232 | KCos · GP · PH |
| `ProductionMaterialEditorShell` (제작자료 편집기) | 429 | KCos · GP |
| `CANONICAL_STORE_POP_ROUTE` / `buildLocalProductPopState` / `parseProductionRouterState` | — | KPA · KCos · GP (제품→POP 진입 계약) |
| `GuideBackLink` | — | 3서비스 POP |
| `@o4o/tablet-kiosk-core` · `@o4o/tablet-screen-set-editor` | — | 태블릿 4서비스(조합은 서비스마다 다름) |

**결론**: *제작 "진입" 구조(어디서 무엇을 골라 어떤 제작으로 넘어가는가)는 이미 공통화가 끝나 있다.*
남은 중복은 **진입 후의 화면 본체**(POP 제작기 · QR 관리 · 자료함 목록 · 태블릿)다.

---

## 3. 아직 서비스별 사본인 곳

### 3-1. K-Cosmetics ↔ GlycoPharm 근사 클론 (같은 계보에서 복사됨)

| 화면 | L (KCos/GP) | diff 라인 | 실제 차이 |
|---|---|---:|---|
| `StorePopPage` | 650 / 742 | 186 | **API prefix**(`/cosmetics` ↔ `/glycopharm`) · **accent color**(`#db2777` ↔ `#ea580c`) · **매장↔약국 문구** · import 경로 스타일 · 포맷팅. **로직 차이 0** |
| `StoreTabletDisplaysPage` | 536 / 600 | 72 | prefix · 문구 · GP 만 `store-asset-policy-core` 추가 |
| `StoreLibraryResourcesPage` | 257 / 261 | 14 | prefix · import 경로 · GP 만 링크 아이콘 분기 1개 |
| `StoreLibraryContentsPage` | 217 / 217 | 18 | prefix · 템플릿 id(`kcos-pop-*` ↔ `glyco-pop-*`) |
| `ProductionMaterialEditorPage` | 56 / 56 | 14 | 이미 Shell 위임 — 남은 차이는 어댑터뿐 (**추가 작업 불필요**) |
| `StoreProductionMaterialsPage` | 73 / 73 | 4 | 동일 (**추가 작업 불필요**) |

### 3-2. 서비스 고유(업무 모델이 실제로 다름 — 억지 통합 대상 아님)

- **PharmacyHub POP** — `store_pops` 원장의 draft→published→archived CRUD(RichTextEditor). KPA/KCos/GP POP(자료 선택 → AI 문구 → 레이아웃/템플릿 → **PDF 생성**)과 **원장도 산출물도 다르다.**
- **PharmacyHub QR / Signage** — `@o4o/*` 미소비 독자 구현. QR 은 "생성 후 대상·slug 불변" 계약을 프론트에서 강제한다(KPA/KCos 와 편집 정책이 다름).
- **KPA POP / QR / 태블릿 / 자료함-자료** — 1000~2000L 급. KPA 만 갖는 축(다국어 콘텐츠, screen-set editor, asset policy, 자료 상세 Drawer, 서버 pagination)이 붙어 있어 소형 사본과 같은 화면으로 볼 수 없다.
- **GlycoPharm QR 화면 없음** — 4서비스 동일화 전제가 성립하지 않는다.

### 3-3. Core 를 쓰지 않는 잔여 1건 (별도 후보)

`KPA ProductionMaterialEditorPage` 490L 만 `ProductionMaterialEditorShell` 을 쓰지 않는다.
이유는 **KPA 에만 `:id/edit` 편집 모드**(기존 asset 로드 + loading/loadError + update)가 있고 Shell 은 신규 작성 전용이기 때문이다.
→ Shell 확장(편집 모드)이 선행돼야 하므로 "사본이라 못 합쳤다"가 아니라 **기능 격차**다.

---

## 4. 다음 공통화 1개 — 권고

### ✅ **POP 제작 화면(K-Cosmetics + GlycoPharm) → `@o4o/store-ui-core` 공통 View**

가칭 `StorePopComposerView` — 자료 선택(공급자 자료/스냅샷/매장 자체 상품) · AI 문구 · 레이아웃/템플릿 선택 · PDF 생성 · POP 콘텐츠로 저장 흐름 전체.

**선정 근거**

1. **본 영역 최대 중복** — 650L + 742L ≈ 1,390L 이 사실상 같은 코드. 수렴 시 약 600~700L 제거.
2. **차이가 전부 config 축** — API prefix / accent color / 매장·약국 문구 / 템플릿 id. **분기 로직·상태머신·API 계약 차이 0** → 이미 검증된 `StoreLocalProductsManager` · `StoreHomeStatusCard` 패턴(공통 구조 + 서비스 config/slot)이 그대로 적용된다.
3. **진입 계약이 이미 공통** — 두 화면 모두 `parseProductionRouterState` · `GuideBackLink` · `CANONICAL_STORE_POP_ROUTE` 를 공유하므로 새 계약을 만들 필요가 없다.
4. **범위가 닫혀 있다** — KPA/PH POP 은 §3-2 근거로 **명시적 제외**. 2서비스 수렴은 이 트랙의 기존 판정 기준(2서비스 이상 + 구조·의미 동일)에 부합한다.

**위험 / 사전 조건**

- accent color 가 인라인 `style` 하드코딩(`#db2777` / `#ea580c`)이라 **테마 토큰 prop 화**가 필수. 누락 시 GP 화면 색이 바뀐다.
- PDF 생성은 `fetch(${API_BASE_URL}/api/v1/{svc}/pharmacy/pop/generate)` 직접 호출 — **엔드포인트를 prop 으로 주입**하고 Core 가 URL 을 조립하지 않게 한다.
- 두 서비스 모두 배포 화면이므로 **PDF 산출물·선택 최대 8개·저장 후 이동 경로**를 등가성 확인 항목으로 고정한다.

### 차순위 (이번 아님)

| 순위 | 대상 | 비고 |
|---|---|---|
| 2 | `StoreLibraryResourcesPage` KCos+GP (diff 14) | 안전하지만 이득 작음(≈250L) |
| 3 | `StoreTabletDisplaysPage` KCos+GP (diff 72) | GP 의 `store-asset-policy-core` 축 정리 선행 필요 |
| 4 | KPA `ProductionMaterialEditorPage` → Shell | **Shell 에 편집 모드 추가**가 선행 WO. 4서비스 공유 Core 변경이라 회귀 범위 큼 |
| — | QR / 사이니지 | 서비스별 정책이 실제로 달라 현 시점 공통화 대상 아님 |

---

## 5. 변경 없음

코드·설정·DB·migration 변경 0건. 본 문서 추가만 있다.

## 6. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 1건(§4 권고 = 다음 WO 후보).
