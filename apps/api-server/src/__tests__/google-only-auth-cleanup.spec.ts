/**
 * Google-only 인증 정리 — 재유입 차단 정적 계약
 *   WO-O4O-GOOGLE-ONLY-AUTH-CLEANUP-V1 · 근거 IR-O4O-GOOGLE-ONLY-AUTH-SIMPLIFICATION-CENSUS-V1
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 기준
 *
 *   모든 O4O 사용자의 로그인 수단 = Google 하나
 *   Google sub = external identity · users.id = internal identity
 *
 * 이 spec 은 **제거한 것들이 조용히 되살아나지 않는 것**을 고정한다. 각 항목은 IR 에서
 * 호출부를 세어 consumer 0 을 확인한 뒤 제거했고, 여기서는 그 결과를 계약으로 굳힌다.
 *
 * 반대로 **살아 있어야 하는 것**(Google 로그인 본체 · 직접 지정 · localStorage 전략)도 함께
 * 고정한다. 정리가 본체로 번지면 그쪽에서 먼저 깨지게 하기 위해서다.
 *
 * DB · 네트워크 0 — 텍스트 검사만 한다.
 */
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '..');
const REPO = path.resolve(SRC, '..', '..', '..');
const read = (p: string) => fs.readFileSync(p, 'utf-8');

/** 주석은 위반이 아니다 — 은퇴 경위를 적은 문장까지 잡으면 가드가 무력화된다. */
const codeOnly = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');

/** api-server 활성 runtime (테스트 · migration · dist 제외) */
function runtimeFiles(): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (/(^|[\\/])(__tests__|migrations|node_modules|dist)([\\/]|$)/.test(full)) continue;
        // 스키마 선언(baseline · manifest · expected-schema-states)은 **DB 의 현재 모습**을
        // 기술한다. 코드 제거(단계 A)와 테이블 DROP(단계 B)은 배포 창이 다르므로
        // (deploy-api 가 migration job 을 새 revision 보다 먼저 실행한다),
        // 이 가드는 runtime 코드만 본다. 단계 B 에서 이 파일들도 함께 정리된다.
        if (/(^|[\\/])database[\\/](bootstrap|incremental)([\\/]|$)/.test(full)) continue;
        walk(full);
      } else if (full.endsWith('.ts') && !/\.(spec|test)\.ts$/.test(full)) {
        out.push(full);
      }
    }
  };
  walk(SRC);
  return out;
}

const files = runtimeFiles();
const sources = new Map(files.map((f) => [f, codeOnly(read(f))]));

function offenders(re: RegExp): string[] {
  const hits: string[] = [];
  for (const [f, code] of sources) {
    if (re.test(code)) hits.push(path.relative(SRC, f));
  }
  return hits.sort();
}

describe('Google-only 인증 정리 — 되살아나면 먼저 깨진다', () => {
  it('가드가 빈 집합으로 통과하지 않는다', () => {
    expect(files.length).toBeGreaterThan(500);
  });

  it('codeOnly 가 주석만 지운다 (가드 무력화 방지)', () => {
    const fixture = ["// import passport from 'passport';", "/* passport */", "import passport from 'passport';"].join('\n');
    const out = codeOnly(fixture);
    // 주석 2줄은 사라지고 코드 1줄만 남는다(그 줄에는 식별자와 모듈명 2군데가 있다).
    expect(out.split('\n').filter((l) => l.trim()).length).toBe(1);
    expect(out).toMatch(/import passport from 'passport';/);
  });

  describe('제거한 것은 runtime 에 없다', () => {
    it('Passport 계층 · express-session', () => {
      expect(offenders(/from\s+'passport(-[a-z0-9-]+)?'/)).toEqual([]);
      expect(offenders(/from\s+'express-session'/)).toEqual([]);
      expect(offenders(/passport\.(authenticate|initialize|use)\b/)).toEqual([]);
    });

    it('social OAuth 콜백 경로 (등록된 적 없는 경로)', () => {
      expect(offenders(/\/api\/v1\/social\//)).toEqual([]);
    });

    it('Kakao / Naver 로그인 설정', () => {
      expect(offenders(/\b(KAKAO|NAVER)_CLIENT_(ID|SECRET)\b/)).toEqual([]);
      expect(offenders(/socialAuthConfig/)).toEqual([]);
    });

    it('Admin Google bootstrap', () => {
      expect(offenders(/GOOGLE_ADMIN_BOOTSTRAP|bootstrapAdmin|bootstrap-admin/)).toEqual([]);
    });

    it('Account linking 도메인', () => {
      expect(offenders(/AccountLinkingService|LinkingSession|linking_sessions/)).toEqual([]);
    });

    it('이메일 인증 체인', () => {
      expect(offenders(/EmailVerificationService|EmailVerificationToken|email_verification_tokens/)).toEqual([]);
      expect(offenders(/resend-verification|verifyEmailGet/)).toEqual([]);
    });

    it('refresh_tokens 소비', () => {
      expect(offenders(/\bRefreshToken\b(?!Family|Payload|Contract)/)).toEqual([]);
    });

    it('운영자 이메일 초대 도메인', () => {
      expect(offenders(/OperatorInvitation|operator_invitations|operator-invitations/)).toEqual([]);
    });

    it('mobile 전용 백엔드', () => {
      expect(offenders(/MobileProductDraft|\/api\/v1\/mobile\//)).toEqual([]);
      expect(fs.existsSync(path.join(REPO, 'services', 'mobile-app', 'app.json'))).toBe(false);
    });
  });

  describe('살아 있어야 하는 것은 그대로다 (정리가 본체로 번지지 않았다)', () => {
    const AUTH_ROUTES = path.join(SRC, 'modules/auth/routes/auth.routes.ts');

    it('Google 로그인 · 가입 · config', () => {
      const code = codeOnly(read(AUTH_ROUTES));
      for (const p of ["'/google/config'", "'/google/login'", "'/google/signup'"]) {
        expect({ p, present: code.includes(p) }).toEqual({ p, present: true });
      }
    });

    it('세션 · 핸드오프 · 상태 경로', () => {
      const code = codeOnly(read(AUTH_ROUTES));
      for (const p of ["'/refresh'", "'/me'", "'/logout'", "'/handoff'", "'/status'"]) {
        expect({ p, present: code.includes(p) }).toEqual({ p, present: true });
      }
    });

    it('`/auth/me` 는 남고 중복 `/auth/verify` 만 사라졌다', () => {
      const code = codeOnly(read(AUTH_ROUTES));
      expect(code).toMatch(/router\.get\(\s*$/m.test(code) ? /'\/me'/ : /'\/me'/);
      expect(code).not.toMatch(/'\/verify'/);
    });

    it('운영자 직접 지정 경로', () => {
      const f = path.join(SRC, 'controllers/admin/OperatorAssignmentController.ts');
      expect(fs.existsSync(f)).toBe(true);
      expect(codeOnly(read(f))).toMatch(/ASSIGNABLE_OPERATOR_ROLES/);
    });

    it('guest-auth 경로', () => {
      expect(fs.existsSync(path.join(SRC, 'modules/auth/routes/guest-auth.routes.ts'))).toBe(true);
    });

    it('includeLegacyTokens 는 유지된다 (웹 8개의 현행 로그인 경로)', () => {
      // 이름이 'legacy' 라서 제거 후보로 오판되기 쉽다 — IR §5.
      const hits = offenders(/includeLegacyTokens/);
      expect(hits.length).toBeGreaterThan(0);
    });
  });
});
