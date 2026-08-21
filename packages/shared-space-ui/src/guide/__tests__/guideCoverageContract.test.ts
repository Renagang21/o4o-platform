/**
 * Guide Coverage Contract Spec
 *
 * WO-O4O-GUIDE-CROSSSERVICE-COVERAGE-GAP-CLOSURE-V1 §13
 *
 * 검사 대상:
 *   1) Guide 내부 dead route 0 — copy 가 참조하는 /guide/* 경로는 실제 mount 된 Route 여야 한다.
 *   2) orphan Guide route 0 — mount 된 /guide/* 는 같은 서비스 copy 어딘가에서 참조돼야 한다
 *      (URL 을 아는 사람만 도달하는 Guide 금지 · §14).
 *   3) A형 coverage gap 회귀 방지 — 이번 WO 에서 해소한 Guide 가 유지되고,
 *      기능별 이용 방법 index 에서 진입 가능해야 한다.
 *
 * route 표는 서비스 src 의 .tsx 를 정적 파싱해 구성한다(런타임 import 없음).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '../../../../..');

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

type Svc = { key: string; dir: string; copy: string };
const SERVICES: Svc[] = [
  { key: 'kpa', dir: 'services/web-kpa-society', copy: 'kpa.ts' },
  { key: 'k-cosmetics', dir: 'services/web-k-cosmetics', copy: 'k-cosmetics.ts' },
  { key: 'glycopharm', dir: 'services/web-glycopharm', copy: 'glycopharm.ts' },
  { key: 'neture', dir: 'services/web-neture', copy: 'neture.ts' },
  { key: 'pharmacy-hub', dir: 'services/web-pharmacy-hub', copy: 'pharmacy-hub.ts' },
];

function copySource(svc: Svc): string {
  return readFileSync(join(ROOT, 'packages/shared-space-ui/src/guide/copy', svc.copy), 'utf-8');
}

function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

/** copy 안에서 실제 링크로 쓰이는 경로 문자열만 뽑는다(to: · route: · 따옴표 리터럴). */
function quotedPaths(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/'(\/[^']*)'/g)) out.add(m[1].replace(/\/$/, ''));
  return out;
}

/**
 * 서비스 소스에서 링크로 쓰인 경로 문자열을 모은다.
 * `path="..."`(라우트 정의)는 진입 링크가 아니므로 제외한다.
 */
function serviceLinkPaths(svc: Svc): Set<string> {
  const out = new Set<string>();
  const walk = (d: string) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (name.endsWith('.tsx') || name.endsWith('.ts')) {
        const src = stripComments(readFileSync(p, 'utf-8')).replace(/\bpath\s*=\s*"[^"]*"/g, '');
        for (const m of src.matchAll(/['"](\/[^'"]*)['"]/g)) out.add(m[1].replace(/\/$/, ''));
      }
    }
  };
  walk(join(ROOT, svc.dir, 'src'));
  return out;
}

function guideRoutesOf(svc: Svc): string[] {
  return [...collectRoutes(join(ROOT, svc.dir, 'src'))]
    .filter((r) => r === '/guide' || r.startsWith('/guide/') || r === '/service-guide')
    .sort();
}

describe('Guide coverage contract', () => {
  it.each(SERVICES.map((s) => [s.key, s] as const))(
    '%s — Guide copy 가 참조하는 /guide 경로에 dead route 가 없다',
    (_key, svc) => {
      const mounted = new Set(guideRoutesOf(svc));
      const refs = [...quotedPaths(stripComments(copySource(svc)))].filter(
        (r) => r === '/guide' || r.startsWith('/guide/') || r === '/service-guide',
      );
      expect(refs.filter((r) => !mounted.has(r))).toEqual([]);
    },
  );

  it.each(SERVICES.map((s) => [s.key, s] as const))(
    '%s — mount 된 Guide route 중 copy 에서 참조되지 않는 orphan 이 없다',
    (_key, svc) => {
      // 진입 링크는 shared copy 뿐 아니라 서비스 자체 Guide 화면(JSX)에도 있을 수 있다.
      const refs = new Set([
        ...quotedPaths(stripComments(copySource(svc))),
        ...serviceLinkPaths(svc),
      ]);
      // /guide 는 canonical landing 리다이렉트 진입점이므로 참조 대상에서 제외한다.
      const orphans = guideRoutesOf(svc).filter((r) => r !== '/guide' && !refs.has(r));
      expect(orphans).toEqual([]);
    },
  );

  it('GlycoPharm — 강의(LMS) · 매장 운영 · QR Guide 가 존재하고 기능 index 에서 진입 가능하다', () => {
    const mounted = new Set(guideRoutesOf(SERVICES[2]));
    for (const r of ['/guide/features/lms', '/guide/features/store', '/guide/features/qr']) {
      expect(mounted.has(r)).toBe(true);
    }
    const copy = copySource(SERVICES[2]);
    const index = copy.slice(copy.indexOf('glycopharmGuideFeaturesProps'), copy.indexOf('glycopharmGuideFeatureSignageProps'));
    expect(index).toContain('/guide/features/lms');
    expect(index).toContain('/guide/features/store');
    expect(index).toContain('/guide/features/qr');
  });

  it('K-Cosmetics — 매장 운영 · QR·태블릿 Guide 가 존재하고 기능 index 에서 진입 가능하다', () => {
    const mounted = new Set(guideRoutesOf(SERVICES[1]));
    for (const r of ['/guide/features/store', '/guide/features/qr']) {
      expect(mounted.has(r)).toBe(true);
    }
    const copy = copySource(SERVICES[1]);
    const index = copy.slice(copy.indexOf('kCosmeticsGuideFeaturesProps'), copy.indexOf('kCosmeticsGuideFeatureForumProps'));
    expect(index).toContain('/guide/features/store');
    expect(index).toContain('/guide/features/qr');
  });

  it('PharmacyHub — 기존 Guide route 세트가 유지된다(회귀 방지)', () => {
    const mounted = new Set(guideRoutesOf(SERVICES[4]));
    for (const r of ['/service-guide', '/guide', '/guide/intro', '/guide/usage', '/guide/features']) {
      expect(mounted.has(r)).toBe(true);
    }
  });
});
