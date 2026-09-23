/**
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1 — password 인증 **재유입 차단** 정적 계약
 *
 * 은퇴 판정의 근거는 CHECK §1 전수 census 이고, 이 spec 은 그 판정이 코드로 되돌아오지 않게 고정한다.
 * DB · 네트워크 접근 0 — 파일 존재/부재와 소스 텍스트만 본다.
 *
 * 고정하는 것
 * -----------
 *  P1 은퇴 런타임 파일 부재 — auth-login service/controller · passwordResetService ·
 *     password-policy(백엔드·공통패키지·admin) · hashPassword/comparePassword 유틸.
 *  P2 은퇴 route 부재 — `/auth/login` · `/auth/register` · `/auth/signup` · `/auth/check-email` ·
 *     `/auth/forgot-password` · `/auth/reset-password` · `/auth/find-id` ·
 *     `PATCH /admin/platform-accounts/:id/password` · `PUT /users/password` ·
 *     `POST /auth/google/link`(currentPassword 재인증 경로).
 *  P3 bcrypt 소비 0 — 런타임 소스에서 bcrypt/bcryptjs import 가 없다(해시할 대상이 없다).
 *  P4 프런트 password 입력 0 — 로그인/가입/재설정 surface 에 `type="password"` 가 없다.
 *     (API key·SMTP·OAuth secret 마스킹 등 인증과 무관한 입력은 ALLOWLIST 로 명시 제외)
 *  P5 유일 로그인 계약 유지 — Google 경로(`/auth/google/login` · `/auth/google/signup`)는 살아 있다.
 *
 * 고정하지 않는 것 (의도적)
 * -------------------------
 *  - `database/migrations/**` 의 과거 password migration: HISTORICAL_KEEP (CHECK §1-5).
 *  - `users.password` · `service_credentials` 등 **스키마**: Phase B(§43 destructive gate 승인 후).
 *    그래서 entity 파일은 이 spec 의 부재 목록에 없다 — 런타임 reader/writer 0 이 Phase A 의 기준이다.
 *  - `account_activities` · `action_logs` 의 과거 password 이벤트 라벨: 감사 기록 렌더에 필요.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const REPO = path.resolve(SRC, '..', '..', '..');
const AUTH_ROUTES = path.join(SRC, 'modules', 'auth', 'routes', 'auth.routes.ts');
const USERS_ROUTES = path.join(SRC, 'routes', 'users.routes.ts');
const PLATFORM_ACCOUNTS_ROUTES = path.join(SRC, 'routes', 'admin', 'platform-accounts.routes.ts');

/** P1 — 다시 생기면 안 되는 런타임 파일 */
const RETIRED_FILES: [string, string][] = [
  ['api-server services/auth/auth-login.service.ts', path.join(SRC, 'services', 'auth', 'auth-login.service.ts')],
  ['api-server modules/auth/controllers/auth-login.controller.ts', path.join(SRC, 'modules', 'auth', 'controllers', 'auth-login.controller.ts')],
  ['api-server services/passwordResetService.ts', path.join(SRC, 'services', 'passwordResetService.ts')],
  ['api-server utils/password-policy.ts', path.join(SRC, 'utils', 'password-policy.ts')],
  ['api-server services/admin/admin-password-reset-scope.service.ts', path.join(SRC, 'services', 'admin', 'admin-password-reset-scope.service.ts')],
  ['packages/auth-utils passwordPolicy.ts', path.join(REPO, 'packages', 'auth-utils', 'src', 'passwordPolicy.ts')],
  ['packages/account-ui PasswordChangeModal.tsx', path.join(REPO, 'packages', 'account-ui', 'src', 'components', 'PasswordChangeModal.tsx')],
  ['admin-dashboard lib/password-policy.ts', path.join(REPO, 'apps', 'admin-dashboard', 'src', 'lib', 'password-policy.ts')],
  ['admin-dashboard pages/auth/ForgotPassword.tsx', path.join(REPO, 'apps', 'admin-dashboard', 'src', 'pages', 'auth', 'ForgotPassword.tsx')],
  ['admin-dashboard pages/auth/ResetPassword.tsx', path.join(REPO, 'apps', 'admin-dashboard', 'src', 'pages', 'auth', 'ResetPassword.tsx')],
];

