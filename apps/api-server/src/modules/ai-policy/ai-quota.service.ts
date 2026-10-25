import { reservedQuotaUsageSql } from './quota-reservation-sql.js';
/** Atomic admission and settlement on the existing aggregate ledger, with separate durable reservations. */
import { randomUUID } from 'crypto';
import type { DataSource, EntityManager } from 'typeorm';
import type { AiPolicyScope } from './ai-policy-scope.js';
import { SERVICE_FOR_SCOPE } from './ai-policy-scope.js';
import type { AiPriceSnapshot } from './ai-pricing.js';

export interface QuotaWarning {
  layer: string;
  layerKey: string;
  limitType: string;
  period: string;
  usagePercent: number;
}
export interface QuotaExceeded {
  layer: string;
  layerKey: string;
  limitType: string;
  period: string;
  currentValue: number;
  limitValue: number;
}
export interface QuotaCheckResult {
  allowed: boolean;
  warnings: QuotaWarning[];
  exceeded: QuotaExceeded[];
}
export interface AiQuotaUsage {
  requests: number;
  tokens: number;
  cost: number;
}
export interface AiQuotaReservation {
  id: string;
  warnings: QuotaWarning[];
}
type Query = Pick<EntityManager, 'query'>;
export interface AiQuotaEvaluationRow {
  layer: string;
  layerKey: string;
  limitType: string;
  period: string;
  currentValue: number | string;
  /** Admin snapshots separate held capacity; the runtime SQL already includes it in currentValue. */
  reservedValue?: number | string;
  limitValue: number | string;
  warningThreshold: number | string;
}
const LOCK = 'SELECT pg_advisory_xact_lock(1791870, 1)';
function validUsage(usage: AiQuotaUsage): void {
  if (
    !Number.isSafeInteger(usage.requests) ||
    usage.requests < 0 ||
    !Number.isSafeInteger(usage.tokens) ||
    usage.tokens < 0 ||
    !Number.isFinite(usage.cost) ||
    usage.cost < 0 ||
    usage.cost > 999_999_999_999
  )
    throw new Error('AI_USAGE_INVALID');
}

/** Match the existing NUMERIC(20,8) ledger precision; binary addition is not a cost-limit comparison. */
function costUnits(value: number | string): bigint {
  const decimal = typeof value === 'number' ? value.toFixed(8) : value;
  if (!/^\d{1,12}(?:\.\d{1,8})?$/.test(decimal)) throw new Error('AI_QUOTA_INVALID');
  const [whole, fraction = ''] = decimal.split('.');
  return BigInt(whole) * 100_000_000n + BigInt(fraction.padEnd(8, '0'));
}

/** Pure admission calculation shared by actual reservation and offline configuration checks. */
export function evaluateAiQuotaRows(quotas: readonly AiQuotaEvaluationRow[], budget: AiQuotaUsage): QuotaCheckResult {
  validUsage(budget);
  const warnings: QuotaWarning[] = [], exceeded: QuotaExceeded[] = [];
  for (const q of quotas) {
    if (!['requests', 'tokens', 'cost'].includes(q.limitType) || !['daily', 'monthly'].includes(q.period))
      throw new Error('AI_QUOTA_INVALID');
    const current = Number(q.currentValue), held = Number(q.reservedValue ?? 0), limitValue = Number(q.limitValue);
    if (![current, held, limitValue].every(n => Number.isFinite(n) && n >= 0)) throw new Error('AI_QUOTA_INVALID');
    const currentValue = current + held;
    const projected = currentValue + budget[q.limitType as keyof AiQuotaUsage];
    const projectedCost = q.limitType === 'cost' ? costUnits(q.currentValue) + costUnits(q.reservedValue ?? 0) + costUnits(budget.cost) : null;
    const limitCost = q.limitType === 'cost' ? costUnits(q.limitValue) : null;
    const over = projectedCost !== null ? projectedCost > limitCost! : projected > limitValue;
    const equal = projectedCost !== null ? projectedCost === limitCost : projected === limitValue;
    const usagePercent = limitValue > 0 ? (projected / limitValue) * 100 : 100;
    if (over || (equal && budget.requests === 0))
      exceeded.push({ layer: q.layer, layerKey: q.layerKey, limitType: q.limitType, period: q.period, currentValue, limitValue });
    else if (usagePercent >= Number(q.warningThreshold))
      warnings.push({ layer: q.layer, layerKey: q.layerKey, limitType: q.limitType, period: q.period, usagePercent: Math.round(usagePercent * 10) / 10 });
  }
  return { allowed: !exceeded.length, warnings, exceeded };
}
function periods(now: Date) {
  return [now.toISOString().slice(0, 10), now.toISOString().slice(0, 7)];
}
function safeFailure(operation: string): Error {
  // Database/provider errors may contain credentials or request values. Only the operation is observable.
  console.warn('[AiQuota] persistence unavailable', { operation });
  return new Error('AI_QUOTA_UNAVAILABLE');
}

