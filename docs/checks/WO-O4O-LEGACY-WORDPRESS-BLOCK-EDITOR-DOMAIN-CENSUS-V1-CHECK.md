# WO-O4O-LEGACY-WORDPRESS-BLOCK-EDITOR-DOMAIN-CENSUS-V1 — CHECK

- **작성일**: 2026-09-03
- **성격**: 조사 전용 census (삭제 0 / runtime 수정 0 / route 수정 0 / dependency 수정 0 / DB write 0 / migration 0)
- **대상**: admin-dashboard 에 살아 있는 WordPress/Gutenberg 계열 block editor 축
- **최종 판정**: `LEGACY_EDITOR_RETIRE_READY` (§15)

> 본 CHECK 은 **판정만 수행**한다. 실제 은퇴 작업은 이 WO 범위가 아니며 별도 WO 가 필요하다.

---

## 1. Route census — legacy editor route 실체

`apps/admin-dashboard/src/routes/public.routes.tsx:99` 의 `/editor/*` 하나가 canonical 선언이다.
6 개 하위 route 전부 `EditorRouteWrapper` → `StandaloneEditor` 로 수렴한다.

| route | 선언 위치 | mode | guard | 상태 |
|---|---|---|---|---|
| `/editor/posts/new` | public.routes.tsx:106 | post | `AdminProtectedRoute roles=['admin'] perms=['content:write']` | 살아있음 (프로덕션 렌더 확인 §9) |
| `/editor/posts/:id` | public.routes.tsx:111 | post | 동일 | 살아있음 |
| `/editor/pages/new` | public.routes.tsx:116 | page | 동일 | 살아있음 (프로덕션 렌더 확인 §9) |
| `/editor/pages/:id` | public.routes.tsx:121 | page | 동일 | 살아있음 |
| `/editor/templates/:id` | public.routes.tsx:126 | template | 동일 | 살아있음 (백엔드 404) |
| `/editor/patterns/:id` | public.routes.tsx:131 | pattern | 동일 | 살아있음 (백엔드 404) |

### 1-1. WO 목록 밖에서 발견된 7번째 진입점 (신규 발견)

`apps/admin-dashboard/src/routes/test.routes.tsx` 에 `/gutenberg` route 가 존재한다.
`EditorRouteWrapper mode="post"` 를 그대로 렌더한다.

- `TestRoutes()` 는 `App.tsx:194` 에서 **무조건** 호출된다. `NODE_ENV` 게이트가 없다.
- 즉 test 성격 route 가 프로덕션에 등록돼 있으며, 이는 CLAUDE.md §8 "진단·seed·복구 경로 규칙" 3번(debug/test route 는 프로덕션에 등록하지 않는다) 위반이다.
- 다만 `requiredRoles` 없이 `requiredPermissions={['content:write']}` 만 걸려 있어 `/editor/*` 보다 **가드가 약하다**.
- 본 WO 범위상 **수정하지 않았다.** 은퇴 WO 에서 `/editor/*` 와 함께 다뤄야 한다.

### 1-2. 부수 route

| route | 컴포넌트 | 축 |
|---|---|---|
| `/admin/preview` | `PostPreview` | legacy (sessionStorage 기반, 인증 없음) |
| `/preview/posts/:id`, `/preview/pages/:id` | `PostPreview` | legacy (`postApi.get` → 404) |
| `/preview/:slug` | `ViewPreview` | **CMS V2 축 — legacy 아님** |
| `/appearance/template-parts/new`, `/:id/edit` | `TemplatePartEditor` | legacy (`/template-parts` 404) |

---

## 2. 서비스별 채택 census — 어느 서비스가 이 editor 를 쓰는가

**결론: 0 개 서비스.** legacy editor 는 admin-dashboard 안에서만 선언되며, 4 개 공식 서비스(KPA-Society / K-Cosmetics / Neture / Pharmacy-Hub) 프론트 어디에서도 `/editor/*` 로 진입하지 않는다.

