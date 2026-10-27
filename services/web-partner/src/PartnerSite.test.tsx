import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PartnerSite from "./PartnerSite";
import CommunityOperator from "./CommunityOperator";
import { communityApi } from "./community-api";
import { ApiError, partnerApi } from "./api";
vi.mock("./community-api", () => ({
  communityApi: {
    boards: vi.fn(),
    policies: vi.fn(),
    membership: vi.fn(),
    join: vi.fn(),
    list: vi.fn(),
    detail: vi.fn(),
    post: vi.fn(),
    overview: vi.fn(),
    member: vi.fn(),
  },
}));
vi.mock("./api", async (importOriginal) => {
  const real = await importOriginal<typeof import("./api")>();
  return {
    ...real,
    partnerApi: { me: vi.fn(), login: vi.fn(), logout: vi.fn() },
  };
});
vi.mock("./WorkspacePortal", () => ({
  default: () => <div>資料作業空間</div>,
}));
const board = {
  id: "00000000-0000-4000-8000-000000000001",
  name: "자유 소통",
  description: "경험을 나누세요",
  operator_only: false,
  revision: 0,
};
const user = {
  id: "00000000-0000-4000-8000-000000000010",
  displayName: "회원 A",
};
const mount = (path = "/community") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <PartnerSite />
    </MemoryRouter>,
  );
beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(communityApi.boards).mockResolvedValue([board]);
  vi.mocked(communityApi.policies).mockResolvedValue([]);
  vi.mocked(partnerApi.me).mockRejectedValue(
    new ApiError(401, "UNAUTHENTICATED"),
  );
  vi.mocked(communityApi.membership).mockResolvedValue({
    status: null,
    operator: false,
  });
  vi.mocked(communityApi.list).mockResolvedValue({
    items: [],
    count: 0,
    page: 1,
  });
});
afterEach(cleanup);
describe("Partner public entry, login, opt-in and community", () => {
  it("clears the visible member session and operator menu even when server logout fails", async () => {
    vi.mocked(partnerApi.me).mockResolvedValue(user);
    vi.mocked(communityApi.membership).mockResolvedValue({
      status: "active",
      operator: true,
    });
    vi.mocked(partnerApi.logout).mockRejectedValue(
      new ApiError(503, "REQUEST_FAILED"),
    );
    mount();
    await screen.findByRole("link", { name: "운영 관리" });
    fireEvent.click(screen.getByRole("button", { name: "로그아웃" }));
    await screen.findByRole("alert");
    expect(screen.queryByRole("link", { name: "운영 관리" })).toBeNull();
    expect(
      screen.getByRole("link", { name: "로그인", exact: true }),
    ).toBeTruthy();
  });

  it("loads operator data even while a separate global mutation is busy", async () => {
    vi.mocked(communityApi.overview).mockResolvedValue({
      boards: [],
      members: [],
      posts: [],
      reports: [],
      events: [],
    });
    const mutationGate = vi.fn();
    render(<CommunityOperator user={user} busy={true} run={mutationGate} />);
    await screen.findByRole("heading", { name: "신고 목록" });
    expect(communityApi.overview).toHaveBeenCalledTimes(1);
    expect(mutationGate).not.toHaveBeenCalled();
  });
  it("shows an operator load error and supports a manual retry instead of indefinite loading", async () => {
    vi.mocked(communityApi.overview)
      .mockRejectedValueOnce(new Error("조회 일시 실패"))
      .mockResolvedValue({
        boards: [],
        members: [],
        posts: [],
        reports: [],
        events: [],
      });
    render(
      <CommunityOperator
        user={user}
        busy={false}
        run={async (work) => {
          await work();
        }}
      />,
    );
    await screen.findByRole("alert");
    expect(screen.queryByText("운영 자료를 불러오고 있습니다…")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "새로고침" }));
    await screen.findByRole("heading", { name: "신고 목록" });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a public community introduction without implicitly enrolling a visitor", async () => {
    mount();
    await screen.findByText("로그인하고 참여하기");
    expect(screen.getByText("경험을 나누세요")).toBeTruthy();
    expect(communityApi.join).not.toHaveBeenCalled();
    expect(communityApi.list).not.toHaveBeenCalled();
  });
  it("joins only after a signed-in member submits the opt-in form", async () => {
    vi.mocked(partnerApi.me).mockResolvedValue(user);
    vi.mocked(communityApi.join).mockResolvedValue({
      status: "active",
      operator: false,
    });
    mount();
    const check = await screen.findByRole("checkbox");
    expect(check).not.toHaveProperty("checked", true);
    expect(communityApi.join).not.toHaveBeenCalled();
    fireEvent.click(check);
    fireEvent.click(screen.getByRole("button", { name: "커뮤니티 가입하기" }));
    await screen.findByText("파트너 커뮤니티에 가입했습니다.");
    expect(communityApi.join).toHaveBeenCalledWith([]);
    await screen.findByRole("button", { name: "글쓰기" });
  });
  it("does not show a rejoin action to suspended members", async () => {
    vi.mocked(partnerApi.me).mockResolvedValue(user);
    vi.mocked(communityApi.membership).mockResolvedValue({
      status: "suspended",
      operator: false,
    });
    mount();
    await screen.findByText(/현재 커뮤니티 이용 상태/);
    expect(
      screen.queryByRole("button", { name: "커뮤니티 가입하기" }),
    ).toBeNull();
    expect(communityApi.list).not.toHaveBeenCalled();
  });
  it("uses common email login and then independently reads community membership", async () => {
    vi.mocked(partnerApi.me)
      .mockRejectedValueOnce(new ApiError(401, "UNAUTHENTICATED"))
      .mockResolvedValue(user);
    vi.mocked(partnerApi.login).mockResolvedValue({});
    mount("/login");
    await waitFor(() =>
      expect(screen.queryByText("계정 연결을 확인하고 있습니다…")).toBeNull(),
    );
    fireEvent.change(screen.getByLabelText("이메일"), {
      target: { value: "member@example.invalid" },
    });
    fireEvent.change(screen.getByLabelText("비밀번호"), {
      target: { value: "test-only-random-input" },
    });
    fireEvent.click(screen.getByRole("button", { name: "로그인" }));
    await screen.findByRole("button", { name: "커뮤니티 가입하기" });
    expect(partnerApi.login).toHaveBeenCalledWith(
      "member@example.invalid",
      "test-only-random-input",
    );
  });
  it("keeps post input when a save fails and does not navigate optimistically", async () => {
    vi.mocked(partnerApi.me).mockResolvedValue(user);
    vi.mocked(communityApi.membership).mockResolvedValue({
      status: "active",
      operator: false,
    });
    vi.mocked(communityApi.post).mockRejectedValue(
      new ApiError(503, "PARTNER_UNAVAILABLE"),
    );
    mount(`/community/boards/${board.id}`);
    fireEvent.click(await screen.findByRole("button", { name: "글쓰기" }));
    fireEvent.change(screen.getByLabelText("글 제목"), {
      target: { value: "입력을 보존하는 글" },
    });
    fireEvent.change(screen.getByLabelText("글 내용"), {
      target: { value: "저장되지 않은 본문" },
    });
    fireEvent.click(screen.getByRole("button", { name: "글 저장" }));
    await screen.findByRole("alert");
    expect((screen.getByLabelText("글 제목") as HTMLInputElement).value).toBe(
      "입력을 보존하는 글",
    );
    expect(
      (screen.getByLabelText("글 내용") as HTMLTextAreaElement).value,
    ).toBe("저장되지 않은 본문");
  });
  it("renders post content as text and never creates script elements", async () => {
    vi.mocked(partnerApi.me).mockResolvedValue(user);
    vi.mocked(communityApi.membership).mockResolvedValue({
      status: "active",
      operator: false,
    });
    vi.mocked(communityApi.detail).mockResolvedValue({
      id: board.id,
      board_id: board.id,
      title: "테스트 본문",
      body: "<script>window.bad=true</script>",
      author_id: user.id,
      author_name: "회원 A",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      revision: 0,
      state: "published",
      pinned: false,
      comments: [],
    });
    const result = mount(`/community/posts/${board.id}`);
    await screen.findByText("<script>window.bad=true</script>");
    expect(result.container.querySelector("script")).toBeNull();
  });
  it("does not fetch operator data just because a member opens /operator", async () => {
    vi.mocked(partnerApi.me).mockResolvedValue(user);
    vi.mocked(communityApi.membership).mockResolvedValue({
      status: "active",
      operator: false,
    });
    mount("/operator");
    await screen.findByText(/활성 Partner 회원 자격/);
    expect(communityApi.overview).not.toHaveBeenCalled();
    expect(screen.queryByRole("link", { name: "운영 관리" })).toBeNull();
  });
  it("requires an operator reason and the current member timestamp before suspension", async () => {
    vi.mocked(partnerApi.me).mockResolvedValue(user);
    vi.mocked(communityApi.membership).mockResolvedValue({
      status: "active",
      operator: true,
    });
    const overview = {
      boards: [board],
      posts: [],
      reports: [],
      events: [],
      members: [
        {
          id: board.id,
          name: "대상 회원",
          status: "active",
          updated_at: "2026-10-26T12:00:00.000Z",
          version: "2026-10-26T12:00:00.000000",
        },
      ],
    };
    vi.mocked(communityApi.overview).mockResolvedValue(overview);
    vi.mocked(communityApi.member).mockResolvedValue({});
    mount("/operator");
    fireEvent.click(await screen.findByRole("button", { name: "회원 관리" }));
    fireEvent.click(await screen.findByRole("button", { name: "이용 정지" }));
    expect(communityApi.member).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("처리 사유"), {
      target: { value: "스팸 신고 확인" },
    });
    fireEvent.click(screen.getByRole("button", { name: "조치 적용" }));
    await waitFor(() =>
      expect(communityApi.member).toHaveBeenCalledWith(board.id, {
        status: "suspended",
        reason: "스팸 신고 확인",
        expectedVersion: "2026-10-26T12:00:00.000000",
      }),
    );
  });
});
