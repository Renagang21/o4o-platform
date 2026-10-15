import { Client } from 'pg';
import { retiredServiceOnlyOrganizationSql } from '../utils/retired-organization.js';

// Opt-in isolated fixture only; no default/shared database connection is used.
const fixture = process.env.PH_RESIDUAL_FIXTURE_URL;
const pgSuite = fixture ? describe : describe.skip;
pgSuite('retired-only organization SQL with real PostgreSQL', () => {
  let client: Client;
  const org = '00000000-0000-4000-8000-000000000609';
  beforeAll(async () => {
    const url = new URL(fixture!);
    if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.pathname !== '/ph_residual_fixture') {
      throw new Error('PH_RESIDUAL_ISOLATED_FIXTURE_REQUIRED');
    }
    client = new Client({ connectionString: fixture, connectionTimeoutMillis: 3000 });
    await client.connect();
    await client.query(`CREATE TEMP TABLE organization_service_enrollments(organization_id uuid,service_code text,status text);
      CREATE TEMP TABLE platform_store_slugs(store_id uuid,service_key text,is_active boolean);
      CREATE TEMP TABLE neture_pharmacy_memberships(organization_id uuid,status text)`);
  });
  afterAll(async () => { if (client) await client.end(); });
  beforeEach(async () => {
    await client.query('TRUNCATE organization_service_enrollments, platform_store_slugs, neture_pharmacy_memberships');
    await client.query('INSERT INTO organization_service_enrollments VALUES($1,$2,$3)', [org, 'pharmacy-hub', 'active']);
  });
  const retired = async () => (await client.query(`SELECT ${retiredServiceOnlyOrganizationSql('$1::uuid')} AS retired`, [org])).rows[0].retired;

  it.each(['pending', 'rejected', 'suspended', 'terminated'])('does not revive PH with a %s Neture membership', async status => {
    await client.query('INSERT INTO neture_pharmacy_memberships VALUES($1,$2)', [org, status]);
    expect(await retired()).toBe(true);
  });
  it('preserves an organization with an active Neture membership', async () => {
    await client.query('INSERT INTO neture_pharmacy_memberships VALUES($1,$2)', [org, 'active']);
    expect(await retired()).toBe(false);
  });
  it('preserves an active non-retired enrollment', async () => {
    await client.query('INSERT INTO organization_service_enrollments VALUES($1,$2,$3)', [org, 'kpa-society', 'active']);
    expect(await retired()).toBe(false);
  });
  it('preserves an active non-retired slug', async () => {
    await client.query('INSERT INTO platform_store_slugs VALUES($1,$2,true)', [org, 'neture']);
    expect(await retired()).toBe(false);
  });
  it('does not use another organization membership as evidence', async () => {
    await client.query('INSERT INTO neture_pharmacy_memberships VALUES($1,$2)', ['00000000-0000-4000-8000-000000000610', 'active']);
    expect(await retired()).toBe(true);
  });
  it('does not classify an unrelated organization without PH history as retired', async () => {
    await client.query('TRUNCATE organization_service_enrollments');
    expect(await retired()).toBe(false);
  });
});
