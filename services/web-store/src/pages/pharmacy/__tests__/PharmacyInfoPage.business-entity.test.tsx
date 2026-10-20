import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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


describe('shared pharmacy information behavior through the Store adapter', () => {
  it.each(['missing', 'failed'])('keeps the pharmacy gate for %s data', async (state) => {
    if (state === 'missing') api.get.mockResolvedValue(null);
    else api.get.mockRejectedValue(new Error('fixture load failure'));
    render(<MemoryRouter initialEntries={['/pharmacy/info']}><Routes>
      <Route path="/pharmacy/info" element={<PharmacyInfoPage />} />
      <Route path="/pharmacy" element={<p>약국 게이트</p>} />
    </Routes></MemoryRouter>);
    await screen.findByText('약국 게이트');
    expect(api.update).not.toHaveBeenCalled();
  });

  it('keeps view labels, read-only registration and cancel behavior', async () => {
    api.get.mockResolvedValue({ name: '검증 약국', businessNumber: '000-00-00000',
      businessEntityType: 'corporation', businessEmail: 'business@example.invalid',
      contactEmail: 'contact@example.invalid', addressDetail: { zipCode: '00000',
        baseAddress: '검증 주소', detailAddress: '검증 상세' } });
    render(<PharmacyInfoPage />);
    await screen.findByText('검증 약국');
    expect(screen.getByText('변경 불가')).toBeTruthy();
    for (const value of ['법인사업자', 'business@example.invalid', 'contact@example.invalid', '00000', '검증 주소', '검증 상세']) {
      expect(screen.getByText(value)).toBeTruthy();
    }
    fireEvent.click(screen.getByRole('button', { name: '수정' }));
    expect((screen.getByDisplayValue('000-00-00000') as HTMLInputElement).disabled).toBe(true);
    fireEvent.change(screen.getByRole('combobox', { name: /사업자 구분/ }), { target: { value: 'individual' } });
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(screen.getByText('법인사업자')).toBeTruthy();
    expect(api.update).not.toHaveBeenCalled();
  });

  it('preserves normalized payload, reload and success feedback for corporation', async () => {
    api.get.mockResolvedValue({ name: ' 검증 약국 ', businessEntityType: 'corporation',
      phone: '010-0000-0000', taxInvoiceEmail: 'invoice@example.invalid',
      businessEmail: 'business@example.invalid', contactEmail: 'contact@example.invalid',
      managerPhone: '0000000000', addressDetail: { zipCode: '00000', baseAddress: '검증 주소', detailAddress: '검증 상세' } });
    render(<PharmacyInfoPage />);
    fireEvent.click(await screen.findByRole('button', { name: '수정' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await screen.findByText('약국 정보가 저장되었습니다.');
    expect(api.get).toHaveBeenCalledTimes(2);
    expect(api.update).toHaveBeenCalledWith(expect.objectContaining({ name: '검증 약국',
      businessEntityType: 'corporation', phone: '01000000000',
      taxInvoiceEmail: 'invoice@example.invalid', businessEmail: 'business@example.invalid',
      contactEmail: 'contact@example.invalid', addressDetail: { zipCode: '00000', baseAddress: '검증 주소', detailAddress: '검증 상세' } }));
    expect(api.update.mock.calls[0][0]).not.toHaveProperty('managerPhone');
    expect(api.update.mock.calls[0][0]).not.toHaveProperty('businessNumber');
  });

  it('keeps an unsuccessful save in edit mode with error feedback', async () => {
    api.get.mockResolvedValue({ name: '검증 약국', businessEntityType: 'individual' });
    api.update.mockRejectedValue(new Error('fixture save failure'));
    render(<PharmacyInfoPage />);
    fireEvent.click(await screen.findByRole('button', { name: '수정' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await screen.findByText('저장에 실패했습니다. 다시 시도해 주세요.');
    expect(screen.getByRole('combobox', { name: /사업자 구분/ })).toBeTruthy();
    expect(api.get).toHaveBeenCalledTimes(1);
  });
});


describe('business email validation after commonization', () => {
  it.each([
    ['세금계산서 이메일', 'invoice@example.invalid', true],
    ['약국 대표 이메일', 'business@example.invalid', true],
    ['담당자 이메일', 'contact@example.invalid', true],
    ['세금계산서 이메일', 'missing-at.invalid', false],
    ['약국 대표 이메일', 'business@domain', false],
    ['담당자 이메일', 'contact@white space.invalid', false],
    ['세금계산서 이메일', 'contact@.invalid', false],
    ['약국 대표 이메일', 'contact@domain.', false],
    ['담당자 이메일', '@domain.invalid', false],
    ['담당자 이메일', '', true],
  ])('preserves %s acceptance for %s', async (label, email, valid) => {
    api.get.mockResolvedValue({ name: '검증 약국', businessEntityType: 'individual' });
    render(<PharmacyInfoPage />);
    fireEvent.click(await screen.findByRole('button', { name: '수정' }));
    fireEvent.change(screen.getByLabelText(label, { exact: true }), { target: { value: email } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    if (valid) await screen.findByText('약국 정보가 저장되었습니다.');
    else {
      await screen.findByText(/이메일 형식이 올바르지 않습니다/);
      expect(api.update).not.toHaveBeenCalled();
    }
  });
});
