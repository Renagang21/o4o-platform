import {
  StorePageShell as CorePageShell,
  type StorePageShellProps,
} from "@o4o/store-ui-core";
import { LoadError } from "@o4o/ui";
import { StoreAiSlot } from "./StoreAiPlacement";

/** Store-local composition; other shared PageShell consumers keep their existing layout. */
export function StoreTaskPageShell({
  children,
  headerActions,
  state,
  listFirst = false,
  ...props
}: StorePageShellProps & { listFirst?: boolean }) {
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
    <CorePageShell {...props}>
      {!listFirst && <StoreAiSlot label={props.labels.pageTitle} />}
      {headerActions && (
        <div
          className="mb-3 flex flex-wrap items-center gap-2"
          aria-label="빠른 작업"
        >
          {headerActions}
        </div>
      )}
      {body}
      {listFirst && <details className="mt-5 rounded-lg border border-slate-200 bg-white px-3">
        <summary className="min-h-11 cursor-pointer content-center text-sm text-teal-800">AI 도움 요청</summary>
        <StoreAiSlot label={props.labels.pageTitle} />
      </details>}
    </CorePageShell>
  );
}
