/**
 * WO-O4O-LEGACY-WORDPRESS-BLOCK-EDITOR-DOMAIN-RETIREMENT-V1
 *   — legacy WordPress(Gutenberg) block editor 도메인 은퇴 계약 테스트 (재도입 방지)
 *
 * 판정 근거
 * ---------------------------------------------------------------
 *   선행 census (`WO-O4O-LEGACY-WORDPRESS-BLOCK-EDITOR-DOMAIN-CENSUS-V1`) 가
 *   backend Post/Page 엔티티 제거(`6354e8755`) 이후 관련 endpoint 전부 404 ·
 *   저장 데이터 0 · 메뉴 진입점 0 · 외부 소비처 0 · canonical 대체 완료(RichTextEditor)
 *   를 확정하고 `LEGACY_EDITOR_RETIRE_READY` 로 닫았다.
 *   이 WO 는 그 판정을 실행해 editor 축을 제거했다.
 *
 *   교체가 아니라 은퇴다. 호환 shim · legacy editor fallback 은 만들지 않았다.
 *   허용 결과는 404 또는 canonical redirect 뿐이다.
 *
 * 고정하는 계약
 * ---------------------------------------------------------------
 *   1. `/editor/*` route 선언 0 · `/gutenberg` route 선언 0
 *   2. legacy editor 파일 부재 (StandaloneEditor · EditorRouteWrapper · EditorLayout 등)
 *   3. WordPress runtime polyfill(`initializeWordPress` · `window.wp`) 진입점 0
 *   4. legacy PostPreview 축 부재 — CMS V2 `ViewPreview` / `/preview/:slug` 는 보존
 *   5. legacy editor 전용 CSS 전역 import 0
 *   6. 보존 대상(canonical) 은 그대로 존재한다 — blocks 레지스트리 · block-renderer ·
 *      content-editor(RichTextEditor) · CPT Engine 본체
 *
 * 스크립트를 실행하지 않고 raw-source 로 단언한다. DB · 네트워크 접근 0.
 */
import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');

const abs = (rel: string) => path.join(REPO_ROOT, ...rel.split('/'));
const exists = (rel: string) => fs.existsSync(abs(rel));
const read = (rel: string) => fs.readFileSync(abs(rel), 'utf-8');

const ADMIN_SRC = 'apps/admin-dashboard/src';

/** 은퇴로 제거된 legacy editor 파일들. */
const REMOVED_FILES = [
  `${ADMIN_SRC}/pages/editor/StandaloneEditor.tsx`,
  `${ADMIN_SRC}/pages/editor/EditorRouteWrapper.tsx`,
  `${ADMIN_SRC}/layouts/EditorLayout.tsx`,
  `${ADMIN_SRC}/utils/editor-runtime.ts`,
  `${ADMIN_SRC}/pages/preview/PostPreview.tsx`,
  `${ADMIN_SRC}/pages/appearance/TemplatePartEditor.tsx`,
  `${ADMIN_SRC}/pages/cpt-engine/CPTContentEditorWrapper.tsx`,
  `${ADMIN_SRC}/pages/pages/PageList.tsx`,
  `${ADMIN_SRC}/pages/pages/PagesRouter.tsx`,
  `${ADMIN_SRC}/components/editor/O4OBlockEditor.tsx`,
  `${ADMIN_SRC}/components/editor/EditorSidebar.tsx`,
  `${ADMIN_SRC}/components/editor/EditorRuntimeWrapper.tsx`,
  `${ADMIN_SRC}/components/editor/BlockInserter.tsx`,
  `${ADMIN_SRC}/components/editor/SlashCommandMenu.tsx`,
  `${ADMIN_SRC}/components/editor/NewBlockRequestPanel.tsx`,
  `${ADMIN_SRC}/components/editor/hooks/useGutenbergEditor.ts`,
  `${ADMIN_SRC}/components/editor/hooks/useEditorUI.ts`,
  `${ADMIN_SRC}/components/editor/hooks/useBlockSelection.ts`,
  `${ADMIN_SRC}/components/editor/hooks/useSlashCommands.ts`,
  `${ADMIN_SRC}/components/editor/hooks/useDragAndDrop.ts`,
  `${ADMIN_SRC}/components/editor/hooks/useBlockCallbacks.ts`,
  `${ADMIN_SRC}/components/editor/editor-shell/EditorShell.tsx`,
  `${ADMIN_SRC}/components/editor/header/EditorHeader.tsx`,
  `${ADMIN_SRC}/components/inspector/InspectorSidebar.tsx`,
];

