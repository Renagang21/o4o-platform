import { scopedSource } from "../../modules/external-ai/adapters/adapter.js";
import { InvalidTokenError } from "@modelcontextprotocol/sdk/server/auth/errors.js";
import type { DataSource } from "typeorm";
import { loadConnection } from "../../modules/external-ai/auth/oauth-provider.js";
import { assertEnabled } from "../../modules/external-ai/settings/settings.service.js";
import { ledgerToolSchemas, LedgerError } from "./contracts.js";
import { PhotoLedgerService } from "./ledger.service.js";
/** No LLM: ChatGPT already extracted the invoice. Final confirmation is first-party only. */
export async function executeLedgerTool(
  db: DataSource,
  name: keyof typeof ledgerToolSchemas,
  raw: unknown,
  connectionId: string,
  webOrigin: URL,
) {
  const parsed = ledgerToolSchemas[name].safeParse(raw);
  if (!parsed.success) throw new LedgerError("LEDGER_INPUT_INVALID");
  try {
    return await db.transaction(async (manager) => {
      const input = parsed.data,
        write = name === "prepare_transaction_invoice";
      const settings = await assertEnabled(manager, write, true, "content");
      const connection = await loadConnection(manager, connectionId, true);
      if (
        !connection.scopes.includes("o4o:read") ||
        !connection.scopes.includes("o4o:ledger:read") ||
        (write && !connection.scopes.includes("o4o:ledger:write"))
      )
        throw new LedgerError("LEDGER_SCOPE_FORBIDDEN", 403);
      if (
        !connection.workspaces.includes(input.workspaceId) ||
        !settings.targets.store.read ||
        (write && !settings.targets.store.write)
      )
        throw new LedgerError("LEDGER_WORKSPACE_FORBIDDEN", 403);
      const service = new PhotoLedgerService(
          scopedSource(db, manager),
          webOrigin,
        ),
        org = input.workspaceId.slice(6);
      if (name === "prepare_transaction_invoice")
        return service.prepare(connection.userId, input, "chatgpt");
      if (name === "get_transaction_invoice")
        return service.get(
          connection.userId,
          org,
          (input as { invoiceId: string }).invoiceId,
        );
      const list = input as { after?: string; limit: number };
      return service.list(connection.userId, org, list.after, list.limit);
    });
  } catch (error) {
    if (error instanceof InvalidTokenError)
      throw new LedgerError("AUTH_REQUIRED", 401);
    throw error;
  }
}
