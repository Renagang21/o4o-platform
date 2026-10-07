/**
 * WO-O4O-CICD-PRODUCTION-STATE-RECONCILIATION-AND-LEVEL3-RULE-PRECISION-V1 §26 — LEVEL_3 정밀화 fixture
 * (node:test · 의존성 0 · 네트워크 0 · git 은 주입 대체)
 *
 *   P  로그인 화면 표현층 vs 의미 변경 (§9 D · §10 C · §11)
 *   N  §27 downgrade 금지 축 — 표현층 원문이 있어도 L3 유지
 *   G  non-runtime global (§12 · §13) — .gitignore · root 문서 · 로컬 도구 메타데이터
 *   K  API ↔ 프런트 의존 근거에서 non-runtime 제외 (§14)
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { computeApiDependency } from '../deploy-orchestrate.mjs';
import {
  AUTH_SENSITIVE_CONSTRUCT,
  DEPLOY_TARGETS,
  LEVEL_1,
  LEVEL_2,
  LEVEL_3,
  assessRisk,
  changedLinesOf,
  classifyAdminDeploy,
  isAuthPresentationCandidate,
} from '../deploy-risk.mjs';
import { buildWorkspaceGraph, classifyApiDeploy, classifyWebDeploy, isNonRuntimeGlobal } from '../detect-affected.mjs';

const graph = buildWorkspaceGraph();
const WEB_KEYS = DEPLOY_TARGETS.map((t) => t.key).filter((k) => k !== 'api' && k !== 'admin');

/** files: [{ path, status?, base?, head? }] — base/head 원문이 있으면 readFile 로 공급한다 */
function judge(files, { withSource = true } = {}) {
  const src = new Map(files.map((f) => [f.path, f]));
  return assessRisk(
    files.map((f) => ({ status: f.status ?? 'M', path: f.path })),
    graph,
    withSource ? { readFile: (which, p) => src.get(p)?.[which] } : {},
  );
}

const LOGIN_PAGE = 'services/web-neture/src/pages/LoginPage.tsx';
const LOGIN_BASE = [
  "import { useServiceAuth } from '@o4o/auth-react';",
  'export function LoginPage() {',
  '  const auth = useServiceAuth();',
  '  return (',
  '    <div className="p-4">',
  '      <h1 className="text-lg">로그인</h1>',
  '      <p className="text-gray-500">계정으로 계속하세요</p>',
  '    </div>',
  '  );',
  '}',
].join('\n');

