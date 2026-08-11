/**
 * WO-O4O-REQUIREADMIN-MIDDLEWARE-CONTRACT-HARDENING-V1 §7
 *
 * requireAdmin / requireRole 를 **단독으로 사용해도** 인증 확인 → 역할 확인까지 완결하는지 고정한다.
 *
 * 기존 결함: req.user 가 없으면 `return requireAuth(req, res, next)` 로 위임했고,
 * requireAuth 가 인증 성공 시 직접 next() 를 호출해 **역할 검사가 통째로 생략**됐다.
 * (= 로그인만 하면 통과). 아래 테스트는 그 경로가 다시 열리면 실패한다.
 */
import express from 'express';
import request from 'supertest';

const ROLES: Record<string, string[]> = {
  superadmin: ['platform:super_admin'],
  'cosmetics-admin': ['cosmetics:admin'],
  'kpa-operator': ['kpa-society:operator'],
  seller: ['seller'],
  plain: [],
};

/** requireAuth 스텁 — 실제 JWT 검증 대신 x-token 헤더로 인증 상태만 재현한다. */
jest.mock('../../common/middleware/auth/authentication.middleware.js', () => {
  const requireAuth = jest.fn(
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const token = req.headers['x-token'] as string | undefined;
      if (!token) {
        return res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      }
      if (token === 'expired') {
        return res.status(401).json({ success: false, error: 'Token expired', code: 'TOKEN_EXPIRED' });
      }
      (req as unknown as { user: unknown }).user = { id: token, email: `${token}@test.local` };
      return next();
    },
  );
  return { requireAuth, authenticate: requireAuth, authenticateToken: requireAuth, authenticateCookie: requireAuth };
});

jest.mock('../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: {
    hasAnyRole: jest.fn(async (userId: string, roles: string[]) =>
      (ROLES[userId] ?? []).some((r) => roles.includes(r)),
    ),
    getActiveRoles: jest.fn(async (userId: string) => (ROLES[userId] ?? []).map((role) => ({ role }))),
  },
}));

const nextCalls: Record<string, number> = {};

async function buildApp() {
  const { requireAdmin, requireRole } = await import('../../common/middleware/auth/authorization.middleware.js');
  const { authenticate } = await import('../../common/middleware/auth/authentication.middleware.js');

  const count = (key: string) => (_req: express.Request, _res: express.Response, next: express.NextFunction) => {
    nextCalls[key] = (nextCalls[key] ?? 0) + 1;
    next();
  };

  const app = express();
  // B: requireAdmin 단독
  app.get('/solo-admin', requireAdmin, count('solo-admin'), (_req, res) => res.json({ ok: true }));
  // A: authenticate 선행 + requireAdmin (현재 대다수 소비처)
  app.get('/chained-admin', authenticate, requireAdmin, count('chained-admin'), (_req, res) => res.json({ ok: true }));
  // B: requireRole 단독 (content-assets /:id/copy 형태)
  app.get('/solo-role', requireRole(['seller', 'supplier']), count('solo-role'), (_req, res) => res.json({ ok: true }));
  return app;
}

describe('WO-O4O-REQUIREADMIN-MIDDLEWARE-CONTRACT-HARDENING-V1', () => {
  let app: express.Express;
  beforeAll(async () => {
    app = await buildApp();
  });
  beforeEach(() => {
    for (const k of Object.keys(nextCalls)) delete nextCalls[k];
  });

  describe('requireAdmin 단독 — 인증 → 역할까지 완결', () => {
    it('비인증은 401 AUTH_REQUIRED', async () => {
      const res = await request(app).get('/solo-admin');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_REQUIRED');
      expect(nextCalls['solo-admin']).toBeUndefined();
    });

    it('만료/잘못된 token 은 기존 인증 오류를 그대로 유지한다', async () => {
      const res = await request(app).get('/solo-admin').set('x-token', 'expired');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('TOKEN_EXPIRED');
      expect(nextCalls['solo-admin']).toBeUndefined();
    });

    // 핵심 회귀: 예전 구현은 인증만 성공하면 여기서 200 이 나왔다.
    it('일반 인증 사용자는 403 (인증 성공이 통과가 아니다)', async () => {
      const res = await request(app).get('/solo-admin').set('x-token', 'plain');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
      expect(nextCalls['solo-admin']).toBeUndefined();
    });

    it.each(['cosmetics-admin', 'kpa-operator', 'seller'])('%s 도 403 (기존 역할 계약 유지)', async (user) => {
      const res = await request(app).get('/solo-admin').set('x-token', user);
      expect(res.status).toBe(403);
      expect(nextCalls['solo-admin']).toBeUndefined();
    });

    it('platform:super_admin 은 PASS 하고 next() 는 1회', async () => {
      const res = await request(app).get('/solo-admin').set('x-token', 'superadmin');
      expect(res.status).toBe(200);
      expect(nextCalls['solo-admin']).toBe(1);
    });
  });

  describe('authenticate 선행 + requireAdmin — 기존 조합 회귀', () => {
    it('super_admin 은 PASS 하고 next() 중복이 없다', async () => {
      const res = await request(app).get('/chained-admin').set('x-token', 'superadmin');
      expect(res.status).toBe(200);
      expect(nextCalls['chained-admin']).toBe(1);
    });

    it('선행 인증이 끝났으면 requireAuth 를 다시 호출하지 않는다 (JWT 재검증·user 덮어쓰기 없음)', async () => {
      const { requireAuth } = (await import(
        '../../common/middleware/auth/authentication.middleware.js'
      )) as unknown as { requireAuth: jest.Mock };
      requireAuth.mockClear();
      await request(app).get('/chained-admin').set('x-token', 'superadmin');
      expect(requireAuth).toHaveBeenCalledTimes(1); // 선행 authenticate 1회뿐
    });

    it('일반 사용자는 403 이고 응답은 1회만 나간다', async () => {
      const res = await request(app).get('/chained-admin').set('x-token', 'plain');
      expect(res.status).toBe(403);
      expect(nextCalls['chained-admin']).toBeUndefined();
    });

    it('비인증은 401', async () => {
      const res = await request(app).get('/chained-admin');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe('AUTH_REQUIRED');
    });
  });

  describe('requireRole 단독 — 동일 계약', () => {
    it('비인증은 401', async () => {
      const res = await request(app).get('/solo-role');
      expect(res.status).toBe(401);
      expect(nextCalls['solo-role']).toBeUndefined();
    });

    it('역할 없는 인증 사용자는 403', async () => {
      const res = await request(app).get('/solo-role').set('x-token', 'plain');
      expect(res.status).toBe(403);
      expect(nextCalls['solo-role']).toBeUndefined();
    });

    it('super_admin 이라도 해당 역할이 없으면 403 (역할 집합 확장 금지)', async () => {
      const res = await request(app).get('/solo-role').set('x-token', 'superadmin');
      expect(res.status).toBe(403);
    });

    it('보유 역할이면 PASS, next() 1회', async () => {
      const res = await request(app).get('/solo-role').set('x-token', 'seller');
      expect(res.status).toBe(200);
      expect(nextCalls['solo-role']).toBe(1);
    });
  });
});