export class AiQuotaService {
  constructor(private dataSource: DataSource) {}

  /** Admin visibility: completed billing usage and held admission capacity stay separate. */
  async getStatus(): Promise<Record<string, unknown>[]> {
    const [daily, monthly] = periods(new Date());
    const rows = await this.dataSource.query(
      `SELECT q.id, q.layer, q.layer_key AS "layerKey", q.limit_type AS "limitType",
      q.period, q.limit_value AS "limitValue", q.warning_threshold AS "warningThreshold", q.is_enabled AS "isEnabled",
      COALESCE(a.current_value,0) AS "currentValue", ${reservedQuotaUsageSql(1, 2)} AS "reservedValue"
      FROM ai_usage_quota q LEFT JOIN ai_usage_aggregate a ON a.layer = q.layer AND a.layer_key = q.layer_key
        AND a.limit_type = q.limit_type AND a.period_key = CASE q.period WHEN 'daily' THEN $1 ELSE $2 END
      WHERE q.is_enabled = true ORDER BY q.layer, q.layer_key`,
      [daily, monthly],
    );
    return rows.map((row: any) => {
      const limitValue = Number(row.limitValue),
        currentValue = Number(row.currentValue),
        reservedValue = Number(row.reservedValue);
      const admission = evaluateAiQuotaRows([row], { requests: 0, tokens: 0, cost: 0 });
      const projectedValue = row.limitType === 'cost'
        ? Number(costUnits(row.currentValue) + costUnits(row.reservedValue)) / 100_000_000
        : currentValue + reservedValue;
      const usagePercent =
        limitValue > 0
          ? Math.round((projectedValue / limitValue) * 1000) / 10
          : 0;
      return {
        ...row,
        limitValue,
        currentValue,
        reservedValue,
        projectedValue,
        usagePercent,
        status:
          !admission.allowed
            ? 'exceeded'
            : admission.warnings.length
              ? 'warning'
              : 'ok',
      };
    });
  }

  async checkQuota(
    scope: AiPolicyScope,
    userId?: string,
  ): Promise<QuotaCheckResult> {
    try {
      return await this.evaluate(
        this.dataSource,
        scope,
        userId,
        { requests: 0, tokens: 0, cost: 0 },
        new Date(),
      );
    } catch {
      throw safeFailure('check');
    }
  }

