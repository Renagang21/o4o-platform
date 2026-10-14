import { useLayoutEffect, useRef } from "react";

/** One committed modal view/generation lifetime. Payloads and submitted writes stay outside this owner. */
export function useAiGenerationRequest(open: boolean, context = "") {
  const lifetime = useRef({ active: open, mounted: true, requestId: 0 });
  const requests = useRef({
    capture: () => lifetime.current.requestId,
    current: (requestId: number) =>
      lifetime.current.mounted &&
      lifetime.current.active &&
      lifetime.current.requestId === requestId,
    mounted: () => lifetime.current.mounted,
    invalidate: () => {
      lifetime.current.requestId += 1;
    },
    begin: () => {
      const requestId = ++lifetime.current.requestId;
      return () =>
        lifetime.current.mounted &&
        lifetime.current.active &&
        lifetime.current.requestId === requestId;
    },
  }).current;
  useLayoutEffect(() => {
    const current = lifetime.current;
    current.requestId += 1;
    current.active = open;
    current.mounted = true;
    return () => {
      current.active = false;
      current.mounted = false;
      current.requestId += 1;
    };
  }, [open, context]);
  return requests;
}
