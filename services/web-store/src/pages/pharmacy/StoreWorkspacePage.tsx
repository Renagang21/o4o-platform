import { Link, useOutletContext } from "react-router-dom";
import type { StoreWorkspaceOutlet } from "../../components/layouts/StoreWorkspaceShell";
import {
  STORE_WORKSPACE_AREAS,
  workspaceItems,
  type StoreWorkspaceArea,
} from "../../config/storeWorkspace";
import { useUnifiedStore } from "../../contexts/StoreContext";
import { SERVICE_WORK_CONFIGS } from "../../config/storeMenu";
import { isUnifiedServiceKey } from "../../lib/serviceContext";

export function StoreWorkspacePage({
  area,
}: {
  area: Exclude<StoreWorkspaceArea, "home">;
}) {
  const { config } = useOutletContext<StoreWorkspaceOutlet>();
  const { workServiceKeys } = useUnifiedStore();
  const meta = STORE_WORKSPACE_AREAS.find((item) => item.key === area)!;
  const items = workspaceItems(config, area);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{meta.label}</h1>
        <p className="mt-2 text-sm text-slate-600">{meta.description}</p>
      </header>
      {area === "studio" && (
        <p className="rounded-xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-900">
          자료 선택 → 제작·미리보기 → 저장 → 매장에서 활용. 가져온 자료는 내
          매장의 독립 사본이며 원본 변경이 자동 반영되지 않습니다.
        </p>
      )}
      {area === "use" && (
        <p className="rounded-xl border border-teal-100 bg-teal-50 p-4 text-sm text-teal-900">
          저장된 자료를 골라 사용 위치에 적용하세요. 제작·게시 상태와 실제
          배치·기기 재생 상태는 다릅니다.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link
            key={item.key}
            to={`${config.basePath}${item.subPath}`}
            className="rounded-xl border border-slate-200 bg-white p-5 hover:border-teal-600 hover:bg-teal-50"
          >
            <h2 className="font-semibold text-slate-800">{item.label}</h2>
            <span className="mt-3 block text-sm text-teal-700">열기 →</span>
          </Link>
        ))}
      </div>
      {area === "commerce" &&
        workServiceKeys.filter(isUnifiedServiceKey).map((key) => (
          <section
            key={key}
            className="rounded-xl border border-slate-200 bg-white p-5"
          >
            <h2 className="mb-3 font-semibold">사업별 거래·외부 판매채널</h2>
            <div className="flex flex-wrap gap-3">
              {SERVICE_WORK_CONFIGS[key].menuSections
                ?.flatMap((section) => section.items)
                .filter((item) => item.key !== "online-sales-orders")
                .map((item) => (
                  <Link
                    key={item.key}
                    className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm hover:border-teal-600"
                    to={`${SERVICE_WORK_CONFIGS[key].basePath}${item.subPath}`}
                  >
                    {item.label}
                  </Link>
                ))}
            </div>
          </section>
        ))}
      {area === "use" && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">한국어·다국어 상담</h2>
          <p className="mt-2 text-sm text-slate-500">
            직원 보조 상담과 소비자 직접 상담은 이후 도입할 기능입니다. 현재
            상담 요청은 위 메뉴에서 확인할 수 있습니다.
          </p>
          <span className="mt-3 inline-block rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-500">
            준비 중
          </span>
        </section>
      )}
      {area === "studio" && (
        <p className="text-sm text-slate-500">
          제작 화면에서 직접 작성하거나 기존 AI 제작 도움 기능을 사용할 수
          있습니다.
        </p>
      )}
    </div>
  );
}
