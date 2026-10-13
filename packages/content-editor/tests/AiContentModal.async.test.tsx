import { useState, type ComponentProps } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AiContentModal } from '../src/components/AiContentModal';

function deferred() {
  let resolve!: (value: any) => void;
  let reject!: (reason: any) => void;
  const promise = new Promise<any>((a, b) => { resolve = a; reject = b; });
  return { promise, resolve, reject };
}
const generated = () => ({ ok: true, json: async () => ({ success: true, html: '<p>Fixture</p>', title: 'Fixture title' }) });
const saved = () => ({ ok: true, json: async () => ({ success: true, data: { id: 'saved-id' } }) });
function Fixture({ token = 'one', text = 'Fixture', onSaved = vi.fn(), channel, entry }: { token?: string; text?: string; onSaved?: (id: string | undefined) => void; channel?: any; entry?: Partial<ComponentProps<typeof AiContentModal>> }) {
  const [open, setOpen] = useState(true);
  return <><button onClick={() => setOpen(false)}>External close</button><button onClick={() => setOpen(true)}>Reopen</button>
    <AiContentModal open={open} onClose={() => setOpen(false)} editor={null} initialText={text}
      aiRequestHeaders={{ Authorization: token }} showStoreSave showCommunitySave showProductionMaterialSave
      onProductionMaterialSaved={onSaved} onChannelSave={channel} {...entry} /></>;
}
async function generate() {
  fireEvent.click(screen.getByRole('button', { name: '✨ AI로 생성' }));
  await screen.findByRole('button', { name: '내 매장 저장' });
}
const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
afterEach(() => {
  cleanup(); vi.unstubAllGlobals(); vi.useRealTimers();
  if (clipboardDescriptor) Object.defineProperty(navigator, 'clipboard', clipboardDescriptor);
  else Reflect.deleteProperty(navigator, 'clipboard');
});

