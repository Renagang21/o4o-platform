/**
 * WO-O4O-AI-COMPOSER-UNIFIED-REQUEST-AND-ATTACHMENT-UX-V1 §4·§10·§14 — `POST /api/ai/request` HTTP 계약 (supertest)
 *
 * DB · provider · Local Agent 는 전부 주입한다. 고정하려는 것:
 *   ①  text-only 일반 질문      → kind=chat, home-chat 본체(execute) 1회, Work Agent 미호출
 *   ②  text-only 웹 작업 요청   → kind=work, Work Agent 본체 1회, execute 미호출 · 응답에 runId/resumable 통과
 *   ②-b surface=hospital-drug 텍스트 요청 → kind=chat, hospital-drug-surface 1회(공통 Core 소비), Work/home-chat 미호출
 *   ②-b2 surface=hospital-drug + 화면 조작 요청 → kind=work(공통 Work Agent 위임), surface 미호출
 *   ②-c surface 없으면 hospital-drug 경로 아님(전역 Router 오염 제거 · 메인 자동화 격리)
 *   ③  image + 질문(대상 없음)  → kind=chat, Gemini inline 경로(fetch)로 이미지가 실린다
 *   ④  PDF/XLSX + 질문          → kind=chat, 첨부 사실이 응답 data.chat.attachments 에 (내용 없이) 온다
 *   ⑤  첨부 없이 Work intent    → kind=work
 *   ⑥  모호한 요청              → kind=confirm, 아무 본체도 호출되지 않는다 → routeHint:'work' 재요청은 work
 *   ⑦  미지원 파일              → 400 ATTACHMENT_TYPE_UNSUPPORTED + 지원 목록 문구
 *   ⑧  runId 재개              → work 본체에 runId 그대로
 *   ⑨  문서 첨부 + 웹 작업     → chat (문서는 Work Agent 로 흐르지 않는다)
 *   ⑩  Local Agent 미연결 + work → 403 WORK_AGENT_NOT_AVAILABLE (기존 계약 그대로 통과)
 *   ⑪  기존 endpoint 회귀: /home-chat · /work-agent/run 은 그대로 동작한다
 *   ⑫  로그에 base64 · 본문이 실리지 않는다
 *   ⑬  Personal Assistant Phase A — work 응답에 taskId · taskStatus(additive) · chat/confirm 에는 Task 없음 ·
 *       403 에도 taskId · 재요청 taskId 로 같은 Task · 원문이 Task 저장 경로에 닿지 않는다
 *       (WO-O4O-PERSONAL-ASSISTANT-PHASE-A-TASK-FOUNDATION-V1)
 *   ⑭  Neture 가입 승인 guard — 미승인 · 대기 · 반려 · 정지는 403 NETURE_MEMBERSHIP_REQUIRED(본체 미호출) ·
 *       병원약국 화면(surface=hospital-drug) 첫 요청은 가입 조회 없이 main 과 같은 병원약국 처리(조사 · 원내 · 화면 위임) —
 *       Neture 가입 여부로 달라지지 않는다 · 그 밖의 Neture 경로(runId 재개 · 홈 대화 · 작업 에이전트)는 403 ·
 *       platform:super_admin 만 예외
 *       (CHECK-NETURE-PHARMACY-STORE-COMMERCE-LOCAL-BROWSER-V1 §10 E5)
 */

import express from 'express';
import request from 'supertest';

const executeMock = jest.fn();
const runWorkAgentMock = jest.fn();
const runSurfaceMock = jest.fn();
const runWebResearchMock = jest.fn();
const resolveTargetDeviceMock = jest.fn();
const fetchMock = jest.fn();
const logInfo = jest.fn();
const logError = jest.fn();
const logWarn = jest.fn();
const netureStatusMock = jest.fn();
let testUserRoles: string[] = ['user'];

