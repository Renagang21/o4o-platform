/**
 * Hospital Pharmacy — HTTP 경계 (로그인리스 Device Enrollment + hospital 범위 AI)
 *
 * WO-O4O-HOSPITAL-PHARMACY-DEVICE-ENROLLMENT-AND-LOGINLESS-ACCESS-V1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 전용 `/api/hospital/*` 인가 (§6·§7)
 *
 *   공유 `/api/ai/*` 의 `authenticate` 를 건드리지 않는다(전역 제거 절대 금지 §7).
 *   대신 이 라우터가 device-auth 게이트를 두고, 게이트를 통과한 요청만 **기존 공통 Core**
 *   (`runHospitalDrugSurface`·`runStructuredFileUnderstanding`·`runWebResearch`)를 **소비**한다.
 *   Automation Core 는 수정하지 않는다(소비만).
 *
 *   Device credential 은 hospital-pharmacy 전용이다(§6). 이 라우터의 AI 는 hospital surface
 *   (조사·파일 이해·원내 결합·question)만 연다. O4O 계정/관리/타 서비스/조직변경/결제/승인/
 *   credential 관리로 가는 경로는 이 파일에 **없다** — device credential 로 다른 O4O API 에
 *   접근할 방법 자체가 없다(§6 FORBIDDEN, §7 절대 금지).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 두 종류의 호출자
 *
 *   공용 PC (device 쿠키)      — /session, /ai/request, /ai/file-understanding
 *   관리자 (platform:super_admin) — /admin/enrollment-codes, /admin/devices, /admin/devices/:id/revoke
 *
 *   enrollment(/enroll)만 코드 하나로 device 를 만든다(로그인 불요 · Google 로그인 아님 §5).
 */
import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import type { DataSource } from 'typeorm';
import { getTrustedClientIp } from '../../utils/trusted-client-ip.js';
import {
  HOSPITAL_DEVICE_COOKIE,
  setHospitalDeviceCookie,
  clearHospitalDeviceCookie,
} from '../../utils/cookie.utils.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { requireAdmin } from '../../common/middleware/auth/authorization.middleware.js';
import type { AuthRequest } from '../../types/auth.js';
import logger from '../../utils/logger.js';
import {
  createEnrollmentCode,
  redeemEnrollmentCode,
  resolveActiveDevice,
  revokeDevice,
  listDevices,
  listEnrollmentCodes,
  HospitalEnrollmentError,
  type HospitalDeviceRow,
} from '../../services/hospital/hospital-device.service.js';
// 공통 Core 소비(수정 금지 — Hospital 은 consumer). ai-proxy.routes 와 동일 import 경로.
import { classifyTaskModality } from '../../services/ai-tools/task-modality-router.js';
import { runHospitalDrugSurface } from '../../services/ai-tools/hospital-drug-surface.js';
import { runWebResearch } from '../../services/ai/web-research.service.js';
import { runStructuredFileUnderstanding } from '../../services/ai-tools/structured-file-understanding.js';
import { inferFileStructure } from '../../services/ai-tools/file-understanding/structure-inference.service.js';
import type { TargetField, TargetSchema } from '../../services/ai-tools/file-understanding/contract.js';

interface HospitalDeviceRequest extends Request {
  hospitalDevice?: HospitalDeviceRow;
}

const MAX_TEXT_LEN = 4000;
const FILE_UNDERSTANDING_MAX_BASE64 = 15 * 1024 * 1024; // base64 ≈ 원본 11MB (ai-proxy 와 동일)

// ── Rate limit (§15) ─────────────────────────────────────────────────────────
// enroll: IP 기준 — 코드 추측 공격 창을 좁힌다(store-tablet pairing 선례와 동일 수치).
const enrollLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { success: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', code: 'RATE_LIMIT_EXCEEDED' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => getTrustedClientIp(req),
});

// AI: device 기준(§15 — device-based rate limit). device 미해결 시 IP fallback.
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.', code: 'RATE_LIMIT_EXCEEDED' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: any) => {
    const device = (req as HospitalDeviceRequest).hospitalDevice;
    return device ? `hd:${device.id}` : `ip:${getTrustedClientIp(req)}`;
  },
});