| 진입 경로 후보 | 실측 |
|---|---|
| admin 정적 메뉴 (`admin-menu.static.tsx`) | `/editor/*`, `/posts`, `/pages`, `/appearance/*`, `/cpt-engine` **전부 없음** |
| navigation API (`/api/v1/navigation/admin`) | Phase R1 **STUB** — `{success:true, data:[], total:0}` |
| CPT 동적 메뉴 (`useDynamicCPTMenu`) | `/public/cpt/types` 프로덕션 응답 `data:[] total:0` → 주입 항목 0 |
| 서비스 web-* 프론트 | `/editor/` 문자열 참조 0 |

즉 **UI 에서 도달 가능한 링크가 하나도 없고**, URL 직접 입력으로만 도달한다.

### 2-1. 코드상 남아 있는 내부 링크 (도달 불가)

| 파일 | 링크 | 도달 가능성 |
|---|---|---|
| `pages/pages/PageList.tsx:164,168,786` | `/editor/pages/new`, `/editor/pages/:id` | `/pages/*` route 는 살아있으나 메뉴 없음 + 백엔드 404 |
| `pages/posts/Posts.tsx:250,373` | `/editor/posts/new`, `/editor/posts/:id` | **불가** — `/posts` 는 `content.routes.tsx:19` 에서 `/admin/cms/contents` 로 `<Navigate>` |
| `StandaloneEditor.tsx:523` | editor 자기참조 `navigate` | editor 내부 |

---

## 3. 프로덕션 저장 데이터 census (read-only)

`BEGIN READ ONLY; … ROLLBACK;` 로 조회. **SELECT / information_schema / count 만 사용했고 write 는 0 건이다.**

| 테이블 | 존재 | row |
|---|---|---|
| `posts` | **없음** | — |
| `post_revisions` | **없음** | — |
| `custom_posts` | **없음** | — |
| block pattern 테이블 | **없음** | — |
| `pages` | 있음 | **0** |
| `content_templates` | 있음 | **0** |
| `custom_post_types` | 있음 | **0** |
| `cms_contents` | 있음 | 129 |

`cms_contents` 129 행 중 `bodyBlocks` 가 비어 있지 않은 것은 **2 행뿐**이며, 둘 다 `archived` 상태·`2026-07-30` 자(30일 밖 / 90일 안)다. 블록 타입 분포는 paragraph 3 / heading 2 / list 2 로, Gutenberg 편집 산출물의 특징(그룹·컬럼·커버 등)이 없다.

- serviceKey 분포: glycopharm 66 / kpa-society 53 / neture 6 / pharmacy-hub 3 / kpa 1
- `updatedAt` 최근 30 일 3 건 / 90 일 15 건 → **현행 콘텐츠 축은 `cms_contents` 이며, 그 편집기는 legacy editor 가 아니다**(§4).

**Post/Page 엔티티는 백엔드에서 이미 제거됐다** — `content.routes.tsx` 헤더 주석이 커밋 `6354e8755`(2025-12-11, Phase 8-3)를 기록한다.

---

## 4. 현재 canonical editor 는 무엇인가

**`RichTextEditor` (`@o4o/content-editor`)** 이다. 소비 파일 87 개.

`apps/admin-dashboard/src/pages/cms/contents/ContentFormModal.tsx` 가 결정적 증거다.
`RichTextEditor` 로 HTML `body` 를 편집하고, 저장 시 `htmlToBlocks(html)` 로 `bodyBlocks` 를 **파생 생성**한다(line 222).

→ `cms_contents.bodyBlocks` 는 Gutenberg 편집기가 쓴 값이 아니다.
따라서 §3 의 `bodyBlocks` 2 행은 legacy editor 사용 근거가 되지 않는다.

---

## 5. Editor runtime 폐쇄성 — 소비처 census

`node scripts/quality/check-literal-consumers.mjs --source <file>` (raw-source spec 포함 탐지) 결과.

