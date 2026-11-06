import {
  StorePageShell as CorePageShell,
  type StorePageShellProps,
} from "@o4o/store-ui-core";
import { LoadError } from "@o4o/ui";

/** Store-local composition; other shared PageShell consumers keep their existing layout. */
export function StoreTaskPageShell({
  children,
  headerActions,
  state,
  ...props
}: StorePageShellProps) {
  const body = !state ? (
    children
  ) : state.loading ? (
    <p role="status" className="py-12 text-center text-sm text-slate-500">
      불러오는 중...
    </p>
  ) : state.loadError ? (
    <LoadError onRetry={() => props.onReload?.()} />
  ) : state.isEmpty ? (
    <div className="py-12 text-center text-sm text-slate-500">
      <p>{state.emptyTitle}</p>
      {state.emptyHint && <p>{state.emptyHint}</p>}
    </div>
  ) : (
    <div style={state.listStyle}>{children}</div>
  );
  return (
    <CorePageShell {...props} headerActions={headerActions}>
      {body}
    </CorePageShell>
  );
}
