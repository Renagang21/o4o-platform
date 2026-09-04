# WO-O4O-POST-LEGACY-EDITOR-API-BUILD-AND-ORPHAN-RESIDUE-CLEANUP-V1 — CHECK

- **작성일**: 2026-09-04
- **선행 WO**: `WO-O4O-LEGACY-WORDPRESS-BLOCK-EDITOR-DOMAIN-RETIREMENT-V1` (CHECK §7 잔여 부채)
- **판정**: `POST_LEGACY_EDITOR_RESIDUE_CLEANED`
- **범위**: legacy WordPress block editor 은퇴 직후 남은 **확정 dead residue 4축**
- **범위 밖**: `window.wp` polyfill 축 전체 → 후속 `WO-O4O-WINDOW-WP-POLYFILL-RUNTIME-CENSUS-V1`

---

## 1. 축 1 — `contentApi` dead Posts/Pages API

### 1-1. 판정 기준

메서드 단위로 **(a) 프론트 소비처 0** 과 **(b) 대응 backend endpoint 미마운트** 를
**둘 다** 만족할 때만 `DEAD_FRONTEND_API_RESIDUE` 로 판정해 제거했다.

### 1-2. 소비처 census (조건 a)

저장소 전체 `ContentApi.` 호출 = **3 파일 · 5 call site, 전부 media 계열**

| 소비처 | 호출 |
|---|---|
| `apps/admin-dashboard/src/components/editor/blocks/shared/MediaSelector.tsx:154, 322` | `getMediaFiles` · `uploadFiles` |
| `apps/admin-dashboard/src/components/editor/blocks/shared/FileSelector.tsx:207, 521` | `getMediaFiles` · `uploadFiles` |
| `apps/admin-dashboard/src/components/editor/blocks/MarkdownBlock.tsx:283` | `updateMediaFileContent` |

그 외 저장소의 `*ContentApi` 식별자(`hubContentApi` · `publicContentApi` · `storeContentApi` ·
`directContentApi` · `globalContentApi` · `handledProductContentApi`)는 **다른 API 객체**이며
`ContentApi` 클래스와 무관하다.

raw-source 소비처: `check-literal-consumers.mjs --source apps/admin-dashboard/src/api/contentApi.ts`
→ **살아있는 소비처 합계 0건** (히트는 CHECK/IR 문서 = HISTORICAL_DOC).

### 1-3. backend mount census (조건 b)

`apps/api-server/src/bootstrap/register-routes.ts` 에서 `/api/v1/content/*` mount 는 **2개뿐**이다.

```text
:1000  app.use('/api/v1/content/assets', contentAssetsRoutes)
:1009  app.use('/api/v1/content/templates', createContentTemplateRoutes(dataSource))
```

`/content/posts` · `/content/pages` 라우터는 존재하지 않는다(backend Post/Page 엔티티 제거
`6354e8755` 이후). `unifiedApi.raw` 의 baseURL 은 `.../api` 이고 `unifiedApi.content.*` 는
`/v1` 을 붙이므로, 어느 경로로도 **404** 다.

### 1-4. 메서드별 판정

| 그룹 | 메서드 | 판정 | 조치 |
|---|---|---|---|
| Posts | `getPosts` `getPost` `createPost` `updatePost` `deletePost` `clonePost` `bulkUpdatePosts` `bulkDeletePosts` `getPostPreview` `savePostDraft` `getPostRevisions` `restorePostRevision` (12) | `DEAD_FRONTEND_API_RESIDUE` | 제거 |
| Pages | `getPages` `getPage` `createPage` `updatePage` `deletePage` `clonePage` `bulkUpdatePages` `bulkDeletePages` `savePageDraft` `getPagePreview` `getPageRevisions` `restorePageRevision` `getPageTree` (13) | `DEAD_FRONTEND_API_RESIDUE` | 제거 |
| Media | `getMediaFiles` `uploadFiles` `updateMediaFileContent` | `ACTIVE_SHARED_API` | 보존 |
| Media(나머지) · Category · Tag · Menu · Template · FieldGroup · 유틸 | `getMediaFile` `updateMediaFile` `deleteMediaFile` `bulkDeleteMediaFiles` `getMediaFolders` … `getContentStats` | `UNKNOWN` | 보존 |

`UNKNOWN` = 프론트 소비처는 0 이지만 **대응 backend endpoint 제거가 확인되지 않은** 메서드다.
조건 (b) 를 만족하지 않으므로 이번 WO 에서 건드리지 않는다 (WO 명시 보존 대상과 일치).

### 1-5. 파생 정리 — `unified-client.ts`