const destinations = [
  ['store', '내 매장 저장', '매장에 저장', '/store-contents'],
  ['material', '제작 자료로 저장', '제작 자료로 저장', '/store/assets'],
  ['community', '커뮤니티 저장', '게시글 저장', '/forum/posts'],
] as const;
describe('complete modal asynchronous lifecycle', () => {
  it.each(destinations)('%s blocks pending duplicate across external close and keeps late status out of the new panel', async (_target, openLabel, saveLabel, endpoint) => {
    const old = deferred();
    const fetchMock = vi.fn((url: string) => url.endsWith(endpoint) ? old.promise : url.endsWith('/categories')
      ? Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) }) : Promise.resolve(generated()));
    vi.stubGlobal('fetch', fetchMock);
    const onSaved = vi.fn();
    render(<Fixture onSaved={onSaved} />);
    await generate();
    fireEvent.click(screen.getByRole('button', { name: openLabel }));
    fireEvent.click(await screen.findByRole('button', { name: saveLabel }));
    fireEvent.click(screen.getByRole('button', { name: 'External close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reopen' }));
    await generate();
    fireEvent.click(screen.getByRole('button', { name: openLabel }));
    const pending = await screen.findByRole('button', { name: '저장 중...' });
    expect((pending as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(pending);
    expect(fetchMock.mock.calls.filter(([url]) => url.endsWith(endpoint))).toHaveLength(1);
    await act(async () => old.resolve(saved()));
    expect(screen.queryByText('저장됨 ✓')).toBeNull();
    expect((screen.getByRole('button', { name: saveLabel }) as HTMLButtonElement).disabled).toBe(false);
    expect(onSaved).toHaveBeenCalledTimes(_target === 'material' ? 1 : 0);
  });

  it('new authentication context ignores old categories and old finally while the new list is pending', async () => {
    const old = deferred(); const current = deferred();
    const fetchMock = vi.fn((url: string, options: any) => url.endsWith('/categories')
      ? (options.headers.Authorization === 'one' ? old.promise : current.promise) : Promise.resolve(generated()));
    vi.stubGlobal('fetch', fetchMock);
    const view = render(<Fixture />);
    await generate(); fireEvent.click(screen.getByRole('button', { name: '커뮤니티 저장' }));
    view.rerender(<Fixture token="two" />);
    await generate(); fireEvent.click(screen.getByRole('button', { name: '커뮤니티 저장' }));
    await act(async () => old.resolve({ ok: true, json: async () => ({ success: true, data: [{ id: 'old', name: 'Old private forum' }] }) }));
    expect(screen.queryByText('Old private forum')).toBeNull();
    expect(screen.getByText('게시판 목록 로딩 중...')).toBeTruthy();
    await act(async () => current.resolve({ ok: true, json: async () => ({ success: true, data: [{ id: 'new', name: 'Current forum' }] }) }));
    expect(screen.getByText('Current forum')).toBeTruthy();
  });

  it('changed initial content invalidates generation but equivalent header objects do not', async () => {
    const old = deferred(); vi.stubGlobal('fetch', vi.fn(() => old.promise));
    const view = render(<Fixture />);
    fireEvent.click(screen.getByRole('button', { name: '✨ AI로 생성' }));
    view.rerender(<Fixture />);
    expect(screen.getByRole('button', { name: '생성 중...' })).toBeTruthy();
    view.rerender(<Fixture text="New content" />);
    await act(async () => old.resolve(generated()));
    expect(screen.queryByRole('button', { name: '내 매장 저장' })).toBeNull();
    expect((screen.getByRole('button', { name: '✨ AI로 생성' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('channel save remains single-flight after reopen and ignores its old status', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => generated()));
    const old = deferred(); const channel = vi.fn(() => old.promise);
    render(<Fixture channel={channel} />);
    await generate(); fireEvent.click(screen.getByRole('button', { name: '채널에 저장' }));
    fireEvent.click(screen.getByRole('button', { name: 'External close' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reopen' }));
    await generate();
    expect((screen.getByRole('button', { name: '저장 중...' }) as HTMLButtonElement).disabled).toBe(true);
    await act(async () => old.resolve({ success: true, fieldLabel: 'Old channel' }));
    expect(screen.queryByText(/Old channel/)).toBeNull();
    expect(channel).toHaveBeenCalledTimes(1);
  });

  it('a confirmed material save still calls its original callback after unmount', async () => {
    const old = deferred(); const onSaved = vi.fn();
    vi.stubGlobal('fetch', vi.fn((url: string) => url.endsWith('/store/assets') ? old.promise : Promise.resolve(generated())));
    const view = render(<Fixture onSaved={onSaved} />);
    await generate(); fireEvent.click(screen.getByRole('button', { name: '제작 자료로 저장' }));
    fireEvent.click(screen.getByRole('button', { name: '제작 자료로 저장' }));
    view.unmount(); await act(async () => old.resolve(saved()));
    expect(onSaved).toHaveBeenCalledExactlyOnceWith('saved-id');
  });
});

describe('save failures, independent destinations and view changes', () => {
  it.each(destinations)('%s releases a failed write for retry and disables the confirmed current success', async (_target, openLabel, saveLabel, endpoint) => {
    const old = deferred(); let saves = 0;
    vi.stubGlobal('fetch', vi.fn((url: string) => url.endsWith(endpoint) ? (++saves === 1 ? old.promise : Promise.resolve(saved()))
      : url.endsWith('/categories') ? Promise.resolve({ ok: true, json: async () => ({ success: true, data: [] }) }) : Promise.resolve(generated())));
    render(<Fixture />); await generate();
    fireEvent.click(screen.getByRole('button', { name: openLabel }));
    fireEvent.click(screen.getByRole('button', { name: saveLabel }));
    await act(async () => old.reject(new Error('Retry this failure')));
    expect(screen.getByText(/Retry this failure/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: saveLabel }));
    await screen.findAllByText('저장됨 ✓');
    expect(saves).toBe(2);
    expect(screen.getAllByRole('button', { name: '저장됨 ✓' }).some(button => (button as HTMLButtonElement).disabled)).toBe(true);
  });

  it('store and material issue independent writes; hidden/reopened store ignores its old error', async () => {
    const store = deferred(); const material = deferred(); const onSaved = vi.fn();
    vi.stubGlobal('fetch', vi.fn((url: string) => url.endsWith('/store-contents') ? store.promise
      : url.endsWith('/store/assets') ? material.promise : Promise.resolve(generated())));
    render(<Fixture onSaved={onSaved} />); await generate();
    fireEvent.click(screen.getByRole('button', { name: '내 매장 저장' }));
    fireEvent.click(screen.getByRole('button', { name: '매장에 저장' }));
    fireEvent.click(screen.getByRole('button', { name: '제작 자료로 저장' }));
    fireEvent.click(screen.getByRole('button', { name: '제작 자료로 저장' }));
    expect(screen.getAllByRole('button', { name: '저장 중...' })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: '내 매장 저장 ▲' }));
    fireEvent.click(screen.getByRole('button', { name: '내 매장 저장' }));
    await act(async () => store.reject(new Error('Hidden old failure')));
    expect(screen.queryByText(/Hidden old failure/)).toBeNull();
    expect((screen.getByRole('button', { name: '매장에 저장' }) as HTMLButtonElement).disabled).toBe(false);
    expect(screen.getByRole('button', { name: '저장 중...' })).toBeTruthy();
    await act(async () => material.resolve(saved()));
    expect(onSaved).toHaveBeenCalledExactlyOnceWith('saved-id');
  });

  it('new generation expires a pending save whose JSON has not yet decoded', async () => {
    const body = deferred();
    vi.stubGlobal('fetch', vi.fn((url: string) => url.endsWith('/store-contents')
      ? Promise.resolve({ ok: true, json: () => body.promise }) : Promise.resolve(generated())));
    render(<Fixture />); await generate();
    fireEvent.click(screen.getByRole('button', { name: '내 매장 저장' }));
    fireEvent.click(screen.getByRole('button', { name: '매장에 저장' }));
    await act(async () => {});
    await generate();
    fireEvent.click(screen.getByRole('button', { name: '내 매장 저장' }));
    await act(async () => body.resolve({ success: true, data: { id: 'old-id' } }));
    expect(screen.queryByText('저장됨 ✓')).toBeNull();
  });

  it('cached forum list is cleared when the authentication values change', async () => {
    vi.stubGlobal('fetch', vi.fn((url: string, options: any) => url.endsWith('/categories')
      ? Promise.resolve({ ok: true, json: async () => ({ success: true, data: [{ id: options.headers.Authorization, name: `Forum ${options.headers.Authorization}` }] }) }) : Promise.resolve(generated())));
    const view = render(<Fixture />); await generate();
    fireEvent.click(screen.getByRole('button', { name: '커뮤니티 저장' }));
    await screen.findByText('Forum one');
    view.rerender(<Fixture token="two" />); await generate();
    fireEvent.click(screen.getByRole('button', { name: '커뮤니티 저장' }));
    await screen.findByText('Forum two');
    expect(screen.queryByText('Forum one')).toBeNull();
  });

  it('late clipboard completion cannot mark a newly generated result as copied', async () => {
    const copy = deferred();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => copy.promise } });
    vi.stubGlobal('fetch', vi.fn(async () => generated()));
    render(<Fixture />); await generate();
    fireEvent.click(screen.getByRole('button', { name: '복사' }));
    await generate();
    await act(async () => copy.resolve(undefined));
    expect(screen.queryByRole('button', { name: '복사됨 ✓' })).toBeNull();
    expect(screen.getByRole('button', { name: '복사' })).toBeTruthy();
    Reflect.deleteProperty(navigator, 'clipboard');
  });
});

