/**
 * Demo 계정 보호 계약 — WO-O4O-CANONICAL-DEMO-ACCOUNT-FOUNDATION-AND-EXPERIENCE-LOGIN-V1
 * 정책 정본: `docs/baseline/O4O-CANONICAL-DEMO-ACCOUNTS-V1.md`
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 여기서 고정하는 것
 *
 *   D1 판정 정본은 `demo_accounts.user_id` 다 — 런타임 코드가 Demo 이메일 문자열을 비교하지 않는다.
 *      (`if (email === 'teststoreowner@example.com')` 이 퍼지면 몇 달 뒤 어디를 고쳐야 하는지 알 수 없다.)
 *   D2 조회는 활성 행만 본다(`is_active`) · 파라미터 바인딩만 쓴다(문자열 보간 0 — Guard Rule 2).
 *   D3 DB 오류를 "Demo 아님"으로 바꾸지 않는다(fail-closed) — 모르는 채로 통과시키면 보호가 사라진다.
 *   D4 계정 삭제 2경로에 보호가 **코드에** 있다 — 화면에서 버튼을 숨기는 것으로는 막히지 않는다.
 *
 * 동작 계약(비밀번호 변경 · forgot · reset · Google 연결)은 각 서비스 spec 이 본다:
 *   `emailAuthService.test.ts` V13 · `googleAuthService.test.ts` 'Demo 계정 보호'.
 */
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import {
  demoAccountService,
  DEMO_ACCOUNT_FORBIDDEN_CODE,
  DEMO_ACCOUNT_FORBIDDEN_MESSAGE,
} from '../demo-account.service.js';

const SRC = join(process.cwd(), 'src');
const read = (rel: string) => readFileSync(join(SRC, rel), 'utf8');

/** 판정 정본 · 구축 CLI · 마이그레이션 주석은 주소를 적어도 되는 자리다(그 외는 아니다). */
const ADDRESS_ALLOWED = [
  'services/auth/demo-account.service.ts', // 주석 안의 반례 설명
  'scripts/demo-account-provision.ts', // 구축 CLI 상수 — 계정을 만드는 단 한 곳
  'database/migrations/1790940000000-CreateDemoAccounts.ts', // 주석
];

