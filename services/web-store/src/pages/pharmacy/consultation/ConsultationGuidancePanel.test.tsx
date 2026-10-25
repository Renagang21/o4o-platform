import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("../../../api/client", () => ({ coreApiClient: api }));
import { ConsultationGuidancePanel } from "./ConsultationGuidancePanel";
const product = {
  id: "product",
  kind: "local",
  name: "Fixture product",
  location: "A-1",
};
const callbacks = {
  onShare: vi.fn(async () => true),
  onVoice: vi.fn(),
  onRead: vi.fn(),
  onStopReading: vi.fn(),
};
const props = {
  organizationId: "store",
  mode: "counter-pharmacist",
  language: "ko",
  supportAllowed: true,
  room: null,
  voice: null,
  ...callbacks,
};
const output = (body: any) => ({
  success: true,
  data: {
    organizationId: "store",
    mode: body.mode,
    language: body.language,
    intent: body.intent,
    state: body.productId || body.intent === "pharmacist" ? "ready" : "clarify",
    message: body.productId ? undefined : "어떤 상품을 안내할까요?",
    ...(body.productId || body.intent === "pharmacist"
      ? {
          card: {
            kind: "guidance",
            title: product.name,
            text: body.useAi ? "질문에 맞는 게시 문단" : "게시된 제품 설명",
            language: body.language,
            requestedLanguage: body.language,
            source: { title: "검토된 원문", language: "ko" },
          },
          deliveryId: "approved-result",
          sourceVersion: "fixture-source-version",
          canTranslate: body.language !== "ko",
          selection: {
            sourceVersion: "fixture-source-version",
            passageIds: body.useAi ? [2] : [1],
          },
        }
      : {}),
  },
});
beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ success: true, data: [product] });
  api.post.mockImplementation(async (_path, body) => output(body));
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});
afterEach(cleanup);
async function selectProduct() {
  fireEvent.click(screen.getByRole("button", { name: "제품 설명" }));
  await screen.findByLabelText("상담 상품 이름");
  fireEvent.change(screen.getByLabelText("상담 상품 이름"), {
    target: { value: "Fixture" },
  });
  fireEvent.click(screen.getByRole("button", { name: "상품 검색" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "이 상품 설명 보기" }),
  );
  await screen.findByText("게시된 제품 설명");
}
it("separates quick tasks and asks for one missing product before resolving published information", async () => {
  render(<ConsultationGuidancePanel {...props} />);
  await selectProduct();
  expect(
    api.post.mock.calls[api.post.mock.calls.length - 1]?.[1],
  ).toMatchObject({
    intent: "product-details",
    productKind: "local",
    productId: "product",
    useAi: false,
  });
  fireEvent.click(screen.getByRole("button", { name: "위치 안내" }));
  await waitFor(() =>
    expect(
      api.post.mock.calls[api.post.mock.calls.length - 1]?.[1],
    ).toMatchObject({
      intent: "location",
      productId: "product",
    }),
  );
  expect(screen.getByText(/지금 안내하는 상품:/).textContent).toContain(
    "Fixture product",
  );
  expect(callbacks.onShare).not.toHaveBeenCalled();
});
it("only calls AI on explicit request and only shares the resulting server-issued confirmation", async () => {
  const room = { id: "station", epoch: "epoch", active: true } as any;
  render(<ConsultationGuidancePanel {...props} room={room} />);
  await selectProduct();
  expect(api.post.mock.calls.every((c) => c[1].useAi === false)).toBe(true);
  fireEvent.change(screen.getByLabelText("상담 안내 요청"), {
    target: { value: "이 상품의 설명을 간단히 알려주세요" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "AI로 관련 문단 추리기" }),
  );
  await screen.findByText("질문에 맞는 게시 문단");
  expect(callbacks.onShare).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "고객 화면에 안내 전달" }),
  );
  await waitFor(() =>
    expect(callbacks.onShare).toHaveBeenCalledWith("approved-result"),
  );
  expect(
    api.post.mock.calls[api.post.mock.calls.length - 1]?.[1],
  ).toMatchObject({
    useAi: true,
    stationId: "station",
    epoch: "epoch",
  });
});
it("keeps product and input after a failure and language correction while rejecting late previous output", async () => {
  const view = render(<ConsultationGuidancePanel {...props} />);
  await selectProduct();
  fireEvent.change(screen.getByLabelText("상담 안내 요청"), {
    target: { value: "보존할 질문" },
  });
  let finish!: (v: unknown) => void;
  api.post.mockImplementationOnce(
    (_path, body) =>
      new Promise((resolve) => {
        finish = () => resolve(output(body));
      }),
  );
  fireEvent.click(
    screen.getByRole("button", { name: "AI로 관련 문단 추리기" }),
  );
  view.rerender(<ConsultationGuidancePanel {...props} language="ja" />);
  await act(async () => finish({}));
  expect(screen.queryByText("질문에 맞는 게시 문단")).toBeNull();
  expect(
    (screen.getByLabelText("상담 안내 요청") as HTMLInputElement).value,
  ).toBe("보존할 질문");
  expect(screen.getByText(/지금 안내하는 상품:/).textContent).toContain(
    "Fixture product",
  );
  api.post.mockRejectedValueOnce(new Error("failed lookup"));
  fireEvent.click(screen.getByRole("button", { name: "제품 설명" }));
  await screen.findByText("failed lookup");
  fireEvent.click(screen.getByRole("button", { name: "같은 안내 다시 준비" }));
  await screen.findByText("게시된 제품 설명");
  expect(
    api.post.mock.calls[api.post.mock.calls.length - 1]?.[1],
  ).toMatchObject({
    language: "ja",
    productId: "product",
    question: "보존할 질문",
  });
});
it("keeps source locale explicit and adds language to the published source link", async () => {
  api.post.mockImplementation(async (_path, body) => {
    const r = output(body);
    if (r.data.card)
      r.data.card = {
        ...r.data.card,
        language: "ko",
        requestedLanguage: "ja",
        fallbackUsed: true,
        publicKey: "published-key",
      } as any;
    return r;
  });
  render(<ConsultationGuidancePanel {...props} language="ja" />);
  await selectProduct();
  expect(
    screen.getByText("일본어 자료가 없어 한국어 원문을 표시합니다."),
  ).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: "게시된 제품 원문 ↗" })
      .getAttribute("href"),
  ).toContain("?locale=ja");
});

