#!/usr/bin/env node
/**
 * WO-O4O-CICD-SAFE-AUTODEPLOY-AND-RISK-GATE-V1 — 배포 위험 판정기 (Phase 2 · 3 · shadow)
 *
 * 근거: docs/investigations/CHECK-O4O-CICD-PRODUCTION-DEPLOY-CENSUS-AND-SIMPLIFICATION-V1.md
 *
 * 질문은 하나다 — "지금 production 이 서빙 중인 SHA 에서 target SHA 로 가면 무엇이 바뀌고, 얼마나 위험한가."
 *
 *   1. 기준은 `event.before..HEAD` 가 아니라 **서비스별 serving SHA → target SHA** 다.
 *      main 에 쌓였지만 아직 배포되지 않은 변경(release train)을 전부 본다.
 *   2. 서비스 영향 판정은 기존 SSOT(`detect-affected.mjs` 의 classifyApiDeploy · classifyWebDeploy)를
 *      그대로 쓰고, Admin 배포 축만 여기서 추가한다 (기존 `admin_affected` 는 CI 축이라 `.github/**` 에도 참이다).
 *   3. 위에 **risk_level** 을 얹는다.
 *        LEVEL_1  runtime 무영향 (배포 없음)
 *        LEVEL_2  일반 runtime (향후 자동 배포 대상)
 *        LEVEL_3  고위험 (자동 배포 금지 · 통제 배포)
 *   4. 판정 불가는 **전부 위험한 쪽**이다 — serving SHA 불명 · serving 이 target 의 조상이 아님 ·
 *      traffic 이 여러 revision 에 나뉨 · git diff 실패 → 해당 서비스 LEVEL_3.
 *
 * 이 스크립트는 **shadow 전용**이다. 어떤 배포도 막거나 허용하지 않고 기록만 한다(항상 exit 0).
 *
 * 사용법
 *   node scripts/ci/deploy-risk.mjs --base <sha> --head <sha>            # 한 diff 를 판정 (PR · 과거 commit 재현)
 *   node scripts/ci/deploy-risk.mjs --files-from <file>                  # "STATUS\tpath" 목록 (fixture)
 *   node scripts/ci/deploy-risk.mjs --target <sha> --serving <json>      # 서비스별 serving SHA 기준 shadow 판정
 *   node scripts/ci/deploy-risk.mjs --target <sha> --serving-from-gcloud # 위와 같되 Cloud Run 을 read-only 조회
 *     공통 옵션: --json <out.json>  --ci-green true|false  --freeze true|false
 */

import { spawnSync } from 'node:child_process';
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEPLOY_WORKFLOWS, analyzeWorkflowChange } from './deploy-workflow-diff.mjs';
import {
  REPO_ROOT,
  WEB_SERVICES,
  buildWorkspaceGraph,
  classifyApiDeploy,
  classifyWebDeploy,
  dependencyClosure,
  isNonRuntimeGlobal,
  lockfileDeployImpact,
  parseFileList,
  readChangedFiles,
  workspaceDirOf,
} from './detect-affected.mjs';

// ---------------------------------------------------------------------------
// 배포 대상 registry — deploy-*.yml 의 Cloud Run 서비스와 1:1
// ---------------------------------------------------------------------------

const PROJECT_ID = 'netureyoutube';
const REGION = 'asia-northeast3';
const AR = `${REGION}-docker.pkg.dev/${PROJECT_ID}/o4o-api`;

/** web key → Cloud Run 서비스 이름 (deploy-web-services.yml 의 `gcloud run deploy <name>`) */
const WEB_CLOUD_RUN = {
  neture: 'neture-web',
  'kpa-society': 'kpa-society-web',
  'pharmacy-hub': 'pharmacy-hub-web',
  lecture: 'lecture-web',
  store: 'store-web',
  'kpa-branch': 'kpa-branch-web',
  'hospital-pharmacy': 'hospital-pharmacy-web',
};

export const DEPLOY_TARGETS = [
  { key: 'api', service: 'o4o-core-api', image: `${AR}/api-server`, workflow: 'deploy-api.yml' },
  { key: 'admin', service: 'o4o-admin-dashboard', image: `${AR}/admin-dashboard`, workflow: 'deploy-admin.yml' },
  ...WEB_SERVICES.map((svc) => ({
    key: svc.key,
    service: WEB_CLOUD_RUN[svc.key],
    image: `gcr.io/${PROJECT_ID}/${WEB_CLOUD_RUN[svc.key]}`,
    workflow: 'deploy-web-services.yml',
  })),
];

/** 배포 시 revision 에 남기는 commit label 키 (Cloud Run label 규칙: 소문자 · 63자 이하) */
export const COMMIT_LABEL = 'o4o-commit-sha';

export const LEVEL_1 = 'LEVEL_1';
export const LEVEL_2 = 'LEVEL_2';
export const LEVEL_3 = 'LEVEL_3';
const RANK = { [LEVEL_1]: 1, [LEVEL_2]: 2, [LEVEL_3]: 3 };
export const maxLevel = (...levels) => levels.reduce((a, b) => (RANK[b] > RANK[a] ? b : a), LEVEL_1);

// ---------------------------------------------------------------------------
// runtime 무영향 파일 (LEVEL_1 기여)
// ---------------------------------------------------------------------------

/**
 * 배포 산출물(이미지)에 들어가지 않는 파일.
 *   - 테스트 · 테스트 설정 · 목(mock)
 *   - Markdown (docs 밖의 패키지 README 포함 — 번들 대상이 아니다)
 *   - `apps/api-server/src/scripts/**` — tsconfig.build 제외 · tsup entry(main · migrate) 밖 · Dockerfile COPY 밖.
 *     운영 CLI 이므로 **실행**은 원래 사용자 승인 대상(CLAUDE.md DB 경계)이며 advisory 로 기록한다.
 * docs/** · .github 의 CI workflow · scripts/** 등은 기존 classifier 가 이미 중립으로 본다.
 */
const NON_RUNTIME_PATTERNS = [
  /(^|\/)__tests__\//,
  /(^|\/)__mocks__\//,
  /(^|\/)__snapshots__\//,
  /\.(spec|test)\.[cm]?[jt]sx?$/,
  /(^|\/)(jest|vitest|playwright)\.config\.[a-z]+$/,
  /\.md$/i,
  /^apps\/api-server\/tests\//,
];
export const API_OPERATIONAL_SCRIPTS = 'apps/api-server/src/scripts/';

export function isNonRuntimeFile(file) {
  if (file.startsWith(API_OPERATIONAL_SCRIPTS)) return true;
  return NON_RUNTIME_PATTERNS.some((re) => re.test(file));
}

