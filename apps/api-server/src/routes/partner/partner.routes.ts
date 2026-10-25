import { Router, json, type RequestHandler } from "express";
import type { DataSource } from "typeorm";
import rateLimit from "express-rate-limit";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { PartnerError, PartnerService } from "./partner.service.js";
import {
  createSpaceSchema,
  inviteSchema,
  joinSchema,
  saveSchema,
  uuidSchema,
} from "./partner.schema.js";

export function createPartnerSupportRoutes(
  db: DataSource,
  requireAuth: RequestHandler,
): Router {
  const router = Router(),
    service = new PartnerService(db);
  router.use(requireAuth, json({ limit: "1mb" }));
  router.use(
    rateLimit({
      windowMs: 60000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
      keyGenerator: (req) => (req as AuthRequest).user?.id || "unauthenticated",
      handler: (_req, res) => {
        res.status(429).json({ success: false, code: "RATE_LIMITED" });
      },
    }),
  );
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  router.use((req, res, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      req.get("Content-Type")?.split(";")[0].trim().toLowerCase() !==
        "application/json"
    ) {
      res.status(415).json({ success: false, code: "JSON_REQUIRED" });
      return;
    }
    if (
      req.body &&
      Buffer.byteLength(JSON.stringify(req.body), "utf8") > 1024 * 1024
    ) {
      res.status(413).json({ success: false, code: "PAYLOAD_TOO_LARGE" });
      return;
    }
    next();
  });
  const handle =
    (
      fn: (
        userId: string,
        req: Parameters<RequestHandler>[0],
      ) => Promise<unknown>,
      status = 200,
    ): RequestHandler =>
    async (req, res) => {
      const userId = (req as AuthRequest).user?.id;
      if (!userId) {
        res.status(401).json({ success: false, code: "UNAUTHENTICATED" });
        return;
      }
      try {
        for (const key of ["id", "memberId", "inviteId"])
          if (req.params[key]) uuidSchema.parse(req.params[key]);
        const data = await fn(userId, req);
        res.status(status).json({ success: true, data });
      } catch (error) {
        if (error instanceof PartnerError) {
          res.status(error.status).json({ success: false, code: error.code });
          return;
        }
        if (
          error &&
          typeof error === "object" &&
          "name" in error &&
          error.name === "ZodError"
        ) {
          res.status(400).json({ success: false, code: "INVALID_INPUT" });
          return;
        }
        // Do not expose SQL, invitation tokens, content, credentials or driver messages.
        res.status(503).json({ success: false, code: "PARTNER_UNAVAILABLE" });
      }
    };
  router.get(
    "/spaces",
    handle((user) => service.list(user)),
  );
  router.post(
    "/spaces",
    handle(
      (user, req) =>
        service.create(user, createSpaceSchema.parse(req.body).name),
      201,
    ),
  );
  router.post(
    "/join",
    handle((user, req) => service.join(user, joinSchema.parse(req.body).token)),
  );
  router.get(
    "/spaces/:id",
    handle((user, req) => service.get(user, req.params.id)),
  );
  router.put(
    "/spaces/:id",
    handle((user, req) => {
      const body = saveSchema.parse(req.body);
      return service.save(user, req.params.id, body.revision, body.workspace);
    }),
  );
  router.get(
    "/spaces/:id/members",
    handle((user, req) => service.members(user, req.params.id)),
  );
  router.delete(
    "/spaces/:id/members/:memberId",
    handle((user, req) =>
      service.removeMember(user, req.params.id, req.params.memberId),
    ),
  );
  router.get(
    "/spaces/:id/invites",
    handle((user, req) => service.invites(user, req.params.id)),
  );
  router.post(
    "/spaces/:id/invites",
    handle(
      (user, req) =>
        service.invite(user, req.params.id, inviteSchema.parse(req.body).role),
      201,
    ),
  );
  router.delete(
    "/spaces/:id/invites/:inviteId",
    handle((user, req) =>
      service.revoke(user, req.params.id, req.params.inviteId),
    ),
  );
  router.get(
    "/spaces/:id/events",
    handle((user, req) => service.events(user, req.params.id)),
  );
  return router;
}
