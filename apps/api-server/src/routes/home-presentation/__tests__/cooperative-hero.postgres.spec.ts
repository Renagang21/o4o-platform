/** Local throwaway schema: actual cooperative/federation policy + actual CMS save + HTTP routes. */
import { randomUUID } from "node:crypto";
import express from "express";
import request from "supertest";
import { DataSource } from "typeorm";
import { initialHomePresentation } from "@o4o/types";
import { CANONICAL_SCHEMA_BASELINE_STATEMENTS } from "../../../database/bootstrap/canonical-schema-baseline.js";
jest.mock("../../../middleware/auth.middleware.js", () => ({
  requireAuth: (req: any, res: any, next: any) => {
    const id = req.headers["x-test-user"];
    if (!id) return res.sendStatus(401);
    req.user = { id };
    next();
  },
}));
import { createHomePresentationRoutes } from "../home-presentation.routes.js";
const integration =
  process.env.O4O_HOME_PRESENTATION_PG_TEST === "1" ? describe : describe.skip;
integration(
  "cooperative Hero actual role boundaries on isolated PostgreSQL",
  () => {
    const schema = `coop_hero_${randomUUID().replaceAll("-", "")}`;
    const local = randomUUID(),
      fed = randomUUID(),
      outsider = randomUUID();
    const coop = randomUUID(),
      otherCoop = randomUUID(),
      business = randomUUID(),
      otherBusiness = randomUUID(),
      org = randomUUID(),
      otherOrg = randomUUID();
    let db: DataSource, app: express.Express;
    beforeAll(async () => {
      db = new DataSource({
        type: "postgres",
        host: "127.0.0.1",
        port: 55432,
        username: "postgres",
        password: process.env.O4O_HOME_PRESENTATION_PG_PASSWORD,
        database: "o4o_home_presentation_test",
        synchronize: false,
        extra: { options: `-c search_path=${schema}` },
      });
      await db.initialize();
      await db.query(`CREATE SCHEMA "${schema}"`);
      await db.query(`CREATE TABLE users(id uuid PRIMARY KEY,status text,"isActive" boolean,"isEmailVerified" boolean);
      CREATE TABLE service_memberships(user_id uuid,service_key text,status text);
      CREATE TABLE role_assignments(user_id uuid,role text,is_active boolean,valid_from timestamptz,valid_until timestamptz);
      CREATE TABLE semi_franchises(id uuid PRIMARY KEY,organization_id uuid,status text);
      CREATE TABLE cooperatives(id uuid PRIMARY KEY,semi_franchise_id uuid,slug text,status text);
      CREATE TABLE cooperative_roles(user_id uuid,cooperative_id uuid,role text,revoked_at timestamptz);`);
      const cms = CANONICAL_SCHEMA_BASELINE_STATEMENTS.find((sql) =>
        sql.startsWith("CREATE TABLE public.cms_contents ("),
      )!;
      await db.query(cms.replace("public.cms_contents", "cms_contents"));
      for (const id of [local, fed, outsider])
        await db.query(`INSERT INTO users VALUES($1,'active',true,true)`, [id]);
      await db.query(
        `INSERT INTO semi_franchises VALUES($1,$2,'active'),($3,$4,'active')`,
        [business, org, otherBusiness, otherOrg],
      );
      await db.query(
        `INSERT INTO cooperatives VALUES($1,$2,'alpha','active'),($3,$4,'beta','active')`,
        [coop, business, otherCoop, otherBusiness],
      );
      await db.query(
        `INSERT INTO cooperative_roles VALUES($1,$2,'operator',null)`,
        [local, coop],
      );
      await db.query(
        `INSERT INTO role_assignments(user_id,role,is_active) VALUES($1,'neture:pharmcoop_operator',true),($2,'neture:operator',true)`,
        [fed, outsider],
      );
      app = express();
      app.use(express.json());
      app.use("/home", createHomePresentationRoutes(db));
    });
    beforeEach(async () => {
      await db.query("TRUNCATE cms_contents");
      await db.query(
        `UPDATE cooperative_roles SET revoked_at=null; UPDATE cooperatives SET status='active'; UPDATE users SET "isActive"=true; UPDATE role_assignments SET is_active=true`,
      );
    });
    afterAll(async () => {
      if (db?.isInitialized) {
        await db.query(`DROP SCHEMA "${schema}" CASCADE`);
        await db.destroy();
      }
    });
    const save = (path: string, id: string, publish = true) =>
      request(app)
        .put(`/home/${path}/manage`)
        .set("x-test-user", id)
        .send({
          config: initialHomePresentation(
            path === "pharmcoop" ? "pharmcoop" : "cooperative",
          ),
          revision: 0,
          publish,
          organizationId: otherOrg,
          surface: "neture",
        });
    it("local operator without Neture role/membership can publish only alpha, not beta or federation", async () => {
      expect((await save("cooperative/alpha", local)).status).toBe(200);
      expect((await save("cooperative/beta", local)).status).toBe(403);
      expect((await save("pharmcoop", local)).status).toBe(403);
      const rows = await db.query(
        'SELECT "organizationId", metadata FROM cms_contents',
      );
      expect(rows).toHaveLength(1);
      expect(rows[0].organizationId).toBe(org);
      expect(rows[0].metadata.surface).toBe("cooperative");
    });
    it("federation operator can publish federation but cannot edit any local cooperative", async () => {
      expect((await save("pharmcoop", fed)).status).toBe(200);
      expect((await save("cooperative/alpha", fed)).status).toBe(403);
      expect((await save("cooperative/alpha", outsider)).status).toBe(403);
    });
    it("public reads expose a published snapshot but never drafts", async () => {
      expect((await save("cooperative/alpha", local, false)).status).toBe(200);
      expect(
        (await request(app).get("/home/cooperative/alpha")).body.data,
      ).toBeNull();
      const config = initialHomePresentation("cooperative");
      config.slides[0].title = "alpha 게시 소식";
      expect(
        (
          await request(app)
            .put("/home/cooperative/alpha/manage")
            .set("x-test-user", local)
            .send({ config, revision: 1, publish: true })
        ).status,
      ).toBe(200);
      expect(
        (await request(app).get("/home/cooperative/alpha")).body.data.slides[0]
          .title,
      ).toBe("alpha 게시 소식");
      expect(
        (await request(app).get("/home/cooperative/beta")).body.data,
      ).toBeNull();
    });
    it("role revocation, inactive account, and inactive cooperative take effect immediately", async () => {
      await db.query("UPDATE cooperative_roles SET revoked_at=NOW()");
      expect((await save("cooperative/alpha", local)).status).toBe(403);
      await db.query("UPDATE cooperative_roles SET revoked_at=null");
      await db.query('UPDATE users SET "isActive"=false WHERE id=$1', [local]);
      expect((await save("cooperative/alpha", local)).status).toBe(403);
      await db.query('UPDATE users SET "isActive"=true WHERE id=$1', [local]);
      await db.query("UPDATE cooperatives SET status='suspended' WHERE id=$1", [
        coop,
      ]);
      expect((await save("cooperative/alpha", local)).status).toBe(404);
      expect((await request(app).get("/home/cooperative/alpha")).status).toBe(
        404,
      );
      expect(await db.query("SELECT id FROM cms_contents")).toEqual([]);
    });
    it("revoked federation role and anonymous requests cannot manage a Hero", async () => {
      await db.query("UPDATE role_assignments SET is_active=false");
      expect((await save("pharmcoop", fed)).status).toBe(403);
      expect(
        (await request(app).get("/home/cooperative/alpha/manage")).status,
      ).toBe(401);
      expect((await request(app).get("/home/pharmcoop/manage")).status).toBe(
        401,
      );
    });
  },
);
