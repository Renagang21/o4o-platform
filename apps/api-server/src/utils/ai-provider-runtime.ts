/**
 * AI Multi-Provider Runtime — provider / model / key 해석 + 오류 정규화
 *
 * WO-O4O-AI-MULTI-PROVIDER-RUNTIME-V0
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 무엇을 하는가
 *
 *   `@o4o/ai-core` 의 `execute()` 는 이미 provider 를 인자로 받는다
 *   (`provider?: 'gemini' | 'openai'`, registry dispatch). 즉 **런타임 자체는 이미
 *   multi-provider 다.** 빠져 있던 것은 앱 계층의 "어느 provider 로, 어떤 모델로,
 *   어떤 키로 부를지"를 정하는 해석기뿐이다. 이 파일이 그 해석기다.
 *
 *   기존 `ai-config-resolver.ts` / `ai-editing-model-resolver.ts` 는 **gemini 전용**이라
 *   (모델을 gemini whitelist 로만 검증한다) 그대로는 쓸 수 없다. 그 둘을 바꾸지 않고
 *   (편집 경로 회귀 위험) provider-aware 해석기를 옆에 둔다.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이번 V0 가 하지 않는 것
 *
 *   자동 라우팅 · 업무별 provider 선택 · 비용 기반 선택 · classifier · fallback 체인.
 *   provider 는 (1) 호출부 명시 (2) env 기본값 (3) 코드 기본값 셋으로만 정해진다.
 */

import type { DataSource } from 'typeorm';
import { MODEL_WHITELIST, type AIProvider } from '../types/ai-proxy.types.js';
import { resolveAiApiKey } from './ai-key.util.js';
import { resolveEditingModel } from './ai-editing-model-resolver.js';
import logger from './logger.js';

/** `execute()` 가 실제로 dispatch 할 수 있는 provider (ai-core registry 와 동일 집합). */
export type RuntimeProvider = 'gemini' | 'openai';

const RUNTIME_PROVIDERS: readonly RuntimeProvider[] = ['gemini', 'openai'];

/**
 * 코드 기본 provider.
 *
 * **gemini 다.** 이유: 현재 프로덕션에서 동작이 검증된 경로가 gemini 이고,
 * OpenAI 키가 배포되지 않은 환경에서 기본값을 openai 로 두면 Home AI 가 즉시 죽는다.
 * OpenAI 로 전환하려면 `OPENAI_API_KEY` 배포 후 `AI_DEFAULT_PROVIDER=openai` 만 켜면 된다
 * (코드 변경 불필요).
 */
export const FALLBACK_DEFAULT_PROVIDER: RuntimeProvider = 'gemini';

/** provider 별 모델 env override 이름. 값은 로그·응답에 싣지 않는다. */
const MODEL_ENV_BY_PROVIDER: Record<RuntimeProvider, string> = {
  gemini: 'AI_DEFAULT_MODEL',
  openai: 'AI_DEFAULT_MODEL_OPENAI',
};

/**
 * OpenAI 기본 모델.
 *
 * 2026-09 공식 문서 기준 현행 라인업은 `gpt-6-astra`(플래그십) / `gpt-5.6-sol` /
 * `gpt-5.6-terra` / `gpt-5.6-luna`(경제형) 이다. 기본값은 플래그십으로 두되
 * `AI_DEFAULT_MODEL_OPENAI` 로 바꿀 수 있게 한다 — 단가 차이가 크기 때문이다
 * (astra 입력 $10 / 출력 $50 per 1M · luna 입력 $0.20 / 출력 $1.20 per 1M).
 */
export const OPENAI_DEFAULT_MODEL = 'gpt-6-astra';

export function isRuntimeProvider(value: unknown): value is RuntimeProvider {
  return typeof value === 'string' && (RUNTIME_PROVIDERS as readonly string[]).includes(value);
}

/**
 * 기본 provider 결정 — `AI_DEFAULT_PROVIDER` env → 코드 기본값.
 *
 * 알 수 없는 값이 들어오면 **차단하지 않고** 기본값으로 접는다(경고 로그).
 * 배포 env 오타가 AI 전체 장애가 되면 안 된다.
 */
