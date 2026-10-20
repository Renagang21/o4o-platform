import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PharmacyInfoPage } from '../PharmacyInfoPage';
const api = vi.hoisted(() => ({ get: vi.fn(), update: vi.fn() }));
vi.mock('../../../api/pharmacyInfo', () => ({ getPharmacyInfo: api.get, updatePharmacyInfo: api.update }));
vi.mock('@o4o/ui', () => ({ AddressSearch: () => null }));
beforeEach(() => {
  vi.resetAllMocks();
  api.get.mockResolvedValue({ id: 'fixture', name: '검증 약국', businessEntityType: 'simple_taxpayer' });
  api.update.mockResolvedValue({});
});
afterEach(cleanup);
describe('pharmacy business entity classification', () => {
  it('requires reselecting legacy tax categories and saves an explicit individual choice', async () => {
    render(<PharmacyInfoPage />);
    fireEvent.click(await screen.findByRole('button', { name: '수정' }));
    const select = screen.getByRole('combobox', { name: /사업자 구분/ }) as HTMLSelectElement;
    expect(select.value).toBe('');
    expect(Array.from(select.options, (option) => option.value)).toEqual(['', 'individual', 'corporation']);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await screen.findByText('세금계산서 발행을 위한 개인 / 법인 구분을 선택해 주세요.');
    expect(api.update).not.toHaveBeenCalled();
    fireEvent.change(select, { target: { value: 'individual' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith(expect.objectContaining({ businessEntityType: 'individual' })));
  });
});
