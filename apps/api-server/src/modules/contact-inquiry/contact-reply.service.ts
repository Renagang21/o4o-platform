import type { DataSource, EntityManager } from "typeorm";
import { emailService } from "../../services/email.service.js";
import {
  recordOperation,
  OperationError,
} from "../../services/operations/operation-audit.js";
import { escapeHtml } from "./contact-notification.helper.js";
import { contactService } from "./contact-service-scope.js";

export interface ReplyScope {
  organizationId: string | null;
  name: string;
  authorize(manager: EntityManager): Promise<void>;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export class ContactReplyService {
  constructor(
    private readonly db: Pick<DataSource, "query" | "transaction">,
    private readonly send = (input: {
      to: string;
      subject: string;
      html: string;
    }) => emailService.sendEmail(input),
  ) {}

  async history(
    serviceKey: string,
    contactId: string,
    organizationId: string | null = null,
  ) {
    return this.db.query(
      `SELECT * FROM (SELECT DISTINCT ON (meta->>'replyId')
      meta->>'replyId' AS id, meta->>'body' AS message, meta->>'delivery' AS status,
      created_at AS "createdAt", user_id AS "actorId" FROM action_logs
      WHERE service_key=$1 AND action_key='contact.reply' AND meta->>'contactId'=$2
      AND (meta->>'organizationId') IS NOT DISTINCT FROM $3::text
      ORDER BY meta->>'replyId',created_at DESC) replies ORDER BY "createdAt" DESC`,
      [serviceKey, contactId, organizationId],
    );
  }
  async reply(
    serviceKey: string,
    contactId: string,
    actorId: string,
    input: { requestId?: unknown; message?: unknown },
    scope?: ReplyScope,
  ) {
    if (
      typeof input.requestId !== "string" ||
      !UUID.test(input.requestId) ||
      typeof input.message !== "string" ||
      !input.message.trim() ||
      input.message.trim().length > 5000 ||
      input.message.includes("\0")
    )
      throw new OperationError(
        400,
        "INVALID_REPLY",
        "답변은 1~5,000자로 입력해 주세요.",
      );
    const replyId = input.requestId,
      body = input.message.trim();
    const organizationId = scope?.organizationId ?? null;
    const queued = await this.db.transaction(async (manager) => {
      await scope?.authorize(manager);
      const [contact] = await manager.query(
        `SELECT id,email,subject,status FROM contact_inquiries WHERE id=$1 AND service_key=$2 AND organization_id IS NOT DISTINCT FROM $3::uuid FOR UPDATE`,
        [contactId, serviceKey, organizationId],
      );
      if (!contact)
        throw new OperationError(404, "NOT_FOUND", "문의를 찾을 수 없습니다.");
      const [existing] = await manager.query(
        `SELECT meta->>'delivery' AS status FROM action_logs WHERE service_key=$1
        AND action_key='contact.reply' AND meta->>'contactId'=$2 AND meta->>'replyId'=$3 ORDER BY created_at DESC LIMIT 1`,
        [serviceKey, contactId, replyId],
      );
      if (existing) return { existing: existing.status as string, contact };
      const [pending] = await manager.query(
        `SELECT 1 FROM (SELECT DISTINCT ON (meta->>'replyId') meta->>'delivery' AS delivery
        FROM action_logs WHERE service_key=$1 AND action_key='contact.reply' AND meta->>'contactId'=$2
        ORDER BY meta->>'replyId',created_at DESC) latest WHERE delivery='sending' LIMIT 1`,
        [serviceKey, contactId],
      );
      if (pending)
        throw new OperationError(
          409,
          "REPLY_IN_PROGRESS",
          "다른 답변의 발송 결과를 확인 중입니다. 답변 이력을 다시 확인해 주세요.",
        );
      if (contact.status === "spam" || contact.status === "closed")
        throw new OperationError(
          409,
          "CONTACT_CLOSED",
          "문의 상태를 확인 중으로 바꾼 뒤 답변해 주세요.",
        );
      await recordOperation(manager, serviceKey, actorId, "contact.reply", {
        contactId,
        organizationId,
        replyId,
        body,
        delivery: "sending",
      });
      return { existing: null, contact };
    });
    // Repeated requests (including an uncertain in-flight send) never send the same reply twice.
    if (queued.existing) return { id: replyId, status: queued.existing };
    let sent = false;
    try {
      const result = await this.send({
        to: queued.contact.email,
        subject:
          `[${scope?.name ?? contactService(serviceKey)?.name ?? "O4O"}] ${queued.contact.subject}`.slice(
            0,
            200,
          ),
        html: `<p>문의하신 내용에 대한 답변입니다.</p><div style="white-space:pre-wrap">${escapeHtml(body)}</div><p>접수번호: ${escapeHtml(contactId)}</p>`,
      });
      sent = result.success;
    } catch {
      // A transport exception cannot prove non-delivery. Retain the claim and block new sends.
      return { id: replyId, status: "sending" };
    }
    await this.db.transaction(async (manager) => {
      await manager.query(
        "SELECT id FROM contact_inquiries WHERE id=$1 AND service_key=$2 AND organization_id IS NOT DISTINCT FROM $3::uuid FOR UPDATE",
        [contactId, serviceKey, organizationId],
      );
      await recordOperation(manager, serviceKey, actorId, "contact.reply", {
        contactId,
        organizationId,
        replyId,
        body,
        delivery: sent ? "sent" : "failed",
      });
      if (sent)
        await manager.query(
          `UPDATE contact_inquiries SET status=CASE WHEN status IN ('closed','spam') THEN status ELSE 'answered' END,
        handled_at=NOW(),handled_by=$3,updated_at=NOW() WHERE id=$1 AND service_key=$2 AND organization_id IS NOT DISTINCT FROM $4::uuid`,
          [contactId, serviceKey, actorId, organizationId],
        );
    });
    return { id: replyId, status: sent ? "sent" : "failed" };
  }
}
