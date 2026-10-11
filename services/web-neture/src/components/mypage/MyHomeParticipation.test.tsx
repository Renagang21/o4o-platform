import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { HomeEntryData } from "../../lib/home-entry";
const { get, post, resolveServiceEntryUrl } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  resolveServiceEntryUrl: vi.fn(),
}));
vi.mock("../../lib/apiClient", () => ({
  api: { get, post },
  API_BASE_URL: "https://api.example.test",
}));
vi.mock("../../lib/home-entry", () => ({ resolveServiceEntryUrl }));
vi.mock("../../contexts/AuthContext", () => ({ useAuth: () => ({ logout: vi.fn() }) }));
vi.mock("../../lib/api/communityOperator", () => ({
  listOperatedCommunities: vi.fn(),
}));
import { MyHomeParticipation } from "./MyHomeParticipation";
const data: HomeEntryData = {
  services: [
    {
      key: "lecture",
      name: "Study",
      nameKo: "Study",
      domain: "study.neture.co.kr",
      basePath: "",
      description: "학습",
      joinEnabled: true,
      membership: { status: "active" },
    },
  ],
  stores: [],
  branches: [],
  serviceStates: { supplier: { status: "none", source: "none" } },
};
const enrollment = (id: string, progress?: number) => ({
  id,
  courseId: `course-${id}`,
  course: { title: `수강 ${id}` },
  status: "in_progress",
  progressPercentage: progress,
});
const participation = (id: string) => ({
  id,
  trialId: id,
  trial: { title: `펀딩 ${id}`, status: "recruiting" },
  settlementStatus: "offline_review",
});
const studyResponse = (
  items = [enrollment("first", 0)],
  total = items.length,
) => ({
  data: {
    success: true,
    data: items,
    pagination: { total, totalPages: Math.ceil(total / 10) },
  },
});
const fundingResponse = (items = [participation("first")]) => ({
  data: { success: true, data: items },
});
const app = (
  accountId = "first",
  entry: HomeEntryData | null = data,
  compact = false,
) => (
  <MemoryRouter>
    <MyHomeParticipation accountId={accountId} data={entry} compact={compact} />
  </MemoryRouter>
);
beforeEach(() => {
  get.mockReset();
  post.mockReset();
  resolveServiceEntryUrl.mockReset();
  get.mockImplementation((path: string) =>
    Promise.resolve(path.includes("lms") ? studyResponse() : fundingResponse()),
  );
});
afterEach(cleanup);
it("uses only self-scoped reads and keeps real zero progress distinct from missing progress", async () => {
  get.mockImplementation((path: string) =>
    Promise.resolve(
      path.includes("lms")
        ? studyResponse([enrollment("zero", 0), enrollment("unknown")])
        : fundingResponse(),
    ),
  );
  render(app());
  await screen.findByText("학습 중 · 진도 0%");
  expect(screen.getByText("학습 중 · 진도 정보 없음")).toBeTruthy();
  await screen.findByText("모집 중 · 운영 확인 중");
  expect(get).toHaveBeenCalledWith("/lms/enrollments/me", {
    params: { page: 1, limit: 10 },
  });
  expect(get).toHaveBeenCalledWith(
    "https://api.example.test/api/market-trial/my-participations",
  );
  expect(
    screen
      .getByRole("link", { name: "펀딩 first 펀딩 보기" })
      .getAttribute("href"),
  ).toBe("https://funding.neture.co.kr/market-trial/first");
});
it.each(["pending", "suspended", "withdrawn"])(
  "does not read Study history for %s membership, while Funding remains available",
  async (status) => {
    render(
      app("first", {
        ...data,
        services: [{ ...data.services[0], membership: { status } }],
      }),
    );
    await screen.findByText("펀딩 first");
    expect(get).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Study의 가입·승인 상태/)).toBeTruthy();
    expect(screen.queryByText("수강 이력이 없습니다.")).toBeNull();
  },
);
it("keeps Funding independent of an unavailable service catalog", async () => {
  render(app("first", null));
  await screen.findByText("펀딩 first");
  expect(get).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("수강 이력이 없습니다.")).toBeNull();
});
it("handles server membership revocation without pretending the history is empty", async () => {
  get.mockImplementation((path: string) =>
    path.includes("lms")
      ? Promise.reject({ response: { status: 403 } })
      : Promise.resolve(fundingResponse()),
  );
  render(app());
  await screen.findByText(/Study 이용 권한을 확인/);
  expect(screen.queryByText("수강 이력이 없습니다.")).toBeNull();
  get.mockImplementation((path: string) =>
    Promise.resolve(path.includes("lms") ? studyResponse() : fundingResponse()),
  );
  fireEvent.click(screen.getByRole("button", { name: "다시 확인" }));
  await screen.findByText("수강 first");
});
it("rejects malformed Funding responses, retries, and only then shows an empty history", async () => {
  get.mockImplementation((path: string) =>
    Promise.resolve(
      path.includes("lms") ? studyResponse() : { data: { success: false } },
    ),
  );
  render(app());
  const section = screen.getByRole("region", { name: "Funding 참여 현황" });
  await within(section).findByRole("alert");
  expect(screen.queryByText("참여한 펀딩이 없습니다.")).toBeNull();
  get.mockImplementation((path: string) =>
    Promise.resolve(
      path.includes("lms") ? studyResponse() : fundingResponse([]),
    ),
  );
  fireEvent.click(
    within(section).getByRole("button", { name: "다시 불러오기" }),
  );
  await screen.findByText("참여한 펀딩이 없습니다.");
});
it("pages Study on the server and Funding locally without exposing hidden rows", async () => {
  get.mockImplementation(
    (path: string, options?: { params: { page: number } }) =>
      Promise.resolve(
        path.includes("lms")
          ? studyResponse(
              [enrollment(options?.params.page === 2 ? "page-two" : "first")],
              11,
            )
          : fundingResponse(
              Array.from({ length: 11 }, (_, i) => participation(String(i))),
            ),
      ),
  );
  render(app());
  await screen.findByText("수강 first");
  await screen.findByText("펀딩 0");
  expect(screen.queryByText("펀딩 10")).toBeNull();
  fireEvent.click(
    within(screen.getByRole("region", { name: "Study 학습 현황" })).getByRole(
      "button",
      { name: "다음" },
    ),
  );
  await screen.findByText("수강 page-two");
  expect(screen.queryByText("수강 first")).toBeNull();
  const reads = get.mock.calls.length;
  fireEvent.click(
    within(screen.getByRole("region", { name: "Funding 참여 현황" })).getByRole(
      "button",
      { name: "다음" },
    ),
  );
  expect(screen.getByText("펀딩 10")).toBeTruthy();
  expect(screen.queryByText("펀딩 0")).toBeNull();
  expect(get.mock.calls.length).toBe(reads);
});
it("hides previous account data immediately and ignores its late response", async () => {
  let late!: (response: ReturnType<typeof fundingResponse>) => void;
  get.mockImplementation((path: string) =>
    path.includes("lms")
      ? Promise.resolve(studyResponse())
      : new Promise((resolve) => {
          late = resolve;
        }),
  );
  const { rerender } = render(app());
  await screen.findByText("수강 first");
  const oldReply = late;
  get.mockImplementation(() => new Promise(() => {}));
  rerender(app("second"));
  expect(screen.queryByText("수강 first")).toBeNull();
  oldReply(fundingResponse());
  await Promise.resolve();
  expect(screen.queryByText("펀딩 first")).toBeNull();
});
it("blocks duplicate Study moves and rejects an untrusted destination with a retryable message", async () => {
  let finish!: (href: string) => void;
  resolveServiceEntryUrl.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(app());
  const button = await screen.findByRole("button", {
    name: "수강 first 강의 보기",
  });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(resolveServiceEntryUrl).toHaveBeenCalledTimes(1);
  expect(resolveServiceEntryUrl).toHaveBeenCalledWith(
    "lecture",
    "/courses/course-first",
  );
  finish(
    "https://evil.test/handoff?token=fixture&returnTo=%2Fcourses%2Fcourse-first",
  );
  await screen.findByText(/Study로 이동하지 못했습니다/);
  expect((button as HTMLButtonElement).disabled).toBe(false);
});
it("invalidates pending moves on back navigation and account changes", async () => {
  let finish!: (href: string) => void;
  resolveServiceEntryUrl.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const { rerender } = render(app());
  fireEvent.click(
    await screen.findByRole("button", { name: "수강 first 강의 보기" }),
  );
  const event = new Event("pageshow");
  Object.defineProperty(event, "persisted", { value: true });
  fireEvent(window, event);
  finish("https://evil.test/handoff?token=fixture");
  await Promise.resolve();
  expect(screen.queryByText(/Study로 이동하지 못했습니다/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "수강 first 강의 보기" }));
  rerender(app("second"));
  finish("https://evil.test/handoff?token=fixture");
  await Promise.resolve();
  expect(screen.queryByText(/Study로 이동하지 못했습니다/)).toBeNull();
});


