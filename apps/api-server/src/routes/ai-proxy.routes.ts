import { ModelControlService } from '../services/ai-management/model-controls.js';
import { buildHomeChatToolPresentation } from './ai-proxy/home-chat-tool-presentation.js';
import { fetchUrlText, fetchUrlContent, deriveTitleFromBlocks, detectUsageConditions, UsageWarning } from "./ai-proxy/url-content.js";
/**
 * AI Proxy Routes
 * WO-O4O-AI-SECURITY-APIKEY-REMEDIATION
 *
 * Server-side proxy endpoints for AI generation:
 * - POST /api/ai/generate — Text generation proxy (wraps aiProxyService.generateContent)
 * - POST /api/ai/vision/analyze — Vision AI proxy (Gemini Vision API)
 * - POST /api/ai/url-to-blocks — URL 콘텐츠 → Block[] 변환 (WO-O4O-AI-BLOCK-GENERATION-V1)
 *
 * All LLM API keys are server-side only. Frontend never touches provider APIs directly.
 */

import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { aiProxyService } from '../services/ai-proxy.service.js';
// WO-O4O-AI-MODEL-SELECTION-RUNTIME-RESOLVER-V1: 편집 모델을 admin 정책(AiQueryPolicy.defaultModel)에서 결정
// WO-O4O-AI-PROVIDER-ABSTRACTION-CALLPROVIDER-ALIGNMENT-V1: surface→provider guardrail gate
import { resolveEditingModel, editingSurfaceForOutputType } from '../utils/ai-editing-model-resolver.js';
import { AppDataSource } from '../database/connection.js';
import { nodeSatisfies, resolveTargetDevice } from '../services/local-agent/local-agent-service.js';
import { resolveWorkTarget } from '../services/ai-tools/work-target-resolver.js';
import type { AuthRequest } from '../types/auth.js';
import logger from '../utils/logger.js';
import { resolveAiApiKey } from '../utils/ai-key.util.js';
// WO-O4O-AI-NAVER-BLOG-ROBUST-CONTAINER-PARSER-FIX-V1:
//   Naver SmartEditor HTML 본문 추출에 견고한 HTML parser 사용.
//   기존 naive depth-counter (extractContainerByClass) 가 SE component 내부 script/comment 로
//   조기 종료되던 문제를 해결.

import { isSupportedOutputType, buildSystemPrompt, buildUserPrompt, parseResponse } from '../services/ai-prompts/index.js';
// WO-O4O-AI-URL-TO-BLOCKS-YOUTUBE-SUPPORT-V1

// WO-O4O-COMMON-HOME-AI-INPUT-V0: O4O 공통 Home 중앙 입력 — 텍스트 질의응답 전용
import { execute } from '@o4o/ai-core';
import { dynamicLimiter } from '../middleware/rateLimiter.js';
import { requireNetureMainMembership } from '../middleware/neture-main-membership.middleware.js';
import { NETURE_MAIN_MEMBERSHIP_MESSAGES, NETURE_MEMBERSHIP_REQUIRED } from '../modules/neture/services/neture-main-membership.js';
import { createLlmPlanner, createStrongLlmPlanner, createLlmPlannerForProvider, createStrongLlmPlannerForProvider, runWorkAgent } from '../services/ai-tools/work-agent-runtime.js';
// WO-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-C-TASK-MODALITY-ROUTER-V1 — per-task provider 선택(전역 provider 불변)
import { classifyTaskModality } from '../services/ai-tools/task-modality-router.js';
// WO-O4O-HOSPITAL-PHARMACY-SERVICE-FOUNDATION-V1 §3 — 공통 GFU(구조 이해) 소비 러너 + Gemini 구조 추론.
//   api-server 는 병원 도메인 어휘를 갖지 않는다: targetSchema 는 surface(클라이언트)가 주입한다.
import { runStructuredFileUnderstanding } from '../services/ai-tools/structured-file-understanding.js';
import { inferFileStructure } from '../services/ai-tools/file-understanding/structure-inference.service.js';
import { validateInjectedTargetSchema } from '../services/ai-tools/file-understanding/target-schema-validation.js';
// WO-O4O-AI-COMPOSER-UNIFIED-REQUEST-AND-ATTACHMENT-UX-V1 — 단일 요청 라우터 · 첨부 계약 · 첨부 리더 · multimodal 호출
import { validateUnifiedAttachments, unifiedAttachmentErrorMessage, firstImageAttachment, type UnifiedAttachment } from '../services/ai-tools/unified-request-contract.js';
import { classifyUnifiedRequest, confirmWorkMessage } from '../services/ai-tools/unified-request-router.js';
// WO-O4O-HOSPITAL-DRUG-GOAL-DRIVEN-AI-COMPOSER-REALIGNMENT-V1 — /hospital-drug 를 공통 Goal-driven Core 로 연결
// (research=runWebResearch · screen=Work Agent/Astra · local context · question). 구 composite(health.kr+SQLite 고정 결합)은 은퇴.
import { runHospitalDrugSurface } from '../services/ai-tools/hospital-drug-surface.js';
import { runWebResearch } from '../services/ai/web-research.service.js';
import { readAttachments, renderAttachmentTextBlocks } from '../services/ai-tools/attachment-reader.js';
import { executeMultimodalChat } from '../services/ai-tools/multimodal-chat.js';
import { resolveWorkScopeStore, STORE_SCOPED_WORKSPACES } from '../utils/work-scope-store-resolution.js';
import { runAssistantWorkTask } from '../services/assistant/personal-assistant.js';
import { createLlmCompletionVerifier, createLlmTaskUnderstander } from '../services/assistant/assistant-understanding.js';
import type { CompletionJudge, ExecutionIntent, ExecutionReport } from '../services/ai-tools/work-agent-contract.js';
import { selectToolInvocationForRequest, executeAiTool, renderToolContext, computerRequestGap, domRequestGap, pharmacyWebRequestGap, supplierRequestGap, needsLocalDeviceResolution } from '../services/ai-tools/ai-tool-router.js';
import { AI_TOOL_NAMES, assertToolAllowed, validateToolArguments, findToolDefinition, type VerifiedToolContext } from '../services/ai-tools/ai-tool-contract.js';
import { resolveAiTarget, normalizeAiError, aiErrorUserMessage } from '../utils/ai-provider-runtime.js';
/** Home AI 타임아웃 — reasoning 계열은 provider 기본 10s 로는 끊긴다. */
const HOME_CHAT_TIMEOUT_MS = 90_000;
import { validateHomeChatMessage, homeChatValidationMessage, buildHomeChatSystemPrompt, buildHomeChatUserPrompt, extractHomeChatAnswer, type VerifiedScopeFacts } from '../services/ai-prompts/homeChat.js';

const router: Router = Router();

// Neture 메인 AI(통합 요청 · 홈 대화 · 작업 에이전트) = Neture 가입 승인 회원 전용 서버 판정
// (CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1 §10 E5). body.surface 로 Neture 자격을 얻을 수 없다.
const requireNetureMember = requireNetureMainMembership(AppDataSource);
// /request 전용 — 병원약국 화면의 기존 호출(첫 요청)은 가입 조회 없이 기존 병원약국 처리로만 간다(guard 주석 참조).
const requireNetureMemberOrHospitalSurface = requireNetureMainMembership(AppDataSource, { hospitalSurface: true });

// ===========================================
// POST /api/ai/generate — Text Generation Proxy
// ===========================================
router.post('/generate', authenticate, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  }

  const { provider, model, systemPrompt, userPrompt, temperature, maxTokens, topP, topK } = req.body;

  if (!provider || !systemPrompt || !userPrompt) {
    return res.status(400).json({
      success: false,
      error: 'provider, systemPrompt, userPrompt are required',
      type: 'VALIDATION_ERROR',
    });
  }

  const requestId = crypto.randomUUID();

  try {
    const response = await aiProxyService.generateContent(
      { provider, model, systemPrompt, userPrompt, temperature, maxTokens, topP, topK },
      userId,
      requestId
    );
    return res.json({ ...response, requestId });
  } catch (error: any) {
    const status = error.type === 'RATE_LIMIT_ERROR' ? 429
                 : error.type === 'AUTH_ERROR' ? 401
                 : error.type === 'VALIDATION_ERROR' ? 400
                 : error.type === 'TIMEOUT_ERROR' ? 504
                 : 500;

    logger.error('AI generate error', { requestId, error: error.message, type: error.type });

    return res.status(status).json({
      success: false,
      error: error.message || 'AI 생성 중 오류가 발생했습니다.',
      type: error.type || 'PROVIDER_ERROR',
      retryable: error.retryable || false,
      requestId,
    });
  }
});

