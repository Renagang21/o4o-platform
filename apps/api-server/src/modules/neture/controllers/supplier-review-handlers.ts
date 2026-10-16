import type { Request, Response } from "express";
import type { DataSource } from "typeorm";
import type { SupplierRequest } from "../middleware/neture-identity.middleware.js";
import {
  SupplierReviewRequestService,
  SupplierReviewError,
} from "../services/supplier-review-request.service.js";
import { notificationService } from "../../../services/NotificationService.js";
import logger from "../../../utils/logger.js";

type ActorRequest = Request & { user?: { id: string } };
export function createSupplierReviewHandlers(ds: DataSource) {
  const service = new SupplierReviewRequestService(ds);
  const run = async (res: Response, work: () => Promise<unknown>) => {
    try {
      res.json({ success: true, data: await work() });
    } catch (e) {
      if (e instanceof SupplierReviewError)
        return res
          .status(e.status)
          .json({
            success: false,
            error: { code: e.code, message: e.message },
          });
      logger.error("[SupplierReview] Request failed", {
        error: e instanceof Error ? e.name : "UnknownError",
      });
      res
        .status(500)
        .json({
          success: false,
          error: {
            code: "REVIEW_REQUEST_FAILED",
            message: "보완 요청을 처리하지 못했습니다.",
          },
        });
    }
  };
  return {
    operatorQueue: (req: Request, res: Response) =>
      run(res, () =>
        service.queue(
          req.query.state ?? "submitted",
          Number(req.query.page ?? 1),
        ),
      ),
    operatorList: (req: Request, res: Response) =>
      run(res, () =>
        service.list(req.params.id, Number(req.query.page ?? 1), true),
      ),
    ownList: (req: Request, res: Response) =>
      run(res, () =>
        service.list(
          (req as SupplierRequest).supplierId,
          Number(req.query.page ?? 1),
          false,
        ),
      ),
    create: (req: ActorRequest, res: Response) =>
      run(res, async () => {
        if (!req.user?.id)
          throw new SupplierReviewError(
            401,
            "UNAUTHORIZED",
            "로그인이 필요합니다.",
          );
        const request = await service.create(
          req.params.id,
          req.user.id,
          req.body ?? {},
        );
        // Only current organization owners receive the notification. A failure never retries the committed request.
        let notificationCreated = false;
        try {
          const owners: { user_id: string }[] = await ds.query(
            `SELECT DISTINCT om.user_id FROM neture_suppliers s
          JOIN organization_members om ON om.organization_id = s.organization_id AND om.role = 'owner' AND om.left_at IS NULL WHERE s.id = $1`,
            [req.params.id],
          );
          const results = await Promise.allSettled(
            owners.map((owner) =>
              notificationService.createNotification({
                userId: owner.user_id,
                type: "custom",
                serviceKey: "neture",
                title: "공급자 정보 보완 요청",
                message:
                  "사업자 정보에서 보완 항목을 확인하고 수정 후 제출해 주세요.",
                metadata: {
                  supplierId: req.params.id,
                  requestId: request.id,
                  targetUrl: "/mypage/business-profile",
                },
              }),
            ),
          );
          notificationCreated =
            results.length > 0 &&
            results.every((r) => r.status === "fulfilled");
        } catch {
          logger.warn("[SupplierReview] Notification creation failed");
        }
        return { ...request, notificationCreated };
      }),
    submit: (req: ActorRequest, res: Response) =>
      run(res, () => {
        if (!req.user?.id)
          throw new SupplierReviewError(
            401,
            "UNAUTHORIZED",
            "로그인이 필요합니다.",
          );
        return service.transition(
          (req as SupplierRequest).supplierId,
          req.params.requestId,
          req.user.id,
          "submit",
          req.body ?? {},
        );
      }),
    resolve: (req: ActorRequest, res: Response) =>
      run(res, () => {
        if (!req.user?.id)
          throw new SupplierReviewError(
            401,
            "UNAUTHORIZED",
            "로그인이 필요합니다.",
          );
        return service.transition(
          req.params.id,
          req.params.requestId,
          req.user.id,
          "resolve",
          req.body ?? {},
        );
      }),
  };
}
