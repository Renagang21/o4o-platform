# IR-O4O-STANDARD-CONTENT-EDITOR-PLATFORM-EVALUATION-V1

> **목적**: 새 편집기를 탐색·선정하는 것이 아니라, **이미 전 서비스에 배포·운영 중인 O4O 표준 편집기(TipTap 기반 `@o4o/content-editor`)의 현황을 진단하고, O4O 콘텐츠 플랫폼의 장기 표준으로 완성하기 위해 무엇을 보강해야 하는지(Gap)를 도출**한다.
>
> 이후 모든 WO는 이 IR에서 도출된 Gap을 근거로 진행한다.

- **작성일**: 2026-07-08
- **유형**: 현황 진단 IR (read-only, 코드 변경 없음)
- **결론 요약**: **편집기 교체 근거는 발견되지 않음.** 현 표준 유지 확정. 보강 대상은 ① 미디어 라이브러리 표준화(P0) ② 표(Table) 지원(P0) ③ 동영상(mp4) 파이프라인 정합(P1) ④ 저장→실행자산 워크플로우 단순화(P1) ⑤ HTML Import/일반 편집 UX(P2).

---

## 0. 조사 방법

- 표준 패키지 [`packages/content-editor`](../../packages/content-editor/) 전 소스 정독
- `RichTextEditor` 를 직접 렌더하는 45개 화면 전수 조사 (KPA / GlycoPharm / K-Cosmetics / Neture)
- 콘텐츠 제작 워크플로우(AI→HTML→편집기→미디어→저장→POP/QR/사이니지/태블릿) 코드 추적
- 관련 백엔드: `MediaLibraryService`, `store_execution_assets`, `ai-proxy.routes`

---

## 1. 현재 구현 현황 (A)

### 1.1 표준 편집기 = TipTap 2.x 기반 `@o4o/content-editor`

핵심 컴포넌트: [`RichTextEditor.tsx`](../../packages/content-editor/src/components/RichTextEditor.tsx)

**로드된 확장 구성** (`RichTextEditor.tsx:107-143`):

| 확장 | 역할 |
|------|------|
| `StarterKit` | 문단/제목(h1~h3)/목록/인용/코드블록/구분선/굵게·기울임 등 |
| `Underline` | 밑줄 |
| `Link` (openOnClick=false) | 링크 |
| **`DisplayImage`** (자체 확장) | 이미지 + 표시 폭(full/75/50/25/original) + 정렬 enum. 임의 CSS 불허 |
| **`Youtube`** | YouTube + Vimeo(iframe 우회) |
| `TextAlign` | 문단/제목 정렬 |
| `Highlight` / `TextStyle` / `Color` | 형광펜 / 글자색 |
| **`ProductDetailLayout`** (자체 확장) | 상품상세 860px 고정 레이아웃 컨테이너 (정식 parse/serialize) |

### 1.2 요구사항별 충족 현황

| IR 요구항목 | 현황 | 근거 |
|---|---|---|
| A. 일반 사용자 중심 (Word/블로그 수준) | **충족** — WYSIWYG 3탭 편집 | `RichTextEditor.tsx:343-436` |
| B. **HTML Import** | **충족** — "HTML 탭" textarea → `sanitizeRichHtml` → 편집기 commit | `RichTextEditor.tsx:438-459`, [`sanitize.ts:48`](../../packages/content-editor/src/sanitize.ts) |
| C. HTML Export | **충족** — `getHTML()` 직렬화 + 원문 보존 이중 경로 | `RichTextEditor.tsx:218-225` |
| D. **Round-trip** | **최강점** — `wysiwygDirtyRef` 이중 권위 모델. WYSIWYG 미편집 시 raw HTML 원문을 저장값으로 보존(inline style/박스/배경 유지) | `RichTextEditor.tsx:104-106, 199-272` |
| E. 이미지 | **충족** — URL / 파일업로드 / 미디어라이브러리 / 클립보드 붙여넣기 4경로 + 폭·정렬 버블메뉴 | `Toolbar.tsx:399-578`, `displayImage.ts` |
| F. **동영상** | **부분** — YouTube/Vimeo iframe만. HTML5 `<video>`/mp4 삽입 UI 없음 | `Toolbar.tsx:135-153, 611-683` |
| G. **표(Table)** | **미지원** — `@tiptap/extension-table` 미설치, 표 툴바 없음, StarterKit 표 파싱 없음 | [`package.json:30-39`](../../packages/content-editor/package.json) |
| H. 링크 | 충족 (내부/외부) | `Toolbar.tsx:337-397` |
| I. React 통합 | 충족 (`@tiptap/react`, 네이티브) | — |
| J. Toolbar 자유도 | 충족 — full/compact preset | [`types.ts:19`](../../packages/content-editor/src/types.ts) |
| K. Plugin 확장성 | 충족 — DisplayImage/ProductDetailLayout 자체 확장 선례 | `extensions/` |
| N. 라이선스 | **충족** — TipTap MIT (상업적 사용 자유, GPL 아님) | — |

