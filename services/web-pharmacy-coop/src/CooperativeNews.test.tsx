import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { CooperativeNews, RecentMemberStories } from "./CooperativeNews";
afterEach(cleanup);
const client = (items: unknown[]) => ({
  get: vi.fn(async () => ({
    data: { data: { businessKey: "coop-one", items } },
  })),
  post: vi.fn(),
  patch: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
});
it("keeps products and hidden items out of official news, preserving the curated order and direct links", async () => {
  const api = client([
    { id: "product:one", kind: "product", title: "공급 제품" },
    { id: "content:hidden", kind: "content", title: "숨긴 자료", hidden: true },
    ...[1, 2, 3, 4].map((i) => ({
      id: `content:${i}`,
      kind: "content",
      title: `공식 자료 ${i}`,
    })),
  ]);
  render(
    <MemoryRouter>
      <CooperativeNews
        client={api}
        businessKey="coop-one"
        slug="one"
        operator
        compact
      />
    </MemoryRouter>,
  );
  await screen.findByText("공식 자료 1");
  expect(screen.queryByText("공급 제품")).toBeNull();
  expect(screen.queryByText("숨긴 자료")).toBeNull();
  expect(screen.queryByText("공식 자료 4")).toBeNull();
  expect(screen.getAllByRole("link").map((a) => a.textContent)).toEqual([
    "공식 자료 1",
    "공식 자료 2",
    "공식 자료 3",
  ]);
  expect(screen.getByText("공식 자료 1").getAttribute("href")).toBe(
    "/one/materials?item=content%3A1",
  );
  expect(api.get).toHaveBeenCalledWith(
    "/neture/operator/semi-franchises/coop-one/showcase",
  );
});
it("opens a member's direct official publication link and sanitizes stored markup", async () => {
  const api = client([
    {
      id: "content:one",
      kind: "content",
      title: "운영 안내",
      body: "<p>조합 공식 본문</p><script>window.bad=true</script>",
    },
  ]);
  const view = render(
    <MemoryRouter initialEntries={["/one/materials?item=content%3Aone"]}>
      <CooperativeNews
        client={api}
        businessKey="coop-one"
        slug="one"
        operator={false}
      />
    </MemoryRouter>,
  );
  await screen.findByText("조합 공식 본문");
  expect(view.container.querySelector("script")).toBeNull();
  expect(api.get).toHaveBeenCalledWith(
    "/neture/pharmacy/businesses/coop-one/showcase",
  );
  expect(api.post).not.toHaveBeenCalled();
});
it("does not substitute hidden publications for a stale direct link", async () => {
  const api = client([
    { id: "content:one", kind: "content", title: "숨김", hidden: true },
  ]);
  render(
    <MemoryRouter initialEntries={["/one/materials?item=content%3Aone"]}>
      <CooperativeNews
        client={api}
        businessKey="coop-one"
        slug="one"
        operator
      />
    </MemoryRouter>,
  );
  await screen.findByText("현재 공개된 소식·자료를 찾을 수 없습니다.");
  expect(screen.queryByText("숨김")).toBeNull();
});
it("shows a scoped lookup failure and retries instead of claiming an empty publication list", async () => {
  const api = client([]);
  api.get.mockRejectedValueOnce(new Error("forbidden"));
  render(
    <MemoryRouter>
      <CooperativeNews
        client={api}
        businessKey="coop-one"
        slug="one"
        operator={false}
      />
    </MemoryRouter>,
  );
  await screen.findByRole("alert");
  expect(screen.queryByText("게시된 조합 소식·자료가 없습니다.")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "다시 조회" }));
  await screen.findByText("게시된 조합 소식·자료가 없습니다.");
});
it("loads recent stories only from the resolved business community with a small read-only list", async () => {
  const api = client([]);
  api.get.mockImplementation(async (path: string) => ({
    data: {
      data: path.startsWith("/neture/")
        ? { key: "coop-one", communityKey: "business:one" }
        : [{ id: "story", title: "경영 경험" }],
    },
  }));
  render(
    <MemoryRouter>
      <RecentMemberStories client={api} businessKey="coop-one" slug="one" />
    </MemoryRouter>,
  );
  expect((await screen.findByText("경영 경험")).getAttribute("href")).toBe(
    "/one/community?post=story",
  );
  expect(api.get).toHaveBeenCalledWith(
    "/communities/business%3Aone/forum/posts?page=1&limit=5",
  );
  expect(screen.queryByRole("form")).toBeNull();
  expect(api.post).not.toHaveBeenCalled();
});
