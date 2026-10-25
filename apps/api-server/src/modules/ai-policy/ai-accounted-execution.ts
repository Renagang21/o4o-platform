/** Provider admission/accounting adapter shared by policy execution and business Extensions. */
import type { DataSource, EntityManager } from 'typeorm';
import { execute, type ExecuteRequest, type ExecuteResult } from '@o4o/ai-core';
import {
  AIUsageLog,
  AIUsageStatus,
  type AIProvider,
} from '../../entities/AIUsageLog.js';
import {
  AiQuotaService,
  type AiQuotaUsage,
  type AiQuotaReservation,
} from './ai-quota.service.js';
import {
  loadAiPriceCatalog,
  resolveAiPrice,
  estimateAiCost,
  type AiPriceSnapshot,
  type AiPriceCatalog,
} from './ai-pricing.js';
import type { AiPolicyScope } from './ai-policy-scope.js';
import { randomUUID } from 'crypto';
import { prepareNativePlan, measuredNativeUsage, type AiNativeRequest, type AiNativeOutcome } from './ai-native-metering.js';

export interface AiAccountingContext {
  scope: AiPolicyScope;
  serviceKey?: string;
  userId?: string;
}
type ResolvedConfig = Exclude<ExecuteRequest['config'], () => unknown>;
type PreparedAttempt = Readonly<{
  request: ExecuteRequest;
  config: ResolvedConfig;
  provider: string;
  price: AiPriceSnapshot;
  inputTokens: number;
  maxTokens: number;
  budget: AiQuotaUsage;
}>;
type PreparedInvocation = Readonly<{
  catalog: AiPriceCatalog;
  primary: PreparedAttempt;
  fallback?: PreparedAttempt;
}>;
type ProviderOutcome = Readonly<{
  result: ExecuteResult;
  provider: string;
  uncertain?: AiQuotaUsage;
}>;

