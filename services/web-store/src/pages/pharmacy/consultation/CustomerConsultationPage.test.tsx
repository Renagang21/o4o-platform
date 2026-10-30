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

it.each([null, { kind: "guidance", title: "New guidance", text: "Replacement material", language: "ko" }])("stops old speech on shared replacement/withdrawal while retaining an unsent reply: %j", async (shared) => {
  vi.useFakeTimers();
  const synth = { cancel: vi.fn(), speak: vi.fn(), getVoices: () => [] };
  vi.stubGlobal("speechSynthesis", synth);
  vi.stubGlobal("SpeechSynthesisUtterance", class { constructor(public text: string) {} });
  try {
    render(<Page />);
    await act(async () => {});
    fireEvent.change(screen.getByLabelText("전달할 내용"), { target: { value: "Unsent draft" } });
    fireEvent.click(screen.getByRole("button", { name: "읽어주기" }));
    expect(synth.speak).toHaveBeenCalledTimes(1);
    await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
    expect(synth.cancel).not.toHaveBeenCalled();
    requests.mockImplementationOnce(() => ok({ ...state(), version: 2, shared }));
    await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
    expect(synth.cancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "읽기 중지" })).toBeNull();
    expect((screen.getByLabelText("전달할 내용") as HTMLTextAreaElement).value).toBe("Unsent draft");
  } finally { cleanup(); vi.useRealTimers(); }
});

it.each([401, 403])('immediately revokes customer display, draft and credential after reply %s and rejects a late read', async (status) => {
  vi.useFakeTimers();
  try {
    render(<Page />); await act(async () => {});
    let finishRead!: (value: unknown) => void;
    requests.mockImplementation((url: string) => String(url).endsWith('/read')
      ? new Promise(resolve => { finishRead = resolve; })
      : Promise.resolve({ ok: false, status, json: async () => ({ success: false, error: 'access revoked' }) }));
    await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
    fireEvent.change(screen.getByLabelText('전달할 내용'), { target: { value: 'Private current draft' } });
    fireEvent.click(screen.getByRole('button', { name: '직원에게 전달' }));
    await act(async () => {});
    expect(screen.queryByText('Confirmed guidance')).toBeNull();
    expect(screen.queryByDisplayValue('Private current draft')).toBeNull();
    expect(screen.getByLabelText('고객 화면 연결 코드')).toBeTruthy();
    expect(localStorage.getItem('o4o:consultation-customer-device:v1')).toBeNull();
    await act(async () => finishRead(await ok(state())));
    expect(screen.queryByText('Confirmed guidance')).toBeNull();
  } finally { cleanup(); vi.useRealTimers(); }
});

it.each(['resolve', 'reject'])('ignores previous epoch reply %s including its final unlock while the next customer sends', async (outcome) => {
  vi.useFakeTimers();
  try {
    let current = state();
    const pending: Array<{ resolve: (v: unknown) => void; reject: (e: Error) => void }> = [];
    requests.mockImplementation((url: string) => String(url).endsWith('/reply')
      ? new Promise((resolve, reject) => { pending.push({ resolve, reject }); }) : ok(current));
    render(<Page />); await act(async () => {});
    fireEvent.change(screen.getByLabelText('전달할 내용'), { target: { value: 'Previous customer' } });
    fireEvent.click(screen.getByRole('button', { name: '직원에게 전달' }));
    current = state('next-customer', 4);
    await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
    expect((screen.getByLabelText('전달할 내용') as HTMLTextAreaElement).disabled).toBe(false);
    fireEvent.change(screen.getByLabelText('전달할 내용'), { target: { value: 'Next customer' } });
    const send = screen.getByRole('button', { name: '직원에게 전달' });
    fireEvent.click(send);
    expect(pending).toHaveLength(2);
    await act(async () => { if (outcome === 'resolve') pending[0].resolve(await ok({ sent: true })); else pending[0].reject(Error('old send failed')); });
    expect(screen.queryByText('old send failed')).toBeNull();
    expect(screen.queryByText('직원에게 전달했습니다.')).toBeNull();
    expect((screen.getByLabelText('전달할 내용') as HTMLTextAreaElement).value).toBe('Next customer');
    expect((send as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(send); expect(pending).toHaveLength(2);
    await act(async () => pending[1].resolve(await ok({ sent: true })));
    expect(screen.getByText('직원에게 전달했습니다.')).toBeTruthy();
  } finally { cleanup(); vi.useRealTimers(); }
});

it('retains the device storage warning through new consultations and clears it only with the connection', async () => {
  vi.useFakeTimers();
  localStorage.clear();
  const storage = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw Error('disabled'); });
  try {
    let current = state();
    requests.mockImplementation((url: string) => ok(String(url).endsWith('/claim') ? { id, name: 'Fixture counter', token } : current));
    render(<Page />);
    fireEvent.change(screen.getByLabelText('고객 화면 연결 코드'), { target: { value: 'ABCDE12345' } });
    fireEvent.click(screen.getByRole('button', { name: '연결하기' })); await act(async () => {});
    const warning = '이 브라우저에서는 연결이 저장되지 않습니다. 다음에 다시 연결해 주세요.';
    expect(screen.getByText(warning)).toBeTruthy();
    current = state('next-customer', 3);
    await act(async () => { await vi.advanceTimersByTimeAsync(2500); });
    expect(screen.getByText(warning)).toBeTruthy();
    fireEvent.click(screen.getByText('기기 연결 설정'));
    fireEvent.click(screen.getByRole('button', { name: '이 브라우저의 연결 지우기' }));
    expect(screen.queryByText(warning)).toBeNull();
  } finally { storage.mockRestore(); cleanup(); vi.useRealTimers(); }
});

it('keeps an unsent reply and device connection on a transient send failure', async () => {
  render(<Page />); await screen.findByText('Confirmed guidance');
  fireEvent.change(screen.getByLabelText('전달할 내용'), { target: { value: 'Retry this reply' } });
  requests.mockRejectedValueOnce(Error('temporary send failure'));
  fireEvent.click(screen.getByRole('button', { name: '직원에게 전달' }));
  await screen.findByText('temporary send failure');
  expect((screen.getByLabelText('전달할 내용') as HTMLTextAreaElement).value).toBe('Retry this reply');
  expect(localStorage.getItem('o4o:consultation-customer-device:v1')).toContain(token);
  fireEvent.click(screen.getByRole('button', { name: '직원에게 전달' }));
  await screen.findByText('직원에게 전달했습니다.');
});
