import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface Placement {
  element: HTMLDivElement;
  priority: number;
  label?: string;
}
const PlacementContext = createContext<{
  target: HTMLDivElement | null;
  label?: string;
  register: (placement: Placement) => () => void;
} | null>(null);

/** Placement only: the assistant itself remains mounted once in the workspace. */
export function StoreAiPlacementProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [placements, setPlacements] = useState<Placement[]>([]);
  const register = useCallback((placement: Placement) => {
    setPlacements((previous) => [...previous, placement]);
    return () =>
      setPlacements((previous) =>
        previous.filter((item) => item !== placement),
      );
  }, []);
  const selected = placements.reduce<Placement | null>(
    (selected, item) =>
      !selected || item.priority >= selected.priority ? item : selected,
    null,
  );
  return (
    <PlacementContext.Provider
      value={{
        target: selected?.element ?? null,
        label: selected?.label,
        register,
      }}
    >
      {children}
    </PlacementContext.Provider>
  );
}

export function useStoreAiPlacement() {
  return useContext(PlacementContext);
}

/** Higher priority is reserved for an active authoring dialog, never its confirmation dialogs. */
export function StoreAiSlot({
  priority = 1,
  label,
}: {
  priority?: number;
  label?: string;
}) {
  const placement = useContext(PlacementContext);
  const register = placement?.register;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (register && ref.current)
      return register({ element: ref.current, priority, label });
  }, [register, priority, label]);
  return (
    <div ref={ref} className="empty:hidden" data-store-ai-slot={priority} />
  );
}
