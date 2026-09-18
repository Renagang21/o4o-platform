/**
 * 내 매장 AI First 3단계 — 목적별 제작 화면 외부 LLM 정렬 계약 (Source Contract)
 *
 * WO-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1 §45
 *
 * 고정하는 것:
 *   (A) Prompt Core 단일 출처 — task blog|pop|qr|product-description|translate 가 같은 빌더 하나에 있고,
 *       Context 확장은 additive(referenceText·referenceHtml·sourceLocale·targetLocale). 의존 0 유지.
 *   (B) 공통 View 슬롯 — StoreBlogManageView · StorePopStaffView · StoreProductDescriptionsView 는 optional renderAssist
 *       만 열고 @o4o/content-editor 를 import 하지 않는다(store-ui-core 제로 의존).
 *   (C) TARGET_SPECIFIC 13 census — 전부 external LLM entry(LlmAssistPanel + Prompt Core + 라벨) 보유 ·
 *       showInternalAi={false} 유지 · AiContentModal/`/api/ai/content` 재연결 0 · Prompt 전문 복사본 0 ·
 *       provider-specific provenance(generatedBy='chatgpt' 등) 0.
 *   (D) QR — legacy 내부 AI(/api/ai/qr-description) 는 유지(WO 4 대상) 하되 외부 경로는 Gemini provenance 를 쓰지 않는다.
 *   (E) 실행 자동화 금지 — 결과 적용은 편집기 반영뿐. 적용과 동시에 저장/발행/QR 생성 호출 없음.
 *
 * web 서비스·UI 패키지에는 DOM test runner 가 없다(dependency 추가 = 중지 조건) → 저장소 관례대로
 * api-server jest 에서 소스 텍스트 계약으로 고정한다. Prompt 본문의 단위 테스트는 store-ui-core vitest 에 있다.
 */

import * as fs from 'fs';
import * as path from 'path';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');

const PROMPT_CORE = 'packages/store-ui-core/src/llm/storeContentAuthoringPrompt.ts';
const PROMPT_TEST = 'packages/store-ui-core/src/__tests__/storeContentAuthoringPrompt.test.ts';

const VIEW_BLOG = 'packages/store-ui-core/src/components/blog/StoreBlogManageView.tsx';
const VIEW_POP = 'packages/store-ui-core/src/components/pop-staff/StorePopStaffView.tsx';
const VIEW_PD = 'packages/store-ui-core/src/components/product-descriptions/StoreProductDescriptionsView.tsx';

/** WO 2 CHECK 기준 TARGET_SPECIFIC 13 (fresh census 2026-09-18 — drift 0) */
const TARGET_SPECIFIC: Record<'BLOG' | 'POP' | 'PRODUCT_DESCRIPTION' | 'MULTILINGUAL' | 'QR', string[]> = {
  BLOG: [
    'services/web-kpa-society/src/pages/pharmacy/PharmacyBlogPage.tsx',
    'services/web-k-cosmetics/src/pages/store/StoreBlogManagePage.tsx',
    'services/web-pharmacy-hub/src/pages/store-owner/BlogEditorPage.tsx',
  ],
  POP: [
    'services/web-kpa-society/src/pages/pharmacy/PharmacyPopPage.tsx',
    'services/web-k-cosmetics/src/pages/store/StorePopStaffPage.tsx',
    'services/web-pharmacy-hub/src/pages/store-owner/PopPage.tsx',
  ],
  PRODUCT_DESCRIPTION: [
    'services/web-kpa-society/src/pages/pharmacy/StoreLocalProductsPage.tsx',
    'services/web-kpa-society/src/pages/pharmacy/StoreProductDescriptionsPage.tsx',
    'services/web-k-cosmetics/src/pages/store/StoreProductDescriptionsPage.tsx',
    'services/web-pharmacy-hub/src/pages/store-owner/ProductDescriptionsPage.tsx',
  ],
  MULTILINGUAL: [
    'services/web-kpa-society/src/pages/pharmacy/StoreProductMultilingualContentPage.tsx',
    'services/web-pharmacy-hub/src/pages/store-owner/StoreProductMultilingualContentPage.tsx',
  ],
  QR: ['services/web-kpa-society/src/pages/pharmacy/StoreQrAiDescriptionPage.tsx'],
};
const ALL_TARGETS = Object.values(TARGET_SPECIFIC).flat();
const TASK_BY_GROUP: Record<keyof typeof TARGET_SPECIFIC, string> = {
  BLOG: "task: 'blog'",
  POP: "task: 'pop'",
  PRODUCT_DESCRIPTION: "task: 'product-description'",
  MULTILINGUAL: "task: 'translate'",
  QR: "task: 'qr'",
};

