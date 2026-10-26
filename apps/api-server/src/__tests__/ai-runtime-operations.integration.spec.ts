/** Real isolated PostgreSQL + existing host/model/accounting modules; only the paid transport is synthetic. */
import { randomUUID } from 'node:crypto';
import { DataSource, Entity, PrimaryColumn } from 'typeorm';
import { execute } from '@o4o/ai-core';
import { AIUsageLog } from '../entities/AIUsageLog.js';
import { AiLlmPolicy } from '../modules/ai-policy/entities/ai-llm-policy.entity.js';
import { AiPolicyExecutorService } from '../modules/ai-policy/ai-policy-executor.service.js';
import { AiAccountedExecution } from '../modules/ai-policy/ai-accounted-execution.js';
import { AiQuotaService } from '../modules/ai-policy/ai-quota.service.js';
import { CreateAiUsageReservations1791870434349 } from '../database/migrations/1791870434349-CreateAiUsageReservations.js';
import { ModelControlService } from '../services/ai-management/model-controls.js';
import { resolveManagedAiTarget } from '../services/ai-management/runtime-models.js';
import { AiManagementService } from '../services/ai-management/management.service.js';
import { explainOverview } from '../services/ai-extensions/dashboard-overview.service.js';
import { createPolicyExtensionRuntime } from '../services/ai-extensions/policy-runtime.js';
import { resolveServiceAiProfile } from '../services/ai-extensions/service-query.extension.js';

jest.mock('@o4o/ai-core', () => ({ ...jest.requireActual('@o4o/ai-core'), execute: jest.fn() }));
const mockExecute = execute as jest.MockedFunction<typeof execute>;
const fixture = process.env.O4O_AI_QUOTA_TEST_PORT === '55447' ? describe : describe.skip;
@Entity('users') class User { @PrimaryColumn({ type: 'uuid' }) id!: string; }
const actor = '10000000-0000-4000-8000-000000000001', other = '10000000-0000-4000-8000-000000000002';
const catalog = () => ({ version: 'synthetic-operations-pg-v1', rates: ['gemini', 'openai'].map(provider => ({
  provider, model: `synthetic-${provider}`, currency: 'USD', inputPerMillion: provider === 'gemini' ? 1000 : 500,
  outputPerMillion: provider === 'gemini' ? 2000 : 1000,
  native: { multimodal: { maxInputTokens: 100, maxOutputTokens: 20 } },
})) });

