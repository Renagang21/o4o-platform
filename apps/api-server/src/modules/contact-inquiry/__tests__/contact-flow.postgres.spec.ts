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
import {
  CONTACT_SERVICES,
  contactRecipients,
} from "../contact-service-scope.js";
import { ContactReplyService } from "../contact-reply.service.js";
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
    CREATE TABLE role_assignments(user_id uuid,role text,is_active boolean,valid_from timestamptz,valid_until timestamptz);
    CREATE TABLE semi_franchises(id uuid,key text);
    CREATE TABLE semi_franchise_operators(semi_franchise_id uuid,user_id uuid,revoked_at timestamptz);
    CREATE TABLE action_logs(id uuid DEFAULT gen_random_uuid(),service_key text,user_id uuid,action_key text,source text,status text,meta jsonb,created_at timestamptz DEFAULT clock_timestamp());
    CREATE TABLE contact_inquiries(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),service_key varchar(50),inquiry_type varchar(50),name varchar(100),email varchar(255),phone varchar(50),organization_name varchar(200),subject varchar(300),message text,privacy_consent boolean,status varchar(20),source_path varchar(300),user_agent text,ip_hash varchar(64),notification_status varchar(100),handled_at timestamp,handled_by uuid,internal_note text,created_at timestamp DEFAULT now(),updated_at timestamp DEFAULT now());`);
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
      .post("/public/services/megapharm/contact-inquiries")
      .send({ ...payload, subject: "PRIVATE_SUBJECT" });
    const sent = (
      notificationService.createNotification as jest.Mock
    ).mock.calls.map((c) => c[0]);
    expect(sent).toHaveLength(1);
    expect(sent[0].userId).toBe(central);
    expect(JSON.stringify(sent)).not.toContain("PRIVATE_SUBJECT");
    expect(sent[0].metadata.assignmentRequired).toBe(true);
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
    expect(await contactRecipients(db, "megapharm")).toEqual([]);
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
          .get("/admin/services/megapharm/contact-inquiries")
          .set("x-test-user", central)
      ).status,
    ).toBe(403);
    await db.query(
      "UPDATE semi_franchise_operators SET revoked_at=NOW() WHERE semi_franchise_id=$1",
      [businessId],
    );
    expect(await contactRecipients(db, "carepharm")).toEqual([]);
  });
  it("keeps directory-wide inquiries out of individual branch operators scope", async () => {
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
    ).toBe(200);
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
