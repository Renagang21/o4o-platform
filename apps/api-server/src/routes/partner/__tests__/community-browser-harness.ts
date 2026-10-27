import "reflect-metadata";
/** Loopback-only test identity adapter. No production credentials, debug route or external services. */
import express from "express";
import { randomUUID } from "node:crypto";
import { DataSource } from "typeorm";
import { createPartnerSupportRoutes } from "../partner.routes.js";

async function main() {
  const raw = process.env.PARTNER_SCHEMA_TEST_DATABASE_URL ?? "",
    url = new URL(raw);
  if (
    process.env.NODE_ENV !== "test" ||
    !["localhost", "127.0.0.1"].includes(url.hostname) ||
    url.port !== "55439" ||
    url.pathname !== "/partner_schema_test"
  )
    throw new Error("Disposable local Partner canonical database only");
  const db = new DataSource({ type: "postgres", url: raw, synchronize: false });
  await db.initialize();
  const actors = {
    operator: { id: randomUUID(), name: "테스트 운영자" },
    member: { id: randomUUID(), name: "테스트 회원" },
    other: { id: randomUUID(), name: "테스트 다른 회원" },
  };
  for (const [key, a] of Object.entries(actors))
    await db.query(
      `INSERT INTO users(id,email,name,nickname,"isActive","isEmailVerified",status) VALUES($1,$2,$3,$3,true,true,'active')`,
      [a.id, `${a.id}@example.invalid`, a.name],
    );
  await db.query(
    "INSERT INTO service_memberships(user_id,service_key,status,role) VALUES($1,'partner-support','active','operator')",
    [actors.operator.id],
  );
  await db.query(
    "INSERT INTO role_assignments(user_id,role) VALUES($1,'partner-support:operator')",
    [actors.operator.id],
  );
  const app = express();
  const identity: express.RequestHandler = (req, res, next) => {
    const key = req.headers.cookie?.match(
      /(?:^|;\s*)partner_community_actor=(operator|member|other)(?:;|$)/,
    )?.[1] as keyof typeof actors;
    const actor = actors[key];
    if (!actor) {
      res.status(401).json({ success: false, code: "UNAUTHENTICATED" });
      return;
    }
    Object.assign(req, { user: actor });
    next();
  };
  app.get("/api/v1/auth/me", identity, (req, res) =>
    res.json({
      success: true,
      data: { user: (req as unknown as { user: unknown }).user },
    }),
  );
  app.post("/api/v1/auth/refresh", (_req, res) =>
    res.status(401).json({ success: false, code: "UNAUTHENTICATED" }),
  );
  app.post("/api/v1/auth/email/login", express.json(), (req, res) => {
    const key = String(req.body.email).split("@")[0] as keyof typeof actors;
    if (!actors[key]) {
      res.status(401).json({ success: false, code: "UNAUTHENTICATED" });
      return;
    }
    res.cookie("partner_community_actor", key, {
      httpOnly: true,
      sameSite: "lax",
    });
    res.json({ success: true, data: {} });
  });
  app.post("/api/v1/auth/logout", (_req, res) => {
    res.clearCookie("partner_community_actor");
    res.json({ success: true, data: {} });
  });
  app.use("/api/v1/partner-support", createPartnerSupportRoutes(db, identity));
  const server = app.listen(3002, "127.0.0.1", () =>
    process.stdout.write("PARTNER_COMMUNITY_BROWSER_HARNESS_READY\n"),
  );
  const stop = () =>
    server.close(() => {
      void db.destroy().finally(() => process.exit(0));
    });
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}
main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
