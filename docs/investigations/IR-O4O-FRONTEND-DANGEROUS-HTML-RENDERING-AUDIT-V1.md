# IR-O4O-FRONTEND-DANGEROUS-HTML-RENDERING-AUDIT-V1

> **유형:** read-only 전수조사 (코드/DB/의존성 변경 없음)
> **판정: PASS.** 전체 frontend(`services/*` + `packages/*` + `apps/admin-dashboard`)의 raw HTML 렌더링 사용처 전수조사 완료. `dangerouslySetInnerHTML` ~30 주입 + 직접 `.innerHTML=` 6건 분류. **공개 surface CRITICAL XSS 없음.** DANGER 2건(content-editor AI preview raw), WARNING 6건, 나머지 SAFE/NOT_APPLICABLE.
> 선행: SANITIZE-ON-WRITE-V2(PASS) · GLYCOPHARM-RICH-RENDER · HTML-RENDERING-POLICY — 2026-06-16

---

## 1. Summary

- 핵심 렌더 경로(block-renderer 전체, content-editor `ContentRenderer`, forum-core, signage-player)는 **일관되게 `DOMPurify` / `sanitizeHtml` / `sanitizeRichHtml` 적용** → 위생 양호.
- **저장 시 sanitize(SANITIZE-ON-WRITE-V2) + 렌더 시 sanitize** 2겹 방어선이 상품설명·CMS 콘텐츠 축에서 작동.
- 잔여 리스크는 **AI 결과 preview raw 주입(DANGER 2)** + **sanitize 책임이 코드상 불명확한 API/AI 주입 및 커스텀 regex / safeMode 우회(WARNING 6)** 에 집중. 모두 **admin/operator surface 위주**.
- **공개 소비자 surface 의 미차단 raw XSS 는 발견되지 않음** → 긴급(CRITICAL) 없음. DANGER/WARNING 은 후속 보안 WO 로 표준화.

| 분류 | 건수 | 비고 |
|------|:--:|------|
| SAFE | 다수 (block-renderer 17 + content-editor 4 + forum 3 + 그 외 ~8) | DOMPurify/sanitizeHtml/sanitizeRichHtml/escape-at-source |
| WARNING | 6 | sanitize 책임 불명확 / 커스텀 regex / safeMode 우회 / admin editor innerHTML |
| DANGER | 2 | content-editor AI preview `result.html` raw |
| NOT_APPLICABLE | 5 | detached parse-only temp div / 주입 없음(주석·텍스트) / archive |
| CRITICAL | 0 | 공개 surface 미차단 XSS 없음 |

## 2. Scope

**조사 대상(완료):**
- `services/web-kpa-society`, `services/web-glycopharm`, `services/web-k-cosmetics`, `services/web-neture`, `services/signage-player-web`
- `packages/*` (content-editor, block-renderer, shared-space-ui, forum-core, utils, operator-core-ui, tablet-kiosk-core, store-ui-core 등)
- `apps/admin-dashboard` (raw HTML 사용 다수 — 포함)

**범위 메모:**
- 조사요청서 §4 의 `packages/operator-ui-core` 는 **존재하지 않음**(실제: `operator-core-ui` / `operator-ux-core`). 둘 다 조사 대상에 포함.
- `packages/tablet-kiosk-core`, `packages/store-ui-core`: `dangerouslySetInnerHTML`/`__html`/`.innerHTML=` **매칭 없음**(clean).
- `RichTextRenderer` / `SafeHtmlRenderer` 컴포넌트: **존재하지 않음**(repo 전체 0). 공통 안전 렌더러는 `ContentRenderer`.
- `web-k-cosmetics`: 직접 `dangerouslySetInnerHTML` 매칭 없음(block-renderer/content-editor 공통 컴포넌트 경유로 추정).

## 3. Search Commands

```bash
# 주입 사용처
rg "dangerouslySetInnerHTML" -g "*.{tsx,jsx,ts}"
# 직접 DOM 주입
rg "\.innerHTML\s*=" -g "*.{tsx,jsx,ts}"
# 공통 안전 렌더러 / sanitizer
rg "RichTextRenderer|SafeHtmlRenderer" -g "*.{tsx,jsx,ts}"   # → 0건
rg "sanitizeHtml|sanitizeRichHtml|DOMPurify|ContentRenderer" -g "*.{tsx,jsx,ts}"
```

- `dangerouslySetInnerHTML`: 36 파일 매칭(실제 주입 ~30, 나머지는 주석/텍스트/archive).
- `.innerHTML =`: 6건.

## 4. Shared Safe Renderer Baseline

**Canonical sanitize SSOT:** `packages/content-editor/src/sanitize.ts`

| 함수 | 정책 |
|------|------|
| `sanitizeHtml(dirty)` | `DOMPurify.sanitize(dirty)` 기본 정책 — script / inline JS(on*) / `javascript:` / 임의 iframe 차단. |
| `sanitizeRichHtml(dirty)` | `ADD_TAGS:['iframe']` + 후처리로 **YouTube/Vimeo embed src 만 허용**, 그 외 iframe 제거. |

