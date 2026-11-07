/**
 * Community forum AI phase 1 — host for the shared AI foundation (WO-O4O-COMMUNITY-FORUM-AI-PHASE1-V1).
 * Single attempt, capped output, `ai_query_policy.ai_enabled`, existing quota and accounting. Results are returned only.
 *
 * Per-user daily limit: counted from the existing `ai_usage_reservations` ledger, so failed provider calls count too
 * and no table is added. The count is read before the reservation is taken; the in-flight guard below keeps one user
 * from racing it inside one instance, so across instances the overshoot is bounded by the instance count.
 */
import { randomUUID } from 'node:crypto';
import { AiExtensionError, runAiExtension, type AiBusinessExtension } from '@o4o/ai-core';
import { AppDataSource } from '../../database/connection.js';
import { AiQueryPolicy } from '../../entities/AiQueryPolicy.js';
import { AiQuotaService } from '../../modules/ai-policy/ai-quota.service.js';
import { resolveEditingModel } from '../../utils/ai-editing-model-resolver.js';
import { resolveAiApiKey } from '../../utils/ai-key.util.js';
import logger from '../../utils/logger.js';
import { createAccountedExtensionRuntime } from '../ai-extensions/accounted-runtime.js';
import {
  createForumComposeExtension,
  createForumKeywordExtension,
  FORUM_AI_COMPOSE_MAX_TOKENS,
  FORUM_AI_KEYWORD_MAX_TOKENS,
  FORUM_AI_SERVICE_ID,
  type ForumAiBoard,
  type ForumComposeAssistInput,
  type ForumComposeAssistOutput,
} from './community-forum-ai-policy.js';

const SCOPE = 'SERVICE_QUERY' as const;
/** `ai_query_policy.free_daily_limit` is the operator's setting; this ceiling keeps a typo from becoming a cost. */
export const FORUM_AI_DAILY_CEILING = 30;
const TIMEOUT_MS = 24000;

export type ForumAiUnavailableReason = 'AI_DISABLED' | 'AI_NOT_CONFIGURED' | 'AI_DAILY_LIMIT_EXCEEDED' | 'AI_QUOTA_EXCEEDED' | 'AI_UNAVAILABLE';
export interface ForumAiStatus {
  available: boolean;
  reason: ForumAiUnavailableReason | null;
  dailyLimit: number;
  remainingToday: number;
}

export class ForumAiError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code);
    this.name = 'ForumAiError';
  }
}
const unavailableStatus: Record<ForumAiUnavailableReason, number> = {
  AI_DISABLED: 503, AI_NOT_CONFIGURED: 503, AI_DAILY_LIMIT_EXCEEDED: 429, AI_QUOTA_EXCEEDED: 429, AI_UNAVAILABLE: 503,
};

async function usedToday(userId: string): Promise<number> {
  const [row] = await AppDataSource.query(
    `SELECT COUNT(*)::int AS used FROM ai_usage_reservations
     WHERE user_id = $1 AND scope = $2 AND service_key = $3 AND daily_key = $4 AND status <> 'released'`,
    [userId, SCOPE, FORUM_AI_SERVICE_ID, new Date().toISOString().slice(0, 10)],
  );
  return Number(row?.used ?? 0);
}

