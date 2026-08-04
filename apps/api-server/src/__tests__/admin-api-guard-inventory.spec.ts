/**
 * 관리자 API guard 누락 회귀 테스트 (저장소 전역 인벤토리)
 *
 * 배경
 * ────
 * `main.ts` 는 `/api/v1` 에 전역 인증 미들웨어를 걸지 않는다. 등록되는 것은 `globalErrorHandler` 뿐이다.
 * 따라서 **라우터 내부(또는 mount 지점) guard 가 유일한 방어선**이고, 관례를 한 번 빠뜨리면
 * 그 순간 관리자 API 가 무인증 공개된다. 실제로 `/api/v1/service-admin` 8개 endpoint 와
 * membership 잔여 4 subtree 16개 endpoint 가 이 방식으로 경계 밖에 남아 있었다.
 *   - `WO-O4O-SERVICE-ADMIN-API-GUARD-EMERGENCY-V1`
 *   - `WO-O4O-MEMBERSHIP-RESIDUAL-SUBTREE-GUARD-V1`
 *
 * 선행 두 WO 의 테스트는 **각자 고친 subtree 안에서만** 순서와 전수를 고정한다.
 * 이 spec 은 그 위 계층 — `register-routes.ts` 에 새로 mount 되는 **모든** 관리자 API 가
 * guard 없이 추가되면 실패하도록 저장소 전역을 고정한다.
 *
 * 방식
 * ────
 * 정적 분석이다. DB·네트워크·express 부팅이 없다. `register-routes.ts` 의 mount 를 전부 뽑아
 * 관리자 성격 경로만 남기고, 각 binding 을 실제 라우터 소스 파일까지 해석한 뒤
 * 인증(authentication)·인가(authorization) 두 축이 모두 덮여 있는지 본다.
 *
 * 중요: **해석 실패는 통과가 아니라 실패로 처리한다.** mount 표기법이 새로 생겨
 * 스캐너가 못 읽으면 조용히 넘어가는 대신 테스트가 깨져야 한다. 그래야 이 테스트가
 * "보이는 것만 검사하는" 상태로 썩지 않는다.
 */

import fs from 'fs';
import path from 'path';

const API_SERVER_SRC = path.resolve(__dirname, '..');
const REGISTER_ROUTES = path.join(API_SERVER_SRC, 'bootstrap', 'register-routes.ts');

/** 관리자 성격으로 판정할 mount 경로 패턴. */
const ADMIN_PATH = /\/(admin|operator|service-admin)(\/|$)/;

/** 인증 축 — 요청자가 누구인지 확정하는 미들웨어. */
const AUTHN = /\b(authenticate|authenticateToken|authenticateCookie|requireAuth)\b/;

/**
 * 인가 축 — 확정된 요청자가 관리 행위를 할 수 있는지 판정하는 미들웨어.
 *
 * `requireAuth` 는 인증 전용이므로 제외한다. 나머지 `requireXxx` 계열은 인가로 본다.
 *
 * 인가 미들웨어는 인증도 함께 만족한다 — `requireAdmin`·`requireRole` 은 `req.user` 가 없으면
 * `requireAuth(req, res, next)` 로 위임해 401 을 돌려준다
 * (`common/middleware/auth/authorization.middleware.ts:42`, `:106`).
 * 따라서 `requireAdmin` 단독 사용은 guard 누락이 아니다.
 */
const AUTHZ = /\brequire(?!Auth\b)[A-Z][A-Za-z]*\b|\b(adminOnly|checkPermission)\b/;

/**
 * mount 지점에서 이미 보호되어 라우터 소스에 guard 가 없는 것이 정상인 경로.
 * `registerMembershipAdminGuards(app)` 가 mount 앞에 등록되는 membership 패턴이 여기 해당한다.
 * 새 항목을 넣으려면 왜 mount 지점 보호가 맞는지 근거를 함께 적는다.
 */
const MOUNT_LEVEL_GUARDED: ReadonlyArray<{ path: string; reason: string }> = [
  // 현재는 없음. membership 은 `/api/v1/membership` 이라 ADMIN_PATH 에 잡히지 않으며
  // 별도 spec(`membership-admin-guard.spec.ts` · `membership-residual-subtree-guard.spec.ts`)이 덮는다.
];