jest.mock('../middleware/auth.middleware.js', () => ({
  authenticate: (req: any, res: any, next: () => void) => {
    if (req.headers['x-test-anon']) return res.status(401).json({ success: false });
    req.user = { id: '00000000-0000-4000-8000-000000000001', roles: testUserRoles };
    next();
  },
}));
jest.mock('../middleware/rateLimiter.js', () => ({ dynamicLimiter: () => (_req: any, _res: any, next: () => void) => next() }));
jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { info: (...a: unknown[]) => logInfo(...a), warn: (...a: unknown[]) => logWarn(...a), error: (...a: unknown[]) => logError(...a), debug: jest.fn() },
}));
jest.mock('../database/connection.js', () => ({ AppDataSource: { isInitialized: true } }));
jest.mock('../modules/neture/services/neture-main-membership.js', () => ({
  ...jest.requireActual('../modules/neture/services/neture-main-membership.js'),
  getNetureMainMembershipStatus: (...a: unknown[]) => netureStatusMock(...a),
}));
jest.mock('../services/local-agent/local-agent-service.js', () => ({ resolveTargetDevice: (...a: unknown[]) => resolveTargetDeviceMock(...a) }));
jest.mock('../utils/work-scope-store-resolution.js', () => ({ resolveWorkScopeStore: jest.fn(), STORE_SCOPED_WORKSPACES: ['store'] }));
jest.mock('../utils/ai-provider-runtime.js', () => {
  const actual = jest.requireActual('../utils/ai-provider-runtime.js');
  return { ...actual, resolveAiTarget: jest.fn(async () => ({ provider: 'gemini', model: 'gemini-test', apiKey: 'k' })) };
});
jest.mock('@o4o/ai-core', () => ({ __esModule: true, execute: (...a: unknown[]) => executeMock(...a) }));
const plannerFactoryCalls: string[] = [];
jest.mock('../services/ai-tools/work-agent-runtime.js', () => ({
  runWorkAgent: (...a: unknown[]) => runWorkAgentMock(...a),
  createLlmPlanner: () => { plannerFactoryCalls.push('default'); return { kind: 'llm', plan: jest.fn() }; },
  createStrongLlmPlanner: () => { plannerFactoryCalls.push('default-strong'); return { kind: 'llm', plan: jest.fn() }; },
  // Capability C — per-task provider planner 쌍(전역 provider 불변).
  createLlmPlannerForProvider: (_ds: unknown, provider: string) => { plannerFactoryCalls.push(`provider:${provider}`); return { kind: 'llm', plan: jest.fn() }; },
  createStrongLlmPlannerForProvider: (_ds: unknown, provider: string) => { plannerFactoryCalls.push(`provider-strong:${provider}`); return { kind: 'llm', plan: jest.fn() }; },
}));
// ai-proxy.service 는 DB entity 를 끌고 온다 — 이 spec 이 쓰는 두 경로는 그것을 쓰지 않는다.
jest.mock('../services/ai-proxy.service.js', () => ({ aiProxyService: {} }));
jest.mock('../services/ai-model-registry.service.js', () => ({ isGeminiModelAllowedSync: () => true }));
// /hospital-drug surface 본체만 갈아끼운다 — HTTP 계층이 surface='hospital-drug' 게이트와 screen 위임을
// 올바르게 거는지가 이 spec 의 관심사다. surface 내부 오케스트레이션(research/local/question 조립)은
// hospital-drug-surface.spec.ts 가 결정론으로 덮는다. runWebResearch 는 라우터가 import 만 하므로 무해화한다.
jest.mock('../services/ai-tools/hospital-drug-surface.js', () => ({
  runHospitalDrugSurface: (...a: unknown[]) => runSurfaceMock(...a),
}));
jest.mock('../services/ai/web-research.service.js', () => ({
  runWebResearch: (...a: unknown[]) => runWebResearchMock(...a),
}));
// ⑬ Personal Assistant Phase A — Task 저장소는 메모리로 바꾼다(SQL 계약은 personal-assistant-task-store.spec).
const taskStoreCalls: unknown[] = [];
const memTasks = new Map<string, { status: string; requestedByUserId: string }>();
let memTaskSeq = 0;
jest.mock('../services/assistant/task-ownership.js', () => ({
  resolveTaskOwnership: jest.fn(async () => ({ scope: 'USER', organizationId: null, serviceKey: null })),
}));
jest.mock('../services/assistant/assistant-task-store.js', () => {
  const actual = jest.requireActual('../services/assistant/assistant-task-store.js');
  const row = (taskId: string) => ({ taskId, ...memTasks.get(taskId)!, ownershipScope: 'USER' });
  return {
    ...actual,
    createAssistantTask: jest.fn(async (_ds: unknown, input: any) => {
      taskStoreCalls.push(['create', input]);
      const taskId = `00000000-0000-4000-8000-${String(++memTaskSeq).padStart(12, '0')}`;
      memTasks.set(taskId, { status: 'running', requestedByUserId: input.requestedByUserId });
      return row(taskId);
    }),
    getAssistantTaskForRequester: jest.fn(async (_ds: unknown, taskId: string, userId: string) => {
      taskStoreCalls.push(['get', taskId]);
      return memTasks.get(taskId)?.requestedByUserId === userId ? row(taskId) : null;
    }),
    findTaskIdByRun: jest.fn(async () => null),
    attachRunToTask: jest.fn(async (_ds: unknown, input: any) => { taskStoreCalls.push(['attach', input]); return true; }),
    updateAssistantTask: jest.fn(async (_ds: unknown, input: any) => {
      taskStoreCalls.push(['update', input]);
      const t = memTasks.get(input.taskId);
      if (!t) return null;
      t.status = input.status;
      return row(input.taskId);
    }),
  };
});

