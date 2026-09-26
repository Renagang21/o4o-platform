/**
 * Hospital Pharmacy — HTTP 경계 (무로그인 공용 업무 서비스 · hospital 범위 AI)
 *
 * WO-O4O-HOSPITAL-PHARMACY-V1-FIXED-LOCAL-FILE-AND-LOGINLESS-SIMPLIFICATION
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * V1 운영 방식 (§0·§1)
 *
 *   병원 PC → Chrome/Edge → neture.co.kr/hospital → 최초 1회 원내 약품 폴더 연결 → hospital-drugs.xlsx.
 *   개인 로그인 · device enrollment · 연결 코드 · device credential 은 **없다**.
 *   (이전 device enrollment 라우트 /session·/enroll·/disconnect·/admin/* 는 active path 에서 제거됐다.
 *    `hospital_devices`·`hospital_device_enrollment_codes` 테이블은 운영 DB 에 남지만 미사용 — drop 하지 않는다 §12.)
 *
 * 왜 전용 `/api/hospital/*` 인가 (§10)
 *
 *   공유 `/api/ai/*` 의 `authenticate` 는 건드리지 않는다(전역 해제 금지). 이 라우터는 hospital 에 필요한
 *   **bounded capability 두 개만** 연다 — 둘 다 기존 공통 Core 를 소비만 한다(Core 수정 0):
 *
 *     POST /ai/request   — 자연어 약품 조사(`runHospitalDrugSurface` · Gemini Web Research).
 *                          서버 원내 조회는 열지 않는다(suppressLocal) — 원내 결합은 브라우저가 한다.
 *     POST /ai/structure — 원내 파일 구조 이해(`inferFileStructure`). **StructureProfile(상단 표본 + 열 통계)만** 받는다.
 *                          전체 파일 업로드 경로는 없다(§18) — decode·정규화는 브라우저가 공용
 *                          `@o4o/file-understanding-core` 로 한다.
 *
 *   O4O 계정 · admin · 조직 mutation · 타 서비스 데이터 · 결제 · credential · 임의 tool 실행 경로는 이 파일에 **없다**.
 *   신원이 없으므로 쿠키·토큰을 읽지도 심지도 않는다.
 *
 * 남용 방지 (§11) — 인증 대신 rate limit:
 *   IP 기준(요청별) + hospital surface 전체 상한(모든 IP 합산). express-rate-limit 기본 memory store 라
 *   Cloud Run 인스턴스별로 센다(인스턴스 수만큼 상한이 늘어나는 근사치 — 새 quota 시스템은 만들지 않는다).
 */
import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { getTrustedClientIp } from '../../utils/trusted-client-ip.js';
import logger from '../../utils/logger.js';
// 공통 Core 소비(수정 금지 — Hospital 은 consumer). ai-proxy.routes 와 동일 import 경로.
import { classifyTaskModality } from '../../services/ai-tools/task-modality-router.js';
import { runHospitalDrugSurface } from '../../services/ai-tools/hospital-drug-surface.js';
import { runWebResearch } from '../../services/ai/web-research.service.js';
import { inferFileStructure } from '../../services/ai-tools/file-understanding/structure-inference.service.js';
import {
  STRUCTURE_PROFILE_SAMPLE_ROWS,
  COLUMN_STAT_SAMPLE_COUNT,
  COLUMN_STAT_SAMPLE_MAX_LEN,
  type ColumnStat,
  type SheetProfile,
  type StructureProfile,
  type TargetField,
  type TargetSchema,
} from '../../services/ai-tools/file-understanding/contract.js';

const MAX_TEXT_LEN = 4000;

// ── StructureProfile 상한 (§18 — 표본만 받는다. 전체 행이 실려 오면 거부) ─────────────
const PROFILE_MAX_SHEETS = 20;
const PROFILE_MAX_COLUMNS = 200;
const PROFILE_MAX_SHEET_NAME = 100;
/** 상단 표본 셀 1개 최대 길이 — 표본 행은 원문 셀이라 열 통계 표본(40자)보다 넉넉히 둔다. */
const PROFILE_MAX_CELL_LEN = 200;

// ── Rate limit (§11) ─────────────────────────────────────────────────────────
const RATE_LIMIT_BODY = {
  success: false,
  error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  code: 'RATE_LIMIT_EXCEEDED',
};

function ipLimiter(windowMs: number, max: number) {
  return rateLimit({
    windowMs,
    max,
    message: RATE_LIMIT_BODY,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: any) => `hospital:${getTrustedClientIp(req)}`,
  });
}

