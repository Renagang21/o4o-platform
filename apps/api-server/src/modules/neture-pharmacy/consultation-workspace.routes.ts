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
import { ConsultationGoogleService } from './services/consultation-google.js';
import { ModelControlService } from '../../services/ai-management/model-controls.js';
import { consultationRuntimeSchema } from '../../services/ai-management/consultation-runtime.js';
import { createPolicyExecutor } from '../ai-policy/ai-policy-factory.js';

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
      const reason = error instanceof Error ? error.message : '';
      let failure = error;
      if (!(error instanceof NeturePharmacyError)) {
        if (reason === 'QUOTA_EXCEEDED') failure = new NeturePharmacyError(429, 'CONSULTATION_QUOTA_EXCEEDED', '상담 AI 이용 한도에 도달했습니다. 문자 입력·표시를 이용해 주세요.');
        else if (reason.startsWith('AI_PRICING_')) failure = new NeturePharmacyError(503, 'CONSULTATION_PRICING_REQUIRED', '선택한 실행 수단의 가격 설정을 관리자에게 확인해 주세요.');
        else if (reason.startsWith('AI_DISABLED')) failure = new NeturePharmacyError(503, 'CONSULTATION_AI_DISABLED', '관리자가 현재 상담 AI 실행을 중지했습니다. 문자 입력·표시를 이용해 주세요.');
      }
      if (failure instanceof NeturePharmacyError)
        res
          .status(failure.httpStatus)
          .json({ success: false, code: failure.code, error: failure.message });
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
  router.post('/pharmacy/consultation-speech/:operation', ...store, limits(30), handle(async req => {
    const input = req.body ?? {}, organizationId = org(req);
    const authorize = async () => {
      await stations.authorizeSpeech(req.user!.id!, organizationId, String(input.mode));
      if (input.stationId !== undefined) await stations.validate(req.user!.id!, organizationId, input.stationId, input.epoch);
      return true;
    };
    await authorize();
    const runtime = consultationRuntimeSchema.parse((await new ModelControlService(db).read()).consultation ?? {});
    const operation = req.params.operation;
    if (!['recognize', 'synthesize'].includes(operation) ||
      (operation === 'recognize' ? runtime.recognition : runtime.synthesis) !== 'google-cloud')
      throw new NeturePharmacyError(409, 'CONSULTATION_PROVIDER_CHANGED', '현재 상담 실행 수단을 다시 확인해 주세요.');
    await createPolicyExecutor(db).assertEnabled('CONTENT_TRANSLATION');
    const cloud = new ConsultationGoogleService(db), access = { actorId: req.user!.id!, authorize };
    const data = operation === 'recognize'
      ? await cloud.recognize(input.audioBase64, input.language === 'auto' && runtime.detectLanguage ? runtime.speechLanguages : [String(input.language)], access)
      : await cloud.synthesize(typeof input.text === 'string' ? input.text : '', String(input.language), access);
    await authorize();
    return { ...data, organizationId, mode: input.mode };
  }));
  if (guidance)
    router.post('/pharmacy/consultation-products/prepare', ...store, limits(30), handle(async req => {
      const input = req.body ?? {}, organizationId = org(req);
      if (input.stationId !== undefined) await stations.validate(req.user!.id!, organizationId, input.stationId, input.epoch);
      const result = await guidance.searchSupportProducts(req.user!.id!, organizationId, input);
      if (input.stationId !== undefined) await stations.validate(req.user!.id!, organizationId, input.stationId, input.epoch);
      return { ...result, organizationId, mode: input.mode };
    }));
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
  router.post('/pharmacy/consultation-device/speech/:operation', limits(15, true), handle(async req => {
    const input = req.body ?? {}, owner = await stations.deviceSpeechAccess(input);
    const authorize = async () => {
      const current = await stations.deviceSpeechAccess(input);
      if (current.actorId !== owner.actorId || current.organizationId !== owner.organizationId || current.mode !== owner.mode ||
        current.language !== owner.language || JSON.stringify(current.shared) !== JSON.stringify(owner.shared))
        throw new NeturePharmacyError(409, 'CONSULTATION_CHANGED', '현재 안내가 변경되었습니다. 다시 확인해 주세요.');
      return true;
    };
    const runtime = consultationRuntimeSchema.parse((await new ModelControlService(db).read()).consultation ?? {});
    const operation = req.params.operation;
    if (!['recognize', 'synthesize'].includes(operation) || (operation === 'recognize' ? runtime.recognition : runtime.synthesis) !== 'google-cloud')
      throw new NeturePharmacyError(409, 'CONSULTATION_PROVIDER_CHANGED', '상담 실행 수단을 다시 확인해 주세요.');
    await createPolicyExecutor(db).assertEnabled('CONTENT_TRANSLATION');
    const cloud = new ConsultationGoogleService(db), access = { actorId: owner.actorId, authorize };
    return operation === 'recognize'
      ? cloud.recognize(input.audioBase64, input.language === 'auto' && runtime.detectLanguage ? runtime.speechLanguages : [String(input.language)], access)
      : cloud.synthesize(typeof owner.shared.text === 'string' ? owner.shared.text : '', String(owner.shared.language ?? owner.language), access);
  }));
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