// ===========================================
// POST /api/ai/vision/analyze — Vision AI Proxy
// ===========================================
router.post('/vision/analyze', authenticate, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  }

  const { imageBase64, mimeType = 'image/jpeg', prompt } = req.body;

  if (!imageBase64) {
    return res.status(400).json({ success: false, error: 'imageBase64 is required' });
  }

  // Limit image size (10MB base64 ≈ 7.5MB raw)
  if (imageBase64.length > 10 * 1024 * 1024) {
    return res.status(400).json({ success: false, error: '이미지 크기가 너무 큽니다 (최대 10MB).' });
  }

  try {
    const apiKey = await resolveAiApiKey(AppDataSource, 'gemini');
    if (!apiKey) throw new Error('Gemini API key not configured. Set GEMINI_API_KEY or configure in AI Settings.');

    const systemPrompt = prompt || `이미지를 분석하고 다음 JSON 형식으로 응답하세요:
{
  "description": "이미지에 대한 상세 설명",
  "objects": ["감지된 객체 목록"],
  "colors": ["주요 색상"],
  "mood": "이미지의 분위기",
  "style": "이미지 스타일",
  "suggestions": ["이미지 활용 제안"],
  "context": "추가 맥락 정보"
}`;

    // WO-O4O-AI-MODEL-SELECTION-RUNTIME-RESOLVER-V1: 모델을 admin 정책에서 결정(fallback=gemini-2.5-flash).
    // vision 은 gemini-only 인라인 경로 → resolver 가 gemini whitelist 로 검증한 모델만 반환.
    const { model } = await new ModelControlService(AppDataSource).resolve('image.analysis', { provider: 'gemini', model: await resolveEditingModel() });
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: systemPrompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64,
              },
            },
          ],
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1000,
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error('Vision AI provider error', { status: response.status, body: errorBody });
      throw new Error(`Gemini Vision API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No response from Gemini Vision API');
    }

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : {
      description: text,
      objects: [],
      colors: [],
      mood: '',
      style: '',
      suggestions: [],
    };

    logger.info('Vision AI analysis completed', { userId, model });

    return res.json({ success: true, result });
  } catch (error: any) {
    logger.error('Vision AI error', { userId, error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message || 'Vision AI 분석 중 오류가 발생했습니다.',
    });
  }
});

// ===========================================
// WO-O4O-GOAL-DRIVEN-MULTIMODAL-WORK-AGENT-V0 — 목적 기반 Work Loop 1회
//
//   POST /api/ai/work-agent/run  { request, targetHint?, image?: { mimeType, base64 } }
//
//   상태는 이 요청 안에서만 산다(§40) — automation_jobs · 큐 · 스케줄러 · 실행 기록 테이블에 닿지 않는다(§41).
//   이미지는 메모리에서만 쓰고 버린다(§23). 로그는 usage signal(허용 키)뿐 — goal 원문 · 관찰 · 입력값 · 이미지는 실리지 않는다(§22·§23).
//
//   WO-O4O-AI-COMPOSER-UNIFIED-REQUEST-AND-ATTACHMENT-UX-V1: 이 endpoint 는 그대로 두고, 본체를 `performWorkAgentRun` 으로
//   떼어 `POST /api/ai/request`(단일 요청 라우터)도 같은 실행 경로를 쓴다. 사용자가 [작업 수행] 을 고르는 대신 서버 라우터가
//   요청 성격을 판정해 이 경로로 보낸다(§48 "명시적 호출" 원칙은 상위 라우터의 결정론적 판정으로 대체 — 안전 경계는 불변).
// ===========================================

/** route 본체가 돌려주는 응답 — 두 endpoint 가 같은 본체를 쓴다. */
interface RouteReply {
  status: number;
  body: Record<string, unknown>;
  /** 직렬화되지 않는 실행 요약 — Personal Assistant 가 Task 에 올리는 구조 키(Phase A) + 실행 보고(Phase B). */
  execution?: { taskKey: string | null; report?: ExecutionReport };
}

/**
 * 실행 가능성 확인 — 인자 형식 · 실행 노드 · tool 권한. 읽기만 한다(부작용 없음).
 * performWorkAgentRun 의 첫 단계이자, Assistant 가 이해 모델을 부르기 전 preflight 로도 쓴다(실행 못 할 요청에 모델 비용 · 지연 없음).
 */
async function checkWorkAgentRunnable(
  userId: string,
  body: Record<string, unknown>,
  opts: { requireCapability?: boolean } = {},
): Promise<{ ok: false; reply: RouteReply } | { ok: true; toolCtx: VerifiedToolContext }> {
  const args: Record<string, unknown> = { request: body.request };
  if (body.targetHint !== undefined) args.targetHint = body.targetHint;
  if (body.image !== undefined) args.image = body.image;
  // runId(PHASE 1): 이전 QUESTION 응답으로 같은 logical Work Run 을 이어갈 때만 온다. 형상은 contract 가 검증한다.
  if (body.runId !== undefined) args.runId = body.runId;

  const tool = findToolDefinition(AI_TOOL_NAMES.WORK_AGENT_PERFORM);
  const argCheck = validateToolArguments(args, tool);
  if (!argCheck.ok) return { ok: false, reply: { status: 400, body: { success: false, error: '요청 형식이 올바르지 않습니다(목적 문장 · 등록 사이트 · JPEG/PNG/WebP 이미지만).', code: 'WORK_AGENT_GOAL_INVALID' } } };

  // home-chat 과 같은 방식으로 서버가 tool 컨텍스트를 확정한다 — 클라이언트 값은 권한 근거가 아니다.
  const toolCtx: VerifiedToolContext = { userId, workspace: 'home' };
  // 대상 표면에 맞는 capability 를 가진 노드가 있어야 실행 가능하다 — runtime 의 노드 선택과 같은 규칙(재개는 힌트만 · 그 밖은
  // 요청 + 힌트). Local Agent 는 online 이지만 Chrome 확장(browser)이 꺼진 경우를 여기서 걸러 이해 모델 호출 · 지연을 만들지 않는다.
  // 대상을 정하지 못하면 capability 를 묻지 않는다(runtime 이 대상 미확정으로 끝낸다 — 종전과 같음).
  const hint = typeof body.targetHint === 'string' ? body.targetHint : undefined;
  const targetRef = body.runId !== undefined ? resolveWorkTarget('', hint) : resolveWorkTarget(String(body.request ?? ''), hint);
  const need = targetRef ? (targetRef.targetType === 'windows_app' ? 'windows_uia' : 'browser') : undefined;
  const deviceResolution = await resolveTargetDevice(AppDataSource, userId, need ? { need } : undefined);
  toolCtx.localAgentStatus = deviceResolution.status === 'ok' ? 'connected' : deviceResolution.status;
  if (deviceResolution.status === 'ok') toolCtx.localDeviceId = deviceResolution.device.id;
  const authz = assertToolAllowed(AI_TOOL_NAMES.WORK_AGENT_PERFORM, toolCtx);
  if (!authz.allowed) {
    return { ok: false, reply: { status: 403, body: { success: false, error: '이 PC 의 O4O 확장이 연결되어 있어야 합니다.', code: 'WORK_AGENT_NOT_AVAILABLE', reason: authz.reason } } };
  }
  // preflight(이해 모델 호출 전) 전용 — 노드 선택은 capability 가 확인된 부재인 노드라도 고른다(단일 online 노드 · 전부 부재).
  // 고른 노드가 그 capability 를 확인된 부재(false)로 보고했으면 실행은 runtime 에서 실패하므로 모델을 부르지 않는다.
  // 보고 없음(null · 이전 에이전트)은 막지 않는다. 실행 경로(performWorkAgentRun)의 판정은 종전과 같다.
  if (opts.requireCapability && need && deviceResolution.status === 'ok' && nodeSatisfies(deviceResolution.device, need) === false) {
    return { ok: false, reply: { status: 403, body: { success: false, error: '이 PC 의 O4O 확장이 연결되어 있어야 합니다.', code: 'WORK_AGENT_NOT_AVAILABLE', reason: 'CAPABILITY_MISSING' } } };
  }
  return { ok: true, toolCtx };
}

async function performWorkAgentRun(
  userId: string,
  body: Record<string, unknown>,
  intent?: ExecutionIntent,
  judge?: CompletionJudge,
): Promise<RouteReply> {
  const runnable = await checkWorkAgentRunnable(userId, body);
  if ('reply' in runnable) return runnable.reply;
  const { toolCtx } = runnable;

  // Capability C(Task Modality Router) — per-task provider. Work Agent 로 온 Goal 은 실행 표면(등재 대상 · 화면 캡처 · UI 어휘)이
  // 있으면 screen 이고, screen 은 openai(Astra vision planner · Capability B)로 간다. 전역 AI_DEFAULT_PROVIDER 는 그대로(gemini).
  // 판정에 AI 호출 0 · 로그에는 modality/reason 만(문장 · 이미지 없음).
  const modality = classifyTaskModality({
    request: String(body.request),
    targetHint: typeof body.targetHint === 'string' ? body.targetHint : undefined,
    image: body.image && typeof body.image === 'object' ? { provenance: 'user_image' } : null,
  });
  logger.info('work-agent task modality', { userId, modality: modality.modality, reason: modality.reason, provider: modality.provider });
  const plannerProvider = modality.modality === 'screen' && modality.provider ? modality.provider : null;

  const result = await runWorkAgent(
    AppDataSource,
    toolCtx,
    {
      request: String(body.request),
      targetHint: typeof body.targetHint === 'string' ? body.targetHint : undefined,
      image: body.image,
      runId: typeof body.runId === 'string' ? body.runId : undefined,
      // 실패 인계 뒤 사용자가 다시 요청하며 준 힌트(§64·§65). runtime 이 sanitize 한다.
      recoveryHint: typeof body.recoveryHint === 'string' ? body.recoveryHint : undefined,
      // Personal Assistant Phase B — Assistant Planning 의 실행 지시(구조만). /work-agent/run 직접 호출에는 없다.
      ...(intent ? { intent } : {}),
      // Task Understanding — 완료 주장은 Assistant 판정기로(조건 ↔ 근거). 직접 /work-agent/run 에는 없다(종전 판정).
      ...(judge ? { judge } : {}),
    },
    plannerProvider ? createLlmPlannerForProvider(AppDataSource, plannerProvider) : createLlmPlanner(AppDataSource),
    // 복구 계층의 strong 추론 경로(§11·§12) — 같은 provider·키, 더 강한 모델. 새 stack 아님.
    { strongPlanner: plannerProvider ? createStrongLlmPlannerForProvider(AppDataSource, plannerProvider) : createStrongLlmPlanner(AppDataSource) },
  );
  // history 에는 행동 종류 · ref · 상태만 있고 입력 텍스트는 뺀다(응답에도 검색어를 되돌리지 않는다).
  const history = result.history.map((h) => ({ step: h.step, kind: h.action.kind, status: h.status, errorCode: h.errorCode ?? null, navigated: h.navigated === true }));
  return {
    status: 200,
    body: {
      success: true,
      data: {
        goal: { goalId: result.goal.goalId, status: result.goal.status, siteId: result.siteId, displayName: result.displayName },
        // PHASE 1: 같은 logical run 재개용 id(opaque) + 재개 가능 여부. QUESTION(waiting_for_user)일 때만 resumable=true.
        runId: result.goal.runId ?? null,
        resumable: result.resumable,
        progress: result.progress,
        takeover: result.takeover,
        neededInput: result.neededInput,
        stepCount: result.stepCount,
        aiPlanCount: result.aiPlanCount,
        path: result.path,
        history,
        message: result.message,
        errorCode: result.errorCode ?? null,
        // WORK-TARGET-DISCOVERY-V0 §33·§54 — 대상 준비 요약(안전 필드만). 경로 · 탭 제목 · 실행 경로 없음.
        target: result.target,
        // PHASE 2 — Workflow 재생/저장 요약(enum · 개수만). 단계 내용 · 템플릿 · 값은 응답에 싣지 않는다.
        workflow: result.workflow ?? null,
      },
    },
    execution: { taskKey: result.taskKey ?? null, report: result.report },
  };
}

router.post('/work-agent/run', authenticate, requireNetureMember, dynamicLimiter('free'), async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;
  if (!userId) return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  const reply = await performWorkAgentRun(userId, (req.body ?? {}) as Record<string, unknown>);
  return res.status(reply.status).json(reply.body);
});

// ===========================================
// POST /api/ai/content — outputType 기반 콘텐츠 변환
// WO-AI-CONTENT-TRANSFORM-IMPLEMENTATION-V1
// WO-AI-PROMPT-STRUCTURE-DESIGN-V1
// ===========================================

router.post('/content', authenticate, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  }

  const { input, outputType = 'product_detail', options = {}, customPrompt } = req.body;

  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'input 텍스트가 필요합니다.' });
  }

  if (!isSupportedOutputType(outputType)) {
    return res.status(400).json({ success: false, error: `지원하지 않는 outputType: ${outputType}` });
  }

  // WO-O4O-AI-CONTENT-CUSTOM-PROMPT-AND-CORE-EXTENSION-AUDIT-V1:
  //   customPrompt 는 options 외부에서도 받을 수 있도록 허용하되, options.customPrompt 로 통합한다.
  //   미전달/빈 문자열 시 기존 동작 그대로.
  const mergedOptions = {
    ...options,
    customPrompt:
      typeof customPrompt === 'string'
        ? customPrompt
        : (typeof options?.customPrompt === 'string' ? options.customPrompt : ''),
  };

  const systemPrompt = buildSystemPrompt(outputType, mergedOptions);
  const userPrompt = buildUserPrompt(outputType, input);
  const requestId = crypto.randomUUID();

  try {
    const rawResponse = await aiProxyService.generateEditingRawContent(
      {
        systemPrompt,
        userPrompt,
        temperature: 0.5,
        maxTokens: 4096,
      },
      userId,
      requestId,
      { usage: 'editor.content', surface: editingSurfaceForOutputType(outputType) },
    );

    const normalized = parseResponse(outputType, rawResponse.parsed, rawResponse.rawText);

    // WO-O4O-AI-USAGE-CONDITION-DETECTION-UX-V1: text 입력 원문에도 감지 적용
    const usageWarning = detectUsageConditions(input);

    logger.info('AI content generated', { requestId, userId, outputType, model: rawResponse.model });

    return res.json({
      success: true,
      ...normalized,
      requestId,
      usageWarning: usageWarning.detected ? usageWarning : undefined,
    });
  } catch (error: any) {
    const status = error.type === 'RATE_LIMIT_ERROR' ? 429
                 : error.type === 'AUTH_ERROR' ? 401
                 : error.type === 'VALIDATION_ERROR' ? 400
                 : error.type === 'TIMEOUT_ERROR' ? 504
                 : 500;
    logger.error('AI content generate error', { requestId, error: error.message, type: error.type });
    return res.status(status).json({
      success: false,
      error: error.message || 'AI 콘텐츠 생성 중 오류가 발생했습니다.',
      requestId,
    });
  }
});

// ===========================================
// URL Length — WO-O4O-KPA-AI-CONTENT-MODE-PRESET-REMOVAL-V1
// ===========================================
//
// 모달의 "정리 모드" 프리셋 제거에 맞춰 url-to-blocks 도 outputType 분기를 제거.
// 결과 형식은 customInstruction(사용자 추가 요청) 이 결정한다.
// length / tone 만 분량·말투 보조 가이드로 유지된다.
//
// 레거시: 구버전 클라이언트가 보내는 outputType / contentType 은 받기만 하고
// 무시한다 (UI 가 사라졌으므로 의미 없음).

type UrlLength = 'short' | 'medium' | 'long';

const VALID_URL_LENGTHS: readonly UrlLength[] = ['short', 'medium', 'long'];

// customInstruction 에서 장문 요청 의도를 추론하는 키워드.
// 명시 length 가 없을 때만 적용 — 사용자가 짧게 지정했으면 그쪽이 우선.
const LONGFORM_INTENT_RE = /(A4|1\s*장|장문|상세\s*히|상세\s*하게|깊이|풍부|길게|풀\s*버전|full\s*version|강의\s*자료)/i;

function isLongformIntent(customInstruction: string | undefined): boolean {
  if (!customInstruction) return false;
  return LONGFORM_INTENT_RE.test(customInstruction);
}

function resolveUrlLength(
  requested: unknown,
  customInstruction: string | undefined,
): UrlLength {
  if (typeof requested === 'string' && (VALID_URL_LENGTHS as readonly string[]).includes(requested)) {
    return requested as UrlLength;
  }
  // 사용자 자유 텍스트에서 장문 의도 감지 시 자동 long 승격
  if (isLongformIntent(customInstruction)) return 'long';
  return 'medium';
}

/**
 * length → 분량/블록 수 가이드.
 * WO-O4O-KPA-AI-CONTENT-MODE-PRESET-REMOVAL-V1:
 *   outputType 별 형식 강제(요약/문서/블로그/강의자료)는 제거. customInstruction 이
 *   결과 형식을 결정하고, length 는 분량 보조 가이드로만 사용한다.
 */
const URL_LENGTH_INSTRUCTIONS: Record<UrlLength, string> = {
  short: '총 분량 500~1000자, 4~8개 블록. 핵심만 간결히.',
  medium: '총 분량 1500~2500자, 8~15개 블록. 본문을 적절히 풀어쓰기.',
  long: '총 분량 3000~6000자, 15~25개 블록. A4 1장 이상의 충분한 분량.',
};

/** length → MAX_BLOCKS 강제 상한. customInstruction 으로 형식이 결정되므로 length 만으로 통일. */
const MAX_BLOCKS_BY_LENGTH: Record<UrlLength, number> = {
  short: 10,
  medium: 18,
  long: 32,
};

/** length 별 AI 응답 max output tokens. long 은 Gemini 2.5 한도 내에서 충분히 확보. */
const MAX_TOKENS_BY_LENGTH: Record<UrlLength, number> = {
  short: 4096,
  medium: 8192,
  long: 16384,
};

/**
 * Block 생성용 시스템 프롬프트
 * WO-O4O-AI-URL-CONTENT-QUALITY-V2: 블록 수 압축 + 구조 안정화
 * WO-O4O-KPA-AI-CONTENT-MODE-PRESET-REMOVAL-V1:
 *   outputType 별 형식 강제(요약/문서/블로그/강의자료) 제거.
 *   결과 형식은 customInstruction(사용자 추가 요청) 이 결정한다.
 *   length / tone 은 분량·말투 보조 가이드로만 동작한다.
 */
function buildUrlBlockSystemPrompt(length: UrlLength, tone: string): string {
  const toneLabel = tone === 'professional' ? '전문적' : tone === 'store' ? '매장 친화적' : '일반적';
  const lengthInstruction = URL_LENGTH_INSTRUCTIONS[length];

  return `당신은 O4O 플랫폼의 콘텐츠 블록 생성 보조 도구입니다.
주어진 URL 원본 텍스트를 사용자 요청에 맞춰 O4O 블록 JSON 배열로 재구성하세요.

톤앤매너: ${toneLabel}

## 결과 형식 (필수)
- [사용자 추가 요청] 블록이 있으면 그 의도(예: 블로그 글, POP 문구, QR 안내문, 제목 추천, A4 1장 강의자료 등)대로 따른다.
- 요청이 없거나 모호하면 원본을 깨끗한 본문 블록 묶음으로 정리한다.
- 자의적으로 "요약" 으로 좁히지 말 것. 사용자가 명시적으로 요약을 요청한 경우에만 요약한다.

## 분량 (보조 가이드)
${lengthInstruction}
- 사용자 요청과 충돌하면 사용자 요청 우선. 없는 사실은 창작하지 말 것.

## 출력 규칙
- 반드시 JSON 배열만 반환 (\`\`\`json ... \`\`\` 코드블록 형식)
- 각 블록 구조: { "id": "block-N", "type": "o4o/...", "content": "...", "attributes": {...} }
- id는 "block-1", "block-2" ... 순서대로

## 콘텐츠 필터링 (필수)
- 메뉴, 네비게이션, 로그인, 회원가입, footer, 저작권 등 UI 요소는 절대 포함하지 말 것
- 광고, 구독 유도, 관련 링크 목록은 제외
- YouTube 페이지의 경우: 영상 제목, 설명, 핵심 정보만 포함. 채널 메뉴, 추천 영상, UI 항목 제외
- 실제 읽을 수 있는 본문 내용만 포함

## 사용 가능한 블록 타입
- o4o/heading: 제목 → { "id": "block-1", "type": "o4o/heading", "content": "제목", "attributes": { "level": 2 } }
- o4o/paragraph: 문단 → { "id": "block-2", "type": "o4o/paragraph", "content": "본문" }
- o4o/list: 핵심 포인트 목록 → { "id": "block-3", "type": "o4o/list", "content": "<li>항목1</li><li>항목2</li>", "attributes": { "type": "unordered" } }
- o4o/quote: 중요 인용문만 → { "id": "block-4", "type": "o4o/quote", "content": "인용", "attributes": { "citation": "출처" } }
- o4o/image: 이미지 URL 있을 때만 → { "id": "block-5", "type": "o4o/image", "attributes": { "url": "https://...", "alt": "설명" } }
- o4o/youtube: YouTube URL 있을 때만 → { "id": "block-6", "type": "o4o/youtube", "attributes": { "url": "https://youtube.com/..." } }

## 구조 규칙
1. heading(level 2)을 큰 흐름 구분에, level 3은 세부 섹션 구분에 사용
2. paragraph 본문이 흐름의 중심 — 단락마다 한 가지 주제 집중
3. list는 핵심 포인트 정리에 사용 (한 list 당 3~7개 항목)
4. layout/widget/columns 블록 사용 금지

JSON만 반환하고 다른 텍스트는 포함하지 마세요.`;
}

router.post('/url-to-blocks', authenticate, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  }

  // WO-O4O-KPA-AI-CONTENT-MODE-PRESET-REMOVAL-V1:
  //   outputType / contentType 은 받기만 하고 prompt 분기에는 사용하지 않는다
  //   (정리 모드 프리셋 제거에 따라 결과 형식은 customInstruction 이 결정).
  //   length / tone 만 보조 가이드로 사용.
  const {
    url,
    length: rawLength,
    tone = 'normal',
    customInstruction = '',
  } = req.body as {
    url?: string;
    outputType?: string;  // 레거시 — 무시
    length?: string;
    contentType?: string;  // 레거시 — 무시
    tone?: string;
    customInstruction?: string;
  };

  const resolvedLength = resolveUrlLength(rawLength, customInstruction);

  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'url이 필요합니다.' });
  }

  // URL 형식 검증
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url.trim());
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('http/https URL만 허용됩니다.');
    }
  } catch {
    return res.status(400).json({ success: false, error: '올바른 URL 형식이 아닙니다. (http/https만 허용)' });
  }

  const requestId = crypto.randomUUID();

  try {
    logger.info('[url-to-blocks] 시작', {
      requestId,
      userId,
      url: parsedUrl.hostname,
      length: resolvedLength,
      hasCustomInstruction: customInstruction.trim().length > 0,
    });

    // 1. URL 콘텐츠 가져오기
    // WO-O4O-AI-URL-BLOCKS-TITLE-AUTO-FILL-V1: fetchUrlContent 로 본문 + 추출 제목 함께 수신
    let urlText: string;
    let extractedTitle: string | undefined;
    let fetchedUsageWarning: UsageWarning | undefined;
    try {
      const fetched = await fetchUrlContent(parsedUrl.toString());
      urlText = fetched.text;
      extractedTitle = fetched.title;
      fetchedUsageWarning = fetched.usageWarning;
    } catch (fetchError: any) {
      logger.warn('[url-to-blocks] URL fetch 실패', { requestId, error: fetchError.message });
      return res.status(422).json({
        success: false,
        error: `URL 콘텐츠를 가져올 수 없습니다: ${fetchError.message}`,
      });
    }

    if (urlText.trim().length < 50) {
      return res.status(422).json({
        success: false,
        error: 'URL에서 충분한 텍스트를 추출할 수 없습니다.',
      });
    }

    // 2. 프롬프트 빌드
    // WO-O4O-KPA-AI-CONTENT-MODE-PRESET-REMOVAL-V1:
    //   outputType 별 형식 강제 제거. customInstruction 이 결과 형식을 결정한다.
    //   length 는 분량 보조 가이드, tone 은 말투 보조 가이드.
    const systemPrompt = buildUrlBlockSystemPrompt(resolvedLength, tone);
    const userPrompt = [
      `다음 URL(${parsedUrl.hostname})의 텍스트를 O4O 블록 JSON 배열로 변환하세요.`,
      `분량 가이드: ${resolvedLength}`,
      '',
      '=== 추출된 텍스트 ===',
      urlText,
      '',
      customInstruction
        ? `=== 사용자 추가 요청 (최우선) ===\n${customInstruction}\n\n위 요청이 결과 형식·구조의 1순위 기준입니다. 분량/톤 가이드와 충돌하면 이 요청을 따르세요.`
        : '',
    ].filter(Boolean).join('\n');

    // 3. AI 호출 (기존 프록시 서비스 사용)
    //   maxTokens 는 length 별로 동적 조정 (long 은 16384 까지 확보).
    let aiResponse: Awaited<ReturnType<typeof aiProxyService.generateRawContent>>;
    try {
      // surface 불명확(블록 변환 범용) → gemini 유지
      aiResponse = await aiProxyService.generateEditingRawContent(
        {
          systemPrompt,
          userPrompt,
          temperature: 0.5,
          maxTokens: MAX_TOKENS_BY_LENGTH[resolvedLength],
        },
        userId,
        requestId,
        { usage: 'editor.url' },
      );
    } catch (aiError: any) {
      logger.error('[url-to-blocks] AI 생성 실패', { requestId, error: aiError.message, type: aiError.type });
      const isTimeout = aiError.type === 'TIMEOUT_ERROR' || aiError.message?.includes('abort');
      const isRateLimit = aiError.type === 'RATE_LIMIT_ERROR';
      const statusCode = isTimeout ? 504 : isRateLimit ? 429 : 500;
      return res.status(statusCode).json({
        success: false,
        error: isTimeout
          ? 'AI 분석 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.'
          : isRateLimit
            ? 'AI 서비스 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.'
            : 'AI 콘텐츠 생성에 실패했습니다. 다시 시도해 주세요.',
      });
    }

    // 4. JSON 블록 파싱
    const rawText: string = aiResponse.rawText || '';
    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)```/) ||
                      rawText.match(/```\s*([\s\S]*?)```/) ||
                      rawText.match(/(\[[\s\S]*\])/);

    if (!jsonMatch) {
      logger.error('[url-to-blocks] JSON 블록을 찾을 수 없음', { requestId, rawText: rawText.slice(0, 200) });
      return res.status(500).json({ success: false, error: 'AI 응답에서 블록 구조를 파싱할 수 없습니다.' });
    }

    let blocks: any[];
    try {
      blocks = JSON.parse(jsonMatch[1] || jsonMatch[0]);
      if (!Array.isArray(blocks)) throw new Error('블록이 배열 형식이 아닙니다.');
    } catch (parseError: any) {
      logger.error('[url-to-blocks] 블록 JSON 파싱 실패', { requestId, error: parseError.message });
      return res.status(500).json({ success: false, error: '블록 JSON 파싱 실패: ' + parseError.message });
    }

    // 5. 블록 ID 보장 및 기본 정규화
    const normalizedBlocks = blocks.map((block, i) => ({
      id: block.id || `block-${i + 1}-${Date.now()}`,
      type: block.type || 'o4o/paragraph',
      content: block.content ?? '',
      ...(block.attributes ? { attributes: block.attributes } : {}),
      ...(block.innerBlocks ? { innerBlocks: block.innerBlocks } : {}),
    }));

    // 6. 후처리 파이프라인 (WO-O4O-AI-URL-CONTENT-QUALITY-V4)
    // 전략: 키워드 기반 제거 → 문장/구조 기반 품질 필터로 전환
    const isYouTube =
      parsedUrl.hostname.includes('youtube.com') ||
      parsedUrl.hostname.includes('youtu.be');

    // 6-A. 품질 기반 필터 함수 (WO-O4O-AI-BLOCK-VALIDATION-TYPE-AWARE-LENGTH-FIX-V1)
    /** 블록 타입별 최소 글자 수
     *  - heading: 한국어 특성상 2자 이상
     *  - paragraph/기타: 10자 이상 (한국어 단문 허용 — 20자는 과도하게 엄격)
     */
    const isTooShort = (text: string, type?: string): boolean => {
      const normalized = text.trim();
      if (type === 'o4o/heading') return normalized.length < 2;
      return normalized.length < 10;
    };

    /** 짧은 단어 6개 이상 연속 — 네비게이션/메뉴 구조 특징
     *  임계값 4→6: 한국어 4-단어 문장("비타민 D 결핍 주의")이 오탐되던 문제 방지
     */
    const isMenuLike = (text: string): boolean => {
      const tokens = text.split(/[\s|,·\-–—/]/).filter(Boolean);
      return tokens.length >= 6 && tokens.every(t => t.length <= 6);
    };

    /** 블록 텍스트가 실질적인 콘텐츠인지 판단 (타입 인식) */
    const isValidContent = (text: string, type?: string): boolean => {
      if (!text || isTooShort(text, type)) return false;
      if (type !== 'o4o/heading' && isMenuLike(text)) return false;
      return true;
    };

    // 6-B. 블록별 품질 필터 적용
    let finalBlocks: typeof normalizedBlocks;
    if (isYouTube) {
      // YouTube: embed 유지 + 유효 텍스트 블록 최대 3개
      const ytBlocks = normalizedBlocks.filter(b => b.type === 'o4o/youtube');
      // WO-O4O-AI-URL-TO-BLOCKS-YOUTUBE-SUPPORT-V1:
      //   Gemini 가 o4o/youtube 블록을 만들지 않은 경우에도 원본 URL 기반으로
      //   embed 블록 1개를 보장한다. (block schema 변경 없음 — 기존 타입 그대로)
      if (ytBlocks.length === 0) {
        ytBlocks.push({
          id: `block-yt-${Date.now()}`,
          type: 'o4o/youtube',
          content: '',
          attributes: { url: parsedUrl.toString() },
        } as typeof normalizedBlocks[number]);
      }
      const textBlocks = normalizedBlocks
        .filter(b => b.type !== 'o4o/youtube')
        .filter(b => isValidContent(b.content || '', b.type))
        .slice(0, 3);
      finalBlocks = [...ytBlocks, ...textBlocks];
    } else {
      // 일반 페이지: 품질 필터 적용 (타입 인식)
      finalBlocks = normalizedBlocks.filter(b => isValidContent(b.content || '', b.type));
    }

    // 필터에서 탈락한 블록 진단 로그
    if (finalBlocks.length < normalizedBlocks.length) {
      const filtered = normalizedBlocks.filter(b => !finalBlocks.includes(b));
      logger.info('[url-to-blocks] 필터 탈락 블록', {
        requestId,
        count: filtered.length,
        items: filtered.map(b => ({ type: b.type, len: (b.content || '').length, preview: (b.content || '').slice(0, 40) })),
      });
    }

    // 6-C. 최대 블록 수 강제 제한
    // WO-O4O-KPA-AI-CONTENT-MODE-PRESET-REMOVAL-V1:
    //   length 기준 단일 매트릭스로 단순화. outputType 분기 제거.
    const MAX_BLOCKS = MAX_BLOCKS_BY_LENGTH[resolvedLength];
    const limitedBlocks = finalBlocks.slice(0, MAX_BLOCKS);

    // WO-O4O-AI-URL-BLOCKS-TITLE-AUTO-FILL-V1:
    //   추출 제목(youtube oEmbed / HTML <title>·og·twitter) 우선, 없으면 blocks 기반 fallback.
    //   둘 다 실패하면 title 미포함 — 클라이언트는 빈 string 으로 다루고 사용자가 직접 입력.
    const blocksTitleFallback = extractedTitle ? undefined : deriveTitleFromBlocks(limitedBlocks);
    const finalTitle = (extractedTitle || blocksTitleFallback || '').trim();

    logger.info('[url-to-blocks] 완료', {
      requestId,
      userId,
      length: resolvedLength,
      maxBlocks: MAX_BLOCKS,
      rawBlocks: normalizedBlocks.length,
      afterFilter: finalBlocks.length,
      final: limitedBlocks.length,
      isYouTube,
      titleSource: extractedTitle ? 'extracted' : (blocksTitleFallback ? 'blocks' : 'none'),
    });

    return res.json({
      success: true,
      blocks: limitedBlocks,
      title: finalTitle,
      requestId,
      // WO-O4O-AI-USAGE-CONDITION-DETECTION-UX-V1
      usageWarning: fetchedUsageWarning?.detected ? fetchedUsageWarning : undefined,
    });
  } catch (error: any) {
    logger.error('[url-to-blocks] 오류', { requestId, error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message || 'URL 블록 생성 중 오류가 발생했습니다.',
    });
  }
});

// ===========================================
// POST /api/ai/content-to-store-use — 콘텐츠 → 매장 활용 변환
// WO-O4O-STORE-USE-CONTENT-TRANSFORM-V1
//
// sourceHtml의 텍스트를 추출하여 useCase에 맞는 매장 활용 문구로 변환한다.
// useCase: 'qr' | 'pop' | 'sns' | 'blog'
// audience: 'customer' | 'staff' | 'store_owner'
// tone: 'easy' | 'professional' | 'promotion'
// length: 'short' | 'medium'
// ===========================================

/** HTML에서 순수 텍스트 추출 (간단 strip) */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** useCase → OutputType 매핑 */
type StoreUseCase = 'qr' | 'pop' | 'sns' | 'blog';

function useCaseToOutputType(useCase: StoreUseCase): string {
  switch (useCase) {
    case 'qr': return 'store_qr';
    case 'pop': return 'pop';
    case 'sns': return 'store_sns';
    case 'blog': return 'blog';
  }
}

/** audience 매핑 (WO API → 내부 프롬프트 옵션) */
function mapAudience(audience: string): string {
  switch (audience) {
    case 'customer': return 'pharmacy';
    case 'staff': return 'operator';
    case 'store_owner': return 'operator';
    default: return 'general';
  }
}

router.post('/content-to-store-use', authenticate, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  }

  const {
    sourceHtml,
    useCase,
    audience = 'customer',
    tone = 'easy',
    length = 'short',
  } = req.body;

  if (!sourceHtml || typeof sourceHtml !== 'string' || sourceHtml.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'sourceHtml이 필요합니다.' });
  }

  const validUseCases: StoreUseCase[] = ['qr', 'pop', 'sns', 'blog'];
  if (!validUseCases.includes(useCase)) {
    return res.status(400).json({ success: false, error: `useCase는 ${validUseCases.join(', ')} 중 하나여야 합니다.` });
  }

  const plainText = htmlToPlainText(sourceHtml);
  if (plainText.length < 10) {
    return res.status(400).json({ success: false, error: '콘텐츠 내용이 너무 짧습니다. 본문을 먼저 작성해 주세요.' });
  }

  const outputType = useCaseToOutputType(useCase as StoreUseCase);

  if (!isSupportedOutputType(outputType)) {
    return res.status(400).json({ success: false, error: `지원하지 않는 useCase: ${useCase}` });
  }

  const internalAudience = mapAudience(audience);
  const options = { tone, length, audience: internalAudience };
  const systemPrompt = buildSystemPrompt(outputType, options);
  const userPrompt = buildUserPrompt(outputType, plainText);
  const requestId = crypto.randomUUID();

  try {
    const rawResponse = await aiProxyService.generateEditingRawContent(
      {
        systemPrompt,
        userPrompt,
        temperature: 0.5,
        maxTokens: 2048,
      },
      userId,
      requestId,
      { usage: 'editor.store-use', surface: editingSurfaceForOutputType(outputType) },
    );

    const normalized = parseResponse(outputType, rawResponse.parsed, rawResponse.rawText);
    const resultPlainText = normalized.html
      ? htmlToPlainText(normalized.html)
      : normalized.longText || normalized.shortText || normalized.summary || '';

    logger.info('AI content-to-store-use generated', { requestId, userId, useCase, outputType, model: rawResponse.model });

    return res.json({
      success: true,
      html: normalized.html,
      plainText: resultPlainText,
      title: normalized.title,
      summary: normalized.summary,
      shortText: normalized.shortText,
      longText: normalized.longText,
      bullets: normalized.bullets,
      requestId,
    });
  } catch (error: any) {
    const status = error.type === 'RATE_LIMIT_ERROR' ? 429
                 : error.type === 'AUTH_ERROR' ? 401
                 : error.type === 'VALIDATION_ERROR' ? 400
                 : error.type === 'TIMEOUT_ERROR' ? 504
                 : 500;
    logger.error('AI content-to-store-use error', { requestId, error: error.message, type: error.type });
    return res.status(status).json({
      success: false,
      error: error.message || 'AI 매장 활용 변환 중 오류가 발생했습니다.',
      requestId,
    });
  }
});

// ===========================================
// POST /api/ai/course-structure — 주제/URL → 레슨 목록 (5~8개)
// WO-O4O-LMS-COURSE-STRUCTURE-AI-V2
// ===========================================
//
// 정책:
// - 입력: { input: string, type: 'url' | 'topic' }
// - 출력: { success, lessons: [{ title, summary }], requestId }
// - 자동 생성된 레슨은 절대 자동 저장하지 않음 (사용자 선택 후 호출자가 createLesson 으로 저장)
// - 5~8개의 논리 순서 레슨, 각 제목은 짧고 명확, summary 1~2문장

function buildCourseStructureSystemPrompt(): string {
  return `당신은 O4O LMS 강의 설계 전문가입니다.
