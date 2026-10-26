import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { loadAiPriceCatalog } from '../modules/ai-policy/ai-pricing.js';
import { observeAiPricingCatalog } from '../modules/ai-policy/ai-pricing-observation.js';
import { parseAiPricingManifest, parseAiRuntimePricingSnapshot, checkAiPricingReadiness } from '../modules/ai-policy/ai-pricing-readiness.js';
import { runAiPricingReadinessCli } from '../modules/ai-policy/ai-pricing-readiness-cli.js';
import { runAiPricingEnvironmentCli, validateAiPricingEnvironmentFlags } from '../modules/ai-policy/ai-pricing-environment.js';
import { AiManagementService } from '../services/ai-management/management.service.js';

const price = () => ({ version: 'synthetic-operations-v1', rates: [{ provider: 'gemini', model: 'synthetic-model', currency: 'USD',
  inputPerMillion: 1000, outputPerMillion: 2000, native: { multimodal: { maxInputTokens: 100, maxOutputTokens: 20 } } }] });
const flags = (value = price(), delimiter = '@@') => `--set-env-vars=^${delimiter}^AI_PRICING_CATALOG=${JSON.stringify(value)}\0`;
const manifest = () => parseAiPricingManifest({ version: 'ai-pricing-check-v1', cases: [{ id: 'fixture', scope: 'SERVICE_QUERY',
  request: { kind: 'multimodal', provider: 'gemini', model: 'synthetic-model', textBytes: 10, maxOutputTokens: 20 } }] });
const snapshot = (raw = JSON.stringify(price())) => ({ observedAt: '2026-10-25T00:00:00.000Z', pricing: observeAiPricingCatalog(raw) });

it('observes the same sanitized fingerprint as preflight without returning rates or unrelated configuration', () => {
  const raw = JSON.stringify({ ...price(), unrelated: 'not-to-be-exported' });
  const observation = observeAiPricingCatalog(raw);
  expect(observation).toMatchObject({ state: 'loaded', modelRateCount: 1, nativeProfileCount: 1, currencies: ['USD'], code: null });
  expect(observation.fingerprint).toBe(checkAiPricingReadiness(manifest(), loadAiPriceCatalog(raw)).catalogFingerprint);
  expect(JSON.stringify(observation)).not.toMatch(/not-to-be-exported|inputPerMillion|synthetic-model/);
  expect(observeAiPricingCatalog('')).toMatchObject({ state: 'legacy-estimates', nativeProfileCount: 0 });
  expect(observeAiPricingCatalog('private malformed configuration')).toEqual({ state: 'invalid', version: null, fingerprint: null,
    modelRateCount: null, nativeProfileCount: null, currencies: [], code: 'AI_PRICING_INVALID' });
});

it('exposes pricing metadata through the existing management snapshot even when its DB is unavailable', async () => {
  const db = { isInitialized: false, query: jest.fn() };
  const data = await new AiManagementService(db, { AI_PRICING_CATALOG: JSON.stringify(price()) }).snapshot();
  expect(data.pricing).toEqual(snapshot().pricing);
  expect(data.queryPolicyRead).toBe('unavailable');
  expect(db.query).not.toHaveBeenCalled();
  expect(data.usages.every(usage => usage.application === 'unverified')).toBe(true);
});

it('matches the supplied server observation while leaving models, provider access and live admission unverified', () => {
  const runtime = parseAiRuntimePricingSnapshot({ success: true, data: { ...snapshot(), unrelated: 'private-input-not-copied' } });
  const report = checkAiPricingReadiness(manifest(), loadAiPriceCatalog(JSON.stringify(price())), undefined, runtime);
  expect(report).toMatchObject({ status: 'passed', runtimePricing: { state: 'match', observedAt: snapshot().observedAt } });
  expect(report.unverified).toEqual(expect.arrayContaining(['CURRENT_RUNTIME_MODEL_SELECTION', 'CREDENTIALS', 'PROVIDER_ACCESS', 'LIVE_USAGE_AND_RESERVATIONS', 'USER_QUOTA', 'DEPLOYMENT']));
  expect(JSON.stringify(runtime)).not.toContain('private-input-not-copied');
  const changed = price(); changed.rates[0].inputPerMillion = 2000;
  expect(checkAiPricingReadiness(manifest(), loadAiPriceCatalog(JSON.stringify(changed)), undefined, runtime))
    .toMatchObject({ status: 'blocked', runtimePricing: { state: 'mismatch' } });
  const unavailable = parseAiRuntimePricingSnapshot(snapshot('invalid-private-catalog'));
  expect(checkAiPricingReadiness(manifest(), loadAiPriceCatalog(JSON.stringify(price())), undefined, unavailable))
    .toMatchObject({ status: 'blocked', runtimePricing: { state: 'unavailable' } });
});

it.each([
  {}, { success: false, data: snapshot() }, { ...snapshot(), observedAt: '2026-02-30T00:00:00Z' },
  { ...snapshot(), pricing: { ...snapshot().pricing, fingerprint: 'not-a-digest' } },
  { ...snapshot(), pricing: { ...snapshot().pricing, version: null } },
  { ...snapshot(), pricing: { ...snapshot().pricing, modelRateCount: null } },
  { ...snapshot(), pricing: { ...snapshot().pricing, apiKey: 'private-input-not-copied' } },
])('rejects invalid runtime observations without treating missing prices as verified legacy configuration', input => {
  expect(() => parseAiRuntimePricingSnapshot(input)).toThrow('AI_PRICING_CHECK_INPUT_INVALID');
});

