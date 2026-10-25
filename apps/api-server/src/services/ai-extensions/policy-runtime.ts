import type { AiExtensionRuntime } from '@o4o/ai-core';
import { AiExtensionError } from '@o4o/ai-core';
import type { AiPolicyExecutorService, PolicyExecuteOverrides } from '../../modules/ai-policy/ai-policy-executor.service.js';
import type { AiPolicyScope } from '../../modules/ai-policy/ai-policy-scope.js';

/** Host retains authorization and persistence; the existing policy owns model, quota and retry. */
export function createPolicyExtensionRuntime(
  executor: Pick<AiPolicyExecutorService, 'execute'>,
  scope: AiPolicyScope,
  overrides: Omit<PolicyExecuteOverrides, 'userId'>,
): AiExtensionRuntime {
  return {
    async invoke(prompt, context, funding) {
      if (funding.payer !== 'platform') throw new AiExtensionError('FUNDING_UNSUPPORTED');
      const result = await executor.execute(scope, prompt.systemPrompt, prompt.userPrompt, {
        ...overrides, userId: context.actorId,
      });
      return { ...result, provider: result.provider ?? 'unknown' };
    },
  };
}
