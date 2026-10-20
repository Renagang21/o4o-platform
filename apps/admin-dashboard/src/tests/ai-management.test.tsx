import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AiManagement from "../pages/settings/AiManagement";
import { unifiedApi } from "../api/unified-client";

vi.mock("../api/unified-client", () => ({
  unifiedApi: { raw: { get: vi.fn(), put: vi.fn() } },
}));
const get = vi.mocked(unifiedApi.raw.get);
const reply = (data: unknown) => ({ data: { success: true, data } });
const item = (id: string, name: string, group = "store") => ({
  id,
  name,
  group,
  evidenceId: "A20",
  capability: "번역",
  selection: "scope",
  accounting: "connected",
  stop: "scope",
  scope: "CONTENT_TRANSLATION",
  note: "콘텐츠와 상담 번역은 같은 정책을 공유합니다.",
  application: "unverified",
  configuration: {
    state: "stored",
    model: "fixture-translation",
    provider: "openai",
    enabled: false,
    description: "저장값이며 적용은 미확인입니다.",
  },
});
const snapshot = () => ({
  observedAt: "2026-10-20T02:00:00.000Z",
  notice: "설정 조회이며 실행 적용은 미확인입니다.",
  queryPolicyRead: "read",
  scopePolicyRead: "read",
  groups: [
    { id: "shared", name: "서비스 공통", serviceKey: null },
    { id: "store", name: "매장 공통", serviceKey: null },
  ],
  usages: [
    item("service.query", "공통 질문·요약", "shared"),
    item("store.translation", "매장 콘텐츠 번역"),
    item("pharmacy.consultation", "약국 상담 번역"),
  ],
  providers: [
    {
      id: "gemini",
      name: "Google Gemini",
      support: "텍스트",
      credential: "present",
      databaseRead: "read",
      models: ["fixture-code-model"],
      modelSource: "code",
    },
  ],
  nonApiItems: [
    { name: "유료 음성 인식", status: "도입 예정", note: "유료 API 연결 예정" },
  ],
});
const total = {
  records: 2,
  successes: 1,
  errors: 1,
  unpriced: 1,
  unmetered: 1,
  input: 4,
  output: 5,
  cost: "0.00000001",
};
const usage = () => ({
  period: {
    days: 7,
    timezone: "Asia/Seoul",
    from: "2026-10-13T15:00:00.000Z",
    to: "2026-10-20T02:00:00.000Z",
  },
  coverage: "partial",
  notice: "기록된 건만 집계하며 전체 비용이 아닙니다.",
  total,
  groups: [
    {
      ...total,
      provider: "gemini",
      model: "fixture-model",
      scope: "CONTENT_TRANSLATION",
      relatedUsages: ["매장 콘텐츠 번역", "약국 상담 번역"],
    },
  ],
});
const renderPage = () =>
  render(
    <MemoryRouter>
      <AiManagement />
    </MemoryRouter>,
  );
beforeEach(() => vi.resetAllMocks());

describe("AI usage inventory and connection status", () => {
  it("loads the admin endpoint, filters by names and area, opens a shared policy detail without writes", async () => {
    get.mockResolvedValue(reply(snapshot()));
    renderPage();
    await screen.findByRole("heading", { name: "AI 운영 관리" });
    expect(get).toHaveBeenCalledWith("/ai/admin/management");
    expect(screen.getByText("3개 항목")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("서비스·업무 영역"), {
      target: { value: "store" },
    });
    expect(screen.getByText("2개 항목")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("기능·모델 검색"), {
      target: { value: "상담" },
    });
    expect(
      screen.queryByRole("button", { name: "공통 질문·요약" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "약국 상담 번역" }));
    const detail = screen.getByRole("region", { name: "약국 상담 번역 상세" });
    expect(within(detail).getByText(/같은 정책을 공유/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "공통 질의 설정으로 이동" }),
    ).toHaveAttribute("href", "/settings/ai-query");
    expect(unifiedApi.raw.put).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("button", { name: "설정 저장" }),
    ).not.toBeInTheDocument();
  });

  it("shows partial policy read errors and absent configuration rather than a fallback success", async () => {
    const data = snapshot();
    data.queryPolicyRead = "unavailable";
    data.usages[0].configuration = {
      state: "unavailable",
      model: null,
      provider: null,
      enabled: null,
      description: "조회 실패",
    } as any;
    get.mockResolvedValue(reply(data));
    renderPage();
    await screen.findByRole("alert");
    expect(screen.getAllByText("설정 조회 실패").length).toBeGreaterThan(0);
    expect(screen.queryByText("적용 완료")).not.toBeInTheDocument();
    expect(screen.getByText(/현재는 조회 기능/)).toBeInTheDocument();
  });

  it("shows an empty filtered list and separates planned features", async () => {
    get.mockResolvedValue(reply(snapshot()));
    renderPage();
    await screen.findByRole("heading", { name: "AI 운영 관리" });
    fireEvent.change(screen.getByLabelText("기능·모델 검색"), {
      target: { value: "없는 항목" },
    });
    expect(
      screen.getByText("선택한 조건의 사용처가 없습니다."),
    ).toBeInTheDocument();
    expect(screen.getByText("유료 음성 인식").closest("li")).toHaveTextContent(
      "도입 예정",
    );
  });

  it("shows provider metadata as unverified code models, not live availability or successful authentication", async () => {
    get.mockResolvedValue(reply(snapshot()));
    renderPage();
    await screen.findByRole("heading", { name: "AI 운영 관리" });
    fireEvent.click(screen.getByRole("tab", { name: "API·모델 연결" }));
    expect(screen.getByText("연결 정보 있음")).toBeInTheDocument();
    expect(screen.getByText("fixture-code-model")).toBeInTheDocument();
    expect(
      screen.getByText(/실시간 공급자 목록이 아닙니다/),
    ).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/key/i)).not.toBeInTheDocument();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it("discards a malformed response and recovers on explicit retry", async () => {
    get
      .mockResolvedValueOnce(reply({}))
      .mockResolvedValueOnce(reply(snapshot()));
    renderPage();
    await screen.findByRole("alert");
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 불러오기" }));
    await screen.findByRole("heading", { name: "AI 운영 관리" });
    expect(get).toHaveBeenCalledTimes(2);
  });
});

