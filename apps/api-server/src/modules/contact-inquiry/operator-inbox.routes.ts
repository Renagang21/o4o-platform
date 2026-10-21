import { recordOperation } from "../../services/operations/operation-audit.js";
import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import type { DataSource } from "typeorm";
import { createHash } from "node:crypto";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { apiLimiter } from "../../middleware/rateLimiter.js";
import { NeturePharmacyError, rowsOf } from "../neture-pharmacy/constants.js";
import { notificationService } from "../../services/NotificationService.js";
import {
  resolveInboxScope,
  inboxDestination,
  inboxNotificationTarget,
  assertInboxWriter,
  scopeGuard,
  inboxRecipients,
  type InboxScope,
} from "./inbox-scope.js";
import { deliverOperatorNotifications } from "./operator-delivery.js";
import { readInboxTasks } from "./inbox-tasks.js";

type ScopedRequest = Request & { inboxScope: InboxScope };
const statuses = ["received", "in_review", "answered", "closed", "spam"];
const types = [
  "service_usage",
  "account_permission",
  "partnership",
  "technical_issue",
  "other",
];
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const listFields =
  'id,service_key AS "serviceKey",inquiry_type AS "inquiryType",subject,status,notification_status AS "notificationStatus",created_at AS "createdAt",updated_at AS "updatedAt",updated_at::text AS version';
const detailFields = `${listFields},name,email,phone,organization_name AS "organizationName",message,internal_note AS "internalNote"`;
// Scope filters apply equally to lists, detail and writes; caller-supplied organization IDs are ignored.
const scopeWhere =
  "service_key=$1 AND organization_id IS NOT DISTINCT FROM $2::uuid";
const fields = (scope: InboxScope) => [scope.serviceKey, scope.organizationId];
const bad = (message: string) =>
  new NeturePharmacyError(400, "INVALID_INBOX_INPUT", message);
const text = (v: unknown, max: number) =>
  typeof v === "string" && v.trim().length <= max ? v.trim() : "";

