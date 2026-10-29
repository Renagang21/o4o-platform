import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('../../../lib/apiClient', () => ({ authClient: { api: state } }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'staff' }, isLoading: false }) }));
import { ConsultationAccessNotice, consultationAccessError } from './ConsultationAccessNotice';
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const mode = { key: 'counter-pharmacist', label: '약사', professional: true, entitled: true, allowed: false };
it('distinguishes confirmed entitlement from combined qualification and store checks without guessing the missing condition', () => {
  const reload = vi.fn(); render(<ConsultationAccessNotice mode={mode} onReload={reload} />);
  expect(screen.getByText(/둘 중 하나라도 확인되지 않으면/)).toBeTruthy();
  expect(screen.getByText(/중앙 담당자의 면허 근거 검토/)).toBeTruthy();
  expect(screen.getByRole('link', { name: '내 매장으로' }).getAttribute('href')).toBe('/store/workspace/use');
  expect(state.post).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '이용 상태 다시 확인' })); expect(reload).toHaveBeenCalledOnce();
});
it('uses existing My Home handoff and exposes a retry when handoff fails', async () => {
  state.post.mockRejectedValue(Error('offline'));
  render(<ConsultationAccessNotice mode={mode} onReload={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'My Home' }));
  await screen.findByRole('alert');
  expect(state.post).toHaveBeenCalledWith('/auth/handoff', { targetServiceKey: 'neture', returnPath: '/mypage' });
  expect((screen.getByRole('button', { name: 'My Home' }) as HTMLButtonElement).disabled).toBe(false);
});
it('does not label a missing service entitlement as a personal qualification rejection', () => {
  render(<ConsultationAccessNotice mode={{ ...mode, professional: false, entitled: false }} onReload={vi.fn()} />);
  expect(screen.getByText(/기본·유료·협업체/)).toBeTruthy();
  expect(screen.queryByText(/중앙 담당자의 면허 근거 검토/)).toBeNull();
});
it.each(['PROFESSIONAL_ACCESS_UNAVAILABLE', 'FEATURE_ACCESS_UNAVAILABLE'])('does not turn %s into a denial', code => {
  expect(consultationAccessError(code)).toContain('자격 미승인으로 판정한 것이 아닙니다');
});
it('provides distinct known access errors and leaves unknown failures to the caller', () => {
  expect(consultationAccessError('PHARMACIST_CONFIRMATION_REQUIRED')).toContain('개인의 승인된 약사 자격');
  expect(consultationAccessError('SERVICE_FEATURE_REQUIRED')).toContain('근무자별');
  expect(consultationAccessError('STORE_ACCESS_REQUIRED')).toContain('선택한 약국');
  expect(consultationAccessError('unknown')).toBeNull();
});
