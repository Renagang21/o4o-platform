/**
 * WO-O4O-ADMIN-PRODUCT-DESCRIPTION-ROUTE-AUTH-BOUNDARY-ALIGNMENT-V1 — §3 영향 범위 전수조사
 *
 * register-routes.ts 의 `/api/v1/admin/*` mount 를 등록 순서대로 뽑고,
 * 각 mount 가 가리키는 모듈의 실제 가드를 읽어 A/B/C 로 분류한다. (read-only, 정적 분석)
 *
 *   A = platform:super_admin 전용
 *   B = service admin/operator 도 허용
 *   C = 가드 불명확 / 없음
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

const ROOT = resolve(process.cwd(), 'apps/api-server/src');
const REG = resolve(ROOT, 'bootstrap/register-routes.ts');
const src = readFileSync(REG, 'utf8');
const lines = src.split(/\r?\n/);

// import 이름 → 모듈 경로 (정적 import + await import 양쪽)
const modOf = new Map();
for (const m of src.matchAll(/import\s+(?:(\w+)|\{([^}]+)\})\s+from\s+'([^']+)'/g)) {
  const names = m[1] ? [m[1]] : m[2].split(',').map((s) => s.trim().split(/\s+as\s+/).pop().trim());
  for (const n of names) if (n) modOf.set(n, m[3]);
}
for (const m of src.matchAll(/const\s*\{([^}]+)\}\s*=\s*await\s+import\(\s*\n?\s*'([^']+)'/g)) {
  for (const n of m[1].split(',').map((s) => s.trim())) if (n) modOf.set(n, m[2]);
}

// `const adminPlaybackLogRoutes = createAdminPlaybackLogRoutes(...)` 처럼
// 팩토리 호출 결과 변수를 mount 하는 경우 → 팩토리의 모듈로 되돌린다.
for (const m of src.matchAll(/const\s+(\w+)\s*=\s*(\w+)\(/g)) {
  if (!modOf.has(m[1]) && modOf.has(m[2])) modOf.set(m[1], modOf.get(m[2]));
}

const resolveMod = (spec) => {
  if (!spec?.startsWith('.')) return null;
  const p = resolve(dirname(REG), spec).replace(/\.js$/, '.ts');
  return existsSync(p) ? p : null;
};

function guardOf(file) {
  if (!file) return { kind: 'C', detail: '모듈 경로 해석 실패' };
  const s = readFileSync(file, 'utf8');
  const rolesBlock = s.match(/(?:ADMIN_ROLES|OPERATOR_ROLES|ALLOWED_ROLES)\s*(?::[^=]+)?=\s*\[([^\]]+)\]/);
  const roles = rolesBlock ? [...rolesBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
  // router-level 또는 per-route 어느 쪽이든 requireRole 이 붙어 있으면 역할 계약으로 본다.
  const hasRequireRole = /requireRole\(/.test(s);
  const perRouteAdmin = /requireAdmin/.test(s);
  const anyRequireAuth = /requireAuth|authenticate/.test(s);

  if (hasRequireRole && roles.length) {
    const svc = roles.filter((r) => /:(admin|operator)$/.test(r) && !r.startsWith('platform:'));
    return { kind: svc.length ? 'B' : 'A', detail: `requireRole([${roles.length} roles])`, roles };
  }
  if (perRouteAdmin) return { kind: 'A', detail: 'requireAdmin (platform:super_admin)' };
  if (hasRequireRole) return { kind: 'C', detail: 'requireRole 은 있으나 역할 목록을 정적으로 못 읽음' };
  if (!anyRequireAuth) return { kind: 'C', detail: '인증/권한 가드 미발견' };
  return { kind: 'C', detail: '가드 형태 불명확' };
}

const blanketLine = lines.findIndex((l) => /app\.use\('\/api\/v1\/admin',/.test(l)) + 1;
const mounts = [];
lines.forEach((l, i) => {
  const m = l.match(/app\.use\('(\/api\/v1\/admin[^']*)',\s*(\w+)/);
  if (!m) return;
  const file = resolveMod(modOf.get(m[2]));
  mounts.push({
    line: i + 1,
    path: m[1],
    factory: m[2],
    module: modOf.get(m[2]) ?? null,
    afterBlanket: i + 1 > blanketLine,
    ...guardOf(file),
  });
});

const out = {
  wo: 'WO-O4O-ADMIN-PRODUCT-DESCRIPTION-ROUTE-AUTH-BOUNDARY-ALIGNMENT-V1',
  readOnly: true,
  blanketMountLine: blanketLine,
  total: mounts.length,
  shadowedByBlanket: mounts.filter((m) => m.afterBlanket).length,
  byClass: mounts.reduce((a, m) => ((a[m.kind] = (a[m.kind] ?? 0) + 1), a), {}),
  unguardedAfterBlanket: mounts.filter((m) => m.afterBlanket && m.kind === 'C'),
  mounts,
};
console.log(JSON.stringify(out, null, 2));
