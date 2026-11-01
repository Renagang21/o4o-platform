import { Router } from "express";
import type { DataSource } from "typeorm";
import {
  ModelControlService,
  ModelControlError,
} from "../services/ai-management/model-controls.js";
import type { AuthRequest } from "../types/auth.js";
import {
  AiManagementError,
  AiManagementService,
} from "../services/ai-management/management.service.js";

/** Mounted behind authenticate + requireAdmin by ai-admin.routes. */
export function createAiManagementRouter(db: DataSource): Router {
  const router = Router();
  const service = new AiManagementService(db);
  const models = new ModelControlService(db);
  router.use((_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
  });
  const modelOperation =
    (run: (req: AuthRequest) => Promise<unknown>, status = 200) =>
    async (req: AuthRequest, res: import("express").Response) => {
      try {
        return res.status(status).json({ success: true, data: await run(req) });
      } catch (error) {
        const known = error instanceof ModelControlError;
        return res
          .status(known ? error.status : 503)
          .json({
            success: false,
            code: known ? error.code : "AI_MODEL_CONTROL_UNAVAILABLE",
            error: known
              ? error.message
              : "모델 설정을 처리하지 못했습니다. 다시 조회해 주세요.",
          });
      }
    };
  const actor = (req: AuthRequest) => {
    if (!req.user?.id)
      throw new ModelControlError(
        401,
        "AUTH_REQUIRED",
        "관리자 로그인이 필요합니다.",
      );
    return req.user.id;
  };
  router.get(
    "/models",
    modelOperation(() => models.snapshot()),
  );
  router.put('/consultation-runtime', modelOperation(req => models.change(req.body?.revision, actor(req), {
    action: 'consultation-runtime', runtime: req.body?.runtime,
  })));
  router.post(
    "/models",
    modelOperation(
      (req) =>
        models.change(req.body?.revision, actor(req), {
          action: "create",
          model: req.body?.model,
        }),
      201,
    ),
  );
  router.put(
    "/models/:provider/:model",
    modelOperation((req) =>
      models.change(req.body?.revision, actor(req), {
        action: "update",
        provider: req.params.provider,
        id: req.params.model,
        model: req.body?.model,
      }),
    ),
  );
  router.delete(
    "/models/:provider/:model",
    modelOperation((req) =>
      models.change(req.body?.revision, actor(req), {
        action: "delete",
        provider: req.params.provider,
        id: req.params.model,
      }),
    ),
  );
  router.put(
    "/model-selections/:target",
    modelOperation((req) =>
      models.change(req.body?.revision, actor(req), {
        action: "select",
        target: req.params.target,
        selection: req.body?.selection,
      }),
    ),
  );
  router.get("/", async (_req, res) => {
    try {
      return res.json({ success: true, data: await service.snapshot() });
    } catch {
      return res.status(503).json({
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
      return res.status(503).json({
        success: false,
        code: "AI_USAGE_UNAVAILABLE",
        error: "사용량을 조회하지 못했습니다.",
      });
    }
  });
  return router;
}
