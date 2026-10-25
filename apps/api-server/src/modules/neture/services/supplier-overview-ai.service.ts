import type { DataSource } from 'typeorm';
import { explainOverview } from '../../../services/ai-extensions/dashboard-overview.service.js';
import { resolveServiceAiProfile } from '../../../services/ai-extensions/service-query.extension.js';
import { createPolicyExtensionRuntime } from '../../../services/ai-extensions/policy-runtime.js';
import { createPolicyExecutor } from '../../ai-policy/ai-policy-factory.js';
import { SupplierCopilotService } from './supplier-copilot.service.js';

export function explainSupplierOverview(db: DataSource, access: {
  actorId: string; supplierId: string; authorize: () => Promise<boolean>;
}) {
  const profile = resolveServiceAiProfile('supplier');
  if (!profile) throw new Error('SERVICE_UNSUPPORTED');
  return explainOverview({
    ...access, featureId: 'supplier.overview', profile,
    load: async () => {
      const kpi = await new SupplierCopilotService(db).getKpiSummary(access.supplierId);
      const labels = { registeredProducts: '등록 상품', activeProducts: '활성 상품', storeListings: '매장 진열', recentOrders: '최근 7일 결제 완료 주문' };
      return { collectedAt: new Date().toISOString(), metrics: Object.fromEntries(
        Object.entries(labels).map(([key, label]) => {
          const value = kpi[key as keyof typeof kpi];
          return [key, { label, value: Number.isSafeInteger(value) && value >= 0 ? value : null }];
        }),
      ) };
    },
    runtime: createPolicyExtensionRuntime(createPolicyExecutor(db), 'OPERATOR_INSIGHT', {
      usage: 'supplier.overview', serviceKey: 'supplier', maxTokens: 1000, temperature: 0.1, responseMode: 'json',
    }),
  });
}
