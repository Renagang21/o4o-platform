/**
 * 내 매장 AI First 2단계 — 외부 LLM 콘텐츠 제작 흐름 계약 (Source Contract)
 *
 * WO-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1
 *
 * 고정하는 것:
 *   (A) 공통 capability — LlmAssistPanel 재사용(새 모달·새 시스템 없음). guideText 는 string(기존 태블릿) 또는
 *       함수({additionalInstruction}) 형(Store) 둘 다 허용. 태블릿 코너 편집기 소비처 무변경.
 *   (B) Store Prompt Core — @o4o/store-ui-core 순수 함수. React/API/auth 의존 0. 화면별 Prompt 문구 복사본 0.
 *   (C) Store 소비처(일반 콘텐츠 4 + 제작 자료 2 + 셸 슬롯 1) — LlmAssistPanel + buildStoreContentAuthoringPrompt +
 *       showInternalAi={false} 유지 · /api/ai/content · AiContentModal 재연결 0.
 *   (D) 금지 — Store 에 새 provenance 필드(sourceType='chatgpt' 등)·Prompt 저장·ChatGPT 자동 열기 없음.
 *
 * web 서비스·UI 패키지에는 DOM test runner 가 없다(dependency 추가 = 중지 조건) → 저장소 관례대로
 * api-server jest 에서 소스 텍스트 계약으로 고정한다. Prompt 본문의 단위 테스트는 store-ui-core vitest 에 있다.
 */

import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

const PANEL = 'packages/content-editor/src/components/LlmAssistPanel.tsx';
const PROMPT_CORE = 'packages/store-ui-core/src/llm/storeContentAuthoringPrompt.ts';
const STORE_UI_INDEX = 'packages/store-ui-core/src/index.ts';
const SHELL = 'packages/store-ui-core/src/components/ProductionMaterialEditorShell.tsx';
const TABLET_EDITOR = 'packages/tablet-screen-set-editor/src/index.tsx';

/** 일반 콘텐츠 제작(GENERAL_AUTHORING) — 직접 LlmAssistPanel 소비 */
const GENERAL_AUTHORING = [
  'services/web-kpa-society/src/pages/pharmacy/CreateContentFromResourcesModal.tsx',
  'services/web-kpa-society/src/pages/pharmacy/StoreDirectContentPage.tsx',
  'services/web-kpa-society/src/pages/pharmacy/StoreContentEditPage.tsx',
  'services/web-pharmacy-hub/src/pages/store-owner/ContentPage.tsx',
];
/** 제작 자료(PRODUCTION_MATERIAL) — 직접 소비 */
const PRODUCTION_MATERIAL_DIRECT = [
  'services/web-kpa-society/src/pages/pharmacy/ProductionMaterialEditorPage.tsx',
  'services/web-pharmacy-hub/src/pages/store-owner/LibraryResourcesPage.tsx',
];
/** 셸 소비처(KCos) — LlmAssistComponent 슬롯으로 주입 */
const SHELL_CONSUMER = 'services/web-k-cosmetics/src/pages/store/ProductionMaterialEditorPage.tsx';

const STORE_DIRECT = [...GENERAL_AUTHORING, ...PRODUCTION_MATERIAL_DIRECT];