### 1.3 AI 진입점 (현 정책 반영 확인)

- AI는 **"초안 생성기"가 아니라 "붙여넣은 원문/URL 변환 보조"** — 무에서 초안 생성하는 진입점은 정책적으로 제거됨 (`IR-O4O-AI-CONTENT-GENERATION-ENTRYPOINT-AUDIT-V1`)
- 툴바 "AI 정리"(`Toolbar.tsx:580-609`) + `AiContentModal` 은 편집 보조로만 보존. 결과 HTML → `setContent` → 편집기 자동 반영. **매끄럽게 연결됨**

> 이 정책은 편집기 표준 유지와 정합한다. 별도 조치 불필요.

---

## 2. 실제 사용처 (B) — 채택 매트릭스

`RichTextEditor` 직접 렌더 **45개 화면** 전수 집계.

| 항목 | 연동 화면 수 |
|------|:---:|
| RichTextEditor 사용 화면 (전체) | **45** |
| **미디어 라이브러리(`onMediaLibraryPick`) 연동** | **3** (전부 Neture 공급자) |
| 미디어 라이브러리 미연동 | **42** |
| `existingImages` / `showTemplateActions` / `templateCategory` 사용 | **1** (Neture `ProductDetailDrawer` 단독) |
| `onImageUpload`(직접 업로드) 전달 | 8 (Neture 3 + KPA 5) |

**서비스별 미디어 라이브러리 연동 현황:**

| 서비스 | 화면 수 | 미디어 라이브러리 연동 |
|--------|:---:|:---:|
| Neture (공급자) | 6 | **3** (`SupplierProductCreatePage`, `SupplierProductImportPage`, `ProductDetailDrawer`) |
| KPA | 22 | **0** |
| GlycoPharm | 9 | **0** |
| K-Cosmetics | 8 | **0** |

### 2.1 결정적 관찰 — 구조적 차단

공용 셸 [`ProductionMaterialEditorShell`](../../packages/store-ui-core/src/components/ProductionMaterialEditorShell.tsx) 의 주입 인터페이스 `InjectedEditorProps` 에는 `onMediaLibraryPick` / `onImageUpload` / `existingImages` **prop 자체가 없다** (`value/onChange/placeholder/minHeight/preset/aiRequestHeaders`만 존재).

→ 이 셸을 경유하는 GlycoPharm/K-Cosmetics 제작 화면·포럼은 **소비처에서 원해도 미디어 라이브러리를 켤 수 없는 구조적 차단** 상태다. 이것이 미디어 라이브러리 표준화(WO-1)의 핵심 근거다.

---

## 3. 콘텐츠 제작 워크플로우 진단

AI 생성 → HTML → 편집 → 미디어 → 저장 → 실행 자산(POP/QR/사이니지/태블릿) 전 구간 추적 결과:

| 구간 | 판정 | 상세 |
|------|:---:|------|
| AI 결과 → 편집기 삽입 | **매끄러움** | `AiContentModal` `setContent` 자동 반영 |
| 이미지 미디어 라이브러리 | **매끄러움** (단 picker는 caller 주입) | GCS `o4o-media-library` + `MediaLibraryService` |
| **동영상(mp4)** | **수동 단계** | 백엔드·admin 사이니지는 `internal_video`(mp4) 지원하나 **편집기는 YT/Vimeo iframe만** → mp4는 편집기 밖 별도 경로 |
| **저장 → 실행 자산 재사용** | **수동 단계** | 저장 목적지 6갈래 분기 + POP/QR/사이니지/태블릿이 **가져올 때 값 복사(사본)** → 원본↔사본 동기화 없음 |

**저장 목적지 6갈래** (편집기 산출물이 흩어지는 지점):
채널저장 / 커뮤니티(`/forum/posts`) / 내매장(`/kpa/store-contents`) / 매장제작자산(`store_execution_assets`) / 직접작성(`kpa_contents`) / 매장활용변환(`store_execution_assets`).

**실행 자산 소비**: `store_execution_assets`(usage_type: pop|qr|signage|banner|notice) + `o4o_asset_snapshots`. POP 가져오기=`prefillPop` 값 복사, 사이니지=`assetSnapshotApi.copy` 단일 경로("clone 금지"). **가져오기=사본 불변식은 이미 확립**되어 있으나, 저장 표면이 다갈래라 사용자 경험상 수동 단계가 많다.

---

## 4. Gap 우선순위 (C)

