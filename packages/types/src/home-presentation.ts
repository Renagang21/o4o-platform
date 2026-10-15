/** Public home presentation data only. No membership, role or private business content. */
export const HOME_SURFACES = [
  "neture",
  "supplier",
  "funding",
  "community",
  "carepharm",
  "pharmacy",
  "lecture",
  "branch",
] as const;
export type HomeSurface = (typeof HOME_SURFACES)[number];
export interface HomeMessage {
  id: string;
  title: string;
  description: string;
  eyebrow: string;
  imageUrl: string;
  linkUrl: string;
  linkText: string;
  enabled: boolean;
  startsAt: string;
  endsAt: string;
  kind: "service" | "advertisement";
  sponsor: string;
}
export interface HomePresentation {
  enabled: boolean;
  slides: HomeMessage[];
  promotions: HomeMessage[];
}
export interface HomePresentationState {
  revision: number;
  draft: HomePresentation | null;
  published: HomePresentation | null;
}

export const HOME_SURFACE_INFO: Record<
  HomeSurface,
  { name: string; serviceKey: string; accent: string; purpose: string }
> = {
  neture: {
    name: "O4O",
    serviceKey: "neture",
    accent: "#1c6454",
    purpose: "서비스와 필요한 업무를 연결하는 대표 공간",
  },
  supplier: {
    name: "공급자",
    serviceKey: "supplier",
    accent: "#285d9b",
    purpose: "제품과 콘텐츠를 매장에 연결하는 공급 업무",
  },
  funding: {
    name: "유통참여형 펀딩",
    serviceKey: "funding",
    accent: "#7252a3",
    purpose: "새로운 제품의 가능성을 함께 검토하고 참여",
  },
  community: {
    name: "O4O 커뮤니티",
    serviceKey: "community",
    accent: "#246e65",
    purpose: "현장의 경험과 정보를 나누는 회원 소통",
  },
  carepharm: {
    name: "CarePharm",
    serviceKey: "neture",
    accent: "#226c66",
    purpose: "만성질환 관리에 함께하는 약국 협업",
  },
  pharmacy: {
    name: "O4O 약국",
    serviceKey: "kpa-society",
    accent: "#285d9b",
    purpose: "약국 경영지원·협력사업과 회원 소통",
  },
  lecture: {
    name: "O4O 강의",
    serviceKey: "lecture",
    accent: "#6652a1",
    purpose: "강의를 만나고 나의 배움을 이어가는 학습 공간",
  },
  branch: {
    name: "분회",
    serviceKey: "kpa-branch",
    accent: "#285d9b",
    purpose: "지역 회원의 공지·행사·자료 연결",
  },
};
const COPY: Record<HomeSurface, [string, string, string, string]> = {
  neture: [
    "필요한 서비스와 업무를 한곳에서",
    "O4O AI에 질문하고, 참여 중인 서비스와 내 업무를 이어가세요.",
    "약국의 새로운 연결을 만나세요",
    "협력사업과 서비스 소식을 확인하고 나에게 필요한 참여 기회를 살펴보세요.",
  ],
  supplier: [
    "제품과 콘텐츠를 매장과 연결합니다",
    "상품 등록부터 매장 연결과 운영까지 공급자 업무를 한곳에서 관리합니다.",
    "좋은 제품에는 좋은 소개가 필요합니다",
    "제품 정보와 콘텐츠를 준비하고, 매장에 전달할 가치를 명확하게 소개하세요.",
  ],
  funding: [
    "제품의 가능성을 유통 참여로 연결합니다",
    "새로운 제품과 유통 기회를 함께 검토하고 참여합니다.",
    "사업의 조건을 먼저 살펴보세요",
    "진행 중인 사업의 소개와 참여 조건을 확인하고 내 매장에 맞는 기회를 찾아보세요.",
  ],
  community: [
    "현장의 경험과 정보를 함께 나눕니다",
    "O4O 서비스 참여자들이 실무 정보와 경험을 공유하는 공간입니다.",
    "함께 나누면 더 가까워집니다",
    "참여 중인 커뮤니티의 소식과 자료를 확인하고 현장의 이야기를 나눠보세요.",
  ],
  carepharm: [
    "만성질환 관리, 약국이 함께합니다",
    "참여 약국들이 현장의 경험과 자료를 나누고 협업하는 공간입니다.",
    "꾸준한 상담을 함께 고민합니다",
    "복약 상담과 지속적인 건강 관리에 도움이 되는 현장 경험을 나눠보세요.",
  ],
  pharmacy: [
    "약국의 일상에 든든한 연결",
    "약국 경영지원과 협력사업, 회원 소식을 한곳에서 확인하세요.",
    "우리 약국에 맞는 협력사업",
    "사업 소개와 참여 조건을 확인하고 약국의 새로운 활동을 준비하세요.",
  ],
  lecture: [
    "새로운 배움이 시작되는 곳",
    "관심 있는 강의를 만나고, 나의 학습을 이어가세요.",
    "나의 속도로 이어가는 학습",
    "공개 강의를 살펴보고 수강 중인 학습과 자료를 확인하세요.",
  ],
  branch: [
    "가까운 소식, 함께하는 분회",
    "우리 분회의 공지와 행사, 회원 자료를 한곳에서 확인하세요.",
    "놓치지 말아야 할 회원 소식",
    "행사 일정과 공지를 확인하고 지역 회원의 활동을 함께 이어가세요.",
  ],
};
export function initialHomePresentation(
  surface: HomeSurface,
): HomePresentation {
  const [title, description, secondTitle, secondDescription] = COPY[surface];
  const message = (id: string, heading: string, copy: string): HomeMessage => ({
    id,
    title: heading,
    description: copy,
    eyebrow: HOME_SURFACE_INFO[surface].name,
    imageUrl: "",
    linkUrl: "",
    linkText: "",
    enabled: true,
    startsAt: "",
    endsAt: "",
    kind: "service",
    sponsor: "",
  });
  return {
    enabled: true,
    slides: [
      message("welcome", title, description),
      message("discover", secondTitle, secondDescription),
    ],
    promotions: [
      message(
        "service-introduction",
        `${HOME_SURFACE_INFO[surface].name} 이용 안내`,
        HOME_SURFACE_INFO[surface].purpose,
      ),
    ],
  };
}

