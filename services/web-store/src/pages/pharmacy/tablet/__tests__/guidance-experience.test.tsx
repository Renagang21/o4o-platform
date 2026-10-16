import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicScreenSetViewer, TabletKioskPage, type QrScreenSet, type TabletKioskApi, type TabletScreenResponse } from '@o4o/tablet-kiosk-core';
import { TabletContentStepBuilder, type ScreenSet, type ScreenSetBuilderApi, type ScreenSetDetail, type ScreenBlock } from '@o4o/tablet-screen-set-editor';
import { createScreenSetSession } from '../screenSetSession';
import { StoreSignageScheduleForm } from '../../StoreSignageScheduleForm';
import type { StorePlaylist } from '../../../../api/storePlaylist';

vi.mock('@o4o/content-editor', () => ({
  ContentRenderer: ({ html }: { html: string }) => <div>{html}</div>,
  hasStoreDescriptionMarkup: () => false,
  RichTextEditor: ({ value, onChange, editable }: { value: string; onChange: (value: { html: string }) => void; editable: boolean }) => <textarea aria-label="코너 내용" value={value} disabled={!editable} onChange={(event) => onChange({ html: event.target.value })} />,
  LlmAssistPanel: () => <span>외부 도구 보조</span>,
}));

const products = [
  { id: 'product-a', type: 'local', name: '제품 A', specification: '소형 10개', description: '제품 A의 확인된 설명', qrUrl: '/qr/product-a' },
  { id: 'product-b', type: 'local', name: '제품 B', specification: '대형 5개', description: '제품 B의 확인된 설명' },
];
const sections = [
  { blockType: 'corner_description', sortOrder: 10, data: { title: '손님에게 보이는 제목', body: '짧은 코너 안내' } },
  { blockType: 'content_list', sortOrder: 20, data: { items: [{ itemId: 'guide', title: '사용 순서', summary: '차례대로 확인하세요', hasDetail: true, detail: { html: '자세한 사용 순서' } }] } },
  { blockType: 'product_list', sortOrder: 30, data: { selectionMode: 'selected', products } },
  { blockType: 'idle_media', sortOrder: 40, data: { items: [{ url: 'https://youtu.be/example' }] } },
];
function phone(overrides: Partial<QrScreenSet> = {}): QrScreenSet {
  return { landingType: 'screen_set', slug: 'corner-a', name: '내부 관리 이름', templateKey: 'corner_information_basic_v1', sections, ...overrides };
}
function tablet(templateKey = 'corner_information_basic_v1'): TabletScreenResponse {
  return { mode: 'screen_set', templateKey, screenSet: { id: 'screen-a', name: '내부 관리 이름' }, qrUrl: '/qr/corner-a', sections };
}
const kioskApi: TabletKioskApi = {
  fetchProducts: async () => ({ data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 1 } }),
  submitInterest: async () => { throw new Error('not supported'); },
  checkStatus: async () => { throw new Error('not supported'); },
};
function header(name = '저장한 안내'): ScreenSet {
  return { id: 'saved', name, templateKey: 'corner_information_basic_v1', status: 'active' } as ScreenSet;
}
function builderApi(): ScreenSetBuilderApi {
  return {
    create: vi.fn(async (input) => ({ ...header(), ...input })),
    update: vi.fn(async (id, input) => ({ ...header(), ...input, id })),
    saveBlocks: vi.fn(async (_id: string, blocks: ScreenBlock[]) => blocks),
    preview: vi.fn(async () => tablet()),
    searchO4oDescriptions: vi.fn(async () => []),
    searchStoreContents: vi.fn(async () => []),
  };
}
beforeEach(() => {
  // jsdom has the element but no native dialog methods; Chromium smoke verifies real focus behaviour.
  if (!HTMLDialogElement.prototype.showModal) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value() {} });
  if (!HTMLDialogElement.prototype.close) Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value() {} });
  vi.spyOn(HTMLDialogElement.prototype, 'showModal').mockImplementation(function (this: HTMLDialogElement) { this.open = true; this.querySelector<HTMLElement>('button')?.focus(); });
  vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function (this: HTMLDialogElement) { this.open = false; });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('고객용 안내', () => {
  it('휴대전화는 고객용 제목과 원문을 보여주고 대기 영상은 재생하지 않는다', () => {
    const { container } = render(<PublicScreenSetViewer screenSet={phone()} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('손님에게 보이는 제목');
    expect(screen.queryByText('내부 관리 이름')).toBeNull();
    expect(screen.getByText('짧은 코너 안내')).toBeTruthy();
    expect(container.querySelector('iframe')).toBeNull();
  });
  it('고객용 제목이 없으면 기본 제목을 쓰고 관리 이름을 노출하지 않는다', () => {
    const noTitle = sections.map((section) => section.blockType === 'corner_description' ? { ...section, data: { body: '안내 본문' } } : section);
    render(<PublicScreenSetViewer screenSet={phone({ sections: noTitle })} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('코너 안내');
    expect(screen.queryByText('내부 관리 이름')).toBeNull();
  });
  it('휴대전화에서는 상품의 기존 QR 연결 안내를 바로 열고 스캔을 다시 요구하지 않는다', () => {
    render(<PublicScreenSetViewer screenSet={phone()} />);
    expect(screen.getByRole('link', { name: '연결된 안내 열기 ›' }).getAttribute('href')).toBe('/qr/product-a');
    expect(screen.queryByRole('button', { name: /QR 크게 보기/ })).toBeNull();
  });
  it('위험한 프로토콜은 연결 링크로 만들지 않고 상품 설명은 유지한다', () => {
    const unsafe = sections.map((section) => section.blockType === 'product_list' ? { ...section, data: { products: [{ ...products[0], qrUrl: 'javascript:alert(1)' }] } } : section);
    render(<PublicScreenSetViewer screenSet={phone({ sections: unsafe })} />);
    expect(screen.queryByRole('link')).toBeNull();
    expect(screen.getByRole('button', { name: /제품 A/ })).toBeTruthy();
  });
  it('제품 중심 배치는 추가 정보보다 제품을 먼저 보여준다', () => {
    const { container } = render(<PublicScreenSetViewer screenSet={phone({ templateKey: 'product_focus' })} />);
    expect([...container.querySelectorAll('section h2')].map((element) => element.textContent)).toEqual(['제품', '더 알아보기']);
  });
  it('상세 닫기와 Escape 취소는 원래 선택으로 포커스를 돌려준다', () => {
    render(<PublicScreenSetViewer screenSet={phone()} />);
    const button = screen.getByRole('button', { name: /사용 순서/ }); button.focus(); fireEvent.click(button);
    const dialog = screen.getByRole('dialog', { name: '사용 순서' });
    expect(within(dialog).getByText('자세한 사용 순서')).toBeTruthy();
    fireEvent(dialog, new Event('cancel', { bubbles: false, cancelable: true }));
    expect(screen.queryByRole('dialog')).toBeNull(); expect(document.activeElement).toBe(button);
  });
  it('다른 QR로 전환하면 이전 안내의 상세를 닫는다', () => {
    const view = render(<PublicScreenSetViewer screenSet={phone()} />);
    fireEvent.click(screen.getByRole('button', { name: /제품 A/ }));
    view.rerender(<PublicScreenSetViewer screenSet={phone({ slug: 'corner-b' })} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('태블릿은 QR이 있어도 고객용 제목을 표시하고 제품은 버튼으로 선택한다', async () => {
    render(<TabletKioskPage slug="fixture" api={kioskApi} previewScreen={tablet('product_focus')} />);
    expect(await screen.findByRole('heading', { name: '손님에게 보이는 제목' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /제품 A.*자세히 보기/ }));
    expect(screen.getByText('제품 A의 확인된 설명')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
  it('읽는 중인 상세와 QR은 최소 2분을 기다린 뒤 초기 화면으로 정리한다', async () => {
    vi.useFakeTimers();
    render(<TabletKioskPage slug="fixture" api={kioskApi} previewScreen={tablet()} idleTimeoutMs={1000} />);
    await act(async () => undefined);
    fireEvent.click(screen.getByRole('button', { name: /사용 순서/ }));
    act(() => vi.advanceTimersByTime(60_000));
    expect(screen.getByRole('dialog', { name: '사용 순서' })).toBeTruthy();
    act(() => vi.advanceTimersByTime(61_000));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText(/화면을 터치/)).toBeTruthy();
  });
});

describe('안내 제작', () => {
  it('추가 설정을 접어도 입력을 보존하고 세 기본 배치를 제안한다', () => {
    const { container } = render(<TabletContentStepBuilder initialDetail={null} api={builderApi()} onSaved={vi.fn()} onCancel={vi.fn()} onToast={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('코너 제목'), { target: { value: '새 안내' } });
    fireEvent.change(screen.getByLabelText('코너 내용'), { target: { value: '작성한 본문' } });
    const layout = [...container.querySelectorAll('details')].find((element) => element.querySelector('summary')?.textContent?.startsWith('화면 배치'))!;
    layout.open = true;
    expect(within(layout).getAllByRole('button')).toHaveLength(3);
    layout.open = false; layout.open = true;
    expect((screen.getByLabelText('코너 내용') as HTMLTextAreaElement).value).toBe('작성한 본문');
    expect(screen.queryByText('제품 진열형')).toBeNull();
  });
  it.each(['product_grid_qr', 'idle_touch_video'])('기존 배치 %s를 자동 변환하지 않고 같은 ID로 저장한다', async (templateKey) => {
    const api = builderApi(), saved = vi.fn();
    render(<TabletContentStepBuilder initialDetail={{ ...header(), templateKey, blocks: [] } as ScreenSetDetail} api={api} onSaved={saved} onCancel={vi.fn()} onToast={vi.fn()} />);
    const choices = screen.getByRole('button', { name: /안내 읽기/, hidden: true }).closest('details')!; choices.open = true;
    fireEvent.click(screen.getByRole('button', { name: /안내 읽기/ }));
    fireEvent.click(screen.getByRole('button', { name: /기존 배치 유지/ }));
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await act(async () => undefined);
    expect(api.update).toHaveBeenCalledWith('saved', expect.objectContaining({ templateKey }));
    expect(api.create).not.toHaveBeenCalled(); expect(saved).toHaveBeenCalledOnce();
  });
  it.each(['store', 'operator', 'supplier'])('%s 제작기는 블록 저장 실패 후 입력과 생성 ID를 보존해 재시도한다', async (role) => {
    const base = builderApi(), saved = vi.fn(), notice = vi.fn();
    vi.mocked(base.saveBlocks).mockRejectedValueOnce(new Error('블록 저장 실패'));
    const api = role === 'store' ? createScreenSetSession(base, () => true) : base;
    render(<TabletContentStepBuilder initialDetail={null} api={api} onSaved={saved} onCancel={vi.fn()} onToast={notice} />);
    fireEvent.change(screen.getByLabelText('코너 제목'), { target: { value: '새 안내' } });
    fireEvent.change(screen.getByLabelText('코너 내용'), { target: { value: '보존할 내용' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    await act(async () => undefined);
    expect(screen.getByRole('alert').textContent).toContain('블록 저장 실패');
    expect(saved).not.toHaveBeenCalled(); expect(notice).toHaveBeenCalledWith({ type: 'error', message: '블록 저장 실패' });
    expect((screen.getByLabelText('코너 내용') as HTMLTextAreaElement).value).toBe('보존할 내용');
    fireEvent.click(screen.getByRole('button', { name: '저장' })); await act(async () => undefined);
    expect(base.create).toHaveBeenCalledOnce(); expect(base.update).toHaveBeenCalledOnce(); expect(saved).toHaveBeenCalledOnce();
    expect(base.saveBlocks).toHaveBeenLastCalledWith('saved', expect.arrayContaining([expect.objectContaining({ blockType: 'corner_description', config: expect.objectContaining({ body: '보존할 내용' }) })]));
  });
  it('저장 중 중복 실행과 닫기를 막고 성공 후 한 번 완료한다', async () => {
    const api = builderApi(), saved = vi.fn(), cancel = vi.fn(); let finish!: () => void;
    vi.mocked(api.saveBlocks).mockImplementation((_id, blocks) => new Promise<ScreenBlock[]>((resolve) => { finish = () => resolve(blocks); }));
    render(<TabletContentStepBuilder initialDetail={null} api={api} onSaved={saved} onCancel={cancel} onToast={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('코너 제목'), { target: { value: '새 안내' } });
    fireEvent.click(screen.getByRole('button', { name: '저장' })); await act(async () => undefined);
    fireEvent.click(screen.getByRole('button', { name: '저장' })); fireEvent.click(screen.getByRole('button', { name: '목록으로' }));
    expect(api.create).toHaveBeenCalledOnce(); expect(cancel).not.toHaveBeenCalled();
    await act(async () => finish()); expect(saved).toHaveBeenCalledOnce();
  });
});

it('사이니지의 기본 일정과 상세 설정은 같은 상태를 보존한다', () => {
  const save = vi.fn();
  function Schedule() {
    const [name, setName] = useState(''), [playlist, setPlaylist] = useState(''), [priority, setPriority] = useState(0);
    return <StoreSignageScheduleForm editing={false} playlists={[{ id: 'playlist', name: '안내 모음', publishStatus: 'published' } as StorePlaylist]} schName={name} schPlaylistId={playlist} schPriority={priority} schDays={[0, 1, 2, 3, 4, 5, 6]} schStartTime="00:00" schEndTime="23:59" schValidFrom="" schValidUntil="" schIsActive={true} schSaving={false} saveError={null} setSchName={setName} setSchPlaylistId={setPlaylist} setSchPriority={setPriority} setSchStartTime={vi.fn()} setSchEndTime={vi.fn()} setSchValidFrom={vi.fn()} setSchValidUntil={vi.fn()} setSchIsActive={vi.fn()} toggleSchDay={vi.fn()} handleSaveSchedule={() => save({ name, playlist, priority })} resetScheduleForm={vi.fn()} />;
  }
  const { container } = render(<Schedule />);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'playlist' } });
  expect((screen.getByLabelText('스케줄명') as HTMLInputElement).value).toBe('안내 모음 재생');
  const details = container.querySelector('details')!; details.open = true;
  fireEvent.change(screen.getByLabelText('우선순위'), { target: { value: '7' } }); details.open = false;
  fireEvent.click(screen.getByRole('button', { name: '저장' }));
  expect(save).toHaveBeenCalledWith({ name: '안내 모음 재생', playlist: 'playlist', priority: 7 });
});
