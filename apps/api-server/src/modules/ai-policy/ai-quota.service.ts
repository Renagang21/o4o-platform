/**
 * AiQuotaService — WO-O4O-AI-COST-LIMIT-QUOTA-V1
 *
 * AI 사용량 quota 검사 + 집계 카운터 관리.
 *
 * checkQuota(): 실행 전 제한 초과 여부 판정
 * incrementAggregates(): 실행 후 카운터 원자적 증가 (UPSERT)
 */

import type { DataSource } from 'typeorm';
import type { AiPolicyScope } from './ai-policy-scope.js';
import { SERVICE_FOR_SCOPE } from './ai-policy-scope.js';

// ── Types ──

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

// ── Service ──

export class AiQuotaService {
  constructor(private dataSource: DataSource) {}

  /**
   * Scope에 적용되는 모든 quota를 검사.
   * 검사 순서: global → service → scope → user.
   * 테이블 미존재 시 { allowed: true } 반환.
   */
  async checkQuota(scope: AiPolicyScope, userId?: string): Promise<QuotaCheckResult> {
    try {
      const service = SERVICE_FOR_SCOPE[scope];
      const now = new Date();
      const dailyKey = now.toISOString().slice(0, 10);
      const monthlyKey = now.toISOString().slice(0, 7);

      // 1. 적용 가능 quota 로드
      const layerConditions = [
        `(layer = 'global' AND layer_key = '*')`,
        `(layer = 'service' AND layer_key = $1)`,
        `(layer = 'scope' AND layer_key = $2)`,
      ];
      const params: string[] = [service, scope];

      if (userId) {
        layerConditions.push(`(layer = 'user' AND layer_key = $${params.length + 1})`);
        params.push(userId);
      }

      const quotas = await this.dataSource.query(
        `SELECT layer, layer_key AS "layerKey", limit_type AS "limitType", period,
                limit_value AS "limitValue", warning_threshold AS "warningThreshold"
         FROM ai_usage_quota
         WHERE is_enabled = true AND (${layerConditions.join(' OR ')})`,
        params,
      );

      if (!quotas || quotas.length === 0) {
        return { allowed: true, warnings: [], exceeded: [] };
      }

      // 2. 해당 quota들의 aggregate 현재값 로드
      const aggKeys: string[] = [];
      const aggParams: (string | undefined)[] = [];
      let paramIdx = 1;

      for (const q of quotas) {
        const periodKey = q.period === 'daily' ? dailyKey : monthlyKey;
        aggKeys.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3})`);
        aggParams.push(q.layer, q.layerKey, q.limitType, periodKey);
        paramIdx += 4;
      }

      const aggregates = await this.dataSource.query(
        `SELECT layer, layer_key AS "layerKey", limit_type AS "limitType",
                period_key AS "periodKey", current_value AS "currentValue"
         FROM ai_usage_aggregate
         WHERE (layer, layer_key, limit_type, period_key) IN (${aggKeys.join(', ')})`,
        aggParams,
      );

      // 3. aggregate를 맵으로 변환
      const aggMap = new Map<string, number>();
      for (const a of aggregates) {
        aggMap.set(`${a.layer}|${a.layerKey}|${a.limitType}|${a.periodKey}`, Number(a.currentValue));
      }

      // 4. 판정
      const warnings: QuotaWarning[] = [];
      const exceeded: QuotaExceeded[] = [];

      for (const q of quotas) {
        const periodKey = q.period === 'daily' ? dailyKey : monthlyKey;
        const key = `${q.layer}|${q.layerKey}|${q.limitType}|${periodKey}`;
        const currentValue = aggMap.get(key) ?? 0;
        const limitValue = Number(q.limitValue);
        const usagePercent = limitValue > 0 ? (currentValue / limitValue) * 100 : 0;

        if (currentValue >= limitValue) {
          exceeded.push({
            layer: q.layer,
            layerKey: q.layerKey,
            limitType: q.limitType,
            period: q.period,
            currentValue,
            limitValue,
          });
        } else if (usagePercent >= Number(q.warningThreshold)) {
          warnings.push({
            layer: q.layer,
            layerKey: q.layerKey,
            limitType: q.limitType,
            period: q.period,
            usagePercent: Math.round(usagePercent * 10) / 10,
          });
        }
      }

      return {
        allowed: exceeded.length === 0,
        warnings,
        exceeded,
      };
    } catch {
      // 테이블 미존재 등 → 제한 없이 허용
      return { allowed: true, warnings: [], exceeded: [] };
    }
  }

  /**
   * 모든 적용 레이어의 집계 카운터를 원자적으로 증가.
   * Fire-and-forget으로 호출 (caller에서 .catch(() => {})).
   */
  async incrementAggregates(
    scope: AiPolicyScope,
    userId: string | undefined,
    requests: number,
    totalTokens: number,
    costEstimated: number,
  ): Promise<void> {
    try {
      const service = SERVICE_FOR_SCOPE[scope];
      const now = new Date();
      const dailyKey = now.toISOString().slice(0, 10);
      const monthlyKey = now.toISOString().slice(0, 7);

      // 레이어별 키
      const layers: Array<[string, string]> = [
        ['global', '*'],
        ['service', service],
        ['scope', scope],
      ];
      if (userId) {
        layers.push(['user', userId]);
      }

      // 타입별 값
      const types: Array<[string, number]> = [
        ['requests', requests],
        ['tokens', totalTokens],
        ['cost', costEstimated],
      ];

      // 기간
      const periods: Array<string> = [dailyKey, monthlyKey];

      // multi-row UPSERT
      const values: string[] = [];
      const params: (string | number)[] = [];
      let idx = 1;

      for (const [layer, layerKey] of layers) {
        for (const [limitType, value] of types) {
          if (value === 0) continue;
          for (const periodKey of periods) {
            values.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3}, $${idx + 4})`);
            params.push(layer, layerKey, limitType, periodKey, value);
            idx += 5;
          }
        }
      }

      if (values.length === 0) return;

      await this.dataSource.query(
        `INSERT INTO ai_usage_aggregate (layer, layer_key, limit_type, period_key, current_value, last_updated_at)
         VALUES ${values.join(', ')}
         ON CONFLICT (layer, layer_key, limit_type, period_key)
         DO UPDATE SET current_value = ai_usage_aggregate.current_value + EXCLUDED.current_value,
                       last_updated_at = NOW()`,
        params,
      );
    } catch (err) {
      console.warn('[AiQuota] incrementAggregates failed:', err);
    }
  }
}
