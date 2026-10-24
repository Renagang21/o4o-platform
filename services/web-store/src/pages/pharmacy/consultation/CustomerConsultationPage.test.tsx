import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("../../../api/client", () => ({
  coreApiClient: { get: vi.fn(), post: vi.fn() },
}));
import Page from "./CustomerConsultationPage";
const id = "11111111-1111-4111-8111-111111111111",
  token = "a".repeat(64);
const state = (epoch = "epoch-1", version = 1) => ({
  id,
  name: "Fixture counter",
  epoch,
  version,
  state: "active",
  language: "ko",
  languages: [{ key: "ko", label: "한국어" }],
  shared: {
    kind: "translation",
    title: "상담 안내",
    text: "Confirmed guidance",
    language: "ko",
  },
});
const ok = (data: unknown) =>
  Promise.resolve({ ok: true, json: async () => ({ success: true, data }) });
const requests = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  localStorage.setItem(
    "o4o:consultation-customer-device:v1",
    JSON.stringify({ id, name: "Fixture counter", token }),
  );
  vi.stubGlobal("fetch", requests);
  requests.mockImplementation(() => ok(state()));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("uses a separate capability without login cookies or store headers and never persists consultation text", async () => {
  render(<Page />);
  await screen.findByText("Confirmed guidance");
  expect(requests.mock.calls[0][0]).toContain("/consultation-device/read");
  const options = requests.mock.calls[0][1];
  expect(options.credentials).toBe("omit");
  expect(options.cache).toBe("no-store");
  expect(options.headers).toEqual({ "Content-Type": "application/json" });
  expect(JSON.parse(options.body)).toEqual({ id, token });
  fireEvent.change(screen.getByLabelText("전달할 내용"), {
    target: { value: "Private reply" },
  });
  expect(
    localStorage.getItem("o4o:consultation-customer-device:v1"),
  ).not.toContain("Private reply");
  expect(
    localStorage.getItem("o4o:consultation-customer-device:v1"),
  ).not.toContain("Confirmed guidance");
});
it("clears old guidance on failed lookup, retains the device for retry, and revokes it on authorization failure", async () => {
  render(<Page />);
  await screen.findByText("Confirmed guidance");
  requests.mockRejectedValueOnce(new Error("offline"));
  fireEvent.click(screen.getByText("기기 연결 설정"));
  // pageshow is a new read generation, including a browser back/forward restoration.
  fireEvent(window, new Event("pageshow"));
  await screen.findByText("offline");
  expect(screen.queryByText("Confirmed guidance")).toBeNull();
  expect(localStorage.getItem("o4o:consultation-customer-device:v1")).toContain(
    token,
  );
  requests.mockImplementationOnce(async () => ({
    ok: false,
    status: 403,
    json: async () => ({ success: false, error: "access revoked" }),
  }));
  fireEvent.click(screen.getByRole("button", { name: "다시 연결 확인" }));
  await screen.findByText("고객 화면 연결");
  expect(
    localStorage.getItem("o4o:consultation-customer-device:v1"),
  ).toBeNull();
});
it("ignores an old reply completion after the device has been forgotten", async () => {
  let finish!: (value: unknown) => void;
  render(<Page />);
  await screen.findByText("Confirmed guidance");
  requests.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  fireEvent.change(screen.getByLabelText("전달할 내용"), {
    target: { value: "Reply in flight" },
  });
  fireEvent.click(screen.getByRole("button", { name: "직원에게 전달" }));
  fireEvent.click(screen.getByText("기기 연결 설정"));
  fireEvent.click(
    screen.getByRole("button", { name: "이 브라우저의 연결 지우기" }),
  );
  await act(async () => finish(await ok({ sent: true })));
  expect(screen.queryByText("직원에게 전달했습니다.")).toBeNull();
  expect(screen.queryByText("Confirmed guidance")).toBeNull();
});
it("pairing prevents duplicate clicks and preserves a failed code", async () => {
  localStorage.clear();
  let fail!: (reason: Error) => void;
  requests.mockImplementationOnce(
    () =>
      new Promise((_resolve, reject) => {
        fail = reject;
      }),
  );
  render(<Page />);
  fireEvent.change(screen.getByLabelText("고객 화면 연결 코드"), {
    target: { value: "ABCDE-12345" },
  });
  const button = screen.getByRole("button", { name: "연결하기" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(requests).toHaveBeenCalledTimes(1);
  await act(async () => fail(new Error("failed code")));
  await screen.findByText("failed code");
  expect(
    (screen.getByLabelText("고객 화면 연결 코드") as HTMLInputElement).value,
  ).toBe("ABCDE-12345");
});
it("clears a previous customer draft when a fresh consultation generation arrives", async () => {
  render(<Page />);
  await screen.findByText("Confirmed guidance");
  fireEvent.change(screen.getByLabelText("전달할 내용"), {
    target: { value: "Previous customer" },
  });
  requests.mockImplementationOnce(() =>
    ok({ ...state("epoch-2", 4), shared: null }),
  );
  fireEvent(window, new Event("pageshow"));
  await waitFor(() =>
    expect(
      (screen.getByLabelText("전달할 내용") as HTMLTextAreaElement).value,
    ).toBe(""),
  );
  expect(screen.queryByText("Confirmed guidance")).toBeNull();
});

it("preserves an unsent reply across a transient read failure only for the same consultation epoch", async () => {
  render(<Page />);
  await screen.findByText("Confirmed guidance");
  fireEvent.change(screen.getByLabelText("전달할 내용"), {
    target: { value: "Unsent current reply" },
  });
  requests.mockRejectedValueOnce(new Error("temporary outage"));
  fireEvent(window, new Event("pageshow"));
  await screen.findByText("temporary outage");
  expect(screen.queryByLabelText("전달할 내용")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "다시 연결 확인" }));
  await waitFor(() =>
    expect(
      (screen.getByLabelText("전달할 내용") as HTMLTextAreaElement).value,
    ).toBe("Unsent current reply"),
  );
  requests.mockImplementationOnce(() => ok(state("new-customer", 7)));
  fireEvent(window, new Event("pageshow"));
  await waitFor(() =>
    expect(
      (screen.getByLabelText("전달할 내용") as HTMLTextAreaElement).value,
    ).toBe(""),
  );
});

