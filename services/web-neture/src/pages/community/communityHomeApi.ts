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
  news: "약사공론 뉴스",
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
}
export interface HomePreview {
  pinned: HomeItem[];
  recent: HomeItem[];
}
export type CommunityHome = Record<EditorialKind | "forum", HomePreview> & {
  member: boolean;
};
export const homeApi = {
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
  manage: async (kind: EditorialKind) =>
    (
      await api.get("/communities/community/management/home-items", {
        params: { kind },
      })
    ).data.data as HomeItem[],
  save: async (id: string | null, item: Partial<HomeItem>) =>
    id
      ? api.put(`/communities/community/management/home-items/${id}`, item)
      : api.post("/communities/community/management/home-items", item),
  forum: async () =>
    (await api.get("/communities/community/management/home-forum")).data
      .data as HomePreview,
  pinForum: async (id: string, isPinned: boolean) =>
    api.patch(`/communities/community/management/home-forum/${id}`, {
      isPinned,
    }),
};
export function itemHref(
  item: HomeItem,
  section: EditorialKind | "forum",
  member = false,
) {
  if (section === "news") return item.linkUrl || "https://www.kpanews.co.kr/";
  if (section === "forum")
    return `/communities/community/${member ? "forum" : "public"}/post/${encodeURIComponent(item.slug ?? item.id)}`;
  return `${SECTION_PATHS[section]}/${item.id}`;
}
