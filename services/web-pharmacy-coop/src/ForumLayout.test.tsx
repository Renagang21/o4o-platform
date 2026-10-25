import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { App } from "./App";
import { anonymousSession, type SessionSnapshot } from "./domain";
vi.mock("./Management", () => ({
  FederationManagementPanel: () => <p>산하 조합 심사 본문</p>,
  MemberManagementPanel: () => <p>개인 회원 심사 본문</p>,
  CooperativeSettings: () => <p>조합 자격 설정 본문</p>,
  MembershipApplication: () => null,
  AffiliationApplication: () => null,
  PersonalHistory: () => null,
  WithdrawalRequest: () => null,
  MyAffiliations: () => null,
}));
vi.mock("./CooperativeBusinessOperator", () => ({
  default: ({ task, editor }: { task: string; editor: boolean }) => (
    <p>{editor ? "콘텐츠 편집 본문" : `${task} 업무 본문`}</p>
  ),
}));
vi.spyOn(window, "scrollTo").mockImplementation(() => {});
afterEach(cleanup);
const coop = {
  id: "one",
  slug: "one",
  businessKey: "coop-one",
  name: "검증 조합",
  introduction: "소개",
  eligibilityDescription: "자격",
};
const admin: SessionSnapshot = {
  ...anonymousSession,
  userId: "admin",
  cooperativeOperators: [
    { userId: "admin", cooperativeId: "one", role: "admin" },
  ],
};
function isFrameRead(path: string) {
  return path.startsWith("/cooperation-workflows/cooperative/one/manage?") || path.startsWith("/operator-inbox/") || path === "/notifications/unread-count?serviceKey=pharmcoop" || path.endsWith("/footer-legal");
}
function open(path: string, session = admin) {
  const client = {
    get: vi.fn(async (path: string) => ({ data: { data: path === "/operator-inbox/cooperative/one/manage" ? {
      name: "검증 조합", contact: { pending: 1, oldest: null, deliveryAttention: 0 },
      tasks: [{ key: "cooperative-members", label: "개인 가입 검토", count: 2, oldest: null, available: true }, { key: "withdrawals", label: "개인 탈퇴 요청", count: 1, oldest: null, available: true }],
    } : path.startsWith("/cooperation-workflows/") ? { work: { items: [], total: 0 }, materials: { items: [], total: 0 }, support: { items: [], total: 0, unassigned: 0, overdue: 0 }, subjects: { items: [], total: 0 }, operators: [], summary: { notices: 0, applications: 0 } } : null } })),
    post: vi.fn(),
    patch: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
  render(
    <MemoryRouter initialEntries={[path]}>
      <App cooperatives={[coop]} businessClient={client} session={session} />
    </MemoryRouter>,
  );
  return client;
}
it("mounts just the selected task, follows task links and preserves legacy contents deep links", async () => {
  open("/one/operator?tab=contents");
  await screen.findByText("contents 업무 본문");
  expect(screen.queryByText("개인 회원 심사 본문")).toBeNull();
  const nav = screen.getByRole("navigation", { name: "조합 운영 업무" });
  fireEvent.click(within(nav).getByText("조합원 관리"));
  await screen.findByText("개인 회원 심사 본문");
  expect(
    within(nav).getByText("조합원 관리").getAttribute("aria-current"),
  ).toBe("page");
  expect(screen.queryByText("contents 업무 본문")).toBeNull();
  fireEvent.click(within(nav).getByText("공급 제안 심사"));
  await screen.findByText("proposals 업무 본문");
  expect(screen.queryByText("개인 회원 심사 본문")).toBeNull();
  fireEvent.click(within(nav).getByText("가입 자격·운영자 설정"));
  await screen.findByText("조합 자격 설정 본문");
});
it("keeps the overview light and preserves content editor URLs", async () => {
  const client = open("/one/operator");
  expect(screen.getByRole("region", { name: "협업체 운영 홈" })).toBeTruthy();
  expect(
    client.get.mock.calls.every(([path]) =>
      isFrameRead(String(path)),
    ),
  ).toBe(true);
  expect(screen.queryByText("개인 회원 심사 본문")).toBeNull();
  expect(
    client.get.mock.calls.every(
      ([path]) =>
        String(path).startsWith("/home-presentation/") ||
        isFrameRead(String(path)),
    ),
  ).toBe(true);
  cleanup();
  open("/one/operator/contents/new");
  await screen.findByText("콘텐츠 편집 본문");
  expect(screen.queryByText("개인 회원 심사 본문")).toBeNull();
});
it("does not mount admin settings for local operators, federation staff or another cooperative", () => {
  for (const session of [
    {
      ...admin,
      cooperativeOperators: [
        { userId: "admin", cooperativeId: "one", role: "operator" as const },
      ],
    },
    {
      ...anonymousSession,
      userId: "admin",
      federationOperators: [{ userId: "admin", role: "admin" as const }],
    },
    {
      ...admin,
      cooperativeOperators: [
        { userId: "admin", cooperativeId: "other", role: "admin" as const },
      ],
    },
  ]) {
    open("/one/operator?work=settings", session);
    expect(screen.queryByText("조합 자격 설정 본문")).toBeNull();
    expect(
      screen.queryByRole("link", { name: "가입 자격·운영자 설정" }),
    ).toBeNull();
    cleanup();
  }
});
it("keeps member-only data out of an unaffiliated home and hides operations", async () => {
  const client = open("/one", { ...anonymousSession, userId: "person" });
  expect(
    screen.getByRole("region", { name: "주요 조합 소식·자료" }),
  ).toBeTruthy();
  expect(
    screen.getByRole("region", { name: "최근 조합원 이야기" }),
  ).toBeTruthy();
  expect(screen.queryByRole("link", { name: "운영 화면으로 →" })).toBeNull();
  await waitFor(() =>
    expect(client.get).toHaveBeenCalledWith(
      "/home-presentation/cooperative/one",
    ),
  );
  expect(
    client.get.mock.calls.every(
      ([path]) =>
        String(path).startsWith("/home-presentation/") ||
        isFrameRead(String(path)),
    ),
  ).toBe(true);
});

it("routes personal membership and withdrawal counts to cooperative management and separates business settings", async () => {
  const client = open("/one/operator");
  await screen.findByRole("link", { name: "개인 가입 검토 2건" });
  expect(screen.getByRole("link", { name: "개인 가입 검토 2건" }).getAttribute("href")).toBe("/one/operator?work=members");
  expect(screen.getByRole("link", { name: "개인 탈퇴 요청 1건" }).getAttribute("href")).toBe("/one/operator?work=members");
  expect(client.get.mock.calls.some(([path]) => String(path).includes("/memberships"))).toBe(false);
  const nav = screen.getByRole("navigation", { name: "조합 운영 업무" });
  fireEvent.click(within(nav).getByText("자료 진열·사업 약관"));
  await screen.findByText("settings 업무 본문");
  expect(screen.queryByText("조합 자격 설정 본문")).toBeNull();
});