/**
 * 미들웨어가 아니라 **handler 내부**에서 인가를 검사하는, 문서화된 예외.
 *
 * 미들웨어 방식보다 약하다 — 라우터에 endpoint 를 추가하는 사람이 검사를 빠뜨리기 쉽고,
 * 정적으로 확인할 수도 없다. 그래서 여기 적힌 것만 통과시키고 나머지는 실패시킨다.
 * 목록이 늘어나는 것은 개선이 아니라 후퇴이므로, 새 항목을 넣기 전에 미들웨어로 옮길 수 있는지 먼저 본다.
 */
const HANDLER_LEVEL_AUTHZ: ReadonlyArray<{ path: string; reason: string }> = [
  {
    path: '/api/admin/orders',
    reason:
      'AdminOrderController 가 5개 handler 전부에서 `isAdmin(user)` 를 직접 검사한다 ' +
      '(controllers/admin/adminOrderController.ts:22). 라우터에는 `authenticate` 만 있다. ' +
      '단 이 검사는 `user.roles` 를 읽으므로 role_assignments SSOT 와 경로가 다르다 — 미들웨어 통일은 후속 과제.',
  },
];

interface Mount {
  urlPath: string;
  binding: string;
  line: number;
}

interface ResolvedMount extends Mount {
  moduleSpecifier: string | null;
  file: string | null;
  authn: boolean;
  authz: boolean;
  /** 라우터 수준 guard 로 덮였는지 (신규 endpoint 가 자동 상속되는 형태인지) */
  routerLevel: boolean;
  /** 인증/인가가 빠진 채 선언된 endpoint */
  uncoveredEndpoints: string[];
}

function readRegisterRoutes(): string {
  return fs.readFileSync(REGISTER_ROUTES, 'utf8');
}

/** import 바인딩 이름 → 모듈 specifier. static·dynamic import 를 모두 수집한다. */
function collectBindings(source: string): Map<string, string> {
  const bindings = new Map<string, string>();

  const addNamed = (clause: string, mod: string) => {
    clause
      .split(',')
      .map((entry) => entry.split(/\s+as\s+/).pop()!.split(':').pop()!.trim())
      .filter(Boolean)
      .forEach((name) => bindings.set(name, mod));
  };

  // static import — default / named / 혼합, 여러 줄 허용
  for (const match of source.matchAll(/import\s+([\s\S]+?)\s+from\s+'([^']+)';/g)) {
    const clause = match[1].trim().replace(/^type\s+/, '');
    const mod = match[2];
    const mixed = /^([A-Za-z0-9_$]+)\s*,\s*\{([\s\S]*)\}$/.exec(clause);
    if (mixed) {
      bindings.set(mixed[1], mod);
      addNamed(mixed[2], mod);
      continue;
    }
    const namedOnly = /^\{([\s\S]*)\}$/.exec(clause);
    if (namedOnly) {
      addNamed(namedOnly[1], mod);
      continue;
    }
    if (/^[A-Za-z0-9_$]+$/.test(clause)) bindings.set(clause, mod);
  }

  // dynamic import — `const { x } = await import('...')`
  for (const match of source.matchAll(/const\s+\{([^}]+)\}\s*=\s*await\s+import\(\s*'([^']+)'\s*\)/g)) {
    addNamed(match[1], match[2]);
  }
  // dynamic import — `const ns = await import('...')`
  for (const match of source.matchAll(/const\s+([A-Za-z0-9_$]+)\s*=\s*await\s+import\(\s*'([^']+)'\s*\)/g)) {
    bindings.set(match[1], match[2]);
  }

  return bindings;
}

