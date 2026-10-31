import { resolveHandoffReturnTo } from "./resolveHandoffReturnTo.js";

/** Navigation metadata only. Target APIs retain all membership and business guards. */
export const MY_HOME_SOURCES = {
  store: {
    origin: "https://store.neture.co.kr",
    label: "매장 관리",
    workspace: "store",
  },
  study: {
    origin: "https://study.neture.co.kr",
    label: "Study",
    serviceKey: "lecture",
  },
  community: {
    origin: "https://community.neture.co.kr",
    label: "커뮤니티",
    serviceKey: "community",
  },
  funding: {
    origin: "https://funding.neture.co.kr",
    label: "Funding",
    serviceKey: "funding",
  },
  supplier: {
    origin: "https://supplier.neture.co.kr",
    label: "공급자",
    serviceKey: "supplier",
  },
  pharmacy: {
    origin: "https://pharmacy.neture.co.kr",
    label: "약사 서비스",
    serviceKey: "kpa-society",
  },
  kpa: {
    origin: "https://kpa.neture.co.kr",
    label: "분회 서비스",
    serviceKey: "kpa-branch",
  },
  admin: { origin: "https://admin.neture.co.kr", label: "플랫폼 관리" },
  partner: {
    origin: "https://partner.neture.co.kr",
    label: "O4O Partner",
    serviceKey: "partner-support",
  },
  cooperative: {
    origin: "https://pharmcoop.neture.co.kr",
    label: "협동조합",
    returnLabel: "협동조합으로 돌아가기",
    serviceKey: "pharmcoop",
  },
  carepharm: {
    origin: "https://carepharm.neture.co.kr",
    label: "CarePharm",
    serviceKey: "carepharm",
  },
  drugstore: {
    origin: "https://drugstore.neture.co.kr",
    label: "드럭스토어형 약국",
    returnLabel: "드럭스토어형 약국으로 돌아가기",
    serviceKey: "drugstore",
  },
} as const;
export type MyHomeSource = keyof typeof MY_HOME_SOURCES;
export function isMyHomeSource(value: unknown): value is MyHomeSource {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(MY_HOME_SOURCES, value);
}

/** Never forward login credentials or invitation tokens as return context. */
export function safeServiceReturnPath(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 400) return null;
  const origin = "https://return.invalid";
  if (resolveHandoffReturnTo(value, origin) !== value) return null;
  const url = new URL(value, origin);
  if (/^\/(?:handoff|login|auth)(?:\/|$)/.test(url.pathname)) return null;
  if (
    [...url.searchParams.keys()].some((key) =>
      /token|password|secret|code|credential|authorization|api[_-]?key|access[_-]?key|invite/i.test(
        key,
      ),
    )
  )
    return null;
  if (
    [...new URLSearchParams(url.hash.slice(1)).keys()].some((key) =>
      /join|token|password|secret|code|credential|authorization|api[_-]?key|access[_-]?key|invite/i.test(
        key,
      ),
    )
  )
    return null;
  return value;
}
export function getMyHomePath(origin: string, returnPath?: string): string {
  const source = Object.entries(MY_HOME_SOURCES).find(
    ([, item]) => item.origin === origin,
  )?.[0];
  if (!source) return "/mypage";
  const params = new URLSearchParams({ from: source });
  const safe = safeServiceReturnPath(returnPath);
  if (safe && safe !== "/") params.set("returnPath", safe);
  const path = `/mypage?${params}`;
  return path.length <= 512 ? path : `/mypage?from=${source}`;
}
/** Finite representative destinations; no arbitrary origin or query is accepted. */
export function isRepresentativeReturnPath(path: string): boolean {
  if (path === "/" || path === "/mypage") return true;
  const url = new URL(path, "https://neture.co.kr");
  if (
    url.origin !== "https://neture.co.kr" ||
    url.pathname !== "/mypage" ||
    url.hash ||
    !isMyHomeSource(url.searchParams.get("from"))
  )
    return false;
  if (path !== `/mypage?${url.searchParams}`) return false;
  const keys = [...url.searchParams.keys()];
  if (
    new Set(keys).size !== keys.length ||
    keys.some((key) => !["from", "returnPath"].includes(key))
  )
    return false;
  const returnPath = url.searchParams.get("returnPath");
  return returnPath === null || safeServiceReturnPath(returnPath) !== null;
}