**공통 안전 렌더러:** `packages/content-editor/src/components/ContentRenderer.tsx`
- variant 별로 `sanitizeHtml`(detail/default) / `sanitizeRichHtml`(guide) 를 **항상** 거쳐 `__html` 주입(라인 88/99/108) → **소비자 surface 표준 안전 렌더러**.
- `signage-player-web/ContentRenderer.tsx` 도 `sanitizeHtml(content.body)` 경유(별도 구현이나 동일 정책).

→ 위 함수/컴포넌트 경유 주입은 SAFE 판정 근거.

## 5. Findings by Classification

### 5.1 SAFE

| 영역 | 파일:라인 | sanitize 방식 |
|------|----------|---------------|
| block-renderer | Quote(31)/List(41)/Paragraph(50)/Heading(57)/Html(27)/Markdown(191)/Embed(59)/ProductDescription(50)/Video(50)/Gallery(70)/Image(78)/Audio(42)/Table(46,75,90,105)/Button(49) Block | 전부 `DOMPurify.sanitize(...)` (17건) |
| content-editor | `ContentRenderer.tsx`(88,99,108), `ContentPreview.tsx`(48) | `sanitizeHtml`/`sanitizeRichHtml` |
| content-editor | `sanitize.ts`(39) `div.innerHTML = clean` | `clean` = DOMPurify 결과 후처리(iframe 필터) |
| shared-space-ui | `ResourcesHubTemplate.tsx`(990 / innerHTML 193,200) | `safeHtml`/`DOMPurify.sanitize` |
| forum-core | `ForumBlockRenderer.tsx`(37,66,109) | `DOMPurify.sanitize` |
| utils | `TemplateRenderer.tsx`(163) | `sanitizeHtml` (JSON-LD `<script>`) |
| web-glycopharm | `education/CourseDetailPage.tsx`(90) | `sanitizeHtml` (긴급수정 반영분) |
| web-neture | `supplier/SupplierProductImportPage.tsx`(639) | 로컬 `escapeHtml()` 후 고정 구조 조립 |
| signage-player-web | `ContentRenderer.tsx`(161) | `sanitizeHtml` |
| admin-dashboard | `cover/CoverOverlay.tsx`(550) | `sanitizeHtml` (생성 SVG, 입력=고정 템플릿+색상) |

### 5.2 WARNING

| # | 파일:라인 | 주입값 | 사유 |
|---|----------|--------|------|
| W1 | `packages/shared-space-ui/src/community/CommunityContentDetailView.tsx:100` | `bodyHtml`(prop) | 내부 sanitize 없음. 주석상 "wrapper/백엔드 책임" — 호출처 sanitize 보장 코드상 불명확. |
| W2 | `services/web-kpa-society/src/pages/contents/ContentDocumentsPage.tsx:545` | `drawerDetail.body` | content API 값, 파일 내 sanitizer import/호출 없음. 백엔드 sanitize 여부 미확인. |
| W3 | `services/web-kpa-society/src/pages/contents/ContentListPage.tsx:447` | `drawerDetail.body` | W2 동일 패턴. |
| W4 | `services/web-kpa-society/src/pages/operator/signage/AiContentGenerationModal.tsx:320,381` | `genResult.generatedContent` | 백엔드 AI 응답 raw 주입(2곳), 로컬 sanitize 없음. AI 미sanitize 시 DANGER 승격. |
| W5 | `apps/admin-dashboard/.../module-inspector/HTMLSettings.tsx:96` | `sanitizeHtml(safeMode ? sanitizeHTML(html) : html)` | 커스텀 **regex sanitizer**(`sanitizeHTML`) + canonical fallback. `safeMode=false` 시 전부 우회. regex sanitizer 는 안전 판정 안 함(요청서 §5). |
| W6 | `apps/admin-dashboard/src/components/editor/gutenberg/RichText.tsx:73` | `editorRef.current.innerHTML = value` | contentEditable 에디터 마운트 시 `value` 주입, sanitize 없음. admin 자기 콘텐츠 편집 맥락이나 미검증. |

### 5.3 DANGER

| # | 파일:라인 | 주입값 | 데이터 출처 | 비고 |
|---|----------|--------|------------|------|
| D1 | `packages/content-editor/src/components/AiContentModal.tsx:1361` | `result.html` | AI 생성 결과 | preview 탭 raw 주입, sanitize 없음. canonical sanitizer 가 **같은 패키지**에 존재. |
| D2 | `packages/content-editor/src/components/StoreUseModal.tsx:382` | `result.html` | AI 생성 결과 | preview 뷰 raw 주입, D1 동일 패턴. (`result.plainText` 탭은 안전) |

### 5.4 NOT_APPLICABLE