describe('entry and auxiliary asynchronous boundaries', () => {
  it.each([
    { templateId: 'new-template' },
    { templateSystemPrompt: 'New instruction' },
    { templateForcedOptions: { tone: 'friendly' as const } },
    { sourceMetadata: { sourceContentId: 'new-content' } },
    { initialSourceTab: 'url' as const },
  ])('changed entry %j expires the pending generation', async entry => {
    const old = deferred(); vi.stubGlobal('fetch', vi.fn(() => old.promise));
    const view = render(<Fixture />);
    fireEvent.click(screen.getByRole('button', { name: '✨ AI로 생성' }));
    view.rerender(<Fixture entry={entry} />);
    await act(async () => old.resolve(generated()));
    expect(screen.queryByRole('button', { name: '내 매장 저장' })).toBeNull();
    expect(screen.queryByRole('button', { name: '생성 중...' })).toBeNull();
    if ('initialSourceTab' in entry) expect(screen.getByRole('button', { name: '🔗 URL로 생성' })).toBeTruthy();
  });

  it('forum panel reentry owns loading even if its prior request fails later', async () => {
    const old = deferred(); const current = deferred(); let reads = 0;
    vi.stubGlobal('fetch', vi.fn((url: string) => url.endsWith('/categories') ? (++reads === 1 ? old.promise : current.promise) : Promise.resolve(generated())));
    render(<Fixture />); await generate();
    fireEvent.click(screen.getByRole('button', { name: '커뮤니티 저장' }));
    fireEvent.click(screen.getByRole('button', { name: '커뮤니티 저장 ▲' }));
    fireEvent.click(screen.getByRole('button', { name: '커뮤니티 저장' }));
    await act(async () => old.reject(new Error('Old list failure')));
    expect(screen.getByText('게시판 목록 로딩 중...')).toBeTruthy();
    await act(async () => current.resolve({ ok: true, json: async () => ({ success: true, data: [{ id: 'now', name: 'Now forum' }] }) }));
    expect(screen.getByText('Now forum')).toBeTruthy();
  });

  it('failed category read allows saving without a forum and can be retried on panel reentry', async () => {
    let reads = 0; const writes: any[] = [];
    vi.stubGlobal('fetch', vi.fn((url: string, options: any) => {
      if (url.endsWith('/categories')) return ++reads === 1 ? Promise.reject(new Error('List unavailable'))
        : Promise.resolve({ ok: true, json: async () => ({ success: true, data: [{ id: 'retry', name: 'Retried forum' }] }) });
      if (url.endsWith('/forum/posts')) { writes.push(JSON.parse(options.body)); return Promise.resolve(saved()); }
      return Promise.resolve(generated());
    }));
    render(<Fixture />); await generate();
    fireEvent.click(screen.getByRole('button', { name: '커뮤니티 저장' }));
    await screen.findByText('게시판 선택 (선택사항)');
    fireEvent.click(screen.getByRole('button', { name: '커뮤니티 저장 ▲' }));
    fireEvent.click(screen.getByRole('button', { name: '커뮤니티 저장' }));
    await screen.findByText('Retried forum');
    fireEvent.click(screen.getByRole('button', { name: '게시글 저장' }));
    await screen.findAllByText('저장됨 ✓');
    expect(writes).toHaveLength(1);
    expect(writes[0].forumId).toBeUndefined();
  });

  it('late clipboard rejection cannot execute a fallback for the expired result', async () => {
    const copy = deferred(); const fallback = vi.fn();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => copy.promise } });
    Object.defineProperty(document, 'execCommand', { configurable: true, value: fallback });
    vi.stubGlobal('fetch', vi.fn(async () => generated()));
    render(<Fixture />); await generate(); fireEvent.click(screen.getByRole('button', { name: '복사' }));
    fireEvent.click(screen.getByRole('button', { name: 'External close' }));
    await act(async () => copy.reject(new Error('Clipboard unavailable')));
    expect(fallback).not.toHaveBeenCalled();
    Reflect.deleteProperty(document, 'execCommand');
  });

  it('current copy shows confirmation and clears it after two seconds', async () => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => {} } });
    vi.stubGlobal('fetch', vi.fn(async () => generated()));
    render(<Fixture />); await generate(); vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: '복사' }));
    await act(async () => {});
    expect(screen.getByRole('button', { name: '복사됨 ✓' })).toBeTruthy();
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByRole('button', { name: '복사' })).toBeTruthy();
  });
});

describe('channel completion contract', () => {
  it('current channel failure permits retry, and confirmed success disables repeated submission', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => generated()));
    const channel = vi.fn().mockRejectedValueOnce(new Error('Channel failure'))
      .mockResolvedValueOnce({ success: true, fieldLabel: 'Current channel' });
    render(<Fixture channel={channel} />); await generate();
    fireEvent.click(screen.getByRole('button', { name: '채널에 저장' }));
    await screen.findByText('저장 실패: Channel failure');
    fireEvent.click(screen.getByRole('button', { name: '채널에 저장' }));
    await screen.findByText('저장 완료 — Current channel ✓');
    const savedButton = screen.getByRole('button', { name: '저장됨 ✓' });
    expect((savedButton as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(savedButton);
    expect(channel).toHaveBeenCalledTimes(2);
  });
});
