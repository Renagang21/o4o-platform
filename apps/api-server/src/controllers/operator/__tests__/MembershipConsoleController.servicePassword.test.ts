/**
 * WO-O4O-OPERATOR-SERVICE-CREDENTIAL-PASSWORD-CHANGE-AND-DOC-ALIGNMENT-V1
 *
 * 운영자의 회원 비밀번호 변경이 **Identity V2 서비스별 credential** 로 연결됐는지 고정한다.
 *
 * 회귀 대상:
 *   이전 구현은 `UPDATE users SET password` 로 V1 공통 비밀번호를 갱신했다.
 *   로그인은 credential 이 있으면 users.password 를 보지 않으므로
 *   (auth-login.service.ts: `credentialHash ?? user.password`),
 *   credential 보유 회원에게는 성공 응답만 돌아가고 실제 비밀번호는 안 바뀌는 사일런트 무효였다.
 *
 * 판정 계약:
 *   1) `UPDATE users SET password` SQL 이 **한 번도** 나가지 않는다
 *   2) 정확히 하나의 serviceKey 에 대해서만 service_credentials 가 갱신된다
 *   3) 운영 계층 순위(member < operator < admin < platform)에서 상위만 하위를 바꾼다
 */

const mockQuery = jest.fn();

jest.mock('../../../database/connection.js', () => ({
  AppDataSource: {
    isInitialized: false,
    query: (...args: any[]) => mockQuery(...args),
    getRepository: jest.fn(),
  },
}));

