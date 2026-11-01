import express from "express";
import request from "supertest";
import { DataSource } from "typeorm";
import { randomUUID } from "crypto";

jest.mock("../../../database/connection.js", () => ({
  AppDataSource: { isInitialized: true, query: jest.fn() },
}));
jest.mock("../../../middleware/auth.middleware.js", () => ({
  authenticate: async (req: any, res: any, next: any) => {
    const id = req.headers["x-test-user"];
    if (!id) return res.status(401).json({ code: "AUTH_REQUIRED" });
    const database = (globalThis as any).__contactReviewDb;
    const roles = await database.query(
      `SELECT role FROM role_assignments WHERE user_id=$1 AND is_active AND (valid_until IS NULL OR valid_until>=NOW())`,
      [id],
    );
    const memberships = await database.query(
      'SELECT service_key AS "serviceKey",status FROM service_memberships WHERE user_id=$1',
      [id],
    );
    req.authMethod = "google";
    req.user = { id, roles: roles.map((r: any) => r.role), memberships };
    next();
  },
}));
jest.mock("../../../services/NotificationService.js", () => ({
  notificationService: {
    createNotification: jest.fn(async () => ({ id: "notification" })),
  },
}));
jest.mock("../../../services/email.service.js", () => ({
  emailService: { sendEmail: jest.fn(async () => ({ success: true })) },
}));
import { AppDataSource } from "../../../database/connection.js";
import { notificationService } from "../../../services/NotificationService.js";
import { emailService } from "../../../services/email.service.js";
import { ContactInquiry } from "../entities/ContactInquiry.entity.js";
import { ServiceContactSettings } from "../entities/ServiceContactSettings.entity.js";
import { createPublicContactInquiryController } from "../public-contact-inquiry.controller.js";
import { createAdminContactInquiryController } from "../admin-contact-inquiry.controller.js";
import { createAdminServiceContactSettingsController } from "../admin-service-contact-settings.controller.js";
import {
  CONTACT_SERVICES,
  contactRecipients,
} from "../contact-service-scope.js";
import { ContactReplyService } from "../contact-reply.service.js";
import { dispatchContactInquiry } from "../contact-delivery.js";
import { getServiceMembershipStatusFromDb } from "../../../utils/service-membership.js";
import { requireNetureScope } from "../../../middleware/neture-scope.middleware.js";
import * as contactSettings from "../contact-settings.helper.js";

