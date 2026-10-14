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
    <section className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
      <nav aria-label={`${subject} 제작·활용`} className="flex flex-wrap gap-2">
        <Link
          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm"
          to={`${base}/library/contents`}
        >
          자료 선택
        </Link>
        {(
          [
            ["studio", "제작·편집"],
            ["use", "매장에서 활용"],
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
              className={`rounded-lg border px-3 py-2.5 text-sm ${mode === area ? "border-teal-700 bg-teal-50 font-semibold text-teal-800" : "border-slate-200"}`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <p className="mt-2 text-sm text-slate-500">
        {mode === "studio"
          ? `${subject} 자료를 준비하고 저장한 뒤 활용 화면으로 이어갑니다.`
          : `저장된 ${subject} 자료의 적용·배치·출력을 확인합니다. 수정은 제작·편집에서 진행할 수 있습니다.`}
      </p>
    </section>
  );
}
