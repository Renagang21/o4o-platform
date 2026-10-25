/** Offline configuration checks. No provider, application connection, settings writes or reservations. */
import { createHash } from 'node:crypto';
import { loadAiPriceCatalog, type AiPriceCatalog } from './ai-pricing.js';
import { prepareNativePlan, type AiNativeRequest } from './ai-native-metering.js';
import { evaluateAiQuotaRows, type AiQuotaEvaluationRow } from './ai-quota.service.js';
import { SERVICE_FOR_SCOPE, type AiPolicyScope } from './ai-policy-scope.js';

export interface AiPricingCase {
  id: string;
  scope: AiPolicyScope;
  serviceKey: string;
  request: AiNativeRequest;
}
export interface AiPricingManifest { version: 'ai-pricing-check-v1'; cases: AiPricingCase[] }
export interface AiQuotaSnapshot {
  observedAt: string;
  rows: AiQuotaEvaluationRow[];
  ignoredUserRules: number;
}
const invalid = (): never => { throw new Error('AI_PRICING_CHECK_INPUT_INVALID'); };
function object(input: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(key => !keys.includes(key))) return invalid();
  return input as Record<string, unknown>;
}
function text(input: unknown, pattern: RegExp): string {
  if (typeof input !== 'string' || !pattern.test(input)) return invalid();
  return input;
}
function count(input: unknown): number {
  if (!Number.isSafeInteger(input) || (input as number) < 0) return invalid();
  return input as number;
}

/** A reviewed sample of actual invocations, not a second model selector or a host inventory. */
export function parseAiPricingManifest(input: unknown): AiPricingManifest {
  const manifest = object(input, ['version', 'cases']);
  if (manifest.version !== 'ai-pricing-check-v1' || !Array.isArray(manifest.cases) || !manifest.cases.length || manifest.cases.length > 200) return invalid();
  const cases = manifest.cases.map(value => {
    const row = object(value, ['id', 'scope', 'serviceKey', 'request']);
    const id = text(row.id, /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/);
    if (typeof row.scope !== 'string' || !Object.hasOwn(SERVICE_FOR_SCOPE, row.scope)) return invalid();
    const scope = row.scope as AiPolicyScope;
    const serviceKey = row.serviceKey === undefined ? SERVICE_FOR_SCOPE[scope] : text(row.serviceKey, /^[a-z][a-z0-9-]{0,49}$/);
    const request = object(row.request, ['kind', 'provider', 'model', 'textBytes', 'maxOutputTokens', 'unit', 'units']);
    if (!['text', 'multimodal', 'grounding', 'ocr', 'tts'].includes(request.kind as string)) return invalid();
    if (request.unit !== undefined && !['image', 'request', 'character'].includes(request.unit as string)) return invalid();
    return { id, scope, serviceKey, request: {
      kind: request.kind as AiNativeRequest['kind'],
      provider: text(request.provider, /^[a-z0-9_-]{1,20}$/),
      model: text(request.model, /^[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,99}$/),
      ...(request.textBytes !== undefined ? { textBytes: count(request.textBytes) } : {}),
      ...(request.maxOutputTokens !== undefined ? { maxOutputTokens: count(request.maxOutputTokens) } : {}),
      ...(request.unit !== undefined ? { unit: request.unit as AiNativeRequest['unit'] } : {}),
      ...(request.units !== undefined ? { units: count(request.units) } : {}),
    } };
  });
  if (new Set(cases.map(row => row.id)).size !== cases.length) return invalid();
  return { version: 'ai-pricing-check-v1', cases };
}

function amount(value: unknown): number | string {
  if (typeof value === 'string' && /^\d{1,12}(?:\.\d{1,8})?$/.test(value)) return value;
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value < 1e12 && Number(value.toFixed(8)) === value) return value;
  return invalid();
}

function quotaRow(value: unknown): AiQuotaEvaluationRow | null | 'user' {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const row = value as Record<string, unknown>;
  if (row.layer === 'user') return 'user';
  object(row, ['id', 'layer', 'layerKey', 'limitType', 'period', 'currentValue', 'reservedValue', 'limitValue', 'warningThreshold', 'isEnabled', 'projectedValue', 'usagePercent', 'status']);
  if (!['global', 'service', 'scope'].includes(row.layer as string) || typeof row.isEnabled !== 'boolean') return invalid();
  if (!row.isEnabled) return null;
  const layerKey = text(row.layerKey, /^[a-zA-Z0-9_*.-]{1,100}$/);
  if ((row.layer === 'global' && layerKey !== '*') || (row.layer === 'scope' && !Object.hasOwn(SERVICE_FOR_SCOPE, layerKey))) return invalid();
  if (!['requests', 'tokens', 'cost'].includes(row.limitType as string) || !['daily', 'monthly'].includes(row.period as string)) return invalid();
  const warning = Number(amount(row.warningThreshold));
  if (warning > 100) return invalid();
  return { layer: row.layer as string, layerKey, limitType: row.limitType as string, period: row.period as string,
    currentValue: amount(row.currentValue), reservedValue: amount(row.reservedValue), limitValue: amount(row.limitValue), warningThreshold: warning };
}

