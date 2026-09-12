/**
 * AI Model Registry — Gemini 모델 목록의 **동적 출처** (Google ListModels) + 정적 fallback
 *
 * WO-O4O-AI-MODEL-DYNAMIC-REGISTRY-V1 (2026-09-12)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 이 파일이 있는가
 *
 *   지금까지 운영 모델은 코드의 `MODEL_WHITELIST.gemini` 에 박혀 있었다. 관리자가 화면에서 새 모델을
 *   골라도 whitelist 에 없으면 조용히 fallback 으로 대체됐고, Google 이 새 모델을 내면 **코드를 고쳐
 *   배포해야** 했다. 과거 `gemini-3.0-flash`(무효 id) 사고 때문에 일부러 좁힌 것이지만 그 대가가 컸다.
 *
 *   이 파일은 그 둘을 동시에 만족시킨다:
 *     - 허용 모델 = **정적 whitelist ∪ Google 이 운영 키로 실제 제공하는 모델**(ListModels, 1시간 캐시)
 *     - 무효 id 는 여전히 거절된다 — Google 목록에도 whitelist 에도 없으면 400.
 *     - Google 조회가 실패하면 마지막 성공 목록(stale) → 그것도 없으면 정적 whitelist 만.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 무엇을 하지 않는가
 *
 *   모델을 **고르지** 않는다. 고르는 것은 관리자(`PUT /api/ai/policy` → `ai_query_policy.default_model`)
 *   이고, 코드는 안전한 fallback(`GEMINI_CANONICAL_MODEL`) 하나만 안다. 가격 · 품질 판단은 사람 몫이다.
 *   API 키는 로그 · 응답 · 오류 메시지에 싣지 않는다.
 */

import type { DataSource } from 'typeorm';
import { GEMINI_CANONICAL_MODEL, MODEL_WHITELIST } from '../types/ai-proxy.types.js';
import { resolveAiApiKey } from '../utils/ai-key.util.js';
import logger from '../utils/logger.js';

const GEMINI_LIST_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
/** Google 목록 캐시 수명. 모델 출시는 드물고, 관리자 화면이 열릴 때마다 Google 을 두드릴 이유가 없다. */
export const GEMINI_MODEL_CACHE_TTL_MS = 60 * 60 * 1000;
const FETCH_TIMEOUT_MS = 6000;

/** 텍스트 생성에 쓸 수 없거나 O4O 용도가 아닌 계열 — 목록에서 뺀다. */
const EXCLUDED_ID_PATTERNS: readonly RegExp[] = [
  /-image/i,
  /-tts/i,
  /transcribe/i,
  /robotics/i,
  /computer-use/i,
  /embedding/i,
  /-live/i,
  /-audio/i,
  /-omni/i,
];

/** Google 이 돌려주는 모델 id 형식. 이 밖의 문자열은 어느 경로로도 모델이 되지 못한다. */
export const GEMINI_MODEL_ID_RE = /^gemini-[a-z0-9][a-z0-9.-]{0,60}$/;

export interface GeminiModelInfo {
  id: string;
  displayName: string;
  description: string;
  inputTokenLimit: number | null;
  outputTokenLimit: number | null;
}

export interface GeminiModelListing {
  models: GeminiModelInfo[];
  /** 'google' = 살아 있는 목록 · 'google-stale' = 캐시 만료 후 재조회 실패 · 'static' = whitelist 만 */
  source: 'google' | 'google-stale' | 'static';
  fetchedAt: string | null;
}

/** ListModels 응답 한 건 → O4O 형상. generateContent 미지원 · 제외 계열 · id 형식 위반은 null. 순수 함수. */
export function toGeminiModelInfo(raw: unknown): GeminiModelInfo | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = String(r.name ?? '').replace(/^models\//, '');
  if (!GEMINI_MODEL_ID_RE.test(id)) return null;
  const methods = Array.isArray(r.supportedGenerationMethods) ? (r.supportedGenerationMethods as unknown[]) : [];
  if (!methods.includes('generateContent')) return null;
  if (EXCLUDED_ID_PATTERNS.some((re) => re.test(id))) return null;
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
  return {
    id,
    displayName: String(r.displayName ?? id).slice(0, 80),
    description: String(r.description ?? '').slice(0, 200),
    inputTokenLimit: num(r.inputTokenLimit),
    outputTokenLimit: num(r.outputTokenLimit),
  };
}

