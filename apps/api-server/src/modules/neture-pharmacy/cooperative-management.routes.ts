import { ServiceOperatorInvitationError } from '../../services/admin/service-operator-invitation.service.js';
import { invitationFailure } from '../../services/admin/operator-invitation-error.js';
import { PolicyAcceptanceError } from '../policy-acceptance/policy-acceptance.service.js';
import { Router, type Request } from "express";
import type { DataSource } from "typeorm";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { CooperativeManagementService } from "./services/cooperative-management.service.js";
import { NeturePharmacyError } from "./constants.js";
import { isUuid } from "./services/pharmacy-cart.service.js";

/** Authentication is common; role checks are live, scoped, and performed in the service transaction. */
export function cooperativeManagementRoutes(db: DataSource) {
  const router = Router();
  const service = new CooperativeManagementService(db);
  router.use(requireAuth);
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
