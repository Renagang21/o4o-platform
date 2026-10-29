import { centralOperationRequest } from '../../middleware/central-operation-menu.middleware.js';
import { ServiceOperatorInvitationError } from '../../services/admin/service-operator-invitation.service.js';
import { invitationFailure } from '../../services/admin/operator-invitation-error.js';
import { PolicyAcceptanceError } from '../policy-acceptance/policy-acceptance.service.js';
import { Router, type Request } from "express";
import type { DataSource } from "typeorm";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { CooperativeManagementService } from "./services/cooperative-management.service.js";
import { NeturePharmacyError } from "./constants.js";
import { isUuid } from "./services/pharmacy-cart.service.js";
import { explainOverview } from '../../services/ai-extensions/dashboard-overview.service.js';
import { resolveServiceAiProfile } from '../../services/ai-extensions/service-query.extension.js';
import { createPolicyExtensionRuntime } from '../../services/ai-extensions/policy-runtime.js';
import { createPolicyExecutor } from '../ai-policy/ai-policy-factory.js';
import { AiExtensionError } from '@o4o/ai-core';

/** Authentication is common; role checks are live, scoped, and performed in the service transaction. */
export function cooperativeManagementRoutes(db: DataSource) {
  const router = Router();
  const service = new CooperativeManagementService(db);
  router.use(requireAuth);
  router.use('/federation', centralOperationRequest('pharmcoop',()=>['pharmcoop.federation'],db));
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });
  const id = (req: Request, key: string) => {
    const value = req.params[key];
    if (!isUuid(value))
      throw new NeturePharmacyError(
        404,
        "NOT_FOUND",
        "대상을 찾을 수 없습니다.",
      );
    return value;
  };
  const run =
    (fn: (req: Request) => Promise<unknown>) =>
    async (
      req: Request,
      res: import("express").Response,
      next: import("express").NextFunction,
    ) => {
      try {
        res.json({ success: true, data: await fn(req) });
      } catch (error) {
        if (error instanceof ServiceOperatorInvitationError) { invitationFailure(res,error); return; }
        if (error instanceof NeturePharmacyError || error instanceof PolicyAcceptanceError)
          res
            .status(error.httpStatus)
            .json({ success: false, error: error.message, code: error.code });
        else next(error);
      }
    };
  const actor = (req: Request) => req.user!.id;
  router.post('/:coop/ai-overview', async (req, res, next) => {
    try {
      if (!req.body || Array.isArray(req.body) || typeof req.body !== 'object' || Object.keys(req.body).length)
        throw new NeturePharmacyError(400, 'INVALID_INPUT', '별도 자료 입력 없이 현재 모임의 현황을 조회합니다.');
      const coop = id(req, 'coop'), actorId = actor(req);
      const base = resolveServiceAiProfile('neture');
      if (!base) throw new AiExtensionError('INVALID_CONTEXT');
      const data = await explainOverview({
        actorId, featureId: 'cooperative.overview',
        profile: { ...base, name: '약국 경영 협력 모임', description: '선택한 모임의 회원 상태 집계를 설명한다.' },
        authorize: async () => { await service.requireLocal(db, actorId, coop); return true; },
        load: async () => {
          const rows: Array<{ status: string; count: number }> = await db.query(
            'SELECT status,COUNT(*)::int AS count FROM cooperative_memberships WHERE cooperative_id=$1 GROUP BY status', [coop]);
          const known = { pending: '심사 대기', active: '활성', rejected: '거절', suspended: '정지', withdrawn: '자격 종료' };
          return { collectedAt: new Date().toISOString(), metrics: {
            total: { label: '전체 회원 기록', value: rows.reduce((total, row) => total + row.count, 0) },
            ...Object.fromEntries(Object.entries(known).map(([status, label]) => [status, { label: `회원 상태 ${label}`, value: rows.find(row => row.status === status)?.count ?? 0 }])),
          } };
        },
        runtime: createPolicyExtensionRuntime(createPolicyExecutor(db), 'OPERATOR_INSIGHT', {
          usage: 'cooperative.overview', serviceKey: 'neture', maxTokens: 1000, temperature: 0.1, responseMode: 'json',
        }),
      });
      res.json({ success: true, data: { ...data, cooperativeId: coop } });
    } catch (error) {
      if (error instanceof AiExtensionError) {
        res.status(error.code === 'ACCESS_DENIED' ? 403 : error.code === 'QUOTA_EXCEEDED' ? 429 : 503).json({ success: false, code: error.code });
      } else if (error instanceof NeturePharmacyError) res.status(error.httpStatus).json({ success: false, code: error.code, error: error.message });
      else next(error);
    }
  });
  router.get(
    "/my-cooperatives",
    run((req) => service.myCooperatives(actor(req))),
  );
  router.get(
    "/my-updates",
    run((req) => service.myUpdates(actor(req))),
  );
  router.post(
    "/:coop/eligibility",
    run((req) =>
      service.updateEligibility(actor(req), id(req, "coop"), req.body ?? {}),
    ),
  );
  router.get(
    "/my-affiliations",
    run((req) => service.myAffiliations(actor(req))),
  );
  router.get(
    "/:coop/my-history",
    run((req) => service.myHistory(actor(req), id(req, "coop"))),
  );
  router.post(
    "/:coop/supplement",
    run((req) =>
      service.supplementAffiliation(
        actor(req),
        id(req, "coop"),
        req.body?.reason,
      ),
    ),
  );
  router.post(
    "/:coop/withdrawal-request",
    run((req) =>
      service.requestWithdrawal(actor(req), id(req, "coop"), req.body?.reason),
    ),
  );
  router.get(
    "/federation",
    run((req) => service.federationList(actor(req))),
  );
  router.post(
    "/affiliations",
    run((req) => service.applyAffiliation(actor(req), req.body ?? {})),
  );
  router.post(
    "/federation/:coop/actions/:action",
    run((req) =>
      service.affiliationAction(
        actor(req),
        id(req, "coop"),
        req.params.action,
        req.body?.reason,
      ),
    ),
  );
  router.get(
    "/federation/:coop/roles",
    run((req) => service.listRoles(actor(req), id(req, "coop"), true)),
  );
  router.get(
    "/federation/:coop/history",
    run((req) => service.history(actor(req), id(req, "coop"), true)),
  );
  router.post(
    "/:coop/roles",
    run((req) =>
      service.assignRole(
        actor(req),
        id(req, "coop"),
        req.body?.email,
        req.body?.role,
        req.body?.reason,
      ),
    ),
  );
  router.post(
    "/:coop/roles/:role/revoke",
    run((req) =>
      service.revokeRole(
        actor(req),
        id(req, "coop"),
        id(req, "role"),
        req.body?.reason,
      ),
    ),
  );
  router.get(
    "/:coop/roles",
    run((req) => service.listRoles(actor(req), id(req, "coop"), false)),
  );
  router.post(
    "/:coop/applications",
    run((req) =>
      service.applyMembership(actor(req), id(req, "coop"), req.body?.reason, req.body?.policyReferences),
    ),
  );
  router.get(
    "/:coop/members",
    run((req) => service.members(actor(req), id(req, "coop"))),
  );
  router.post(
    "/:coop/members/:member/actions/:action",
    run((req) =>
      service.memberAction(
        actor(req),
        id(req, "coop"),
        id(req, "member"),
        req.params.action,
        req.body?.reason,
      ),
    ),
  );
  router.get(
    "/:coop/history",
    run((req) => service.history(actor(req), id(req, "coop"), false)),
  );
  return router;
}