// ── compact target schema 검증 (ai-proxy 와 동일 계약 · strictNullChecks off 대응) ─────
function validateInjectedTargetSchema(value: unknown): { schema: TargetSchema | null; code: string | null } {
  if (!value || typeof value !== 'object') return { schema: null, code: 'TARGET_SCHEMA_REQUIRED' };
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || v.id.trim() === '') return { schema: null, code: 'TARGET_SCHEMA_ID_INVALID' };
  if (!Array.isArray(v.fields) || v.fields.length === 0) return { schema: null, code: 'TARGET_SCHEMA_FIELDS_INVALID' };
  const fields: TargetField[] = [];
  for (const f of v.fields) {
    if (!f || typeof f !== 'object') return { schema: null, code: 'TARGET_SCHEMA_FIELD_INVALID' };
    const fo = f as Record<string, unknown>;
    if (typeof fo.key !== 'string' || fo.key.trim() === '') return { schema: null, code: 'TARGET_SCHEMA_FIELD_KEY_INVALID' };
    if (typeof fo.description !== 'string' || fo.description.trim() === '')
      return { schema: null, code: 'TARGET_SCHEMA_FIELD_DESC_INVALID' };
    if (typeof fo.required !== 'boolean') return { schema: null, code: 'TARGET_SCHEMA_FIELD_REQUIRED_INVALID' };
    const examples = Array.isArray(fo.examples)
      ? fo.examples.filter((e): e is string => typeof e === 'string')
      : undefined;
    fields.push({ key: fo.key, description: fo.description, required: fo.required, examples });
  }
  if (!fields.some((f) => f.required)) return { schema: null, code: 'TARGET_SCHEMA_NO_REQUIRED' };
  return { schema: { id: v.id, fields }, code: null };
}

// device 스코프에서 exec 는 절대 호출되지 않는다(suppressLocal=true → local plan 미발생).
// 방어적으로 호출되면 거부한다(권한을 넓히지 않는다 §6).
const denyExec = async () => ({ ok: false, tool: 'none', reason: 'local_exec_not_available_for_device' });

/**
 * device 스코프 hospital-drug 요청 — userId 없이 공통 Core 를 소비한다.
 *   - screen modality → PC 자동화는 device 만으로 실행 불가 → 안내(QUESTION 은 정상 상태 §14).
 *   - 그 밖 → runHospitalDrugSurface(suppressLocal=true): 서버 원내 조회 없이 research/question 만.
 *     원내 결합은 클라이언트가 브라우저 로컬 데이터로 한다(§12·§13).
 */
async function runDeviceAiRequest(text: string): Promise<{ kind: 'chat' | 'work'; message: string; plan: string }> {
  const modality = classifyTaskModality({ request: text, image: null });

  if (modality.modality === 'screen') {
    return {
      kind: 'work',
      plan: 'screen',
      message:
        'PC 화면 자동화(원내 프로그램 조작 등)는 이 PC 연결(device)만으로는 실행할 수 없습니다. ' +
        '화면 자동화가 필요하면 담당자에게 요청해 주세요. 약품 조사·원내 보유 확인은 그대로 이용할 수 있습니다.',
    };
  }

  const result = await runHospitalDrugSurface(
    {
      exec: denyExec,
      research: async (query) => {
        const r = await runWebResearch({ query });
        return { content: r.content, model: r.model, grounding: r.grounding };
      },
    },
    text,
    modality.modality,
    true, // suppressLocal — device 는 서버 원내 조회를 열지 않는다.
  );

  // 안전 로그 — plan·경로만(값 원문 없음, ai-proxy 규칙 동일).
  logger.info('hospital device ai', {
    plan: result.plan,
    usedResearch: result.usedResearch,
    groundingUsed: result.groundingUsed ?? null,
  });
  return { kind: 'chat', message: result.answer, plan: result.plan };
}

/**
 * Hospital device 게이트 — device 쿠키만 신뢰한다.
 *
 * §7 "user auth OR device auth" 에서 병원약국의 정본 principal 은 **device** 다(로그인리스).
 * 쿠키가 없거나 revoke 된 device 면 401 HOSPITAL_DEVICE_REQUIRED → 클라이언트가 재연결을 안내한다(§11·§16).
 * 요청 body 의 deviceId 는 읽지 않는다 — 신원은 오직 HttpOnly 쿠키에서만 온다(사칭 방지).
 */