  async reserve(
    scope: AiPolicyScope,
    userId: string | undefined,
    budget: AiQuotaUsage,
    prices: AiPriceSnapshot[],
    serviceKey = SERVICE_FOR_SCOPE[scope],
  ): Promise<AiQuotaReservation> {
    validUsage(budget);
    const now = new Date();
    const [dailyKey, monthlyKey] = periods(now);
    try {
      return await this.dataSource.transaction(async (manager) => {
        await manager.query(LOCK);
        const result = await this.evaluate(
          manager,
          scope,
          userId,
          budget,
          now,
          serviceKey,
        );
        if (!result.allowed) throw new Error('QUOTA_EXCEEDED');
        const id = randomUUID();
        await manager.query(
          `INSERT INTO ai_usage_reservations
          (id, scope, service_key, user_id, daily_key, monthly_key, reserved_requests, reserved_tokens, reserved_cost, pricing)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
          [
            id,
            scope,
            serviceKey,
            userId ?? null,
            dailyKey,
            monthlyKey,
            budget.requests,
            budget.tokens,
            budget.cost,
            JSON.stringify(prices),
          ],
        );
        return { id, warnings: result.warnings };
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'QUOTA_EXCEEDED')
        throw error;
      throw safeFailure('reserve');
    }
  }

  /** Log + aggregate + reservation transition commit together. Repeat settlement is idempotent. */
  async settle(
    reservation: AiQuotaReservation,
    usage: AiQuotaUsage,
    record: (manager: EntityManager) => Promise<void>,
    receipt: {
      providerRequestId?: string;
      outcome: 'success' | 'error';
      uncertain?: AiQuotaUsage;
      detail?: {
        provider: string;
        model: string;
        price: AiPriceSnapshot;
        attempts: number;
        native?: { kind: string; unit: string | null; units: number | null; usageKnown: boolean; inputTokens?: number | null; outputTokens?: number | null };
      };
    },
  ): Promise<void> {
    validUsage(usage);
    if (receipt.uncertain) validUsage(receipt.uncertain);
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.query(LOCK);
        const [row] = await manager.query(
          'SELECT * FROM ai_usage_reservations WHERE id = $1 FOR UPDATE',
          [reservation.id],
        );
        if (!row) throw new Error('RESERVATION_NOT_FOUND');
        if (row.status !== 'reserved') {
          if (
            ['settled', 'pending'].includes(row.status) &&
            row.outcome === receipt.outcome &&
            row.provider_request_id === (receipt.providerRequestId ?? null) &&
            Number(row.actual_requests) === usage.requests &&
            Number(row.actual_tokens) === usage.tokens &&
            Number(row.actual_cost) === usage.cost
          )
            return;
          throw new Error('RESERVATION_CONFLICT');
        }
        await record(manager);
        await this.increment(
          manager,
          row.scope,
          row.user_id ?? undefined,
          usage,
          [row.daily_key, row.monthly_key],
          row.service_key,
        );
        const uncertain = receipt.uncertain ?? {
          requests: 0,
          tokens: 0,
          cost: 0,
        };
        const status =
          uncertain.requests || uncertain.tokens || uncertain.cost || receipt.detail?.native?.usageKnown === false
            ? 'pending'
            : 'settled';
        await manager.query(
          `UPDATE ai_usage_reservations SET status = $7, outcome = $2,
          actual_requests = $3, actual_tokens = $4, actual_cost = $5, provider_request_id = $6, settled_at = NOW(), reserved_requests = $8, reserved_tokens = $9, reserved_cost = $10, receipt = $11::jsonb WHERE id = $1`,
          [
            reservation.id,
            receipt.outcome,
            usage.requests,
            usage.tokens,
            usage.cost,
            receipt.providerRequestId ?? null,
            status,
            uncertain.requests,
            uncertain.tokens,
            uncertain.cost,
            receipt.detail ? JSON.stringify(receipt.detail) : null,
          ],
        );
      });
    } catch {
      throw safeFailure('settle');
    }
  }

  /** Host-only reconciliation after verified provider usage/no-charge evidence; never exposed as a user tool. */
  async reconcile(
    reservation: AiQuotaReservation,
    verified: { evidenceId: string; usage: AiQuotaUsage },
    record: (manager: EntityManager) => Promise<void>,
  ): Promise<void> {
    validUsage(verified.usage);
    if (!/^[a-zA-Z0-9._:-]{1,100}$/.test(verified.evidenceId))
      throw new Error('AI_RECONCILIATION_INVALID');
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.query(LOCK);
        const [row] = await manager.query(
          'SELECT * FROM ai_usage_reservations WHERE id = $1 FOR UPDATE',
          [reservation.id],
        );
        if (!row) throw new Error('RESERVATION_NOT_FOUND');
        if (row.reconciliation_id === verified.evidenceId) {
          if (
            !row.reconciliation_usage ||
            ['requests', 'tokens', 'cost'].some(
              (key) =>
                Number(row.reconciliation_usage[key]) !==
                verified.usage[key as keyof AiQuotaUsage],
            )
          )
            throw new Error('RESERVATION_CONFLICT');
          return;
        }
        if (verified.usage.requests > Number(row.reserved_requests))
          throw new Error('RESERVATION_CONFLICT');
        if (!['reserved', 'pending'].includes(row.status))
          throw new Error('RESERVATION_CONFLICT');
        await record(manager);
        await this.increment(
          manager,
          row.scope,
          row.user_id ?? undefined,
          verified.usage,
          [row.daily_key, row.monthly_key],
          row.service_key,
        );
        await manager.query(
          `UPDATE ai_usage_reservations SET status = 'settled',
          actual_requests = COALESCE(actual_requests,0) + $2, actual_tokens = COALESCE(actual_tokens,0) + $3,
          actual_cost = COALESCE(actual_cost,0) + $4, reserved_requests = 0, reserved_tokens = 0, reserved_cost = 0,
          reconciliation_id = $5, reconciliation_usage = $6::jsonb, settled_at = NOW() WHERE id = $1`,
          [
            reservation.id,
            verified.usage.requests,
            verified.usage.tokens,
            verified.usage.cost,
            verified.evidenceId,
            JSON.stringify(verified.usage),
          ],
        );
      });
    } catch {
      throw safeFailure('reconcile');
    }
  }

  /** Only for work proven not dispatched. Uncertain/crashed requests remain reserved for reconciliation. */
  async release(reservation: AiQuotaReservation): Promise<void> {
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.query(LOCK);
        const rows = await manager.query(
          "WITH released AS (UPDATE ai_usage_reservations SET status = 'released', settled_at = NOW() WHERE id = $1 AND status = 'reserved' RETURNING id) SELECT id FROM released",
          [reservation.id],
        );
        if (!rows.length) {
          const [row] = await manager.query(
            'SELECT status FROM ai_usage_reservations WHERE id = $1',
            [reservation.id],
          );
          if (row?.status !== 'released')
            throw new Error('RESERVATION_CONFLICT');
        }
      });
    } catch {
      throw safeFailure('release');
    }
  }

  /** Compatibility for callers outside admission; errors are surfaced rather than silently discarded. */
  async incrementAggregates(
    scope: AiPolicyScope,
    userId: string | undefined,
    requests: number,
    totalTokens: number,
    costEstimated: number,
  ): Promise<void> {
    const usage = { requests, tokens: totalTokens, cost: costEstimated };
    validUsage(usage);
    try {
      await this.dataSource.transaction(async (manager) => {
        await manager.query(LOCK);
        await this.increment(
          manager,
          scope,
          userId,
          usage,
          periods(new Date()),
        );
      });
    } catch {
      throw safeFailure('increment');
    }
  }

  private async evaluate(
    query: Query,
    scope: AiPolicyScope,
    userId: string | undefined,
    budget: AiQuotaUsage,
    now: Date,
    serviceKey = SERVICE_FOR_SCOPE[scope],
  ): Promise<QuotaCheckResult> {
    const service = serviceKey;
    if (!service) throw new Error('AI_SCOPE_INVALID');
    const [dailyKey, monthlyKey] = periods(now);
    const quotas = await query.query(
      `SELECT q.layer, q.layer_key AS "layerKey", q.limit_type AS "limitType", q.period,
      q.limit_value AS "limitValue", q.warning_threshold AS "warningThreshold",
      COALESCE(a.current_value, 0) + ${reservedQuotaUsageSql(4, 5)} AS "currentValue"
      FROM ai_usage_quota q LEFT JOIN ai_usage_aggregate a
        ON a.layer = q.layer AND a.layer_key = q.layer_key AND a.limit_type = q.limit_type
        AND a.period_key = CASE q.period WHEN 'daily' THEN $4 ELSE $5 END
      WHERE q.is_enabled = true AND ((q.layer = 'global' AND q.layer_key = '*')
        OR (q.layer = 'service' AND q.layer_key = $1) OR (q.layer = 'scope' AND q.layer_key = $2)
        OR (q.layer = 'user' AND q.layer_key = $3))`,
      [service, scope, userId ?? null, dailyKey, monthlyKey],
    );
    return evaluateAiQuotaRows(quotas, budget);
  }

  private async increment(
    query: Query,
    scope: AiPolicyScope,
    userId: string | undefined,
    usage: AiQuotaUsage,
    keys: string[],
    serviceKey = SERVICE_FOR_SCOPE[scope],
  ): Promise<void> {
    const layers: Array<[string, string]> = [
      ['global', '*'],
      ['service', serviceKey],
      ['scope', scope],
    ];
    if (userId) layers.push(['user', userId]);
    const values: string[] = [],
      params: (string | number)[] = [];
    for (const [layer, key] of layers)
      for (const [kind, value] of Object.entries(usage))
        for (const period of keys) {
          if (!value) continue;
          const i = params.length + 1;
          values.push(`($${i},$${i + 1},$${i + 2},$${i + 3},$${i + 4})`);
          params.push(layer, key, kind, period, value);
        }
    if (values.length)
      await query.query(
        `INSERT INTO ai_usage_aggregate (layer, layer_key, limit_type, period_key, current_value)
      VALUES ${values.join(',')} ON CONFLICT (layer, layer_key, limit_type, period_key)
      DO UPDATE SET current_value = ai_usage_aggregate.current_value + EXCLUDED.current_value, last_updated_at = NOW()`,
        params,
      );
  }
}
