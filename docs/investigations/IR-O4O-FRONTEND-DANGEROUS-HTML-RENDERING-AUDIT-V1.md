# IR-O4O-FRONTEND-DANGEROUS-HTML-RENDERING-AUDIT-V1

> **유형:** read-only 전수조사 (코드 수정 없음)
> **목표:** 전체 frontend `dangerouslySetInnerHTML` 사용처를 조사해 **safe / warning / danger** 로 분류, XSS 노출 지점을 체계적으로 정리.
> **결과 요약:** 36개 파일 매칭 중 실제 HTML 주입 ~30건. **대부분 SAFE**(DOMPurify / `sanitizeHtml` / `sanitizeRichHtml` 경유). **DANGER 2건**(AI 결과 raw 주입), **WARNING 5건**(sanitize 책임 불명확 / 커스텀 regex / safeMode 우회).
> 선행: SANITIZE-ON-WRITE-V2(PASS) · HTML-RENDERING-POLICY — 2026-06-16

---

## 1. 분류 기준

| 등급 | 정의 |
|------|------|
| **SAFE** | 주입 전 canonical sanitizer 경유 — `sanitizeHtml`/`sanitizeRichHtml`(`@o4o/content-editor`) 또는 `DOMPurify.sanitize(...)`. 또는 주입값이 로컬에서 escape 후 조립된 고정 구조. |
| **WARNING** | 커스텀/임시 sanitizer, sanitize 책임이 wrapper/백엔드로 미루어져 있고 코드상 확인 불가, 또는 부분 sanitize/우회 경로 존재. |
| **DANGER** | 신뢰 불가 값(AI/API/사용자)을 sanitize 없이 raw 주입. |

**Canonical sanitize SSOT:** `packages/content-editor/src/sanitize.ts`
- `sanitizeHtml(dirty)` — DOMPurify 기본 정책(script/inline JS/임의 iframe 차단).
- `sanitizeRichHtml(dirty)` — iframe 중 YouTube/Vimeo embed 만 허용.
- `ContentRenderer` 컴포넌트는 내부적으로 위 함수로 sanitize → **소비자 surface 표준 안전 렌더러**.

---

## 2. DANGER (2건) — 우선 조치 권장

| # | 파일:라인 | 주입값 | 데이터 출처 | 비고 |
|---|----------|--------|------------|------|
| D1 | `packages/content-editor/src/components/AiContentModal.tsx:1361` | `result.html` | AI 생성 결과 | preview 탭에서 raw 주입. sanitize 없음. canonical sanitizer 가 **같은 패키지**에 존재 → 적용 용이. |
| D2 | `packages/content-editor/src/components/StoreUseModal.tsx:382` | `result.html` | AI 생성 결과 | preview 뷰에서 raw 주입. sanitize 없음. D1 과 동일 패턴. |

- 두 건 모두 **admin/operator 모달 preview** 영역(공개 소비자 surface 아님) → 즉시 활성 위험도는 중간. 그러나 AI 출력은 신뢰 경계상 sanitize 대상이며, 동일 패키지의 `sanitizeHtml`/`sanitizeRichHtml` 로 단순 래핑 가능.
- `result.plainText` 탭은 안전(텍스트).

## 3. WARNING (5건) — sanitize 책임 검증 필요

| # | 파일:라인 | 주입값 | 사유 |
|---|----------|--------|------|
| W1 | `packages/shared-space-ui/src/community/CommunityContentDetailView.tsx:100` | `bodyHtml`(prop) | 컴포넌트 내 sanitize 없음. 주석상 "wrapper/백엔드 책임" — 호출처별 sanitize 보장 여부 코드상 불명확. |
| W2 | `services/web-kpa-society/src/pages/contents/ContentDocumentsPage.tsx:545` | `drawerDetail.body` | API(content.detail) 값 주입, 파일 내 sanitizer import/호출 없음. 백엔드 sanitize 여부 미확인. |
| W3 | `services/web-kpa-society/src/pages/contents/ContentListPage.tsx:447` | `drawerDetail.body` | W2 와 동일 패턴(같은 drawer 컴포넌트 추정). |
| W4 | `services/web-kpa-society/src/pages/operator/signage/AiContentGenerationModal.tsx:320,381` | `genResult.generatedContent` | 백엔드 AI 응답 raw 주입(2곳), 로컬 sanitize 없음. AI 서비스가 sanitize 안 하면 DANGER 로 승격. |
| W5 | `apps/admin-dashboard/.../module-inspector/HTMLSettings.tsx:96` | `sanitizeHtml(safeMode ? sanitizeHTML(html) : html)` | 커스텀 regex sanitizer(`sanitizeHTML`) + canonical fallback. **`safeMode=false` 시 모든 필터 우회**. admin 전용이나 ad-hoc regex 는 취약. |

## 4. SAFE (요약)