describe('WO-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1 — (A) Prompt Core 단일 출처 · additive 확장', () => {
  const src = read(PROMPT_CORE);

  it('task union = create | revise + blog | pop | qr | product-description | translate', () => {
    const union = src.slice(src.indexOf('export type StoreContentLlmTask'), src.indexOf('export interface StoreContentLlmContext'));
    for (const t of ['create', 'revise', 'blog', 'pop', 'qr', 'product-description', 'translate']) {
      expect(union).toContain(`'${t}'`);
    }
  });
  it('Context additive 필드 4종(referenceText · referenceHtml · sourceLocale · targetLocale) · 기존 필드 유지', () => {
    for (const f of ['title', 'currentHtml', 'sourceTitle', 'sourceOrigin', 'productName', 'additionalInstruction',
      'referenceText', 'referenceHtml', 'sourceLocale', 'targetLocale']) {
      expect(src).toMatch(new RegExp('^\\s*' + f + '\\?:\\s*string\\s*\\|\\s*null;', 'm'));
    }
  });
  it('목적별 명세는 TASK_SPECS 하나에 모여 있고 화면별 빌더 함수는 없다', () => {
    expect(src).toContain("const TASK_SPECS: Record<Exclude<StoreContentLlmTask, 'create' | 'revise'>, TaskSpec>");
    for (const k of ['blog:', 'pop:', 'qr:', "'product-description':", 'translate:']) expect(src).toContain(k);
    expect(src.match(/^export function build/gm)?.length).toBe(1);
  });
  it('의존 0 유지 — import 문·fetch·React 없음', () => {
    expect(src).not.toMatch(/^\s*import\s/m);
    expect(src).not.toMatch(/fetch\(|axios|authClient|useState|useEffect/);
  });
  it('§12 상품 설명 사실성 계약 · §13 translate 계약 · §9~§11 형식 계약 문구 존재', () => {
    expect(src).toContain('제품명만 보고 성분·효능·원산지 등을 추측해 쓰지 마세요');
    expect(src).toContain('질병을 치료·예방한다는 표현을 추가하지 마세요');
    expect(src).toContain('숫자·단위·제품명·고유명사는 임의로 바꾸지 마세요');
    expect(src).toContain('h1 은 사용하지 마세요');
    expect(src).toContain('짧은 포인트 2~5개');
    expect(src).toContain('QR 주소·slug·링크는 만들지 마세요');
  });
  it('vitest 에 5 task 단위 테스트 존재', () => {
    const t = read(PROMPT_TEST);
    for (const d of ['WO3 — blog', 'WO3 — pop', 'WO3 — qr', 'WO3 — product-description', 'WO3 — translate']) {
      expect(t).toContain(d);
    }
  });
});

describe('WO-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1 — (B) 공통 View optional renderAssist 슬롯', () => {
  it.each([
    [VIEW_BLOG, 'renderAssist?: (ctx: {'],
    [VIEW_POP, 'renderAssist?: (ctx: {'],
    [VIEW_PD, 'renderAssist?: (ctx: {'],
  ])('%s — optional 슬롯 · content-editor import 0 · Prompt Core import 0(주입은 서비스 wrapper)', (rel, sig) => {
    const src = read(rel);
    expect(src).toContain(sig);
    expect(src).not.toMatch(/from\s+['"]@o4o\/content-editor['"]/);
    expect(src).not.toContain('buildStoreContentAuthoringPrompt(');
    // 주석의 언급은 허용 — import/JSX 로 직접 소비하지 않는다
    expect(src).not.toMatch(/import\s*\{[^}]*LlmAssistPanel|<LlmAssistPanel/);
  });
  it('StoreBlogManageView — renderAssist 는 StoreBlogEditorPanel.beforeEditor 로 전달(미주입 undefined)', () => {
    const src = read(VIEW_BLOG);
    expect(src).toMatch(/beforeEditor=\{\s*renderAssist\s*\?\s*renderAssist\(\{[\s\S]*?\}\)\s*:\s*undefined\s*\}/);
  });
  it('StoreProductDescriptionsView — onApplyHtml 은 setContent(편집 상태)만 · 저장 함수 아님', () => {
    const src = read(VIEW_PD);
    expect(src).toMatch(/renderAssist\(\{[\s\S]*?onApplyHtml:\s*setContent,/);
    expect(src).not.toMatch(/onApplyHtml:\s*handleSave/);
  });
});

describe('WO-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1 — (C) TARGET_SPECIFIC 13 external LLM entry', () => {
  it('census = 13', () => {
    expect(ALL_TARGETS).toHaveLength(13);
    for (const rel of ALL_TARGETS) expect(fs.existsSync(path.join(REPO_ROOT, rel))).toBe(true);
  });

  for (const group of Object.keys(TARGET_SPECIFIC) as Array<keyof typeof TARGET_SPECIFIC>) {
    for (const rel of TARGET_SPECIFIC[group]) {
      describe(`${group} · ${rel}`, () => {
        const src = read(rel);
        it('LlmAssistPanel + buildStoreContentAuthoringPrompt + STORE_LLM_ASSIST_LABEL + 목적 task', () => {
          expect(src).toMatch(/import \{[^}]*LlmAssistPanel[^}]*\} from '@o4o\/content-editor'/);
          expect(src).toMatch(/import \{[^}]*buildStoreContentAuthoringPrompt[^}]*\} from '@o4o\/store-ui-core'/);
          expect(src).toContain('label={STORE_LLM_ASSIST_LABEL}');
          expect(src).toContain(TASK_BY_GROUP[group]);
          expect(src).toContain('onApplyHtml=');
        });
        it('Prompt 전문 복사본 없음 · showInternalAi={false} 유지 · AiContentModal / /api/ai/content 재연결 0', () => {
          expect(src).not.toContain('[결과 조건]');
          expect(src).not.toContain('HTML 만 반환');
          expect(src).toContain('showInternalAi={false}');
          expect(src).not.toContain('showInternalAi={true}');
          expect(src).not.toMatch(/['"`][^'"`\n]*\/api\/ai\/content/);
          expect(src).not.toMatch(/import\s*\{[^}]*AiContentModal|<AiContentModal/);
        });
        it('provider-specific 신규 provenance · Prompt 저장 없음', () => {
          expect(src).not.toMatch(/sourceType:\s*'chatgpt'|generatedBy:\s*'chatgpt'|llmPrompt|promptText/);
        });
        it('내부 AI 새 호출 없음 — QR legacy 만 예외', () => {
          const aiCalls = src.match(/\/api\/ai\/[a-z-]+/g) ?? [];
          if (group === 'QR') {
            expect(new Set(aiCalls)).toEqual(new Set(['/api/ai/qr-description']));
          } else {
            expect(aiCalls).toEqual([]);
          }
        });
      });
    }
  }

  it('공통 View 소비 wrapper(KCos Blog · KCos POP · 상품설명 3)는 renderAssist 슬롯으로 주입한다', () => {
    for (const rel of [
      'services/web-k-cosmetics/src/pages/store/StoreBlogManagePage.tsx',
      'services/web-k-cosmetics/src/pages/store/StorePopStaffPage.tsx',
      ...TARGET_SPECIFIC.PRODUCT_DESCRIPTION.filter((r) => !r.endsWith('StoreLocalProductsPage.tsx')),
    ]) {
      expect(read(rel)).toMatch(/renderAssist=\{\(\{[^}]*onApplyHtml[^}]*\}\) =>/);
    }
  });

  it('상품 설명 4 — 참고 Context 는 제품명·현재 HTML·prefill/요약/카테고리만(제품 사실 유추 필드 없음)', () => {
    for (const rel of TARGET_SPECIFIC.PRODUCT_DESCRIPTION) {
      const src = read(rel);
      expect(src).toMatch(/productName:\s*(product\.name|name)/);
      expect(src).not.toMatch(/ingredients|efficacy|dosage|성분:|효능:/);
    }
  });

  it('다국어 2 — translate source 우선순위(target 본문 → defaultLocale → ko) · 결과는 activeLocale draft.html 에만', () => {
    for (const rel of TARGET_SPECIFIC.MULTILINGUAL) {
      const src = read(rel);
      expect(src).toContain("return pick(defaultLocale) ?? pick('ko');");
      expect(src).toContain('targetLocale: activeLocale');
      expect(src).toContain('referenceHtml: translateSource?.html ?? null');
      expect(src).toMatch(/onApplyHtml=\{\(html\) => setActiveDraft\(\{ html \}\)\}/);
      expect(src).not.toMatch(/onApplyHtml=\{[^}]*handleSavePage/);
    }
  });
});

describe('WO-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1 — (D) QR provenance · legacy 유지', () => {
  const src = read(TARGET_SPECIFIC.QR[0]);

  it('legacy 내부 AI 경로 유지(WO 4 대상) — handleGenerate · /api/ai/qr-description', () => {
    expect(src).toContain('const handleGenerate = useCallback(');
    expect(src).toContain('/api/ai/qr-description');
  });
  it("외부 경로는 Gemini provenance 를 쓰지 않는다 — authoredBy 분기 · generatedBy 'chatgpt' 없음", () => {
    expect(src).toContain("const [authoredBy, setAuthoredBy] = useState<'internal' | 'external' | null>(null)");
    expect(src).toContain("setAuthoredBy('external')");
    expect(src).toContain("setAuthoredBy('internal')");
    expect((src.match(/generatedBy:\s*authoredBy === 'external' \? undefined : 'gemini-qr-description'/g) ?? []).length).toBe(2);
    expect(src).not.toMatch(/generatedBy:\s*'gemini-qr-description'\s*,/);
    expect(src).not.toMatch(/generatedBy:\s*'chatgpt'|model:\s*'chatgpt'/);
  });
  it('외부 결과 aiDescription = 화면 구조 정보만(mode · productName/cornerName · emphasis · items[name/emphasis]) — model/generatedAt/descriptionHtml 없음', () => {
    const apply = src.slice(src.indexOf('const handleExternalApply'), src.indexOf('// 콘텐츠 저장(없으면 생성)'));
    expect(apply).toContain('version: 1');
    expect(apply).toContain('mode,');
    expect(apply).not.toMatch(/model:|generatedAt:|generatedBy:|descriptionHtml/);
  });
  it('외부 결과 적용은 편집기 반영뿐 — ensureContentSaved/createQr/handleUpdate 호출 없음(자동 저장·QR 0)', () => {
    const apply = src.slice(src.indexOf('const handleExternalApply'), src.indexOf('// 콘텐츠 저장(없으면 생성)'));
    expect(apply).not.toMatch(/ensureContentSaved|createQr\(|handleUpdate|handleSaveAndCreate|apiClient\.post/);
    expect(apply).toContain('setEditorSeed(html)');
    expect(apply).toContain('setEditorContent({ html })');
  });
  it('Prompt Context = 사용자가 입력한 값만(상품명·코너명·강조점·항목) — 새 fetch 없음', () => {
    const block = src.slice(src.indexOf('const externalReferenceText'), src.indexOf('const handleExternalApply'));
    expect(block).not.toMatch(/fetch\(|apiClient\./);
    expect(block).toContain("task: 'qr'");
  });
});

describe('WO-O4O-STORE-PRODUCTION-EXTERNAL-LLM-REALIGNMENT-V1 — (E) 실행 자동화 금지 · backend 무변경', () => {
  it('어느 대상도 onApplyHtml 에서 저장/발행/QR/PDF 함수를 직접 부르지 않는다', () => {
    for (const rel of ALL_TARGETS) {
      const src = read(rel);
      const applies = src.match(/onApplyHtml=\{[\s\S]*?\}\s*\n/g) ?? [];
      for (const a of applies) {
        expect(a).not.toMatch(/handleSave|publish|createQr|createStoreQrCode|ensureContentSaved|handleUpdate|pdf|Pdf/i);
      }
    }
  });
  it('backend LLM 실행 API 신설 0 — ai-proxy routes 에 Store 외부 LLM 용 신규 라우트(chatgpt/external-llm/store-prompt) 없음', () => {
    const routes = read('apps/api-server/src/routes/ai-proxy.routes.ts');
    expect(routes).not.toMatch(/router\.(post|get)\(\s*['"`]\/(chatgpt|external-llm|store-prompt|store-llm)/i);
    expect(routes).not.toMatch(/buildStoreContentAuthoringPrompt/);
  });
});