const enabled = process.env.CONTACT_REVIEW_PG_SOCKET;
const suite = enabled ? describe : describe.skip;
suite("isolated local PostgreSQL public inquiry flow", () => {
  let db: DataSource, app: express.Express;
  const schema = `contact_review_${randomUUID().replace(/-/g, "")}`;
  const supplier = randomUUID(),
    central = randomUUID(),
    suspended = randomUUID(),
    expired = randomUUID();
  const payload = {
    name: "합성 문의자",
    email: "synthetic@example.invalid",
    subject: "테스트 문의",
    message: "합성 문의 내용을 확인합니다.",
    privacyConsent: true,
  };
  beforeAll(async () => {
    if (!enabled?.startsWith("/workspace/") && !enabled?.startsWith("/tmp/"))
      throw Error("Local PostgreSQL socket required");
    db = new DataSource({
      type: "postgres",
      host: enabled,
      username: "o4o_local",
      database: "o4o_platform",
      entities: [ContactInquiry, ServiceContactSettings],
      schema,
      extra: { options: `-c search_path=${schema},public` },
    });
    await db.initialize();
    await db.query(`CREATE SCHEMA ${schema}`);
    (globalThis as any).__contactReviewDb = db;
    (AppDataSource.query as jest.Mock).mockImplementation(
      (sql: string, p: any[]) => db.query(sql, p),
    );
    await db.query(`CREATE TABLE users(id uuid PRIMARY KEY,status text,"isActive" boolean,"isEmailVerified" boolean);
    CREATE TABLE service_memberships(user_id uuid,service_key text,status text);
    CREATE TABLE notifications("userId" uuid,type text,channel text,"serviceKey" text,metadata jsonb);
    CREATE TABLE service_contact_settings(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),service_key varchar(50) UNIQUE,
      in_app_notification_enabled boolean DEFAULT true,email_notification_enabled boolean DEFAULT false,recipient_emails jsonb DEFAULT '[]',
      inquiry_types jsonb,privacy_notice text,completion_notice text,auto_reply_enabled boolean DEFAULT false,auto_reply_subject text,
      auto_reply_message text,auto_reply_include_original boolean DEFAULT false,is_active boolean DEFAULT true,updated_by uuid,
      created_at timestamp DEFAULT now(),updated_at timestamp DEFAULT now());
    CREATE TABLE role_assignments(user_id uuid,role text,is_active boolean,valid_from timestamptz,valid_until timestamptz);
    CREATE TABLE semi_franchises(id uuid,key text);
    CREATE TABLE semi_franchise_operators(semi_franchise_id uuid,user_id uuid,revoked_at timestamptz);
    CREATE TABLE action_logs(id uuid DEFAULT gen_random_uuid(),service_key text,user_id uuid,action_key text,source text,status text,meta jsonb,created_at timestamptz DEFAULT clock_timestamp());
    CREATE TABLE contact_inquiries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),service_key varchar(50),organization_id uuid,inquiry_type varchar(50),name varchar(100),email varchar(255),phone varchar(50),organization_name varchar(200),subject varchar(300),message text,privacy_consent boolean,status varchar(20),source_path varchar(300),user_agent text,ip_hash varchar(64),notification_status varchar(100),handled_at timestamp,handled_by uuid,internal_note text,created_at timestamp DEFAULT now(),updated_at timestamp DEFAULT now());`);
    // Direct-service handling now requires explicit central delegation; independent business roles stay scoped below.
    await db.query(`ALTER TABLE role_assignments ADD COLUMN id uuid DEFAULT gen_random_uuid(), ADD COLUMN scope_type text DEFAULT 'o4o-direct';
      CREATE TABLE central_operation_menu_grants(assignment_id uuid,menu_keys text[]);`);
    for (const id of [supplier, central, suspended, expired])
      await db.query(`INSERT INTO users VALUES($1,'active',true,true)`, [id]);
    await db.query(
      `INSERT INTO role_assignments VALUES($1,'supplier:operator',true,NULL,NULL),($2,'neture:operator',true,NULL,NULL),($3,'supplier:operator',true,NULL,NULL),($4,'supplier:operator',true,NULL,NOW()-interval '1 day')`,
      [supplier, central, suspended, expired],
    );
    await db.query(
      `INSERT INTO service_memberships VALUES($1,'supplier','active'),($2,'neture','active'),($3,'supplier','suspended'),($4,'supplier','active'),($1,'funding','active')`,
      [supplier, central, suspended, expired],
    );
    app = express();
    app.use(express.json());
    app.use("/public/services", createPublicContactInquiryController(db));
    app.use("/admin/services", createAdminContactInquiryController(db));
    app.use("/admin/services", createAdminServiceContactSettingsController(db));
    app.use((error: any, _req: any, res: any, _next: any) =>
      res.status(500).json({ code: error.code || "ERROR" }),
    );
  }, 30000);
  afterAll(async () => {
    if (db?.isInitialized) {
      await db.query(`DROP SCHEMA ${schema} CASCADE`);
      await db.destroy();
    }
    delete (globalThis as any).__contactReviewDb;
  });
  beforeEach(() => {
    jest.clearAllMocks();
    (notificationService.createNotification as jest.Mock).mockImplementation(
      async () => ({ id: "notification" }),
    );
    (AppDataSource.query as jest.Mock).mockImplementation(
      (sql: string, p: any[]) => db.query(sql, p),
    );
    (emailService.sendEmail as jest.Mock).mockResolvedValue({ success: true });
  });
  it("accepts anonymous inquiries for every supported service into the correct ledger", async () => {
    for (const key of Object.keys(CONTACT_SERVICES)) {
      const response = await request(app)
        .post(`/public/services/${key}/contact-inquiries`)
        .send(payload);
      expect(response.status).toBe(201);
      const [row] = await db.query(
        "SELECT service_key FROM contact_inquiries WHERE id=$1",
        [response.body.data.id],
      );
      expect(row.service_key).toBe(key);
    }
  });
  it("publishes only enabled inquiry choices and public notices, and rejects disabled types before saving", async () => {
    const repo = db.getRepository(ServiceContactSettings);
    try {
      await repo.save(
        repo.create({
          service_key: "supplier",
          inquiry_types: [
            {
              value: "service_usage",
              label: "공급 서비스 문의",
              enabled: true,
            },
            { value: "partnership", label: "비활성 제휴", enabled: false },
          ],
          privacy_notice: "개인정보 처리 안내",
          completion_notice: "접수 완료 안내",
          recipient_emails: ["private-recipient@example.invalid"],
          auto_reply_subject: "PRIVATE_AUTO_SUBJECT",
        }),
      );
      const response = await request(app).get(
        "/public/services/supplier/contact-settings",
      );
      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({
        serviceKey: "supplier",
        inquiryTypesConfigured: true,
        inquiryTypes: [{ value: "service_usage", label: "공급 서비스 문의" }],
        privacyNotice: "개인정보 처리 안내",
        completionNotice: "접수 완료 안내",
      });
      expect(JSON.stringify(response.body)).not.toContain("private-recipient");
      expect(JSON.stringify(response.body)).not.toContain(
        "PRIVATE_AUTO_SUBJECT",
      );
      const [{ count: before }] = await db.query(
        "SELECT count(*) FROM contact_inquiries",
      );
      const denied = await request(app)
        .post("/public/services/supplier/contact-inquiries")
        .send({ ...payload, inquiryType: "partnership" });
      expect(denied.status).toBe(400);
      expect(denied.body.error.code).toBe("INQUIRY_TYPE_DISABLED");
      expect(
        (await db.query("SELECT count(*) FROM contact_inquiries"))[0].count,
      ).toBe(before);
      expect(notificationService.createNotification).not.toHaveBeenCalled();
      const accepted = await request(app)
        .post("/public/services/supplier/contact-inquiries")
        .send({ ...payload, inquiryType: "service_usage" });
      expect(accepted.status).toBe(201);
      expect(
        (
          await db.query(
            "SELECT inquiry_type FROM contact_inquiries WHERE id=$1",
            [accepted.body.data.id],
          )
        )[0].inquiry_type,
      ).toBe("service_usage");
      const other = await request(app).get(
        "/public/services/funding/contact-settings",
      );
      expect(other.status).toBe(200);
      expect(other.body.data.inquiryTypesConfigured).toBe(false);
      expect(other.body.data.privacyNotice).toBeNull();
    } finally {
      await repo.delete({ service_key: "supplier" });
    }
  });
  it("does not silently restore the other type when every configured inquiry type is disabled", async () => {
    const repo = db.getRepository(ServiceContactSettings);
    try {
      await repo.save(
        repo.create({
          service_key: "funding",
          inquiry_types: [{ value: "other", label: "기타", enabled: false }],
        }),
      );
      const config = await request(app).get(
        "/public/services/funding/contact-settings",
      );
      expect(config.body.data.inquiryTypes).toEqual([]);
      expect(
        (
          await request(app)
            .post("/public/services/funding/contact-inquiries")
            .send(payload)
        ).status,
      ).toBe(400);
    } finally {
      await repo.delete({ service_key: "funding" });
    }
  });
  it("fails closed for settings read errors without persisting or notifying", async () => {
    const repo = db.getRepository(ServiceContactSettings),
      read = jest.spyOn(repo, "findOne");
    const [{ count: before }] = await db.query(
      "SELECT count(*) FROM contact_inquiries",
    );
    try {
      read.mockRejectedValue(Error("local settings read failed"));
      expect(
        (await request(app).get("/public/services/supplier/contact-settings"))
          .status,
      ).toBe(503);
      expect(
        (
          await request(app)
            .post("/public/services/supplier/contact-inquiries")
            .send(payload)
        ).status,
      ).toBe(503);
      expect(
        (await db.query("SELECT count(*) FROM contact_inquiries"))[0].count,
      ).toBe(before);
      expect(notificationService.createNotification).not.toHaveBeenCalled();
    } finally {
      read.mockRestore();
    }
  });
  it("preserves inherited lecture inquiry types across unrelated admin settings saves", async () => {
    const actor=randomUUID();
    try {
      await db.query("INSERT INTO users VALUES($1,'active',true,true)",[actor]);
      await db.query("INSERT INTO role_assignments VALUES($1,'lecture:admin',true,NULL,NULL)",[actor]);
      await db.query("INSERT INTO service_memberships VALUES($1,'lecture','active')",[actor]);
      const saved=await request(app).put("/admin/services/lecture/contact-settings").set("x-test-user",actor).send({recipientEmails:["synthetic@example.invalid"],emailNotificationEnabled:true});
      expect(saved.status).toBe(200);
      expect((await db.query("SELECT inquiry_types FROM service_contact_settings WHERE service_key='lecture'"))[0].inquiry_types).toBeNull();
      const publicConfig=await request(app).get("/public/services/lecture/contact-settings");
      expect(publicConfig.body.data.inquiryTypesConfigured).toBe(false);
      expect(JSON.stringify(publicConfig.body)).not.toContain("synthetic@example.invalid");
      const explicit=await request(app).put("/admin/services/lecture/contact-settings").set("x-test-user",actor).send({inquiryTypes:[{value:"partnership",label:"강의 협업",enabled:true}]});
      expect(explicit.status).toBe(200);
      expect((await request(app).get("/public/services/lecture/contact-settings")).body.data).toMatchObject({inquiryTypesConfigured:true,inquiryTypes:[{value:"partnership",label:"강의 협업"}]});
    } finally {
      await db.query("DELETE FROM service_contact_settings WHERE service_key='lecture'");
      await db.query("DELETE FROM role_assignments WHERE user_id=$1",[actor]);
      await db.query("DELETE FROM service_memberships WHERE user_id=$1",[actor]);
      await db.query("DELETE FROM users WHERE id=$1",[actor]);
    }
  });
  it("selects only live service operators and reports partial notification failure accurately", async () => {
    expect(await contactRecipients(db, "supplier")).toEqual([
      { userId: supplier },
    ]);
    (notificationService.createNotification as jest.Mock).mockRejectedValueOnce(
      Error("local delivery failure"),
    );
    const response = await request(app)
      .post("/public/services/supplier/contact-inquiries")
      .send(payload);
    const [row] = await db.query(
      "SELECT notification_status FROM contact_inquiries WHERE id=$1",
      [response.body.data.id],
    );
    expect(row.notification_status).toContain("inapp:fail");
  });
  it.each([
    [null, true, "active", true],
    ["pending", true, "active", true],
    ["rejected", true, "active", true],
    ["active", true, "active", true],
    ["suspended", true, "active", false],
    ["withdrawn", true, "active", false],
    ["active", false, "active", false],
    ["active", true, "suspended", false],
  ])(
    "aligns Neture recipients and the real inbox guard for ledger=%s verified=%s account=%s",
    async (ledger, verified, account, allowed) => {
      const userId = randomUUID();
      try {
        await db.query("INSERT INTO users VALUES($1,$2,true,$3)", [
          userId,
          account,
          verified,
        ]);
        await db.query(
          "INSERT INTO role_assignments VALUES($1,'neture:operator',true,NULL,NULL)",
          [userId],
        );
        // This case exercises the independent legacy Neture guard, not central delegation.
        await db.query('UPDATE role_assignments SET scope_type=NULL WHERE user_id=$1', [userId]);
        if (ledger)
          await db.query(
            "INSERT INTO service_memberships VALUES($1,'neture',$2)",
            [userId, ledger],
          );
        const status = await getServiceMembershipStatusFromDb(
          db,
          userId,
          "neture",
        );
        // Production auth projects canonical main eligibility into JWT memberships.
        const req: any = {
          method: 'GET', originalUrl: '/api/v1/neture/operator/contact-messages',
          user: {
            id: userId,
            roles: ["neture:operator"],
            memberships: [{ serviceKey: "neture", status }],
          },
        };
        const res: any = {
          status: jest.fn().mockReturnThis(),
          json: jest.fn().mockReturnThis(),
        };
        const next = jest.fn();
        await requireNetureScope("neture:operator")(req, res, next);
        expect(next.mock.calls.length > 0).toBe(allowed);
        for (const key of ["neture", "store", "hospital"]) {
          expect(
            (await contactRecipients(db, key)).some(
              (row) => row.userId === userId,
            ),
          ).toBe(allowed);
        }
      } finally {
        await db.query("DELETE FROM role_assignments WHERE user_id=$1", [
          userId,
        ]);
        await db.query("DELETE FROM service_memberships WHERE user_id=$1", [
          userId,
        ]);
        await db.query("DELETE FROM users WHERE id=$1", [userId]);
      }
    },
  );
  it("retries only failed in-app recipients after partial fan-out success", async () => {
    const other = randomUUID();
    try {
      await db.query("INSERT INTO users VALUES($1,'active',true,true)", [
        other,
      ]);
      await db.query(
        "INSERT INTO role_assignments VALUES($1,'supplier:operator',true,NULL,NULL)",
        [other],
      );
      await db.query(
        "INSERT INTO service_memberships VALUES($1,'supplier','active')",
        [other],
      );
      let failed = false;
      (notificationService.createNotification as jest.Mock).mockImplementation(
        async (input) => {
          if (input.userId === other && !failed) {
            failed = true;
            throw Error("one recipient unavailable");
          }
          await db.query("INSERT INTO notifications VALUES($1,$2,$3,$4,$5)", [
            input.userId,
            input.type,
            "in_app",
            input.serviceKey,
            input.metadata,
          ]);
          return { id: randomUUID() };
        },
      );
      const created = await request(app)
        .post("/public/services/supplier/contact-inquiries")
        .send(payload);
      const id = created.body.data.id;
      expect(created.status).toBe(201);
      expect(notificationService.createNotification).toHaveBeenCalledTimes(2);
      const retry = await request(app)
        .post(
          `/admin/services/supplier/contact-inquiries/${id}/retry-notifications`,
        )
        .set("x-test-user", supplier);
      expect(retry.status).toBe(200);
      expect(notificationService.createNotification).toHaveBeenCalledTimes(3);
      const calls = (
        notificationService.createNotification as jest.Mock
      ).mock.calls.map(([input]) => input.userId);
      expect(calls.filter((userId) => userId === supplier)).toHaveLength(1);
      expect(calls.filter((userId) => userId === other)).toHaveLength(2);
      const [row] = await db.query(
        "SELECT notification_status FROM contact_inquiries WHERE id=$1",
        [id],
      );
      expect(row.notification_status).toContain("inapp:sent");
      const repeated = await request(app)
        .post(
          `/admin/services/supplier/contact-inquiries/${id}/retry-notifications`,
        )
        .set("x-test-user", supplier);
      expect(repeated.status).toBe(200);
      expect(notificationService.createNotification).toHaveBeenCalledTimes(3);
    } finally {
      await db.query("DELETE FROM role_assignments WHERE user_id=$1", [other]);
      await db.query("DELETE FROM service_memberships WHERE user_id=$1", [
        other,
      ]);
      await db.query("DELETE FROM users WHERE id=$1", [other]);
    }
  });
  it.each(["initial", "retry"])(
    "preserves a concurrent operator decision while saving %s notification delivery",
    async (phase) => {
      let id: string | undefined;
      if (phase === "retry") {
        const created = await request(app)
          .post("/public/services/supplier/contact-inquiries")
          .send(payload);
        id = created.body.data.id;
        await db.query(
          "UPDATE contact_inquiries SET notification_status='inapp:fail' WHERE id=$1",
          [id],
        );
      }
      (
        notificationService.createNotification as jest.Mock
      ).mockImplementationOnce(async (input) => {
        await db.query(
          "UPDATE contact_inquiries SET status='answered',internal_note='concurrent operator note',handled_by=$2,handled_at=NOW() WHERE id=$1",
          [input.metadata.contactInquiryId, supplier],
        );
        return { id: "notification" };
      });
      const result =
        phase === "initial"
          ? await request(app)
              .post("/public/services/supplier/contact-inquiries")
              .send(payload)
          : await request(app)
              .post(
                `/admin/services/supplier/contact-inquiries/${id}/retry-notifications`,
              )
              .set("x-test-user", supplier)
              .send({});
      expect(result.status).toBe(phase === "initial" ? 201 : 200);
      id ??= result.body.data.id;
      const [saved] = await db.query(
        "SELECT status,internal_note,handled_by,notification_status FROM contact_inquiries WHERE id=$1",
        [id],
      );
      expect(saved).toMatchObject({
        status: "answered",
        internal_note: "concurrent operator note",
        handled_by: supplier,
      });
      expect(saved.notification_status).toContain("inapp:sent");
      if (phase === "retry") expect(result.body.data.status).toBe("answered");
    },
  );
  it.each(["note", "status"])(
    "preserves unrelated concurrent fields when changing an inquiry %s",
    async (field) => {
      const created = await request(app)
        .post("/public/services/supplier/contact-inquiries")
        .send(payload);
      const id = created.body.data.id;
      const repo = db.getRepository(ContactInquiry);
      const originalFind = repo.findOne.bind(repo);
      const snapshotRead = jest
        .spyOn(repo, "findOne")
        .mockImplementationOnce(async (options) => {
          const snapshot = await originalFind(options);
          await db.query(
            "UPDATE contact_inquiries SET status='answered',internal_note='concurrent note' WHERE id=$1",
            [id],
          );
          return snapshot;
        });
      try {
        const result = await request(app)
          .patch(`/admin/services/supplier/contact-inquiries/${id}/${field}`)
          .set("x-test-user", supplier)
          .send(
            field === "note"
              ? { internalNote: "operator note" }
              : { status: "in_review" },
          );
        expect(result.status).toBe(200);
        const [saved] = await db.query(
          "SELECT status,internal_note FROM contact_inquiries WHERE id=$1",
          [id],
        );
        expect(saved).toEqual(
          field === "note"
            ? { status: "answered", internal_note: "operator note" }
            : { status: "in_review", internal_note: "concurrent note" },
        );
      } finally {
        snapshotRead.mockRestore();
      }
    },
  );
  it("notifies central operations about missing assignment without exposing the inquiry content", async () => {
    await request(app)
      .post("/public/services/drugstore/contact-inquiries")
      .send({ ...payload, subject: "PRIVATE_SUBJECT" });
    const sent = (
      notificationService.createNotification as jest.Mock
    ).mock.calls.map((c) => c[0]);
    expect(sent).toHaveLength(1);
    expect(sent[0].userId).toBe(central);
    expect(JSON.stringify(sent)).not.toContain("PRIVATE_SUBJECT");
    expect(sent[0].metadata.assignmentRequired).toBe(true);
  });
  it("does not duplicate a private-data-free central assignment alert when retrying email failure", async () => {
    const defaults = await contactSettings.loadContactSettings(db, "drugstore");
    const settings = jest
      .spyOn(contactSettings, "loadContactSettings")
      .mockResolvedValue({
        ...defaults,
        emailNotificationEnabled: true,
        recipientEmails: ["operator@example.invalid"],
      });
    try {
      (emailService.sendEmail as jest.Mock).mockResolvedValueOnce({
        success: false,
      });
      (notificationService.createNotification as jest.Mock).mockImplementation(
        async (input) => {
          await db.query("INSERT INTO notifications VALUES($1,$2,$3,$4,$5)", [
            input.userId,
            input.type,
            "in_app",
            input.serviceKey,
            input.metadata,
          ]);
          return { id: randomUUID() };
        },
      );
      const created = await request(app)
        .post("/public/services/drugstore/contact-inquiries")
        .send({ ...payload, subject: "PRIVATE_ASSIGNMENT_SUBJECT" });
      expect(created.status).toBe(201);
      const id = created.body.data.id;
      const [before] = await db.query(
        "SELECT notification_status FROM contact_inquiries WHERE id=$1",
        [id],
      );
      expect(before.notification_status).toContain("email:fail");
      await dispatchContactInquiry(db, "drugstore", id);
      await dispatchContactInquiry(db, "drugstore", id);
      expect(notificationService.createNotification).toHaveBeenCalledTimes(1);
      const sent = (notificationService.createNotification as jest.Mock).mock
        .calls[0][0];
      expect(sent.userId).toBe(central);
      expect(sent.metadata.assignmentRequired).toBe(true);
      expect(sent.metadata.targetUrl).toBe("/operator");
      for (const secret of [id, payload.email, "PRIVATE_ASSIGNMENT_SUBJECT"])
        expect(JSON.stringify(sent)).not.toContain(secret);
    } finally {
      settings.mockRestore();
    }
  });
  it("denies visitors, suspended operators and operators of other services", async () => {
    expect(
      (await request(app).get("/admin/services/supplier/contact-inquiries"))
        .status,
    ).toBe(401);
    expect(
      (
        await request(app)
          .get("/admin/services/supplier/contact-inquiries")
          .set("x-test-user", suspended)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .get("/admin/services/funding/contact-inquiries")
          .set("x-test-user", supplier)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .get("/admin/services/supplier/contact-inquiries")
          .set("x-test-user", supplier)
      ).status,
    ).toBe(200);
  });
  it("returns a scoped new-inquiry badge count without disclosing inquiry fields", async () => {
    const response = await request(app)
      .get("/admin/services/supplier/contact-inquiries/summary")
      .set("x-test-user", supplier);
    expect(response.status).toBe(200);
    expect(Object.keys(response.body.data)).toEqual(["newCount"]);
    expect(response.body.data.newCount).toBeGreaterThan(0);
    expect(
      (
        await request(app)
          .get("/admin/services/funding/contact-inquiries/summary")
          .set("x-test-user", supplier)
      ).status,
    ).toBe(403);
  });
  it("does not expose or reply to a different service inquiry even when its id is known", async () => {
    const response = await request(app)
      .post("/public/services/funding/contact-inquiries")
      .send(payload);
    const id = response.body.data.id;
    expect(
      (
        await request(app)
          .get(`/admin/services/supplier/contact-inquiries/${id}`)
          .set("x-test-user", supplier)
      ).status,
    ).toBe(404);
    expect(
      (
        await request(app)
          .post(`/admin/services/supplier/contact-inquiries/${id}/replies`)
          .set("x-test-user", supplier)
          .send({ requestId: randomUUID(), message: "답변" })
      ).status,
    ).toBe(404);
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });
  it("excludes organization-owned inquiries from every service-only management path", async () => {
    const before = await request(app).get('/admin/services/supplier/contact-inquiries/summary').set('x-test-user',supplier);
    const id = randomUUID();
    await db.query(`INSERT INTO contact_inquiries(id,service_key,organization_id,name,email,subject,message,privacy_consent,status)
      VALUES($1,'supplier',$2,'Synthetic','synthetic@example.invalid','Private organization','Synthetic text',true,'received')`,[id,randomUUID()]);
    const list=await request(app).get('/admin/services/supplier/contact-inquiries').set('x-test-user',supplier);
    expect(list.body.data.items.some((item:any)=>item.id===id)).toBe(false);
    const summary=await request(app).get('/admin/services/supplier/contact-inquiries/summary').set('x-test-user',supplier);
    expect(summary.body.data.newCount).toBe(before.body.data.newCount);
    for(const path of ['', '/replies']) await request(app).get(`/admin/services/supplier/contact-inquiries/${id}${path}`).set('x-test-user',supplier).expect(404);
    for(const path of ['status','note']) await request(app).patch(`/admin/services/supplier/contact-inquiries/${id}/${path}`).set('x-test-user',supplier).send({status:'closed',internalNote:'Not permitted'}).expect(404);
    await request(app).post(`/admin/services/supplier/contact-inquiries/${id}/retry-notifications`).set('x-test-user',supplier).expect(404);
    await request(app).post(`/admin/services/supplier/contact-inquiries/${id}/replies`).set('x-test-user',supplier).send({requestId:randomUUID(),message:'Not permitted'}).expect(404);
    const [row]=await db.query('SELECT status,internal_note FROM contact_inquiries WHERE id=$1',[id]);
    expect(row).toEqual({status:'received',internal_note:null});
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });
  it("honors explicit legacy business assignment without granting unrelated business access", async () => {
    const businessId = randomUUID();
    await db.query("INSERT INTO semi_franchises VALUES($1,'carepharm')", [
      businessId,
    ]);
    await db.query("INSERT INTO semi_franchise_operators VALUES($1,$2,NULL)", [
      businessId,
      central,
    ]);
    expect(await contactRecipients(db, "carepharm")).toEqual([
      { userId: central },
    ]);
    expect(await contactRecipients(db, "drugstore")).toEqual([]);
    expect(
      (
        await request(app)
          .get("/admin/services/carepharm/contact-inquiries")
          .set("x-test-user", central)
      ).status,
    ).toBe(200);
    expect(
      (
        await request(app)
          .get("/admin/services/drugstore/contact-inquiries")
          .set("x-test-user", central)
      ).status,
    ).toBe(403);
    await db.query(
      "UPDATE semi_franchise_operators SET revoked_at=NOW() WHERE semi_franchise_id=$1",
      [businessId],
    );
    expect(await contactRecipients(db, "carepharm")).toEqual([]);
  });
  it("keeps public directory inquiries in central operations, outside individual branch roles", async () => {
    const member = randomUUID(),
      admin = randomUUID();
    for (const id of [member, admin])
      await db.query("INSERT INTO users VALUES($1,'active',true,true)", [id]);
    await db.query(
      "INSERT INTO role_assignments VALUES($1,'kpa-branch:operator',true,NULL,NULL),($2,'kpa-branch:admin',true,NULL,NULL)",
      [member, admin],
    );
    await db.query(
      "INSERT INTO service_memberships VALUES($1,'kpa-branch','active'),($2,'kpa-branch','active')",
      [member, admin],
    );
    expect(await contactRecipients(db, "kpa-branch")).toEqual([
      { userId: admin },
    ]);
    expect(
      (
        await request(app)
          .get("/admin/services/kpa-branch/contact-inquiries/summary")
          .set("x-test-user", member)
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .get("/admin/services/kpa-branch/contact-inquiries/summary")
          .set("x-test-user", admin)
      ).status,
    ).toBe(403);
    expect((await request(app).get('/admin/services/kpa-branch/contact-inquiries/summary').set('x-test-user',central)).status).toBe(200);
  });
  it("rejects a different reply request while another operator send is in flight", async () => {
    const created = await request(app)
      .post("/public/services/supplier/contact-inquiries")
      .send(payload);
    const id = created.body.data.id;
    let started!: () => void, release!: () => void;
    const sending = new Promise<void>((resolve) => {
      started = resolve;
    });
    const resume = new Promise<void>((resolve) => {
      release = resolve;
    });
    const send = jest.fn(async () => {
      started();
      await resume;
      return { success: true };
    });
    const service = new ContactReplyService(db, send);
    const first = service.reply("supplier", id, supplier, {
      requestId: randomUUID(),
      message: "첫 담당자의 답변",
    });
    try {
      await sending;
      const other = await request(app)
        .post(`/admin/services/supplier/contact-inquiries/${id}/replies`)
        .set("x-test-user", supplier)
        .send({ requestId: randomUUID(), message: "다른 담당자의 동시 답변" });
      release();
      await first;
      expect(other.status).toBe(409);
      expect(other.body.error.code).toBe("REPLY_IN_PROGRESS");
      expect(emailService.sendEmail).not.toHaveBeenCalled();
      await service.reply("supplier", id, supplier, {
        requestId: randomUUID(),
        message: "첫 답변 완료 후 추가 답변",
      });
      expect(send).toHaveBeenCalledTimes(2);
    } finally {
      release();
      await first;
    }
  });
  it("keeps an unresolved previous reply from being bypassed with a new request id", async () => {
    const created = await request(app)
      .post("/public/services/supplier/contact-inquiries")
      .send(payload);
    const id = created.body.data.id;
    await db.query(
      "INSERT INTO action_logs(service_key,user_id,action_key,meta) VALUES('supplier',$1,'contact.reply',$2::jsonb)",
      [
        supplier,
        JSON.stringify({
          contactId: id,
          replyId: randomUUID(),
          body: "결과 미확인 답변",
          delivery: "sending",
        }),
      ],
    );
    const response = await request(app)
      .post(`/admin/services/supplier/contact-inquiries/${id}/replies`)
      .set("x-test-user", supplier)
      .send({ requestId: randomUUID(), message: "새 요청으로 재발송" });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("REPLY_IN_PROGRESS");
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });
  it.each(["initial", "retry"])(
    "claims %s delivery before a competing retry can send notifications",
    async (phase) => {
      let id: string | undefined;
      if (phase === "retry") {
        const created = await request(app)
          .post("/public/services/supplier/contact-inquiries")
          .send(payload);
        id = created.body.data.id;
        await db.query(
          "UPDATE contact_inquiries SET notification_status='inapp:fail;email:fail;autoreply:fail' WHERE id=$1",
          [id],
        );
      }
      jest.clearAllMocks();
      (notificationService.createNotification as jest.Mock).mockImplementation(
        async () => ({ id: "notification" }),
      );
      const settings = jest
        .spyOn(contactSettings, "loadContactSettings")
        .mockResolvedValue({
          ...contactSettings.toEffective("supplier", null),
          emailNotificationEnabled: true,
          recipientEmails: ["operator@example.invalid"],
          autoReplyEnabled: true,
          autoReplySubject: "접수 확인",
          autoReplyMessage: "문의 접수 확인입니다.",
        });
      let started!: () => void, release!: () => void;
      const sending = new Promise<void>((resolve) => {
        started = resolve;
      });
      const resume = new Promise<void>((resolve) => {
        release = resolve;
      });
      (
        notificationService.createNotification as jest.Mock
      ).mockImplementationOnce(async (input) => {
        id = input.metadata.contactInquiryId;
        return { id: "notification" };
      });
      (emailService.sendEmail as jest.Mock).mockImplementationOnce(async () => {
        started();
        await resume;
        return { success: true };
      });
      const first = (
        phase === "initial"
          ? request(app)
              .post("/public/services/supplier/contact-inquiries")
              .send(payload)
          : request(app)
              .post(
                `/admin/services/supplier/contact-inquiries/${id}/retry-notifications`,
              )
              .set("x-test-user", supplier)
              .send({})
      ).then((response) => response);
      try {
        await sending;
        const competing = await request(app)
          .post(
            `/admin/services/supplier/contact-inquiries/${id}/retry-notifications`,
          )
          .set("x-test-user", supplier)
          .send({});
        release();
        const completed = await first;
        expect(completed.status).toBe(phase === "initial" ? 201 : 200);
        expect(competing.status).toBe(409);
        expect(competing.body.error.code).toBe("NOTIFICATION_IN_PROGRESS");
        expect(notificationService.createNotification).toHaveBeenCalledTimes(1);
        expect(emailService.sendEmail).toHaveBeenCalledTimes(2);
        const again = await request(app)
          .post(
            `/admin/services/supplier/contact-inquiries/${id}/retry-notifications`,
          )
          .set("x-test-user", supplier)
          .send({});
        expect(again.status).toBe(200);
        expect(notificationService.createNotification).toHaveBeenCalledTimes(1);
        expect(emailService.sendEmail).toHaveBeenCalledTimes(2);
      } finally {
        release();
        await first;
        settings.mockRestore();
      }
    },
  );
  it("does not automatically reclaim an unresolved notification dispatch", async () => {
    const created = await request(app)
      .post("/public/services/supplier/contact-inquiries")
      .send(payload);
    const id = created.body.data.id;
    await db.query(
      "UPDATE contact_inquiries SET notification_status=$2 WHERE id=$1",
      [id, `sending:${randomUUID()};email:sent`],
    );
    jest.clearAllMocks();
    (notificationService.createNotification as jest.Mock).mockImplementation(
      async () => ({ id: "notification" }),
    );
    const result = await request(app)
      .post(
        `/admin/services/supplier/contact-inquiries/${id}/retry-notifications`,
      )
      .set("x-test-user", supplier)
      .send({});
    expect(result.status).toBe(409);
    expect(result.body.error.code).toBe("NOTIFICATION_IN_PROGRESS");
    const detail = await request(app)
      .get(`/admin/services/supplier/contact-inquiries/${id}`)
      .set("x-test-user", supplier);
    expect(detail.status).toBe(200);
    expect(detail.body.data.notificationStatus).toBe("in_progress");
    expect(notificationService.createNotification).not.toHaveBeenCalled();
    expect(emailService.sendEmail).not.toHaveBeenCalled();
  });
  it("serializes concurrent reply attempts, persists history and keeps failures retryable", async () => {
    const response = await request(app)
      .post("/public/services/supplier/contact-inquiries")
      .send(payload);
    const id = response.body.data.id;
    const service = new ContactReplyService(db);
    const input = { requestId: randomUUID(), message: "합성 답변 내용" };
    const results = await Promise.all([
      service.reply("supplier", id, supplier, input),
      service.reply("supplier", id, supplier, input),
    ]);
    expect(results.every((r) => ["sending", "sent"].includes(r.status))).toBe(
      true,
    );
    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    expect(await service.history("supplier", id)).toEqual([
      expect.objectContaining({ status: "sent", message: input.message }),
    ]);
    (emailService.sendEmail as jest.Mock).mockResolvedValueOnce({
      success: false,
    });
    expect(
      (
        await service.reply("supplier", id, supplier, {
          requestId: randomUUID(),
          message: "다른 답변",
        })
      ).status,
    ).toBe("failed");
    expect((await service.history("supplier", id))[0].status).toBe("failed");
  });
});