export function resolveDefaultProvider(): RuntimeProvider {
  const raw = process.env.AI_DEFAULT_PROVIDER?.trim().toLowerCase();
  if (!raw) return FALLBACK_DEFAULT_PROVIDER;
  if (isRuntimeProvider(raw)) return raw;
  logger.warn('AI_DEFAULT_PROVIDER 값이 유효하지 않아 기본 provider 로 대체', {
    configured: raw,
    fallback: FALLBACK_DEFAULT_PROVIDER,
  });
  return FALLBACK_DEFAULT_PROVIDER;
}

/**
 * 호출부 명시 → env 기본 → 코드 기본 (§16 의 3가지 경로).
 *
 * @param requested 호출부가 명시한 provider. 유효하지 않으면 기본값으로 접는다.
 */
export function resolveProvider(requested?: unknown): RuntimeProvider {
  if (requested !== undefined && requested !== null && requested !== '') {
    if (isRuntimeProvider(requested)) return requested;
    logger.warn('요청 provider 가 유효하지 않아 기본 provider 로 대체', { requested });
  }
  return resolveDefaultProvider();
}

/**
 * provider 별 모델 결정.
 *
 * gemini: 기존 `resolveEditingModel()` 을 그대로 재사용한다(정책 → env → fallback,
 *         gemini whitelist 검증 포함). 편집 경로와 같은 모델을 쓴다.
 * openai: `AI_DEFAULT_MODEL_OPENAI` → 기본 모델. whitelist 로 검증한다.
 */
export async function resolveModelForProvider(provider: RuntimeProvider): Promise<string> {
  if (provider === 'gemini') return resolveEditingModel();

  const allowed = MODEL_WHITELIST.openai as readonly string[];
  const env = process.env[MODEL_ENV_BY_PROVIDER.openai]?.trim();
  if (env) {
    if (allowed.includes(env)) return env;
    logger.warn('AI_DEFAULT_MODEL_OPENAI 가 whitelist 에 없어 기본 모델로 대체', {
      configured: env,
      fallback: OPENAI_DEFAULT_MODEL,
    });
  }
  return OPENAI_DEFAULT_MODEL;
}

/** provider 별 API key. `ai_settings` → env 순서는 기존 SSOT(`resolveAiApiKey`) 그대로다. */
export async function resolveKeyForProvider(
  dataSource: DataSource,
  provider: RuntimeProvider,
): Promise<string> {
  return resolveAiApiKey(dataSource, provider as AIProvider);
}

export interface ResolvedAiTarget {
  provider: RuntimeProvider;
  model: string;
  apiKey: string;
}

/**
 * 한 번에 해석한다. 키가 비어 있어도 여기서 던지지 않는다 —
 * `execute()` 가 `AI_NOT_CONFIGURED` 로 처리하고, 호출부가 정규화한다.
 */
export async function resolveAiTarget(
  dataSource: DataSource,
  requestedProvider?: unknown,
): Promise<ResolvedAiTarget> {
  const provider = resolveProvider(requestedProvider);
  const [model, apiKey] = await Promise.all([
    resolveModelForProvider(provider),
    resolveKeyForProvider(dataSource, provider),
  ]);
  return { provider, model, apiKey };
}

// ─── 오류 정규화 (§14) ───────────────────────────────────────────────────────

/**
 * provider 무관 오류 코드.
 *
 * `@o4o/ai-core` 는 코드 없는 평문 `Error` 만 던지고, retry 판정도 문자열 매칭이다.
 * 이 계층에서 **한 번만** 문자열을 해석해 코드로 바꾼다. 호출부는 코드만 본다.
 */
export type AiErrorCode =
  | 'AI_NOT_CONFIGURED'
  | 'INVALID_PROVIDER'
  | 'AUTH_ERROR'
  | 'RATE_LIMIT'
  /**
   * 크레딧·결제 한도 소진. **RATE_LIMIT 과 반드시 구분한다.**
   *
   * OpenAI 는 `insufficient_quota`(크레딧 없음)를 rate limit 과 **같은 HTTP 429** 로 돌려주고
   * 메시지에 "quota" 가 들어간다. 이를 RATE_LIMIT 으로 접으면 "잠시 후 재시도" 안내가 나가는데,
   * 크레딧이 없으면 재시도는 영원히 실패한다 — 운영자가 원인(결제)을 못 보게 된다.
   * (2026-09-09 프로덕션 smoke 에서 실제로 이 오분류가 관측돼 코드를 분리했다.)
   */
  | 'INSUFFICIENT_QUOTA'
  | 'TIMEOUT'
  | 'PROVIDER_UNAVAILABLE'
  | 'INVALID_MODEL'
  | 'PROVIDER_ERROR';