/** 은퇴로 제거된 legacy editor 전용 CSS. */
const REMOVED_STYLES = [
  `${ADMIN_SRC}/styles/block-inserter.css`,
  `${ADMIN_SRC}/styles/block-placeholder.css`,
  `${ADMIN_SRC}/styles/block-selection.css`,
  `${ADMIN_SRC}/styles/block-toolbar.css`,
  `${ADMIN_SRC}/styles/inner-blocks.css`,
  `${ADMIN_SRC}/styles/inspector-sidebar.css`,
  `${ADMIN_SRC}/styles/editor-animations.css`,
];

/** 은퇴 대상이 아닌 canonical 자산. 함께 지워지지 않았음을 고정한다. */
const PRESERVED_FILES = [
  `${ADMIN_SRC}/blocks/index.ts`,
  `${ADMIN_SRC}/pages/preview/ViewPreview.tsx`,
  `${ADMIN_SRC}/pages/cms/contents/ContentFormModal.tsx`,
  `${ADMIN_SRC}/pages/cpt-engine/index.tsx`,
  `${ADMIN_SRC}/pages/cpt-engine/CPTDashboardToolset.tsx`,
  'packages/block-renderer/package.json',
  'packages/content-editor/package.json',
  'scripts/audit/check-block-registry.ts',
];

describe('1. legacy editor route 선언이 0 이다', () => {
  it('public.routes.tsx 에 /editor/* route 선언이 없다', () => {
    const src = read(`${ADMIN_SRC}/routes/public.routes.tsx`);
    expect(src).not.toContain('path="/editor/*"');
    expect(src).not.toContain('<EditorLayout>');
    expect(src).not.toContain('<EditorRouteWrapper');
  });

  it('test.routes.tsx 에 /gutenberg route 선언이 없다', () => {
    const src = read(`${ADMIN_SRC}/routes/test.routes.tsx`);
    expect(src).not.toContain('path="/gutenberg"');
    expect(src).not.toContain('<EditorRouteWrapper');
  });

  it('appearance.routes.tsx 에 TemplatePartEditor route 선언이 없다', () => {
    const src = read(`${ADMIN_SRC}/routes/appearance.routes.tsx`);
    expect(src).not.toContain('<TemplatePartEditor');
    expect(src).not.toContain("path=\"/appearance/template-parts/new\"");
  });

  it('cpt-engine 이 legacy editor bridge 를 route 로 걸지 않는다', () => {
    const src = read(`${ADMIN_SRC}/pages/cpt-engine/index.tsx`);
    expect(src).not.toContain('<CPTContentEditorWrapper');
  });
});

describe('2. legacy editor 파일이 부재한다', () => {
  it.each(REMOVED_FILES)('%s — 존재하지 않는다', (rel) => {
    expect(exists(rel)).toBe(false);
  });

  it('pages/editor 디렉터리 자체가 없다', () => {
    expect(exists(`${ADMIN_SRC}/pages/editor`)).toBe(false);
  });

  it('components/inspector 디렉터리 자체가 없다', () => {
    expect(exists(`${ADMIN_SRC}/components/inspector`)).toBe(false);
  });
});

describe('3. WordPress runtime polyfill 진입점이 0 이다', () => {
  it('admin-dashboard src 에 initializeWordPress 선언·호출이 없다', () => {
    const hits = walk(abs(ADMIN_SRC)).filter((file) =>
      /\.(ts|tsx)$/.test(file) && fs.readFileSync(file, 'utf-8').includes('initializeWordPress')
    );
    expect(hits).toEqual([]);
  });

  it('admin-dashboard src 에 wp.domReady 사용이 없다', () => {
    const hits = walk(abs(ADMIN_SRC)).filter((file) =>
      /\.(ts|tsx)$/.test(file) && fs.readFileSync(file, 'utf-8').includes('wp.domReady')
    );
    expect(hits).toEqual([]);
  });
});

describe('4. legacy PostPreview 축이 부재하고 CMS V2 preview 는 보존된다', () => {
  it('public.routes.tsx 에 PostPreview 참조가 없다', () => {
    const src = read(`${ADMIN_SRC}/routes/public.routes.tsx`);
    expect(src).not.toContain('<PostPreview');
    expect(src).not.toContain("import('@/pages/preview/PostPreview')");
  });

  it('/preview/:slug + ViewPreview 는 그대로 선언돼 있다', () => {
    const src = read(`${ADMIN_SRC}/routes/public.routes.tsx`);
    expect(src).toContain('path="/preview/:slug"');
    expect(src).toContain('<ViewPreview />');
  });
});

