import { lazy, Suspense } from "react";
import { Link, useOutletContext } from "react-router-dom";
import type { StoreWorkspaceOutlet } from "../../components/layouts/StoreWorkspaceShell";
import {
  workspaceGroups,
  workspaceItems,
  type StoreWorkspaceArea,
} from "../../config/storeWorkspace";
import { useUnifiedStore } from "../../contexts/StoreContext";
import { SERVICE_WORK_CONFIGS } from "../../config/storeMenu";
import { isUnifiedServiceKey } from "../../lib/serviceContext";
import { StoreLibraryNavigation } from '../../components/StoreLibraryNavigation';
const StoreHandledProductsPage = lazy(
  () => import("./StoreHandledProductsPage"),
);
const StoreLibraryContentsPage = lazy(
  () => import("./StoreLibraryContentsPage"),
);
const StoreOperationsPage = lazy(() => import("./StoreOperationsPage"));
const SupplyOptionsPage = lazy(() => import('../neture-pharmacy/SupplyOptionsPage'));

const linkStyle =
  "inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-teal-600";

/** Existing lists are the starting surface; the complete filtered menu stays one small disclosure away. */
type WorkspaceProps = Readonly<{ area: Exclude<StoreWorkspaceArea, "home"> }>;
export function StoreWorkspacePage(props: WorkspaceProps) {
  return (
    <Suspense
      fallback={
        <p role="status" className="py-6 text-sm text-slate-500">
          업무 목록 불러오는 중…
        </p>
      }
    >
      <WorkspaceContents {...props} />
    </Suspense>
  );
}
function WorkspaceContents({ area }: WorkspaceProps) {
  const { config } = useOutletContext<StoreWorkspaceOutlet>();
  const { workServiceKeys } = useUnifiedStore();
  const groups = workspaceGroups(config, area);
  const items = workspaceItems(config, area);
  const has = (key: string) => items.some((item) => item.key === key);
  const productAllowed = config.menuSections?.some((section) =>
    section.items.some((item) => item.key === "my-products"),
  );
  const navigation = (
    <nav
      className="mb-3 flex flex-wrap items-start gap-2 text-sm"
      aria-label="업무 더보기"
    >
      {groups.length > 0 && (
        <details className="relative rounded-lg border border-slate-200 bg-white">
          <summary className="min-h-11 cursor-pointer content-center px-3">
            전체 업무
          </summary>
          <div className="absolute left-0 z-30 mt-1 max-h-[60vh] w-[min(21rem,calc(100vw-3rem))] space-y-3 overflow-y-auto rounded-xl border bg-white p-3 shadow-lg">
            {groups.map((group) => (
              <section key={group.key}>
                <h2 className="mb-1 text-xs font-semibold text-slate-500">
                  {group.title}
                </h2>
                <div className="flex flex-col">
                  {[...group.primary, ...group.secondary].map((item) => (
                    <Link
                      key={item.key}
                      className="min-h-11 rounded-lg px-3 py-3 hover:bg-slate-50"
                      to={`${config.basePath}${item.subPath}`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </details>
      )}
      {area === "commerce" &&
        workServiceKeys.filter(isUnifiedServiceKey).map((key) => (
          <details key={key} className="relative rounded-lg border bg-white">
            <summary className="min-h-11 cursor-pointer content-center px-3">
              {SERVICE_WORK_CONFIGS[key].serviceName} 거래·외부 판매채널
            </summary>
            <nav
              aria-label={`${SERVICE_WORK_CONFIGS[key].serviceName} 거래 업무`}
              className="absolute left-0 z-30 mt-1 flex w-64 flex-col rounded-xl border bg-white p-3 shadow-lg"
            >
              {SERVICE_WORK_CONFIGS[key].menuSections
                ?.flatMap((section) => section.items)
                .filter((item) => item.key !== "online-sales-orders")
                .map((item) => (
                  <Link
                    key={item.key}
                    className="min-h-11 px-3 py-3"
                    to={`${SERVICE_WORK_CONFIGS[key].basePath}${item.subPath}`}
                  >
                    {item.label}
                  </Link>
                ))}
            </nav>
          </details>
        ))}
    </nav>
  );
  if (area === 'commerce' && has('pharmacy-supply'))
    return <SupplyOptionsPage navigation={navigation} />;
  if (area === "commerce" && has("my-products"))
    return <StoreHandledProductsPage workspace navigation={navigation} />;
  if (area === "studio" && has("library-contents"))
    return (
      <StoreLibraryContentsPage
        workspace
        navigation={<><StoreLibraryNavigation section="mine" />{navigation}</>}
        quickLinks={
          <>
            {productAllowed && (
              <Link className={linkStyle} to={`${config.basePath}/my-products`}>
                상품에서 만들기
              </Link>
            )}
            <Link
              className={linkStyle}
              to={
                has("pharmacy-contents")
                  ? `${config.basePath}/pharmacy/contents`
                  : "/store/library/content"
              }
            >
              자료 가져오기
            </Link>
          </>
        }
      />
    );
  if (area === "use") return <StoreOperationsPage config={config} />;
  // A missing capability must never be restored by composing its page directly.
  return (
    <div>
      <h1 className="mb-3 text-xl font-semibold">
        {area === "commerce"
          ? "상품·거래"
          : area === "studio"
            ? "매장 컨텐츠"
            : "매장 운영"}
      </h1>
      {navigation}
      <p role="status" className="text-sm text-slate-600">
        {groups.length
          ? "전체 업무에서 이용할 작업을 선택하세요."
          : "현재 이용할 수 있는 업무가 없습니다."}
      </p>
    </div>
  );
}