// ---------------------------------------------------------------------------
// Admin 배포 축 — Admin Docker 이미지가 바뀌는가
// ---------------------------------------------------------------------------

const ADMIN_PACKAGE = '@o4o/admin-dashboard';
const ADMIN_DEPLOY_WORKFLOW = '.github/workflows/deploy-admin.yml';
/** deploy-admin.yml 의 on.paths 중 root build 입력 (census) */
const ADMIN_ROOT_BUILD_INPUTS = new Set(['package.json', 'pnpm-workspace.yaml', '.npmrc', 'tsconfig.base.json', 'tsconfig.packages.json']);
const ADMIN_BUILD_ACTION = '.github/actions/setup-build-env/';
const ADMIN_NEUTRAL_PREFIXES = ['.github/', 'scripts/', 'tools/', 'e2e/', '.husky/', 'docs/'];

export function classifyAdminDeploy(changedFiles, graph, opts = {}) {
  if (!Array.isArray(changedFiles) || changedFiles.length === 0) {
    return { admin_deploy_affected: true, reasons: ['변경 파일 0건 — 판정 불가, Admin 배포 fallback'] };
  }
  const closure = dependencyClosure(graph, ADMIN_PACKAGE);
  const importers = new Set(['.']);
  for (const name of closure) {
    const dir = graph.byName.get(name)?.dir;
    if (dir) importers.add(dir);
  }
  const reasons = [];
  let affected = false;
  const hit = (reason) => {
    affected = true;
    reasons.push(reason);
  };
  for (const { path: file } of changedFiles) {
    if (file === 'pnpm-lock.yaml') {
      let verdict;
      try {
        verdict = lockfileDeployImpact(opts.readLock?.('base'), opts.readLock?.('head'), importers);
      } catch (err) {
        verdict = { affected: true, reason: `pnpm-lock.yaml 판정 예외 — 안전 fallback (${err.message})` };
      }
      if (verdict.affected) hit(`admin: ${verdict.reason}`);
      else reasons.push(`admin: ${verdict.reason}`);
      continue;
    }
    if (file === ADMIN_DEPLOY_WORKFLOW) { hit(`admin deploy workflow 자체: ${file}`); continue; }
    if (file.startsWith(ADMIN_BUILD_ACTION)) { hit(`admin 빌드 composite action: ${file}`); continue; }
    if (ADMIN_ROOT_BUILD_INPUTS.has(file)) { hit(`admin root build 입력: ${file}`); continue; }
    if (/^[^/]+\.md$/.test(file)) continue;
    if (ADMIN_NEUTRAL_PREFIXES.some((p) => file.startsWith(p))) continue;
    if (isNonRuntimeGlobal(file)) continue;
    const wsDir = workspaceDirOf(graph, file);
    if (!wsDir) { hit(`admin 판정 불가(workspace 매핑 없음) — 안전 fallback: ${file}`); continue; }
    const pkgName = graph.byDir.get(wsDir);
    if (closure.has(pkgName)) hit(`admin closure ${pkgName}: ${file}`);
  }
  return { admin_deploy_affected: affected, reasons };
}

// ---------------------------------------------------------------------------
// LEVEL_3 규칙 — 실제 저장소 경로 · 파일 의미 근거 (CHECK 문서 §E)
// ---------------------------------------------------------------------------

const API = 'apps/api-server/';
const API_SRC = 'apps/api-server/src/';
const basename = (p) => p.slice(p.lastIndexOf('/') + 1);
const isFrontendSource = (p) => /^services\/[^/]+\/src\//.test(p) || p.startsWith('apps/admin-dashboard/src/');
const isBackendOrPackage = (p) => p.startsWith(API) || p.startsWith('packages/');

/**
 * 인증 · 로그인 · 토큰 교환을 가리키는 이름. `Author*` 는 제외한다.
 * handoff 는 **인증 handoff(토큰 교환)** 만 — 콘텐츠 handoff(`supplier-library-handoff`)는 인증이 아니다(replay 오탐 실측).
 */
const AUTH_NAME = /(Auth(?!or)|(^|[^a-z])auth(?!or)|[Ll]ogin|OAuth|oauth|[Ss]ign-?[Ii]n|[Ss]ign-?[Uu]p|handoff-token|handoffToken|HandoffToken|^handoff\.|HandoffPage|[Pp]assword)/;
/** 역할 · 권한 · 멤버십(= 접근 부여) · scope. replay 미탐(`role-revoke-safety` · `MembershipConsoleController`) 반영. */
const RBAC_NAME = /(rbac|RBAC|[Pp]ermission|(^|[^a-z])role|Role|scope-?guard|ScopeGuard|service-scopes?|ServiceScope|[Mm]embership|operator-role)/;
/** frontend 의 역할 판정 상수 · 가드. 화면 문구 수준의 role 언급은 제외한다. */
const FRONTEND_RBAC_NAME = /(RoleGuard|roleGuard|rbac|RBAC|role-?constants|roleConstants|RoleConstants)/;
const PAYMENT_NAME = /(payment|Payment|refund|Refund|toss|Toss|settlement|Settlement|checkout|Checkout)/;
const SECRET_NAME = /(crypto|Crypto|secret|Secret|credential|Credential|encrypt|Encrypt)/;

/**
 * 각 규칙: { id, category, test(file, status) }.
 * 경로 규칙은 prefix/정확 일치, 이름 규칙은 basename 에만 건다 (디렉터리 이름 오탐 방지).
 */
