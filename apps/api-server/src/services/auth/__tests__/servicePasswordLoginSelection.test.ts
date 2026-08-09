/**
 * WO-O4O-SERVICE-PASSWORD-CHANGE-UI-SCOPE-AND-INTEGRATION-V2
 *
 * 운영자가 바꾼 **서비스 credential 이 실제 로그인에서 어떻게 쓰이는지** 를 고정한다.
 *
 * ── 이 테스트가 증명하는 것 ────────────────────────────────────────────────
 *   - `hashPassword` 로 만든 credential 해시가 새 비밀번호를 받아들이고 옛 비밀번호를 거부한다
 *     (실제 bcrypt — mock 아님)
 *   - `auth-login.service.ts` 의 선택 규칙 `targetHash = credentialHash ?? user.password` 하에서
 *     한 서비스 credential 변경이 다른 서비스·`users.password` 로그인에 영향을 주지 않는다
 *
 * ── 이 테스트가 증명하지 않는 것 ──────────────────────────────────────────
 *   실제 DB 왕복과 HTTP 로그인 요청은 포함하지 않는다. 저장소의 jest 설정이
 *   `database/connection` 을 전역 mock 하고 있어(`src/__tests__/setup/jest.setup.ts`)
 *   DB 백엔드 통합 테스트 인프라가 존재하지 않으며, 운영 DB write 는 금지다.
 *   "어느 row 가 쓰이는가" 는 MembershipConsoleController.servicePassword.test.ts 가,
 *   "그 해시가 로그인에서 어떻게 판정되는가" 는 본 테스트가 담당한다.
 */

import { hashPassword, comparePassword } from '../../../utils/auth.utils.js';

/**
 * `auth-login.service.ts` 의 credential 선택 규칙 재현.
 *   serviceKey 있음 + credential 있음 → credential.password_hash
 *   serviceKey 있음 + credential 없음 → users.password (fallback)
 *   serviceKey 없음                   → users.password
 */
function resolveTargetHash(params: {
  serviceKey?: string;
  credentials: Record<string, string>;
  usersPassword: string | null;
}): string | null {
  const { serviceKey, credentials, usersPassword } = params;
  const credentialHash = serviceKey ? (credentials[serviceKey] ?? null) : null;
  return credentialHash ?? usersPassword;
}

const login = async (
  password: string,
  state: { serviceKey?: string; credentials: Record<string, string>; usersPassword: string | null },
) => {
  const targetHash = resolveTargetHash(state);
  if (!targetHash) return false;
  return comparePassword(password, targetHash);
};

const PLATFORM_PW = 'PlatformPw12345!';
const GLYCO_OLD = 'GlycoOld12345!';
const KPA_PW = 'KpaPw12345!';
const GLYCO_NEW = 'GlycoNew98765!';

describe('서비스 credential 변경이 로그인에 미치는 영향', () => {
  // bcrypt 실해싱이라 넉넉히 잡는다.
  jest.setTimeout(60_000);

  let state: { credentials: Record<string, string>; usersPassword: string | null };

  beforeAll(async () => {
    state = {
      usersPassword: await hashPassword(PLATFORM_PW),
      credentials: {
        glycopharm: await hashPassword(GLYCO_OLD),
        'kpa-society': await hashPassword(KPA_PW),
      },
    };
  });

  it('변경 전 — 각 서비스는 자기 credential 로 로그인한다', async () => {
    await expect(login(GLYCO_OLD, { ...state, serviceKey: 'glycopharm' })).resolves.toBe(true);
    await expect(login(KPA_PW, { ...state, serviceKey: 'kpa-society' })).resolves.toBe(true);
  });

  it('변경 전 — credential 이 있으면 users.password 로는 그 서비스에 로그인할 수 없다', async () => {
    await expect(login(PLATFORM_PW, { ...state, serviceKey: 'glycopharm' })).resolves.toBe(false);
  });

  describe('운영자가 glycopharm credential 만 새 비밀번호로 교체한 뒤', () => {
    let after: typeof state;

    beforeAll(async () => {
      // 컨트롤러가 수행하는 것과 동일한 연산: 대상 serviceKey 의 credential 만 새 해시로 upsert
      after = {
        usersPassword: state.usersPassword,
        credentials: {
          ...state.credentials,
          glycopharm: await hashPassword(GLYCO_NEW),
        },
      };
    });

    it('새 비밀번호로 glycopharm 로그인에 성공한다', async () => {
      await expect(login(GLYCO_NEW, { ...after, serviceKey: 'glycopharm' })).resolves.toBe(true);
    });

    it('옛 비밀번호로는 glycopharm 로그인에 실패한다', async () => {
      await expect(login(GLYCO_OLD, { ...after, serviceKey: 'glycopharm' })).resolves.toBe(false);
    });

    it('같은 사용자의 kpa-society 는 기존 비밀번호로 계속 로그인된다', async () => {
      await expect(login(KPA_PW, { ...after, serviceKey: 'kpa-society' })).resolves.toBe(true);
      await expect(login(GLYCO_NEW, { ...after, serviceKey: 'kpa-society' })).resolves.toBe(false);
    });

    it('users.password 는 그대로라 serviceKey 없는 로그인이 계속 동작한다', async () => {
      expect(after.usersPassword).toBe(state.usersPassword);
      await expect(login(PLATFORM_PW, { ...after })).resolves.toBe(true);
    });

    it('kpa-society credential 해시는 변경되지 않았다', () => {
      expect(after.credentials['kpa-society']).toBe(state.credentials['kpa-society']);
    });
  });

  describe('credential 이 없는 서비스', () => {
    it('users.password 로 fallback 한다', async () => {
      await expect(login(PLATFORM_PW, { ...state, serviceKey: 'neture' })).resolves.toBe(true);
    });

    it('운영자가 그 서비스 credential 을 만들면 이후로는 fallback 하지 않는다', async () => {
      const withNew = {
        usersPassword: state.usersPassword,
        credentials: { ...state.credentials, neture: await hashPassword(GLYCO_NEW) },
      };
      await expect(login(GLYCO_NEW, { ...withNew, serviceKey: 'neture' })).resolves.toBe(true);
      await expect(login(PLATFORM_PW, { ...withNew, serviceKey: 'neture' })).resolves.toBe(false);
    });
  });
});
