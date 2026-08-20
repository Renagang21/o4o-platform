/**
 * CommunityHomeConsole — View 상태/설정 계약 테스트
 *
 * WO-O4O-COMMUNITY-OPERATOR-CONSOLE-VIEW-CONVERGENCE-V1 §12
 *   loading / error+retry / empty / populated / tab 구성 / optional section 부재 /
 *   config(title·subtitle·notice) 적용을 고정한다.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { CommunityHomeConsole } from '../CommunityHomeConsole';
import type { CommunityHomeClient } from '../types';

// vitest globals 미사용 설정이라 auto-cleanup 이 걸리지 않는다 — 명시적으로 unmount.
afterEach(() => cleanup());

function makeClient(overrides: Partial<CommunityHomeClient> = {}): CommunityHomeClient {
  return {
    listAds: vi.fn().mockResolvedValue({ ads: [] }),
    createAd: vi.fn().mockResolvedValue({}),
    updateAd: vi.fn().mockResolvedValue({}),
    deleteAd: vi.fn().mockResolvedValue({}),
    listSponsors: vi.fn().mockResolvedValue({ sponsors: [] }),
    createSponsor: vi.fn().mockResolvedValue({}),
    updateSponsor: vi.fn().mockResolvedValue({}),
    deleteSponsor: vi.fn().mockResolvedValue({}),
    ...overrides,
  };
}

const AD = {
  id: 'ad-1',
  type: 'hero',
  title: '히어로 광고 A',
  imageUrl: 'https://cdn.example.com/a.png',
  linkUrl: null,
  startDate: null,
  endDate: null,
  displayOrder: 1,
  isActive: true,
};

describe('CommunityHomeConsole', () => {
  it('loading 상태에서 로딩 표시를 렌더한다', () => {
    const client = makeClient({ listAds: vi.fn(() => new Promise(() => {})) });
    render(<CommunityHomeConsole client={client} tableIdPrefix="t" />);
    expect(screen.getByText('불러오는 중...')).toBeTruthy();
  });

  it('조회 실패 시 에러 문구와 다시 시도 버튼을 노출하고 재조회한다', async () => {
    const listAds = vi.fn().mockRejectedValue(new Error('boom'));
    const client = makeClient({ listAds });
    render(<CommunityHomeConsole client={client} tableIdPrefix="t" />);

    await waitFor(() => expect(screen.getByText('데이터를 불러오지 못했습니다.')).toBeTruthy());
    expect(listAds).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('다시 시도'));
    await waitFor(() => expect(listAds).toHaveBeenCalledTimes(2));
  });

  it('빈 목록이면 empty 메시지를 노출한다', async () => {
    render(<CommunityHomeConsole client={makeClient()} tableIdPrefix="t" />);
    await waitFor(() => expect(screen.getByText('등록된 광고가 없습니다.')).toBeTruthy());
  });

  it('데이터가 있으면 목록을 렌더한다', async () => {
    const client = makeClient({ listAds: vi.fn().mockResolvedValue({ ads: [AD] }) });
    render(<CommunityHomeConsole client={client} tableIdPrefix="t" />);
    await waitFor(() => expect(screen.getByText('히어로 광고 A')).toBeTruthy());
  });

  it('enableQuickLinks 미지정이면 하단 링크 탭이 없다', async () => {
    render(<CommunityHomeConsole client={makeClient()} tableIdPrefix="t" />);
    await waitFor(() => expect(screen.getByText('Hero 광고')).toBeTruthy());
    expect(screen.queryByText('하단 링크')).toBeNull();
  });

  it('enableQuickLinks 이면 하단 링크 탭이 추가되고 전용 client 를 호출한다', async () => {
    const listQuickLinks = vi.fn().mockResolvedValue({ quickLinks: [] });
    const client = makeClient({ listQuickLinks });
    render(<CommunityHomeConsole client={client} tableIdPrefix="t" enableQuickLinks />);

    await waitFor(() => expect(screen.getByText('하단 링크')).toBeTruthy());
    fireEvent.click(screen.getByText('하단 링크'));
    await waitFor(() => expect(listQuickLinks).toHaveBeenCalled());
    expect(screen.getByText('등록된 하단 링크가 없습니다.')).toBeTruthy();
  });

  it('탭 전환 시 스폰서 목록 client 를 호출한다', async () => {
    const listSponsors = vi.fn().mockResolvedValue({ sponsors: [] });
    const client = makeClient({ listSponsors });
    render(<CommunityHomeConsole client={client} tableIdPrefix="t" />);

    await waitFor(() => expect(screen.getByText('스폰서')).toBeTruthy());
    fireEvent.click(screen.getByText('스폰서'));
    await waitFor(() => expect(listSponsors).toHaveBeenCalled());
  });

  it('title/subtitle/notice config 를 적용한다', async () => {
    render(
      <CommunityHomeConsole
        client={makeClient()}
        tableIdPrefix="t"
        title="커뮤니티 관리"
        subtitle="Community Hub 광고 및 스폰서 관리"
        notice={<div>준비 중 안내</div>}
      />
    );
    await waitFor(() => expect(screen.getByText('커뮤니티 관리')).toBeTruthy());
    expect(screen.getByText('Community Hub 광고 및 스폰서 관리')).toBeTruthy();
    expect(screen.getByText('준비 중 안내')).toBeTruthy();
  });

  it('notice 미지정이면 서비스 고유 배너를 렌더하지 않는다', async () => {
    render(<CommunityHomeConsole client={makeClient()} tableIdPrefix="t" />);
    await waitFor(() => expect(screen.getByText('Hero 광고')).toBeTruthy());
    expect(screen.queryByText('준비 중 안내')).toBeNull();
  });
});
