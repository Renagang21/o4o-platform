import type { DataSource } from 'typeorm';
import { AiExtensionError, type AiExtensionRuntime, type ExecuteRequest } from '@o4o/ai-core';
import { executeAccountedAi, type AiAccountingContext } from '../../modules/ai-policy/ai-accounted-execution.js';
import { prepareManagedAiRequest } from '../ai-management/runtime-models.js';

/** Also used by existing server-owned pipelines that do not create a user Task/Extension context. */
export async function executeManagedAccountedAi(db: DataSource, usage: string, request: ExecuteRequest, accounting: AiAccountingContext) {
  return executeAccountedAi(db, await prepareManagedAiRequest(db, usage, request), accounting);
}

/** Shared invocation wiring only. Domain hosts still authorize, validate output and save it. */
export function createAccountedExtensionRuntime(
  db: DataSource,
  options: {
    usage?: string;
    request: Omit<ExecuteRequest, 'systemPrompt' | 'userPrompt'>;
    accounting: AiAccountingContext;
  },
): AiExtensionRuntime {
  return {
    async invoke(prompt, context, funding) {
      if (funding.payer !== 'platform') throw new AiExtensionError('FUNDING_UNSUPPORTED');
      if (options.accounting.userId && options.accounting.userId !== context.actorId)
        throw new AiExtensionError('ACCESS_DENIED');
      const request = { ...options.request, ...prompt };
      const prepared = options.usage
        ? await prepareManagedAiRequest(db, options.usage, request)
        : request;
      const result = await executeAccountedAi(db, prepared, options.accounting);
      return { ...result, provider: result.provider ?? prepared.provider ?? 'unknown' };
    },
  };
}