import router from '../routes/ai-proxy.routes.js';
import { AI_TOOL_NAMES } from '../services/ai-tools/ai-tool-contract.js';

const app = express();
app.use(express.json({ limit: '50mb' }));
app.use('/api/ai', router);

const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64');
const CONNECTED = { status: 'ok', device: { id: 'dev-1' } };

function workResult(over: Record<string, unknown> = {}) {
  return {
    ok: true,
    goal: { goalId: 'g_1', runId: 'g_1', status: 'completed', request: 'x' },
    siteId: 'healthkr',
    displayName: '약학정보원',
    progress: 'completed',
    takeover: null,
    neededInput: null,
    stepCount: 2,
    aiPlanCount: 1,
    path: '/search',
    history: [],
    message: '완료',
    errorCode: null,
    target: { targetType: 'browser_site', displayName: '약학정보원' },
    resumable: false,
    ...over,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  testUserRoles = ['user'];
  netureStatusMock.mockResolvedValue('active');
  executeMock.mockResolvedValue({ content: '텍스트 답변', model: 'gemini-test' });
  runWorkAgentMock.mockResolvedValue(workResult());
  runSurfaceMock.mockResolvedValue({
    answer: '원내 결합 답변',
    plan: 'research_and_local',
    product: '우루사정',
    usedResearch: true,
    usedLocal: true,
    researchModel: 'gemini-test',
    groundingUsed: true,
    localOutcome: 'rows:2',
  });
  runWebResearchMock.mockResolvedValue({ content: '리서치 답변', model: 'gemini-test', grounding: { used: true, sources: [] } });
  resolveTargetDeviceMock.mockResolvedValue(CONNECTED);
  fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '이미지 답변' }] } }] }) });
  (globalThis as any).fetch = fetchMock;
});

