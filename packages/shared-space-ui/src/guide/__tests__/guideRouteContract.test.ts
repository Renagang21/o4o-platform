/**
 * Guide Route Contract Spec
 *
 * WO-O4O-GUIDE-STALE-ROUTE-AND-COPY-CONTRACT-CLEANUP-V1
 *
 * Guide copy(@o4o/shared-space-ui/guide/copy/*.ts)가 참조하는 내부 경로는
 * 해당 서비스의 실제 <Route> 정의와 일치해야 한다.
 *
 * 회귀 방지 대상:
 *   1) GlycoPharm 에 존재하지 않는 /store/commerce/products/b2c 참조 0
 *      (param route /store/:pharmacyId/products/:productId 에 흡수돼 오류 화면으로 떨어진다)
 *   2) K-Cosmetics legacy alias(/store/signage/playlist · /store/qr) 참조 0 — canonical 사용
 *   3) canonical signage route 문자열 존재
 *   4) Guide copy 의 모든 route 참조가 실제 route 와 매칭 (literal 또는 동형 param)
 *
 * route 표는 각 서비스 src 의 .tsx 를 정적 파싱해 구성한다(런타임 import 없음).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../../../..');

/** JSX <Route> 트리를 중첩 포함해 완전 경로 집합으로 파싱한다. */
function parseRoutes(src: string): Set<string> {
  const out = new Set<string>();
  const stack: string[] = [];
  let i = 0;
  while (i < src.length) {
    if (src.startsWith('</Route>', i)) {
      stack.pop();
      i += 8;
      continue;
    }
    if (!src.startsWith('<Route', i) || /[A-Za-z0-9]/.test(src[i + 6] ?? '')) {
      i += 1;
      continue;
    }
    // 속성 안의 element={<X />} 때문에 '>' 를 단순 검색하면 안 된다 — 중괄호 깊이를 센다.
    let j = i + 6;
    let depth = 0;
    let selfClose = false;
    for (; j < src.length; j += 1) {
      const c = src[j];
      if (c === '{') depth += 1;
      else if (c === '}') depth -= 1;
      else if (depth === 0 && c === '>') {
        selfClose = src[j - 1] === '/';
        break;
      }
    }
    const tag = src.slice(i + 6, j);
    const pm = /\bpath\s*=\s*"([^"]*)"/.exec(tag);
    const parent = stack.filter(Boolean).join('/');
    let next = parent;
    if (pm) {
      const p = pm[1];
      const full = (p.startsWith('/') ? p : `/${parent}/${p}`).replace(/\/+/g, '/');
      out.add(full.replace(/\/$/, '') || '/');
      next = full.replace(/^\//, '');
    }
    if (!selfClose) stack.push(next);
    i = j + 1;
  }
  return out;
}

function collectRoutes(dir: string): Set<string> {
  const out = new Set<string>();
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.tsx')) parseRoutes(readFileSync(p, 'utf-8')).forEach((r) => out.add(r));
    }
  };
  walk(dir);
  return out;
}

type Svc = { key: string; dir: string; copy: string; extra?: Array<[string, string]> };
const SERVICES: Svc[] = [
  {
    key: 'kpa',
    dir: 'services/web-kpa-society',
    copy: 'kpa.ts',
    // /operator/* 는 별도 sub-router 로 위임된다.
    extra: [['services/web-kpa-society/src/routes/OperatorRoutes.tsx', '/operator']],
  },
  { key: 'k-cosmetics', dir: 'services/web-k-cosmetics', copy: 'k-cosmetics.ts' },
  { key: 'glycopharm', dir: 'services/web-glycopharm', copy: 'glycopharm.ts' },
  { key: 'neture', dir: 'services/web-neture', copy: 'neture.ts' },
  // WO-O4O-PHARMACYHUB-GUIDE-ADOPTION-V1
  { key: 'pharmacy-hub', dir: 'services/web-pharmacy-hub', copy: 'pharmacy-hub.ts' },
];

const IGNORE = /^\/(types|api|http)/;

