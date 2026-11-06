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
  it('saves optional contact details without an invoice classification', async () => {
    api.get.mockResolvedValue({ name: '검증 약국', businessEntityType: null });
    render(<PharmacyInfoPage />);
    fireEvent.click(await screen.findByRole('button', { name: '수정' }));
    fireEvent.change(screen.getByLabelText('담당자 전화번호'), { target: { value: '010-0000-0000' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith(expect.objectContaining({ managerPhone: '01000000000', businessEntityType: undefined })));
  });
  it('sends explicit empty values when the owner phone and representative name are cleared', async () => {
    api.get.mockResolvedValue({ name: '검증 약국', ownerPhone: '01000000000', ceoName: '합성 대표자' });
    render(<PharmacyInfoPage />);
    fireEvent.click(await screen.findByRole('button', { name: '수정' }));
    fireEvent.change(screen.getByLabelText('개설자 연락처'), { target: { value: '' } });
    fireEvent.change(screen.getByLabelText('대표자명'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith(expect.objectContaining({ ownerPhone: '', ceoName: '' })));
  });
  it('requires reselecting legacy tax categories and saves an explicit individual choice', async () => {
    render(<PharmacyInfoPage />);
    fireEvent.click(await screen.findByRole('button', { name: '수정' }));
    const select = screen.getByRole('combobox', { name: /사업자 구분/ }) as HTMLSelectElement;
    expect(select.value).toBe('');
    expect(Array.from(select.options, (option) => option.value)).toEqual(['', 'individual', 'corporation']);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await screen.findByText('세금계산서 발행을 위한 개인 / 법인 구분을 선택해 주시기 바랍니다.');
    expect(api.update).not.toHaveBeenCalled();
    fireEvent.change(select, { target: { value: 'individual' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(api.update).toHaveBeenCalledWith(expect.objectContaining({ businessEntityType: 'individual' })));
  });
});


describe('shared pharmacy information behavior through the Store adapter', () => {
  it.each(['missing', 'failed'])('shows recoverable information failure for %s data', async (state) => {
    if (state === 'missing') api.get.mockResolvedValue(null);
    else api.get.mockRejectedValue(new Error('fixture load failure'));
    render(<MemoryRouter initialEntries={['/pharmacy/info']}><Routes>
      <Route path="/pharmacy/info" element={<PharmacyInfoPage />} />
      <Route path="/pharmacy" element={<p>약국 게이트</p>} />
    </Routes></MemoryRouter>);
    await screen.findByRole('button', { name: '매장 정보 다시 확인' });
    expect(screen.queryByText('약국 게이트')).toBeNull();
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
    expect(api.update.mock.calls[0][0]).toHaveProperty('managerPhone', '0000000000');
    expect(api.update.mock.calls[0][0]).not.toHaveProperty('businessNumber');
  });

  it('keeps an unsuccessful save in edit mode with error feedback', async () => {
    api.get.mockResolvedValue({ name: '검증 약국', businessEntityType: 'individual' });
    api.update.mockRejectedValue(new Error('fixture save failure'));
    render(<PharmacyInfoPage />);
    fireEvent.click(await screen.findByRole('button', { name: '수정' }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await screen.findByText('저장에 실패했습니다. 다시 시도해 주시기 바랍니다.');
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

it('shows synthetic Demo data separately and never submits it as real pharmacy information', async () => {
  api.get.mockResolvedValue({ name: '실제 표시 이름', demoExample: { name: 'O4O 체험 약국', businessNumber: 'DEMO-BIZ-0001', licenseNumber: 'DEMO-LICENSE-0001', address: '가상 주소', representativeName: '체험', businessType: '소매업', businessItem: '약국' } });
  render(<PharmacyInfoPage />);
  await screen.findByRole('region', { name: 'Demo 약국 가상 정보' });
  expect(screen.getByText('DEMO-LICENSE-0001')).toBeTruthy();
  expect(screen.getByRole('link', { name: '체험용 사업자등록증 예시 받기' }).getAttribute('href')).toBe('/samples/demo-pharmacy-business.svg');
  fireEvent.click(screen.getByRole('button', { name: '수정' }));
  expect(screen.getByDisplayValue('실제 표시 이름')).toBeTruthy();
  expect(screen.queryByDisplayValue('DEMO-BIZ-0001')).toBeNull();
  expect(api.update).not.toHaveBeenCalled();
});
it('retries a failed information request without redirecting or creating a store', async () => {
  api.get.mockRejectedValueOnce(new Error('unavailable')).mockResolvedValueOnce({ name: '복구 매장' });
  render(<PharmacyInfoPage />);
  fireEvent.click(await screen.findByRole('button', { name: '매장 정보 다시 확인' }));
  await screen.findByText('복구 매장');
  expect(api.get).toHaveBeenCalledTimes(2);
  expect(api.update).not.toHaveBeenCalled();
});
