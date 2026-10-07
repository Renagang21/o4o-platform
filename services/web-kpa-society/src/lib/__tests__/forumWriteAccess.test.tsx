/**
 * WO-NETURE-PHARMACY-PREDEPLOY-ACCESS-ALIGNMENT-V1 — 포럼 쓰기 자격 안내
 *
 *   F1 조회: `/communities/pharmacy/access` 응답 → { allowed, reason } · 형식 불일치 · 실패 = null(기존 화면 유지)
 *   F2 문구: 서버 reason / 403 code → 안내 문구 (COMMUNITY_ACCESS_DENIED = 서비스 회원 필요)
 *   F3 ForumWritePrompt: 차단 확인 시 글쓰기 유도 대신 안내 · 허용 · 실패 시 기존 문구
 *
 * 실행: 저장소 루트에서 `npx vitest run --config services/web-kpa-society/vitest.config.mjs`
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const get = vi.fn();
let mockUser: Record<string, unknown> | null = null;
vi.mock('../../contexts/AuthContext', () => ({
  authClient: { api: { get: (...a: unknown[]) => get(...a) } },
  useAuth: () => ({ user: mockUser, isAuthenticated: !!mockUser, isLoading: false }),
}));

import {
  __resetForumWriteAccessCache,
  fetchForumWriteAccess,
  forumWriteDeniedMessage,
  forumWriteErrorMessage,
} from '../forumWriteAccess';
import { ForumWritePrompt } from '../../components/forum/ForumWritePrompt';

const accessRes = (data: unknown) => ({ data: { success: true, data } });

beforeEach(() => {
  get.mockReset();
  mockUser = { id: 'u1', roles: [], memberships: [] };
  __resetForumWriteAccessCache();
});
afterEach(() => cleanup());

describe('F1 fetchForumWriteAccess', () => {
  it('응답 → allowed · reason, 조회 경로는 pharmacy 커뮤니티 단건', async () => {
    get.mockResolvedValueOnce(accessRes({ communityKey: 'pharmacy', allowed: false, reason: 'SERVICE_MEMBERSHIP_REQUIRED', via: null }));
    expect(await fetchForumWriteAccess({ get })).toEqual({ allowed: false, reason: 'SERVICE_MEMBERSHIP_REQUIRED' });
    expect(get).toHaveBeenCalledWith('/communities/pharmacy/access');
  });

  it('형식 불일치 · 실패 → null', async () => {
    get.mockResolvedValueOnce(accessRes({ allowed: 'no' }));
    expect(await fetchForumWriteAccess({ get })).toBeNull();
    get.mockRejectedValueOnce(new Error('network'));
    expect(await fetchForumWriteAccess({ get })).toBeNull();
  });
});

describe('F2 문구', () => {
  it('reason → 문구 · 알 수 없는 reason 은 기본 문구', () => {
    expect(forumWriteDeniedMessage('SERVICE_MEMBERSHIP_REQUIRED')).toContain('KPA 약사회');
    expect(forumWriteDeniedMessage('SEMI_FRANCHISE_MEMBERSHIP_REQUIRED')).toContain('세미프랜차이즈');
    expect(forumWriteDeniedMessage('OTHER')).toContain('권한이 없습니다');
  });

  it('403 code → 문구 · 해당 없으면 null', () => {
    expect(forumWriteErrorMessage('COMMUNITY_ACCESS_DENIED')).toContain('KPA 약사회');
    expect(forumWriteErrorMessage('COMMUNITY_MEMBERSHIP_REQUIRED')).toContain('가입 승인');
    expect(forumWriteErrorMessage('FORBIDDEN')).toBeNull();
    expect(forumWriteErrorMessage(undefined)).toBeNull();
  });
});

describe('F3 ForumWritePrompt', () => {
  const renderPrompt = () => render(<MemoryRouter><ForumWritePrompt /></MemoryRouter>);

  it('쓰기 자격 없음 → 글쓰기 유도 대신 안내', async () => {
    get.mockResolvedValueOnce(accessRes({ allowed: false, reason: 'SERVICE_MEMBERSHIP_REQUIRED' }));
    renderPrompt();
    expect(await screen.findByText('포럼 글을 읽어 보세요')).toBeTruthy();
    expect(screen.queryByText('관심 있는 포럼을 선택하고 글을 작성해 보세요')).toBeNull();
  });

  it('쓰기 자격 있음 → 기존 문구', async () => {
    get.mockResolvedValueOnce(accessRes({ allowed: true, reason: null }));
    renderPrompt();
    expect(await screen.findByText('관심 있는 포럼을 선택하고 글을 작성해 보세요')).toBeTruthy();
  });

  it('조회 실패 → 기존 문구(회귀 없음)', async () => {
    get.mockRejectedValueOnce(new Error('network'));
    renderPrompt();
    expect(await screen.findByText('관심 있는 포럼을 선택하고 글을 작성해 보세요')).toBeTruthy();
  });

  it('미인증 → 조회 0 · 로그인 유도', () => {
    mockUser = null;
    renderPrompt();
    expect(screen.getByText('포럼에 참여해 보세요')).toBeTruthy();
    expect(get).not.toHaveBeenCalled();
  });
});