/** 정적 whitelist 를 같은 형상으로. Google 을 못 부를 때의 최소 목록이다. */
export function staticGeminiModels(): GeminiModelInfo[] {
  return (MODEL_WHITELIST.gemini as readonly string[]).map((id) => ({
    id,
    displayName: id,
    description: '',
    inputTokenLimit: null,
    outputTokenLimit: null,
  }));
}

// ─── 캐시 (프로세스 메모리) ───────────────────────────────────────────────────

interface CacheState {
  models: GeminiModelInfo[];
  fetchedAt: number;
}

let cache: CacheState | null = null;
let inflight: Promise<CacheState | null> | null = null;

/** 테스트용 — 캐시 초기화. */
export function resetGeminiModelCache(): void {
  cache = null;
  inflight = null;
}

async function fetchGeminiModels(apiKey: string): Promise<GeminiModelInfo[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const url = `${GEMINI_LIST_URL}?pageSize=200&key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`ListModels HTTP ${res.status}`);
    const body = (await res.json()) as { models?: unknown[] };
    const models = (body.models ?? []).map(toGeminiModelInfo).filter((m): m is GeminiModelInfo => m !== null);
    return models.sort((a, b) => a.id.localeCompare(b.id));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 살아 있는 Google 목록을 돌려준다(캐시 우선). 키가 없거나 조회가 실패하면 null — 호출자가 정적 목록으로 간다.
 * 실패 원문(키 · URL 포함 가능)은 로그에도 싣지 않는다.
 */
export async function ensureGeminiModelCache(dataSource: DataSource, { force = false } = {}): Promise<CacheState | null> {
  const fresh = cache && Date.now() - cache.fetchedAt < GEMINI_MODEL_CACHE_TTL_MS;
  if (fresh && !force) return cache;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const apiKey = await resolveAiApiKey(dataSource, 'gemini');
      if (!apiKey) return cache; // 키가 없으면 stale 유지(없으면 null)
      const models = await fetchGeminiModels(apiKey);
      if (models.length === 0) return cache;
      cache = { models, fetchedAt: Date.now() };
      logger.info('gemini model registry refreshed', { count: models.length });
      return cache;
    } catch (err) {
      logger.warn('gemini model registry refresh failed — using stale/static list', {
        reason: err instanceof Error ? err.name : 'unknown',
      });
      return cache;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** 관리자 화면용 목록. Google 목록이 있으면 그것 + whitelist 에만 있는 항목(레거시)을 뒤에 붙인다. */
export async function listGeminiModels(dataSource: DataSource): Promise<GeminiModelListing> {
  const state = await ensureGeminiModelCache(dataSource);
  if (!state) return { models: staticGeminiModels(), source: 'static', fetchedAt: null };
  const live = state.models;
  const liveIds = new Set(live.map((m) => m.id));
  const legacy = staticGeminiModels().filter((m) => !liveIds.has(m.id));
  const stale = Date.now() - state.fetchedAt >= GEMINI_MODEL_CACHE_TTL_MS;
  return {
    models: [...live, ...legacy],
    source: stale ? 'google-stale' : 'google',
    fetchedAt: new Date(state.fetchedAt).toISOString(),
  };
}

/**
 * 동기 판정 — 정적 whitelist ∪ (마지막으로 받은) Google 목록.
 * `ai-proxy.service` 처럼 동기 경로에서 쓴다. 캐시가 비어 있으면 whitelist 만 본다.
 */
export function isGeminiModelAllowedSync(id: unknown): id is string {
  if (typeof id !== 'string' || !GEMINI_MODEL_ID_RE.test(id)) return false;
  if ((MODEL_WHITELIST.gemini as readonly string[]).includes(id)) return true;
  return !!cache && cache.models.some((m) => m.id === id);
}

/** 비동기 판정 — 캐시를 (필요하면) 채운 뒤 판정한다. 관리자 저장 · 편집 resolver 가 쓴다. */
export async function isGeminiModelAllowed(dataSource: DataSource, id: unknown): Promise<boolean> {
  if (typeof id !== 'string' || !GEMINI_MODEL_ID_RE.test(id)) return false;
  if ((MODEL_WHITELIST.gemini as readonly string[]).includes(id)) return true;
  const state = await ensureGeminiModelCache(dataSource);
  return !!state && state.models.some((m) => m.id === id);
}

export { GEMINI_CANONICAL_MODEL };
