/**
 * WO-O4O-AI-MULTI-PROVIDER-RUNTIME-V0
 *
 * 두 provider(gemini / openai)를 하나의 공통 런타임에서 선택 호출하는 계약을 고정한다.
 * 네트워크·DB 호출 없음 — 해석기와 정규화기는 순수 함수이고, provider adapter 는
 * `fetch` 를 stub 으로 대체해 **실제로 나가는 request body** 를 검사한다.
 *
 * 특히 고정하려는 것:
 *   - provider 선택 3경로(호출부 명시 / env / 코드 기본값)와 잘못된 값의 안전한 처리
 *   - OpenAI 현행 세대 모델에 `temperature` 를 보내지 않고 `max_completion_tokens` 를 쓴다
 *   - 구세대 모델은 종전 계약(`max_tokens` + `temperature`)을 유지한다
 *   - provider 마다 다른 오류 문자열이 공통 코드로 접힌다
 *   - 사용자에게 나가는 문구에 키·provider·모델·상태코드가 없다
 */

jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() },
}));

import {
  isRuntimeProvider,
  resolveProvider,
  resolveDefaultProvider,
  resolveModelForProvider,
  normalizeAiError,
  aiErrorUserMessage,
  FALLBACK_DEFAULT_PROVIDER,
  OPENAI_DEFAULT_MODEL,
  type AiErrorCode,
} from '../utils/ai-provider-runtime.js';
import { OpenAIProvider, isReasoningGenerationModel } from '@o4o/ai-core';