| 파일 | 외부 소비처 | 판정 |
|---|---|---|
| `pages/editor/StandaloneEditor.tsx` | 0 (+ 내부 2: `EditorRouteWrapper`, `CPTContentEditorWrapper`) | 폐쇄 |
| `pages/editor/EditorRouteWrapper.tsx` | 0 (route 선언 2 곳만) | 폐쇄 |
| `utils/editor-runtime.ts` | 0 | 폐쇄 |
| `components/editor/BlockLibrary` | 0 | 폐쇄 |
| `components/editor/SlashCommandMenu` | 0 | 폐쇄 |
| `pages/appearance/TemplatePartEditor.tsx` | 0 | 폐쇄 |
| `pages/wordpress/ModuleRuntimeWrapper.tsx` | **0 (완전 고아)** | dead |
| `pages/preview/PostPreview.tsx` | 0 | 폐쇄 |
| `pages/pages/PageList.tsx` | 0 | 폐쇄 |
| `pages/posts/Posts.tsx` | 0 | 폐쇄 |
| `layouts/EditorLayout.tsx` | 1 (`/editor/*` 선언) | 폐쇄 |

### 5-1. 두 번째 소비처 — CPT Engine

`pages/cpt-engine/CPTContentEditorWrapper.tsx` 가 `StandaloneEditor mode="post"` 를 소비한다
(`pages/cpt-engine/index.tsx:28-29` → `content/:cptSlug/new`, `content/:cptSlug/:postId/edit`).

단 `custom_post_types` 프로덕션 row **0**, `/public/cpt/types` 응답 **빈 배열** → 실제 진입 대상이 0 이다.
**은퇴 WO 는 `/editor/*` 만 지우면 안 되고 CPT Engine 축을 함께 판정해야 한다.**

---

## 6. WordPress runtime(polyfill) census

`apps/admin-dashboard/src/utils/editor-runtime.ts` — `initializeWordPress()` 가 `window.wp`(`wp.domReady`, `wp.blocks` 등)를 주입한다.

소비처는 다음뿐이다.

1. `StandaloneEditor.tsx` — legacy editor 본체
2. `pages/wordpress/ModuleRuntimeWrapper.tsx` — **소비처 0 인 고아 파일**
3. `TemplatePartEditor` — `EditorRuntimeWrapper` 경유

→ WordPress polyfill 은 **legacy editor 전용**이며 다른 축이 `window.wp` 에 의존하지 않는다.

---

## 7. admin blocks 축 (`apps/admin-dashboard/src/blocks/**`)

**이 축만 살아 있는 소비 계약이 있다. 은퇴 대상에서 분리해야 한다.**

`blocks/index.ts` 의 literal 소비처 **35 건**:

| 분류 | 소비처 |
|---|---|
| ACTIVE_RUNTIME | `App.tsx:105-124` idle bootstrap — `registerAllBlocks()` 동적 import |
| ACTIVE_RUNTIME | `scripts/audit/check-block-registry.ts` (단, package.json / CI 미배선) |
| ACTIVE_UI | `DynamicRenderer.tsx` |
| RAW_SOURCE_CONTRACT | `apps/api-server/src/__tests__/registry-audit-missing-and-dangling-closure.spec.ts` |
| RAW_SOURCE_CONTRACT | `apps/api-server/src/__tests__/shortcode-domain-retirement.spec.ts` |

→ block 정의 레지스트리는 editor 화면과 **결합돼 있지 않다**. editor 를 지워도 살아남아야 하며,
반대로 editor 가 산다는 근거로도 쓸 수 없다.

---

## 8. `@o4o/block-renderer` 축 — **보존 대상 (은퇴 금지)**

editor 와 완전히 다른 축이다. 렌더 전용 공유 패키지이며 실사용 소비처가 다수다.

| 소비처 | 용도 |
|---|---|
| KPA `QrLandingPage` | QR 공개 랜딩 렌더 |
| KPA `StoreDirectContentPage` | 매장 직접 콘텐츠 렌더 |
| KPA `OperatorContentDetailPage` | 운영자 콘텐츠 상세 |
| `kpa-block-adapter` | 어댑터 |
| `forum-core` `ForumBlockRenderer` → `CommentSection` | 포럼 렌더 |
| `apps/api-server` | dependency |

**WO §13 대로 admin blocks 축과 분리 판정한다. `@o4o/block-renderer` 는 어떤 은퇴 범위에도 포함하지 않는다.**

---

