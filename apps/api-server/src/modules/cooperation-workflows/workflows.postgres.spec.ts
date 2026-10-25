import express from "express";
import request from "supertest";
import { DataSource } from "typeorm";
import { randomUUID } from "node:crypto";
let mockDb: DataSource;
jest.mock("../../database/connection.js", () => ({
  AppDataSource: {
    isInitialized: true,
    query: (sql: string, p: any[]) => mockDb.query(sql, p),
  },
}));
jest.mock("../../middleware/auth.middleware.js", () => ({
  requireAuth: async (req: any, res: any, next: any) => {
    const id = req.get("X-Test-User");
    if (!id) return res.status(401).json({ success: false });
    const [user] = await mockDb.query(
      'SELECT id,name,email,status,"isActive","isEmailVerified" FROM users WHERE id=$1',
      [id],
    );
    if (!user) return res.status(401).json({ success: false });
    const roles = await mockDb.query(
      "SELECT role FROM role_assignments WHERE user_id=$1 AND is_active=true",
      [id],
    );
    const memberships = await mockDb.query(
      'SELECT service_key AS "serviceKey",status FROM service_memberships WHERE user_id=$1',
      [id],
    );
    req.user = { ...user, roles: roles.map((r: any) => r.role), memberships };
    next();
  },
}));
jest.mock("../../services/email.service.js", () => ({
  emailService: { sendEmail: jest.fn(async () => ({ success: true })) },
}));
import { createCooperationWorkflowRoutes } from "./routes.js";
import { CooperationWorkService } from "./work.service.js";
import { CooperationMaterialService } from "./material.service.js";
import { CooperationSupportService } from "./support.service.js";
import { resolveInboxScope } from "../contact-inquiry/inbox-scope.js";
import { SemiFranchiseContentService } from "../neture-pharmacy/services/semi-franchise-content.service.js";
import { requireMember } from "./access.js";
import { CreateCooperationMemberWorkflows1792886400001 } from "../../database/migrations/1792886400001-CreateCooperationMemberWorkflows.js";
const enabled = process.env.COOPERATION_WORKFLOW_PG_PORT;
const suite = enabled ? describe : describe.skip;
suite("isolated PostgreSQL cooperation member/operator workflows", () => {
  const op = randomUUID(),
    otherOp = randomUUID(),
    member = randomUUID(),
    second = randomUUID(),
    person = randomUUID();
  const receiver = randomUUID(),
    otherReceiver = randomUUID(),
    store = randomUUID(),
    otherStore = randomUUID(),
    coopOrg = randomUUID();
  const sf = randomUUID(),
    otherSf = randomUUID(),
    coopSf = randomUUID(),
    coop = randomUUID();
  let app: express.Express,
    works: CooperationWorkService,
    materials: CooperationMaterialService,
    support: CooperationSupportService;
  let business: any, cooperative: any;
  const base = "/api/v1/cooperation-workflows/business/fixture-pharmacy",
    coopBase = "/api/v1/cooperation-workflows/cooperative/fixture-coop";
  const input = {
    kind: "notice",
    title: "합성 공지",
    body: "회원 업무 확인 안내입니다.",
    category: "운영",
    priority: "important",
    required: true,
    dueAt: null,
    startsAt: null,
    endsAt: null,
    state: "draft",
    targetIds: [],
  };
  const post = (
    path: string,
    user: string,
    body: unknown,
    organization?: string,
  ) => {
    let req = request(app).post(path).set("X-Test-User", user);
    if (organization) req = req.set("X-Store-Organization-Id", organization);
    return req.send(body);
  };
  const get = (path: string, user: string, organization?: string) => {
    let req = request(app).get(path).set("X-Test-User", user);
    if (organization) req = req.set("X-Store-Organization-Id", organization);
    return req;
  };
  beforeAll(async () => {
    if (enabled !== "55479")
      throw new Error("Explicit isolated loopback database port required");
    mockDb = new DataSource({
      type: "postgres",
      host: "127.0.0.1",
      port: Number(enabled),
      username: "postgres",
      database: "postgres",
      entities: [],
      synchronize: false,
    });
    await mockDb.initialize();
    // This database is a dedicated, disposable canonical-bootstrap container; it never points at a proxy.
    for (const [id, name] of [
      [op, "합성 운영자"],
      [otherOp, "다른 운영자"],
      [member, "합성 회원"],
      [second, "다른 회원"],
      [person, "개인 조합원"],
    ])
      await mockDb.query(
        `INSERT INTO users(id,email,name,status,"isActive","isEmailVerified") VALUES($1,$2,$3,'active',true,true)`,
        [id, id + "@example.invalid", name],
      );
    for (const id of [op, otherOp, member, second, person])
      await mockDb.query(
        "INSERT INTO service_memberships(user_id,service_key,status) VALUES($1,'neture','active')",
        [id],
      );
    for (const id of [receiver, otherReceiver, store, otherStore, coopOrg])
      await mockDb.query(
        "INSERT INTO organizations(id,name,code) VALUES($1,$2,$3)",
        [id, "합성 조직", id],
      );
    for (const [id, key, organization] of [
      [sf, "fixture-pharmacy", receiver],
      [otherSf, "fixture-other", otherReceiver],
      [coopSf, "fixture-cooperative-business", coopOrg],
    ])
      await mockDb.query(
        `INSERT INTO semi_franchises(id,key,name,organization_id,status) VALUES($1,$2,$2,$3,'active')`,
        [id, key, organization],
      );
    for (const user of [op, otherOp])
      await mockDb.query(
        `INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'neture:operator',true)`,
        [user],
      );
    await mockDb.query(
      "INSERT INTO semi_franchise_operators(semi_franchise_id,user_id) VALUES($1,$2),($3,$4)",
      [sf, op, otherSf, otherOp],
    );
    for (const [id, user, index] of [
      [store, member, 1],
      [otherStore, second, 2],
    ] as const) {
      await mockDb.query(
        `INSERT INTO organization_members(organization_id,user_id,role) VALUES($1,$2,'owner')`,
        [id, user],
      );
      await mockDb.query(
        `INSERT INTO neture_pharmacy_memberships(organization_id,applicant_user_id,pharmacy_name,business_number,pharmacist_license_number,status) VALUES($1,$2,'합성 약국',$3,$4,'active')`,
        [id, user, String(1000000000 + index), String(index)],
      );
      await mockDb.query(
        `INSERT INTO semi_franchise_memberships(semi_franchise_id,organization_id,status) VALUES($1,$2,'active')`,
        [sf, id],
      );
    }
    await mockDb.query(
      `INSERT INTO cooperatives(id,slug,name,semi_franchise_id,status) VALUES($1,'fixture-coop','합성 조합',$2,'active')`,
      [coop, coopSf],
    );
    await mockDb.query(
      `INSERT INTO cooperative_roles(cooperative_id,user_id,role) VALUES($1,$2,'operator')`,
      [coop, op],
    );
    for (const user of [person, member])
      await mockDb.query(
        `INSERT INTO cooperative_memberships(cooperative_id,user_id,status) VALUES($1,$2,'active')`,
        [coop, user],
      );
    business = await resolveInboxScope(mockDb, "business", "fixture-pharmacy");
    cooperative = await resolveInboxScope(
      mockDb,
      "cooperative",
      "fixture-coop",
    );
    works = new CooperationWorkService(mockDb);
    materials = new CooperationMaterialService(mockDb);
    support = new CooperationSupportService(mockDb);
    app = express();
    app.use(express.json());
    app.use(
      "/api/v1/cooperation-workflows",
      createCooperationWorkflowRoutes(mockDb),
    );
    app.use((e: any, _req: any, res: any, _next: any) => {
      void _next;
      return res.status(500).json({ error: e.message });
    });
  }, 30000);
  afterAll(async () => {
    if (!mockDb?.isInitialized) return;
    await mockDb.transaction(async (m) => {
      const businessIds = [sf, otherSf, coopSf],
        users = [op, otherOp, member, second, person],
        organizations = [receiver, otherReceiver, store, otherStore, coopOrg];
      for (const table of [
        "cooperation_notice_recipients",
        "cooperation_activity_applications",
        "cooperation_work_revisions",
      ])
        await m.query(
          `DELETE FROM ${table} WHERE work_id IN (SELECT id FROM cooperation_work_items WHERE business_id=ANY($1::uuid[]))`,
          [businessIds],
        );
      await m.query(
        "DELETE FROM cooperation_work_items WHERE business_id=ANY($1::uuid[])",
        [businessIds],
      );
      await m.query(
        "DELETE FROM cooperation_material_revisions WHERE content_id IN (SELECT id FROM semi_franchise_contents WHERE semi_franchise_id=ANY($1::uuid[]))",
        [businessIds],
      );
      await m.query(
        "DELETE FROM semi_franchise_contents WHERE semi_franchise_id=ANY($1::uuid[])",
        [businessIds],
      );
      await m.query(
        "DELETE FROM contact_inquiries WHERE organization_id=ANY($1::uuid[])",
        [organizations],
      );
      for (const table of ["cooperative_roles", "cooperative_memberships"])
        await m.query(`DELETE FROM ${table} WHERE cooperative_id=$1`, [coop]);
      await m.query("DELETE FROM cooperatives WHERE id=$1", [coop]);
      for (const table of [
        "semi_franchise_operators",
        "semi_franchise_memberships",
      ])
        await m.query(
          `DELETE FROM ${table} WHERE semi_franchise_id=ANY($1::uuid[])`,
          [businessIds],
        );
      await m.query("DELETE FROM semi_franchises WHERE id=ANY($1::uuid[])", [
        businessIds,
      ]);
      await m.query(
        "DELETE FROM neture_pharmacy_memberships WHERE organization_id=ANY($1::uuid[])",
        [organizations],
      );
      await m.query(
        "DELETE FROM organization_members WHERE organization_id=ANY($1::uuid[])",
        [organizations],
      );
      await m.query(
        'DELETE FROM notifications WHERE "userId"=ANY($1::uuid[])',
        [users],
      );
      await m.query("DELETE FROM action_logs WHERE user_id=ANY($1::uuid[])", [
        users,
      ]);
      for (const table of ["role_assignments", "service_memberships"])
        await m.query(`DELETE FROM ${table} WHERE user_id=ANY($1::uuid[])`, [
          users,
        ]);
      await m.query("DELETE FROM organizations WHERE id=ANY($1::uuid[])", [
        organizations,
      ]);
      await m.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [users]);
      expect(
        await m.query("SELECT 1 FROM users WHERE id=ANY($1::uuid[])", [users]),
      ).toHaveLength(0);
    });
    await mockDb.destroy();
  });
  it("rejects unauthenticated, unassigned and cross-membership requests", async () => {
    expect((await request(app).get(base + "/member")).status).toBe(401);
    expect((await get(base + "/manage", otherOp)).status).toBe(403);
    expect((await get(base + "/member", person, store)).status).toBe(403);
    expect((await get(coopBase + "/member", second)).status).toBe(403);
    expect((await get(coopBase + "/member", person, store)).status).toBe(403);
    expect((await get(base + "/member", member, store)).status).toBe(200);
  });
  it("publishes a target snapshot, records pharmacy confirmation and preserves prior versions", async () => {
    const draft = await works.save(business, op, undefined, input);
    const saved = await works.save(business, op, draft.id, {
      ...input,
      state: "published",
      version: draft.version,
      targetIds: [store],
    });
    const selected = await get(base + "/member", member, store);
    expect(
      selected.body.data.notices.find((n: any) => n.id === saved.id),
    ).toMatchObject({ version: 2, acknowledged_at: null });
    expect(
      (await get(base + "/member", second, otherStore)).body.data.notices.some(
        (n: any) => n.id === saved.id,
      ),
    ).toBe(false);
    expect(
      (
        await post(
          `${base}/notices/${saved.id}/acknowledge`,
          second,
          { version: 2 },
          otherStore,
        )
      ).status,
    ).toBe(404);
    const confirmed = await post(
      `${base}/notices/${saved.id}/acknowledge`,
      member,
      { version: 2 },
      store,
    );
    expect(confirmed.status).toBe(200);
    const again = await post(
      `${base}/notices/${saved.id}/acknowledge`,
      member,
      { version: 2 },
      store,
    );
    expect(again.body.data.acknowledged_at).toBe(
      confirmed.body.data.acknowledged_at,
    );
    const revised = await works.save(business, op, saved.id, {
      ...input,
      title: "개정 공지",
      state: "published",
      version: 2,
      targetIds: [store],
    });
    expect(revised.version).toBe(3);
    expect(
      (
        await post(
          `${base}/notices/${saved.id}/acknowledge`,
          member,
          { version: 2 },
          store,
        )
      ).status,
    ).toBe(409);
    const detail = await works.detail(business, saved.id);
    expect(detail.counts).toMatchObject({ total: 1, completed: 0 });
    expect(
      (
        await mockDb.query(
          "SELECT count(*)::int AS n FROM cooperation_notice_recipients WHERE work_id=$1 AND acknowledged_at IS NOT NULL",
          [saved.id],
        )
      )[0].n,
    ).toBe(1);
    expect(detail.revisions).toHaveLength(3);
  });
  it("uses personal acknowledgements without producing pharmacy memberships", async () => {
    const draft = await works.save(cooperative, op, undefined, input);
    const saved = await works.save(cooperative, op, draft.id, {
      ...input,
      state: "published",
      version: 1,
    });
    expect(
      (
        await post(`${coopBase}/notices/${saved.id}/acknowledge`, person, {
          version: saved.version,
        })
      ).status,
    ).toBe(200);
    const rows = await mockDb.query(
      "SELECT subject_type,subject_id FROM cooperation_notice_recipients WHERE work_id=$1",
      [saved.id],
    );
    expect(rows.every((r: any) => r.subject_type === "person")).toBe(true);
    expect(
      await mockDb.query(
        "SELECT 1 FROM organization_members WHERE user_id=$1",
        [person],
      ),
    ).toHaveLength(0);
  });
  it.each(["pharmacy", "person"])(
    "can close a targeted activity after its %s member is suspended",
    async (kind) => {
      const scope = kind === "pharmacy" ? business : cooperative;
      const target = kind === "pharmacy" ? store : person;
      const membershipSql =
        kind === "pharmacy"
          ? "UPDATE semi_franchise_memberships SET status=$1 WHERE semi_franchise_id=$2 AND organization_id=$3"
          : "UPDATE cooperative_memberships SET status=$1 WHERE cooperative_id=$2 AND user_id=$3";
      const membershipId = kind === "pharmacy" ? sf : coop;
      const activity = {
        ...input,
        kind: "activity",
        required: false,
        targetIds: [target],
      };
      await mockDb.query(membershipSql, ["active", membershipId, target]);
      const draft = await works.save(scope, op, undefined, activity);
      let current = await works.save(scope, op, draft.id, {
        ...activity,
        state: "recruiting",
        version: 1,
      });
      await mockDb.query(membershipSql, ["suspended", membershipId, target]);
      try {
        await expect(
          works.save(scope, op, undefined, activity),
        ).rejects.toMatchObject({ httpStatus: 400 });
        await expect(
          works.save(scope, op, draft.id, {
            ...activity,
            state: "active",
            version: current.version,
            targetIds: [],
          }),
        ).rejects.toMatchObject({ httpStatus: 400 });
        for (const state of ["active", "ended", "archived"]) {
          current = await works.save(scope, op, draft.id, {
            ...activity,
            state,
            version: current.version,
          });
          expect(current.state).toBe(state);
          expect(current.target_ids).toEqual([target]);
        }
      } finally {
        await mockDb.query(membershipSql, ["active", membershipId, target]);
      }
    },
  );
  it("keeps rejected requests retryable and serializes application approval with optimistic versions", async () => {
    const activity = { ...input, kind: "activity", required: false };
    const draft = await works.save(business, op, undefined, activity);
    const open = await works.save(business, op, draft.id, {
      ...activity,
      state: "recruiting",
      version: 1,
    });
    const first = await post(
      `${base}/activities/${open.id}/applications`,
      member,
      { version: open.version, note: "참여합니다." },
      store,
    );
    expect(first.status).toBe(200);
    expect(
      (
        await post(
          `${base}/activities/${open.id}/applications`,
          member,
          { version: open.version, note: "중복" },
          store,
        )
      ).body.data.id,
    ).toBe(first.body.data.id);
    const reject = await post(
      `${base}/manage/applications/${first.body.data.id}`,
      op,
      { version: 1, state: "rejected", note: "내용 보완" },
    );
    expect(reject.status).toBe(200);
    const retry = await post(
      `${base}/activities/${open.id}/applications`,
      member,
      {
        version: open.version,
        applicationVersion: 2,
        note: "내용을 보완했습니다.",
      },
      store,
    );
    expect(retry.status).toBe(200);
    const decisions = await Promise.all(
      ["approved", "rejected"].map((next) =>
        post(`${base}/manage/applications/${retry.body.data.id}`, op, {
          version: 3,
          state: next,
          note: "검토",
        }),
      ),
    );
    expect(decisions.map((r) => r.status).sort()).toEqual([200, 409]);
    await expect(
      works.save(business, op, open.id, {
        ...activity,
        state: "active",
        version: open.version,
        targetIds: [store],
      }),
    ).rejects.toMatchObject({ httpStatus: 400 });
  });
  it("preserves all material bodies and attachment snapshots across legacy writers and metadata edits", async () => {
    const [content] = await mockDb.query(
      `INSERT INTO semi_franchise_contents(semi_franchise_id,title,body,attachments,status,created_by,updated_by) VALUES($1,'합성 자료','이전 본문','[{"name":"첫 첨부"}]','draft',$2,$2) RETURNING id,revision`,
      [sf, op],
    );
    await mockDb.query(
      `UPDATE semi_franchise_contents SET body='개정 본문',attachments='[]',updated_by=$2 WHERE id=$1`,
      [content.id, op],
    );
    const saved = await materials.update(business, op, content.id, {
      revision: 2,
      category: "직원 안내",
      educationUrl: "https://example.invalid/education",
    });
    expect(saved.revision).toBe(3);
    const history = await materials.history(business, content.id);
    expect(history.map((r: any) => r.revision)).toEqual([3, 2, 1]);
    expect(history[2].snapshot.body).toBe("이전 본문");
    expect(history[2].snapshot.attachments).toEqual([{ name: "첫 첨부" }]);
    await expect(
      materials.update(business, op, content.id, {
        revision: 2,
        category: "오래된 편집",
        educationUrl: null,
      }),
    ).rejects.toMatchObject({ httpStatus: 409 });
    expect(
      (await materials.list(business, false)).items.some(
        (r: any) => r.id === content.id,
      ),
    ).toBe(false);
  });
  it("owns authenticated inquiries by account and membership unit, never by matching email", async () => {
    const body = {
      subject: "회원 문의",
      message: "회원 문의 접수 내용을 확인합니다.",
      privacyConsent: true,
      requestId: randomUUID(),
    };
    const responses = await Promise.all([
      post(base + "/support", member, body, store),
      post(base + "/support", member, body, store),
    ]);
    expect(responses.map((r) => r.status)).toEqual([200, 200]);
    expect(responses[0].body.data.id).toBe(responses[1].body.data.id);
    const id = responses[0].body.data.id;
    const [actor] = await mockDb.query("SELECT email FROM users WHERE id=$1", [
      member,
    ]);
    await mockDb.query(
      `INSERT INTO contact_inquiries(service_key,organization_id,name,email,subject,message,status) VALUES('neture',$1,'익명',$2,'과거 익명 문의','이메일이 같아도 소유권을 부여하지 않습니다.','received')`,
      [receiver, actor.email],
    );
    const own = await get(base + "/member", member, store);
    expect(own.body.data.support.items.map((r: any) => r.id)).toEqual([id]);
    expect(
      (await get(base + "/member", second, otherStore)).body.data.support.total,
    ).toBe(0);
    const [row] = await mockDb.query(
      "SELECT updated_at::text AS version FROM contact_inquiries WHERE id=$1",
      [id],
    );
    expect(
      (
        await post(`${base}/manage/support/${id}`, op, {
          version: row.version,
          assignedTo: otherOp,
          dueAt: null,
        })
      ).status,
    ).toBe(400);
    const assigned = await post(`${base}/manage/support/${id}`, op, {
      version: row.version,
      assignedTo: op,
      dueAt: "2026-01-01T00:00:00Z",
    });
    expect(assigned.status).toBe(200);
    expect(
      (
        await post(`${base}/manage/support/${id}`, op, {
          version: row.version,
          assignedTo: null,
          dueAt: null,
        })
      ).status,
    ).toBe(409);
    expect((await support.operatorList(business)).overdue).toBeGreaterThan(0);
    await mockDb.query(
      `UPDATE cooperative_memberships SET status='suspended' WHERE cooperative_id=$1 AND user_id=$2`,
      [coop, person],
    );
    await expect(
      requireMember(mockDb, cooperative, person),
    ).rejects.toMatchObject({ httpStatus: 403 });
  });
  it("blocks business aliases, revoked operators and immediately suspended members", async () => {
    expect(
      (
        await get(
          "/api/v1/cooperation-workflows/business/fixture-cooperative-business/manage",
          op,
        )
      ).status,
    ).toBe(404);
    await mockDb.query(
      "UPDATE semi_franchise_operators SET revoked_at=now() WHERE semi_franchise_id=$1 AND user_id=$2",
      [sf, op],
    );
    expect((await post(base + "/manage/work", op, input)).status).toBe(403);
    await mockDb.query(
      "UPDATE semi_franchise_operators SET revoked_at=NULL WHERE semi_franchise_id=$1 AND user_id=$2",
      [sf, op],
    );
    await mockDb.query(
      "UPDATE semi_franchise_memberships SET status='suspended' WHERE semi_franchise_id=$1 AND organization_id=$2",
      [sf, store],
    );
    expect((await get(base + "/member", member, store)).status).toBe(403);
    await mockDb.query(
      "UPDATE semi_franchise_memberships SET status='active' WHERE semi_franchise_id=$1 AND organization_id=$2",
      [sf, store],
    );
    await mockDb.query(
      "UPDATE semi_franchises SET status='closed' WHERE id=$1",
      [coopSf],
    );
    await expect(
      requireMember(mockDb, cooperative, member),
    ).rejects.toMatchObject({ httpStatus: 403 });
    await mockDb.query(
      "UPDATE semi_franchises SET status='active' WHERE id=$1",
      [coopSf],
    );
  });
  it("paginates target units and application/confirmation details without silently dropping members", async () => {
    const draft = await works.save(business, op, undefined, input);
    const notice = await works.save(business, op, draft.id, {
      ...input,
      state: "published",
      version: 1,
    });
    const first = await works.detail(business, notice.id, 0),
      last = await works.detail(business, notice.id, 1);
    expect(first.counts.total).toBe(2);
    expect(last.counts.total).toBe(2);
    expect(last.recipients).toHaveLength(1);
    expect((await works.subjects(business, 1)).items).toHaveLength(1);
    expect(first.revisions[0]).toMatchObject({
      version: 2,
      total: 2,
      completed: 0,
    });
  });
  it("retains workflow evidence on rollback and registers the existing account-erasure write fence on every new table", async () => {
    const runner = mockDb.createQueryRunner();
    await expect(
      new CreateCooperationMemberWorkflows1792886400001().down(runner),
    ).rejects.toThrow("must be retained");
    await runner.release();
    const rows = await mockDb.query(
      "SELECT count(*)::int AS n FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid WHERE t.tgname='account_erasure_write_fence' AND c.relname=ANY($1)",
      [
        [
          "cooperation_work_items",
          "cooperation_work_revisions",
          "cooperation_notice_recipients",
          "cooperation_activity_applications",
          "cooperation_material_revisions",
        ],
      ],
    );
    expect(rows[0].n).toBe(5);
  });
  it("protects existing body/status writers with revision checks and leaves captured store copies unchanged", async () => {
    let captured: any;
    const service = new SemiFranchiseContentService(
      mockDb,
      async (snapshot) => {
        captured = JSON.parse(JSON.stringify(snapshot));
        return { snapshotId: randomUUID() };
      },
    );
    const content = await service.operatorCreate({ id: sf } as any, op, {
      title: "사본 검증 자료",
      body: "최초 본문",
    });
    await service.operatorUpdate({ id: sf } as any, op, content.id, {
      title: "개정 자료",
      body: "개정 본문",
      expectedRevision: 1,
    });
    await expect(
      service.operatorUpdate({ id: sf } as any, op, content.id, {
        title: "오래된 편집",
        expectedRevision: 1,
      }),
    ).rejects.toMatchObject({ httpStatus: 409 });
    await expect(
      service.operatorSetStatus(
        { id: sf } as any,
        op,
        content.id,
        "publish",
        undefined,
        1,
      ),
    ).rejects.toMatchObject({ httpStatus: 409 });
    await service.operatorSetStatus(
      { id: sf } as any,
      op,
      content.id,
      "publish",
      undefined,
      2,
    );
    await service.pharmacyCopy(store, member, content.id);
    expect(captured.contentJson).toMatchObject({
      body: "개정 본문",
      sourceRevision: 3,
    });
    await service.operatorUpdate({ id: sf } as any, op, content.id, {
      title: "다음 개정",
      body: "새 본문",
      expectedRevision: 3,
    });
    expect(captured.contentJson).toMatchObject({
      body: "개정 본문",
      sourceRevision: 3,
    });
  });
  it("connects recruitment, application, approval, progress, completion and end using the same record", async () => {
    const activity = { ...input, kind: "activity", required: false };
    const draft = await works.save(cooperative, op, undefined, activity);
    const recruiting = await works.save(cooperative, op, draft.id, {
      ...activity,
      state: "recruiting",
      version: 1,
    });
    const application = await works.apply(
      cooperative,
      member,
      undefined,
      recruiting.id,
      { version: 2, note: "조합 활동 참여" },
    );
    const approved = await works.decide(cooperative, op, application.id, {
      state: "approved",
      version: 1,
      note: "",
    });
    await expect(
      works.decide(cooperative, op, application.id, {
        state: "completed",
        version: approved.version,
        note: "",
      }),
    ).rejects.toMatchObject({ httpStatus: 400 });
    await works.save(cooperative, op, draft.id, {
      ...activity,
      state: "active",
      version: 2,
    });
    await works.decide(cooperative, op, application.id, {
      state: "completed",
      version: approved.version,
      note: "활동 확인",
    });
    await works.save(cooperative, op, draft.id, {
      ...activity,
      state: "ended",
      version: 3,
    });
    const view = await works.memberList(cooperative, {
      type: "person",
      id: member,
      userId: member,
    });
    expect(
      view.activities.find((item: any) => item.id === draft.id),
    ).toMatchObject({ state: "ended", application_state: "completed" });
  });
  it.each([false, true])(
    "allows completion after ending only with prior progress: %s",
    async (started) => {
      const activity = { ...input, kind: "activity", required: false };
      const draft = await works.save(cooperative, op, undefined, activity);
      let current = await works.save(cooperative, op, draft.id, {
        ...activity,
        state: "recruiting",
        version: 1,
      });
      const application = await works.apply(
        cooperative,
        member,
        undefined,
        draft.id,
        { version: current.version, note: "참여" },
      );
      const approved = await works.decide(cooperative, op, application.id, {
        state: "approved",
        version: application.version,
        note: "",
      });
      if (started)
        current = await works.save(cooperative, op, draft.id, {
          ...activity,
          state: "active",
          version: current.version,
        });
      await works.save(cooperative, op, draft.id, {
        ...activity,
        state: "ended",
        version: current.version,
      });
      const complete = works.decide(cooperative, op, application.id, {
        state: "completed",
        version: approved.version,
        note: "활동 확인",
      });
      if (started) expect((await complete).state).toBe("completed");
      else await expect(complete).rejects.toMatchObject({ httpStatus: 400 });
    },
  );
  it("opens only the relevant pending queues and keeps full counts separate from a page", async () => {
    const noticeQueue = await get(
      base + "/manage?workFilter=notice-pending",
      op,
    );
    expect(noticeQueue.status).toBe(200);
    expect(noticeQueue.headers["cache-control"]).toBe("private, no-store");
    expect(
      noticeQueue.body.data.work.items.every(
        (item: any) =>
          item.kind === "notice" && item.required && item.state === "published",
      ),
    ).toBe(true);
    const appQueue = await get(
      base + "/manage?workFilter=activity-pending",
      op,
    );
    expect(
      appQueue.body.data.work.items.every(
        (item: any) => item.kind === "activity",
      ),
    ).toBe(true);
    const overdue = await get(base + "/manage?supportFilter=overdue", op);
    expect(
      overdue.body.data.support.items.every(
        (item: any) =>
          item.status === "received" || item.status === "in_review",
      ),
    ).toBe(true);
    expect(
      overdue.body.data.support.items.every(
        (item: any) => item.due_at && Date.parse(item.due_at) < Date.now(),
      ),
    ).toBe(true);
    expect(
      (await get(base + "/manage?workFilter=constructor", op)).status,
    ).toBe(400);
  });
  it("rolls a publication back to its draft when no active recipients remain", async () => {
    const draft = await works.save(business, op, undefined, input);
    await mockDb.query(
      "UPDATE semi_franchise_memberships SET status='suspended' WHERE semi_franchise_id=$1",
      [sf],
    );
    await expect(
      works.save(business, op, draft.id, {
        ...input,
        state: "published",
        version: 1,
      }),
    ).rejects.toMatchObject({ httpStatus: 400 });
    const [row] = await mockDb.query(
      "SELECT state,version FROM cooperation_work_items WHERE id=$1",
      [draft.id],
    );
    expect(row).toEqual({ state: "draft", version: 1 });
    expect((await works.detail(business, draft.id)).revisions).toHaveLength(1);
    await mockDb.query(
      "UPDATE semi_franchise_memberships SET status='active' WHERE semi_franchise_id=$1",
      [sf],
    );
  });
});
