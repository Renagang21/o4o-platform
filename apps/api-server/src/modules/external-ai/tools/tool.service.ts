import { randomUUID } from "node:crypto";
import type { DataSource } from "typeorm";
import {
  toolSchemas,
  writeTools,
  ExternalAiError,
  type ToolName,
} from "../contracts.js";
import { loadConnection, tokenHash } from "../auth/oauth-provider.js";
import { assertEnabled } from "../settings/settings.service.js";
import { AdapterRegistry } from "../adapters/registry.js";
import type { DraftInput } from "../adapters/adapter.js";

export const writeLimits = {
  perConnectionDay: 100,
  perUserDay: 300,
  storedErrors: 1000,
};

export class ExternalAiToolService {
  readonly registry: AdapterRegistry;
  constructor(
    readonly db: DataSource,
    webOrigin: URL,
  ) {
    this.registry = new AdapterRegistry(db, webOrigin);
  }
  async execute(
    name: ToolName,
    raw: unknown,
    connectionId: string,
  ): Promise<unknown> {
    const parsed = toolSchemas[name].safeParse(raw);
    if (!parsed.success) throw new ExternalAiError("INVALID_TOOL_INPUT");
    const input = parsed.data as Record<string, unknown>,
      write = writeTools.has(name);
    try {
      return await this.db.transaction(async (db) => {
        const settings = await assertEnabled(db, write, true);
        const connection = await loadConnection(db, connectionId, true);
        if (
          !connection.scopes.includes("o4o:read") ||
          (write && !connection.scopes.includes("o4o:draft:write"))
        )
          throw new ExternalAiError("SCOPE_FORBIDDEN", 403);
        if (name === "list_workspaces") {
          const workspaces = (
            await this.registry.workspaces(connection.userId, db, settings)
          ).filter((w) => connection.workspaces.includes(w.id));
          return {
            workspaces: workspaces.map((w) => ({
              ...w,
              writable:
                w.writable &&
                settings.targets[w.kind].write &&
                connection.scopes.includes("o4o:draft:write"),
            })),
            examples: settings.examples,
          };
        }
        const workspaceId = input.workspaceId as string;
        if (!connection.workspaces.includes(workspaceId))
          throw new ExternalAiError("WORKSPACE_FORBIDDEN", 403);
        const { adapter, id } = await this.registry.authorize(
          connection.userId,
          workspaceId,
          write,
          db,
          settings,
        );
        this.registry.resolve(
          workspaceId,
          input.destination as string | undefined,
        );
        switch (name) {
          case "search_products":
            return adapter.products(
              db,
              id,
              input.query as string,
              input.page as number,
              input.limit as number,
            );
          case "get_product_context":
            return adapter.productContext(db, id, input.productId as string);
          case "list_materials":
            return adapter.materials(
              db,
              id,
              input.query as string,
              input.page as number,
              input.limit as number,
              connection.userId,
            );
          case "get_material":
            return adapter.material(
              db,
              id,
              input.materialId as string,
              connection.userId,
            );
          case "get_content_draft":
            return adapter.content(
              db,
              id,
              input.destination as string,
              input.contentId as string,
              false,
              connection.userId,
            );
          default: {
            const requestId = input.requestId as string;
            await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
              `external-request:${connectionId}:${requestId}`,
            ]);
            const fingerprint = tokenHash(JSON.stringify({ name, input }));
            const existing = await db.query(
              `SELECT fingerprint,result FROM external_ai_requests WHERE connection_id=$1 AND request_id=$2 AND expires_at>now()`,
              [connectionId, requestId],
            );
            if (existing[0]) {
              if (existing[0].fingerprint !== fingerprint)
                throw new ExternalAiError("REQUEST_ID_REUSED", 409);
              return adapter.content(
                db,
                id,
                input.destination as string,
                existing[0].result.id,
                false,
                connection.userId,
              );
            }
            // Serialize all connections of the same user. Existing request metadata
            // is the rolling 24-hour counter; retries above do not consume quota.
            await db.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
              `external-ai-writes:${connection.userId}`,
            ]);
            const [counts] = await db.query(
              `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE r.connection_id=$1)::int AS connection
              FROM external_ai_requests r JOIN external_ai_connections c ON c.id=r.connection_id
              WHERE c.user_id=$2 AND r.expires_at>now()`,
              [connectionId, connection.userId],
            );
            if (
              counts.connection >= writeLimits.perConnectionDay ||
              counts.total >= writeLimits.perUserDay
            )
              throw new ExternalAiError("WRITE_QUOTA_EXCEEDED", 429);
            const result = await adapter.save(
              db,
              connection.userId,
              id,
              input as unknown as DraftInput,
            );
            await db.query(
              `INSERT INTO external_ai_requests(connection_id,request_id,fingerprint,result,expires_at)
              VALUES($1,$2,$3,$4,now()+interval '24 hours') ON CONFLICT(connection_id,request_id)
              DO UPDATE SET fingerprint=EXCLUDED.fingerprint,result=EXCLUDED.result,expires_at=EXCLUDED.expires_at`,
              [connectionId, requestId, fingerprint, { id: result.id }],
            );
            return result;
          }
        }
      });
    } catch (error) {
      const code =
        error instanceof ExternalAiError
          ? error.code
          : "EXTERNAL_AI_OPERATION_FAILED";
      // Only bounded tool/code metadata; no tokens, document text or client/user names.
      if (code !== "WRITE_QUOTA_EXCEEDED")
        await this.db
          .transaction(async (db) => {
            const [lock] = await db.query(
              "SELECT pg_try_advisory_xact_lock(hashtext($1)) AS acquired",
              ["external-ai-errors"],
            );
            if (!lock.acquired) return;
            await db.query(
              `DELETE FROM external_ai_errors WHERE id IN
                (SELECT id FROM external_ai_errors ORDER BY created_at DESC,id DESC OFFSET $1)`,
              [writeLimits.storedErrors - 1],
            );
            await db.query(
              "INSERT INTO external_ai_errors(id,tool,code) VALUES($1,$2,$3)",
              [randomUUID(), name, code],
            );
          })
          .catch(() => undefined);
      throw error instanceof ExternalAiError
        ? error
        : new ExternalAiError(code, 503);
    }
  }
}