/** `const adminOpsMetricsRoutes = createAdminOpsMetricsRoutes(dataSource)` 형태의 지역 별칭. */
function collectLocalAliases(source: string): Map<string, string> {
  const aliases = new Map<string, string>();
  for (const match of source.matchAll(/const\s+([A-Za-z0-9_$]+)\s*=\s*([A-Za-z0-9_$]+)\s*\(/g)) {
    aliases.set(match[1], match[2]);
  }
  return aliases;
}

function collectMounts(source: string): Mount[] {
  const mounts: Mount[] = [];
  for (const match of source.matchAll(/app\.use\(\s*'(\/api[^']*)'\s*,\s*([A-Za-z0-9_$]+)/g)) {
    mounts.push({
      urlPath: match[1],
      binding: match[2],
      line: source.slice(0, match.index).split('\n').length,
    });
  }
  return mounts;
}

function resolveModuleFile(moduleSpecifier: string | null): string | null {
  if (!moduleSpecifier || !moduleSpecifier.startsWith('.')) return null;
  const base = path.normalize(path.join(API_SERVER_SRC, 'bootstrap', moduleSpecifier)).replace(/\.js$/, '');
  for (const candidate of [`${base}.ts`, path.join(base, 'index.ts')]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * 라우터 소스에서 endpoint 선언을 뽑아 각각의 미들웨어 인자 구간을 돌려준다.
 * 여러 줄 선언을 다루기 위해 `router.verb(` 부터 handler 시작 지점까지를 인자 구간으로 본다.
 */
function extractEndpoints(source: string): Array<{ label: string; middlewareArgs: string }> {
  const endpoints: Array<{ label: string; middlewareArgs: string }> = [];
  const declRe = /\b[A-Za-z0-9_$]*[Rr]outer\.(get|post|put|patch|delete)\(/g;
  let match: RegExpExecArray | null;
  while ((match = declRe.exec(source))) {
    const start = match.index + match[0].length;
    const tail = source.slice(start, start + 1200);
    // handler 가 시작하기 전까지가 미들웨어 인자 구간이다.
    const handlerAt = tail.search(/\(?\s*async\s*\(|\bfunction\s*\(|\(\s*req\s*[,:)]|=>\s*\{|[A-Za-z0-9_$.]+Controller\./);
    const middlewareArgs = handlerAt >= 0 ? tail.slice(0, handlerAt) : tail.slice(0, 300);
    const pathLiteral = /^\s*['`]([^'`]*)['`]/.exec(tail);
    const line = source.slice(0, match.index).split('\n').length;
    endpoints.push({
      label: `L${line} ${match[1].toUpperCase()} ${pathLiteral ? pathLiteral[1] : '?'}`,
      middlewareArgs,
    });
  }
  return endpoints;
}

/**
 * `const manageGuard = requireServiceLegalScope('operator')` 처럼 인가 미들웨어를 지역 변수에 담아
 * 재사용하는 패턴이 흔하다. 그 변수 이름들을 인가 토큰으로 함께 인정한다.
 */
function collectAuthzAliases(source: string): string[] {
  const aliases: string[] = [];
  for (const match of source.matchAll(/const\s+([A-Za-z0-9_$]+)\s*(?::[^=]+)?=\s*([^;\n]+)/g)) {
    if (AUTHZ.test(match[2])) aliases.push(match[1]);
  }
  return aliases;
}

function analyzeRouterFile(file: string): Pick<ResolvedMount, 'authn' | 'authz' | 'routerLevel' | 'uncoveredEndpoints'> {
  const source = fs.readFileSync(file, 'utf8');

  const aliases = collectAuthzAliases(source);
  const aliasRe = aliases.length > 0 ? new RegExp(`\\b(${aliases.join('|')})\\b`) : null;
  const hasAuthz = (text: string) => AUTHZ.test(text) || (aliasRe !== null && aliasRe.test(text));

  const routerUseLines = source
    .split('\n')
    .filter((line) => /^\s*[A-Za-z0-9_$]*[Rr]outer\.use\(/.test(line))
    .join('\n');

  const routerAuthn = AUTHN.test(routerUseLines);
  const routerAuthz = hasAuthz(routerUseLines);

  const endpoints = extractEndpoints(source);
  // 인가 미들웨어는 인증도 만족하므로(위 AUTHZ 주석) endpoint 단위 판정은 인가 하나로 충분하다.
  const uncovered = endpoints
    .filter(({ middlewareArgs }) => !(routerAuthz || hasAuthz(middlewareArgs)))
    .map((e) => e.label);

  return {
    authn: routerAuthn || routerAuthz || (endpoints.length > 0 && endpoints.every((e) => AUTHN.test(e.middlewareArgs) || hasAuthz(e.middlewareArgs))),
    authz: routerAuthz || (endpoints.length > 0 && endpoints.every((e) => hasAuthz(e.middlewareArgs))),
    routerLevel: (routerAuthn || routerAuthz) && routerAuthz,
    uncoveredEndpoints: uncovered,
  };
}

function buildInventory(): ResolvedMount[] {
  const source = readRegisterRoutes();
  const bindings = collectBindings(source);
  const aliases = collectLocalAliases(source);

  return collectMounts(source)
    .filter((mount) => ADMIN_PATH.test(mount.urlPath))
    .map((mount) => {
      let binding = mount.binding;
      if (!bindings.has(binding) && aliases.has(binding)) binding = aliases.get(binding)!;
      const moduleSpecifier = bindings.get(binding) ?? null;
      const file = resolveModuleFile(moduleSpecifier);

      if (!file) {
        return {
          ...mount,
          moduleSpecifier,
          file: null,
          authn: false,
          authz: false,
          routerLevel: false,
          uncoveredEndpoints: [],
        };
      }
      return { ...mount, moduleSpecifier, file, ...analyzeRouterFile(file) };
    });
}

/** 실패 메시지를 사람이 바로 고칠 수 있는 형태로 만든다. */
function describe_(mount: ResolvedMount): string {
  return `${mount.urlPath} (register-routes.ts:${mount.line}, binding=${mount.binding}, file=${mount.file ?? mount.moduleSpecifier ?? '해석 실패'})`;
}

describe('관리자 API guard 인벤토리 — 신규 mount 가 guard 밖에 추가되면 실패한다', () => {
  const inventory = buildInventory();

  it('스캐너가 관리자 mount 를 실제로 찾아낸다 (파서 회귀 방지)', () => {
    // 정규식이 깨져 0건이 되면 아래 모든 단언이 공허하게 통과한다. 하한선을 둔다.
    // 이 값은 "현재 알려진 관리자 mount 수보다 작지 않다"는 의미일 뿐 고정 개수가 아니다.
    expect(inventory.length).toBeGreaterThanOrEqual(40);
  });

  it('모든 관리자 mount 의 라우터 소스를 해석할 수 있다 (해석 실패는 통과가 아니다)', () => {
    const unresolved = inventory.filter((m) => !m.file).map(describe_);
    expect(unresolved).toEqual([]);
  });

  const isExempt = (mount: ResolvedMount) =>
    MOUNT_LEVEL_GUARDED.some((allowed) => allowed.path === mount.urlPath) ||
    HANDLER_LEVEL_AUTHZ.some((allowed) => allowed.path === mount.urlPath);

  it('모든 관리자 mount 가 인증(authentication) guard 를 갖는다', () => {
    const missing = inventory.filter((m) => m.file && !m.authn).map(describe_);
    // 예외 경로도 인증은 반드시 미들웨어로 건다 — handler 내부 검사로 미룰 수 있는 것은 인가뿐이다.
    expect(missing).toEqual([]);
  });

  it('모든 관리자 mount 가 인가(authorization) guard 를 갖는다', () => {
    const missing = inventory
      .filter((m) => m.file && !m.authz)
      .filter((m) => !isExempt(m))
      .map(describe_);
    expect(missing).toEqual([]);
  });

  it('개별 endpoint 단위로도 인가가 빠진 곳이 없다', () => {
    const gaps = inventory
      .filter((m) => m.file && m.uncoveredEndpoints.length > 0)
      .filter((m) => !isExempt(m))
      .map((m) => `${describe_(m)} → ${m.uncoveredEndpoints.join(', ')}`);
    expect(gaps).toEqual([]);
  });

  it('예외 목록이 실제로 필요한 상태로 남아 있다 (죽은 예외를 방치하지 않는다)', () => {
    // 예외 경로가 나중에 미들웨어로 정상화되면 이 단언이 실패해 목록에서 지우도록 강제한다.
    const stale = [...MOUNT_LEVEL_GUARDED, ...HANDLER_LEVEL_AUTHZ]
      .filter((allowed) => {
        const mount = inventory.find((m) => m.urlPath === allowed.path);
        return mount === undefined || mount.authz;
      })
      .map((allowed) => allowed.path);
    expect(stale).toEqual([]);
  });

  it('선행 두 WO 가 고친 경로는 라우터 수준 guard 를 유지한다 (per-endpoint 로 되돌아가지 않는다)', () => {
    // 라우터 수준 guard 여야 이후 추가되는 endpoint 가 방어선을 자동 상속한다.
    const serviceAdmin = inventory.find((m) => m.urlPath === '/api/v1/service-admin');
    expect(serviceAdmin).toBeDefined();
    expect(serviceAdmin!.routerLevel).toBe(true);
  });
});

describe('전역 인증 부재라는 전제 자체를 고정한다', () => {
  it('`/api/v1` 에 전역 인증 미들웨어가 없다는 사실이 바뀌면 이 테스트의 전제를 재검토해야 한다', () => {
    const mainTs = path.join(API_SERVER_SRC, 'main.ts');
    const source = fs.readFileSync(mainTs, 'utf8');
    // `app.use('/api/v1', authenticate)` 같은 전역 인증이 생기면 여기서 감지된다.
    // 실패한다고 보안이 나빠진 것은 아니다 — 방어 구조가 바뀌었으니 이 spec 을 갱신하라는 신호다.
    const globalAuth = /app\.use\(\s*'\/api(\/v1)?'\s*,\s*[^)]*(authenticate|requireAuth)/.test(source);
    expect(globalAuth).toBe(false);
  });
});
