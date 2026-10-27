import { request } from "./api";
const base = "/api/v1/partner-support/community";
export type CommunityBoard = {
  id: string;
  name: string;
  description: string;
  operator_only: boolean;
  active?: boolean;
  revision: number;
};
export type CommunityPost = {
  id: string;
  board_id: string;
  title: string;
  body: string;
  author_id: string | null;
  author_name: string;
  created_at: string;
  updated_at: string;
  revision: number;
  state: "published" | "hidden" | "deleted";
  pinned: boolean;
  comment_count?: number;
  comments?: CommunityComment[];
};
export type CommunityComment = {
  id: string;
  post_id: string;
  body: string;
  author_id: string | null;
  author_name: string;
  state: "published" | "hidden" | "deleted";
  revision: number;
  created_at: string;
};
export type CommunityPolicy = {
  id: string;
  document_type: "terms" | "privacy";
  title: string;
  content: string;
  version: number;
};
export type Membership = { status: string | null; operator: boolean; admin?: boolean };
export type CommunityReport = {
  id: string;
  post_id: string;
  comment_id: string | null;
  reason: string;
  status: string;
  revision: number;
  resolution: string | null;
};
export type OperatorOverview = {
  boards: CommunityBoard[];
  members: {
    id: string;
    name: string;
    status: string;
    updated_at: string;
    version: string;
  }[];
  posts: CommunityPost[];
  reports: CommunityReport[];
  events: {
    id: string;
    kind: string;
    actor_name?: string;
    reason: string | null;
    created_at: string;
  }[];
};
export const communityApi = {
  boards: () => request<CommunityBoard[]>(`${base}/boards`),
  policies: () => request<CommunityPolicy[]>(`${base}/policies`),
  membership: () => request<Membership>(`${base}/membership`),
  join: (policies: CommunityPolicy[]) =>
    request<Membership>(`${base}/join`, "POST", {
      guidelinesAccepted: true,
      policies: policies.map((p) => ({
        policyDocumentId: p.id,
        documentType: p.document_type,
        version: p.version,
      })),
    }),
  list: (board: string, q = "", page = 1) =>
    request<{ items: CommunityPost[]; count: number; page: number }>(
      `${base}/boards/${board}/posts?${new URLSearchParams({ q, page: String(page) })}`,
    ),
  detail: (id: string, operator = false) =>
    request<CommunityPost>(`${base}/${operator ? "operator/" : ""}posts/${id}`),
  post: (input: { boardId: string; title: string; body: string }) =>
    request<{ id: string }>(`${base}/posts`, "POST", input),
  edit: (
    id: string,
    input: { revision: number; title: string; body: string },
  ) => request(`${base}/posts/${id}`, "PUT", input),
  remove: (id: string, revision: number) =>
    request(`${base}/posts/${id}`, "DELETE", { revision }),
  comment: (id: string, body: string) =>
    request(`${base}/posts/${id}/comments`, "POST", { body }),
  editComment: (id: string, revision: number, body: string) =>
    request(`${base}/comments/${id}`, "PUT", { revision, body }),
  removeComment: (id: string, revision: number) =>
    request(`${base}/comments/${id}`, "DELETE", { revision }),
  report: (id: string, reason: string, commentId?: string) =>
    request(`${base}/posts/${id}/reports`, "POST", { reason, commentId }),
  overview: () => request<OperatorOverview>(`${base}/operator`),
  moderate: (
    kind: "posts" | "comments",
    id: string,
    input: {
      revision: number;
      state: "published" | "hidden";
      reason: string;
      pinned?: boolean;
    },
  ) => request(`${base}/operator/${kind}/${id}`, "PATCH", input),
  member: (
    id: string,
    input: {
      status: "active" | "suspended";
      reason: string;
      expectedVersion: string;
    },
  ) => request(`${base}/operator/members/${id}`, "PATCH", input),
  board: (
    id: string | undefined,
    input: {
      name: string;
      description: string;
      operatorOnly: boolean;
      active: boolean;
      revision?: number;
      reason: string;
    },
  ) =>
    request(
      `${base}/operator/boards${id ? "/" + id : ""}`,
      id ? "PUT" : "POST",
      input,
    ),
  resolve: (id: string, revision: number, resolution: string) =>
    request(`${base}/operator/reports/${id}`, "PATCH", {
      revision,
      resolution,
    }),
};
