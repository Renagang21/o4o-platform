import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import Page from './AdminSemiFranchisePage';

const api = vi.hoisted(() => ({ listSemiFranchises: vi.fn(), listServiceFeatures: vi.fn(), createSemiFranchise: vi.fn(), updateSemiFranchise: vi.fn() }));
vi.mock('./api', () => ({ neturePharmacyAdminApi: api, formatDateTime: () => '', STATUS_CLASS: {}, STATUS_LABEL: {} }));
const business = { id: 'a', key: 'a', name: '합성 사업', status: 'active', service_features: ['tablet'], operators: [] };
beforeEach(() => {
  vi.resetAllMocks();
  api.listSemiFranchises.mockResolvedValue([business]);
  api.listServiceFeatures.mockResolvedValue([{ key: 'tablet', label: '태블릿' }, { key: 'multilingual-content', label: '다국어 상품 콘텐츠' }]);
  api.updateSemiFranchise.mockResolvedValue({});
  api.createSemiFranchise.mockResolvedValue({});
});
afterEach(cleanup);

it('sends selected features on creation without inventing a paid or professional entitlement', async () => {
  render(<Page />);
  await screen.findByRole('button', { name: '수정' });
  fireEvent.change(screen.getByPlaceholderText('key (영문 소문자 · 숫자 · -)'), { target: { value: 'new-business' } });
  fireEvent.change(screen.getByPlaceholderText('이름'), { target: { value: '새 합성 사업' } });
  fireEvent.click(screen.getByLabelText('태블릿'));
  fireEvent.click(screen.getByRole('button', { name: '만들기' }));
  await waitFor(() => expect(api.createSemiFranchise).toHaveBeenCalledWith(expect.objectContaining({ key: 'new-business', serviceFeatures: ['tablet'] })));
});

it('loads persisted selections, preserves a failed edit, and permits explicit clearing on retry', async () => {
  api.updateSemiFranchise.mockRejectedValueOnce(new Error('저장 실패'));
  render(<Page />);
  fireEvent.click(await screen.findByRole('button', { name: '수정' }));
  const fieldset = screen.getAllByRole('group', { name: '제공 기능' })[1];
  const tablet = within(fieldset).getByLabelText('태블릿') as HTMLInputElement;
  expect(tablet.checked).toBe(true);
  fireEvent.click(tablet);
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await screen.findByText('저장 실패');
  expect(tablet.checked).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  await waitFor(() => expect(api.updateSemiFranchise).toHaveBeenLastCalledWith('a', expect.objectContaining({ serviceFeatures: [] })));
  await screen.findByRole('button', { name: '수정' });
});

it('does not replace unknown configuration with empty grants after a failed load; supports retry', async () => {
  api.listServiceFeatures.mockRejectedValueOnce(new Error('조회 실패'));
  render(<Page />);
  await screen.findByText('조회 실패');
  expect((screen.getByRole('button', { name: '만들기' }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.queryByRole('button', { name: '수정' })).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: '설정 다시 불러오기' }));
  await screen.findByRole('button', { name: '수정' });
});

it('locks feature edits, cancellation and other business selection during a save', async () => {
  let finish!: () => void;
  api.updateSemiFranchise.mockImplementation(() => new Promise<void>(resolve => { finish = resolve; }));
  render(<Page />);
  fireEvent.click(await screen.findByRole('button', { name: '수정' }));
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  expect((screen.getByRole('button', { name: '취소' }) as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getAllByRole('group', { name: '제공 기능' })[1] as HTMLFieldSetElement).disabled).toBe(true);
  finish();
  await screen.findByRole('button', { name: '수정' });
});
