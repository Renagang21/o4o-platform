/**
 * 공급자 활성화 안내의 「대시보드로」 — 업무공간 대시보드(/supplier/dashboard)로 간다.
 * /supplier 는 메인 호스트에서 공개 소개 페이지라 그리로 보내면 업무공간을 벗어난다.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SupplierActivationGate from '../SupplierActivationGate';

vi.mock('../../../lib/api', () => ({
  supplierProfileApi: { getProfile: vi.fn(async () => ({ id: 'supplier-1', status: 'PENDING' })) },
  PROFILE_FIELD_LABELS: {},
}));
afterEach(cleanup);

describe('SupplierActivationGate gate mode', () => {
  it('미승인 안내의 대시보드 링크는 /supplier/dashboard 다', async () => {
    render(
      <MemoryRouter>
        <SupplierActivationGate mode="gate">
          <p>보호된 화면</p>
        </SupplierActivationGate>
      </MemoryRouter>,
    );
    const link = await screen.findByRole('link', { name: '대시보드로' });
    expect(link.getAttribute('href')).toBe('/supplier/dashboard');
    expect(screen.queryByText('보호된 화면')).toBeNull();
  });
});
