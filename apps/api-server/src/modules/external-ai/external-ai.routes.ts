import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import type { DataSource } from "typeorm";
import { z, ZodError } from "zod";
import { mcpAuthRouter } from "@modelcontextprotocol/sdk/server/auth/router.js";
import {
  requireAuth,
  requireAdmin,
  authenticate,
} from "../../middleware/auth.middleware.js";
import type { AuthRequest } from "../../types/auth.js";
import {
  connectionConfig,
  ExternalAiOAuthProvider,
  type ConnectionConfig,
} from "./auth/oauth-provider.js";
import {
  scopes,
  ExternalAiError,
  settingsSchema,
  workspaceIdSchema,
  targetKinds,
} from "./contracts.js";
import {
  readSettings,
  changeSettings,
  assertEnabled,
} from "./settings/settings.service.js";
import { AdapterRegistry } from "./adapters/registry.js";
import { createMcpRouter } from "./mcp/mcp.routes.js";
import {
  createBrowserWriteGuard,
  externalAiAccountOrigins,
} from "./auth/browser-write.middleware.js";
import { getTrustedClientIp } from "../../utils/trusted-client-ip.js";

type Handler = (req: Request, res: Response) => Promise<unknown>;
const wrap =
  (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
    void fn(req, res).catch(next);
  };
