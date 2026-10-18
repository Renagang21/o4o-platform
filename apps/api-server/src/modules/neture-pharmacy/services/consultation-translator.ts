import { randomUUID } from 'node:crypto';
import type { DataSource } from 'typeorm';
import { runAiExtension, AiExtensionError } from '@o4o/ai-core';
import { createPolicyExecutor } from '../../ai-policy/ai-policy-factory.js';
import logger from '../../../utils/logger.js';
import { NeturePharmacyError } from '../constants.js';
import { consultationTranslationExtension, type ConsultationTranslationInput } from './consultation-translation.extension.js';

export type ConsultationTranslator = (input: ConsultationTranslationInput, access: {
  actorId: string; organizationId: string; authorize: () => Promise<boolean>;
}) => Promise<{ translation: string }>;

function numericValues(text: string) { return (text.match(/\d+(?:[.,]\d+)*/g) ?? []).sort(); }
function numericUnits(text: string) {
  return (text.match(/\d+(?:[.,]\d+)*\s*(?:mcg|mg|kg|mL|ml|IU|mEq|mmol|μg|µg|ug|g|L|%)(?![a-zA-Z])/g) ?? [])
    .map(value => value.replace(/\s/g, '').toLowerCase()).sort();
}

/** Reuses the existing platform-funded translation policy and metadata-only accounting. */
export function createConsultationTranslator(db: DataSource): ConsultationTranslator {
  const policy = createPolicyExecutor(db);
  return async (input, access) => {
    try {
      const result = await runAiExtension({
        extension: { ...consultationTranslationExtension, parse: content => {
          const output = consultationTranslationExtension.parse(content);
          if (JSON.stringify(numericValues(input.text)) !== JSON.stringify(numericValues(output.translation)) ||
            JSON.stringify(numericUnits(input.text)) !== JSON.stringify(numericUnits(output.translation))) throw new Error('Invalid numeric translation');
          return output;
        } }, input, materials: [], funding: { payer: 'platform' },
        context: { requestId: randomUUID(), serviceId: 'store', featureId: consultationTranslationExtension.id,
          actorId: access.actorId, organizationId: access.organizationId, audience: 'staff' },
      }, {
        invoke: async (prompt, context) => {
          const response = await policy.execute('CONTENT_TRANSLATION', prompt.systemPrompt, prompt.userPrompt,
            { maxTokens: 2048, temperature: 0, responseMode: 'json', userId: context.actorId });
          return { ...response, provider: response.provider ?? 'unknown' };
        },
      }, { authorize: () => access.authorize(), record: async event => { logger.info('[AI_EXTENSION]', event); } });
      return result.output;
    } catch (error) {
      if (error instanceof AiExtensionError && error.code === 'QUOTA_EXCEEDED') {
        throw new NeturePharmacyError(429, 'CONSULTATION_QUOTA_EXCEEDED', '번역 이용 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.');
      }
      throw new NeturePharmacyError(503, 'CONSULTATION_TRANSLATION_UNAVAILABLE', '번역을 완료하지 못했습니다. 입력 문장을 확인하고 다시 시도해 주세요.');
    }
  };
}