it("uses native Japanese controls and makes source-language fallback explicit", async () => {
  requests.mockImplementation(() =>
    ok({
      ...state(),
      language: "ja",
      languages: [
        { key: "ko", label: "한국어" },
        { key: "ja", label: "日本語" },
      ],
      shared: {
        kind: "guidance",
        title: "Fixture product",
        text: "한국어 원문",
        language: "ko",
        requestedLanguage: "ja",
        fallbackUsed: true,
        publicKey: "source-key",
        source: { title: "게시 자료", language: "ko" },
      },
    }),
  );
  render(<Page />);
  await screen.findByRole("heading", { name: "お客様のご相談" });
  expect(screen.getByRole("button", { name: "スタッフに送信" })).toBeTruthy();
  expect(screen.getByText(/選択した言語の資料がない/)).toBeTruthy();
  expect(
    screen.getByRole("link", { name: "商品説明 ↗" }).getAttribute("href"),
  ).toContain("?locale=ja");
});
it("keeps an unsent reply in its original input language when staff changes the target language", async () => {
  render(<Page />);
  await screen.findByText("Confirmed guidance");
  fireEvent.change(screen.getByLabelText("전달할 내용"), {
    target: { value: "아직 보내지 않은 답변" },
  });
  requests.mockImplementationOnce(() =>
    ok({
      ...state(),
      language: "ja",
      languages: [
        { key: "ko", label: "한국어" },
        { key: "ja", label: "日本語" },
      ],
    }),
  );
  fireEvent(window, new Event("pageshow"));
  await screen.findByText("Confirmed guidance");
  expect(
    (screen.getByLabelText("伝える内容") as HTMLTextAreaElement).value,
  ).toBe("아직 보내지 않은 답변");
  fireEvent.click(screen.getByRole("button", { name: "スタッフに送信" }));
  await screen.findByText("スタッフに送信しました。");
  const reply = requests.mock.calls.find(call => String(call[0]).endsWith("/reply"));
  expect(JSON.parse(reply![1].body).language).toBe("ko");
  expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("ja");
});
