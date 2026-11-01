import { CENTRAL_CONTACT_MENUS, centralContactRecipients } from './central-contact-access.js';
import { IsNull } from 'typeorm';
import type { DataSource } from "typeorm";
import { ContactInquiry } from "./entities/ContactInquiry.entity.js";
import { createHash, randomUUID } from "crypto";
import { OperationError } from "../../services/operations/operation-audit.js";
import { notificationService } from "../../services/NotificationService.js";
import { loadContactSettings } from "./contact-settings.helper.js";
import { sendContactEmails } from "./contact-notification.helper.js";
import { contactService, contactRecipients } from "./contact-service-scope.js";

export function contactTarget(key: string) {
  const menu = CENTRAL_CONTACT_MENUS[key];
  if (menu) {
    const [service, area] = menu.split('.');
    const query = service === 'neture' ? `?contactService=${encodeURIComponent(key)}` : '';
    return `https://admin.neture.co.kr/operations/${service}/${area}${query}`;
  }
  return key === "lecture"
    ? "/operator/contact"
    : key === "k-cosmetics"
      ? "/operator/contacts"
      : `/operator/service-contact/${key}`;
}
/**
 * Claim under a short row lock, then release the connection before external delivery.
 * An unresolved claim is never reclaimed automatically: a timed-out provider may have sent.
 */
export async function dispatchContactInquiry(
  db: DataSource,
  serviceKey: string,
  id: string,
): Promise<ContactInquiry | null> {
  const claimed = await db.transaction(async (manager) => {
    const repo = manager.getRepository(ContactInquiry);
    const inquiry = await repo.findOne({
      where: { id, service_key: serviceKey, organization_id: IsNull() },
      lock: { mode: "pessimistic_write" },
    });
    if (!inquiry) return null;
    const previous = inquiry.notification_status || "";
    if (previous.startsWith("sending:"))
      throw new OperationError(
        409,
        "NOTIFICATION_IN_PROGRESS",
        "접수 알림의 발송 결과를 확인 중입니다. 문의 상세를 다시 확인해 주세요.",
      );
    // The bounded existing field retains successful-channel evidence while a claim is unresolved.
    const completed = ["inapp", "email", "autoreply"]
      .filter((channel) => previous.includes(`${channel}:sent`))
      .map((channel) => `${channel}:sent`)
      .join(";");
    const claim = `sending:${randomUUID()};${completed}`;
    await repo.update(
      { id, service_key: serviceKey, organization_id: IsNull() },
      { notification_status: claim },
    );
    return { inquiry, claim };
  });
  if (!claimed) return null;
  const notificationStatus = await deliverContactInquiry(db, claimed.inquiry);
  const repo = db.getRepository(ContactInquiry);
  const updated = await repo.update(
    { id, service_key: serviceKey, organization_id: IsNull(), notification_status: claimed.claim },
    { notification_status: notificationStatus },
  );
  if (updated.affected !== 1)
    throw new OperationError(
      409,
      "NOTIFICATION_STATE_CHANGED",
      "알림 상태가 변경되었습니다. 문의 상세를 다시 확인해 주세요.",
    );
  return repo.findOne({ where: { id, service_key: serviceKey, organization_id: IsNull() } });
}

