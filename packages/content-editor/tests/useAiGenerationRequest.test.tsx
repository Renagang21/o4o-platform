import { StrictMode } from 'react';
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useAiGenerationRequest } from '../src/components/use-ai-generation-request';

afterEach(cleanup);

describe('AiContentModal generation identity', () => {
  it('only the latest request can apply to one result slot', () => {
    const { result } = renderHook(() => useAiGenerationRequest(true));
    const first = result.current.begin();
    expect(first()).toBe(true);
    const second = result.current.begin();
    expect(first()).toBe(false);
    expect(second()).toBe(true);
    result.current.invalidate();
    expect(second()).toBe(false);
  });

  it('close/reopen never revives an old identity, including a request begun while closed', () => {
    const { result, rerender } = renderHook(({ open }) => useAiGenerationRequest(open), { initialProps: { open: true } });
    const first = result.current.begin();
    rerender({ open: false });
    const closed = result.current.begin();
    expect(first()).toBe(false);
    expect(closed()).toBe(false);
    rerender({ open: true });
    expect(first()).toBe(false);
    expect(closed()).toBe(false);
    expect(result.current.begin()()).toBe(true);
  });

  it('ordinary rerenders do not cancel the current request', () => {
    const { result, rerender } = renderHook(() => useAiGenerationRequest(true));
    const request = result.current.begin();
    rerender();
    expect(request()).toBe(true);
  });

  it('unmount invalidates requests and another instance is independent', () => {
    const first = renderHook(() => useAiGenerationRequest(true));
    const second = renderHook(() => useAiGenerationRequest(true));
    const old = first.result.current.begin();
    const current = second.result.current.begin();
    first.unmount();
    expect(old()).toBe(false);
    expect(current()).toBe(true);
  });

  it('StrictMode effect cleanup/replay leaves the committed lifetime usable', () => {
    const { result, unmount } = renderHook(() => useAiGenerationRequest(true), { wrapper: StrictMode });
    const request = result.current.begin();
    expect(request()).toBe(true);
    unmount();
    expect(request()).toBe(false);
  });
});
