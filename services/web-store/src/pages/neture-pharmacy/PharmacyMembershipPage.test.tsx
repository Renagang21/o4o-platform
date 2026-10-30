import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const api = vi.hoisted(() => ({ getMembership: vi.fn(async () => null), applyMembership: vi.fn(async () => ({ id: 'synthetic', status: 'pending', applied_at: '2026-10-30', pharmacy_name: '합성 약국' })) }));
vi.mock('../../api/neturePharmacy', () => ({ neturePharmacyApi: api, pharmacyErrorCode: () => null, pharmacyErrorMessage: () => '요청 실패' }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user' }, isAuthenticated: true, isLoading: false }) }));
vi.mock('../../contexts/StoreContext', () => ({ useUnifiedStore: () => ({ reload: vi.fn(), stores: [] }) }));
vi.mock('@o4o/shared-space-ui', () => ({ useServiceEnrollmentPolicies: () => ({ ready: true, references: [], reload: vi.fn() }), ServiceEnrollmentPolicyAgreement: () => <p>약관 동의 완료</p> }));
import PharmacyMembershipPage from './PharmacyMembershipPage';
afterEach(() => { cleanup(); vi.clearAllMocks(); });
async function fillMinimum() {
  render(<MemoryRouter><PharmacyMembershipPage /></MemoryRouter>);
  fireEvent.change(await screen.findByLabelText('약국 이름 *'), { target: { value: '합성 약국' } });
  fireEvent.change(screen.getByLabelText('사업자등록번호 (10자리) *'), { target: { value: '1234567890' } });
  fireEvent.change(screen.getByLabelText('약사 면허번호 *'), { target: { value: 'synthetic-license' } });
}
describe('optional pharmacy application information', () => {
  it('submits without evidence or ancillary business details', async () => {
    await fillMinimum();
    expect((screen.getByRole('button', { name: '가입 신청' }) as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: '가입 신청' }));
    await waitFor(() => expect(api.applyMembership).toHaveBeenCalledWith(expect.objectContaining({ businessRegistrationDocumentId: undefined, pharmacyName: '합성 약국', pharmacistLicenseNumber: 'synthetic-license' })));
  });
  it('sends the contact email and invoice email independently', async () => {
    await fillMinimum();
    fireEvent.change(screen.getByLabelText('담당자 이메일 (선택)'), { target: { value: 'person@example.invalid' } });
    fireEvent.change(screen.getByLabelText('세금계산서 이메일 (선택)'), { target: { value: 'invoice@example.invalid' } });
    fireEvent.click(screen.getByRole('button', { name: '가입 신청' }));
    await waitFor(() => expect(api.applyMembership).toHaveBeenCalledWith(expect.objectContaining({ contactEmail: 'person@example.invalid', taxInvoiceEmail: 'invoice@example.invalid' })));
  });
});
