import type { AiBusinessExtension } from '@o4o/ai-core';
import type { WebResearchRequest } from '../ai/web-research.service.js';

/** Public web information only; never queries an organization's records or performs local execution. */
export const webResearchExtension: AiBusinessExtension<WebResearchRequest, string> = {
  id: 'web.research', operation: 'read',
  prepare(request) {
    if (typeof request.query !== 'string' || !request.query.trim()) throw new Error('Query required');
    return {
      systemPrompt: request.systemPrompt ?? '너는 근거를 검색해 답하는 범용 리서치 어시스턴트다. 최신 웹 검색 결과에 근거해 간결하고 정확하게 답하라.',
      userPrompt: request.query,
    };
  },
  parse(content) { return content; },
};