/** Only the claim owner may call delivery. Retry only channels that did not succeed. */
async function deliverContactInquiry(
  db: DataSource,
  inquiry: ContactInquiry,
): Promise<string> {
  const settings = await loadContactSettings(db, inquiry.service_key);
  const previous = inquiry.notification_status || "";
  let inapp = previous.includes("inapp:sent")
    ? "sent"
    : settings.inAppNotificationEnabled
      ? "none"
      : "off";
  if (settings.inAppNotificationEnabled && inapp !== "sent") {
    try {
      const operators = CENTRAL_CONTACT_MENUS[inquiry.service_key]
        ? await centralContactRecipients(db, CENTRAL_CONTACT_MENUS[inquiry.service_key])
        : await contactRecipients(db, inquiry.service_key);
      if (operators.length) {
        const notificationServiceKey = CENTRAL_CONTACT_MENUS[inquiry.service_key]?.split('.')[0] ?? inquiry.service_key;
        // The inquiry claim serializes retries. Persisted notifications are per-recipient
        // delivery receipts, including a save whose caller did not observe success.
        const delivered: { userId: string }[] = await db.query(
          `SELECT DISTINCT "userId" FROM notifications
           WHERE "userId"=ANY($1::uuid[]) AND "serviceKey"=$2
             AND type='contact.new' AND channel='in_app'
             AND metadata->>'contactInquiryId'=$3`,
          [
            operators.map((op) => op.userId),
            notificationServiceKey,
            inquiry.id,
          ],
        );
        const completedRecipients = new Set(delivered.map((row) => row.userId));
        const results = await Promise.allSettled(
          operators
            .filter((op) => !completedRecipients.has(op.userId))
            .map((op) =>
              notificationService.createNotification({
                userId: op.userId,
                type: "contact.new",
                title: "새 문의가 접수되었습니다",
                message: `[${contactService(inquiry.service_key)?.name}] ${inquiry.subject}`,
                serviceKey: notificationServiceKey,
                metadata: {
                  contactInquiryId: inquiry.id,
                  operationMenu: CENTRAL_CONTACT_MENUS[inquiry.service_key],
                  sourceServiceKey: inquiry.service_key,
                  targetUrl: contactTarget(inquiry.service_key),
                },
              }),
            ),
        );
        inapp = results.every((result) => result.status === "fulfilled")
          ? "sent"
          : "fail";
      } else {
        inapp = "unassigned";
        // Central operations receives an assignment alert, not another service's private inquiry.
        const central = await centralContactRecipients(db, "neture.inbox");
        // An opaque digest correlates retries without disclosing the inquiry UUID,
        // subject, contact details, or a usable inquiry link to central recipients.
        const assignmentReceipt = createHash("sha256")
          .update(inquiry.id)
          .digest("hex");
        const delivered: { userId: string }[] = await db.query(
          `SELECT DISTINCT "userId" FROM notifications
           WHERE "userId"=ANY($1::uuid[]) AND "serviceKey"='neture'
             AND type='contact.new' AND channel='in_app'
             AND metadata->>'assignmentReceipt'=$2`,
          [central.map((op) => op.userId), assignmentReceipt],
        );
        const completedRecipients = new Set(delivered.map((row) => row.userId));
        await Promise.allSettled(
          central
            .filter((op) => !completedRecipients.has(op.userId))
            .map((op) =>
              notificationService.createNotification({
                userId: op.userId,
                type: "contact.new",
                title: "문의 담당자 지정이 필요합니다",
                message: `${contactService(inquiry.service_key)?.name} 문의 담당자를 확인해 주세요.`,
                serviceKey: "neture",
                metadata: {
                  assignmentRequired: true,
                  operationMenu: "neture.inbox",
                  assignmentReceipt,
                  sourceServiceKey: inquiry.service_key,
                  targetUrl: "/operator",
                },
              }),
            ),
        );
      }
    } catch {
      inapp = "fail";
    }
  }
  const email = await sendContactEmails(
    {
      ...settings,
      emailNotificationEnabled:
        settings.emailNotificationEnabled && !previous.includes("email:sent"),
      autoReplyEnabled:
        settings.autoReplyEnabled && !previous.includes("autoreply:sent"),
    },
    {
      serviceName:
        contactService(inquiry.service_key)?.name || inquiry.service_key,
      typeLabel: inquiry.inquiry_type,
      subject: inquiry.subject,
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone,
      organizationName: inquiry.organization_name,
      message: inquiry.message,
      createdAt: inquiry.created_at,
      adminManageUrl: CENTRAL_CONTACT_MENUS[inquiry.service_key] ? contactTarget(inquiry.service_key) : `https://neture.co.kr/operator/service-contact/${inquiry.service_key}`,
    },
  );
  return `inapp:${inapp};email:${previous.includes("email:sent") ? "sent" : email.emailStatus};autoreply:${previous.includes("autoreply:sent") ? "sent" : email.autoReplyStatus}`;
}
