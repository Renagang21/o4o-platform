import { Router, type RequestHandler } from "express";
import type { DataSource } from "typeorm";
import { ServiceOperatorManagementService } from "../services/admin/service-operator-management.service.js";
import { OperationError } from "../services/operations/operation-audit.js";
import { DemoAccountForbiddenError } from "../services/auth/demo-account.service.js";

export function createServiceOperatorManagementRoutes(
  db: DataSource,
  auth: RequestHandler,
) {
  const router = Router();
  const service = new ServiceOperatorManagementService(db);
  router.use(auth);
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });
  const run =
    (assign?: boolean): RequestHandler =>
    async (req, res, next) => {
      try {
        const actor = req.user?.id;
        if (!actor) {
          res.status(401).json({ success: false, code: "AUTH_REQUIRED" });
          return;
        }
        // Role/service overrides are never accepted, even if they match today's scope.
        if (assign !== undefined && Object.keys(req.body ?? {}).length) {
          throw new OperationError(
            400,
            "UNEXPECTED_OPERATOR_FIELDS",
            "대상 사용자만 선택해 주세요.",
          );
        }
        const data =
          assign === undefined
            ? await service.list(
                actor,
                req.params.scope,
                typeof req.query.q === "string" ? req.query.q : "",
              )
            : await service.change(
                actor,
                req.params.scope,
                req.params.userId,
                assign,
              );
        res.json({ success: true, data });
      } catch (error) {
        if (error instanceof OperationError)
          res
            .status(error.status)
            .json({ success: false, code: error.code, error: error.message });
        else if (error instanceof DemoAccountForbiddenError)
          res
            .status(error.statusCode)
            .json({ success: false, code: error.code, error: error.message });
        else next(error);
      }
    };
  router.get("/:scope", run());
  router.post("/:scope/operators/:userId", run(true));
  router.delete("/:scope/operators/:userId", run(false));
  return router;
}
