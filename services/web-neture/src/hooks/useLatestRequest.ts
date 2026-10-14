import { useCallback, useLayoutEffect, useRef } from 'react';

/** A response belongs to the mounted scope and the latest request in its channel. */
export function useLatestRequest(scope: string) {
  const state = useRef({ scope, mounted: false, sequence: 0 });
  useLayoutEffect(() => {
    const lifecycle = state.current;
    lifecycle.scope = scope;
    lifecycle.mounted = true;
    return () => { lifecycle.mounted = false; lifecycle.sequence++; };
  }, [scope]);
  return useCallback(() => {
    const lifecycle = state.current;
    const request = ++lifecycle.sequence;
    return () => lifecycle.mounted && lifecycle.scope === scope && lifecycle.sequence === request;
  }, [scope]);
}