/** hospital surface 전체 상한 — 모든 IP 합산(비정상 반복 호출 차단). */
const surfaceLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 600,
  message: RATE_LIMIT_BODY,
  standardHeaders: false,
  legacyHeaders: false,
  keyGenerator: () => 'hospital:surface',
});

/** 조사: IP 당 1분 20회. */
const requestLimiter = ipLimiter(60 * 1000, 20);
/** 구조 이해: 같은 구조면 브라우저가 mapping 을 재사용하므로 드물다 — IP 당 10분 10회. */
const structureLimiter = ipLimiter(10 * 60 * 1000, 10);

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

function isRatio(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= 1;
}

function isCellArray(row: unknown, maxLen: number, maxCount: number): row is string[] {
  return (
    Array.isArray(row) &&
    row.length <= maxCount &&
    row.every((c) => typeof c === 'string' && c.length <= maxLen)
  );
}

/**
 * StructureProfile 검증 — 계약 형태 + **표본 상한**(§18). 전체 행이 실려 오면 거부한다.
 * 값은 다시 조립해 반환한다(알 수 없는 키를 AI 로 흘리지 않는다).
 */
export function validateStructureProfile(value: unknown): { profile: StructureProfile | null; code: string | null } {
  if (!value || typeof value !== 'object') return { profile: null, code: 'PROFILE_REQUIRED' };
  const v = value as Record<string, unknown>;
  if (v.sourceFormat !== 'xlsx' && v.sourceFormat !== 'xls' && v.sourceFormat !== 'csv') {
    return { profile: null, code: 'PROFILE_FORMAT_INVALID' };
  }
  if (!Array.isArray(v.sheets) || v.sheets.length === 0 || v.sheets.length > PROFILE_MAX_SHEETS) {
    return { profile: null, code: 'PROFILE_SHEETS_INVALID' };
  }
  const sheets: SheetProfile[] = [];
  for (const s of v.sheets) {
    if (!s || typeof s !== 'object') return { profile: null, code: 'PROFILE_SHEET_INVALID' };
    const so = s as Record<string, unknown>;
    const { sheetName, totalRows, columnCount } = so;
    if (typeof sheetName !== 'string' || sheetName.length > PROFILE_MAX_SHEET_NAME) {
      return { profile: null, code: 'PROFILE_SHEET_NAME_INVALID' };
    }
    if (typeof totalRows !== 'number' || !Number.isInteger(totalRows) || totalRows < 0) {
      return { profile: null, code: 'PROFILE_TOTAL_ROWS_INVALID' };
    }
    if (typeof columnCount !== 'number' || !Number.isInteger(columnCount) || columnCount < 0 || columnCount > PROFILE_MAX_COLUMNS) {
      return { profile: null, code: 'PROFILE_COLUMN_COUNT_INVALID' };
    }
    if (!Array.isArray(so.sampleRows) || so.sampleRows.length > STRUCTURE_PROFILE_SAMPLE_ROWS) {
      return { profile: null, code: 'PROFILE_SAMPLE_ROWS_INVALID' };
    }
    const sampleRows: string[][] = [];
    for (const row of so.sampleRows) {
      if (!isCellArray(row, PROFILE_MAX_CELL_LEN, columnCount)) return { profile: null, code: 'PROFILE_SAMPLE_ROW_INVALID' };
      sampleRows.push([...row]);
    }
    if (!Array.isArray(so.columnStats) || so.columnStats.length > columnCount) {
      return { profile: null, code: 'PROFILE_COLUMN_STATS_INVALID' };
    }
    const columnStats: ColumnStat[] = [];
    for (const c of so.columnStats) {
      if (!c || typeof c !== 'object') return { profile: null, code: 'PROFILE_COLUMN_STAT_INVALID' };
      const co = c as Record<string, unknown>;
      if (
        typeof co.index !== 'number' || !Number.isInteger(co.index) || co.index < 0 || co.index >= columnCount ||
        !isRatio(co.nonEmptyRatio) || !isRatio(co.numericRatio) ||
        !isCellArray(co.samples, COLUMN_STAT_SAMPLE_MAX_LEN, COLUMN_STAT_SAMPLE_COUNT)
      ) {
        return { profile: null, code: 'PROFILE_COLUMN_STAT_INVALID' };
      }
      columnStats.push({ index: co.index, nonEmptyRatio: co.nonEmptyRatio, numericRatio: co.numericRatio, samples: [...co.samples] });
    }
    sheets.push({ sheetName, totalRows, columnCount, sampleRows, columnStats });
  }
  return { profile: { sourceFormat: v.sourceFormat, sheets }, code: null };
}

