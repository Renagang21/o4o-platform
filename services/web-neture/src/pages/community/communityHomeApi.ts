import { api } from "../../lib/apiClient";
export const EDITORIAL_KINDS = [
  "notice",
  "news",
  "content",
  "resource",
] as const;
export type EditorialKind = (typeof EDITORIAL_KINDS)[number];
export const SECTION_NAMES: Record<EditorialKind | "forum", string> = {
  notice: "공지사항",
  news: "약업계 주요 소식",
  forum: "포럼",
  content: "콘텐츠",
  resource: "자료실",
};
export const SECTION_PATHS: Record<EditorialKind | "forum", string> = {
  notice: "/communities/community/notices",
  news: "/communities/community/news",
  forum: "/communities/community/forum",
  content: "/communities/community/content",
  resource: "/communities/community/resources",
};
export interface HomeItem {
  id: string;
  title: string;
  summary?: string;
  excerpt?: string;
  body?: string;
  linkUrl?: string;
  createdAt: string;
  isPinned: boolean;
  sortOrder?: number;
  status?: string;
  kind?: EditorialKind;
  audience?: "public" | "members";
  slug?: string;
  boardName?: string;
  sourceName?: string;
  recommended?: boolean;
  reason?: string;
  newsReviewId?: string;
  newsRecommendation?: { recommended: boolean; reason: string };
}
export interface HomePreview {
  pinned: HomeItem[];
  recent: HomeItem[];
}
export type CommunityHome = Record<EditorialKind | "forum", HomePreview> & {
  member: boolean;
};
export interface NewsReview {
  id: string;
  day: string;
  state: "pending" | "done" | "failed";
  items: HomeItem[];
}
export function newsSourceName(link?: string): string {
  try {
    const host = new URL(link ?? "").hostname.replace(/^www\./, "");
    return (
      (
        {
          "kpanews.co.kr": "약사공론",
          "dailypharm.com": "데일리팜",
          "medipana.com": "메디파나",
        } as Record<string, string>
      )[host] ?? "원문"
    );
  } catch {
    return "원문";
  }
}
export const homeApi = {
  review: async () =>
    (await api.get("/communities/community/management/news-review")).data
      .data as NewsReview | null,
  runReview: async () =>
    (await api.post("/communities/community/management/news-review")).data
      .data as NewsReview,
  home: async () => {
    const response = await api.get("/communities/community/home");
    const data = response.data?.data;
    if (
      response.data?.success !== true ||
      typeof data?.member !== "boolean" ||
      [...EDITORIAL_KINDS, "forum"].some(
        (key) =>
          !Array.isArray(data[key]?.pinned) ||
          !Array.isArray(data[key]?.recent),
      )
    ) {
      throw new Error("COMMUNITY_HOME_LOAD_FAILED");
    }
    return data as CommunityHome;
  },
  list: async (kind: EditorialKind, page: number) =>
    (
      await api.get("/communities/community/editorial", {
        params: { kind, page },
      })
    ).data.data as { items: HomeItem[]; hasNext: boolean },
  detail: async (id: string) =>
    (await api.get(`/communities/community/editorial/${id}`)).data
      .data as HomeItem,
  manage: async (kind: EditorialKind, page = 1) =>
    (
      await api.get("/communities/community/management/home-items", {
        params: { kind, page },
      })
    ).data.data as { items: HomeItem[]; hasNext: boolean; page: number },
  save: (id: string | null, item: Partial<HomeItem>) =>
    id
      ? api.put(`/communities/community/management/home-items/${id}`, item)
      : api.post("/communities/community/management/home-items", item),
  forum: async (page = 1, q = "") =>
    (
      await api.get("/communities/community/management/home-forum", {
        params: { page, q },
      })
    ).data.data as HomePreview & { hasNext: boolean; page: number },
  pinForum: (id: string, isPinned: boolean) =>
    api.patch(`/communities/community/management/home-forum/${id}`, {
      isPinned,
    }),
};
export function itemHref(
  item: HomeItem,
  section: EditorialKind | "forum",
  member = false,
) {
  if (section === "news") return item.linkUrl || SECTION_PATHS.news;
  if (section === "forum")
    return `/communities/community/${member ? "forum" : "public"}/post/${encodeURIComponent(item.slug ?? item.id)}`;
  return `${SECTION_PATHS[section]}/${item.id}`;
}
