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
import { initialHomePresentation } from "../../../packages/types/src/home-presentation";
import { App } from "./App";
import { anonymousSession, type SessionSnapshot } from "./domain";
vi.mock("./Management", () => ({
  FederationManagementPanel: () => <p>연합회 업무</p>,
  MemberManagementPanel: () => <p>조합 업무</p>,
  MembershipApplication: () => null,
  AffiliationApplication: () => null,
  PersonalHistory: () => null,
  WithdrawalRequest: () => null,
  MyAffiliations: () => null,
}));
vi.mock("./CooperativeBusinessOperator", () => ({
  default: () => <p>자료 업무</p>,
}));
vi.spyOn(window, "scrollTo").mockImplementation(() => {});
afterEach(cleanup);
const cooperatives = ["alpha", "beta"].map((slug) => ({
  id: slug,
  slug,
  businessKey: `coop-${slug}`,
  name: `${slug} 조합`,
  introduction: "조합 소개",
  eligibilityDescription: "가입 자격",
}));
const config = initialHomePresentation("cooperative");
function open(path: string, session: SessionSnapshot) {
  const client = {
    get: vi.fn(async (path: string) => ({
      data: {
        success: true,
        data: path.endsWith("/manage")
          ? { revision: 0, draft: config, published: null }
          : null,
      },
    })),
    put: vi.fn(async (_path: string, body: any) => ({
      data: {
        success: true,
        data: {
          revision: 1,
          draft: body.config,
          published: body.publish ? body.config : null,
        },
      },
    })),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  };
  const view = render(
    <MemoryRouter initialEntries={[path]}>
      <App
        cooperatives={cooperatives}
        session={session}
        businessClient={client}
      />
    </MemoryRouter>,
  );
  return { ...view, client };
}
const local: SessionSnapshot = {
  ...anonymousSession,
  userId: "operator-a",
  cooperativeOperators: [
    { userId: "operator-a", cooperativeId: "alpha", role: "operator" },
  ],
};
const federation: SessionSnapshot = {
  ...anonymousSession,
  userId: "federation",
  federationOperators: [{ userId: "federation", role: "operator" }],
};
it("조합 operator가 자기 조합 Hero를 수정·공개하고 URL 범위로 저장한다", async () => {
  const { client } = open("/alpha/operator/home-presentation", local);
  await screen.findByRole("button", { name: "초안 저장" });
  const section = screen.getByRole("region", { name: "Hero 안내 편집" });
  await waitFor(() =>
    expect(within(section).getAllByLabelText("제목")[0]).toBeTruthy(),
  );
  fireEvent.change(within(section).getAllByLabelText("제목")[0], {
    target: { value: "alpha 새 소식" },
  });
  fireEvent.click(screen.getByRole("button", { name: "공개 반영" }));
  await screen.findByText("공개 화면에 반영했습니다.");
  expect(client.put).toHaveBeenCalledWith(
    "/home-presentation/cooperative/alpha/manage",
    expect.objectContaining({
      revision: 0,
      publish: true,
      config: expect.objectContaining({
        slides: [expect.objectContaining({ title: "alpha 새 소식" })],
      }),
    }),
  );
});
it.each([local, federation, anonymousSession])(
  "다른 조합·연합회·비로그인으로 beta 편집 API를 읽지 않는다",
  async (session) => {
    const { client } = open("/beta/operator/home-presentation", session);
    expect(screen.getByText("이 조합의 운영 권한이 필요합니다.")).toBeTruthy();
    await waitFor(() =>
      expect(client.get).toHaveBeenCalledWith(
        "/home-presentation/cooperative/beta",
      ),
    );
    expect(client.get.mock.calls.some(([p]) => p.startsWith("/home-presentation/") && p.endsWith("/manage"))).toBe(
      false,
    );
    expect(client.put).not.toHaveBeenCalled();
  },
);
it("연합회 operator는 연합회 Hero 관리에 진입한다", async () => {
  const { client } = open("/operator/home-presentation", federation);
  await waitFor(() =>
    expect(client.get).toHaveBeenCalledWith(
      "/home-presentation/pharmcoop/manage",
    ),
  );
  expect(
    await screen.findByRole("heading", { name: "Hero · 광고 관리" }),
  ).toBeTruthy();
});
it("조합 operator 역할만으로 연합회 Hero에 접근할 수 없다", () => {
  const { client } = open("/operator/home-presentation", local);
  expect(screen.getByText("연합회 운영 권한이 필요합니다.")).toBeTruthy();
  expect(client.get.mock.calls.every(([path])=>path === "/notifications/unread-count?serviceKey=pharmcoop")).toBe(true);
});
it.each([
  ["/operator", federation, "/operator/home-presentation"],
  ["/alpha/operator", local, "/alpha/operator/home-presentation"],
] as const)(
  "운영 메뉴 %s에 담당 Hero 링크를 제공한다",
  (path, session, target) => {
    open(path, session);
    expect(
      screen.getByRole("link", { name: "Hero 관리" }).getAttribute("href"),
    ).toBe(target);
  },
);
