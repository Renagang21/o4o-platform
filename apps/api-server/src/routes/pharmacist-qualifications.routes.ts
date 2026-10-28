import { Router } from "express";
import { z } from "zod";
import {
  authenticate,
  type AuthRequest,
} from "../middleware/auth.middleware.js";
import { apiLimiter } from "../middleware/rateLimiter.js";
import { AppDataSource } from "../database/connection.js";
import { OperationError } from "../services/operations/operation-audit.js";
import { PharmacistQualificationService } from "../services/qualifications/pharmacist-qualification.service.js";

export const pharmacistQualificationsRouter = Router();
pharmacistQualificationsRouter.use(
  authenticate,
  apiLimiter,
  (_req, res, next) => {
    res.setHeader("Cache-Control", "private, no-store");
    next();
  },
);
const service = () => new PharmacistQualificationService(AppDataSource);
const handle =
  (work: (req: AuthRequest) => Promise<unknown>) =>
  async (req: AuthRequest, res: import("express").Response) => {
    try {
      res.json({ success: true, data: await work(req) });
    } catch (error) {
      if (error instanceof OperationError) {
        res
          .status(error.status)
          .json({ success: false, code: error.code, error: error.message });
        return;
      }
      if (error instanceof z.ZodError) {
        res
          .status(400)
          .json({
            success: false,
            code: "INVALID_QUALIFICATION_INPUT",
            error: "자격 정보와 확인 항목을 다시 확인해 주세요.",
          });
        return;
      }
      res
        .status(503)
        .json({
          success: false,
          code: "QUALIFICATION_UNAVAILABLE",
          error: "자격 정보를 처리하지 못했습니다. 다시 조회해 주세요.",
        });
    }
  };
const google = (req: AuthRequest) => {
  if ((req as AuthRequest & { authMethod?: string }).authMethod !== "google")
    throw new OperationError(
      403,
      "GOOGLE_SESSION_REQUIRED",
      "중앙 운영은 Google 로그인이 필요합니다.",
    );
};
pharmacistQualificationsRouter.get(
  "/me",
  handle((req) => service().mine(req.user!.id)),
);
pharmacistQualificationsRouter.post(
  "/me",
  handle((req) => {
    const input = z
      .object({
        licenseNumber: z.string().trim().min(1).max(100),
        ownLicenseConfirmed: z.literal(true),
      })
      .strict()
      .parse(req.body);
    return service().request(req.user!.id, input.licenseNumber);
  }),
);
pharmacistQualificationsRouter.get(
  "/review",
  handle((req) => {
    google(req);
    return service().list(
      req.user!.id,
      typeof req.query.status === "string" ? req.query.status : "pending",
      Number(req.query.page ?? 1),
    );
  }),
);
pharmacistQualificationsRouter.post(
  "/review/:userId",
  handle((req) => {
    google(req);
    const target = z.string().uuid().parse(req.params.userId);
    const input = z
      .object({
        action: z.enum(["approve", "reject", "revoke"]),
        reason: z.string().trim().min(1).max(2000),
        version: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}$/),
        licenseEvidenceChecked: z.boolean().optional(),
      })
      .strict()
      .parse(req.body);
    return service().decide(req.user!.id, target, {
      action: input.action!,
      reason: input.reason!,
      version: input.version!,
      licenseEvidenceChecked: input.licenseEvidenceChecked,
    });
  }),
);
