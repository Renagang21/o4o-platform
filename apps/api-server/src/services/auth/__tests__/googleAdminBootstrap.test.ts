/**
 * Admin Google Bootstrap(전환기 1회용) — **은퇴 계약**
 *
 * WO-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1 (구 WO-O4O-GOOGLE-IDENTITY-OPERATOR-EXPLICIT-LINK-V1 §15)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 파일이 원래 고정하던 것
 *
 *   세션도 비밀번호도 요구할 수 없는 유일한 연결 경로였으므로, 게이트(플래그·일회용 코드·
 *   대상 판정·1회성)를 런타임 테스트로 고정했다.
 *
 * 왜 뒤집었나
 *
 *   목적이던 "기존 관리자 users.id 에 Google 연결" 은 2026-09-22 에 완료됐고, 1회용이라
 *   재사용 시나리오가 없다. 운영 env 에 `GOOGLE_ADMIN_BOOTSTRAP_ENABLED` · `_CODE` 가
 *   **둘 다 없어** 이미 fail-closed 로 닫혀 있었다(IR §3-3 실측).
 *
 *   경로를 지웠으므로 계약도 **부재**로 뒤집는다. 세션 없이 열리는 연결 경로가 다시 생기면
 *   이 테스트가 먼저 깨진다 — 그것이 이 파일을 지우지 않고 남기는 이유다.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..', '..', '..');
const read = (p: string) => fs.readFileSync(p, 'utf-8');

/** 주석은 위반이 아니다 — 은퇴 경위를 적은 문장까지 잡으면 가드가 무력화된다. */
const codeOnly = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');

const AUTH_ROUTES = path.join(SRC, 'modules/auth/routes/auth.routes.ts');
const GOOGLE_CONTROLLER = path.join(SRC, 'modules/auth/controllers/google-auth.controller.ts');
const GOOGLE_SERVICE = path.join(SRC, 'services/auth/google-auth.service.ts');
const BOOTSTRAP_CONFIG = path.join(SRC, 'config/google-admin-bootstrap.config.ts');

describe('Admin Google Bootstrap 은퇴 계약', () => {
  it('가드가 빈 집합으로 통과하지 않는다 (대상 파일 실재)', () => {
    for (const f of [AUTH_ROUTES, GOOGLE_CONTROLLER, GOOGLE_SERVICE]) {
      expect({ f, exists: fs.existsSync(f) }).toEqual({ f, exists: true });
    }
  });

  it('config 파일이 없다', () => {
    expect(fs.existsSync(BOOTSTRAP_CONFIG)).toBe(false);
  });

  it('bootstrap-admin route 가 없다', () => {
    const code = codeOnly(read(AUTH_ROUTES));
    expect(code).not.toMatch(/bootstrap-admin/);
    expect(code).not.toMatch(/GoogleAdminBootstrapRequestDto/);
    expect(code).not.toMatch(/googleAdminBootstrapLimiter/);
  });

  it('controller · service 에 bootstrap 진입점이 없다', () => {
    for (const f of [GOOGLE_CONTROLLER, GOOGLE_SERVICE]) {
      const code = codeOnly(read(f));
      expect({ f, hit: /bootstrapAdmin/.test(code) }).toEqual({ f, hit: false });
    }
  });

  it('BOOTSTRAP env 이름이 runtime 에 남아 있지 않다', () => {
    const walk = (dir: string, out: string[] = []): string[] => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (/(^|[\\/])(__tests__|migrations|node_modules|dist)([\\/]|$)/.test(full)) continue;
          walk(full, out);
        } else if (full.endsWith('.ts') && !/\.(spec|test)\.ts$/.test(full)) {
          out.push(full);
        }
      }
      return out;
    };
    const files = walk(SRC);
    expect(files.length).toBeGreaterThan(500);
    const offenders = files.filter((f) => /GOOGLE_ADMIN_BOOTSTRAP/.test(codeOnly(read(f))));
    expect(offenders.map((f) => path.relative(SRC, f))).toEqual([]);
  });

  it('Google 로그인·가입 본체는 그대로 살아 있다 (은퇴가 본체로 번지지 않았다)', () => {
    const code = codeOnly(read(AUTH_ROUTES));
    expect(code).toMatch(/'\/google\/login'/);
    expect(code).toMatch(/'\/google\/signup'/);
    expect(code).toMatch(/'\/google\/config'/);
  });
});
