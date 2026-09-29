/**
 * WO-O4O-NETURE-PUBLIC-HOME-IA-REFRESH-V1 — 로그인 전 공개 홈의 「O4O 서비스 소식」 은 글이 있을 때만.
 *   hideWhenEmpty : 첫 로딩 · 0건 → 그리지 않음 / 오류 → 그대로(재시도) / 글 있음 → 목록
 *   기본(로그인 후 newsSlot) : 종전 그대로 — 0건이면 "아직 등록된 소식이 없습니다."
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const state = {
  data: null as null | { forum: null; posts: Array<{ id: string; slug: string; title: string; publishedAt: string }> },
  loading: false,
  error: null as string | null,
};

vi.mock('../../../lib/home-news', async (orig) => {
  const actual = await orig<typeof import('../../../lib/home-news')>();
  return { ...actual, useHomeNews: () => ({ ...state, reload: vi.fn() }) };
});

import HomeServiceNews from '../HomeServiceNews';

const mount = (hideWhenEmpty?: boolean) =>
  render(
    <MemoryRouter>
      <HomeServiceNews hideWhenEmpty={hideWhenEmpty} />
    </MemoryRouter>,
  );

afterEach(() => {
  cleanup();
  Object.assign(state, { data: null, loading: false, error: null });
});

describe('HomeServiceNews hideWhenEmpty', () => {
  it('0건 확정 → 섹션 없음', () => {
    state.data = { forum: null, posts: [] };
    mount(true);
    expect(screen.queryByTestId('home-service-news')).toBeNull();
  });

  it('첫 로딩 중 → 섹션 없음 (빈 자리를 먼저 차지하지 않는다)', () => {
    state.loading = true;
    mount(true);
    expect(screen.queryByTestId('home-service-news')).toBeNull();
  });

  it('오류 → 섹션과 재시도가 보인다 ("글 없음" 과 구분)', () => {
    state.error = '소식을 불러오지 못했습니다.';
    mount(true);
    expect(screen.getByTestId('home-service-news')).toBeTruthy();
    expect(screen.getByRole('button', { name: /다시 시도/ })).toBeTruthy();
  });

  it('글 있음 → 목록', () => {
    state.data = { forum: null, posts: [{ id: 'p1', slug: 'p1', title: '새 기능 안내', publishedAt: '2026-09-28T00:00:00Z' }] };
    mount(true);
    expect(screen.getByText('새 기능 안내')).toBeTruthy();
  });

  it('기본(로그인 후) → 0건 안내 그대로', () => {
    state.data = { forum: null, posts: [] };
    mount();
    expect(screen.getByText('아직 등록된 소식이 없습니다.')).toBeTruthy();
  });
});
