import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { ServiceOperatorManagement as Panel } from "./ServiceOperatorManagement";
const person = {
  userId: "target",
  name: "대상",
  email: "target@example.invalid",
  membershipStatus: "active",
  hasGoogleLink: true,
};
const snapshot = (operators: unknown[] = [], candidates: unknown[] = []) => ({
  data: {
    data: { role: "funding:operator", operators, candidates, truncated: false },
  },
});
function deferred() {
  let resolve!: (v: any) => void;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
}
const managementGet = vi.fn();
const api = { get: vi.fn(), post: vi.fn(), delete: vi.fn() };
beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(window, "confirm").mockReturnValue(true);
  managementGet.mockResolvedValue(snapshot());
  api.get.mockImplementation((path: string) => path.startsWith("/service-operator-invitations/") ? Promise.resolve({ data: { data: [] } }) : managementGet(path));
  api.post.mockResolvedValue({ data: { data: {} } });
  api.delete.mockResolvedValue({ data: { data: {} } });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
async function show() {
  render(<Panel client={api} scope="funding" />);
  await screen.findByText("지정된 Operator가 없습니다.");
}
async function search() {
  fireEvent.change(screen.getByLabelText("운영자 검색"), {
    target: { value: "대상" },
  });
  fireEvent.click(screen.getByRole("button", { name: "검색" }));
  await screen.findByText("활성 서비스 회원 검색 결과");
}
it("searches only the selected scope and sends userId without role overrides", async () => {
  await show();
  managementGet.mockResolvedValueOnce(snapshot([], [person]));
  await search();
  fireEvent.click(screen.getByRole("button", { name: "초대" }));
  await waitFor(() =>
    expect(api.post).toHaveBeenCalledWith(
      "/service-operator-management/funding/operators/target",
      {},
    ),
  );
  expect(await screen.findByRole("status")).toHaveProperty(
    "textContent",
    "운영자 초대 메일을 보냈습니다. 본인 수락 후 권한이 활성화됩니다.",
  );
});
it("an email-only active member can receive a consent invitation", async () => {
  await show();
  managementGet.mockResolvedValueOnce(
    snapshot([], [{ ...person, hasGoogleLink: false }]),
  );
  await search();
  expect(
    (screen.getByRole("button", { name: "초대" }) as HTMLButtonElement)
      .disabled,
  ).toBe(false);
});
it("cancelled confirmation sends no mutation", async () => {
  await show();
  managementGet.mockResolvedValueOnce(snapshot([], [person]));
  await search();
  vi.mocked(window.confirm).mockReturnValue(false);
  fireEvent.click(screen.getByRole("button", { name: "초대" }));
  expect(api.post).not.toHaveBeenCalled();
});
it("duplicate clicks send one mutation and preserve the search on failure", async () => {
  await show();
  managementGet.mockResolvedValueOnce(snapshot([], [person]));
  await search();
  const d = deferred();
  api.post.mockReturnValue(d.promise);
  const button = screen.getByRole("button", { name: "초대" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(api.post).toHaveBeenCalledTimes(1);
  await act(async () =>
    d.resolve(
      Promise.reject({
        response: { data: { error: "권한이 해제되었습니다." } },
      }),
    ),
  );
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "권한이 해제되었습니다.",
  );
  expect((screen.getByLabelText("운영자 검색") as HTMLInputElement).value).toBe(
    "대상",
  );
});
it("success with a failed refresh preserves success and removes stale action buttons", async () => {
  await show();
  managementGet.mockResolvedValueOnce(snapshot([], [person]));
  await search();
  managementGet.mockRejectedValueOnce(new Error("조회 실패"));
  fireEvent.click(screen.getByRole("button", { name: "초대" }));
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "조회 실패",
  );
  expect(screen.getByRole("status").textContent).toContain("초대 메일을 보냈습니다");
  expect(screen.queryByRole("button", { name: "초대" })).toBeNull();
});
it("a later search wins over an older response", async () => {
  await show();
  const old = deferred();
  managementGet
    .mockReturnValueOnce(old.promise)
    .mockResolvedValueOnce(snapshot([], [person]));
  fireEvent.change(screen.getByLabelText("운영자 검색"), {
    target: { value: "이전" },
  });
  fireEvent.click(screen.getByRole("button", { name: "검색" }));
  fireEvent.change(screen.getByLabelText("운영자 검색"), {
    target: { value: "대상" },
  });
  fireEvent.click(screen.getByRole("button", { name: "검색" }));
  await screen.findByRole("button", { name: "초대" });
  await act(async () => old.resolve(snapshot([], [])));
  expect(screen.getByRole("button", { name: "초대" })).toBeTruthy();
});
it("changing scope discards the previous service response", async () => {
  const old = deferred();
  managementGet.mockReturnValueOnce(old.promise).mockResolvedValueOnce(snapshot());
  const view = render(<Panel client={api} scope="funding" />);
  view.rerender(<Panel client={api} scope="supplier" />);
  await screen.findByText("지정된 Operator가 없습니다.");
  await act(async () => old.resolve(snapshot([person])));
  expect(screen.queryByRole("button", { name: "해제" })).toBeNull();
  expect(api.get).toHaveBeenCalledWith("/service-operator-management/supplier");
});
it("revokes suspended operators without exposing admin removal", async () => {
  managementGet.mockResolvedValueOnce(
    snapshot([{ ...person, membershipStatus: "suspended" }]),
  );
  render(<Panel client={api} scope="funding" />);
  fireEvent.click(await screen.findByRole("button", { name: "해제" }));
  await waitFor(() =>
    expect(api.delete).toHaveBeenCalledWith(
      "/service-operator-management/funding/operators/target",
    ),
  );
});
