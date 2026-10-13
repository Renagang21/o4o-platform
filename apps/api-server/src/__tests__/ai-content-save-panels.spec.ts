import { JSDOM } from 'jsdom';
import { act, cleanup, renderHook } from '@testing-library/react/pure';
import {
  useCommunitySavePanelState, useStoreSavePanelState, useProductionMaterialSavePanelState,
} from '../../../../packages/content-editor/src/components/use-ai-content-save-panels';

describe('AiContentModal independent save panel lifetimes', () => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>');
  const globals = ['window', 'document', 'navigator', 'HTMLElement', 'Node'] as const;
  const descriptors = globals.map(name => Object.getOwnPropertyDescriptor(globalThis, name));
  beforeAll(() => {
    for (const name of globals) {
      Object.defineProperty(globalThis, name, { configurable: true, writable: true, value: dom.window[name] });
    }
  });
  afterEach(cleanup);
  afterAll(() => {
    globals.forEach((name, i) => {
      if (descriptors[i]) Object.defineProperty(globalThis, name, descriptors[i]!);
      else Reflect.deleteProperty(globalThis, name);
    });
    dom.window.close();
  });

  function usePanels() {
    return {
      community: useCommunitySavePanelState(),
      store: useStoreSavePanelState(),
      material: useProductionMaterialSavePanelState(),
    };
  }

  it('initially hides all panels with no request/status or shared draft', () => {
    const { result } = renderHook(usePanels);
    expect(result.current.community).toMatchObject({
      visible: false, title: '', forumId: '',
      forums: [], forumsLoading: false, saving: false, status: null,
    });
    expect(result.current.store).toMatchObject({ visible: false, title: '', saving: false, status: null });
    expect(result.current.material).toMatchObject({ visible: false, title: '', saving: false, status: null });
  });

  it('store draft and success leave community/material state unchanged', () => {
    const { result } = renderHook(usePanels);
    act(() => {
      result.current.store.setVisible(true);
      result.current.store.setTitle('Store draft');
      result.current.store.setSaving(true);
    });
    expect(result.current.store.saving).toBe(true);
    act(() => {
      result.current.store.setStatus({ ok: true, contentId: 'fixture-content' });
      result.current.store.setSaving(false);
    });
    expect(result.current.store.status).toEqual({ ok: true, contentId: 'fixture-content' });
    expect(result.current.community.title).toBe('');
    expect(result.current.community.status).toBeNull();
    expect(result.current.material.saving).toBe(false);
    expect(result.current.material.status).toBeNull();
  });

  it('community close resets draft/request status and preserves existing forum list/loading', () => {
    const { result } = renderHook(usePanels);
    const forums = [{ id: 'fixture-forum', name: 'Fixture forum' }];
    act(() => {
      result.current.community.setVisible(true);
      result.current.community.setTitle('Community draft');
      result.current.community.setForumId('fixture-forum');
      result.current.community.setForums(forums);
      result.current.community.setForumsLoading(true);
      result.current.community.setSaving(true);
      result.current.community.setStatus({ ok: false, error: 'fixture failure' });
      result.current.store.setTitle('Store draft');
    });
    act(() => result.current.community.reset());
    expect(result.current.community).toMatchObject({
      visible: false, title: '', forumId: '',
      saving: false, status: null, forums: forums, forumsLoading: true,
    });
    expect(result.current.store.title).toBe('Store draft');
  });

  it('store/material close resets each domain without resetting another open panel', () => {
    const { result } = renderHook(usePanels);
    act(() => {
      result.current.store.setVisible(true);
      result.current.store.setTitle('Store draft');
      result.current.store.setSaving(true);
      result.current.store.setStatus({ ok: false, error: 'fixture failure' });
      result.current.material.setVisible(true);
      result.current.material.setTitle('Material draft');
      result.current.material.setSaving(true);
      result.current.material.setStatus({ ok: true, assetId: 'fixture-asset' });
    });
    act(() => result.current.store.reset());
    expect(result.current.store).toMatchObject({ visible: false, title: '', saving: false, status: null });
    expect(result.current.material.title).toBe('Material draft');
    act(() => result.current.material.reset());
    expect(result.current.material).toMatchObject({ visible: false, title: '', saving: false, status: null });
  });

  it('rerender retains the draft and React setter identity', () => {
    const { result, rerender } = renderHook(usePanels);
    const setter = result.current.store.setTitle;
    act(() => setter('Keep draft'));
    rerender();
    expect(result.current.store.title).toBe('Keep draft');
    expect(result.current.store.setTitle).toBe(setter);
  });

  it('separate mounts do not share state and a new mount starts from defaults', () => {
    const first = renderHook(usePanels);
    const second = renderHook(usePanels);
    act(() => first.result.current.store.setTitle('First instance'));
    expect(second.result.current.store.title).toBe('');
    first.unmount();
    const third = renderHook(usePanels);
    expect(third.result.current.store.title).toBe('');
  });

  it('opening community initializes its draft but retains cached forums and in-flight flags', () => {
    const { result } = renderHook(usePanels);
    const forums = [{ id: 'fixture-forum', name: 'Fixture forum' }];
    act(() => {
      result.current.community.setForums(forums);
      result.current.community.setForumId('old-forum');
      result.current.community.setSaving(true);
      result.current.community.setStatus({ ok: true, postId: 'old-post' });
    });
    act(() => result.current.community.open('New draft'));
    expect(result.current.community).toMatchObject({
      visible: true, title: 'New draft', forumId: '',
      status: null, forums: forums, saving: true,
    });
  });

  it('opening store/material sets titles and clears status without cancelling pending saves', () => {
    const { result } = renderHook(usePanels);
    act(() => {
      result.current.store.setSaving(true);
      result.current.store.setStatus({ ok: false, error: 'old error' });
      result.current.material.setSaving(true);
      result.current.material.setStatus({ ok: true, assetId: 'old-asset' });
    });
    act(() => {
      result.current.store.open('Store draft');
      result.current.material.open('Material draft');
    });
    expect(result.current.store).toMatchObject({ visible: true, title: 'Store draft', status: null, saving: true });
    expect(result.current.material).toMatchObject({ visible: true, title: 'Material draft', status: null, saving: true });
  });

});
