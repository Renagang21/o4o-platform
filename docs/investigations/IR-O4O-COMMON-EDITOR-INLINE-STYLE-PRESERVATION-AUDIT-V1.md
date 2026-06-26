# IR-O4O-COMMON-EDITOR-INLINE-STYLE-PRESERVATION-AUDIT-V1

> 유형: 조사 (read-only) / 상태: 문제확정, WO 결정 대기
> 작성일: 2026-06-26
> 선행: `WO-O4O-KPA-STORE-LIBRARY-CONTENTS-PDF-EXPORT-OPTIONS-V1`(PDF 디자인 보존) 검증 중 발견
> 대상: 공통 편집기 `@o4o/content-editor` (`packages/content-editor`)

---

## 1. 배경 / 증상

콘텐츠 본문 HTML 에 넣은 디자인(배경색·글자색·카드 박스·여백·테두리)이
**편집기 미리보기에는 보이는데, 저장하면 일부 스타일이 사라진다**는 보고.

PDF 인쇄 기능에서 처음 드러났으나, 조사 결과 PDF/백엔드 문제가 아니라 **공통 편집기의 저장 직렬화** 문제로 확정.

---

## 2. 조사 결과 (원인 위치 한정)

세 경로를 각각 확인:

| 경로 | inline style 보존 | 근거 |
|---|---|---|
| **백엔드 저장** (`POST/PUT /store-contents`) | ✅ 보존 (strip 안 함) | `store-content.controller`: `content_json: (contentJson ?? {})` 그대로 저장. API 로 `background/color/border/border-radius` 전부 유지 확인 |
| **PDF 생성** (`ContentPdfExportModal`) | ✅ 보존 | 본문 raw HTML 주입 + `print-color-adjust: exact`. 배경 박스 테스트 콘텐츠로 시각 확인(PASS) |
| **공통 편집기 저장 직렬화** | ❌ **일부 strip** | 아래 §3 |

→ **strip 주체는 공통 편집기**(TipTap 라운드트립). 백엔드·PDF 아님.

---

## 3. 근본 원인 — TipTap 스키마 한정 직렬화

`@o4o/content-editor` = **TipTap(ProseMirror) + DOMPurify** (`package.json`).

### 3.1 편집기 3-탭 구조 (`RichTextEditor.tsx`)

- **편집(WYSIWYG)** 탭: TipTap `editor.getHTML()` 로 본문 직렬화 (line 100, onUpdate).
- **HTML** 탭: `<textarea>` raw 입력 → `onChange({ html: 원문 })` (line 269). **strip 없음.**
- **미리보기** 탭: `ContentRenderer` 가 raw `htmlSource` 렌더 (line 299). **strip 없음.**

### 3.2 strip 발생 지점 — `switchTab` (line 151–163)

```js
// HTML탭 → 편집탭
const clean = sanitizeRichHtml(htmlSource);
editor.commands.setContent(clean, true);   // ① ProseMirror 스키마로 파싱 → 스키마 외 속성/노드 제거
// 편집탭 → 다른탭
const html = editor.getHTML();             // ② 제거된 결과만 반환
setHtmlSource(html);
```

또한 외부 `value` 로딩(line 130–131)도 `editor.setContent(value)` → 이후 `getHTML()` 시 동일하게 strip.

### 3.3 TipTap 로드 확장 (line 58–94) — 보존 vs 제거

로드: StarterKit(heading 1–3 / paragraph / bold / italic / strike / list / blockquote / hr / code), Underline, Link, Image, Youtube, TextAlign(heading·paragraph), Highlight, TextStyle, Color.

| 분류 | 항목 |
|---|---|
| **보존** (확장이 스키마에 정의) | 글자색(`<span style="color">`), 텍스트 정렬(`style="text-align"`), 하이라이트(`<mark>`), 굵게/기울임/밑줄/취소선, 링크, 이미지, 유튜브, 제목 h1–h3, 목록, 인용, 구분선, 코드 |
| **제거** (스키마에 없음) | **배경색(`background`)**, **padding/margin**, **border / border-radius**, **`<div>` 컨테이너(카드 박스)**, **커스텀 font-size**(FontSize 확장 없음), 기타 임의 inline style |

→ 테스트 콘텐츠 `<div style="background:#0f766e; padding; border-radius">…</div>` 는 **div 노드 자체가 스키마에 없어 컨테이너+배경+여백+모서리가 모두 소실**.

### 3.4 DOMPurify 는 strip 주체 아님

