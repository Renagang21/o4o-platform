import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { AiExtensionError, runAiExtension, type AiExtensionRuntime } from '@o4o/ai-core';
import { createPolicyExecutor } from '../../modules/ai-policy/ai-policy-factory.js';
import { loadStoreLiveSignals } from '../../routes/o4o-store/controllers/store-hub-live-signals.js';
import { createOperatorInsightExtension } from './operator-insight.extension.js';
import { resolveServiceAiProfile, type ServiceAiProfile } from './service-query.extension.js';
import { createPolicyExtensionRuntime } from './policy-runtime.js';
import logger from '../../utils/logger.js';

export interface OverviewMetric { label: string; value: number | null }
export interface OverviewEvidence { collectedAt: string; metrics: Record<string, OverviewMetric> }

/** Counts only; never send product, customer, consultation or transaction bodies to the model. */
export async function loadStoreOverviewEvidence(db: Pick<DataSource, 'query'>, organizationId: string): Promise<OverviewEvidence> {
  const count = async (sql: string): Promise<number | null> => {
    try {
      const value = (await db.query(sql, [organizationId]))?.[0]?.count;
      return Number.isSafeInteger(value) && value >= 0 ? value : null;
    } catch { return null; }
  };
  const [products, materials, signals] = await Promise.all([
    count('SELECT COUNT(*)::int AS count FROM organization_product_listings WHERE organization_id=$1 AND is_active=true'),
    count('SELECT COUNT(*)::int AS count FROM store_execution_assets WHERE organization_id=$1 AND is_active=true'),
    loadStoreLiveSignals(db, organizationId),
  ]);
  return {
    collectedAt: new Date().toISOString(),
    metrics: {
      products: { label: '진열 중인 O4O 제품', value: products },
      materials: { label: '보관 자료', value: materials },
      orders: { label: '결제 완료 주문', value: signals.availability.newOrders === 'available' ? signals.newOrders : null },
      requests: { label: '대기 상담 요청', value: signals.availability.pendingTabletRequests === 'available' ? signals.pendingTabletRequests : null },
    },
  };
}

/** Shared explanation flow; the domain owns both the live access predicate and data loader. */
export async function explainOverview(input: {
  actorId: string; organizationId?: string; featureId: string;
  profile: ServiceAiProfile; authorize: () => Promise<boolean>;
  load: () => Promise<OverviewEvidence>; runtime: AiExtensionRuntime;
}) {
  if (!input.actorId || !await input.authorize()) throw new AiExtensionError('ACCESS_DENIED');
  const evidence = await input.load();
  if (Object.values(evidence.metrics).every(metric => metric.value === null)) throw new AiExtensionError('METRICS_UNAVAILABLE');
  const profile = { ...input.profile, constraints: [...input.profile.constraints,
    'null은 확인되지 않은 자료이며 0건이 아니다. 원인·성과·추세를 추측하지 않고 수치와 추가 확인 사항을 설명한다.'] };
  const run = await runAiExtension({
    extension: createOperatorInsightExtension(profile), input: { metrics: evidence as unknown as Record<string, unknown> },
    context: { requestId: randomUUID(), serviceId: profile.serviceId, featureId: input.featureId,
      actorId: input.actorId, organizationId: input.organizationId, audience: 'staff' },
    materials: [], funding: { payer: 'platform' },
  }, input.runtime, {
    authorize: () => input.authorize(),
    record: async event => { logger.info('[AI_EXTENSION]', event); },
  });
  if (!await input.authorize()) throw new AiExtensionError('ACCESS_DENIED');
  return { ...run.output, evidence };
}

export async function explainStoreOverview(db: DataSource, access: {
  actorId: string; organizationId: string; serviceId?: string; authorize: () => Promise<boolean>;
}) {
  const base = resolveServiceAiProfile(access.serviceId);
  if (!base || !access.organizationId) throw new AiExtensionError('INVALID_CONTEXT');
  return { ...await explainOverview({
    ...access, featureId: 'store.overview',
    profile: { ...base, name: '내 매장', description: '선택한 매장의 실제 지표를 설명한다.' },
    load: () => loadStoreOverviewEvidence(db, access.organizationId),
    runtime: createPolicyExtensionRuntime(createPolicyExecutor(db), 'STORE_INSIGHT', {
      serviceKey: base.serviceId, maxTokens: 1000, temperature: 0.1, responseMode: 'json',
    }),
  }), organizationId: access.organizationId };
}
