/**
 * WO-O4O-NETURE-AUTH-ERROR-CONTRACT-AND-LEGACY-TOKEN-RECOVERY-FIX-V1
 *
 * 인증 오류(401) 와 서비스 권한 오류(403) 분리 계약.
 *   - 미인증               → 401 UNAUTHORIZED (변경 없음)
 *   - 로그인 + 서비스 미가입 → 403 NO_SUPPLIER (구 401 — 대표 로그아웃 연쇄의 원인)
 *   - 가입 + 비활성 상태     → 403 *_NOT_ACTIVE + currentStatus (변경 없음)
 * 오류 코드·응답 구조는 그대로다.
 * WO-O4O-LEGACY-PARTNER-RUNTIME-RETIREMENT-AND-SELLER-RECRUITMENT-EXTRACTION-V1: partner gate 케이스 제거(은퇴).
 */
import type { DataSource } from 'typeorm';
import {
  createRequireActiveSupplier,
  createRequireLinkedSupplier,
} from '../neture-identity.middleware.js';

function mockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function dataSourceWith(rows: any[]): DataSource {
  return { query: jest.fn().mockResolvedValue(rows) } as unknown as DataSource;
}

const USER_REQ = { user: { id: 'u1', role: 'user' } } as any;
const ANON_REQ = {} as any;

describe.each([
  ['requireActiveSupplier', createRequireActiveSupplier, 'NO_SUPPLIER', 'SUPPLIER_NOT_ACTIVE', 'PENDING'],
  ['requireLinkedSupplier', createRequireLinkedSupplier, 'NO_SUPPLIER', null, null],
] as const)('%s', (_name, factory, missingCode, notActiveCode, inactiveStatus) => {
  it('미인증 → 401 UNAUTHORIZED (일괄 403 전환 아님)', async () => {
    const next = jest.fn();
    const res = mockRes();
    await factory(dataSourceWith([]))(ANON_REQ, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json.mock.calls[0][0].error.code).toBe('UNAUTHORIZED');
    expect(next).not.toHaveBeenCalled();
  });

  it(`로그인 + 서비스 행 없음 → 403 ${missingCode} (코드·구조 유지)`, async () => {
    const next = jest.fn();
    const res = mockRes();
    await factory(dataSourceWith([]))({ ...USER_REQ }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: { code: missingCode, message: expect.any(String) },
    });
    expect(next).not.toHaveBeenCalled();
  });

  if (notActiveCode) {
    it(`가입 + 비활성 상태 → 403 ${notActiveCode} + currentStatus`, async () => {
      const next = jest.fn();
      const res = mockRes();
      await factory(dataSourceWith([{ id: 's1', status: inactiveStatus }]))({ ...USER_REQ }, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json.mock.calls[0][0].error.code).toBe(notActiveCode);
      expect(res.json.mock.calls[0][0].currentStatus).toBe(inactiveStatus);
      expect(next).not.toHaveBeenCalled();
    });
  }

  it('가입 + 활성 → 통과', async () => {
    const next = jest.fn();
    const res = mockRes();
    const req = { ...USER_REQ };
    await factory(dataSourceWith([{ id: 'row1', status: 'ACTIVE' }]))(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(req.supplierId).toBe('row1');
  });
});
