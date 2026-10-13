import type {
  AiBusinessExtension, AiExecutionContext, AiFunding, AiMaterialReference,
  AiExtensionRuntime, AiExtensionHost, AiExtensionEvent,
} from '../contracts/ai-extension.contract.js';

export class AiExtensionError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'AiExtensionError';
  }
}

function safeCode(error: unknown): string {
  if (error instanceof AiExtensionError) return error.code;
  const message = error instanceof Error ? error.message : '';
  if (/AI_NOT_CONFIGURED|NOT_CONFIGURED|API key missing|is not configured/.test(message)) return 'NOT_CONFIGURED';
  if (/QUOTA_EXCEEDED/.test(message)) return 'QUOTA_EXCEEDED';
  if (/AI_DISABLED/.test(message)) return 'AI_DISABLED';
  if (['AI_QUOTA_UNAVAILABLE', 'AI_POLICY_UNAVAILABLE', 'AI_PRICING_INVALID', 'AI_PRICING_NOT_CONFIGURED', 'AI_PRICING_CURRENCY_UNSUPPORTED'].includes(message)) return message;
  return 'PROVIDER_FAILED';
}

/** Provider-neutral read/draft workflow; never saves, publishes, orders or deletes domain records. */
export async function runAiExtension<Input, Output>(request: {
  extension: AiBusinessExtension<Input, Output>;
  input: Input;
  context: AiExecutionContext;
  materials: readonly AiMaterialReference[];
  funding: AiFunding;
}, runtime: AiExtensionRuntime, host: AiExtensionHost): Promise<{
  output: Output;
  invocation: Awaited<ReturnType<AiExtensionRuntime['invoke']>>;
}> {
  const { extension, input, context, materials, funding } = request;
  const base = {
    context, extensionId: extension.id, operation: extension.operation, payer: funding.payer,
  };
  const record = async (event: AiExtensionEvent) => {
    try { await host.record(event); }
    catch { throw new AiExtensionError('HISTORY_UNAVAILABLE'); }
  };
  try {
    const publicRead = context.principal === 'public';
    if (!context.requestId || !context.serviceId || !context.featureId ||
        (!publicRead && !context.actorId) ||
        (context.principal !== undefined && !['authenticated', 'public'].includes(context.principal)) ||
        (publicRead && (!!context.actorId || context.audience !== 'consumer' || extension.operation !== 'read' || materials.length > 0)) ||
        !['staff', 'consumer'].includes(context.audience) ||
        !['read', 'draft'].includes(extension.operation) ||
        !['platform', 'store', 'user', 'external-account'].includes(funding.payer) ||
        (funding.payer === 'external-account' && !funding.accountRef)) {
      throw new AiExtensionError('INVALID_CONTEXT');
    }
    if (context.audience === 'consumer' && materials.some(m => m.audience !== 'consumer')) {
      throw new AiExtensionError('MATERIAL_SCOPE_DENIED');
    }
    if (!await host.authorize(context, extension.operation, materials)) {
      throw new AiExtensionError('ACCESS_DENIED');
    }
    await record({ ...base, stage: 'started' });
    let prompt;
    try { prompt = extension.prepare(input, context); }
    catch { throw new AiExtensionError('INVALID_INPUT'); }
    const invocation = await runtime.invoke(prompt, context, funding);
    const usage = {
      provider: invocation.provider, model: invocation.model, providerRequestId: invocation.requestId,
      promptTokens: invocation.promptTokens, completionTokens: invocation.completionTokens,
    };
    await record({ ...base, ...usage, stage: 'provider-completed' });
    let output: Output;
    try { output = extension.parse(invocation.content); }
    catch { throw new AiExtensionError('INVALID_RESPONSE'); }
    await record({ ...base, ...usage, stage: 'completed' });
    return { output, invocation };
  } catch (error) {
    const code = safeCode(error);
    await record({ ...base, stage: 'failed', errorCode: code });
    throw new AiExtensionError(code);
  }
}