`sanitize.ts`: 기본 `DOMPurify.sanitize` 는 `style` 속성을 **허용**. 위험 태그/스크립트만 제거. 즉 sanitize 가 색을 떨구는 것이 아님.

### 3.5 증상 일치

미리보기 탭은 raw `htmlSource` 를 렌더 → **디자인 보임**. 저장은 (편집 탭을 거치면) `getHTML()` 결과 → **스타일 소실**. 보고된 "미리보기엔 보이는데 저장 시 사라짐"과 정확히 일치.

---

## 4. 영향 범위 (Shared Module)

`@o4o/content-editor` 소비처(서비스별 파일 수, node_modules 제외):

```
services/web-kpa-society  27
services/web-neture       14
services/web-glycopharm   14
apps/admin-dashboard      13
services/web-k-cosmetics  11
apps/main-site             7
packages/shared-space-ui   6
packages/store-ui-core / forum-core / shortcodes / tablet-kiosk-core …
```

→ **전 서비스 + admin/operator/store 전 영역**. 편집기 스키마/붙여넣기/sanitize 변경은 모든 소비처 회귀 검증 필요(CLAUDE.md §1 Shared Module Change Protocol, `docs/baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md`).

---

## 5. 즉시 우회 (코드 변경 없음)

- **HTML 탭에서만 작성하고 편집(WYSIWYG) 탭을 거치지 않고 저장**하면 디자인 보존됨.
- 단, 콘텐츠를 다시 열어 편집 탭이 관여하면 재차 strip. 근본 해결 아님.

---

## 6. 해결 방안 (택1 또는 조합)

| 방안 | 내용 | 장점 | 리스크/비용 |
|---|---|---|---|
| **A. 스키마 inline style 보존** | paragraph/heading + 신규 generic container(div) 노드에 `style` 전역 속성 허용(GlobalAttributes/커스텀 확장). DOMPurify 로 style 값 화이트리스트. | WYSIWYG 에서 배경/박스 포함 대부분 디자인 보존 | ProseMirror 스키마·붙여넣기·직렬화 광범위 변경, 전 서비스 회귀 위험 큼, style XSS 화이트리스트 설계 필요 |
| **B. HTML 작성 본문은 편집탭 라운드트립 회피** | 콘텐츠가 raw HTML 로 작성/로딩된 경우 WYSIWYG 강제 변환을 막고 raw 유지(예: "HTML 모드 콘텐츠" 표식 + 저장 시 htmlSource 우선). | 영향 작고 안전, 디자인 100% 보존 | "HTML 모드" 상태 관리·UX 설계 필요, WYSIWYG 병행 편집 제약 |
| **C. 구조화 블록 확장 추가** | 콜아웃/카드/색상 박스 등 자주 쓰는 디자인을 TipTap 노드로 1급 지원 | 안전, UX 일관 | 임의 inline 디자인은 여전히 제한, 확장 개발 비용 |

권장: **B 를 1차(낮은 리스크로 즉시 가치)** + **C 를 점진 확장**. A 는 전 서비스 영향이 커 별도 신중 검토.

---

## 7. 권장 다음 단계

1. 본 IR 기준 **WO 발의** (Shared Module Change Protocol 적용): 모든 소비처(KPA/GP/KCos/Neture admin·operator·store) 영향 매트릭스 + 회귀 시나리오 정의.
2. 방안 B 시제: HTML 작성 콘텐츠의 raw 보존 경로 + 편집탭 진입 시 경고/모드 고정.
3. 회귀 검증: 각 서비스 대표 편집 화면에서 기존 콘텐츠 편집·저장이 깨지지 않는지(색/정렬/이미지/유튜브 보존, 빈 본문 판정).

---

## 8. 참고 파일

- `packages/content-editor/src/components/RichTextEditor.tsx` (탭/switchTab/확장)
- `packages/content-editor/src/sanitize.ts` (DOMPurify, isBlankHtml)
- `packages/content-editor/package.json` (TipTap 확장 목록)
- `apps/api-server/src/routes/o4o-store/controllers/store-content.controller.ts` (백엔드 무-strip 확인)
- 선행 WO/CHECK: `docs/checks/CHECK-O4O-KPA-STORE-LIBRARY-CONTENTS-PDF-EXPORT-OPTIONS-V1.md`
- 기존 관련 WO: `WO-O4O-STANDARD-EDITOR-HTML-DIRECT-INPUT-PREVIEW-SAVE-FIX-V1` (HTML 직접 입력 모드 도입 — sanitize.ts 주석)
