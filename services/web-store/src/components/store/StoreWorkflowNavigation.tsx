import { Link, useLocation } from "react-router-dom";
import { withWorkspaceMode } from "../../config/storeWorkspace";

export function storeWorkspaceBase(pathname: string): string {
  return /^\/work\/[^/]+\/store(?=\/|$)/.exec(pathname)?.[0] ?? "/store";
}

/** Existing resource/production router state is carried between work modes. */
export function StoreWorkflowNavigation({
  subject,
  studioPath,
  usePath,
}: {
  subject: string;
  studioPath?: string;
  usePath?: string;
}) {
  const location = useLocation();
  const base = storeWorkspaceBase(location.pathname);
  const requested = new URLSearchParams(location.search).get("workspace");
  const mode =
    requested === "use" ||
    (!requested && /tablet-displays|signage\/schedules/.test(location.pathname))
      ? "use"
      : "studio";
  return (
    <section className="mb-3 text-sm">
      <nav aria-label={`${subject} 제작·활용`} className="flex flex-wrap gap-2">
        <Link
          className="min-h-11 content-center rounded-lg px-2 text-sm text-slate-600"
          to={`${base}/library/contents`}
        >
          자료 선택
        </Link>
        {(
          [
            ["studio", "안내 만들기"],
            ["use", "매장 운영"],
          ] as const
        ).map(([area, label]) => {
          let target = location.pathname;
          if (area === "studio" && studioPath) target = base + studioPath;
          if (area === "use" && usePath) target = base + usePath;
          const modePath = withWorkspaceMode(target + location.search, area);
          return (
            <Link
              key={area}
              to={modePath + location.hash}
              state={location.state}
              aria-current={mode === area ? "page" : undefined}
              className={`min-h-11 content-center rounded-lg px-2 text-sm ${mode === area ? "bg-teal-50 font-semibold text-teal-800" : "text-slate-600"}`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </section>
  );
}