export const LEVEL3_RULES = [
  // ── DB schema · migration ──────────────────────────────────────────────
  {
    id: 'db-migration',
    category: 'DB migration',
    test: (f) =>
      f.startsWith(`${API_SRC}database/migrations/`) ||
      f.startsWith(`${API_SRC}database/incremental/`) ||
      f.startsWith(`${API_SRC}database/bootstrap/`) ||
      /^packages\/[^/]+\/src\/(.*\/)?migrations\//.test(f),
  },
  {
    id: 'db-migration-runner',
    category: 'DB migration',
    test: (f) =>
      f === `${API_SRC}migrate.ts` ||
      f === `${API_SRC}database/connection.ts` ||
      f === `${API_SRC}database/data-source.ts` ||
      f === `${API_SRC}database/migration-config.ts`,
  },
  // ── production DB write 가 배포로 자동 실행되는 경로 ─────────────────────
  {
    id: 'db-write-runtime',
    category: 'production DB write',
    // 스케줄 job(예: 개인정보 보유기간 실삭제) · runtime seed 는 배포만으로 운영 데이터를 바꾼다.
    test: (f) => f.startsWith(`${API_SRC}jobs/`) || (f.startsWith(API_SRC) && /seed/i.test(basename(f))),
  },
  // ── 인증 · 로그인 · 토큰 ────────────────────────────────────────────────
  {
    id: 'auth-backend',
    category: 'auth',
    test: (f) =>
      f.startsWith(`${API_SRC}auth/`) ||
      f.startsWith(`${API_SRC}common/auth/`) ||
      f.startsWith(`${API_SRC}common/middleware/auth/`) ||
      f.startsWith(`${API_SRC}modules/auth/`) ||
      f.startsWith(`${API_SRC}services/auth/`) ||
      f === `${API_SRC}config/google-identity.config.ts` ||
      f === `${API_SRC}types/auth.ts` ||
      // session: 세션 · 로그인 origin 판정(replay 미탐: utils/session-origin.ts — 773d6c54c)
      (f.startsWith(API_SRC) && (/token|session/i.test(basename(f)) || AUTH_NAME.test(basename(f)))),
  },
  {
    id: 'auth-package',
    category: 'auth',
    test: (f) => /^packages\/(auth-client|auth-context|auth-core|auth-react|auth-utils|security-core)\//.test(f),
  },
  {
    id: 'auth-frontend',
    category: 'auth',
    test: (f) => isFrontendSource(f) && (/(^|\/)(auth|oauth|login|sso|handoff)\//i.test(f) || AUTH_NAME.test(basename(f))),
  },
  // ── 권한 · RBAC ─────────────────────────────────────────────────────────
  {
    id: 'rbac',
    category: 'RBAC / permission',
    test: (f) =>
      f === `${API_SRC}types/roles.ts` ||
      f === `${API_SRC}config/operator-role-catalog.ts` ||
      f === `${API_SRC}config/service-scopes.ts` ||
      f.startsWith('packages/types/src/auth/') ||
      (isBackendOrPackage(f) && RBAC_NAME.test(basename(f))) ||
      (isFrontendSource(f) && FRONTEND_RBAC_NAME.test(basename(f))),
  },
  // ── 접근 제어 계층 (backend request gate) ─────────────────────────────────
  {
    id: 'access-control-layer',
    category: 'RBAC / permission',
    // middleware · guard 는 요청이 어떤 권한으로 통과하는지를 정한다 (identity · scope · rate limit · validation 포함).
    // replay 미탐: `modules/neture/middleware/neture-identity.middleware.ts` · `supplier-context.resolver.ts`.
    test: (f) => f.startsWith(API_SRC) && /(^|\/)(middleware|guards?)\//.test(f.slice(API_SRC.length)),
  },
  // ── secret · credential ─────────────────────────────────────────────────
  {
    id: 'secret-handling',
    category: 'secret / credential',
    test: (f) => f === `${API_SRC}env-loader.ts` || (isBackendOrPackage(f) && SECRET_NAME.test(basename(f))),
  },
  // ── 결제 민감 runtime (COMMERCE-BOUNDARY) ─────────────────────────────────
  {
    id: 'payment',
    category: 'payment-sensitive runtime',
    test: (f) => f.startsWith('packages/payment-core/') || (f.startsWith(API_SRC) && PAYMENT_NAME.test(f.slice(API_SRC.length))),
  },
  // ── 빌드 · 인프라 (artifact 를 바꾼다) ────────────────────────────────────
  // WO-O4O-CICD-CI-GATE-STABILIZATION-AND-RISK-DETECTOR-REFINEMENT-V1:
  //   deploy workflow 파일은 여기서 통째로 L3 로 보지 않는다 — deploy-workflow-diff.mjs 가 job/줄 단위로
  //   control · build · config · rollout 을 가른다. ci-gate · deploy-risk 같은 판정/게이트 스크립트는 control
  //   (artifact · 설정 불변). rollout 방식 파일은 ROLLOUT_MECHANISM 으로 따로 다룬다.
  {
    id: 'deploy-infra',
    category: 'Cloud infrastructure / build input',
    test: (f) =>
      f.startsWith('.github/actions/setup-build-env/') ||
      f.startsWith('.github/actions/setup-node-safe/') ||
      f.startsWith('infra/') ||
      /(^|\/)Dockerfile[^/]*$/.test(f) ||
      /(^|\/)nginx[^/]*\.conf$/.test(f) ||
      f === `${API}package.production.json`,
  },
  // ── 서비스 삭제 ─────────────────────────────────────────────────────────
  {
    id: 'service-deletion',
    category: 'service deletion',
    test: (f, status) =>
      status === 'D' && (/^services\/[^/]+\/(package\.json|Dockerfile)$/.test(f) || /^apps\/[^/]+\/(package\.json|Dockerfile)$/.test(f)),
  },
];

export function matchLevel3(file, status = 'M') {
  const hits = LEVEL3_RULES.filter((r) => r.test(file, status));
  return hits.length > 0 ? hits.map((r) => ({ rule: r.id, category: r.category, file })) : [];
}

/**
 * rollout 방식(트래픽 전환 · env 주입 해석) — artifact · runtime 설정을 바꾸지 않는다.
 * 바뀌어도 **배포가 필요하지 않다.** 다만 이 서비스들의 **다음 배포**는 바뀐 방식으로 처음 도는 것이므로 통제(L3).
 */
export const ROLLOUT_MECHANISM = [
  { match: (f) => f === 'scripts/ci/cloud-run-rollout.mjs', services: 'all' },
  { match: (f) => f.startsWith('.github/actions/cloud-run-verified-rollout/'), services: 'web+admin' },
  { match: (f) => f === 'scripts/ci/cloud-run-env.mjs', services: ['api'] },
];
/** 판정 · 게이트 · 기록만 하는 파일 — 배포 결과에 영향 없음 */
export const CONTROL_ONLY = new Set([
  'scripts/ci/ci-gate.mjs',
  'scripts/ci/deploy-risk.mjs',
  'scripts/ci/deploy-workflow-diff.mjs',
  '.github/workflows/cd-risk-gate-shadow.yml', // cutover 로 deploy-auto.yml 에 흡수(삭제) — 삭제도 control
  'scripts/ci/deploy-orchestrate.mjs',
  '.github/workflows/deploy-auto.yml',
  // WO-O4O-CICD-UNIFIED-DELIVERY-PIPELINE-V1 — 판정 · 오케스트레이션(reusable 호출 · 승인 진입점). artifact · runtime 설정 불변.
  //   실제 build · deploy · rollout 줄은 deploy-*.yml 에 남아 deploy-workflow-diff 가 그대로 분석한다.
  '.github/workflows/delivery.yml',
  '.github/workflows/promote.yml',
]);

/**
 * 위험을 **없애는** 삭제 (WO §10 · §11).
 * 삭제된 DB write 진입점은 실행 경로를 제거한다. 단 같은 diff 에 같은 규칙의 추가/수정 파일이 있으면
 * (이동 · rename 우회 가능성) downgrade 하지 않는다. migration · auth · RBAC · middleware 삭제는 대상이 아니다
 * — guard/middleware 삭제는 오히려 접근을 여는 변경일 수 있다.
 */
export const RISK_REDUCING_DELETE_RULES = new Set(['db-write-runtime']);

/**
 * 로그인 화면 표현층 (WO-O4O-CICD-PRODUCTION-STATE-RECONCILIATION-AND-LEVEL3-RULE-PRECISION-V1 §9 · §10 · §11).
 *
 * 대상은 **이름 · 경로만으로 auth 로 잡힌 화면 컴포넌트**뿐이다:
 *   - `auth-frontend` (서비스 · admin 화면)  ·  `auth-package` 중 `packages/auth-react/src/` 의 컴포넌트
 *   - auth-client · auth-core · auth-context · auth-utils · security-core 는 전부 token · session · credential 축 — 대상 아님
 *   - backend auth · RBAC · access-control · secret · migration · payment 규칙이 하나라도 함께 걸리면 대상 아님
 *   - hook(use*) · Context · Provider · Guard · client · api · token · session · storage · handoff · callback · redirect 파일은 대상 아님
 * 그리고 **바뀐 줄(추가 + 삭제) 전부**가 아래 민감 구문을 하나도 갖지 않아야 한다. 결정적 정규식이며 AI 판정이 아니다.
 * 과탐(L3 유지)은 허용, 미탐은 금지 — 애매한 단어는 민감 쪽에 둔다.
 */
export const PRESENTATION_ELIGIBLE_RULES = new Set(['auth-frontend', 'auth-package']);
const PRESENTATION_EXT = /\.(tsx|jsx|css|scss|less)$/;
const PRESENTATION_EXCLUDED_DIR = /(^|\/)(contexts?|hooks|lib|api|services|stores?|utils|providers?|guards?|middleware|config)\//;
const PRESENTATION_EXCLUDED_NAME =
  /(^use[A-Z]|Context|Provider|Guard|[Cc]lient|(^|[^a-z])[Aa]pi[A-Z.]|[Tt]oken|[Ss]ession|[Ss]torage|[Hh]andoff|[Cc]allback|[Rr]edirect|[Oo][Aa]uth|[Ss]so[A-Z.])/;

export function isAuthPresentationCandidate(file) {
  if (!PRESENTATION_EXT.test(file)) return false;
  if (!(isFrontendSource(file) || file.startsWith('packages/auth-react/src/'))) return false;
  const rel = file.startsWith('packages/auth-react/src/') ? file.slice('packages/auth-react/src/'.length) : file.replace(/^.*?\/src\//, '');
  return !PRESENTATION_EXCLUDED_DIR.test(rel) && !PRESENTATION_EXCLUDED_NAME.test(basename(file));
}

/** 바뀐 줄에 하나라도 있으면 표현층이 아니다 — token · session · credential · 요청 · 이동 · 권한 · 실행 · 모듈 경계 */
export const AUTH_SENSITIVE_CONSTRUCT = new RegExp(
  [
    // 저장소 · 토큰 · 세션 · 자격정보
    'localStorage', 'sessionStorage', 'indexedDB', '[Cc]ookie', '[Tt]oken', '[Ss]ession', '[Cc]redential', '[Ss]ecret',
    '[Pp]ass(word|wd|code)', '\\bOTP\\b', '\\botp\\b', '[Pp]in[Cc]ode',
    // identity provider · 토큰 교환
    '[Oo][Aa]uth', '[Gg]oogle', '[Kk]akao', '[Nn]aver', '[Aa]pple', 'Authorization', 'Bearer', '[Hh]andoff', '[Ii]dentity',
    // 요청 · 인증 동작
    '\\bfetch\\s*\\(', 'axios', 'XMLHttpRequest', '\\.api\\b', '[Cc]lient\\b', '[Cc]lient\\.', '\\.(get|post|put|patch|delete)\\s*\\(',
    '\\blogin', '\\bLogin[A-Z(]', 'signup', 'signUp', 'signIn', 'signin', 'signOut', 'logout', 'logOut', '[Rr]efresh',
    'adoptSession', 'setUser', 'checkAuth', 'useAuth', 'useServiceAuth', 'onSubmit', 'handleSubmit',
    // 동작 배선 · 상태 — 표현층은 문구 · 스타일 · 마크업뿐이다 (replay: fc02334fd `onStart={() => setError(null)}` 는 동작 변경)
    '\\bon[A-Z]\\w*\\s*=', '\\bset[A-Z]\\w*\\s*\\(', '\\buse[A-Z]\\w*\\s*\\(', '=>', '\\bawait\\b', '\\basync\\b', '\\bfunction\\b',
    // 이동 · 창 · 외부 실행
    '[Rr]edirect', 'return(Url|To|Path)', 'window\\.', 'location\\.', 'navigate', '<Navigate', 'history\\.', 'postMessage',
    // 권한
    '\\b[Rr]oles?\\b', '[Pp]ermission', '[Ss]cope', '[Mm]embership', 'isAdmin', 'isPlatform', 'isOperator', '[Gg]uard',
    // 실행 · 주입
    'dangerouslySetInnerHTML', 'innerHTML', '\\beval\\s*\\(', 'new Function', '[Cc]rypto', '[Ee]ncrypt', '[Hh]ash',
    // 모듈 경계 · 환경 — 새 의존 · 새 export 는 의미 변경일 수 있다
    '\\bimport\\b', '\\brequire\\s*\\(', '\\bexport\\b', 'process\\.env', 'import\\.meta',
  ].join('|'),
);

const DIFF_CELL_LIMIT = 4_000_000;
/**
 * 파일의 바뀐 줄(추가 + 삭제, 공백만 다른 줄 제외 안 함). LCS 기반 — 줄 이동도 변경으로 잡는다.
 * 원문을 못 읽거나 diff 가 너무 크면 null (호출부는 L3 유지).
 */
export function changedLinesOf(status, file, readFile) {
  if (typeof readFile !== 'function') return null;
  const base = status === 'A' ? '' : readFile('base', file);
  const head = status === 'D' ? '' : readFile('head', file);
  if (typeof base !== 'string' || typeof head !== 'string') return null;
  const a = base === '' ? [] : base.split(/\r?\n/);
  const b = head === '' ? [] : head.split(/\r?\n/);
  if ((a.length + 1) * (b.length + 1) > DIFF_CELL_LIMIT) return null;
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i -= 1) {
    for (let j = m - 1; j >= 0; j -= 1) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  }
  const out = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { i += 1; j += 1; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) out.push(a[i++]);
    else out.push(b[j++]);
  }
  while (i < n) out.push(a[i++]);
  while (j < m) out.push(b[j++]);
  return out;
}

