import { DataSource } from 'typeorm';
import { AiManagementService } from '../management.service.js';

// The application/production connection is never eligible. Match the existing isolated quota fixture.
const fixture = process.env.O4O_AI_QUOTA_TEST_PORT === '55447' ? describe : describe.skip;
fixture('native usage aggregation on isolated PostgreSQL', () => {
  let admin: DataSource, db: DataSource, service: AiManagementService;
  let created = false;
  const name = `o4o_aiusage_${process.pid}`;
  const at = '2026-10-20T01:00:00.000Z';
  const requestId = '10000000-0000-4000-8000-000000000001';
  beforeAll(async () => {
    const connection = { type: 'postgres' as const, host: '127.0.0.1', port: 55447, username: 'o4o_quota_fixture', database: 'postgres' };
    admin = await new DataSource(connection).initialize();
    await admin.query(`CREATE DATABASE ${name}`);
    created = true;
    db = await new DataSource({ ...connection, database: name }).initialize();
    await db.query(`CREATE TYPE fixture_provider AS ENUM ('gemini','openai','claude')`);
    await db.query(`CREATE TYPE fixture_status AS ENUM ('success','error')`);
    await db.query(`CREATE TABLE ai_usage_logs (
      provider fixture_provider, model text, scope text, status fixture_status,
      "promptTokens" int, "completionTokens" int, "costEstimated" numeric(20,8),
      "requestId" uuid, "createdAt" timestamptz
    )`);
    await db.query(`CREATE TABLE ai_usage_reservations (
      provider_request_id uuid, pricing jsonb, receipt jsonb, scope text,
      outcome text, status text, actual_cost numeric(20,8), created_at timestamptz,
      reconciliation_id varchar(100), reconciliation_usage jsonb
    )`);
    service = new AiManagementService(db, {});
  });
  beforeEach(async () => { await db.query('TRUNCATE ai_usage_logs, ai_usage_reservations'); });
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
    if (admin?.isInitialized) {
      try { if (created) await admin.query(`DROP DATABASE ${name}`); }
      finally { await admin.destroy(); }
    }
  });
  const usage = () => service.usage(7, new Date('2026-10-20T02:00:00.000Z'));
  async function pair(outcome: 'success' | 'error') {
    const known = outcome === 'success';
    await db.query(`INSERT INTO ai_usage_logs VALUES ('gemini','fixture-model','AI_PROXY',$1,10,20,0.05,$2,$3)`, [outcome, requestId, at]);
    await db.query(`INSERT INTO ai_usage_reservations(provider_request_id,pricing,receipt,scope,outcome,status,actual_cost,created_at) VALUES ($1,$2::jsonb,$3::jsonb,'AI_PROXY',$4,$5,$6,$7)`, [
      requestId, JSON.stringify([{ provider: 'gemini', invocation: { kind: 'multimodal', model: 'fixture-model' } }]),
      JSON.stringify({ provider: 'gemini', model: 'fixture-model', native: { usageKnown: known, inputTokens: known ? 10 : null, outputTokens: known ? 20 : null } }),
      outcome, known ? 'settled' : 'pending', known ? 0.05 : 0, at,
    ]);
  }
  it('executes the unmodified production query against UUID, enum and JSONB types even without records', async () => {
    expect((await usage()).total).toMatchObject({ records: 0, cost: '0.00000000' });
  });
  it('deduplicates a successful native receipt and the legacy copy using UUID request identifiers', async () => {
    await pair('success');
    expect((await usage()).total).toMatchObject({ records: 1, successes: 1, unmetered: 0, input: 10, output: 20, cost: '0.05000000' });
  });
  it('deduplicates failed native attempts and keeps missing usage visibly uncertain', async () => {
    await pair('error');
    expect((await usage()).total).toMatchObject({ records: 1, errors: 1, successes: 0, unmetered: 1, unpriced: 1, cost: '0.00000000' });
  });
  it('includes unit-priced OCR and crashed Qwen without casting them to the legacy provider enum', async () => {
    await db.query(`INSERT INTO ai_usage_reservations(provider_request_id,pricing,receipt,scope,outcome,status,actual_cost,created_at) VALUES (NULL,$1::jsonb,$2::jsonb,'PRODUCT_CONTENT','success','settled',0.05,$3)`, [
      JSON.stringify([{ provider: 'google-vision', invocation: { kind: 'ocr', model: 'TEXT_DETECTION' } }]),
      JSON.stringify({ provider: 'google-vision', model: 'TEXT_DETECTION', native: { usageKnown: true, inputTokens: 0, outputTokens: 0, units: 1 } }), at,
    ]);
    await db.query(`INSERT INTO ai_usage_reservations(provider_request_id,pricing,receipt,scope,outcome,status,actual_cost,created_at) VALUES (NULL,$1::jsonb,NULL,'AI_PROXY',NULL,'reserved',NULL,$2)`, [
      JSON.stringify([{ provider: 'qwen', invocation: { kind: 'text', model: 'fixture-qwen' } }]), at,
    ]);
    const result = await usage();
    expect(result.total).toMatchObject({ records: 2, successes: 1, unmetered: 1, unpriced: 1, cost: '0.05000000' });
    expect(result.groups.map(group => group.provider).sort()).toEqual(['google-vision', 'qwen']);
  });
});
