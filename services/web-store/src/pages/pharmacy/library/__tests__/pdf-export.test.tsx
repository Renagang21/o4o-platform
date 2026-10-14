import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ContentPdfExportModal, type PdfExportContent } from '../../ContentPdfExportModal';
import { buildPrintHtml, contentJsonToHtml } from '../pdfExportDocument';

const api = vi.hoisted(() => ({ store: 'A', info: vi.fn() }));
vi.mock('../../../../hooks/useStoreOrganizationId', () => ({ useStoreOrganizationId: () => ({ organizationId: api.store }) }));
vi.mock('../../../../lib/storeOrganizationHeader', () => ({ getActiveStoreOrganizationId: () => api.store }));
vi.mock('../../../../lib/serviceContext', () => ({ getActiveServiceKey: () => 'kpa-society' }));
vi.mock('../../../../api/pharmacyInfo', () => ({ getPharmacyInfo: api.info }));
const content: PdfExportContent = { id: 'document', title: 'Fixture', origin: 'snapshot', contentJson: { body: '<p>Current body</p>', html: '<p>Old body</p>' } };
beforeEach(() => { vi.restoreAllMocks(); vi.stubGlobal('URL', Object.assign(class extends URL {}, { createObjectURL: vi.fn(() => 'blob:fixture'), revokeObjectURL: vi.fn() })); api.info.mockReset(); api.store = 'A'; api.info.mockResolvedValue({ organizationId: 'A', name: 'Fixture Store' }); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const show = (onClose = vi.fn()) => render(<ContentPdfExportModal open content={content} onClose={onClose} />);
const generate = () => screen.getByRole('button', { name: '인쇄용 PDF 만들기' });
it('snapshot PDF uses the saved body while direct and execution retain their html contract', () => {
  expect(contentJsonToHtml(content.contentJson, 'snapshot')).toBe('<p>Current body</p>');
  expect(contentJsonToHtml(content.contentJson, 'direct')).toBe('<p>Old body</p>');
  expect(contentJsonToHtml(content.contentJson, 'execution-asset')).toBe('<p>Old body</p>');
  expect(contentJsonToHtml({ body: '', html: '<p>Stale</p>' }, 'snapshot')).toBe('');
});
it('legacy text, image and list blocks survive PDF extraction with escaped attributes', () => {
  const html = contentJsonToHtml({ blocks: [
    { type: 'text', content: 'Legacy <text>' }, { type: 'image', url: 'fixture" onerror="bad' },
    { type: 'list', items: ['First', '<script>Second</script>'] },
  ] }, 'snapshot');
  expect(html).toContain('Legacy &lt;text&gt;'); expect(html).toContain('fixture&quot;');
  expect(html).toContain('<li>First</li>'); expect(html).toContain('&lt;script&gt;Second');
});
function documentHtml(bodyHtml: string, density: 'standard' | 'compact' | 'large' = 'standard') {
  return buildPrintHtml({ contentTitle: '<Fixture>', bodyHtml, density,
    opts: { title: true, pharmacyName: true, phone: true, address: true, consult: true, printDate: false },
    storeName: '<Store>', phone: '<Phone>', address: '<Address>', consultText: '<Consult>' });
}
it('print layout escapes metadata and sanitizes active markup while preserving rich design', () => {
  const html = documentHtml('<p style="color: red; background-color: yellow">Body</p><script>bad()</script><img src="x" onerror="bad()">');
  expect(html).toContain('&lt;Fixture&gt;'); expect(html).toContain('&lt;Store&gt;');
  expect(html).toContain('background-color: yellow'); expect(html).not.toContain('bad()');
  expect(html).toContain('print-color-adjust: exact'); expect(html).toContain('window.print()');
});
it('density choices retain their A4 print contracts and empty bodies have an explicit fallback', () => {
  expect(documentHtml('', 'compact')).toContain('11mm 12mm');
  expect(documentHtml('', 'large')).toContain('15mm 15mm');
  expect(documentHtml('', 'standard')).toContain('14mm 14mm');
  expect(documentHtml('')).toContain('본문 내용이 없습니다.');
});
it('popup block keeps the dialog and options and allows retry in the user gesture', async () => {
  const popup = vi.spyOn(window, 'open').mockReturnValueOnce(null);
  const onClose = vi.fn(); show(onClose);
  await screen.findByRole('checkbox', { name: '약국명' });
  await waitFor(() => expect(screen.getByRole('checkbox', { name: '약국명' }).hasAttribute('disabled')).toBe(false));
  fireEvent.click(screen.getByRole('checkbox', { name: '약국명' }));
  fireEvent.click(generate()); await screen.findByText(/팝업이 차단/);
  expect(onClose).not.toHaveBeenCalled();
  expect((screen.getByRole('checkbox', { name: '약국명' }) as HTMLInputElement).checked).toBe(true);
  const replace = vi.fn();
  const win = { opener: window, location: { replace }, addEventListener: vi.fn(), close: vi.fn() };
  popup.mockReturnValueOnce(win as unknown as Window); fireEvent.click(generate());
  expect(popup).toHaveBeenCalledTimes(2); expect(onClose).toHaveBeenCalledOnce();
  expect(win.opener).toBeNull(); expect(replace).toHaveBeenCalledWith('blob:fixture');
  expect(URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
});
it('window document failure closes the partial window and permits retry', async () => {
  const close = vi.fn(); vi.spyOn(window, 'open').mockReturnValue({ location: { replace: () => { throw Error('synthetic'); } }, addEventListener: vi.fn(), close } as unknown as Window);
  show(); fireEvent.click(generate()); await screen.findByText(/PDF를 준비하지/); expect(close).toHaveBeenCalledOnce();
  expect(generate().hasAttribute('disabled')).toBe(false);
});
it('store-info failure is visible and retry never resets chosen density', async () => {
  api.info.mockRejectedValueOnce(Error('synthetic')).mockResolvedValueOnce({ organizationId: 'A', name: 'Fixture Store' });
  show(); await screen.findByText(/매장 정보를 불러오지/);
  fireEvent.click(screen.getByRole('button', { name: /절약형/ }));
  fireEvent.click(screen.getByRole('button', { name: '매장 정보 다시 시도' }));
  await waitFor(() => expect(api.info).toHaveBeenCalledTimes(2));
  expect(screen.getByRole('button', { name: /절약형/ }).getAttribute('aria-pressed')).toBe('true');
});
it('a foreign store info response never enables its contact fields', async () => {
  api.info.mockResolvedValue({ organizationId: 'B', name: 'Foreign Store' }); show();
  await screen.findByText(/매장 정보를 불러오지/);
  expect(screen.getByRole('checkbox', { name: /약국명/ }).hasAttribute('disabled')).toBe(true);
});
it('closing and reopening discards old info responses and option selections', async () => {
  let resolve!: (value: unknown) => void;
  const pending = new Promise(done => { resolve = done; }); api.info.mockReturnValueOnce(pending);
  const onClose = vi.fn(), { rerender } = show(onClose);
  fireEvent.click(screen.getByRole('button', { name: /절약형/ }));
  rerender(<ContentPdfExportModal open={false} content={content} onClose={onClose} />);
  rerender(<ContentPdfExportModal open content={content} onClose={onClose} />);
  await waitFor(() => expect(api.info).toHaveBeenCalledTimes(2));
  await act(async () => { resolve({ organizationId: 'A', name: 'Old' }); await pending; });
  expect(screen.getByRole('button', { name: /표준형/ }).getAttribute('aria-pressed')).toBe('true');
  const replace = vi.fn(); vi.spyOn(window, 'open').mockReturnValue({ location: { replace }, addEventListener: vi.fn() } as unknown as Window);
  fireEvent.click(screen.getByRole('checkbox', { name: '약국명' })); fireEvent.click(generate());
  expect(replace).toHaveBeenCalledWith('blob:fixture');
  expect((screen.getByRole('checkbox', { name: '약국명' }) as HTMLInputElement).checked).toBe(true);
});
it('stale export callback cannot open a window after the active store changes', () => {
  const popup = vi.spyOn(window, 'open'); show(); api.store = 'B'; fireEvent.click(generate()); expect(popup).not.toHaveBeenCalled();
});

it('structured object blocks never print the default object string', () => {
  expect(contentJsonToHtml({ blocks: [{ type: 'text', value: { secret: 'not text' } }] }, 'direct')).not.toContain('[object Object]');
});