describe("recorded usage UI", () => {
  it("loads only when selected, shows incomplete pricing, and requests the selected bounded period", async () => {
    get
      .mockResolvedValueOnce(reply(snapshot()))
      .mockResolvedValueOnce(reply(usage()));
    renderPage();
    await screen.findByRole("heading", { name: "AI 운영 관리" });
    expect(get).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("tab", { name: "사용량·비용" }));
    await screen.findByText("비용 미집계 기록");
    expect(get).toHaveBeenLastCalledWith("/ai/admin/management/usage?days=7");
    expect(screen.getByText(/토큰 정보 누락 1건/)).toBeInTheDocument();
    expect(
      screen.getByText("매장 콘텐츠 번역 · 약국 상담 번역"),
    ).toBeInTheDocument();
    const pending = new Promise<any>(() => {});
    get.mockReturnValueOnce(pending);
    fireEvent.change(screen.getByLabelText("조회 기간"), {
      target: { value: "30" },
    });
    await waitFor(() =>
      expect(get).toHaveBeenLastCalledWith(
        "/ai/admin/management/usage?days=30",
      ),
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "사용량을 불러오는 중",
    );
    expect(screen.queryByText("비용 미집계 기록")).not.toBeInTheDocument();
  });

  it("shows an error rather than zeros and recovers on retry", async () => {
    get
      .mockResolvedValueOnce(reply(snapshot()))
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(reply(usage()));
    renderPage();
    await screen.findByRole("heading", { name: "AI 운영 관리" });
    fireEvent.click(screen.getByRole("tab", { name: "사용량·비용" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "0건으로 판단할 수 없습니다",
    );
    expect(screen.queryByText("0.00000000")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "다시 조회" }));
    await screen.findByText("비용 미집계 기록");
  });

  it("labels empty recorded usage without claiming zero service-wide AI usage", async () => {
    const data = usage();
    data.groups = [];
    data.total = {
      records: 0,
      successes: 0,
      errors: 0,
      unpriced: 0,
      unmetered: 0,
      input: 0,
      output: 0,
      cost: "0.00000000",
    };
    get
      .mockResolvedValueOnce(reply(snapshot()))
      .mockResolvedValueOnce(reply(data));
    renderPage();
    await screen.findByRole("heading", { name: "AI 운영 관리" });
    fireEvent.click(screen.getByRole("tab", { name: "사용량·비용" }));
    expect(
      await screen.findByText(
        /전체 서비스에서 AI를 사용하지 않았다는 뜻은 아닙니다/,
      ),
    ).toBeInTheDocument();
  });

  it("ignores a stale usage response after switching periods", async () => {
    let resolveOld!: (value: any) => void;
    get
      .mockResolvedValueOnce(reply(snapshot()))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveOld = resolve;
          }),
      )
      .mockResolvedValueOnce(
        reply({ ...usage(), period: { ...usage().period, days: 30 } }),
      );
    renderPage();
    await screen.findByRole("heading", { name: "AI 운영 관리" });
    fireEvent.click(screen.getByRole("tab", { name: "사용량·비용" }));
    fireEvent.change(screen.getByLabelText("조회 기간"), {
      target: { value: "30" },
    });
    await screen.findByText("비용 미집계 기록");
    resolveOld(reply({ ...usage(), notice: "STALE-RESPONSE" }));
    await waitFor(() =>
      expect(screen.queryByText("STALE-RESPONSE")).not.toBeInTheDocument(),
    );
    expect(screen.getByLabelText("조회 기간")).toHaveValue("30");
  });
});
