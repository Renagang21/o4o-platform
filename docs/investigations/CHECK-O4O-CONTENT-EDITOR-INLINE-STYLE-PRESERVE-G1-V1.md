# CHECK-O4O-CONTENT-EDITOR-INLINE-STYLE-PRESERVE-G1-V1

> `IR-O4O-STORE-PRODUCT-LLM-MANUAL-CONTENT-FLOW-CODE-AUDIT-V1` §5.3 의 **선행 게이트 G1** 실측 CHECK.
> 질문: 외부 LLM이 만든 디자인 HTML의 **인라인 `style`**(배경/박스/색/여백)이 입력 → sanitize → 저장 → QR/블로그 렌더 전 구간에서 **실제로 보존되는가**.
> 작성일: 2026-06-30 · 성격: **read-only CHECK** (코드/DB/API/UI 변경 없음 · 산출물 = 본 문서 1개). 코드 경로 정적 추적 + DOMPurify 실설치본 실행 검증.

---

## 0. 결론 (먼저)

> **G1 = PASS.** 인라인 `style`은 **입력 → 저장 → 렌더 전 구간에서 보존**된다. **코드 변경 불필요.**
>
> 단 두 가지 조건/유보가 있다:
> - **조건 A (raw 경로 유지)**: HTML 탭에 붙여넣고 **WYSIWYG('edit' 탭)로 편집하지 않은 채** 저장해야 한다. WYSIWYG 편집 시 TipTap 직렬화로 임의 인라인 style이 소실된다(기존 raw-preserve 설계의 의도된 동작).
> - **유보 B (CSS 위험값 hardening)**: 실설치 DOMPurify가 `style` attribute는 보존하되 본 검증 환경에서 `url(javascript:...)`·`expression(...)` 같은 위험 CSS를 제거하지 않았다. 실질 XSS 위험은 낮으나(현대 브라우저 미실행) 별도 hardening 후보로 기록(§5).

이는 IR이 G1을 "표면별로 갈릴 수 있다"고 본 우려를, **렌더 단계 sanitize가 style을 제거하지 않는다**는 실측으로 해소한 것이다.

---

## 1. 검증 방법

1. **정적 추적**: 입력(RichTextEditor) → sanitize(sanitize.ts) → 저장(store-content.controller) → 렌더(QR landing / ContentRenderer) 경로를 파일·라인 인용으로 추적.
2. **동적 검증**: 레포에 **실제 설치된** DOMPurify 버전을 jsdom 환경에서 직접 실행하여 인라인 style 보존 여부를 실측. (정적 추적만으로는 "DOMPurify 기본값이 style을 제거하는가"라는 핵심 사실을 단정할 수 없어 실행으로 확정.)

> ⚠️ **중요 정정**: 사전 코드 추적 단계에서 "DOMPurify 기본값은 style을 제거한다"는 가설이 제기되었으나, **실설치본 실행 결과 거짓으로 확인**되었다(§3). 본 CHECK의 PASS 판정은 실행 검증에 근거한다.

---

## 2. 경로 정적 추적

### 2.1 sanitize 구현

`packages/content-editor/src/sanitize.ts`

```text
sanitizeHtml(dirty)      : DOMPurify.sanitize(dirty)                         [라인 34-36] — 옵션 미지정(기본값)
sanitizeRichHtml(dirty)  : DOMPurify.sanitize(dirty, {                       [라인 48-69]
                             ADD_TAGS: ['iframe'],
                             ADD_ATTR: ['allowfullscreen','frameborder','allow','width','height'],
                           }) + iframe src 후처리
```

- 두 함수 모두 `style`을 ADD_ATTR/ALLOWED_ATTR로 **명시하지 않음** → "style 운명"은 **DOMPurify 기본 정책**에 달림(§3에서 실측).

### 2.2 입력 → 저장 (RichTextEditor)

`packages/content-editor/src/components/RichTextEditor.tsx`

- HTML 탭 raw 보존: `htmlSource` state + `wysiwygDirtyRef`. HTML 탭 textarea onChange는 **raw 원문**을 그대로 `onChange({html})` 전파(라인 443-452).
- 저장 authoritative 결정 `resolveSaveHtml()`(라인 219-225): `wysiwygDirty=false`면 **htmlSource 원문 반환**, `true`면 `editor.getHTML()`(TipTap 직렬화) 반환.
- HTML→edit 탭 전환 시 `sanitizeRichHtml(htmlSource)`는 **에디터 내부 동기화용**이며, onChange로 나가는 저장값은 **raw htmlSource**(라인 245-254).
- (WO-...-HTML-TAB-SAVE-RAW-PRESERVE-V1 / `ir-common-editor-inline-style-loss` 의 교정 결과와 일치.)

→ **HTML 탭만 사용하면 인라인 style이 저장값에 raw로 보존**(조건 A). WYSIWYG 편집 시 TipTap 스키마가 임의 인라인 style을 모델링하지 않아 직렬화에서 소실.

### 2.3 저장 (backend)

`apps/api-server/src/routes/o4o-store/controllers/store-content.controller.ts`

- POST direct 생성(라인 328) / PUT direct(라인 753) / import-b2c-description(라인 567-585) 모두 `content_json` 을 **추가 sanitize 없이 그대로** 저장. → DB의 `content_json.html` 은 원본 보존.

### 2.4 렌더