| 파일:라인 | 사유 |
|----------|------|
| `apps/admin-dashboard/.../blocks/MarkdownBlock.tsx:113` | `document.createElement('div')` **detached** temp div, heading 추출용 querySelector/textContent 만. 렌더/attach 없음. |
| `packages/block-renderer/.../special/MarkdownBlock.tsx:68` | 동 패턴(detached temp div, TOC heading 추출). 실제 렌더 경로는 `DOMPurify.sanitize`(191) SAFE. |
| `packages/operator-core-ui/.../ContactInquiryAdminPage.tsx` | dangerouslySetInnerHTML 미사용 — `whiteSpace: pre-wrap` 텍스트. |
| `packages/shared-space-ui/legal/PublicLegalFooterInfo.tsx`, `PolicyDocumentViewer.tsx` | 주석상 dangerouslySetInnerHTML 명시 회피, 텍스트 렌더. |
| `services/web-kpa-society/legal/LegalDocumentView.tsx` | line 기반 markdown → React element(주입 없음). |
| `archive/2025-01-06-duplicate-cleanup/pages-test/LoopBlockTest.tsx:92` | **archive / dead code** — 조사 대상 외. |

## 6. Critical Findings

**없음(CRITICAL 0).**
- 공개 소비자 surface(KPA/GP storefront·tablet, signage, neture CMS public)는 전부 `ContentRenderer`/`sanitizeHtml` 경유 → 미차단 raw XSS 없음.
- DANGER(D1/D2)는 **admin/operator 모달 preview** 영역이며 입력은 자체 AI 생성 결과 → 외부 공격자 직접 제어 입력 아님. 즉시 긴급도 중간, 그러나 신뢰 경계상 sanitize 표준화 필요.
- WARNING 중 W2/W3(content API `body`)는 **백엔드 sanitize 여부 확인 시 등급 재평가** 필요(후속 WO 에서 surface 공개 여부 + 저장 sanitize 확인 → 미sanitize+공개면 승격).

## 7. Recommended Follow-up WOs

| 우선 | WO 후보 | 범위 |
|:--:|---------|------|
| 1 | `WO-O4O-CONTENT-EDITOR-AI-PREVIEW-SANITIZE-V1` | D1/D2 — `AiContentModal`/`StoreUseModal` preview `result.html` 을 `sanitizeRichHtml` 래핑. content-editor 내부 2파일. |
| 2 | `WO-O4O-KPA-CONTENT-AI-DRAWER-SANITIZE-V1` | W2/W3/W4 — kpa-society drawer/AI 주입에 `sanitizeHtml` 적용 또는 `ContentRenderer` 교체. 사전 백엔드 sanitize·공개 surface 확인. |
| 3 | `WO-O4O-ADMIN-HTMLSETTINGS-SANITIZE-HARDENING-V1` | W5 — `HTMLSettings` 커스텀 regex sanitizer 폐기 + safeMode 우회 제거, canonical 일원화. |
| 4 | `WO-O4O-SHARED-COMMUNITY-DETAIL-SANITIZE-CONTRACT-V1` | W1 — `CommunityContentDetailView` sanitize 계약 명문화/내부 보강. 공통 컴포넌트 → 소비처 영향 확인(SHARED-MODULE-CHANGE-PROTOCOL). |
| 5 | `WO-O4O-ADMIN-RICHTEXT-EDITOR-INIT-SANITIZE-V1` | W6 — Gutenberg `RichText` 초기 `innerHTML` 주입 sanitize(에디터 IME 제약 고려). |

> 공통 컴포넌트(content-editor / shared-space-ui) 변경은 다소비처 영향 → 착수 전 `docs/baseline/O4O-SHARED-MODULE-CHANGE-PROTOCOL-V1.md` 확인.

## 8. Non-goals / Unchanged

- 본 IR 은 **read-only**. 코드 / DB / migration / dependency / lint / 포맷팅 변경 **없음**.
- 위험 사용처 즉시 수정 **안 함** — §7 후속 WO 로 분리.
- generated / vendor / build 산출물은 분류 제외, `archive/*` 는 NOT_APPLICABLE.

## 9. Commit Hygiene

- 본 IR 문서 **단독** path-specific stage → 단일 shell call 로 `add → diff --cached → commit` 체인(병렬 세션 staging 혼입 방지).
- 다른 세션 WIP 미접촉.
- 참고: 직전 `c3b790851`(SANITIZE-ON-WRITE-V2)은 add/commit 분리 실행으로 병렬 세션 WIP 가 혼입된 **mixed commit**(기능/빌드 영향 없음, force-push 미수행). 상세 = `CHECK-O4O-PRODUCT-DESCRIPTION-SANITIZE-ON-WRITE-V2 §14-A`.

---

*Date: 2026-06-16 · frontend dangerous HTML 전수조사 · read-only · dangerouslySetInnerHTML ~30 + .innerHTML 6 · SAFE 다수 · DANGER 2(content-editor AI preview) · WARNING 6 · CRITICAL 0(공개 surface 미차단 XSS 없음) · operator-ui-core 부재/tablet-kiosk-core·store-ui-core clean/RichTextRenderer·SafeHtmlRenderer 부재 · 코드·DB·의존성 무변경.*
