/**
 * 내 매장 AI First — 공통 편집기 내부 AI 경계 계약 (Source Contract)
 *
 * WO-O4O-STORE-AI-FIRST-EDITOR-BOUNDARY-V1
 *
 * 고정하는 것:
 *   (A) 공통 capability — ContentEditorProps.showInternalAi 존재 · RichTextEditor 기본 true ·
 *       Toolbar 전달 · Toolbar 의 "AI 정리" 버튼과 AiContentModal 이 모두 showInternalAi 조건.
 *   (B) Store 소비처 — 활성 Store-facing RichTextEditor 소비처는 예외 없이 showInternalAi={false}.
 *       공유 셸(ProductionMaterialEditorShell = Store 전용 · TabletContentStepBuilder = passthrough)도 포함.
 *   (C) 하위호환 — 비Store 대표 소비처는 prop 을 지정하지 않는다(기본 true 유지 = 기존 AI 정리 동작 보존).
 *
 * web 서비스·UI 패키지에는 DOM test runner 가 없다(dependency 추가 = 중지 조건) → 저장소 관례대로
 * api-server jest 에서 소스 텍스트 계약으로 고정한다.
 */

import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

const TYPES = 'packages/content-editor/src/types.ts';
const RTE = 'packages/content-editor/src/components/RichTextEditor.tsx';
const TOOLBAR = 'packages/content-editor/src/components/Toolbar.tsx';

/** 활성 Store-facing RichTextEditor 직접 소비처 (fresh census 2026-09-18, main 1af2abdc4 기준) */
const STORE_DIRECT_CONSUMERS = [
  // KPA Store (/store/*)
  'services/web-kpa-society/src/pages/pharmacy/CreateContentFromResourcesModal.tsx',
  'services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx',
  'services/web-kpa-society/src/pages/pharmacy/PharmacyPopPage.tsx',
  'services/web-kpa-society/src/pages/pharmacy/ProductionMaterialEditorPage.tsx',
  'services/web-kpa-society/src/pages/pharmacy/StoreContentEditPage.tsx',
  'services/web-kpa-society/src/pages/pharmacy/StoreDirectContentPage.tsx',
  'services/web-kpa-society/src/pages/pharmacy/StoreLocalProductsPage.tsx',
  'services/web-kpa-society/src/pages/pharmacy/StoreProductDescriptionsPage.tsx',
  'services/web-kpa-society/src/pages/pharmacy/StoreProductMultilingualContentPage.tsx',
  'services/web-kpa-society/src/pages/pharmacy/StoreQrAiDescriptionPage.tsx',
  // K-Cosmetics Store (/store/*)
  'services/web-k-cosmetics/src/pages/store/StoreBlogManagePage.tsx',
  'services/web-k-cosmetics/src/pages/store/StorePopStaffPage.tsx',
  'services/web-k-cosmetics/src/pages/store/StoreProductDescriptionsPage.tsx',
  // PharmacyHub Store (/store-owner/*)
  'services/web-pharmacy-hub/src/pages/store-owner/BlogEditorPage.tsx',
  'services/web-pharmacy-hub/src/pages/store-owner/ContentPage.tsx',
  'services/web-pharmacy-hub/src/pages/store-owner/LibraryResourcesPage.tsx',
  'services/web-pharmacy-hub/src/pages/store-owner/PopPage.tsx',
  'services/web-pharmacy-hub/src/pages/store-owner/ProductDescriptionsPage.tsx',
  'services/web-pharmacy-hub/src/pages/store-owner/StoreProductMultilingualContentPage.tsx',
];

/** Store 전용 공유 셸 — 셸 내부에서 false 고정 */
const STORE_ONLY_SHELL = 'packages/store-ui-core/src/components/ProductionMaterialEditorShell.tsx';

/** 다역할 공유 셸 — passthrough. Store 소비처가 false 전달 */
const TABLET_EDITOR = 'packages/tablet-screen-set-editor/src/index.tsx';
const TABLET_STORE_CONSUMERS = [
  'services/web-kpa-society/src/pages/pharmacy/TabletScreenSetManager.tsx',
  'services/web-pharmacy-hub/src/pages/store-owner/TabletsPage.tsx',
];
const TABLET_NON_STORE_CONSUMERS = [
  'services/web-kpa-society/src/pages/operator/tablet/OperatorTabletScreenSetsPage.tsx',
  'services/web-neture/src/pages/supplier/SupplierTabletScreenSetsPage.tsx',
];

/** 비Store 대표 소비처 — 이번 WO 미변경(기본 true 유지) */
const NON_STORE_REPRESENTATIVES = [
  'packages/shared-space-ui/src/community/CommunityContentWriteShell.tsx', // COMMUNITY
  'packages/shared-space-ui/src/ForumWriteForm.tsx', // COMMUNITY
  'services/web-neture/src/pages/supplier/SupplierProductCreatePage.tsx', // SUPPLIER
  'packages/operator-core-ui/src/modules/hub-content-write/OperatorHubContentWritePage.tsx', // OPERATOR
  'services/web-lecture/src/pages/instructor/InstructorCourseEditPage.tsx', // LECTURE (Phase 2 §14: KPA 강사 화면 은퇴)
];

