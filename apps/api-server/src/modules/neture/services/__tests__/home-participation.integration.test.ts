import { Client } from 'pg';
import { readHomeParticipation } from '../home-participation.service.js';

const integration = process.env.O4O_HOME_PARTICIPATION_IT === '1' ? describe : describe.skip;
integration('home participation reads the same local PostgreSQL ledgers after approval and suspension', () => {
  let client: Client;
  beforeAll(async () => {
    if (process.env.DB_HOST !== '127.0.0.1') throw new Error('Only isolated local PostgreSQL is permitted');
    client = new Client({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USERNAME, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
    await client.connect();
    await client.query('BEGIN');
    await client.query(`
      CREATE TEMP TABLE users(id text, "isEmailVerified" boolean, "isActive" boolean, status text);
      CREATE TEMP TABLE service_memberships(user_id text, service_key text, status text);
      CREATE TEMP TABLE semi_franchises(id text, key text, name text, status text);
      CREATE TEMP TABLE semi_franchise_memberships(semi_franchise_id text, organization_id text, status text);
      CREATE TEMP TABLE organization_members(organization_id text, user_id text, role text, left_at timestamp);
      CREATE TEMP TABLE neture_pharmacy_memberships(organization_id text, status text);
      CREATE TEMP TABLE semi_franchise_operators(semi_franchise_id text, user_id text, revoked_at timestamp);
      CREATE TEMP TABLE role_assignments(user_id text, role text, is_active boolean);
      CREATE TEMP TABLE cooperatives(id text, slug text, name text, status text, semi_franchise_id text);
      CREATE TEMP TABLE cooperative_memberships(cooperative_id text, user_id text, status text);
      INSERT INTO users VALUES ('member',true,true,'active'),('outsider',true,true,'active');
      INSERT INTO semi_franchises VALUES ('business','carepharm','합성 사업','active');
      INSERT INTO organization_members VALUES ('store','member','owner',NULL);
      INSERT INTO neture_pharmacy_memberships VALUES ('store','active');
      INSERT INTO semi_franchise_memberships VALUES ('business','store','pending');
      INSERT INTO cooperatives VALUES ('coop','sample','합성 조합','active','business');
      INSERT INTO cooperative_memberships VALUES ('coop','member','pending');
    `);
  });
  afterAll(async () => { if (client) { await client.query('ROLLBACK'); await client.end(); } });
  it('reflects an approved membership on the next read, excludes other accounts and revokes suspended access', async () => {
    const db = { query: (sql: string, params?: unknown[]) => client.query(sql, params).then(result => result.rows) } as any;
    const before = await readHomeParticipation(db, 'member');
    expect(before.businesses[0].canParticipate).toBe(false);
    expect(before.cooperatives[0].status).toBe('pending');
    await client.query("UPDATE semi_franchise_memberships SET status='active'; UPDATE cooperative_memberships SET status='active'");
    const approved = await readHomeParticipation(db, 'member');
    expect(approved.businesses[0].canParticipate).toBe(true);
    expect(approved.cooperatives[0].status).toBe('active');
    const outsider = await readHomeParticipation(db, 'outsider');
    expect(outsider.businesses[0].canParticipate).toBe(false);
    expect(outsider.cooperatives).toEqual([]);
    await client.query("UPDATE semi_franchise_memberships SET status='suspended'; UPDATE cooperative_memberships SET status='suspended'");
    const suspended = await readHomeParticipation(db, 'member');
    expect(suspended.businesses[0].canParticipate).toBe(false);
    expect(suspended.cooperatives[0].status).toBe('suspended');
  });
});
