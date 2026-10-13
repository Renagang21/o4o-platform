import { StrictMode, type PropsWithChildren } from 'react';
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useAiModalSaveRequests } from '../src/components/use-ai-modal-save-requests';

afterEach(cleanup);
describe('issued save ownership', () => {
  it('acquires synchronously before a render, survives close and releases independently of stale UI', () => {
    const view = renderHook(({ open }) => useAiModalSaveRequests(open, 'fixture'), { initialProps: { open: true } });
    let first!: NonNullable<ReturnType<typeof view.result.current.beginSave>>;
    act(() => {
      first = view.result.current.beginSave('store')!;
      expect(view.result.current.beginSave('store')).toBeNull();
    });
    expect(first.isCurrent()).toBe(true);
    view.rerender({ open: false });
    view.rerender({ open: true });
    expect(first.isCurrent()).toBe(false);
    expect(view.result.current.pending.store).toBe(true);
    act(() => first.finish());
    expect(view.result.current.pending.store).toBe(false);
    act(() => expect(view.result.current.beginSave('store')).not.toBeNull());
  });

  it('closing a panel invalidates only its UI, leaving other destinations owned and pending', () => {
    const { result } = renderHook(() => useAiModalSaveRequests(true, 'fixture'));
    let store!: NonNullable<ReturnType<typeof result.current.beginSave>>;
    let material!: typeof store;
    act(() => { store = result.current.beginSave('store')!; material = result.current.beginSave('material')!; });
    act(() => result.current.invalidate('store'));
    expect(store.isCurrent()).toBe(false);
    expect(material.isCurrent()).toBe(true);
    expect(result.current.pending).toMatchObject({ store: true, material: true });
    act(() => store.finish());
    expect(result.current.pending.material).toBe(true);
    act(() => material.finish());
  });

  it('same context rerender retains ownership; changed context expires UI without releasing writes', () => {
    const view = renderHook(({ context }) => useAiModalSaveRequests(true, context), { initialProps: { context: 'one' } });
    let request!: NonNullable<ReturnType<typeof view.result.current.beginSave>>;
    act(() => { request = view.result.current.beginSave('community')!; });
    view.rerender({ context: 'one' }); expect(request.isCurrent()).toBe(true);
    view.rerender({ context: 'two' }); expect(request.isCurrent()).toBe(false);
    expect(view.result.current.pending.community).toBe(true);
    act(() => request.finish());
  });

  it('latest forum view owns its finally; an unmounted instance cannot own UI or leak to another', () => {
    const first = renderHook(() => useAiModalSaveRequests(true, 'fixture'));
    const old = first.result.current.beginView('forums');
    const current = first.result.current.beginView('forums');
    expect(old()).toBe(false); expect(current()).toBe(true);
    let request!: NonNullable<ReturnType<typeof first.result.current.beginSave>>;
    act(() => { request = first.result.current.beginSave('channel')!; });
    first.unmount(); expect(current()).toBe(false); expect(request.isCurrent()).toBe(false);
    const second = renderHook(() => useAiModalSaveRequests(true, 'fixture'));
    act(() => request.finish());
    expect(second.result.current.pending.channel).toBe(false);
  });

  it('StrictMode effect replay establishes an active lifetime and finish remains usable', () => {
    const wrapper = ({ children }: PropsWithChildren) => <StrictMode>{children}</StrictMode>;
    const { result } = renderHook(() => useAiModalSaveRequests(true, 'fixture'), { wrapper });
    let request!: NonNullable<ReturnType<typeof result.current.beginSave>>;
    act(() => { request = result.current.beginSave('store')!; });
    expect(request.isCurrent()).toBe(true);
    act(() => request.finish());
    expect(result.current.pending.store).toBe(false);
  });
});
