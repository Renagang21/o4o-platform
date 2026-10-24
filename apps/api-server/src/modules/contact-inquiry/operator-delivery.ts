import type { EntityManager } from "typeorm";
import type { NotificationEmitPayload } from "../../services/forum/NotificationEventHub.js";

export interface OperatorNotificationInput {
  userId: string;
  type: "contact.new";
  title: string;
  message: string;
  serviceKey: string;
  organizationId?: string;
  metadata: Record<string, unknown>;
}
/** Reuse the caller's connection. Emit SSE only after its transaction commits. */
export async function persistOperatorNotification(
  manager: Pick<EntityManager, "query">,
  input: OperatorNotificationInput,
): Promise<NotificationEmitPayload> {
  const [row] = await manager.query(
    `INSERT INTO notifications("userId","serviceKey","organizationId",type,title,message,metadata,channel,"isRead")
     VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,'in_app',false) RETURNING id,"createdAt"`,
    [
      input.userId,
      input.serviceKey,
      input.organizationId ?? null,
      input.type,
      input.title,
      input.message,
      JSON.stringify(input.metadata),
    ],
  );
  return { ...input, id: row.id, createdAt: row.createdAt };
}

/** Individual delivery failure must never be recorded as success. No recipient truncation. */
export async function deliverOperatorNotifications<T>(
  recipients: readonly T[],
  send: (recipient: T) => Promise<unknown>,
) {
  if (!recipients.length) return "none";
  // Bounded concurrency without silently dropping recipients.
  let fulfilled = 0;
  for (let i = 0; i < recipients.length; i += 20) {
    const results = await Promise.allSettled(
      recipients.slice(i, i + 20).map(send),
    );
    fulfilled += results.filter((r) => r.status === "fulfilled").length;
  }
  return fulfilled === recipients.length
    ? "sent"
    : fulfilled
      ? "partial"
      : "fail";
}
