import { Router } from "express";
import {
  authenticate,
  type AuthRequest,
} from "../../middleware/auth.middleware.js";
import { AppDataSource } from "../../database/connection.js";
import { centralOperationRoles } from "../../services/admin/central-operation-access.js";

/** Separate central entry proof; domain APIs retain their own service and organization guards. */
export const centralOperationAccessRouter = Router();
async function requireCentralOperation(
  req: AuthRequest,
  res: import("express").Response,
  next: import("express").NextFunction,
) {
  res.setHeader("Cache-Control", "private, no-store");
  if ((req as AuthRequest & { authMethod?: string }).authMethod !== "google") {
    res.status(403).json({ success: false, code: "GOOGLE_SESSION_REQUIRED" });
    return;
  }
  try {
    const roles = await centralOperationRoles(AppDataSource, req.user!.id);
    if (!roles.length) {
      res
        .status(403)
        .json({ success: false, code: "CENTRAL_DELEGATION_REQUIRED" });
      return;
    }
    res.locals.centralOperationRoles = roles;
    next();
  } catch {
    res
      .status(503)
      .json({ success: false, code: "CENTRAL_ACCESS_UNAVAILABLE" });
  }
}
centralOperationAccessRouter.use(authenticate, requireCentralOperation);
centralOperationAccessRouter.get("/", (_req, res) => {
  res.json({
    success: true,
    data: { roles: res.locals.centralOperationRoles },
  });
});