function attemptBudget(
  attempt: Pick<PreparedAttempt, 'price' | 'inputTokens' | 'maxTokens'>,
  count: number,
): AiQuotaUsage {
  return {
    requests: 0,
    tokens: (attempt.inputTokens + attempt.maxTokens) * count,
    cost: estimateAiCost(
      attempt.price,
      attempt.inputTokens * count,
      attempt.maxTokens * count,
    ),
  };
}
function sumBudgets(
  primary: AiQuotaUsage,
  fallback?: AiQuotaUsage,
): AiQuotaUsage {
  return {
    requests: 0,
    tokens: primary.tokens + (fallback?.tokens ?? 0),
    cost: Math.round((primary.cost + (fallback?.cost ?? 0)) * 1e8) / 1e8,
  };
}
function prepareAttempt(
  request: ExecuteRequest,
  config: ResolvedConfig,
  price: AiPriceSnapshot,
  maxAttempts: number,
  maxTokens: number,
): PreparedAttempt {
  const inputTokens =
    Buffer.byteLength(request.systemPrompt, 'utf8') +
    Buffer.byteLength(request.userPrompt, 'utf8');
  const attempt = {
    request,
    config,
    provider: request.provider ?? 'gemini',
    price,
    inputTokens,
    maxTokens,
  };
  return { ...attempt, budget: attemptBudget(attempt, maxAttempts) };
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
    const plan = await this.prepare(request, fallback);
    const reservation = await this.quota.reserve(
      account.scope,
      account.userId,
      {
        ...sumBudgets(plan.primary.budget, plan.fallback?.budget),
        requests: 1,
      },
      plan.fallback
        ? [plan.primary.price, plan.fallback.price]
        : [plan.primary.price],
      account.serviceKey,
    );
    if (reservation.warnings.length)
      console.warn('[AiPolicy] quota nearing limit', {
        scope: account.scope,
        count: reservation.warnings.length,
      });
    const outcome = await this.callProviders(plan, account, reservation);
    await this.settleResult(plan, outcome, account, reservation);
    return outcome.result;
  }

  /** Same admission/settlement for existing native transports; no provider registry or second ledger. */
  async invokeNative<T>(request: AiNativeRequest, account: AiAccountingContext, invoke: () => Promise<AiNativeOutcome<T>>): Promise<T> {
    request = { ...request };
    account = { ...account };
    const plan = prepareNativePlan(request);
    const reservation = await this.quota.reserve(account.scope, account.userId, plan.budget, [{ ...plan.price, invocation: { kind: request.kind, model: request.model } }], account.serviceKey);
    const requestId = randomUUID();
    const started = Date.now();
    // Provider/response failures retain the reservation: dispatch may already be billable.
    let outcome: AiNativeOutcome<T>;
    try { outcome = await invoke(); } catch (error) {
      try {
        await this.quota.settle(reservation, { requests: 0, tokens: 0, cost: 0 }, async manager => {
          if (['gemini', 'openai', 'claude'].includes(request.provider))
            await this.record(manager, account, request.provider, request.model, undefined, Date.now() - started, 0, requestId);
        }, { providerRequestId: requestId, outcome: 'error', uncertain: plan.budget,
          detail: { provider: request.provider, model: request.model, price: plan.price, attempts: 1, native: { kind: request.kind, unit: plan.profile.unit ?? null, units: null, usageKnown: false } } });
      } catch { console.warn('[AiPolicy] native failure receipt unavailable', { scope: account.scope, reservationId: reservation.id }); }
      throw error;
    }
    try {
      const measured = measuredNativeUsage(plan, outcome.usage);
      if (measured && (measured.tokens > plan.budget.tokens || measured.cost > plan.budget.cost))
        console.warn('[AiPolicy] native estimate exceeded', { scope: account.scope, reservationId: reservation.id });
      const usage = measured ?? { requests: 1, tokens: 0, cost: 0 };
      await this.quota.settle(reservation, usage, async manager => {
        // PostgreSQL's legacy enum cannot represent Qwen/Google Vision. Their actual provider is in the receipt.
        if (!['gemini', 'openai', 'claude'].includes(request.provider)) return;
        const result = { requestId, promptTokens: measured ? outcome.usage?.inputTokens ?? 0 : 0, completionTokens: measured ? outcome.usage?.outputTokens ?? 0 : 0 } as ExecuteResult;
        await this.record(manager, account, request.provider, request.model, result, Date.now() - started, usage.cost);
      }, {
        providerRequestId: requestId, outcome: 'success',
        ...(!measured ? { uncertain: { ...plan.budget, requests: 0 } } : {}),
        detail: { provider: request.provider, model: request.model, price: plan.price, attempts: 1,
          native: { kind: request.kind, unit: plan.profile.unit ?? null, units: measured && plan.profile.unit ? (plan.profile.unit === 'search-query' ? outcome.usage?.searchQueries : outcome.usage?.units) ?? null : null, usageKnown: !!measured, inputTokens: measured ? outcome.usage?.inputTokens ?? 0 : null, outputTokens: measured ? outcome.usage?.outputTokens ?? 0 : null } },
      });
    } catch {
      console.warn('[AiPolicy] native receipt unavailable', { scope: account.scope, reservationId: reservation.id });
    }
    return outcome.value;
  }

  private async prepare(
    request: ExecuteRequest,
    fallback?: ExecuteRequest,
  ): Promise<PreparedInvocation> {
    // Preserve resolver order and validate both paths before admission or any paid call.
    const config =
      typeof request.config === 'function'
        ? await request.config()
        : request.config;
    const fallbackConfig = fallback
      ? typeof fallback.config === 'function'
        ? await fallback.config()
        : fallback.config
      : undefined;
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
    const price = resolveAiPrice(
      catalog,
      request.provider ?? 'gemini',
      config.model,
    );
    const fallbackPrice =
      fallback && fallbackConfig
        ? resolveAiPrice(
            catalog,
            fallback.provider ?? 'gemini',
            fallbackConfig.model,
          )
        : undefined;
    const primary = prepareAttempt(
      request,
      config,
      price,
      maxAttempts,
      maxTokens,
    );
    const alternate =
      fallback && fallbackConfig && fallbackPrice
        ? prepareAttempt(
            fallback,
            fallbackConfig,
            fallbackPrice,
            fallbackAttempts,
            fallbackMaxTokens,
          )
        : undefined;
    return { catalog, primary, fallback: alternate };
  }

  private async callProviders(
    plan: PreparedInvocation,
    account: AiAccountingContext,
    reservation: AiQuotaReservation,
  ): Promise<ProviderOutcome> {
    const start = Date.now();
    const { primary, fallback } = plan;
    let result: ExecuteResult | undefined;
    let provider = primary.provider;
    let uncertain: AiQuotaUsage | undefined;
    try {
      result = await execute({ ...primary.request, config: primary.config });
      if ((result.attempts ?? 1) > 1)
        uncertain = attemptBudget(primary, (result.attempts ?? 1) - 1);
    } catch (primaryError) {
      if (fallback?.config.apiKey) {
        try {
          result = await execute({
            ...fallback.request,
            config: fallback.config,
          });
          provider = fallback.provider;
          uncertain = sumBudgets(
            primary.budget,
            attemptBudget(fallback, (result.attempts ?? 1) - 1),
          );
        } catch {
          console.warn('[AiPolicy] fallback unavailable', {
            scope: account.scope,
            reservationId: reservation.id,
          });
        }
      }
      if (!result) {
        // Responses lost to timeout/parsing may still be billable; retain the reservation for reconciliation.
        try {
          await this.record(
            this.dataSource.manager,
            account,
            primary.provider,
            primary.config.model,
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
    return { result, provider, uncertain };
  }

  private async settleResult(
    plan: PreparedInvocation,
    outcome: ProviderOutcome,
    account: AiAccountingContext,
    reservation: AiQuotaReservation,
  ): Promise<void> {
    const { result, provider } = outcome;
    let { uncertain } = outcome;
    try {
      const actualPrice = resolveAiPrice(plan.catalog, provider, result.model);
      const promptTokens = result.usageKnown === false ? 0 : result.promptTokens ?? 0,
        completionTokens = result.usageKnown === false ? 0 : result.completionTokens ?? 0;
      const cost = estimateAiCost(actualPrice, promptTokens, completionTokens);
      if (result.usageKnown === false || (promptTokens === 0 && completionTokens === 0 && result.content)) {
        // An omitted usage report is unknown usage, not proof that a nonempty generation was free.
        uncertain = sumBudgets(plan.primary.budget, plan.fallback?.budget);
      }
      await this.quota.settle(
        reservation,
        { requests: 1, tokens: promptTokens + completionTokens, cost },
        (manager) =>
          this.record(
            manager,
            account,
            provider,
            result.model,
            result.usageKnown === false ? { ...result, promptTokens: 0, completionTokens: 0 } : result,
            result.durationMs,
            cost,
          ),
        {
          providerRequestId: result.requestId,
          outcome: 'success',
          uncertain,
          detail: {
            provider,
            model: result.model,
            price: actualPrice,
            attempts: result.attempts ?? 1,
          },
        },
      );
    } catch {
      // Receipt/DB errors after generation must never trigger another paid provider call.
      console.warn('[AiPolicy] usage reconciliation required', {
        scope: account.scope,
        reservationId: reservation.id,
      });
    }
  }

  private async record(
    manager: EntityManager,
    account: AiAccountingContext,
    provider: string,
    model: string,
    result: ExecuteResult | undefined,
    durationMs: number,
    cost?: number,
    failureRequestId?: string,
  ): Promise<void> {
    const repo = manager.getRepository(AIUsageLog);
    const log = repo.create({
      scope: account.scope,
      provider: provider as AIProvider,
      model,
      requestId: result?.requestId ?? failureRequestId,
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

export function executeAccountedNativeAi<T>(dataSource: DataSource, request: AiNativeRequest, account: AiAccountingContext, invoke: () => Promise<AiNativeOutcome<T>>): Promise<T> {
  return new AiAccountedExecution(dataSource).invokeNative(request, account, invoke);
}