| 영역 | 파일 | sanitize 방식 |
|------|------|---------------|
| **block-renderer** (전 17건/14파일) | Quote/List/Paragraph/Heading/Html/Markdown/Embed/ProductDescription/Video/Gallery/Image/Audio/Table/Button Block | 전부 `DOMPurify.sanitize(...)` 주입 전 적용 ✅ |
| content-editor | `ContentRenderer.tsx`(88/99/108), `ContentPreview.tsx`(48) | `sanitizeHtml` / `sanitizeRichHtml` |
| shared-space-ui | `ResourcesHubTemplate.tsx`(990) | `safeHtml` = DOMPurify allow-list 래퍼 |
| forum-core | `ForumBlockRenderer.tsx`(37/66/109) | `DOMPurify.sanitize` |
| utils | `TemplateRenderer.tsx`(163) | `sanitizeHtml` (JSON-LD `<script>`) |
| web-glycopharm | `education/CourseDetailPage.tsx`(90) | `sanitizeHtml` |
| web-neture | `supplier/SupplierProductImportPage.tsx`(639) | 로컬 `escapeHtml()` 후 고정 구조 조립 (`shortDescription`) |
| signage-player-web | `ContentRenderer.tsx`(161) | `sanitizeHtml` |
| admin-dashboard | `cover/CoverOverlay.tsx`(550) | `sanitizeHtml` (생성 SVG filter, 입력=고정 템플릿+색상값) |

### 주입 없음 (grep 매칭이나 실제 dangerouslySetInnerHTML 미사용 / 주석)
- `web-kpa-society/legal/LegalDocumentView.tsx` — line 기반 markdown → React element 렌더(주입 없음).
- `operator-core-ui/.../ContactInquiryAdminPage.tsx` — `whiteSpace: pre-wrap` 텍스트.
- `shared-space-ui/legal/PublicLegalFooterInfo.tsx`, `PolicyDocumentViewer.tsx` — 주석상 dangerouslySetInnerHTML 명시적 회피.

### 제외
- `archive/2025-01-06-duplicate-cleanup/pages-test/LoopBlockTest.tsx:92` — **archive(dead code)**. 조사 대상 외.

## 5. 종합 평가

- **플랫폼 전반 sanitize 위생 양호.** 핵심 렌더 경로(block-renderer 전체, content-editor `ContentRenderer`, forum-core, signage-player)는 일관되게 DOMPurify/`sanitizeHtml` 적용.
- **저장 시 sanitize(SANITIZE-ON-WRITE-V2) + 렌더 시 sanitize** 2겹 방어선이 상품설명 축에서 완성됨.
- 잔여 리스크는 **AI 결과 preview raw 주입(D1/D2)** 과 **sanitize 책임이 코드상 불명확한 API/AI 주입(W1~W5)** 에 집중. 모두 admin/operator surface 위주이나 신뢰 경계상 sanitize 표준화 필요.

## 6. 후속 WO 후보 (수정은 별 WO)

| 우선 | WO 후보 | 범위 |
|:--:|---------|------|
| 1 | `WO-O4O-CONTENT-EDITOR-AI-PREVIEW-SANITIZE-V1` | D1/D2 — `AiContentModal`/`StoreUseModal` preview `result.html` 을 `sanitizeRichHtml` 래핑. content-editor 내부 변경 1파일 단위. |
| 2 | `WO-O4O-KPA-CONTENT-AI-DRAWER-SANITIZE-V1` | W2/W3/W4 — kpa-society drawer/AI 주입 경로에 `sanitizeHtml` 적용 또는 `ContentRenderer` 로 교체. 사전 백엔드 sanitize 여부 확인. |
| 3 | `WO-O4O-SHARED-COMMUNITY-DETAIL-SANITIZE-CONTRACT-V1` | W1 — `CommunityContentDetailView` sanitize 계약 명문화(JSDoc) 또는 내부 sanitize 보강. 공통 컴포넌트 → 소비처 영향 확인 필요. |
| 4 | `WO-O4O-ADMIN-HTMLSETTINGS-SANITIZE-HARDENING-V1` | W5 — `HTMLSettings` 커스텀 regex sanitizer 폐기 + safeMode 우회 제거, canonical sanitizer 일원화. |

> 본 IR 은 read-only 조사이며 코드/DB/frontend 변경 없음. 위 WO 후보는 각각 영향범위(공통 컴포넌트 = 다소비처)에 따라 SHARED-MODULE-CHANGE-PROTOCOL 확인 후 착수.

---

*Date: 2026-06-16 · frontend dangerouslySetInnerHTML 전수조사 · read-only · 36파일 매칭/주입 ~30건 · SAFE 다수(DOMPurify/sanitizeHtml/sanitizeRichHtml) · DANGER 2(content-editor AI preview raw) · WARNING 5(sanitize 책임 불명확/커스텀 regex/safeMode 우회) · archive 제외 · 코드 무변경.*
