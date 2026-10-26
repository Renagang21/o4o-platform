import {
  getAccessToken,
  getRefreshToken,
  storeTokens,
  clearStoredTokens,
} from "@o4o/auth-client";
import { parseWorkspace, type Workspace, type Asset } from "./model";
export type MediaFile = {
  id: string;
  asset_id: string;
  group_id: string;
  version: number;
  name: string;
  mime: string;
  size: number;
  sha256: string;
  created_at: string;
};
export type Notification = {
  id: string;
  name: string;
  cursor: string;
  unread: number;
};

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
  COMMUNITY_MEMBERSHIP_REQUIRED:
    "파트너 커뮤니티 가입과 이용 상태를 확인해 주세요.",
  COMMUNITY_MEMBERSHIP_MANAGED:
    "커뮤니티 이용 상태는 운영자에게 확인해 주세요.",
  COMMUNITY_OPERATOR_REQUIRED: "Partner 운영 권한이 필요합니다.",
  COMMUNITY_AUTHOR_REQUIRED: "본인이 작성한 글·댓글만 변경할 수 있습니다.",
  COMMUNITY_NOT_FOUND: "현재 열람할 수 없는 글·댓글·게시판입니다.",
  COMMUNITY_SELF_ACTION: "본인의 이용 상태는 변경할 수 없습니다.",
  COMMUNITY_COMMENT_LIMIT:
    "댓글 수 제한에 도달했습니다. 새 글로 이야기를 이어가세요.",
  ENROLLMENT_POLICY_REQUIRED:
    "서비스 약관이 변경되었습니다. 페이지를 새로 열고 다시 확인해 주세요.",
  POLICY_UNAVAILABLE:
    "서비스 이용 안내를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.",
  ACCOUNT_NOT_ACTIVE: "O4O 계정의 이메일 확인과 이용 상태를 확인해 주세요.",
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
  MEDIA_NOT_CONFIGURED: "파일 저장소가 아직 연결되지 않았습니다.",
  MEDIA_UNAVAILABLE: "파일을 이용하지 못했습니다. 잠시 후 다시 시도해 주세요.",
  MEDIA_INTEGRITY_ERROR:
    "파일 무결성을 확인하지 못했습니다. 새 버전을 등록해 주세요.",
  MEDIA_UPLOAD_REJECTED:
    "한 번에 이미지·영상 한 개를 25MB 이내로 선택해 주세요.",
  UNSUPPORTED_MEDIA:
    "실제 파일 형식과 일치하는 PNG·JPEG·GIF·WebP·MP4·WebM만 등록할 수 있습니다.",
  MEDIA_QUOTA:
    "공동공간 파일은 버전 포함 100개·500MB 이내로 보관할 수 있습니다.",
  ASSET_HAS_FILES: "첨부 파일을 먼저 삭제한 뒤 자료를 삭제해 주세요.",
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
export const PARTNER_API_ORIGIN = configuredOrigin;
const sessionHeaders = (): Record<string, string> => {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};
let refreshing: Promise<boolean> | null = null;
async function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    const oldToken = getAccessToken(),
      refreshToken = oldToken ? getRefreshToken() : null;
    refreshing = request<{
      tokens?: { accessToken: string; refreshToken?: string };
    }>(
      "/api/v1/auth/refresh",
      "POST",
      refreshToken ? { refreshToken, includeLegacyTokens: true } : {},
      false,
    )
      .then(
        (data) => {
          if (oldToken && getAccessToken() === oldToken) {
            if (!data.tokens?.accessToken)
              throw new Error("로그인 갱신 응답을 확인하지 못했습니다.");
            storeTokens(data.tokens);
          }
          return true;
        },
        (error: unknown) => {
          if (error instanceof ApiError && error.status === 401) {
            if (getAccessToken() === oldToken) clearStoredTokens();
            return false;
          }
          throw error;
        },
      )
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}
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
        ...(body instanceof FormData
          ? {}
          : { "Content-Type": "application/json" }),
        "X-Requested-With": "O4O-Partner",
        ...(!path.includes("/auth/email/login") ? sessionHeaders() : {}),
      },
      ...(body === undefined
        ? {}
        : { body: body instanceof FormData ? body : JSON.stringify(body) }),
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
    if (await refreshSession()) return request<T>(path, method, body, false);
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
  files: (id: string) =>
    request<MediaFile[]>(`/api/v1/partner-support/spaces/${id}/files`),
  mediaCapabilities: (id: string) =>
    request<{ enabled: boolean; maxFileBytes: number; mimes: string[] }>(
      `/api/v1/partner-support/spaces/${id}/media-capabilities`,
    ),
  upload: (id: string, assetId: string, file: File, previous?: string) => {
    const body = new FormData();
    body.append("file", file);
    return request<MediaFile>(
      `/api/v1/partner-support/spaces/${id}/assets/${assetId}/files${previous ? `/${previous}/versions` : ""}`,
      "POST",
      body,
    );
  },
  removeFile: (id: string, fileId: string) =>
    request<{ cleanupPending: boolean }>(
      `/api/v1/partner-support/spaces/${id}/files/${fileId}`,
      "DELETE",
    ),
  async fileBlob(id: string, fileId: string) {
    const fetchFile = () =>
      fetch(
        `${configuredOrigin}/api/v1/partner-support/spaces/${id}/files/${fileId}`,
        {
          credentials: "include",
          cache: "no-store",
          headers: { "X-Requested-With": "O4O-Partner", ...sessionHeaders() },
        },
      );
    let res = await fetchFile();
    if (res.status === 401) {
      if (!(await refreshSession())) throw new ApiError(401, "UNAUTHENTICATED");
      res = await fetchFile();
    }
    if (!res.ok) {
      const p = await res.json().catch(() => null);
      throw new ApiError(res.status, p?.code || "MEDIA_UNAVAILABLE");
    }
    return res.blob();
  },
  assetVersions: (id: string, assetId: string) =>
    request<
      { id: string; revision: number; createdAt: string; asset: Asset }[]
    >(`/api/v1/partner-support/spaces/${id}/assets/${assetId}/versions`),
  notifications: () =>
    request<Notification[]>("/api/v1/partner-support/notifications"),
  markRead: (id: string, cursor: string) =>
    request(`/api/v1/partner-support/spaces/${id}/read`, "POST", { cursor }),
  async me() {
    const data = await request<{
      user: { id: string; name?: string; displayName?: string };
    }>("/api/v1/auth/me");
    if (!data?.user?.id) throw new ApiError(401, "UNAUTHENTICATED");
    return data.user;
  },
  login: async (email: string, password: string) => {
    const result = await request("/api/v1/auth/email/login", "POST", {
      email,
      password,
      includeLegacyTokens: false,
    });
    clearStoredTokens();
    return result;
  },
  logout: async () => {
    const result = await request("/api/v1/auth/logout", "POST", {});
    clearStoredTokens();
    return result;
  },
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