describe('P. 로그인 화면 표현층 vs 의미 (§9 D · §10 C)', () => {
  it('P1 frontend login presentation only (className · 문구) → LEVEL_2 · presentation_only 기록', () => {
    const head = LOGIN_BASE.replace('text-lg">로그인', 'text-2xl font-bold">로그인').replace('계정으로 계속하세요', '이메일 또는 Google 계정으로 계속하세요');
    // "Google" 이 들어간 줄은 민감 — 문구만 바꾼 경우와 구분하려고 아래 P1b 로 따로 본다
    const r = judge([{ path: LOGIN_PAGE, base: LOGIN_BASE, head: LOGIN_BASE.replace('text-lg">로그인', 'text-2xl font-bold">로그인') }]);
    assert.equal(r.services.neture.level, LEVEL_2);
    assert.equal(r.level3_hits.length, 0);
    assert.equal(r.presentation_only.length, 1);
    assert.ok(r.advisories.some((a) => a.includes('로그인 화면 표현층만 변경')));
    // P1b — identity provider 이름이 바뀐 줄에 있으면 L3 유지 (과탐 허용)
    assert.equal(judge([{ path: LOGIN_PAGE, base: LOGIN_BASE, head }]).services.neture.level, LEVEL_3);
  });

  it('P2 frontend login semantics (인증 호출 추가) → LEVEL_3', () => {
    const head = LOGIN_BASE.replace('  return (', '  const go = () => auth.loginWithEmail(email, pw);\n  return (');
    const r = judge([{ path: LOGIN_PAGE, base: LOGIN_BASE, head }]);
    assert.equal(r.services.neture.level, LEVEL_3);
    assert.ok(r.services.neture.level3.some((h) => h.rule === 'auth-frontend'));
  });

  it('P3 원문 공급 없음 · rename(base 원문 없음) → LEVEL_3 (fail-closed)', () => {
    assert.equal(judge([{ path: LOGIN_PAGE }], { withSource: false }).services.neture.level, LEVEL_3);
    assert.equal(judge([{ path: LOGIN_PAGE, head: LOGIN_BASE }]).services.neture.level, LEVEL_3);
  });

  it('P4 줄 이동만(내용 동일 · 순서 변경)도 변경으로 본다 — 이동한 줄에 민감 구문 → LEVEL_3', () => {
    const lines = LOGIN_BASE.split('\n');
    const moved = [lines[0], lines[1], lines[3], lines[2], ...lines.slice(4)].join('\n');
    const changed = changedLinesOf('M', LOGIN_PAGE, (w) => (w === 'base' ? LOGIN_BASE : moved));
    assert.ok(changed.length > 0);
    assert.equal(judge([{ path: LOGIN_PAGE, base: LOGIN_BASE, head: moved }]).services.neture.level, LEVEL_3);
  });

  it('P5 auth-react 화면 컴포넌트 표현층만 → LEVEL_2 · password 줄 변경 → LEVEL_3', () => {
    const file = 'packages/auth-react/src/email/EmailLoginForm.tsx';
    const base = '<div className="gap-2">\n  <span className="text-sm">아이디</span>\n</div>';
    const r = judge([{ path: file, base, head: base.replace('gap-2', 'gap-3') }]);
    const affected = Object.entries(r.services).filter(([, s]) => s.affected).map(([k]) => k);
    assert.ok(affected.length > 0, 'auth-react 소비 서비스가 있다');
    assert.ok(affected.every((k) => r.services[k].level === LEVEL_2), JSON.stringify(affected.map((k) => [k, r.services[k].level])));
    const withPw = base + '\n<PasswordInput />';
    assert.equal(judge([{ path: file, base, head: withPw }]).risk_level, LEVEL_3);
  });

  it('P6 표현층 후보 경로 판정', () => {
    for (const f of [LOGIN_PAGE, 'packages/auth-react/src/email/EmailSignupForm.tsx', 'apps/admin-dashboard/src/pages/auth/Login.tsx', 'services/web-store/src/pages/login.css']) {
      assert.equal(isAuthPresentationCandidate(f), true, f);
    }
    for (const f of [
      'packages/auth-react/src/useServiceAuth.ts', // hook · .ts
      'services/web-neture/src/hooks/useLogin.tsx', // hook
      'services/web-neture/src/contexts/AuthContext.tsx', // context
      'services/web-neture/src/components/auth/RegisterRedirect.tsx', // redirect
      'services/web-neture/src/pages/auth/OAuthCallbackPage.tsx', // oauth · callback
      'services/web-neture/src/pages/HandoffPage.tsx', // handoff
      'services/web-neture/src/lib/authClient.tsx', // lib
      'packages/auth-client/src/LoginButton.tsx', // auth-client 는 표현층 패키지 아님
      'apps/api-server/src/modules/auth/Login.tsx', // backend
    ]) {
      assert.equal(isAuthPresentationCandidate(f), false, f);
    }
  });

  it('P7 민감 구문 정규식 — 표현 줄은 통과, 의미 줄은 걸린다', () => {
    for (const line of ['<h1 className="text-2xl">로그인</h1>', '  <p>비밀번호를 잊으셨나요?</p>', '<div className="flex gap-2">']) {
      assert.equal(AUTH_SENSITIVE_CONSTRUCT.test(line), false, line);
    }
    for (const line of [
      "localStorage.setItem('x', y)", 'const token = res.data', "document.cookie = 'a'", '<input type="password" />',
      'await authClient.api.post(url)', "navigate('/admin')", 'window.location.href = next', "import { x } from './y'",
      'if (user.role === "admin")', '<div dangerouslySetInnerHTML={{ __html: h }} />', 'onSubmit={handle}', 'loginWithGoogle(idToken)',
      'refreshSession()', 'returnUrl', 'const r = await fetch(u)',
      // 동작 배선 · 상태 (replay fc02334fd)
      'onStart={() => setError(null)}', '<button onClick={go}>', 'setLoading(true);', 'const [a, b] = useState(0);',
    ]) {
      assert.equal(AUTH_SENSITIVE_CONSTRUCT.test(line), true, line);
    }
  });
});

