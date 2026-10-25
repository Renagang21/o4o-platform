import {
  Router,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import type { DataSource } from "typeorm";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { apiLimiter } from "../../middleware/rateLimiter.js";
import { NeturePharmacyError } from "../neture-pharmacy/constants.js";
import { OperationError } from "../../services/operations/operation-audit.js";
import {
  resolveInboxScope,
  scopeGuard,
  inboxRecipients,
  type InboxScope,
} from "../contact-inquiry/inbox-scope.js";
import { requireMember } from "./access.js";
import { CooperationWorkService } from "./work.service.js";
import { CooperationMaterialService } from "./material.service.js";
import { CooperationSupportService } from "./support.service.js";
import { invalid, uuid } from "./model.js";
type ScopedRequest = Request & { cooperationScope: InboxScope };
export function createCooperationWorkflowRoutes(ds: DataSource) {
  const router = Router(),
    works = new CooperationWorkService(ds),
    materials = new CooperationMaterialService(ds),
    support = new CooperationSupportService(ds);
  const run =
    (fn: (req: ScopedRequest, res: Response) => Promise<unknown>) =>
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        await fn(req as ScopedRequest, res);
      } catch (error) {
        if (error instanceof NeturePharmacyError)
          res
            .status(error.httpStatus)
            .json({ success: false, error: error.message, code: error.code });
        else if (error instanceof OperationError)
          res
            .status(error.status)
            .json({ success: false, error: error.message, code: error.code });
        else next(error);
      }
    };
  const offset = (value: unknown) => {
    const n = value === undefined ? 0 : Number(value);
    if (!Number.isSafeInteger(n) || n < 0 || n > 100000) throw invalid();
    return n;
  };
  const organization = (req: Request) => {
    const value = req.get("X-Store-Organization-Id");
    if (value && !uuid(value)) throw invalid("선택 약국을 확인해 주세요.");
    return value?.toLowerCase() || undefined;
  };
  const id = (req: Request) => {
    if (!uuid(req.params.id)) throw invalid();
    return req.params.id.toLowerCase();
  };
  const send = (res: Response, data: unknown) =>
    res.json({ success: true, data });
  router.use(requireAuth);
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.vary("Authorization");
    res.vary("X-Store-Organization-Id");
    next();
  });
  router.use("/:kind/:key", (req, res, next) => {
    void (async () => {
      if (!["business", "cooperative"].includes(req.params.kind))
        throw invalid("협업체 공간을 확인해 주세요.");
      const scope = await resolveInboxScope(
        ds,
        req.params.kind,
        req.params.key,
      );
      (req as unknown as ScopedRequest).cooperationScope = scope;
    })()
      .then(() => next())
      .catch((error) => {
        if (error instanceof NeturePharmacyError)
          res
            .status(error.httpStatus)
            .json({ success: false, error: error.message, code: error.code });
        else next(error);
      });
  });
  router.get(
    "/:kind/:key/member",
    run(async (req, res) => {
      const subject = await requireMember(
        ds,
        req.cooperationScope,
        req.user!.id,
        organization(req),
      );
      const [work, library, inquiries] = await Promise.all([
        works.memberList(
          req.cooperationScope,
          subject,
          offset(req.query.noticeOffset),
          offset(req.query.activityOffset),
        ),
        materials.list(
          req.cooperationScope,
          false,
          offset(req.query.materialOffset),
        ),
        support.memberList(
          req.cooperationScope,
          subject,
          offset(req.query.supportOffset),
        ),
      ]);
      send(res, {
        ...work,
        materials: library,
        support: inquiries,
        subjectType: subject.type,
      });
    }),
  );
  router.post(
    "/:kind/:key/notices/:id/acknowledge",
    apiLimiter,
    run(async (req, res) =>
      send(
        res,
        await works.acknowledge(
          req.cooperationScope,
          req.user!.id,
          organization(req),
          id(req),
          req.body?.version,
        ),
      ),
    ),
  );
  router.post(
    "/:kind/:key/activities/:id/applications",
    apiLimiter,
    run(async (req, res) =>
      send(
        res,
        await works.apply(
          req.cooperationScope,
          req.user!.id,
          organization(req),
          id(req),
          req.body ?? {},
        ),
      ),
    ),
  );
  router.post(
    "/:kind/:key/applications/:id/withdraw",
    apiLimiter,
    run(async (req, res) => {
      if (req.body?.state !== "withdrawn") throw invalid();
      send(
        res,
        await works.decide(
          req.cooperationScope,
          req.user!.id,
          id(req),
          req.body,
          organization(req),
        ),
      );
    }),
  );
  router.post(
    "/:kind/:key/support",
    apiLimiter,
    run(async (req, res) =>
      send(
        res,
        await support.create(
          req.cooperationScope,
          req.user!.id,
          organization(req),
          req.body ?? {},
        ),
      ),
    ),
  );
  router.use("/:kind/:key/manage", (req, res, next) =>
    scopeGuard(ds, (req as unknown as ScopedRequest).cooperationScope)(
      req,
      res,
      (error) => {
        if (error instanceof NeturePharmacyError)
          res
            .status(error.httpStatus)
            .json({ success: false, error: error.message, code: error.code });
        else next(error);
      },
    ),
  );
  router.get(
    "/:kind/:key/manage",
    run(async (req, res) => {
      const scope = req.cooperationScope;
      const [work, library, inquiries, subjects, recipients] =
        await Promise.all([
          works.operatorList(
            scope,
            offset(req.query.workOffset),
            typeof req.query.workFilter === "string"
              ? req.query.workFilter
              : "all",
          ),
          materials.list(scope, true, offset(req.query.materialOffset)),
          support.operatorList(
            scope,
            offset(req.query.supportOffset),
            typeof req.query.supportFilter === "string"
              ? req.query.supportFilter
              : "all",
          ),
          works.subjects(scope, offset(req.query.subjectOffset)),
          inboxRecipients(ds, scope),
        ]);
      const operators = recipients.length
        ? await ds.query(
            "SELECT id,name FROM users WHERE id=ANY($1::uuid[]) ORDER BY name,id",
            [recipients.map((item) => item.userId)],
          )
        : [];
      const [summary] = await ds.query(
        `SELECT
      (SELECT count(*)::int FROM cooperation_notice_recipients r JOIN cooperation_work_items w ON w.id=r.work_id AND w.version=r.version WHERE w.business_id=$1 AND w.cooperative_id IS NOT DISTINCT FROM $2::uuid AND w.state='published' AND w.required=true AND r.acknowledged_at IS NULL) AS notices,
      (SELECT count(*)::int FROM cooperation_activity_applications a JOIN cooperation_work_items w ON w.id=a.work_id WHERE w.business_id=$1 AND w.cooperative_id IS NOT DISTINCT FROM $2::uuid AND a.state='submitted') AS applications`,
        [scope.businessId, scope.cooperativeId ?? null],
      );
      send(res, {
        work,
        materials: library,
        support: inquiries,
        subjects,
        operators,
        summary,
      });
    }),
  );
  router.post(
    "/:kind/:key/manage/work",
    apiLimiter,
    run(async (req, res) =>
      send(
        res,
        await works.save(
          req.cooperationScope,
          req.user!.id,
          undefined,
          req.body ?? {},
        ),
      ),
    ),
  );
  router.post(
    "/:kind/:key/manage/work/:id",
    apiLimiter,
    run(async (req, res) =>
      send(
        res,
        await works.save(
          req.cooperationScope,
          req.user!.id,
          id(req),
          req.body ?? {},
        ),
      ),
    ),
  );
  router.get(
    "/:kind/:key/manage/work/:id",
    run(async (req, res) =>
      send(
        res,
        await works.detail(
          req.cooperationScope,
          id(req),
          offset(req.query.offset),
        ),
      ),
    ),
  );
  router.post(
    "/:kind/:key/manage/applications/:id",
    apiLimiter,
    run(async (req, res) => {
      if (req.body?.state === "withdrawn") throw invalid();
      send(
        res,
        await works.decide(
          req.cooperationScope,
          req.user!.id,
          id(req),
          req.body ?? {},
        ),
      );
    }),
  );
  router.get(
    "/:kind/:key/manage/materials/:id/revisions",
    run(async (req, res) =>
      send(res, await materials.history(req.cooperationScope, id(req))),
    ),
  );
  router.post(
    "/:kind/:key/manage/materials/:id",
    apiLimiter,
    run(async (req, res) =>
      send(
        res,
        await materials.update(
          req.cooperationScope,
          req.user!.id,
          id(req),
          req.body ?? {},
        ),
      ),
    ),
  );
  router.post(
    "/:kind/:key/manage/support/:id",
    apiLimiter,
    run(async (req, res) =>
      send(
        res,
        await support.assign(
          req.cooperationScope,
          req.user!.id,
          id(req),
          req.body ?? {},
        ),
      ),
    ),
  );
  return router;
}
