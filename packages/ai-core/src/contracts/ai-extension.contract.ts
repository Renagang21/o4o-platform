/** Additive business contract. Domain authorization and provider configuration stay in the host. */
export type AiAudience = 'staff' | 'consumer';
export type AiFunding =
  | { payer: 'platform' | 'store' | 'user' }
  | { payer: 'external-account'; accountRef: string };

export interface AiExecutionContext {
  requestId: string;
  serviceId: string;
  featureId: string;
  /** Defaults to authenticated. Public read-only tools must be explicitly authorized by the host. */
  principal?: 'authenticated' | 'public';
  actorId?: string;
  organizationId?: string;
  storeId?: string;
  taskId?: string;
  conversationId?: string;
  audience: AiAudience;
}

export interface AiMaterialReference {
  id: string;
  kind: string;
  audience: AiAudience;
}

export interface AiExtensionPrompt {
  systemPrompt: string;
  userPrompt: string;
}

export interface AiBusinessExtension<Input, Output> {
  readonly id: string;
  readonly operation: 'read' | 'draft';
  prepare(input: Input, context: AiExecutionContext): AiExtensionPrompt;
  parse(content: string): Output;
}

export interface AiExtensionInvocation {
  content: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  requestId: string;
}

/** Metadata only: no raw inputs, outputs, credentials or external error messages. */
export interface AiExtensionEvent {
  context: AiExecutionContext;
  extensionId: string;
  operation: 'read' | 'draft';
  payer: AiFunding['payer'];
  stage: 'started' | 'provider-completed' | 'completed' | 'failed';
  provider?: string;
  model?: string;
  providerRequestId?: string;
  promptTokens?: number;
  completionTokens?: number;
  errorCode?: string;
}

export interface AiExtensionRuntime {
  /** Must enforce the selected service/feature policy, funding and quota before calling a provider. */
  invoke(prompt: AiExtensionPrompt, context: AiExecutionContext, funding: AiFunding): Promise<AiExtensionInvocation>;
}

export interface AiExtensionHost {
  /** Call existing domain authorization; material labels and client context are not proof of access. */
  authorize(context: AiExecutionContext, operation: 'read' | 'draft', materials: readonly AiMaterialReference[]): Promise<boolean>;
  /** Required observer. A rejected event prevents the flow from reporting completion. */
  record(event: AiExtensionEvent): Promise<void>;
}
