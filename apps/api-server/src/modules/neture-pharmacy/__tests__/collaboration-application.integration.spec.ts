import express from 'express';
import request from 'supertest';
import { randomUUID } from 'crypto';
import { DataSource, Entity, PrimaryColumn } from 'typeorm';
import { createNeturePharmacyRoutes } from '../neture-pharmacy.routes.js';
import { createStoreTabletRoutes } from '../../../routes/platform/store-tablet.routes.js';
import { createMultilingualProductContentController } from '../../../routes/o4o-store/controllers/multilingual-product-content.controller.js';
import { roleAssignmentService } from '../../auth/services/role-assignment.service.js';
import { SemiFranchiseService } from '../services/semi-franchise.service.js';
import { consultationProfessionalConfirmed } from '../services/consultation-professional.js';
import { RoleAssignment } from '../../auth/entities/RoleAssignment.js';
import { createStoreMembershipRoutes } from '../../../routes/store/store-membership.routes.js';

// Only session authentication is synthetic. Store relationship/role queries,
// business/member grants, execution guards and SQL use the disposable database.
jest.mock('../../../middleware/auth.middleware.js', () => ({
  ...jest.requireActual('../../../common/middleware/auth/authorization.middleware.js'),
  requireAuth: (req: any, res: any, next: any) => req.user ? next() : res.status(401).json({ code: 'UNAUTHORIZED' }),
}));
// Unrelated checkout/provisioning integrations are not executed by this suite.
jest.mock('../../../services/checkout.service.js', () => ({ checkoutService: {} }));
jest.mock('../../../routes/kpa/services/event-offer.service.js', () => ({ EventOfferService: class {} }));
jest.mock('../services/pharmacy-store-provisioner.js', () => ({ createPharmacyStoreProvisioner: () => ({}) }));
jest.mock('../services/business-registration-document.service.js', () => ({ BusinessRegistrationDocumentService: class {} }));
jest.mock('@o4o/asset-copy-core', () => ({ AssetCopyService: class {} }), { virtual: true });