describe('5. legacy editor 전용 CSS 가 부재하고 전역 import 도 0 이다', () => {
  it.each(REMOVED_STYLES)('%s — 존재하지 않는다', (rel) => {
    expect(exists(rel)).toBe(false);
  });

  it('App.tsx 가 legacy editor CSS 를 import 하지 않는다', () => {
    const src = read(`${ADMIN_SRC}/App.tsx`);
    for (const name of [
      'block-inserter.css',
      'block-placeholder.css',
      'block-selection.css',
      'block-toolbar.css',
      'inner-blocks.css',
      'inspector-sidebar.css',
    ]) {
      expect(src).not.toContain(name);
    }
  });
});

describe('6. canonical 보존 대상이 그대로 존재한다', () => {
  it.each(PRESERVED_FILES)('%s — 존재한다', (rel) => {
    expect(exists(rel)).toBe(true);
  });

  it('blocks 레지스트리 bootstrap 이 App.tsx 에 남아 있다', () => {
    const src = read(`${ADMIN_SRC}/App.tsx`);
    expect(src).toContain('registerAllBlocks');
  });
});

describe('7. 후속 은퇴 잔여물 정리 계약 (WO-O4O-POST-LEGACY-EDITOR-API-BUILD-AND-ORPHAN-RESIDUE-CLEANUP-V1)', () => {
  it('contentApi 에 Posts · Pages 계열 메서드가 없다', () => {
    const src = read(`${ADMIN_SRC}/api/contentApi.ts`);
    for (const method of [
      'getPosts', 'getPost', 'createPost', 'updatePost', 'deletePost', 'clonePost',
      'bulkUpdatePosts', 'bulkDeletePosts', 'getPostPreview', 'savePostDraft',
      'getPostRevisions', 'restorePostRevision',
      'getPages', 'getPage', 'createPage', 'updatePage', 'deletePage', 'clonePage',
      'bulkUpdatePages', 'bulkDeletePages', 'savePageDraft', 'getPagePreview',
      'getPageRevisions', 'restorePageRevision', 'getPageTree',
    ]) {
      expect(src).not.toContain(`static async ${method}(`);
    }
  });

  it('contentApi · unified-client 가 /content/posts · /content/pages 를 호출하지 않는다', () => {
    for (const rel of [`${ADMIN_SRC}/api/contentApi.ts`, `${ADMIN_SRC}/api/unified-client.ts`]) {
      const src = stripComments(read(rel));
      expect(src).not.toContain('/content/posts');
      expect(src).not.toContain('/content/pages');
    }
  });

  it('contentApi 의 media 계열(살아있는 공유 API)은 보존된다', () => {
    const src = read(`${ADMIN_SRC}/api/contentApi.ts`);
    for (const method of ['getMediaFiles', 'uploadFiles', 'updateMediaFileContent']) {
      expect(src).toContain(`static async ${method}(`);
    }
  });

  it('vite.config.ts 에 legacy editor manualChunks 분기가 없다', () => {
    const src = stripComments(read('apps/admin-dashboard/vite.config.ts'));
    for (const token of [
      'page-gutenberg', 'page-template-editor',
      'GutenbergEditor', 'WordPressBlockEditor', 'WordPressEditor', 'TemplatePartEditor',
    ]) {
      expect(src).not.toContain(token);
    }
  });

  it('admin-dashboard package.json description 에 legacy editor 문구가 없다', () => {
    const pkg = JSON.parse(read('apps/admin-dashboard/package.json')) as { description?: string };
    expect(pkg.description ?? '').not.toMatch(/StandaloneEditor|ParagraphTestBlock|WordPress/i);
  });

  it.each([
    `${ADMIN_SRC}/components/ag/AGTable.tsx`,
    `${ADMIN_SRC}/components/ui/scroll-area.tsx`,
    `${ADMIN_SRC}/components/GlobalStyleInjector.tsx`,
    `${ADMIN_SRC}/hooks/useCustomizerSettings.ts`,
    `${ADMIN_SRC}/hooks/useThemeSettings.ts`,
    `${ADMIN_SRC}/hooks/useThemeTokens.ts`,
    `${ADMIN_SRC}/utils/permissions.ts`,
    `${ADMIN_SRC}/utils/token-debug.ts`,
    `${ADMIN_SRC}/types/dashboard.ts`,
  ])('%s — orphan 으로 제거돼 존재하지 않는다', (rel) => {
    expect(exists(rel)).toBe(false);
  });

  it('side-effect import 로 살아있는 utils/aiMigration.ts 는 보존된다', () => {
    expect(exists(`${ADMIN_SRC}/utils/aiMigration.ts`)).toBe(true);
    expect(read(`${ADMIN_SRC}/App.tsx`)).toContain("import '@/utils/aiMigration'");
  });
});

