import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

const listProductMasters = vi.fn();
vi.mock('@/api/o4o-product-db.api', () => ({ listProductMasters: (...args: unknown[]) => listProductMasters(...args) }));

import { ProductMasterPicker, PRODUCT_VIDEO_PURPOSE } from './ProductMasterPicker';

afterEach(cleanup);

describe('ProductMasterPicker (WO-O4O-STORE-QR-TABLET-CHANNEL-SEPARATION-V1 T4)', () => {
  it('finds standard products by name and hands the chosen master to the link form', async () => {
    listProductMasters.mockResolvedValueOnce({ items: [{ id: 'pm-1', name: '감기약', brand: { id: 'b', name: '브랜드' }, specification: '10정' }], meta: {} });
    const onPick = vi.fn();
    render(<ProductMasterPicker onPick={onPick} />);
    fireEvent.change(screen.getByLabelText('연결할 제품 검색'), { target: { value: ' 감기 ' } });
    fireEvent.click(screen.getByRole('button', { name: '제품 찾기' }));
    fireEvent.click(await screen.findByRole('button', { name: /감기약 · 브랜드 · 10정/ }));
    expect(listProductMasters).toHaveBeenCalledWith({ q: '감기', limit: 8 });
    expect(onPick).toHaveBeenCalledWith(expect.objectContaining({ id: 'pm-1' }));
    expect(PRODUCT_VIDEO_PURPOSE).toBe('product-video');
  });

  it('reports a failed search instead of showing no results', async () => {
    listProductMasters.mockRejectedValueOnce(new Error('network'));
    render(<ProductMasterPicker onPick={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('연결할 제품 검색'), { target: { value: '파스' } });
    fireEvent.click(screen.getByRole('button', { name: '제품 찾기' }));
    expect((await screen.findByRole('alert')).textContent).toContain('검색하지 못했습니다');
    expect(screen.queryByText('맞는 제품이 없습니다.')).toBeNull();
  });
});
