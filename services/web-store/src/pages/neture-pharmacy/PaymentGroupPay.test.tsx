import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const api = vi.hoisted(() => ({ preparePayment: vi.fn(), confirmPayment: vi.fn() }));
vi.mock('../../api/neturePharmacy', () => ({ neturePharmacyApi: api,
  pharmacyErrorCode: (e: { code?: string }) => e.code, pharmacyErrorMessage: (e: Error) => e.message }));
import { PaymentGroupPay } from './PaymentGroupPay';
beforeEach(() => { vi.resetAllMocks(); vi.spyOn(window, 'confirm').mockReturnValue(true);
  api.preparePayment.mockResolvedValue({ paymentId: 'payment' });
  api.confirmPayment.mockResolvedValue({ status: 'PAID', testPayment: true }); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function mount(onPaid = vi.fn()) { render(<MemoryRouter><PaymentGroupPay paymentGroupId="group" amount={12000} mode="test" onPaid={onPaid} /></MemoryRouter>);return onPaid; }
it('shows membership/supply recovery and never confirms a rejected preparation', async () => {
  api.preparePayment.mockRejectedValue({ code: 'PAYMENT_SUPPLY_NOT_AVAILABLE', message: '협업체 이용 상태가 변경되었습니다.' });
  const done = mount(); fireEvent.click(screen.getByTestId('payment-test-button'));
  await screen.findByRole('alert');
  expect(screen.getByRole('link', { name: '협업체 가입 상태 확인' }).getAttribute('href')).toBe('/store/pharmacy/semi-franchises');
  expect(screen.getByRole('link', { name: '현재 공급제품 확인' })).toBeTruthy();
  expect(api.confirmPayment).not.toHaveBeenCalled();expect(done).not.toHaveBeenCalled();
});
it('does not show success if membership was withdrawn after preparation', async () => {
  api.confirmPayment.mockRejectedValue({ code: 'PAYMENT_SUPPLY_NOT_AVAILABLE', message: '공급이 종료되었습니다.' });
  const done = mount();fireEvent.click(screen.getByTestId('payment-test-button'));
  await screen.findByText('공급이 종료되었습니다.');
  expect(api.confirmPayment).toHaveBeenCalledWith('payment', 'group');
  expect(screen.queryByTestId('payment-done')).toBeNull();expect(done).not.toHaveBeenCalled();
});
it('reports the existing successful test payment only after confirmation', async () => {
  const done=mount();fireEvent.click(screen.getByTestId('payment-test-button'));
  await screen.findByTestId('payment-done');expect(done).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('alert')).toBeNull();
});
