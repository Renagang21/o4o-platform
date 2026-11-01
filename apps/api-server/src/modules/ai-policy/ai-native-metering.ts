/** Native transports supply measurements; accounting stays in the existing executor and ledger. */
import { loadAiPriceCatalog, resolveAiPrice, estimateAiCost, type AiPriceCatalog, type AiNativeKind, type AiNativePriceProfile, type AiPriceSnapshot } from './ai-pricing.js';
import type { AiQuotaUsage } from './ai-quota.service.js';

export interface AiNativeRequest {
  kind: AiNativeKind;
  provider: string;
  model: string;
  /** UTF-8 text bytes only; never infer image/PDF/audio tokens from bytes. */
  textBytes?: number;
  maxOutputTokens?: number;
  units?: number;
  unit?: 'image' | 'request' | 'character' | 'second';
}
export interface AiNativeUsage { inputTokens?: number; outputTokens?: number; units?: number; searchQueries?: number }
export interface AiNativeOutcome<T> { value: T; usage?: AiNativeUsage }
export type AiNativeInvocation = <T>(request: AiNativeRequest, invoke: () => Promise<AiNativeOutcome<T>>) => Promise<T>;
export interface NativePlan {
  request: AiNativeRequest;
  price: AiPriceSnapshot;
  profile: AiNativePriceProfile;
  budget: AiQuotaUsage;
}
const count = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0;

function cost(price: AiPriceSnapshot, profile: AiNativePriceProfile, input: number, output: number, units: number): number {
  const total = estimateAiCost(price, input, output) + (profile.perUnit ?? 0) * units;
  if (!Number.isFinite(total) || total > 999_999_999_999) throw new Error('AI_USAGE_INVALID');
  return Math.round(total * 1e8) / 1e8;
}

export function prepareNativePlan(request: AiNativeRequest, catalog: AiPriceCatalog = loadAiPriceCatalog()): NativePlan {
  const price = resolveAiPrice(catalog, request.provider, request.model);
  const profile = price.native?.[request.kind] ?? (request.kind === 'text' ? { maxInputTokens: request.textBytes ?? 0, maxOutputTokens: request.maxOutputTokens ?? 2048 } : undefined);
  if ((price.match !== 'model' && (request.kind !== 'text' || !['gemini', 'openai', 'claude'].includes(request.provider))) || !profile) throw new Error('AI_PRICING_NOT_CONFIGURED');
  // OCR has image billing; grounding must explicitly include search-request policy costs.
  if ((request.kind === 'stt' && profile.unit !== 'second') || (request.kind === 'translation' && profile.unit !== 'character') || (request.kind === 'ocr' && profile.unit !== 'image') || (request.kind === 'grounding' && !['request', 'search-query'].includes(profile.unit ?? '')))
    throw new Error('AI_PRICING_NOT_CONFIGURED');
  if ((['multimodal', 'grounding'].includes(request.kind) && (!profile.maxInputTokens || !profile.maxOutputTokens)) ||
    (price.inputPerMillion > 0 && profile.maxInputTokens === 0) || (price.outputPerMillion > 0 && profile.maxOutputTokens === 0) ||
    (request.kind === 'ocr' && (profile.maxInputTokens !== 0 || profile.maxOutputTokens !== 0 || price.inputPerMillion !== 0 || price.outputPerMillion !== 0)))
    throw new Error('AI_PRICING_INVALID');
  const textBytes = request.textBytes ?? 0;
  const output = request.maxOutputTokens ?? profile.maxOutputTokens;
  const queryUnit = profile.unit === 'search-query';
  const units = queryUnit ? profile.maxUnits : profile.unit ? request.units ?? (profile.unit === 'request' ? 1 : NaN) : 0;
  if (!count(textBytes) || !count(output) || !count(units) || (profile.maxInputTokens > 0 && textBytes > profile.maxInputTokens) || output > profile.maxOutputTokens || (profile.unit && (units < 1 || (!queryUnit && request.unit !== profile.unit))))
    throw new Error('AI_POLICY_INVALID');
  const input = request.kind === 'text' ? textBytes : profile.maxInputTokens;
  return { request, price, profile, budget: { requests: 1, tokens: input + output, cost: cost(price, profile, input, output, units) } };
}

/** Missing/malformed measurements remain unknown, even for a successful empty OCR/audio response. */
export function measuredNativeUsage(plan: NativePlan, usage?: AiNativeUsage): AiQuotaUsage | null {
  const { price, profile } = plan;
  const input = usage?.inputTokens ?? (profile.maxInputTokens === 0 ? 0 : undefined);
  const output = usage?.outputTokens ?? (profile.maxOutputTokens === 0 ? 0 : undefined);
  const units = profile.unit === 'search-query' ? usage?.searchQueries : profile.unit ? usage?.units : 0;
  if (!count(input) || !count(output) || !count(units)) return null;
  // All-zero reports with a nonzero token budget are not proof that generation was free.
  if (plan.budget.tokens > 0 && input + output === 0) return null;
  return { requests: 1, tokens: input + output, cost: cost(price, profile, input, output, units) };
}

/** totalTokenCount also includes thinking/audio tokens that candidatesTokenCount can omit. */
export function geminiNativeUsage(data: { usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number; toolUsePromptTokenCount?: number; totalTokenCount?: number } }): AiNativeUsage {
  const usage = data.usageMetadata;
  if (!usage || !count(usage.promptTokenCount)) return {};
  const candidates = usage.candidatesTokenCount;
  const thoughts = usage.thoughtsTokenCount ?? 0;
  const tools = usage.toolUsePromptTokenCount ?? 0;
  const total = usage.totalTokenCount;
  if ((candidates !== undefined && !count(candidates)) || !count(thoughts) || !count(tools) || (tools > 0 && candidates === undefined) || (total !== undefined && (!count(total) || total < usage.promptTokenCount)) || (candidates === undefined && total === undefined)) return {};
  return { inputTokens: usage.promptTokenCount + tools, outputTokens: Math.max((candidates ?? 0) + thoughts, total === undefined ? 0 : total - usage.promptTokenCount - tools) };
}

export function openAiNativeUsage(data: { usage?: { prompt_tokens?: number; completion_tokens?: number } }): AiNativeUsage {
  return { inputTokens: data.usage?.prompt_tokens, outputTokens: data.usage?.completion_tokens };
}
