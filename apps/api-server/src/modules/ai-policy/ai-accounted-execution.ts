/** Provider admission/accounting adapter shared by policy execution and business Extensions. */
import type { DataSource, EntityManager } from 'typeorm';
import { execute, type ExecuteRequest, type ExecuteResult } from '@o4o/ai-core';
import {
  AIUsageLog,
  AIUsageStatus,
  type AIProvider,
} from '../../entities/AIUsageLog.js';
import { AiQuotaService, type AiQuotaUsage } from './ai-quota.service.js';
import {
  loadAiPriceCatalog,
  resolveAiPrice,
  estimateAiCost,
  type AiPriceSnapshot,
} from './ai-pricing.js';
import type { AiPolicyScope } from './ai-policy-scope.js';

export interface AiAccountingContext {
  scope: AiPolicyScope;
  serviceKey?: string;
  userId?: string;
}
export class AiAccountedExecution {
  constructor(
    private dataSource: DataSource,
    private quota = new AiQuotaService(dataSource),
  ) {}

  async invoke(
    request: ExecuteRequest,
    account: AiAccountingContext,
    fallback?: ExecuteRequest,
  ): Promise<ExecuteResult> {
    const config =
      typeof request.config === 'function'
        ? await request.config()
        : request.config;
    const fallbackConfig = fallback
      ? typeof fallback.config === 'function'
        ? await fallback.config()
        : fallback.config
      : undefined;
    const provider = request.provider ?? 'gemini';
    if (!config.apiKey) throw new Error('AI_NOT_CONFIGURED');
    const maxAttempts = request.retry?.maxAttempts ?? 2;
    const maxTokens = config.maxTokens ?? 2048;
    const fallbackAttempts = fallback?.retry?.maxAttempts ?? 2;
    const fallbackMaxTokens = fallbackConfig?.maxTokens ?? 2048;
    if (
      ![maxAttempts, fallback ? fallbackAttempts : 1].every(
        (n) => Number.isSafeInteger(n) && n >= 1,
      ) ||
      ![maxTokens, fallback ? fallbackMaxTokens : 1].every(
        (n) => Number.isSafeInteger(n) && n > 0,
      )
    )
      throw new Error('AI_POLICY_INVALID');
    const catalog = loadAiPriceCatalog();
    const price = resolveAiPrice(catalog, provider, config.model);
    const fallbackPrice =
      fallback && fallbackConfig
        ? resolveAiPrice(
            catalog,
            fallback.provider ?? 'gemini',
            fallbackConfig.model,
          )
        : undefined;
    const inputTokens =
      Buffer.byteLength(request.systemPrompt, 'utf8') +
      Buffer.byteLength(request.userPrompt, 'utf8');
    const budgetFor = (
      rate: AiPriceSnapshot,
      attempts: number,
      outputTokens: number,
      input = inputTokens,
    ): AiQuotaUsage => ({
      requests: 0,
      tokens: (input + outputTokens) * attempts,
      cost: estimateAiCost(rate, input * attempts, outputTokens * attempts),
    });
    const primaryBudget = budgetFor(price, maxAttempts, maxTokens);
    const fallbackInput = fallback
      ? Buffer.byteLength(fallback.systemPrompt, 'utf8') +
        Buffer.byteLength(fallback.userPrompt, 'utf8')
      : 0;
    const fallbackBudget = fallbackPrice
      ? budgetFor(
          fallbackPrice,
          fallbackAttempts,
          fallbackMaxTokens,
          fallbackInput,
        )
      : { requests: 0, tokens: 0, cost: 0 };
    const reservation = await this.quota.reserve(
      account.scope,
      account.userId,
      {
        requests: 1,
        tokens: primaryBudget.tokens + fallbackBudget.tokens,
        cost:
          Math.round((primaryBudget.cost + fallbackBudget.cost) * 1e8) / 1e8,
      },
      fallbackPrice ? [price, fallbackPrice] : [price],
      account.serviceKey,
    );
    if (reservation.warnings.length)
      console.warn('[AiPolicy] quota nearing limit', {
        scope: account.scope,
        count: reservation.warnings.length,
      });
    const start = Date.now();
    let result: ExecuteResult | undefined;
    let actualProvider = provider;
    let uncertain: AiQuotaUsage | undefined;
    try {
      result = await execute({ ...request, config });
      if ((result.attempts ?? 1) > 1)
        uncertain = budgetFor(price, (result.attempts ?? 1) - 1, maxTokens);
    } catch (primaryError) {
      if (fallback && fallbackConfig?.apiKey && fallbackPrice) {
        try {
          result = await execute({ ...fallback, config: fallbackConfig });
          actualProvider = fallback.provider ?? 'gemini';
          const retryBudget = budgetFor(
            fallbackPrice,
            (result.attempts ?? 1) - 1,
            fallbackMaxTokens,
            fallbackInput,
          );
          uncertain = {
            requests: 0,
            tokens: primaryBudget.tokens + retryBudget.tokens,
            cost:
              Math.round((primaryBudget.cost + retryBudget.cost) * 1e8) / 1e8,
          };
        } catch {
          console.warn('[AiPolicy] fallback unavailable', {
            scope: account.scope,
            reservationId: reservation.id,
          });
        }
      }
      if (!result) {
        // Responses lost to timeout/parsing may still be billable; preserve the reservation for verified reconciliation.
        try {
          await this.record(
            this.dataSource.manager,
            account,
            provider,
            config.model,
            undefined,
            Date.now() - start,
          );
        } catch {
          console.warn('[AiPolicy] failure receipt unavailable', {
            scope: account.scope,
            reservationId: reservation.id,
          });
        }
        console.warn('[AiPolicy] usage reconciliation required', {
          scope: account.scope,
          reservationId: reservation.id,
        });
        throw primaryError;
      }
    }
    try {
      const actualPrice = resolveAiPrice(catalog, actualProvider, result.model);
      const promptTokens = result.promptTokens ?? 0,
        completionTokens = result.completionTokens ?? 0;
      const cost = estimateAiCost(actualPrice, promptTokens, completionTokens);
      if (promptTokens === 0 && completionTokens === 0 && result.content) {
        // An omitted usage report is unknown usage, not proof that a nonempty generation was free.
        uncertain = {
          requests: 0,
          tokens: primaryBudget.tokens + fallbackBudget.tokens,
          cost:
            Math.round((primaryBudget.cost + fallbackBudget.cost) * 1e8) / 1e8,
        };
      }
      await this.quota.settle(
        reservation,
        { requests: 1, tokens: promptTokens + completionTokens, cost },
        (manager) =>
          this.record(
            manager,
            account,
            actualProvider,
            result!.model,
            result,
            result!.durationMs,
            cost,
          ),
        {
          providerRequestId: result.requestId,
          outcome: 'success',
          uncertain,
          detail: {
            provider: actualProvider,
            model: result.model,
            price: actualPrice,
            attempts: result.attempts ?? 1,
          },
        },
      );
    } catch {
      // A generated result must never trigger a second paid provider call due to a receipt/DB error.
      console.warn('[AiPolicy] usage reconciliation required', {
        scope: account.scope,
        reservationId: reservation.id,
      });
    }
    return result;
  }

  private async record(
    manager: EntityManager,
    account: AiAccountingContext,
    provider: string,
    model: string,
    result: ExecuteResult | undefined,
    durationMs: number,
    cost?: number,
  ): Promise<void> {
    const repo = manager.getRepository(AIUsageLog);
    const log = repo.create({
      scope: account.scope,
      provider: provider as AIProvider,
      model,
      requestId: result?.requestId,
      promptTokens: result?.promptTokens ?? 0,
      completionTokens: result?.completionTokens ?? 0,
      totalTokens:
        (result?.promptTokens ?? 0) + (result?.completionTokens ?? 0),
      costEstimated: cost,
      durationMs,
      status: result ? AIUsageStatus.SUCCESS : AIUsageStatus.ERROR,
      ...(result
        ? {}
        : {
            errorMessage: 'PROVIDER_FAILED_USAGE_UNKNOWN',
            errorType: 'PROVIDER_FAILED',
          }),
      ...(account.userId ? { userId: account.userId } : {}),
    });
    await repo.save(log);
  }
}
export function executeAccountedAi(
  dataSource: DataSource,
  request: ExecuteRequest,
  account: AiAccountingContext,
): Promise<ExecuteResult> {
  return new AiAccountedExecution(dataSource).invoke(request, account);
}
