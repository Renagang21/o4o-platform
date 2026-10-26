import {
  Router,
  type Request,
  type Response,
  type NextFunction,
  type RequestHandler,
} from "express";
import type { DataSource } from "typeorm";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.middleware.js";
import type { AuthRequest } from "../../types/auth.js";
import { createBrowserWriteGuard } from "../external-ai/auth/browser-write.middleware.js";
import {
  MailAccountService,
  type ProviderFactory,
  defaultProvider,
} from "./accounts.js";
import { MailJobService, type ProposalInput } from "./jobs.js";
import { mailReady, gmailConfig, mailBrowserOrigins } from "./config.js";
import {
  uuid,
  selectionSchema,
  ruleSchema,
  MailError,
  publicMailError,
  senderSchema,
} from "./contracts.js";

type Handler = (
  req: Request,
  res: Response,
  userId: string,
) => Promise<unknown>;
const run =
  (handler: Handler) => (req: Request, res: Response, next: NextFunction) => {
    const userId = (req as AuthRequest).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, code: "AUTH_REQUIRED" });
      return;
    }
    void handler(req, res, userId).catch(next);
  };
const parseAccount = (req: Request) => uuid.parse(req.params.accountId);
export function createPersonalMailRoutes(
  db: DataSource,
  factory: ProviderFactory = defaultProvider,
  authenticate: RequestHandler = requireAuth,
) {
  const router = Router(),
    accounts = new MailAccountService(db, factory),
    jobs = new MailJobService(db);
  router.use(authenticate, createBrowserWriteGuard(mailBrowserOrigins()));
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });
  router.get(
    "/status",
    run(async (_req, res) => {
      let gmail = false;
      try {
        gmailConfig();
        gmail = true;
      } catch {
        /* Unconfigured provider is unavailable, not a login failure. */
      }
      res.json({
        success: true,
        data: {
          enabled: mailReady(),
          gmailConfigured: gmail && mailReady(),
          naverConfigured: mailReady(),
        },
      });
    }),
  );
  router.get(
    "/accounts",
    run(async (_req, res, user) =>
      res.json({ success: true, data: await accounts.list(user) }),
    ),
  );
  router.post(
    "/gmail/start",
    run(async (_req, res, user) =>
      res.json({ success: true, data: await accounts.gmailStart(user) }),
    ),
  );
  router.post(
    "/gmail/complete",
    run(async (req, res, user) => {
      const input = z
        .object({
          state: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
          code: z.string().min(1).max(4096),
        })
        .strict()
        .parse(req.body);
      res.json({
        success: true,
        data: await accounts.gmailComplete(user, input.state, input.code),
      });
    }),
  );
  router.post(
    "/naver",
    run(async (req, res, user) => {
      const input = z
        .object({ address: senderSchema, password: z.string().min(8).max(256) })
        .strict()
        .parse(req.body);
      res.json({
        success: true,
        data: await accounts.naverConnect(user, input.address, input.password),
      });
    }),
  );
  router.delete(
    "/accounts/:accountId",
    run(async (req, res, user) =>
      res.json({
        success: true,
        data: await accounts.disconnect(user, parseAccount(req)),
      }),
    ),
  );
  router.post(
    "/accounts/:accountId/sync",
    run(async (req, res, user) =>
      res.json({
        success: true,
        data: await accounts.requestSync(user, parseAccount(req)),
      }),
    ),
  );
  router.get(
    "/accounts/:accountId/capabilities",
    run(async (req, res, user) =>
      res.json({
        success: true,
        data: await accounts.capabilities(user, parseAccount(req)),
      }),
    ),
  );
  router.get(
    "/accounts/:accountId/senders",
    run(async (req, res, user) => {
      const page = z.coerce
        .number()
        .int()
        .min(1)
        .max(10000)
        .default(1)
        .parse(req.query.page);
      res.json({
        success: true,
        data: await jobs.senders(user, parseAccount(req), page),
      });
    }),
  );
  router.get(
    "/accounts/:accountId/rules",
    run(async (req, res, user) =>
      res.json({
        success: true,
        data: await jobs.rules(user, parseAccount(req)),
      }),
    ),
  );
  router.get(
    "/accounts/:accountId/messages",
    run(async (req, res, user) => {
      const input = z
        .object({
          sender: senderSchema.optional(),
          page: z.coerce.number().int().min(1).max(10000).default(1),
        })
        .parse(req.query);
      res.json({
        success: true,
        data: await jobs.messages(
          user,
          parseAccount(req),
          input.sender,
          input.page,
        ),
      });
    }),
  );
  router.get(
    "/accounts/:accountId/messages/:messageId",
    run(async (req, res, user) =>
      res.json({
        success: true,
        data: await accounts.read(
          user,
          parseAccount(req),
          z.string().min(1).max(500).parse(req.params.messageId),
        ),
      }),
    ),
  );
  router.post(
    "/previews/cleanup",
    run(async (req, res, user) =>
      res.json({
        success: true,
        data: await jobs.prepare(
          user,
          selectionSchema.parse(req.body) as ProposalInput,
          "cleanup",
        ),
      }),
    ),
  );
  router.post(
    "/previews/rule",
    run(async (req, res, user) =>
      res.json({
        success: true,
        data: await jobs.prepare(
          user,
          ruleSchema.parse(req.body) as ProposalInput,
          "rule",
        ),
      }),
    ),
  );
  router.get(
    "/accounts/:accountId/jobs",
    run(async (req, res, user) =>
      res.json({
        success: true,
        data: await jobs.list(
          user,
          parseAccount(req),
          z.coerce
            .number()
            .int()
            .min(1)
            .max(10000)
            .default(1)
            .parse(req.query.page),
        ),
      }),
    ),
  );
  router.get(
    "/accounts/:accountId/jobs/:jobId",
    run(async (req, res, user) =>
      res.json({
        success: true,
        data: await jobs.read(
          user,
          parseAccount(req),
          uuid.parse(req.params.jobId),
          true,
        ),
      }),
    ),
  );
  router.post(
    "/accounts/:accountId/jobs/:jobId/confirm",
    run(async (req, res, user) => {
      const input = z
        .object({
          expectedCount: z.number().int().min(1).max(100000),
          confirmationToken: z.string().min(1).max(100),
        })
        .strict()
        .parse(req.body);
      res.json({
        success: true,
        data: await jobs.confirm(
          user,
          parseAccount(req),
          uuid.parse(req.params.jobId),
          input.expectedCount,
          input.confirmationToken,
        ),
      });
    }),
  );
  router.post(
    "/accounts/:accountId/jobs/:jobId/control",
    run(async (req, res, user) => {
      const input = z
        .object({ command: z.enum(["pause", "resume", "cancel"]) })
        .strict()
        .parse(req.body);
      res.json({
        success: true,
        data: await jobs.control(
          user,
          parseAccount(req),
          uuid.parse(req.params.jobId),
          input.command,
        ),
      });
    }),
  );
  router.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (res.headersSent) {
        _next(error);
        return;
      }
      const known =
        error instanceof z.ZodError
          ? new MailError("INVALID_MAIL_INPUT")
          : publicMailError(error);
      res.status(known.status).json({ success: false, code: known.code });
    },
  );
  return router;
}
