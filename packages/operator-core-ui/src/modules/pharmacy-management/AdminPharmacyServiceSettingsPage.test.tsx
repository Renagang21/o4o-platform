import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { configurePharmacyManagementClient } from './api';
import Page from './AdminPharmacyServiceSettingsPage';

const get = vi.fn(); const put = vi.fn();
const envelope = (data: unknown) => ({ data: { success: true, data } });
const policy = { features: [{ key: 'tablet', label: '태블릿' }, { key: 'store-staff-support', label: '매장 직원 지원' }],
  targets: [{ key: 'default', name: '기본 제공 · 전체 약국', features: [] }, { key: 'paid', name: '유료회원', features: ['tablet'] },
    { key: 'business:warehouse', name: '협력사업 · 합성 사업', features: ['store-staff-support'], status: 'closed' }] };
beforeEach(() => {
  vi.clearAllMocks(); get.mockResolvedValue(envelope(policy)); put.mockResolvedValue(envelope({}));
  configurePharmacyManagementClient({ get, put, post: vi.fn(), patch: vi.fn(), delete: vi.fn() });
});
afterEach(cleanup);
const renderPage = () => render(<MemoryRouter><Page /></MemoryRouter>);
it('edits the selected audience and retains the saved value when switching audiences', async () => {
  renderPage(); const targets = await screen.findByRole('combobox', { name: '설정 대상' });
  fireEvent.change(targets, { target: { value: 'paid' } });
  expect((screen.getByRole('checkbox', { name: '태블릿' }) as HTMLInputElement).checked).toBe(true);
  fireEvent.click(screen.getByRole('checkbox', { name: '매장 직원 지원' }));
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await screen.findByRole('status');
  expect(put).toHaveBeenCalledWith('/neture/admin/service-feature-policies/paid', { features: ['tablet', 'store-staff-support'] });
  fireEvent.change(targets, { target: { value: 'default' } });
  expect((screen.getByRole('checkbox', { name: '태블릿' }) as HTMLInputElement).checked).toBe(false);
  fireEvent.change(targets, { target: { value: 'paid' } });
  expect((screen.getByRole('checkbox', { name: '매장 직원 지원' }) as HTMLInputElement).checked).toBe(true);
});
it('does not show an empty policy on failed load and supports retry', async () => {
  get.mockRejectedValueOnce(new Error('offline')); renderPage();
  await screen.findByRole('alert');
  expect(screen.queryByRole('button', { name: '저장' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  await screen.findByRole('combobox');
});
it('retains selections after a save failure and cannot change target while saving', async () => {
  let finish!: (value: unknown) => void;
  put.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  renderPage(); const targets = await screen.findByRole('combobox');
  fireEvent.click(screen.getByRole('checkbox', { name: '태블릿' }));
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  expect((targets as HTMLSelectElement).disabled).toBe(true);
  finish({ data: { success: false } });
  await screen.findByRole('alert');
  expect((screen.getByRole('checkbox', { name: '태블릿' }) as HTMLInputElement).checked).toBe(true);
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await waitFor(() => expect(put).toHaveBeenCalledTimes(2));
});
it('shows closed business status and uses its explicit registry key', async () => {
  renderPage(); fireEvent.change(await screen.findByRole('combobox'), { target: { value: 'business:warehouse' } });
  expect(screen.getByText(/마감된 사업입니다/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await waitFor(() => expect(put).toHaveBeenCalledWith('/neture/admin/service-feature-policies/business%3Awarehouse', { features: ['store-staff-support'] }));
});
