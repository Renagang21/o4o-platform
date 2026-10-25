/** Loopback-only test harness. It does NOT verify the production authentication middleware. */
import express, { type RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import { createPartnerSupportRoutes } from "../partner.routes.js";
import { CreatePartnerSupportSpaces1792886600000 } from "../../../database/migrations/1792886600000-CreatePartnerSupportSpaces.js";
import { AddPartnerMediaAndReadState1792886700000 } from "../../../database/migrations/1792886700000-AddPartnerMediaAndReadState.js";
import { DiskMediaStore } from "../partner.media.js";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

async function main() {
  const target = new URL(process.env.PARTNER_TEST_DATABASE_URL || "");
  if (
    process.env.NODE_ENV !== "test" ||
    !["localhost", "127.0.0.1"].includes(target.hostname) ||
    target.port !== "55439" ||
    target.pathname !== "/partner_test"
  )
    throw new Error("Disposable local Partner test database required");
  const schema = `partner_browser_${randomUUID().replaceAll("-", "")}`;
  const db = new DataSource({
    type: "postgres",
    url: target.href,
    extra: { options: `-c search_path=${schema}` },
    synchronize: false,
  });
  await db.initialize();
  const mediaRoot = await mkdtemp(join(tmpdir(), "partner-media-browser-"));
  await db.query(`CREATE SCHEMA "${schema}"`);
  const actors = {
    owner: { id: randomUUID(), name: "테스트 사업자" },
    editor: { id: randomUUID(), name: "테스트 홍보자" },
    viewer: { id: randomUUID(), name: "테스트 열람자" },
  };
  try {
    // Isolated auth/storage harness: the real privacy fence is verified by canonical migration checks.
    await db.query(`CREATE FUNCTION account_erasure_write_fence() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$`);
    await db.query(
      "CREATE TABLE users(id uuid PRIMARY KEY,name text NOT NULL)",
    );
    for (const actor of Object.values(actors))
      await db.query("INSERT INTO users(id,name) VALUES($1,$2)", [
        actor.id,
        actor.name,
      ]);
    const q = db.createQueryRunner();
    await q.connect();
    try {
      await new CreatePartnerSupportSpaces1792886600000().up(q);
      await new AddPartnerMediaAndReadState1792886700000().up(q);
    } finally {
      await q.release();
    }
    const app = express();
    app.use((req, res, next) => {
      const origin = req.get("origin");
      if (
        origin &&
        !["http://127.0.0.1:3011", "http://localhost:3011"].includes(origin)
      ) {
        res.status(403).end();
        return;
      }
      if (origin) res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader(
        "Access-Control-Allow-Headers",
        "Content-Type,X-Requested-With",
      );
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,DELETE,OPTIONS",
      );
      if (req.method === "OPTIONS") {
        res.status(204).end();
        return;
      }
      next();
    });
    const requireTestIdentity: RequestHandler = (req, res, next) => {
      const key = req.headers.cookie?.match(
        /(?:^|;\s*)partner_test_actor=(owner|editor|viewer)(?:;|$)/,
      )?.[1] as keyof typeof actors;
      const user = actors[key];
      if (!user) {
        res.status(401).json({ success: false, code: "UNAUTHENTICATED" });
        return;
      }
      Object.assign(req, { user });
      next();
    };
    app.get("/api/v1/auth/me", requireTestIdentity, (req, res) =>
      res.json({
        success: true,
        data: { user: (req as unknown as { user: unknown }).user },
      }),
    );
    app.use(
      "/api/v1/partner-support",
      createPartnerSupportRoutes(
        db,
        requireTestIdentity,
        new DiskMediaStore(mediaRoot),
      ),
    );
    const server = app.listen(3012, "127.0.0.1", () =>
      console.log("PARTNER_TEST_HARNESS_READY"),
    );
    let closing = false;
    const close = async () => {
      if (closing) return;
      closing = true;
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
      await db.query(`DROP SCHEMA "${schema}" CASCADE`);
      await db.destroy();
      await rm(mediaRoot, { recursive: true, force: true });
      process.exit(0);
    };
    process.once("SIGINT", () => void close());
    process.once("SIGTERM", () => void close());
  } catch (e) {
    await db.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await db.destroy();
    await rm(mediaRoot, { recursive: true, force: true });
    throw e;
  }
}
void main();
