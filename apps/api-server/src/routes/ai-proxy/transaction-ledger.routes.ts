import { Router } from "express";
import { z } from "zod";
import type { DataSource } from "typeorm";
import { authenticate } from "../../middleware/auth.middleware.js";
import type { AuthRequest } from "../../types/auth.js";
import { StoreAdapter } from "../../modules/external-ai/adapters/store.adapter.js";
import { PhotoLedgerService } from "../../services/transaction-ledger/ledger.service.js";
import { LedgerError } from "../../services/transaction-ledger/contracts.js";
import { WorkDataService } from "../../services/work-data/work-data.service.js";
export function createTransactionLedgerRouter(
  db: DataSource,
  webOrigin = new URL(
    process.env.EXTERNAL_AI_WEB_ORIGIN ?? "https://neture.co.kr",
  ),
) {
  const router = Router(),
    service = new PhotoLedgerService(db, webOrigin);
  router.use(authenticate, (_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });
  router.use((req, res, next) => {
    if (req.method !== "GET" && req.get("origin") !== webOrigin.origin) {
      res.status(403).json({ success: false, code: "LEDGER_ORIGIN_FORBIDDEN" });
      return;
    }
    next();
  });
  const run =
    (fn: (req: AuthRequest) => Promise<unknown>) => async (req, res) => {
      try {
        res.json({ success: true, data: await fn(req) });
      } catch (e) {
        const known =
          e instanceof LedgerError ||
          e instanceof z.ZodError ||
          typeof e?.code === "string";
        res
          .status(
            e instanceof z.ZodError ? 400 : known ? (e.status ?? 400) : 503,
          )
          .json({
            success: false,
            code:
              e instanceof z.ZodError
                ? "LEDGER_INPUT_INVALID"
                : known
                  ? e.code
                  : "LEDGER_UNAVAILABLE",
            error:
              "매장 권한·서버 보관 동의·입력 내용과 최신 상태를 확인해 주세요.",
          });
      }
    };
  const org = (req: AuthRequest) =>
    z
      .string()
      .uuid()
      .parse(req.query.organizationId ?? req.body?.organizationId);
  const id = (req: AuthRequest) => z.string().uuid().parse(req.params.id);
  router.get(
    "/workspaces",
    run(async (req) => ({
      items: await new StoreAdapter(db).workspaces(req.user.id),
    })),
  );
  router.post(
    "/storage",
    run(async (req) => {
      const organizationId = org(req);
      await new StoreAdapter(db).authorize(req.user.id, organizationId, true);
      if (req.body?.serverStorageConsent !== true)
        throw new LedgerError("LEDGER_SERVER_STORAGE_CONSENT_REQUIRED");
      return new WorkDataService(db).setConsent(
        req.user.id,
        { key: "organization:" + organizationId, userId: null, organizationId },
        true,
      );
    }),
  );
  router.get(
    "/",
    run((req) =>
      service.list(
        req.user.id,
        org(req),
        req.query.after === undefined
          ? undefined
          : z.string().uuid().parse(req.query.after),
      ),
    ),
  );
  router.get(
    "/:id",
    run((req) => service.get(req.user.id, org(req), id(req))),
  );
  router.post(
    "/prepare",
    run((req) =>
      service.prepare(
        req.user.id,
        req.body?.input,
        "o4o_chat",
        Array.isArray(req.body?.images) ? req.body.images : [],
      ),
    ),
  );
  router.post(
    "/:id/confirm",
    run((req) =>
      service.confirm(req.user.id, org(req), id(req), req.body?.confirmation),
    ),
  );
  router.get("/:id/images/:page", async (req, res) => {
    try {
      const image = await service.image(
        (req as AuthRequest).user.id,
        org(req as AuthRequest),
        id(req as AuthRequest),
        z.coerce.number().int().min(1).parse(req.params.page),
        z.coerce.number().int().positive().parse(req.query.version),
      );
      res.type(image.mime_type).setHeader("X-Content-Type-Options", "nosniff");
      res.send(image.image_bytes);
    } catch {
      res.status(404).end();
    }
  });
  return router;
}