주어진 주제 또는 URL 콘텐츠로부터 강의의 레슨 구조(목차)를 설계하세요.

## 출력 규칙
- 반드시 JSON 배열만 반환 (\`\`\`json ... \`\`\` 코드블록 형식)
- 각 항목 구조: { "title": "레슨 제목", "summary": "1~2문장 요약" }
- 5개 이상 8개 이하

## 레슨 구성 규칙
- 논리적인 순서로 배치 (입문 → 핵심 → 응용)
- 각 레슨은 독립적으로 학습 가능한 단일 주제
- 제목은 짧고 명확하게 (한 줄, 30자 이내 권장)
- summary 는 1~2문장으로 학습자가 무엇을 얻는지 명시

## 금지
- 본문 / 영상 / 퀴즈 / 과제 생성 금지
- 8개 초과 또는 5개 미만 금지
- JSON 외 다른 텍스트 포함 금지

JSON 만 반환하세요.`;
}

router.post('/course-structure', authenticate, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  }

  const { input, type } = req.body as { input?: string; type?: 'url' | 'topic' };

  if (!input || typeof input !== 'string' || input.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'input이 필요합니다.' });
  }
  if (type !== 'url' && type !== 'topic') {
    return res.status(400).json({ success: false, error: "type 은 'url' 또는 'topic' 이어야 합니다." });
  }

  const requestId = crypto.randomUUID();

  try {
    // 1. type 별 user prompt 빌드
    let userPrompt: string;
    if (type === 'url') {
      // URL 검증
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(input.trim());
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
          throw new Error('http/https URL 만 허용됩니다.');
        }
      } catch {
        return res.status(400).json({ success: false, error: '올바른 URL 형식이 아닙니다. (http/https 만 허용)' });
      }

      // URL 텍스트 추출 (재사용)
      let urlText: string;
      try {
        urlText = await fetchUrlText(parsedUrl.toString());
      } catch (fetchError: any) {
        logger.warn('[course-structure] URL fetch 실패', { requestId, error: fetchError.message });
        return res.status(422).json({ success: false, error: `URL 콘텐츠를 가져올 수 없습니다: ${fetchError.message}` });
      }
      if (urlText.trim().length < 50) {
        return res.status(422).json({ success: false, error: 'URL 에서 충분한 텍스트를 추출할 수 없습니다.' });
      }
      userPrompt = [
        `다음 URL(${parsedUrl.hostname})의 콘텐츠로부터 강의의 레슨 구조(목차)를 5~8개로 설계하세요:`,
        '',
        '=== 추출된 텍스트 ===',
        urlText,
      ].join('\n');
    } else {
      // topic 모드 — 그대로 주제로 사용
      userPrompt = [
        '다음 주제로 강의의 레슨 구조(목차)를 5~8개로 설계하세요:',
        '',
        `주제: ${input.trim()}`,
      ].join('\n');
    }

    // 2. AI 호출
    logger.info('[course-structure] 시작', { requestId, userId, type });
    // course-structure 는 EditingSurface 밖(2단계 구조 생성) → gemini 유지
    const aiResponse = await aiProxyService.generateEditingRawContent(
      {
        systemPrompt: buildCourseStructureSystemPrompt(),
        userPrompt,
        temperature: 0.6,
        maxTokens: 4096,
      },
      userId,
      requestId,
      { usage: 'lecture.structure' },
    );

    // 3. JSON 배열 파싱 (url-to-blocks 와 동일 패턴)
    const rawText: string = aiResponse.rawText || '';
    const jsonMatch =
      rawText.match(/```json\s*([\s\S]*?)```/) ||
      rawText.match(/```\s*([\s\S]*?)```/) ||
      rawText.match(/(\[[\s\S]*\])/);

    if (!jsonMatch) {
      logger.error('[course-structure] JSON 파싱 실패', { requestId, rawText: rawText.slice(0, 200) });
      return res.status(500).json({ success: false, error: 'AI 응답에서 레슨 구조를 파싱할 수 없습니다.' });
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch (parseError: any) {
      logger.error('[course-structure] JSON parse error', { requestId, error: parseError.message });
      return res.status(500).json({ success: false, error: 'JSON 파싱 실패: ' + parseError.message });
    }
    if (!Array.isArray(parsed)) {
      return res.status(500).json({ success: false, error: 'AI 응답이 배열 형식이 아닙니다.' });
    }

    // 4. 정규화 + 5~8개 강제
    const lessons = parsed
      .map((item: any) => ({
        title: typeof item?.title === 'string' ? item.title.trim() : '',
        summary: typeof item?.summary === 'string' ? item.summary.trim() : '',
      }))
      .filter((l) => l.title.length > 0)
      .slice(0, 8);

    if (lessons.length < 3) {
      // 5개 미만이면 사실상 사용 불가 — 에러
      logger.warn('[course-structure] 부족한 레슨 수', { requestId, count: lessons.length });
      return res.status(500).json({
        success: false,
        error: `생성된 레슨이 너무 적습니다 (${lessons.length}개). 다시 시도해 주세요.`,
      });
    }

    logger.info('[course-structure] 완료', { requestId, userId, count: lessons.length });
    return res.json({ success: true, lessons, requestId });
  } catch (error: any) {
    logger.error('[course-structure] 오류', { requestId, error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message || '강의 구조 생성 중 오류가 발생했습니다.',
      requestId,
    });
  }
});

