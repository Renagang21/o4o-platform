/**
 * AI Orchestration Pipeline Tests
 *
 * WO-PLATFORM-AI-ORCHESTRATION-LAYER-V1 — Phase 2 Verification
 *
 * Tests the full orchestration pipeline with mocked providers:
 * - Context builder: service constraints, data sanitization
 * - Prompt composer: system/user prompt generation
 * - Response normalizer: JSON extraction, schema validation, safe defaults
 * - Action mapper: recommendation → trigger mapping
 * - Orchestrator: end-to-end pipeline
 */

import {
  buildContext,
  composePrompt,
  normalizeResponse,
  mapActions,
} from '@o4o/ai-core';
import type {
  AIOrchestrationRequest,
  AIInsight,
} from '@o4o/ai-core';

// ─────────────────────────────────────────────────────
// 1. Context Builder
// ─────────────────────────────────────────────────────

describe('Context Builder', () => {
  const baseRequest: AIOrchestrationRequest = {
    service: 'neture',
    insightType: 'store-summary',
    contextData: { revenue: 1500000, patientCount: 42 },
    user: { id: 'user-1', role: 'neture:operator' },
  };

  it('builds context with service-specific constraints', () => {
    const ctx = buildContext(baseRequest);

    expect(ctx.service).toBe('neture');
    expect(ctx.insightType).toBe('store-summary');
    expect(ctx.constraints.length).toBeGreaterThan(0);
    expect(ctx.constraints[0]).toContain('매출 데이터');
    expect(ctx.generatedAt).toBeDefined();
  });

  it('includes data points from contextData', () => {
    const ctx = buildContext(baseRequest);

    expect(ctx.dataPoints.revenue).toBe(1500000);
    expect(ctx.dataPoints.patientCount).toBe(42);
  });

  it('applies different constraints per service', () => {
    const kpaCtx = buildContext({ ...baseRequest, service: 'kpa' });
    const netureCtx = buildContext({ ...baseRequest, service: 'neture' });

    expect(kpaCtx.constraints[0]).toContain('약사회');
    expect(netureCtx.constraints[0]).toContain('매출');
  });

  describe('data sanitization', () => {
    it('truncates strings over 5000 chars', () => {
      const longString = 'x'.repeat(6000);
      const ctx = buildContext({
        ...baseRequest,
        contextData: { longField: longString },
      });

      const val = ctx.dataPoints.longField as string;
      expect(val.length).toBeLessThan(6000);
      expect(val).toContain('[truncated]');
    });

    it('limits arrays to 100 items', () => {
      const bigArray = Array.from({ length: 200 }, (_, i) => i);
      const ctx = buildContext({
        ...baseRequest,
        contextData: { items: bigArray },
      });

      expect((ctx.dataPoints.items as number[]).length).toBe(100);
    });

    it('strips functions and undefined', () => {
      const ctx = buildContext({
        ...baseRequest,
        contextData: {
          valid: 'yes',
          fn: () => {},
          undef: undefined,
        },
      });

      expect(ctx.dataPoints.valid).toBe('yes');
      expect('fn' in ctx.dataPoints).toBe(false);
      expect('undef' in ctx.dataPoints).toBe(false);
    });
  });
});

// ─────────────────────────────────────────────────────
// 2. Prompt Composer
// ─────────────────────────────────────────────────────

describe('Prompt Composer', () => {
  it('generates system prompt with role and constraints', () => {
    const ctx = buildContext({
      service: 'neture',
      insightType: 'store-summary',
      contextData: { revenue: 100 },
      user: { id: 'u1', role: 'neture:operator' },
    });

    const prompt = composePrompt(ctx);

    expect(prompt.systemPrompt).toContain('neture');
    expect(prompt.systemPrompt).toContain('JSON');
    expect(prompt.systemPrompt).toContain('매출 데이터');
  });

  it('generates user prompt with data', () => {
    const ctx = buildContext({
      service: 'neture',
      insightType: 'seller-growth',
      contextData: { orderGrowth: 15.3 },
      user: { id: 'u1', role: 'neture:operator' },
    });

    const prompt = composePrompt(ctx);

    expect(prompt.userPrompt).toContain('neture');
    expect(prompt.userPrompt).toContain('seller-growth');
    expect(prompt.userPrompt).toContain('15.3');
  });

  it('includes JSON response schema', () => {
    const ctx = buildContext({
      service: 'kpa',
      insightType: 'operator-risk',
      contextData: {},
      user: { id: 'u1', role: 'kpa:admin' },
    });

    const prompt = composePrompt(ctx);

    expect(prompt.responseSchema).toContain('summary');
    expect(prompt.responseSchema).toContain('riskLevel');
    expect(prompt.responseSchema).toContain('confidenceScore');
  });
});

