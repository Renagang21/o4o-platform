/** Modal-local view lifetime. Request payloads and server write outcomes never live in this scope. */
import { useLayoutEffect, useRef } from 'react';

export function useAiContentSession(open: boolean, context: string) {
  const lifetime = useRef({ epoch: 0, mounted: true, open });
  const session = useRef({
    capture: () => lifetime.current.epoch,
    current: (epoch: number) =>
      lifetime.current.mounted &&
      lifetime.current.open &&
      lifetime.current.epoch === epoch,
    mounted: () => lifetime.current.mounted,
    invalidate: () => {
      lifetime.current.epoch += 1;
    },
  }).current;
  useLayoutEffect(() => {
    const current = lifetime.current;
    current.mounted = true;
    current.open = open;
    if (!open) session.invalidate();
    return () => {
      current.mounted = false;
      session.invalidate();
    };
  }, [open, context, session]);
  return session;
}
export type AiContentSession = ReturnType<typeof useAiContentSession>;