describe('8. window.wp polyfill 축 은퇴 계약 (WO-O4O-WINDOW-WP-POLYFILL-RETIREMENT-V1)', () => {
  /**
   * 선행 census(`WO-O4O-WINDOW-WP-POLYFILL-RUNTIME-CENSUS-V1`)가
   * production runtime `typeof window.wp === "undefined"` · 소비처 전부 optional ·
   * `@wordpress/*` 의존성 0 을 실측해 `LEGACY_RETIRE_READY` 로 닫았고, 이 WO 가 실행했다.
   *
   * 기존 3번 describe 는 문자열 `wp.domReady` 만 검사해 optional chaining 표기
   * (`wp?.domReady`)를 놓쳤다. 여기서 그 사각지대를 함께 고정한다.
   *
   * 범위는 admin-dashboard 활성 소스로 한정한다. `packages/block-core` 는
   * consumer 0 orphan 패키지 문제이므로 별도 WO
   * (`WO-O4O-BLOCK-CORE-ORPHAN-PACKAGE-CENSUS-AND-RETIREMENT-V1`) 대상이며 제외한다.
   */
  const ADMIN_ROOT = 'apps/admin-dashboard';

  /** 검사 대상 = admin src(ts·tsx) + vite.config.ts + public/scripts 산출물. */
  function adminActiveSources(): string[] {
    const files = walk(abs(ADMIN_SRC)).filter((file) => /\.(ts|tsx)$/.test(file));
    files.push(abs(`${ADMIN_ROOT}/vite.config.ts`));
    for (const dir of ['public', 'scripts']) {
      const full = abs(`${ADMIN_ROOT}/${dir}`);
      if (fs.existsSync(full)) files.push(...walk(full).filter((f) => /\.(html|js|cjs|mjs)$/.test(f)));
    }
    return files;
  }

  it.each([
    ['window.wp'],
    ['globalThis.wp'],
    ['wp.domReady'],
    ['wp?.domReady'],
    ['wp.blocks'],
    ['@wordpress/'],
  ])('admin-dashboard 활성 소스에 %s 잔재가 없다', (needle) => {
    const hits = adminActiveSources()
      .filter((file) => stripComments(fs.readFileSync(file, 'utf-8')).includes(needle))
      .map((file) => path.relative(REPO_ROOT, file));
    expect(hits).toEqual([]);
  });

  it('polyfill 주입 스크립트 scripts/post-build.js 가 없다', () => {
    expect(exists(`${ADMIN_ROOT}/scripts/post-build.js`)).toBe(false);
  });

  it('WordPress CDN 로더 public/wordpress-cdn.html 이 없다', () => {
    expect(exists(`${ADMIN_ROOT}/public/wordpress-cdn.html`)).toBe(false);
  });

  it('initializeCustomBlocks 진입점이 0 이다', () => {
    const hits = adminActiveSources()
      .filter((file) => stripComments(fs.readFileSync(file, 'utf-8')).includes('initializeCustomBlocks'))
      .map((file) => path.relative(REPO_ROOT, file));
    expect(hits).toEqual([]);
  });

  it('canonical block registry 축은 보존된다', () => {
    const blocksIndex = read(`${ADMIN_SRC}/blocks/index.ts`);
    expect(blocksIndex).toContain('export function registerAllBlocks');
    expect(blocksIndex).toContain('export const CUSTOM_BLOCKS');
    expect(exists(`${ADMIN_SRC}/blocks/registry/BlockRegistry.ts`)).toBe(true);
    expect(exists(`${ADMIN_SRC}/blocks/registry/DynamicRenderer.tsx`)).toBe(true);
    expect(exists(`${ADMIN_SRC}/services/ai/block-registry-extractor.ts`)).toBe(true);
  });
});

/** 주석을 제거한다 — 은퇴 설명 주석이 계약 단언을 오탐시키지 않도록 한다. */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*/g, '');
}

/** 디렉터리 재귀 순회 — 테스트 전용 헬퍼. */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}
