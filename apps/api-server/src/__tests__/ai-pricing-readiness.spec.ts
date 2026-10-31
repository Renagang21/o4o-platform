import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadAiPriceCatalog, type AiPriceCatalog } from '../modules/ai-policy/ai-pricing.js';
import { prepareNativePlan } from '../modules/ai-policy/ai-native-metering.js';
import { checkAiPricingReadiness, draftAiPriceCatalog, parseAiPricingManifest, parseAiQuotaSnapshot } from '../modules/ai-policy/ai-pricing-readiness.js';
import { runAiPricingReadinessCli } from '../modules/ai-policy/ai-pricing-readiness-cli.js';

const source = () => ({ version: 'ai-pricing-check-v1', cases: [{ id: 'home-inline', scope: 'SERVICE_QUERY', serviceKey: 'neture',
  request: { kind: 'multimodal', provider: 'gemini', model: 'synthetic-model', textBytes: 10, maxOutputTokens: 20 } }] });
const catalog = (): AiPriceCatalog => ({ version: 'synthetic-test-only', rates: [{ provider: 'gemini', model: 'synthetic-model', currency: 'USD', inputPerMillion: 1000, outputPerMillion: 2000,
  native: { multimodal: { maxInputTokens: 100, maxOutputTokens: 20 } } }] });
const manifest = () => parseAiPricingManifest(source());
const row = (extra: Record<string, unknown> = {}) => ({ layer: 'global', layerKey: '*', limitType: 'cost', period: 'daily', currentValue: 0.1, reservedValue: 0.2, limitValue: 0.44, warningThreshold: 80, isEnabled: true, ...extra });
const snapshot = (rows: unknown[]) => parseAiQuotaSnapshot({ observedAt: '2026-10-25T00:00:00.000Z', rows });

it('uses the supplied catalog without changing or consulting a process-wide catalog', () => {
  const original = process.env.AI_PRICING_CATALOG;
  process.env.AI_PRICING_CATALOG = 'unusable ambient configuration';
  try {
    expect(prepareNativePlan(manifest().cases[0].request, catalog()).budget).toEqual({ requests: 1, tokens: 120, cost: 0.14 });
    expect(checkAiPricingReadiness(manifest(), catalog())).toMatchObject({ status: 'passed', checkedCases: 1, quotaSnapshot: null });
    expect(process.env.AI_PRICING_CATALOG).toBe('unusable ambient configuration');
  } finally { if (original === undefined) delete process.env.AI_PRICING_CATALOG; else process.env.AI_PRICING_CATALOG = original; }
});

it('blocks unpriced native work while preserving the existing text estimate behavior', () => {
  const report = checkAiPricingReadiness(manifest(), loadAiPriceCatalog(''));
  expect(report.cases[0]).toMatchObject({ status: 'blocked', code: 'AI_PRICING_NOT_CONFIGURED', budget: null });
  const input = source(); input.cases[0].request.kind = 'text';
  const text = checkAiPricingReadiness(parseAiPricingManifest(input), loadAiPriceCatalog(''));
  expect(text.cases[0]).toMatchObject({ status: 'passed', price: { match: 'provider-estimate' }, notices: ['PROVIDER_ESTIMATE'] });
  expect(text.unverified).toContain('CURRENT_RUNTIME_MODEL_SELECTION');
  expect(text.unverified).toContain('USER_QUOTA');
});

it('binds the report to sanitized catalog content even if an operator forgot to change its version', () => {
  const first = checkAiPricingReadiness(manifest(), catalog());
  const changed = catalog(); changed.rates[0].outputPerMillion = 3000;
  expect(checkAiPricingReadiness(manifest(), changed).catalogFingerprint).not.toBe(first.catalogFingerprint);
  expect(first.catalogFingerprint).toMatch(/^[a-f0-9]{64}$/);
});

it('includes held capacity and allows the exact fractional cost limit from a quota snapshot', () => {
  const report = checkAiPricingReadiness(manifest(), catalog(), snapshot([row()]));
  expect(report.status).toBe('passed'); // 0.10 used + 0.20 held + 0.14 request = 0.44
  expect(report.cases[0].quota).toMatchObject({ allowed: true, warnings: [{ usagePercent: 100 }] });
  const blocked = checkAiPricingReadiness(manifest(), catalog(), snapshot([row({ limitValue: 0.43999999 })]));
  expect(blocked.cases[0]).toMatchObject({ status: 'blocked', code: 'QUOTA_EXCEEDED' });
});

