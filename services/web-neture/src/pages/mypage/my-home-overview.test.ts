import { afterEach, describe, expect, it, vi } from 'vitest';
import { getNetureMyPageNavItems } from './navItems';
import { knownHasStore, rememberHasStore } from '../../lib/my-home-store-presence';

vi.mock('../../lib/home-entry', async (original) => ({ ...(await original<object>()), homeEntryStoreOrganizationIds: (data: { stores?: unknown[] }) => (data.stores ?? []).map((_, i) => `org-${i}`) }));
import { overviewSummaries } from './MyPageHub';

afterEach(() => sessionStorage.clear());
const visibleLabels = (hasStore?: boolean) => getNetureMyPageNavItems([], hasStore).filter(item => item.visible !== false).map(item => item.label);

describe('My Home 메뉴 · 현황 요약 (2026-11-13 개선 3 · 4)', () => {
  it('hides 경영 현황 only when the account is known to have no store, and groups personal info', () => {
    expect(visibleLabels(false)).not.toContain('경영 현황');
    expect(visibleLabels(true)).toContain('경영 현황');
    expect(visibleLabels(undefined)).toContain('경영 현황');
    expect(visibleLabels()).toContain('내 정보');
    expect(visibleLabels()).not.toContain('프로필');
  });

  it('remembers store presence per account for this tab only', () => {
    expect(knownHasStore('a')).toBeUndefined();
    rememberHasStore('a', false);
    rememberHasStore('b', true);
    expect([knownHasStore('a'), knownHasStore('b'), knownHasStore(undefined)]).toEqual([false, true, undefined]);
  });

  it('summarises real states instead of repeating menu links, and never shows an unknown as zero', () => {
    expect(overviewSummaries(null, null, false).map(item => item.value)).toEqual(['확인 중…', '확인 중…']);
    expect(overviewSummaries(null, null, true)[0].value).toBe('불러오지 못했습니다');
    const model = { myServices: [1, 2], statusItems: [{ status: 'pending' }, { status: 'rejected' }, { status: 'active' }] };
    const data = { communities: [{ canParticipate: true }, { canParticipate: false }], stores: [{}] } as never;
    expect(overviewSummaries(model, data, false)).toEqual([
      { to: '/mypage/services', title: '참여 서비스', value: '이용 중 2개 · 승인 대기 1개 · 반려 1개' },
      { to: '/mypage/activity', title: '커뮤니티 활동', value: '참여 커뮤니티 1곳 · 내가 쓴 글 보기' },
      { to: '/mypage/management', title: '경영 현황', value: '매장 1곳 · 사업 요약과 방문 통계' },
    ]);
    expect(overviewSummaries({ myServices: [], statusItems: [] }, { communities: [], stores: [] } as never, false).map(item => item.value))
      .toEqual(['이용 중 0개', '참여 중인 커뮤니티 없음']);
  });
});
