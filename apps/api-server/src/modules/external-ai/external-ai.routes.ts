import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import type { DataSource } from "typeorm";
import { z, ZodError } from "zod";
import {
  createOAuthMetadata,
  mcpAuthRouter,
} from "@modelcontextprotocol/sdk/server/auth/router.js";
import { metadataHandler } from "@modelcontextprotocol/sdk/server/auth/handlers/metadata.js";
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
  createAdminBrowserWriteGuard,
  externalAiAccountOrigins,
} from "./auth/browser-write.middleware.js";
import {
  issuerOnAuthorizationRedirects,
  withIssuerIdentification,
} from "./auth/issuer-identification.js";
import { mailEnabled } from "../personal-mail/config.js";
import {
  mailWorkspaces,
  ownedAccount,
  type ProviderFactory,
} from "../personal-mail/accounts.js";
import { MailError } from "../personal-mail/contracts.js";
import { createExternalAiDomainVerificationRouter } from "./domain-verification.js";

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
  mailProviderFactory?: ProviderFactory,
) {
  const root = Router(),
    management = Router(),
    user = Router();
  root.use(createExternalAiDomainVerificationRouter(config?.issuer));
  const adapter = config ? new AdapterRegistry(db, config.webOrigin) : null;
  const provider = config
    ? new ExternalAiOAuthProvider(
        db,
        config,
        async (userId, workspaces, write, manager) => {
          for (const workspaceId of workspaces) {
            if (workspaceId.startsWith("mail:"))
              await ownedAccount(manager, userId, workspaceId.slice(5));
            else await adapter!.authorize(userId, workspaceId, write, manager);
          }
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
  management.use(
    authenticate,
    requireAdmin,
    createAdminBrowserWriteGuard(config?.adminOrigin?.origin),
  );
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
      g.created_at AS "createdAt",g.expires_at AS "expiresAt" FROM external_ai_connections g JOIN external_ai_clients c ON c.id=g.client_id
      WHERE g.user_id=$1 AND g.revoked_at IS NULL AND g.expires_at>now() ORDER BY g.created_at DESC`,
        [userId(req)],
      );
      const workspaces = adapter
        ? await adapter.workspaces(userId(req)).catch(() => [])
        : [];
      const mail = mailEnabled() ? await mailWorkspaces(db, userId(req)) : [];
      res.json({
        success: true,
        data: rows.map((row) => ({
          ...row,
          workspaces: undefined,
          workspaceNames: row.workspaces.map(
            (id: string) =>
              [...workspaces, ...mail].find((w) => w.id === id)?.name ??
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
      const settings = await assertEnabled(db, false, false, "any");
      const workspaces = (
        await adapter.workspaces(userId(req), db, settings)
      ).map((w) => ({
        ...w,
        writable: w.writable && settings.targets[w.kind].write,
      }));
      // 같은 앱(client)으로 이미 쓰는 연결 수 — 재연결인지 별도 계정 연결인지는 사용자가 동의 화면에서 고른다.
      const [existing] = await db.query(
        `SELECT count(*)::int AS n FROM external_ai_connections
        WHERE user_id=$1 AND client_id=$2 AND revoked_at IS NULL AND expires_at>now()`,
        [userId(req), pending.client_id],
      );
      res.json({
        success: true,
        data: {
          clientName: client?.client_name ?? "외부 AI",
          scopes: pending.data.scopes,
          workspaces,
          mailAccounts:
            mailEnabled() && pending.data.scopes.includes("o4o:mail:read")
              ? await mailWorkspaces(db, userId(req))
              : [],
          existingConnections: existing?.n ?? 0,
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
          scopes: z.array(z.enum(scopes)).min(1).max(scopes.length),
          replaceExisting: z.boolean().optional(),
        })
        .strict()
        .parse(req.body);
      const settings = await assertEnabled(db, false, false, "any");
      const available = await adapter.workspaces(userId(req), db, settings);
      const availableMail = mailEnabled()
        ? await mailWorkspaces(db, userId(req))
        : [];
      if (
        new Set(body.workspaces).size !== body.workspaces.length ||
        body.workspaces.some(
          (id) =>
            !(id.startsWith("mail:")
              ? body.scopes.includes("o4o:mail:read") &&
                availableMail.some((w) => w.id === id)
              : available.some(
                  (w) =>
                    w.id === id &&
                    (w.writable || !body.scopes.includes("o4o:draft:write")),
                )),
        )
      )
        throw new ExternalAiError("WORKSPACE_FORBIDDEN", 403);
      const redirectUrl = await provider.consent(
        userId(req),
        body.request,
        body.workspaces,
        body.scopes,
        body.replaceExisting === true,
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
    const authServer = {
      provider,
      issuerUrl: config!.issuer,
      scopesSupported: scopes.filter(
        (scope) => !scope.startsWith("o4o:mail:") || mailEnabled(),
      ),
    };
    // RFC 9207: advertise and return `iss` so ChatGPT can use its stable redirect URI.
    root.use(
      "/.well-known/oauth-authorization-server",
      metadataHandler(
        withIssuerIdentification(createOAuthMetadata(authServer)),
      ),
    );
    root.use(
      "/authorize",
      issuerOnAuthorizationRedirects(config!.issuer, config!.redirectUris),
    );
    const oauth = mcpAuthRouter({
      ...authServer,
      resourceServerUrl: provider.resource,
      resourceName: "O4O 콘텐츠 연결",
      authorizationOptions: {
        rateLimit: {
          windowMs: 15 * 60 * 1000,
          max: 100,
        },
      },
      clientRegistrationOptions: {
        clientSecretExpirySeconds: 0,
        rateLimit: {
          windowMs: 60 * 60 * 1000,
          max: 20,
        },
      },
    });
    root.use(oauth);
  }
  // MCP must not pass through user.use(requireAuth). Return a separate root entry for it.
  const combined = Router();
  if (provider)
    combined.use(
      "/api/external-ai/mcp",
      createMcpRouter(db, provider, mailProviderFactory),
    );
  combined.use(root);
  combined.use(
    (error: unknown, _req: Request, res: Response, _next: NextFunction) => {
      if (res.headersSent) {
        _next(error);
        return;
      }
      const known =
        error instanceof ExternalAiError || error instanceof MailError;
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
