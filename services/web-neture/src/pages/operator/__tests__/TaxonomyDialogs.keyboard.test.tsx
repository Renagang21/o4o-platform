import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import CategoryManagementPage from '../CategoryManagementPage';
import BrandManagementPage from '../BrandManagementPage';

const mocks = vi.hoisted(() => ({
  categories: vi.fn(), create: vi.fn(), update: vi.fn(), brands: vi.fn(), merge: vi.fn(),
  success: vi.fn(), error: vi.fn(),
}));
vi.mock('../../../lib/api/operatorCategory', () => ({ operatorCategoryApi: {
  getCategories: mocks.categories, createCategory: mocks.create, updateCategory: mocks.update,
} }));
vi.mock('../../../lib/api/operatorBrand', () => ({ operatorBrandApi: {
  getBrands: mocks.brands, mergeBrands: mocks.merge,
} }));
vi.mock('@o4o/error-handling', () => ({ toast: { success: mocks.success, error: mocks.error } }));
vi.mock('../../../components/guide', () => ({ GuideEditableSection: () => null }));
vi.mock('../../../api/guideContent', () => ({ fetchGuidePageContent: async () => ({}) }));
vi.mock('@o4o/shared-space-ui', () => ({ GuideBlock: () => null }));
vi.mock('@o4o/ui', () => ({
  EditableTextCell: ({ value }: { value: string }) => <span>{value}</span>,
  RowActionMenu: ({ actions }: { actions: { label: string; onClick: () => void }[] }) =>
    <button type="button" onClick={actions[0].onClick}>{actions[0].label}</button>,
}));
vi.mock('@o4o/operator-ux-core', () => ({
  DataTable: ({ data, columns, loading }: {
    data: { id: string }[]; columns: { key: string; render?: (value: unknown, row: unknown) => React.ReactNode }[];
    loading: boolean;
  }) => loading ? <p>Loading</p> : <div>{data.map(row => <div key={row.id}>
    {columns.map(column => <div key={column.key}>{column.render?.(undefined, row)}</div>)}
  </div>)}</div>,
}));
const category = { id: 'category-a', name: '분류 A', parentId: null, depth: 0, isActive: true, isRegulated: false, children: [] };
const brands = [{ id: 'brand-a', name: '브랜드 A', productCount: 2 }, { id: 'brand-b', name: '브랜드 B', productCount: 1 }];
const originalShow = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
beforeAll(() => {
  // jsdom models lifecycle only; actual native focus containment is covered in Chromium.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value(this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value(this: HTMLDialogElement) { this.open = false; } });
});
afterAll(() => {
  for (const [key, descriptor] of [['showModal', originalShow], ['close', originalClose]] as const) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, key, descriptor);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, key);
  }
});
beforeEach(() => {
  vi.clearAllMocks();
  mocks.categories.mockResolvedValue([category]);
  mocks.create.mockResolvedValue({ success: true });
  mocks.update.mockResolvedValue({ success: true });
  mocks.brands.mockResolvedValue(brands);
  mocks.merge.mockResolvedValue({ success: true, data: { merged: 2 } });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function click(button: HTMLElement) { button.focus(); fireEvent.click(button); }
function escape(dialog: HTMLElement) { fireEvent(dialog, new Event('cancel', { cancelable: true })); }
async function selectBrand() {
  render(<BrandManagementPage />);
  const trigger = (await screen.findAllByRole('button', { name: '병합' }))[0];
  click(trigger);
  const parent = screen.getByRole('dialog', { name: '브랜드 병합' });
  const target = within(parent).getByRole('button', { name: /브랜드 B/ });
  click(target);
  return { trigger, parent, target, confirm: screen.getByRole('dialog', { name: '브랜드 병합 확인' }) };
}

describe('taxonomy dialog keyboard lifecycle', () => {
  it('wraps Tab in both directions using the current enabled controls', async () => {
    // jsdom has no layout; provide visible rectangles for the boundary guard.
    vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([new DOMRect()] as unknown as DOMRectList);
    render(<CategoryManagementPage />);
    click(await screen.findByRole('button', { name: '루트 카테고리 추가' }));
    const dialog = screen.getByRole('dialog');
    const first = within(dialog).getByRole('button', { name: '카테고리 편집 창 닫기' });
    const last = within(dialog).getByRole('button', { name: '생성' });
    last.focus();
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
    last.setAttribute('disabled', '');
    const cancel = within(dialog).getByRole('button', { name: '취소' });
    cancel.focus();
    fireEvent.keyDown(cancel, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
  });

  it('focuses the create input and returns to its invoker on Escape', async () => {
    render(<CategoryManagementPage />);
    const trigger = await screen.findByRole('button', { name: '루트 카테고리 추가' });
    click(trigger);
    expect(document.activeElement).toBe(screen.getByLabelText('카테고리 이름 *'));
    escape(screen.getByRole('dialog', { name: '카테고리 생성' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it('preserves edit values and returns to the edit button on cancel', async () => {
    render(<CategoryManagementPage />);
    const trigger = await screen.findByRole('button', { name: '수정' });
    click(trigger);
    expect((screen.getByLabelText('카테고리 이름 *') as HTMLInputElement).value).toBe('분류 A');
    expect(screen.queryByLabelText('상위 카테고리')).toBeNull();
    click(screen.getByRole('button', { name: '취소' }));
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('keeps failed saves readable inside the dialog with the same request payload', async () => {
    mocks.create.mockResolvedValue({ success: false, error: 'CREATE_FAILED' });
    render(<CategoryManagementPage />);
    click(await screen.findByRole('button', { name: '루트 카테고리 추가' }));
    fireEvent.change(screen.getByLabelText('카테고리 이름 *'), { target: { value: '  합성 분류  ' } });
    click(screen.getByRole('button', { name: '생성' }));
    await screen.findByText('CREATE_FAILED');
    expect(screen.getByRole('alert').textContent).toBe('CREATE_FAILED');
    expect(screen.getByRole('dialog', { name: '카테고리 생성' })).toBeTruthy();
    expect(mocks.create).toHaveBeenCalledWith({ name: '합성 분류', parentId: null, isRegulated: false });
    expect(mocks.error).toHaveBeenCalledWith('CREATE_FAILED');
  });

  it('uses the heading when a successful reload replaces the invoking row', async () => {
    let finish!: (value: typeof category[]) => void;
    mocks.categories.mockResolvedValueOnce([category]).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<CategoryManagementPage />);
    click(await screen.findByRole('button', { name: '수정' }));
    click(within(screen.getByRole('dialog')).getByRole('button', { name: '수정' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await act(() => new Promise<void>(resolve => requestAnimationFrame(() => resolve())));
    await act(async () => finish([category]));
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('heading', { name: '카테고리 관리' })));
  });

  it('starts confirmation on cancel and returns through both dialog levels', async () => {
    const { trigger, parent, target, confirm } = await selectBrand();
    expect(document.activeElement).toBe(within(confirm).getByRole('button', { name: '취소' }));
    escape(confirm);
    await waitFor(() => expect(document.activeElement).toBe(target));
    expect(screen.getByRole('dialog', { name: '브랜드 병합' })).toBe(parent);
    escape(parent);
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    expect(mocks.merge).not.toHaveBeenCalled();
  });

  it('preserves the focused nested control while a queued parent search reloads', async () => {
    let finish!: (value: typeof brands) => void;
    mocks.brands.mockResolvedValueOnce(brands).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<BrandManagementPage />);
    const trigger = (await screen.findAllByRole('button', { name: '병합' }))[0];
    fireEvent.change(screen.getByLabelText('브랜드 검색'), { target: { value: '브랜드' } });
    click(trigger);
    click(within(screen.getByRole('dialog', { name: '브랜드 병합' })).getByRole('button', { name: /브랜드 B/ }));
    const confirm = screen.getByRole('dialog', { name: '브랜드 병합 확인' });
    const activeControl = within(confirm).getByRole('button', { name: '병합' });
    activeControl.focus();
    await waitFor(() => expect(mocks.brands).toHaveBeenCalledTimes(2));
    expect(document.activeElement).toBe(activeControl);
    await act(async () => finish(brands));
    expect(document.activeElement).toBe(activeControl);
  });

  it('does not dismiss a pending merge and keeps its failure inside confirmation', async () => {
    let finish!: (value: { success: boolean; error: string }) => void;
    mocks.merge.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const { confirm } = await selectBrand();
    click(within(confirm).getByRole('button', { name: '병합' }));
    escape(confirm);
    expect(screen.getByRole('dialog', { name: '브랜드 병합 확인' })).toBe(confirm);
    expect(mocks.merge).toHaveBeenCalledTimes(1);
    expect(mocks.merge).toHaveBeenCalledWith('brand-a', 'brand-b');
    await act(async () => finish({ success: false, error: 'MERGE_FAILED' }));
    expect(within(confirm).getByRole('alert').textContent).toBe('MERGE_FAILED');
  });

  it('dismisses only the confirmation on an idle backdrop release and restores the target', async () => {
    const { parent, target, confirm } = await selectBrand();
    vi.spyOn(confirm, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 100, 300, 200));
    // jsdom does not expose PointerEvent coordinates; native browser coverage is separate.
    const release = (x: number, y: number) => {
      const event = new Event('pointerup', { bubbles: true });
      Object.defineProperties(event, { clientX: { value: x }, clientY: { value: y } });
      fireEvent(confirm, event);
    };
    release(150, 150);
    expect(screen.getByRole('dialog', { name: '브랜드 병합 확인' })).toBe(confirm);
    release(20, 20);
    expect(screen.queryByRole('dialog', { name: '브랜드 병합 확인' })).toBeNull();
    expect(screen.getByRole('dialog', { name: '브랜드 병합' })).toBe(parent);
    await waitFor(() => expect(document.activeElement).toBe(target));
    expect(mocks.merge).not.toHaveBeenCalled();
  });

  it('ignores a backdrop release while the merge is pending', async () => {
    let finish!: (value: { success: boolean; error: string }) => void;
    mocks.merge.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const { confirm } = await selectBrand();
    vi.spyOn(confirm, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 100, 300, 200));
    click(within(confirm).getByRole('button', { name: '병합' }));
    const event = new Event('pointerup', { bubbles: true });
    Object.defineProperties(event, { clientX: { value: 20 }, clientY: { value: 20 } });
    fireEvent(confirm, event);
    expect(screen.getByRole('dialog', { name: '브랜드 병합 확인' })).toBe(confirm);
    await act(async () => finish({ success: false, error: 'MERGE_FAILED' }));
    expect(within(confirm).getByRole('alert').textContent).toBe('MERGE_FAILED');
  });

  it('closes both levels after success and focuses search if the source row reloads', async () => {
    let finish!: (value: typeof brands) => void;
    mocks.brands.mockResolvedValueOnce(brands).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const { confirm } = await selectBrand();
    click(within(confirm).getByRole('button', { name: '병합' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('브랜드 검색')));
    await act(async () => finish(brands));
    expect(mocks.success).toHaveBeenCalledWith('병합 완료: 2개 상품 이관');
  });
});
