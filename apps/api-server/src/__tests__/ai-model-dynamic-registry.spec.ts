/**
 * WO-O4O-AI-MODEL-DYNAMIC-REGISTRY-V1 — Gemini 모델 동적 registry
 *
 *  1. ListModels 응답 → O4O 형상 (generateContent 미지원 · image/tts 계열 · 형식 위반 제외)
 *  2. 허용 판정 = 정적 whitelist ∪ Google 목록(캐시) · 무효 id 거절 (3.0-flash 사고 재발 방지)
 *  3. Google 조회 실패 → stale/static fallback, 키 · 원문은 로그에 싣지 않는다
 *  4. 관리자 목록: live + 레거시(whitelist 에만 있는 것), current/canonical
 *  5. canonical(GEMINI_CANONICAL_MODEL) 은 whitelist 에 있고 api-server 기본값 사이트가 전부 그 상수를 쓴다
 *  6. 정책 저장(PUT /ai/policy)은 허용 목록 밖 모델을 400 INVALID_MODEL 로 거절한다
 *  7. ai-proxy validateRequest 가 Google 목록에만 있는 모델도 통과시킨다
 */

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

const mockResolveAiApiKey = jest.fn();
jest.mock('../utils/ai-key.util.js', () => ({
  __esModule: true,
  resolveAiApiKey: (...args: unknown[]) => mockResolveAiApiKey(...args),
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import logger from '../utils/logger.js';
import {
  GEMINI_MODEL_ID_RE,
  ensureGeminiModelCache,
  isGeminiModelAllowed,
  isGeminiModelAllowedSync,
  listGeminiModels,
  resetGeminiModelCache,
  staticGeminiModels,
  toGeminiModelInfo,
} from '../services/ai-model-registry.service.js';
import { GEMINI_CANONICAL_MODEL, MODEL_WHITELIST } from '../types/ai-proxy.types.js';

const SRC = join(__dirname, '..');
const read = (p: string) => readFileSync(join(SRC, p), 'utf8');
const ds = {} as any; // registry 는 dataSource 를 키 해석에만 넘긴다(mock)

const googleListing = (ids: string[]) => ({
  models: ids.map((id) => ({
    name: `models/${id}`,
    displayName: id.toUpperCase(),
    description: 'desc',
    inputTokenLimit: 1048576,
    outputTokenLimit: 65536,
    supportedGenerationMethods: ['generateContent', 'countTokens'],
  })),
});

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  (globalThis as any).fetch = jest.fn(async () => ({ ok, status, json: async () => body }));
}

beforeEach(() => {
  resetGeminiModelCache();
  mockResolveAiApiKey.mockReset();
  mockResolveAiApiKey.mockResolvedValue('test-key-not-a-real-secret');
  (logger.warn as jest.Mock).mockClear();
  (logger.info as jest.Mock).mockClear();
});

describe('1. ListModels 응답 정제', () => {
  it('generateContent 지원 gemini-* 만 남기고 image/tts/transcribe/robotics/computer-use 계열은 뺀다', () => {
    const keep = toGeminiModelInfo({ name: 'models/gemini-3.8-flash', displayName: 'Gemini 3.8 Flash', supportedGenerationMethods: ['generateContent'], inputTokenLimit: 1048576, outputTokenLimit: 65536 });
    expect(keep).toEqual({ id: 'gemini-3.8-flash', displayName: 'Gemini 3.8 Flash', description: '', inputTokenLimit: 1048576, outputTokenLimit: 65536 });
    for (const id of ['gemini-3.1-flash-image', 'gemini-3.1-flash-tts-preview', 'gemini-3.5-transcribe', 'gemini-robotics-er-2-preview', 'gemini-2.5-computer-use-preview-10-2025', 'gemini-embedding-001']) {
      expect(toGeminiModelInfo({ name: `models/${id}`, supportedGenerationMethods: ['generateContent'] })).toBeNull();
    }
    expect(toGeminiModelInfo({ name: 'models/gemini-3.8-flash', supportedGenerationMethods: ['embedContent'] })).toBeNull();
    expect(toGeminiModelInfo({ name: 'models/gpt-9', supportedGenerationMethods: ['generateContent'] })).toBeNull();
    expect(toGeminiModelInfo({ name: 'models/gemini-3.8-flash; DROP', supportedGenerationMethods: ['generateContent'] })).toBeNull();
    expect(toGeminiModelInfo(null)).toBeNull();
  });

  it('모델 id 형식은 gemini- 접두 + [a-z0-9.-] 뿐이다', () => {
    for (const ok of ['gemini-3.8-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest']) expect(GEMINI_MODEL_ID_RE.test(ok)).toBe(true);
    for (const bad of ['Gemini-3.8-flash', 'gemini 3.8', 'models/gemini-3.8-flash', 'gemini-3.8-flash?x=1', '', 'gemini-' + 'a'.repeat(80)]) {
      expect(GEMINI_MODEL_ID_RE.test(bad)).toBe(false);
    }
  });
});

describe('2~3. 허용 판정 · fallback', () => {
  it('정적 whitelist 는 Google 없이도 허용, Google 목록에만 있는 모델은 캐시가 채워진 뒤 허용', async () => {
    expect(isGeminiModelAllowedSync(GEMINI_CANONICAL_MODEL)).toBe(true);
    expect(isGeminiModelAllowedSync('gemini-9.9-flash')).toBe(false); // 아직 Google 목록 없음
    mockFetchOnce(googleListing(['gemini-9.9-flash', 'gemini-3.8-flash']));
    expect(await isGeminiModelAllowed(ds, 'gemini-9.9-flash')).toBe(true);
    expect(isGeminiModelAllowedSync('gemini-9.9-flash')).toBe(true); // 동기 경로(ai-proxy)도 같은 캐시를 본다
    expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);
    // 캐시 안에서는 다시 부르지 않는다.
    await isGeminiModelAllowed(ds, 'gemini-9.9-flash');
    expect((globalThis as any).fetch).toHaveBeenCalledTimes(1);
  });

  it('무효 id(과거 gemini-3.0-flash) · 형식 위반 · 비-gemini 는 어느 경로로도 허용되지 않는다', async () => {
    mockFetchOnce(googleListing(['gemini-3.8-flash']));
    for (const bad of ['gemini-3.0-flash', 'gpt-6-astra', '', null, undefined, 42, 'models/gemini-3.8-flash']) {
      expect(await isGeminiModelAllowed(ds, bad)).toBe(false);
      expect(isGeminiModelAllowedSync(bad)).toBe(false);
    }
  });

  it('Google 조회 실패 → 정적 목록으로, 키 · URL · 원문은 로그에 남지 않는다', async () => {
    (globalThis as any).fetch = jest.fn(async () => { throw new Error('boom key=test-key-not-a-real-secret'); });
    const listing = await listGeminiModels(ds);
    expect(listing.source).toBe('static');
    expect(listing.models.map((m) => m.id)).toEqual(staticGeminiModels().map((m) => m.id));
    const logged = JSON.stringify((logger.warn as jest.Mock).mock.calls);
    expect(logged).not.toContain('test-key-not-a-real-secret');
    expect(logged).not.toContain('generativelanguage');
    // 키가 없으면 조회를 시도하지 않는다.
    resetGeminiModelCache();
    mockResolveAiApiKey.mockResolvedValue('');
    (globalThis as any).fetch = jest.fn();
    expect(await ensureGeminiModelCache(ds)).toBeNull();
    expect((globalThis as any).fetch).not.toHaveBeenCalled();
  });

  it('HTTP 오류 · 빈 목록도 실패로 보고 마지막 성공 목록을 유지한다(stale)', async () => {
    mockFetchOnce(googleListing(['gemini-3.8-flash', 'gemini-7.0-flash']));
    await ensureGeminiModelCache(ds);
    mockFetchOnce({ error: { message: 'quota' } }, false, 429);
    const state = await ensureGeminiModelCache(ds, { force: true });
    expect(state?.models.map((m) => m.id)).toEqual(['gemini-3.8-flash', 'gemini-7.0-flash']);
    expect(isGeminiModelAllowedSync('gemini-7.0-flash')).toBe(true);
  });
});

describe('4~5. 관리자 목록 · canonical', () => {
  it('관리자 목록 = Google live + whitelist 에만 있는 레거시, 출처/조회시각 포함', async () => {
    mockFetchOnce(googleListing(['gemini-3.8-flash', 'gemini-3.7-flash']));
    const listing = await listGeminiModels(ds);
    expect(listing.source).toBe('google');
    expect(listing.fetchedAt).toBeTruthy();
    const ids = listing.models.map((m) => m.id);
    expect(ids.slice(0, 2)).toEqual(['gemini-3.7-flash', 'gemini-3.8-flash']); // live 는 id 정렬
    for (const legacy of MODEL_WHITELIST.gemini) expect(ids).toContain(legacy); // 레거시도 뒤에 남는다
    expect(new Set(ids).size).toBe(ids.length); // 중복 없음
  });

  it('canonical 은 whitelist 첫 항목이고, api-server 의 gemini 기본값 사이트가 전부 상수를 쓴다(하드코딩 0)', () => {
    expect(MODEL_WHITELIST.gemini[0]).toBe(GEMINI_CANONICAL_MODEL);
    expect(GEMINI_CANONICAL_MODEL).toBe('gemini-3.8-flash');
    const files = [
      'utils/ai-editing-model-resolver.ts',
      'utils/ai-config-resolver.ts',
      'services/ai-proxy.service.ts',
      'services/ai-query.service.ts',
      'services/ai-admin.service.ts',
      'modules/ai-policy/ai-policy-executor.service.ts',
      'modules/neture/services/operator-ai-llm.service.ts',
      'modules/ai/services/LmsAIService.ts',
    ];
    for (const f of files) {
      const src = read(f).replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
      expect(src).toContain('GEMINI_CANONICAL_MODEL');
      // 기본값 자리에 옛 모델 문자열이 남아 있지 않다(seed 의 레거시 항목 · 주석은 제외).
      const defaults = src.match(/(model|defaultModel|gemini)\s*[:=]\s*'gemini-[^']+'/g) ?? [];
      for (const d of defaults) expect(d).not.toContain('gemini-2.5-flash');
    }
  });
});

describe('6~7. 저장 검증 · proxy 통과', () => {
  it('6. PUT /ai/policy 는 허용 목록 밖 모델을 INVALID_MODEL 400 으로 거절한다(소스 고정)', () => {
    const src = read('controllers/ai/AiQueryController.ts');
    expect(src).toContain('isGeminiModelAllowed(AppDataSource, trimmed)');
    expect(src).toContain("code: 'INVALID_MODEL'");
    expect(src).toContain('res.status(400)');
    const routes = read('routes/ai-query.routes.ts');
    expect(routes).toContain("router.get('/models', authenticate, requireAdmin");
    expect(routes).toContain('resetGeminiModelCache');
  });

  it('7. ai-proxy 의 모델 해석/검증이 Google 목록(캐시)의 모델을 통과시킨다', async () => {
    mockFetchOnce(googleListing(['gemini-3.8-flash', 'gemini-8.1-flash']));
    await ensureGeminiModelCache(ds);
    const src = read('services/ai-proxy.service.ts');
    expect(src).toContain("provider === 'gemini' && isGeminiModelAllowedSync(requestedModel)");
    expect(src).toContain("provider === 'gemini' && isGeminiModelAllowedSync(model)");
    expect(isGeminiModelAllowedSync('gemini-8.1-flash')).toBe(true);
    // resolver 도 registry 를 본다(소스 고정) — 정책값이 Google 목록에 있으면 fallback 으로 바꾸지 않는다.
    const resolver = read('utils/ai-editing-model-resolver.ts');
    expect(resolver).toContain('await isGeminiModelAllowed(AppDataSource, model)');
    expect(resolver).toContain('EDITING_MODEL_FALLBACK = GEMINI_CANONICAL_MODEL');
  });
});
