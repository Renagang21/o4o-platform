import type {
  StoreDashboardConfig,
  StoreMenuSectionItem,
} from "@o4o/store-ui-core";

export type StoreWorkspaceArea = "home" | "commerce" | "studio" | "use";
export const STORE_WORKSPACE_AREAS = [
  {
    key: "home",
    label: "내 매장 홈",
    subPath: "",
    description: "오늘 할 일과 매장 현황을 확인합니다.",
  },
  {
    key: "commerce",
    label: "상품·거래",
    subPath: "/workspace/commerce",
    description: "취급 상품, 공급과 주문 업무를 관리합니다.",
  },
  {
    key: "studio",
    label: "콘텐츠 작업실",
    subPath: "/workspace/studio",
    description: "자료를 보관하고 매장에서 쓸 콘텐츠를 준비합니다.",
  },
  {
    key: "use",
    label: "매장에서 활용",
    subPath: "/workspace/use",
    description: "완성된 자료를 배치·출력하고 현장 활용을 확인합니다.",
  },
] as const;

const commerceKeys = new Set([
  "my-products",
  "pharmacy-supply",
  "pharmacy-cart",
  "pharmacy-orders",
  "pharmacy-recruitments",
]);
const studioKeys = new Set([
  "product-descriptions",
  "content-blog",
  "pop",
  "qr",
  "tablet-displays",
  "library-contents",
  "pharmacy-contents",
  "signage-playlist",
  "signage-videos",
]);
const useKeys = new Set([
  "store-execution",
  "tablet-requests",
  "signage-schedules",
  "signage-player",
  "analytics-marketing",
]);
const dualKeys = new Set(["qr", "tablet-displays", "signage-playlist", "pop"]);

export function withWorkspaceMode(
  path: string,
  area: "studio" | "use",
): string {
  const [pathname, rest = ""] = path.split("?");
  const search = new URLSearchParams(rest);
  search.set("workspace", area);
  return `${pathname}?${search}`;
}

/** Input has already passed the existing staff/capability menu filters. */
export function workspaceItems(
  config: StoreDashboardConfig,
  area: StoreWorkspaceArea,
): StoreMenuSectionItem[] {
  const items = (config.menuSections ?? []).flatMap((section) => section.items);
  if (area === "home") return [];
  const keys =
    area === "commerce"
      ? commerceKeys
      : area === "studio"
        ? studioKeys
        : useKeys;
  const selected = items.filter(
    (item) => keys.has(item.key) || (area === "use" && dualKeys.has(item.key)),
  );
  const result = selected.map((item) => ({
    ...item,
    label:
      area === "use"
        ? ({
            qr: "QR 배치·출력",
            "tablet-displays": "태블릿 적용",
            "signage-playlist": "사이니지 적용",
            pop: "POP 출력",
          }[item.key] ?? item.label)
        : item.label,
    subPath: dualKeys.has(item.key)
      ? withWorkspaceMode(item.subPath, area === "use" ? "use" : "studio")
      : item.subPath,
  }));
  if (
    area === "studio" &&
    items.some((item) => item.key === "library-contents")
  )
    result.push({
      key: "library-resources",
      label: "파일·참고 자료",
      subPath: "/library/resources",
    });
  if (area === "use" && items.some((item) => item.key === "library-contents"))
    result.push({
      key: "asset-status",
      label: "게시·활용 상태",
      subPath: "/content",
    });
  return result;
}

export function workspaceSupportItems(
  config: StoreDashboardConfig,
): StoreMenuSectionItem[] {
  return (config.menuSections ?? [])
    .flatMap((section) => section.items)
    .filter(
      (item) =>
        item.key !== "home" &&
        !commerceKeys.has(item.key) &&
        !studioKeys.has(item.key) &&
        !useKeys.has(item.key),
    );
}

/** Existing URLs remain valid. Only the UI work area changes. */
export function currentWorkspaceArea(
  pathname: string,
  search: string,
  basePath: string,
): StoreWorkspaceArea | null {
  const relative = pathname.startsWith(`${basePath}/`)
    ? pathname.slice(basePath.length)
    : pathname === basePath
      ? ""
      : null;
  if (relative === null) {
    const workBase = basePath.startsWith("/work/")
      ? basePath.replace(/\/store$/, "")
      : null;
    return workBase &&
      (pathname === workBase || pathname.startsWith(`${workBase}/`))
      ? "commerce"
      : null;
  }
  if (!relative || relative === "/") return "home";
  const landing = STORE_WORKSPACE_AREAS.find(
    (area) => area.subPath && relative === area.subPath,
  );
  if (landing) return landing.key;
  if (
    /^\/(marketing\/qr(?:\/|$)|commerce\/tablet-displays(?:\/|$)|marketing\/pop-v2(?:\/|$)|marketing\/signage\/playlist(?:\/|$))/.test(
      relative,
    )
  ) {
    const mode = new URLSearchParams(search).get("workspace");
    return mode === "use" ||
      (!mode && relative.startsWith("/commerce/tablet-displays"))
      ? "use"
      : "studio";
  }
  if (
    /^\/(execution|requests|analytics|content$|marketing\/signage\/(schedules|player))(?:\/|$)/.test(
      relative,
    )
  )
    return "use";
  if (
    /^\/(library|content\/|marketing\/product-descriptions|products\/multilingual|marketing\/signage\/videos)/.test(
      relative,
    ) ||
    relative === "/pharmacy/contents"
  )
    return "studio";
  if (
    /^\/(my-products|handled-products|product-settings|commerce\/local-products|pharmacy\/(supply|cart|orders|recruitments))/.test(
      relative,
    )
  )
    return "commerce";
  return null;
}