describe('Demo 계정 보호 계약', () => {
  // ── D1 ────────────────────────────────────────────────────────────────────
  it('D1 런타임 판정에 Demo 이메일 문자열이 없다 — 정본은 user_id 다', () => {
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name === '__tests__' || e.name === 'node_modules') continue;
          walk(p);
        } else if (p.endsWith('.ts') && !p.endsWith('.d.ts') && !/\.(spec|test)\.ts$/.test(p)) {
          files.push(p);
        }
      }
    };
    walk(SRC);
    // 수집이 비면 아래 단언이 "아무것도 보지 않고 통과"가 된다 — 하한을 먼저 고정한다.
    expect(files.length).toBeGreaterThan(500);

    const offenders = files.filter((p) => {
      const rel = p.slice(SRC.length + 1).replace(/\\/g, '/');
      if (ADDRESS_ALLOWED.includes(rel)) return false;
      return /teststoreowner@|testsupplier@/.test(readFileSync(p, 'utf8'));
    });

    expect(offenders.map((p) => p.slice(SRC.length + 1).replace(/\\/g, '/'))).toEqual([]);
  });

  // ── D2 ────────────────────────────────────────────────────────────────────
  it('D2 조회는 활성 행만 · 파라미터 바인딩만 쓴다', async () => {
    const seen: Array<{ q: string; p: unknown[] }> = [];
    const manager = {
      query: async (q: string, p: unknown[] = []) => {
        seen.push({ q, p });
        return [];
      },
    } as never;

    await demoAccountService.isDemoAccount('u-1', manager);
    await demoAccountService.getDemoAccountType('u-1', manager);
    await demoAccountService.isDemoLoginEmail('a@b.com', manager);

    expect(seen).toHaveLength(3);
    for (const { q, p } of seen) {
      expect(q).toContain('demo_accounts');
      expect(q).toContain('is_active');
      expect(q).toContain('$1'); // 값은 파라미터로만 들어간다
      expect(q).not.toContain('${'); // 문자열 보간 금지 (Guard Rule 2)
      expect(p).toHaveLength(1);
    }
    // 이메일 경로도 users 를 거쳐 demo_accounts 를 본다 — 상수 비교가 아니다.
    expect(seen[2].q).toContain('JOIN users');
    expect(seen[2].p[0]).toBe('a@b.com');
  });

  it('D2 빈 식별자는 질의 없이 "Demo 아님" 이다', async () => {
    const manager = { query: async () => { throw new Error('should not query'); } } as never;
    expect(await demoAccountService.isDemoAccount(null, manager)).toBe(false);
    expect(await demoAccountService.isDemoAccount(undefined, manager)).toBe(false);
    expect(await demoAccountService.getDemoAccountType('', manager)).toBeNull();
    expect(await demoAccountService.isDemoLoginEmail('', manager)).toBe(false);
  });

  it('행이 있으면 유형을 그대로 돌려준다', async () => {
    const manager = { query: async () => [{ demo_type: 'SUPPLIER' }] } as never;
    expect(await demoAccountService.isDemoAccount('u-1', manager)).toBe(true);
    expect(await demoAccountService.getDemoAccountType('u-1', manager)).toBe('SUPPLIER');
  });

  // ── D3 ────────────────────────────────────────────────────────────────────
  it('D3 조회 실패를 통과로 바꾸지 않는다 — 예외를 그대로 올린다', async () => {
    const manager = { query: async () => { throw new Error('connection lost'); } } as never;

    // `catch { return false }` 를 넣으면 이 단언이 깨진다 — 보호 대상인지 모르는 채로
    // 비밀번호 변경·삭제를 통과시키는 것이 정확히 막으려는 사고다.
    await expect(demoAccountService.isDemoAccount('u-1', manager)).rejects.toThrow('connection lost');
    await expect(demoAccountService.isDemoLoginEmail('a@b.com', manager)).rejects.toThrow('connection lost');
  });

  // ── D4 ────────────────────────────────────────────────────────────────────
  it('D4 계정 삭제 2경로가 registry 판정을 호출하고 403 을 돌려준다', () => {
    const paths = ['controllers/admin/AdminUserController.ts', 'controllers/UserManagementController.ts'];
    const missing: string[] = [];
    for (const rel of paths) {
      const src = read(rel);
      if (!/demoAccountService\.isDemoAccount\(/.test(src)) missing.push(`${rel}: 판정 호출 없음`);
      if (!/DEMO_ACCOUNT_FORBIDDEN_CODE/.test(src)) missing.push(`${rel}: 사유 코드 없음`);
      // 삭제 **전에** 막는다 — 호출 순서가 뒤바뀌면 행이 지워진 뒤 403 을 낸다.
      const guardAt = src.indexOf('isDemoAccount(');
      const deleteAt = Math.min(
        ...[src.indexOf('userRepo.remove('), src.indexOf('softDeleteUser(')].filter((i) => i >= 0),
      );
      if (!(guardAt >= 0 && deleteAt >= 0 && guardAt < deleteAt)) missing.push(`${rel}: 판정이 삭제보다 뒤에 있다`);
    }
    expect(missing).toEqual([]);
  });

  it('사유 코드 · 문구는 한 곳에서만 정의된다', () => {
    expect(DEMO_ACCOUNT_FORBIDDEN_CODE).toBe('DEMO_ACCOUNT_FORBIDDEN');
    expect(DEMO_ACCOUNT_FORBIDDEN_MESSAGE).toContain('테스트 계정');
    // 비밀번호·이메일 경로도 같은 상수를 쓴다(문구 복제 0).
    expect(read('services/auth/email-auth.service.ts')).toContain('DEMO_ACCOUNT_FORBIDDEN_CODE');
    expect(read('services/auth/google-auth.service.ts')).toContain('DEMO_ACCOUNT_FORBIDDEN_MESSAGE');
  });
});