it.each([
  { kind: 'grounding', provider: 'gemini', request: { maxOutputTokens: 20, unit: 'request', units: 1 },
    input: 1000, output: 2000, profile: { maxInputTokens: 100, maxOutputTokens: 20, unit: 'search-query', perUnit: 0.01, maxUnits: 4 }, cost: 0.18 },
  { kind: 'ocr', provider: 'google-vision', request: { unit: 'image', units: 1 },
    input: 0, output: 0, profile: { maxInputTokens: 0, maxOutputTokens: 0, unit: 'image', perUnit: 0.05 }, cost: 0.05 },
  { kind: 'tts', provider: 'openai', request: { unit: 'character', units: 10 },
    input: 0, output: 0, profile: { maxInputTokens: 0, maxOutputTokens: 0, unit: 'character', perUnit: 0.01 }, cost: 0.1 },
  { kind: 'translation', provider: 'google-cloud', request: { unit: 'character', units: 10, maxOutputTokens: 0 },
    input: 0, output: 0, profile: { maxInputTokens: 0, maxOutputTokens: 0, unit: 'character', perUnit: 0.01 }, cost: 0.1 },
  { kind: 'stt', provider: 'google-cloud', request: { unit: 'second', units: 10, maxOutputTokens: 0 },
    input: 0, output: 0, profile: { maxInputTokens: 0, maxOutputTokens: 0, unit: 'second', perUnit: 0.01 }, cost: 0.1 },
])('checks $kind unit budgets with the actual native planner and leaves new draft fees unconfirmed', item => {
  const cases = parseAiPricingManifest({ version: 'ai-pricing-check-v1', cases: [{ id: 'specialist', scope: 'AI_PROXY',
    request: { kind: item.kind, provider: item.provider, model: 'synthetic-specialist', ...item.request } }] });
  const prices = loadAiPriceCatalog(JSON.stringify({ version: 'synthetic-test-only', rates: [{ provider: item.provider, model: 'synthetic-specialist', currency: 'USD',
    inputPerMillion: item.input, outputPerMillion: item.output, native: { [item.kind]: item.profile } }] }));
  const report = checkAiPricingReadiness(cases, prices);
  expect(report.cases[0]).toMatchObject({ status: 'passed', budget: { requests: 1, cost: item.cost } });
  const draft = draftAiPriceCatalog(cases);
  expect(() => loadAiPriceCatalog(JSON.stringify(draft))).toThrow('AI_PRICING_INVALID');
  if (item.kind === 'tts') expect(report.cases[0].notices).toContain('MISSING_AUDIO_USAGE_CAN_HOLD_BUDGET');
});

it('filters other service/scope rules, reports unlimited cost and never reveals user quota identifiers', () => {
  const limits = snapshot([
    row({ layer: 'service', layerKey: 'store', limitValue: 0 }),
    row({ layer: 'scope', layerKey: 'PRODUCT_CONTENT', limitValue: 0 }),
    row({ layer: 'user', layerKey: 'private-user-identifier', limitValue: 0 }),
    row({ limitType: 'requests', currentValue: 1, reservedValue: 1, limitValue: 3 }),
  ]);
  const report = checkAiPricingReadiness(manifest(), catalog(), limits);
  expect(report.status).toBe('passed');
  expect(report.cases[0].notices).toContain('NO_MATCHING_COST_LIMIT');
  expect(report.quotaSnapshot?.ignoredUserRules).toBe(1);
  expect(JSON.stringify(report)).not.toContain('private-user-identifier');
  expect(checkAiPricingReadiness(manifest(), catalog(), snapshot([row({ layer: 'service', layerKey: 'neture', limitValue: 0 })])).status).toBe('blocked');
});

it('keeps a deliberately zero price visible for review instead of silently calling it verified free upstream usage', () => {
  const free = catalog(); free.rates[0].inputPerMillion = 0; free.rates[0].outputPerMillion = 0;
  const report = checkAiPricingReadiness(manifest(), free);
  expect(report.cases[0].notices).toContain('ZERO_ESTIMATED_COST');
  expect(report.unverified).toContain('QUOTA_CONFIGURATION');
  expect(report.unverified).toContain('PROVIDER_ACCESS');
});

it.each([
  {}, { version: 'ai-pricing-check-v1', cases: [] },
  { ...source(), unexpected: 'private prompt or key' },
  { ...source(), cases: [{ ...source().cases[0], request: { ...source().cases[0].request, prompt: 'private prompt or key' } }] },
  { ...source(), cases: [{ ...source().cases[0], scope: 'UNKNOWN' }] },
  { ...source(), cases: [source().cases[0], source().cases[0]] },
])('rejects incomplete, duplicate and non-metadata manifests without exposing their contents', input => {
  expect(() => parseAiPricingManifest(input)).toThrow('AI_PRICING_CHECK_INPUT_INVALID');
});

it.each([
  { rows: [] },
  { observedAt: 'not-a-date', rows: [] },
  { observedAt: '2026-02-30T00:00:00Z', rows: [] },
  { observedAt: '2026-10-25T00:00:00Z', rows: [{ ...row(), reservedValue: undefined }] },
  { observedAt: '2026-10-25T00:00:00Z', rows: [row({ currentValue: -1 })] },
  { observedAt: '2026-10-25T00:00:00Z', rows: [row({ reservedValue: 0.000000001 })] },
  { observedAt: '2026-10-25T00:00:00Z', rows: [row(), row()] },
])('does not turn missing/bad quota metadata into a verified zero or unlimited snapshot', input => {
  expect(() => parseAiQuotaSnapshot(input)).toThrow('AI_PRICING_CHECK_INPUT_INVALID');
});

