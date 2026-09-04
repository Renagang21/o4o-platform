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

/** 디렉터리 재귀 순회 — 테스트 전용 헬퍼. */
function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}
