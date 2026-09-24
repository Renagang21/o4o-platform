/**
 * 계정/권한 표시 정적 계약
 *   WO-O4O-IDENTITY-ACCOUNT-DISPLAY-AND-DOCUMENT-ALIGNMENT-V1 §19
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 배경
 *
 *   Google-only 전환 후 Admin Header 가 `user.role` 을 "역할" 로 찍었다. 그 값은 backend 의
 *   `roles[0]` 이고 role 조회에 정렬이 없어 **어느 role 이 올지 보장되지 않았다** —
 *   `platform:super_admin` 을 포함해 11개를 가진 관리자에게 `kpa-branch:operator` 가 표시됐다.
 *   같은 축에서 **실제 결함**도 나왔다: `HubPage` 가 `roles[0]` 하나로 접근을 차단하고 있었다
 *   (보유했는데도 첫 원소가 다르면 거부될 수 있는 비결정적 차단).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 이 spec 이 고정하는 것 (파일 텍스트만 본다 — DB · 네트워크 0)
 *
 *   G1 표시 helper 가 존재하고 **보유 여부**로 판정한다(배열 순서 미사용).
 *   G2 AdminHeader 가 `user.role` 을 대표 역할로 찍지 않는다 · "SSO 인증" 단독 표기가 없다 ·
 *      로그인 수단 / 관리 권한 / 프로필 이메일이 **label 과 함께** 분리돼 있다.
 *   G3 활성 runtime 에서 `roles[0]` 을 **접근 판정**에 쓰지 않는다(HubPage 회귀 포함).
 *   G4 compatibility scalar(`role`)는 **결정적**으로 만들어진다(정렬 사본).
 *   G5 `users.email` 을 "로그인 계정/로그인 이메일" 로 표기하지 않는다.
 *
 * 판정 대상은 **활성 runtime 소스**다. 과거 문서 · 테스트 · dist 는 보지 않는다.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const REPO = path.resolve(SRC, '..', '..', '..');

const read = (p: string) => fs.readFileSync(p, 'utf-8');

/**
 * 주석 제거 — 사고 경위를 적은 주석은 위반이 아니다.
 *
 * ⚠️ 줄 단위 필터만으로는 JSX 블록 주석의 **중간 줄**이 남아 오탐이 난다.
 *    실제로 이 spec 의 초판이 AdminHeader 의 "전/후" 설명 주석을 위반으로 잡았다.
 *    블록 주석을 먼저 통째로 지운 뒤 줄 단위로 거른다.
 */
