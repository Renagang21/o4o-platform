/**
 * WO-O4O-AI-COMPOSER-UNIFIED-REQUEST-AND-ATTACHMENT-UX-V1 §4·§10·§14 — `POST /api/ai/request` HTTP 계약 (supertest)
 *
 * DB · provider · Local Agent 는 전부 주입한다. 고정하려는 것:
 *   ①  text-only 일반 질문      → kind=chat, home-chat 본체(execute) 1회, Work Agent 미호출
 *   ②  text-only 웹 작업 요청   → kind=work, Work Agent 본체 1회, execute 미호출 · 응답에 runId/resumable 통과
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
 */

import express from 'express';
import request from 'supertest';

const executeMock = jest.fn();
const runWorkAgentMock = jest.fn();
const resolveTargetDeviceMock = jest.fn();
const fetchMock = jest.fn();
const logInfo = jest.fn();
const logError = jest.fn();
const logWarn = jest.fn();

jest.mock('../middleware/auth.middleware.js', () => ({
  authenticate: (req: any, res: any, next: () => void) => {
    if (req.headers['x-test-anon']) return res.status(401).json({ success: false });
    req.user = { id: '00000000-0000-4000-8000-000000000001', roles: ['user'] };
    next();
  },
}));
jest.mock('../middleware/rateLimiter.js', () => ({ dynamicLimiter: () => (_req: any, _res: any, next: () => void) => next() }));
jest.mock('../utils/logger.js', () => ({
  __esModule: true,
  default: { info: (...a: unknown[]) => logInfo(...a), warn: (...a: unknown[]) => logWarn(...a), error: (...a: unknown[]) => logError(...a), debug: jest.fn() },
}));
jest.mock('../database/connection.js', () => ({ AppDataSource: { isInitialized: true } }));
jest.mock('../services/local-agent/local-agent-service.js', () => ({ resolveTargetDevice: (...a: unknown[]) => resolveTargetDeviceMock(...a) }));
jest.mock('../utils/work-scope-store-resolution.js', () => ({ resolveWorkScopeStore: jest.fn(), STORE_SCOPED_WORKSPACES: ['store'] }));
jest.mock('../utils/ai-provider-runtime.js', () => {
  const actual = jest.requireActual('../utils/ai-provider-runtime.js');
  return { ...actual, resolveAiTarget: jest.fn(async () => ({ provider: 'gemini', model: 'gemini-test', apiKey: 'k' })) };
});
jest.mock('@o4o/ai-core', () => ({ __esModule: true, execute: (...a: unknown[]) => executeMock(...a) }));
jest.mock('../services/ai-tools/work-agent-runtime.js', () => ({
  runWorkAgent: (...a: unknown[]) => runWorkAgentMock(...a),
  createLlmPlanner: () => ({ kind: 'llm', plan: jest.fn() }),
  createStrongLlmPlanner: () => ({ kind: 'llm', plan: jest.fn() }),
}));
// ai-proxy.service 는 DB entity 를 끌고 온다 — 이 spec 이 쓰는 두 경로는 그것을 쓰지 않는다.
jest.mock('../services/ai-proxy.service.js', () => ({ aiProxyService: {} }));
jest.mock('../services/ai-model-registry.service.js', () => ({ isGeminiModelAllowedSync: () => true }));

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
  executeMock.mockResolvedValue({ content: '텍스트 답변', model: 'gemini-test' });
  runWorkAgentMock.mockResolvedValue(workResult());
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

  it('② text-only 웹 작업 → work (execute 미호출 · runId/resumable 통과)', async () => {
    runWorkAgentMock.mockResolvedValueOnce(workResult({ goal: { goalId: 'g_2', runId: 'g_2', status: 'waiting_for_user' }, progress: 'needs_user', resumable: true, takeover: { reason: 'user_judgment_required', step: 2 } }));
    const r = await request(app).post('/api/ai/request').send({ text: '약학정보원에서 우루사정 동일성분 찾아줘' });
    expect(r.status).toBe(200);
    expect(r.body.data.kind).toBe('work');
    expect(r.body.data.reason).toBe('task_intent');
    expect(r.body.data.work.runId).toBe('g_2');
    expect(r.body.data.work.resumable).toBe(true);
    expect(r.body.data.work.aiPlanCount).toBe(1);
    expect(executeMock).not.toHaveBeenCalled();
    const input = runWorkAgentMock.mock.calls[0][2];
    expect(input.request).toBe('약학정보원에서 우루사정 동일성분 찾아줘');
    expect(input.image).toBeUndefined();
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