it('merges draft requirements across callers without overwriting existing reviewed prices or profiles', () => {
  const input = source(); input.cases.push({ ...input.cases[0], id: 'second-host', request: { ...input.cases[0].request, maxOutputTokens: 2048 } });
  const draft = draftAiPriceCatalog(parseAiPricingManifest(input));
  expect(draft.rates.slice(0, 3)).toEqual(loadAiPriceCatalog('').rates);
  expect(draft.rates[3]).toMatchObject({ inputPerMillion: null, outputPerMillion: null, native: { multimodal: { maxInputTokens: null, maxOutputTokens: 2048 } } });
  expect(() => loadAiPriceCatalog(JSON.stringify(draft))).toThrow('AI_PRICING_INVALID');
  const reviewed = catalog(), before = structuredClone(reviewed);
  expect(draftAiPriceCatalog(parseAiPricingManifest(input), reviewed).rates).toEqual(before.rates);
  expect(reviewed).toEqual(before);
});

it('does not shadow legacy text estimates with new unfinished exact rates; Qwen still requires its own model rate', () => {
  const input = source(); input.cases[0].request.kind = 'text';
  expect(draftAiPriceCatalog(parseAiPricingManifest(input)).rates).toHaveLength(3);
  input.cases[0].request.provider = 'qwen';
  expect(draftAiPriceCatalog(parseAiPricingManifest(input)).rates[3]).toMatchObject({ provider: 'qwen', inputPerMillion: null });
});

describe('file/env CLI with no provider or DB runtime', () => {
  let directory: string, casesFile: string, catalogFile: string;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), 'o4o-pricing-readiness-test-'));
    casesFile = join(directory, 'cases.json'); catalogFile = join(directory, 'catalog.json');
    await writeFile(casesFile, JSON.stringify(source())); await writeFile(catalogFile, JSON.stringify(catalog()));
  });
  afterEach(async () => { await rm(directory, { recursive: true, force: true }); });
  it('returns separate success/blocked/invalid exit codes and keeps parser errors safe', async () => {
    let output = '';
    const write = (value: string) => { output = value; };
    expect(await runAiPricingReadinessCli(['--manifest', casesFile, '--catalog', catalogFile], { AI_PRICING_CATALOG: 'invalid ignored ambient input' }, write)).toBe(0);
    expect(JSON.parse(output).status).toBe('passed');
    expect(await runAiPricingReadinessCli(['--manifest', casesFile], {}, write)).toBe(1);
    expect(JSON.parse(output).cases[0].code).toBe('AI_PRICING_NOT_CONFIGURED');
    await writeFile(catalogFile, 'private key or provider response');
    expect(await runAiPricingReadinessCli(['--manifest', casesFile, '--catalog', catalogFile], {}, write)).toBe(2);
    expect(output).not.toContain('private');
    expect(JSON.parse(output).code).toBe('AI_PRICING_CHECK_INPUT_INVALID');
    expect(await runAiPricingReadinessCli(['--manifest', casesFile, '--manifest', casesFile], {}, write)).toBe(2);
  });
  it('prints only a non-approved draft and does not modify its input files', async () => {
    const before = await readFile(casesFile, 'utf8'); let output = '';
    expect(await runAiPricingReadinessCli(['--manifest', casesFile, '--draft'], {}, value => { output = value; })).toBe(0);
    expect(JSON.parse(output)).toMatchObject({ kind: 'price-catalog-draft', approved: false });
    expect(await readFile(casesFile, 'utf8')).toBe(before);
  });
  it('runs the actual source entry point as a standalone CLI', () => {
    const command = ['--import', 'tsx', resolve(__dirname, '../scripts/ai-pricing-readiness.ts')];
    const child = spawnSync(process.execPath, [...command, '--manifest', casesFile, '--catalog', catalogFile], { encoding: 'utf8' });
    expect(child.status).toBe(0);
    expect(JSON.parse(child.stdout)).toMatchObject({ kind: 'offline-configuration-check', status: 'passed' });
    expect(child.stderr).toBe('');
    const blocked = spawnSync(process.execPath, [...command, '--manifest', casesFile], { encoding: 'utf8', env: { ...process.env, AI_PRICING_CATALOG: '' } });
    expect(blocked.status).toBe(1);
    expect(JSON.parse(blocked.stdout).status).toBe('blocked');
    const invalid = spawnSync(process.execPath, [...command, '--manifest', casesFile, '--unknown'], { encoding: 'utf8' });
    expect(invalid.status).toBe(2);
    expect(JSON.parse(invalid.stdout).status).toBe('invalid-input');
  });
});