const url = process.env.NETURE_PHARMACY_IT_DATABASE_URL;
if (url) {
  const target = new URL(url);
  if (target.protocol !== 'postgresql:' || target.hostname !== '127.0.0.1' || target.port !== '55432' ||
      target.pathname !== '/o4o_feature_test' || target.search || target.hash) {
    throw new Error('Collaboration integration requires its dedicated loopback fixture database');
  }
}
const suite = url ? describe : describe.skip;
// Only the referenced User PK is needed for the real RoleAssignment repository;
// unrelated account relation graphs are outside this fixture.
const FixtureUser = class User { id!: string };
Entity('users')(FixtureUser);
PrimaryColumn({ type: 'uuid' })(FixtureUser.prototype, 'id');
suite('business registration through approved staff execution (PostgreSQL + HTTP)', () => {
  let db: DataSource;
  let app: express.Express;
  let settings: SemiFranchiseService;
  const users: string[] = [];
  const orgs: string[] = [];
  const businesses: string[] = [];
  const tag = randomUUID().slice(0, 8);
  let admin: string;
  let owner: string;
  let staff: string;
  let store: string;
  let other: string;
  const translate = jest.fn(async (_input, access) => { await access.authorize(); return { translation: 'Translated utterance' }; });
  const base = '/api/v1/neture';
  const tablet = '/tablet/tablets';
  const multilingual = '/mlc/pharmacy/multilingual-product-contents/hub';
  const get = (path: string, organizationId = store) => request(app).get(path)
    .set('x-fixture-user', staff).set('x-store-organization-id', organizationId);
  const postAdmin = (path: string, body: unknown) => request(app).post(base + path)
    .set('x-fixture-user', admin).send(body);

  beforeAll(async () => {
    db = await new DataSource({ type: 'postgres', url, entities: [RoleAssignment, FixtureUser] }).initialize();
    settings = new SemiFranchiseService(db);
    for (let i = 0; i < 4; i++) {
      const [row] = await db.query(`INSERT INTO users (email,status,"isActive","isEmailVerified")
        VALUES ($1,'active',true,true) RETURNING id`, [`application-${tag}-${i}@example.test`]);
      users.push(row.id);
    }
    [admin, owner, staff] = users;
    for (let i = 0; i < 2; i++) {
      const [row] = await db.query(`INSERT INTO organizations(name,code,type,"isActive")
        VALUES ('Synthetic pharmacy',$1,'pharmacy',true) RETURNING id`, [`application-${tag}-${i}`]);
      orgs.push(row.id);
      const ownerId = i === 0 ? owner : users[3];
      await db.query(`INSERT INTO organization_members(organization_id,user_id,role,is_primary,joined_at,created_at,updated_at)
        VALUES ($1,$2,'owner',true,NOW(),NOW(),NOW())`, [row.id, ownerId]);
      await db.query(`INSERT INTO neture_pharmacy_memberships(organization_id,applicant_user_id,status,business_number,pharmacy_name,pharmacist_license_number)
        VALUES ($1,$2,'active',$3,'Synthetic pharmacy','SYNTHETIC')`, [row.id, ownerId, `${tag}-${i}`]);
    }
    [store, other] = orgs;
    await db.query(`INSERT INTO organization_members(organization_id,user_id,role,is_primary,joined_at,created_at,updated_at)
      VALUES ($1,$2,'staff',true,NOW(),NOW(),NOW())`, [store, staff]);
    await db.query(`INSERT INTO role_assignments(user_id,role) VALUES ($1,'platform:super_admin'),($2,'kpa:store_member')`, [admin, staff]);
    await db.query(`INSERT INTO service_memberships(user_id,service_key,status) VALUES ($1,'neture','active')`, [owner]);

    // Point the existing platform role guard at the same local DB, rather than
    // its process-global production DataSource. Authorization is still row-based.
    jest.spyOn(roleAssignmentService, 'hasAnyRole').mockImplementation(async (id, roles) => {
      const rows = await db.query(`SELECT 1 FROM role_assignments WHERE user_id=$1 AND role=ANY($2::text[])
        AND is_active=true AND valid_from<=NOW() AND (valid_until IS NULL OR valid_until>=NOW())`, [id, roles]);
      return rows.length > 0;
    });
    jest.spyOn(roleAssignmentService, 'getActiveRoles').mockImplementation(async id => db.query(
      `SELECT * FROM role_assignments WHERE user_id=$1 AND is_active=true`, [id]));
    app = express();
    app.use(express.json());
    app.use(async (req: any, _res, next) => {
      const id = req.header('x-fixture-user');
      if (users.includes(id)) {
        const roles = await db.query('SELECT role FROM role_assignments WHERE user_id=$1 AND is_active=true', [id]);
        req.user = { id, roles: roles.map((row: { role: string }) => row.role), memberships: [] };
      }
      next();
    });
    app.use(base, createNeturePharmacyRoutes(db, { translate,
      professional: (userId, organizationId) => consultationProfessionalConfirmed(db, userId, organizationId) }));
    app.use('/tablet', createStoreTabletRoutes(db, { storeOwnerServiceKey: 'kpa' }));
    app.use('/mlc', createMultilingualProductContentController(db, (_req, _res, next) => next(), 'kpa'));
    app.use('/api/v1/store', createStoreMembershipRoutes(db, (req, res, next) => req.user ? next() : res.status(401).json({ code: 'UNAUTHORIZED' })));
  });

  afterAll(async () => {
    jest.restoreAllMocks();
    if (!db?.isInitialized) return;
    await db.query(`DELETE FROM semi_franchise_memberships WHERE semi_franchise_id=ANY($1::uuid[])`, [businesses]);
    await db.query(`DELETE FROM semi_franchises WHERE id=ANY($1::uuid[])`, [businesses]);
    await db.query(`DELETE FROM neture_pharmacy_memberships WHERE applicant_user_id=ANY($1::uuid[])`, [users]);
    await db.query(`DELETE FROM organization_members WHERE organization_id=ANY($1::uuid[])`, [orgs]);
    await db.query(`DELETE FROM role_assignments WHERE user_id=ANY($1::uuid[])`, [users]);
    await db.query(`DELETE FROM service_memberships WHERE user_id=ANY($1::uuid[])`, [users]);
    await db.query(`DELETE FROM organizations WHERE id=ANY($1::uuid[])`, [orgs]);
    await db.query(`DELETE FROM users WHERE id=ANY($1::uuid[])`, [users]);
    await db.destroy();
  });

  it('registers, approves and combines business grants for a real free staff relationship, then rechecks withdrawal and paid ownership', async () => {
    expect((await request(app).get(base + '/pharmacy/service-features')).status).toBe(401);
    expect((await get(tablet)).status).toBe(403);
    expect((await get(multilingual)).status).toBe(403);
    const keys = [`application-${tag}-a`, `application-${tag}-b`];
    for (const key of keys) {
      const result = await postAdmin('/admin/semi-franchises', {
        key, name: 'Synthetic business', serviceFeatures: ['tablet', 'multilingual-content'],
      });
      expect(result.status).toBe(201);
      businesses.push(result.body.data.id);
      orgs.push(result.body.data.organization_id);
    }
    // Registration alone never enrolls a pharmacy.
    expect((await get(tablet)).status).toBe(403);
    for (const key of keys) {
      await settings.apply(store, owner, key);
      expect((await get(tablet)).status).toBe(key === keys[0] ? 403 : 200);
      const [membership] = await db.query(`SELECT id FROM semi_franchise_memberships WHERE organization_id=$1
        AND semi_franchise_id=(SELECT id FROM semi_franchises WHERE key=$2)`, [store, key]);
      const sf = await settings.getByKey(key);
      expect(sf).not.toBeNull();
      await settings.decideMembership(sf!, admin, membership.id, 'approve');
      // The first approved business already supplies the feature. Avoid asserting
      // pending => denied after that independent grant exists.
      expect((await get(tablet)).status).toBe(200);
    }
    const resolved = await get(base + '/pharmacy/service-features');
    expect(resolved.status).toBe(200);
    expect(resolved.body.data.features.find((f: any) => f.key === 'tablet').sources).toHaveLength(2);
    expect((await get(multilingual)).status).toBe(200);
    expect((await get(tablet, other)).status).toBe(403);
    expect((await get(base + '/admin/semi-franchises')).status).toBe(403);

    const edit = (key: string, serviceFeatures: string[]) => request(app)
      .patch(base + '/admin/semi-franchises/' + key).set('x-fixture-user', admin).send({ serviceFeatures });
    expect((await edit(keys[1], [])).status).toBe(200);
    expect((await get(tablet)).status).toBe(200);
    expect((await edit(keys[1], ['tablet', 'multilingual-content'])).status).toBe(200);
    await settings.withdraw(store, keys[0]);
    expect((await get(tablet)).status).toBe(200);
    const closed = await request(app).patch(base + '/admin/semi-franchises/' + keys[1])
      .set('x-fixture-user', admin).send({ status: 'closed' });
    expect(closed.status).toBe(200);
    expect((await get(tablet)).status).toBe(403);
    expect((await get(multilingual)).status).toBe(403);

    const pay = (id: string) => request(app).put(base + '/admin/member-paid-entitlements/' + id)
      .set('x-fixture-user', admin).send({ active: true, endsAt: null });
    expect((await pay(staff)).status).toBe(200);
    expect((await get(tablet)).status).toBe(403); // Employee payment never pays for this store.
    expect((await pay(owner)).status).toBe(200);
    expect((await get(tablet, other)).status).toBe(403);
    expect((await get(tablet)).status).toBe(200);
    expect((await get(multilingual)).status).toBe(200);
    expect((await get(base + '/pharmacy/staff-support/products')).status).toBe(403);

    await db.query(`UPDATE organization_members SET role='accepted' WHERE organization_id=$1 AND user_id=$2`, [store, staff]);
    expect((await get(tablet)).status).toBe(403);
    await db.query(`UPDATE organization_members SET role='staff',left_at=NOW() WHERE organization_id=$1 AND user_id=$2`, [store, staff]);
    expect((await get(tablet)).status).toBe(403);
    await db.query(`UPDATE organization_members SET left_at=NULL WHERE organization_id=$1 AND user_id=$2`, [store, staff]);
    expect((await get(tablet)).status).toBe(200);

    await db.query(`UPDATE role_assignments SET is_active=false WHERE user_id=$1 AND role='kpa:store_member'`, [staff]);
    expect((await get(tablet)).status).toBe(403);
    await db.query(`UPDATE role_assignments SET is_active=true WHERE user_id=$1 AND role='kpa:store_member'`, [staff]);
    expect((await get(tablet)).status).toBe(200);

    const original = db.query.bind(db);
    const unavailable = jest.spyOn(db, 'query').mockImplementation(async (sql, params) => {
      if (sql.includes('FROM semi_franchises sf')) throw new Error('Synthetic settings read failure');
      return original(sql, params);
    });
    try {
      const result = await get(base + '/pharmacy/service-features');
      expect(result.status).toBe(503);
      expect(result.body.code).toBe('FEATURE_ACCESS_UNAVAILABLE');
    } finally { unavailable.mockRestore(); }
  });

  it('applies administrator policies and My Home employee restrictions to real execution APIs', async () => {
    const policies = ['pharmacy-service-features:default', 'pharmacy-service-features:paid'];
    const previous = await db.query('SELECT key,value FROM settings WHERE key=ANY($1::text[])', [policies]);
    const configure = (target: string, features: string[]) => request(app).put(base + '/admin/service-feature-policies/' + encodeURIComponent(target))
      .set('x-fixture-user', admin).send({ features });
    const permit = (actor: string, target: string, serviceFeatures: string[], organizationId = store) => request(app)
      .put(base + '/pharmacy/staff-feature-permissions/' + target).set('x-fixture-user', actor)
      .set('x-store-organization-id', organizationId).send({ serviceFeatures });
    try {
      expect((await get(base + '/admin/service-feature-policies')).status).toBe(403);
      expect((await request(app).get(base + '/admin/service-feature-policies')).status).toBe(401);
      const listed = await request(app).get(base + '/admin/service-feature-policies').set('x-fixture-user', admin);
      expect(listed.status).toBe(200);
      expect(listed.headers['cache-control']).toContain('no-store');
      expect(listed.body.data.targets.filter((target: any) => target.key.startsWith('business:')).length).toBeGreaterThanOrEqual(2);
      expect((await configure('paid', ['store-staff-support'])).status).toBe(200);
      expect((await configure('default', ['multilingual-content'])).status).toBe(200);
      expect((await get(tablet)).status).toBe(403);
      expect((await get(multilingual)).status).toBe(200);
      expect((await get(base + '/pharmacy/staff-support/products')).status).toBe(200);
      // Payment alone supplies staff support even though both business grants have ended.
      expect((await permit(staff, staff, [])).status).toBe(403);
      expect((await permit(owner, staff, [], other)).status).toBe(403);
      expect((await permit(owner, owner, [])).status).toBe(404);
      expect((await permit(owner, staff, ['tablet'])).status).toBe(400);
      expect((await permit(owner, staff, ['multilingual-content'])).status).toBe(200);
      expect((await get(base + '/pharmacy/staff-support/products')).status).toBe(403);
      expect((await get(multilingual)).status).toBe(200);
      const permissions = await get(base + '/pharmacy/service-features');
      expect(permissions.body.data.features.find((feature: any) => feature.key === 'store-staff-support')).toMatchObject({ storeAllowed: true, allowed: false });
      expect((await permit(owner, staff, [])).status).toBe(200);
      expect((await get(multilingual)).status).toBe(403);
      expect((await permit(owner, staff, ['store-staff-support'])).status).toBe(200);
      expect((await configure('paid', [])).status).toBe(200);
      expect((await get(base + '/pharmacy/staff-support/products')).status).toBe(403);
      const businessKey = (await db.query('SELECT key FROM semi_franchises WHERE id=$1', [businesses[1]]))[0].key;
      expect((await configure(`business:${businessKey}`, ['store-staff-support'])).status).toBe(200);
      await settings.update(businessKey, { status: 'active' });
      expect((await get(base + '/pharmacy/staff-support/products')).status).toBe(200);
      expect((await configure('paid', ['store-staff-support'])).status).toBe(200);
      await settings.withdraw(store, businessKey);
      expect((await get(base + '/pharmacy/staff-support/products')).status).toBe(200);
      await db.query(`UPDATE settings SET value='{"features":["unknown"]}'::jsonb WHERE key=$1`, [policies[0]]);
      expect((await get(base + '/pharmacy/service-features')).status).toBe(503);
      expect((await get(base + '/pharmacy/staff-support/products')).status).toBe(503);
    } finally {
      await db.query('DELETE FROM settings WHERE key=ANY($1::text[])', [policies]);
      for (const row of previous) await db.query(`INSERT INTO settings(key,value,type) VALUES ($1,$2::jsonb,'pharmacy-service-features')`, [row.key, JSON.stringify(row.value)]);
    }
  });

  it('runs multilingual staff and pharmacist consultation only for owner-configured, store-scoped users', async () => {
    const policyKeys = ['pharmacy-service-features:default', 'pharmacy-service-features:paid'];
    const previous = await db.query('SELECT key,value FROM settings WHERE key=ANY($1::text[])', [policyKeys]);
    const configure = (target: string, features: string[]) => request(app).put(base + '/admin/service-feature-policies/' + target).set('x-fixture-user', admin).send({ features });
    const permit = (body: unknown) => request(app).put(base + '/pharmacy/staff-feature-permissions/' + staff).set('x-fixture-user', owner).set('x-store-organization-id', store).send(body);
    const consult = (body: unknown, organizationId = store) => request(app).post(base + '/pharmacy/multilingual-consultation/translate')
      .set('x-fixture-user', staff).set('x-store-organization-id', organizationId).send(body);
    const phrase = { mode: 'floor-staff', language: 'en', direction: 'to-customer', phrase: 'pharmacist' };
    const clinical = { mode: 'counter-pharmacist', language: 'ja', direction: 'to-staff', text: 'Customer utterance' };
    try {
      expect((await request(app).get(base + '/pharmacy/multilingual-consultation/context')).status).toBe(401);
      await configure('default', []);
      await configure('paid', ['multilingual-staff-response', 'multilingual-consultation']);
      // Current owner payment supplies these features with no active business membership.
      expect((await permit({ serviceFeatures: ['multilingual-staff-response'] })).status).toBe(200);
      const context = await get(base + '/pharmacy/multilingual-consultation/context');
      expect(context.status).toBe(200);
      expect(context.headers['cache-control']).toContain('no-store');
      expect(context.body.data.modes.find((mode: any) => mode.key === 'floor-staff').allowed).toBe(true);
      expect((await consult(phrase)).status).toBe(200);
      expect((await consult(phrase, other)).status).toBe(403);
      const count = translate.mock.calls.length;
      expect((await consult({ ...phrase, text: 'Medical answer' })).status).toBe(400);
      expect((await consult(clinical)).status).toBe(403);
      expect(translate).toHaveBeenCalledTimes(count);
      const selfConfirmation = await request(app).put(base + '/pharmacy/pharmacist-confirmation')
        .set('x-fixture-user', staff).set('x-store-organization-id', store).send({ confirmed: true });
      expect(selfConfirmation.status).toBe(403);
      const features = ['multilingual-staff-response', 'multilingual-consultation'];
      expect((await permit({ serviceFeatures: features })).status).toBe(400);
      expect((await permit({ serviceFeatures: features, pharmacistConfirmed: true })).status).toBe(200);
      expect((await consult(clinical)).status).toBe(200);
      await db.query(`UPDATE organization_members SET role='accepted',metadata=metadata-'pharmacyPharmacistConfirmed' WHERE organization_id=$1 AND user_id=$2`, [store, staff]);
      const approve = await request(app).post('/api/v1/store/members/' + staff + '/approve?serviceKey=kpa')
        .set('x-fixture-user', owner).set('x-store-organization-id', store).send({ serviceFeatures: features, pharmacistConfirmed: true });
      expect(approve.status).toBe(200);
      const [approved] = await db.query(`SELECT role,metadata->'pharmacyPharmacistConfirmed' AS confirmed FROM organization_members WHERE organization_id=$1 AND user_id=$2`, [store, staff]);
      expect(approved).toMatchObject({ role: 'staff', confirmed: true });
      expect((await consult(clinical)).status).toBe(200);
      const ownerConfirmation = await request(app).put(base + '/pharmacy/pharmacist-confirmation')
        .set('x-fixture-user', owner).set('x-store-organization-id', store).send({ confirmed: true });
      expect(ownerConfirmation.status).toBe(200);
      const ownerContext = await request(app).get(base + '/pharmacy/multilingual-consultation/context')
        .set('x-fixture-user', owner).set('x-store-organization-id', store);
      expect(ownerContext.body.data.modes[0].allowed).toBe(true);
      translate.mockImplementationOnce(async () => {
        await db.query(`UPDATE role_assignments SET is_active=false WHERE user_id=$1 AND role='kpa:store_member'`, [staff]);
        return { translation: 'Late private translation' };
      });
      expect((await consult(clinical)).status).toBe(403);
      await db.query(`UPDATE role_assignments SET is_active=true WHERE user_id=$1 AND role='kpa:store_member'`, [staff]);
      await configure('paid', []);
      expect((await consult(clinical)).status).toBe(403);
      await configure('paid', features);
      expect((await permit({ serviceFeatures: ['multilingual-staff-response'], pharmacistConfirmed: false })).status).toBe(200);
      expect((await consult(clinical)).status).toBe(403);
    } finally {
      await db.query('DELETE FROM settings WHERE key=ANY($1::text[])', [policyKeys]);
      for (const row of previous) await db.query(`INSERT INTO settings(key,value,type) VALUES ($1,$2::jsonb,'pharmacy-service-features')`, [row.key, JSON.stringify(row.value)]);
    }
  });
});