const ENV_KEYS = ['AI_DEFAULT_PROVIDER', 'AI_DEFAULT_MODEL_OPENAI'] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const k of ENV_KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
});
afterEach(() => {
  for (const k of ENV_KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

// ─── provider 선택 (§19-3,4,5 · §16) ─────────────────────────────────────────

describe('provider 선택', () => {
  it('5. 알 수 없는 provider 는 채택하지 않는다', () => {
    for (const bad of ['claude', 'qwen', 'OPENAI ', '', null, undefined, 42, {}]) {
      expect(isRuntimeProvider(bad)).toBe(false);
    }
    expect(isRuntimeProvider('gemini')).toBe(true);
    expect(isRuntimeProvider('openai')).toBe(true);
  });

  it('4. 기본 provider — env 없으면 코드 기본값(gemini)', () => {
    expect(resolveDefaultProvider()).toBe(FALLBACK_DEFAULT_PROVIDER);
    expect(FALLBACK_DEFAULT_PROVIDER).toBe('gemini');
  });

  it('4. AI_DEFAULT_PROVIDER 로 기본값을 바꾼다 (코드 변경 없이 전환)', () => {
    process.env.AI_DEFAULT_PROVIDER = 'openai';
    expect(resolveDefaultProvider()).toBe('openai');
    process.env.AI_DEFAULT_PROVIDER = 'GEMINI';
    expect(resolveDefaultProvider()).toBe('gemini'); // 대소문자 허용
  });

  it('오타 env 는 장애로 만들지 않고 기본값으로 접는다', () => {
    process.env.AI_DEFAULT_PROVIDER = 'opemai';
    expect(resolveDefaultProvider()).toBe(FALLBACK_DEFAULT_PROVIDER);
  });

  it('3. 호출부가 명시하면 그것이 우선한다 (env 보다 위)', () => {
    process.env.AI_DEFAULT_PROVIDER = 'gemini';
    expect(resolveProvider('openai')).toBe('openai');
    process.env.AI_DEFAULT_PROVIDER = 'openai';
    expect(resolveProvider('gemini')).toBe('gemini');
  });

  it('명시값이 유효하지 않으면 기본값으로 접는다 (요청이 런타임을 깨지 못한다)', () => {
    process.env.AI_DEFAULT_PROVIDER = 'openai';
    expect(resolveProvider('claude')).toBe('openai');
    expect(resolveProvider(undefined)).toBe('openai');
  });
});

// ─── 모델 해석 ───────────────────────────────────────────────────────────────

describe('provider 별 모델 해석', () => {
  it('openai 기본 모델은 현행 플래그십이다', async () => {
    await expect(resolveModelForProvider('openai')).resolves.toBe(OPENAI_DEFAULT_MODEL);
    expect(OPENAI_DEFAULT_MODEL).toBe('gpt-6-astra');
  });

  it('AI_DEFAULT_MODEL_OPENAI 로 모델을 바꾼다 (단가 조절 경로)', async () => {
    process.env.AI_DEFAULT_MODEL_OPENAI = 'gpt-5.6-luna';
    await expect(resolveModelForProvider('openai')).resolves.toBe('gpt-5.6-luna');
  });

  it('whitelist 밖 모델은 채택하지 않고 기본 모델로 접는다', async () => {
    process.env.AI_DEFAULT_MODEL_OPENAI = 'gpt-9-imaginary';
    await expect(resolveModelForProvider('openai')).resolves.toBe(OPENAI_DEFAULT_MODEL);
  });
});

// ─── OpenAI adapter 파라미터 계약 (§19-2) ────────────────────────────────────

describe('OpenAI adapter — 세대별 파라미터', () => {
  const okResponse = {
    ok: true,
    json: async () => ({ choices: [{ message: { content: '안녕하세요' } }], usage: {} }),
  };

  function stubFetch() {
    const calls: Array<{ url: string; body: any }> = [];
    (global as any).fetch = jest.fn(async (url: string, init: any) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return okResponse as any;
    });
    return calls;
  }

  afterEach(() => {
    delete (global as any).fetch;
  });

  it('세대 판별', () => {
    for (const m of ['gpt-6-astra', 'gpt-5.6-luna', 'gpt-5', 'gpt-5-mini', 'o3']) {
      expect(isReasoningGenerationModel(m)).toBe(true);
    }
    for (const m of ['gpt-4o', 'gpt-4.1', 'gpt-4o-mini']) {
      expect(isReasoningGenerationModel(m)).toBe(false);
    }
  });

  it('2. 현행 세대: temperature 를 보내지 않고 max_completion_tokens 를 쓴다', async () => {
    const calls = stubFetch();
    const provider = new OpenAIProvider();

    await provider.complete('sys', 'user', {
      apiKey: 'test-key-not-real',
      model: 'gpt-6-astra',
      maxTokens: 1234,
      temperature: 0.5, // 호출부가 줘도 무시돼야 한다
      responseMode: 'text',
    });

    expect(calls).toHaveLength(1);
    const body = calls[0].body;
    expect(body.model).toBe('gpt-6-astra');
    expect(body.max_completion_tokens).toBe(1234);
    expect(body).not.toHaveProperty('max_tokens');
    expect(body).not.toHaveProperty('temperature');
    expect(body).not.toHaveProperty('top_p');
    // text 모드에서는 JSON 강제를 걸지 않는다
    expect(body).not.toHaveProperty('response_format');
  });

  it('구세대: 종전 계약(max_tokens + temperature)을 유지한다', async () => {
    const calls = stubFetch();
    const provider = new OpenAIProvider();

    await provider.complete('sys', 'user', {
      apiKey: 'test-key-not-real',
      model: 'gpt-4o',
      maxTokens: 999,
      temperature: 0.2,
      responseMode: 'text',
    });

    const body = calls[0].body;
    expect(body.max_tokens).toBe(999);
    expect(body.temperature).toBe(0.2);
    expect(body).not.toHaveProperty('max_completion_tokens');
  });

  it('json 모드에서는 response_format 을 건다 (양 세대 공통)', async () => {
    const calls = stubFetch();
    const provider = new OpenAIProvider();
    await provider.complete('sys', 'user', {
      apiKey: 'k', model: 'gpt-6-astra', responseMode: 'json',
    } as any).catch(() => undefined); // json 파싱 실패는 무관
    expect(calls[0].body.response_format).toEqual({ type: 'json_object' });
  });

  it('키가 없으면 호출 전에 막는다', async () => {
    const calls = stubFetch();
    const provider = new OpenAIProvider();
    await expect(
      provider.complete('sys', 'user', { apiKey: '', model: 'gpt-6-astra' } as any),
    ).rejects.toThrow(/not configured/i);
    expect(calls).toHaveLength(0);
  });
});

// ─── 오류 정규화 (§19-6,7,8,9 · §14) ─────────────────────────────────────────

describe('오류 정규화 — provider 무관 공통 코드', () => {
  const cases: Array<[string, string, AiErrorCode]> = [
    ['6. openai auth', 'OpenAI API error 401: {"error":{"message":"Incorrect API key provided: sk-abc123"}}', 'AUTH_ERROR'],
    ['6. gemini auth', 'Gemini API error 400: API key not valid. Please pass a valid API key.', 'AUTH_ERROR'],
    ['7. openai rate limit', 'OpenAI API error 429: {"error":{"message":"Rate limit reached"}}', 'RATE_LIMIT'],
    ['7. gemini quota', 'Gemini API error 429: RESOURCE_EXHAUSTED quota exceeded', 'RATE_LIMIT'],
    // 2026-09-09 프로덕션 실측 원문. 429 + "quota" 인데 rate limit 이 아니다.
    ['크레딧 소진(실측)', 'OpenAI API error 429: {"error":{"message":"You have no credits remaining. Add credits to continue using the API at https://platform.openai.com/settings/organization/billing/.","type":"insufficient_quota"}}', 'INSUFFICIENT_QUOTA'],
    ['크레딧 소진(문구 변형)', 'You exceeded your current quota, please check your plan and billing details', 'INSUFFICIENT_QUOTA'],
    ['8. openai timeout', 'OpenAI API timeout after 90000ms', 'TIMEOUT'],
    ['8. gemini timeout', 'Gemini API timeout after 90000ms', 'TIMEOUT'],
    ['provider 5xx', 'OpenAI API error 503: service unavailable', 'PROVIDER_UNAVAILABLE'],
    ['키 미설정', 'AI_NOT_CONFIGURED: openai API key missing', 'AI_NOT_CONFIGURED'],
    ['알 수 없는 provider', "INVALID_PROVIDER: Unknown provider 'claude'", 'INVALID_PROVIDER'],
    ['모델 오류', 'OpenAI API error 404: The model `gpt-9` does not exist', 'INVALID_MODEL'],
    ['기타', 'something unexpected happened', 'PROVIDER_ERROR'],
  ];

  it.each(cases)('%s → %s', (_label, raw, expected) => {
    expect(normalizeAiError(new Error(raw)).code).toBe(expected);
  });

  it('429 와 401 이 한 메시지에 섞여도 rate limit 을 우선한다', () => {
    expect(normalizeAiError(new Error('429 too many requests (api key tier)')).code).toBe('RATE_LIMIT');
  });

  it('retryable 판정', () => {
    expect(normalizeAiError(new Error('429 rate limit')).retryable).toBe(true);
    expect(normalizeAiError(new Error('timeout after 1000ms')).retryable).toBe(true);
    expect(normalizeAiError(new Error('401 invalid api key')).retryable).toBe(false);
  });

  it('Error 가 아닌 값도 안전하게 처리한다', () => {
    for (const e of [undefined, null, 'plain string', { weird: true }]) {
      expect(typeof normalizeAiError(e).code).toBe('string');
    }
  });

  it('9. 사용자 문구에 키·provider·모델·상태코드가 없다', () => {
    const leaky = new Error(
      'OpenAI API error 401: Incorrect API key provided: sk-proj-SECRETVALUE123 (model gpt-6-astra)',
    );
    const { code } = normalizeAiError(leaky);
    const msg = aiErrorUserMessage(code);
    expect(msg).not.toMatch(/sk-|api key|openai|gemini|gpt-|401|astra/i);
    expect(msg).toBe('AI 기능을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.');
  });

  it('크레딧 소진을 rate limit 으로 접지 않는다 (재시도 안내 금지)', () => {
    const quota = new Error(
      'OpenAI API error 429: {"error":{"message":"You have no credits remaining.","type":"insufficient_quota"}}',
    );
    const n = normalizeAiError(quota);
    expect(n.code).toBe('INSUFFICIENT_QUOTA');
    // 재시도로 해결되지 않는다 → retryable false, 그리고 "잠시 후" 문구가 아니어야 한다.
    expect(n.retryable).toBe(false);
    const msg = aiErrorUserMessage(n.code);
    expect(msg).not.toMatch(/잠시 후/);
    expect(msg).toMatch(/소진/);
    // 결제·크레딧 같은 내부 사정은 노출하지 않는다.
    expect(msg).not.toMatch(/credit|billing|quota|openai|결제/i);
  });

  it('순수 rate limit 은 여전히 RATE_LIMIT 이다 (분리가 과잉되지 않았다)', () => {
    const rl = normalizeAiError(new Error('OpenAI API error 429: Rate limit reached for gpt-6-astra'));
    expect(rl.code).toBe('RATE_LIMIT');
    expect(rl.retryable).toBe(true);
  });

  it('모든 코드가 사용자 문구를 갖는다 (미정의 코드로 빈 응답이 나가지 않는다)', () => {
    const codes: AiErrorCode[] = [
      'AI_NOT_CONFIGURED', 'INVALID_PROVIDER', 'AUTH_ERROR', 'RATE_LIMIT', 'INSUFFICIENT_QUOTA',
      'TIMEOUT', 'PROVIDER_UNAVAILABLE', 'INVALID_MODEL', 'PROVIDER_ERROR',
    ];
    for (const c of codes) {
      const m = aiErrorUserMessage(c);
      expect(typeof m).toBe('string');
      expect(m.length).toBeGreaterThan(0);
      expect(m).not.toMatch(/sk-|api key|gpt-|gemini/i);
    }
  });
});
