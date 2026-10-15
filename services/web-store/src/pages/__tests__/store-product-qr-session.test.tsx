import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { StoreProductQrModal } from '../pharmacy/StoreProductQrModal';
const mocks = vi.hoisted(() => ({ qr: vi.fn(), file: vi.fn(), error: vi.fn() }));
vi.mock('../../api/handledProducts', () => ({ fetchHandledProductQr: mocks.qr, fetchHandledProductQrFile: mocks.file }));
vi.mock('@o4o/error-handling', () => ({ toast: { error: mocks.error } }));
const a = { name: '상품 A', sourceType: 'listing' as const, sourceId: 'listing-a' };
const b = { name: '상품 B', sourceType: 'listing' as const, sourceId: 'listing-b' };
function deferred() {
  let resolve!: (blob: Blob) => void, reject!: (error: Error) => void;
  const promise = new Promise<Blob>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
let click: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.qr.mockResolvedValue({ qr: { svg: '<svg></svg>', url: 'https://example.test/product', publicKey: 'fixture' }, languages: ['ko'] });
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:fixture'), revokeObjectURL: vi.fn() }));
  click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function image() {
  fireEvent.click(await screen.findByRole('button', { name: '다운로드' }));
  fireEvent.click(screen.getByRole('button', { name: 'PNG (이미지)' }));
}
it.each(['close', 'switch', 'unmount'] as const)('%s invalidates an unfinished download', async mode => {
  const old = deferred(); mocks.file.mockReturnValue(old.promise);
  const props = { open: true, target: a, onClose: vi.fn() };
  const view = render(<StoreProductQrModal {...props} />);
  await image();
  if (mode === 'unmount') view.unmount();
  else view.rerender(<StoreProductQrModal {...props} open={mode !== 'close'} target={mode === 'switch' ? b : a} />);
  await act(async () => old.resolve(new Blob(['old'])));
  expect(click).not.toHaveBeenCalled();
});
it('an old failure neither displays a toast nor unlocks the current download', async () => {
  const old = deferred(), current = deferred();
  mocks.file.mockReturnValueOnce(old.promise).mockReturnValueOnce(current.promise);
  const props = { open: true, onClose: vi.fn() };
  const view = render(<StoreProductQrModal {...props} target={a} />);
  await image(); view.rerender(<StoreProductQrModal {...props} target={b} />);
  await image();
  await act(async () => old.reject(new Error('Old failure')));
  expect(mocks.error).not.toHaveBeenCalled();
  expect((screen.getByRole('button', { name: '다운로드' }) as HTMLButtonElement).disabled).toBe(true);
  await act(async () => current.resolve(new Blob(['current'])));
  expect(click).toHaveBeenCalledTimes(1);
  expect((click.mock.instances[0] as HTMLAnchorElement).download).toBe('상품-B-QR.png');
  expect(mocks.file).toHaveBeenLastCalledWith('listing', 'listing-b', 'png');
});
it('PDF keeps the selected physical size and reports a current failure', async () => {
  mocks.file.mockRejectedValue(new Error('Current failure'));
  render(<StoreProductQrModal open target={a} onClose={vi.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: '인쇄' }));
  fireEvent.click(screen.getByRole('button', { name: '대형 80mm' }));
  fireEvent.click(screen.getByRole('button', { name: 'PDF 저장' }));
  await act(async () => {});
  expect(mocks.file).toHaveBeenCalledWith('listing', 'listing-a', 'pdf', 80);
  expect(mocks.error).toHaveBeenCalledWith('Current failure');
  expect(click).not.toHaveBeenCalled();
});
it('a same-product prop refresh preserves an active download', async () => {
  const pending = deferred(); mocks.file.mockReturnValue(pending.promise);
  const props = { open: true, onClose: vi.fn() };
  const view = render(<StoreProductQrModal {...props} target={a} />);
  await image(); view.rerender(<StoreProductQrModal {...props} target={{ ...a }} />);
  await act(async () => pending.resolve(new Blob(['current'])));
  expect(click).toHaveBeenCalledTimes(1);
});
it('closing the size view suppresses a pending PDF export', async () => {
  const pending = deferred(); mocks.file.mockReturnValue(pending.promise);
  const props = { open: true, target: a, onClose: vi.fn() };
  const view = render(<StoreProductQrModal {...props} />);
  fireEvent.click(await screen.findByRole('button', { name: '인쇄' }));
  fireEvent.click(screen.getByRole('button', { name: 'PDF 저장' }));
  view.rerender(<StoreProductQrModal {...props} open={false} />);
  await act(async () => pending.resolve(new Blob(['old PDF'])));
  expect(click).not.toHaveBeenCalled();
});
