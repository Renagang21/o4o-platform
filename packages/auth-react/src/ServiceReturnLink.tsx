import { useEffect, useRef, useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  MY_HOME_SOURCES,
  isMyHomeSource,
  safeServiceReturnPath,
} from "@o4o/auth-utils";
import { requestServiceHandoff } from "./serviceHandoff";
import type { O4OHomeApiLike } from "./useO4OHomeReturn";

/** Account-scoped informational context, never an authorization decision. */
export function ServiceReturnLink({
  sourceKey,
  returnPath,
  api,
  accountId,
  navigate = (href) => window.location.assign(href),
}: {
  sourceKey: string;
  returnPath?: string;
  api: O4OHomeApiLike;
  accountId: string;
  navigate?: (href: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const pending = useRef(false);
  const generation = useRef(0);
  const location = useLocation();
  const invalidate = useCallback(() => {
    generation.current++;
    pending.current = false;
  }, []);
  useEffect(() => {
    invalidate();
    setBusy(false);
    setError(false);
    return invalidate;
  }, [accountId, sourceKey, returnPath, location.key, invalidate]);
  if (!isMyHomeSource(sourceKey)) return null;
  const source = MY_HOME_SOURCES[sourceKey];
  const path = safeServiceReturnPath(returnPath) ?? "/";
  const label =
    "returnLabel" in source ? source.returnLabel : `${source.label}로 돌아가기`;
  if (!("serviceKey" in source) && !("workspace" in source))
    return <a href={`${source.origin}${path}`}>{label}</a>;
  const go = async () => {
    if (pending.current) return;
    pending.current = true;
    const current = ++generation.current;
    setBusy(true);
    setError(false);
    try {
      const href = await requestServiceHandoff(
        api as Parameters<typeof requestServiceHandoff>[0],
        {
          ...("serviceKey" in source
            ? { serviceKey: source.serviceKey }
            : { workspace: source.workspace }),
          origin: source.origin,
          returnPath: path,
        },
      );
      if (generation.current === current) navigate(href);
    } catch {
      if (generation.current === current) setError(true);
    } finally {
      if (generation.current === current) {
        pending.current = false;
        setBusy(false);
      }
    }
  };
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        className="text-sm text-blue-700 underline"
        type="button"
        disabled={busy}
        onClick={() => void go()}
      >
        {busy ? "이동 중…" : label}
      </button>
      {error && (
        <span role="alert">
          원래 화면으로 이동하지 못했습니다. 다시 시도해 주세요.
        </span>
      )}
    </span>
  );
}
