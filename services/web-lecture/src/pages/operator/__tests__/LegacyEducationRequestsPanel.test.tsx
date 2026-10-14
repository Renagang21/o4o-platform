import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  it('reports list failure without a false empty result and retries', async () => {
    get.mockRejectedValueOnce(new Error('unavailable'));
    render(<LegacyEducationRequestsPanel />);
    await screen.findByRole('alert');
    expect(screen.queryByText('기존 문의가 없습니다.')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));
    await screen.findByRole('button', { name: '기존 강의 문의 · 문의자' });
  });
  it('does not let an old detail request replace the latest selected inquiry', async () => {
    let first!: (value: unknown) => void;
    get.mockImplementation(async (path: string) => {
      if (path === base) return { data: { data: { items: [inquiry, { ...inquiry, id: 'second', subject: '최신 문의' }], pagination: { totalPages: 1 } } } };
      if (path.endsWith('/existing-id')) return new Promise(resolve => { first = resolve; });
      return { data: { data: { ...inquiry, id: 'second', subject: '최신 문의', email: 'synthetic@example.invalid', message: '최신 본문' } } };
    });
    render(<LegacyEducationRequestsPanel />);
    fireEvent.click(await screen.findByRole('button', { name: '기존 강의 문의 · 문의자' }));
    fireEvent.click(screen.getByRole('button', { name: '최신 문의 · 문의자' }));
    await screen.findByText('최신 본문');
    await act(async () => first({ data: { data: { ...inquiry, message: '이전 본문' } } }));
    expect(screen.queryByText('이전 본문')).toBeNull();
  });
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

it('keeps a saved status distinct from a failed list refresh and retries reads only', async () => {
  get.mockImplementationOnce(async () => ({ data: { data: { items: [inquiry], pagination: { totalPages: 1 } } } }))
    .mockResolvedValueOnce({ data: { data: { ...inquiry, email: 'synthetic@example.invalid', message: '기존 문의 내용' } } })
    .mockRejectedValueOnce(new Error('read failed'))
    .mockResolvedValueOnce({ data: { data: { items: [{ ...inquiry, status: 'done' }], pagination: { totalPages: 1 } } } });
  render(<LegacyEducationRequestsPanel />);
  fireEvent.click(await screen.findByRole('button', { name: '기존 강의 문의 · 문의자' })); await screen.findByText('기존 문의 내용');
  fireEvent.change(screen.getByLabelText('처리 상태'), { target: { value: 'done' } });
  await screen.findByRole('status');
  expect((screen.getByLabelText('처리 상태') as HTMLSelectElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));
  await waitFor(() => expect((screen.getByLabelText('처리 상태') as HTMLSelectElement).disabled).toBe(false));
  expect((screen.getByLabelText('처리 상태') as HTMLSelectElement).value).toBe('done'); expect(patch).toHaveBeenCalledTimes(1);
});
it('retries the failed detail without confusing it with a list retry', async () => {
  get.mockRejectedValueOnce(new Error('list')); render(<LegacyEducationRequestsPanel />); await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));
  await screen.findByRole('button', { name: '기존 강의 문의 · 문의자' });
  get.mockRejectedValueOnce(new Error('detail'));
  fireEvent.click(screen.getByRole('button', { name: '기존 강의 문의 · 문의자' }));
  await screen.findByText('문의 상세를 불러오지 못했습니다.');
  fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));
  await screen.findByText('기존 문의 내용'); expect(get).toHaveBeenLastCalledWith(`${base}/existing-id`);
});