function requireHospitalDevice(dataSource: DataSource) {
  return async (req: HospitalDeviceRequest, res: Response, next: NextFunction): Promise<void> => {
    const token = (req.cookies?.[HOSPITAL_DEVICE_COOKIE] as string | undefined) ?? undefined;
    try {
      const device = await resolveActiveDevice(dataSource, token);
      if (!device) {
        res.status(401).json({
          success: false,
          error: '이 PC 를 병원약국 서비스에 먼저 연결해 주세요.',
          code: 'HOSPITAL_DEVICE_REQUIRED',
        });
        return;
      }
      req.hospitalDevice = device;
      next();
    } catch (error) {
      logger.error('hospital device resolve failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ success: false, error: '연결 상태를 확인하지 못했습니다.', code: 'DEVICE_RESOLVE_FAILED' });
    }
  };
}

export function createHospitalRoutes(dataSource: DataSource): Router {
  const router = Router();
  const deviceGate = requireHospitalDevice(dataSource);

  // ── 공용 PC: 연결 상태 조회(§11) ──────────────────────────────────────────
  // 쿠키가 있으면 enrolled=true. httpOnly 라 JS 가 쿠키를 못 읽으므로 클라이언트는 이걸로 판단한다.
  router.get('/session', async (req: Request, res: Response) => {
    const token = (req.cookies?.[HOSPITAL_DEVICE_COOKIE] as string | undefined) ?? undefined;
    const device = await resolveActiveDevice(dataSource, token).catch(() => null);
    if (!device) {
      return res.json({ success: true, data: { enrolled: false } });
    }
    return res.json({
      success: true,
      data: { enrolled: true, device: { id: device.id, label: device.label } },
    });
  });

  // ── 공용 PC: 코드로 이 PC 연결(§5·§11) ────────────────────────────────────
  router.post('/enroll', enrollLimiter as any, async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const code = typeof body.code === 'string' ? body.code : '';
    const label = typeof body.label === 'string' ? body.label : null;
    if (!code.trim()) {
      return res.status(400).json({ success: false, error: '연결 코드를 입력해 주세요.', code: 'CODE_REQUIRED' });
    }
    try {
      const result = await redeemEnrollmentCode(dataSource, { code, label });
      setHospitalDeviceCookie(req, res, result.deviceToken);
      logger.info('hospital device enrolled', { deviceId: result.deviceId });
      return res.json({
        success: true,
        data: { connected: true, device: { id: result.deviceId, label: result.label } },
      });
    } catch (error) {
      if (error instanceof HospitalEnrollmentError) {
        const status = error.code === 'CODE_NOT_REDEEMABLE' || error.code === 'CODE_INVALID' ? 400 : 502;
        return res.status(status).json({ success: false, error: error.message, code: error.code });
      }
      logger.error('hospital enroll failed', { error: error instanceof Error ? error.message : String(error) });
      return res.status(502).json({ success: false, error: '이 PC 를 연결하지 못했습니다.', code: 'ENROLL_FAILED' });
    }
  });

  // ── 공용 PC: 자연어 조사(device 범위)(§12) ────────────────────────────────
  router.post('/ai/request', deviceGate, aiLimiter as any, async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) {
      return res.status(400).json({ success: false, error: '요청 내용을 입력해 주세요.', code: 'TEXT_REQUIRED' });
    }
    if (text.length > MAX_TEXT_LEN) {
      return res.status(400).json({ success: false, error: '요청이 너무 깁니다.', code: 'TEXT_TOO_LONG' });
    }
    try {
      const reply = await runDeviceAiRequest(text);
      return res.json({ success: true, data: reply });
    } catch (error) {
      logger.error('hospital ai request failed', { error: error instanceof Error ? error.message : String(error) });
      return res.status(502).json({ success: false, error: '응답을 생성하지 못했습니다. 다시 시도해 주세요.', code: 'AI_ERROR' });
    }
  });

  // ── 공용 PC: 원내 목록 파일 이해(device 범위)(§12) ────────────────────────
  router.post('/ai/file-understanding', deviceGate, aiLimiter as any, async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const fileBase64 = typeof body.fileBase64 === 'string' ? body.fileBase64 : '';
    if (fileBase64.trim() === '') {
      return res.status(400).json({ success: false, error: '파일이 필요합니다.', code: 'FILE_REQUIRED' });
    }
    if (fileBase64.length > FILE_UNDERSTANDING_MAX_BASE64) {
      return res.status(413).json({ success: false, error: '파일이 너무 큽니다.', code: 'FILE_TOO_LARGE' });
    }
    const schemaCheck = validateInjectedTargetSchema(body.targetSchema);
    const targetSchema = schemaCheck.schema;
    if (!targetSchema) {
      return res.status(400).json({ success: false, error: '대상 스키마가 올바르지 않습니다.', code: schemaCheck.code ?? 'TARGET_SCHEMA_INVALID' });
    }
    let bytes: Uint8Array;
    try {
      bytes = new Uint8Array(Buffer.from(fileBase64, 'base64'));
    } catch {
      return res.status(400).json({ success: false, error: '파일을 해석할 수 없습니다.', code: 'FILE_DECODE_FAILED' });
    }
    if (bytes.length === 0) {
      return res.status(400).json({ success: false, error: '빈 파일입니다.', code: 'FILE_EMPTY' });
    }
    try {
      const result = await runStructuredFileUnderstanding(bytes, targetSchema, {
        infer: async (profile, injected) => {
          const r = await inferFileStructure({ profile, targetSchema: injected });
          return { inference: r.inference, model: r.model };
        },
      });
      logger.info('hospital device file-understanding', {
        schemaId: targetSchema.id,
        totalRows: result.totalRows,
        skipped: result.skipped,
        recordCount: result.records.length,
        verdictOk: result.verdict.ok,
        model: result.model,
      });
      return res.json({
        success: true,
        data: {
          records: result.records,
          verdict: result.verdict,
          question: result.question,
          totalRows: result.totalRows,
          skipped: result.skipped,
          model: result.model,
        },
      });
    } catch (error) {
      logger.error('hospital file-understanding failed', {
        schemaId: targetSchema.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(502).json({ success: false, error: '파일 구조를 해석하지 못했습니다.', code: 'FILE_UNDERSTANDING_FAILED' });
    }
  });

  // ── 관리자(platform:super_admin): 최소 발급/폐기(§10·§16) ─────────────────
  router.post('/admin/enrollment-codes', authenticate, requireAdmin, async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    const body = (req.body ?? {}) as Record<string, unknown>;
    const label = typeof body.label === 'string' ? body.label : null;
    try {
      const created = await createEnrollmentCode(dataSource, { createdBy: authReq.user?.id ?? null, label });
      logger.info('hospital enrollment code issued', { id: created.id, by: authReq.user?.id ?? null });
      return res.json({
        success: true,
        data: { id: created.id, code: created.code, label: created.label, expiresAt: created.expiresAt },
      });
    } catch (error) {
      logger.error('hospital code issue failed', { error: error instanceof Error ? error.message : String(error) });
      return res.status(502).json({ success: false, error: '연결 코드를 발급하지 못했습니다.', code: 'CODE_ISSUE_FAILED' });
    }
  });

  router.get('/admin/enrollment-codes', authenticate, requireAdmin, async (_req: Request, res: Response) => {
    const codes = await listEnrollmentCodes(dataSource, { limit: 50 }).catch(() => []);
    return res.json({ success: true, data: { codes } });
  });

  router.get('/admin/devices', authenticate, requireAdmin, async (_req: Request, res: Response) => {
    const devices = await listDevices(dataSource, { limit: 200 }).catch(() => []);
    return res.json({ success: true, data: { devices } });
  });

  router.post('/admin/devices/:id/revoke', authenticate, requireAdmin, async (req: Request, res: Response) => {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ success: false, error: 'device id 가 필요합니다.', code: 'DEVICE_ID_REQUIRED' });
    }
    try {
      const revoked = await revokeDevice(dataSource, id);
      if (!revoked) {
        return res.status(404).json({ success: false, error: '이미 해제되었거나 없는 PC 입니다.', code: 'DEVICE_NOT_ACTIVE' });
      }
      logger.info('hospital device revoked', { deviceId: id, by: (req as AuthRequest).user?.id ?? null });
      return res.json({ success: true, data: { revoked: true } });
    } catch (error) {
      logger.error('hospital device revoke failed', { error: error instanceof Error ? error.message : String(error) });
      return res.status(502).json({ success: false, error: 'PC 연결을 해제하지 못했습니다.', code: 'REVOKE_FAILED' });
    }
  });

  // (선택) 이 PC 스스로 연결 해제 — 쿠키만 제거한다. 서버 status 는 관리자 revoke 로만 바뀐다.
  router.post('/disconnect', (req: Request, res: Response) => {
    clearHospitalDeviceCookie(req, res);
    return res.json({ success: true, data: { disconnected: true } });
  });

  return router;
}

export default createHospitalRoutes;
