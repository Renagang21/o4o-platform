jest.mock("@o4o/lms-core", () =>
  jest.requireActual(
    "../../../../packages/education-extension/src/entities/Certificate.ts",
  ),
);
import { DataSource, Entity, PrimaryColumn } from "typeorm";
import { Certificate } from "@o4o/lms-core";
import {
  CertificateAuditService,
  certificateReason,
} from "../modules/lms/services/certificate-audit.service.js";
import { runCanonicalBootstrap } from "../database/bootstrap/bootstrap-runner.js";
import { INCREMENTAL_MIGRATIONS } from "../database/incremental/manifest.js";
@Entity("users")
class User {
  @PrimaryColumn("uuid") id!: string;
}
@Entity("lms_courses")
class Course {
  @PrimaryColumn("uuid") id!: string;
}
jest.setTimeout(60000);
const fixture =
  process.env.O4O_LECTURE_CERT_TEST_PORT === "55450" ? describe : describe.skip;
fixture("lecture certificate audit in a disposable database", () => {
  const name = `lecture_cert_${process.pid}`;
  const user = "10000000-0000-4000-8000-000000000001";
  const actor = "10000000-0000-4000-8000-000000000002";
  const course = "20000000-0000-4000-8000-000000000001";
  const legacy = "20000000-0000-4000-8000-000000000002";
  const enrollment = "30000000-0000-4000-8000-000000000001";
  let admin: DataSource,
    db: DataSource,
    service: CertificateAuditService,
    cert: Certificate;
  beforeAll(async () => {
    const config = {
      type: "postgres" as const,
      host: "127.0.0.1",
      port: 55450,
      username: "lecture_fixture",
      database: "postgres",
    };
    admin = new DataSource(config);
    await admin.initialize();
    await admin.query(`CREATE DATABASE ${name}`);
    db = new DataSource({
      ...config,
      database: name,
      migrations: [...INCREMENTAL_MIGRATIONS],
      migrationsTableName: "typeorm_migrations",
      entities: [Certificate, User, Course],
    });
    await db.initialize();
    const r = db.createQueryRunner();
    await r.startTransaction();
    try {
      await runCanonicalBootstrap(r, {
        info: () => {},
        warn: () => {},
        error: () => {},
      });
      await r.commitTransaction();
    } catch (e) {
      await r.rollbackTransaction();
      throw e;
    } finally {
      await r.release();
    }
    await db.runMigrations({ transaction: "each" });
    await db.query(
      `INSERT INTO users(id,email,name) VALUES($1,'student@example.invalid','검증 학습자'),($2,'operator@example.invalid','검증 운영자')`,
      [user, actor],
    );
    await db.query(
      `INSERT INTO lms_courses(id,title,service_key) VALUES($1,'검증 강의','lecture'),($2,'다른 서비스','kpa-society')`,
      [course, legacy],
    );
    await db.query(
      `INSERT INTO lms_enrollments(id,"userId","courseId",status,"completedAt") VALUES($1,$2,$3,'completed',now())`,
      [enrollment, user, course],
    );
    service = new CertificateAuditService(db, Certificate);
  });
  afterAll(async () => {
    if (db?.isInitialized) await db.destroy();
    if (admin?.isInitialized) {
      await admin.query(`DROP DATABASE ${name}`);
      await admin.destroy();
    }
  });
  it("atomically issues a certificate, enrollment link and minimal audit", async () => {
    cert = Object.assign(new Certificate(), {
      userId: user,
      courseId: course,
      certificateNumber: "TEST-LECTURE",
      verificationCode: "VERIFY-LECTURE",
      completedAt: new Date(),
      credits: 0,
      isValid: true,
    });
    cert = await service.issued(cert, enrollment, actor);
    const [linked] = await db.query(
      'SELECT "certificateId" FROM lms_enrollments WHERE id=$1',
      [enrollment],
    );
    expect(linked.certificateId).toBe(cert.id);
    const history = await service.history(cert.id);
    expect(history.items).toHaveLength(1);
    expect(history.items[0]).toMatchObject({
      actorId: actor,
      subjectId: user,
      action: "lecture.certificate.issued",
    });
    expect(history.items[0]).not.toHaveProperty("requestHash");
    await expect(
      service.issued(
        Object.assign(new Certificate(), { ...cert, id: undefined }),
        enrollment,
        actor,
      ),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("serializes duplicate renew requests and rejects altered replay payloads", async () => {
    const key = "40000000-0000-4000-8000-000000000001";
    const [a, b] = await Promise.all([
      service.change(cert.id, "renewed", { months: 6 }, actor, key),
      service.change(cert.id, "renewed", { months: 6 }, actor, key),
    ]);
    expect(a.expiresAt).toEqual(b.expiresAt);
    const events = (await service.history(cert.id)).items.filter(
      (e: any) => e.action === "lecture.certificate.renewed",
    );
    expect(events).toHaveLength(1);
    await expect(
      service.change(cert.id, "renewed", { months: 12 }, actor, key),
    ).rejects.toMatchObject({ status: 409 });
  });
  it("stores trimmed revocation reason only in operator history and prevents duplicate revocation", async () => {
    const revoked = await service.change(
      cert.id,
      "revoked",
      { reason: "  오발급 정정  " },
      actor,
    );
    expect(revoked.isValid).toBe(false);
    expect(JSON.stringify(revoked)).not.toContain("오발급 정정");
    expect(
      (await service.history(cert.id)).items.find(
        (e: any) => e.action === "lecture.certificate.revoked",
      ).reason,
    ).toBe("오발급 정정");
    await expect(
      service.change(cert.id, "revoked", { reason: "duplicate" }, actor),
    ).rejects.toMatchObject({ status: 409 });
    const renewed = await service.change(
      cert.id,
      "renewed",
      { months: 3 },
      actor,
    );
    expect(renewed.isValid).toBe(true);
  });
  it("rejects invalid months, notes, request IDs, missing and foreign-service targets without writes", async () => {
    const before = (await service.history(cert.id)).items.length;
    for (const months of [0, -1, 1.5, "6", Infinity])
      await expect(
        service.change(cert.id, "renewed", { months }, actor),
      ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.change(cert.id, "revoked", { reason: "x".repeat(2001) }, actor),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      service.change(cert.id, "renewed", { months: 1 }, actor, "wrong"),
    ).rejects.toMatchObject({ status: 400 });
    const [foreign] = await db.query(
      `INSERT INTO lms_certificates("userId","courseId","certificateNumber","completedAt") VALUES($1,$2,'FOREIGN',now()) RETURNING id`,
      [user, legacy],
    );
    await expect(
      service.change(foreign.id, "revoked", {}, actor),
    ).rejects.toMatchObject({ status: 404 });
    await expect(service.history(foreign.id)).rejects.toMatchObject({
      status: 404,
    });
    expect((await service.history(cert.id)).items).toHaveLength(before);
  });
  it("audits general validity updates and bounds projected history pages", async () => {
    const updated = await service.change(
      cert.id,
      "updated",
      { expiresAt: new Date("2000-01-01") },
      actor,
    );
    expect(updated.isExpired()).toBe(true);
    expect(
      (await service.history(cert.id)).items.find(
        (e: any) => e.action === "lecture.certificate.updated",
      ).changedFields,
    ).toEqual(["expiresAt"]);
    expect(
      (await service.history(cert.id)).items.some(
        (e: any) => e.action === "lecture.certificate.updated",
      ),
    ).toBe(true);
    await expect(service.history(cert.id, 0)).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      service.history("50000000-0000-4000-8000-000000000001"),
    ).rejects.toMatchObject({ status: 404 });
    await db.query(
      `INSERT INTO action_logs(service_key,user_id,action_key,source,status,meta)
      SELECT 'lecture',$1,'lecture.certificate.updated','manual','success',
        jsonb_build_object('certificateId',$2::text,'requestHash','PRIVATE-HASH','unrelatedNote','PRIVATE-NOTE','after',jsonb_build_object('isValid',true))
      FROM generate_series(1,25)`,
      [actor, cert.id],
    );
    const first = await service.history(cert.id, 1),
      second = await service.history(cert.id, 2);
    expect(first.items).toHaveLength(20);
    expect(first.hasMore).toBe(true);
    expect(second.items.length).toBeGreaterThan(0);
    expect(
      first.items.some((e: any) =>
        second.items.some((other: any) => other.id === e.id),
      ),
    ).toBe(false);
    expect(JSON.stringify(first)).not.toMatch(/PRIVATE-HASH|PRIVATE-NOTE/);
  });
  it("rolls back certificate state and issuance/link when audit insert fails", async () => {
    await db.query(
      `CREATE FUNCTION fail_certificate_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action_key LIKE 'lecture.certificate.%' THEN RAISE EXCEPTION 'fixture audit failure'; END IF; RETURN NEW; END $$`,
    );
    await db.query(
      "CREATE TRIGGER fail_certificate_audit BEFORE INSERT ON action_logs FOR EACH ROW EXECUTE FUNCTION fail_certificate_audit()",
    );
    try {
      await expect(
        service.change(cert.id, "revoked", { reason: "must roll back" }, actor),
      ).rejects.toThrow("fixture audit failure");
      const [persisted] = await db.query(
        'SELECT "isValid" FROM lms_certificates WHERE id=$1',
        [cert.id],
      );
      expect(persisted.isValid).toBe(true);
      await db.query("DELETE FROM lms_certificates WHERE id=$1", [cert.id]);
      await db.query(
        'UPDATE lms_enrollments SET "certificateId"=NULL WHERE id=$1',
        [enrollment],
      );
      await expect(
        service.issued(
          Object.assign(new Certificate(), { ...cert, id: undefined }),
          enrollment,
          actor,
        ),
      ).rejects.toThrow("fixture audit failure");
      expect(
        await db.query('SELECT id FROM lms_certificates WHERE "courseId"=$1', [
          course,
        ]),
      ).toEqual([]);
      const [linked] = await db.query(
        'SELECT "certificateId" FROM lms_enrollments WHERE id=$1',
        [enrollment],
      );
      expect(linked.certificateId).toBeNull();
    } finally {
      await db.query("DROP TRIGGER fail_certificate_audit ON action_logs");
      await db.query("DROP FUNCTION fail_certificate_audit()");
    }
  });
});
it("bounds optional business reason and rejects non-text input", () => {
  expect(certificateReason(undefined)).toBeNull();
  expect(certificateReason("  ")).toBeNull();
  expect(certificateReason(" 정정 ")).toBe("정정");
  for (const value of [{}, 42, "\0"])
    expect(() => certificateReason(value)).toThrow();
});
