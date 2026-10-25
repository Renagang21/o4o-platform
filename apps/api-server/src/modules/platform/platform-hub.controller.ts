/** Platform health: read-only, platform administrator only. Business approval/trigger operations belong to each service. */
import { Router, type Router as ExpressRouter } from "express";
import type { DataSource } from "typeorm";
import { requireAuth, requireRole } from "../../middleware/auth.middleware.js";
import { ServiceHealthService } from "./service-health.service.js";

export function createPlatformHubController(
  dataSource: DataSource,
): ExpressRouter {
  const router = Router();
  const health = new ServiceHealthService(dataSource);
  router.get(
    "/summary",
    requireAuth,
    requireRole(["platform:super_admin"]),
    async (_req, res) => {
      res.setHeader("Cache-Control", "private, no-store");
      try {
        res.json({ success: true, data: await health.snapshot() });
      } catch {
        res.status(503).json({
          success: false,
          error: "서비스 상태를 확인하지 못했습니다. 다시 조회해 주세요.",
        });
      }
    },
  );
  return router;
}