// ─────────────────────────────────────────────────────
// 3. Response Normalizer
// ─────────────────────────────────────────────────────

describe('Response Normalizer', () => {
  describe('valid JSON responses', () => {
    it('parses clean JSON', () => {
      const raw = JSON.stringify({
        summary: '매출이 증가 추세입니다.',
        riskLevel: 'low',
        recommendedActions: ['재고 확인', '캠페인 검토'],
        confidenceScore: 0.85,
      });

      const insight = normalizeResponse(raw);

      expect(insight.summary).toBe('매출이 증가 추세입니다.');
      expect(insight.riskLevel).toBe('low');
      expect(insight.recommendedActions).toHaveLength(2);
      expect(insight.confidenceScore).toBe(0.85);
    });

    it('extracts JSON from markdown code fence', () => {
      const raw = '```json\n{"summary": "test", "confidenceScore": 0.7}\n```';
      const insight = normalizeResponse(raw);

      expect(insight.summary).toBe('test');
      expect(insight.confidenceScore).toBe(0.7);
    });

    it('extracts JSON embedded in text', () => {
      const raw = 'Here is the result: {"summary": "found", "confidenceScore": 0.5} end';
      const insight = normalizeResponse(raw);

      expect(insight.summary).toBe('found');
    });
  });

  describe('safe defaults', () => {
    it('provides default summary when missing', () => {
      const insight = normalizeResponse('{}');

      expect(insight.summary).toContain('분석 결과를 생성할 수 없습니다');
    });

    it('defaults confidenceScore to 0.5 when missing', () => {
      const insight = normalizeResponse('{"summary": "ok"}');

      expect(insight.confidenceScore).toBe(0.5);
    });

    it('clamps confidenceScore to 0-1 range', () => {
      const insight = normalizeResponse('{"summary":"ok","confidenceScore":5.0}');
      expect(insight.confidenceScore).toBe(1.0);

      const insight2 = normalizeResponse('{"summary":"ok","confidenceScore":-1}');
      expect(insight2.confidenceScore).toBe(0);
    });

    it('ignores invalid riskLevel', () => {
      const insight = normalizeResponse('{"summary":"ok","riskLevel":"critical"}');
      expect(insight.riskLevel).toBeUndefined();
    });

    it('filters non-string items from recommendedActions', () => {
      const insight = normalizeResponse(
        '{"summary":"ok","recommendedActions":["valid",123,null,"also valid"]}'
      );
      expect(insight.recommendedActions).toEqual(['valid', 'also valid']);
    });
  });

  describe('error handling', () => {
    it('throws on completely invalid content', () => {
      expect(() => normalizeResponse('not json at all')).toThrow();
    });
  });
});

// ─────────────────────────────────────────────────────
// 4. Action Mapper
// ─────────────────────────────────────────────────────

