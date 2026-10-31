import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { MediaPickerModal, type MediaAssetItem, type MediaPickerApi } from '@o4o/store-ui-core';
const asset = { id: 'video-one', url: '/file.mp4', originalName: 'Pharmacy video', assetType: 'video', folder: 'general' } as MediaAssetItem;
let api: MediaPickerApi;
beforeEach(() => {
  api = { list: vi.fn().mockResolvedValue({ success: true, data: [asset] }), upload: vi.fn().mockResolvedValue({ success: true, data: asset }), moveToFolder: vi.fn(), deleteAsset: vi.fn() };
  URL.createObjectURL = vi.fn().mockReturnValue('blob:preview'); URL.revokeObjectURL = vi.fn();
});
afterEach(cleanup);
it('filters the library to videos and selects an existing retained asset', async () => {
  vi.mocked(api.list).mockResolvedValue({ success: true, data: [asset, { ...asset, id: 'image', assetType: 'image', originalName: 'Image' }] });
  const select = vi.fn(); render(<MediaPickerModal open api={api} assetType="video" onSelect={select} onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: /라이브러리/ })); await screen.findByText('Pharmacy video');
  expect(api.list).toHaveBeenCalledWith(expect.objectContaining({ assetType: 'video' })); expect(screen.queryByText('Image')).toBeNull();
  fireEvent.click(screen.getByText('Pharmacy video')); fireEvent.click(screen.getByRole('button', { name: '선택' })); expect(select).toHaveBeenCalledWith(asset);
});
it('requires the existing shared-library consent, prevents double upload, and retains the completed result', async () => {
  let resolve!: (value: any) => void; vi.mocked(api.upload).mockReturnValue(new Promise(yes => { resolve = yes; }));
  const select = vi.fn(); render(<MediaPickerModal open api={api} assetType="video" onSelect={select} onClose={vi.fn()} />);
  fireEvent.change(document.querySelector('input[type=file]')!, { target: { files: [new File(['video'], 'pharmacy.mp4', { type: 'video/mp4' })] } });
  const upload = screen.getByRole('button', { name: '업로드' }); expect((upload as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(upload); fireEvent.click(upload); expect(api.upload).toHaveBeenCalledTimes(1);
  await act(async () => resolve({ success: true, data: asset }));
  fireEvent.click(screen.getByRole('button', { name: '이 영상 선택' })); expect(select).toHaveBeenCalledWith(asset);
  expect(api.upload).toHaveBeenCalledTimes(1);
});
it('does not attach the old upload result after close and reopen for the same pharmacy', async () => {
  let resolve!: (value: any) => void; vi.mocked(api.upload).mockReturnValue(new Promise(yes => { resolve = yes; }));
  const props = { api, assetType: 'video' as const, contextKey: 'same', onSelect: vi.fn(), onClose: vi.fn() };
  const view = render(<MediaPickerModal open {...props} />);
  fireEvent.change(document.querySelector('input[type=file]')!, { target: { files: [new File(['video'], 'pharmacy.mp4', { type: 'video/mp4' })] } });
  fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: '업로드' }));
  view.rerender(<MediaPickerModal open={false} {...props} />); view.rerender(<MediaPickerModal open {...props} />);
  await act(async () => resolve({ success: true, data: asset })); expect(screen.queryByText('업로드 완료')).toBeNull(); expect(props.onSelect).not.toHaveBeenCalled();
});
it('discards a delayed list response after a direct pharmacy switch and loads the new scope', async () => {
  let resolve!: (value: any) => void; vi.mocked(api.list).mockReturnValueOnce(new Promise(yes => { resolve = yes; }));
  const props = { api, assetType: 'video' as const, onSelect: vi.fn(), onClose: vi.fn() };
  const view = render(<MediaPickerModal open contextKey="A" {...props} />); fireEvent.click(screen.getByRole('button', { name: /라이브러리/ }));
  view.rerender(<MediaPickerModal open contextKey="B" {...props} />);
  await waitFor(() => expect(api.list).toHaveBeenCalledTimes(2));
  await act(async () => resolve({ success: true, data: [{ ...asset, id: 'old', originalName: 'Old store' }] }));
  expect(screen.queryByText('Old store')).toBeNull(); await screen.findByText('Pharmacy video');
});
it('keeps image mode as the default and gives an actionable oversized video error', () => {
  const view = render(<MediaPickerModal open api={api} onSelect={vi.fn()} onClose={vi.fn()} />);
  expect(document.querySelector('input[type=file]')?.getAttribute('accept')).toContain('image/png');
  view.rerender(<MediaPickerModal open assetType="video" api={api} onSelect={vi.fn()} onClose={vi.fn()} />);
  const file = new File(['x'], 'large.mp4', { type: 'video/mp4' }); Object.defineProperty(file, 'size', { value: 31 * 1024 * 1024 });
  fireEvent.change(document.querySelector('input[type=file]')!, { target: { files: [file] } });
  expect(screen.getByText(/큰 영상은 YouTube/)).toBeTruthy(); expect(api.upload).not.toHaveBeenCalled();
});
