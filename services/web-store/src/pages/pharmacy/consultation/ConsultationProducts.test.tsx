import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
const get = vi.hoisted(() => vi.fn());
vi.mock('../../../api/client', () => ({ coreApiClient: { get } }));
import { ConsultationProducts } from './ConsultationProducts';

afterEach(() => { cleanup(); get.mockReset(); });

it('searches through the consultation route with the consultation mode (store-level permission)', async () => {
  get.mockResolvedValue({ success: true, data: [{ id: 'p1', kind: 'listing', name: '비타민C', location: 'A-1' }] });
  render(<ConsultationProducts query="비타민" mode="floor-staff" busy={false} onSelect={vi.fn()} selectLabel="선택" />);
  expect(await screen.findByText('비타민C')).toBeTruthy();
  expect(get).toHaveBeenCalledWith('/neture/pharmacy/consultation-products', { q: '비타민', mode: 'floor-staff' });
});