/** 파일 안의 모든 <RichTextEditor ...> 여는 태그 텍스트 */
function richTextEditorTags(src: string): string[] {
  const out: string[] = [];
  const re = /<RichTextEditor\b[\s\S]*?>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) out.push(m[0]);
  return out;
}

describe('WO-O4O-STORE-AI-FIRST-EDITOR-BOUNDARY-V1 — 공통 편집기 내부 AI 경계', () => {
  describe('(A) 공통 capability', () => {
    it('ContentEditorProps.showInternalAi 가 선언되어 있다', () => {
      expect(read(TYPES)).toMatch(/showInternalAi\?: boolean;/);
    });

    it('RichTextEditor 는 showInternalAi 기본값 true 이고 Toolbar 로 그대로 전달한다', () => {
      const src = read(RTE);
      expect(src).toMatch(/showInternalAi = true,/);
      expect(src).toMatch(/<Toolbar[^>]*showInternalAi=\{showInternalAi\}/);
    });

    it('Toolbar 는 showInternalAi 기본값 true 이며, AI 정리 버튼은 preset===full && showInternalAi 조건이다', () => {
      const src = read(TOOLBAR);
      expect(src).toMatch(/showInternalAi = true \}: ToolbarProps/);
      const condIdx = src.indexOf("{preset === 'full' && showInternalAi && (");
      expect(condIdx).toBeGreaterThan(-1);
      // "AI 정리" 버튼 텍스트는 그 조건 블록 뒤에만 존재
      const btnIdx = src.indexOf('AI 정리\n');
      expect(btnIdx).toBeGreaterThan(condIdx);
    });

    it('AiContentModal 은 showInternalAi=false 면 mount 되지 않는다(버튼만 숨기지 않음)', () => {
      const src = read(TOOLBAR);
      expect(src).toMatch(/\{showInternalAi && \(\s*<AiContentModal/);
      // JSX mount 는 정확히 1곳이고, 그 1곳이 showInternalAi 가드 안이다 (import 문은 <AiContentModal 이 아님)
      const mounts = src.match(/<AiContentModal\b/g) ?? [];
      expect(mounts).toHaveLength(1);
      const guarded = src.match(/\{showInternalAi && \(\s*<AiContentModal\b/g) ?? [];
      expect(guarded).toHaveLength(1);
    });

    it('기본값을 false 로 뒤집지 않았다', () => {
      expect(read(RTE)).not.toMatch(/showInternalAi = false/);
      expect(read(TOOLBAR)).not.toMatch(/showInternalAi = false/);
    });
  });

  describe('(B) Store 소비처 — 내부 AI OFF', () => {
    it.each(STORE_DIRECT_CONSUMERS)('%s 의 모든 <RichTextEditor> 가 showInternalAi={false}', (rel) => {
      const tags = richTextEditorTags(read(rel));
      expect(tags.length).toBeGreaterThan(0);
      for (const t of tags) expect(t).toMatch(/showInternalAi=\{false\}/);
    });

    it('ProductionMaterialEditorShell(store-ui-core) 은 주입 편집기에 showInternalAi={false} 를 고정한다', () => {
      const src = read(STORE_ONLY_SHELL);
      expect(src).toMatch(/showInternalAi\?: boolean;/);
      expect(src).toMatch(/<EditorComponent[\s\S]*?showInternalAi=\{false\}[\s\S]*?\/>/);
    });

    it('TabletContentStepBuilder 는 showInternalAi 를 passthrough 하고, Store 소비처는 false 를 전달한다', () => {
      const src = read(TABLET_EDITOR);
      expect(src).toMatch(/showInternalAi\?: boolean;/);
      expect(src).toMatch(/<RichTextEditor[\s\S]*?showInternalAi=\{showInternalAi\}[\s\S]*?\/>/);
      for (const rel of TABLET_STORE_CONSUMERS) {
        expect(read(rel)).toMatch(/<TabletContentStepBuilder[\s\S]*?showInternalAi=\{false\}/);
      }
    });

    it('Store 영역에서 활성 RichTextEditor 소비처가 계약 목록 밖에 없다 (census drift 가드)', () => {
      const storeDirs = [
        'services/web-kpa-society/src/pages/pharmacy',
        'services/web-k-cosmetics/src/pages/store',
        'services/web-pharmacy-hub/src/pages/store-owner',
      ];
      const found: string[] = [];
      for (const dir of storeDirs) {
        const abs = path.join(REPO_ROOT, dir);
        for (const f of fs.readdirSync(abs)) {
          if (!f.endsWith('.tsx')) continue;
          const rel = `${dir}/${f}`;
          if (/<RichTextEditor\b/.test(read(rel))) found.push(rel);
        }
      }
      expect(found.sort()).toEqual([...STORE_DIRECT_CONSUMERS].sort());
    });
  });

  describe('(C) 비Store 하위호환 — 기본 동작 보존', () => {
    it.each(NON_STORE_REPRESENTATIVES)('%s 는 showInternalAi 를 지정하지 않는다(기본 true)', (rel) => {
      expect(read(rel)).not.toMatch(/showInternalAi/);
    });

    it.each(TABLET_NON_STORE_CONSUMERS)('%s (운영자·공급자 태블릿 제작기) 는 showInternalAi 미지정', (rel) => {
      expect(read(rel)).not.toMatch(/showInternalAi/);
    });
  });
});