// ===========================================
// POST /api/ai/lesson-body — 레슨 본문 HTML 초안 생성
// WO-O4O-LMS-LESSON-BODY-AI-GENERATION-V3
// ===========================================
//
// 정책:
// - 입력: { courseTitle, lessonTitle, lessonSummary, tone?, audience? }
// - 출력: { success, html, requestId }
// - 한국어 / 약사·전문가 강의 톤 / h2·p·ul·li 중심 / 700~1200자
// - 과장 홍보 / 의료·법률 확정 표현 금지
// - 자동 저장 안 함 (호출자가 createLesson 으로 저장 시점 결정)

function buildLessonBodySystemPrompt(tone: string, audience: string): string {
  const toneLabel = tone === 'casual' ? '편안한' : tone === 'concise' ? '간결한' : '전문적이고 차분한';
  const audienceLabel = audience === 'student' ? '약대생/일반 학습자' : '약사 및 보건·전문가 커뮤니티';
  return `당신은 O4O LMS 강의 작가입니다. 한국어로 강의 본문 초안 HTML 을 작성하세요.

## 톤 / 대상
- 톤: ${toneLabel}
- 대상: ${audienceLabel}
- 학습자가 바로 읽을 수 있는 본문이어야 합니다.

## 분량 / 형식
- 700~1200자 분량의 HTML 만 반환 (코드블록 / 마크다운 금지)
- 사용 가능한 태그: <h2> <h3> <p> <ul> <li> <ol> <strong> <em>
- 첫 줄은 <h2>...</h2> 로 시작
- 단락마다 빈 줄로 구분되도록 <p> 또는 <h2>·<h3> 단위 분리
- 적절한 곳에 <h3>실무 적용 포인트</h3> + <ul><li>… 섹션을 1회 추가 (필요할 때만)

## 금지
- iframe / img / script / style / class 속성 / 인라인 스타일 금지
- "최고", "유일한", "완벽한" 등 과장 표현 금지
- 의료 / 법률 / 효능 효과를 단정하는 표현 금지 (예: "치료된다", "보장된다")
- 출처 미상의 통계 / 수치 인용 금지
- 본문 외 메타 설명("이 글은…", "다음 강의는…") 금지

## 형식 예시 (참고용 — 실제 출력은 주제에 맞게)
<h2>레슨 제목</h2>
<p>도입 단락…</p>
<h3>핵심 개념</h3>
<ul><li>…</li><li>…</li></ul>
<p>설명 단락…</p>
<h3>실무 적용 포인트</h3>
<ul><li>…</li><li>…</li></ul>

HTML 만 반환하세요. 다른 텍스트나 코드블록 표시는 포함하지 마세요.`;
}

