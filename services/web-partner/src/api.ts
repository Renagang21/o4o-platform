import { parseWorkspace, type Workspace } from "./model";

export type SpaceRole = "owner" | "editor" | "viewer";
export type SpaceSummary = {
  id: string;
  name: string;
  role: SpaceRole;
  revision: number;
  updated_at: string;
};
export type ServerSpace = SpaceSummary & { workspace: Workspace };
export type Member = { id: string; name: string; role: SpaceRole };
export type Invitation = {
  id: string;
  role: "editor" | "viewer";
  expires_at: string;
  consumed_at: string | null;
  revoked_at: string | null;
};
export type AuditEvent = {
  id: string;
  kind: string;
  revision: number;
  actor_id: string;
  created_at: string;
  changes: {
    settlements?: {
      id: string;
      before: Workspace["settlements"][number] | null;
      after: Workspace["settlements"][number] | null;
    }[];
  };
};
const messages: Record<string, string> = {
  UNAUTHENTICATED: "로그인이 필요합니다. 다시 로그인해 주세요.",
  SPACE_NOT_FOUND:
    "접근할 수 없는 공동공간입니다. 권한이 변경되었는지 확인해 주세요.",
  OWNER_REQUIRED: "공동공간 소유자만 처리할 수 있습니다.",
  READ_ONLY: "이 공동공간은 열람만 할 수 있습니다.",
  SETTLEMENT_OWNER_REQUIRED:
    "정산 내역은 공동공간 소유자만 변경할 수 있습니다.",
  REVISION_CONFLICT:
    "다른 참여자가 자료를 변경했습니다. 입력 내용을 따로 보관한 뒤 서버 자료를 다시 불러와 주세요.",
  INVALID_INPUT: "입력값과 연결된 자료를 확인해 주세요.",
  PARTNER_UNAVAILABLE:
    "Partner 서버를 이용할 수 없습니다. 연결과 서비스 준비 상태를 확인해 주세요.",
  INVITE_UNAVAILABLE: "만료되었거나 이미 사용·취소된 초대입니다.",
  ALREADY_MEMBER: "이미 참여 중인 공동공간입니다.",
  SPACE_LIMIT: "만들 수 있는 공동공간 수를 초과했습니다.",
  MEMBER_LIMIT: "공동공간의 참여자 수를 초과했습니다.",
  INVITE_LIMIT: "사용하지 않은 초대가 많습니다. 이전 초대를 취소해 주세요.",
  RATE_LIMITED: "요청이 많습니다. 잠시 후 다시 시도해 주세요.",
  PAYLOAD_TOO_LARGE:
    "공동공간 자료는 1MB 이내로 저장할 수 있습니다. 자료를 백업하고 별도 공동공간으로 나누어 주세요.",
};
let configuredOrigin =
  import.meta.env.VITE_PARTNER_API_ORIGIN ||
  (import.meta.env.DEV ? "" : "https://api.neture.co.kr");
if (configuredOrigin) {
  const u = new URL(configuredOrigin);
  if (
    u.username ||
    u.password ||
    u.pathname !== "/" ||
    u.search ||
    u.hash ||
    (u.protocol !== "https:" &&
      !(
        u.protocol === "http:" &&
        ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)
      ))
  )
    throw new Error("Partner API 주소 설정을 확인해 주세요.");
  configuredOrigin = u.origin;
}
let refreshing: Promise<boolean> | null = null;
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
  ) {
    super(
      messages[code] ||
        (status === 401
          ? "로그인 정보를 확인해 주세요."
          : status === 403
            ? "계정 상태·약관 동의와 접근 권한을 확인해 주세요."
            : "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요."),
    );
  }
}
export async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
  retry = true,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${configuredOrigin}${path}`, {
      method,
      credentials: "include",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "O4O-Partner",
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch {
    throw new Error(
      "서버에 연결하지 못했습니다. 네트워크와 API 연결 설정을 확인해 주세요.",
    );
  }
  if (
    response.status === 401 &&
    retry &&
    !["/auth/refresh", "/auth/email/login", "/auth/logout"].some((p) =>
      path.includes(p),
    )
  ) {
    if (!refreshing)
      refreshing = request("/api/v1/auth/refresh", "POST", {}, false)
        .then(
          () => true,
          () => false,
        )
        .finally(() => {
          refreshing = null;
        });
    if (await refreshing) return request<T>(path, method, body, false);
  }
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || payload.success === false)
    throw new ApiError(
      response.status,
      typeof payload?.code === "string" ? payload.code : "REQUEST_FAILED",
    );
  return payload.data as T;
}
export const partnerApi = {
  async me() {
    const data = await request<{
      user: { id: string; name?: string; displayName?: string };
    }>("/api/v1/auth/me");
    if (!data?.user?.id) throw new ApiError(401, "UNAUTHENTICATED");
    return data.user;
  },
  login: (email: string, password: string) =>
    request("/api/v1/auth/email/login", "POST", {
      email,
      password,
      includeLegacyTokens: false,
    }),
  logout: () => request("/api/v1/auth/logout", "POST", {}),
  list: () => request<SpaceSummary[]>("/api/v1/partner-support/spaces"),
  create: (name: string) =>
    request<ServerSpace>("/api/v1/partner-support/spaces", "POST", { name }),
  async load(id: string) {
    const s = await request<ServerSpace>(
      `/api/v1/partner-support/spaces/${id}`,
    );
    return { ...s, workspace: parseWorkspace(JSON.stringify(s.workspace)) };
  },
  async save(id: string, revision: number, workspace: Workspace) {
    const s = await request<ServerSpace>(
      `/api/v1/partner-support/spaces/${id}`,
      "PUT",
      { revision, workspace },
    );
    return { ...s, workspace: parseWorkspace(JSON.stringify(s.workspace)) };
  },
  join: (token: string) =>
    request<SpaceSummary>("/api/v1/partner-support/join", "POST", { token }),
  members: (id: string) =>
    request<Member[]>(`/api/v1/partner-support/spaces/${id}/members`),
  removeMember: (id: string, memberId: string) =>
    request(
      `/api/v1/partner-support/spaces/${id}/members/${memberId}`,
      "DELETE",
    ),
  invites: (id: string) =>
    request<Invitation[]>(`/api/v1/partner-support/spaces/${id}/invites`),
  invite: (id: string, role: "editor" | "viewer") =>
    request<Invitation & { token: string }>(
      `/api/v1/partner-support/spaces/${id}/invites`,
      "POST",
      { role },
    ),
  revoke: (id: string, inviteId: string) =>
    request(
      `/api/v1/partner-support/spaces/${id}/invites/${inviteId}`,
      "DELETE",
    ),
  events: (id: string) =>
    request<AuditEvent[]>(`/api/v1/partner-support/spaces/${id}/events`),
};