| 순위 | Gap | 근거 | 성격 |
|:---:|------|------|------|
| **P0** | **미디어 라이브러리 표준화** | 45개 중 3개만 연동, 공용 셸이 prop 자체를 미노출 → 구조적 차단 | 이미 논의 완료, 확정 |
| **P0** | **표(Table) 지원** | 확장 미설치. HTML 탭으로 넣은 표가 편집 탭 진입 시 `getHTML()` 직렬화로 **소실 위험** (Round-trip 최강점을 표에서 깨뜨림) | 신규 |
| **P1** | **동영상(mp4) 파이프라인 정합** | 편집기=YT/Vimeo만, admin/백엔드=internal_video mp4 → 편집기 산출물과 실행 동영상이 별도 파이프라인 | 신규 |
| **P1** | **저장 → 실행 자산 워크플로우 단순화** | 저장 6갈래 분기 + 표면별 사본 재가져오기 | 신규 |
| **P2** | **HTML Import 품질 실측 + 일반 편집 UX** | Import 경로는 존재. 실제 유지율/불필요 태그/사용성 실측 미수행 | 조사 후 판단 |
| **P3** | 템플릿 시스템 확대 | 현재 `ProductDetailDrawer` 단독 사용 | 후순위 |

### 4.1 표(Table) Gap 상세 — 왜 P0인가

현 Round-trip 모델은 "WYSIWYG 미편집 시 raw HTML 보존"으로 표를 **미편집 상태로는 보존**한다. 그러나 사용자가 편집 탭에서 표가 포함된 문서를 **한 글자라도 타이핑하면** `wysiwygDirtyRef=true`가 되어 `getHTML()`이 authoritative가 되고, TipTap이 표 노드를 모르므로 **표 구조가 직렬화에서 탈락**한다. 즉 "표가 있는 문서는 편집하면 안 된다"는 암묵적 지뢰가 존재한다. Excel 붙여넣기(IR §G)는 아예 불가.

---

## 5. 후속 WO 후보

> 본 IR은 **핸드오프 진단 문서**이며, 아래 WO는 착수 지시가 아니라 도출된 후보다. 각 WO는 별도 명시 지시로 착수한다.

- **WO-1 (P0, 확정)**: 미디어 라이브러리 표준화 — 공용 셸 `InjectedEditorProps`에 `onMediaLibraryPick`/`onImageUpload`/`existingImages` 노출 + 공용 picker 컴포넌트 표준화 → KPA/GP/KCos 전 제작 화면에 미디어 라이브러리 기본 연동
- **WO-2 (P0)**: TipTap Table 확장 도입 — `@tiptap/extension-table` + 툴바 표 버튼 + `sanitizeRichHtml` 표 태그 허용 + Round-trip 검증(편집 후 표 보존)
- **WO-3 (P1)**: 동영상 mp4 정합 — 편집기에서 미디어 라이브러리/사이니지 mp4를 `<video>` 또는 표준 노드로 삽입, 실행 표면과 동일 파이프라인
- **WO-4 (P1)**: 저장→실행 자산 워크플로우 단순화 — 6갈래 저장 UX 통합 검토
- **WO-5 (P2)**: HTML Import 품질 실측 (§6) 후 개선 WO 도출
- **WO-6 (P2)**: 일반 편집 UX 개선 (실사용성 관측 기반)

---

## 6. HTML Import 품질 실측 프로토콜 (WO-5 준비)

5개 편집기 백지 비교가 아니라 **현 표준 편집기의 Round-trip 유지율 실측**으로 좁힌다.

테스트 HTML(제목 h1~h3 / 문단 / 굵게·기울임 / 목록 / **표** / 이미지 / YouTube iframe / **HTML5 video** / 링크 / 구분선)을 다음 경로로 통과:

```
테스트 HTML → HTML 탭 입력 → 편집 탭 표시 → 편집 탭에서 수정 →
저장(getHTML) → 재로드 → 레이아웃 유지율/불필요 태그/사용성 비교
```

예상 결과(사전 코드 근거): 표·HTML5 video는 편집 탭 수정 시 소실 → WO-2/WO-3 우선순위를 실측으로 확증.

---

## 7. 최종 판정

1. **편집기 교체 근거 없음.** TipTap 기반 `@o4o/content-editor`는 전 서비스 배포·운영 중이며 Round-trip·이미지·확장성·라이선스(MIT) 모두 O4O 요구를 충족한다. 교체는 4개 서비스 45개 화면 전면 마이그레이션 비용을 유발하며, 그 비용을 정당화할 결함이 없다.
2. **표준 완성 = 보강.** P0 두 건(미디어 라이브러리 표준화 / 표 지원)이 장기 표준 완성의 최우선 과제다.
3. **O4O 철학(§9) 적합**: HTML=저장 포맷 / 사용자는 HTML 직접편집 안 함(HTML 탭은 선택) / 미디어는 라이브러리 관리 / 전 서비스 동일 편집기 — 현 구조가 이미 이 원칙 위에 있으며, P0 보강으로 "미디어는 라이브러리 관리" 원칙이 전 서비스에서 실제로 성립한다.

---

*Status: 진단 완료 (read-only). 후속 WO는 별도 지시로 착수.*
