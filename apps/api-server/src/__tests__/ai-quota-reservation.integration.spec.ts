/** Only our explicitly isolated loopback PostgreSQL fixture is eligible. Never use application DB config. */
import { DataSource } from 'typeorm';
import { AiQuotaService } from '../modules/ai-policy/ai-quota.service.js';
import { loadAiPriceCatalog, resolveAiPrice } from '../modules/ai-policy/ai-pricing.js';
import { CreateAiUsageReservations1791870434349 } from '../database/migrations/1791870434349-CreateAiUsageReservations.js';
const port = process.env.O4O_AI_QUOTA_TEST_PORT;
const fixture = port === '55447' ? describe : describe.skip;
fixture('durable quota admission on isolated PostgreSQL', () => {
  let db: DataSource;
  let admin: DataSource;
  const name = `o4o_aiquota_${process.pid}`;
  const price = resolveAiPrice(loadAiPriceCatalog(''), 'gemini', 'model');
  const budget = { requests: 1, tokens: 100, cost: 0.01 };
  const receipt = { providerRequestId: '00000000-0000-4000-8000-000000000001', outcome: 'success' as const };
  const query = (sql: string, args?: unknown[]) => db.query(sql,args);
  const quota = () => new AiQuotaService(db);
  async function limit(layer: string, key: string, type: string, period: string, value: number) {
    await query('INSERT INTO ai_usage_quota (layer,layer_key,limit_type,period,limit_value,warning_threshold,is_enabled) VALUES ($1,$2,$3,$4,$5,80,true)', [layer,key,type,period,value]);
  }
  beforeAll(async () => {
    const connection = { type: 'postgres' as const, host: '127.0.0.1', port: 55447, username: 'o4o_quota_fixture', database: 'postgres' };
    admin = new DataSource(connection); await admin.initialize();
    await admin.query(`CREATE DATABASE ${name}`);
    db = new DataSource({ ...connection, database: name }); await db.initialize();
    await query(`CREATE TABLE ai_usage_quota (id serial PRIMARY KEY,layer varchar(20),layer_key varchar(100),limit_type varchar(20),period varchar(10),limit_value numeric(15,4),warning_threshold int,is_enabled boolean)`);
    await query(`CREATE TABLE ai_usage_aggregate (layer varchar(20),layer_key varchar(100),limit_type varchar(20),period_key varchar(10),current_value numeric(15,4) DEFAULT 0,last_updated_at timestamptz DEFAULT NOW(),UNIQUE(layer,layer_key,limit_type,period_key))`);
    await query('CREATE TABLE receipts (id int PRIMARY KEY)');
    await query('CREATE TABLE ai_usage_logs ("costEstimated" numeric(10,6))');
    const runner = db.createQueryRunner(); await new CreateAiUsageReservations1791870434349().up(runner); await runner.release();
  });
  beforeEach(async () => query('TRUNCATE ai_usage_quota, ai_usage_aggregate, ai_usage_reservations, receipts'));
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
    if (admin?.isInitialized) { await admin.query(`DROP DATABASE ${name}`); await admin.destroy(); }
  });
  it('admits exactly 3 of 50 simultaneous calls across distinct service instances', async () => {
    await limit('global','*','requests','daily',3);
    const results = await Promise.allSettled(Array.from({length:50},()=>quota().reserve('CONTENT_TRANSLATION','user-a',budget,[price])));
    expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(3);
    expect(results.filter(r=>r.status==='rejected' && r.reason.message==='QUOTA_EXCEEDED')).toHaveLength(47);
    expect((await query("SELECT id FROM ai_usage_reservations WHERE status='reserved'")).length).toBe(3);
    expect(await query('SELECT * FROM ai_usage_aggregate')).toEqual([]); // reservations are not billing usage
  });
  it.each([
    ['global','*','requests','daily',0], ['service','store','tokens','monthly',99],
    ['scope','CONTENT_TRANSLATION','cost','daily',0.009], ['user','user-a','requests','monthly',0],
  ])('rejects a prospective %s %s %s %s overflow atomically', async (layer,key,type,period,value) => {
    await limit(layer as string,key as string,type as string,period as string,value as number);
    await expect(quota().reserve('CONTENT_TRANSLATION','user-a',budget,[price])).rejects.toThrow('QUOTA_EXCEEDED');
    expect(await query('SELECT id FROM ai_usage_reservations')).toEqual([]);
  });
  it('attributes current catalogue services separately while user quota spans services', async () => {
    await limit('service','community','requests','daily',1);
    await limit('user','user-a','requests','daily',2);
    await quota().reserve('SERVICE_QUERY','user-a',budget,[price],'community');
    await expect(quota().reserve('SERVICE_QUERY','user-b',budget,[price],'community')).rejects.toThrow('QUOTA_EXCEEDED');
    await quota().reserve('SERVICE_QUERY','user-a',budget,[price],'neture');
    await expect(quota().reserve('SERVICE_QUERY','user-a',budget,[price],'supplier')).rejects.toThrow('QUOTA_EXCEEDED');
  });
  it('rolls back usage log and aggregate together on a receipt failure and leaves capacity reserved', async () => {
    const reservation=await quota().reserve('CONTENT_TRANSLATION','user-a',budget,[price]);
    await expect(quota().settle(reservation,{requests:1,tokens:5,cost:0.001},async manager=>{
      await manager.query('INSERT INTO receipts VALUES (1)');throw new Error('receipt unavailable');
    },receipt)).rejects.toThrow('AI_QUOTA_UNAVAILABLE');
    expect(await query('SELECT * FROM receipts')).toEqual([]);
    expect(await query('SELECT * FROM ai_usage_aggregate')).toEqual([]);
    expect((await query('SELECT status FROM ai_usage_reservations'))[0].status).toBe('reserved');
  });
  it('settles once under concurrent retries and preserves sub-cent precision in all layers', async () => {
    const reservation=await quota().reserve('CONTENT_TRANSLATION','user-a',budget,[price]);
    const record=jest.fn(async manager=>{await manager.query('INSERT INTO receipts VALUES (1)');});
    await Promise.all(Array.from({length:5},()=>quota().settle(reservation,{requests:1,tokens:1,cost:0.0000005},record,receipt)));
    expect(record).toHaveBeenCalledTimes(1);
    const rows=await query('SELECT * FROM ai_usage_aggregate');expect(rows).toHaveLength(24);
    expect(rows.filter((r:any)=>r.limit_type==='cost').every((r:any)=>Number(r.current_value)===0.0000005)).toBe(true);
    expect(rows.filter((r:any)=>r.limit_type==='requests').every((r:any)=>Number(r.current_value)===1)).toBe(true);
    await query('INSERT INTO ai_usage_logs ("costEstimated") VALUES ($1)',[0.0000005]);
    expect(Number((await query('SELECT "costEstimated" FROM ai_usage_logs'))[0].costEstimated)).toBe(0.0000005);
  });
  it('settles to admission UTC day/month even after execution crosses period boundaries', async () => {
    const reservation=await quota().reserve('CONTENT_TRANSLATION',undefined,budget,[price]);
    await query("UPDATE ai_usage_reservations SET daily_key='1999-12-31',monthly_key='1999-12' WHERE id=$1",[reservation.id]);
    await quota().settle(reservation,{requests:1,tokens:1,cost:0},async()=>{},receipt);
    expect((await query('SELECT DISTINCT period_key FROM ai_usage_aggregate')).map((r:any)=>r.period_key).sort()).toEqual(['1999-12','1999-12-31']);
  });
  it('holds uncertain retry cost separately and reconciles verified evidence once', async () => {
    await limit('scope','CONTENT_TRANSLATION','cost','daily',0.02);
    const reservation=await quota().reserve('CONTENT_TRANSLATION','user-a',budget,[price]);
    await quota().settle(reservation,{requests:1,tokens:10,cost:0.005},async()=>{}, {...receipt,uncertain:{requests:0,tokens:50,cost:0.01}});
    await expect(quota().reserve('CONTENT_TRANSLATION','user-a',budget,[price])).rejects.toThrow('QUOTA_EXCEEDED');
    const record=jest.fn(async()=>{}),verified={evidenceId:'fixture-evidence-1',usage:{requests:0,tokens:20,cost:0.002}};
    await quota().reconcile(reservation,verified,record);await quota().reconcile(reservation,verified,record);
    expect(record).toHaveBeenCalledTimes(1);
    expect(Number((await query("SELECT current_value FROM ai_usage_aggregate WHERE layer='scope' AND limit_type='cost' AND length(period_key)=10"))[0].current_value)).toBe(0.007);
    await expect(quota().reconcile(reservation,{...verified,usage:{requests:0,tokens:99,cost:0.01}},record)).rejects.toThrow('AI_QUOTA_UNAVAILABLE');
  });
  it('shows held capacity to admins while completed billing usage remains separate', async () => {
    await limit('global','*','requests','daily',1);
    const reservation=await quota().reserve('CONTENT_TRANSLATION',undefined,budget,[price]);
    expect((await quota().getStatus())[0]).toMatchObject({currentValue:0,reservedValue:1,projectedValue:1,status:'exceeded'});
    await quota().settle(reservation,{requests:1,tokens:1,cost:0},async()=>{},receipt);
    expect((await quota().getStatus())[0]).toMatchObject({currentValue:1,reservedValue:0,projectedValue:1,status:'exceeded'});
  });
  it('releases only unused reservations idempotently without manufacturing billing usage', async () => {
    await limit('global','*','requests','daily',1);
    const reservation=await quota().reserve('CONTENT_TRANSLATION',undefined,budget,[price]);
    await quota().release(reservation);await quota().release(reservation);
    await expect(quota().reserve('CONTENT_TRANSLATION',undefined,budget,[price])).resolves.toHaveProperty('id');
    expect(await query('SELECT * FROM ai_usage_aggregate')).toEqual([]);
  });
  it('does not release a settled reservation or a nonexistent identifier', async () => {
    const reservation=await quota().reserve('CONTENT_TRANSLATION',undefined,budget,[price]);
    await quota().settle(reservation,{requests:1,tokens:1,cost:0},async()=>{},receipt);
    await expect(quota().release(reservation)).rejects.toThrow('AI_QUOTA_UNAVAILABLE');
    await expect(quota().release({id:'00000000-0000-4000-8000-000000000099',warnings:[]})).rejects.toThrow('AI_QUOTA_UNAVAILABLE');
  });
  it('fails closed when reservation storage is missing and rejects invalid usage before writing', async () => {
    await expect(quota().reserve('CONTENT_TRANSLATION',undefined,{...budget,cost:NaN},[price])).rejects.toThrow('AI_USAGE_INVALID');
    const manager=db.createQueryRunner();await manager.startTransaction();
    try {
      await manager.query('ALTER TABLE ai_usage_reservations RENAME TO temporarily_unavailable');
      const broken = new AiQuotaService({ query: manager.query.bind(manager) } as any);
      await expect(broken.checkQuota('CONTENT_TRANSLATION')).rejects.toThrow('AI_QUOTA_UNAVAILABLE');
    } finally { await manager.rollbackTransaction(); await manager.release(); }
  });
});
