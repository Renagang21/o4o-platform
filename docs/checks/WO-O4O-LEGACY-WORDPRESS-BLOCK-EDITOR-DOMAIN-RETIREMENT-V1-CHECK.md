# WO-O4O-LEGACY-WORDPRESS-BLOCK-EDITOR-DOMAIN-RETIREMENT-V1 — CHECK

> **최종 판정: `LEGACY_WORDPRESS_BLOCK_EDITOR_RETIRED`**
>
> - 실행일: 2026-09-04
> - 선행 문서: `docs/checks/WO-O4O-LEGACY-WORDPRESS-BLOCK-EDITOR-DOMAIN-CENSUS-V1-CHECK.md` (`4a29c4167`, 판정 `LEGACY_EDITOR_RETIRE_READY`)
> - 기준 origin/main: `7bf289c46`
> - 성격: **은퇴(retirement)**. 교체·호환 shim·fallback 을 만들지 않았다.

---

## 1. 실행 요약

| 항목 | 값 |
|---|---|
| 삭제 파일 | **97** |
| 수정 파일 | **9** (route 4 · CPT 2 · TemplateParts 1 · App.tsx 1 · 기존 spec 1) |
| 신규 파일 | **1** (은퇴 가드 spec) |
| runtime route 신설 | 0 |
| compatibility layer 신설 | **0** |
| dependency 변경 | **0** |
| package.json / lockfile 변경 | **0** |
| DB write · migration | **0** |
| production config 변경 | **0** |

---

## 2. 제거한 진입점 (route 축)

| 진입점 | 이전 | 이후 |
|---|---|---|
| `/editor/posts/new` · `/editor/posts/:id` · `/editor/pages/new` · `/editor/pages/:id` · `/editor/templates/*` · `/editor/patterns/*` | `EditorLayout` → `EditorRouteWrapper` → `StandaloneEditor` | **route 선언 자체 제거 → 404** |
| `/gutenberg` | `EditorRouteWrapper` (약한 가드, 프로덕션 노출) | **route 선언 제거 → 404** |
| `/admin/preview` · `/preview/posts/:id` · `/preview/pages/:id` | `PostPreview` | **route 선언 제거 → 404** |
| `/appearance/template-parts/new` · `/:id/edit` | `TemplatePartEditor` | **route 선언 제거 → 404** |
| `/pages/*` | `PagesRouter` → `PageList` | **`/admin/cms/contents` canonical redirect** (기존 `/posts/*` 선례와 동일) |
| CPT `content/:cptSlug/new` · `content/:cptSlug/:postId/edit` | `CPTContentEditorWrapper` → `StandaloneEditor` | **route 선언 제거 → CPT `*` fallback (대시보드)** |

허용 결과는 **404 또는 canonical redirect** 뿐이며, 새 shim 은 만들지 않았다 (WO §30).

---

## 3. 삭제 목록 (97건, `apps/admin-dashboard/src` 기준)

**editor 진입 · 껍데기 (7)**
`pages/editor/StandaloneEditor.tsx` · `pages/editor/EditorRouteWrapper.tsx` · `layouts/EditorLayout.tsx` ·
`pages/preview/PostPreview.tsx` · `pages/appearance/TemplatePartEditor.tsx` ·
`pages/pages/PageList.tsx` · `pages/pages/PagesRouter.tsx`

**CPT bridge (1)** — `pages/cpt-engine/CPTContentEditorWrapper.tsx`
※ legacy editor 로 가는 bridge 전용 파일이며 다른 책임이 없다. **CPT Engine 본체는 보존**(WO §16·§17).

**editor 컴포넌트 (25 + editor-shell 4 + header 5 + hooks 10 + keyboard 6)**
`components/editor/**` — `O4OBlockEditor` · `EditorSidebar` · `EditorRuntimeWrapper` · `BlockInserter` ·
`SlashCommandMenu` · `NewBlockRequestPanel` · `AIChatPanel` · `ContentTemplates` · `EditorModals` ·
`ViewportSwitcher` · `BlockListItem` · `BlockSettingsRenderer` · `DesignLibraryModalImproved` ·
`*BlockSettings` 5종 · `editor-shell/**` · `header/**` · `hooks/**` · `hooks/keyboard/**` ·
`types/editor.ts` · `utils/clipboard-utils.ts` · `components/Toast.tsx` · `REFACTORING.md`

**inspector (15)** — `components/inspector/**` 전체 (`InspectorSidebar` · `block-settings/**` · `controls/**`)

**editor runtime / 유틸 (4)** — `utils/editor-runtime.ts` · `utils/block-icons.tsx` · `utils/block-manager.ts` · `utils/history-manager.ts`

**editor 전용 AI (7)** — `components/ai/{BlockAIModal,PageImproveModal,SectionAIModal}.tsx` ·
`services/ai/{BlockAIGenerator,ConversationalAI,PageAIImprover,SectionAIGenerator}.ts`

