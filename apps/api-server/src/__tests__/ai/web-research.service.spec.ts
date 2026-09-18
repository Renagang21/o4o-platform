/**
 * Web Research Service — admin 모델 해석 → grounding end-to-end 통합 테스트
 *
 * WO-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-A-GEMINI-WEB-RESEARCH-V1 (Capability A 종료 게이트)
 *
 * 검증:
 *   admin(AiQueryPolicy.defaultModel) → resolveEditingModel() → runWebResearch()
 *     → execute({ provider:'gemini', grounding:true }) → 실제 Gemini 요청
 *
 * - ADMIN_MODEL_RESOLUTION: admin 이 고른 모델이 fallback 이 아니라 실제로 읽혀 요청에 실린다.
 * - WEB_RESEARCH_USES_ADMIN_MODEL: 그 모델이 grounding 요청 URL 에 그대로 사용된다.
 * - grounding=true 가 적용되고(googleSearch tool) groundingMetadata 가 정규화된다.
 * - 범용성: 특정 사이트/약품 로직 없이 임의 질의를 그대로 전달한다.
 *
 * DB·외부 호출은 mock (AppDataSource / global.fetch). 실제 키·네트워크 불필요.
 */

// ── AppDataSource mock (admin SSOT + ai_settings 키 조회 대체) ──
const mockFindOne = jest.fn();
jest.mock('../../database/connection.js', () => ({
  AppDataSource: {
    isInitialized: true,
    // resolveEditingModel: getRepository(AiQueryPolicy).findOne({ where: { id: 1 } })
    getRepository: () => ({ findOne: mockFindOne }),
    // resolveAiApiKey: ai_settings 조회 → [] → env fallback
    query: jest.fn(async () => [] as unknown[]),
  },
}));

import { runWebResearch } from '../../services/ai/web-research.service.js';
import { GEMINI_CANONICAL_MODEL } from '../../types/ai-proxy.types.js';

const GROUNDED_RESPONSE = {
  candidates: [
    {
      content: { parts: [{ text: '근거에 기반한 답변입니다.' }] },
      groundingMetadata: {
        webSearchQueries: ['테스트 질의'],
        groundingChunks: [
          { web: { uri: 'https://example.com/a', title: 'A' } },
          { web: { uri: 'https://example.org/b', title: 'B' } },
        ],
      },
    },
  ],
  usageMetadata: { promptTokenCount: 11, candidatesTokenCount: 22 },
};

describe('runWebResearch — admin 모델 해석 → grounding end-to-end', () => {
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

  beforeEach(() => {
    mockFindOne.mockReset();
    delete process.env.AI_DEFAULT_MODEL; // fallback 결정성 확보
    process.env.GEMINI_API_KEY = 'test-key'; // resolveAiApiKey env fallback
  });

  afterEach(() => {
    global.fetch = realFetch;
    captured = null;
    delete process.env.GEMINI_API_KEY;
  });

  // ① ADMIN_MODEL_RESOLUTION — admin 이 고른 모델(fallback 과 다른 값)이 실제로 읽혀 요청에 실린다.
  it('admin-selected model (≠ fallback) is resolved and used in the request', async () => {
    // fallback 은 gemini-3.8-flash — 여기서는 admin 이 gemini-2.5-pro 를 골랐다고 둔다.
    expect(GEMINI_CANONICAL_MODEL).toBe('gemini-3.8-flash');
    mockFindOne.mockResolvedValue({ id: 1, defaultModel: 'gemini-2.5-pro' });
    mockFetch(GROUNDED_RESPONSE);

    const r = await runWebResearch({ query: '임의의 범용 리서치 질의' });

    // admin 값이 fallback 이 아니라 실제로 읽혔다.
    expect(mockFindOne).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(r.model).toBe('gemini-2.5-pro');
    expect(r.model).not.toBe(GEMINI_CANONICAL_MODEL);
    // WEB_RESEARCH_USES_ADMIN_MODEL — 요청 URL 이 admin 모델을 그대로 사용.
    expect(captured!.url).toContain('/models/gemini-2.5-pro:generateContent');
  });

  // ② 운영 canonical 케이스 — admin 활성 모델 = gemini-3.8-flash → grounding PASS.
  it('canonical admin model gemini-3.8-flash flows through with grounding used', async () => {
    mockFindOne.mockResolvedValue({ id: 1, defaultModel: GEMINI_CANONICAL_MODEL });
    mockFetch(GROUNDED_RESPONSE);

    const r = await runWebResearch({ query: '2024년 노벨 물리학상 수상자는?' });

    expect(r.model).toBe(GEMINI_CANONICAL_MODEL);
    expect(captured!.url).toContain(`/models/${GEMINI_CANONICAL_MODEL}:generateContent`);
    // grounding=true 적용 + metadata 정규화
    expect(captured!.body.tools).toEqual([{ google_search: {} }]);
    expect(captured!.body.generationConfig.responseMimeType).toBeUndefined(); // text 경로
    expect(r.grounding?.used).toBe(true);
    expect(r.grounding?.sources?.length).toBe(2);
    expect(r.grounding?.queries).toEqual(['테스트 질의']);
  });

  // ③ 범용성 — 임의 질의를 그대로 전달(특정 사이트/약품 로직 없음).
  it('passes an arbitrary query through generically (no domain/site logic)', async () => {
    mockFindOne.mockResolvedValue({ id: 1, defaultModel: GEMINI_CANONICAL_MODEL });
    mockFetch(GROUNDED_RESPONSE);

    const query = '완전히 무관한 임의 주제에 대한 질문';
    await runWebResearch({ query });

    const bodyText = JSON.stringify(captured!.body);
    expect(bodyText).toContain(query); // 질의가 그대로 실림
    // 하드코딩된 특정 도메인이 요청에 섞이지 않는다.
    expect(bodyText).not.toContain('health.kr');
    expect(bodyText).not.toContain('hira');
    expect(bodyText).not.toContain('mfds');
  });

  // ④ admin policy 가 비-gemini 모델이면 안전 fallback(gemini) 으로 강등 — grounding 은 gemini 전용.
  it('falls back to gemini canonical when admin model is non-gemini', async () => {
    mockFindOne.mockResolvedValue({ id: 1, defaultModel: 'gpt-6-astra' });
    mockFetch(GROUNDED_RESPONSE);

    const r = await runWebResearch({ query: '질의' });

    expect(r.model).toBe(GEMINI_CANONICAL_MODEL); // 비-gemini → fallback
    expect(captured!.url).toContain(`/models/${GEMINI_CANONICAL_MODEL}:generateContent`);
  });
});
