/**
 * AI Policy Factory — WO-O4O-AI-COST-LIMIT-QUOTA-V1
 *
 * AiPolicyExecutorService + AiQuotaService를 한번에 생성.
 */

import type { DataSource } from 'typeorm';
import { AiPolicyExecutorService } from './ai-policy-executor.service.js';
import { AiQuotaService } from './ai-quota.service.js';

export function createPolicyExecutor(dataSource: DataSource): AiPolicyExecutorService {
  const quotaService = new AiQuotaService(dataSource);
  return new AiPolicyExecutorService(dataSource, quotaService);
}