**runtime block loader (2)** — `blocks/runtime/runtime-block-registry.ts` · `blocks/runtime/runtime-code-loader.ts`
※ WO §18 에 `runtimeBlockRegistry` 로 명시된 축. `blocks/index.ts` · `blocks/registry/**` · `blocks/variations/**` 는 보존.

**editor 전용 CSS (9)** — `styles/{block-inserter,block-placeholder,block-selection,block-toolbar,inner-blocks,inspector-sidebar,editor-animations,editor,gutenberg-inserter}.css`
※ `App.tsx` 의 전역 import 6줄도 함께 제거.

**기타 (1)** — `components/PostAccessControl.tsx` (legacy Post 편집 화면 전용)

---

## 4. 보존 확인 (WO §20~§23)

| 보존 대상 | 상태 |
|---|---|
| `apps/admin-dashboard/src/blocks/**` (32 정의) | 보존 · registry audit **Missing 0 / Dangling 0** |
| `@o4o/block-renderer` · `DynamicRenderer` | 보존 |
| `@o4o/content-editor` · `RichTextEditor` (canonical 저작 축) | 보존 |
| `ViewPreview` · `/preview/:slug` · `/api/v1/cms/public/view/{slug}` | 보존 |
| `cms_contents` 및 관련 DB | **미접촉** (write 0 · migration 0) |
| `ContentFormModal` · `htmlToBlocks` | 보존 |
| `scripts/audit/check-block-registry.ts` + block registry raw-source spec | 보존 · PASS |
| CPT Engine 본체 (대시보드 · 타입 · 필드그룹 · 택소노미 · 폼 · 도구 · 콘텐츠 목록) | 보존 |
| `TemplateParts` 목록 화면 | 보존 (편집 진입만 제거) |

---

## 5. 소비처 census — 삭제 후 (WO §24)

raw-source 문자열 전수 재검색 (`apps` · `packages` · `services` · `scripts`).

| literal | 살아있는 소비처 | 비고 |
|---|:---:|---|
| `/editor/posts` · `/editor/pages` · `/editor/templates` · `/editor/patterns` | **0** | — |
| `/gutenberg` | **0** | — |
| `StandaloneEditor` | **0** | 잔여 hit 3 = 은퇴 가드 spec · 제거 주석 · `package.json` description (아래 §7-1) |
| `EditorRouteWrapper` · `EditorLayout` | **0** | 잔여 hit = 가드 spec · 제거 주석 |
| `initializeWordPress` | **0** | — |
| `PostPreview` (legacy admin 축) | **0** | 잔여 hit = 무관한 동명 로컬 컴포넌트(`web-kpa-branch` · `forum-core`) · `BlogPostPreview` 타입 · `contentApi.getPostPreview`(§7-3) |
| `TemplatePartEditor` | **0** | 잔여 hit = 이미 주석 처리된 `vite.config.ts` manualChunks (§7-2) |
| `window.wp` · `wp.domReady` | **보존 판단** | §6 참조 |

`check-literal-consumers.mjs` 결과: `StandaloneEditor` · `EditorLayout` · `PostPreview` · `TemplatePartEditor` · `editor-runtime` · `public.routes` 모두 **살아있는 소비처 합계 0건** (HISTORICAL_DOC 만 잔존).

import graph 재계산: 삭제 후 unreachable 파일 29건 — 전부 **의도적 보존 대상 또는 이번 WO 이전부터 존재하던 orphan** (§7-4).

---

## 6. WordPress runtime polyfill — 보존 판단 (WO §33)

`apps/admin-dashboard/scripts/post-build.js` 가 빌드 산출물에 `window.wp.*` polyfill 을 주입한다.

- `apps/admin-dashboard/src` 안의 **`@wordpress/*` import 는 0건**이다.
- 그러나 polyfill 을 읽는 코드가 **보존 축(`blocks/**`)** 에 남아 있다:
  - `blocks/index.ts` — `window.wp?.domReady` (fallback 있음)
  - `blocks/registry/BlockRegistry.ts` — `window.wp?.blocks?.registerBlockType` (optional)
  - `services/ai/block-registry-extractor.ts` — `window.wp?.blocks?.getBlockTypes` (하위 호환)

WO §33 은 "WordPress runtime 을 **unrelated active feature** 가 사용" 하는 경우를 중지 조건으로 둔다.
여기서는 **보존 대상인 blocks registry** 가 읽고 있으므로 **확정 dead 가 아니다** → polyfill 과 그 소비 3곳은 **보존**하고 잔여 부채로 보고한다(§7-5). 또한 `post-build.js` 수정은 build 인프라 변경(CLAUDE.md 중지 조건)에 해당한다.

`initializeWordPress` · `wordpress-initializer` · `wordpress-dynamic-loader` 등 **editor 전용 runtime 초기화 경로는 0** 이다.

---

