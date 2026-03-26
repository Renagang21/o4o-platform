/**
 * Action Queue — AI Rule Service
 *
 * WO-O4O-OPERATOR-ACTION-LAYER-V1
 *
 * 서비스별 규칙 생성기를 위임하여 AI 액션을 생성한다.
 * LLM 연동은 서비스 레벨에서 별도 구현 (Neture: OperatorAiActionService).
 */

import type { AiRuleAction } from './action-queue.types.js';
import logger from '../../utils/logger.js';

export type RuleGenerator = (counts: Record<string, number>) => AiRuleAction[];

export async function generateAiActions(
  serviceKey: string,
  counts: Record<string, number>,
  ruleGenerator?: RuleGenerator,
): Promise<AiRuleAction[]> {
  if (!ruleGenerator) return [];
  try {
    return ruleGenerator(counts);
  } catch (err: any) {
    logger.warn(`[ActionQueue AI] Rule generation failed for ${serviceKey}: ${err.message}`);
    return [];
  }
}