/** Accept the existing quota-status fields; user identifiers never leave the parser. */
export function parseAiQuotaSnapshot(input: unknown): AiQuotaSnapshot {
  const snapshot = object(input, ['observedAt', 'rows']);
  if (typeof snapshot.observedAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(snapshot.observedAt) || !Number.isFinite(Date.parse(snapshot.observedAt)) || !Array.isArray(snapshot.rows) || snapshot.rows.length > 5000) return invalid();
  if (new Date(snapshot.observedAt).toISOString().replace('.000Z', 'Z') !== snapshot.observedAt.replace('.000Z', 'Z')) return invalid();
  const rows: AiQuotaEvaluationRow[] = [];
  let ignoredUserRules = 0;
  const seen = new Set<string>();
  for (const value of snapshot.rows) {
    const row = quotaRow(value);
    if (row === 'user') { ignoredUserRules++; continue; }
    if (!row) continue;
    const key = [row.layer, row.layerKey, row.limitType, row.period].join(':');
    if (seen.has(key)) return invalid();
    seen.add(key);
    rows.push(row);
  }
  return { observedAt: snapshot.observedAt, rows, ignoredUserRules };
}

const SAFE_ERRORS = new Set(['AI_PRICING_NOT_CONFIGURED', 'AI_PRICING_INVALID', 'AI_PRICING_CURRENCY_UNSUPPORTED', 'AI_POLICY_INVALID', 'AI_USAGE_INVALID', 'AI_QUOTA_INVALID']);
export function checkAiPricingReadiness(manifest: AiPricingManifest, catalog: AiPriceCatalog, snapshot?: AiQuotaSnapshot) {
  const cases = manifest.cases.map(row => {
    const identity = { id: row.id, provider: row.request.provider, model: row.request.model, kind: row.request.kind, scope: row.scope, serviceKey: row.serviceKey };
    try {
      const plan = prepareNativePlan(row.request, catalog);
      const applicable = snapshot?.rows.filter(q => q.layer === 'global' || (q.layer === 'scope' && q.layerKey === row.scope) || (q.layer === 'service' && q.layerKey === row.serviceKey));
      const quota = applicable ? evaluateAiQuotaRows(applicable, plan.budget) : null;
      return { ...identity, status: quota?.allowed === false ? 'blocked' as const : 'passed' as const,
        code: quota?.allowed === false ? 'QUOTA_EXCEEDED' : null,
        price: { version: plan.price.version, match: plan.price.match, currency: plan.price.currency },
        budget: plan.budget, quota,
        notices: [
          ...(plan.price.match === 'provider-estimate' ? ['PROVIDER_ESTIMATE'] : []),
          ...(plan.budget.cost === 0 ? ['ZERO_ESTIMATED_COST'] : []),
          ...(applicable && !applicable.some(q => q.limitType === 'cost') ? ['NO_MATCHING_COST_LIMIT'] : []),
          ...(row.request.kind === 'tts' ? ['MISSING_AUDIO_USAGE_CAN_HOLD_BUDGET'] : []),
        ] };
    } catch (error) {
      const code = error instanceof Error && SAFE_ERRORS.has(error.message) ? error.message : 'AI_PRICING_CHECK_FAILED';
      return { ...identity, status: 'blocked' as const, code, price: null, budget: null, quota: null, notices: [] };
    }
  });
  return { kind: 'offline-configuration-check' as const, catalogVersion: catalog.version,
    catalogFingerprint: createHash('sha256').update(JSON.stringify(catalog)).digest('hex'),
    status: cases.every(row => row.status === 'passed') ? 'passed' as const : 'blocked' as const,
    checkedCases: cases.length, cases,
    quotaSnapshot: snapshot ? { observedAt: snapshot.observedAt, ignoredUserRules: snapshot.ignoredUserRules } : null,
    unverified: [...(!snapshot ? ['QUOTA_CONFIGURATION'] : []), 'CURRENT_RUNTIME_MODEL_SELECTION', 'CREDENTIALS', 'PROVIDER_ACCESS', 'LIVE_USAGE_AND_RESERVATIONS', 'USER_QUOTA', 'DEPLOYMENT'],
    notice: '검토한 실행 사례와 제공된 설정/snapshot만 검사합니다. 실제 실행의 원자 예약이나 운영 활성화 확인을 대신하지 않습니다.' };
}

/** Nulls deliberately prevent an unfinished draft from passing the actual catalog loader. */
export function draftAiPriceCatalog(manifest: AiPricingManifest, existing: AiPriceCatalog = loadAiPriceCatalog('')) {
  const rates: Array<Record<string, unknown>> = existing.rates.map(rate => ({ ...structuredClone(rate) }));
  const generated = new Set<string>();
  for (const { request } of manifest.cases) {
    let rate = rates.find(row => row.provider === request.provider && row.model === request.model);
    if (!rate && request.kind === 'text' && ['gemini', 'openai', 'claude'].includes(request.provider) && rates.some(row => row.provider === request.provider && row.model === '*')) continue;
    if (!rate) {
      rate = { provider: request.provider, model: request.model, currency: 'USD', inputPerMillion: request.kind === 'ocr' ? 0 : null, outputPerMillion: request.kind === 'ocr' ? 0 : null };
      rates.push(rate);
    }
    if (request.kind === 'text') continue;
    const native = (rate.native ??= {}) as Record<string, Record<string, unknown>>;
    const key = JSON.stringify([request.provider, request.model, request.kind]);
    if (native[request.kind]) {
      if (generated.has(key) && request.maxOutputTokens !== undefined)
        native[request.kind].maxOutputTokens = Math.max(Number(native[request.kind].maxOutputTokens ?? 0), request.maxOutputTokens);
      continue;
    }
    generated.add(key);
    native[request.kind] = request.kind === 'ocr'
      ? { maxInputTokens: 0, maxOutputTokens: 0, unit: 'image', perUnit: null }
      : { maxInputTokens: null, maxOutputTokens: request.maxOutputTokens ?? null,
        ...(request.kind === 'grounding' ? { unit: 'request', perUnit: null } : {}),
        ...(request.kind === 'tts' ? { unit: null, perUnit: null } : {}) };
  }
  return { version: 'review-required', rates };
}