export function safeHomeUrl(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    value.length > 1000 ||
    /[\s\\]/.test(value) ||
    Array.from(value).some(
      (character) =>
        character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    )
  )
    return false;
  if (value === "") return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}
export function parseHomePresentation(value: unknown): HomePresentation {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("화면 구성이 올바르지 않습니다.");
  const config = value as HomePresentation;
  if (
    typeof config.enabled !== "boolean" ||
    !Array.isArray(config.slides) ||
    !Array.isArray(config.promotions) ||
    config.slides.length > 3 ||
    config.promotions.length > 3
  )
    throw new Error("Hero와 홍보는 각각 최대 3개입니다.");
  const parse = (item: HomeMessage, hero: boolean): HomeMessage => {
    if (!item || typeof item !== "object" || typeof item.enabled !== "boolean")
      throw new Error("노출 설정을 확인해 주세요.");
    for (const [field, limit] of Object.entries({
      id: 80,
      title: 120,
      description: 400,
      eyebrow: 60,
      imageUrl: 1000,
      linkUrl: 1000,
      linkText: 40,
      sponsor: 100,
      startsAt: 40,
      endsAt: 40,
    })) {
      if (
        typeof item[field as keyof HomeMessage] !== "string" ||
        String(item[field as keyof HomeMessage]).length > limit
      )
        throw new Error(`${field} 입력 길이를 확인해 주세요.`);
    }
    if (
      !item.id ||
      !item.title.trim() ||
      !["service", "advertisement"].includes(item.kind) ||
      (hero && item.kind !== "service")
    )
      throw new Error(
        "제목과 콘텐츠 종류를 확인해 주세요. Hero에는 서비스 안내만 등록합니다.",
      );
    if (
      !safeHomeUrl(item.linkUrl) ||
      !safeHomeUrl(item.imageUrl) ||
      (item.linkUrl && !item.linkText.trim())
    )
      throw new Error(
        "연결 주소와 버튼 문구를 확인해 주세요. 주소는 / 경로 또는 HTTPS만 가능합니다.",
      );
    if (item.kind === "advertisement" && !item.sponsor.trim())
      throw new Error("광고에는 광고주 표시가 필요합니다.");
    if (
      [item.startsAt, item.endsAt].some(
        (time) => time && !Number.isFinite(Date.parse(time)),
      ) ||
      (item.startsAt &&
        item.endsAt &&
        Date.parse(item.startsAt) >= Date.parse(item.endsAt))
    )
      throw new Error("게시 시작·종료 시간을 확인해 주세요.");
    return {
      id: item.id,
      title: item.title.trim(),
      description: item.description,
      eyebrow: item.eyebrow,
      imageUrl: item.imageUrl,
      linkUrl: item.linkUrl,
      linkText: item.linkText,
      enabled: item.enabled,
      startsAt: item.startsAt,
      endsAt: item.endsAt,
      kind: item.kind,
      sponsor: item.sponsor,
    };
  };
  const slides = config.slides.map((item) => parse(item, true)),
    promotions = config.promotions.map((item) => parse(item, false));
  if (
    [slides, promotions].some(
      (items) => new Set(items.map((item) => item.id)).size !== items.length,
    )
  )
    throw new Error("중복된 항목 ID입니다.");
  return { enabled: config.enabled, slides, promotions };
}
export function visibleHomePresentation(
  config: HomePresentation,
  now = Date.now(),
): HomePresentation {
  const visible = (item: HomeMessage) =>
    item.enabled &&
    (!item.startsAt || Date.parse(item.startsAt) <= now) &&
    (!item.endsAt || now < Date.parse(item.endsAt));
  return {
    enabled: config.enabled,
    slides: config.enabled ? config.slides.filter(visible) : [],
    promotions: config.enabled ? config.promotions.filter(visible) : [],
  };
}
