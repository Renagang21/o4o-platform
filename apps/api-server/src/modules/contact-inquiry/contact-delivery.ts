import type { DataSource } from "typeorm";
import type { ContactInquiry } from "./entities/ContactInquiry.entity.js";
import { notificationService } from "../../services/NotificationService.js";
import { loadContactSettings } from "./contact-settings.helper.js";
import { sendContactEmails } from "./contact-notification.helper.js";
import { contactService, contactRecipients } from "./contact-service-scope.js";

export function contactTarget(key: string) {
  return key === "lecture"
    ? "/operator/contact"
    : key === "k-cosmetics"
      ? "/operator/contacts"
      : `/operator/service-contact/${key}`;
}
/** Persistence precedes delivery. Retry only channels that did not succeed. */
export async function deliverContactInquiry(
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
      const operators = await contactRecipients(db, inquiry.service_key);
      if (operators.length) {
        const results = await Promise.allSettled(
          operators.map((op) =>
            notificationService.createNotification({
              userId: op.userId,
              type: "contact.new",
              title: "새 문의가 접수되었습니다",
              message: `[${contactService(inquiry.service_key)?.name}] ${inquiry.subject}`,
              serviceKey: ["store","hospital"].includes(inquiry.service_key) ? "neture" : inquiry.service_key,
              metadata: {
                contactInquiryId: inquiry.id,
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
        const central = await contactRecipients(db, "neture");
        await Promise.allSettled(
          central.map((op) =>
            notificationService.createNotification({
              userId: op.userId,
              type: "contact.new",
              title: "문의 담당자 지정이 필요합니다",
              message: `${contactService(inquiry.service_key)?.name} 문의 담당자를 확인해 주세요.`,
              serviceKey: "neture",
              metadata: {
                assignmentRequired: true,
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
      adminManageUrl: `https://neture.co.kr/operator/service-contact/${inquiry.service_key}`,
    },
  );
  return `inapp:${inapp};email:${previous.includes("email:sent") ? "sent" : email.emailStatus};autoreply:${previous.includes("autoreply:sent") ? "sent" : email.autoReplyStatus}`;
}
