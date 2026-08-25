/**
 * §6 회원 Content write 최종 판정 — 계약 테스트
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §6
 *
 * 검증 대상:
 *   1. 기존 3서비스(KPA/GP/KCos) + Neture 의 공통 CMS write 정책 **변화 0**
 *   2. PH 회원 저작이 멤버십 축으로만 열린다 (role 승격 없음)
 *   3. 회원 self-transition 이 서버 정본 전이표의 **부분집합** (불가능한 전이 미노출)
 *   4. 작성자 본인 경계 (타인 콘텐츠 수정·전이 불가)
 */

import {
  resolveCmsMemberAuthoring,
  authorizeCmsMemberCreate,
  authorizeCmsMemberUpdate,
  authorizeCmsMemberTransition,
  hasActiveCmsServiceMembership,
} from '../routes/cms-content/cms-content-member-authoring.js';
import { CMS_ALLOWED_TRANSITIONS } from '../routes/cms-content/cms-content-utils.js';

const member = (serviceKey: string, status = 'active', id = 'user-1') => ({
  id,
  roles: [],
  memberships: [{ serviceKey, status }],
});

const phMember = member('pharmacy-hub');

describe('§6-A. 기존 서비스 정책 무변화', () => {
  it.each(['kpa-society', 'kpa', 'glycopharm', 'cosmetics', 'k-cosmetics', 'neture'])(
    '%s 는 회원 저작 capability 를 갖지 않는다 (cms_contents write 는 종전대로 operator/admin 전용)',
    (serviceKey) => {
      expect(resolveCmsMemberAuthoring(serviceKey)).toBeNull();
      expect(authorizeCmsMemberCreate(member(serviceKey), serviceKey, 'knowledge')).toEqual({
        allowed: false,
        reason: 'NO_CAPABILITY',
      });
    },
  );

  it('serviceKey 가 없으면 capability 도 없다', () => {
    expect(resolveCmsMemberAuthoring(null)).toBeNull();
    expect(resolveCmsMemberAuthoring('')).toBeNull();
  });
});

describe('§6-B. PH 회원 저작 create', () => {
  it('active 멤버십 + 허용 type 이면 통과한다', () => {
    const d = authorizeCmsMemberCreate(phMember, 'pharmacy-hub', 'knowledge');
    expect(d.allowed).toBe(true);
    if (d.allowed) {
      expect(d.capability.authorRole).toBe('community');
      expect(d.capability.visibilityScope).toBe('service');
      expect(d.capability.initialStatus).toBe('draft');
    }
  });

  it('멤버십이 active 가 아니면 차단한다', () => {
    expect(authorizeCmsMemberCreate(member('pharmacy-hub', 'suspended'), 'pharmacy-hub', 'knowledge')).toEqual({
      allowed: false,
      reason: 'MEMBERSHIP_REQUIRED',
    });
  });

  it('멤버십이 아예 없으면 차단한다', () => {
    expect(authorizeCmsMemberCreate({ id: 'u', roles: [], memberships: [] }, 'pharmacy-hub', 'knowledge')).toEqual({
      allowed: false,
      reason: 'MEMBERSHIP_REQUIRED',
    });
  });

  it('허용되지 않은 type 은 차단한다 (진열 축 hero/notice 를 회원이 만들 수 없다)', () => {
    for (const t of ['hero', 'notice', 'guide', 'news', undefined]) {
      expect(authorizeCmsMemberCreate(phMember, 'pharmacy-hub', t as any)).toEqual({
        allowed: false,
        reason: 'TYPE_NOT_ALLOWED',
      });
    }
  });

  it('타 서비스 멤버십으로 PH 콘텐츠를 만들 수 없다 (cross-service leakage 0)', () => {
    expect(authorizeCmsMemberCreate(member('kpa-society'), 'pharmacy-hub', 'knowledge')).toEqual({
      allowed: false,
      reason: 'MEMBERSHIP_REQUIRED',
    });
  });

  it('멤버십 판정은 canonical serviceKey 축이다', () => {
    expect(hasActiveCmsServiceMembership(phMember, 'pharmacy-hub')).toBe(true);
    expect(hasActiveCmsServiceMembership(phMember, 'kpa')).toBe(false);
  });
});