describe('POST /api/ai/request', () => {
  it('비로그인 401 · 빈 text 400', async () => {
    expect((await request(app).post('/api/ai/request').set('x-test-anon', '1').send({ text: 'x' })).status).toBe(401);
    const empty = await request(app).post('/api/ai/request').send({ text: '   ' });
    expect(empty.status).toBe(400);
    expect(empty.body.code).toBe('EMPTY_MESSAGE');
  });

  it('① text-only 일반 질문 → chat (Work Agent 미호출)', async () => {
    const r = await request(app).post('/api/ai/request').send({ text: 'UDCA가 뭐야?' });
    expect(r.status).toBe(200);
    expect(r.body.data.kind).toBe('chat');
    expect(r.body.data.reason).toBe('no_registered_target');
    expect(r.body.data.chat.message).toBe('텍스트 답변');
    expect(r.body.data.chat.attachments).toEqual([]);
    expect(executeMock).toHaveBeenCalledTimes(1);
    expect(runWorkAgentMock).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  // WO-O4O-COMMON-AUTOMATION-CORE-CAPABILITY-C-TASK-MODALITY-ROUTER-V1 (E) — work 로 온 Goal 은 screen modality 이므로
  // planner 쌍이 openai(Astra vision · Capability B) 로 만들어진다. 전역 AI_DEFAULT_PROVIDER 는 건드리지 않는다.
  it('②-C. work 경로의 Goal(등재 대상) → planner 쌍이 per-task provider openai 로 생성된다 · 전역 provider env 불변', async () => {
    plannerFactoryCalls.length = 0;
    const before = process.env.AI_DEFAULT_PROVIDER;
    const r = await request(app).post('/api/ai/request').send({ text: '약학정보원에서 타이레놀 검색해줘' });
    expect(r.body.data.kind).toBe('work');
    expect(plannerFactoryCalls).toEqual(['provider:openai', 'provider-strong:openai']);
    expect(process.env.AI_DEFAULT_PROVIDER).toBe(before);
    expect(logInfo.mock.calls.find((c) => c[0] === 'work-agent task modality')?.[1]).toEqual(expect.objectContaining({ modality: 'screen', provider: 'openai' }));
  });

  it('② text-only 웹 작업(결합 아님) → work (execute 미호출 · runId/resumable 통과)', async () => {
    runWorkAgentMock.mockResolvedValueOnce(workResult({ goal: { goalId: 'g_2', runId: 'g_2', status: 'waiting_for_user' }, progress: 'needs_user', resumable: true, takeover: { reason: 'user_judgment_required', step: 2 } }));
    const r = await request(app).post('/api/ai/request').send({ text: '약학정보원에서 타이레놀 검색해줘' });
    expect(r.status).toBe(200);
    expect(r.body.data.kind).toBe('work');
    expect(r.body.data.reason).toBe('task_intent');
    expect(r.body.data.work.runId).toBe('g_2');
    expect(r.body.data.work.resumable).toBe(true);
    expect(r.body.data.work.aiPlanCount).toBe(1);
    expect(executeMock).not.toHaveBeenCalled();
    expect(runSurfaceMock).not.toHaveBeenCalled();
    const input = runWorkAgentMock.mock.calls[0][2];
    expect(input.request).toBe('약학정보원에서 타이레놀 검색해줘');
    expect(input.image).toBeUndefined();
  });

  // WO-O4O-HOSPITAL-DRUG-GOAL-DRIVEN-AI-COMPOSER-REALIGNMENT-V1 §1·§4 — /hospital-drug 는 공통 Goal-driven Core 를
  // 소비한다. surface='hospital-drug' 텍스트 요청은 hospital-drug-surface(research/local/question 조립)로 가고
  // 하나의 chat 답으로 돌아온다. Work/chat(home) 본체는 타지 않고, 응답 reason 은 surface plan 이다.
  it('②-b surface=hospital-drug 텍스트 요청 → surface 조립 · kind=chat (Work·home-chat 미호출)', async () => {
    const r = await request(app).post('/api/ai/request').send({ text: '우루사정 200mg과 같은 성분의 원내약 있어?', surface: 'hospital-drug' });
    expect(r.status).toBe(200);
    expect(r.body.data.kind).toBe('chat');
    expect(r.body.data.route).toBe('hospital-drug');
    expect(r.body.data.reason).toBe('research_and_local');
    expect(r.body.data.chat.message).toBe('원내 결합 답변');
    expect(runSurfaceMock).toHaveBeenCalledTimes(1);
    expect(runWorkAgentMock).not.toHaveBeenCalled();
    expect(executeMock).not.toHaveBeenCalled();
    // 라우팅 로그는 hospital-drug 경로 · reason=plan · 문장 본문 없음.
    const routed = logInfo.mock.calls.find((c) => c[0] === 'ai unified request routed');
    expect(routed?.[1]).toEqual(expect.objectContaining({ route: 'hospital-drug', reason: 'research_and_local' }));
  });

  // §5·§8-D — surface='hospital-drug' 이라도 화면 조작 요청은 공통 Work Agent(→ provider=openai → Astra)로 위임한다.
  // surface 조립기는 타지 않는다(screen 은 HTTP 계층에서 갈린다).
  it('②-b2 surface=hospital-drug + 화면 조작 요청 → 공통 Work Agent 위임 · kind=work (surface 미호출)', async () => {
    const r = await request(app).post('/api/ai/request').send({ text: '이 화면에서 직접 확인해줘', surface: 'hospital-drug' });
    expect(r.status).toBe(200);
    expect(r.body.data.kind).toBe('work');
    expect(r.body.data.route).toBe('hospital-drug');
    expect(r.body.data.reason).toBe('screen');
    expect(runWorkAgentMock).toHaveBeenCalledTimes(1);
    expect(runSurfaceMock).not.toHaveBeenCalled();
  });

  // WO-O4O-HOSPITAL-DRUG-BROWSER-LOCAL-DATA-CONNECT-V1 — 원내 자료를 클라이언트가 브라우저에서 처리하면
  // body.localSource='client' 로 온다. 라우터는 이를 surface 의 suppressLocal(4번째 인자)로 넘겨 서버 원내 조회를
  // 생략시킨다. 값이 없으면 false. surface 본체는 mock 이므로 여기서는 전달만 고정한다(생략 로직은 surface.spec).
  it('②-b3 surface=hospital-drug + localSource=client → surface 에 suppressLocal=true 로 전달 (없으면 false)', async () => {
    await request(app).post('/api/ai/request').send({ text: '우루사정과 같은 성분의 원내약 있어?', surface: 'hospital-drug', localSource: 'client' });
    expect(runSurfaceMock).toHaveBeenCalledTimes(1);
    expect(runSurfaceMock.mock.calls[0][3]).toBe(true);
    const routed = logInfo.mock.calls.find((c) => c[0] === 'ai unified request routed');
    expect(routed?.[1]?.route).toBe('hospital-drug');

    jest.clearAllMocks();
    runSurfaceMock.mockResolvedValue({ answer: 'x', plan: 'research', product: null, usedResearch: true, usedLocal: false });
    await request(app).post('/api/ai/request').send({ text: '타이레놀정의 효능을 조사해줘', surface: 'hospital-drug' });
    expect(runSurfaceMock.mock.calls[0][3]).toBe(false);
  });

  // §1·§10 — 전역 Router 는 병원 특수 규칙을 갖지 않는다. surface 가 없으면(메인 홈 Composer) 같은 문장도
  // hospital-drug 경로로 가지 않는다 — 등재 대상·업무어가 없어 일반 chat 으로 떨어지고, surface 조립기는 호출되지 않는다.
  it('②-c surface 가 없으면 hospital-drug 경로로 라우팅되지 않는다(오염 제거)', async () => {
    const r = await request(app).post('/api/ai/request').send({ text: '우루사정 200mg과 같은 성분의 원내약 있어?' });
    expect(runSurfaceMock).not.toHaveBeenCalled();
    expect(r.body?.data?.route).not.toBe('hospital-drug');
    const routed = logInfo.mock.calls.find((c) => c[0] === 'ai unified request routed');
    expect(routed?.[1]?.route).not.toBe('hospital-drug');
  });

  it('③ image + 질문(대상 없음) → chat · Gemini inline 경로에 이미지가 실린다', async () => {
    const r = await request(app).post('/api/ai/request').send({ text: '이 사진의 약 이름이 뭐야?', attachments: [{ name: 'p.jpg', mimeType: 'image/jpeg', base64: b64('jpg') }] });
    expect(r.status).toBe(200);
    expect(r.body.data.kind).toBe('chat');
    expect(r.body.data.chat.message).toBe('이미지 답변');
    expect(r.body.data.chat.attachments).toEqual([{ name: 'p.jpg', kind: 'image', readable: true }]);
    expect(executeMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.contents[0].parts[1]).toEqual({ inline_data: { mime_type: 'image/jpeg', data: b64('jpg') } });
    expect(body.systemInstruction.parts[0].text).toContain('## 첨부 자료');
  });

  it('④ PDF + XLSX + 질문 → chat · PDF 는 inline · XLSX 는 텍스트 자료 블록 · 응답엔 이름/종류/읽힘만', async () => {
    // XLSX 는 실제 workbook 이어야 읽힌다 — xlsx 로 만든다.
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['약품명', '수량'], ['우루사정', 3]]), '재고');
    const xlsxB64 = (XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer).toString('base64');
    const r = await request(app).post('/api/ai/request').send({
      text: '이 두 자료를 요약해줘',
      attachments: [
        { name: 'manual.pdf', mimeType: 'application/pdf', base64: b64('%PDF-1.4') },
        { name: 'stock.xlsx', mimeType: '', base64: xlsxB64 },
      ],
    });
    expect(r.status).toBe(200);
    expect(r.body.data.kind).toBe('chat');
    expect(r.body.data.chat.attachments).toEqual([
      { name: 'manual.pdf', kind: 'document', readable: true },
      { name: 'stock.xlsx', kind: 'spreadsheet', readable: true },
    ]);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.contents[0].parts[0].text).toContain('이 두 자료를 요약해줘');
    expect(body.contents[0].parts[0].text).toContain('<<<첨부 자료 시작: stock.xlsx>>>');
    expect(body.contents[0].parts[0].text).toContain('우루사정,3');
    expect(body.contents[0].parts[1]).toEqual({ inline_data: { mime_type: 'application/pdf', data: b64('%PDF-1.4') } });
    // 응답에는 추출 텍스트 · base64 가 없다
    expect(JSON.stringify(r.body)).not.toContain('우루사정,3');
    expect(JSON.stringify(r.body)).not.toContain(xlsxB64.slice(0, 40));
  });

  it('⑤ 첨부 없이 Windows 프로그램 업무 → work · ⑧ runId 재개는 그대로 통과', async () => {
    const r = await request(app).post('/api/ai/request').send({ text: 'Doctors에서 반납대상 리스트가 무엇이 있는지 보여줘' });
    expect(r.body.data.kind).toBe('work');
    const resume = await request(app).post('/api/ai/request').send({ text: '두 번째요', runId: 'g_2' });
    expect(resume.status).toBe(200);
    expect(resume.body.data.kind).toBe('work');
    expect(resume.body.data.reason).toBe('resume');
    expect(runWorkAgentMock.mock.calls[1][2].runId).toBe('g_2');
  });

  it('⑧-2 재개는 원래 run 대상(targetHint)을 함께 넘기고, 재개가 아니면 targetHint 를 무시한다(FIX-V1 §2-B)', async () => {
    await request(app).post('/api/ai/request').send({ text: '게보린', runId: 'g_3', targetHint: 'healthkr' });
    expect(runWorkAgentMock.mock.calls[0][2]).toMatchObject({ request: '게보린', runId: 'g_3', targetHint: 'healthkr' });
    await request(app).post('/api/ai/request').send({ text: '약학정보원에서 게보린 검색해줘', targetHint: 'healthkr' });
    expect(runWorkAgentMock.mock.calls[1][2].targetHint).toBeUndefined();
  });

  it('⑥ 모호한 요청 → confirm (본체 미호출) → routeHint:work → work', async () => {
    const r = await request(app).post('/api/ai/request').send({ text: '닥터스 반납' });
    expect(r.status).toBe(200);
    expect(r.body.data.kind).toBe('confirm');
    expect(r.body.data.confirm.message).toContain('Doctors 프로그램에서');
    expect(r.body.data.confirm.target).toEqual({ targetType: 'windows_app', displayName: expect.any(String) });
    expect(executeMock).not.toHaveBeenCalled();
    expect(runWorkAgentMock).not.toHaveBeenCalled();
    const go = await request(app).post('/api/ai/request').send({ text: '닥터스 반납', routeHint: 'work' });
    expect(go.body.data.kind).toBe('work');
    expect(go.body.data.reason).toBe('user_confirmed');
  });

  it('⑦ 미지원 파일 → 400 + 지원 목록 · 이미지 계약 위반(work 이미지 형상) 도 기존 코드 그대로', async () => {
    const r = await request(app).post('/api/ai/request').send({ text: '이거 뭐야', attachments: [{ name: 'setup.exe', mimeType: 'application/x-msdownload', base64: b64('x') }] });
    expect(r.status).toBe(400);
    expect(r.body.code).toBe('ATTACHMENT_TYPE_UNSUPPORTED');
    expect(r.body.error).toContain('setup.exe');
    expect(r.body.error).toContain('PDF');
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('⑨ 문서 첨부 + 웹 작업 문장 → chat (문서는 Work Agent 로 흐르지 않는다) · 이미지 첨부 + 웹 작업 → work 에 첫 이미지', async () => {
    const doc = await request(app).post('/api/ai/request').send({ text: '약학정보원에서 이 목록의 약을 찾아줘', attachments: [{ name: 'list.txt', mimeType: 'text/plain', base64: b64('우루사정') }] });
    expect(doc.body.data.kind).toBe('chat');
    expect(doc.body.data.reason).toBe('document_attached');
    expect(runWorkAgentMock).not.toHaveBeenCalled();
    const img = await request(app).post('/api/ai/request').send({ text: '약학정보원에서 이 사진의 약을 찾아줘', attachments: [{ name: 'a.png', mimeType: 'image/png', base64: b64('png') }] });
    expect(img.body.data.kind).toBe('work');
    expect(runWorkAgentMock.mock.calls[0][2].image).toEqual({ mimeType: 'image/png', base64: b64('png') });
  });

  it('⑩ Local Agent 미연결 + work → 403 WORK_AGENT_NOT_AVAILABLE (안전 경계 · 기존 계약)', async () => {
    resolveTargetDeviceMock.mockResolvedValue({ status: 'not_registered' });
    const r = await request(app).post('/api/ai/request').send({ text: '약학정보원에서 우루사정 찾아줘' });
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('WORK_AGENT_NOT_AVAILABLE');
    expect(runWorkAgentMock).not.toHaveBeenCalled();
  });

  it('⑪ 기존 endpoint 회귀 — /home-chat · /work-agent/run 그대로', async () => {
    const chat = await request(app).post('/api/ai/home-chat').send({ message: '안녕' });
    expect(chat.status).toBe(200);
    expect(chat.body.data.message).toBe('텍스트 답변');
    expect(chat.body.data.attachments).toEqual([]);
    const work = await request(app).post('/api/ai/work-agent/run').send({ request: '약학정보원에서 우루사 찾아줘' });
    expect(work.status).toBe(200);
    expect(work.body.data.goal.goalId).toBe('g_1');
    expect(work.body.data.runId).toBe('g_1');
    const bad = await request(app).post('/api/ai/work-agent/run').send({ request: '' });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('WORK_AGENT_GOAL_INVALID');
    expect(AI_TOOL_NAMES.WORK_AGENT_PERFORM).toBe('local.workagent.perform');
  });

  it('⑫ 로그에 base64 · 문장 본문이 실리지 않는다 (route 판정 · 첨부 개수만)', async () => {
    await request(app).post('/api/ai/request').send({ text: '이 사진 뭐야 비밀문장', attachments: [{ name: 'p.png', mimeType: 'image/png', base64: b64('SECRETIMG') }] });
    const routed = logInfo.mock.calls.find((c) => c[0] === 'ai unified request routed');
    expect(routed).toBeDefined();
    expect(routed![1]).toEqual(expect.objectContaining({ route: 'chat', attachmentCount: 1 }));
    const all = JSON.stringify([...logInfo.mock.calls, ...logWarn.mock.calls, ...logError.mock.calls]);
    expect(all).not.toContain(b64('SECRETIMG'));
    expect(all).not.toContain('비밀문장');
  });
});

