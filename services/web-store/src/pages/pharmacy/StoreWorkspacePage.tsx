import { Link, useOutletContext } from "react-router-dom";
import type { StoreWorkspaceOutlet } from "../../components/layouts/StoreWorkspaceShell";
import {
  STORE_WORKSPACE_AREAS,
  workspaceGroups,
  type StoreWorkspaceArea,
} from "../../config/storeWorkspace";
import { useUnifiedStore } from "../../contexts/StoreContext";
import { SERVICE_WORK_CONFIGS } from "../../config/storeMenu";
import { isUnifiedServiceKey } from "../../lib/serviceContext";

const linkStyle =
  "inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 hover:border-teal-600 hover:bg-teal-50";

export function StoreWorkspacePage({
  area,
}: Readonly<{ area: Exclude<StoreWorkspaceArea, "home"> }>) {
  const { config } = useOutletContext<StoreWorkspaceOutlet>();
  const { workServiceKeys } = useUnifiedStore();
  const meta = STORE_WORKSPACE_AREAS.find((item) => item.key === area)!;
  const groups = workspaceGroups(config, area);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{meta.label}</h1>
        <p className="mt-2 text-sm text-slate-600">{meta.description}</p>
      </header>
      {area === "studio" && (
        <section
          className="rounded-xl border border-teal-200 bg-teal-50 p-5"
          aria-label="새 안내 준비"
        >
          <h2 className="font-semibold text-teal-950">새 안내 준비</h2>
          <p className="mt-2 text-sm text-teal-900">
            사용할 상품이나 자료를 먼저 고르세요. 필요한 안내를 하나씩 준비하고
            저장한 뒤 매장에 적용합니다.
          </p>
          <nav
            className="mt-4 flex flex-wrap gap-3"
            aria-label="안내 준비 시작"
          >
            {config.menuSections?.some((section) =>
              section.items.some((item) => item.key === "my-products"),
            ) && (
              <Link className={linkStyle} to={`${config.basePath}/my-products`}>
                상품에서 시작
              </Link>
            )}
            {groups.some((group) =>
              group.primary.some((item) => item.key === "library-contents"),
            ) && (
              <Link
                className={linkStyle}
                to={`${config.basePath}/library/contents`}
              >
                자료에서 시작
              </Link>
            )}
            {groups.some(group => group.primary.some(item => item.key === 'library-contents')) && <Link className={linkStyle} to="/store/library/content">제공 자료 찾기</Link>}
          </nav>
        </section>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <section
            key={group.key}
            id={group.key}
            aria-label={group.title}
            className="min-w-0 rounded-xl border border-slate-200 bg-white p-5"
          >
            <h2 className="font-semibold text-slate-900">{group.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {group.description}
            </p>
            {group.primary.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {group.primary.map((item) => (
                  <Link
                    key={item.key}
                    className={linkStyle}
                    to={`${config.basePath}${item.subPath}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
            {group.secondary.length > 0 && (
              <details className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3">
                <summary className="min-h-11 cursor-pointer content-center text-sm font-medium text-slate-700">
                  {group.key === "editors" ? "편집기·제작 도구" : "세부 업무"}
                </summary>
                <nav
                  className="mt-3 flex flex-wrap gap-2"
                  aria-label={`${group.title} 세부 업무`}
                >
                  {group.secondary.map((item) => (
                    <Link
                      key={item.key}
                      className={linkStyle}
                      to={`${config.basePath}${item.subPath}`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </details>
            )}
          </section>
        ))}
      </div>
      {groups.length === 0 && (
        <p
          role="status"
          className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600"
        >
          현재 이용할 수 있는 업무가 없습니다.
        </p>
      )}
      {area === "commerce" &&
        workServiceKeys.filter(isUnifiedServiceKey).map((key) => (
          <details
            key={key}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <summary className="min-h-11 cursor-pointer content-center font-semibold">
              {SERVICE_WORK_CONFIGS[key].serviceName} 거래·외부 판매채널
            </summary>
            <nav
              className="mt-4 flex flex-wrap gap-3"
              aria-label={`${SERVICE_WORK_CONFIGS[key].serviceName} 거래 업무`}
            >
              {SERVICE_WORK_CONFIGS[key].menuSections
                ?.flatMap((section) => section.items)
                .filter((item) => item.key !== "online-sales-orders")
                .map((item) => (
                  <Link
                    key={item.key}
                    className={linkStyle}
                    to={`${SERVICE_WORK_CONFIGS[key].basePath}${item.subPath}`}
                  >
                    {item.label}
                  </Link>
                ))}
            </nav>
          </details>
        ))}
      {area === "studio" && (
        <p className="text-sm text-slate-500">
          저장은 고객 공개·기기 적용과 다릅니다. 가져온 사본은 원본이 바뀌어도
          자동으로 업데이트되지 않습니다.
        </p>
      )}
      {area === "use" && (
        <p className="text-sm text-slate-500">
          게시됨은 기기 연결·재생 완료를 뜻하지 않습니다. 내용을 바꾸려면 해당
          안내의 편집 화면에서 수정하세요.
        </p>
      )}
    </div>
  );
}
