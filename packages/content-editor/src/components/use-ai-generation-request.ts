import { useLayoutEffect, useRef } from 'react';

/** AiContentModal's one generation-result slot, scoped to a committed open lifetime. */
export function useAiGenerationRequest(open: boolean, context = '') {
  const lifetime = useRef({ active: false, requestId: 0 });

  useLayoutEffect(() => {
    const current = lifetime.current;
    current.requestId += 1;
    current.active = open;
    return () => {
      current.active = false;
      current.requestId += 1;
    };
  }, [open, context]);

  const invalidate = () => { lifetime.current.requestId += 1; };
  const begin = () => {
    const requestId = ++lifetime.current.requestId;
    return () => lifetime.current.active && lifetime.current.requestId === requestId;
  };

  return { begin, invalidate };
}