## 7. 잔여 부채 (이번 WO 범위 밖 · 별도 WO 후보)

1. **`apps/admin-dashboard/package.json` description** — `"... with ParagraphTestBlock and StandaloneEditor"` 문구가 남아 있다.
   CLAUDE.md 중지 조건(`package.json 변경 필요`)에 걸려 **수정하지 않았다.** 문구 정리만 필요한 무해 잔재.
2. **`apps/admin-dashboard/vite.config.ts` manualChunks** — 이미 주석 처리된 `TemplatePartEditor` 분기와,
   존재하지 않는 `GutenbergEditor` / `WordPressBlockEditor` 를 가리키는 살아있는 분기가 남아 있다.
   build 인프라 변경이라 **손대지 않았다.** (`dist-node/` 에 tracked 사본이 있어 함께 갱신 필요)
3. **`apps/admin-dashboard/src/api/contentApi.ts`** — `getPostPreview()` 등 제거된 backend `/content/posts/*`
   endpoint 를 호출하는 dead 메서드가 남아 있다(`getPostPreview` 소비처 0). 다만 `contentApi` 자체는
   보존 대상 block 컴포넌트(`MediaSelector` 등)가 media 용도로 import 하므로, **legacy posts API 전반 정리**로
   따로 다루는 것이 맞다.
4. **비-editor orphan 11건** — `components/ag/AGTable.tsx` · `components/ui/scroll-area.tsx` ·
   `components/GlobalStyleInjector.tsx` · `hooks/{useCustomizerSettings,useThemeSettings,useThemeTokens}.ts` ·
   `utils/{permissions,token-debug,aiMigration}.ts` · `types/dashboard.ts`.
   editor 도메인이 아니므로 **범위 외로 두었다.** (`blocks/variations/columns-variations.tsx` 는 §20 보존 대상)
5. **`window.wp` polyfill 축** — §6 판단에 따라 보존. blocks registry 의 WP 호환 분기를 걷어내는
   별도 WO 에서 polyfill · `post-build.js` · 소비 3곳을 한 번에 정리하는 것이 안전하다.
6. **빈 디렉터리** — `pages/wordpress/` · `pages/posts/` 는 선행 WO 에서 이미 비워졌다(census drift).

---

## 8. 검증 결과

| 검증 | 명령 | 결과 |
|---|---|---|
| 은퇴 가드 spec | `jest legacy-wordpress-block-editor-retirement.spec.ts` | **PASS 51/51** |
| 기존 raw-source spec 10종 | `jest` (b2b · shortcode 외) | **PASS 285/285** |
| shortcode 은퇴 spec | `jest shortcode-domain-retirement.spec.ts` | **PASS 28/28** (§9 참조) |
| admin-dashboard 타입체크 | `pnpm --filter @o4o/admin-dashboard type-check` | **PASS (0 error)** |
| admin-dashboard 단위 테스트 | `vitest run` | **PASS 229/229 · 13 파일** |
| admin-dashboard 프로덕션 빌드 | `pnpm --filter @o4o/admin-dashboard build` | **PASS (exit 0)** |
| block registry audit | `tsx scripts/audit/check-block-registry.ts` | **정의 32 / 등록 32 / Missing 0 / Dangling 0** |
| dangling import 스캔 | `rg` (삭제 97파일 경로 전수) | **0건** |

정리 대상 legacy editor 테스트는 **0건**이었다 (WO §25).

---

## 9. 교차 WO 영향 1건

`apps/api-server/src/__tests__/shortcode-domain-retirement.spec.ts` 가
`apps/admin-dashboard/src/utils/block-icons.tsx` 를 **읽어서** shortcode 문자열 부재를 단언했는데,
이번 WO 에서 해당 파일이 삭제되며 `ENOENT` 로 실패했다.

→ **파일 부재는 "shortcode 매핑 0" 을 더 강하게 만족**하므로, 해당 루프에 `exists()` 가드 1줄만 추가했다.
단언 의미·다른 케이스는 그대로다.

---

## 10. Git

- 작업 worktree: `C:/tmp/o4o-wp-editor-retire` (branch `work/o4o-legacy-wp-editor-retirement-v1`)
- 공유 worktree `c:\Users\home\coding\o4o-platform` (다른 세션 dirty) **미접촉**
- `git add .` 0 / autostash 0 / rebase 0 / `--amend` 0 / force push 0 / foreign staged 변경 0
- 정확한 파일 목록 pathspec staging → `check-staged-scope.mjs` PASS → pathspec commit

### 잔여물 (WO §32)

`C:/tmp/o4o-main-check-ff` — 선행 세션의 임시 worktree.
`git worktree list --porcelain` **미등록**(git 인지 밖)이며 `rm -rf` 는 권한 거부로 실패했다.
WO §32 에 따라 **filesystem 잔여물로만 보고**하며 은퇴 완료를 막지 않는다.

---

## 11. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 5건 (§7-1 ~ §7-5)
