/**
 * Response Normalizer
 *
 * Parses raw AI provider response (string) into a validated AIInsight.
 * Handles JSON extraction, schema validation, and safe defaults.
 */

import type { AIInsight } from './types.js';

/**
 * Normalize a raw provider response string into a validated AIInsight.
 * Handles common issues like markdown code fences and partial JSON.
 */
export function normalizeResponse(raw: string): AIInsight {
  const jsonStr = extractJson(raw);
  const parsed = JSON.parse(jsonStr);

  return validateInsight(parsed);
}

/**
 * Extract JSON from a response that may contain markdown fences or extra text.
 */
function extractJson(raw: string): string {
  // Try direct parse first
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    return trimmed;
  }

  // Extract from markdown code fence
  const fenceMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }

  // Find first { to last }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start !== -1 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  throw new Error('No valid JSON found in AI response');
}

/**
 * Validate and apply defaults to parsed insight data.
 */
function validateInsight(data: Record<string, unknown>): AIInsight {
  const summary = typeof data.summary === 'string' ? data.summary : '분석 결과를 생성할 수 없습니다.';

  const riskLevel = ['low', 'medium', 'high'].includes(data.riskLevel as string)
    ? (data.riskLevel as AIInsight['riskLevel'])
    : undefined;

  const recommendedActions = Array.isArray(data.recommendedActions)
    ? data.recommendedActions.filter((a): a is string => typeof a === 'string')
    : [];

  const suggestedTriggers = Array.isArray(data.suggestedTriggers)
    ? data.suggestedTriggers.filter((t): t is string => typeof t === 'string')
    : undefined;

  const confidenceScore = typeof data.confidenceScore === 'number'
    ? Math.max(0, Math.min(1, data.confidenceScore))
    : 0.5;

  const details = typeof data.details === 'object' && data.details !== null
    ? (data.details as Record<string, unknown>)
    : undefined;

  return {
    summary,
    riskLevel,
    recommendedActions,
    suggestedTriggers,
    confidenceScore,
    details,
  };
}
