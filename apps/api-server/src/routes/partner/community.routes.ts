import { Router, json, type RequestHandler } from "express";
import rateLimit from "express-rate-limit";
import type { DataSource } from "typeorm";
import { z } from "zod";
import type { AuthRequest } from "../../middleware/auth.middleware.js";
import { PartnerCommunityService } from "./community.service.js";
import { PartnerError } from "./partner.service.js";
import { PolicyAcceptanceError } from "../../modules/policy-acceptance/policy-acceptance.service.js";
import { getEnrollmentPolicies } from "../../modules/policy-acceptance/service-enrollment-policy.service.js";

const uuid = z.string().uuid();
const revision = z.number().int().min(0);
const text = (max: number) => z.string().trim().min(1).max(max);
const postInput = z
  .object({ boardId: uuid, title: text(200), body: text(20000) })
  .strict();
const reason = text(1000);
const boardInput = z
  .object({
    name: text(80),
    description: z.string().trim().max(500),
    operatorOnly: z.boolean(),
    active: z.boolean(),
    revision: revision.optional(),
    reason,
  })
  .strict();
const moderation = z
  .object({
    revision,
    state: z.enum(["published", "hidden"]),
    reason,
    pinned: z.boolean().optional(),
  })
  .strict();

export function createPartnerCommunityRoutes(
  db: DataSource,
  requireAuth: RequestHandler,
): Router {
  const router = Router(),
    service = new PartnerCommunityService(db);
  router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
  });
  const handle =
    (
      fn: (id: string, req: AuthRequest) => Promise<unknown>,
      status = 200,
    ): RequestHandler =>
    async (req, res, next) => {
      try {
        res.status(status).json({
          success: true,
          data: await fn(
            (req as AuthRequest).user?.id ?? "",
            req as AuthRequest,
          ),
        });
      } catch (e) {
        if (e instanceof z.ZodError) {
          res.status(400).json({ success: false, code: "INVALID_INPUT" });
          return;
        }
        if (e instanceof PartnerError) {
          res.status(e.status).json({ success: false, code: e.code });
          return;
        }
        if (e instanceof PolicyAcceptanceError) {
          res.status(e.httpStatus).json({ success: false, code: e.code });
          return;
        }
        if (["42P01", "42703"].includes((e as { code?: string })?.code ?? "")) {
          res.status(503).json({ success: false, code: "PARTNER_UNAVAILABLE" });
          return;
        }
        next(e);
      }
    };
  router.get(
    "/boards",
    rateLimit({ windowMs: 60000, max: 120 }),
    handle(() => service.boards()),
  );
  router.get(
    "/policies",
    rateLimit({ windowMs: 60000, max: 120 }),
    handle(() => getEnrollmentPolicies(db.manager, "partner-support")),
  );
  router.use(requireAuth);
  router.use(
    rateLimit({
      windowMs: 60000,
      max: 90,
      keyGenerator: (req) => (req as AuthRequest).user!.id,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );
  router.use((req, res, next) => {
    if (
      !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
      !req.is("application/json")
    ) {
      res.status(415).json({ success: false, code: "JSON_REQUIRED" });
      return;
    }
    next();
  });
  router.use(json({ limit: "64kb" }));
  router.param("id", (_req, res, next, id) => {
    if (!uuid.safeParse(id).success) {
      res.status(400).json({ success: false, code: "INVALID_INPUT" });
      return;
    }
    next();
  });
  router.get(
    "/membership",
    handle((id) => service.status(id)),
  );
  router.post(
    "/join",
    handle((id, req) => {
      const input = z
        .object({
          guidelinesAccepted: z.literal(true),
          policies: z
            .array(
              z
                .object({
                  documentType: z.enum(["terms", "privacy"]),
                  version: z.number().int().positive(),
                  policyDocumentId: uuid,
                })
                .passthrough(),
            )
            .optional(),
        })
        .strict()
        .parse(req.body);
      return service.join(
        id,
        input.policies?.map((p) => ({
          documentType: p.documentType,
          policyDocumentId: p.policyDocumentId,
          version: p.version,
        })),
      );
    }),
  );
  router.get(
    "/boards/:id/posts",
    handle((id, req) => {
      const q = z
        .object({
          q: z.string().trim().max(100).default(""),
          page: z.coerce.number().int().min(1).max(10000).default(1),
        })
        .strict()
        .parse(req.query);
      return service.list(id, req.params.id, q.q, q.page);
    }),
  );
  router.get(
    "/posts/:id",
    handle((id, req) => service.detail(id, req.params.id)),
  );
  router.post(
    "/posts",
    handle(
      (id, req) =>
        service.writePost(
          id,
          postInput.parse(req.body) as Parameters<
            PartnerCommunityService["writePost"]
          >[1],
        ),
      201,
    ),
  );
  router.put(
    "/posts/:id",
    handle((id, req) =>
      service.editPost(
        id,
        req.params.id,
        z
          .object({ revision, title: text(200), body: text(20000) })
          .strict()
          .parse(req.body) as Parameters<
          PartnerCommunityService["editPost"]
        >[2],
      ),
    ),
  );
  router.delete(
    "/posts/:id",
    handle((id, req) =>
      service.removePost(
        id,
        req.params.id,
        z.object({ revision }).strict().parse(req.body).revision,
      ),
    ),
  );
  router.post(
    "/posts/:id/comments",
    handle(
      (id, req) =>
        service.comment(
          id,
          req.params.id,
          z
            .object({ body: text(4000) })
            .strict()
            .parse(req.body).body,
        ),
      201,
    ),
  );
  router.put(
    "/comments/:id",
    handle((id, req) => {
      const input = z
        .object({ revision, body: text(4000) })
        .strict()
        .parse(req.body);
      return service.editComment(id, req.params.id, input.revision, input.body);
    }),
  );
  router.delete(
    "/comments/:id",
    handle((id, req) =>
      service.editComment(
        id,
        req.params.id,
        z.object({ revision }).strict().parse(req.body).revision,
        null,
      ),
    ),
  );
  router.post(
    "/posts/:id/reports",
    handle((id, req) => {
      const input = z
        .object({ reason, commentId: uuid.optional() })
        .strict()
        .parse(req.body);
      return service.report(id, req.params.id, input.commentId, input.reason);
    }, 201),
  );
  router.get(
    "/operator",
    handle((id) => service.operatorOverview(id)),
  );
  router.get(
    "/operator/posts/:id",
    handle((id, req) => service.detail(id, req.params.id, true)),
  );
  router.post(
    "/operator/boards",
    handle(
      (id, req) =>
        service.saveBoard(
          id,
          undefined,
          boardInput.parse(req.body) as Parameters<
            PartnerCommunityService["saveBoard"]
          >[2],
        ),
      201,
    ),
  );
  router.put(
    "/operator/boards/:id",
    handle((id, req) =>
      service.saveBoard(
        id,
        req.params.id,
        boardInput.required({ revision: true }).parse(req.body) as Parameters<
          PartnerCommunityService["saveBoard"]
        >[2],
      ),
    ),
  );
  router.patch(
    "/operator/posts/:id",
    handle((id, req) =>
      service.moderate(
        id,
        "post",
        req.params.id,
        moderation.parse(req.body) as Parameters<
          PartnerCommunityService["moderate"]
        >[3],
      ),
    ),
  );
  router.patch(
    "/operator/comments/:id",
    handle((id, req) =>
      service.moderate(
        id,
        "comment",
        req.params.id,
        moderation.omit({ pinned: true }).parse(req.body) as Parameters<
          PartnerCommunityService["moderate"]
        >[3],
      ),
    ),
  );
  router.patch(
    "/operator/members/:id",
    handle((id, req) => {
      const input = z
        .object({
          status: z.enum(["active", "suspended"]),
          reason,
          expectedVersion: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}$/),
        })
        .strict()
        .parse(req.body);
      return service.setMember(
        id,
        req.params.id,
        input.status,
        input.reason,
        input.expectedVersion,
      );
    }),
  );
  router.patch(
    "/operator/reports/:id",
    handle((id, req) => {
      const input = z
        .object({ revision, resolution: reason })
        .strict()
        .parse(req.body);
      return service.resolveReport(
        id,
        req.params.id,
        input.revision,
        input.resolution,
      );
    }),
  );
  return router;
}
