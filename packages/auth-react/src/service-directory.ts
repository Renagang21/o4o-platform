/** Public discovery metadata only. This directory never grants membership or workspace access. */
export interface ServiceDestination {
  key: string;
  label: string;
  description: string;
  href: string;
  category: string;
  serviceKey?: string;
  preparing?: boolean;
  workspace?: "store";
  workspacePath?: string;
  publicOnly?: boolean;
  documentNavigation?: boolean;
}
export const O4O_SERVICE_DIRECTORY: readonly ServiceDestination[] = [
  {
    key: "kpa-society",
    label: "O4O 약국 경영지원",
    description: "O4O를 이용하는 약국의 일상 업무를 지원합니다.",
    href: "https://pharmacy.neture.co.kr/",
    category: "약국 협력사업 참여",
    serviceKey: "kpa-society",
  },
  {
    key: "carepharm",
    label: "만성질환관리",
    description:
      "CarePharm에서 만성질환관리 협력사업과 참여 정보를 확인합니다.",
    href: "https://carepharm.neture.co.kr/",
    category: "약국 협력사업 참여",
    serviceKey: "carepharm",
  },
  {
    key: "cooperative",
    serviceKey: "pharmcoop",
    label: "약국/약사협동조합",
    description: "약국·약사 협동조합을 둘러보고 조합별 활동을 확인합니다.",
    href: "https://pharmcoop.neture.co.kr/",
    category: "약국 협력사업 참여",
  },
  {
    key: "megapharm",
    serviceKey: "megapharm",
    label: "창고형 약국",
    description: "메가팜의 창고형 약국 협력사업과 참여 정보를 확인합니다.",
    href: "https://megapharm.neture.co.kr/",
    category: "약국 협력사업 참여",
  },
  {
    key: "store",
    label: "내 매장",
    description: "내 매장의 제품·콘텐츠와 운영 업무를 관리합니다.",
    href: "https://store.neture.co.kr/",
    category: "약국 경영·공급 활동",
    workspace: "store",
  },
  {
    key: "supplier",
    label: "공급자",
    description: "제품을 등록하고 참여 매장에 공급합니다.",
    href: "https://supplier.neture.co.kr",
    category: "약국 경영·공급 활동",
    serviceKey: "supplier",
    workspacePath: "/supplier/dashboard",
  },
  {
    key: "community",
    label: "커뮤니티",
    description: "공개 글을 둘러보고 관심 있는 이야기를 나눕니다.",
    href: "https://community.neture.co.kr",
    category: "커뮤니티·단체활동",
    serviceKey: "community",
  },
  {
    key: "kpa-branch",
    label: "약사회 분회",
    description: "소속 분회의 소식과 회원 활동을 확인합니다.",
    href: "https://kpa.neture.co.kr/",
    category: "커뮤니티·단체활동",
    serviceKey: "kpa-branch",
  },
  {
    key: "lecture",
    label: "O4O 강의 · 교육·학습",
    description: "공개 강의를 둘러보고 필요한 교육을 찾아보세요.",
    href: "https://study.neture.co.kr/",
    category: "커뮤니티·단체활동",
    serviceKey: "lecture",
  },
  {
    key: "funding",
    label: "유통참여형 펀딩",
    description: "제품과 유통참여형 펀딩 소식을 확인합니다.",
    href: "https://funding.neture.co.kr/",
    category: "제품·유통 사업 참여",
    serviceKey: "funding",
  },
  {
    key: "partner",
    label: "O4O Partner",
    description: "준비 중인 서비스의 안내를 확인합니다.",
    href: "https://neture.co.kr/services/partner",
    category: "기타",
    preparing: true,
    publicOnly: true,
  },
  {
    key: "hospital",
    label: "병원·약품 파일 도구",
    description: "병원·약품 관련 파일을 정리하는 도구를 이용합니다.",
    href: "https://neture.co.kr/hospital",
    category: "기타",
    publicOnly: true,
    documentNavigation: true,
  },
];

