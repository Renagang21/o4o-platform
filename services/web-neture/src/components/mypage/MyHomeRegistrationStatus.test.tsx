import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const get = vi.fn();
vi.mock('../../lib/apiClient', () => ({ authClient: { api: { get: (...args: unknown[]) => get(...args) } } }));

import { MyHomeRegistrationStatus, registrationStatusView } from './MyHomeRegistrationStatus';

afterEach(() => { cleanup(); get.mockReset(); });
const reg = (state: 'pending' | 'approved' | 'rejected', extra: Record<string, unknown> = {}) =>
  ({ requiresRegistration: false, canSubmit: false, registration: { type: 'pharmacist', state, reason: null, ...extra } });

describe('My Home 가입 신청 상태 (2026-11-13 개선 1)', () => {
  it('hides for approved or legacy accounts and explains every open state', () => {
    expect(registrationStatusView(null)).toBeNull();
    expect(registrationStatusView({ requiresRegistration: false, canSubmit: true, registration: null })).toBeNull();
    expect(registrationStatusView(reg('approved'))).toBeNull();
    expect(registrationStatusView(reg('pending'))).toMatchObject({ tone: 'info', title: '가입 신청을 심사하고 있습니다', action: '제출 내용 보기' });
    expect(registrationStatusView({ ...reg('pending'), canSubmit: true })).toMatchObject({ title: '가입 신청을 아직 제출하지 않았습니다', action: '이어서 작성' });
    expect(registrationStatusView({ requiresRegistration: true, canSubmit: true, registration: { type: null, state: 'pending' } })).toMatchObject({ action: '가입 신청하기' });
    expect(registrationStatusView(reg('rejected', { reason: '면허번호 확인 필요' }))).toMatchObject({ tone: 'error', reason: '면허번호 확인 필요', action: '고쳐서 다시 제출' });
  });

  it('shows a rejected registration with its reason and a link back to the form', async () => {
    get.mockResolvedValueOnce({ data: { data: reg('rejected', { reason: '사업자등록번호 불일치' }) } });
    render(<MemoryRouter><MyHomeRegistrationStatus accountId="u-1" /></MemoryRouter>);
    expect(await screen.findByText('가입 신청이 반려되었습니다')).toBeTruthy();
    expect(screen.getByText('반려 사유: 사업자등록번호 불일치')).toBeTruthy();
    expect(screen.getByRole('link', { name: /고쳐서 다시 제출/ }).getAttribute('href')).toBe('/signup');
    expect(get).toHaveBeenCalledWith('/member-registration/self');
  });

  it('shows nothing when the lookup fails', async () => {
    get.mockRejectedValueOnce(new Error('network'));
    const { container } = render(<MemoryRouter><MyHomeRegistrationStatus accountId="u-1" /></MemoryRouter>);
    await Promise.resolve(); await Promise.resolve();
    expect(container.textContent).toBe('');
  });
});