fixture('runtime operations from model selection to durable accounting', () => {
  let admin: DataSource, db: DataSource, policy: AiPolicyExecutorService, created = false;
  const name = `o4o_aiops_${process.pid}`;
  const original = { AI_PRICING_CATALOG: process.env.AI_PRICING_CATALOG, GEMINI_API_KEY: process.env.GEMINI_API_KEY, OPENAI_API_KEY: process.env.OPENAI_API_KEY };
  const query = (sql: string, args?: unknown[]) => db.query(sql, args);
  const account = { scope: 'STORE_INSIGHT' as const, serviceKey: 'neture', userId: actor };
  const nativeRequest = { kind: 'multimodal' as const, provider: 'gemini', model: 'synthetic-gemini', textBytes: 10, maxOutputTokens: 20 };
  const usage = () => new AiManagementService(db, {}).usage(7, new Date(Date.now() + 1000));
  const invoke = (userId = actor) => policy.execute('STORE_INSIGHT', 'fixture system', 'fixture input', { userId, serviceKey: 'neture' });
  const limit = (layer: string, layerKey: string, type: string, value: number) => query(
    'INSERT INTO ai_usage_quota(layer,layer_key,limit_type,period,limit_value,warning_threshold,is_enabled) VALUES ($1,$2,$3,\'daily\',$4,80,true)', [layer, layerKey, type, value]);
  async function select(target: string, provider: 'gemini' | 'openai') {
    const controls = new ModelControlService(db), before = await controls.snapshot();
    await controls.change(before.revision, actor, { action: 'create', model: {
      provider, id: `synthetic-${provider}`, name: 'Synthetic operational fixture', capabilities: ['text', 'image'],
    } });
    await controls.change(before.revision + 1, actor, { action: 'select', target, selection: { provider, model: `synthetic-${provider}` } });
  }
  beforeAll(async () => {
    const connection = { type: 'postgres' as const, host: '127.0.0.1', port: 55447, username: 'o4o_quota_fixture', database: 'postgres' };
    admin = await new DataSource(connection).initialize();
    await admin.query(`CREATE DATABASE ${name}`); created = true;
    db = await new DataSource({ ...connection, database: name, entities: [AIUsageLog, AiLlmPolicy, User], synchronize: true }).initialize();
    await query('CREATE TABLE settings(key varchar(100) PRIMARY KEY,value jsonb,type varchar(50),description text,"createdAt" timestamptz DEFAULT NOW(),"updatedAt" timestamptz DEFAULT NOW())');
    await query('CREATE TABLE ai_query_policy(id int PRIMARY KEY,default_model varchar(100),ai_enabled boolean)');
    await query('CREATE TABLE ai_settings(provider varchar(20),"apiKey" text,"isEnabled" boolean,config jsonb)');
    await query('CREATE TABLE ai_usage_quota(id serial PRIMARY KEY,layer varchar(20),layer_key varchar(100),limit_type varchar(20),period varchar(10),limit_value numeric(20,8),warning_threshold int,is_enabled boolean)');
    await query('CREATE TABLE ai_usage_aggregate(layer varchar(20),layer_key varchar(100),limit_type varchar(20),period_key varchar(10),current_value numeric(20,8) DEFAULT 0,last_updated_at timestamptz DEFAULT NOW(),UNIQUE(layer,layer_key,limit_type,period_key))');
    const runner = db.createQueryRunner();
    try { await new CreateAiUsageReservations1791870434349().up(runner); } finally { await runner.release(); }
  });
  beforeEach(async () => {
    await query('TRUNCATE settings,ai_query_policy,ai_llm_policies,ai_settings,ai_usage_quota,ai_usage_aggregate,ai_usage_reservations,ai_usage_logs,users CASCADE');
    await query('INSERT INTO users(id) VALUES ($1),($2)', [actor, other]);
    await query('INSERT INTO ai_settings VALUES (\'gemini\',\'synthetic-no-network\',true,\'{}\'),(\'openai\',\'synthetic-no-network\',true,\'{}\')');
    await query('INSERT INTO ai_query_policy VALUES (1,\'synthetic-gemini\',true)');
    await db.getRepository(AiLlmPolicy).save({ scope: 'STORE_INSIGHT', provider: 'gemini', model: 'synthetic-gemini', maxTokens: 20, retryMax: 1, isEnabled: true });
    process.env.AI_PRICING_CATALOG = JSON.stringify(catalog()); process.env.GEMINI_API_KEY = ''; process.env.OPENAI_API_KEY = '';
    policy = new AiPolicyExecutorService(db); mockExecute.mockReset();
    mockExecute.mockImplementation(async request => {
      const config = typeof request.config === 'function' ? await request.config() : request.config;
      return { content: '{"summary":"fixture","recommendedActions":[],"confidenceScore":0.5,"riskLevel":"low"}',
        model: config.model, provider: request.provider ?? 'gemini', requestId: randomUUID(),
        promptTokens: 10, completionTokens: 5, totalTokens: 15, durationMs: 1, attempts: 1, usageKnown: true };
    });
  });
  afterAll(async () => {
    for (const [key, value] of Object.entries(original)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    if (db?.isInitialized) await db.destroy();
    if (admin?.isInitialized) { try { if (created) await admin.query(`DROP DATABASE ${name}`); } finally { await admin.destroy(); } }
  });

  it('uses the latest administrator model after policy caching and attributes both actual costs once', async () => {
    await invoke(); await select('store.overview', 'openai'); await invoke();
    expect((await query('SELECT model FROM ai_usage_logs ORDER BY "createdAt"')).map((row: {model: string}) => row.model)).toEqual(['synthetic-gemini', 'synthetic-openai']);
    expect(await query('SELECT status FROM ai_usage_reservations')).toEqual([{ status: 'settled' }, { status: 'settled' }]);
    expect((await usage()).total).toMatchObject({ records: 2, unpriced: 0, cost: '0.03000000' });
    expect(mockExecute).toHaveBeenCalledTimes(2);
    expect((await query("SELECT current_value FROM ai_usage_aggregate WHERE layer='user' AND layer_key=$1 AND limit_type='requests' AND length(period_key)=10", [actor]))[0].current_value).toBe('2.00000000');
  });

  it('measures the selected native provider and deduplicates its legacy copy in management usage', async () => {
    await select('work.vision', 'openai');
    const target = await resolveManagedAiTarget(db, 'work.vision', { provider: 'gemini', model: 'synthetic-gemini', apiKey: 'synthetic-no-network' });
    const transport = jest.fn(async () => ({ value: 'fixture-private-output', usage: { inputTokens: 10, outputTokens: 5 } }));
    await new AiAccountedExecution(db).invokeNative({ ...nativeRequest, provider: target.provider, model: target.model }, account, transport);
    expect(transport).toHaveBeenCalledTimes(1);
    expect((await usage()).total).toMatchObject({ records: 1, unmetered: 0, cost: '0.01000000' });
    const [row] = await query('SELECT user_id,service_key,pricing,receipt FROM ai_usage_reservations');
    expect(row).toMatchObject({ user_id: actor, service_key: 'neture', receipt: { provider: 'openai', model: 'synthetic-openai' } });
    expect(JSON.stringify(row)).not.toContain('fixture-private-output');
  });

  it('checks real global and per-user capacity before dispatch without falling back to another model', async () => {
    await limit('global', '*', 'requests', 2); await limit('user', actor, 'requests', 1);
    await invoke(); await expect(invoke()).rejects.toThrow('QUOTA_EXCEEDED');
    await invoke(other); await expect(invoke(other)).rejects.toThrow('QUOTA_EXCEEDED');
    expect(mockExecute).toHaveBeenCalledTimes(2); expect(await query('SELECT id FROM ai_usage_reservations')).toHaveLength(2);
  });

  it('does not dispatch or reserve when credentials, native prices or the scope switch deny execution', async () => {
    process.env.AI_PRICING_CATALOG = '';
    const transport = jest.fn();
    await expect(new AiAccountedExecution(db).invokeNative(nativeRequest, account, transport)).rejects.toThrow('AI_PRICING_NOT_CONFIGURED');
    await query('DELETE FROM ai_settings'); await expect(invoke()).rejects.toThrow('AI_NOT_CONFIGURED');
    await query('UPDATE ai_llm_policies SET is_enabled=false'); policy.invalidateCache();
    await expect(invoke()).rejects.toThrow('AI_DISABLED');
    expect(transport).not.toHaveBeenCalled(); expect(mockExecute).not.toHaveBeenCalled();
    expect(await query('SELECT id FROM ai_usage_reservations')).toEqual([]);
  });

  it('keeps successful paid work held after receipt rollback and never redispatches it', async () => {
    await query('ALTER TABLE ai_usage_logs ADD CONSTRAINT fixture_receipt_unavailable CHECK (false)');
    const transport = jest.fn(async () => ({ value: 'fixture-private-output', usage: { inputTokens: 10, outputTokens: 5 } }));
    try {
      await expect(new AiAccountedExecution(db).invokeNative(nativeRequest, account, transport)).resolves.toBe('fixture-private-output');
      expect(transport).toHaveBeenCalledTimes(1); expect(await query('SELECT status FROM ai_usage_reservations')).toEqual([{ status: 'reserved' }]);
      expect(await query('SELECT id FROM ai_usage_logs')).toEqual([]); expect(await query('SELECT * FROM ai_usage_aggregate')).toEqual([]);
    } finally { await query('ALTER TABLE ai_usage_logs DROP CONSTRAINT fixture_receipt_unavailable'); }
  });

  it('holds missing usage, settles evidence once and distinguishes verified cost from missing token breakdown', async () => {
    await limit('global', '*', 'cost', 0.2);
    const transport = jest.fn(async () => ({ value: 'fixture-private-output' }));
    await new AiAccountedExecution(db).invokeNative(nativeRequest, account, transport);
    await expect(new AiAccountedExecution(db).invokeNative(nativeRequest, account, transport)).rejects.toThrow('QUOTA_EXCEEDED');
    const [row] = await query('SELECT id,status FROM ai_usage_reservations'); expect(row.status).toBe('pending');
    expect((await usage()).total).toMatchObject({ records: 1, unpriced: 1, unmetered: 1, cost: '0.00000000' });
    const quota = new AiQuotaService(db), evidence = { evidenceId: 'synthetic-verified-evidence', usage: { requests: 0, tokens: 15, cost: 0.02 } };
    const record = jest.fn(async () => {});
    await quota.reconcile({ id: row.id, warnings: [] }, evidence, record);
    await quota.reconcile({ id: row.id, warnings: [] }, evidence, record);
    expect(record).toHaveBeenCalledTimes(1); expect(transport).toHaveBeenCalledTimes(1);
    expect((await query('SELECT status,reserved_cost,actual_cost FROM ai_usage_reservations'))[0]).toMatchObject({ status: 'settled', reserved_cost: '0.00000000', actual_cost: '0.02000000' });
    expect((await usage()).total).toMatchObject({ records: 1, unpriced: 0, unmetered: 1, cost: '0.02000000' });
  });

  it('honors the existing host access predicate before generation and withholds output after access is revoked', async () => {
    let permitted = false;
    const explain = () => explainOverview({ actorId: actor, organizationId: 'fixture-store', featureId: 'store.overview',
      profile: resolveServiceAiProfile('neture')!, authorize: async () => permitted,
      load: async () => ({ collectedAt: new Date().toISOString(), metrics: { products: { label: 'fixture', value: 3 } } }),
      runtime: createPolicyExtensionRuntime(policy, 'STORE_INSIGHT', { serviceKey: 'neture', maxTokens: 20 }) });
    await expect(explain()).rejects.toMatchObject({ code: 'ACCESS_DENIED' }); expect(mockExecute).not.toHaveBeenCalled();
    permitted = true; const normal = mockExecute.getMockImplementation()!;
    mockExecute.mockImplementationOnce(async request => { const result = await normal(request); permitted = false; return result; });
    await expect(explain()).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    expect(mockExecute).toHaveBeenCalledTimes(1); expect(await query('SELECT status FROM ai_usage_reservations')).toEqual([{ status: 'settled' }]);
  });
});