describe('N. §27 downgrade 금지 축 — 원문이 표현층처럼 보여도 LEVEL_3', () => {
  const trivial = { base: 'const a = 1;', head: 'const a = 2;' };
  for (const [label, path, rule] of [
    ['auth-client token/session', 'packages/auth-client/src/client.ts', 'auth-package'],
    ['auth-utils credential', 'packages/auth-utils/src/emailCredential.ts', 'secret-handling'],
    ['shared auth runtime(hook)', 'packages/auth-react/src/useServiceAuth.ts', 'auth-package'],
    ['backend auth', 'apps/api-server/src/modules/auth/controllers/email-auth.controller.ts', 'auth-backend'],
    ['session validation', 'apps/api-server/src/common/auth/password-session.policy.ts', 'auth-backend'],
    ['RBAC', 'apps/api-server/src/types/roles.ts', 'rbac'],
    ['frontend RBAC guard', 'services/web-neture/src/components/RoleGuard.tsx', 'rbac'],
    ['migration', 'apps/api-server/src/database/migrations/1790940000000-CreateDemoAccounts.ts', 'db-migration'],
    ['production DB write(job)', 'apps/api-server/src/jobs/retention-purge.job.ts', 'db-write-runtime'],
    ['secret handling', 'apps/api-server/src/env-loader.ts', 'secret-handling'],
  ]) {
    it(`N ${label} → LEVEL_3 (${rule})`, () => {
      const r = judge([{ path, ...trivial }]);
      assert.equal(r.risk_level, LEVEL_3);
      assert.ok(r.level3_hits.some((h) => h.rule === rule), `${rule}: ${JSON.stringify(r.level3_hits)}`);
      assert.equal(r.presentation_only.length, 0);
    });
  }
  it('N auth-frontend + rbac 동시 hit(화면 파일)은 표현층으로 내리지 않는다', () => {
    const path = 'services/web-neture/src/pages/LoginRoleGuard.tsx';
    assert.equal(judge([{ path, base: '<div className="a" />', head: '<div className="b" />' }]).risk_level, LEVEL_3);
  });
});

describe('G. non-runtime global (§12 · §13)', () => {
  const noDeploy = (paths) => {
    const r = assessRisk(paths.map((p) => ({ status: 'M', path: p })), graph, {});
    assert.equal(r.deploy_required, false, `${paths}: ${JSON.stringify(r.affected_services)}`);
    assert.equal(r.risk_level, LEVEL_1);
  };
  it('G1 .gitignore only → 배포 0 · LEVEL_1', () => noDeploy(['.gitignore']));
  it('G2 docs only → 배포 0', () => noDeploy(['docs/checks/CHECK-X.md', 'docs/baseline/X.md']));
  it('G3 root 문서(README · AGENTS · CLAUDE · SETUP · CHANGELOG) → API 포함 배포 0', () =>
    noDeploy(['README.md', 'AGENTS.md', 'CLAUDE.md', 'SETUP.md', 'CHANGELOG.md']));
  it('G4 로컬 도구 메타데이터(.claude · .playwright-mcp · .idx · .editorconfig · *.cmd) → 배포 0', () =>
    noDeploy(['.claude/commands/handoff.md', '.playwright-mcp/x.xlsx', '.idx/dev.nix', '.editorconfig', 'gcloud.cmd', '.lighthouserc.json', 'sonar-project.properties']));
  it('G5 CI control only → 배포 0', () => noDeploy(['.github/workflows/delivery.yml', 'scripts/ci/deploy-risk.mjs']));
  it('G6 unknown global(매핑 없는 새 root 경로) → 전 서비스 fallback 유지', () => {
    const one = [{ status: 'M', path: 'newroot/runtime.ts' }];
    assert.equal(classifyApiDeploy(one, graph, {}).api_deploy_affected, true);
    const w = classifyWebDeploy(one, graph, {});
    assert.ok(WEB_KEYS.every((k) => w.services[k] === true));
    assert.equal(classifyAdminDeploy(one, graph, {}).admin_deploy_affected, true);
  });
  it('G7 빌드 컨텍스트 · checkout · generated · env 는 non-runtime 아님', () => {
    for (const f of ['.dockerignore', '.gcloudignore', '.gitattributes', '_generated/x.ts', '.env.example', 'vite.config.shared.ts', 'tsconfig.packages.json']) {
      assert.equal(isNonRuntimeGlobal(f), false, f);
    }
    // 하위 디렉터리의 .gitignore 는 root 가 아니다 — 서비스 귀속(workspace 판정) 그대로
    assert.equal(isNonRuntimeGlobal('services/web-neture/.gitignore'), false);
    // 문서 경로는 classifier 의 docs/ 중립 prefix 가 맡는다 — 이 목록은 root 경로만
    assert.equal(isNonRuntimeGlobal('docs/README.md'), false);
    assert.equal(isNonRuntimeGlobal('README.md'), true);
  });
});

