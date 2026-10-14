import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { StoreContentsSelector } from "../pharmacy/StoreContentsSelector";
const list = vi.hoisted(() => vi.fn());
vi.mock("../../api/assetSnapshot", () => ({
  storeLibraryApi: { listContents: list },
}));
vi.mock("../pharmacy/ContentPdfExportModal", () => ({
  ContentPdfExportModal: () => null,
}));
vi.mock("../../components/store/StoreQrCreateModal", () => ({
  StoreQrCreateModal: () => null,
}));
vi.mock("../pharmacy/library/useLibraryScope", () => {
  const isCurrent = () => true;
  return { useLibraryScope: () => ({ scope: "A:kpa-society", isCurrent }) };
});
afterEach(cleanup);
beforeEach(() => vi.resetAllMocks());
const empty = { success: true, data: { items: [], total: 0, totalPages: 1 } };
function show() {
  return render(
    <MemoryRouter>
      <StoreContentsSelector onStartProduction={vi.fn()} />
    </MemoryRouter>,
  );
}
it("transport failure displays an error, and retry can produce a real empty result", async () => {
  list
    .mockRejectedValueOnce(new Error("synthetic"))
    .mockResolvedValueOnce(empty);
  show();
  await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
  expect(screen.queryByText("가져온 문서형 콘텐츠가 없습니다")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));
  await screen.findByText("가져온 문서형 콘텐츠가 없습니다");
  expect(screen.queryByRole("alert")).toBeNull();
  expect(list).toHaveBeenCalledTimes(2);
});
it("an unsuccessful response is not shown as an empty library", async () => {
  list.mockResolvedValue({ success: false, data: null });
  show();
  await screen.findByRole("alert");
  expect(screen.queryByText("가져온 문서형 콘텐츠가 없습니다")).toBeNull();
});
it("external reload replaces an error with the newly loaded content", async () => {
  list
    .mockRejectedValueOnce(new Error("synthetic"))
    .mockResolvedValueOnce(empty);
  const { rerender } = show();
  await screen.findByRole("alert");
  rerender(
    <MemoryRouter>
      <StoreContentsSelector reloadKey={1} onStartProduction={vi.fn()} />
    </MemoryRouter>,
  );
  await screen.findByText("가져온 문서형 콘텐츠가 없습니다");
  expect(screen.queryByRole("alert")).toBeNull();
});