## 9. Preview 축

| 컴포넌트 | 데이터원 | 판정 |
|---|---|---|
| `PostPreview` | `postApi.get(id)` → **404** + `BlockRenderer` | legacy — 동작 불가 |
| `ViewPreview` | `/api/v1/cms/public/view/{slug}` | **CMS V2 축 — 보존** |

### 9-1. 프로덕션 read-only smoke (§19)

`https://admin.neture.co.kr` 에 super_admin 계정으로 로그인. **콘텐츠 저장/수정 0 건.**

- 사이드바에 Posts / Pages / Editor / Appearance / CPT 항목 **없음** (§2 확인)
- `/editor/posts/new` → **redirect 없이 legacy WordPress 화면 그대로 렌더**
  - Add Block 패널 + Search blocks, Document Title, Document/Block inspector 탭
  - 패널: Status & visibility(Visibility public / Publish date / Stick to the top of the blog), Permalink(URL Slug), Categories, Tags, Featured image, Excerpt, Discussion(Allow comments / Allow pingbacks & trackbacks), 접근 제어
  - Categories 는 **"Loading categories..." 에서 멈춤**
  - 콘솔 에러 1 건: `GET https://api.neture.co.kr/api/v1/content/categories` → **404**
- `/editor/pages/new` → 동일하게 legacy 화면 렌더, redirect 없음 (page mode 라 Categories/Tags 패널만 미표시)
- `/home` 대시보드는 전량 mock 데이터("WordPress 5.8 테마 사용중" 표기 포함)

**즉 프로덕션에서 화면은 뜨지만 백엔드가 전부 404 라 저장·분류·발행 어느 것도 성립하지 않는다.**

### 9-2. 백엔드 실측 (프로덕션 curl)

`app.use('/api…')` 마운트 124 개 중 아래는 **마운트 자체가 없다.**

| endpoint | 응답 |
|---|---|
| `/api/posts` | 404 |
| `/api/v1/posts` | 404 |
| `/api/v1/content/posts` | 404 |
| `/api/v1/template-parts` | 404 |
| `/api/v1/content/categories` | 404 (§9-1 콘솔 에러) |
| `/api/v1/public/cpt/types` | `{"success":true,"data":[],"total":0}` |

---

## 10. Template / Pattern 축

- route `/editor/templates/:id`, `/editor/patterns/:id` 존재
- `content_templates` row **0**, block pattern 테이블 **부재**
- `TemplatePartEditor` 가 호출하는 `/template-parts` **404**, 메뉴 진입점 없음

→ **완전 dead.** 데이터·백엔드·진입점 3 요소가 모두 없다.

---

## 11. AI 연동 census

`StandaloneEditor` 가 물고 있는 AI/동적 블록 계열 의존:

| 모듈 | 성격 |
|---|---|
| `SimpleAIModal` | editor 내부 AI 모달 |
| `NewBlockRequestPanel` | 신규 블록 요청 패널 |
| `blockCodeGenerator` | 블록 코드 생성 |
| `compileComponent` | 런타임 컴파일 |
| `runtimeBlockRegistry` / `BlockDefinition` | 런타임 블록 등록 |

전부 `StandaloneEditor` 경유로만 도달하며 **외부 소비처 0**. O4O 의 canonical AI 진입점(편집기 보조 AI)은 `RichTextEditor` 축이므로 이 계열은 legacy editor 와 운명을 같이한다.

---

## 12. Styles / Utilities census

`App.tsx` 가 전역 import 하는 editor 계열 CSS:

`block-inserter.css` / `block-placeholder.css` / `block-selection.css` / `block-toolbar.css` / `inner-blocks.css` / `inspector-sidebar.css`
그리고 `StandaloneEditor` 가 import 하는 `styles/editor-animations.css`.

→ 전역 로드지만 실제 적용 대상은 legacy editor DOM 뿐이다. **본 WO 에서 삭제하지 않았다.**

---

## 13. 은퇴 후보 범위 (판정만 — 실행 금지)

은퇴 WO 가 작성될 경우 **포함 후보**:

