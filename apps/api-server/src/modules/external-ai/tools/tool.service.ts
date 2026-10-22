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
import { SupplierAdapter } from "../adapters/supplier.adapter.js";

export class ExternalAiToolService {
  readonly adapter: SupplierAdapter;
  constructor(
    readonly db: DataSource,
    webOrigin: URL,
  ) {
    this.adapter = new SupplierAdapter(db, webOrigin);
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
            await this.adapter.workspaces(connection.userId, db)
          ).filter((w) => connection.workspaces.includes(w.id));
          return {
            workspaces: workspaces.map((w) => ({
              ...w,
              writable:
                w.writable &&
                settings.targets.supplier.write &&
                connection.scopes.includes("o4o:draft:write"),
            })),
            examples: settings.examples,
          };
        }
        const workspaceId = input.workspaceId as string;
        if (!connection.workspaces.includes(workspaceId))
          throw new ExternalAiError("WORKSPACE_FORBIDDEN", 403);
        await this.adapter.authorize(connection.userId, workspaceId, write, db);
        switch (name) {
          case "search_products":
            return this.adapter.products(
              db,
              workspaceId,
              input.query as string,
              input.page as number,
              input.limit as number,
            );
          case "get_product_context":
            return this.adapter.productContext(
              db,
              workspaceId,
              input.productId as string,
            );
          case "list_materials":
            return this.adapter.materials(
              db,
              workspaceId,
              input.query as string,
              input.page as number,
              input.limit as number,
            );
          case "get_material":
            return this.adapter.material(
              db,
              workspaceId,
              input.materialId as string,
            );
          case "get_content_draft":
            return this.adapter.content(
              db,
              workspaceId,
              input.destination as string,
              input.contentId as string,
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
              return this.adapter.content(
                db,
                workspaceId,
                input.destination as string,
                existing[0].result.id,
              );
            }
            const result = await this.adapter.save(
              db,
              connection.userId,
              workspaceId,
              input as unknown as Parameters<SupplierAdapter["save"]>[3],
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
      await this.db
        .query(
          "INSERT INTO external_ai_errors(id,tool,code) VALUES($1,$2,$3)",
          [randomUUID(), name, code],
        )
        .catch(() => undefined);
      throw error instanceof ExternalAiError
        ? error
        : new ExternalAiError(code, 503);
    }
  }
}