`ContentApi` Posts 계열 제거로 `unifiedApi.content.posts` 블록(list/get/create/update/delete)의
소비처가 **0** 이 됐고, 서버에도 `/api/v1/content/posts` mount 가 없다 → 같은 판정
`DEAD_FRONTEND_API_RESIDUE` 로 제거했다. `content.categories` · `content.media` ·
`content.authors` · `forum.posts` · `platform.*` 는 보존한다.
(선례: 같은 파일의 `ecommerce` 블록 제거 주석)

### 1-6. 결과

- `contentApi.ts` **472 → 341 lines**
- 사용처가 사라진 타입 import 정리: `Page` · `TipTapJSONContent` · `ContentFilters` 제거
  (`Post` · `PostType` · `PostStatus` 는 `searchContent` · `getContentStats` 가 계속 사용)
- 호환 shim · fallback **0**

---

## 2. 축 2 — `vite.config.ts` dead editor manualChunks

### 2-1. 제거한 분기

| 위치 | 내용 | 조치 |
|---|---|---|
| `manualChunks` | 주석 처리된 `page-template-editor`(TemplatePartEditor) 분기 | 제거 |
| `manualChunks` | 살아 있던 `page-gutenberg`(GutenbergEditor · WordPressBlockEditor) 분기 | 제거 |
| `manualChunks` | `wp-all` 조건에 섞여 있던 legacy editor 식별자 3종 | 제거 (`@wordpress` 조건만 유지 — 내부 분기가 어차피 `@wordpress` 일 때만 반환했으므로 동작 동일) |
| `modulePreload.resolveDependencies` | `!dep.includes('page-gutenberg')` 필터 | 제거 (생성되지 않는 chunk) |

`wp-all` chunk 규칙 자체와 `!dep.includes('wp-')` · `!dep.includes('@wordpress')` 필터는 보존했다.

### 2-2. chunk 비교 (프로덕션 build)

```text
before manualChunks matched editor branch = 0   (page-gutenberg / page-template-editor chunk 산출 0)
after  matched editor branch               = 0
before chunk 수 = 240
after  chunk 수 = 240
build output chunk regression = 0   (chunk 이름 집합 diff 없음 — 해시 제외 비교)
build exit code = 0
```

세 파일(`GutenbergEditor` · `WordPressBlockEditor` · `TemplatePartEditor`)이 선행 WO 에서
이미 은퇴해 **은퇴 직후 빌드에서도 매칭 chunk 가 0** 이었다. 따라서 이번 제거는 빌드 산출물에
영향이 없음이 실측으로 확인됐다.

---

## 3. 축 3 — 비-editor orphan 재조사

### 3-1. 판정 기준

`import graph 도달 0` **AND** `check-literal-consumers.mjs 살아있는 소비처 0` 을 **둘 다**
만족할 때만 제거했다.

### 3-2. 결과

| 파일 | import graph | literal consumer | 판정 |
|---|:---:|:---:|---|
| `src/components/ag/AGTable.tsx` | 도달 0 | 0건 | 제거 |
| `src/components/ui/scroll-area.tsx` | 도달 0 | 0건 | 제거 |
| `src/components/GlobalStyleInjector.tsx` | 도달 0 | 0건 | 제거 |
| `src/hooks/useCustomizerSettings.ts` | 도달 0 | 0건 | 제거 |
| `src/hooks/useThemeSettings.ts` | 도달 0 | 0건 | 제거 |
| `src/hooks/useThemeTokens.ts` | 도달 0 | 0건 | 제거 |
| `src/utils/permissions.ts` | 도달 0 | 0건 | 제거 |
| `src/utils/token-debug.ts` | 도달 0 | 0건 | 제거 |
| `src/types/dashboard.ts` | 도달 0 | 0건 | 제거 |
| `src/utils/aiMigration.ts` | **도달 O** | 0건 | **보존 (판정 정정)** |
| `src/blocks/variations/columns-variations.tsx` | 도달 0 | 0건 | **보존 (선행 WO §20 보존 결정 유지)** |

`GlobalStyleInjector` · `useThemeSettings` · `useThemeTokens` 는 `@o4o/appearance-system` 을
import 하지만 **admin-dashboard 내부 전용 파일이고 소비처가 0** 이므로 제거 대상이다.
공통 패키지 `@o4o/appearance-system` 자체는 건드리지 않았다.

### 3-3. 판정 정정 — `utils/aiMigration.ts`

선행 census 가 orphan 으로 분류했으나 **오탐**이었다. `App.tsx:19` 의
`import '@/utils/aiMigration';` 은 **side-effect import** 이고, census 분석기의 import 정규식이
`from '...'` · `import('...')` · `require('...')` 만 인식해 이 형태를 놓쳤다.
제거 후 프로덕션 build 가 `Could not load .../utils/aiMigration (imported by src/App.tsx)` 로
실패해 즉시 복원했다. 저장소 전체 side-effect import 재조사 결과 CSS 를 제외하면
이 1건과 `test/setup.ts` 의 `@testing-library/jest-dom` 뿐이며, 다른 9건은 영향이 없다.

