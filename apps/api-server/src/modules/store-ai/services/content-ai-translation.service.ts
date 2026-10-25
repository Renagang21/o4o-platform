import { createPolicyExtensionRuntime } from '../../../services/ai-extensions/policy-runtime.js';
import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { runAiExtension, AiExtensionError } from '@o4o/ai-core';
import type { TranslationLocale } from '@o4o/ai-prompts/store';
import { createPolicyExecutor } from '../../ai-policy/ai-policy-factory.js';
import type { AiPolicyExecutorService } from '../../ai-policy/ai-policy-executor.service.js';
import { contentTranslationExtension } from './content-translation.extension.js';
import type { TranslatedContent } from './content-translation.extension.js';
import logger from '../../../utils/logger.js';

export type { TranslatedContent } from './content-translation.extension.js';
export type { TranslationLocale } from '@o4o/ai-prompts/store';

/** Server-constructed context, after existing store/content ownership checks. */
export interface ContentTranslationAccess {
  actorId: string;
  organizationId: string;
  contentId: string;
  authorize: () => Promise<boolean>;
}

export class ContentTranslationService {
  private aiPolicyExecutor: AiPolicyExecutorService;
  constructor(dataSource: DataSource) {
    this.aiPolicyExecutor = createPolicyExecutor(dataSource);
  }

  /** Existing null-on-failure contract retained; never persists or publishes content. */
  async translate(title: string, html: string, targetLocale: TranslationLocale, access: ContentTranslationAccess): Promise<{
    result: TranslatedContent; model: string; execution: { requestId: string; providerRequestId: string };
  } | null> {
    try {
      if (!access?.organizationId || !access.contentId) throw new AiExtensionError('INVALID_CONTEXT');
      const requestId = randomUUID();
      const out = await runAiExtension({
        extension: contentTranslationExtension,
        input: { title, html, targetLocale },
        context: {
          requestId, serviceId: 'store', featureId: 'content.translation',
          actorId: access.actorId, organizationId: access.organizationId, audience: 'staff',
        },
        materials: [{ id: access.contentId, kind: 'store-content', audience: 'staff' }],
        funding: { payer: 'platform' },
      }, createPolicyExtensionRuntime(this.aiPolicyExecutor, 'CONTENT_TRANSLATION', {
        maxTokens: 6000, temperature: 0.2,
      }), {
        authorize: () => access.authorize(),
        record: async event => { logger.info('[AI_EXTENSION]', event); },
      });
      return { result: out.output, model: out.invocation.model, execution: { requestId, providerRequestId: out.invocation.requestId } };
    } catch (error) {
      logger.warn('[ContentTranslation] translate failed', {
        targetLocale, code: error instanceof AiExtensionError ? error.code : 'TRANSLATION_FAILED',
      });
      return null;
    }
  }
}
