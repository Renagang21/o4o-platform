import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { BusinessOperationsPanel } from "./BusinessOperationsPanel";
const client = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  patch: vi.fn(),
}));
vi.mock("./api", () => ({ getPharmacyManagementClient: () => client }));
beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);
const summary = (key = "drugstore", canManagePolicies = false) => ({
  success: true,
  data: {
    businessKey: key,
    businessName: "합성 사업",
    month: new Date()
      .toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })
      .slice(0, 7),
    canManagePolicies,
    stores: [{ id: "store", name: "가입 약국", counts: { "not-found": 3 } }],
  },
});
it("does not add requests until explicitly opened and keeps operator writes hidden", async () => {
  client.get.mockResolvedValue({ data: summary() });
  render(<BusinessOperationsPanel businessKey="drugstore" />);
  expect(client.get).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: "현장 요구 · 사업 약관" }),
  );
  await screen.findByText("가입 약국");
  expect(screen.getByText("3")).toBeTruthy();
  expect(screen.getAllByText("0")).toHaveLength(2);
  expect(screen.getByText(/매장 공통 집계/)).toBeTruthy();
  expect(
    screen.queryByRole("button", { name: "이 사업 법정정보·약관 설정" }),
  ).toBeNull();
});
it("rejects another business response and retries without calling it an empty list", async () => {
  client.get
    .mockResolvedValueOnce({ data: summary("carepharm") })
    .mockResolvedValueOnce({ data: summary() });
  render(<BusinessOperationsPanel businessKey="drugstore" />);
  fireEvent.click(
    screen.getByRole("button", { name: "현장 요구 · 사업 약관" }),
  );
  await screen.findByRole("alert");
  expect(screen.queryByText("현재 조회할 가입 약국이 없습니다.")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "다시 조회" }));
  await screen.findByText("가입 약국");
});
it("drops a previous business response after navigation", async () => {
  let resolve!: (value: unknown) => void;
  client.get
    .mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done;
        }),
    )
    .mockResolvedValueOnce({ data: summary("carepharm") });
  const view = render(<BusinessOperationsPanel businessKey="drugstore" />);
  fireEvent.click(
    screen.getByRole("button", { name: "현장 요구 · 사업 약관" }),
  );
  view.rerender(<BusinessOperationsPanel businessKey="carepharm" />);
  await screen.findByText("가입 약국");
  await act(async () =>
    resolve({
      data: {
        ...summary(),
        data: {
          ...summary().data,
          stores: [{ id: "old", name: "이전 사업 약국", counts: {} }],
        },
      },
    }),
  );
  expect(screen.queryByText("이전 사업 약국")).toBeNull();
});
it("loads admin legal settings using only the selected business adapter", async () => {
  client.get.mockImplementation(async (path: string) => ({
    data: path.endsWith("/staff-demands")
      ? summary("drugstore", true)
      : { success: true, data: path.endsWith("/policies") ? [] : null },
  }));
  render(<BusinessOperationsPanel businessKey="drugstore" />);
  fireEvent.click(
    screen.getByRole("button", { name: "현장 요구 · 사업 약관" }),
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "이 사업 법정정보·약관 설정" }),
  );
  await screen.findByRole("heading", { name: "합성 사업 법정정보·약관" });
  expect(
    client.get.mock.calls.some(
      ([path]) =>
        path ===
        "/neture/operator/semi-franchises/drugstore/legal/legal-profile",
    ),
  ).toBe(true);
  expect(
    client.get.mock.calls.every(([path]) =>
      path.startsWith("/neture/operator/semi-franchises/drugstore/"),
    ),
  ).toBe(true);
});