export interface NavigationClient {
  get: (path: string) => Promise<{ data: any }>;
  post: (path: string, body: unknown) => Promise<{ data?: any }>;
}
export interface NavigationAccess {
  statuses: Record<string, string>;
  stores: { organizationId: string; organizationName: string }[];
  supplier: boolean;
}
interface BusinessParticipation {
  key: string;
  canParticipate: boolean;
  membershipStatus?: string | null;
}
function participationStatus(business: BusinessParticipation): string {
  if (business.canParticipate) return "active";
  if (business.membershipStatus === "active") return "unverified";
  return business.membershipStatus ?? "none";
}
function applyBusinessParticipation(
  statuses: Record<string, string>,
  businesses: BusinessParticipation[] | undefined,
): void {
  if (!businesses) return;
  // The business ledger overrides ordinary membership without granting access.
  for (const [businessKey, serviceKey] of [
    ["pharmacy", "kpa-society"],
    ["carepharm", "carepharm"],
    ["megapharm", "megapharm"],
  ]) {
    const business = businesses.find((item) => item.key === businessKey);
    if (business) statuses[serviceKey] = participationStatus(business);
    // Pharmacy also has personal membership. The other independent businesses
    // have no generic membership fallback when their current ledger is present.
    else if (businessKey !== "pharmacy") statuses[serviceKey] = "none";
  }
}
/** Always read actual ledgers. A failed read must not become "not joined". */
export async function loadNavigationAccess(
  api: NavigationClient,
): Promise<NavigationAccess> {
  const [catalog, workspace, entry] = await Promise.all([
    api.get("/auth/services"),
    api.get("/work-scope/accessible-stores"),
    api.get("/neture/home/entry"),
  ]);
  const services = catalog.data?.data?.services;
  const stores = workspace.data?.data?.stores;
  const supplier = entry.data?.data?.serviceStates?.supplier?.status;
  const businesses = entry.data?.data?.businesses as BusinessParticipation[] | undefined;
  if (
    [catalog, workspace, entry].some(
      (response) => response.data?.success === false,
    ) ||
    !Array.isArray(services) ||
    !Array.isArray(stores) ||
    (businesses !== undefined &&
      (!Array.isArray(businesses) ||
        !businesses.every(
          (business) =>
            business &&
            typeof business.key === "string" &&
            typeof business.canParticipate === "boolean" &&
            (business.membershipStatus == null ||
              typeof business.membershipStatus === "string"),
        ))) ||
    typeof supplier !== "string" ||
    !services.every(
      (s) =>
        typeof s.key === "string" &&
        (s.membership == null || typeof s.membership.status === "string"),
    ) ||
    !stores.every(
      (s) =>
        typeof s.organizationId === "string" &&
        typeof s.organizationName === "string",
    )
  ) {
    throw new Error("Invalid service navigation response");
  }
  const statuses: Record<string, string> = Object.fromEntries(
    services.filter((s) => s.membership).map((s) => [s.key, s.membership.status]),
  );
  applyBusinessParticipation(statuses, businesses);
  return { statuses: { ...statuses, supplier }, stores, supplier: supplier === "active" };
}

/** The server decides access; the browser validates the returned destination before navigation. */
export async function resolveServiceDestination(
  api: NavigationClient,
  destination: ServiceDestination,
  authenticated: boolean,
): Promise<string> {
  const target = new URL(destination.href);
  if (target.protocol !== "https:" || target.username || target.password)
    throw new Error("Invalid public destination");
  if (authenticated && (destination.serviceKey || destination.workspace)) {
    const response = await api.post("/auth/handoff", {
      ...(destination.workspace
        ? { targetWorkspace: destination.workspace }
        : { targetServiceKey: destination.serviceKey }),
      returnPath: `${target.pathname}${target.search}${target.hash}`,
    });
    const href = response.data?.data?.targetUrl;
    const actual = new URL(href ?? "");
    if (
      actual.protocol !== "https:" ||
      actual.origin !== target.origin ||
      actual.pathname !== "/handoff" ||
      actual.searchParams.get("returnTo") !==
        `${target.pathname}${target.search}${target.hash}`
    )
      throw new Error("Invalid service destination");
    return actual.href;
  }
  return target.href;
}
