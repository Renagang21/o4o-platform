/**
 * 로그인 차단 응답의 계정 상태 노출 계약
 *
 * WO-O4O-AUTH-ACCOUNT-STATUS-UX-AND-PH-MOBILE-LOGOUT-CLOSURE-V1 §2A
 *
 * 검증 대상:
 *   차단(403) 응답은 `code: 'ACCOUNT_NOT_ACTIVE'` 를 그대로 유지하면서
 *   **화이트리스트된 상태 라벨만** `accountStatus` 로 함께 내려준다.
 *   - rejected / suspended / inactive → 노출 (프런트가 안내 문구를 구분)
 *   - deleted · 미상 · 값 없음      → 미노출 (내부 상태 추가 노출 금지)
 *   - ACCOUNT_LOCKED                 → 미노출 (상태 축이 아니다)
 *
 * 상태 게이트는 **비밀번호 검증 이후**에 동작하므로 계정 열거 벡터가 아니다.
 * DB 미사용 — authenticationService 를 스텁하고 컨트롤러만 태운다.
 */

import express from 'express';
import request from 'supertest';

jest.mock('../../services/authentication.service.js', () => ({
  authenticationService: {
    login: jest.fn(),
  },
}));

import { authenticationService } from '../../services/authentication.service.js';
import { AuthLoginController } from '../../modules/auth/controllers/auth-login.controller.js';
import { AccountInactiveError, AccountLockedError } from '../../errors/AuthErrors.js';

const loginMock = authenticationService.login as unknown as jest.Mock;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.post('/api/v1/auth/login', (req, res) => AuthLoginController.login(req, res));
  return app;
}

async function post() {
  return request(makeApp())
    .post('/api/v1/auth/login')
    .send({ email: 'probe@example.com', password: 'irrelevant', serviceKey: 'neture' });
}

describe('POST /auth/login — 차단 응답 accountStatus 노출 계약', () => {
  beforeEach(() => loginMock.mockReset());

  it.each(['rejected', 'suspended', 'inactive'])(
    '%s 는 accountStatus 로 노출한다 (code 는 ACCOUNT_NOT_ACTIVE 유지)',
    async (status) => {
      loginMock.mockRejectedValue(new AccountInactiveError(status));
      const res = await post();
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ACCOUNT_NOT_ACTIVE');
      expect(res.body.accountStatus).toBe(status);
    }
  );

  it.each(['deleted', 'pending', 'approved', 'weird-unknown'])(
    '화이트리스트 밖 상태(%s)는 노출하지 않는다',
    async (status) => {
      loginMock.mockRejectedValue(new AccountInactiveError(status));
      const res = await post();
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('ACCOUNT_NOT_ACTIVE');
      expect(res.body.accountStatus).toBeUndefined();
    }
  );

  it('status 가 없으면 accountStatus 를 붙이지 않는다', async () => {
    loginMock.mockRejectedValue(new AccountInactiveError());
    const res = await post();
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_NOT_ACTIVE');
    expect(res.body.accountStatus).toBeUndefined();
  });

  it('ACCOUNT_LOCKED 는 상태 축이 아니므로 accountStatus 가 없다', async () => {
    loginMock.mockRejectedValue(new AccountLockedError());
    const res = await post();
    expect(res.status).toBe(403);
    expect(res.body.code).toBe('ACCOUNT_LOCKED');
    expect(res.body.accountStatus).toBeUndefined();
  });
});