- QR page 랜딩: `store-qr-landing.controller.ts`(라인 241-274)가 `content_json.html` 을 **추가 sanitize 없이** 반환 → `QrLandingPage.tsx`(라인 150-151) `<ContentRenderer html={pc.body} variant="guide" />`.
- `ContentRenderer.tsx`(라인 100·111·120): 모든 variant가 `dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(html) }}`(또는 sanitizeHtml) 호출. **→ 렌더 직전 sanitize가 style을 유지하는지가 최종 관문**(§3에서 PASS 확인).

---

## 3. 동적 검증 — 실설치 DOMPurify 실행 결과

- 선언: `packages/content-editor/package.json` = `dompurify ^3.0.6`
- **실제 설치본**: `node_modules/dompurify` = **3.3.0** (root). (monaco-editor 하위에 3.1.7 별도 존재하나 content-editor 경로 아님.)

실행(jsdom + 설치본 DOMPurify, `sanitizeRichHtml` 옵션 동일 재현):

| 입력 | 기본 `sanitize()` | `sanitizeRichHtml` 옵션 |
|---|---|---|
| `<div style="background:#eee;padding:12px;border:1px solid #ccc;color:red">` | **style 보존** | **style 보존** |
| `<span style="font-weight:bold">` | **보존** | **보존** |
| `<img src="x" style="width:100px">` | **보존** | **보존** |

→ **DOMPurify 3.3.0 기본 정책은 `style` attribute를 허용(보존)한다.** ContentRenderer의 렌더 직전 sanitize는 인라인 style을 **제거하지 않는다.** 따라서 §2.4 최종 관문 통과.

추가(위험 CSS) 실행:

| 입력 | 결과 |
|---|---|
| `<div style="background:url(javascript:alert(1));width:expression(alert(1))">` | **제거되지 않고 그대로 출력됨** |

→ 위험 CSS 토큰이 제거되지 않음(유보 B). 현대 브라우저에서 CSS `url(javascript:)`/`expression()` 은 실행되지 않아 실질 위험은 낮으나, hardening 후보로 기록.

---

## 4. 종합 판정표

| 구간 | 처리 | 인라인 style |
|---|---|:---:|
| 입력(HTML 탭) | raw htmlSource 캡처 | ✅ 보존 |
| 입력(WYSIWYG 편집) | TipTap 직렬화 | ❌ 소실(조건 A) |
| 저장(editor→onChange) | wysiwygDirty=false → raw | ✅ 보존 |
| 저장(backend) | content_json 무가공 저장 | ✅ 보존 |
| DB | content_json.html | ✅ 보존 |
| 렌더 조회(QR API) | html 무가공 반환 | ✅ 보존 |
| 렌더(ContentRenderer sanitizeRichHtml) | **DOMPurify 3.3.0 기본=style 허용** | ✅ **보존** |
| 최종 화면(dangerouslySetInnerHTML) | — | ✅ 적용됨 |

---

## 5. IR §5.3 G1 게이트 반영 / 후속

- **G1 분기 결과 = (보존됨)**. IR §5.3 G1 의 "(a) 화이트리스트 조정 WO 선행 / (b) 구조 HTML만 권장" 두 분기 중 **어느 것도 불필요**. **디자인 입힌 HTML 그대로 활용 가능.**
- **핵심 WO(WO-O4O-STORE-PRODUCT-LLM-MANUAL-CONTENT-FLOW-V1) 착수 가능** — sanitize 선행 WO 없이 바로 진행.
- **콘텐츠 작성 UX 가이드(조건 A)**: LLM 디자인 HTML은 **HTML 탭에 붙여넣고 그대로 저장**(WYSIWYG 탭에서 본문 재편집 시 인라인 style 소실 가능)을 사용자 안내 문구로 반영. 기존 raw-preserve 동작과 일치.
- **(선택, 별도) hardening 후보 — 유보 B**: 인라인 style 허용을 유지하되 CSS 값에서 `javascript:`/`expression(`/`url()` 위험 토큰을 필터링하는 sanitize 강화. dangerouslySetInnerHTML 결합이므로 방어적 추가 권장이나, 실질 위험 낮음 → 별도 보안 WO로 분리, 본 흐름 blocker 아님.

> 후속 WO 후보: `WO-O4O-CONTENT-EDITOR-CSS-VALUE-HARDENING-V1` (조건부, 유보 B 전용 — 인라인 style 보존 유지 + 위험 CSS 토큰 필터).
> **IR §8 의 `WO-O4O-CONTENT-EDITOR-INLINE-STYLE-PRESERVE-AUDIT-V1`(선행 audit)는 본 CHECK로 충족·종료.**

---

## 6. 결론

> G1 우려(인라인 style이 렌더 단계 sanitize에서 제거될 수 있음)는 **실설치 DOMPurify 3.3.0 실행 검증으로 해소**되었다. style attribute는 기본 정책상 보존되며, 입력(HTML 탭 raw 경로) → 저장 → QR/블로그 렌더 전 구간에서 인라인 style이 살아남는다. **핵심 WO는 sanitize 변경 없이 착수 가능**하다. 단 (A) WYSIWYG 재편집 시 소실되는 점을 작성 가이드로 안내하고, (B) CSS 위험 토큰 hardening은 낮은 우선순위의 별도 보안 WO로 둔다.

---

**작성:** O4O Platform G1 실측 CHECK · 2026-06-30
**성격:** read-only — 코드/DB/API/UI 변경 없음. sanitize.ts / RichTextEditor.tsx / store-content.controller.ts / store-qr-landing.controller.ts / ContentRenderer.tsx 정적 추적 + 레포 설치 DOMPurify 3.3.0 동적 실행 검증.
