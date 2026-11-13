import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock('../../../lib/apiClient', () => ({ authClient: { api: state } }));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'staff' }, isLoading: false }) }));
import { ConsultationAccessNotice, consultationAccessError } from './ConsultationAccessNotice';
afterEach(() => { cleanup(); vi.resetAllMocks(); });
const mode = { key: 'counter-pharmacist', label: '약사', professional: true, entitled: true, allowed: false };
it('explains a missing store feature in plain words without asking for per-account pharmacist steps', () => {
  const reload = vi.fn(); render(<ConsultationAccessNotice mode={{ ...mode, entitled: false }} onReload={reload} />);
  expect(screen.getByRole('heading', { name: '이 매장에서 약사 상담을 아직 쓸 수 없습니다' })).toBeTruthy();
  expect(screen.getByText(/매장의 이용 기능\(기본 · 유료 · 협업\)/)).toBeTruthy();
  expect(screen.queryByText(/약사 자격|면허/)).toBeNull();
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
it('names a non-pharmacist consultation generically', () => {
  render(<ConsultationAccessNotice mode={{ ...mode, professional: false, entitled: false }} onReload={vi.fn()} />);
  expect(screen.getByRole('heading', { name: '이 매장에서 이 상담을 아직 쓸 수 없습니다' })).toBeTruthy();
});
it.each(['PROFESSIONAL_ACCESS_UNAVAILABLE', 'FEATURE_ACCESS_UNAVAILABLE'])('does not turn %s into a denial', code => {
  expect(consultationAccessError(code)).toContain('자격 미승인으로 판정한 것이 아닙니다');
});
it('provides distinct known access errors and leaves unknown failures to the caller', () => {
  expect(consultationAccessError('PHARMACIST_CONFIRMATION_REQUIRED')).toContain('다시 확인');
  expect(consultationAccessError('SERVICE_FEATURE_REQUIRED')).toContain('매장 경영자');
  expect(consultationAccessError('STORE_ACCESS_REQUIRED')).toContain('선택한 약국');
  expect(consultationAccessError('unknown')).toBeNull();
});
