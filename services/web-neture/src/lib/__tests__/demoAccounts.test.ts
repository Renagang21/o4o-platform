/**
 * WO-O4O-DEMO-LOGIN-ENTRY-AND-EXPERIENCE-UX-V1 — Demo 정의 · 판정 계약
 *
 *   - Demo 판정은 서버 `user.demo` 만 본다 (email 문자열 비교 0)
 *   - Demo credential 은 lib/demoAccounts.ts 한 곳에만 있다
 *   - DEMO_ACCOUNT_FORBIDDEN → Demo 안내 문구
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { DEMO_ACCOUNTS, readDemoMetadata, demoAwareErrorMessage, DEMO_ACCOUNT_FORBIDDEN_NOTICE } from '../demoAccounts';

describe('readDemoMetadata', () => {
  it('서버 demo 필드만 본다', () => {
    expect(readDemoMetadata({ demo: { isDemo: true, demoType: 'SUPPLIER' } })).toEqual({ isDemo: true, demoType: 'SUPPLIER' });
    expect(readDemoMetadata({ demo: { isDemo: false, demoType: null } })).toEqual({ isDemo: false, demoType: null });
    // Demo 계정 이메일이어도 서버 필드가 없으면 Demo 아님
    expect(readDemoMetadata({ email: DEMO_ACCOUNTS[0].email })).toEqual({ isDemo: false, demoType: null });
    expect(readDemoMetadata({ demo: { isDemo: true, demoType: 'ADMIN' } })).toEqual({ isDemo: false, demoType: null });
    expect(readDemoMetadata(null)).toEqual({ isDemo: false, demoType: null });
  });
});

describe('demoAwareErrorMessage', () => {
  it('DEMO_ACCOUNT_FORBIDDEN → Demo 안내, 그 외 fallback', () => {
    expect(demoAwareErrorMessage({ response: { data: { code: 'DEMO_ACCOUNT_FORBIDDEN' } } }, 'f')).toBe(DEMO_ACCOUNT_FORBIDDEN_NOTICE);
    expect(demoAwareErrorMessage({ code: 'DEMO_ACCOUNT_FORBIDDEN' }, 'f')).toBe(DEMO_ACCOUNT_FORBIDDEN_NOTICE);
    expect(demoAwareErrorMessage({ response: { data: { code: 'FORBIDDEN' } } }, 'f')).toBe('f');
    expect(demoAwareErrorMessage(undefined, 'f')).toBe('f');
  });
});

describe('Demo credential 단일 정의', () => {
  it('web-neture src 에서 Demo 이메일 · 비밀번호는 lib/demoAccounts.ts 에만 있다', () => {
    const src = join(__dirname, '..', '..');
    const files: string[] = [];
    const walk = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name);
        if (e.isDirectory()) {
          if (e.name === '__tests__' || e.name === 'node_modules') continue;
          walk(p);
        } else if (/\.(ts|tsx)$/.test(p)) files.push(p);
      }
    };
    walk(src);
    expect(files.length).toBeGreaterThan(100);
    const needles = DEMO_ACCOUNTS.flatMap((d) => [d.email, d.password]);
    const offenders = files.filter((p) => {
      if (p.replace(/\\/g, '/').endsWith('lib/demoAccounts.ts')) return false;
      const text = readFileSync(p, 'utf8');
      return needles.some((n) => text.includes(n));
    });
    expect(offenders).toEqual([]);
  });
});
