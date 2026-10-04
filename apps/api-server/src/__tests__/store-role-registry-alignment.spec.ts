/**
 * Store role registry ↔ 정본 문서 정합
 *
 * WO-O4O-STORE-OWNER-RBAC-AND-SERVICE-SEMANTICS-FINAL-ALIGNMENT-V1
 * 정본: `docs/architecture/auth/O4O-STORE-OWNER-RBAC-STANDARD-V1.md` §3.1 · §3.1-A
 *       `docs/baseline/O4O-SUBDOMAIN-SERVICE-SEMANTICS-V1.md`
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 왜 이 spec 이 있나
 *
 *   공통 role 게이트가 아는 role 목록은 **코드 한 곳**(`STORE_OWNER_ROLES_BY_SERVICE`)에 있고,
 *   문서와 다른 map 들이 그것을 따라 적는다. 둘이 어긋나면 조용히 둘 중 하나가 틀린다 —
 *   실제로 `pharmacy-hub:store_owner` 가 registry 에는 있는데 문서 §3.1 에는 없었고(각주에만),
 *   반대로 `cafe24-b2b:store_member` 는 코드 map 에만 있고 seed·소비가 0 이었다.
 *
 *   registry 를 늘리는 것 자체는 막지 않는다. 늘릴 때 **문서와 두 map 을 같이** 고치게 한다.
 */
import * as fs from 'fs';
import * as path from 'path';
import { STORE_MEMBER_ROLE_BY_SERVICE } from '../services/store/store-membership.service.js';
import { STORE_OWNER_ROLE_BY_SERVICE, ENROLLABLE_SERVICE_KEYS } from '../services/store/store-enrollment.service.js';

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(REPO, rel), 'utf8');

const OWNER_UTILS = read('apps/api-server/src/utils/store-owner.utils.ts');
const RBAC_DOC = read('docs/architecture/auth/O4O-STORE-OWNER-RBAC-STANDARD-V1.md');

/** 공통 게이트의 정본 registry 키를 소스에서 읽는다(복사해 적지 않는다). */
function gateServiceKeys(): string[] {
  const m = OWNER_UTILS.match(/STORE_OWNER_ROLES_BY_SERVICE\s*=\s*\{([\s\S]*?)\}\s*as const/);
  if (!m) throw new Error('STORE_OWNER_ROLES_BY_SERVICE 를 찾지 못했다 — 정본 위치가 바뀌었다');
  return [...m[1].matchAll(/^\s*'?([a-z0-9-]+)'?\s*:/gm)].map((x) => x[1]);
}

describe('공통 게이트 registry 가 정본이다', () => {
  it('owner · member role map 의 키가 게이트 registry 와 같다', () => {
    const gate = gateServiceKeys().sort();
    expect(gate.length).toBeGreaterThan(0);
    expect(Object.keys(STORE_OWNER_ROLE_BY_SERVICE).sort()).toEqual(gate);
    expect(Object.keys(STORE_MEMBER_ROLE_BY_SERVICE).sort()).toEqual(gate);
  });

  it('role 문자열은 {serviceKey}:{store_owner|store_member} 규약을 따른다', () => {
    for (const [key, role] of Object.entries(STORE_OWNER_ROLE_BY_SERVICE)) {
      expect(role).toBe(`${key}:store_owner`);
    }
    for (const [key, role] of Object.entries(STORE_MEMBER_ROLE_BY_SERVICE)) {
      expect(role).toBe(`${key}:store_member`);
    }
  });

  it('cafe24-b2b 는 공통 게이트 밖이다 — 어느 map 에도 없다', () => {
    // 그 서비스는 HMAC 서명 쿠키 세션으로 /store/* 에 들어가 isStoreOwner() 를 거치지 않는다.
    expect(gateServiceKeys()).not.toContain('cafe24-b2b');
    expect(STORE_OWNER_ROLE_BY_SERVICE).not.toHaveProperty('cafe24-b2b');
    expect(STORE_MEMBER_ROLE_BY_SERVICE).not.toHaveProperty('cafe24-b2b');
  });

  it('자가 가입 가능 서비스는 owner role 을 가진 서비스의 부분집합이다', () => {
    for (const key of ENROLLABLE_SERVICE_KEYS) {
      expect(STORE_OWNER_ROLE_BY_SERVICE[key]).toBe(`${key}:store_owner`);
    }
  });
});

describe('정본 문서가 registry 와 같은 목록을 적는다', () => {
  it('§3.1 이 게이트 registry 의 owner role 을 모두 적는다', () => {
    const missing = gateServiceKeys().filter((k) => !RBAC_DOC.includes(`${k}:store_owner`));
    expect(missing).toEqual([]);
  });

  it('§3.1-A 가 member role 을 적는다', () => {
    const missing = Object.values(STORE_MEMBER_ROLE_BY_SERVICE).filter(
      (role) => typeof role === 'string' && !RBAC_DOC.includes(role),
    );
    expect(missing).toEqual([]);
  });

  it('Role ∧ Relationship 과 정본 링크가 문서에 있다', () => {
    expect(RBAC_DOC).toContain('Role ∧ Relationship');
    expect(RBAC_DOC).toContain('O4O-STORE-ACCESS-AND-MEMBERSHIP-V1');
  });
});

describe('서비스 의미 표기', () => {
  it("kpa-society 설명이 '약사 커뮤니티' 가 아니라 약국 사업자 운영 서비스다", () => {
    const catalog = read('apps/api-server/src/config/service-catalog.ts');
    const entry = catalog.slice(catalog.indexOf("key: 'kpa-society'"));
    const block = entry.slice(0, entry.indexOf('},'));
    const desc = block.match(/description:\s*'([^']+)'/);
    expect(desc).not.toBeNull();
    // 서비스 설명과 그 안의 커뮤니티 이름을 구분한다 — 커뮤니티 이름은 community-catalog 가 갖는다.
    expect(desc![1]).not.toContain('약사 커뮤니티');
    expect(desc![1]).toContain('약국');
  });

  it("kpa:store_owner label 이 분회 소속으로 읽히지 않는다", () => {
    const roles = read('apps/api-server/src/types/roles.ts');
    const at = roles.indexOf("'kpa:store_owner': {");
    expect(at).toBeGreaterThan(-1);
    const block = roles.slice(at, at + 600);
    expect(block).not.toContain("label: 'KPA Store Owner'");
    expect(block).toMatch(/label: '[^']*매장 경영자'/);
  });
});