function routeTable(svc: Svc): Set<string> {
  const set = collectRoutes(join(ROOT, svc.dir, 'src'));
  for (const [file, prefix] of svc.extra ?? []) {
    parseRoutes(readFileSync(join(ROOT, file), 'utf-8')).forEach((r) =>
      set.add(`${prefix}${r}`.replace(/\/+/g, '/').replace(/\/$/, '')),
    );
  }
  return set;
}

function copySource(svc: Svc): string {
  return readFileSync(join(ROOT, 'packages/shared-space-ui/src/guide/copy', svc.copy), 'utf-8');
}

/** 주석(파일 경로 · 폐기 메모 등)은 사용자 노출 대상이 아니므로 참조 추출에서 제외한다. */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/**
 * `/operator/{docs, resources}` 형태의 묶음 routeLabel 을 개별 경로로 펼친다.
 * 펼치지 않으면 묶음 안의 stale segment 가 검사에서 빠진다.
 */
function expandBraces(text: string): string {
  return text.replace(/(\/[a-z][a-zA-Z0-9/_:-]*)\{([^}]*)\}/g, (_m, base: string, inner: string) =>
    inner
      .split(',')
      .map((part) => `${base}${part.trim()}`)
      .join(' '),
  );
}

function guideRefs(text: string): string[] {
  const found = expandBraces(text).match(/\/[a-z][a-zA-Z0-9/_:-]*/g) ?? [];
  return [...new Set(found.map((r) => r.replace(/\/$/, '')))].filter((r) => r.length > 1 && !IGNORE.test(r));
}

/** literal 일치 또는 동형 param 일치 · 또는 prefix label(`/store/commerce/*` → `/store/commerce`) */
function resolves(ref: string, routes: Set<string>): boolean {
  if (routes.has(ref)) return true;
  const rs = ref.replace(/^\//, '').split('/');
  for (const r of routes) {
    const xs = r.replace(/^\//, '').split('/');
    if (xs.length !== rs.length) continue;
    // param 흡수(예: /store/:pharmacyId/products/:productId 가 /store/commerce/products/b2c 를
    // 삼키는 경우)는 "존재"로 인정하지 않는다. 양쪽 param 위치가 같을 때만 일치로 본다.
    if (xs.every((x, k) => (x.startsWith(':') ? rs[k].startsWith(':') : x === rs[k]))) return true;
  }
  for (const r of routes) if (r.startsWith(`${ref}/`)) return true;
  return false;
}

describe('Guide route contract', () => {
  it.each(SERVICES.map((s) => [s.key, s] as const))(
    '%s — Guide copy 의 모든 route 참조가 실제 route 와 매칭된다',
    (_key, svc) => {
      const routes = routeTable(svc);
      expect(routes.size).toBeGreaterThan(50);
      const unresolved = guideRefs(stripComments(copySource(svc))).filter((r) => !resolves(r, routes));
      expect(unresolved).toEqual([]);
    },
  );

  it('GlycoPharm Guide 는 존재하지 않는 /store/commerce/products/b2c 를 참조하지 않는다', () => {
    const gp = copySource(SERVICES[2]);
    expect(gp).not.toContain('/store/commerce/products/b2c');
    // 대체 canonical: 채널 진열
    expect(gp).toContain('/store/channels');
  });

  it('GlycoPharm Guide 의 태블릿 경로는 canonical /store/:pharmacyId/tablet 이다', () => {
    const gp = copySource(SERVICES[2]);
    expect(gp).not.toContain('/tablet/:slug');
    expect(gp).toContain('/store/:pharmacyId/tablet');
  });

  it('K-Cosmetics Guide 는 legacy alias 대신 canonical store 경로를 사용한다', () => {
    const kc = copySource(SERVICES[1]);
    expect(kc).not.toContain("'/store/signage/playlist'");
    expect(kc).not.toContain("'/store/qr'");
    expect(kc).not.toContain('/store/requests');
    expect(kc).toContain('/store/marketing/signage/playlist');
    expect(kc).toContain('/store/marketing/qr');
    expect(kc).toContain('/store/interest-requests');
  });

  it('KPA Guide 는 폐기된 B2C 판매 표현을 사용하지 않는다', () => {
    const kpa = copySource(SERVICES[0]);
    expect(kpa).not.toContain('B2C 판매');
  });
});
