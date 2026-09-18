/**
 * WO-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-C-TASK-MODALITY-ROUTER-V1 — Task Modality Router (순수 계층) + per-task provider planner
 *
 * 성공 기준:
 *   A "이 제품에 대해 조사해줘" → research → gemini(web_research)
 *   B "현재 이 화면에서 다음 버튼을 찾아 진행해줘" → screen → openai(vision_planner)
 *   C 검증된 반복 업무(hook) → workflow (provider 없음)
 *   D 실행 표면도 조사 대상도 없음 → question
 *   E 전역 기본 provider 가 gemini 여도 screen task 는 openai 로 target 을 해석한다(resolver 실증)
 *   F 특정 업종/사이트/약품 키워드 없이 성립 — 모든 예문은 일반어. 등재 대상은 등재부(resolveWorkTarget) 경유.
 *   + 키 부재 fallback · 모델 이름은 router 에 없음(소스 계약)
 */

import { readFileSync } from 'fs';
import { join } from 'path';

jest.mock('../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));

import logger from '../utils/logger.js';
import { MODALITY_PROVIDER, classifyTaskModality, hasResearchVocabulary, hasUiInteractionVocabulary } from '../services/ai-tools/task-modality-router.js';
import { createPlannerTargetResolverForProvider } from '../services/ai-tools/work-agent-runtime.js';

describe('Capability C — classifyTaskModality', () => {
  it('A. 조사 요청(실행 표면 없음) → research · gemini · web_research', () => {
    for (const text of ['이 제품에 대해 조사해줘', '경쟁 제품과 비교해서 요약해줘', 'look up the latest news about this brand']) {
      const d = classifyTaskModality({ request: text });
      expect(d.modality).toBe('research');
      expect(d.reason).toBe('research_vocabulary');
      expect(d.provider).toBe('gemini');
      expect(d.executor).toBe('web_research');
      expect(d.target).toBeNull();
    }
  });

  it('B. 현재 화면을 보고 진행해야 하는 요청 → screen · openai · vision_planner (대상 이름 없이 UI 어휘만으로)', () => {
    for (const text of ['현재 이 화면에서 다음 버튼을 찾아 진행해줘', '이 팝업에서 확인 눌러줘', 'click the next button on this screen']) {
      const d = classifyTaskModality({ request: text });
      expect(d.modality).toBe('screen');
      expect(d.reason).toBe('ui_interaction_vocabulary');
      expect(d.provider).toBe('openai');
      expect(d.executor).toBe('vision_planner');
    }
    // 조사 어휘와 화면 어휘가 함께 있으면 화면 어휘가 우선한다(같은 화면에서 하는 일).
    const both = '이 화면에서 제품 정보 검색하고 다음 버튼 눌러줘';
    expect(hasResearchVocabulary(both)).toBe(true);
    expect(hasUiInteractionVocabulary(both)).toBe(true);
    expect(classifyTaskModality({ request: both }).modality).toBe('screen');
  });

  it('B-2. 등재 대상 · targetHint · 화면 캡처는 어휘와 무관하게 screen', () => {
    // 등재 대상은 등재부(resolveWorkTarget)에서 온다 — 이 spec 은 등재부 값 하나만 빌려 쓰고 router 소스에는 그 이름이 없다.
    const byTarget = classifyTaskModality({ request: '메모장에 오늘 할 일 적어줘' });
    expect(byTarget.modality).toBe('screen');
    expect(byTarget.reason).toBe('registered_target');
    expect(byTarget.target?.targetType).toBe('windows_app');
    const byHint = classifyTaskModality({ request: '여기서 이어서 해줘', targetHint: 'windows.notepad' });
    expect(byHint).toMatchObject({ modality: 'screen', reason: 'target_hint' });
    const byCapture = classifyTaskModality({ request: '이어서', image: { provenance: 'screen_capture' } });
    expect(byCapture).toMatchObject({ modality: 'screen', reason: 'screen_image', target: null });
    // 등재 대상 + 조사 어휘 → 여전히 screen (그 화면에서 조사한다)
    expect(classifyTaskModality({ request: '메모장에서 최신 메모 정보 찾아봐' }).modality).toBe('screen');
  });

  it('C. 검증된 반복 업무 hook → workflow (AI provider 없음 · hook 없으면 절대 workflow 아님)', () => {
    const d = classifyTaskModality({ request: '매일 하던 마감 정리해줘', hasVerifiedWorkflow: () => true });
    expect(d).toMatchObject({ modality: 'workflow', reason: 'verified_workflow', provider: null, executor: 'workflow' });
    expect(classifyTaskModality({ request: '매일 하던 마감 정리해줘' }).modality).not.toBe('workflow');
    // hook 은 등재 대상보다 먼저 본다 — 검증된 업무는 화면 loop 를 다시 돌지 않는다.
    expect(classifyTaskModality({ request: '메모장에 적어줘', hasVerifiedWorkflow: () => true }).modality).toBe('workflow');
  });

  it('D. 실행 표면도 조사 대상도 정해지지 않은 요청 → question (사용자 고유 정보 필요)', () => {
    for (const text of ['그거 해줘', '어제 것 처리 부탁해', '', '   ']) {
      const d = classifyTaskModality({ request: text });
      expect(d).toMatchObject({ modality: 'question', reason: 'no_execution_surface', provider: null, executor: 'question' });
    }
    // 사용자 첨부 이미지(user_image)만으로는 screen 이 아니다 — 화면 캡처와 구분.
    expect(classifyTaskModality({ request: '이거 처리해줘', image: { provenance: 'user_image' } }).modality).toBe('question');
  });

  it('F. provider 표는 4 modality 뿐 · 모델 이름 · 업종/사이트/약품 키워드가 router 소스에 없다 (소스 계약)', () => {
    expect(MODALITY_PROVIDER).toEqual({ workflow: null, screen: 'openai', research: 'gemini', question: null });
    const src = readFileSync(join(__dirname, '..', 'services', 'ai-tools', 'task-modality-router.ts'), 'utf8');
    for (const forbidden of ['gpt-', 'gemini-', 'astra', 'AI_DEFAULT_PROVIDER=', 'hospital', 'health.kr', 'healthkr', 'doctors', '약학정보원', '닥터스', '약국', '우루사', '타이레놀', 'cost', 'score']) {
      expect(src.toLowerCase()).not.toContain(forbidden.toLowerCase());
    }
    // 분류에 AI 를 부르지 않는다.
    expect(src).not.toMatch(/execute\(|fetch\(/);
  });
});

describe('Capability C — per-task provider planner resolver (E)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('E. 전역 기본 provider 가 gemini(요청 undefined) 여도 screen task 의 resolver 는 openai target 을 돌려준다', async () => {
    jest.resetModules();
    jest.doMock('../utils/ai-provider-runtime.js', () => ({
      resolveAiTarget: jest.fn(async (_ds: unknown, requested?: unknown) => ({ provider: requested === 'openai' ? 'openai' : 'gemini', model: requested === 'openai' ? 'm-openai' : 'm-gemini', apiKey: 'k' })),
      resolveStrongAiTarget: jest.fn(async (_ds: unknown, requested?: unknown) => ({ provider: requested === 'openai' ? 'openai' : 'gemini', model: requested === 'openai' ? 'm-openai-strong' : 'm-gemini-strong', apiKey: 'k' })),
    }));
    const { createPlannerTargetResolverForProvider: make } = await import('../services/ai-tools/work-agent-runtime.js');
    const runtime = await import('../utils/ai-provider-runtime.js');
    const normal = await make('openai')({} as any);
    const strong = await make('openai', true)({} as any);
    expect(normal).toEqual({ provider: 'openai', model: 'm-openai', apiKey: 'k' });
    expect(strong).toEqual({ provider: 'openai', model: 'm-openai-strong', apiKey: 'k' });
    expect((runtime.resolveAiTarget as jest.Mock).mock.calls[0][1]).toBe('openai');
    // 전역 기본은 건드리지 않는다 — 요청 인자로만 전달한다(env 변경 0).
    expect(process.env.AI_DEFAULT_PROVIDER).not.toBe('openai');
    jest.dontMock('../utils/ai-provider-runtime.js');
    jest.resetModules();
  });

  it('키가 없는 provider 를 요청하면 죽지 않고 전역 기본 provider 로 fallback + 경고 1회', async () => {
    jest.resetModules();
    jest.doMock('../utils/ai-provider-runtime.js', () => ({
      resolveAiTarget: jest.fn(async (_ds: unknown, requested?: unknown) => (requested === 'openai' ? { provider: 'openai', model: 'm-openai', apiKey: '' } : { provider: 'gemini', model: 'm-gemini', apiKey: 'k' })),
      resolveStrongAiTarget: jest.fn(),
    }));
    jest.doMock('../utils/logger.js', () => ({ __esModule: true, default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }));
    const { createPlannerTargetResolverForProvider: make } = await import('../services/ai-tools/work-agent-runtime.js');
    const log = (await import('../utils/logger.js')).default;
    const t = await make('openai')({} as any);
    expect(t).toEqual({ provider: 'gemini', model: 'm-gemini', apiKey: 'k' });
    expect((log.warn as jest.Mock).mock.calls.some((c) => String(c[0]).includes('falling back'))).toBe(true);
    jest.dontMock('../utils/ai-provider-runtime.js');
    jest.dontMock('../utils/logger.js');
    jest.resetModules();
  });

  it('import 는 정적으로도 된다(회귀 가드)', () => {
    expect(typeof createPlannerTargetResolverForProvider).toBe('function');
    expect(logger).toBeTruthy();
  });
});