const pendingTerms = { serviceKey: "lecture", documentType: "terms", policyDocumentId: "11111111-1111-4111-8111-111111111111", version: 2, title: "Study fixture terms" };
const blocked = (pending = [pendingTerms]) => ({ response: { status: 428, data: { code: "TERMS_ACCEPTANCE_REQUIRED", pendingPolicyAcceptances: pending } } });
const publicTerms = (version = 2) => ({ data: { data: { id: pendingTerms.policyDocumentId, serviceKey: "lecture", documentType: "terms", version, title: "Study fixture terms", content: "Study fixture body" } } });
it("a Study 428 presents only a resource gate, accepts its exact document, and resumes the history while Funding stays available", async () => {
  let accepted = false;
  get.mockImplementation((path: string) => {
    if (path.includes("/public/")) return Promise.resolve(publicTerms());
    if (path.includes("lms")) return accepted ? Promise.resolve(studyResponse()) : Promise.reject(blocked());
    return Promise.resolve(fundingResponse());
  });
  post.mockImplementation(async () => { accepted = true; return { data: { success: true } }; });
  render(app());
  await screen.findByText("Study fixture body");
  expect(await screen.findByText("펀딩 first")).toBeTruthy();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "동의하고 계속하기" }));
  await screen.findByText("수강 first");
  expect(post).toHaveBeenCalledWith("/auth/policy-acceptances", { serviceKey: "lecture", policyDocumentId: pendingTerms.policyDocumentId, version: 2 });
});
it.each(["changed", "unavailable", "malformed"])("Study %s policy response blocks acceptance and leaves Funding usable", async scenario => {
  get.mockImplementation((path: string) => {
    if (path.includes("/public/")) return scenario === "unavailable" ? Promise.reject(new Error("Unavailable")) : Promise.resolve(publicTerms(3));
    if (path.includes("lms")) return Promise.reject(scenario === "malformed" ? blocked([{ ...pendingTerms, version: 0 }]) : blocked());
    return Promise.resolve(fundingResponse());
  });
  render(app());
  await screen.findByText("펀딩 first");
  if (scenario === "malformed") await screen.findByText(/정보를 불러오지 못했습니다/);
  else {
    const button = await screen.findByRole("button", { name: "동의하고 계속하기" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  }
  expect(post).not.toHaveBeenCalled();
});
it("Funding 428 is handled by the same resource boundary while Study remains readable", async () => {
  const funding = { ...pendingTerms, serviceKey: "funding", title: "Funding fixture terms" };
  let accepted = false;
  get.mockImplementation((path: string) => {
    if (path.includes("/public/")) return Promise.resolve({ data: { data: { ...publicTerms().data.data, serviceKey: "funding", title: funding.title } } });
    if (path.includes("lms")) return Promise.resolve(studyResponse());
    return accepted ? Promise.resolve(fundingResponse()) : Promise.reject(blocked([funding]));
  });
  post.mockImplementation(async () => { accepted = true; return { data: { success: true } }; });
  render(app());
  await screen.findByText("Study fixture body");
  expect(await screen.findByText("수강 first")).toBeTruthy();
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "동의하고 계속하기" }));
  await screen.findByText("펀딩 first");
  expect(post).toHaveBeenCalledWith("/auth/policy-acceptances", { serviceKey: "funding", policyDocumentId: funding.policyDocumentId, version: 2 });
});
it("a stale submission reloads the protected resource and requires the new version again", async () => {
  let version = 2;
  get.mockImplementation((path: string) => {
    if (path.includes("/public/")) return Promise.resolve(publicTerms(version));
    if (path.includes("lms")) return Promise.reject(blocked([{ ...pendingTerms, version }]));
    return Promise.resolve(fundingResponse());
  });
  post.mockImplementation(async () => { version = 3; throw new Error("POLICY_VERSION_MISMATCH"); });
  render(app());
  await screen.findByText("Study fixture body");
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "동의하고 계속하기" }));
  await screen.findByText(/v3/);
  expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(false);
  expect(post).toHaveBeenCalledTimes(1);
});