it('validates or omits environment flags without changing process prices or enabling native defaults', () => {
  const before = process.env.AI_PRICING_CATALOG;
  expect(validateAiPricingEnvironmentFlags(flags())).toMatchObject({ state: 'validated', flags: flags(), pricing: snapshot().pricing });
  expect(validateAiPricingEnvironmentFlags('')).toMatchObject({ state: 'omitted', flags: '', pricing: { state: 'legacy-estimates' } });
  expect(process.env.AI_PRICING_CATALOG).toBe(before);
});

it.each([
  'not-a-flag\0', flags().slice(0, -1), flags() + flags(), flags().replace('AI_PRICING_CATALOG=', 'OTHER='),
  '--set-env-vars=AI_PRICING_CATALOG=\0', '--set-env-vars=^@@^AI_PRICING_CATALOG=private-input-not-copied\0',
  flags().replace('synthetic-model', 'synthetic@@model'),
  flags({ ...price(), extra: 'not-to-be-forwarded' } as ReturnType<typeof price>),
])('refuses malformed/ambiguous flags and unrelated input before producing a deployment argument', input => {
  expect(() => validateAiPricingEnvironmentFlags(input)).toThrow();
});

it('rejects unreviewed null draft values and unsupported currencies through the runtime parser/resolver', () => {
  const draft = price(); draft.rates[0].native.multimodal.maxInputTokens = null as unknown as number;
  expect(() => validateAiPricingEnvironmentFlags(flags(draft))).toThrow('AI_PRICING_INVALID');
  const eur = price(); eur.rates[0].currency = 'EUR';
  expect(() => validateAiPricingEnvironmentFlags(flags(eur))).toThrow('AI_PRICING_CURRENCY_UNSUPPORTED');
});

describe('actual source CLI and private input/output files', () => {
  let directory: string;
  beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), 'o4o-ai-operations-test-')); });
  afterEach(async () => { await rm(directory, { recursive: true, force: true }); });
  it('writes only validated flags privately and refuses to overwrite input or an existing result', async () => {
    const input = join(directory, 'candidate'), output = join(directory, 'validated');
    await writeFile(input, flags()); let text = '';
    const write = (value: string) => { text = value; };
    expect(await runAiPricingEnvironmentCli(['--input', input, '--out', output], write)).toBe(0);
    expect(await readFile(output, 'utf8')).toBe(flags());
    expect(JSON.parse(text)).toMatchObject({ state: 'validated', applied: false, pricing: snapshot().pricing });
    expect(text).not.toContain('synthetic-model');
    if (process.platform !== 'win32') expect((await stat(output)).mode & 0o777).toBe(0o600);
    expect(await runAiPricingEnvironmentCli(['--input', input, '--out', output], write)).toBe(2);
    expect(await runAiPricingEnvironmentCli(['--input', input, '--out', input], write)).toBe(2);
    expect(await readFile(input, 'utf8')).toBe(flags());
    await writeFile(input, 'private-input-not-copied');
    expect(await runAiPricingEnvironmentCli(['--input', input, '--out', join(directory, 'bad')], write)).toBe(2);
    expect(text).not.toContain('private-input');
  });
  it('returns preflight exit 0/1/2 for matched, different and malformed server snapshots', async () => {
    const cases = join(directory, 'cases.json'), catalog = join(directory, 'catalog.json'), runtime = join(directory, 'runtime.json');
    await writeFile(cases, JSON.stringify(manifest())); await writeFile(catalog, JSON.stringify(price()));
    const args = ['--manifest', cases, '--catalog', catalog, '--runtime-snapshot', runtime]; let output = '';
    const write = (value: string) => { output = value; };
    await writeFile(runtime, JSON.stringify(snapshot()));
    expect(await runAiPricingReadinessCli(args, {}, write)).toBe(0);
    await writeFile(runtime, JSON.stringify(snapshot('')));
    expect(await runAiPricingReadinessCli(args, {}, write)).toBe(1);
    expect(JSON.parse(output).runtimePricing.state).toBe('mismatch');
    await writeFile(runtime, '{}');
    expect(await runAiPricingReadinessCli(args, {}, write)).toBe(2);
    expect(await runAiPricingReadinessCli([...args, '--draft'], {}, write)).toBe(2);
  });
  it('runs the documented Node environment command with actual success and error exit codes', async () => {
    const input = join(directory, 'candidate'), out = join(directory, 'validated');
    await writeFile(input, flags());
    const run = (...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', 'apps/api-server/src/scripts/ai-pricing-environment.ts', ...args],
      { cwd: resolve(__dirname, '../../../..'), encoding: 'utf8', timeout: 15_000 });
    const good = run('--input', input, '--out', out);
    expect(good.status).toBe(0); expect(good.stderr).toBe(''); expect(JSON.parse(good.stdout).applied).toBe(false);
    const bad = run('--input', input, '--out', out);
    expect(bad.status).toBe(2); expect(bad.stderr).toBe('');
    expect(JSON.parse(bad.stdout).code).toBe('AI_PRICING_ENV_INVALID');
  });
});