// 무로그인 스코프에서 exec 는 절대 호출되지 않는다(suppressLocal=true → local plan 미발생).
// 방어적으로 호출되면 거부한다(권한을 넓히지 않는다 §10).
const denyExec = async () => ({ ok: false, tool: 'none', reason: 'local_exec_not_available_for_hospital' });

/**
 * hospital-drug 요청 — 사용자 신원 없이 공통 Core 를 소비한다.
 *   - screen modality → PC 자동화는 이 서비스 범위 밖 → 안내(QUESTION 은 정상 상태 §16).
 *   - 그 밖 → runHospitalDrugSurface(suppressLocal=true): 서버 원내 조회 없이 research/question 만.
 *     원내 결합은 브라우저가 실제 hospital-drugs.xlsx 에서 읽은 Local Context 로 한다(§8).
 */
async function runHospitalAiRequest(text: string): Promise<{ kind: 'chat' | 'work'; message: string; plan: string }> {
  const modality = classifyTaskModality({ request: text, image: null });

  if (modality.modality === 'screen') {
    return {
      kind: 'work',
      plan: 'screen',
      message:
        'PC 화면 자동화(원내 프로그램 조작·재고 화면 확인 등)는 이 서비스에서 실행할 수 없습니다. ' +
        '약품 조사와 원내 약품 파일 기반 확인은 그대로 이용할 수 있습니다.',
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
    true, // suppressLocal — 서버는 원내 조회를 열지 않는다.
  );

  // 안전 로그 — plan·경로만(값 원문 없음, ai-proxy 규칙 동일).
  logger.info('hospital ai', {
    plan: result.plan,
    usedResearch: result.usedResearch,
    groundingUsed: result.groundingUsed ?? null,
  });
  return { kind: 'chat', message: result.answer, plan: result.plan };
}

export function createHospitalRoutes(): Router {
  const router = Router();

  // ── 자연어 약품 조사 (§9·§10) ─────────────────────────────────────────────
  router.post('/ai/request', surfaceLimiter as any, requestLimiter as any, async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const text = typeof body.text === 'string' ? body.text.trim() : '';
    if (!text) {
      return res.status(400).json({ success: false, error: '요청 내용을 입력해 주세요.', code: 'TEXT_REQUIRED' });
    }
    if (text.length > MAX_TEXT_LEN) {
      return res.status(400).json({ success: false, error: '요청이 너무 깁니다.', code: 'TEXT_TOO_LONG' });
    }
    try {
      const reply = await runHospitalAiRequest(text);
      return res.json({ success: true, data: reply });
    } catch (error) {
      logger.error('hospital ai request failed', { error: error instanceof Error ? error.message : String(error) });
      return res.status(502).json({ success: false, error: '응답을 생성하지 못했습니다. 다시 시도해 주세요.', code: 'AI_ERROR' });
    }
  });

  // ── 원내 파일 구조 이해 — StructureProfile 만 (§6·§18) ─────────────────────
  router.post('/ai/structure', surfaceLimiter as any, structureLimiter as any, async (req: Request, res: Response) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    const profileCheck = validateStructureProfile(body.profile);
    const profile = profileCheck.profile;
    if (!profile) {
      return res.status(400).json({ success: false, error: '파일 구조 표본이 올바르지 않습니다.', code: profileCheck.code ?? 'PROFILE_INVALID' });
    }
    const schemaCheck = validateInjectedTargetSchema(body.targetSchema);
    const targetSchema = schemaCheck.schema;
    if (!targetSchema) {
      return res.status(400).json({ success: false, error: '대상 스키마가 올바르지 않습니다.', code: schemaCheck.code ?? 'TARGET_SCHEMA_INVALID' });
    }
    try {
      const { inference, model } = await inferFileStructure({ profile, targetSchema });
      logger.info('hospital file-structure', {
        schemaId: targetSchema.id,
        sheets: profile.sheets.length,
        confidence: inference.confidence,
        model,
      });
      return res.json({ success: true, data: { inference, model } });
    } catch (error) {
      logger.error('hospital file-structure failed', {
        schemaId: targetSchema.id,
        error: error instanceof Error ? error.message : String(error),
      });
      return res.status(502).json({ success: false, error: '파일 구조를 해석하지 못했습니다.', code: 'FILE_UNDERSTANDING_FAILED' });
    }
  });

  return router;
}

export default createHospitalRoutes;
