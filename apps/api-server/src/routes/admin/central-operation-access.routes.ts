import { centralNotificationMenuPredicate } from '../../services/admin/central-notification-scope.js';
import { Router } from "express";
import {
  authenticate,
  type AuthRequest,
} from "../../middleware/auth.middleware.js";
import { AppDataSource } from "../../database/connection.js";
import { centralOperationRoles } from "../../services/admin/central-operation-access.js";
import { centralOperationOverview } from "../../services/admin/central-operation-overview.js";
import { apiLimiter } from "../../middleware/rateLimiter.js";
import { centralOperationMenuKeys } from "../../services/admin/central-operation-menu-grants.js";
import { CENTRAL_OPERATION_MENUS } from '@o4o/types';

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
    res.locals.centralOperationMenus = await centralOperationMenuKeys(AppDataSource, req.user!.id, roles);
    if (!res.locals.centralOperationMenus.length) {
      res.status(403).json({ success: false, code: 'CENTRAL_MENU_NOT_DELEGATED', error: '중앙 관리자가 업무 메뉴를 위임해야 합니다.' });
      return;
    }
    next();
  } catch {
    res
      .status(503)
      .json({ success: false, code: "CENTRAL_ACCESS_UNAVAILABLE" });
  }
}
centralOperationAccessRouter.use(authenticate, apiLimiter, requireCentralOperation);
centralOperationAccessRouter.get("/overview", async (req: AuthRequest, res) => {
  try {
    res.json({ success: true, data: await centralOperationOverview(AppDataSource, req.user!.id, res.locals.centralOperationRoles, res.locals.centralOperationMenus) });
  } catch {
    res.status(503).json({ success: false, code: 'CENTRAL_OVERVIEW_UNAVAILABLE', error: '운영 알림을 불러오지 못했습니다. 다시 조회해 주세요.' });
  }
});
centralOperationAccessRouter.get('/notifications', async (req: AuthRequest, res) => {
  try {
    const keys: string[] = res.locals.centralOperationMenus;
    const services = [...new Set(CENTRAL_OPERATION_MENUS.filter(menu => keys.includes(menu.key)).map(menu => menu.service))];
    const rows = await AppDataSource.query(`SELECT id,type,title,message,metadata,"serviceKey","isRead","createdAt" FROM notifications
      WHERE "userId"=$1 AND "serviceKey"=ANY($2::text[]) AND "organizationId" IS NULL AND ${centralNotificationMenuPredicate} ORDER BY "isRead" ASC,"createdAt" DESC,id DESC LIMIT 20`, [req.user!.id, services, keys]);
    const [count] = await AppDataSource.query(`SELECT COUNT(*)::int count FROM notifications WHERE "userId"=$1
      AND "serviceKey"=ANY($2::text[]) AND "organizationId" IS NULL AND "isRead"=false AND ${centralNotificationMenuPredicate}`, [req.user!.id, services, keys]);
    res.json({ success: true, data: { notifications: rows, unreadCount: Number(count.count) } });
  } catch {
    res.status(503).json({ success: false, code: 'CENTRAL_NOTIFICATIONS_UNAVAILABLE', error: '운영 알림을 조회하지 못했습니다.' });
  }
});
centralOperationAccessRouter.get("/", (_req, res) => {
  res.json({
    success: true,
    data: { roles: res.locals.centralOperationRoles, menuKeys: res.locals.centralOperationMenus },
  });
});
