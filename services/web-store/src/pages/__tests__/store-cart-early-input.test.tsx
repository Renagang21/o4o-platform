import { useLayoutEffect } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const fixture = vi.hoisted(() => ({
  items: ['A', 'B'].map(id => ({ id, productName: `상품 ${id}`, quantity: 1, unitPrice: 1000, available: true, kind: 'default' })),
  update: vi.fn(), remove: vi.fn(), checkout: vi.fn(), load: vi.fn(),
}));
vi.mock('../../hooks/useLatestList', () => ({ useLatestList: () => ({ items: fixture.items, loading: false, error: null, setError: vi.fn(), load: fixture.load }) }));
vi.mock('../../api/neturePharmacy', () => ({ neturePharmacyApi: { updateCartItem: fixture.update, removeCartItem: fixture.remove, checkout: fixture.checkout }, pharmacyErrorMessage: (e: Error) => e.message }));
vi.mock('../neture-pharmacy/PaymentGroupPay', () => ({ usePaymentMode: () => 'test', PaymentGroupPay: () => null }));
vi.mock('../../contexts/StoreContext', () => ({ useUnifiedStore: () => ({ effectiveServiceKey: 'kpa-society' }) }));
import PharmacyCartPage from '../neture-pharmacy/PharmacyCartPage';
afterEach(() => { cleanup(); vi.resetAllMocks(); });
it('keeps the first committed quantity edit and locks checkout during its update', async () => {
  let release!: () => void;
  fixture.update.mockReturnValue(new Promise<void>(resolve => { release = resolve; }));
  fixture.load.mockResolvedValue(undefined);
  function EditAtCommit() {
    useLayoutEffect(() => {
      const input = screen.getByRole('spinbutton', { name: '상품 A 수량' }) as HTMLInputElement;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, '2');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, []);
    return <MemoryRouter><PharmacyCartPage /></MemoryRouter>;
  }
  render(<EditAtCommit />);
  await waitFor(() => expect((screen.getByRole('spinbutton', { name: '상품 A 수량' }) as HTMLInputElement).value).toBe('2'));
  fireEvent.click(screen.getAllByRole('button', { name: '변경' })[0]);
  expect(fixture.update).toHaveBeenCalledWith('A', 2);
  expect((screen.getByTestId('cart-checkout') as HTMLButtonElement).disabled).toBe(true);
  expect((screen.getAllByRole('button', { name: '삭제' })[1] as HTMLButtonElement).disabled).toBe(true);
  fireEvent.click(screen.getByTestId('cart-checkout')); expect(fixture.checkout).not.toHaveBeenCalled();
  await act(async () => { release(); });
  await waitFor(() => expect((screen.getAllByRole('button', { name: '삭제' })[1] as HTMLButtonElement).disabled).toBe(false));
});