/** Read-only. Any failure reads as "AI unavailable": writing and keyword search never depend on it. */
export async function getForumAiStatus(userId: string): Promise<ForumAiStatus> {
  const closed = (reason: ForumAiUnavailableReason, dailyLimit = 0, remainingToday = 0): ForumAiStatus =>
    ({ available: false, reason, dailyLimit, remainingToday });
  try {
    const policy = await AppDataSource.getRepository(AiQueryPolicy).findOneBy({ id: 1 });
    if (!policy?.aiEnabled) return closed('AI_DISABLED');
    if (!(await resolveAiApiKey(AppDataSource, 'gemini'))) return closed('AI_NOT_CONFIGURED');
    const dailyLimit = Math.min(Math.max(policy.freeDailyLimit ?? 0, 0), FORUM_AI_DAILY_CEILING);
    const remainingToday = Math.max(dailyLimit - (await usedToday(userId)), 0);
    if (remainingToday === 0) return closed('AI_DAILY_LIMIT_EXCEEDED', dailyLimit, 0);
    const quota = await new AiQuotaService(AppDataSource).checkQuota(SCOPE, userId, FORUM_AI_SERVICE_ID);
    if (!quota.allowed) return closed('AI_QUOTA_EXCEEDED', dailyLimit, remainingToday);
    return { available: true, reason: null, dailyLimit, remainingToday };
  } catch (error) {
    logger.warn('[COMMUNITY_FORUM_AI] status unavailable', { error: (error as Error)?.message });
    return closed('AI_UNAVAILABLE');
  }
}

const inFlight = new Set<string>();

function toForumAiError(error: unknown): ForumAiError {
  const code = error instanceof AiExtensionError ? error.code : '';
  if (code === 'QUOTA_EXCEEDED') return new ForumAiError('AI_QUOTA_EXCEEDED', 429);
  if (code === 'AI_DISABLED') return new ForumAiError('AI_DISABLED', 503);
  if (code === 'NOT_CONFIGURED') return new ForumAiError('AI_NOT_CONFIGURED', 503);
  if (code === 'INVALID_RESPONSE') return new ForumAiError('AI_OUTPUT_INVALID', 502);
  return new ForumAiError('AI_UNAVAILABLE', 503);
}

async function run<Input, Output>(
  extension: AiBusinessExtension<Input, Output>,
  input: Input,
  actor: string,
  maxTokens: number,
): Promise<Output> {
  const status = await getForumAiStatus(actor);
  if (!status.available) {
    const reason = status.reason ?? 'AI_UNAVAILABLE';
    throw new ForumAiError(reason, unavailableStatus[reason]);
  }
  if (inFlight.has(actor)) throw new ForumAiError('AI_REQUEST_IN_PROGRESS', 409);
  inFlight.add(actor);
  try {
    const apiKey = await resolveAiApiKey(AppDataSource, 'gemini');
    if (!apiKey) throw new ForumAiError('AI_NOT_CONFIGURED', 503);
    const model = await resolveEditingModel();
    const { output } = await runAiExtension(
      {
        extension,
        input,
        context: { requestId: randomUUID(), serviceId: FORUM_AI_SERVICE_ID, featureId: extension.id, actorId: actor, audience: 'staff' },
        materials: [],
        funding: { payer: 'platform' },
      },
      createAccountedExtensionRuntime(AppDataSource, {
        request: {
          provider: 'gemini', responseMode: 'text',
          config: { apiKey, model, temperature: 0.2, maxTokens },
          timeoutMs: TIMEOUT_MS, retry: { maxAttempts: 1 },
          meta: { service: FORUM_AI_SERVICE_ID, callerName: extension.id },
        },
        accounting: { scope: SCOPE, serviceKey: FORUM_AI_SERVICE_ID, userId: actor },
      }),
      {
        // The route guards already authorized this author; the host only pins the actor to that request.
        authorize: async (context) => context.actorId === actor,
        // Events carry ids and token counts only, never the draft text.
        record: async (event) => { logger.info('[COMMUNITY_FORUM_AI]', event); },
      },
    );
    return output;
  } catch (error) {
    if (error instanceof ForumAiError) throw error;
    throw toForumAiError(error);
  } finally {
    inFlight.delete(actor);
  }
}

export function requestForumComposeAssist(
  input: ForumComposeAssistInput,
  boards: readonly ForumAiBoard[],
  actor: string,
): Promise<ForumComposeAssistOutput> {
  return run(createForumComposeExtension(boards), input, actor, FORUM_AI_COMPOSE_MAX_TOKENS);
}

export function requestForumSimilarKeywords(title: string, actor: string): Promise<string[]> {
  return run(createForumKeywordExtension(), { title }, actor, FORUM_AI_KEYWORD_MAX_TOKENS);
}