// ---------------------------------------------------------------------------
// 한 diff 판정
// ---------------------------------------------------------------------------

/**
 * @param {{status: string, path: string}[]} changedFiles
 * @returns {{
 *   deploy_required: boolean, risk_level: string, affected_services: string[],
 *   services: Record<string, {affected: boolean, level: string, reasons: string[], level3: object[]}>,
 *   level3_hits: object[], pipeline_hits: object[], advisories: string[], non_runtime_files: number, changed_files: number
 * }}
 */
export function assessRisk(changedFiles, graph, opts = {}) {
  const services = Object.fromEntries(
    DEPLOY_TARGETS.map((t) => [t.key, { affected: false, level: LEVEL_1, reasons: [], level3: [], rollout: [] }]),
  );
  const base = {
    deploy_required: false,
    risk_level: LEVEL_1,
    affected_services: [],
    services,
    level3_hits: [],
    pipeline_hits: [],
    risk_reducing: [],
    presentation_only: [],
    advisories: [],
    non_runtime_files: 0,
    changed_files: Array.isArray(changedFiles) ? changedFiles.length : 0,
  };
  if (!Array.isArray(changedFiles) || changedFiles.length === 0) {
    return { ...base, advisories: ['변경 파일 0건 — 배포할 변경 없음'] };
  }

  const webKeys = WEB_SERVICES.map((s) => s.key);
  const runtime = [];
  const workflowFiles = [];
  const rolloutFiles = [];
  for (const f of changedFiles) {
    if (isNonRuntimeFile(f.path)) {
      base.non_runtime_files += 1;
      if (f.path.startsWith(API_OPERATIONAL_SCRIPTS)) {
        base.advisories.push(`운영 CLI 변경(이미지 밖 · 실행은 별도 승인): ${f.path}`);
      }
      continue;
    }
    if (CONTROL_ONLY.has(f.path)) {
      base.advisories.push(`판정/게이트 전용 변경 — 배포 무영향: ${f.path}`);
      continue;
    }
    if (DEPLOY_WORKFLOWS[f.path]) {
      workflowFiles.push(f);
      continue;
    }
    const mech = ROLLOUT_MECHANISM.find((m) => m.match(f.path));
    if (mech) {
      rolloutFiles.push({ f, mech });
      continue;
    }
    runtime.push(f);
  }

  // ── deploy workflow: job/줄 단위 의미 분석 ────────────────────────────────
  //   분석 성공 → 서비스별 build(artifact) / config(설정, L3) / rollout(방식) / control(무영향)
  //   원문 불가 · 신규 · 삭제 → 종전처럼 classifier 에 넘겨 전 서비스 판정 + deploy-config L3 (보수)
  const workflowEffects = [];
  for (const f of workflowFiles) {
    const analysis =
      f.status === 'A' || f.status === 'D'
        ? null
        : analyzeWorkflowChange(f.path, opts.readFile?.('base', f.path), opts.readFile?.('head', f.path), {
            webKeys,
            consumes: opts.consumes,
          });
    if (!analysis) {
      runtime.push(f);
      base.advisories.push(`workflow 의미 분석 불가 — 보수 판정: ${f.path}`);
      workflowEffects.push({ file: f.path, fallback: true });
      continue;
    }
    workflowEffects.push({ file: f.path, analysis });
  }

  // LEVEL_3 hit 는 runtime 파일에만 건다 (테스트 · 문서는 위험이 아니다).
  const hitsByFile = new Map();
  for (const f of runtime) {
    const hits = matchLevel3(f.path, f.status);
    if (DEPLOY_WORKFLOWS[f.path]) hits.push({ rule: 'deploy-config', category: 'Cloud infrastructure / deploy config', file: f.path });
    if (hits.length > 0) hitsByFile.set(f.path, { status: f.status, hits });
  }
  // 위험 감소 삭제 — 같은 규칙의 추가/수정이 없을 때만 (이동 우회 방지)
  for (const [file, entry] of [...hitsByFile]) {
    if (entry.status !== 'D') continue;
    const keep = entry.hits.filter((h) => {
      if (!RISK_REDUCING_DELETE_RULES.has(h.rule)) return true;
      const replaced = [...hitsByFile].some(([p, e]) => p !== file && e.status !== 'D' && e.hits.some((x) => x.rule === h.rule));
      if (replaced) return true;
      base.risk_reducing.push({ ...h, note: '삭제 — 실행 경로 제거 · 대체 진입점 없음' });
      return false;
    });
    if (keep.length === 0) hitsByFile.delete(file);
    else entry.hits = keep;
  }
  // 로그인 화면 표현층 (WO-O4O-CICD-PRODUCTION-STATE-RECONCILIATION-AND-LEVEL3-RULE-PRECISION-V1 §9 D · §10 C)
  //   auth 이름/경로 규칙에만 걸린 **화면 컴포넌트**이고, 바뀐 줄 전부에 민감 구문이 없을 때만 LEVEL_2 로 둔다.
  //   원문을 못 읽거나(rename · 공급자 없음) diff 가 크면 그대로 LEVEL_3 (fail-closed).
  for (const [file, entry] of [...hitsByFile]) {
    if (!entry.hits.every((h) => PRESENTATION_ELIGIBLE_RULES.has(h.rule)) || !isAuthPresentationCandidate(file)) continue;
    const changed = changedLinesOf(entry.status, file, opts.readFile);
    if (!changed) continue;
    const sensitive = changed.find((line) => AUTH_SENSITIVE_CONSTRUCT.test(line));
    if (sensitive !== undefined) continue;
    hitsByFile.delete(file);
    base.presentation_only.push({ file, rules: entry.hits.map((h) => h.rule), changed_lines: changed.length });
    base.advisories.push(`로그인 화면 표현층만 변경(민감 구문 0 · ${changed.length}줄) — LEVEL_3 아님: ${file}`);
  }
  base.level3_hits = [...hitsByFile.values()].flatMap((v) => v.hits);

  const hasWorkflowEffect = workflowEffects.length > 0 || rolloutFiles.length > 0;
  if (runtime.length === 0 && !hasWorkflowEffect) {
    base.advisories.unshift('runtime 파일 변경 없음 (테스트 · 문서 · 운영 CLI · 판정 스크립트 만)');
    return base;
  }

  if (runtime.length > 0) {
    const api = classifyApiDeploy(runtime, graph, opts);
    const web = classifyWebDeploy(runtime, graph, opts);
    const admin = classifyAdminDeploy(runtime, graph, opts);
    services.api.affected = api.api_deploy_affected;
    services.api.reasons = api.reasons.filter((r) => !/무영향/.test(r));
    services.admin.affected = admin.admin_deploy_affected;
    services.admin.reasons = admin.reasons;
    for (const svc of WEB_SERVICES) {
      services[svc.key].affected = web.services[svc.key] === true;
      services[svc.key].reasons = web.reasons.filter((r) => r.startsWith(`${svc.key}`) || /전 서비스/.test(r));
    }
  }

  // workflow 분석 결과 반영
  for (const eff of workflowEffects) {
    if (!eff.analysis) continue;
    for (const [key, a] of Object.entries(eff.analysis)) {
      const s = services[key];
      if (!s) continue;
      for (const n of a.notes) s.reasons.push(n);
      if (a.build.length > 0) {
        s.affected = true;
        s.reasons.push(`build 입력 변경 (${eff.file}): ${a.build.slice(0, 3).join(' | ')}`);
      }
      if (a.config.length > 0) {
        s.affected = true;
        s.reasons.push(`배포 설정 변경 (${eff.file}): ${a.config.slice(0, 3).join(' | ')}`);
        s.level3.push({ rule: 'deploy-config', category: 'Cloud infrastructure / deploy config', file: eff.file, detail: a.config.slice(0, 5) });
      }
      if (a.auth.length > 0) {
        s.level3.push({ rule: 'auth-build-input', category: 'auth', file: eff.file, detail: a.auth.slice(0, 5) });
      }
      if (a.rollout.length > 0) s.rollout.push(`${eff.file}: ${a.rollout.slice(0, 3).join(' | ')}`);
      if (a.control > 0 && a.build.length + a.config.length + a.rollout.length === 0 && a.notes.length === 0) {
        s.reasons.push(`control-only 변경 ${a.control}건 (${eff.file}) — 배포 무영향`);
      }
    }
  }
  for (const { f, mech } of rolloutFiles) {
    const keys = mech.services === 'all' ? DEPLOY_TARGETS.map((t) => t.key) : mech.services === 'web+admin' ? [...webKeys, 'admin'] : mech.services;
    for (const k of keys) services[k].rollout.push(f.path);
  }
  base.level3_hits.push(...Object.values(services).flatMap((s) => s.level3.filter((h) => h.rule === 'deploy-config' || h.rule === 'auth-build-input')));

  // LEVEL_3 hit 를 서비스에 귀속한다 — 그 파일 하나만으로 해당 서비스가 영향받는가.
  // 어느 서비스에도 귀속되지 않는 배포 기계 변경(pipeline)은 영향받는 **모든** 서비스의 다음 배포를 통제한다.
  const noLock = {};
  for (const [file, { status, hits }] of hitsByFile) {
    const one = [{ status, path: file }];
    const touched = [];
    if (classifyApiDeploy(one, graph, noLock).api_deploy_affected) touched.push('api');
    if (classifyAdminDeploy(one, graph, noLock).admin_deploy_affected) touched.push('admin');
    const w = classifyWebDeploy(one, graph, noLock);
    for (const svc of WEB_SERVICES) if (w.services[svc.key]) touched.push(svc.key);
    if (touched.length === 0) {
      base.pipeline_hits.push(...hits);
      continue;
    }
    for (const key of touched) services[key].level3.push(...hits);
  }

  for (const [key, s] of Object.entries(services)) {
    if (!s.affected) {
      // artifact · 설정 불변 — rollout 방식만 바뀌었으면 배포는 필요 없고, 다음 배포에서만 통제된다.
      if (s.rollout.length > 0) s.reasons.push('rollout 방식만 변경 — 배포 불필요 · 다음 배포 1회는 통제(L3)');
      continue;
    }
    s.level = s.level3.length > 0 || base.pipeline_hits.length > 0 || s.rollout.length > 0 ? LEVEL_3 : LEVEL_2;
    if (s.level3.length === 0 && base.pipeline_hits.length > 0) {
      s.reasons.push('배포 기계 변경 이후 첫 배포 — 통제 배포 대상');
    }
    if (s.level3.length === 0 && s.rollout.length > 0) {
      s.reasons.push(`rollout 방식 변경 이후 첫 배포 — 통제 배포 대상 (${s.rollout[0]})`);
    }
    base.affected_services.push(key);
  }
  base.deploy_required = base.affected_services.length > 0;
  base.risk_level = maxLevel(
    ...Object.values(services).map((s) => (s.affected ? s.level : LEVEL_1)),
    base.level3_hits.length > 0 ? LEVEL_3 : LEVEL_1,
  );
  return base;
}