describe('K. API ↔ 프런트 의존 근거 (§14)', () => {
  const TARGET = 'f'.repeat(40);
  const BASE = 'b'.repeat(40);
  const C = (n) => String(n).repeat(40).slice(0, 40);
  const NETURE_FILE = 'services/web-neture/src/pages/HomePage.tsx';
  const API_FILE = 'apps/api-server/src/services/ai-tools/work-agent-runtime.ts';
  function setup(commits) {
    const bySha = new Map(commits.map((c) => [c.sha, c]));
    const history = {
      firstParentCommits: () => ({ ok: true, commits: commits.map((c) => c.sha) }),
      parent: (sha) => `p${sha.slice(1)}`,
      workKeys: (sha) => new Set(bySha.get(sha)?.keys ?? []),
      originOf: () => null,
    };
    const provider = {
      changedFiles: (_p, sha) => (bySha.has(sha) ? { ok: true, files: bySha.get(sha).files.map((p) => ({ status: 'M', path: p })) } : { ok: false }),
      readLock: () => undefined,
    };
    const entry = { serving_sha: BASE, status: 'BEHIND', deploy_required: true, level: LEVEL_2, level3: [], rollout_pending: false, reasons: [] };
    const per = Object.fromEntries(DEPLOY_TARGETS.map((t) => [t.key, t.key === 'api' || t.key === 'neture' ? { ...entry } : { ...entry, deploy_required: false }]));
    return computeApiDependency(TARGET, per, graph, { history, provider });
  }
  it('K1 키 없는 .gitignore commit 은 의존 근거가 아니다 (e242fc800 형태)', () => {
    const deps = setup([
      { sha: C(1), files: [API_FILE], keys: ['WO-A-V1'] },
      { sha: C(2), files: ['.gitignore'], keys: [] },
      { sha: C(3), files: [NETURE_FILE], keys: ['WO-B-V1'] },
    ]);
    assert.equal(deps.neture.dependent, false, deps.neture.reason);
  });
  it('K2 키 없는 root README · CI control commit 도 근거가 아니다', () => {
    const deps = setup([
      { sha: C(1), files: [API_FILE], keys: ['WO-A-V1'] },
      { sha: C(2), files: ['README.md', '.github/workflows/delivery.yml'], keys: [] },
      { sha: C(3), files: [NETURE_FILE], keys: ['WO-B-V1'] },
    ]);
    assert.equal(deps.neture.dependent, false, deps.neture.reason);
  });
  it('K3 API contract(공유 types)를 같은 commit 에서 바꾸면 의존 유지', () => {
    const deps = setup([
      { sha: C(1), files: [API_FILE, 'packages/types/src/index.ts', NETURE_FILE], keys: ['WO-A-V1'] },
    ]);
    assert.equal(deps.neture.dependent, true);
  });
  it('K4 같은 WO 키의 분할 commit 은 의존 유지', () => {
    const deps = setup([
      { sha: C(1), files: [API_FILE], keys: ['WO-A-V1'] },
      { sha: C(2), files: [NETURE_FILE], keys: ['WO-A-V1'] },
    ]);
    assert.equal(deps.neture.dependent, true);
  });
});
