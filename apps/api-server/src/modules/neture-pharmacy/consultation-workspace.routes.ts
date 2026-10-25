import type { ConsultationGuidanceService } from "./services/consultation-guidance.js";
import type { ConsultationSupportService } from './services/consultation-support.js';
import { Router, type Request, type RequestHandler } from "express";
import type { DataSource } from "typeorm";
import rateLimit from "express-rate-limit";
import { createHash } from "node:crypto";
import { getTrustedClientIp } from "../../utils/trusted-client-ip.js";
import { NeturePharmacyError } from "./constants.js";
import { ConsultationLayoutService } from "./services/consultation-layout.js";
import type { ConsultationStationService } from "./services/consultation-stations.js";

type StoreRequest = Request & { organizationId?: string };
const org = (req: StoreRequest) => {
  if (!req.organizationId)
    throw new NeturePharmacyError(
      403,
      "STORE_ACCESS_REQUIRED",
      "약국을 선택해 주세요.",
    );
  return req.organizationId;
};
const handle =
  (fn: (req: StoreRequest) => Promise<unknown>): RequestHandler =>
  async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    try {
      res.json({ success: true, data: await fn(req) });
    } catch (error) {
      if (error instanceof NeturePharmacyError)
        res
          .status(error.httpStatus)
          .json({ success: false, code: error.code, error: error.message });
      else
        res.status(503).json({
          success: false,
          code: "CONSULTATION_UNAVAILABLE",
          error: "상담 연결을 확인하지 못했습니다. 다시 시도해 주세요.",
        });
    }
  };

export function consultationWorkspaceRoutes(
  db: DataSource,
  stations: ConsultationStationService,
  store: RequestHandler[],
  admin: RequestHandler[],
  guidance?: ConsultationGuidanceService,
  support?: ConsultationSupportService,
) {
  const router = Router(),
    layouts = new ConsultationLayoutService(db);
  const limits = (max: number, peer = false) =>
    rateLimit({
      windowMs: 60_000,
      max,
      keyGenerator: (req: Request) =>
        peer
          ? `${getTrustedClientIp(req)}:${createHash("sha256")
              .update(String(req.body?.token ?? "").slice(0, 64))
              .digest("hex")}`
          : getTrustedClientIp(req),
      message: {
        success: false,
        code: "RATE_LIMITED",
        error: "요청이 많습니다. 잠시 후 다시 시도해 주세요.",
      },
    });
  if (guidance)
    router.post(
      "/pharmacy/consultation-guidance",
      ...store,
      limits(30),
      handle(async (req) => {
        const input = req.body ?? {},
          organizationId = org(req);
        if (input.stationId !== undefined)
          await stations.validate(
            req.user!.id!,
            organizationId,
            input.stationId,
            input.epoch,
          );
        const prepared = await guidance.prepare(
          req.user!.id!,
          organizationId,
          input,
        );
        const { proof, ...data } = prepared;
        const deliveryId =
          proof && input.stationId !== undefined
            ? await stations.recordGuidance(
                req.user!.id!,
                organizationId,
                input.stationId,
                input.epoch,
                proof,
              )
            : undefined;
        return {
          ...data,
          organizationId,
          mode: input.mode,
          language: input.language,
          deliveryId,
          sourceVersion: proof?.sourceVersion,
        };
      }),
    );
  if (support) router.post('/pharmacy/consultation-support', ...store, limits(30), handle(async req => {
    const organizationId = org(req), input = req.body ?? {};
    if (input.stationId !== undefined)
      await stations.validate(req.user!.id!, organizationId, input.stationId, input.epoch);
    const data = await support.prepare(req.user!.id!, organizationId, input);
    if (input.stationId !== undefined)
      await stations.validate(req.user!.id!, organizationId, input.stationId, input.epoch);
    return { ...data, organizationId, mode: input.mode, productId: input.productId, productKind: input.productKind };
  }));
  router.get(
    "/pharmacy/consultation-layout",
    ...store,
    handle((req) => layouts.read(org(req))),
  );
  router.get(
    "/admin/pharmacy-consultation-layouts",
    ...admin,
    handle((req) => layouts.list(req.query)),
  );
  router.put(
    "/admin/pharmacy-consultation-layouts/:organizationId",
    ...admin,
    handle((req) => {
      if (
        !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(
          req.params.organizationId,
        )
      )
        throw new NeturePharmacyError(
          400,
          "INVALID_STORE",
          "약국을 선택해 주세요.",
        );
      return layouts.save(req.params.organizationId, req.body?.operatingType);
    }),
  );
  router.post(
    "/pharmacy/consultation-stations/open",
    ...store,
    limits(30),
    handle((req) => stations.open(req.user!.id!, org(req), req.body ?? {})),
  );
  router.post(
    "/pharmacy/consultation-stations/:id/heartbeat",
    ...store,
    handle((req) =>
      stations.heartbeat(
        req.user!.id!,
        org(req),
        req.params.id,
        req.body ?? {},
      ),
    ),
  );
  router.post(
    "/pharmacy/consultation-stations/:id/pairing",
    ...store,
    limits(20),
    handle((req) =>
      stations.pairing(req.user!.id!, org(req), req.params.id, req.body ?? {}),
    ),
  );
  router.post(
    "/pharmacy/consultation-stations/:id/action",
    ...store,
    limits(90),
    handle((req) =>
      stations.action(req.user!.id!, org(req), req.params.id, req.body ?? {}),
    ),
  );
  // Capability-only endpoints. The bearer is separate from a login or display-device credential.
  router.post(
    "/pharmacy/consultation-device/claim",
    limits(10),
    handle((req) => stations.claim(req.body ?? {})),
  );
  router.post(
    "/pharmacy/consultation-device/read",
    limits(600),
    limits(100, true),
    handle((req) => stations.read(req.body ?? {})),
  );
  router.post(
    "/pharmacy/consultation-device/reply",
    limits(15, true),
    handle((req) => stations.reply(req.body ?? {})),
  );
  return router;
}
