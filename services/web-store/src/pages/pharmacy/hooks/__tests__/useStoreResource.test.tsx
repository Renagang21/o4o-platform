// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useStoreResource } from '../useStoreResource';
afterEach(cleanup);
it('a failed load is an error, then retry may confirm an actually empty list', async () => {
  const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
  const { result } = renderHook(() => useStoreResource<string[]>(load, []));
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBeTruthy();
  await act(() => result.current.reload());
  expect(result.current.error).toBeNull();
  expect(result.current.data).toEqual([]);
});
it('a late older response cannot overwrite a successful refresh', async () => {
  let resolveOld!: (value: string[]) => void;
  const old = new Promise<string[]>(resolve => { resolveOld = resolve; });
  const load = vi.fn().mockReturnValueOnce(old).mockResolvedValueOnce(['latest']);
  const { result } = renderHook(() => useStoreResource<string[]>(load, []));
  await act(() => result.current.reload());
  await act(async () => { resolveOld(['old']); await old; });
  expect(result.current.data).toEqual(['latest']);
});
it('a failed refresh retains the last confirmed data and exposes the failure', async () => {
  const load = vi.fn().mockResolvedValueOnce(['saved']).mockRejectedValueOnce(new Error('offline'));
  const { result } = renderHook(() => useStoreResource<string[]>(load, []));
  await waitFor(() => expect(result.current.data).toEqual(['saved']));
  await act(() => result.current.reload());
  expect(result.current.data).toEqual(['saved']);
  expect(result.current.error).toBeTruthy();
});
it('disabled resources never load or retry and reject a response from before disabling', async () => {
  let resolve!: (value: string[]) => void;
  const load = vi.fn().mockImplementation(() => new Promise<string[]>(done => { resolve = done; }));
  const { result, rerender } = renderHook(({ enabled }) => useStoreResource<string[]>(load, [], enabled), { initialProps: { enabled: false } });
  await act(() => result.current.reload());
  expect(load).not.toHaveBeenCalled();
  expect(result.current.loading).toBe(false);
  rerender({ enabled: true });
  expect(load).toHaveBeenCalledOnce();
  rerender({ enabled: false });
  await act(async () => resolve(['not available']));
  expect(result.current.data).toEqual([]);
  expect(result.current.error).toBeNull();
});