describe('⑬ Personal Assistant Phase A — Task (additive)', () => {
  beforeEach(() => {
    taskStoreCalls.length = 0;
    memTasks.clear();
  });

  it('work → taskId · taskStatus 추가, 기존 work 필드는 그대로 · run 이 Task 에 붙는다', async () => {
    const r = await request(app).post('/api/ai/request').send({ text: '약학정보원에서 타이레놀 검색해줘' });
    expect(r.status).toBe(200);
    expect(r.body.data.kind).toBe('work');
    expect(r.body.data.taskId).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.body.data.taskStatus).toBe('completed');
    expect(r.body.data.work.runId).toBe('g_1');
    expect(r.body.data.work.goal.status).toBe('completed');
    expect(r.body.data.work).not.toHaveProperty('taskKey'); // 내부 요약은 응답에 싣지 않는다
    expect(taskStoreCalls).toContainEqual(['attach', { taskId: r.body.data.taskId, runId: 'g_1', userId: '00000000-0000-4000-8000-000000000001' }]);
  });

  it('chat · confirm 에는 Task 가 없다 (저장 0)', async () => {
    const chat = await request(app).post('/api/ai/request').send({ text: 'UDCA가 뭐야?' });
    expect(chat.body.data.kind).toBe('chat');
    expect(chat.body.data).not.toHaveProperty('taskId');
    const confirm = await request(app).post('/api/ai/request').send({ text: '닥터스 반납' });
    expect(confirm.body.data.kind).toBe('confirm');
    expect(confirm.body.data).not.toHaveProperty('taskId');
    expect(taskStoreCalls).toHaveLength(0);
  });

  it('403(기기 미연결) → 기존 오류 계약 + taskId · Task 는 blocked', async () => {
    resolveTargetDeviceMock.mockResolvedValue({ status: 'not_registered' });
    const r = await request(app).post('/api/ai/request').send({ text: '약학정보원에서 우루사정 찾아줘' });
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('WORK_AGENT_NOT_AVAILABLE');
    expect(memTasks.get(r.body.taskId)?.status).toBe('blocked');
  });

  it('taskId 로 다시 요청 → 같은 Task 를 이어간다 (미종결일 때)', async () => {
    runWorkAgentMock.mockResolvedValueOnce(workResult({ goal: { goalId: 'g_9', runId: 'g_9', status: 'waiting_for_user' }, resumable: true }));
    const first = await request(app).post('/api/ai/request').send({ text: '약학정보원에서 타이레놀 검색해줘' });
    expect(first.body.data.taskStatus).toBe('waiting_for_user');
    const again = await request(app).post('/api/ai/request').send({ text: '약학정보원에서 타이레놀 검색해줘', taskId: first.body.data.taskId });
    expect(again.body.data.taskId).toBe(first.body.data.taskId);
    expect(memTasks.size).toBe(1);
  });

  it('요청 원문은 Task 저장 경로에 닿지 않는다(실행 본체로만 간다)', async () => {
    await request(app).post('/api/ai/request').send({ text: '약학정보원에서 비밀약품SENTINEL 검색해줘', workScope: { workspace: 'home', organizationId: 'x' } });
    expect(runWorkAgentMock.mock.calls[0][2].request).toContain('비밀약품SENTINEL');
    expect(JSON.stringify(taskStoreCalls)).not.toContain('SENTINEL');
  });
});