describe('§6-C. 본문 수정 경계', () => {
  const own = (status: string) => ({
    serviceKey: 'pharmacy-hub',
    authorRole: 'community',
    status,
    createdBy: 'user-1',
  });

  it('작성자 본인은 draft/pending 본문을 수정할 수 있다', () => {
    expect(authorizeCmsMemberUpdate(phMember, own('draft'))).toBe(true);
    expect(authorizeCmsMemberUpdate(phMember, own('pending'))).toBe(true);
  });

  it('게시·보관된 본문은 회원이 수정할 수 없다 (운영자 축)', () => {
    expect(authorizeCmsMemberUpdate(phMember, own('published'))).toBe(false);
    expect(authorizeCmsMemberUpdate(phMember, own('archived'))).toBe(false);
  });

  it('타인 콘텐츠는 수정할 수 없다', () => {
    expect(authorizeCmsMemberUpdate(phMember, { ...own('draft'), createdBy: 'user-2' })).toBe(false);
  });

  it('운영자가 만든 행(community 아님)은 회원 경로로 수정할 수 없다', () => {
    expect(authorizeCmsMemberUpdate(phMember, { ...own('draft'), authorRole: 'service_admin' })).toBe(false);
  });

  it('capability 없는 서비스의 행은 회원 경로가 없다', () => {
    expect(
      authorizeCmsMemberUpdate(member('kpa-society'), {
        serviceKey: 'kpa-society',
        authorRole: 'community',
        status: 'draft',
        createdBy: 'user-1',
      }),
    ).toBe(false);
  });
});

describe('§6-D. 회원 상태 전이는 서버 정본의 부분집합이다', () => {
  const capability = resolveCmsMemberAuthoring('pharmacy-hub')!;

  it('selfTransitions ⊆ CMS_ALLOWED_TRANSITIONS (불가능한 전이 미노출)', () => {
    for (const [from, targets] of Object.entries(capability.selfTransitions)) {
      const canonical = CMS_ALLOWED_TRANSITIONS[from] ?? [];
      for (const to of targets) {
        expect(canonical).toContain(to);
      }
    }
  });

  const own = (status: string) => ({
    serviceKey: 'pharmacy-hub',
    authorRole: 'community',
    status,
    createdBy: 'user-1',
  });

  it('제출(draft→pending) · 취소(pending→draft) · 회수(draft|published→archived) 는 가능하다', () => {
    expect(authorizeCmsMemberTransition(phMember, own('draft'), 'pending')).toBe(true);
    expect(authorizeCmsMemberTransition(phMember, own('pending'), 'draft')).toBe(true);
    expect(authorizeCmsMemberTransition(phMember, own('draft'), 'archived')).toBe(true);
    expect(authorizeCmsMemberTransition(phMember, own('published'), 'archived')).toBe(true);
  });

  it('회원이 스스로 게시(pending→published)할 수 없다 — 검토는 운영자 축이다', () => {
    expect(authorizeCmsMemberTransition(phMember, own('pending'), 'published')).toBe(false);
  });

  it('보관된 콘텐츠는 회원이 되살릴 수 없다', () => {
    expect(authorizeCmsMemberTransition(phMember, own('archived'), 'published')).toBe(false);
    expect(authorizeCmsMemberTransition(phMember, own('archived'), 'draft')).toBe(false);
  });

  it('타인 콘텐츠는 전이시킬 수 없다', () => {
    expect(authorizeCmsMemberTransition(phMember, { ...own('draft'), createdBy: 'user-2' }, 'pending')).toBe(false);
  });
});