router.post('/lesson-body', authenticate, async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  }

  const {
    courseTitle = '',
    lessonTitle,
    lessonSummary = '',
    tone = 'professional',
    audience = 'instructor',
  } = req.body as {
    courseTitle?: string;
    lessonTitle?: string;
    lessonSummary?: string;
    tone?: string;
    audience?: string;
  };

  if (!lessonTitle || typeof lessonTitle !== 'string' || lessonTitle.trim().length === 0) {
    return res.status(400).json({ success: false, error: 'lessonTitle 이 필요합니다.' });
  }

  const requestId = crypto.randomUUID();

  try {
    const userPrompt = [
      `다음 레슨의 본문 HTML 초안을 작성하세요.`,
      '',
      courseTitle ? `강의명: ${courseTitle.trim()}` : '',
      `레슨 제목: ${lessonTitle.trim()}`,
      lessonSummary ? `레슨 요약: ${lessonSummary.trim()}` : '',
    ].filter(Boolean).join('\n');

    logger.info('[lesson-body] 시작', { requestId, userId, lessonTitle: lessonTitle.slice(0, 60) });

    const aiResponse = await aiProxyService.generateEditingRawContent(
      {
        systemPrompt: buildLessonBodySystemPrompt(tone, audience),
        userPrompt,
        temperature: 0.6,
        maxTokens: 4096,
      },
      userId,
      requestId,
      { usage: 'lecture.body', surface: 'lms-lesson' },
    );

    let rawText: string = (aiResponse.rawText || '').trim();
    // 혹시 codeblock 으로 감싸면 제거
    const codeblockMatch = rawText.match(/^```(?:html)?\s*([\s\S]*?)```$/);
    if (codeblockMatch) rawText = codeblockMatch[1].trim();

    // 최소 검증 — 빈 응답 또는 너무 짧음
    if (rawText.length < 80) {
      logger.warn('[lesson-body] 응답이 너무 짧음', { requestId, length: rawText.length });
      return res.status(500).json({
        success: false,
        error: 'AI 응답이 너무 짧습니다. 다시 시도해 주세요.',
        requestId,
      });
    }

    // HTML 외 위험 태그 / 속성 제거 (간단 sanitize — script/style/iframe/on*/class)
    const safeHtml = rawText
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
      .replace(/<(\w+)([^>]*?)\son\w+="[^"]*"([^>]*?)>/gi, '<$1$2$3>')
      .replace(/<(\w+)([^>]*?)\sclass="[^"]*"([^>]*?)>/gi, '<$1$2$3>');

    logger.info('[lesson-body] 완료', { requestId, userId, length: safeHtml.length });
    return res.json({ success: true, html: safeHtml, requestId });
  } catch (error: any) {
    logger.error('[lesson-body] 오류', { requestId, error: error.message });
    return res.status(500).json({
      success: false,
      error: error.message || '레슨 본문 생성 중 오류가 발생했습니다.',
      requestId,
    });
  }
});

