import { loadConnection } from "../external-ai/auth/oauth-provider.js";
import { assertEnabled } from "../external-ai/settings/settings.service.js";
import { MailError } from "./contracts.js";
import { requireMailEnabled } from "./config.js";
import type { MailDb } from "./accounts.js";

export async function mailDelegation(
  db: MailDb,
  id: string,
  accountId?: string,
  manage = false,
  body = false,
) {
  requireMailEnabled();
  try {
    await assertEnabled(db, false, true, "mail");
    const connection = await loadConnection(db, id, true);
    if (
      !connection.scopes.includes("o4o:mail:read") ||
      (manage && !connection.scopes.includes("o4o:mail:manage")) ||
      (body && !connection.scopes.includes("o4o:mail:body")) ||
      (accountId && !connection.workspaces.includes(`mail:${accountId}`))
    )
      throw new MailError("MAIL_SCOPE_FORBIDDEN", 403);
    return connection;
  } catch (error) {
    if (error instanceof MailError) throw error;
    throw new MailError("MAIL_DELEGATION_REVOKED", 403);
  }
}
