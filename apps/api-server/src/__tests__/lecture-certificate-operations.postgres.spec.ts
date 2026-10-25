/** Explicit local-only integration (WO-O4O-LECTURE-CERTIFICATE-OPERATION-HISTORY-UNIFICATION-V1).
 * Creates and drops its own database on a disposable PostgreSQL. Never point it at an application database.
 * Run: O4O_LECTURE_CERT_OPS_PG_PORT=<port> [O4O_LECTURE_CERT_OPS_PG_USER=<superuser>] jest --runTestsByPath <this file>
 */
import { AddLectureInstructorProfile1792886400000 } from '../database/migrations/1792886400000-AddLectureInstructorProfile';
import { randomUUID } from 'node:crypto';
import { DataSource } from 'typeorm';
import { CANONICAL_SCHEMA_BASELINE_STATEMENTS } from '../database/bootstrap/canonical-schema-baseline.js';
import { CANONICAL_SCHEMA_BASELINE_META } from '../database/bootstrap/canonical-schema-baseline.meta.js';
import { INCREMENTAL_MIGRATIONS } from '../database/incremental/manifest.js';
import {
  changeLectureCertificate,
  listCertificateOperations,
  listMissingCertificates,
  recordCertificateIssue,
  revokeLectureCertificate,
} from '../modules/lms/services/certificate-operation.service';

const port = Number(process.env.O4O_LECTURE_CERT_OPS_PG_PORT);
const run = Number.isInteger(port) && port > 0 ? describe : describe.skip;