const userId = (req: Request) => {
  const id = (req as AuthRequest).user?.id;
  if (!id) throw new ExternalAiError("AUTH_REQUIRED", 401);
  return id;
};
export function createExternalAiRoutes(
  db: DataSource,
  config: ConnectionConfig | null = connectionConfig(),
) {
  const root = Router(),
    management = Router(),
    user = Router();
  const adapter = config ? new AdapterRegistry(db, config.webOrigin) : null;
  const provider = config
    ? new ExternalAiOAuthProvider(
        db,
        config,
        async (userId, workspaces, write, manager) => {
          for (const workspaceId of workspaces)
            await adapter!.authorize(userId, workspaceId, write, manager);
        },
      )
    : null;
  const ready = () => {
    if (!provider || !adapter)
      throw new ExternalAiError("EXTERNAL_AI_NOT_CONFIGURED", 503);
    return { provider, adapter };
  };
  root.use(
    [
      "/api/external-ai",
      "/api/ai/admin/external-connections",
      "/authorize",
      "/token",
      "/register",
      "/revoke",
    ],
    (_req, res, next) => {
      res.setHeader("Cache-Control", "private, no-store");
      res.setHeader("Referrer-Policy", "no-referrer");
      next();
    },
  );
  // The same Neture account settings page exists on the supplier/community/funding hosts.
  const browserWrite = createBrowserWriteGuard([
    config?.webOrigin.origin ?? "https://neture.co.kr",
    config?.adminOrigin?.origin ?? "https://admin.neture.co.kr",
    ...externalAiAccountOrigins,
  ]);
  management.use(authenticate, requireAdmin, browserWrite);
  management.get(
    "/",
    wrap(async (_req, res) => {
      const snapshot = await readSettings(db);
      const errors = await db.query(
        'SELECT tool,code,created_at AS "createdAt" FROM external_ai_errors ORDER BY created_at DESC LIMIT 20',
      );
      res.json({
        success: true,
        data: {
          ...snapshot,
          configured: !!config,
          mcpUrl: provider?.resource.href ?? null,
          adapters: targetKinds.map((kind) => ({ kind, ready: true })),
          errors,
        },
      });
    }),
  );
  management.put(
    "/",
    wrap(async (req, res) => {
      const body = z
        .object({ revision: z.number().int().min(0), settings: settingsSchema })
        .strict()
        .parse(req.body);
      if (body.settings.enabled) ready();
      const snapshot = await changeSettings(db, body.revision, body.settings);
      res.json({ success: true, data: snapshot });
    }),
  );
  root.use("/api/ai/admin/external-connections", management);
  user.use(requireAuth, browserWrite);
  user.get(
    "/connections",
    wrap(async (req, res) => {
      const rows = await db.query(
        `SELECT g.id,c.metadata->>'client_name' AS "clientName",g.workspaces,g.scopes,
      g.expires_at AS "expiresAt" FROM external_ai_connections g JOIN external_ai_clients c ON c.id=g.client_id
      WHERE g.user_id=$1 AND g.revoked_at IS NULL AND g.expires_at>now() ORDER BY g.created_at DESC`,
        [userId(req)],
      );
      const workspaces = adapter
        ? await adapter.workspaces(userId(req)).catch(() => [])
        : [];
      res.json({
        success: true,
        data: rows.map((row) => ({
          ...row,
          workspaces: undefined,
          workspaceNames: row.workspaces.map(
            (id: string) =>
              workspaces.find((w) => w.id === id)?.name ??
              "이용 권한이 변경된 작업공간",
          ),
        })),
      });
    }),
  );
  user.delete(
    "/connections/:id",
    wrap(async (req, res) => {
      const id = z.string().uuid().parse(req.params.id);
      await db.query(
        "UPDATE external_ai_connections SET revoked_at=now() WHERE id=$1 AND user_id=$2",
        [id, userId(req)],
      );
      res.json({ success: true });
    }),
  );
  user.get(
    "/consent",
    wrap(async (req, res) => {
      const { provider, adapter } = ready();
      const request = z.string().parse(req.query.request),
        pending = await provider.pending(request);
      const client = await provider.clientsStore.getClient(pending.client_id);
      const settings = await assertEnabled(db);
      const workspaces = (
        await adapter.workspaces(userId(req), db, settings)
      ).map((w) => ({
        ...w,
        writable: w.writable && settings.targets[w.kind].write,
      }));
      res.json({
        success: true,
        data: {
          clientName: client?.client_name ?? "외부 AI",
          scopes: pending.data.scopes,
          workspaces,
        },
      });
    }),
  );
  user.post(
    "/consent",
    wrap(async (req, res) => {
      const { provider, adapter } = ready();
      const body = z
        .object({
          request: z.string(),
          workspaces: z.array(workspaceIdSchema).min(1).max(50),
          scopes: z.array(z.enum(scopes)).min(1).max(2),
        })
        .strict()
        .parse(req.body);
      const settings = await assertEnabled(db);
      const available = await adapter.workspaces(userId(req), db, settings);
      if (
        new Set(body.workspaces).size !== body.workspaces.length ||
        body.workspaces.some(
          (id) =>
            !available.some(
              (w) =>
                w.id === id &&
                (w.writable || !body.scopes.includes("o4o:draft:write")),
            ),
        )
      )
        throw new ExternalAiError("WORKSPACE_FORBIDDEN", 403);
      const redirectUrl = await provider.consent(
        userId(req),
        body.request,
        body.workspaces,
        body.scopes,
      );
      res.json({ success: true, data: { redirectUrl } });
    }),
  );
  user.post(
    "/consent/deny",
    wrap(async (req, res) => {
      const { provider } = ready();
      const { request } = z
        .object({ request: z.string() })
        .strict()
        .parse(req.body);
      res.json({
        success: true,
        data: { redirectUrl: await provider.deny(request) },
      });
    }),
  );
  root.use("/api/external-ai", user);
  if (provider) {
    // Mount MCP before the browser-session router (below reordering) — OAuth token only, never cookie auth.
    const oauth = mcpAuthRouter({
      provider,
      issuerUrl: config!.issuer,
      resourceServerUrl: provider.resource,
      scopesSupported: [...scopes],
      resourceName: "O4O 콘텐츠 연결",
      clientRegistrationOptions: {
        clientSecretExpirySeconds: 0,
        rateLimit: {
          windowMs: 60 * 60 * 1000,
          max: 20,
          keyGenerator: getTrustedClientIp,
        },
      },
    });
    root.use(oauth);
  }
  // MCP must not pass through user.use(requireAuth). Return a separate root entry for it.
  const combined = Router();
  if (provider)
    combined.use("/api/external-ai/mcp", createMcpRouter(db, provider));
  combined.use(root);
  combined.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (res.headersSent) {
        _next(error);
        return;
      }
      const known = error instanceof ExternalAiError;
      res
        .status(known ? error.status : error instanceof ZodError ? 400 : 503)
        .json({
          success: false,
          code: known
            ? error.code
            : error instanceof ZodError
              ? "INVALID_INPUT"
              : "EXTERNAL_AI_UNAVAILABLE",
        });
    },
  );
  return { router: combined, provider };
}
