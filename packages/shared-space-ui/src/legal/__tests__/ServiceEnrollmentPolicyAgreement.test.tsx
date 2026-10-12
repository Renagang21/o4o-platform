import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ServiceEnrollmentPolicyAgreement, useServiceEnrollmentPolicies } from '../ServiceEnrollmentPolicyAgreement';
const document = { policyDocumentId: '11111111-1111-4111-8111-111111111111', serviceKey: 'supplier', documentType: 'terms', version: 2, title: '공급자 신청 약관', content: '이 공급자 신청에만 적용되는 조건' };
function Form({ load, identity = 'account-a' }: any) {
  const agreement = useServiceEnrollmentPolicies('supplier', load, identity);
  return <><ServiceEnrollmentPolicyAgreement agreement={agreement} /><button disabled={!agreement.ready} onClick={() => load.submitted?.(agreement.references)}>신청</button></>;
}
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('explicit service application consent', () => {
  it('blocks until each displayed document is confirmed and submits exactly its current version', async () => {
    const load: any = vi.fn().mockResolvedValue([document, { ...document, policyDocumentId: '22222222-2222-4222-8222-222222222222', documentType: 'privacy', title: '개인정보 안내' }]); load.submitted = vi.fn();
    render(<Form load={load} />); await screen.findByText(/공급자 신청 약관/);
    expect((screen.getByText('신청') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('서비스 이용약관 동의 (필수)'));
    expect((screen.getByText('신청') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('서비스 개인정보 안내 확인 (필수)')); fireEvent.click(screen.getByText('신청'));
    expect(load.submitted).toHaveBeenCalledWith([{ policyDocumentId: document.policyDocumentId, version: 2, documentType: 'terms' }, { policyDocumentId: '22222222-2222-4222-8222-222222222222', version: 2, documentType: 'privacy' }]);
  });
  it('clears consent when the account or application resource changes', async () => {
    const load = vi.fn().mockResolvedValue([document]); const view = render(<Form load={load} />);
    await screen.findByText(/공급자 신청 약관/); fireEvent.click(screen.getByRole('checkbox'));
    view.rerender(<Form load={load} identity="account-b:another-application" />);
    await waitFor(() => expect(load).toHaveBeenCalledTimes(2));
    expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false);
    expect((screen.getByText('신청') as HTMLButtonElement).disabled).toBe(true);
  });
  it('requires a fresh explicit confirmation on retry without fabricating an agreement', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([document]);
    render(<Form load={load} />); await screen.findByRole('alert');
    fireEvent.click(screen.getByText('약관 다시 확인')); await screen.findByRole('checkbox');
    expect((screen.getByText('신청') as HTMLButtonElement).disabled).toBe(true);
  });
  it.each([[{ ...document, serviceKey: 'community' }], [{ ...document, content: '' }], [document, document], [{ ...document, version: 0 }], {}])('rejects unusable or cross-service responses %j', async value => {
    render(<Form load={async () => value} />); await screen.findByRole('alert');
    expect((screen.getByText('신청') as HTMLButtonElement).disabled).toBe(true);
  });
  it('preserves legacy services with no published policies', async () => {
    render(<Form load={async () => []} />);
    await waitFor(() => expect((screen.getByText('신청') as HTMLButtonElement).disabled).toBe(false));
    expect(screen.queryByRole('checkbox')).toBeNull();
  });
  it('ignores a stale lookup after switching accounts', async () => {
    let resolve!: (value: unknown) => void; const load = vi.fn().mockImplementationOnce(() => new Promise(r => { resolve = r; })).mockResolvedValueOnce([]);
    const view = render(<Form load={load} />); await waitFor(() => expect(load).toHaveBeenCalledTimes(1));
    view.rerender(<Form load={load} identity="account-b" />);
    await waitFor(() => expect((screen.getByText('신청') as HTMLButtonElement).disabled).toBe(false));
    await act(async () => resolve([document])); expect(screen.queryByRole('checkbox')).toBeNull();
  });
});