run('lecture certificate operation history on PostgreSQL', () => {
  const database = `lecture_cert_ops_${process.pid}_${Date.now()}`;
  const base = { type: 'postgres' as const, host: '127.0.0.1', port, username: process.env.O4O_LECTURE_CERT_OPS_PG_USER ?? 'postgres' };
  let admin: DataSource, db: DataSource;
  const operator = randomUUID(), learner = randomUUID(), outsider = randomUUID();
  const course = randomUUID(), foreignCourse = randomUUID();
  // lms_certificates is unique per (userId, courseId): each certificate gets its own learner.
  const certificate = async (courseId = course) => {
    const id = randomUUID(), owner = randomUUID();
    await db.query(`INSERT INTO users(id,email,name) VALUES($1,$2,'검증 학습자')`, [owner, `${owner}@example.invalid`]);
    await db.query(`INSERT INTO lms_certificates(id,"userId","courseId","certificateNumber","completedAt") VALUES($1,$2,$3,$4,now())`, [id, owner, courseId, id]);
    return id;
  };
  const history = async (id: string) => db.query(`SELECT action_key, meta FROM action_logs WHERE meta->>'certificateId'=$1 ORDER BY created_at, id`, [id]);

  beforeAll(async () => {
    admin = new DataSource({ ...base, database: 'postgres' });
    await admin.initialize();
    await admin.query(`CREATE DATABASE ${database}`);
    db = new DataSource({ ...base, database });
    await db.initialize();
    const q = db.createQueryRunner(); await q.connect(); await q.startTransaction();
    try {
      for (const ext of CANONICAL_SCHEMA_BASELINE_META.requiredExtensions) await q.query(`CREATE EXTENSION IF NOT EXISTS "${ext.name}" WITH SCHEMA "${ext.schema}"`);
      for (const sql of CANONICAL_SCHEMA_BASELINE_STATEMENTS) await q.query(sql);
      for (const Migration of INCREMENTAL_MIGRATIONS) { await q.query('SET LOCAL search_path TO public'); await new (Migration as any)().up(q); }
      await q.commitTransaction();
    } catch (e) { await q.rollbackTransaction(); throw e; } finally { await q.release(); }
    for (const [id, name] of [[operator, '검증 운영자'], [learner, '검증 학습자'], [outsider, '검증 비운영자']])
      await db.query(`INSERT INTO users(id,email,name,status,"isActive","isEmailVerified") VALUES($1,$2,$3,'active',true,true)`, [id, `${id}@example.invalid`, name]);
    for (const id of [operator, outsider]) await db.query(`INSERT INTO service_memberships(user_id,service_key,role,status) VALUES($1,'lecture','member','active')`, [id]);
    await db.query(`INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'lecture:operator',true)`, [operator]);
    await db.query(`INSERT INTO lms_courses(id,title,service_key) VALUES($1,'100% 실무_강의','lecture'),($2,'다른 서비스 강의','kpa-society')`, [course, foreignCourse]);
  }, 300000);
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
    if (admin?.isInitialized) { await admin.query(`DROP DATABASE IF EXISTS ${database}`); await admin.destroy(); }
  });

  it('instructor profile migration preserves legacy rows, stores bounded text and refuses destructive rollback', async () => {
    const id = randomUUID();
    await db.query(`INSERT INTO lms_instructor_applications(id,"userId",status) VALUES($1,$2,'pending')`, [id, learner]);
    const read = async () => (await db.query('SELECT bio,expertise,status FROM lms_instructor_applications WHERE id=$1', [id]))[0];
    expect(await read()).toEqual({ bio: null, expertise: null, status: 'pending' });
    await db.query('UPDATE lms_instructor_applications SET bio=$1,expertise=$2 WHERE id=$3', ['소개', '실무', id]);
    expect(await read()).toMatchObject({ bio: '소개', expertise: '실무' });
    await expect(db.query('UPDATE lms_instructor_applications SET bio=$1 WHERE id=$2', ['x'.repeat(3001), id])).rejects.toThrow();
    await expect(new AddLectureInstructorProfile1792886400000().down({ query: (sql: string) => db.query(sql) } as any)).rejects.toThrow('INSTRUCTOR_PROFILE_DATA_EXISTS');
    expect(await read()).toMatchObject({ bio: '소개', expertise: '실무' });
  });

  it('renew records before/after and months; a repeated operationId applies once', async () => {
    const id = await certificate();
    await revokeLectureCertificate(db, id, operator, '재발급 대기');
    const key = randomUUID();
    const first = await changeLectureCertificate(db, id, operator, 'renew', { months: 6, operationId: key });
    const again = await changeLectureCertificate(db, id, operator, 'renew', { months: 6, operationId: key });
    expect(first.isValid).toBe(true);
    expect(new Date(again.expiresAt).getTime()).toBe(new Date(first.expiresAt).getTime());
    const logs = await history(id);
    expect(logs.map((l: any) => l.action_key)).toEqual(['lecture.certificate_revoke', 'lecture.certificate_renew']);
    expect(logs[1].meta).toMatchObject({ months: 6, operationId: key, before: { isValid: false }, after: { isValid: true } });
    await expect(changeLectureCertificate(db, id, operator, 'renew', { months: 0 })).rejects.toMatchObject({ status: 400 });
    await expect(changeLectureCertificate(db, id, operator, 'renew', { months: 6, operationId: 'not-a-uuid' })).rejects.toMatchObject({ status: 400 });
  });

  it('update keeps the allowlist, records changed fields, and skips empty patches', async () => {
    const id = await certificate();
    await changeLectureCertificate(db, id, operator, 'update', { patch: { badgeUrl: 'https://files.example.invalid/b.png', userId: outsider, courseId: foreignCourse } });
    const [row] = await db.query(`SELECT "userId","courseId","badgeUrl" FROM lms_certificates WHERE id=$1`, [id]);
    expect(row.userId).not.toBe(outsider);
    expect(row).toMatchObject({ courseId: course, badgeUrl: 'https://files.example.invalid/b.png' });
    await changeLectureCertificate(db, id, operator, 'update', { patch: { unknown: 1 } });
    await expect(changeLectureCertificate(db, id, operator, 'update', { patch: { isValid: 'no' } })).rejects.toMatchObject({ status: 400 });
    const logs = await history(id);
    expect(logs).toHaveLength(1);
    expect(logs[0].meta.changedFields).toEqual(['badgeUrl']);
  });

  it('revoke keeps the private reason out of the certificate; repeat is a no-op; failure rolls back', async () => {
    const id = await certificate();
    await db.query(`CREATE FUNCTION reject_cert_ops_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_key='lecture.certificate_renew' THEN RAISE EXCEPTION 'Synthetic audit failure'; END IF; RETURN NEW; END $$`);
    await db.query('CREATE TRIGGER reject_cert_ops_audit BEFORE INSERT ON action_logs FOR EACH ROW EXECUTE FUNCTION reject_cert_ops_audit()');
    await expect(changeLectureCertificate(db, id, operator, 'renew', { months: 3 })).rejects.toThrow('Synthetic audit failure');
    expect((await db.query(`SELECT "expiresAt" FROM lms_certificates WHERE id=$1`, [id]))[0].expiresAt).toBeNull();
    await db.query('DROP TRIGGER reject_cert_ops_audit ON action_logs'); await db.query('DROP FUNCTION reject_cert_ops_audit()');
    await Promise.all([1, 2].map(() => revokeLectureCertificate(db, id, operator, '내부 사유')));
    const logs = await history(id);
    expect(logs).toHaveLength(1);
    expect(logs[0].meta).toMatchObject({ reason: '내부 사유', beforeValid: true, afterValid: false, before: { isValid: true }, after: { isValid: false } });
    expect((await db.query(`SELECT metadata FROM lms_certificates WHERE id=$1`, [id]))[0].metadata).toBeNull();
  });

  it('scope and actor checks: foreign service 404, non-operator 403, missing actor 403', async () => {
    const foreign = await certificate(foreignCourse);
    const id = await certificate();
    await expect(changeLectureCertificate(db, foreign, operator, 'renew', { months: 1 })).rejects.toMatchObject({ status: 404 });
    await expect(changeLectureCertificate(db, id, outsider, 'renew', { months: 1 })).rejects.toMatchObject({ httpStatus: 403 });
    await expect(changeLectureCertificate(db, id, undefined, 'update', { patch: { badgeUrl: null } })).rejects.toMatchObject({ status: 403 });
    expect(await history(id)).toHaveLength(0);
  });

  it('history: all four actions, legacy revoke rows, automatic issue, paging', async () => {
    const id = await certificate();
    const [{ userId }] = await db.query(`SELECT "userId" FROM lms_certificates WHERE id=$1`, [id]);
    await db.transaction(m => recordCertificateIssue(m, { id, courseId: course, userId, isValid: true }, undefined));
    // A revoke row written before this WO (reason + beforeValid/afterValid only).
    await db.query(`INSERT INTO action_logs(service_key,user_id,action_key,source,status,meta,created_at)
      VALUES('lecture',$1,'lecture.certificate_revoke','manual','success',$2::jsonb, now() + interval '1 second')`,
      [operator, JSON.stringify({ certificateId: id, reason: '과거 사유', beforeValid: true, afterValid: false })]);
    const page1 = await listCertificateOperations(db, id);
    expect(page1.operations.map((o: any) => o.action)).toEqual(['revoke', 'issue']);
    expect(page1.operations[0]).toMatchObject({ reason: '과거 사유', before: { isValid: true }, after: { isValid: false } });
    expect(page1.operations[1]).toMatchObject({ actorId: null, trigger: 'completion', before: null, after: { isValid: true } });
    for (let i = 0; i < 20; i++) await changeLectureCertificate(db, id, operator, 'renew', { months: 1 });
    const first = await listCertificateOperations(db, id, 1);
    const second = await listCertificateOperations(db, id, '2');
    expect([first.operations.length, first.hasMore, second.operations.length, second.hasMore]).toEqual([20, true, 2, false]);
    await expect(listCertificateOperations(db, id, 0)).rejects.toMatchObject({ status: 400 });
  });

  it('missing-certificate search matches %, _ and \\ literally (course title "100% 실무_강의")', async () => {
    const enrolled = randomUUID();
    await db.query(`INSERT INTO lms_enrollments(id,"userId","courseId",status) VALUES($1,$2,$3,'completed')`, [enrolled, outsider, course]);
    const ids = async (term: string) => (await listMissingCertificates(db, term)).map((r: any) => r.enrollmentId);
    expect(await ids('')).toEqual([enrolled]);
    // Literal characters that exist in the title still match.
    expect(await ids('100%')).toEqual([enrolled]);
    expect(await ids('실무_강의')).toEqual([enrolled]);
    // As wildcards these would match ("1…실", "10?", "실무?강의"); escaped they do not.
    expect(await ids('1%실')).toEqual([]);
    expect(await ids('10_')).toEqual([]);
    expect(await ids('실무%강의')).toEqual([]);
    expect(await ids('\\')).toEqual([]);
    expect(await ids('검증 비운영자')).toEqual([enrolled]);
  });
});
