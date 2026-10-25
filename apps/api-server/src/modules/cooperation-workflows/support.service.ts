import { assertOperator } from "./access.js";
import type { DataSource } from "typeorm";
import { NeturePharmacyError, rowsOf } from "../neture-pharmacy/constants.js";
import {
  inboxRecipients,
  inboxNotificationServiceKey,
  inboxNotificationTarget,
  type InboxScope,
} from "../contact-inquiry/inbox-scope.js";
import { ContactReplyService } from "../contact-inquiry/contact-reply.service.js";
import {
  persistOperatorNotification,
  deliverOperatorNotifications,
} from "../contact-inquiry/operator-delivery.js";
import {
  notificationEventHub,
  type NotificationEmitPayload,
} from "../../services/forum/NotificationEventHub.js";
import { recordOperation } from "../../services/operations/operation-audit.js";
import { requireMember, type Subject } from "./access.js";
import { conflict, dateInput, invalid, shortText, uuid } from "./model.js";
const contactScope =
  "service_key=$1 AND organization_id IS NOT DISTINCT FROM $2::uuid";
const values = (scope: InboxScope) => [scope.serviceKey, scope.organizationId];
export class CooperationSupportService {
  constructor(private readonly ds: DataSource) {}
  async memberList(scope: InboxScope, subject: Subject, offset = 0) {
    const where = `${contactScope} AND requester_user_id=$3 AND requester_subject_type=$4 AND requester_subject_id=$5`;
    const params = [...values(scope), subject.userId, subject.type, subject.id];
    const items = await this.ds.query(
      `SELECT id,subject,message,status,created_at,updated_at,due_at FROM contact_inquiries WHERE ${where} ORDER BY created_at DESC,id LIMIT 50 OFFSET $6`,
      [...params, offset],
    );
    for (const item of items)
      item.replies = (
        await new ContactReplyService(this.ds).history(
          scope.serviceKey,
          item.id,
          scope.organizationId,
        )
      )
        .filter((reply: any) => reply.status === "sent")
        .map(({ id, message, createdAt }: any) => ({ id, message, createdAt }));
    const [count] = await this.ds.query(
      `SELECT count(*)::int AS total FROM contact_inquiries WHERE ${where}`,
      params,
    );
    return { items, total: count.total };
  }
  async create(
    scope: InboxScope,
    user: string,
    organization: string | undefined,
    body: Record<string, unknown>,
  ) {
    const subject = shortText(body.subject, 300, true),
      message = shortText(body.message, 5000, true);
    if (
      message.length < 10 ||
      body.privacyConsent !== true ||
      !uuid(body.requestId)
    )
      throw invalid(
        "문의 내용 10자 이상과 개인정보 처리 동의를 확인해 주세요.",
      );
    const requestId = String(body.requestId).toLowerCase();
    const saved = await this.ds.transaction(async (manager) => {
      const member = await requireMember(
        manager,
        scope,
        user,
        organization,
        true,
      );
      await manager.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1,0))",
        [user + ":" + requestId],
      );
      const [existing] = await manager.query(
        "SELECT id,service_key,organization_id,requester_subject_type,requester_subject_id FROM contact_inquiries WHERE requester_user_id=$1 AND client_request_id=$2",
        [user, requestId],
      );
      if (existing) {
        if (
          existing.service_key !== scope.serviceKey ||
          existing.organization_id !== scope.organizationId ||
          existing.requester_subject_type !== member.type ||
          existing.requester_subject_id !== member.id
        )
          throw conflict();
        return { id: existing.id, created: false };
      }
      const [actor] = await manager.query(
        "SELECT name,email FROM users WHERE id=$1",
        [user],
      );
      const [row] = await manager.query(
        `INSERT INTO contact_inquiries(service_key,organization_id,inquiry_type,name,email,subject,message,privacy_consent,status,source_path,notification_status,
        requester_user_id,requester_subject_type,requester_subject_id,client_request_id)
        VALUES($1,$2,'service_usage',$3,$4,$5,$6,true,'received',$7,'inapp:pending',$8,$9,$10,$11) RETURNING id`,
        [
          ...values(scope),
          actor.name || "회원",
          actor.email,
          subject,
          message,
          scope.publicPath,
          user,
          member.type,
          member.id,
          requestId,
        ],
      );
      return { id: row.id, created: true };
    });
    // Reception is durable before delivery. Pending/failed delivery is repairable in the existing inbox.
    if (saved.created) {
      try {
        const events = await this.ds.transaction(async (manager) => {
          await manager.query(
            "SELECT id FROM contact_inquiries WHERE id=$1 FOR UPDATE",
            [saved.id],
          );
          const pending: NotificationEmitPayload[] = [];
          const delivery = await deliverOperatorNotifications(
            await inboxRecipients(manager, scope),
            async (recipient) => {
              const event = await persistOperatorNotification(manager, {
                userId: recipient.userId,
                type: "contact.new",
                title: `${scope.name} 새 문의`,
                message: subject,
                serviceKey: inboxNotificationServiceKey(scope),
                organizationId: scope.organizationId ?? undefined,
                metadata: {
                  contactInquiryId: saved.id,
                  targetUrl: inboxNotificationTarget(scope),
                },
              });
              pending.push(event);
            },
          );
          await manager.query(
            "UPDATE contact_inquiries SET notification_status=$2 WHERE id=$1",
            [saved.id, `inapp:${delivery}`],
          );
          return pending;
        });
        for (const event of events) {
          try {
            notificationEventHub.emitNotification(event);
          } catch {
            /* polling remains available */
          }
        }
      } catch {
        /* durable pending receipt is recoverable */
      }
    }
    return { id: saved.id };
  }
  async operatorList(scope: InboxScope, offset = 0, filter = "all") {
    const filters: Record<string, string> = {
      all: "true",
      unassigned: "status IN ('received','in_review') AND assigned_to IS NULL",
      overdue: "status IN ('received','in_review') AND due_at<now()",
    };
    if (!Object.hasOwn(filters, filter)) throw invalid();
    const filterSql = filters[filter];
    const items = await this.ds.query(
      `SELECT id,subject,status,assigned_to,due_at,created_at,updated_at::text AS version FROM contact_inquiries
      WHERE ${contactScope} AND (${filterSql}) ORDER BY CASE WHEN status IN ('received','in_review') THEN 0 ELSE 1 END,created_at DESC,id LIMIT 50 OFFSET $3`,
      [...values(scope), offset],
    );
    const [counts] = await this.ds.query(
      `SELECT count(*)::int AS total,
      count(*) FILTER(WHERE status IN ('received','in_review'))::int AS pending,
      count(*) FILTER(WHERE status IN ('received','in_review') AND assigned_to IS NULL)::int AS unassigned,
      count(*) FILTER(WHERE status IN ('received','in_review') AND due_at<now())::int AS overdue FROM contact_inquiries WHERE ${contactScope}`,
      values(scope),
    );
    const [filtered] = await this.ds.query(
      `SELECT count(*)::int AS total FROM contact_inquiries WHERE ${contactScope} AND (${filterSql})`,
      values(scope),
    );
    return { items, ...counts, total: filtered.total };
  }
  async assign(
    scope: InboxScope,
    user: string,
    id: string,
    body: Record<string, unknown>,
  ) {
    if (body.assignedTo !== null && !uuid(body.assignedTo)) throw invalid();
    const due = dateInput(body.dueAt);
    return this.ds.transaction(async (manager) => {
      await assertOperator(manager, scope, user);
      const [contact] = await manager.query(
        `SELECT id,updated_at::text AS version FROM contact_inquiries WHERE ${contactScope} AND id=$3 FOR UPDATE`,
        [...values(scope), id],
      );
      if (!contact)
        throw new NeturePharmacyError(
          404,
          "CONTACT_NOT_FOUND",
          "이 공간의 문의가 아닙니다.",
        );
      if (contact.version !== body.version) throw conflict();
      if (
        body.assignedTo &&
        !(await inboxRecipients(manager, scope)).some(
          (person) => person.userId === body.assignedTo,
        )
      )
        throw invalid("현재 이 공간의 담당 운영자만 배정할 수 있습니다.");
      const [saved] = rowsOf(
        await manager.query(
          `UPDATE contact_inquiries SET assigned_to=$4,due_at=$5,updated_at=clock_timestamp() WHERE ${contactScope} AND id=$3 RETURNING id,updated_at::text AS version`,
          [...values(scope), id, body.assignedTo, due],
        ),
      );
      await recordOperation(
        manager,
        scope.serviceKey,
        user,
        "cooperation.contact.assign",
        {
          contactId: id,
          assignedTo: body.assignedTo,
          dueAt: due,
          scopeKind: scope.kind,
          scopeKey: scope.key,
        },
      );
      return saved;
    });
  }
}
