import { DataSource } from 'typeorm';
import { randomUUID } from 'crypto';
import { SemiFranchiseService } from '../services/semi-franchise.service.js';
import { PharmacyServiceFeatureService } from '../services/service-features.js';

// Use a dedicated, disposable database with the canonical baseline and increments.
const url = process.env.NETURE_PHARMACY_IT_DATABASE_URL;
if (url) {
  const target = new URL(url);
  if (target.protocol !== 'postgresql:' || target.hostname !== '127.0.0.1' || target.port !== '55432' ||
      target.pathname !== '/o4o_feature_test' || target.search || target.hash) {
    throw new Error('Service feature integration requires its dedicated loopback fixture database');
  }
}
const suite = url ? describe : describe.skip;
suite('service feature settings and live membership predicates (PostgreSQL)', () => {
  let db: DataSource;
  let settings: SemiFranchiseService;
  let access: PharmacyServiceFeatureService;
  let store: string;
  let other: string;
  let user: string;
  let a: string;
  let b: string;
  const orgs: string[] = [];
  const users: string[] = [];
  const keys: string[] = [];
  const tag = randomUUID().slice(0, 8);
  beforeAll(async () => {
    db = await new DataSource({ type: 'postgres', url, entities: [] }).initialize();
    settings = new SemiFranchiseService(db);
    access = new PharmacyServiceFeatureService(db, async () => null);
    for (let i = 0; i < 2; i++) {
      const [u] = await db.query(`INSERT INTO users (email, status, "isActive", "isEmailVerified") VALUES ($1, 'active', true, true) RETURNING id`, [`feature-${tag}-${i}@example.test`]);
      users.push(u.id);
      if (i === 0) user = u.id;
      const [o] = await db.query(`INSERT INTO organizations (name, code, type, "isActive", metadata) VALUES ('Synthetic pharmacy', $1, 'pharmacy', true, '{"keep":"value"}') RETURNING id`, [`feature-store-${tag}-${i}`]);
      orgs.push(o.id);
      await db.query(`INSERT INTO neture_pharmacy_memberships (organization_id, applicant_user_id, status, business_number, pharmacy_name, pharmacist_license_number) VALUES ($1,$2,'active',$3,'Synthetic pharmacy','SYNTHETIC')`, [o.id, u.id, `${tag}${i}`]);
    }
    [store, other] = orgs;
    for (const suffix of ['a', 'b']) {
      const key = `feature-${tag}-${suffix}`;
      keys.push(key);
      const sf = await settings.create({ key, name: `Synthetic ${suffix}`, serviceFeatures: ['tablet'] });
      orgs.push(sf.organization_id);
      if (suffix === 'a') a = sf.id; else b = sf.id;
      await db.query(`INSERT INTO semi_franchise_memberships (semi_franchise_id, organization_id, status) VALUES ($1,$2,'active')`, [sf.id, store]);
    }
  });
  afterAll(async () => {
    if (!db?.isInitialized) return;
    // This file runs in a task-owned disposable database. Remove only its fixtures.
    await db.query(`DELETE FROM semi_franchise_memberships WHERE semi_franchise_id IN (SELECT id FROM semi_franchises WHERE key = ANY($1::text[]))`, [keys]);
    await db.query(`DELETE FROM semi_franchises WHERE key = ANY($1::text[])`, [keys]);
    await db.query(`DELETE FROM neture_pharmacy_memberships WHERE applicant_user_id = ANY($1::uuid[])`, [users]);
    await db.query(`DELETE FROM organizations WHERE id = ANY($1::uuid[])`, [orgs]);
    await db.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [users]);
    await db.destroy();
  });

  it('round-trips creation, rejects invalid edits, preserves unrelated metadata and supports clearing', async () => {
    const key = keys[0];
    expect((await settings.getByKey(key))?.service_features).toEqual(['tablet']);
    await expect(settings.update(key, { serviceFeatures: ['unsupported'] })).rejects.toMatchObject({ code: 'INVALID_SERVICE_FEATURES' });
    expect((await settings.getByKey(key))?.service_features).toEqual(['tablet']);
    await settings.update(key, { registrationConditions: 'Synthetic conditions' });
    await settings.update(key, { serviceFeatures: ['tablet', 'multilingual-content'] });
    expect((await settings.getByKey(key))?.registration_conditions).toBe('Synthetic conditions');
    expect((await settings.listAll()).find((sf: { key: string }) => sf.key === key).service_features).toEqual(['tablet', 'multilingual-content']);
    await settings.update(key, { serviceFeatures: [] });
    expect((await settings.getByKey(key))?.service_features).toEqual([]);
    await settings.update(key, { serviceFeatures: ['tablet'] });
  });

  it('keeps a second valid grant after suspension and isolates another pharmacy', async () => {
    expect((await access.resolve(user, store)).features[0].sources).toHaveLength(2);
    await db.query(`UPDATE semi_franchise_memberships SET status='suspended' WHERE semi_franchise_id=$1`, [a]);
    expect((await access.resolve(user, store)).features[0]).toMatchObject({ allowed: true, sources: [{ key: keys[1] }] });
    expect((await access.resolve(user, other)).features[0].allowed).toBe(false);
    await db.query(`UPDATE semi_franchise_memberships SET status='active' WHERE semi_franchise_id=$1`, [a]);
  });

  it('rechecks closed businesses, terminated membership, basic pharmacy status and current settings on every request', async () => {
    await settings.update(keys[0], { status: 'closed' });
    await db.query(`UPDATE semi_franchise_memberships SET status='terminated' WHERE semi_franchise_id=$1`, [b]);
    expect((await access.resolve(user, store)).features[0].allowed).toBe(false);
    await settings.update(keys[0], { status: 'active' });
    expect((await access.resolve(user, store)).features[0].allowed).toBe(true);
    await db.query(`UPDATE neture_pharmacy_memberships SET status='suspended' WHERE organization_id=$1`, [store]);
    expect((await access.resolve(user, store)).features[0].allowed).toBe(false);
    await db.query(`UPDATE neture_pharmacy_memberships SET status='active' WHERE organization_id=$1`, [store]);
    await settings.update(keys[0], { serviceFeatures: [] });
    expect((await access.resolve(user, store)).features[0].allowed).toBe(false);
  });
});
