import type { DataSource } from "typeorm";
import {
  OperationError,
  recordOperation,
} from "../../services/operations/operation-audit.js";
import {
  assertInboxWriter,
  inboxRecipients,
  inboxNotificationServiceKey,
  inboxNotificationTarget,
  type InboxScope,
} from "./inbox-scope.js";

/** Durable inbox delivery, serialized with receipt edits. Existing notifications are the dedup ledger. */
export async function retryInboxNotification(
  db: DataSource,
  scope: InboxScope,
  contactId: string,
  actor: string,
) {
  return db.transaction(async (manager) => {
    await assertInboxWriter(manager, scope, actor);
    const [contact] = await manager.query(
      `SELECT id,subject,status,notification_status FROM contact_inquiries WHERE id=$1 AND service_key=$2
       AND organization_id IS NOT DISTINCT FROM $3::uuid FOR UPDATE`,
      [contactId, scope.serviceKey, scope.organizationId],
    );
    if (!contact)
      throw new OperationError(404, "NOT_FOUND", "문의를 찾을 수 없습니다.");
    if (!["received", "in_review"].includes(contact.status))
      throw new OperationError(
        409,
        "CONTACT_NOT_OPEN",
        "미처리 문의만 담당자에게 다시 알릴 수 있습니다.",
      );
    if (contact.notification_status?.startsWith("sending:"))
      throw new OperationError(
        409,
        "NOTIFICATION_IN_PROGRESS",
        "접수 알림의 결과를 확인 중입니다. 기존 발송 상태를 먼저 확인해 주세요.",
      );
    let enabled = true;
    if (scope.kind === "service") {
      const [settings] = await manager.query(
        "SELECT in_app_notification_enabled FROM service_contact_settings WHERE service_key=$1",
        [scope.serviceKey],
      );
      enabled = settings?.in_app_notification_enabled !== false;
    }
    const recipients = enabled ? await inboxRecipients(manager, scope) : [];
    let created = 0;
    for (const recipient of recipients) {
      const [existing] = await manager.query(
        `SELECT id FROM notifications WHERE "userId"=$1 AND "serviceKey"=$2
         AND "organizationId" IS NOT DISTINCT FROM $3::uuid AND type='contact.new'
         AND channel='in_app' AND metadata->>'contactInquiryId'=$4 LIMIT 1`,
        [
          recipient.userId,
          inboxNotificationServiceKey(scope),
          scope.organizationId,
          contactId,
        ],
      );
      if (existing) continue;
      await manager.query(
        `INSERT INTO notifications("userId","serviceKey","organizationId",type,title,message,metadata,channel,"isRead")
         VALUES($1,$2,$3,'contact.new',$4,$5,$6::jsonb,'in_app',false)`,
        [
          recipient.userId,
          inboxNotificationServiceKey(scope),
          scope.organizationId,
          `${scope.name} 새 문의`,
          contact.subject,
          JSON.stringify({
            contactInquiryId: contactId,
            targetUrl: inboxNotificationTarget(scope),
          }),
        ],
      );
      created++;
    }
    const status = !enabled ? "off" : recipients.length ? "sent" : "none";
    const otherChannels = (contact.notification_status ?? "")
      .split(";")
      .filter((part: string) => part && !part.startsWith("inapp:"));
    await manager.query(
      "UPDATE contact_inquiries SET notification_status=$2 WHERE id=$1",
      [contactId, [`inapp:${status}`, ...otherChannels].join(";")],
    );
    await recordOperation(
      manager,
      scope.serviceKey,
      actor,
      "operator.contact_notification_retry",
      {
        contactId,
        organizationId: scope.organizationId,
        recipients: recipients.length,
        created,
        delivery: status,
      },
    );
    return { status, recipients: recipients.length, created };
  });
}
