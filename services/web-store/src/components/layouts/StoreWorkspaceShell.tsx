import type { ReactNode } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import type { StoreDashboardConfig } from "@o4o/store-ui-core";
import {
  STORE_WORKSPACE_AREAS,
  currentWorkspaceArea,
  workspaceItems,
  workspaceSupportItems,
} from "../../config/storeWorkspace";
import { PLATFORM_ORIGIN } from "../../config/workspace";

export interface StoreWorkspaceOutlet {
  config: StoreDashboardConfig;
}

/** Service-local composition; the shared StoreDashboardLayout contract is unchanged. */
export function StoreWorkspaceShell({
  config,
  organizationName,
  serviceWorkConfig,
  children,
}: {
  config: StoreDashboardConfig;
  organizationName?: string;
  serviceWorkConfig?: StoreDashboardConfig;
  children?: ReactNode;
}) {
  const location = useLocation();
  const active = currentWorkspaceArea(
    location.pathname,
    location.search,
    config.basePath,
  );
  const items = active ? workspaceItems(config, active) : [];
  const support = workspaceSupportItems(config);
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1280px] px-4 py-4 sm:px-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-700">
            {organizationName ?? "내 매장"}
          </p>
          <details className="relative">
            <summary className="cursor-pointer rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
              매장 설정·My Home
            </summary>
            <nav
              aria-label="매장 보조 메뉴"
              className="absolute right-0 z-30 mt-2 flex w-64 flex-col rounded-xl border border-slate-200 bg-white p-2 shadow-lg"
            >
              {support.map((item) => (
                <Link
                  key={item.key}
                  className="rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50"
                  to={`${config.basePath}${item.subPath}`}
                >
                  {item.label}
                </Link>
              ))}
              <a
                className="rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50"
                href={`${PLATFORM_ORIGIN}/mypage`}
              >
                My Home · 직원 초대·승인
              </a>
              <Link
                className="rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50"
                to="/services"
              >
                이용 사업
              </Link>
            </nav>
          </details>
        </div>
        <nav
          aria-label="내 매장 주요 업무"
          className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1 sm:grid-cols-4"
        >
          {STORE_WORKSPACE_AREAS.map((area) => (
            <Link
              key={area.key}
              to={`${config.basePath}${area.subPath}`}
              aria-current={active === area.key ? "page" : undefined}
              className={`rounded-lg px-2 py-3 text-center text-sm font-semibold ${active === area.key ? "bg-teal-700 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            >
              {area.label}
            </Link>
          ))}
        </nav>
        {items.length > 0 && (
          <nav
            aria-label="현재 업무 메뉴"
            className="mt-3 flex flex-wrap gap-2"
          >
            {items.map((item) => {
              const [relative, search = ""] = item.subPath.split("?");
              const path = `${config.basePath}${relative}`;
              const matches =
                (location.pathname === path ||
                  location.pathname.startsWith(`${path}/`)) &&
                (!search ||
                  new URLSearchParams(location.search).get("workspace") ===
                    new URLSearchParams(search).get("workspace"));
              return (
                <Link
                  key={item.key}
                  to={`${config.basePath}${item.subPath}`}
                  aria-current={matches ? "page" : undefined}
                  className={`rounded-lg border px-3 py-2.5 text-sm ${matches ? "border-teal-700 bg-teal-50 font-semibold text-teal-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
        {active === "commerce" && serviceWorkConfig && (
          <nav
            aria-label="사업별 거래 업무"
            className="mt-3 flex flex-wrap gap-2"
          >
            {serviceWorkConfig.menuSections
              ?.flatMap((section) => section.items)
              .filter((item) => item.key !== "online-sales-orders")
              .map((item) => (
                <Link
                  key={item.key}
                  to={`${serviceWorkConfig.basePath}${item.subPath}`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
                >
                  {item.label}
                </Link>
              ))}
          </nav>
        )}
        <main className="min-w-0 py-6">
          {children ?? (
            <Outlet context={{ config } satisfies StoreWorkspaceOutlet} />
          )}
        </main>
      </div>
    </div>
  );
}