// ---------------------------------------------------------------------------
// serving SHA → target SHA (서비스별)
// ---------------------------------------------------------------------------

const SHA40 = /^[0-9a-f]{40}$/;

const gitRun = (args, cwd = REPO_ROOT) => spawnSync('git', args, { cwd, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });

/** 실제 git 기반 diff 공급자 — 테스트는 이것을 주입 대체한다. */
export const gitDiffProvider = {
  exists: (sha) => gitRun(['cat-file', '-e', `${sha}^{commit}`]).status === 0,
  isAncestor: (a, b) => gitRun(['merge-base', '--is-ancestor', a, b]).status === 0,
  changedFiles: (base, head) => readChangedFiles(base, head),
  readLock: (rev) => {
    const out = gitRun(['show', `${rev}:pnpm-lock.yaml`]);
    return out.status === 0 ? out.stdout : undefined;
  },
  readFile: (rev, file) => {
    const out = gitRun(['show', `${rev}:${file}`]);
    return out.status === 0 ? out.stdout : undefined;
  },
  consumesAt: (rev, graph) => consumesFactory(rev, graph),
};

/**
 * build-arg 소비 판정 (WO §9) — "그 ARG 이름을 서비스 소스(자기 + workspace closure)가 읽는가".
 * 정적 분석은 하지 않는다: 이름이 runtime 파일에 한 번이라도 나오면 소비로 본다(보수).
 * Dockerfile(`ARG` · `ENV` 선언)과 테스트는 소비가 아니다. git 실패 = null(모름 → 소비로 취급).
 */