describe('Action Mapper', () => {
  it('maps known neture recommendations to triggers', () => {
    const insight: AIInsight = {
      summary: 'test',
      recommendedActions: ['캠페인 제안'],
      confidenceScore: 0.8,
    };

    const mappings = mapActions('neture', insight);

    expect(mappings[0].triggerId).toBe('neture.suggest.campaign');
    expect(mappings[0].requiresApproval).toBe(true);
  });

  it('handles unknown recommendations gracefully', () => {
    const insight: AIInsight = {
      summary: 'test',
      recommendedActions: ['알 수 없는 작업'],
      confidenceScore: 0.5,
    };

    const mappings = mapActions('neture', insight);

    expect(mappings).toHaveLength(1);
    expect(mappings[0].triggerId).toBeUndefined();
    expect(mappings[0].requiresApproval).toBe(true); // default to requiring approval
    expect(mappings[0].recommendation).toBe('알 수 없는 작업');
  });

  it('assigns priority based on risk and position', () => {
    const insight: AIInsight = {
      summary: 'test',
      riskLevel: 'high',
      recommendedActions: ['first', 'second', 'third'],
      confidenceScore: 0.9,
    };

    const mappings = mapActions('kpa', insight);

    expect(mappings[0].priority).toBe(1); // high risk + index 0
    expect(mappings[1].priority).toBe(2); // high risk + index > 0
    expect(mappings[2].priority).toBe(2); // high risk + index > 0
  });

  it('assigns lower priority for low risk', () => {
    const insight: AIInsight = {
      summary: 'test',
      riskLevel: 'low',
      recommendedActions: ['first', 'second'],
      confidenceScore: 0.5,
    };

    const mappings = mapActions('kpa', insight);

    expect(mappings[0].priority).toBe(2); // index 0, not high risk
    expect(mappings[1].priority).toBe(3); // index > 0, not high risk
  });
});

// ─────────────────────────────────────────────────────
// 5. Provider structural checks
// ─────────────────────────────────────────────────────

describe('Provider structural checks', () => {
  it('GeminiProvider has correct id', () => {
    // Import at test time to avoid actual API calls
    const { GeminiProvider } = require('@o4o/ai-core');
    const provider = new GeminiProvider();
    expect(provider.id).toBe('gemini');
  });

  it('OpenAIProvider has correct id', () => {
    const { OpenAIProvider } = require('@o4o/ai-core');
    const provider = new OpenAIProvider();
    expect(provider.id).toBe('openai');
  });

  it('GeminiProvider.complete rejects without API key', async () => {
    const { GeminiProvider } = require('@o4o/ai-core');
    const provider = new GeminiProvider();

    await expect(
      provider.complete('sys', 'user', { apiKey: '', model: 'gemini-2.0-flash' })
    ).rejects.toThrow('GEMINI_API_KEY');
  });

  it('OpenAIProvider.complete rejects without API key', async () => {
    const { OpenAIProvider } = require('@o4o/ai-core');
    const provider = new OpenAIProvider();

    await expect(
      provider.complete('sys', 'user', { apiKey: '', model: 'gpt-4o-mini' })
    ).rejects.toThrow('OPENAI_API_KEY');
  });
});

// ─────────────────────────────────────────────────────
// 6. Gemini Web Research (grounding) — Capability A
//    WO-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-A-GEMINI-WEB-RESEARCH-V1
// ─────────────────────────────────────────────────────

