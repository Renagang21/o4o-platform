/**
 * WO-O4O-REQUEST-BODY-LOGGING-PRIVACY-CLOSURE-V1 §9
 *
 * performanceMonitor 의 "API Performance" / "Slow API Response" 로그가
 * request body 원문(AI 메시지 · Computer Use 입력 텍스트 · 비밀번호/토큰류)을
 * 절대 담지 않고, 성능 메타데이터(method/path/status/duration/bodyBytes)는
 * 유지하는지 검증한다.
 */

// logger 는 winston 인스턴스(default export) — 호출 인자만 캡처한다.
const infoMock = jest.fn();
const warnMock = jest.fn();
jest.mock('../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: infoMock, warn: warnMock },
}));

import type { Request, Response, NextFunction } from 'express';
import { performanceMonitor } from '../performanceMonitor.js';

interface MockReqInit {
  method?: string;
  path?: string;
  query?: Record<string, unknown>;
  body?: unknown;
  headers?: Record<string, string>;
  ip?: string;
}

function makeReq(init: MockReqInit): Request {
  const headers = { ...(init.headers ?? {}) };
  const get = (name: string): string | undefined => headers[name.toLowerCase()];
  return {
    method: init.method ?? 'POST',
    path: init.path ?? '/api/ai/chat',
    query: init.query ?? {},
    body: init.body,
    ip: init.ip ?? '10.0.0.1',
    get,
  } as unknown as Request;
}

function makeRes(statusCode = 200): Response & { __end: jest.Mock } {
  const end = jest.fn(function (this: Response) {
    return this;
  });
  const res = {
    statusCode,
    get: (name: string) => (name.toLowerCase() === 'content-length' ? '512' : undefined),
    end,
    __end: end,
  };
  return res as unknown as Response & { __end: jest.Mock };
}

/** 미들웨어를 통과시키고, responseTime 을 강제로 slow(>1000ms)로 만든 뒤 res.end 를 호출한다. */
function runSlow(req: Request, res: Response): void {
  const next: NextFunction = jest.fn();
  performanceMonitor(req as never, res, next);
  // performanceMonitor 가 방금 세팅한 startTime 을 2초 전으로 당겨 slow 경로를 태운다.
  (req as unknown as { startTime: number }).startTime = Date.now() - 2000;
  (res.end as (...a: unknown[]) => unknown)();
}

/** 모든 로그 호출의 payload 를 하나의 문자열로 직렬화 (누출 substring 검사용). */
function allLoggedText(): string {
  const calls = [...infoMock.mock.calls, ...warnMock.mock.calls];
  return JSON.stringify(calls);
}

beforeEach(() => {
  infoMock.mockClear();
  warnMock.mockClear();
});

describe('performanceMonitor request-body privacy (WO §9)', () => {
  it('1. AI 채팅 메시지 원문이 로그에 남지 않는다', () => {
    const secret = 'O4O privacy smoke unique phrase 2026';
    runSlow(makeReq({ path: '/api/ai/chat', body: { message: secret } }), makeRes());
    expect(allLoggedText()).not.toContain(secret);
  });

  it('2. Computer Use 입력 텍스트(type_text) 원문이 로그에 남지 않는다', () => {
    const typed = '테스트-입력문자열-고유표식';
    runSlow(
      makeReq({ path: '/api/ai/chat', body: { tool: 'local.computer.type_text', text: typed } }),
      makeRes(),
    );
    expect(allLoggedText()).not.toContain(typed);
  });

  it('3. 비밀번호류 입력이 로그에 남지 않는다', () => {
    const pw = 'P@ssw0rd-do-not-log-1234';
    runSlow(
      makeReq({ path: '/api/auth/login', body: { email: 'a@b.co', password: pw } }),
      makeRes(),
    );
    expect(allLoggedText()).not.toContain(pw);
  });

  it('4. 토큰류 입력이 로그에 남지 않는다', () => {
    const tok = 'tok_live_should_never_be_logged_ABCDEF';
    runSlow(
      makeReq({ path: '/api/local-agent/pair', body: { accessToken: tok } }),
      makeRes(),
    );
    expect(allLoggedText()).not.toContain(tok);
  });

  it('4-b. query string 의 민감 값도 redact 된다', () => {
    const tok = 'query_token_leak_QWERTY';
    runSlow(makeReq({ path: '/api/ai/chat', query: { token: tok } }), makeRes());
    expect(allLoggedText()).not.toContain(tok);
  });

  it('5. Slow API Response 로그는 정상 생성되고 body 원문 대신 메타데이터만 담는다', () => {
    runSlow(makeReq({ path: '/api/ai/chat', body: { message: 'x' } }), makeRes(201));
    expect(warnMock).toHaveBeenCalledTimes(1);
    const [msg, payload] = warnMock.mock.calls[0];
    expect(msg).toBe('Slow API Response');
    // body 원문 필드 자체가 없어야 한다 (제거 우선 §5).
    expect(payload).not.toHaveProperty('body');
    expect(payload).toMatchObject({ bodyPresent: true, contentType: undefined });
    expect(typeof payload.bodyBytes).toBe('number');
  });

  it('6. API Performance 로그는 매 요청 정상 생성된다 (fast 요청 포함)', () => {
    const req = makeReq({ path: '/health', body: undefined });
    const res = makeRes(200);
    const next: NextFunction = jest.fn();
    performanceMonitor(req as never, res, next);
    (res.end as (...a: unknown[]) => unknown)(); // fast → info 만, warn 없음
    expect(infoMock).toHaveBeenCalledTimes(1);
    expect(infoMock.mock.calls[0][0]).toBe('API Performance');
    expect(warnMock).not.toHaveBeenCalled();
  });

  it('7. route/status/duration 성능 지표는 유지된다', () => {
    runSlow(makeReq({ method: 'POST', path: '/api/ai/chat', body: {} }), makeRes(503));
    const [, payload] = warnMock.mock.calls[0];
    expect(payload).toMatchObject({ method: 'POST', path: '/api/ai/chat', statusCode: 503 });
    expect(String(payload.responseTime)).toMatch(/ms$/);
  });

  it('8. request size 메타데이터(bodyBytes)가 유지된다', () => {
    runSlow(
      makeReq({ path: '/api/ai/chat', body: { message: 'x' }, headers: { 'content-length': '512' } }),
      makeRes(),
    );
    const [, payload] = warnMock.mock.calls[0];
    expect(payload.bodyBytes).toBe(512);
  });
});
