/**
 * UserDetailPage — 비밀번호 변경 모달 serviceKey 선택 회귀검증
 *
 * WO-O4O-OPERATOR-USER-DETAIL-PASSWORD-SERVICEKEY-SELECTION-V1
 *
 * 계약:
 *   후보 = 상세 API 가 운영자 scope 로 필터해 내려준 memberships (신규 API 없음)
 *   후보 0 → 변경 불가 안내 + 제출 비활성
 *   후보 1 → 서비스명 표시 + 자동 확정
 *   후보 복수 → 명시적 선택 필수
 *   payload → { password, serviceKey }
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import UserDetailPage from '../UserDetailPage';
import type { UserDetailApiAdapter, MembershipData } from '../user-detail.types';

const USER = {
  id: 'u-1',
  email: 'member@example.com',
  name: '홍길동',
  status: 'active',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
};

let membershipSeq = 0;
function membership(serviceKey: string): MembershipData {
  return {
    id: `m-${serviceKey}-${++membershipSeq}`,
    serviceKey,
    status: 'active',
    role: 'member',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function makeAdapter(memberships: MembershipData[]) {
  const put = vi.fn().mockResolvedValue({ success: true });
  const adapter: UserDetailApiAdapter = {
    get: vi.fn(async (path: string) => {
      if (path.startsWith('/operator/members/')) return { user: USER, roles: [], memberships };
      return { success: true, data: [] };
    }),
    put,
    post: vi.fn().mockResolvedValue({ success: true }),
    patch: vi.fn().mockResolvedValue({ success: true }),
    delete: vi.fn().mockResolvedValue({ success: true }),
  };
  return { adapter, put };
}

async function openPasswordModal(memberships: MembershipData[]) {
  const { adapter, put } = makeAdapter(memberships);
  render(
    <UserDetailPage
      apiAdapter={adapter}
      config={{ theme: 'primary', labels: { businessInfoTitle: '사업자 정보', businessNameLabel: '사업자명' } }}
      isAdmin
      navigate={() => {}}
      userId="u-1"
    />,
  );
  const trigger = await screen.findByRole('button', { name: /비밀번호 변경/ });
  fireEvent.click(trigger);
  await screen.findByRole('heading', { name: '비밀번호 변경' });
  return { put };
}

function submitButton() {
  return screen.getAllByRole('button', { name: '변경' }).slice(-1)[0] as HTMLButtonElement;
}

beforeEach(() => {
  vi.spyOn(window, 'alert').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('PasswordModal — 대상 서비스 확정', () => {
  it('후보 0개: 변경 불가 안내 + 제출 비활성', async () => {
    const { put } = await openPasswordModal([]);
    expect(screen.getByText(/비밀번호를 변경할 수 있는 서비스가 없습니다/)).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(submitButton().disabled).toBe(true);
    expect(put).not.toHaveBeenCalled();
  });

  it('후보 1개: 서비스명 표시 + 자동 확정 후 { password, serviceKey } 전송', async () => {
    const { put } = await openPasswordModal([membership('glycopharm')]);
    expect(screen.getByText('대상 서비스')).toBeTruthy();
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(submitButton().disabled).toBe(false);

    fireEvent.change(screen.getByPlaceholderText(/새 비밀번호/), { target: { value: 'newpass123' } });
    fireEvent.click(submitButton());

    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    expect(put).toHaveBeenCalledWith('/operator/members/u-1', { password: 'newpass123', serviceKey: 'glycopharm' });
  });

  it('후보 복수: 선택 전 제출 비활성 · 선택 후 그 serviceKey 로 전송', async () => {
    const { put } = await openPasswordModal([membership('glycopharm'), membership('k-cosmetics')]);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('');
    expect(submitButton().disabled).toBe(true);

    fireEvent.change(screen.getByPlaceholderText(/새 비밀번호/), { target: { value: 'newpass123' } });
    fireEvent.click(submitButton());
    expect(put).not.toHaveBeenCalled();

    fireEvent.change(select, { target: { value: 'k-cosmetics' } });
    expect(submitButton().disabled).toBe(false);
    fireEvent.click(submitButton());

    await waitFor(() => expect(put).toHaveBeenCalledTimes(1));
    expect(put).toHaveBeenCalledWith('/operator/members/u-1', { password: 'newpass123', serviceKey: 'k-cosmetics' });
  });

  it('후보 복수: 중복 serviceKey 는 한 번만 후보로 제시한다', async () => {
    await openPasswordModal([membership('neture'), membership('neture'), membership('kpa-society')]);
    const options = screen.getAllByRole('option').map((o) => (o as HTMLOptionElement).value);
    expect(options.filter((v) => v === 'neture')).toHaveLength(1);
    expect(options.filter(Boolean).sort()).toEqual(['kpa-society', 'neture']);
  });
});
