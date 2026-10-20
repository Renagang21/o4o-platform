import type {
  StoreDashboardConfig,
  StoreMenuSectionItem,
} from "@o4o/store-ui-core";

export type StoreWorkspaceArea = "home" | "commerce" | "studio" | "use";
export const STORE_WORKSPACE_AREAS = [
  {
    key: "home",
    label: "대시보드",
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
    label: "안내 만들기",
    subPath: "/workspace/studio",
    description: "상품과 자료를 골라 매장에서 사용할 안내를 준비합니다.",
  },
  {
    key: "use",
    label: "매장 운영",
    subPath: "/workspace/use",
    description: "상담하고 매장의 사이니지·태블릿·QR을 운영합니다.",
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
  "staff-support",
  "multilingual-consultation",
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
  const keys = { commerce: commerceKeys, studio: studioKeys, use: useKeys }[
    area
  ];
  const selected = items.filter(
    (item) => keys.has(item.key) || (area === "use" && dualKeys.has(item.key)),
  );
  const useLabels: Record<string, string> = {
    qr: "QR 배치·출력",
    "tablet-displays": "태블릿 적용",
    "signage-playlist": "사이니지 적용",
    pop: "POP 출력",
  };
  const mode = area === "use" ? "use" : "studio";
  const result = selected.map((item) => {
    const label =
      area === "use" ? (useLabels[item.key] ?? item.label) : item.label;
    const subPath = dualKeys.has(item.key)
      ? withWorkspaceMode(item.subPath, mode)
      : item.subPath;
    return { ...item, label, subPath };
  });
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
  let relative: string | null = null;
  if (pathname === basePath) relative = "";
  else if (pathname.startsWith(`${basePath}/`))
    relative = pathname.slice(basePath.length);
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
    /^\/(execution|requests|staff-support|multilingual-consultation|analytics|content$|marketing\/signage\/(schedules|player))(?:\/|$)/.test(
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

/** Presentation only: group the already permission-filtered menu without adding routes or capabilities. */
export interface StoreWorkspaceGroup {
  key: string;
  title: string;
  description: string;
  primary: StoreMenuSectionItem[];
  secondary: StoreMenuSectionItem[];
}
export function workspaceGroups(
  config: StoreDashboardConfig,
  area: StoreWorkspaceArea,
): StoreWorkspaceGroup[] {
  const items = workspaceItems(config, area);
  const group = (
    key: string,
    title: string,
    description: string,
    primary: string[],
    secondary: string[] = [],
  ): StoreWorkspaceGroup => ({
    key,
    title,
    description,
    primary: primary.flatMap((key) => items.filter((item) => item.key === key)),
    secondary: secondary.flatMap((key) =>
      items.filter((item) => item.key === key),
    ),
  });
  const groups =
    area === "commerce"
      ? [
          group(
            "products",
            "내 상품",
            "매장에서 안내할 상품을 찾고 상품별 정보와 자료를 확인합니다.",
            ["my-products"],
          ),
          group(
            "orders",
            "공급·주문",
            "공급 상품과 조건을 확인하고 기존 거래 업무를 이어갑니다.",
            ["pharmacy-supply", "pharmacy-cart", "pharmacy-orders"],
            ["pharmacy-recruitments"],
          ),
        ]
      : area === "studio"
        ? [
            group(
              "contents",
              "내 안내",
              "저장한 콘텐츠를 찾아 수정하거나 자료를 골라 새 안내를 준비합니다.",
              ["library-contents"],
              ["library-resources"],
            ),
            group(
              "sources",
              "자료 찾기",
              "이용 가능한 제공 자료를 찾아 내 매장에서 사용할 사본을 가져옵니다.",
              ["pharmacy-contents"],
            ),
            group(
              "editors",
              "직접 만들기",
              "필요한 편집기를 열어 안내를 작성하고 미리보기·저장을 진행합니다.",
              [],
              [
                "product-descriptions",
                "tablet-displays",
                "qr",
                "signage-playlist",
                "signage-videos",
                "pop",
                "content-blog",
              ],
            ),
          ]
        : area === "use"
          ? [
              group(
                "consultation",
                "상담",
                "고객 응대에 필요한 상담 방식과 자료를 선택하세요.",
                ["multilingual-consultation", "staff-support"],
                ["tablet-requests"],
              ),
              group(
                "signage",
                "사이니지",
                "매장에서 재생할 안내를 고르고 순서와 재생 일정을 관리합니다.",
                ["signage-playlist"],
                ["signage-schedules", "signage-player"],
              ),
              group(
                "tablet",
                "태블릿",
                "설치 위치와 고객에게 보여줄 화면을 관리합니다.",
                ["tablet-displays"],
              ),
              group(
                "qr",
                "QR",
                "고객이 열어볼 안내의 QR을 확인하고 배치·출력합니다.",
                ["qr"],
                ["pop"],
              ),
              group(
                "details",
                "배치·이용 현황",
                "위치별 저장 설정, 게시 상태와 집계된 이용 기록을 확인합니다.",
                ["store-execution", "asset-status"],
                ["analytics-marketing"],
              ),
            ]
          : [];
  return groups.filter(
    (group) => group.primary.length || group.secondary.length,
  );
}

/** Only existing, permission-filtered work groups become operation destinations. */
export function storeOperationGroups(config: StoreDashboardConfig) {
  return workspaceGroups(config, "use").filter((group) => group.key !== "details");
}

export function currentStoreOperation(
  config: StoreDashboardConfig,
  pathname: string,
  search: string,
): StoreWorkspaceGroup | undefined {
  const groups = storeOperationGroups(config);
  if (pathname === `${config.basePath}/workspace/use`) {
    const topic = new URLSearchParams(search).get("topic");
    return groups.find((group) => group.key === topic) ?? groups[0];
  }
  return groups.find((group) =>
    [...group.primary, ...group.secondary].some((item) => {
      const path = `${config.basePath}${item.subPath.split("?")[0]}`;
      return pathname === path || pathname.startsWith(`${path}/`);
    }),
  );
}
