import { useEffect, useId, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  loadNavigationAccess,
  O4O_SERVICE_DIRECTORY,
  resolveServiceDestination,
  type NavigationAccess,
  type NavigationClient,
  type ServiceDestination,
} from "./service-directory";

const statusLabel: Record<string, string> = {
  none: "서비스 소개",
  active: "이용 중",
  pending: "신청 중",
  rejected: "신청 반려",
  suspended: "이용 정지",
  withdrawn: "탈퇴",
};
const preferenceKey = (id: string) =>
  `o4o:service-navigation:v1:${encodeURIComponent(id)}`;
type Preferences = { pinned: string[]; recent: string[] };
function readPreferences(id: string): Preferences {
  try {
    const raw = JSON.parse(localStorage.getItem(preferenceKey(id)) || "{}");
    const ids = (v: unknown) =>
      Array.isArray(v)
        ? [
            ...new Set(v.filter((x): x is string => typeof x === "string")),
          ].slice(0, 6)
        : [];
    return { pinned: ids(raw.pinned), recent: ids(raw.recent).slice(0, 4) };
  } catch {
    return { pinned: [], recent: [] };
  }
}
export interface ServiceSpaceSwitcherProps {
  api: NavigationClient;
  accountId?: string;
  isAuthenticated: boolean;
  authLoading?: boolean;
  /** Add only published destinations; configuration is not an authorization source. */
  destinations?: readonly ServiceDestination[];
  showStoreShortcut?: boolean;
  navigate?: (href: string) => void;
}
export function ServiceSpaceSwitcher(props: ServiceSpaceSwitcherProps) {
  return (
    <Switcher
      key={
        props.authLoading
          ? "restoring"
          : props.isAuthenticated
            ? (props.accountId ?? "restoring")
            : "guest"
      }
      {...props}
    />
  );
}
function Switcher({
  api,
  accountId,
  isAuthenticated,
  authLoading,
  destinations = O4O_SERVICE_DIRECTORY,
  showStoreShortcut = true,
  navigate = (href) => window.location.assign(href),
}: ServiceSpaceSwitcherProps) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState("");
  const [access, setAccess] = useState<NavigationAccess | null>(null),
    [error, setError] = useState("");
  const [loading, setLoading] = useState(false),
    [retry, setRetry] = useState(0),
    [busy, setBusy] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(() =>
    accountId ? readPreferences(accountId) : { pinned: [], recent: [] },
  );
  const [storageError, setStorageError] = useState(false);
  const root = useRef<HTMLDivElement>(null),
    trigger = useRef<HTMLButtonElement>(null),
    search = useRef<HTMLInputElement>(null);
  const alive = useRef(true),
    moving = useRef(false),
    navigationGeneration = useRef(0);
  const id = useId(),
    location = useLocation();
  useEffect(() => {
    const header = root.current?.closest("header.o4o-service-header");
    if (!header) return;
    const property = "--o4o-global-header-height";
    const page = document.documentElement;
    const previous = page.style.getPropertyValue(property);
    const measure = () =>
      page.style.setProperty(
        property,
        `${Math.max(64, Math.ceil(header.getBoundingClientRect().height))}px`,
      );
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(header);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      if (previous) page.style.setProperty(property, previous);
      else page.style.removeProperty(property);
    };
  }, []);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    navigationGeneration.current++;
    moving.current = false;
    setBusy(false);
    setOpen(false);
  }, [location.pathname, location.search, location.hash, location.key]);
  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const outside = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  useEffect(() => {
    if (!isAuthenticated || authLoading || !accountId) return;
    let current = true;
    setLoading(true);
    setAccess(null);
    setError("");
    void loadNavigationAccess(api)
      .then((value) => {
        if (current) setAccess(value);
      })
      .catch(() => {
        if (current)
          setError("이용 상태를 불러오지 못했습니다. 다시 시도해 주세요.");
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [api, isAuthenticated, authLoading, accountId, retry]);
  const save = (next: Preferences) => {
    setPreferences(next);
    if (accountId)
      try {
        localStorage.setItem(preferenceKey(accountId), JSON.stringify(next));
        setStorageError(false);
      } catch {
        setStorageError(true);
      }
  };
  const go = async (destination: ServiceDestination) => {
    if (moving.current || authLoading) return;
    moving.current = true;
    setBusy(true);
    setError("");
    const generation = navigationGeneration.current;
    try {
      const href = await resolveServiceDestination(
        api,
        destination,
        isAuthenticated,
      );
      if (!alive.current || generation !== navigationGeneration.current) return;
      save({
        ...preferences,
        recent: [
          destination.key,
          ...preferences.recent.filter((key) => key !== destination.key),
        ].slice(0, 4),
      });
      navigate(href);
    } catch {
      if (alive.current && generation === navigationGeneration.current)
        setError(
          "이동하지 못했습니다. 이용 자격을 확인하거나 다시 시도해 주세요.",
        );
    } finally {
      if (alive.current && generation === navigationGeneration.current) {
        setBusy(false);
        moving.current = false;
      }
    }
  };
  const matches = (item: ServiceDestination) =>
    `${item.label} ${item.category} ${item.description}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase());
  const available = (item: ServiceDestination) =>
    item.workspace
      ? !!access?.stores.length
      : item.key === "supplier"
        ? !!access?.supplier
        : access?.statuses[item.serviceKey ?? item.key] === "active";
  const list = (items: readonly ServiceDestination[], personalized = false) => (
    <ul className="o4o-switcher-list">
      {items.filter(matches).map((item) => (
        <li key={item.key}>
          <button
            type="button"
            disabled={
              busy ||
              authLoading ||
              (isAuthenticated &&
                !access &&
                !!(item.serviceKey || item.workspace))
            }
            onClick={() =>
              void go(
                personalized
                  ? {
                      ...item,
                      href: new URL(
                        item.workspace
                          ? access!.stores.length > 1
                            ? "/select-store"
                            : "/store"
                          : (item.workspacePath ?? "/"),
                        item.href,
                      ).href,
                    }
                  : {
                      ...item,
                      serviceKey: available(item) ? item.serviceKey : undefined,
                      workspace: available(item) ? item.workspace : undefined,
                    },
              )
            }
          >
            <strong>{item.label}</strong>
            <small>
              {item.preparing
                ? "준비 중 · 소개 보기"
                : personalized
                  ? "업무공간으로 이동"
                  : access?.statuses[item.serviceKey ?? item.key]
                    ? statusLabel[
                        access.statuses[item.serviceKey ?? item.key]
                      ] || "이용 상태 확인 필요"
                    : item.description}
            </small>
          </button>
          {accountId && (
            <button
              type="button"
              className="o4o-switcher-pin"
              aria-label={`${item.label} 즐겨찾기`}
              aria-pressed={preferences.pinned.includes(item.key)}
              disabled={
                preferences.pinned.length >= 6 &&
                !preferences.pinned.includes(item.key)
              }
              title="즐겨찾기는 최대 6개입니다"
              onClick={() => {
                const pinned = preferences.pinned.includes(item.key)
                  ? preferences.pinned.filter((key) => key !== item.key)
                  : [...preferences.pinned, item.key].slice(0, 6);
                save({ ...preferences, pinned });
              }}
            >
              {preferences.pinned.includes(item.key) ? "★" : "☆"}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
  const selected = (keys: string[]) =>
    keys.flatMap((key) => destinations.find((item) => item.key === key) ?? []);
  const workspace = destinations.filter(
    (item) => (item.workspace || item.key === "supplier") && available(item),
  );
  const store = destinations.find((item) => item.workspace === "store");
  return (
    <div className="o4o-service-switcher" ref={root}>
      {showStoreShortcut && store && !!access?.stores.length && (
        <button
          type="button"
          className="o4o-switcher-store"
          disabled={busy || loading || authLoading}
          onClick={() => {
            setOpen(true);
            void go({
              ...store,
              href: new URL(
                access.stores.length > 1 ? "/select-store" : "/store",
                store.href,
              ).href,
            });
          }}
        >
          내 매장
        </button>
      )}
      <button
        type="button"
        ref={trigger}
        className="o4o-switcher-trigger"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        disabled={authLoading}
        onClick={() => {
          if (!open) setRetry((value) => value + 1);
          setOpen((value) => !value);
        }}
      >
        서비스·공간 <span aria-hidden="true">▾</span>
      </button>
      {open && (
        <section
          id={id}
          className="o4o-switcher-panel"
          aria-label="서비스·공간 전환"
          aria-busy={loading || busy}
        >
          <div className="o4o-switcher-heading">
            <strong>서비스·공간</strong>
            <button
              type="button"
              aria-label="서비스·공간 닫기"
              onClick={() => {
                setOpen(false);
                trigger.current?.focus();
              }}
            >
              ×
            </button>
          </div>
          <label className="o4o-switcher-search">
            서비스 검색
            <input
              ref={search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="서비스명 또는 필요한 활동"
            />
          </label>
          {loading && <p role="status">이용 상태를 확인하고 있습니다…</p>}
          {error && (
            <div role="alert">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => setRetry((value) => value + 1)}
              >
                다시 시도
              </button>
            </div>
          )}
          {storageError && (
            <p role="status">이 브라우저에 즐겨찾기를 저장하지 못했습니다.</p>
          )}
          {preferences.pinned.length > 0 && (
            <>
              <h3>즐겨찾기</h3>
              {list(selected(preferences.pinned))}
            </>
          )}
          {preferences.recent.length > 0 && (
            <>
              <h3>최근 이용</h3>
              {list(selected(preferences.recent))}
            </>
          )}
          {access && (
            <>
              <h3>내 업무공간</h3>
              {workspace.length ? (
                list(workspace, true)
              ) : (
                <p>현재 확인된 매장·공급자 업무공간이 없습니다.</p>
              )}
              {access.stores.length > 1 && (
                <p>내 매장에서 이용할 매장을 선택합니다.</p>
              )}
              <h3>이용 중인 서비스</h3>
              {list(
                destinations.filter(
                  (item) =>
                    !item.workspace &&
                    item.key !== "supplier" &&
                    available(item),
                ),
              )}
            </>
          )}
          {!isAuthenticated && (
            <p>로그인하면 내 서비스와 업무공간을 확인할 수 있습니다.</p>
          )}
          <h3>전체 서비스</h3>
          {[
            ...new Set(
              destinations.filter(matches).map((item) => item.category),
            ),
          ].map((category) => (
            <div key={category}>
              <h4>{category}</h4>
              {list(destinations.filter((item) => item.category === category))}
            </div>
          ))}
          {!destinations.some(matches) && (
            <p role="status">검색 결과가 없습니다.</p>
          )}
          <p className="o4o-switcher-note">
            즐겨찾기·최근 이용은 이 브라우저의 계정별로 저장됩니다. 서비스별
            가입·승인 조건은 유지됩니다.
          </p>
        </section>
      )}
    </div>
  );
}