export interface NormalizedAiError {
  code: AiErrorCode;
  /** 재시도가 의미 있는 오류인가. V0 는 자동 재시도를 하지 않고 판단 근거로만 쓴다. */
  retryable: boolean;
}

/**
 * provider 별 원문 오류 → 공통 코드.
 *
 * **원문 메시지를 반환값에 담지 않는다.** 호출부가 사용자 응답에 실을 수 있는 것은
 * 코드뿐이고, 원문(키·모델·상태코드 포함 가능)은 서버 로그에만 남는다.
 */
export function normalizeAiError(error: unknown): NormalizedAiError {
  const raw = typeof (error as { message?: unknown })?.message === 'string'
    ? (error as { message: string }).message
    : String(error ?? '');

  // execute() 가 붙이는 접두사 — provider 도달 전 단계.
  if (/AI_NOT_CONFIGURED|not configured/i.test(raw)) {
    return { code: 'AI_NOT_CONFIGURED', retryable: false };
  }
  if (/INVALID_PROVIDER|Unknown provider/i.test(raw)) {
    return { code: 'INVALID_PROVIDER', retryable: false };
  }

  if (/timeout|timed out|ETIMEDOUT|AbortError/i.test(raw)) {
    return { code: 'TIMEOUT', retryable: true };
  }
  // 크레딧/결제 소진을 rate limit 보다 **먼저** 본다 — 둘 다 429 + "quota" 로 오기 때문에
  // 순서를 바꾸면 결제 문제가 일시적 혼잡으로 잘못 보고된다.
  if (/insufficient_quota|no credits|out of credits|billing|exceeded your current quota|credit balance/i.test(raw)) {
    return { code: 'INSUFFICIENT_QUOTA', retryable: false };
  }
  // 429 는 인증(401/403)보다 먼저 본다 — 두 패턴이 한 메시지에 같이 나오는 경우가 있다.
  if (/\b429\b|rate.?limit|quota|RESOURCE_EXHAUSTED|too many requests/i.test(raw)) {
    return { code: 'RATE_LIMIT', retryable: true };
  }
  if (/\b401\b|\b403\b|api key|apikey|unauthorized|permission denied|invalid_api_key/i.test(raw)) {
    return { code: 'AUTH_ERROR', retryable: false };
  }
  if (/\b(500|502|503|504)\b|unavailable|overloaded|server error/i.test(raw)) {
    return { code: 'PROVIDER_UNAVAILABLE', retryable: true };
  }
  if (/model.*(not found|not exist|unsupported|invalid)|does not exist|INVALID_ARGUMENT/i.test(raw)) {
    return { code: 'INVALID_MODEL', retryable: false };
  }
  return { code: 'PROVIDER_ERROR', retryable: false };
}

/** 코드 → 사용자 문구. 내부 사정(provider·model·key·status)을 드러내지 않는다. */
export function aiErrorUserMessage(code: AiErrorCode): string {
  switch (code) {
    case 'RATE_LIMIT':
      return '요청이 많아 잠시 후 다시 시도해 주세요.';
    case 'INSUFFICIENT_QUOTA':
      // "잠시 후 재시도" 라고 하지 않는다 — 재시도로 해결되지 않는 상태다.
      // 결제·크레딧 같은 내부 사정은 드러내지 않고 관리자 확인만 안내한다.
      return 'AI 사용량이 모두 소진되었습니다. 관리자에게 문의해 주세요.';
    case 'TIMEOUT':
      return '응답이 지연되고 있습니다. 다시 시도해 주세요.';
    case 'AI_NOT_CONFIGURED':
    case 'AUTH_ERROR':
    case 'INVALID_PROVIDER':
    case 'INVALID_MODEL':
      return 'AI 기능을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.';
    default:
      return '응답을 생성하지 못했습니다. 다시 시도해 주세요.';
  }
}
