/**
 * 자료함 — 실패를 조용히 넘기지 않는다.
 *   - 삭제 실패: 확인 창을 열어 둔 채 사유를 보이고, 처리 중에는 다시 누를 수 없다.
 *   - 다른 서비스 제공 대상 조회 실패: '대상 없음'과 구분해 안내하고 다시 시도할 수 있다.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

const api = vi.hoisted(() => ({
  getLibraryItem: vi.fn(),
  getLibraryItems: vi.fn(),
  getLibraryHandoffTargets: vi.fn(),
  deleteLibraryItem: vi.fn(),
}));
vi.mock('../../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'supplier' } }) }));
vi.mock('../../../lib/api', () => ({ supplierApi: api }));
vi.mock('../../../api/guideContent', () => ({ fetchGuidePageContent: async () => ({}) }));
vi.mock('@o4o/shared-space-ui', () => ({ GuideBlock: () => null }));
vi.mock('@o4o/ui', () => ({
  DataTable: ({ dataSource }: { dataSource: Array<{ key: string; actions: ReactNode }> }) => (
    <>
      {dataSource.map((row, i) => (
        <div key={i}>{row.actions}</div>
      ))}
    </>
  ),
}));
vi.mock('../SupplierContentDestinations', () => ({ default: () => null }));
import SupplierLibraryPage from '../SupplierLibraryPage';

const show = () =>
  render(
    <MemoryRouter initialEntries={['/supplier/library']}>
      <SupplierLibraryPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.resetAllMocks();
  api.getLibraryItems.mockResolvedValue({
    items: [{ id: 'item-1', title: '검증 자료', createdAt: '2026-11-01' }],
  });
  api.getLibraryHandoffTargets.mockResolvedValue([{ key: 'svc', name: 'Service', nameKo: '검증 서비스' }]);
});
afterEach(cleanup);

describe('자료 삭제', () => {
  it('실패하면 창을 열어 둔 채 사유를 보이고 목록을 다시 부르지 않는다', async () => {
    api.deleteLibraryItem.mockResolvedValue({ success: false, error: '협력사업에 등재된 자료는 삭제할 수 없습니다.' });
    show();
    fireEvent.click(await screen.findByRole('button', { name: '삭제' }));
    fireEvent.click(screen.getAllByRole('button', { name: '삭제' }).at(-1)!);
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', '협력사업에 등재된 자료는 삭제할 수 없습니다.');
    expect(screen.getByText('자료 삭제')).toBeTruthy();
    expect(api.getLibraryItems).toHaveBeenCalledTimes(1);
  });

  it('처리 중에는 다시 누를 수 없어 한 번만 요청한다 · 성공하면 창을 닫고 목록을 갱신한다', async () => {
    let resolve: (v: unknown) => void = () => {};
    api.deleteLibraryItem.mockImplementation(() => new Promise((r) => { resolve = r; }));
    show();
    fireEvent.click(await screen.findByRole('button', { name: '삭제' }));
    fireEvent.click(screen.getAllByRole('button', { name: '삭제' }).at(-1)!);
    const busy = await screen.findByRole('button', { name: '삭제 중...' });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(busy);
    expect(api.deleteLibraryItem).toHaveBeenCalledTimes(1);
    resolve({ success: true });
    await waitFor(() => expect(screen.queryByText('자료 삭제')).toBeNull());
    expect(api.getLibraryItems).toHaveBeenCalledTimes(2);
  });
});

describe('다른 서비스 제공 대상', () => {
  it('조회 실패를 안내하고 다시 시도하면 버튼이 돌아온다', async () => {
    api.getLibraryHandoffTargets.mockRejectedValueOnce(new Error('network'));
    show();
    expect(await screen.findByText(/다른 서비스에 제공할 대상을 불러오지 못했습니다/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: '기타 서비스에 제공' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByRole('button', { name: '기타 서비스에 제공' })).toBeTruthy();
    expect(screen.queryByText(/다른 서비스에 제공할 대상을 불러오지 못했습니다/)).toBeNull();
  });

  it('대상이 정상적으로 0건이면 실패 안내를 띄우지 않는다', async () => {
    api.getLibraryHandoffTargets.mockResolvedValue([]);
    show();
    await screen.findByRole('button', { name: '수정' });
    expect(screen.queryByText(/다른 서비스에 제공할 대상을 불러오지 못했습니다/)).toBeNull();
    expect(screen.queryByRole('button', { name: '기타 서비스에 제공' })).toBeNull();
  });
});