it("rechecks source and authorization before showing a local customer dialog", async () => {
  render(<ConsultationGuidancePanel {...props} />);
  await selectProduct();
  api.post.mockRejectedValueOnce(new Error("access revoked"));
  fireEvent.click(
    screen.getByRole("button", { name: "이 화면에서 고객에게 보여주기" }),
  );
  await screen.findByText("access revoked");
  expect(screen.queryByRole("dialog")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "이 화면에서 고객에게 보여주기" }),
  );
  expect(
    await screen.findByRole("dialog", { name: "고객용 상담 안내" }),
  ).toBeTruthy();
});

it("preserves selected passage IDs when translating without another AI request", async () => {
  render(<ConsultationGuidancePanel {...props} language="ja" />);
  await selectProduct();
  fireEvent.change(screen.getByLabelText("상담 안내 요청"), {
    target: { value: "이 문단 설명" },
  });
  fireEvent.click(
    screen.getByRole("button", { name: "AI로 관련 문단 추리기" }),
  );
  await screen.findByText("질문에 맞는 게시 문단");
  fireEvent.click(
    screen.getByRole("button", { name: "선택 언어로 번역 준비" }),
  );
  await waitFor(() =>
    expect(
      api.post.mock.calls[api.post.mock.calls.length - 1][1],
    ).toMatchObject({
      useAi: false,
      translateMaterial: true,
      selection: { sourceVersion: "fixture-source-version", passageIds: [2] },
    }),
  );
});
