import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SupplierInventoryPage from '../SupplierInventoryPage';

const mocks = vi.hoisted(() => ({ load: vi.fn(), update: vi.fn() }));
vi.mock('../../../lib/api', () => ({ supplierApi: { getInventory: mocks.load, updateInventory: mocks.update }, getInventoryStatus: () => 'in_stock' }));
const initial = { offer_id: 'fixture-offer', master_id: 'fixture-master', name: 'Fixture item', brand_name: null,
  barcode: null, specification: null, primary_image_url: null, price_general: 10, is_active: true,
  stock_quantity: 10, reserved_quantity: 2, available_stock: 8, low_stock_threshold: 1, track_inventory: true,
  inventory_version: 'a'.repeat(32) };
const current = { ...initial, stock_quantity: 8, reserved_quantity: 0, inventory_version: 'b'.repeat(32) };
beforeEach(() => { mocks.load.mockReset().mockResolvedValue([initial]); mocks.update.mockReset(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function open() {
  render(<MemoryRouter initialEntries={['/supplier/inventory']}><SupplierInventoryPage /></MemoryRouter>);
  await screen.findByText('Fixture item');
}
function edit() { fireEvent.click(screen.getByRole('button', { name: '수정' })); }
function save() { fireEvent.click(screen.getByRole('button', { name: '저장' })); }

describe('supplier inventory writes and stale editor recovery', () => {
  it('sends the edit-start version and keeps the authoritative response version for the next edit', async () => {
    mocks.update.mockResolvedValue({ success: true, data: { ...initial, stock_quantity: 15, available_stock: 13, inventory_version: current.inventory_version } });
    await open(); edit();
    fireEvent.change(screen.getByLabelText('재고 수량'), { target: { value: '15' } }); save();
    await screen.findByText('재고 업데이트 완료');
    expect(mocks.update).toHaveBeenCalledWith(initial.offer_id, { stock_quantity: 15, low_stock_threshold: 1, expected_version: initial.inventory_version });
    edit(); expect((screen.getByLabelText('재고 수량') as HTMLInputElement).value).toBe('15'); save();
    await waitFor(() => expect(mocks.update).toHaveBeenLastCalledWith(initial.offer_id, { stock_quantity: 15, low_stock_threshold: 1, expected_version: current.inventory_version }));
  });
  it('refetches a conflict and requires explicit review; it never retries the stale write automatically', async () => {
    mocks.load.mockResolvedValueOnce([initial]).mockResolvedValue([current]);
    mocks.update.mockResolvedValue({ success: false, error: 'INVENTORY_CONFLICT' });
    await open(); edit(); save();
    await screen.findByRole('alert');
    expect(screen.getByRole('alert').textContent).toContain('최신 재고를 확인하고 다시 수정');
    expect(mocks.load).toHaveBeenCalledTimes(2); expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText('재고 수량')).toBeNull();
    edit(); expect((screen.getByLabelText('재고 수량') as HTMLInputElement).value).toBe('8');
  });
  it('shows a refresh error instead of a successful empty list; retry can load a safe new snapshot', async () => {
    mocks.load.mockResolvedValueOnce([initial]).mockRejectedValueOnce(new Error('Fixture load failure')).mockResolvedValue([current]);
    mocks.update.mockResolvedValue({ success: false, error: 'INVENTORY_CONFLICT' });
    await open(); edit(); save();
    await screen.findByText('재고 정보를 불러오지 못했습니다.');
    expect(screen.queryByText('Fixture item')).toBeNull(); expect(mocks.update).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    await screen.findByText('Fixture item'); edit(); save();
    await waitFor(() => expect(mocks.update).toHaveBeenLastCalledWith(initial.offer_id, { stock_quantity: 8, low_stock_threshold: 1, expected_version: current.inventory_version }));
  });
  it('toggles using the row version and renders the server stock and tracking result', async () => {
    mocks.update.mockResolvedValue({ success: true, data: { ...current, track_inventory: false } });
    await open(); fireEvent.click(screen.getByRole('switch', { name: 'Fixture item 재고 추적' }));
    await screen.findByText('재고 추적 미활성');
    expect(mocks.update).toHaveBeenCalledWith(initial.offer_id, { track_inventory: false, expected_version: initial.inventory_version });
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('false');
  });
  it('restores editing controls after an unexpected write rejection', async () => {
    mocks.update.mockRejectedValue(new Error('Fixture unexpected failure'));
    await open(); edit(); save();
    await screen.findByText('재고를 저장하지 못했습니다. 다시 시도해 주세요.');
    expect((screen.getByRole('button', { name: '저장' }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByLabelText('재고 수량')).toBeTruthy();
  });
  it('retains compatibility with a response lacking the optional version', async () => {
    mocks.load.mockResolvedValue([{ ...initial, inventory_version: undefined }]);
    mocks.update.mockResolvedValue({ success: true, data: initial });
    await open(); edit(); save(); await screen.findByText('재고 업데이트 완료');
    expect(mocks.update).toHaveBeenCalledWith(initial.offer_id, { stock_quantity: 10, low_stock_threshold: 1, expected_version: undefined });
  });
});
