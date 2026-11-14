/**
 * createRequireSupplier (copilot 조회 경로) — 공급자 문맥 조회 실패 시 503.
 * Express 4 는 async middleware reject 를 잡지 않는다. guard 가 직접 응답해야 요청이 멈추지 않고
 * 운영 unhandledRejection 종료로 이어지지 않는다.
 */
import type { DataSource } from 'typeorm';
import { createRequireSupplier } from '../supplier.utils.js';

function mockRes() {
  const res: any = { headersSent: false };
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('createRequireSupplier', () => {
  it('DB 오류 → 503 SUPPLIER_CONTEXT_UNAVAILABLE · reject 없음 · next 미호출', async () => {
    const failing = { query: jest.fn(async () => { throw new Error('connection terminated'); }) } as unknown as DataSource;
    const res = mockRes();
    const next = jest.fn();
    await expect(
      createRequireSupplier(failing)({ user: { id: 'u1' }, headers: {}, query: {} } as any, res, next),
    ).resolves.toBeUndefined();
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json.mock.calls[0][0]).toMatchObject({ success: false, code: 'SUPPLIER_CONTEXT_UNAVAILABLE' });
    expect(next).not.toHaveBeenCalled();
  });

  it('미인증은 기존대로 401', async () => {
    const res = mockRes();
    const next = jest.fn();
    await createRequireSupplier({ query: jest.fn() } as unknown as DataSource)({ headers: {}, query: {} } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
