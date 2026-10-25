import { createPolicyExtensionRuntime } from '../../../services/ai-extensions/policy-runtime.js';
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

const quantityUnits = new Set(['mcg', 'mg', 'kg', 'ml', 'iu', 'meq', 'mmol', 'μg', 'µg', 'ug', 'g', 'l', '%']);
function numericSignatures(text: string) {
  const values: string[] = [];
  const units: string[] = [];
  // Scan numeric runs once; matching units separately avoids overlapping backtracking.
  for (const match of text.matchAll(/\d[\d.,]*/g)) {
    let end = match[0].length;
    while (end > 0 && (match[0][end - 1] === '.' || match[0][end - 1] === ',')) end--;
    const value = match[0].slice(0, end);
    values.push(value);
    const unit = /^\s*([a-zA-Zμµ]+|%)/.exec(text.slice(match.index + end))?.[1]?.toLowerCase();
    if (unit && quantityUnits.has(unit)) units.push(value + unit);
  }
  const compare = (left: string, right: string) => left.localeCompare(right);
  return JSON.stringify({ values: values.sort(compare), units: units.sort(compare) });
}

/** Reuses the existing platform-funded translation policy and metadata-only accounting. */
export function createConsultationTranslator(db: DataSource): ConsultationTranslator {
  const policy = createPolicyExecutor(db);
  return async (input, access) => {
    try {
      const result = await runAiExtension({
        extension: { ...consultationTranslationExtension, parse: content => {
          const output = consultationTranslationExtension.parse(content);
          if (numericSignatures(input.text) !== numericSignatures(output.translation)) throw new Error('Invalid numeric translation');
          return output;
        } }, input, materials: [], funding: { payer: 'platform' },
        context: { requestId: randomUUID(), serviceId: 'store', featureId: consultationTranslationExtension.id,
          actorId: access.actorId, organizationId: access.organizationId, audience: 'staff' },
      }, createPolicyExtensionRuntime(policy, 'CONTENT_TRANSLATION', {
        maxTokens: 2048, temperature: 0, responseMode: 'json', usage: 'pharmacy.consultation',
      }), { authorize: () => access.authorize(), record: event => { logger.info('[AI_EXTENSION]', event); return Promise.resolve(); } });
      return result.output;
    } catch (error) {
      if (error instanceof AiExtensionError && error.code === 'QUOTA_EXCEEDED') {
        throw new NeturePharmacyError(429, 'CONSULTATION_QUOTA_EXCEEDED', '번역 이용 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.');
      }
      throw new NeturePharmacyError(503, 'CONSULTATION_TRANSLATION_UNAVAILABLE', '번역을 완료하지 못했습니다. 입력 문장을 확인하고 다시 시도해 주세요.');
    }
  };
}
