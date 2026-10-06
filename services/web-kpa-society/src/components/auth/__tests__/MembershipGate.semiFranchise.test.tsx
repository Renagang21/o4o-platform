/**
 * WO-NETURE-PHARMACY-CUTOVER-COMPAT-V1 — pharmacy.neture.co.kr 화면 게이트의 세미프랜차이즈 자격
 *
 *   G1 kpa-society active → 기존대로 통과 · 자격 조회 0
 *   G2 membership 없음 + 서버 판정 allowed → 통과 (기본 active ∧ pharmacy active 는 서버가 판정)
 *   G3 membership 없음 + 미충족 → 서버 문구 + 상태별 신청 링크(store.neture.co.kr) · 정지는 링크 없음
 *   G4 기존 kpa-society 이력(pending 등) + 미충족 → 기존 상태 안내 화면 유지
 *   G5 조회 실패 → 차단 쪽(기존 안내)
 *   helper: next → 링크 매핑 · 응답 형식 검증
 *
 * 실행: 저장소 루트에서 `npx vitest run --config services/web-kpa-society/vitest.config.mjs`
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const get = vi.fn();
let mockUser: Record<string, unknown> | null = null;
vi.mock('../../../contexts/AuthContext', () => ({
  authClient: { api: { get: (...a: unknown[]) => get(...a) } },
  useAuth: () => ({ user: mockUser, isAuthenticated: !!mockUser, isLoading: false }),
}));

import { MembershipGate } from '../MembershipGate';
import { fetchSemiFranchiseServiceAccess, semiFranchiseAccessLink } from '../../../lib/semiFranchiseAccess';

const access = (over: Record<string, unknown>) => ({
  data: {
    success: true,
    data: { semiFranchiseKey: 'pharmacy', allowed: false, pharmacyMembershipStatus: null, semiFranchiseMembershipStatus: null, next: null, message: null, ...over },
  },
});

function renderGate() {
  return render(
    <MemoryRouter>
      <MembershipGate><p>보호된 화면</p></MembershipGate>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  get.mockReset();
  mockUser = { id: 'u1', roles: [], memberships: [] };
});
afterEach(() => cleanup());

describe('MembershipGate — 세미프랜차이즈 자격', () => {
  it('G1 kpa-society active → 통과 · 자격 조회 0', async () => {
    mockUser = { id: 'u1', roles: [], memberships: [{ serviceKey: 'kpa-society', status: 'active' }] };
    renderGate();
    expect(await screen.findByText('보호된 화면')).toBeTruthy();
    expect(get).not.toHaveBeenCalled();
  });

  it('G2 membership 없음 + allowed → 통과', async () => {
    get.mockResolvedValueOnce(access({ allowed: true, pharmacyMembershipStatus: 'active', semiFranchiseMembershipStatus: 'active' }));
    renderGate();
    expect(await screen.findByText('보호된 화면')).toBeTruthy();
    expect(get).toHaveBeenCalledWith('/neture/pharmacy/service-access/kpa-society');
  });

  it('G3 미충족(apply_semi_franchise) → 서버 문구 + 세미프랜차이즈 신청 버튼', async () => {
    get.mockResolvedValueOnce(access({ pharmacyMembershipStatus: 'active', next: 'apply_semi_franchise', message: '세미프랜차이즈 가입을 신청해 주세요.' }));
    renderGate();
    expect(await screen.findByText('세미프랜차이즈 가입을 신청해 주세요.')).toBeTruthy();
    expect(screen.getByRole('button', { name: '세미프랜차이즈 가입 신청' })).toBeTruthy();
    expect(screen.queryByText('보호된 화면')).toBeNull();
  });

  it('G3 정지(semi_franchise_suspended) → 문구만 · 신청 버튼 없음', async () => {
    get.mockResolvedValueOnce(access({ pharmacyMembershipStatus: 'active', semiFranchiseMembershipStatus: 'suspended', next: 'semi_franchise_suspended', message: '운영자에게 문의해 주세요.' }));
    renderGate();
    expect(await screen.findByText('운영자에게 문의해 주세요.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /신청/ })).toBeNull();
    expect(screen.getByRole('button', { name: '홈으로 돌아가기' })).toBeTruthy();
  });

  it('G4 기존 kpa-society pending + 미충족 → 기존 상태 안내(세미프랜차이즈 안내 아님)', async () => {
    mockUser = { id: 'u1', roles: [], memberships: [{ serviceKey: 'kpa-society', status: 'pending' }] };
    get.mockResolvedValueOnce(access({ next: 'apply_pharmacy', message: '약국 가입을 먼저 신청해 주세요.' }));
    renderGate();
    expect(await screen.findByRole('button', { name: '홈으로 돌아가기' })).toBeTruthy();
    expect(screen.queryByText('약국 가입을 먼저 신청해 주세요.')).toBeNull();
    expect(screen.queryByText('보호된 화면')).toBeNull();
  });

  it('G4 기존 kpa-society pending + allowed → 통과 (로그인 · handoff 와 같은 판정)', async () => {
    mockUser = { id: 'u1', roles: [], memberships: [{ serviceKey: 'kpa-society', status: 'pending' }] };
    get.mockResolvedValueOnce(access({ allowed: true }));
    renderGate();
    expect(await screen.findByText('보호된 화면')).toBeTruthy();
  });

  it.each(['suspended', 'withdrawn'])('G6 독립 자격 — kpa-society %s + Neture 두 자격 allowed → 통과', async (status) => {
    mockUser = { id: 'u1', roles: [], memberships: [{ serviceKey: 'kpa-society', status }] };
    get.mockResolvedValueOnce(access({ allowed: true }));
    renderGate();
    expect(await screen.findByText('보호된 화면')).toBeTruthy();
  });

  it('G5 조회 실패 → 차단(기존 안내)', async () => {
    get.mockRejectedValueOnce(new Error('network'));
    renderGate();
    expect(await screen.findByRole('button', { name: '홈으로 돌아가기' })).toBeTruthy();
    expect(screen.queryByText('보호된 화면')).toBeNull();
  });
});

describe('semiFranchiseAccess helper', () => {
  it.each([
    ['apply_pharmacy', 'https://store.neture.co.kr/start-pharmacy'],
    ['pharmacy_pending', 'https://store.neture.co.kr/start-pharmacy'],
    ['apply_semi_franchise', 'https://store.neture.co.kr/store/pharmacy/semi-franchises'],
    ['semi_franchise_pending', 'https://store.neture.co.kr/store/pharmacy/semi-franchises'],
  ])('%s → %s', (next, href) => {
    expect(semiFranchiseAccessLink(next)?.href).toBe(href);
  });

  it.each([['pharmacy_suspended'], ['semi_franchise_suspended'], [null], ['unknown']])('%s → 링크 없음', (next) => {
    expect(semiFranchiseAccessLink(next)).toBeNull();
  });

  it('형식이 다른 응답은 null', async () => {
    const api = { get: vi.fn().mockResolvedValue({ data: { success: true, data: { allowed: 'yes' } } }) };
    expect(await fetchSemiFranchiseServiceAccess(api, 'kpa-society')).toBeNull();
  });
});
