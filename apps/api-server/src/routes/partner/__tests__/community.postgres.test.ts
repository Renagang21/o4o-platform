import express from "express";
import request from "supertest";
import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import { createPartnerCommunityRoutes } from "../community.routes";
import { CreatePartnerCommunity1793020000000 } from "../../../database/migrations/1793020000000-CreatePartnerCommunity";

const url = process.env.PARTNER_TEST_DATABASE_URL;
(url ? describe : describe.skip)(
  "Partner community / opt-in, privacy and live operator authority on isolated PostgreSQL",
  () => {
    let db: DataSource, app: express.Express, boards: any[];
    const schema = `partner_community_it_${randomUUID().replaceAll("-", "")}`;
    const actors = new Set<string>();
    const call = (user?: string) => ({
      get: (path: string) =>
        request(app)
          .get("/community" + path)
          .set("x-test-user", user ?? ""),
      post: (path: string, body: unknown) =>
        request(app)
          .post("/community" + path)
          .set("x-test-user", user ?? "")
          .send(body),
      put: (path: string, body: unknown) =>
        request(app)
          .put("/community" + path)
          .set("x-test-user", user ?? "")
          .send(body),
      patch: (path: string, body: unknown) =>
        request(app)
          .patch("/community" + path)
          .set("x-test-user", user ?? "")
          .send(body),
      delete: (path: string, body: unknown) =>
        request(app)
          .delete("/community" + path)
          .set("x-test-user", user ?? "")
          .send(body),
    });
    const account = async (member = false, operator = false) => {
      const id = randomUUID();
      actors.add(id);
      await db.query(
        `INSERT INTO users(id,nickname) VALUES($1,'테스트 회원')`,
        [id],
      );
      if (member)
        await db.query(
          "INSERT INTO service_memberships(user_id,service_key,status) VALUES($1,'partner-support','active')",
          [id],
        );
      if (operator)
        await db.query(
          "INSERT INTO role_assignments(user_id,role) VALUES($1,'partner-support:operator')",
          [id],
        );
      return id;
    };
    const post = async (
      user: string,
      board = boards.find((b) => !b.operator_only).id,
    ) => {
      const r = await call(user).post("/posts", {
        boardId: board,
        title: "테스트 글",
        body: "회원에게만 제공하는 내용",
      });
      expect(r.status).toBe(201);
      return r.body.data.id as string;
    };
    beforeAll(async () => {
      const target = new URL(url!);
      if (
        !["127.0.0.1", "localhost"].includes(target.hostname) ||
        target.port !== "55439" ||
        target.pathname !== "/partner_test"
      )
        throw new Error("Disposable local Partner database only");
      db = new DataSource({
        type: "postgres",
        url,
        schema,
        extra: { options: `-c search_path=${schema},public` },
        synchronize: false,
      });
      await db.initialize();
      await db.query(`CREATE SCHEMA "${schema}"`);
      await db.query(
        `CREATE TABLE users(id uuid PRIMARY KEY,nickname text,"isActive" boolean DEFAULT true,"isEmailVerified" boolean DEFAULT true,status text DEFAULT 'active')`,
      );
      await db.query(
        `CREATE TABLE service_memberships(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES users(id),service_key text,status text,role text DEFAULT 'member',created_at timestamptz DEFAULT now(),updated_at timestamptz DEFAULT now(),UNIQUE(user_id,service_key))`,
      );
      await db.query(
        `CREATE TABLE role_assignments(user_id uuid REFERENCES users(id),role text,is_active boolean DEFAULT true,valid_from timestamptz DEFAULT now(),valid_until timestamptz)`,
      );
      await db.query(
        `CREATE TABLE platform_services(code text UNIQUE,name text,entry_url text,service_type text,approval_required boolean,status text)`,
      );
      await db.query(
        `CREATE TABLE roles(name text UNIQUE,display_name text,service_key text,role_key text,is_admin_role boolean,is_system boolean,is_active boolean,is_assignable boolean)`,
      );
      await db.query(
        `CREATE TABLE service_policy_documents(id uuid,service_key text,document_type text,version integer,title text,content text,slug text,status text,published_at timestamptz)`,
      );
      await db.query(
        `CREATE TABLE action_logs(service_key text,user_id uuid,action_key text,source text,status text,meta jsonb)`,
      );
      await db.query(
        `CREATE FUNCTION account_erasure_write_fence() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$`,
      );
      const q = db.createQueryRunner();
      await q.connect();
      try {
        await new CreatePartnerCommunity1793020000000().up(q);
        await q.startTransaction();
        await new CreatePartnerCommunity1793020000000().down(q);
        await new CreatePartnerCommunity1793020000000().up(q);
        await q.commitTransaction();
      } finally {
        await q.release();
      }
      boards = await db.query("SELECT * FROM partner_community_boards");
      app = express();
      app.use(
        "/community",
        createPartnerCommunityRoutes(db, (req, res, next) => {
          const id = req.get("x-test-user");
          if (!id || !actors.has(id)) {
            res.status(401).json({ success: false, code: "UNAUTHENTICATED" });
            return;
          }
          Object.assign(req, { user: { id } });
          next();
        }),
      );
    }, 30000);
    afterAll(async () => {
      if (db?.isInitialized) {
        await db.query(`DROP SCHEMA "${schema}" CASCADE`);
        await db.destroy();
      }
    });
    it("distinguishes service Admin from Operator using current membership and role validity", async () => {
      const user = await account(true, true);
      expect((await call(user).get("/membership")).body.data).toMatchObject({operator:true,admin:false});
      await db.query("UPDATE role_assignments SET role='partner-support:admin' WHERE user_id=$1", [user]);
      expect((await call(user).get("/membership")).body.data).toMatchObject({operator:true,admin:true});
      await db.query("UPDATE service_memberships SET status='suspended' WHERE user_id=$1", [user]);
      expect((await call(user).get("/membership")).body.data).toMatchObject({operator:false,admin:false});
    });
    it("exposes board descriptions, never member posts or member lists before login", async () => {
      const r = await call().get("/boards");
      expect(r.status).toBe(200);
      expect(r.body.data).toHaveLength(3);
      expect(Object.keys(r.body.data[0]).sort()).toEqual([
        "description",
        "id",
        "name",
        "operator_only",
        "revision",
      ]);
      expect((await call().get(`/boards/${boards[0].id}/posts`)).status).toBe(
        401,
      );
      expect((await call().get("/operator")).status).toBe(401);
    });
    it("requires a deliberate join, independent of other-service memberships and roles", async () => {
      const user = await account();
      await db.query(
        "INSERT INTO service_memberships(user_id,service_key,status) VALUES($1,'community','active')",
        [user],
      );
      await db.query(
        "INSERT INTO role_assignments(user_id,role) VALUES($1,'community:operator')",
        [user],
      );
      expect((await call(user).get("/membership")).body.data).toEqual({
        status: null,
        operator: false,
        admin: false,
      });
      expect(
        (await call(user).get(`/boards/${boards[0].id}/posts`)).status,
      ).toBe(403);
      expect((await call(user).post("/join", {})).status).toBe(400);
      const joined = await call(user).post("/join", {
        guidelinesAccepted: true,
      });
      expect(joined.status).toBe(200);
      expect(joined.body.data.status).toBe("active");
      expect((await call(user).get("/operator")).status).toBe(403);
      expect(
        (
          await db.query(
            "SELECT * FROM action_logs WHERE user_id=$1 AND service_key='partner-support'",
            [user],
          )
        ).length,
      ).toBe(1);
    });
    it("serializes concurrent joins without duplicate memberships or acceptance events", async () => {
      const user = await account();
      const results = await Promise.all([
        call(user).post("/join", { guidelinesAccepted: true }),
        call(user).post("/join", { guidelinesAccepted: true }),
      ]);
      expect(results.map((r) => r.status)).toEqual([200, 200]);
      expect(
        await db.query(
          "SELECT * FROM service_memberships WHERE user_id=$1 AND service_key='partner-support'",
          [user],
        ),
      ).toHaveLength(1);
    });
    it("does not reactivate a suspended membership through joining", async () => {
      const user = await account(true);
      await db.query(
        "UPDATE service_memberships SET status='suspended' WHERE user_id=$1",
        [user],
      );
      expect(
        (await call(user).post("/join", { guidelinesAccepted: true })).status,
      ).toBe(403);
      expect(
        (await call(user).get(`/boards/${boards[0].id}/posts`)).status,
      ).toBe(403);
    });
    it("requires active verified accounts even when a membership and operator role exist", async () => {
      const user = await account(true, true);
      await db.query('UPDATE users SET "isEmailVerified"=false WHERE id=$1', [
        user,
      ]);
      expect((await call(user).get("/operator")).status).toBe(403);
      expect(
        (await call(user).post("/join", { guidelinesAccepted: true })).status,
      ).toBe(403);
    });
    it("enforces authorship and compare-and-swap revisions, with literal-text content", async () => {
      const a = await account(true),
        b = await account(true),
        id = await post(a);
      expect(
        (
          await call(b).put(`/posts/${id}`, {
            revision: 0,
            title: "변경",
            body: "타인 글 수정",
          })
        ).status,
      ).toBe(403);
      const results = await Promise.all([
        call(a).put(`/posts/${id}`, {
          revision: 0,
          title: "첫 변경",
          body: "<script>text only</script>",
        }),
        call(a).put(`/posts/${id}`, {
          revision: 0,
          title: "동시 변경",
          body: "경합",
        }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      const detail = await call(a).get(`/posts/${id}`);
      expect(detail.body.data.revision).toBe(1);
      expect(detail.body.data).not.toHaveProperty("email");
      expect(
        (await call(b).delete(`/posts/${id}`, { revision: 1 })).status,
      ).toBe(403);
    });
    it("protects notices and blocks every read/write to a stopped board", async () => {
      const a = await account(true),
        op = await account(true, true),
        notice = boards.find((b) => b.operator_only);
      expect(
        (
          await call(a).post("/posts", {
            boardId: notice.id,
            title: "가짜 공지",
            body: "내용",
          })
        ).status,
      ).toBe(403);
      const created = await call(op).post("/operator/boards", {
        name: "테스트 게시판",
        description: "소개",
        operatorOnly: false,
        active: true,
        reason: "운영 준비",
      });
      expect(created.status).toBe(201);
      const id = await post(a, created.body.data.id);
      expect(
        (
          await call(op).put(`/operator/boards/${created.body.data.id}`, {
            name: "테스트 게시판",
            description: "소개",
            operatorOnly: false,
            active: false,
            revision: 0,
            reason: "운영 중지",
          })
        ).status,
      ).toBe(200);
      expect((await call(a).get(`/posts/${id}`)).status).toBe(404);
      expect(
        (await call(a).get(`/boards/${created.body.data.id}/posts`)).status,
      ).toBe(404);
    });
    it("hides content from members and restores it only with current operator authority", async () => {
      const a = await account(true),
        op = await account(true, true),
        id = await post(a);
      expect(
        (
          await call(a).patch(`/operator/posts/${id}`, {
            revision: 0,
            state: "hidden",
            reason: "위조",
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await call(op).patch(`/operator/posts/${id}`, {
            revision: 0,
            state: "hidden",
            reason: "스팸 검토",
          })
        ).status,
      ).toBe(200);
      expect((await call(a).get(`/posts/${id}`)).status).toBe(404);
      expect((await call(op).get(`/operator/posts/${id}`)).body.data.body).toBe(
        "회원에게만 제공하는 내용",
      );
      await db.query(
        "UPDATE role_assignments SET is_active=false WHERE user_id=$1",
        [op],
      );
      expect(
        (
          await call(op).patch(`/operator/posts/${id}`, {
            revision: 1,
            state: "published",
            reason: "복구 시도",
          })
        ).status,
      ).toBe(403);
      await db.query(
        "UPDATE role_assignments SET is_active=true WHERE user_id=$1",
        [op],
      );
      expect(
        (
          await call(op).patch(`/operator/posts/${id}`, {
            revision: 1,
            state: "published",
            reason: "검토 후 복구",
          })
        ).status,
      ).toBe(200);
    });
    it("keeps hidden comment bodies out of member responses and restricts comment edits", async () => {
      const a = await account(true),
        b = await account(true),
        op = await account(true, true),
        id = await post(a);
      const c = await call(b).post(`/posts/${id}/comments`, {
        body: "숨김 대상 댓글",
      });
      expect(c.status).toBe(201);
      expect(
        (
          await call(a).put(`/comments/${c.body.data.id}`, {
            revision: 0,
            body: "타인 댓글",
          })
        ).status,
      ).toBe(403);
      expect(
        (
          await call(op).patch(`/operator/comments/${c.body.data.id}`, {
            revision: 0,
            state: "hidden",
            reason: "노출 중단",
          })
        ).status,
      ).toBe(200);
      const result = await call(a).get(`/posts/${id}`);
      expect(result.body.data.comments[0].body).toBe("");
      expect(result.body.data.comments[0].state).toBe("hidden");
    });
    it("validates report targets, deduplicates reports, and audits operator resolution", async () => {
      const a = await account(true),
        op = await account(true, true),
        id = await post(a),
        other = await post(a);
      const c = await call(a).post(`/posts/${other}/comments`, {
        body: "다른 글의 댓글",
      });
      expect(
        (
          await call(a).post(`/posts/${id}/reports`, {
            reason: "잘못된 연결",
            commentId: c.body.data.id,
          })
        ).status,
      ).toBe(404);
      for (let n = 0; n < 2; n++)
        expect(
          (
            await call(a).post(`/posts/${id}/reports`, {
              reason: "운영 확인 요청",
            })
          ).status,
        ).toBe(201);
      const reports = await db.query(
        "SELECT * FROM partner_community_reports WHERE post_id=$1",
        [id],
      );
      expect(reports).toHaveLength(1);
      expect(
        (
          await call(op).patch(`/operator/reports/${reports[0].id}`, {
            revision: 0,
            resolution: "검토 완료",
          })
        ).status,
      ).toBe(200);
      expect(
        (await call(op).get("/operator")).body.data.events.some(
          (e: any) => e.kind === "report_resolved",
        ),
      ).toBe(true);
    });
    it("rejects concurrent, stale and missing report resolutions without phantom audit events", async () => {
      const a = await account(true),
        op1 = await account(true, true),
        op2 = await account(true, true),
        id = await post(a);
      await call(a).post(`/posts/${id}/reports`, { reason: "경합 확인" });
      const [report] = await db.query(
        "SELECT id FROM partner_community_reports WHERE post_id=$1",
        [id],
      );
      const results = await Promise.all([
        call(op1).patch(`/operator/reports/${report.id}`, {
          revision: 0,
          resolution: "첫 운영자 처리",
        }),
        call(op2).patch(`/operator/reports/${report.id}`, {
          revision: 0,
          resolution: "다른 운영자 처리",
        }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 409]);
      expect(
        (
          await call(op1).patch(`/operator/reports/${report.id}`, {
            revision: 0,
            resolution: "과거 revision 재시도",
          })
        ).status,
      ).toBe(409);
      expect(
        (
          await call(op1).patch(`/operator/reports/${randomUUID()}`, {
            revision: 0,
            resolution: "존재하지 않는 신고",
          })
        ).status,
      ).toBe(409);
      expect(
        await db.query(
          "SELECT id FROM partner_community_events WHERE kind='report_resolved' AND target_id=$1",
          [report.id],
        ),
      ).toHaveLength(1);
    });
    it("enforces member status changes immediately and rejects stale/self actions", async () => {
      const a = await account(true),
        op = await account(true, true),
        id = await post(a);
      const [member] = await db.query(
        `SELECT to_char(updated_at,'YYYY-MM-DD"T"HH24:MI:SS.US') version FROM service_memberships WHERE user_id=$1`,
        [a],
      );
      const input = {
        status: "suspended",
        reason: "운영 검토",
        expectedVersion: member.version,
      };
      expect(
        (await call(op).patch(`/operator/members/${a}`, input)).status,
      ).toBe(200);
      expect((await call(a).get(`/posts/${id}`)).status).toBe(403);
      expect(
        (
          await call(op).patch(`/operator/members/${a}`, {
            ...input,
            status: "active",
          })
        ).status,
      ).toBe(409);
      expect(
        (await call(op).patch(`/operator/members/${op}`, input)).status,
      ).toBe(403);
    });
    it("refuses rollback once community data exists and leaves posts intact", async () => {
      const user = await account(true),
        id = await post(user),
        q = db.createQueryRunner();
      await q.connect();
      await q.startTransaction();
      try {
        await expect(
          new CreatePartnerCommunity1793020000000().down(q),
        ).rejects.toThrow("PARTNER_COMMUNITY_IN_USE");
      } finally {
        await q.rollbackTransaction();
        await q.release();
      }
      expect((await call(user).get(`/posts/${id}`)).status).toBe(200);
    });
    it("registers erasure write fences for all new tables", async () => {
      const rows = await db.query(
        `SELECT c.relname FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND t.tgname='account_erasure_write_fence' AND t.tgenabled='O'`,
        [schema],
      );
      expect(rows).toHaveLength(5);
    });
  },
);