export function consumesFactory(rev, graph) {
  return (argName, serviceKey) => {
    const svc = WEB_SERVICES.find((s) => s.key === serviceKey);
    if (!svc || !/^[A-Z][A-Z0-9_]*$/.test(argName)) return null;
    const name = graph.byDir.get(svc.dir);
    const dirs = new Set([svc.dir]);
    for (const pkg of name ? dependencyClosure(graph, name) : []) {
      const d = graph.byName.get(pkg)?.dir;
      if (d) dirs.add(d);
    }
    const out = gitRun(['grep', '-l', '-w', argName, rev, '--', ...dirs]);
    if (out.status !== 0 && out.status !== 1) return null;
    const files = out.stdout
      .split(/\r?\n/)
      .filter(Boolean)
      .map((l) => l.slice(l.indexOf(':') + 1))
      .filter((p) => !/(^|\/)Dockerfile[^/]*$/.test(p) && !isNonRuntimeFile(p) && !/\.env(\.|$)/.test(p));
    return files.length > 0;
  };
}

/**
 * 서비스별 판정.
 * @param {string} target
 * @param {Record<string, {sha: string|null, source: string, revision?: string, ambiguous?: boolean}>} serving
 */
export function assessServingGap(target, serving, graph, provider = gitDiffProvider) {
  const perService = {};
  const cache = new Map(); // serving sha → assessRisk 결과 (여러 서비스가 같은 SHA 를 서빙하는 경우 재사용)

  for (const t of DEPLOY_TARGETS) {
    const s = serving?.[t.key] ?? { sha: null, source: 'missing' };
    const entry = { serving_sha: s.sha ?? null, serving_source: s.source ?? 'missing', revision: s.revision ?? null };
    const fail = (reason) => ({ ...entry, status: 'UNKNOWN', deploy_required: true, level: LEVEL_3, reasons: [reason], level3: [] });

    if (!SHA40.test(target ?? '')) {
      perService[t.key] = fail(`target SHA 형식 오류 (${target})`);
      continue;
    }
    if (s.ambiguous) {
      perService[t.key] = fail('traffic 이 여러 revision 에 나뉘어 serving SHA 가 하나가 아님 — 안전 fallback');
      continue;
    }
    if (!s.sha || !SHA40.test(s.sha)) {
      perService[t.key] = fail(`serving SHA 판정 불가 (${s.source ?? 'missing'}) — 안전 fallback`);
      continue;
    }
    if (s.sha === target) {
      perService[t.key] = { ...entry, status: 'UP_TO_DATE', deploy_required: false, level: LEVEL_1, reasons: ['serving SHA == target'], level3: [] };
      continue;
    }
    if (!provider.exists(s.sha)) {
      perService[t.key] = fail(`serving SHA ${s.sha.slice(0, 9)} 가 저장소 이력에 없음 — 안전 fallback`);
      continue;
    }
    if (!provider.isAncestor(s.sha, target)) {
      perService[t.key] = fail(`serving SHA ${s.sha.slice(0, 9)} 가 target 의 조상이 아님 — 배포하면 서빙 중 변경이 되돌려질 수 있음`);
      continue;
    }
    if (!cache.has(s.sha)) {
      const read = provider.changedFiles(s.sha, target);
      if (!read.ok) {
        cache.set(s.sha, { error: read.reason });
      } else {
        const revOf = (which) => (which === 'base' ? s.sha : target);
        const opts = {
          readLock: (which) => provider.readLock(revOf(which)),
          readFile: provider.readFile ? (which, file) => provider.readFile(revOf(which), file) : undefined,
          consumes: provider.consumesAt ? provider.consumesAt(target, graph) : undefined,
        };
        cache.set(s.sha, { result: assessRisk(read.files, graph, opts), files: read.files.length });
      }
    }
    const got = cache.get(s.sha);
    if (got.error) {
      perService[t.key] = fail(`git diff 실패 — ${got.error}`);
      continue;
    }
    const svc = got.result.services[t.key];
    perService[t.key] = {
      ...entry,
      status: svc.affected ? 'BEHIND' : 'BEHIND_NO_RUNTIME_CHANGE',
      deploy_required: svc.affected,
      level: svc.affected ? svc.level : LEVEL_1,
      changed_files: got.files,
      reasons: svc.reasons.slice(0, 8),
      level3: svc.level3.concat(svc.affected ? got.result.pipeline_hits : []),
      rollout_pending: svc.rollout.length > 0,
      risk_reducing: got.result.risk_reducing.slice(0, 5),
      advisories: got.result.advisories.slice(0, 5),
    };
  }
  return perService;
}

