import { Router } from "express";
import type { DataSource } from "typeorm";
import {
  AiManagementError,
  AiManagementService,
} from "../services/ai-management/management.service.js";

/** Mounted behind authenticate + requireAdmin by ai-admin.routes. GET only. */
export function createAiManagementRouter(db: DataSource): Router {
  const router = Router();
  const service = new AiManagementService(db);
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });
  router.get("/", async (_req, res) => {
    try {
      return res.json({ success: true, data: await service.snapshot() });
    } catch {
      return res
        .status(503)
        .json({
          success: false,
          code: "AI_MANAGEMENT_UNAVAILABLE",
          error: "AI 운영 정보를 조회하지 못했습니다.",
        });
    }
  });
  router.get("/usage", async (req, res) => {
    try {
      const raw = req.query.days ?? "7";
      if (typeof raw !== "string" || !["7", "30", "90"].includes(raw))
        throw new AiManagementError(
          400,
          "AI_USAGE_PERIOD_INVALID",
          "조회 기간은 7일, 30일, 90일 중 선택하세요.",
        );
      return res.json({
        success: true,
        data: await service.usage(Number(raw)),
      });
    } catch (error) {
      if (error instanceof AiManagementError)
        return res
          .status(error.status)
          .json({ success: false, code: error.code, error: error.message });
      return res
        .status(503)
        .json({
          success: false,
          code: "AI_USAGE_UNAVAILABLE",
          error: "사용량을 조회하지 못했습니다.",
        });
    }
  });
  return router;
}