jest.mock('../../../services/approval/MembershipApprovalService.js', () => ({
  MembershipApprovalService: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../../utils/logger.js', () => ({
  __esModule: true,
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

jest.mock('../../../modules/auth/services/role-assignment.service.js', () => ({
  roleAssignmentService: { removeRole: jest.fn(), assignRole: jest.fn() },
}));

jest.mock('../../../modules/auth/services/role.service.js', () => ({ roleService: {} }));

// bcrypt 실해싱 비용 제거 — 해시 값 자체는 검증 대상이 아니다.
jest.mock('../../../utils/auth.utils.js', () => ({
  hashPassword: jest.fn(async (pw: string) => `hashed:${pw}`),
  comparePassword: jest.fn(async () => true),
}));

import { MembershipConsoleController } from '../MembershipConsoleController.js';
import { hashPassword } from '../../../utils/auth.utils.js';

const TARGET = '11111111-2222-4333-8444-555555555555';
const CALLER = '99999999-8888-4777-8666-555555555555';

interface Prime {
  /** 대상이 membership 을 가진 serviceKey 목록 */
  memberOf?: string[];
  /** 대상의 활성 role */
  targetRoles?: string[];
}

function primeQuery({ memberOf = ['glycopharm'], targetRoles = [] }: Prime = {}) {
  mockQuery.mockImplementation((sql: string, params: any[] = []) => {
    const s = String(sql).replace(/\s+/g, ' ').trim();
    // checkServiceBoundary
    if (/^SELECT 1 FROM service_memberships WHERE user_id = \$1 AND service_key = ANY/i.test(s)) {
      const keys: string[] = params[1] ?? [];
      return Promise.resolve(memberOf.some((k) => keys.includes(k)) ? [{ ok: 1 }] : []);
    }
    // 후보 산출 — 대상자의 전체 membership serviceKey
    if (/^SELECT service_key FROM service_memberships WHERE user_id = \$1/i.test(s)) {
      return Promise.resolve(memberOf.map((service_key) => ({ service_key })));
    }
    if (/^SELECT role FROM role_assignments/i.test(s)) {
      return Promise.resolve(targetRoles.map((role) => ({ role })));
    }
    return Promise.resolve([]);
  });
}

function makeReq(body: Record<string, any>, scope: Partial<{ isPlatformAdmin: boolean; serviceKeys: string[] }> = {}, callerRoles: string[] = ['glycopharm:operator']) {
  return {
    params: { userId: TARGET },
    body,
    user: { id: CALLER, roles: callerRoles },
    serviceScope: {
      isPlatformAdmin: scope.isPlatformAdmin ?? false,
      serviceKeys: scope.serviceKeys ?? ['glycopharm'],
      rolePrefixes: [],
    },
  } as any;
}

function makeRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const usersPasswordWrites = () =>
  mockQuery.mock.calls
    .map(([sql]) => String(sql).replace(/\s+/g, ' ').trim())
    .filter((s) => /^UPDATE users SET password/i.test(s));

const credentialWrites = () =>
  mockQuery.mock.calls
    .map(([sql, params]) => ({ sql: String(sql).replace(/\s+/g, ' ').trim(), params }))
    .filter((c) => /INSERT INTO service_credentials/i.test(c.sql));

describe('updateMember 비밀번호 변경 — Identity V2 서비스 credential', () => {
  let controller: MembershipConsoleController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new MembershipConsoleController();
  });

  describe('users.password 잔여 write 제거', () => {
    it('운영자 변경이 users.password 를 건드리지 않는다', async () => {
      primeQuery();
      const res = makeRes();

      await controller.updateMember(makeReq({ password: 'NewPw12345!' }), res);

      expect(usersPasswordWrites()).toEqual([]);
    });

    it('해당 서비스 credential 만 upsert 한다', async () => {
      primeQuery();
      const res = makeRes();

      await controller.updateMember(makeReq({ password: 'NewPw12345!' }), res);

      const writes = credentialWrites();
      expect(writes).toHaveLength(1);
      expect(writes[0].params).toEqual([TARGET, 'glycopharm', 'hashed:NewPw12345!']);
      // credential row 가 없어도 생성되도록 upsert
      expect(writes[0].sql).toContain('ON CONFLICT ON CONSTRAINT "uq_service_credentials_user_service"');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('대상 서비스 결정', () => {
    it('운영 서비스가 하나면 그 서비스로 확정한다', async () => {
      primeQuery();
      await controller.updateMember(makeReq({ password: 'NewPw12345!' }), makeRes());
      expect(credentialWrites()[0].params[1]).toBe('glycopharm');
    });

    it('복수 서비스 운영자여도 후보가 1개면(대상이 한 서비스에만 속함) 자동 확정한다', async () => {
      // 운영자는 glycopharm·kpa-society 둘 다 관리하지만 대상은 glycopharm 회원만이다.
      primeQuery({ memberOf: ['glycopharm'] });
      const res = makeRes();

      await controller.updateMember(
        makeReq({ password: 'NewPw12345!' }, { serviceKeys: ['glycopharm', 'kpa-society'] }),
        res,
      );

      expect(credentialWrites()).toHaveLength(1);
      expect(credentialWrites()[0].params[1]).toBe('glycopharm');
    });

    it('후보가 복수면 serviceKey 없이는 400 으로 거절한다 (전역 변경 금지)', async () => {
      primeQuery({ memberOf: ['glycopharm', 'kpa-society'] });
      const res = makeRes();

      await controller.updateMember(
        makeReq({ password: 'NewPw12345!' }, { serviceKeys: ['glycopharm', 'kpa-society'] }),
        res,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'SERVICE_KEY_REQUIRED' }));
      expect(credentialWrites()).toEqual([]);
      expect(usersPasswordWrites()).toEqual([]);
    });

    it('운영자 관리 범위 밖 회원은 진입 자체가 404 다 (checkServiceBoundary 선행 차단)', async () => {
      // 운영자는 glycopharm 만 관리, 대상은 kpa-society 회원만 →
      // updateMember 최상단 boundary check 에서 이미 막힌다. 비밀번호 로직까지 가지 않는다.
      primeQuery({ memberOf: ['kpa-society'] });
      const res = makeRes();

      await controller.updateMember(makeReq({ password: 'NewPw12345!' }), res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(credentialWrites()).toEqual([]);
      expect(usersPasswordWrites()).toEqual([]);
    });

    it('플랫폼 관리자 + 대상이 어느 서비스에도 속하지 않으면 404 NO_MANAGEABLE_SERVICE 다', async () => {
      // platform admin 은 boundary check 를 건너뛰므로 후보 산출 단계에서 걸린다.
      primeQuery({ memberOf: [] });
      const res = makeRes();

      await controller.updateMember(
        makeReq(
          { password: 'NewPw12345!', serviceKey: 'glycopharm' },
          { isPlatformAdmin: true, serviceKeys: [] },
          ['platform:super_admin'],
        ),
        res,
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'NO_MANAGEABLE_SERVICE' }));
      expect(credentialWrites()).toEqual([]);
    });

    it('플랫폼 관리자가 serviceKey 를 안 주면 400 으로 거절한다', async () => {
      primeQuery();
      const res = makeRes();

      await controller.updateMember(
        makeReq({ password: 'NewPw12345!' }, { isPlatformAdmin: true, serviceKeys: [] }, ['platform:super_admin']),
        res,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(credentialWrites()).toEqual([]);
    });

    it('운영자가 자기 스코프 밖 serviceKey 를 지정하면 403 이다', async () => {
      primeQuery({ memberOf: ['glycopharm', 'kpa-society'] });
      const res = makeRes();

      await controller.updateMember(makeReq({ password: 'NewPw12345!', serviceKey: 'kpa-society' }), res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'SERVICE_SCOPE_FORBIDDEN' }));
      expect(credentialWrites()).toEqual([]);
    });

    it('대상이 그 서비스 회원이 아니면 404 이다', async () => {
      primeQuery({ memberOf: ['glycopharm'] });
      const res = makeRes();

      await controller.updateMember(
        makeReq({ password: 'NewPw12345!', serviceKey: 'neture' }, { isPlatformAdmin: true, serviceKeys: [] }, ['platform:super_admin']),
        res,
      );

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'SERVICE_NOT_MEMBER' }));
      expect(credentialWrites()).toEqual([]);
    });
  });

  describe('운영 계층 권한', () => {
    it('operator → 일반 회원: 허용', async () => {
      primeQuery({ targetRoles: ['glycopharm:pharmacy'] });
      const res = makeRes();

      await controller.updateMember(makeReq({ password: 'NewPw12345!' }), res);

      expect(credentialWrites()).toHaveLength(1);
    });

    it('operator → 다른 operator: 차단', async () => {
      primeQuery({ targetRoles: ['glycopharm:operator'] });
      const res = makeRes();

      await controller.updateMember(makeReq({ password: 'NewPw12345!' }), res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INSUFFICIENT_OPERATOR_TIER' }));
      expect(credentialWrites()).toEqual([]);
    });

    it('operator → admin: 차단', async () => {
      primeQuery({ targetRoles: ['glycopharm:admin'] });
      const res = makeRes();

      await controller.updateMember(makeReq({ password: 'NewPw12345!' }), res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(credentialWrites()).toEqual([]);
    });

    it('admin → 자기 서비스 operator: 허용', async () => {
      primeQuery({ targetRoles: ['glycopharm:operator'] });
      const res = makeRes();

      await controller.updateMember(
        makeReq({ password: 'NewPw12345!' }, {}, ['glycopharm:admin']),
        res,
      );

      expect(credentialWrites()).toHaveLength(1);
      expect(credentialWrites()[0].params[1]).toBe('glycopharm');
    });

    it('플랫폼 관리자 → 서비스 admin: 허용', async () => {
      primeQuery({ targetRoles: ['glycopharm:admin'] });
      const res = makeRes();

      await controller.updateMember(
        makeReq(
          { password: 'NewPw12345!', serviceKey: 'glycopharm' },
          { isPlatformAdmin: true, serviceKeys: [] },
          ['platform:super_admin'],
        ),
        res,
      );

      expect(credentialWrites()).toHaveLength(1);
    });

    it('플랫폼 계정(platform:super_admin) 대상은 누구도 변경하지 못한다', async () => {
      primeQuery({ targetRoles: ['platform:super_admin'] });
      const res = makeRes();

      await controller.updateMember(
        makeReq(
          { password: 'NewPw12345!', serviceKey: 'glycopharm' },
          { isPlatformAdmin: true, serviceKeys: [] },
          ['platform:super_admin'],
        ),
        res,
      );

      expect(res.status).toHaveBeenCalledWith(403);
      expect(credentialWrites()).toEqual([]);
    });
  });

  // WO-O4O-OPERATOR-MEMBER-PASSWORD-MIN-LENGTH-UNIFY-V1
  describe('비밀번호 정책(8자 + 영문 + 숫자) 서버 강제', () => {
    it('8자 미만이면 hash · credential write 이전에 400 WEAK_PASSWORD 로 거절한다', async () => {
      primeQuery();
      const res = makeRes();

      await controller.updateMember(makeReq({ password: 'Pw12345' }), res); // 7자

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'WEAK_PASSWORD' }));
      expect(hashPassword).not.toHaveBeenCalled();
      expect(credentialWrites()).toEqual([]);
      expect(usersPasswordWrites()).toEqual([]);
    });

    it('정확히 8자는 통과한다 (경계값)', async () => {
      primeQuery();
      const res = makeRes();

      await controller.updateMember(makeReq({ password: 'Pw123456' }), res);

      expect(credentialWrites()).toHaveLength(1);
      expect(credentialWrites()[0].params[2]).toBe('hashed:Pw123456');
    });

    it('영문만 / 숫자만은 길이가 충분해도 거절한다 (WO-...-COMPLEXITY-POLICY-UNIFY-V1)', async () => {
      for (const pw of ['abcdefghij', '1234567890']) {
        jest.clearAllMocks();
        primeQuery();
        const res = makeRes();

        await controller.updateMember(makeReq({ password: pw }), res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'WEAK_PASSWORD' }));
        expect(hashPassword).not.toHaveBeenCalled();
        expect(credentialWrites()).toEqual([]);
      }
    });

    it('특수문자 없이 영문+숫자 8자면 통과한다 (특수문자는 필수 아님)', async () => {
      primeQuery();
      const res = makeRes();

      await controller.updateMember(makeReq({ password: 'abcd1234' }), res);

      expect(credentialWrites()).toHaveLength(1);
      expect(credentialWrites()[0].params[2]).toBe('hashed:abcd1234');
    });

    it('serviceKey 를 명시해도 8자 미만이면 서비스 판정 이전에 거절한다', async () => {
      // 후보가 복수여도 SERVICE_KEY_REQUIRED 가 아니라 WEAK_PASSWORD 가 먼저다.
      primeQuery({ memberOf: ['glycopharm', 'kpa-society'] });
      const res = makeRes();

      await controller.updateMember(
        makeReq({ password: 'short' }, { serviceKeys: ['glycopharm', 'kpa-society'] }),
        res,
      );

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'WEAK_PASSWORD' }));
      expect(hashPassword).not.toHaveBeenCalled();
      expect(credentialWrites()).toEqual([]);
    });
  });

  describe('비밀번호 미포함 요청', () => {
    it('password 가 없으면 credential 을 건드리지 않는다', async () => {
      primeQuery();
      const res = makeRes();

      await controller.updateMember(makeReq({ nickname: '새이름' }), res);

      expect(credentialWrites()).toEqual([]);
      expect(usersPasswordWrites()).toEqual([]);
    });
  });
});