export function createOperatorInboxRoutes(ds: DataSource) {
  const router = Router();
  const run =
    (fn: (req: ScopedRequest, res: Response) => Promise<unknown>) =>
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await fn(req as ScopedRequest, res);
      } catch (e) {
        if (e instanceof NeturePharmacyError)
          res
            .status(e.httpStatus)
            .json({ success: false, error: e.message, code: e.code });
        else next(e);
      }
    };
  router.use("/:kind/:key", async (req, res, next) => {
    try {
      (req as unknown as ScopedRequest).inboxScope = await resolveInboxScope(
        ds,
        req.params.kind,
        req.params.key,
      );
      next();
    } catch (e) {
      if (e instanceof NeturePharmacyError)
        res.status(e.httpStatus).json({ success: false, error: e.message });
      else next(e);
    }
  });
  router.post(
    "/:kind/:key/contact",
    apiLimiter,
    run(async (req, res) => {
      // Service receipt/settings/delivery stay on the already-deployed canonical controller.
      // 308 preserves POST + body; organization-owned spaces retain their separate scope below.
      if (req.inboxScope.kind === "service") {
        res.redirect(308, `/api/v1/public/services/${req.inboxScope.serviceKey}/contact-inquiries`);
        return;
      }
      const body = req.body ?? {};
      if (
        typeof body.company_website === "string" &&
        body.company_website.trim()
      ) {
        res.status(201).json({ success: true, data: { id: null } });
        return;
      }
      const name = text(body.name, 100),
        email = text(body.email, 255),
        subject = text(body.subject, 300),
        message = text(body.message, 5000);
      if (
        !name ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        !subject ||
        message.length < 10 ||
        body.privacyConsent !== true
      )
        throw bad(
          "이름·이메일·제목·문의 내용(10자 이상)과 개인정보 동의를 확인해 주세요.",
        );
      const scope = req.inboxScope;
      const [saved] = await ds.query(
        `INSERT INTO contact_inquiries(service_key,organization_id,inquiry_type,name,email,phone,organization_name,subject,message,privacy_consent,status,source_path,ip_hash,notification_status)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,true,'received',$10,$11,'inapp:pending') RETURNING id`,
        [
          ...fields(scope),
          types.includes(body.inquiryType) ? body.inquiryType : "other",
          name,
          email,
          text(body.phone, 50) || null,
          text(body.organizationName, 200) || null,
          subject,
          message,
          scope.publicPath,
          createHash("sha256")
            .update(req.ip ?? "")
            .digest("hex"),
        ],
      );
      let delivery = "fail";
      try {
        delivery = await deliverOperatorNotifications(
          await inboxRecipients(ds, scope),
          (op) =>
            notificationService.createNotification({
              userId: op.userId,
              type: "contact.new",
              title: `${scope.name} 새 문의`,
              message: subject,
              serviceKey: ["store", "pharmcoop"].includes(scope.serviceKey)
                ? "neture"
                : scope.serviceKey,
              organizationId: scope.organizationId ?? undefined,
              metadata: {
                contactInquiryId: saved.id,
                targetUrl: inboxNotificationTarget(scope),
              },
            }),
        );
      } catch {
        /* Persisted contact remains available even if recipient lookup or transport fails. */
      }
      try {
        await ds.query(
          "UPDATE contact_inquiries SET notification_status=$2 WHERE id=$1",
          [saved.id, `inapp:${delivery}`],
        );
      } catch {
        /* pending remains visible as incomplete delivery */
      }
      res
        .status(201)
        .json({ success: true, data: { id: saved.id, status: "received" } });
    }),
  );
  router.use("/:kind/:key/manage", requireAuth, (req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    return scopeGuard(ds, (req as ScopedRequest).inboxScope)(req, res, next);
  });
  router.get(
    "/:kind/:key/manage",
    run(async (req, res) => {
      const [contact] = await ds.query(
        `SELECT COUNT(*) FILTER(WHERE status IN ('received','in_review'))::int AS pending,MIN(created_at) FILTER(WHERE status IN ('received','in_review')) AS oldest,COUNT(*) FILTER(WHERE status IN ('received','in_review') AND (notification_status IS NULL OR notification_status !~ '^inapp:sent(;|$)'))::int AS "deliveryAttention" FROM contact_inquiries WHERE ${scopeWhere}`,
        fields(req.inboxScope),
      );
      res.json({
        success: true,
        data: {
          name: req.inboxScope.name,
          destination: inboxDestination(req.inboxScope),
          contact,
          tasks: await readInboxTasks(ds, req.inboxScope),
        },
      });
    }),
  );
  router.get(
    "/:kind/:key/manage/contacts",
    run(async (req, res) => {
      const page = Number(req.query.page ?? 1);
      if (!Number.isSafeInteger(page) || page < 1 || page > 10000)
        throw bad("페이지를 확인해 주세요.");
      const status = req.query.status ?? "";
      if (
        typeof status !== "string" ||
        (status && status !== "open" && !statuses.includes(status))
      )
        throw bad("문의 상태를 확인해 주세요.");
      const params = [...fields(req.inboxScope), status];
      const where = `${scopeWhere} AND ($3::text='' OR ($3='open' AND status IN ('received','in_review')) OR status=$3)`;
      const [total] = await ds.query(
        `SELECT COUNT(*)::int AS total FROM contact_inquiries WHERE ${where}`,
        params,
      );
      const items = await ds.query(
        `SELECT ${listFields} FROM contact_inquiries WHERE ${where} ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET $4`,
        [...params, (page - 1) * 20],
      );
      res.json({
        success: true,
        data: {
          items,
          page,
          total: total.total,
          totalPages: Math.ceil(total.total / 20),
        },
      });
    }),
  );
  router.get(
    "/:kind/:key/manage/contacts/:id",
    run(async (req, res) => {
      if (!uuid.test(req.params.id))
        throw new NeturePharmacyError(
          404,
          "CONTACT_NOT_FOUND",
          "문의를 찾을 수 없습니다.",
        );
      const [row] = await ds.query(
        `SELECT ${detailFields} FROM contact_inquiries WHERE ${scopeWhere} AND id=$3`,
        [...fields(req.inboxScope), req.params.id],
      );
      if (!row)
        throw new NeturePharmacyError(
          404,
          "CONTACT_NOT_FOUND",
          "문의를 찾을 수 없습니다.",
        );
      const history = await ds.query(
        `SELECT action_key AS action,created_at AS at,meta->>'beforeStatus' AS "beforeStatus",meta->>'afterStatus' AS "afterStatus" FROM action_logs WHERE service_key=$1 AND action_key='operator.contact_update' AND status='success' AND meta->>'contactId'=$2 AND (meta->>'organizationId') IS NOT DISTINCT FROM $3::text ORDER BY created_at DESC,id DESC LIMIT 30`,
        [req.inboxScope.serviceKey, row.id, req.inboxScope.organizationId],
      );
      res.json({ success: true, data: { ...row, history } });
    }),
  );
  router.patch(
    "/:kind/:key/manage/contacts/:id",
    run(async (req, res) => {
      const { status, internalNote, expectedUpdatedAt } = req.body ?? {};
      if (
        !uuid.test(req.params.id) ||
        !statuses.includes(status) ||
        typeof internalNote !== "string" ||
        internalNote.length > 5000 ||
        typeof expectedUpdatedAt !== "string" ||
        !Number.isFinite(Date.parse(expectedUpdatedAt))
      )
        throw bad("문의 상태·메모·수정 시각을 확인해 주세요.");
      const row = await ds.transaction(async (manager) => {
        await assertInboxWriter(manager, req.inboxScope, req.user!.id);
        const [before] = await manager.query(
          `SELECT status FROM contact_inquiries WHERE ${scopeWhere} AND id=$3 FOR UPDATE`,
          [...fields(req.inboxScope), req.params.id],
        );
        const [saved] = rowsOf(
          await manager.query(
            `UPDATE contact_inquiries SET status=$4,internal_note=$5,handled_by=$6,handled_at=now(),updated_at=clock_timestamp() WHERE ${scopeWhere} AND id=$3 AND updated_at=$7::timestamp RETURNING ${detailFields}`,
            [
              ...fields(req.inboxScope),
              req.params.id,
              status,
              internalNote,
              req.user!.id,
              expectedUpdatedAt,
            ],
          ),
        );
        if (!saved)
          throw new NeturePharmacyError(
            409,
            "CONTACT_CHANGED",
            "문의가 변경되었거나 접근할 수 없습니다. 입력을 보존한 채 다시 조회해 주세요.",
          );
        await recordOperation(
          manager,
          req.inboxScope.serviceKey,
          req.user!.id,
          "operator.contact_update",
          {
            contactId: saved.id,
            organizationId: req.inboxScope.organizationId,
            beforeStatus: before.status,
            afterStatus: status,
          },
        );
        return saved;
      });
      res.json({ success: true, data: row });
    }),
  );
  return router;
}