describe('Gemini grounding (Web Research capability)', () => {
  const realFetch = global.fetch;
  let captured: { url: string; body: any } | null = null;

  function mockFetch(responseJson: any) {
    captured = null;
    global.fetch = (async (url: any, init: any) => {
      captured = { url: String(url), body: JSON.parse(init.body) };
      return {
        ok: true,
        status: 200,
        json: async () => responseJson,
        text: async () => JSON.stringify(responseJson),
      } as any;
    }) as any;
  }

  afterEach(() => {
    global.fetch = realFetch;
    captured = null;
  });

  function newProvider() {
    const { GeminiProvider } = require('@o4o/ai-core');
    return new GeminiProvider();
  }

  // ① grounding=true → tools:[{google_search:{}}] 존재 · responseMimeType 부재(text 경로)
  it('grounding=true adds google_search tool and drops responseMimeType', async () => {
    mockFetch({
      candidates: [{ content: { parts: [{ text: '근거 있는 답변입니다.' }] } }],
      usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20 },
    });
    const provider = newProvider();
    await provider.complete('sys', 'user', {
      apiKey: 'k', model: 'gemini-2.5-flash', grounding: true, responseMode: 'text',
    });
    expect(captured!.body.tools).toEqual([{ google_search: {} }]);
    expect(captured!.body.generationConfig.responseMimeType).toBeUndefined();
  });

  // ② groundingMetadata → response.grounding.{used,queries,sources} 정규화
  it('parses groundingMetadata into response.grounding', async () => {
    mockFetch({
      candidates: [{
        content: { parts: [{ text: '답변' }] },
        groundingMetadata: {
          webSearchQueries: ['우루사정 성분'],
          groundingChunks: [
            { web: { uri: 'https://example.com/a', title: 'A' } },
            { web: { uri: '', title: '빈-uri' } },
          ],
        },
      }],
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 8 },
    });
    const provider = newProvider();
    const r = await provider.complete('sys', 'user', {
      apiKey: 'k', model: 'gemini-2.5-flash', grounding: true, responseMode: 'text',
    });
    expect(r.grounding).toBeDefined();
    expect(r.grounding.used).toBe(true);
    expect(r.grounding.queries).toEqual(['우루사정 성분']);
    // 빈 uri 출처는 제거된다
    expect(r.grounding.sources).toEqual([{ uri: 'https://example.com/a', title: 'A' }]);
  });

  // ③ groundingMetadata 부재 → used:false (grounded 로 간주하지 않음)
  it('reports used:false when no groundingMetadata present', async () => {
    mockFetch({
      candidates: [{ content: { parts: [{ text: '답변' }] } }],
      usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 8 },
    });
    const provider = newProvider();
    const r = await provider.complete('sys', 'user', {
      apiKey: 'k', model: 'gemini-2.5-flash', grounding: true, responseMode: 'text',
    });
    expect(r.grounding.used).toBe(false);
    expect(r.grounding.sources).toEqual([]);
  });

  // ④ 회귀 가드 — grounding 미지정 호출 body 는 종전과 동일
  it('non-grounded call keeps JSON mode and adds no tools (regression guard)', async () => {
    mockFetch({
      candidates: [{ content: { parts: [{ text: '{"summary":"ok","confidenceScore":0.5}' }] } }],
      usageMetadata: { promptTokenCount: 3, candidatesTokenCount: 4 },
    });
    const provider = newProvider();
    const r = await provider.complete('sys', 'user', { apiKey: 'k', model: 'gemini-2.5-flash' });
    expect(captured!.body.generationConfig.responseMimeType).toBe('application/json');
    expect(captured!.body.tools).toBeUndefined();
    expect(r.grounding).toBeUndefined();
  });

  // ⑤ 명시 responseMode:'json' + grounding → INVALID_ARGUMENT
  it('rejects explicit json responseMode combined with grounding', async () => {
    mockFetch({ candidates: [{ content: { parts: [{ text: 'x' }] } }] });
    const provider = newProvider();
    await expect(
      provider.complete('sys', 'user', {
        apiKey: 'k', model: 'gemini-2.5-flash', grounding: true, responseMode: 'json',
      }),
    ).rejects.toThrow('INVALID_ARGUMENT');
  });
});

describe('execute() grounding routing', () => {
  const realFetch = global.fetch;
  afterEach(() => { global.fetch = realFetch; });

  it('execute rejects grounding on non-gemini provider', async () => {
    const { execute } = require('@o4o/ai-core');
    await expect(
      execute({
        systemPrompt: 'sys', userPrompt: 'user', provider: 'openai', grounding: true,
        config: { apiKey: 'k', model: 'gpt-4o-mini' },
      }),
    ).rejects.toThrow('INVALID_ARGUMENT');
  });

  it('execute defaults grounding to text path and returns grounding metadata', async () => {
    let capturedBody: any = null;
    global.fetch = (async (_url: any, init: any) => {
      capturedBody = JSON.parse(init.body);
      return {
        ok: true, status: 200,
        json: async () => ({
          candidates: [{
            content: { parts: [{ text: '자유 텍스트 답변' }] },
            groundingMetadata: { webSearchQueries: ['q'], groundingChunks: [{ web: { uri: 'https://e.com', title: 'E' } }] },
          }],
          usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 2 },
        }),
        text: async () => '',
      } as any;
    }) as any;
    const { execute } = require('@o4o/ai-core');
    const r = await execute({
      systemPrompt: 'sys', userPrompt: 'user', provider: 'gemini', grounding: true,
      config: { apiKey: 'k', model: 'gemini-2.5-flash' },
    });
    // text 경로로 분리 — JSON 강제 없음
    expect(capturedBody.generationConfig.responseMimeType).toBeUndefined();
    expect(capturedBody.tools).toEqual([{ google_search: {} }]);
    expect(r.grounding.used).toBe(true);
    expect(r.grounding.queries).toEqual(['q']);
  });
});
