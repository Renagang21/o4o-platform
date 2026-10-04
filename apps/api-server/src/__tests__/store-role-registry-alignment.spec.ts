/**
 * Store role 목록 ↔ 정본 문서 정합
 *
 * WO-O4O-STORE-OWNER-RBAC-AND-SERVICE-SEMANTICS-FINAL-ALIGNMENT-V1
 * 정본: `docs/baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md` (Active) ·
 *       `docs/architecture/auth/O4O-STORE-OWNER-RBAC-STANDARD-V1.md` §3.1 · §3.1-A
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 세 목록은 **서로 다르다. 그게 맞다.**
 *
 *   STORE_OWNER_ROLES_BY_SERVICE (3)  공통 role 게이트가 아는 owner role
 *                                     cafe24-b2b 제외 — HMAC 쿠키 세션이라 isStoreOwner() 를 안 거친다
 *   STORE_MEMBER_ROLE_BY_SERVICE (4)  초대 수락이 발급하는 member role
 *                                     조직↔서비스 linkage 가 있는 서비스 전부 (cafe24-b2b 포함)
 *   ENROLLABLE_SERVICE_KEYS      (3)  자가 가입 가능 업종 — 외부 로그인 전용 채널 제외
 *
 * 이 spec 은 "셋이 같아야 한다" 를 고정하지 않는다. 처음엔 그렇게 적었다가 PR #288 리뷰에서
 * 틀린 전제임이 드러났다 — member 목록을 3종으로 줄이면 cafe24-b2b 전용 조직의 초대 수락이
 * 관계만 바꾸고 role 을 건너뛰어 **접근 0 · 재수락 불가**가 된다.
 * 대신 **각 목록이 자기 기준과 정본 문서에 맞는지**를 고정한다.
 */
import * as fs from 'fs';
import * as path from 'path';
import { STORE_MEMBER_ROLE_BY_SERVICE } from '../services/store/store-membership.service.js';
import { STORE_OWNER_ROLE_BY_SERVICE, ENROLLABLE_SERVICE_KEYS } from '../services/store/store-enrollment.service.js';
import { STORE_SERVICE_ORG_LINKAGE } from '../utils/store-organization.resolver.js';

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const read = (rel: string) => fs.readFileSync(path.join(REPO, rel), 'utf8');

const OWNER_UTILS = read('apps/api-server/src/utils/store-owner.utils.ts');
const RBAC_DOC = read('docs/architecture/auth/O4O-STORE-OWNER-RBAC-STANDARD-V1.md');
const ACCESS_DOC = read('docs/baseline/O4O-STORE-ACCESS-AND-MEMBERSHIP-V1.md');

/** 공통 게이트의 정본 registry 키를 소스에서 읽는다(복사해 적지 않는다). */
function gateServiceKeys(): string[] {
  const m = OWNER_UTILS.match(/STORE_OWNER_ROLES_BY_SERVICE\s*=\s*\{([\s\S]*?)\}\s*as const/);
  if (!m) throw new Error('STORE_OWNER_ROLES_BY_SERVICE 를 찾지 못했다 — 정본 위치가 바뀌었다');
  return [...m[1].matchAll(/^\s*'?([a-z0-9-]+)'?\s*:/gm)].map((x) => x[1]);
}

/**
 * 각 목록의 **기준**. 목록끼리 비교하지 않고 "이 목록은 무엇으로 정해지는가" 를 적는다 —
 * 셋은 서로 다른 것이 정상이고, 같다고 고정하면 PR #288 의 실수를 그대로 굳힌다.
 */
const LISTS = [
  {
    name: 'member role (수락이 발급)',
    suffix: 'store_member',
    actual: () => Object.keys(STORE_MEMBER_ROLE_BY_SERVICE),
    role: (k: string) => STORE_MEMBER_ROLE_BY_SERVICE[k as keyof typeof STORE_MEMBER_ROLE_BY_SERVICE],
    // linkedServiceKeys() 가 linkage 를 돌며 발급한다. 한 키라도 비면 그 조직의 수락이 관계만
    // 바꾸고 role 을 건너뛰어 접근 0 · 재수락 불가가 된다(PR #288 리뷰 P1).
    expected: () => Object.keys(STORE_SERVICE_ORG_LINKAGE),
    why: 'linkage 가 있는 서비스 전부',
  },
  {
    name: '자가 가입 owner role',
    suffix: 'store_owner',
    actual: () => Object.keys(STORE_OWNER_ROLE_BY_SERVICE),
    role: (k: string) => STORE_OWNER_ROLE_BY_SERVICE[k as keyof typeof STORE_OWNER_ROLE_BY_SERVICE],
    expected: () => [...ENROLLABLE_SERVICE_KEYS],
    why: 'ENROLLABLE_SERVICE_KEYS',
  },
] as const;

describe('각 목록은 자기 기준을 따른다', () => {
  it.each(LISTS.map((l) => [l.name, l] as const))('%s — 기준과 키가 같고 role 규약을 따른다', (_n, list) => {
    const expected = [...list.expected()].sort();
    expect([...list.actual()].sort()).toEqual(expected);
    for (const key of expected) expect(list.role(key)).toBe(`${key}:${list.suffix}`);
  });

  it('공통 게이트 owner registry 는 자가 가입 목록과 같다 — 가입했는데 못 들어가는 일이 없다', () => {
    expect(gateServiceKeys().sort()).toEqual([...ENROLLABLE_SERVICE_KEYS].sort());
  });

  it('cafe24-b2b 는 owner 게이트 밖이지만 member role 은 있다', () => {
    // 그 서비스는 HMAC 서명 쿠키 세션으로 /store/* 에 들어가 isStoreOwner() 를 거치지 않는다.
    expect(gateServiceKeys()).not.toContain('cafe24-b2b');
    expect(ENROLLABLE_SERVICE_KEYS).not.toContain('cafe24-b2b');
    // 하지만 초대·수락은 서비스 중립 표면이라 발급할 role 이 있어야 한다.
    expect(STORE_MEMBER_ROLE_BY_SERVICE['cafe24-b2b']).toBe('cafe24-b2b:store_member');
  });
});

describe('정본 문서가 같은 목록을 적는다', () => {
  it('RBAC §3.1 이 게이트 owner role 을 모두 적는다', () => {
    const missing = gateServiceKeys().filter((k) => !RBAC_DOC.includes(`${k}:store_owner`));
    expect(missing).toEqual([]);
  });

  it('RBAC §3.1-A 와 접근 정본이 member role 을 모두 적는다', () => {
    const roles = Object.values(STORE_MEMBER_ROLE_BY_SERVICE);
    expect(roles.filter((r) => !RBAC_DOC.includes(r))).toEqual([]);
    // ACTIVE 정본이 SSOT 다 — 코드만 줄이면 drift 가 된다(PR #288 리뷰).
    expect(roles.filter((r) => !ACCESS_DOC.includes(r))).toEqual([]);
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

  it('kpa:store_owner label 이 분회 소속으로 읽히지 않는다', () => {
    const roles = read('apps/api-server/src/types/roles.ts');
    const at = roles.indexOf("'kpa:store_owner': {");
    expect(at).toBeGreaterThan(-1);
    const block = roles.slice(at, at + 600);
    expect(block).not.toContain("label: 'KPA Store Owner'");
    expect(block).toMatch(/label: '[^']*매장 경영자'/);
  });
});
