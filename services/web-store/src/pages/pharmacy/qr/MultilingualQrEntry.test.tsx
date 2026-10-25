import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ get: vi.fn(), qr: vi.fn() }));
vi.mock('../../../api/multilingualProductContentStore', () => ({ getStoreMlcGroup: api.get, getMlcQr: api.qr }));
import { MultilingualQrEntryPanel } from './MultilingualQrEntry';
import { readMultilingualQrEntry } from '../multilingual/MultilingualChannelActions';
const select = vi.fn(), entry = { scope: 'store:kpa', groupId: 'group', locale: 'ja' }, props = { entry, disabled: false, selected: false, onSelect: select, isCurrent: () => true };
beforeEach(() => { vi.clearAllMocks(); api.get.mockResolvedValue({ id: 'group', title: 'Fixture guide', status: 'draft', pages: [{ status: 'published' }] });
  api.qr.mockResolvedValue({ publicKey: 'public', url: 'https://pharmacy.neture.co.kr/multilingual-products/public' }); });
afterEach(cleanup);
it('rechecks the current group and issued link without publishing or creating a QR, preserving locale', async () => {
  render(<MultilingualQrEntryPanel {...props} />); expect(api.get).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: '선택한 안내로 QR 준비' }));
  await waitFor(() => expect(select).toHaveBeenCalledWith(expect.objectContaining({ source: 'mlc', url: 'https://pharmacy.neture.co.kr/multilingual-products/public?locale=ja' })));
  expect(api.get).toHaveBeenCalledWith('group'); expect(api.qr).toHaveBeenCalledWith('group');
});
it('rejects a different store hint and a withdrawn publication', async () => {
  expect(readMultilingualQrEntry({ multilingualQrEntry: entry }, 'other:kpa')).toBeNull();
  api.get.mockResolvedValueOnce({ id: 'group', status: 'archived', pages: [] });
  render(<MultilingualQrEntryPanel {...props} />); fireEvent.click(screen.getByRole('button', { name: '선택한 안내로 QR 준비' }));
  await screen.findByRole('alert'); expect(select).not.toHaveBeenCalled(); expect(api.qr).not.toHaveBeenCalled();
});
it('keeps an unissued link retryable and discards an old response after unmount', async () => {
  api.qr.mockRejectedValueOnce(Object.assign(new Error('not issued'), { code: 'PUBLIC_KEY_NOT_ISSUED' }));
  const view = render(<MultilingualQrEntryPanel {...props} />); fireEvent.click(screen.getByRole('button', { name: '선택한 안내로 QR 준비' }));
  await screen.findByText(/고객용 링크가 아직 준비되지 않았습니다/);
  let finish!: (value: unknown) => void;
  api.qr.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  fireEvent.click(screen.getByRole('button', { name: '선택한 안내 다시 확인' }));
  await waitFor(() => expect(api.qr).toHaveBeenCalledTimes(2)); view.unmount();
  await act(async () => finish({ publicKey: 'old', url: 'https://pharmacy.neture.co.kr/multilingual-products/old' }));
  expect(select).not.toHaveBeenCalled();
});
