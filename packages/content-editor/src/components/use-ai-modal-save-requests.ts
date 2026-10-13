import { useLayoutEffect, useMemo, useRef, useState } from "react";

export type SaveTarget = "community" | "store" | "material" | "channel";
type ViewTarget = SaveTarget | "forums" | "copy";
const emptyPending = () => ({
  community: false,
  store: false,
  material: false,
  channel: false,
});

/** Private modal bookkeeping: UI ownership expires; issued writes remain pending. */
type ViewSession = { capture(): number; current(epoch: number): boolean };

export function useAiModalSaveRequests(
  open: boolean,
  context: string,
  viewSession?: ViewSession,
) {
  const lifetime = useRef({
    active: false,
    mounted: false,
    epoch: 0,
    views: new Map<ViewTarget, number>(),
    pending: emptyPending(),
  });
  const [pending, setPending] = useState(emptyPending);
  useLayoutEffect(() => {
    const current = lifetime.current;
    current.mounted = true;
    return () => {
      current.mounted = false;
    };
  }, []);
  useLayoutEffect(() => {
    const current = lifetime.current;
    current.active = open;
    current.epoch += 1;
    return () => {
      current.active = false;
      current.epoch += 1;
    };
  }, [open, context]);

  const methods = useMemo(() => {
    const invalidate = (target?: ViewTarget) => {
      const current = lifetime.current;
      if (target)
        current.views.set(target, (current.views.get(target) ?? 0) + 1);
      else current.epoch += 1;
    };
    const beginView = (target: ViewTarget) => {
      const current = lifetime.current;
      const epoch = current.epoch;
      const viewEpoch = viewSession?.capture();
      const version = (current.views.get(target) ?? 0) + 1;
      current.views.set(target, version);
      return () =>
        current.active &&
        current.epoch === epoch &&
        current.views.get(target) === version &&
        (!viewSession || viewSession.current(viewEpoch!));
    };
    const beginSave = (target: SaveTarget) => {
      const current = lifetime.current;
      // Ref acquisition is synchronous: even two calls before a rerender issue only one write.
      if (
        !current.active ||
        current.pending[target] ||
        (viewSession && !viewSession.current(viewSession.capture()))
      )
        return null;
      current.pending[target] = true;
      setPending({ ...current.pending });
      const isCurrent = beginView(target);
      return {
        isCurrent,
        finish: () => {
          current.pending[target] = false;
          if (current.mounted) setPending({ ...current.pending });
        },
      };
    };
    return { invalidate, beginView, beginSave };
  }, [viewSession]);
  return { pending, ...methods };
}
