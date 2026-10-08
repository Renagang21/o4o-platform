import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import LegacyEducationRequestsPanel from '../LegacyEducationRequestsPanel';

const { get, patch } = vi.hoisted(() => ({ get: vi.fn(), patch: vi.fn() }));
vi.mock('../../../lib/apiClient', () => ({ api: { get, patch } }));
const base = '/admin/services/lecture/legacy-education-requests';
const inquiry = { id: 'existing-id', subject: '기존 강의 문의', name: '문의자',
  organizationName: null, status: 'pending', createdAt: '2026-01-01T00:00:00Z' };

beforeEach(() => {
  vi.resetAllMocks();
  get.mockImplementation(async (path: string) => ({ data: { data: path === base
    ? { items: [inquiry], pagination: { totalPages: 1 } }
    : { ...inquiry, email: 'synthetic@example.invalid', phone: null, message: '기존 문의 내용' } } }));
  patch.mockResolvedValue({ data: { success: true } });
});
afterEach(cleanup);

describe('Study handles pre-existing education inquiries', () => {
  it('opens the existing record and saves its status through the Study operator API', async () => {
    render(<LegacyEducationRequestsPanel />);
    fireEvent.click(await screen.findByRole('button', { name: '기존 강의 문의 · 문의자' }));
    expect(await screen.findByText('기존 문의 내용')).toBeTruthy();
    fireEvent.change(screen.getByLabelText('처리 상태'), { target: { value: 'done' } });
    await waitFor(() => expect(patch).toHaveBeenCalledWith(`${base}/existing-id/status`, { status: 'done' }));
    await waitFor(() => expect((screen.getByLabelText('처리 상태') as HTMLSelectElement).value).toBe('done'));
    expect(get).toHaveBeenCalledWith(`${base}/existing-id`);
  });

  it('reports a failed save and retains the previous status', async () => {
    patch.mockRejectedValue(new Error('unavailable'));
    render(<LegacyEducationRequestsPanel />);
    fireEvent.click(await screen.findByRole('button', { name: '기존 강의 문의 · 문의자' }));
    await screen.findByText('기존 문의 내용');
    fireEvent.change(screen.getByLabelText('처리 상태'), { target: { value: 'done' } });
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', '문의 상태를 저장하지 못했습니다.');
    expect((screen.getByLabelText('처리 상태') as HTMLSelectElement).value).toBe('pending');
  });
});