/** P2 — auth.routes.ts 에 다시 등록되면 안 되는 경로 */
const RETIRED_AUTH_ROUTE_PATHS = [
  "'/login'",
  "'/register'",
  "'/signup'",
  "'/check-email'",
  "'/forgot-password'",
  "'/reset-password'",
  "'/find-id'",
  "'/google/link'",
  "'/google/link/status'",
];

/** P5 — 유일한 로그인/가입 계약(살아 있어야 한다) */
const KEPT_AUTH_ROUTE_PATHS = [
  "'/google/config'",
  "'/google/login'",
  "'/google/signup'",
  "'/refresh'",
  "'/logout'",
];

/**
 * P4 — 인증과 무관한 `type="password"` 허용 목록.
 * 값의 성격이 "사용자 로그인 비밀번호"가 아니라 API key · SMTP · OAuth client secret 마스킹이다.
 * 새 파일이 여기 들어오려면 같은 성격임을 커밋에서 밝혀야 한다.
 */
const PASSWORD_INPUT_ALLOWLIST = [
  'apps/admin-dashboard/src/components/ai/SimpleAIModal.tsx',
  'apps/admin-dashboard/src/components/cms/forms/InputText.tsx',
  'apps/admin-dashboard/src/pages/settings/AppServices.tsx',
  'apps/admin-dashboard/src/pages/settings/EmailSettings.tsx',
  'apps/admin-dashboard/src/pages/settings/OAuthSettings.tsx',
  'apps/admin-dashboard/src/pages/__debug__/LoginDiagnostic.tsx',
  'apps/admin-dashboard/src/pages/__debug__/AuthBootstrapDebug.tsx',
  'apps/admin-dashboard/src/pages/__debug__/AuthStateJsonDebug.tsx',
  // 매장 태블릿 PIN(선택) — 사용자 로그인 비밀번호가 아니다(CHECK §1-6 OUT_OF_SCOPE).
  'services/web-k-cosmetics/src/pages/store/StoreSettingsPage.tsx',
  // SMTP 발신 계정 비밀번호/앱 비밀번호 — 메일 전송 자격이며 로그인 축이 아니다.
  'services/web-neture/src/pages/admin/settings/EmailSettingsPage.tsx',
];

/** 스캔 대상 — 런타임 소스만(테스트·migration·dist·node_modules 제외) */
const SCAN_TARGETS = [
  path.join(SRC),
  path.join(REPO, 'packages'),
  path.join(REPO, 'services'),
  path.join(REPO, 'apps', 'admin-dashboard', 'src'),
];

const SKIP_DIR = /(^|[\\/])(node_modules|dist|build|coverage|__tests__|migrations|e2e|\.git)([\\/]|$)/;
const SKIP_FILE = /\.(test|spec)\.tsx?$/;

function walkFiles(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIR.test(full)) continue;
      walkFiles(full, out);
      continue;
    }
    if (!/\.tsx?$/.test(entry.name) || SKIP_FILE.test(entry.name)) continue;
    out.push(full);
  }
  return out;
}

const rel = (f: string) => path.relative(REPO, f).replace(/\\/g, '/');

const FILES = SCAN_TARGETS.flatMap((d) => walkFiles(d));
const SOURCES = new Map<string, string>(FILES.map((f) => [f, fs.readFileSync(f, 'utf-8')]));

/** 주석 줄을 제거한 텍스트 — 판정은 "코드"만 본다(은퇴 사실을 적은 주석은 위반이 아니다). */
function codeOnly(src: string): string {
  return src
    .split('\n')
    .filter((l) => {
      const t = l.trim();
      return !(t.startsWith('//') || t.startsWith('*') || t.startsWith('/*') || t.startsWith('*/'));
    })
    .join('\n');
}

