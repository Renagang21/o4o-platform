import type { ReactNode } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import type { StoreDashboardConfig } from "@o4o/store-ui-core";
import {
  STORE_WORKSPACE_AREAS,
  currentWorkspaceArea,
  workspaceItems,
  workspaceSupportItems,
  workspaceGroups,
} from "../../config/storeWorkspace";
import { MyHomeButton } from "@o4o/auth-react";
import { useAuth } from "../../contexts/AuthContext";
import { withReturnTo } from "../../lib/returnTo";
import { WORKSPACE_PATHS } from "../../config/workspace";
import { authClient } from "../../lib/apiClient";

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
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const active = currentWorkspaceArea(
    location.pathname,
    location.search,
    config.basePath,
  );
  const items = active ? workspaceItems(config, active) : [];
  const support = workspaceSupportItems(config);
  const landing = STORE_WORKSPACE_AREAS.find((area) => area.key === active);
  const isLanding =
    !!landing && location.pathname === `${config.basePath}${landing.subPath}`;
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[1280px] px-4 py-4 sm:px-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <Link
            to={withReturnTo(WORKSPACE_PATHS.select, config.basePath)}
            className="rounded-lg px-2 py-2 text-sm font-semibold text-slate-700 hover:bg-white"
            aria-label="매장 선택"
          >
            {organizationName ?? "내 매장"} · 매장 선택
          </Link>
          <details key={location.pathname} className="relative">
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
              <MyHomeButton
                api={authClient.api}
                accountId={user?.id}
                isAuthenticated={isAuthenticated}
                authLoading={authLoading}
                className="rounded-lg px-3 py-2.5 text-sm hover:bg-slate-50"
              />
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
        {items.length > 0 && !isLanding && landing && (
          <nav
            aria-label="현재 업무 메뉴"
            className="mt-3 flex flex-wrap items-start gap-3"
          >
            <Link
              className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
              to={`${config.basePath}${landing.subPath}`}
            >
              {landing.label} 전체
            </Link>
            <details
              key={location.pathname + location.search}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white p-3"
            >
              <summary className="cursor-pointer text-sm font-medium text-slate-700">
                다른 업무 열기
              </summary>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {workspaceGroups(config, active!).map((group) => (
                  <section key={group.key}>
                    <h2 className="text-sm font-semibold text-slate-800">
                      {group.title}
                    </h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[...group.primary, ...group.secondary].map((item) => (
                        <Link
                          key={item.key}
                          to={`${config.basePath}${item.subPath}`}
                          className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600 hover:bg-teal-50"
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </details>
          </nav>
        )}
        {active === "commerce" && !isLanding && serviceWorkConfig && (
          <details className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
            <summary className="cursor-pointer text-sm">
              사업별 거래 업무
            </summary>
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
          </details>
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