/**
 * 요약용 결정 (CLI · 로컬 확인). 실제 enforcement 결정의 정본은 deploy-orchestrate.mjs `decideAll`
 * (WO-O4O-CICD-DEPLOY-FREEZE-CUTOVER-V1 — API 의존 규칙 · target==main HEAD 포함).
 */
export function wouldBeDecision(entry, { ciGreen, freeze }) {
  if (!entry.deploy_required) return 'NO_DEPLOY';
  if (ciGreen !== true) return 'BLOCKED_CI_NOT_GREEN';
  if (freeze === true) return 'BLOCKED_DEPLOY_FREEZE';
  if ((entry.level3 ?? []).length === 0 && entry.rollout_pending) return 'CONTROLLED_FIRST_ROLLOUT_REQUIRED';
  if (entry.level === LEVEL_3) return 'BLOCKED_HIGH_RISK_CONTROLLED_DEPLOY_REQUIRED';
  return 'AUTO_DEPLOY_WITH_REVISION_SMOKE';
}

export function summarizeShadow({ target, perService, ciGreen, freeze }) {
  const services = Object.entries(perService).map(([key, e]) => ({
    key,
    ...e,
    would_be: wouldBeDecision(e, { ciGreen, freeze }),
  }));
  const affected = services.filter((s) => s.deploy_required).map((s) => s.key);
  return {
    mode: 'shadow',
    timestamp: new Date().toISOString(),
    target_sha: target,
    ci_green: ciGreen,
    deploy_freeze: freeze,
    risk_level: maxLevel(...services.filter((s) => s.deploy_required).map((s) => s.level)),
    deploy_required: affected.length > 0,
    affected_services: affected,
    services,
  };
}

// ---------------------------------------------------------------------------
// Cloud Run serving state (read-only)
// ---------------------------------------------------------------------------

const gcloudJson = (args, run) => {
  const out = run('gcloud', [...args, `--project=${PROJECT_ID}`, `--region=${REGION}`, '--format=json']);
  if (out.status !== 0) return { ok: false, error: (out.stderr || '').trim().slice(0, 300) };
  try {
    return { ok: true, value: JSON.parse(out.stdout || 'null') };
  } catch (err) {
    return { ok: false, error: `JSON parse 실패: ${err.message}` };
  }
};

const defaultRun = (cmd, args) => spawnSync(cmd, args, { encoding: 'utf-8', maxBuffer: 32 * 1024 * 1024, shell: process.platform === 'win32' });

