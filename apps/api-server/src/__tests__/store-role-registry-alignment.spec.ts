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
 *   ENROLLABLE_SERVICE_KEYS      (2)  자가 가입 가능 업종 — 외부 로그인 전용 채널 · 약국(kpa) 제외
 *                                     약국 매장은 내 매장(약국) 신청 신청 + 운영자 승인으로만 열린다
 *                                     (WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 · ACCESS 정본 §3-A)
 *   STORE_OWNER_ROLE_BY_SERVICE  (3)  owner role 규약 — 게이트 registry 와 같은 키(kpa 포함)
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

/**
 * 공통 게이트의 정본 registry 를 소스에서 읽는다(복사해 적지 않는다 — 모듈 밖으로 export 되지 않는 상수다).
 * 키 → role 배열.
 */
function gateRegistry(): Record<string, string[]> {
  const m = OWNER_UTILS.match(/STORE_OWNER_ROLES_BY_SERVICE\s*=\s*\{([\s\S]*?)\}\s*as const/);
  if (!m) throw new Error('STORE_OWNER_ROLES_BY_SERVICE 를 찾지 못했다 — 정본 위치가 바뀌었다');
  const out: Record<string, string[]> = {};
  for (const x of m[1].matchAll(/^\s*'?([a-z0-9-]+)'?\s*:\s*\[([^\]]*)\]/gm)) {
    out[x[1]] = [...x[2].matchAll(/'([^']+)'/g)].map((r) => r[1]);
  }
  return out;
}
const gateServiceKeys = (): string[] => Object.keys(gateRegistry());

/**
 * 각 목록의 **기준**. 목록끼리 비교하지 않고 "이 목록은 무엇으로 정해지는가" 를 적는다 —
 * 셋은 서로 다른 것이 정상이고, 같다고 고정하면 PR #288 의 실수를 그대로 굳힌다.
 */
/**
 * 목록 하나를 "키 집합 + 기준 + role 접미사" 로 기술한다.
 * 두 목록이 같은 모양이라 각각 풀어 쓰면 거의 같은 블록이 두 번 생긴다 — factory 로 한 번만 쓴다.
 */
const list = (name: string, suffix: string, map: Record<string, string>, expected: readonly string[]) => ({
  name,
  suffix,
  keys: Object.keys(map),
  role: (k: string) => map[k],
  expected: [...expected],
});

const LISTS = [
  // member role: linkedServiceKeys() 가 linkage 를 돌며 발급한다. 한 키라도 비면 그 조직의 수락이
  //   관계만 바꾸고 role 을 건너뛰어 접근 0 · 재수락 불가가 된다(PR #288 리뷰 P1).
  list('member role (수락이 발급)', 'store_member', STORE_MEMBER_ROLE_BY_SERVICE, Object.keys(STORE_SERVICE_ORG_LINKAGE)),
  // owner role 규약: 게이트 registry 와 같은 키. 자가 가입 목록보다 넓을 수 있다(kpa — 승인 경로 전용).
  list('owner role 규약', 'store_owner', STORE_OWNER_ROLE_BY_SERVICE, gateServiceKeys()),
];

describe('각 목록은 자기 기준을 따른다', () => {
  it.each(LISTS.map((l) => [l.name, l] as const))('%s — 기준과 키가 같고 role 규약을 따른다', (_n, l) => {
    const expected = [...l.expected].sort();
    expect([...l.keys].sort()).toEqual(expected);
    for (const key of expected) expect(l.role(key)).toBe(`${key}:${l.suffix}`);
  });

  it('자가 가입 키는 모두 owner role 과 게이트 registry 에 있다 — 가입했는데 못 들어가는 일이 없다', () => {
    const gate = gateRegistry();
    for (const key of ENROLLABLE_SERVICE_KEYS) {
      expect(STORE_OWNER_ROLE_BY_SERVICE[key]).toBe(`${key}:store_owner`);
      expect(gate[key] ?? []).toContain(`${key}:store_owner`);
    }
  });

  it('게이트 registry 의 각 키는 자기 {key}:store_owner 를 가진다', () => {
    for (const [key, roles] of Object.entries(gateRegistry())) {
      expect(roles).toContain(`${key}:store_owner`);
      for (const r of roles) expect(r).toMatch(/^[a-z0-9-]+:store_owner$/);
    }
  });

  it('약국(kpa)은 게이트 registry 에 있지만 자가 가입 대상이 아니다', () => {
    // WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 (ACCESS 정본 §3-A):
    //   약국 매장은 내 매장(약국) 신청 신청 · 자격 확인 · 운영자 승인으로만 열린다.
    //   POST /api/v1/store/enrollment 로 kpa 조직 · kpa:store_owner 를 만드는 승인 우회 경로는 닫혀 있어야 한다.
    expect(gateServiceKeys()).toContain('kpa');
    expect(STORE_OWNER_ROLE_BY_SERVICE.kpa).toBe('kpa:store_owner');
    expect(ENROLLABLE_SERVICE_KEYS).not.toContain('kpa');
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

  it("ROLE_REGISTRY 의 'KPA' 표기가 분회 소속으로 읽히지 않게 정본이 설명한다", () => {
    // label 자체는 바꾸지 않는다 — ROLE_REGISTRY 는 같은 모양의 항목 100여 개가 반복되는 파일이라
    // 그 안의 어느 줄을 고쳐도 중복 블록에 들어가고(SonarCloud New Code 100%), UI 소비처도 없다.
    // 이름이 역사적이라는 사실은 사람이 읽는 정본이 설명한다.
    const roles = read('apps/api-server/src/types/roles.ts');
    expect(roles).toContain("'kpa:store_owner'");
    expect(RBAC_DOC).toMatch(/kpa:store_owner[\s\S]{0,400}분회/);
  });
});