const codeOnly = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, '') // JSX 블록 주석
    .replace(/\/\*[\s\S]*?\*\//g, '') // 일반 블록 주석
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');

const ACCOUNT_DISPLAY = path.join(REPO, 'packages', 'auth-context', 'src', 'accountDisplay.ts');
const ADMIN_HEADER = path.join(REPO, 'apps', 'admin-dashboard', 'src', 'components', 'layout', 'AdminHeader.tsx');
const HUB_PAGE = path.join(REPO, 'services', 'web-neture', 'src', 'pages', 'hub', 'HubPage.tsx');
const TOKEN_UTILS = path.join(SRC, 'utils', 'token.utils.ts');
const AUTH_CONTEXT_HELPER = path.join(SRC, 'services', 'auth', 'auth-context.helper.ts');

describe('WO-O4O-IDENTITY-ACCOUNT-DISPLAY-AND-DOCUMENT-ALIGNMENT-V1 — 표시 계약', () => {
  it('codeOnly 가 주석만 지우고 코드는 남긴다 (guard 가 무력해지지 않는다)', () => {
    const fixture = [
      '{/* 역할: {user?.role} | SSO 인증 — 과거 표기 설명 */}',
      '// 역할: {user?.role}',
      'const shown = user?.role;',
    ].join('\n');
    const out = codeOnly(fixture);
    // 주석은 사라진다
    expect(out).not.toMatch(/과거 표기 설명/);
    expect(out).not.toMatch(/SSO 인증/);
    // 코드 줄은 남는다 — 실제 위반이면 여전히 잡힌다
    expect(out).toMatch(/const shown = user\?\.role;/);
    expect(out.match(/user\?\.role/g) ?? []).toHaveLength(1);
  });

  it('대상 파일이 실재한다 (guard 가 빈 집합으로 통과하지 않는다)', () => {
    for (const f of [ACCOUNT_DISPLAY, ADMIN_HEADER, HUB_PAGE, TOKEN_UTILS, AUTH_CONTEXT_HELPER]) {
      expect({ f, exists: fs.existsSync(f) }).toEqual({ f, exists: true });
    }
  });

  describe('G1 표시 helper 는 보유 여부로 판정한다', () => {
    const code = codeOnly(read(ACCOUNT_DISPLAY));

    it('platform:super_admin 보유 여부로 라벨을 정한다', () => {
      expect(code).toMatch(/ADMIN_SURFACE_ROLE\s*=\s*'platform:super_admin'/);
      expect(code).toMatch(/roles\.includes\(ADMIN_SURFACE_ROLE\)/);
      expect(code).toMatch(/최고 관리자/);
    });

    it('배열 인덱스로 대표 역할을 만들지 않는다', () => {
      expect(code).not.toMatch(/roles\s*\[\s*0\s*\]/);
      expect(code).not.toMatch(/\.sort\(\)\s*\[\s*0\s*\]/);
    });
  });

  describe('G2 AdminHeader 의 계정 블록', () => {
    const code = codeOnly(read(ADMIN_HEADER));

    it('user.role 을 화면에 찍지 않는다', () => {
      expect(code).not.toMatch(/\{\s*user\??\.role\s*\}/);
      expect(code).not.toMatch(/역할\s*:\s*\{/);
    });

    it('"SSO 인증" 을 단독 표기하지 않는다', () => {
      expect(code).not.toMatch(/SSO\s*인증/);
    });

    it('로그인 수단 · 관리 권한 · 프로필 이메일이 label 과 함께 분리돼 있다', () => {
      expect(code).toMatch(/로그인 수단/);
      expect(code).toMatch(/관리 권한/);
      expect(code).toMatch(/프로필 이메일/);
      // 값은 공용 helper 에서 온다 — 화면이 자체 규칙을 만들지 않는다.
      expect(code).toMatch(/buildAccountDisplayInfo/);
    });
  });

  describe('G3 roles[0] 로 접근을 판정하지 않는다', () => {
    const code = codeOnly(read(HUB_PAGE));

    it('HubPage 가 roles[0] 을 쓰지 않는다 (2026-09-24 회귀)', () => {
      expect(code).not.toMatch(/roles\s*\[\s*0\s*\]/);
    });

    it('보유 여부로 판정한다', () => {
      expect(code).toMatch(/userRoles\.some\(/);
      expect(code).toMatch(/HUB_ALLOWED_ROLES/);
    });
  });

  describe('G4 compatibility scalar 는 결정적이다', () => {
    it('JWT role claim 이 compatPrimaryRole 에서 나온다', () => {
      expect(codeOnly(read(TOKEN_UTILS))).toMatch(/compatPrimaryRole\(userRoles\)/);
    });

    it('/auth/me 의 user.role 도 compatPrimaryRole 에서 나온다', () => {
      expect(codeOnly(read(AUTH_CONTEXT_HELPER))).toMatch(/compatPrimaryRole\(roles\)/);
    });

    it('비교 함수 없는 sort() 로 대표값을 만들지 않는다 (SonarQube reliability)', () => {
      // localeCompare 는 로케일 의존이고, 비교 함수 없는 sort() 는 의도를 코드로 드러내지 않는다.
      // compatPrimaryRole 은 코드 단위 비교의 최소값을 직접 고른다.
      for (const f of [TOKEN_UTILS, AUTH_CONTEXT_HELPER, path.join(SRC, 'modules', 'auth', 'controllers', 'auth-account.controller.ts')]) {
        expect({ f, hit: /\.sort\(\)\s*\[\s*0\s*\]/.test(codeOnly(read(f))) }).toEqual({ f, hit: false });
      }
      const helper = codeOnly(read(path.join(SRC, 'utils', 'compat-primary-role.ts')));
      expect(helper).not.toMatch(/\.sort\(/);
      expect(helper).not.toMatch(/localeCompare/);
      expect(helper).toMatch(/if \(role < min\) min = role;/);
    });

    it('roles 배열 자체는 그대로 응답에 실린다 (인가 정본)', () => {
      expect(codeOnly(read(AUTH_CONTEXT_HELPER))).toMatch(/publicData\.roles\s*=\s*roles/);
    });
  });

  describe('G5 users.email 을 로그인 ID 로 표기하지 않는다', () => {
    it('AdminHeader 에 "로그인 이메일/로그인 계정" 표기가 없다', () => {
      const code = codeOnly(read(ADMIN_HEADER));
      expect(code).not.toMatch(/로그인\s*(이메일|계정|ID|아이디)/);
    });

    it('표시 helper 가 email 을 profileEmail 이라는 이름으로만 노출한다', () => {
      const code = codeOnly(read(ACCOUNT_DISPLAY));
      expect(code).toMatch(/profileEmail/);
      expect(code).not.toMatch(/loginEmail|login_email|loginAccount/);
    });
  });
});
