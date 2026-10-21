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
function open(path: string, session = admin) {
  const client = {
    get: vi.fn(async () => ({ data: { data: null } })),
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
  expect(within(nav).getByText("조합원 관리").getAttribute("aria-current")).toBe("page");
  expect(screen.queryByText("contents 업무 본문")).toBeNull();
  fireEvent.click(within(nav).getByText("공급 제안 심사"));
  await screen.findByText("proposals 업무 본문");
  expect(screen.queryByText("개인 회원 심사 본문")).toBeNull();
  fireEvent.click(within(nav).getByText("가입 자격·운영자 설정"));
  await screen.findByText("조합 자격 설정 본문");
});
it("keeps the overview light and preserves content editor URLs", async () => {
  const client = open("/one/operator");
  expect(screen.getByText("검증 조합 운영")).toBeTruthy();
  expect(client.get).not.toHaveBeenCalled();
  expect(screen.queryByText("개인 회원 심사 본문")).toBeNull();
  expect(
    client.get.mock.calls.every(([path]) =>
      String(path).startsWith("/home-presentation/"),
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
  await waitFor(() => expect(client.get).toHaveBeenCalledWith("/home-presentation/cooperative/one"));
  expect(
    client.get.mock.calls.every(([path]) =>
      String(path).startsWith("/home-presentation/"),
    ),
  ).toBe(true);
});