// ===========================================
// POST /api/ai/home-chat — O4O 공통 Home 중앙 입력 (텍스트 질의응답)
// WO-O4O-COMMON-HOME-AI-INPUT-V0
//
// 계약:
//   - TEXT RESPONSE ONLY. tool/function calling 없음, 실행 없음.
//   - **DB write 0.** @o4o/ai-core execute() 는 저장 side-effect 가 없다.
//     대화 내용은 서버에 남기지 않는다(§9·§41 conversation persistence 금지).
//   - 클라이언트가 보낸 workScope 는 **요청 컨텍스트 힌트**일 뿐 권한 근거가 아니다.
//     serviceKey/workspace 만 받아 서버가 membership·store 를 다시 확정한다.
//     클라이언트의 organizationId/storeId 는 읽지도, 프롬프트에 넣지도 않는다.
//
// WO-O4O-AI-COMPOSER-UNIFIED-REQUEST-AND-ATTACHMENT-UX-V1: 본체를 `performHomeChat` 으로 떼어 `POST /api/ai/request` 가 같은
// 경로를 쓴다. 첨부(이미지 · PDF inline / 문서 · 표 텍스트)는 그 경로에서만 들어오며 **요청 메모리 안에서만** 산다 —
// 저장 · 로그 없음. `/home-chat` 자체의 계약(텍스트만)은 그대로다.
// ===========================================