describe('WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1 — 재유입 차단 정적 계약', () => {
  it('스캔 대상이 실재한다 (guard 가 빈 집합으로 통과하지 않는다)', () => {
    expect(FILES.length).toBeGreaterThan(500);
    expect(FILES.some((f) => rel(f).endsWith('modules/auth/routes/auth.routes.ts'))).toBe(true);
    expect(FILES.some((f) => rel(f).endsWith('services/auth/google-auth.service.ts'))).toBe(true);
  });

  describe('P1 은퇴 런타임 파일 부재', () => {
    it.each(RETIRED_FILES)('%s 파일이 없다', (_label, file) => {
      expect(fs.existsSync(file)).toBe(false);
    });

    it('은퇴 모듈을 import 하는 런타임 소스가 없다', () => {
      const pattern = /from\s+['"][^'"]*(auth-login\.(service|controller)|passwordResetService|password-policy|passwordPolicy|admin-password-reset-scope|PasswordChangeModal)[^'"]*['"]/;
      const violations: string[] = [];
      for (const [f, src] of SOURCES) {
        for (const line of codeOnly(src).split('\n')) {
          if (pattern.test(line)) violations.push(`${rel(f)} :: ${line.trim()}`);
        }
      }
      expect(violations).toEqual([]);
    });
  });

  describe('P2 은퇴 route 부재 · P5 Google 경로 유지', () => {
    const authRoutes = codeOnly(fs.readFileSync(AUTH_ROUTES, 'utf-8'));

    it.each(RETIRED_AUTH_ROUTE_PATHS)('auth.routes.ts 에 %s 등록이 없다', (routePath) => {
      expect(authRoutes.includes(routePath)).toBe(false);
    });

    it.each(KEPT_AUTH_ROUTE_PATHS)('auth.routes.ts 에 %s 는 유지된다', (routePath) => {
      expect(authRoutes.includes(routePath)).toBe(true);
    });

    it('users.routes.ts 에 password 변경 route 가 없다', () => {
      const src = codeOnly(fs.readFileSync(USERS_ROUTES, 'utf-8'));
      expect(src).not.toMatch(/router\.(put|patch|post)\(\s*['"]\/password['"]/);
    });

    it('platform-accounts.routes.ts 에 비밀번호 설정 route 가 없다', () => {
      const src = codeOnly(fs.readFileSync(PLATFORM_ACCOUNTS_ROUTES, 'utf-8'));
      expect(src).not.toMatch(/router\.(put|patch|post)\(\s*['"][^'"]*password/i);
    });
  });

  describe('P3 bcrypt 소비 0', () => {
    it('런타임 소스에 bcrypt/bcryptjs import 가 없다', () => {
      const violations: string[] = [];
      for (const [f, src] of SOURCES) {
        for (const line of codeOnly(src).split('\n')) {
          if (/(from\s+['"]bcryptjs?['"]|require\(['"]bcryptjs?['"]\))/.test(line)) {
            violations.push(`${rel(f)} :: ${line.trim()}`);
          }
        }
      }
      expect(violations).toEqual([]);
    });

    it('hashPassword / comparePassword export 가 없다', () => {
      const violations: string[] = [];
      for (const [f, src] of SOURCES) {
        for (const line of codeOnly(src).split('\n')) {
          if (/export\s+(const|function|async function)\s+(hashPassword|comparePassword)\b/.test(line)) {
            violations.push(`${rel(f)} :: ${line.trim()}`);
          }
        }
      }
      expect(violations).toEqual([]);
    });
  });

  describe('P4 프런트 password 입력 0', () => {
    it('인증 surface 에 type="password" 입력이 없다 (allowlist 외)', () => {
      const violations: string[] = [];
      for (const [f, src] of SOURCES) {
        if (!/\.tsx$/.test(f)) continue;
        const r = rel(f);
        if (PASSWORD_INPUT_ALLOWLIST.includes(r)) continue;
        const code = codeOnly(src);
        if (/type=(?:"password"|'password'|\{['"]password['"]\})/.test(code)
          || /type=\{[^}]*\?\s*['"]text['"]\s*:\s*['"]password['"]\s*\}/.test(code)) {
          violations.push(r);
        }
      }
      expect(violations).toEqual([]);
    });

    it('allowlist 항목은 실재한다 (죽은 예외가 남지 않는다)', () => {
      const missing = PASSWORD_INPUT_ALLOWLIST.filter((r) => !fs.existsSync(path.join(REPO, r)));
      expect(missing).toEqual([]);
    });
  });
});
