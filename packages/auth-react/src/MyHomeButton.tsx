import { useCallback, useEffect, useSyncExternalStore } from "react";
import type { O4OHomeApiLike } from "./useO4OHomeReturn";

/** Informational return context only. This list grants no service permissions. */
export const MY_HOME_SOURCES: Record<
  string,
  { origin: string; label: string }
> = {
  store: { origin: "https://store.neture.co.kr", label: "매장 관리" },
  study: { origin: "https://study.neture.co.kr", label: "Study" },
  community: { origin: "https://community.neture.co.kr", label: "커뮤니티" },
  funding: { origin: "https://funding.neture.co.kr", label: "Funding" },
  supplier: { origin: "https://supplier.neture.co.kr", label: "공급자" },
  pharmacy: { origin: "https://pharmacy.neture.co.kr", label: "약사 서비스" },
  kpa: { origin: "https://kpa.neture.co.kr", label: "분회 서비스" },
  admin: { origin: "https://admin.neture.co.kr", label: "플랫폼 관리" },
};
export function getMyHomePath(origin: string): string {
  const source = Object.entries(MY_HOME_SOURCES).find(
    ([, value]) => value.origin === origin,
  )?.[0];
  return source ? `/mypage?from=${source}` : "/mypage";
}

type Options = {
  api: O4OHomeApiLike;
  isAuthenticated: boolean;
  authLoading?: boolean;
  accountId?: string;
  local?: boolean;
  navigate?: (href: string) => void;
};
let snapshot = { busy: false, error: null as string | null };
let generation = 0;
let accountScope: string | undefined;
const listeners = new Set<() => void>();
const update = (next: typeof snapshot) => {
  snapshot = next;
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getSnapshot = () => snapshot;
let restorationInstalled = false;
function resetMyHomeReturn() {
  generation++;
  update({ busy: false, error: null });
}

/** Shared by header and mobile tab: one request, bfcache recovery, no late navigation. */
export function useMyHomeReturn({
  api,
  isAuthenticated,
  authLoading,
  accountId,
  local,
  navigate = (href: string) => window.location.assign(href),
}: Options) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  useEffect(() => {
    if (!isAuthenticated || (accountId !== undefined && accountScope !== accountId)) {
      accountScope = isAuthenticated ? accountId : undefined;
      resetMyHomeReturn();
    }
    if (!restorationInstalled) {
      restorationInstalled = true;
      window.addEventListener("pageshow", (event: PageTransitionEvent) => {
        if (event.persisted) resetMyHomeReturn();
      });
    }
  }, [isAuthenticated, accountId]);
  const go = useCallback(async () => {
    if (!isAuthenticated || authLoading || snapshot.busy) return;
    const path = getMyHomePath(window.location.origin);
    if (
      local ||
      ["https://neture.co.kr", "https://www.neture.co.kr"].includes(
        window.location.origin,
      )
    ) {
      navigate(path);
      return;
    }
    const mine = ++generation;
    update({ busy: true, error: null });
    try {
      const res = await api.post("/auth/handoff", {
        targetServiceKey: "neture",
        returnPath: path,
      });
      if (mine !== generation) return;
      const data = res.data as { data?: { targetUrl?: string } };
      const target = new URL(data?.data?.targetUrl ?? "");
      if (
        target.origin !== "https://neture.co.kr" ||
        target.pathname !== "/handoff" ||
        target.searchParams.get("returnTo") !== path
      )
        throw new Error("Invalid My Home target");
      navigate(target.href);
    } catch {
      if (mine !== generation) return;
      update({
        busy: false,
        error: "My Home으로 이동하지 못했습니다. 다시 눌러 주세요.",
      });
    }
  }, [api, isAuthenticated, authLoading, local, navigate]);
  return { ...state, go };
}
/** Every service opens the same personal home; membership/roles remain service-owned. */
export function MyHomeButton(props: Options & { className?: string }) {
  const { go, busy, error } = useMyHomeReturn(props);
  if (!props.isAuthenticated || props.authLoading) return null;
  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        data-testid="my-home-button"
        className={props.className}
        style={{ whiteSpace: "nowrap" }}
        disabled={busy}
        onClick={go}
      >
        {busy ? "이동 중…" : "My Home"}
      </button>
      {error && (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      )}
    </span>
  );
}

/** Test-only reset; runtime uses the same recovery path. */
export const __resetMyHomeForTest = resetMyHomeReturn;
