import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const api = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn() }));
vi.mock("@o4o/auth-client", () => ({ authClient: { api } }));
import Panel from "./PharmacyConsultationLayoutsPanel";
const pharmacy = {
  organizationId: "fixture-a",
  name: "Fixture pharmacy",
  operatingType: "standard",
};
const list = (items = [pharmacy]) => ({
  data: { success: true, data: { items, total: items.length, page: 1 } },
});
beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue(list());
});
afterEach(cleanup);
it("preserves a failed selection, blocks duplicate saves, and retries the same value", async () => {
  let reject!: (e: Error) => void;
  api.put.mockImplementationOnce(
    () =>
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
  );
  render(<Panel />);
  const select = await screen.findByLabelText("Fixture pharmacy 상담 배치");
  fireEvent.change(select, { target: { value: "large" } });
  const button = screen.getByRole("button", { name: "저장" });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(api.put).toHaveBeenCalledTimes(1);
  await act(async () => reject(new Error("offline")));
  await screen.findByRole("alert");
  expect((select as HTMLSelectElement).value).toBe("large");
  api.put.mockResolvedValueOnce({
    data: {
      success: true,
      data: { organizationId: pharmacy.organizationId, operatingType: "large" },
    },
  });
  fireEvent.click(screen.getByRole("button", { name: "저장" }));
  await screen.findByText("Fixture pharmacy: 상담 화면 구성을 저장했습니다.");
  expect(api.put.mock.calls[1][1]).toEqual({ operatingType: "large" });
});
it("uses the submitted search and distinguishes a successful empty result", async () => {
  let finish!: (data: unknown) => void;
  api.get.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(<Panel />);
  fireEvent.change(screen.getByLabelText("상담 배치 약국 검색"), {
    target: { value: "New query" },
  });
  // The load button is disabled while loading; a subsequent explicit retry still owns its new generation.
  api.get.mockResolvedValueOnce(list([]));
  await act(async () => finish(list()));
  fireEvent.click(screen.getByRole("button", { name: "찾기" }));
  await screen.findByText("일치하는 활성 약국이 없습니다.");
  expect(screen.queryByLabelText("Fixture pharmacy 상담 배치")).toBeNull();
  expect(
    (screen.getByLabelText("상담 배치 약국 검색") as HTMLInputElement).value,
  ).toBe("New query");
  await waitFor(() =>
    expect(api.get.mock.calls.at(-1)?.[0]).toContain("q=New+query"),
  );
});