describe('WO-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1 — (A) LlmAssistPanel 공통 capability', () => {
  const src = read(PANEL);

  it('guideText 는 string | 함수({ additionalInstruction }) 둘 다 허용(additive)', () => {
    expect(src).toMatch(/guideText:\s*string\s*\|\s*\(\(opts:\s*\{\s*additionalInstruction:\s*string\s*\}\)\s*=>\s*string\)/);
  });
  it('추가 요청 입력은 함수형일 때만 렌더(guideIsDynamic 조건)', () => {
    expect(src).toContain("const guideIsDynamic = typeof guideText === 'function'");
    expect(src).toMatch(/\{guideIsDynamic && \(/);
    expect(src).toContain('추가 요청');
  });
  it('기존 계약 유지 — currentHtml → 현재 내용 복사 · onApplyHtml → 붙여넣기+편집기에 넣기 · 미주입 → HTML 탭 안내', () => {
    expect(src).toContain("typeof currentHtml === 'string' && (");
    expect(src).toContain('현재 내용 복사');
    expect(src).toContain('편집기에 넣기');
    expect(src).toMatch(/\{onApplyHtml \? \(/);
    expect(src).toContain('편집기의 <b>HTML 탭</b>에 붙여 넣으세요');
  });
  it('provider-neutral — 패널 기본 라벨은 LLM 일반 표현이며 특정 제품 자동 열기(window.open) 없음', () => {
    expect(src).toContain("label = 'LLM으로 작업하기'");
    expect(src).not.toMatch(/window\.open\(/);
    expect(src).not.toMatch(/chat\.openai\.com|chatgpt\.com/);
  });
  it('태블릿 코너 편집기 소비처(string guideText) 무변경', () => {
    const tablet = read(TABLET_EDITOR);
    expect(tablet).toMatch(/<LlmAssistPanel[\s\S]*?guideText=\{CORNER_DESC_PROMPT\}/);
    expect(tablet).not.toContain('buildStoreContentAuthoringPrompt');
  });
});

describe('WO-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1 — (B) Store Prompt Core 순수성', () => {
  const src = read(PROMPT_CORE);

  it('export 계약 — buildStoreContentAuthoringPrompt · resolveStoreContentLlmTask · task create|revise · 라벨 ChatGPT로 작업', () => {
    expect(src).toContain('export function buildStoreContentAuthoringPrompt(ctx: StoreContentLlmContext): string');
    expect(src).toContain('export function resolveStoreContentLlmTask(');
    expect(src).toContain("export type StoreContentLlmTask = 'create' | 'revise'");
    expect(src).toContain("export const STORE_LLM_ASSIST_LABEL = 'ChatGPT로 작업'");
  });
  it('의존 0 — import 문 없음(React/API/auth/router 미사용)', () => {
    expect(src).not.toMatch(/^\s*import\s/m);
    expect(src).not.toMatch(/fetch\(|axios|authClient|useState|useEffect/);
  });
  it('Context 필드는 화면에 이미 있는 것만 — PII/주문/매출 필드 없음', () => {
    for (const f of ['title', 'currentHtml', 'sourceTitle', 'sourceOrigin', 'productName', 'additionalInstruction']) {
      expect(src).toMatch(new RegExp('^\\s*' + f + '\\?:\\s*string\\s*\\|\\s*null;', 'm'));
    }
    const iface = src.slice(src.indexOf('export interface StoreContentLlmContext'), src.indexOf('export const STORE_LLM_ASSIST_LABEL'));
    expect(iface).not.toMatch(/customer|member|order|sales|phone|email|주문|매출|고객명|회원명/i);
  });
  it('Output Contract — HTML only · 사실 창작 금지 · 인라인 style · script/외부 CSS 금지 · 건강 효능 표현 금지', () => {
    expect(src).toContain('HTML 만 반환');
    expect(src).toContain('없는 사실을 새로 만들지 마세요');
    expect(src).toContain('인라인 CSS');
    expect(src).toContain('script, iframe, 외부 CSS');
    expect(src).toContain('효능·효과·질병 치료·예방 표현을 추가하지 마세요');
  });
  it('store-ui-core index 에서 export', () => {
    const idx = read(STORE_UI_INDEX);
    expect(idx).toContain("from './llm/storeContentAuthoringPrompt'");
    expect(idx).toContain('buildStoreContentAuthoringPrompt');
  });
  it('store-ui-core 는 @o4o/content-editor 를 import 하지 않는다(셸은 구조적 슬롯)', () => {
    expect(read(SHELL)).not.toMatch(/from\s+['"]@o4o\/content-editor['"]/);
    expect(read(PROMPT_CORE)).not.toMatch(/from\s+['"]@o4o\//);
    expect(read(SHELL)).toContain('LlmAssistComponent?: ComponentType<InjectedLlmAssistProps>');
  });
});

describe('WO-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1 — (C) Store 소비처 계약', () => {
  for (const rel of STORE_DIRECT) {
    describe(rel, () => {
      const src = read(rel);
      it('LlmAssistPanel + buildStoreContentAuthoringPrompt + STORE_LLM_ASSIST_LABEL 사용 (화면별 Prompt 복사본 없음)', () => {
        expect(src).toMatch(/import \{[^}]*LlmAssistPanel[^}]*\} from '@o4o\/content-editor'/);
        expect(src).toMatch(/import \{[^}]*buildStoreContentAuthoringPrompt[^}]*\} from '@o4o\/store-ui-core'/);
        expect(src).toContain('label={STORE_LLM_ASSIST_LABEL}');
        expect(src).toMatch(/guideText=\{\(\{ additionalInstruction \}\) => buildStoreContentAuthoringPrompt\(\{/);
        expect(src).toContain('onApplyHtml=');
        expect(src).not.toContain('[결과 조건]');
      });
      it('showInternalAi={false} 유지 · /api/ai/content 호출 · AiContentModal import/mount 재연결 없음(이력 주석 제외)', () => {
        expect(src).toContain('showInternalAi={false}');
        expect(src).not.toMatch(/['"`][^'"`\n]*\/api\/ai\/content/); // 문자열 리터럴로서의 endpoint
        expect(src).not.toMatch(/import\s*\{[^}]*AiContentModal|<AiContentModal/);
        expect(src).not.toContain('showInternalAi={true}');
      });
      it('새 provenance 필드·Prompt 저장·자동 저장 없음', () => {
        expect(src).not.toMatch(/sourceType:\s*'chatgpt'|generatedBy:\s*'chatgpt'|llmPrompt|promptText/);
      });
    });
  }

  it('StoreDirectContentPage · StoreContentEditPage · KPA ProductionMaterialEditorPage — 적용 시 initialHtml 과 editorContent 동시 갱신', () => {
    for (const rel of [
      'services/web-kpa-society/src/pages/pharmacy/StoreDirectContentPage.tsx',
      'services/web-kpa-society/src/pages/pharmacy/StoreContentEditPage.tsx',
      'services/web-kpa-society/src/pages/pharmacy/ProductionMaterialEditorPage.tsx',
    ]) {
      expect(read(rel)).toContain('onApplyHtml={(html) => { setEditorInitialHtml(html); setEditorContent({ html }); }}');
    }
  });

  it('ProductionMaterialEditorShell — 슬롯 렌더 · value 상태화 · 낡은 AI 초안 문구 제거', () => {
    const src = read(SHELL);
    expect(src).toContain('{LlmAssistComponent && (');
    expect(src).toContain('value={editorValue}');
    expect(src).toContain('<h1 style={styles.pageTitle}>매장 제작 자료 편집</h1>');
    expect(src).toContain('placeholder="직접 작성하거나 ChatGPT 등 외부 AI에서 만든 내용을 붙여넣으세요."');
    expect(src).not.toContain('AI 제작 자료 초안 편집');
    expect(src).not.toContain('AI가 정리한 내용을 편집하거나');
    expect(src).toContain('showInternalAi={false}');
  });

  it('KCos 셸 wrapper — LlmAssistPanel 을 LlmAssistComponent 슬롯으로 주입', () => {
    const src = read(SHELL_CONSUMER);
    expect(src).toContain('LlmAssistComponent={LlmAssistPanel}');
    expect(src).toMatch(/import \{[^}]*LlmAssistPanel[^}]*\} from '@o4o\/content-editor'/);
  });

  it('KPA ProductionMaterialEditorPage — 낡은 AI 초안 문구 제거', () => {
    const src = read('services/web-kpa-society/src/pages/pharmacy/ProductionMaterialEditorPage.tsx');
    expect(src).not.toContain('AI 제작 자료 초안 편집');
    expect(src).not.toContain('AI가 정리한 내용을 편집하거나');
  });
});

describe('WO-O4O-STORE-EXTERNAL-LLM-CONTENT-AUTHORING-V1 — (D) 비범위 보존', () => {
  it('RichTextEditor 기본 showInternalAi 는 여전히 true(WO1 계약)', () => {
    expect(read('packages/content-editor/src/components/RichTextEditor.tsx')).toMatch(/showInternalAi\s*=\s*true/);
  });
  it('Store 목록 가이드 ContentCreationGuideModal 은 삭제·변경하지 않는다', () => {
    expect(fs.existsSync(path.join(REPO_ROOT, 'services/web-kpa-society/src/pages/pharmacy/ContentCreationGuideModal.tsx'))).toBe(true);
    expect(read('services/web-kpa-society/src/pages/pharmacy/StoreLibraryContentsPage.tsx')).toContain('<ContentCreationGuideModal');
  });
});