| # | 대상 |
|---|---|
| 1 | `/editor/*` 6 route (`public.routes.tsx:99-139`) |
| 2 | `/gutenberg` route (`test.routes.tsx`) — §1-1 |
| 3 | `pages/editor/StandaloneEditor.tsx`, `EditorRouteWrapper.tsx`, `layouts/EditorLayout.tsx` |
| 4 | `utils/editor-runtime.ts` (WordPress polyfill) + `pages/wordpress/ModuleRuntimeWrapper.tsx`(고아) |
| 5 | `components/editor/**` (BlockLibrary, SlashCommandMenu 등) |
| 6 | `pages/appearance/TemplatePartEditor.tsx` + `/appearance/template-parts/*` route |
| 7 | `pages/preview/PostPreview.tsx` + `/admin/preview`, `/preview/posts/:id`, `/preview/pages/:id` |
| 8 | `pages/pages/PageList.tsx` + `/pages/*` route, `pages/posts/Posts.tsx` |
| 9 | AI/동적 블록 계열 (§11) |
| 10 | editor 전용 CSS (§12) |
| 11 | CPT Engine 축 (`CPTContentEditorWrapper` 등) — **별도 판정 필요**, 자동 포함 금지 |

**명시적 제외 (은퇴 금지)**:

| 대상 | 사유 |
|---|---|
| `@o4o/block-renderer` | 4+ 서비스 실사용 렌더 축 (§8) |
| `apps/admin-dashboard/src/blocks/**` + `blocks/index.ts` | 살아있는 소비 계약 35 건 (§7) |
| `@o4o/content-editor` `RichTextEditor` | canonical editor (§4) |
| `ViewPreview` + `/preview/:slug` | CMS V2 축 (§9) |
| `cms_contents` / `cms_content_slots` / `pages` / `views` 테이블 | DB 변경은 이 축 판정 범위 밖 |

---

## 14. UNKNOWN 항목

**0 건.**

WO 가 요구한 판정 축(route / 서비스 채택 / 저장 데이터 / canonical editor / runtime 폐쇄성 / WordPress runtime / admin blocks / block-renderer / preview / template·pattern / AI / styles)은 모두 코드·프로덕션 API·프로덕션 DB·브라우저 smoke 중 최소 2 개 이상의 독립 증거로 확정했다.

§13-11 의 CPT Engine 은 "별도 판정 필요"로 **범위를 분리**했다. 이는 미확정(UNKNOWN)이 아니라 다른 축이라는 확정 판정이다.

---

## 15. 최종 판정

```
LEGACY_EDITOR_RETIRE_READY
```

**근거 요약 (독립 증거 5 축이 모두 같은 방향):**

1. **백엔드 부재** — Post/Page 엔티티가 `6354e8755`(2025-12-11)에 제거됐고, 관련 endpoint 가 프로덕션에서 404 다. 마운트 자체가 없다.
2. **데이터 0** — `posts`/`post_revisions`/`custom_posts`/pattern 테이블 부재, `pages` 0, `content_templates` 0, `custom_post_types` 0.
3. **진입점 0** — 정적 메뉴에 없고, navigation API 는 빈 배열 stub 이며, CPT 동적 주입도 0. URL 직접 입력으로만 도달한다.
4. **소비처 0** — editor 계열 11 개 파일 전부 raw-source 포함 외부 소비처 0 (`ModuleRuntimeWrapper` 는 완전 고아).
5. **canonical 대체 완료** — 현행 콘텐츠 편집은 `RichTextEditor` + `cms_contents` 축이며, `bodyBlocks` 조차 `htmlToBlocks` 파생 산출물이다.

**단서:** 화면은 프로덕션에서 여전히 렌더되므로(§9-1) "이미 죽어서 안 보인다"가 아니라 **"보이지만 아무 것도 저장되지 않는 껍데기"** 다. `admin` 권한 보유자가 URL 을 알면 접근 가능하고, `/gutenberg` 는 그보다 약한 가드로 노출돼 있다(§1-1).

**본 WO 에서는 삭제·수정을 일절 수행하지 않았다.** 실제 은퇴는 §13 범위표를 근거로 별도 WO 에서 진행한다.
