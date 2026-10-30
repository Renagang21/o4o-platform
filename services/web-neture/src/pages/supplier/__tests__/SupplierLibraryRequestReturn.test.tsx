import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
const api = vi.hoisted(() => ({
  getLibraryItem: vi.fn(),
  getLibraryItems: vi.fn(),
  getLibraryHandoffTargets: vi.fn(),
}));
vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "supplier" } }),
}));
vi.mock("../../../lib/api", () => ({ supplierApi: api }));
vi.mock("../../../api/guideContent", () => ({
  fetchGuidePageContent: async () => ({}),
}));
vi.mock("@o4o/shared-space-ui", () => ({ GuideBlock: () => null }));
vi.mock("@o4o/ui", () => ({
  DataTable: ({
    dataSource,
  }: {
    dataSource: Array<{ key: string; actions: React.ReactNode }>;
  }) => (
    <>
      {dataSource.map((row, i) => (
        <div key={i}>{row.actions}</div>
      ))}
    </>
  ),
}));
vi.mock("../SupplierContentDestinations", () => ({
  default: ({
    item,
    suggestedBusinessKey,
  }: {
    item: { title: string } | null;
    suggestedBusinessKey?: string;
  }) => <p>{item ? `${item.title} · ${suggestedBusinessKey}` : "선택 없음"}</p>,
}));
import SupplierLibraryPage from "../SupplierLibraryPage";
beforeEach(() => {
  vi.resetAllMocks();
  api.getLibraryItems.mockResolvedValue({
    items: [{ id: "other", title: "직접 선택 원본", createdAt: "2026-10-20" }],
  });
  api.getLibraryHandoffTargets.mockResolvedValue([]);
});
afterEach(cleanup);
const show = () =>
  render(
    <MemoryRouter
      initialEntries={[
        "/supplier/library?requestSource=old&business=carepharm",
      ]}
    >
      <SupplierLibraryPage />
    </MemoryRouter>,
  );
it("opens the original returned from editing with the same business hint", async () => {
  api.getLibraryItem.mockResolvedValue({ id: "old", title: "보완한 원본" });
  show();
  await screen.findByText("보완한 원본 · carepharm");
  expect(api.getLibraryItem).toHaveBeenCalledWith("old");
});
it("does not replace a manual selection with a late return-source response", async () => {
  let finish!: (value: unknown) => void;
  api.getLibraryItem.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  show();
  fireEvent.click(
    await screen.findByRole("button", { name: "협력사업에 등재 요청" }),
  );
  await act(async () => finish({ id: "old", title: "이전 원본" }));
  expect(screen.getByText("직접 선택 원본 · carepharm")).toBeTruthy();
  expect(screen.queryByText("이전 원본 · carepharm")).toBeNull();
});
it("reports a missing or unauthorized original without selecting another item", async () => {
  api.getLibraryItem.mockRejectedValue(Error("not found"));
  show();
  await screen.findByRole("alert");
  expect(screen.getByText("선택 없음")).toBeTruthy();
});