async function performHomeChat(
  userId: string,
  reqBody: Record<string, unknown>,
  attachments: readonly UnifiedAttachment[] = [],
): Promise<RouteReply> {
  const validation = validateHomeChatMessage(reqBody.message);
  if (!validation.ok || !validation.message) {
    const code = validation.error ?? 'INVALID_MESSAGE';
    return { status: 400, body: { success: false, error: homeChatValidationMessage(code), code } };
  }
  const message = validation.message;

  // ── 신뢰 경계: 클라이언트 workScope 에서 **축 힌트만** 취한다 ──────────────
  const clientScope = (reqBody.workScope ?? {}) as Record<string, unknown>;
  const workspace = typeof clientScope.workspace === 'string' ? clientScope.workspace : 'home';
  const requestedServiceKey = typeof clientScope.serviceKey === 'string' ? clientScope.serviceKey : '';
  const capabilities = Array.isArray(clientScope.capabilities)
    ? (clientScope.capabilities as unknown[]).filter((c): c is string => typeof c === 'string').slice(0, 10)
    : [];

  const requestId = crypto.randomUUID();

  try {
    // ── 서버측 scope 재검증 ────────────────────────────────────────────────
    // store 축일 때만 매장을 확정한다. resolveWorkScopeStore 가 membership →
    // 매장 축 보유 → serviceKey 스코프 후보 순으로 판정하며, ambiguous 에서
    // 임의 매장을 고르지 않는다(WO-O4O-WORK-SCOPE-STORE-RESOLUTION-V0).
    const facts: VerifiedScopeFacts = { workspace, capabilities };

    // WO-O4O-AI-CAPABILITY-TOOL-ROUTING-V0: tool 판정의 유일한 입력.
    // 클라이언트 workScope 가 아니라 **서버가 확정한 사실**만 담는다.
    const toolCtx: VerifiedToolContext = { userId, workspace };

    if (STORE_SCOPED_WORKSPACES.includes(workspace)) {
      const resolution = await resolveWorkScopeStore(AppDataSource, {
        userId,
        serviceKey: requestedServiceKey,
        workspace,
      });
      facts.storeStatus = resolution.status;
      // 서버가 정규화한 canonical key 만 쓴다(클라이언트 값 그대로 쓰지 않는다).
      facts.serviceKey = resolution.serviceKey || undefined;

      toolCtx.storeStatus = resolution.status;
      toolCtx.serviceKey = resolution.serviceKey || undefined;
      // organizationId 는 executor 내부 조회에만 쓰고 프롬프트·응답에는 싣지 않는다.
      toolCtx.organizationId = resolution.organizationId ?? undefined;
    } else if (requestedServiceKey) {
      // 비-store 축: 식별자를 확정할 필요가 없으므로 서비스 표기만 정규화해 싣는다.
      facts.serviceKey = requestedServiceKey;
      toolCtx.serviceKey = requestedServiceKey;
    }

    // WO-O4O-LOCAL-WORK-AGENT-V0: local 축 연결 상태도 **서버가** 확정한다.
    //   로컬 축이 걸리는 요청에서만 조회한다 — 모든 home-chat 요청마다
    //   device 테이블을 읽을 이유가 없고, capability 는 tool 이 고려될 때만 필요하다.
    //   WO-O4O-WINDOWS-APP-WINDOW-CONTROL-V0: 그 판정은 라우터가 준다. 창 축("메모장
    //   열려 있어?")에는 로컬 지시어가 없어서, 여기서 따로 판단하면 조용히 어긋난다.
    if (needsLocalDeviceResolution(message)) {
      const deviceResolution = await resolveTargetDevice(AppDataSource, userId);
      toolCtx.localAgentStatus =
        deviceResolution.status === 'ok' ? 'connected' : deviceResolution.status;
      if (deviceResolution.status === 'ok') {
        // organizationId 와 같은 규칙: executor 내부에서만 쓰고 응답에 싣지 않는다.
        toolCtx.localDeviceId = deviceResolution.device.id;
      }
    }

    // ── Tool routing (결정론적, 최대 1회 — agent loop 없음) ──────────────────
    let toolContextBlock: string | null = null;
    let executedTool: string | null = null;
    let toolOutcome: string | null = null;
    // BROWSER-CONTROL-V0 §19·§41: 사이트를 실제로 열었을 때만 UI 가 [로그인 완료] 를 띄운다.
    // 서버는 로그인 여부를 판정하지도 저장하지도 않는다(§5·§42) — 이 값은 "열렸다" 는 사실뿐이다.
    let browserSiteOpened: { siteId: string; displayName: string } | null = null;
    // 인자(appId)는 라우터가 등재부에서 고른 값이고, 실행 직전 계약 계층이 다시 대조한다.
    // 클라이언트나 모델이 보낸 값이 여기로 들어오는 경로는 없다.
    const selected = selectToolInvocationForRequest(message, toolCtx);
    // COMPUTER-USE-V0 §32: 화면 조작 요청인데 실행할 수 없는 이유(입력 텍스트 없음 · 금지 내용 ·
    // 로그인 요청)가 있으면 tool 은 고르지 않고, 그 사유만 프롬프트 사실로 넘겨 모델이 되묻게 한다.
    if (!selected) {
      const gap = computerRequestGap(message);
      if (gap) facts.computerRequestGap = gap;
      // BROWSER-DOM-CONTROL-V0 §3: DOM 요청인데 대상/텍스트가 없거나 금지 내용이면 실행하지 않고 되묻게 한다.
      const domGap = domRequestGap(message);
      if (domGap) facts.domRequestGap = domGap;
      // SUPPLIER-SITE-ADAPTER-V0 §35: 공급처 조회 요청인데 상품명이 없거나 금지 내용이면 되묻게 한다.
      const supplierGap = supplierRequestGap(message);
      if (supplierGap) facts.supplierRequestGap = supplierGap;
      // PHARMACY-WEB-CORE V0 §13·§21·§28: 약국 웹 요청인데 작업이 모호하거나 입력이 없으면 되묻게 한다.
      const pharmacyWebGap = pharmacyWebRequestGap(message);
      if (pharmacyWebGap) facts.pharmacyWebRequestGap = pharmacyWebGap;
    }
    if (selected) {
      const toolResult = await executeAiTool(AppDataSource, selected.tool, selected.args, toolCtx);
      executedTool = selected.tool;
      toolOutcome = toolResult.ok ? 'allowed' : toolResult.reason;
      toolContextBlock = renderToolContext(toolResult);
      const presentation = buildHomeChatToolPresentation(selected.tool, toolResult, !!toolContextBlock);
      Object.assign(facts, presentation.facts);
      browserSiteOpened = presentation.browserSiteOpened;
    }

    // WO-O4O-AI-MULTI-PROVIDER-RUNTIME-V0:
    //   provider 는 (요청 body 명시) → (AI_DEFAULT_PROVIDER env) → (코드 기본값) 순으로 정한다.
    //   Home UI 는 provider 를 보내지 않으므로 실사용에서는 env/기본값이 쓰인다(§11 selector 미노출).
    const { provider, model, apiKey } = await resolveAiTarget(AppDataSource, reqBody.provider, attachments.length ? 'home.attachments' : 'home.chat');

    // UNIFIED-REQUEST §6·§7 — 첨부는 여기서 읽고(요청 메모리) 프롬프트 사실 + 자료 블록 + inline part 로만 쓴다.
    const attachmentParts = attachments.length > 0 ? readAttachments(attachments) : [];
    if (attachments.length > 0) {
      facts.attachments = attachmentParts.map((p) => ({
        name: p.name,
        kind: attachments.find((a) => a.name === p.name && a.mimeType === p.mimeType)?.kind ?? 'document',
        readable: p.kind !== 'unreadable',
      }));
    }

    // tool 결과는 system prompt 뒤에 **요약 문장으로만** 덧붙인다(구조체 통째 전달 금지).
    const basePrompt = buildHomeChatSystemPrompt(facts);
    const systemPrompt = toolContextBlock ? `${basePrompt}\n\n${toolContextBlock}` : basePrompt;
    const userPrompt = buildHomeChatUserPrompt(message, renderAttachmentTextBlocks(attachmentParts));

    const result = attachmentParts.some((p) => p.kind === 'inline')
      ? await executeMultimodalChat({ provider, model, apiKey, systemPrompt, userPrompt, parts: attachmentParts, timeoutMs: HOME_CHAT_TIMEOUT_MS })
      : await execute({
          systemPrompt,
          userPrompt,
          provider,
          responseMode: 'text',
          config: {
            apiKey,
            model,
            // temperature 는 gemini 용이다. OpenAI 현행 세대는 provider adapter 가 생략한다.
            temperature: 0.5,
            maxTokens: 2048,
            responseMode: 'text',
            // reasoning 계열은 10s 기본 타임아웃으로는 끊긴다. 넉넉히 준다.
            timeoutMs: HOME_CHAT_TIMEOUT_MS,
          },
          retry: { maxAttempts: 1 },
          meta: { service: 'o4o-home', callerName: 'home-chat' },
        });

    const answer = extractHomeChatAnswer(result.content);
    if (!answer) {
      logger.warn('home-chat empty answer', { requestId, userId, model: result.model });
      return { status: 502, body: { success: false, error: '응답을 생성하지 못했습니다. 다시 시도해 주세요.', code: 'AI_ERROR' } };
    }

    return {
      status: 200,
      body: {
        success: true,
        data: {
          message: answer,
          scope: {
            workspace: facts.workspace,
            serviceKey: facts.serviceKey ?? null,
            storeStatus: facts.storeStatus ?? null,
          },
          // 어느 provider/model 이 응답했는지. 키·프롬프트가 아니라 식별자뿐이라 비민감이며,
          // multi-provider 전환 검증에 필요하다(§20 smoke 가 이 값을 본다).
          provider,
          model: result.model,
          // 어떤 tool 이 실행/차단됐는지. 이름과 판정뿐이라 비민감이며 smoke 검증에 필요하다.
          tool: executedTool,
          toolOutcome,
          // BROWSER-CONTROL-V0: 열렸을 때만 채워진다. URL·browserType 은 싣지 않는다 — UI 가
          // 필요한 것은 "[로그인 완료] 버튼을 보여줄 것인가" 뿐이다.
          browserSiteOpened,
          // UNIFIED-REQUEST: 어떤 첨부가 읽혔는지(이름 · 종류 · 읽힘 여부만 — 내용 없음). UI 가 "읽지 못함" 을 표시한다.
          attachments: facts.attachments ?? [],
          requestId,
        },
      },
    };
  } catch (error: unknown) {
    // WO-O4O-AI-MULTI-PROVIDER-RUNTIME-V0: provider 마다 다른 원문을 공통 코드로 접는다.
    // 원문(키·모델·상태코드 포함 가능)은 **서버 로그에만** 남기고 응답에는 코드만 싣는다.
    const normalized = normalizeAiError(error);
    logger.error('home-chat error', {
      requestId,
      userId,
      code: normalized.code,
      retryable: normalized.retryable,
      error: (error as { message?: string })?.message,
    });
    // INSUFFICIENT_QUOTA 는 429 로 보내지 않는다 — 재시도 안내로 오해되면 안 된다.
    const status =
      normalized.code === 'RATE_LIMIT' ? 429
      : normalized.code === 'TIMEOUT' ? 504
      : normalized.code === 'INSUFFICIENT_QUOTA' ? 503
      : 502;
    return { status, body: { success: false, error: aiErrorUserMessage(normalized.code), code: normalized.code } };
  }
}

router.post('/home-chat', authenticate, requireNetureMember, dynamicLimiter('free'), async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.', code: 'UNAUTHENTICATED' });
  }
  const reply = await performHomeChat(userId, (req.body ?? {}) as Record<string, unknown>);
  return res.status(reply.status).json(reply.body);
});

/**
 * /hospital-drug 요청 본체 — 공통 Goal-driven Core 를 소비하는 첫 contextual surface.
 *
 * WO-O4O-HOSPITAL-DRUG-GOAL-DRIVEN-AI-COMPOSER-REALIGNMENT-V1 §1·§4·§5·§6
 *
 *   별도 AI 엔진을 만들지 않는다. 공통 `classifyTaskModality`(Capability C)로 modality 를 고르고:
 *     - screen  → 공통 Work Agent(performWorkAgentRun → provider=openai → Astra vision) 로 위임.
 *     - 그 밖(research/local/question) → `runHospitalDrugSurface` 가 공통 `runWebResearch`(Gemini
 *       grounding · admin 모델 SSOT)와 기존 Local SQLite 경로만 조립한다.
 *   구 composite(health.kr + SQLite 고정 결합)은 active path 에서 은퇴했다(§3). Source 는 고정하지 않고,
 *   원내 데이터는 질문이 요구할 때만 Context 로 얹는다(§2). 전역 provider 는 바꾸지 않는다(§5·§10).
 *   조회 tool 은 `executeAiTool`(권한 게이트)을 그대로 지난다 — 이 경로는 권한을 넓히지 않는다.
 *   반환 kind: screen=work / 그 밖=chat.
 */
async function performHospitalDrugRequest(
  userId: string,
  reqBody: { text: string; workScope?: unknown; attachments: UnifiedAttachment[]; localSource?: 'client' },
): Promise<{ reply: RouteReply; kind: 'work' | 'chat'; reason: string }> {
  const message = reqBody.text;
  const image = firstImageAttachment(reqBody.attachments);

  // 공통 Task Modality Router — 판정에 AI 호출 0. 이미지 동반 화면 요청은 screen.
  const modality = classifyTaskModality({
    request: message,
    image: image ? { provenance: 'user_image' } : null,
  });
  logger.info('hospital-drug surface routed', { userId, modality: modality.modality, reason: modality.reason });

  // §5 — screen 은 공통 Work Agent 로 위임(provider=openai → Astra). hospital-drug 전용 provider 없음.
  if (modality.modality === 'screen') {
    const workBody: Record<string, unknown> = { request: message };
    if (image) workBody.image = image;
    const reply = await performWorkAgentRun(userId, workBody);
    return { reply, kind: 'work', reason: 'screen' };
  }

  const clientScope = (reqBody.workScope ?? {}) as Record<string, unknown>;
  const workspace = typeof clientScope.workspace === 'string' ? clientScope.workspace : 'home';

  try {
    // 서버가 확정한 사실만 담는다(home-chat 과 같은 규칙). Local 조회는 이 컨텍스트로 게이트된다.
    const toolCtx: VerifiedToolContext = { userId, workspace };
    const deviceResolution = await resolveTargetDevice(AppDataSource, userId);
    toolCtx.localAgentStatus = deviceResolution.status === 'ok' ? 'connected' : deviceResolution.status;
    if (deviceResolution.status === 'ok') toolCtx.localDeviceId = deviceResolution.device.id;

    const result = await runHospitalDrugSurface(
      {
        exec: (name, args) => executeAiTool(AppDataSource, name, args, toolCtx),
        research: async (query) => {
          const r = await runWebResearch({ query });
          return { content: r.content, model: r.model, grounding: r.grounding };
        },
      },
      message,
      modality.modality,
      reqBody.localSource === 'client',
    );

    // §9 안전 로그 — plan · 경로 요약만. 제품명·성분·값 원문·raw row·모델 응답 본문은 남기지 않는다.
    logger.info('hospital-drug surface', {
      userId,
      plan: result.plan,
      usedResearch: result.usedResearch,
      usedLocal: result.usedLocal,
      groundingUsed: result.groundingUsed ?? null,
      localOutcome: result.localOutcome ?? null,
      localAgentStatus: toolCtx.localAgentStatus,
      localSource: reqBody.localSource ?? null,
    });

    return {
      reply: { status: 200, body: { success: true, data: { message: result.answer, plan: result.plan } } },
      kind: 'chat',
      reason: result.plan,
    };
  } catch (error: unknown) {
    logger.error('hospital-drug surface error', { userId, error: (error as { message?: string })?.message });
    return {
      reply: { status: 502, body: { success: false, error: '응답을 생성하지 못했습니다. 다시 시도해 주세요.', code: 'AI_ERROR' } },
      kind: 'chat',
      reason: 'error',
    };
  }
}

