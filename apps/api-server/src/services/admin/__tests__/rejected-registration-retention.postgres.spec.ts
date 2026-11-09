import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { MEMBER_REGISTRATION_KEY } from '@o4o/types';
import { purgeRejectedRegistrations } from '../rejected-registration-retention.js';
import { getNetureMainMembershipStatus } from '../../../modules/neture/services/neture-main-membership.js';

// Dedicated disposable cluster only (scripts/privacy/verify-auth-privacy-fixture.mjs). Never production.
const enabled = process.env.O4O_ERASURE_TEST_PORT === '55469';
(enabled ? describe : describe.skip)('rejected registration 30-day cleanup — disposable PostgreSQL', () => {
  let db: DataSource;
  const created: string[] = [];
  const now = new Date('2026-12-31T00:00:00.000Z');
  const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();
  const fields = (documentId?: string) => ({ licenseNumber: '12345', businessName: 'Synthetic pharmacy', ...(documentId ? { businessRegistrationDocumentId: documentId } : {}) });
  async function member(registration: Record<string, unknown>) {
    const id = randomUUID();
    created.push(id);
    await db.query(`INSERT INTO users(id,email,name,status,"isActive","isEmailVerified","businessInfo") VALUES($1,$2,'Synthetic member','active',true,true,$3::json)`,
      [id, `${id}@fixture.invalid`, JSON.stringify({ [MEMBER_REGISTRATION_KEY]: registration, unrelated: 'kept' })]);
    return id;
  }
  async function document(userId: string) {
    const id = randomUUID();
    await db.query(`INSERT INTO kyc_documents(id,user_id,"documentType","fileUrl","fileName") VALUES($1,$2,'business_registration',$3,'synthetic.pdf')`,
      [id, userId, `gcs://fixture-private/business-registration/${userId}/${id}`]);
    return id;
  }
  const stored = async (id: string) => (await db.query(`SELECT "businessInfo"::jsonb AS b FROM users WHERE id=$1`, [id]))[0].b;
  const docExists = async (id: string) => (await db.query('SELECT 1 FROM kyc_documents WHERE id=$1', [id])).length === 1;

  beforeAll(async () => {
    db = new DataSource({ type: 'postgres', host: '127.0.0.1', port: 55469, username: 'agent', password: () => '', database: 'o4o_erasure_fixture', entities: [], synchronize: false });
    await db.initialize();
    if ((await db.query('SELECT current_database() AS name'))[0].name !== 'o4o_erasure_fixture') throw new Error('SYNTHETIC_DATABASE_ONLY');
  });
  afterEach(async () => {
    await db.query('DELETE FROM organizations WHERE code LIKE $1', ['synthetic-rr-%']);
    await db.query('DELETE FROM kyc_documents WHERE user_id=ANY($1::uuid[])', [created]);
    await db.query('DELETE FROM users WHERE id=ANY($1::uuid[])', [created]);
    created.length = 0;
  });
  afterAll(async () => { await db?.destroy(); });

  it('clears submitted fields and the unreferenced document after 30 days, keeping the rejected marker', async () => {
    const id = await member({ type: 'pharmacy_owner', state: 'rejected', reason: 'Synthetic correction', reviewedAt: daysAgo(31), fields: {} });
    const doc = await document(id);
    await db.query(`UPDATE users SET "businessInfo"=jsonb_set("businessInfo"::jsonb,'{${MEMBER_REGISTRATION_KEY},fields}',$2::jsonb)::json WHERE id=$1`, [id, JSON.stringify(fields(doc))]);
    const deleted: string[] = [];
    const report = await purgeRejectedRegistrations(db, now, true, { deleteObject: async url => { deleted.push(url); } });
    expect(report).toEqual({ eligible: 1, purged: 1, documentsDeleted: 1, failed: 0 });
    const b = await stored(id);
    expect(b[MEMBER_REGISTRATION_KEY]).toMatchObject({ type: 'pharmacy_owner', state: 'rejected', reason: 'Synthetic correction', fields: {} });
    expect(b[MEMBER_REGISTRATION_KEY].fieldsPurgedAt).toEqual(expect.any(String));
    expect(b.unrelated).toBe('kept');
    expect(await docExists(doc)).toBe(false);
    expect(deleted).toEqual([`gcs://fixture-private/business-registration/${id}/${doc}`]);
    // 표식이 남아 있으므로 legacy 회원으로 승격되지 않는다.
    expect(await getNetureMainMembershipStatus(db, id)).toBe('rejected');
  });

  it('leaves recent rejections, pending resubmissions and approved members untouched', async () => {
    const recent = await member({ type: 'pharmacist', state: 'rejected', reason: 'r', reviewedAt: daysAgo(10), fields: fields() });
    const pending = await member({ type: 'pharmacist', state: 'pending', reviewedAt: daysAgo(90), fields: fields() });
    const approved = await member({ type: 'pharmacist', state: 'approved', reviewedAt: daysAgo(90), fields: fields() });
    const before = await Promise.all([recent, pending, approved].map(stored));
    const report = await purgeRejectedRegistrations(db, now, true);
    expect(report.purged).toBe(0);
    expect(await Promise.all([recent, pending, approved].map(stored))).toEqual(before);
  });

  it('keeps a document that a business still references', async () => {
    const id = await member({ type: 'pharmacy_owner', state: 'rejected', reason: 'r', reviewedAt: daysAgo(40), fields: {} });
    const doc = await document(id);
    await db.query(`UPDATE users SET "businessInfo"=jsonb_set("businessInfo"::jsonb,'{${MEMBER_REGISTRATION_KEY},fields}',$2::jsonb)::json WHERE id=$1`, [id, JSON.stringify(fields(doc))]);
    await db.query(`INSERT INTO organizations(name,code,metadata) VALUES('Synthetic org',$1,$2::jsonb)`, [`synthetic-rr-${doc.slice(0, 8)}`, JSON.stringify({ businessProfile: { businessRegistrationDocumentId: doc } })]);
    const report = await purgeRejectedRegistrations(db, now, true, { deleteObject: async () => { throw new Error('must not delete'); } });
    expect(report).toMatchObject({ purged: 1, documentsDeleted: 0, failed: 0 });
    expect(await docExists(doc)).toBe(true);
    expect((await stored(id))[MEMBER_REGISTRATION_KEY].fields).toEqual({});
  });

  it('dry-run only counts', async () => {
    const id = await member({ type: 'pharmacist', state: 'rejected', reason: 'r', reviewedAt: daysAgo(45), fields: fields() });
    const before = await stored(id);
    expect(await purgeRejectedRegistrations(db, now, false)).toEqual({ eligible: 1, purged: 0, documentsDeleted: 0, failed: 0 });
    expect(await stored(id)).toEqual(before);
  });
});