---

## 4. 축 4 — `package.json` description

```diff
-  "description": "WordPress-style Admin Dashboard for O4O Platform - with ParagraphTestBlock and StandaloneEditor",
+  "description": "O4O Platform Admin Dashboard",
```

`version` · `scripts` · `dependencies` · lockfile **변경 0** (`git diff --stat` = 1 insertion / 1 deletion).

---

## 5. 은퇴 가드 spec 확장

**새 spec 파일을 만들지 않고** 기존
`apps/api-server/src/__tests__/legacy-wordpress-block-editor-retirement.spec.ts` 에
`describe('7. 후속 은퇴 잔여물 정리 계약 …')` 을 추가했다 (51 → 66 tests).

고정한 계약:

1. `contentApi` 에 Posts/Pages 계열 25 메서드 선언 0
2. `contentApi` · `unified-client` 가 `/content/posts` · `/content/pages` 를 호출 0 (주석 제외 비교)
3. `contentApi` 의 media 계열 3종(`ACTIVE_SHARED_API`) 보존
4. `vite.config.ts` 에 legacy editor manualChunks 식별자 0 (주석 제외 비교)
5. `package.json` description 에 legacy editor 문구 0
6. orphan 9건 부재
7. `utils/aiMigration.ts` 존재 + `App.tsx` side-effect import 유지 (재삭제 방지)

---

## 6. 검증 결과

| 항목 | 결과 |
|---|---|
| `pnpm run build:packages` | exit 0 |
| `pnpm --filter @o4o/admin-dashboard type-check` | **0 error** |
| `pnpm --filter @o4o/admin-dashboard test` (vitest) | **229 passed / 13 files** (baseline 동일) |
| `pnpm --filter @o4o/admin-dashboard build` | exit 0 · chunk 240 → 240 · **regression 0** |
| `npx jest src/__tests__` (api-server 전체) | **2249 passed / 119 suites** |
| `legacy-wordpress-block-editor-retirement.spec.ts` | **66 passed** |
| `shortcode-domain-retirement.spec.ts` | 28 passed |
| `npx tsx scripts/audit/check-block-registry.ts` | Total 32 · **Missing 0 · Dangling 0** |
| dangling import | 0 (프로덕션 build 성공이 곧 해소 증명) |

**중간 실패 기록 (숨기지 않음)**

1. axis 3 첫 시도에서 `utils/aiMigration.ts` 삭제 → build 실패 → 복원 (§3-3).
2. spec 확장 1차 작성에서 정규식 리터럴이 개행으로 깨져 suite 1건 실패 → `stripComments()`
   헬퍼로 재작성 후 통과.
3. spec 의 `vite.config.ts` 단언이 `modulePreload` 의 `page-gutenberg` 잔여 1줄을 잡아 실패 →
   해당 필터를 제거하고 통과.

---

## 7. 잔여 부채

| # | 항목 | 처리 |
|---|---|---|
| 1 | `window.wp` polyfill 축 (`scripts/post-build.js` · `blocks/index.ts` · `blocks/registry/BlockRegistry.ts` · `services/ai/block-registry-extractor.ts`) | 후속 `WO-O4O-WINDOW-WP-POLYFILL-RUNTIME-CENSUS-V1` |
| 2 | `apps/admin-dashboard/dist-node/apps/admin-dashboard/vite.config.js` — 추적되는 **stale build 산출물**. 제거한 editor 분기 텍스트가 남아 있다. 생성자는 `tsconfig.node.json`(`outDir: ./dist-node`), CI workflow 참조 0, vite 빌드는 `.ts` 원본을 읽으므로 런타임 영향 없음 | 이번 WO 권한 범위(=`vite.config.ts`) 밖이라 미변경. 별도 판단 필요 |
| 3 | `contentApi` 의 `UNKNOWN` 메서드군(category · tag · menu · template · field-group · 유틸) — 프론트 소비처 0 이나 backend mount 미확인 | 별도 census WO |
| 4 | `blocks/variations/columns-variations.tsx` — orphan 이지만 선행 WO 보존 결정 유지 | 블록 레지스트리 축 정리 시 함께 판단 |
| 5 | 임시 worktree 잔재 `C:/tmp/o4o-main-check-ff` · `C:/tmp/o4o-wp-editor-push` (git 등록 해제됨, 디렉터리만 잔존) | 파일시스템 정리 |

---

## 8. 문서 정합

발견 0건 / SUPERSEDED 표기 0건 / 링크 수정 0건 / 별도 WO 제안 0건 — **해당 없음**.
