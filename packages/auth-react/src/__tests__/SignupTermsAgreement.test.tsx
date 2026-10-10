import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SignupTermsAgreement } from '../SignupTermsAgreement';

const TERMS = { policyDocumentId: '11111111-1111-4111-8111-111111111111', version: 1, title: 'Fixture agreement', termsHref: 'https://neture.co.kr/terms' };
afterEach(() => { cleanup(); vi.useRealTimers(); });
function Form({ load, reloadKey = 0, documentChanged = vi.fn() }: any) {
  const [checked, setChecked] = useState(false);
  return <SignupTermsAgreement load={load} reloadKey={reloadKey} checked={checked} onChecked={setChecked} onDocument={documentChanged} />;
}
describe('published signup agreement', () => {
  it('blocks consent on lookup failure, then permits an explicit read-only retry', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(TERMS);
    render(<Form load={load} />);
    await screen.findByRole('alert');
    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '이용약관 다시 불러오기' }));
    await screen.findByRole('link', { name: '내용 보기 · 버전 1' });
    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(false);
    expect(load).toHaveBeenCalledTimes(2);
  });
  it('opens policy content separately without changing consent', async () => {
    render(<Form load={async () => TERMS} />);
    const link = await screen.findByRole('link');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.closest('label')).toBeNull();
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
    fireEvent.click(screen.getByRole('checkbox'));
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(true);
  });
  it.each([{ ...TERMS, version: 0 }, { ...TERMS, termsHref: 'javascript:alert(1)' }, { ...TERMS, policyDocumentId: 'unknown' }])('fails closed for malformed published metadata', async document => {
    render(<Form load={async () => document} />);
    await screen.findByRole('alert');
    expect((screen.getByRole('checkbox') as HTMLInputElement).disabled).toBe(true);
    expect(screen.queryByRole('link')).toBeNull();
  });
  it('requires fresh consent when reloading a changed version', async () => {
    const load = vi.fn().mockResolvedValueOnce(TERMS).mockResolvedValueOnce({ ...TERMS, version: 2 });
    const { rerender } = render(<Form load={load} />);
    await screen.findByRole('link'); fireEvent.click(screen.getByRole('checkbox'));
    rerender(<Form load={load} reloadKey={1} />);
    await screen.findByRole('link', { name: '내용 보기 · 버전 2' });
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
  });
  it('times out and ignores the late response', async () => {
    vi.useFakeTimers(); let resolve!: (value: typeof TERMS) => void;
    const documentChanged = vi.fn();
    render(<Form load={() => new Promise(done => { resolve = done; })} documentChanged={documentChanged} />);
    await act(async () => { await Promise.resolve(); vi.advanceTimersByTime(10000); });
    expect(screen.getByRole('alert')).toBeTruthy();
    await act(async () => { resolve(TERMS); });
    expect(screen.queryByRole('link')).toBeNull();
    expect(documentChanged).not.toHaveBeenCalledWith(TERMS);
  });
  it('ignores a response after unmount', async () => {
    let resolve!: (value: typeof TERMS) => void; const documentChanged = vi.fn();
    const { unmount } = render(<Form load={() => new Promise(done => { resolve = done; })} documentChanged={documentChanged} />);
    await waitFor(() => expect(resolve).toBeDefined()); unmount();
    await act(async () => { resolve(TERMS); });
    expect(documentChanged).not.toHaveBeenCalledWith(TERMS);
  });
});
