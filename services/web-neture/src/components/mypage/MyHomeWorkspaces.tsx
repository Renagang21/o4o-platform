import { useEffect, useRef, useState, type MouseEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Search, Star, X } from "lucide-react";
import type { User } from "../../contexts/AuthContext";
import {
  buildHomeEntryModel,
  resolveHomeEntryUrl,
  type EntryItem,
  type HomeEntryData,
} from "../../lib/home-entry";
import {
  availableMyHomePreferences,
  myHomePreferencesKey,
  parseMyHomePreferences,
  PIN_LIMIT,
  RECENT_LIMIT,
  type MyHomePreferences,
} from "../../lib/my-home-preferences";

type Props = {
  user: User;
  data: HomeEntryData | null;
  loading: boolean;
  error: string | null;
  onReload: () => void;
};
type Destination = EntryItem & { group: string };
const focus =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600";

export function MyHomeWorkspaces(props: Props) {
  return <WorkspaceExplorer key={props.user.id} {...props} />;
}

function WorkspaceExplorer({ user, data, loading, error, onReload }: Props) {
  const key = myHomePreferencesKey(user.id);
  const [saved, setSaved] = useState(() => {
    try {
      return {
        preferences: parseMyHomePreferences(localStorage.getItem(key)),
        failed: false,
      };
    } catch {
      return {
        preferences: { pinned: [], recent: [] } as MyHomePreferences,
        failed: true,
      };
    }
  });
  const preferencesRef = useRef(saved.preferences);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const generation = useRef(0);
  const pending = useRef(false);

  useEffect(() => {
    const invalidate = () => {
      generation.current++;
      pending.current = false;
    };
    const reset = () => {
      invalidate();
      setBusyId(null);
      setMoveError(null);
    };
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) reset();
    };
    reset();
    window.addEventListener("pageshow", restore);
    return () => {
      invalidate();
      window.removeEventListener("pageshow", restore);
    };
  }, [data, error, loading]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key !== key && event.key !== null) return;
      try {
        const preferences = parseMyHomePreferences(event.newValue);
        preferencesRef.current = preferences;
        setSaved({ preferences, failed: false });
      } catch {
        preferencesRef.current = { pinned: [], recent: [] };
        setSaved({ preferences: preferencesRef.current, failed: true });
      }
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [key]);

  const model = data && buildHomeEntryModel(user, data);
  const destinations: Destination[] = [];
  const seen = new Set<string>();
  const internalPaths = new Set<string>();
  if (model) {
    for (const [group, items] of [
      ...model.groups.map((g) => [g.title, g.items] as const),
      ["참여 서비스", model.myServices] as const,
    ]) {
      for (const item of items) {
        if (
          seen.has(item.id) ||
          (item.action.kind === "internal" && item.action.to === "/mypage")
        )
          continue;
        if (item.action.kind === "internal") {
          if (internalPaths.has(item.action.to)) continue;
          internalPaths.add(item.action.to);
        }
        seen.add(item.id);
        destinations.push({ ...item, group });
      }
    }
  }
  const preferences = availableMyHomePreferences(saved.preferences, seen);
  const update = (
    change: (previous: MyHomePreferences) => MyHomePreferences,
  ) => {
    const next = change(
      availableMyHomePreferences(preferencesRef.current, seen),
    );
    preferencesRef.current = next;
    // Persist before navigation; a React updater may run after the page leaves.
    try {
      localStorage.setItem(key, JSON.stringify(next));
      setSaved({ preferences: next, failed: false });
    } catch {
      setSaved({ preferences: next, failed: true });
    }
  };
  const record = (id: string) =>
    update((p) => ({
      ...p,
      recent: [id, ...p.recent.filter((x) => x !== id)].slice(0, RECENT_LIMIT),
    }));
  const pin = (id: string) =>
    update((p) => ({
      ...p,
      pinned: p.pinned.includes(id)
        ? p.pinned.filter((x) => x !== id)
        : [...p.pinned, id].slice(0, PIN_LIMIT),
    }));

  const open = async (item: Destination) => {
    if (item.action.kind !== "handoff" && item.action.kind !== "workspace")
      return;
    if (pending.current) return;
    pending.current = true;
    setBusyId(item.id);
    setMoveError(null);
    const request = ++generation.current;
    try {
      const href = await resolveHomeEntryUrl(item.action);
      if (request !== generation.current) return;
      record(item.id);
      window.location.assign(href);
    } catch {
      if (request !== generation.current) return;
      pending.current = false;
      setBusyId(null);
      setMoveError(
        "이동하지 못했습니다. 이용 상태를 확인하고 다시 시도해 주세요.",
      );
    }
  };
  const recordClick = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    if (!event.defaultPrevented) record(id);
  };
  const linkClass = `flex min-w-0 flex-1 items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-slate-900 no-underline hover:bg-slate-50 ${focus}`;
  const entryLink = (item: Destination) => {
    const content = (
      <>
        <span className="min-w-0">
          <span className="block break-words text-sm font-semibold">
            {item.label}
          </span>
          <span className="mt-1 block break-words text-xs text-slate-500">
            {item.group}
            {item.note ? ` · ${item.note}` : ""}
          </span>
        </span>
        <ArrowUpRight
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-slate-400"
        />
      </>
    );
    if (item.action.kind === "internal")
      return (
        <Link
          className={linkClass}
          to={item.action.to}
          onClick={(e) => recordClick(e, item.id)}
        >
          {content}
        </Link>
      );
    if (item.action.kind === "public")
      return (
        <a
          className={linkClass}
          href={item.action.href}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => recordClick(e, item.id)}
        >
          {content}
        </a>
      );
    return (
      <button
        type="button"
        className={`${linkClass} disabled:opacity-50`}
        disabled={busyId !== null}
        onClick={() => void open(item)}
      >
        {content}
      </button>
    );
  };
  const byId = new Map(destinations.map((item) => [item.id, item]));
  const cards = (items: Destination[], pinnable = false) => (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((item) => {
        const pinned = preferences.pinned.includes(item.id);
        return (
          <li
            key={item.id}
            className="flex min-w-0 items-start rounded-xl border border-slate-200 bg-white"
          >
            {entryLink(item)}
            {pinnable && (
              <button
                type="button"
                className={`m-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-blue-50 disabled:opacity-40 ${focus}`}
                aria-label={`${item.label} 즐겨찾기`}
                aria-pressed={pinned}
                disabled={!pinned && preferences.pinned.length >= PIN_LIMIT}
                onClick={() => pin(item.id)}
              >
                <Star
                  aria-hidden="true"
                  className={`h-4 w-4 ${pinned ? "fill-blue-600 text-blue-600" : ""}`}
                />
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <section
      aria-labelledby="my-home-workspaces-title"
      className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6"
    >
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-wide text-blue-700">
            나의 업무와 활동
          </p>
          <h2
            id="my-home-workspaces-title"
            className="text-xl font-semibold text-slate-900"
          >
            내 업무 바로가기
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            이용할 공간을 선택하세요. 매장 업무와 개인 활동을 함께 찾을 수
            있습니다.
          </p>
        </div>
        <Link
          className={`text-sm text-blue-700 underline underline-offset-4 ${focus}`}
          to="/mypage/services"
        >
          참여 서비스와 이용 상태 보기 →
        </Link>
      </div>
      {error || !data || loading ? (
        <div
          role={error ? "alert" : "status"}
          className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600"
        >
          {error ? (
            <>
              이용 가능한 공간을 불러오지 못했습니다.{" "}
              <button type="button" className="underline" onClick={onReload}>
                다시 불러오기
              </button>
            </>
          ) : (
            "이용 가능한 공간을 확인하는 중…"
          )}
        </div>
      ) : (
        <>
          <div className="mb-6 rounded-xl bg-blue-50/60 p-4">
            <h3 className="font-semibold text-slate-900">즐겨찾는 공간</h3>
            <p className="mb-3 mt-1 text-xs text-slate-600">
              별표로 최대 {PIN_LIMIT}개를 고정합니다. 이 브라우저의 내 계정에만
              저장됩니다.
            </p>
            {preferences.pinned.length ? (
              cards(
                preferences.pinned.map((id) => byId.get(id)!),
                true,
              )
            ) : (
              <p className="text-sm text-slate-500">
                자주 가는 공간의 별표를 눌러 여기에 모아두세요.
              </p>
            )}
          </div>
          {preferences.recent.length > 0 && (
            <div className="mb-6">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">최근 이동</h3>
                <button
                  type="button"
                  className={`text-xs text-slate-500 underline ${focus}`}
                  onClick={() => update((p) => ({ ...p, recent: [] }))}
                >
                  최근 이동 지우기
                </button>
              </div>
              <p className="mb-3 text-xs text-slate-500">
                이 화면에서 선택한 최근 공간입니다. 업무 진행·완료 기록은
                아닙니다.
              </p>
              {cards(preferences.recent.map((id) => byId.get(id)!))}
            </div>
          )}
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-900">
              이용 가능한 공간{" "}
              <span className="text-sm font-normal text-slate-500">
                {destinations.length}개
              </span>
            </h3>
            <label className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 sm:w-64">
              <Search
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-slate-400"
              />
              <input
                type="search"
                aria-label="업무 공간 검색"
                placeholder="공간 이름으로 찾기"
                className={`min-h-11 min-w-0 flex-1 bg-transparent text-sm ${focus}`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  type="button"
                  aria-label="검색 지우기"
                  className={`flex h-11 w-8 items-center justify-center ${focus}`}
                  onClick={() => setQuery("")}
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              )}
            </label>
          </div>
          {preferences.pinned.length === PIN_LIMIT && (
            <p role="status" className="mb-3 text-xs text-slate-600">
              즐겨찾기가 {PIN_LIMIT}개입니다. 다른 공간을 고정하려면 기존 별표를
              해제하세요.
            </p>
          )}
          {destinations.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
              현재 바로 이동할 수 있는 공간이 없습니다. 참여 서비스에서
              가입·이용 상태를 확인하세요.
            </p>
          ) : (
            (() => {
              const matches = destinations.filter((item) =>
                `${item.label} ${item.group} ${item.note ?? ""}`
                  .toLocaleLowerCase()
                  .includes(query.trim().toLocaleLowerCase()),
              );
              return matches.length ? (
                cards(matches, true)
              ) : (
                <p
                  role="status"
                  className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500"
                >
                  검색 결과가 없습니다. 다른 공간 이름으로 찾아보세요.
                </p>
              );
            })()
          )}
          {destinations.some(
            (item) =>
              item.action.kind === "workspace" &&
              item.action.returnPath === "/select-store",
          ) && (
            <p className="mt-3 text-xs text-slate-500">
              매장이 여러 곳이면 이동한 매장 선택 화면에서 업무 대상을 다시
              선택합니다.
            </p>
          )}
          {saved.failed && (
            <p role="status" className="mt-3 text-sm text-amber-800">
              이 브라우저의 설정을 읽거나 저장하지 못했습니다. 즐겨찾기와 최근
              이동은 현재 화면에서만 유지될 수 있습니다.
            </p>
          )}
          {busyId && (
            <p role="status" className="mt-3 text-sm text-blue-700">
              선택한 공간으로 이동 중…
            </p>
          )}
          {moveError && (
            <p role="alert" className="mt-3 text-sm text-red-700">
              {moveError}
            </p>
          )}
          {model?.platformAdmin &&
            model.platformAdmin.action.kind === "internal" && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <Link
                  className={`text-sm text-slate-600 underline ${focus}`}
                  to={model.platformAdmin.action.to}
                >
                  플랫폼 관리 →
                </Link>
              </div>
            )}
        </>
      )}
    </section>
  );
}