/**
 * 서비스 1개의 serving SHA.
 *   1순위 revision label `o4o-commit-sha` (이 WO 이후 배포부터 기록)
 *   2순위 revision 이미지 digest → registry 태그 중 40자 hex (gcr · web/admin 에서 동작 실측)
 *   실패 → sha null (호출자가 LEVEL_3 fallback)
 * 쓰기 명령 0 — describe · list-tags 만.
 */
export function readServingSha(target, run = defaultRun) {
  const svc = gcloudJson(['run', 'services', 'describe', target.service], run);
  if (!svc.ok) return { sha: null, source: `service describe 실패: ${svc.error}` };
  const serving = (svc.value?.status?.traffic ?? []).filter((t) => (t.percent ?? 0) > 0);
  if (serving.length === 0) return { sha: null, source: 'traffic 0 revision' };
  const revs = [...new Set(serving.map((t) => t.revisionName).filter(Boolean))];
  if (revs.length !== 1) return { sha: null, source: `serving revision ${revs.length}개`, ambiguous: revs.length > 1 };
  const revision = revs[0];
  const rev = gcloudJson(['run', 'revisions', 'describe', revision], run);
  if (!rev.ok) return { sha: null, source: `revision describe 실패: ${rev.error}`, revision };
  const label = rev.value?.metadata?.labels?.[COMMIT_LABEL];
  if (label && SHA40.test(label)) return { sha: label, source: 'revision-label', revision };
  const image = rev.value?.spec?.containers?.[0]?.image ?? '';
  const at = image.indexOf('@sha256:');
  if (at === -1) return { sha: null, source: `이미지 digest 없음 (${image})`, revision };
  const repo = image.slice(0, at);
  const digest = image.slice(at + 1);
  const tags = run('gcloud', ['container', 'images', 'list-tags', repo, `--filter=digest=${digest}`, '--format=value(tags)']);
  const shaTag = (tags.stdout || '').split(/[,\s]+/).find((x) => SHA40.test(x));
  if (shaTag) return { sha: shaTag, source: 'registry-tag', revision };
  return { sha: null, source: 'label 없음 · digest 에 SHA 태그 없음 (multi-arch index 등)', revision };
}

export function collectServingState(run = defaultRun) {
  return Object.fromEntries(DEPLOY_TARGETS.map((t) => [t.key, readServingSha(t, run)]));
}

// ---------------------------------------------------------------------------
// 출력
// ---------------------------------------------------------------------------

function renderDiffReport(label, r) {
  const lines = [
    `### 배포 위험 판정 — ${label}`,
    '',
    `- risk_level: **${r.risk_level}** · deploy_required: **${r.deploy_required}** · affected: ${r.affected_services.join(', ') || '(없음)'}`,
    `- changed files: ${r.changed_files} (runtime 무영향 ${r.non_runtime_files})`,
  ];
  for (const h of r.level3_hits.slice(0, 25)) lines.push(`  - LEVEL_3 \`${h.rule}\` (${h.category}): \`${h.file}\``);
  for (const a of r.advisories.slice(0, 10)) lines.push(`  - note: ${a}`);
  return lines.join('\n');
}

function renderShadowReport(s) {
  const lines = [
    '### 🕶 Deploy risk gate — SHADOW (배포 결정에 사용하지 않음)',
    '',
    `- target: \`${s.target_sha}\` · CI green: **${s.ci_green}** · DEPLOY_FREEZE: ${s.deploy_freeze} · 현재 게이트: ${s.current_gate}`,
    `- risk_level: **${s.risk_level}** · deploy_required: **${s.deploy_required}** · affected: ${s.affected_services.join(', ') || '(없음)'}`,
    '',
    '| service | serving SHA (source) | status | level | would-be (enforcement 시) |',
    '|---|---|---|---|---|',
  ];
  for (const e of s.services) {
    lines.push(
      `| ${e.key} | ${e.serving_sha ? e.serving_sha.slice(0, 9) : '—'} (${e.serving_source}) | ${e.status} | ${e.level} | ${e.would_be} |`,
    );
  }
  lines.push('');
  for (const e of s.services.filter((x) => x.level === LEVEL_3)) {
    const first = e.level3?.[0];
    lines.push(`- **${e.key}** LEVEL_3: ${first ? `\`${first.rule}\` \`${first.file}\`` : e.reasons[0]}`);
  }
  return lines.join('\n');
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}

const bool = (v) => (v === true || v === 'true' ? true : v === 'false' ? false : null);

function main() {
  const args = parseArgs(process.argv.slice(2));
  const graph = buildWorkspaceGraph();
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  let report;
  let text;

  if (args.target) {
    const serving = args['serving-from-gcloud'] ? collectServingState() : JSON.parse(readFileSync(args.serving, 'utf-8'));
    const perService = assessServingGap(args.target, serving, graph);
    report = summarizeShadow({
      target: args.target,
      perService,
      ciGreen: bool(args['ci-green']),
      freeze: bool(args.freeze) === true,
    });
    report.serving = serving;
    text = renderShadowReport(report);
  } else {
    let files;
    let label;
    let opts = {};
    if (args['files-from']) {
      files = parseFileList(readFileSync(args['files-from'], 'utf-8'));
      label = args['files-from'];
    } else {
      const read = readChangedFiles(args.base, args.head);
      if (!read.ok) {
        console.error(`DEPLOY_RISK_UNKNOWN: ${read.reason}`);
        report = { risk_level: LEVEL_3, deploy_required: true, error: read.reason };
        if (args.json) writeFileSync(args.json, JSON.stringify(report, null, 2));
        return;
      }
      files = read.files;
      label = `${String(args.base).slice(0, 9)}..${String(args.head).slice(0, 9)}`;
      const revOf = (which) => (which === 'base' ? args.base : args.head);
      opts = {
        readLock: (which) => gitDiffProvider.readLock(revOf(which)),
        readFile: (which, file) => gitDiffProvider.readFile(revOf(which), file),
        consumes: gitDiffProvider.consumesAt(args.head, graph),
      };
    }
    report = assessRisk(files, graph, opts);
    report.label = label;
    text = renderDiffReport(label, report);
  }

  console.log(text);
  console.log('');
  console.log(`risk_level=${report.risk_level}`);
  console.log(`deploy_required=${report.deploy_required}`);
  console.log(`affected_services=${(report.affected_services ?? []).join(',')}`);
  if (args.json) writeFileSync(args.json, JSON.stringify(report, null, 2));
  if (summaryFile) appendFileSync(summaryFile, `${text}\n`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(
      process.env.GITHUB_OUTPUT,
      [
        `risk_level=${report.risk_level}`,
        `deploy_required=${report.deploy_required}`,
        `affected_services=${(report.affected_services ?? []).join(',')}`,
        '',
      ].join('\n'),
    );
  }
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
