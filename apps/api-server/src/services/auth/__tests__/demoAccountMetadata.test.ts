/**
 * Demo 응답 metadata — WO-O4O-DEMO-LOGIN-ENTRY-AND-EXPERIENCE-UX-V1
 * 정책 정본: `docs/baseline/O4O-CANONICAL-DEMO-ACCOUNTS-V1.md`
 *
 *   M1 활성 Demo 행이 있으면 `{ isDemo:true, demoType }` — 판정은 `demo_accounts.user_id` 질의다.
 *   M2 일반 사용자 · userId 없음은 `{ isDemo:false, demoType:null }`.
 *   M3 조회 실패는 로그인을 막지 않는다(표시용 · fail-open) — 보호 판정 `isDemoAccount` 는 여전히 fail-closed.
 *   M4 응답에는 isDemo · demoType 두 필드만 싣는다(registry id · 기타 컬럼 0).
 *   M5 `/auth/me` · email 로그인 응답이 `user.demo` 를 싣는다.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { demoAccountService } from '../demo-account.service.js';

const db = (impl: (sql: string, params: unknown[]) => unknown) => ({
  query: jest.fn(async (sql: string, params: unknown[] = []) => impl(sql, params)),
});

describe('Demo 응답 metadata', () => {
  it('M1 활성 Demo 행 → isDemo true · demoType', async () => {
    const m = db(() => [{ demo_type: 'SUPPLIER', id: 'registry-id', note: 'x' }]);
    await expect(demoAccountService.getDemoMetadata('u1', m as never)).resolves.toEqual({
      isDemo: true,
      demoType: 'SUPPLIER',
    });
    const [sql, params] = m.query.mock.calls[0];
    expect(sql).toMatch(/FROM demo_accounts WHERE user_id = \$1 AND is_active/);
    expect(params).toEqual(['u1']);
  });

  it('M2 일반 사용자 · userId 없음 → isDemo false', async () => {
    const m = db(() => []);
    await expect(demoAccountService.getDemoMetadata('u2', m as never)).resolves.toEqual({ isDemo: false, demoType: null });
    await expect(demoAccountService.getDemoMetadata(null, m as never)).resolves.toEqual({ isDemo: false, demoType: null });
  });

  it('M3 조회 실패 → isDemo false (보호 판정은 그대로 throw)', async () => {
    const m = db(() => {
      throw new Error('connection lost');
    });
    await expect(demoAccountService.getDemoMetadata('u3', m as never)).resolves.toEqual({ isDemo: false, demoType: null });
    await expect(demoAccountService.isDemoAccount('u3', m as never)).rejects.toThrow('connection lost');
  });

  it('M4 응답 필드는 isDemo · demoType 뿐', async () => {
    const m = db(() => [{ demo_type: 'STORE_OWNER', id: 'registry-id', user_id: 'u4' }]);
    const meta = await demoAccountService.getDemoMetadata('u4', m as never);
    expect(Object.keys(meta).sort()).toEqual(['demoType', 'isDemo']);
  });

  it('M5 /auth/me · email 로그인 응답이 user.demo 를 싣는다', () => {
    const src = (rel: string) => readFileSync(join(process.cwd(), 'src', rel), 'utf8');
    expect(src('modules/auth/controllers/auth-account.controller.ts')).toMatch(
      /ud\.demo = await demoAccountService\.getDemoMetadata\(req\.user\.id\)/,
    );
    expect(src('modules/auth/controllers/email-auth.controller.ts')).toMatch(
      /user\.demo = await demoAccountService\.getDemoMetadata\(String\(user\.id\)\)/,
    );
  });
});
