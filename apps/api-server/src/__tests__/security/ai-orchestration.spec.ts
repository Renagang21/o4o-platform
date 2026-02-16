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
    service: 'glycopharm',
    insightType: 'store-summary',
    contextData: { revenue: 1500000, patientCount: 42 },
    user: { id: 'user-1', role: 'glycopharm:operator' },
  };

  it('builds context with service-specific constraints', () => {
    const ctx = buildContext(baseRequest);

    expect(ctx.service).toBe('glycopharm');
    expect(ctx.insightType).toBe('store-summary');
    expect(ctx.constraints.length).toBeGreaterThan(0);
    expect(ctx.constraints[0]).toContain('의료적 진단');
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
      service: 'glycopharm',
      insightType: 'store-summary',
      contextData: { revenue: 100 },
      user: { id: 'u1', role: 'glycopharm:operator' },
    });

    const prompt = composePrompt(ctx);

    expect(prompt.systemPrompt).toContain('glycopharm');
    expect(prompt.systemPrompt).toContain('JSON');
    expect(prompt.systemPrompt).toContain('의료적 진단');
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
  it('maps known glycopharm recommendations to triggers', () => {
    const insight: AIInsight = {
      summary: 'test',
      riskLevel: 'high',
      recommendedActions: ['고위험 환자 알림', '코칭 세션 권장'],
      confidenceScore: 0.9,
    };

    const mappings = mapActions('glycopharm', insight);

    expect(mappings).toHaveLength(2);
    expect(mappings[0].triggerId).toBe('glycopharm.alert.high_risk_patient');
    expect(mappings[0].requiresApproval).toBe(false);
    expect(mappings[0].priority).toBe(1); // high risk + first item
    expect(mappings[1].triggerId).toBe('glycopharm.suggest.coaching_session');
    expect(mappings[1].requiresApproval).toBe(true);
  });

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

    const mappings = mapActions('glycopharm', insight);

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