// ===========================================
// POST /api/ai/request — 단일 자연어 요청 진입점 (Unified Request Router)
// WO-O4O-AI-COMPOSER-UNIFIED-REQUEST-AND-ATTACHMENT-UX-V1 §4·§5·§6
//
//   { text, attachments?: [{ name, mimeType, base64 }], runId?, targetHint?(runId 와 함께만), routeHint?: 'work', workScope? }
//
//   사용자는 "질문 / 작업 수행" 을 고르지 않는다. 서버 라우터(unified-request-router, 결정론적 · AI 호출 없음)가
//   판정해 기존 두 본체(performHomeChat · performWorkAgentRun) 중 하나로 보낸다. 응답은 `data.kind` 로 갈린다:
//     chat    — data.chat = home-chat 응답 그대로
//     work    — data.work = work-agent/run 응답 그대로
//     confirm — data.confirm = { message, target } ; 사용자가 "진행" 하면 같은 text 에 routeHint:'work' 로 다시 온다
//   첨부: 이미지는 두 경로 모두(Work Agent 는 첫 이미지 1장 — 기존 계약), 문서 · 표는 chat 경로에서만 읽는다.
//   안전: Work 경로의 COMMIT · credential · never-escalate 판정은 runtime 그대로 — 라우터는 권한을 넓히지 않는다.
//   저장: 첨부 · 텍스트 · 응답 어느 것도 DB · 파일 · 로그에 쓰지 않는다. 로그는 route 판정 이름과 첨부 개수뿐이다.
//     예외(Personal Assistant Phase A): work 요청은 `assistant_tasks` 에 **구조 metadata 만**(소유 · 대상 id · 상태 ·
//     provisional Task type) 남기고 run 을 그 Task 에 붙인다. 요청 원문 · 첨부 · 답변은 여전히 저장하지 않는다.
//     응답: work 일 때만 data.taskId · data.taskStatus(additive). chat · confirm 에는 Task 가 없다.
//     요청: taskId?(이어갈 Task — 요청자 본인 · 미종결일 때만 쓰인다).
// ===========================================
router.post('/request', authenticate, requireNetureMemberOrHospitalSurface, dynamicLimiter('free'), async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.', code: 'UNAUTHENTICATED' });
  }
  const body = (req.body ?? {}) as Record<string, unknown>;

  const validation = validateHomeChatMessage(body.text);
  if (!validation.ok || !validation.message) {
    const code = validation.error ?? 'INVALID_MESSAGE';
    return res.status(400).json({ success: false, error: homeChatValidationMessage(code), code });
  }
  const text = validation.message;

  const attachmentCheck = validateUnifiedAttachments(body.attachments);
  if (!attachmentCheck.ok) {
    const code = attachmentCheck.error ?? 'ATTACHMENT_INVALID';
    return res.status(400).json({ success: false, error: unifiedAttachmentErrorMessage(code, attachmentCheck.errorName), code });
  }
  const attachments = attachmentCheck.attachments;

  const runId = typeof body.runId === 'string' && body.runId.length > 0 ? body.runId : undefined;
  const routeHint = body.routeHint === 'work' ? 'work' : undefined;

  // /hospital-drug 전용 경계 — 이 화면(surface)에서 온 요청만 공통 Goal-driven Core 로 흘려보낸다.
  // 전역 Router 는 병원 특수 규칙을 갖지 않는다: hospital-drug 판정은 오직 여기(HTTP 계층 · surface 명시)에서만
  // 내려 메인 자동화(홈 Composer)로 새지 않는다. modality 판정은 공통 Task Modality Router,
  // research=runWebResearch / screen=Work Agent(Astra) / local context / question 는 hospital-drug-surface 가 조립한다
  // (WO-O4O-HOSPITAL-DRUG-GOAL-DRIVEN-AI-COMPOSER-REALIGNMENT-V1 §1·§4·§5). runId 재개는 이보다 우선한다(같은-run Work resume).
  if (!runId && body.surface === 'hospital-drug') {
    const localSource = body.localSource === 'client' ? 'client' : undefined;
    const { reply, kind, reason } = await performHospitalDrugRequest(userId, { text, workScope: body.workScope, attachments, localSource });
    logger.info('ai unified request routed', {
      userId,
      route: 'hospital-drug',
      reason,
      targetType: null,
      attachmentCount: attachments.length,
    });
    if (reply.status !== 200) return res.status(reply.status).json(reply.body);
    const payload = kind === 'work'
      ? { kind: 'work', route: 'hospital-drug', reason, work: reply.body.data }
      : { kind: 'chat', route: 'hospital-drug', reason, chat: reply.body.data };
    return res.json({ success: true, data: payload });
  }

  // guard 가 가입 조회 없이 병원약국 처리로만 통과시킨 요청은 위 분기 밖(Neture 통합 라우터 · 홈 대화 · Task 작업)으로
  // 내려가지 않는다(CHECK §10 E5 — body.surface 로 Neture 자격을 얻을 수 없다). 위 분기와 같은 조건이라 도달하지 않는다.
  if (res.locals.hospitalSurfaceOnly === true) {
    return res.status(403).json({ success: false, error: NETURE_MAIN_MEMBERSHIP_MESSAGES.none, code: NETURE_MEMBERSHIP_REQUIRED });
  }

  const decision = classifyUnifiedRequest(text, {
    runId,
    routeHint,
    hasDocumentAttachment: attachments.some((a) => a.kind !== 'image'),
  });
  logger.info('ai unified request routed', {
    userId,
    route: decision.route,
    reason: decision.reason,
    targetType: decision.target?.targetType ?? null,
    attachmentCount: attachments.length,
  });

  if (decision.route === 'confirm_work' && decision.target) {
    return res.json({
      success: true,
      data: {
        kind: 'confirm',
        route: decision.route,
        reason: decision.reason,
        confirm: {
          message: confirmWorkMessage(decision.target),
          target: { targetType: decision.target.targetType, displayName: decision.target.displayName },
        },
      },
    });
  }

  if (decision.route === 'work') {
    const image = firstImageAttachment(attachments);
    const workBody: Record<string, unknown> = { request: text };
    if (image) workBody.image = image;
    // 재개는 원래 run 의 대상을 상속한다 — work-agent/run 의 기존 targetHint 를 재개 요청에서만 전달한다(FIX-V1 §2-B).
    if (runId) workBody.runId = runId;
    if (runId && typeof body.targetHint === 'string') workBody.targetHint = body.targetHint;
    if (typeof body.recoveryHint === 'string') workBody.recoveryHint = body.recoveryHint;
    // Personal Assistant Phase A — Assistant → Task → Execution. 실행 본체(performWorkAgentRun)는 그대로이고,
    // Task 는 구조만 남긴다(원문 미저장). taskId 는 additive — 기존 work 필드의 의미는 바뀌지 않는다.
    const understandLlm = createLlmTaskUnderstander(AppDataSource);
    const { reply, task } = await runAssistantWorkTask(
      AppDataSource,
      { userId, workBody, requestedTaskId: body.taskId, workScope: body.workScope },
      performWorkAgentRun,
      // 실행 전 업무 이해 · 완료 의미 검증 — 기존 provider abstraction(같은 provider · 키). 실패하면 결정적 기본 이해 · 검증 생략.
      // 이해 모델은 실행 가능할 때만 부른다 — 노드 미연결 · 권한 없음 · 형식 오류면 모델 없이 결정적 기본 이해(실행은 같은 이유로 거절된다).
      {
        understand: async (u) => ((await checkWorkAgentRunnable(userId, workBody, { requireCapability: true })).ok ? understandLlm(u) : null),
        verify: createLlmCompletionVerifier(AppDataSource),
      },
    );
    if (reply.status !== 200) return res.status(reply.status).json(task ? { ...reply.body, taskId: task.taskId } : reply.body);
    return res.json({
      success: true,
      data: {
        kind: 'work',
        route: decision.route,
        reason: decision.reason,
        taskId: task?.taskId ?? null,
        taskStatus: task?.status ?? null,
        work: reply.body.data,
      },
    });
  }

  const reply = await performHomeChat(userId, { message: text, workScope: body.workScope, provider: body.provider }, attachments);
  if (reply.status !== 200) return res.status(reply.status).json(reply.body);
  return res.json({ success: true, data: { kind: 'chat', route: decision.route, reason: decision.reason, chat: reply.body.data } });
});

// WO-O4O-HOSPITAL-PHARMACY-SERVICE-FOUNDATION-V1 §3 — POST /api/ai/file-understanding
//   원내 목록 등 임의 표 파일 → 공통 GFU 구조 이해(도메인 중립).
//   surface(병원약국 약제부 등)가 targetSchema 를 주입한다 — api-server 는 병원·약품 어휘를 갖지 않고
//   공통 Core(decode→profile→infer→normalize→confidence)만 소비한다. 파일은 저장하지 않는다(§7 첨부≠지식):
//   bytes 는 in-memory 로만 다루고, Gemini 에는 상단 표본만 가며, 로그에 값 원문을 남기지 않는다(계수·판정만).
//   반환은 generic NormalizedRecord — 도메인 타입 변환은 클라이언트 adapter(@o4o/hospital-pharmacy-core) 몫이다.
const FILE_UNDERSTANDING_MAX_BASE64 = 15 * 1024 * 1024; // base64 ≈ 원본 11MB

// strictNullChecks off(api-server) 에서는 { ok:true } | { ok:false } discriminated union 의
// 부정 내로잉이 동작하지 않는다(ref-api-server-strictnullchecks-no-negation-narrowing). 두 속성을 항상
// 함께 반환하고 schema==null 로 판정한다.


router.post('/file-understanding', authenticate, dynamicLimiter('free'), async (req, res: Response) => {
  const authReq = req as AuthRequest;
  const userId = authReq.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.', code: 'UNAUTHENTICATED' });
  }

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
    return res.status(400).json({
      success: false,
      error: '대상 스키마가 올바르지 않습니다.',
      code: schemaCheck.code ?? 'TARGET_SCHEMA_INVALID',
    });
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
    // 값 원문은 남기지 않는다 — 계수·판정만.
    logger.info('ai file-understanding', {
      userId,
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
    logger.error('ai file-understanding failed', {
      userId,
      schemaId: targetSchema.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(502).json({ success: false, error: '파일 구조를 해석하지 못했습니다.', code: 'FILE_UNDERSTANDING_FAILED' });
  }
});

export default router;