describe('⑭ Neture 가입 승인 guard (CHECK §10 E5)', () => {
  const ENDPOINTS: Array<[string, Record<string, unknown>]> = [
    ['/api/ai/request', { text: '오늘 날씨 알려줘' }],
    ['/api/ai/home-chat', { message: '안녕' }],
    ['/api/ai/work-agent/run', { request: '쿠팡 주문 확인해줘' }],
  ];

  it.each([['none'], ['pending'], ['rejected'], ['suspended'], ['withdrawn']])(
    "Neture 가입 %s → 세 endpoint 모두 403 NETURE_MEMBERSHIP_REQUIRED · 본체 미호출",
    async (status) => {
      netureStatusMock.mockResolvedValue(status);
      for (const [path, body] of ENDPOINTS) {
        const r = await request(app).post(path).send(body);
        expect(r.status).toBe(403);
        expect(r.body.code).toBe('NETURE_MEMBERSHIP_REQUIRED');
        expect(r.body.details).toEqual({ netureMembershipStatus: status });
      }
      expect(executeMock).not.toHaveBeenCalled();
      expect(runWorkAgentMock).not.toHaveBeenCalled();
    },
  );

  it('상태별 안내 문구 — 미가입 · 대기', async () => {
    netureStatusMock.mockResolvedValue('none');
    expect((await request(app).post('/api/ai/request').send({ text: 'x' })).body.error).toBe('Neture 가입 승인이 필요합니다.');
    netureStatusMock.mockResolvedValue('pending');
    expect((await request(app).post('/api/ai/request').send({ text: 'x' })).body.error).toBe('Neture 가입 승인 대기 중입니다.');
  });

  // 병원약국은 이 리팩토링 대상이 아니다 — Neture 가입 여부와 무관하게 main 과 같은 병원약국 처리(②-b · ②-b2 · ②-b3)를 받는다.
  it.each([['none'], ['pending'], ['suspended']])(
    'surface=hospital-drug · Neture 가입 %s → main 과 같은 병원약국 처리(원내 조회 포함) · 가입 조회 없음 · 홈 대화 미호출',
    async (status) => {
      netureStatusMock.mockResolvedValue(status);
      const r = await request(app).post('/api/ai/request').send({ text: '우루사정 200mg과 같은 성분의 원내약 있어?', surface: 'hospital-drug' });
      expect(r.status).toBe(200);
      expect(r.body.data.kind).toBe('chat');
      expect(r.body.data.route).toBe('hospital-drug');
      expect(r.body.data.reason).toBe('research_and_local');
      expect(runSurfaceMock).toHaveBeenCalledTimes(1);
      expect(runSurfaceMock.mock.calls[0][3]).toBe(false); // 원내 조회를 막지 않는다(main 과 같다)
      expect(netureStatusMock).not.toHaveBeenCalled();
      expect(executeMock).not.toHaveBeenCalled();
    },
  );

  it('surface=hospital-drug · Neture 미승인 · 화면 조작 요청 → main 과 같이 병원약국 화면 위임(kind=work)', async () => {
    netureStatusMock.mockResolvedValue('none');
    const r = await request(app).post('/api/ai/request').send({ text: '이 화면에서 직접 확인해줘', surface: 'hospital-drug' });
    expect(r.status).toBe(200);
    expect(r.body.data.kind).toBe('work');
    expect(r.body.data.route).toBe('hospital-drug');
    expect(runWorkAgentMock).toHaveBeenCalledTimes(1);
    expect(runSurfaceMock).not.toHaveBeenCalled();
  });

  it('surface=hospital-drug · Neture 미승인 + localSource=client → main 과 같이 suppressLocal=true', async () => {
    netureStatusMock.mockResolvedValue('none');
    await request(app).post('/api/ai/request').send({ text: '우루사정과 같은 성분의 원내약 있어?', surface: 'hospital-drug', localSource: 'client' });
    expect(runSurfaceMock.mock.calls[0][3]).toBe(true);
  });

  it('surface=hospital-drug 는 가입 조회 장애(503)의 영향을 받지 않는다 (main 과 같다)', async () => {
    netureStatusMock.mockRejectedValue(new Error('db down'));
    const r = await request(app).post('/api/ai/request').send({ text: '우루사정 200mg과 같은 성분의 원내약 있어?', surface: 'hospital-drug' });
    expect(r.status).toBe(200);
    expect(runSurfaceMock).toHaveBeenCalledTimes(1);
  });

  it('surface=hospital-drug 미승인 + runId(실행 재개) → 403 (병원약국 화면은 재개를 보내지 않는다 — Neture 경로)', async () => {
    netureStatusMock.mockResolvedValue('none');
    const r = await request(app).post('/api/ai/request').send({ text: '계속', surface: 'hospital-drug', runId: 'g_1' });
    expect(r.status).toBe(403);
    expect(r.body.code).toBe('NETURE_MEMBERSHIP_REQUIRED');
    expect(runWorkAgentMock).not.toHaveBeenCalled();
    expect(runSurfaceMock).not.toHaveBeenCalled();
  });

  it('홈 대화 · 작업 에이전트는 surface=hospital-drug 를 보내도 403', async () => {
    netureStatusMock.mockResolvedValue('none');
    for (const [path, body] of ENDPOINTS.slice(1)) {
      const r = await request(app).post(path).send({ ...body, surface: 'hospital-drug' });
      expect(r.status).toBe(403);
      expect(r.body.code).toBe('NETURE_MEMBERSHIP_REQUIRED');
    }
    expect(executeMock).not.toHaveBeenCalled();
    expect(runWorkAgentMock).not.toHaveBeenCalled();
  });

  it('platform:super_admin 은 서버 확인 역할로 통과한다 (가입 조회 없이)', async () => {
    testUserRoles = ['platform:super_admin'];
    netureStatusMock.mockResolvedValue('none');
    const r = await request(app).post('/api/ai/request').send({ text: '안녕하세요 오늘 일정 알려줘' });
    expect(r.status).toBe(200);
    expect(netureStatusMock).not.toHaveBeenCalled();
  });

  it('가입 상태 조회 실패는 통과가 아니다 (fail-closed 503)', async () => {
    netureStatusMock.mockRejectedValue(new Error('db down'));
    const r = await request(app).post('/api/ai/request').send({ text: 'x' });
    expect(r.status).toBe(503);
    expect(executeMock).not.toHaveBeenCalled();
  });

  it('guard 는 serviceKey 를 고정 neture 로만 조회한다 (요청 body 무관)', async () => {
    await request(app).post('/api/ai/request').send({ text: 'x', serviceKey: 'kpa-society', surface: 'home' });
    expect(netureStatusMock).toHaveBeenCalledWith(expect.anything(), '00000000-0000-4000-8000-000000000001');
  });
});
